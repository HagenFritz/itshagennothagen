# itshagennothagen

Personal/professional website for Hagen Fritz, hosted on Cloudflare Pages at
**itshagennothagen.dev**.

## Stack

- **Astro** (static output) — pages in `src/pages/`, file-based routing.
- **Tailwind v4** via the Vite plugin (`@tailwindcss/vite`). No
  `tailwind.config`; theme tokens live in `src/styles/global.css`.
- **Inter** (self-hosted via `@fontsource-variable/inter`).
- Blog posts are Markdown content collection entries in `src/content/posts/`,
  schema in `src/content.config.ts`.
- **npm workspaces**: game/interactive code lives in `packages/*` (currently
  `packages/weed-whacker`: a headless TypeScript sim core plus canvas renderer,
  keyboard input, and WebAudio, exposing a `mount()` API that
  `src/pages/play.astro` drives). Packages are excluded from the root `tsconfig`
  and own their own strict tsconfig plus `test`/`typecheck` scripts. Game assets
  and the chop sound live in `public/games/weed-whacker/`.
- **Cloudflare Pages Functions**: backend lives in `functions/` at the repo root
  (no adapter; file routing, e.g. `functions/api/scores.ts` → `/api/scores`).
  One shared D1 database (`wrangler.toml` binds a production and a preview
  instance; schema in `functions/schema.sql`) backs both the Weed Whacker
  leaderboard (`scores` table) and a sliding-window rate limiter shared by the
  Spotify playlist-tracker endpoints (`api_requests` table). Validation helpers
  are shared with the sim from `packages/weed-whacker/src/leaderboard/`; the
  Spotify token cache/fetch helpers live in `functions/api/_spotify.ts`, the
  rate limiter in `functions/api/_rate-limit.ts` (underscore-prefixed files are
  excluded from Pages Functions routing). `functions/` is excluded from the root
  `tsconfig` and has its own; the root `typecheck` script covers it
  (`tsc -p functions`), and root `test` runs its Vitest suite.
- **`/labs/playlists`**: fetches live cover art, track counts, and tracklists
  for the playlists in `src/data/playlists.json` from Spotify's
  client-credentials API. Requires `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET`
  (production secrets via `wrangler pages secret put`; local dev via
  `.dev.vars`, gitignored).
- **`.claude/skills/`**: project-scoped Claude Code skills. `categorize-song`
  matches a liked song against `src/data/playlists.json`, logging misses to
  `docs/music/unsorted-songs.md`. `album-cover` generates a topographic-gradient
  cover image + SAT-word title for a playlist (builds on the global
  `generate-image` skill in `~/.claude/skills/`).

## Theme

Dark-only. Single source of truth for colors is the `:root` block in
`src/styles/global.css`, mapped to Tailwind utilities in the `@theme` block.
Palette is navy-tinted near-black with a burnt-orange (`#c2410c`) accent. Edit
colors there, not inline.

## Workflow

- `main` is branch-protected: no direct pushes. All changes go through a PR that
  must pass CI (`Build & checks` + `Spell check`).
- CI runs prettier check, `astro check`, typecheck (`npm run typecheck`, covers
  workspaces plus `functions/`), tests (`npm test`, workspaces plus the
  `functions/` Vitest suite), build, and codespell on `src/content`.
- Cloudflare auto-deploys `main` on merge and builds per-PR previews.
- Commands: `npm run dev` (port 4321), `npm run build`, `npm run check`,
  `npm run format`.
- Pages Functions (`functions/`, leaderboard API) do not run under `astro dev`,
  so the leaderboard shows "unavailable" on port 4321. Use `npm run dev` for
  everything except the leaderboard; use `npm run dev:api` (builds, applies the
  local D1 schema, serves on port 8788 via `wrangler pages dev dist`) when
  working on the API or submit/board flow. `npm run db:local` applies the schema
  to the local D1 on its own (idempotent).
- Leaderboard rate limiting keys on `CF-Connecting-IP`, which is only
  trustworthy behind the Cloudflare edge. The `*.pages.dev` deployment and PR
  preview URLs are directly reachable and can spoof that header to reset the
  per-IP bucket. Ops follow-up: add a Cloudflare redirect rule sending
  `*.pages.dev` to `itshagennothagen.dev` (or an Access policy on the pages.dev
  hostnames) so `/api/scores` is only reachable through the proxy.
- Prettier is configured with `proseWrap: always` — markdown prose is
  hard-wrapped at 80 columns. Write to the edge if you want; `npm run format`
  rewraps it. This keeps line-level git diffs clean (a one-word edit touches one
  line, not the whole paragraph). Note: Prettier reflows multi-line paragraphs
  but won't split a lone unbroken line, so don't hand-author single-line
  paragraphs.

## Writing style

- Do not use em dashes (—) anywhere, in prose or code comments. Rewrite with a
  period, comma, colon, or parentheses instead.

## Writing about Hagen — accuracy notes

- Current role: **Software Engineer II at Rogers-O'Brien**, building internal AI
  tools (the "Compass" platform).
- He has a **PhD in building science / indoor air quality**, but that is **past
  background, not his current identity**. Do not call him a "building scientist"
  or over-hype the academic work — mention it as history if relevant, kept
  light.
- Plays **beach volleyball**. Taught a UT class in Fall 2025 (one-off, fun).
- Keep the site's voice conversational and a little playful; match the existing
  `/about` and homepage tone. Don't inflate credentials.

## Related

- **PR #16**: Add the playlist tracker (D1-rate-limited Spotify proxy +
  /labs/playlists), the categorize-song and album-cover skills, and a blog post.
- **PR #15**: Add the global leaderboard (Cloudflare D1 + Pages Functions):
  token/score API, shared validation, /play submit UI, and a launch blog post
  (PR 3 of 3).
  [Plan](docs/plans/2026-07-03-001-feat-weed-whacker-web-v1-plan.md).
- **PR #14**: Add the playable Weed Whacker /play page: 7x7 fixed-board canvas
  renderer, keyboard input, WebAudio, and sprite-based HUD (PR 2 of 3).
  [Plan](docs/plans/2026-07-03-001-feat-weed-whacker-web-v1-plan.md).
- **PR #13**: Add the Weed Whacker game as an npm workspace package
  (`packages/weed-whacker`) with a deterministic headless sim core, plus CI
  test/typecheck steps.
  [Plan](docs/plans/2026-07-03-001-feat-weed-whacker-web-v1-plan.md).
- **PR #11**: Polish Fredericksburg trip post with maps buttons, website links,
  mobile table scroll, and SVG text size bump
- **PR #10**: Add Fredericksburg trip blog post with embedded interactive route
  widget and prose table styles
- **PR #9**: Add cc-forge-land.md, a blog post breaking down the /land skill as
  a follow-up to the cc-forge post.
