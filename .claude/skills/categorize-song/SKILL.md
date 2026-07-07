---
name: categorize-song
description:
  Match a song against Hagen's existing Spotify playlists
  (src/data/playlists.json) using tags/mood/notes, or log it to
  docs/music/unsorted-songs.md if nothing fits. Use when Hagen pastes a Spotify
  track link or "song - artist" and asks where it belongs, wants a song
  categorized, or wants to sort a liked song into a playlist.
---

# Categorize song

Hagen is manually curating mood/genre playlists from his Spotify liked songs
(see `/labs/playlists` on the site, backed by `src/data/playlists.json`). This
skill judges which existing playlist a song fits, or flags it as unsorted for
later review.

## Input

Hagen will give you either:

- A Spotify track URL (`open.spotify.com/track/...`)
- Plain text: `song name - artist`

## Steps

1. **Get track info.** If given a URL, extract the track ID and fetch it:

   ```
   source .dev.vars
   CREDS=$(printf "%s:%s" "$SPOTIFY_CLIENT_ID" "$SPOTIFY_CLIENT_SECRET" | base64)
   TOKEN=$(curl -s -X POST https://accounts.spotify.com/api/token \
     -H "Authorization: Basic $CREDS" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=client_credentials" | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).access_token)")
   curl -s "https://api.spotify.com/v1/tracks/<id>" \
     -H "Authorization: Bearer $TOKEN"
   ```

   Never print `$TOKEN` itself to the transcript — pipe it straight into the
   next curl, don't echo it. Pull track name, artist name(s), and album from the
   response. Also fetch each artist's genres (`GET /v1/artists/<id>`) if it'll
   help judge the fit — Spotify has no track-level genre.

   If given plain text, skip the fetch and judge directly on the name/artist you
   have.

2. **Read `src/data/playlists.json`.** Each entry has `url`, `tags`, `notes`.
   These are mood/genre descriptions Hagen wrote by hand — trust them over any
   inferred genre.

3. **Judge the fit.** Compare the track's genre, instrumentation, era, and vibe
   against each playlist's tags/notes. Use judgment, not exact string matching —
   e.g. a dusty downtempo hip-hop beat fits "Penumbral" even if the word
   "hip-hop" doesn't appear verbatim if the mood matches better than "chillhop"
   elsewhere.

   - **Clear fit (one playlist stands out):** tell Hagen which playlist and why
     in one or two sentences. Give the playlist's Spotify URL so he can add the
     track himself. Do not attempt to add it via the API — no OAuth write access
     exists.
   - **Close between 2-3 playlists:** name the top candidates and the deciding
     factor for each, let Hagen pick.
   - **No real fit:** say so, then log it (next step).

4. **Log unsorted songs to `docs/music/unsorted-songs.md`.** Append one bullet
   under `## Log`, newest at the top:

   ```
   - **Song Name** — Artist (https://open.spotify.com/track/...): why it
     didn't fit any current playlist, and a one-line guess at what kind of
     new playlist would fit it.
   ```

   If no Spotify URL was given, omit the link.

5. **Watch for patterns.** If `docs/music/unsorted-songs.md` has several entries
   that share an obvious mood/genre thread, mention it to Hagen as a candidate
   for a new playlist. Don't create the playlist yourself — that's his call, and
   it needs a real Spotify playlist to exist first before it can go in
   `playlists.json`.

## Notes

- `docs/music/unsorted-songs.md` is not deployed to the site — it's an internal
  tracking file. Never wire it into `src/` or any page.
- `.dev.vars` is gitignored; the Spotify credentials in it are for local/dev use
  and match what's already configured for `/labs/playlists`.
