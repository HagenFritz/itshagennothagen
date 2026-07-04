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

## Theme

Dark-only. Single source of truth for colors is the `:root` block in
`src/styles/global.css`, mapped to Tailwind utilities in the `@theme` block.
Palette is navy-tinted near-black with a burnt-orange (`#c2410c`) accent. Edit
colors there, not inline.

## Workflow

- `main` is branch-protected: no direct pushes. All changes go through a PR that
  must pass CI (`Build & checks` + `Spell check`).
- CI runs prettier check, `astro check`, workspace typecheck
  (`npm run typecheck`), workspace tests (`npm test`), build, and codespell on
  `src/content`.
- Cloudflare auto-deploys `main` on merge and builds per-PR previews.
- Commands: `npm run dev` (port 4321), `npm run build`, `npm run check`,
  `npm run format`.
- Pages Functions (`functions/`, leaderboard API) do not run under `astro dev`.
  Local dev with a bound local D1:
  `npm run build && npx wrangler pages dev dist`. Apply the schema first with
  `npx wrangler d1 execute weed-whacker-leaderboard --local --file=functions/schema.sql`.
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
