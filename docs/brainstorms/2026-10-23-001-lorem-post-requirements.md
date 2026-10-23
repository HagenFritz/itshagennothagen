---
date: 2026-10-23
sequence: 001
topic: lorem-post
---

# /lorem blog post

## Problem Frame

A blog post on the site about the `/lorem` skill from cc-forge (`skills/lorem/`,
added in cc-forge #135 on 2026-10-23). The skill prints deterministic lorem
ipsum at an exact count of characters, words, or paragraphs, estimates a token
count through Anthropic's token-counting API, and copies the result to the
clipboard. A LinkedIn version follows in the same pass.

Nearest sibling post: `src/content/posts/cc-forge-tldr.md` (tags
`[claude-code, tooling]`, links the skill on GitHub and the cc-forge intro
post).

## Requirements

- R1. Open with the origin: Hagen uses https://www.lipsum.com/ to generate
  filler for UI testing (scrolling, overflow, character limits), most recently
  to test a 500-character limit. lipsum.com generates by paragraphs, words, or
  bytes but has no character count and no token count. He wanted both, from
  inside Claude Code, without leaving for a website.
- R2. The pitch is a shortcut, not a correctness claim: `/lorem` keeps him in
  Claude Code, gives the character and token units lipsum.com lacks, and copies
  the text to the clipboard so it is ready to paste.
- R3. Soften "models can't count" to what was measured. On 2026-10-23, Opus 5.5
  with tools disabled (`claude -p --tools ""`) returned exactly 500 characters
  (3 of 3), 50 words (3 of 3), and 2,000 characters (2 of 2) when asked. Asked
  for exactly 100 tokens, it returned roughly 229, 250, and 154 tokens by Haiku
  5.5's counter. The post says: the model can count characters and words, but
  each ask is a model call that is slower than a script and never the same text
  twice; tokens it cannot count, because it has no tokenizer to hand.
- R4. Say that the generation runs in a small bundled script, not in the model.
  The script is Node, not Python; do not call it a Python script.
- R5. Credit the prior art: intellectronica's `lorem-ipsum` skill
  (https://github.com/intellectronica/agent-skills/blob/main/skills/lorem-ipsum/SKILL.md),
  found while researching, which also generates through a bundled script (its is
  Python). One sentence with the link; neutral tone.
- R6. Show output from three modes only — words, chars, tokens — and not
  paragraphs. Real runs of `generate.cjs` on 2026-10-23:
  - `/lorem 25 words`: "Lorem ipsum dolor sit amet, consectetur adipiscing elit,
    sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
    ad minim veniam, quis"
  - `/lorem 160 chars`: same opening, hard-cut at 160 to "…Ut enim ad minim
    veniam, quis nostru"
  - `/lorem 60 tokens`: "Lorem ipsum dolor sit amet, consectetur adipiscing
    elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
    with the note "58 tokens by Haiku 5.5's counter".
- R7. Tokens get one short section: the count is an estimate, not exact. The
  script sizes the text from a measured characters-per-token ratio, sends it to
  Anthropic's `count_tokens` endpoint counted by Haiku 5.5, rescales once if it
  is off by more than 2%, and reports the measured number. Two or three round
  trips, still only a decent estimate. Needs an API key in the cc-forge
  repo-root `.env`.
- R8. Mention all four modes (chars, words, paragraphs, tokens) and the
  clipboard copy. Do not mention: the one-letter aliases, that the same input
  gives the same text, the size caps, or the Linux/pbcopy fallback.
- R9. Audience is programmers and developers, on the site and LinkedIn. Link
  terms of art on first use ("Claude Code skill" to Anthropic's skills docs,
  `count_tokens` to its API reference). Verify every URL before publishing.
- R10. Link the skill directory
  (https://github.com/HagenFritz/cc-forge/tree/main/skills/lorem) and invite
  readers to copy it, as the `/tldr` and `/land` posts do. Link back to the
  cc-forge intro post (`/blog/building-cc-forge`) and the `/tldr` post
  (`/blog/cc-forge-tldr`) where natural.
- R11. Personal tooling only. No mention of Rogers-O'Brien, Compass, or work.
- R12. Title "Lorem Ipsum by the Character, Word, or Token", slug
  `cc-forge-lorem` (URL `/blog/cc-forge-lorem`). Tags `[claude-code, tooling]`.
  Dated 2026-10-23 with `draft: true` until reviewed.
- R13. Short and sweet: shorter than the `/tldr` post. Examples as text in
  `text` code blocks, which soft-wrap on the site.
- R14. LinkedIn version written in the same pass: technical framing, no inline
  links (LinkedIn renders only bare URLs), one link to the site post.

## Open Questions

None. Next: write `src/content/posts/cc-forge-lorem.md`, then the LinkedIn
version.
