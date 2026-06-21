# itshagennothagen

Personal/professional website for Hagen Fritz, hosted on Cloudflare Pages at
**itshagennothagen.dev**.

## Stack

- **Astro** (static output) — pages in `src/pages/`, file-based routing.
- **Tailwind v4** via the Vite plugin (`@tailwindcss/vite`). No `tailwind.config`;
  theme tokens live in `src/styles/global.css`.
- **Inter** (self-hosted via `@fontsource-variable/inter`).
- Blog posts are Markdown content collection entries in `src/content/posts/`,
  schema in `src/content.config.ts`.

## Theme

Dark-only. Single source of truth for colors is the `:root` block in
`src/styles/global.css`, mapped to Tailwind utilities in the `@theme` block.
Palette is navy-tinted near-black with a burnt-orange (`#c2410c`) accent. Edit
colors there, not inline.

## Workflow

- `main` is branch-protected: no direct pushes. All changes go through a PR that
  must pass CI (`Build & checks` + `Spell check`).
- CI runs prettier check, `astro check`, build, and codespell on `src/content`.
- Cloudflare auto-deploys `main` on merge and builds per-PR previews.
- Commands: `npm run dev` (port 4321), `npm run build`, `npm run check`,
  `npm run format`.

## Writing about Hagen — accuracy notes

- Current role: **Software Engineer II at Rogers-O'Brien**, building internal AI
  tools (the "Compass" platform).
- He has a **PhD in building science / indoor air quality**, but that is **past
  background, not his current identity**. Do not call him a "building scientist"
  or over-hype the academic work — mention it as history if relevant, kept light.
- Plays **beach volleyball**. Taught a UT class in Fall 2025 (one-off, fun).
- Keep the site's voice conversational and a little playful; match the existing
  `/about` and homepage tone. Don't inflate credentials.
