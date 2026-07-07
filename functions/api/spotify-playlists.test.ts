import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeRateLimitDb, stubCaches } from './_test-helpers'
import { onRequestGet } from './spotify-playlists'

function makeEnv(): Env {
  return {
    SPOTIFY_CLIENT_ID: 'id',
    SPOTIFY_CLIENT_SECRET: 'secret',
    LEADERBOARD_SECRET: 'test-secret',
    DB: fakeRateLimitDb(),
  } as unknown as Env
}

function get(ids: string) {
  return new Request(
    `https://example.dev/api/spotify-playlists?ids=${encodeURIComponent(ids)}`,
  )
}

let env: Env

beforeEach(() => {
  stubCaches()
  env = makeEnv()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('GET /api/spotify-playlists', () => {
  it('returns 400 when no valid playlist ids are given', async () => {
    const res = await onRequestGet({
      env,
      request: get(''),
    } as unknown as Parameters<typeof onRequestGet>[0])
    expect(res.status).toBe(400)
  })

  it('fetches a token then each playlist, filtering out failures', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('accounts.spotify.com')) {
        return new Response(JSON.stringify({ access_token: 'tok' }), {
          status: 200,
        })
      }
      if (url.includes('/playlists/good')) {
        return new Response(
          JSON.stringify({
            id: 'good',
            name: 'Good Vibes',
            external_urls: {
              spotify: 'https://open.spotify.com/playlist/good',
            },
            images: [{ url: 'https://img/good.jpg' }],
            tracks: { total: 42 },
          }),
          { status: 200 },
        )
      }
      return new Response(null, { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await onRequestGet({
      env,
      request: get(
        'https://open.spotify.com/playlist/good,https://open.spotify.com/playlist/bad',
      ),
    } as unknown as Parameters<typeof onRequestGet>[0])

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({
      playlists: [
        {
          id: 'good',
          name: 'Good Vibes',
          url: 'https://open.spotify.com/playlist/good',
          image: 'https://img/good.jpg',
          trackCount: 42,
        },
      ],
    })
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=3600')
  })

  it('skips a playlist with a malformed response instead of failing the batch', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('accounts.spotify.com')) {
          return new Response(JSON.stringify({ access_token: 'tok' }), {
            status: 200,
          })
        }
        if (url.includes('/playlists/malformed')) {
          return new Response(JSON.stringify({ id: 'malformed' }), {
            status: 200,
          })
        }
        return new Response(
          JSON.stringify({
            id: 'good',
            name: 'Good Vibes',
            external_urls: {
              spotify: 'https://open.spotify.com/playlist/good',
            },
            images: [],
            tracks: { total: 1 },
          }),
          { status: 200 },
        )
      }),
    )

    const res = await onRequestGet({
      env,
      request: get(
        'https://open.spotify.com/playlist/malformed,https://open.spotify.com/playlist/good',
      ),
    } as unknown as Parameters<typeof onRequestGet>[0])

    expect(res.status).toBe(200)
    const body = (await res.json()) as { playlists: unknown[] }
    expect(body.playlists).toEqual([
      {
        id: 'good',
        name: 'Good Vibes',
        url: 'https://open.spotify.com/playlist/good',
        image: null,
        trackCount: 1,
      },
    ])
  })

  it('returns 500 when the token request fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 401 })),
    )
    const res = await onRequestGet({
      env,
      request: get('https://open.spotify.com/playlist/good'),
    } as unknown as Parameters<typeof onRequestGet>[0])
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'server_error' })
  })

  it('caps the number of ids processed per request', async () => {
    const seenPlaylistFetches: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('accounts.spotify.com')) {
          return new Response(JSON.stringify({ access_token: 'tok' }), {
            status: 200,
          })
        }
        seenPlaylistFetches.push(url)
        return new Response(null, { status: 404 })
      }),
    )

    const manyIds = Array.from(
      { length: 30 },
      (_, i) => `https://open.spotify.com/playlist/id${i}`,
    ).join(',')

    await onRequestGet({
      env,
      request: get(manyIds),
    } as unknown as Parameters<typeof onRequestGet>[0])

    expect(seenPlaylistFetches.length).toBeLessThanOrEqual(20)
  })

  it('retries once with a fresh token on a 401 from the playlist fetch', async () => {
    let tokenCalls = 0
    let playlistCalls = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('accounts.spotify.com')) {
          tokenCalls++
          return new Response(
            JSON.stringify({ access_token: `tok${tokenCalls}` }),
            { status: 200 },
          )
        }
        playlistCalls++
        if (playlistCalls === 1) {
          return new Response(null, { status: 401 })
        }
        return new Response(
          JSON.stringify({
            id: 'good',
            name: 'Good Vibes',
            external_urls: {
              spotify: 'https://open.spotify.com/playlist/good',
            },
            images: [],
            tracks: { total: 1 },
          }),
          { status: 200 },
        )
      }),
    )

    const res = await onRequestGet({
      env,
      request: get('https://open.spotify.com/playlist/good'),
    } as unknown as Parameters<typeof onRequestGet>[0])

    expect(res.status).toBe(200)
    expect(tokenCalls).toBe(2)
    const body = (await res.json()) as { playlists: unknown[] }
    expect(body.playlists).toHaveLength(1)
  })

  it('returns 429 when Spotify rate-limits the request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('accounts.spotify.com')) {
          return new Response(JSON.stringify({ access_token: 'tok' }), {
            status: 200,
          })
        }
        return new Response(null, { status: 429 })
      }),
    )
    const res = await onRequestGet({
      env,
      request: get('https://open.spotify.com/playlist/good'),
    } as unknown as Parameters<typeof onRequestGet>[0])
    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({ error: 'rate_limited' })
  })

  it('returns 429 once the per-IP request window is exceeded', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('accounts.spotify.com')) {
          return new Response(JSON.stringify({ access_token: 'tok' }), {
            status: 200,
          })
        }
        return new Response(null, { status: 404 })
      }),
    )

    const request = () =>
      ({
        env,
        request: get('https://open.spotify.com/playlist/good'),
      }) as unknown as Parameters<typeof onRequestGet>[0]

    let lastRes
    for (let i = 0; i < 21; i++) {
      lastRes = await onRequestGet(request())
    }

    expect(lastRes!.status).toBe(429)
    expect(await lastRes!.json()).toEqual({ error: 'rate_limited' })
  })
})
