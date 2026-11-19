---
name: categorize-song
description:
  Place one of Hagen's liked songs into his Spotify playlists (listed in
  src/data/playlists.json), researching the track on Spotify and the web, or log
  it to the playlist-classification requirements doc if nothing clearly fits.
  Use when Hagen pastes a screenshot, a Spotify track link, or "song - artist"
  and asks where it belongs or wants a liked song sorted.
---

# Categorize song

Hagen is sorting his Spotify liked songs, one at a time, into mood/genre
playlists. This skill places each song or logs it as unplaced. The rules live in
`docs/brainstorms/2026-11-12-001-playlist-classification-requirements.md`; read
its Requirements once per session and follow them.

## Input

A screenshot of a Spotify row (read title and artists from it), a Spotify track
URL, or plain text `song - artist`.

## Steps

1. **Load the playlists live**, once per session or when Hagen says they
   changed:

   ```
   node .claude/skills/categorize-song/spotify.mjs playlists
   ```

   This prints every playlist's name, Spotify description, and full tracklist.
   Trust it over the `notes` in `src/data/playlists.json`.

2. **Look up the track:**

   ```
   node .claude/skills/categorize-song/spotify.mjs track "<song> <artist>"
   ```

   Pull year, duration, album or compilation names, and artist genres. If the
   song is already in a playlist from step 1, say so and stop.

3. **Research until the sound is known.** Never ask Hagen what it sounds like.
   If you do not know the track well, use WebSearch/WebFetch: reviews and blog
   posts about the track or remix, Beatport/Discogs/Last.fm genre tags, similar
   artists, BPM, lyrics for vocal mood, and the artist's usual style. Stop when
   two independent sources agree on genre and feel.

4. **Judge against neighbors.** Compare the track with the songs already in each
   candidate playlist, not just the description. Give one verdict:
   - **Clear fit:** the playlist, its Spotify URL, and one or two sentences on
     why, naming a neighbor track it sits next to.
   - **Close call:** the lean, the runner-up, and the deciding factor.
   - **No fit:** say so, then log it (step 5).

   State whether the call rests on Spotify data, web sources (cite them), or
   your own knowledge of the track.

5. **Log no-fits** in the requirements doc: add a bullet under
   `## Unplaced Songs` (newest first) with title, artist, year, track URL, the
   evidence, and why each near playlist failed. Then add the song to a matching
   group under `## Candidate Playlists`, or start a new group with a working
   vibe line and the nearest existing playlist. Update the `(n of 5)` count.

6. **Flag ready groups.** When a candidate group reaches 5 songs, tell Hagen it
   is ready. He creates the Spotify playlist; only then add it to
   `src/data/playlists.json`.

## Notes

- Read-only against Spotify. Never print the access token. Never try to add
  tracks; there is no write access.
- The requirements doc is internal and never wired into `src/`.
