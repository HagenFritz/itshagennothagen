# itshagennothagen

Personal/professional website for Hagen Fritz, hosted on Cloudflare Pages at
**itshagennothagen.dev**.

## Stack

- **Astro** (static output): pages in `src/pages/`, file-based routing. Custom
  404 page (`src/pages/404.astro`), RSS feed (`src/pages/rss.xml.ts` →
  `/rss.xml`), security headers in `public/_headers`.
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
- **`packages/tile-map`**: the shared canvas map.
  `createTileMap(container, options)` owns two DPR-aware canvases, a CARTO dark
  tile loader (retina `@2x`, retry then Esri fallback, bounded cache), a
  pan/zoom camera clamped to content bounds with per-side padding, and
  nearest-point hit testing. The `tile-map/geo` subpath is pure (projection,
  bounds, fit zoom, haversine, nearest, `routeToSvgPath`) with no DOM
  references, so it imports safely from Astro frontmatter. Consumers:
  `/labs/austin-pogo-map` and `/albums/roadtrips/[slug]`. `atxactly.astro` takes
  only the projection helpers from `tile-map/geo` (game logic comes from
  `packages/atxactly`) and owns its tiles and camera, because it swaps between
  two basemap layers (no labels during play, labels at reveal), needs a fallback
  provider per layer, and brightens tiles with a CSS filter, none of which
  `createTileMap` offers. So `tile-map` is the source of truth for tiles only
  where a page needs one layer with one fallback.
- **`packages/atxactly`**: the pure game logic behind `/labs/atxactly`.
  `src/scoring.ts` holds the score curve, `haversine`, polygon distance, and
  `MULTIPLIERS`; `src/deck.ts` holds the seeded PRNG and `buildRound(pool, day)`
  for the daily 1-1-2-2-3 draw. Both are typed structurally, so the package
  never imports the site's `Location` type and has no DOM or Node dependencies.
  Same shape as the other packages (strict tsconfig, colocated Vitest specs,
  root `file:` dependency). `scripts/atxactly_scoring.py` mirrors
  `src/scoring.ts` in Python; change both together.
- **ATXactly dataset delivery**: `src/lib/atxactly-locations.ts` trims
  `src/data/atxactly-locations.json` to eligible rows and client fields at build
  time, serialises it once, and hashes the body.
  `src/pages/data/atxactly/[hash].json.ts` emits that body at
  `/data/atxactly/<hash>.json` (about 280 KB), which `public/_headers` caches
  immutably under `/data/*`. The page fetches it at boot, keeping taps locked
  until the payload validates and showing a Reload button on failure, which is
  what keeps the HTML shell at 5.4 KB instead of the 415 KB it was when the rows
  were inlined. The preload link and the fetch must agree on credentials mode:
  `crossorigin` on the link pairs with `credentials: 'same-origin'` on the
  fetch, and any other pairing downloads the file twice. The link needs the
  named `head` slot in `src/layouts/Base.astro` and must be an immediate child
  of `<Base>`, since Astro does not hoist `<link>` tags out of a wrapper.
- **`/albums/roadtrips`**: a `roadtrips` content collection
  (`src/content/roadtrips/*.yaml`, schema in `src/content.config.ts`) where each
  trip carries an intro, a road-following `route` polyline, and stops with
  dates, blurbs, and photos from `src/assets/roadtrips/<slug>/`. The index lists
  trips newest first with an inline SVG of each route's shape as the thumbnail,
  drawn at build time by `routeToSvgPath`. `/albums/roadtrips/[slug]` is a
  map-as-page: pins open a card anchored to the pin (docked across the bottom
  below 640px), the selected stop is written to the URL hash so a stop can be
  deep-linked, and the first stop's card, which carries the trip intro, is open
  by default.
- **Road trip scripts**: `scripts/prep_roadtrip_photos.mjs <slug>` downscales
  the photos dropped in `src/assets/roadtrips/<slug>/` in place, baking
  orientation into the pixels and keeping EXIF so stop coordinates stay
  re-derivable. `scripts/build_roadtrip_route.py <slug>` sends the trip's stops
  to the public OSRM API, simplifies the returned geometry, and writes the
  `route:` block and `miles:` back into the trip YAML. Both are run by hand, not
  in CI.
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
- **`/labs/austin-pogo-map`**: plots Pokémon GO gyms and breakfast venues from
  `src/data/pogo-gyms.json` and `src/data/pogo-venues.json`, scoring each venue
  by how many gyms fall inside an adjustable interaction radius (80m default).
  Renders through `packages/tile-map` over CARTO dark raster tiles, no mapping
  library. Both data files are hand-maintained (gym locations live in Niantic's
  Wayfarer system, not OSM, so there is nothing to query); adding entries to the
  JSON is all that is needed to extend the map.
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
  `functions/` Vitest suite), prose lint (`npm run lint:prose`, Vale on
  `src/content`), build, and codespell on `src/content`.
