import { isRateLimited } from './_rate-limit'
import {
  API_BASE,
  SpotifyRateLimitedError,
  extractPlaylistId,
  spotifyFetch,
} from './_spotify'

type SpotifyTrackItem = {
  track: {
    name: string
    artists: { name: string }[]
  } | null
}

type SpotifyTracksPage = {
  items: SpotifyTrackItem[]
  next: string | null
}

const FIELDS = 'items(track(name,artists(name))),next'
const MAX_PAGES = 100
const VALID_ID_PATTERN = /^[a-zA-Z0-9]+$/

// GET /api/spotify-playlist-tracks?id=<playlist url or id>
export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  try {
    if (
      await isRateLimited(
        env.DB,
        env.LEADERBOARD_SECRET,
        request,
        'spotify-playlist-tracks',
      )
    ) {
      return Response.json({ error: 'rate_limited' }, { status: 429 })
    }

    const idParam = new URL(request.url).searchParams.get('id') ?? ''
    const id = extractPlaylistId(idParam) ?? idParam
    if (!id || !VALID_ID_PATTERN.test(id)) {
      return Response.json({ error: 'invalid' }, { status: 400 })
    }

    const tracks: { name: string; artists: string }[] = []
    let nextUrl: string | null =
      `${API_BASE}/playlists/${id}/tracks?fields=${encodeURIComponent(FIELDS)}&limit=50`

    for (let page = 0; nextUrl !== null; page++) {
      if (page >= MAX_PAGES) break

      const res: Response = await spotifyFetch(env, nextUrl)
      if (!res.ok) {
        return Response.json({ error: 'not_found' }, { status: 404 })
      }
      const data: SpotifyTracksPage = await res.json()
      for (const item of data.items) {
        if (!item.track) continue
        tracks.push({
          name: item.track.name,
          artists: item.track.artists.map((a) => a.name).join(', '),
        })
      }
      nextUrl = data.next
    }

    return Response.json(
      { tracks },
      { headers: { 'Cache-Control': 'public, max-age=3600' } },
    )
  } catch (err) {
    if (err instanceof SpotifyRateLimitedError) {
      return Response.json({ error: 'rate_limited' }, { status: 429 })
    }
    console.error('spotify-playlist-tracks GET failed', err)
    return Response.json({ error: 'server_error' }, { status: 500 })
  }
}
