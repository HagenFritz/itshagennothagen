const TOKEN_URL = 'https://accounts.spotify.com/api/token'
export const API_BASE = 'https://api.spotify.com/v1'

// Cache key is a same-origin placeholder URL; the Cache API only keys on
// request URL/headers, not on any real endpoint being called.
const TOKEN_CACHE_KEY = 'https://cache.internal/spotify-token'
const TOKEN_CACHE_TTL_S = 55 * 60

async function fetchAndCacheToken(env: Env): Promise<string> {
  const creds = btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`)
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error(`token_${res.status}`)
  const data = await res.json<{ access_token?: string }>()
  if (!data.access_token) throw new Error('token_missing_access_token')

  const cache = caches.default
  await cache.put(
    TOKEN_CACHE_KEY,
    new Response(JSON.stringify({ access_token: data.access_token }), {
      headers: { 'Cache-Control': `public, max-age=${TOKEN_CACHE_TTL_S}` },
    }),
  )

  return data.access_token
}

export async function getAccessToken(env: Env): Promise<string> {
  const cached = await caches.default.match(TOKEN_CACHE_KEY)
  if (cached) {
    const { access_token } = await cached.json<{ access_token: string }>()
    return access_token
  }
  return fetchAndCacheToken(env)
}

async function invalidateAccessToken(): Promise<void> {
  await caches.default.delete(TOKEN_CACHE_KEY)
}

export class SpotifyRateLimitedError extends Error {}

// Fetches a Spotify API URL with a cached bearer token. On a 401 (token
// expired/invalid despite our cache TTL), invalidates the cache and retries
// once with a fresh token — a stale-but-cached token should not surface as
// a false "not found" to callers. A 429 throws distinctly so callers don't
// have to guess why the request failed from a generic non-ok response.
export async function spotifyFetch(env: Env, url: string): Promise<Response> {
  const token = await getAccessToken(env)
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (res.status === 401) {
    await invalidateAccessToken()
    const freshToken = await fetchAndCacheToken(env)
    return fetch(url, { headers: { Authorization: `Bearer ${freshToken}` } })
  }

  if (res.status === 429) {
    throw new SpotifyRateLimitedError(`spotify_429: ${url}`)
  }

  return res
}

export function extractPlaylistId(url: string): string | null {
  const match = url.match(/playlist[/:]([a-zA-Z0-9]+)/)
  return match?.[1] ?? null
}
