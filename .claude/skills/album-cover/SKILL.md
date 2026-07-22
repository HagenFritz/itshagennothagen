---
name: album-cover
description:
  Design a topographic-gradient album cover for a playlist, following a fixed
  visual template (dense contour lines, dark background, SAT-word title). Use
  when Hagen asks for a playlist cover, album art, or cover design, giving a
  genre, a list of songs, or nothing at all to start from.
---

# Album cover

Generates a topographic-gradient album cover using a fixed visual template, plus
a SAT-word title and a listener-facing description.

This is independent of `src/data/playlists.json` — run full genre discovery
every time, even if the request is for one of the tracked playlists. Don't
shortcut using that file's tags.

## Setup

Create tasks with TaskCreate for the six steps below (Genre discovery, SAT word,
Color reasoning, Generate cover, Output description, Offer regeneration). Mark
each in_progress when you start it and completed when its output is confirmed,
so progress is visible instead of implicit.

## Step 1 — Genre discovery

- **Given an explicit genre:** use it, mark this task completed, move on.
- **Given a list of songs + artists:** analyze them, then use AskUserQuestion to
  confirm the genre you land on (offer your top pick plus 1-2 close alternatives
  as options, "Other" covers anything else). If he wants higher confidence
  first, mention he can run the songs through bridge.audio or cyanite.ai (both
  take Spotify links) and paste the result back for a more precise read.
- **Given neither:** use AskUserQuestion for these six questions, one question
  per call or batched — whichever the tool allows — offering concrete labeled
  options rather than open text (mirrors real MIR classification dimensions):
  1. **Arousal** — high energy (fast, driving, loud) vs. low (slow, quiet,
     calm)?
  2. **Valence** — bright/positive vs. dark/melancholic?
  3. **Instrumentation** — electronic/synthetic vs. acoustic/organic; vocal vs.
     instrumental?
  4. **Timbre** — warm/rounded vs. cold/sharp?
  5. **Structure** — builds to a peak and resolves, vs. holds one atmosphere
     throughout?
  6. **Reference** — free-text: one artist or song this sound reminds him of
     (use the "Other" option for this one since it's open-ended).

  Use the answers to place the music on the valence/arousal grid, then use
  AskUserQuestion once more to confirm the genre you land on.

## Step 2 — SAT word

First, gather the words already in use so you never propose a duplicate. The
names live on Spotify, not in the repo, so resolve them from the playlist IDs in
`src/data/playlists.json` (creds in `.dev.vars`):

```
set -a; . ./.dev.vars; set +a
TOKEN=$(curl -s -X POST https://accounts.spotify.com/api/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials&client_id=$SPOTIFY_CLIENT_ID&client_secret=$SPOTIFY_CLIENT_SECRET" \
  | jq -r '.access_token // empty')

jq -r '.[].url' src/data/playlists.json | sed 's#.*/playlist/##' | while read -r id; do
  curl -s "https://api.spotify.com/v1/playlists/$id?fields=name" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.name // empty'
done
```

Also list `docs/music/covers/*.png` — a cover may exist for a word whose
playlist isn't tracked yet. Treat the union of both as taken. If the API call
fails (missing `.dev.vars`, network), fall back to the covers directory alone
and say so rather than skipping the check silently.

- **Given a word:** use it even if it collides, but say so plainly first.
- **Otherwise:** pick a SAT-level word that precisely captures the sonic and
  emotional character of the genre, excluding every taken word. Use
  AskUserQuestion to confirm it — option 1 is your word with its definition and
  a 2-3 sentence rationale in the description field, option 2 is "Other" for his
  own word. Alternates you offer must be unused too.

## Step 3 — Color reasoning

Pick a two-color gradient (low elevation → high elevation) that matches the SAT
word's emotional register:

| Character                          | Palette                                     |
| ---------------------------------- | ------------------------------------------- |
| High energy / driving / aggressive | warm (reds, oranges, hot pinks)             |
| Melancholic / introspective        | cool (deep blues, purples, indigos)         |
| Organic / grounded / natural       | earth tones (greens, ochres, warm browns)   |
| Euphoric / uplifting               | light tones (yellows, cyans, pale blues)    |
| Mysterious / hypnotic              | jewel tones (teals, violets, deep magentas) |

State the two colors and a one-sentence rationale, then move on — no
confirmation needed here, this one's fast enough to just show in the final
result.

## Step 4 — Generate the cover

Fixed rules, don't deviate:

- **Style:** dense topographic contour lines, razor-thin and precise. Tight
  spacing at ridgelines, wider spacing at low elevation. No fills between lines,
  only the lines. Consistent line weight/density across every cover.
- **Background:** always `#0D0D0D`.
- **Composition:** terrain centered, equal 15% margin on all four sides. Contour
  lines never touch or bleed to the frame edge.
- **Terrain character**, matched to the genre's emotional register:

  | Character                | Terrain                                            |
  | ------------------------ | -------------------------------------------------- |
  | High energy / driving    | sharp, angular ridgelines, steep elevation changes |
  | Hypnotic / floating      | slow, undulating ridgelines                        |
  | Mournful / introspective | deep layered valleys, compressed contours          |
  | Building / euphoric      | ascending peaks stacking toward a summit           |
  | Calm / ancient / organic | wide eroded plateaus, unhurried and broad          |

- **Color:** the two-color gradient applied globally across all contour lines,
  base color at low elevation, peak color at high elevation.
- **Typography:** the SAT word, minimal wide-tracked sans-serif, small,
  off-white, bottom edge within the margin. No other text.
- No extra decoration, texture, or flourish.
- Square (1:1), highest resolution the model supports.

Build one detailed prompt encoding all of the above plus the specific
terrain/color choice from Steps 1-3, then generate it using the `generate-image`
skill's method (Gemini 2.5 Flash Image via the GCP Secret-Manager key
`ro-dev-api-key-generative-language`, project `app-dev-464512` — see
`~/.claude/skills/generate-image/SKILL.md` for the exact call if you need a
refresher).

Save the output to `docs/music/covers/<slug>.png`, where `<slug>` is the SAT
word lowercased and hyphenated (e.g. `languorous.png`). Create
`docs/music/covers/` if it doesn't exist. This directory is not deployed to the
site — cover images live here until Hagen decides to use one.

## Step 5 — Output the description

Print in plain text, exactly this format:

```
[SAT Word] — [Genre]
[1-2 sentence listener-facing description of the sonic and emotional
character. Direct, precise, no fluff.]
```

## Step 6 — Offer regeneration

Show the image (SendUserFile), then use AskUserQuestion: "Keep it" vs.
"Regenerate with changes" (if he picks the latter, ask what to change via the
"Other" field). Adjust the color/terrain reasoning or prompt and regenerate.
Keep iterating only as long as he keeps asking; mark the task completed once
he's satisfied.
