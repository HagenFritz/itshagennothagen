import { isRateLimited } from './_rate-limit'
import {
  API_BASE,
  extractPlaylistId,
  SpotifyRateLimitedError,
  spotifyFetch,
} from './_spotify'

type SpotifyPlaylist = {
  id: string
  name: string
  external_urls?: { spotify: string }
  images?: { url: string }[]
  tracks?: { total: number }
}

const MAX_IDS_PER_REQUEST = 20

// GET /api/spotify-playlists?ids=<url1>,<url2>,...
export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    if (
      await isRateLimited(
        env.DB,
        env.LEADERBOARD_SECRET,
        request,
        'spotify-playlists',
      )
    ) {
      return Response.json({ error: 'rate_limited' }, { status: 429 })
    }

    const idsParam = new URL(request.url).searchParams.get('ids') ?? ''
    const ids = idsParam
      .split(',')
      .slice(0, MAX_IDS_PER_REQUEST)
      .map(extractPlaylistId)
      .filter((id): id is string => id !== null)
    if (ids.length === 0) {
      return Response.json({ error: 'invalid' }, { status: 400 })
    }

    const playlists = await Promise.all(
      ids.map(async (id) => {
        const res = await spotifyFetch(
          env,
          `${API_BASE}/playlists/${id}?fields=id,name,external_urls,images,tracks.total`,
        )
        if (!res.ok) return null
        const p = await res.json<SpotifyPlaylist>()
        if (!p.external_urls || !p.tracks) return null
        return {
          id: p.id,
          name: p.name,
          url: p.external_urls.spotify,
          image: p.images?.[0]?.url ?? null,
          trackCount: p.tracks.total,
        }
      }),
    )

    return Response.json(
      { playlists: playlists.filter((p) => p !== null) },
      { headers: { 'Cache-Control': 'public, max-age=3600' } },
    )
  } catch (err) {
    if (err instanceof SpotifyRateLimitedError) {
      return Response.json({ error: 'rate_limited' }, { status: 429 })
    }
    console.error('spotify-playlists GET failed', err)
    return Response.json({ error: 'server_error' }, { status: 500 })
  }
}
