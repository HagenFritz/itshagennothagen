# Writing a post (read me, not published)

This file starts with `_`, so the content loader's glob (`**/[^_]*.md` in
`src/content.config.ts`) skips it. It is never loaded, never routed, never
listed. Use it as scratch/notes too — any `_*.md` is ignored.

## Make a new post

1. Add `src/content/posts/my-slug.md`. The filename (minus `.md`) is the URL:
   `my-slug` → `/blog/my-slug`. Keep it lowercase-kebab.
2. Add frontmatter (all required unless noted):

   ```yaml
   ---
   title: 'Your Title' # quote it if it has a colon
   date: 2026-06-21 # YYYY-MM-DD
   summary: One or two sentences. Shows on the blog index and as the page/OG description.
   tags: [pokemon, python] # optional, defaults to []
   draft: false # optional, defaults to false
   ---
   ```

3. Write the body in Markdown below the frontmatter.

The schema lives in `src/content.config.ts`. A missing required field or wrong
type fails `npm run check` and the build — that's the guardrail.

## Tags — they autopopulate, don't edit anything else

The blog index (`src/pages/blog/index.astro`) builds the filter buttons from the
posts themselves: it collects every `tags` value across all posts, dedupes, and
sorts. There is no central tag list to maintain.

- Add a tag to a post → a new filter button appears on next build.
- Remove the last post using a tag → that button disappears.
- Spelling/case matters: `Python` and `python` are two different tags. Stay
  consistent.

So: just edit `tags:` in the post. Nothing else to change.

## draft

`draft: true` hides a post everywhere — the index, the route, the homepage
"recent" list all filter with `!data.draft`. Use it to commit a WIP without
publishing. Flip to `false` (or delete the line) to ship.

## Before you push

- `npm run format` — rewraps prose to 80 cols (Prettier `proseWrap: always`) and
  formats everything. CI fails if you skip it.
- `npm run check` — runs `astro check`; catches frontmatter/schema errors.
- `npm run build` — final sanity check; this is what Cloudflare runs.
- Spelling: CI runs codespell on `src/content`. Proper nouns are usually fine;
  real-word typos get caught.

`main` is branch-protected — open a PR, let CI pass, merge. Cloudflare
auto-deploys on merge and builds a preview per PR.

## Linking to a Lab tool

Lab tool pages live in `src/pages/labs/` (URL `/labs/<name>`). If a post has an
interactive companion (e.g. `/labs/pokemon-matcher`):

1. Add the tool page as `src/pages/labs/<name>.astro`. Note it sits one level
   deeper than other pages, so imports use `../../layouts/Base.astro`.
2. Link it in the post body (a "Try it yourself" section works well).
3. Add a card to `src/pages/lab.astro` (one entry in the `tools` array).
4. Add `lab` to the post's `tags:`. This is the convention for "this post has a
   Lab companion" — it surfaces the post under the `lab` filter on the blog
   index. Note the tag is only a label; it does not auto-link to `/lab`. The
   real link is the one you add in step 2.
