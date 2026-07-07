import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeRateLimitDb, stubCaches } from './_test-helpers'
import { onRequestGet } from './spotify-playlist-tracks'

function makeEnv(): Env {
  return {
    SPOTIFY_CLIENT_ID: 'id',
    SPOTIFY_CLIENT_SECRET: 'secret',
    LEADERBOARD_SECRET: 'test-secret',
    DB: fakeRateLimitDb(),
  } as unknown as Env
}

function get(id: string) {
  return new Request(
    `https://example.dev/api/spotify-playlist-tracks?id=${encodeURIComponent(id)}`,
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

describe('GET /api/spotify-playlist-tracks', () => {
  it('returns 400 when no id is given', async () => {
    const res = await onRequestGet({
      env,
      request: get(''),
    } as unknown as Parameters<typeof onRequestGet>[0])
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'invalid' })
  })

  it('returns 400 when the id contains invalid characters', async () => {
    const res = await onRequestGet({
      env,
      request: get('not-a-real-id/../../me'),
    } as unknown as Parameters<typeof onRequestGet>[0])
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'invalid' })
  })

  it('paginates through all pages and flattens tracks, skipping removed ones', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('accounts.spotify.com')) {
        return new Response(JSON.stringify({ access_token: 'tok' }), {
          status: 200,
        })
      }
      if (url.includes('offset') || url.includes('page2')) {
        return new Response(
          JSON.stringify({
            items: [
              { track: { name: 'Song B', artists: [{ name: 'Artist B' }] } },
            ],
            next: null,
          }),
          { status: 200 },
        )
      }
      if (url.includes('/playlists/good/tracks')) {
        return new Response(
          JSON.stringify({
            items: [
              {
                track: {
                  name: 'Song A',
                  artists: [{ name: 'Artist A' }, { name: 'Artist A2' }],
                },
              },
              { track: null },
            ],
            next: 'https://api.spotify.com/v1/playlists/good/tracks?page2',
          }),
          { status: 200 },
        )
      }
      return new Response(null, { status: 404 })
    })
    vi.stubGlobal('fetch', fetchMock)

    const res = await onRequestGet({
      env,
      request: get('https://open.spotify.com/playlist/good'),
    } as unknown as Parameters<typeof onRequestGet>[0])

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({
      tracks: [
        { name: 'Song A', artists: 'Artist A, Artist A2' },
        { name: 'Song B', artists: 'Artist B' },
      ],
    })
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=3600')
  })

  it('stops after MAX_PAGES if next never terminates', async () => {
    let pageFetches = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (url.includes('accounts.spotify.com')) {
          return new Response(JSON.stringify({ access_token: 'tok' }), {
            status: 200,
          })
        }
        pageFetches++
        return new Response(
          JSON.stringify({
            items: [{ track: { name: `Song ${pageFetches}`, artists: [] } }],
            next: 'https://api.spotify.com/v1/playlists/good/tracks?cycle',
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
    expect(pageFetches).toBeLessThanOrEqual(100)
  })

  it('returns 404 when the playlist fetch fails with a non-auth error', async () => {
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
    const res = await onRequestGet({
      env,
      request: get('https://open.spotify.com/playlist/missing'),
    } as unknown as Parameters<typeof onRequestGet>[0])
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'not_found' })
  })

  it('retries once with a fresh token on a 401, then succeeds', async () => {
    let tokenCalls = 0
    let trackCalls = 0
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
        trackCalls++
        if (trackCalls === 1) {
          return new Response(null, { status: 401 })
        }
        return new Response(
          JSON.stringify({
            items: [{ track: { name: 'Song A', artists: [] } }],
            next: null,
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
    const body = (await res.json()) as { tracks: unknown[] }
    expect(body.tracks).toEqual([{ name: 'Song A', artists: '' }])
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
})
