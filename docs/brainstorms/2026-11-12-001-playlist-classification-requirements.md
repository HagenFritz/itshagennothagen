---
date: 2026-11-12
sequence: 001
topic: playlist-classification
---

# Liked-songs classification and new playlist candidates

## Problem Frame

Hagen is sorting his Spotify liked songs, one at a time, into the mood/genre
playlists listed in `src/data/playlists.json`. He sends a screenshot or a typed
title; the `categorize-song` skill places it. Songs that do not clearly belong
anywhere collect here, grouped into candidate playlists, until a group is big
enough to become a real playlist.

## Requirements

- R1. Live Spotify is the source of truth for each playlist's name, description,
  and tracklist (`node .claude/skills/categorize-song/spotify.mjs playlists`).
  The `notes` in `playlists.json` can lag behind the Spotify descriptions.
- R2. Judge a song against the tracks already in each playlist, not only its
  description. A playlist's real neighbors outrank its one-line pitch.
- R3. Never ask Hagen what a song sounds like. Research it instead: Spotify
  metadata (artist genres, album, year, duration, compilations it appears on),
  then the web (reviews and blog write-ups, Beatport/Discogs/Last.fm genre tags
  and similar artists, BPM, lyrics for vocal mood). Cite what decided it.
- R4. Three verdicts only: clear fit (one playlist, with its link), close call
  (lean plus runner-up and the deciding factor), or no fit.
- R5. Do not overfit. No fit is a normal outcome. A no-fit song is logged below
  and joins a candidate playlist only when it shares a stated thread with it.
- R6. A candidate playlist with 5 songs is flagged as ready. Hagen creates it on
  Spotify; only then does it go into `playlists.json`.
- R7. Read-only against Spotify. Hagen adds songs to playlists himself.

## Candidate Playlists

### Viral dance edits of old songs

Short, radio-cut dance remixes of folk songs or standards, made to ride a
moment. Nearest existing neighbor: Propulsive's "Roses (Imanbek Remix)", but
these are thinner and more novelty than FISHER or SIDEPIECE. (1 of 5)

- Bella Ciao (Remix) · House Of Paper

## Unplaced Songs

<!-- Newest first. -->

- **Bella Ciao (Remix)** · House Of Paper (2018,
  https://open.spotify.com/track/38dmkPe7nIe9lDGZ5Xdewc). A 1:47 Money Heist
  cash-in; Apple Music and Shazam tag it only "Dance", and Last.fm's similar
  artists are Balkan/Turkish club remixers (DJ Redblack, Yigit Unal). Too thin
  and novelty for Propulsive, no arc for Numinous, no warmth for Lambent.

## Open Questions

None.