- Cloudflare auto-deploys `main` on merge and builds per-PR previews.
- Commands: `npm run dev` (port 4321), `npm run build`, `npm run check`,
  `npm run format`, `npm run lint:prose`.
- Vale is not an npm dependency. `lint:prose` calls the `vale` binary on your
  PATH (`brew install vale`), and CI installs a pinned release in the workflow.
  The npm wrapper fetched the binary from api.github.com in a postinstall, which
  got rate limited on Cloudflare's shared build IPs and failed deploys.
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
- Adding a road trip: drop the photos in `src/assets/roadtrips/<slug>/` and run
  `node scripts/prep_roadtrip_photos.mjs <slug>`; author
  `src/content/roadtrips/<slug>.yaml` with the stops in driving order, block
  style (a stop may list `via:` waypoints the route must pass through on the way
  to it, for the toll road you actually took), and do not hand-write `route:` or
  `miles:`; then run `python3 scripts/build_roadtrip_route.py <slug>`, which
  makes a single OSRM request (the demo server's policy is 1 req/s) and writes
  both fields back.
- Every tile map must visibly credit OpenStreetMap and CARTO, plus OSRM wherever
  a route line is drawn. Render the tile credit from `handle.attribution()` so
  it swaps to Esri's string when the fallback tiles are active. This is a
  license obligation, not a nicety.
- Prettier is configured with `proseWrap: always`, so markdown prose is
  hard-wrapped at 80 columns. Write to the edge if you want; `npm run format`
  rewraps it. This keeps line-level git diffs clean (a one-word edit touches one
  line, not the whole paragraph). Note: Prettier reflows multi-line paragraphs
  but won't split a lone unbroken line, so don't hand-author single-line
  paragraphs. Exception: `src/content/posts/` is in `.prettierignore` (embedded
  HTML/JS in posts would get mangled), so blog post prose is NOT rewrapped; wrap
  it by hand.

## Writing style

- Do not use em dashes (—) anywhere, in prose or code comments. Rewrite with a
  period, comma, colon, or parentheses instead. For label-description pairs
  (schedule lines, command lists), use a middle dot (·). Vale enforces this on
  `src/content` (`npm run lint:prose`, also in CI).

## Post HTML helpers

Reusable classes for hand-authored HTML inside blog posts, defined in the "Post
HTML helpers" section of `src/styles/global.css`. Use these instead of inline
style attributes:

- `figure-center`: centered figure; add `pixel-img` on the img for sprites.
- `icon-rows` > `row` > `key` (`emoji` + `name`) + `desc`: emoji-keyed
  label-description rows (see pokemon-matcher.md).
- `stat-bars` > `row` > `label` + `bar` > `fill` (inline `width: N%`) + `val`
  (add `max` to bold the top stat): horizontal bar chart.

When a second post needs a pattern that exists inline somewhere, extract it here
first. Good future candidates: pull quote, side-by-side image pair, big-number
callout. Keep true one-off widget styles (like the trip route map canvas) scoped
inline in their post.

Interactive UI shared across lab pages lives in `global.css` too, driven by
`aria-pressed` or `:checked` rather than JS class toggles: `.tag-btn` (filter
chips) and `.filter-menu` / `.filter-trigger` / `.filter-popover` /
`.filter-option` (multi-select dropdowns, used by the pogo map).

## Writing about Hagen (accuracy notes)

- Current role: **Software Engineer II at Rogers-O'Brien**, building internal AI
  tools (the "Compass" platform).
- He has a **PhD in building science / indoor air quality**, but that is **past
  background, not his current identity**. Do not call him a "building scientist"
  or over-hype the academic work. Mention it as history if relevant, kept light.
- Plays **beach volleyball**. Taught a UT class in Fall 2025 (one-off, fun).
- Keep the site's voice conversational and a little playful; match the existing
  `/about` and homepage tone. Don't inflate credentials.
