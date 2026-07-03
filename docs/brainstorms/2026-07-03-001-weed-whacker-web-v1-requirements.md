---
date: 2026-07-03
sequence: 001
topic: weed-whacker-web-v1
---

# Weed Whacker Web v1

## Problem Frame

Weed Whacker exists as an unfinished Python/Pygame desktop game
(~/Documents/weed-whacker). Site visitors cannot play it. Goal: port the core
game to the browser as a playable v1 on itshagennothagen.dev with a global
high-score leaderboard, structured so future features (tools, weather, Steam
desktop build) extend it rather than force a rewrite. The TypeScript port
becomes the canonical version of the game; the Python code becomes reference
material.

## Requirements

- R1. The game is playable at a dedicated `/play` page, with a card linking to
  it from the Lab page.
- R2. A session is a 3-minute timed run. A countdown timer shows in the HUD.
  When the timer ends, an end screen shows the final score with a
  submit-to-leaderboard form (player name) and a play-again option.
- R3. Core mechanics match the original game: 30x30 tile world with a 5x5
  starting plot in the center, tile-based player movement (WASD or arrow keys,
  150 ms cooldown), chop action (spacebar or click, 1000 ms cooldown, hand hoe
  only), income of $1 per second per clear grass tile, and purchasing adjacent
  unowned tiles for $10 plus $1 per tile already bought.
- R4. Weed spawning scales with the number of owned tiles (spawn chance per
  grass tile per tick) so expansion increases score potential. Exact constants
  are tunable via a single config, mirroring the original config.py approach.
- R5. Score is total weeds whacked in the run, shown live in the HUD.
- R6. A global leaderboard shows the top 10 scores (name and count) on the
  `/play` page, fetched on load and refreshed after submit. Names are capped at
  20 characters. Submissions are validated server-side (integer score, sane
  maximum, rate limiting per IP).
- R7. Sound effects: chop (existing hand_hoe.wav), tile purchase, timer
  countdown warning, and run end. A mute toggle is visible in the game UI. No
  background music.
- R8. Rendering uses the original pixel-art sprites (farmer, grass variants,
  weed, coin) at 16 px tile size with a camera that follows the player,
  integer-scaled so pixels stay crisp.
- R9. Desktop keyboard is the supported input. On touch devices the page shows a
  "best played with a keyboard" note instead of broken controls.

## Success Criteria

- A visitor on desktop can complete a full run, submit a score, and see it on
  the leaderboard without instructions beyond what the page shows.
- The game loop feels responsive: no visible input lag, stable frame rate on a
  typical laptop.
- Adding a new tool or weed type later requires only new data entries and
  assets, not engine changes.

## Scope Boundaries

- No tool shop or additional tools (scythe, chainsaw, shears, aerosol) in v1.
- No weather or event system in v1.
- No weed regrowth or multi-chop toughness in v1 (basic weed, one chop kills).
- No background music.
- No touch controls.
- No accounts or authentication; leaderboard names are free-form.
- Anti-cheat is best-effort validation only. Scores are client-reported and
  forgeable; this is accepted for a portfolio toy.

## Key Decisions

- Timed run over endless play: a fixed 3-minute window makes leaderboard scores
  comparable across players (skill, not patience) and provides a natural submit
  moment.
- Weed spawn rate scales with plot size: the original fixed 5-second spawn
  interval caps possible score regardless of skill; scaling creates the strategy
  loop (income buys tiles, tiles spawn more weeds, more whacks).
- Hand hoe only: tools land later as data additions; v1 ships faster.
- Full SFX set without music: existing chop sound plus small
  synthesized/free-asset SFX for purchase, timer warning, and run end. Music
  requires sourcing and licensing; deferred.
- Game code lives in an npm workspace package (`packages/weed-whacker`) inside
  the site repo, with a pure headless sim core separated from rendering and
  input. This keeps the game testable, lets future targets (Steam via
  Electron/Tauri wrapper) reuse the core, and makes later extraction to its own
  repo a directory move.
- Backend is Cloudflare D1 plus Pages Functions on the existing Cloudflare Pages
  deployment. No new hosting.
- Delivery is three PRs: (1) workspace scaffold plus headless sim core with
  tests, (2) renderer, input, sound, and `/play` page, (3) leaderboard backend
  and UI.

## Dependencies / Assumptions

- Sprite and sound assets are copied from ~/Documents/weed-whacker into the site
  repo (both are the user's own work, MIT licensed).
- Non-chop SFX (purchase, timer warning, run end) do not exist yet and will be
  synthesized or sourced from free assets during implementation.
- D1 database creation and schema application require one-time wrangler commands
  run by the user with Cloudflare auth.

## Outstanding Questions

### Deferred to Planning

- [Affects R4][Technical] Exact spawn-rate constants and tick model; tune in
  playtest with config exposed.
- [Affects R6][Technical] Sane-maximum score threshold for server-side
  validation, derived from theoretical max whacks in 3 minutes.
- [Affects R7][Needs research] Source for non-chop SFX: WebAudio synthesis vs
  free asset packs; pick during implementation.
- [Affects R8][Technical] Internal resolution and integer scaling strategy for
  the canvas across common viewport sizes.

## Next Steps

→ /plan for structured implementation planning
