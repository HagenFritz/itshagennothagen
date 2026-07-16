# itshagennothagen

Personal site of Hagen Fritz, live at
[itshagennothagen.dev](https://itshagennothagen.dev). Astro (static output) on
Cloudflare Pages, with Pages Functions and a D1 database backing the interactive
bits.

## What's here

- **Pages** in `src/pages/` (file-based routing), styled with Tailwind v4. Theme
  tokens live in `src/styles/global.css`.
- **Blog** posts are Markdown content collection entries in
  `src/content/posts/`; see `src/content/posts/_GUIDE.md` for how to write one.
- **Weed Whacker** (`/play`): a one-minute tile game. The sim core, renderer,
  input, and audio live in the `packages/weed-whacker` npm workspace; a global
  leaderboard runs on D1.
- **Lab** (`/lab`): small interactive tools, including a Pokémon stat matcher
  and a Spotify playlist tracker (`/labs/playlists`) that proxies Spotify's
  client-credentials API through Pages Functions.
- **API** in `functions/` (Pages Functions file routing, e.g.
  `functions/api/scores.ts` serves `/api/scores`). Schema in
  `functions/schema.sql`.

## Commands

| Command             | What it does                                             |
| ------------------- | -------------------------------------------------------- |
| `npm run dev`       | Astro dev server on port 4321 (no Pages Functions)       |
| `npm run dev:api`   | Build + serve `dist` with Functions and local D1 on 8788 |
| `npm run build`     | Production build                                         |
| `npm run check`     | `astro check`                                            |
| `npm run typecheck` | Typecheck workspaces plus `functions/`                   |
| `npm test`          | Workspace tests plus the `functions/` Vitest suite       |
| `npm run format`    | Prettier (prose hard-wraps at 80 cols)                   |

## Deploy

`main` is branch-protected; all changes go through a PR that must pass CI
(build, checks, tests, codespell). Cloudflare Pages auto-deploys `main` on merge
and builds per-PR previews. Spotify credentials are Pages secrets
(`wrangler pages secret put`); local dev reads `.dev.vars` (gitignored).

More detail in [CLAUDE.md](CLAUDE.md).
