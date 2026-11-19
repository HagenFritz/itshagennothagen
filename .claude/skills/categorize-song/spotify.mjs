// Read-only Spotify lookups for categorize-song. Run from the repo root:
//   node .claude/skills/categorize-song/spotify.mjs playlists
//   node .claude/skills/categorize-song/spotify.mjs track "<song> <artist>"
import fs from 'node:fs'

const vars = Object.fromEntries(
  fs
    .readFileSync('.dev.vars', 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [
        l.slice(0, i).trim(),
        l
          .slice(i + 1)
          .trim()
          .replace(/^"|"$/g, ''),
      ]
    }),
)

const auth = Buffer.from(
  `${vars.SPOTIFY_CLIENT_ID}:${vars.SPOTIFY_CLIENT_SECRET}`,
).toString('base64')
const { access_token } = await fetch('https://accounts.spotify.com/api/token', {
  method: 'POST',
  headers: {
    Authorization: `Basic ${auth}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: 'grant_type=client_credentials',
}).then((r) => r.json())

async function api(url) {
  const r = await fetch(
    url.startsWith('http') ? url : `https://api.spotify.com/v1${url}`,
    {
      headers: { Authorization: `Bearer ${access_token}` },
    },
  )
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return r.json()
}

const decode = (s) =>
  (s ?? '')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
const line = (t) =>
  `${t.name} · ${t.artists.map((a) => a.name).join(', ')} (${(t.album.release_date ?? '').slice(0, 4)})`

const [cmd, ...rest] = process.argv.slice(2)

if (cmd === 'playlists') {
  const playlists = JSON.parse(
    fs.readFileSync('src/data/playlists.json', 'utf8'),
  )
  for (const p of playlists) {
    const id = p.url.split('/playlist/')[1].split('?')[0]
    const meta = await api(`/playlists/${id}?fields=name,description`)
    const tracks = []
    let next = `/playlists/${id}/tracks?limit=100&fields=next,items(track(name,artists(name),album(release_date)))`
    while (next) {
      const page = await api(next)
      for (const it of page.items) if (it.track) tracks.push(line(it.track))
      next = page.next
    }
    console.log(
      `\n## ${meta.name} (${tracks.length}) ${p.url}\n${decode(meta.description)}`,
    )
    for (const t of tracks) console.log(`  ${t}`)
  }
} else if (cmd === 'track') {
  const q = encodeURIComponent(rest.join(' '))
  const { tracks } = await api(`/search?q=${q}&type=track&limit=5`)
  const artistIds = [
    ...new Set(tracks.items.flatMap((t) => t.artists.map((a) => a.id))),
  ]
  const genres = {}
  if (artistIds.length) {
    const { artists } = await api(
      `/artists?ids=${artistIds.slice(0, 50).join(',')}`,
    )
    for (const a of artists) genres[a.id] = a.genres
  }
  for (const t of tracks.items) {
    console.log(
      `${line(t)} · ${Math.round(t.duration_ms / 1000)}s · album "${t.album.name}" · ${t.external_urls.spotify}`,
    )
    for (const a of t.artists)
      console.log(`    ${a.name}: ${genres[a.id]?.join(', ') || 'no genres'}`)
  }
} else {
  console.error('usage: spotify.mjs playlists | track "<query>"')
  process.exit(1)
}
