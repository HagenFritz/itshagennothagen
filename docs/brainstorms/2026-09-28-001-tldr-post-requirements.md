---
date: 2026-09-28
sequence: 001
topic: tldr-post
---

# /tldr blog post

## Problem Frame

A blog post on the site about the `/tldr` skill from cc-forge
(`skills/tldr/SKILL.md`, added in cc-forge #81 on 2026-08-25). The skill caps a
single response at N sentences in plain language: N is a ceiling, not a target;
length is cut, not content; exact identifiers stay exact. A LinkedIn version
follows once this post is done.

Nearest sibling post: `src/content/posts/cc-forge-land.md` (about 350 words,
tags `[claude-code, tooling]`, links the skill on GitHub).

## Requirements

- R1. Open with the origin: the widespread complaint that Opus 5 is verbose,
  which Hagen hit himself. Two concrete moments: a multi-paragraph reply to a
  yes/no question, and asking for "just yes or no" and getting "Yes." plus a
  sentence anyway. The instruction was ignored, not misread.
- R2. Include the phone angle as a pain point (a wall of text on a phone screen
  is not fun), but not how often he works from his phone.
- R3. Ground the "it's not just me" claim in one or two cited sources, not a
  survey of the discourse. Candidates, all to verify before citing:
  - Botmonster roundup of Reddit reception ("a genius that will not shut up"),
    naming r/ClaudeCode "The Opus 5 experience" and r/ClaudeAI threads:
    https://botmonster.com/ai/claude-opus-5-reddit-reception/
  - anthropics/claude-code#83510, a measured claim of about 60% more words than
    Opus 4.8 at matched effort, tokenizer-corrected; open, no maintainer reply:
    https://github.com/anthropics/claude-code/issues/83510
  - Claim that Claude Code gives Opus 5 a shorter system prompt without the
    anti-verbosity rules:
    https://lucadidomenico.studio/en/blog/opus-5-verbose-system-prompt-claude-code
    (third party, unverified; cite only if confirmed).
- R4. One-sentence aside on what came before: he tried an always-on "caveman"
  mode (cc-forge's `/caveman`, adapted from
  https://github.com/JuliusBrussee/caveman, MIT) with a hook and a flag file to
  keep it on every turn. It never really worked, and he wanted concise answers
  on demand, when he chose, not a permanent mode. Credit the upstream project
  neutrally; the complaint is about his experience, not a takedown.
- R5. Why a skill instead of typing it: two reasons, both stated.
  - Less typing. He kept writing "please respond in one or two sentences" or
    "please respond yes or no" on every question; `/tldr 2` replaces that.
  - More instruction than a one-liner can carry. "Be brief" is too little for
    the model to act on: it doesn't say what to keep and what to drop. The skill
    spells out what he cares about (exact facts, identifiers, plain words) and
    what he doesn't (hedging, filler, restating the question), and that detail
    is what makes the brevity work across questions.
- R6. Examples are real runs, not written by hand:
  `claude -p --model claude-opus-5` in this repo on 2026-09-28, with Hagen's
  global CLAUDE.md loaded (which already says "Be concise"). That the global
  rule is present and the plain answer still runs long is part of the point.

  **Example A, yes/no** ("Does the Weed Whacker leaderboard work when I run npm
  run dev?"):
  - Plain: 2 paragraphs, "No, dood." plus the reason plus a second paragraph on
    `npm run dev:api`.
  - "Respond yes or no: ...": "No, dood." followed by a full sentence anyway.
    This is exactly the complaint in R1.
  - `/tldr 1`: one sentence with the answer, the reason, and the fix.

  **Example B, open "why"** ("Why does the ATXactly page fetch its location data
  instead of inlining it in the HTML?"):
  - Plain: 118 words, a bulleted walkthrough plus a "gotcha" section.
  - "Please respond in one or two sentences: ...": 52 words, accurate.
  - `/tldr 2`: 54 words, with a factual error: it called the location rows "~415
    KB" (the rows are about 280 KB; 415 KB was the old HTML shell).

  Findings to handle in the post:
  - On B, the typed-out instruction did as well as `/tldr 2`. The honest pitch
    is less typing plus consistent rules, not "the model only obeys the skill."
    Example A is the one that shows the instruction being ignored.
  - Both short answers hit the sentence cap by joining clauses with semicolons.
  - The `/tldr 2` error breaks the skill's own "facts stay exact" rule.

- R7. Show one example only: a simple, generic programming concept, not tied to
  this repo. "What's the difference between a list and a tuple in Python?" run
  on Opus 5 from an empty folder on 2026-09-28: 187 words plain (code blocks,
  bullets, a gotcha); 28 words with `/tldr 1`. Question shown once, then the two
  responses. Earlier repo-specific examples were dropped.
- R8. Include a short "when not to use it" note, drawn from Example B without
  showing it: `/tldr` is for questions that deserve a sentence or three (a
  yes/no, a quick fact, a pick). Give it a wide-open "why" and a tight cap, and
  the model uses grammar workarounds (semicolons, clauses stacked on clauses) to
  fit everything in, and accuracy is what gets lost. Match N to the question;
  don't squeeze a big question into one sentence.
- R9. Call out four of the skill's rules, one line each:
  1. N is a hard limit. In practice it usually uses all N sentences (the
     "ceiling, not target" wording in SKILL.md doesn't hold up), but it never
     goes over, which "be brief" and caveman mode never managed. The post claims
     the restriction, not the ceiling behavior.
  2. Cut length, not content: facts stay; hedging and filler go.
  3. Plain words ("The check runs too early" beats "there is a temporal ordering
     issue with the validation invocation").
  4. Exact identifiers stay exact: file paths, error strings, API names. The
     rest (no preamble, code blocks not counted, "say what was left out") stay
     in the linked SKILL.md only.
- R10. Describe his two real patterns:
  - `/tldr 2 the issue and the solution`: one sentence for what's wrong, one for
    the fix. His most common use.
  - `/tldr 1 <concept>`: for a concept that doesn't deserve a paragraph. He
    rarely goes to 3 (only for a bigger concept) and never beyond. This ties
    into R8: small N for small questions.
- R11. Scope is coding sessions only. Don't pitch it as a general-purpose chat
  tool or suggest non-code uses.
- R12. Audience is programmers and developers, on both the site and LinkedIn.
  Not written for his construction network.
  - Site post stays technical. Link terms of art on first use instead of
    explaining them inline (e.g. "Claude Code skill" links to Anthropic's skills
    docs). Verify each docs URL before publishing.
  - LinkedIn version keeps the technical framing, but LinkedIn post bodies don't
    render inline hyperlinks (only bare URLs), so there it's one link to the
    site post, not per-term links.
  - Don't claim how it performs outside coding; he hasn't tried it.
- R13. Link the skill file
  (https://github.com/HagenFritz/cc-forge/blob/main/skills/tldr/SKILL.md) and
  invite readers to copy it or build their own, as the `/land` post does. Also
  link back to the cc-forge intro post (`/blog/building-cc-forge`).
- R14. Personal tooling only. No mention of Rogers-O'Brien, Compass, or work.
- R15. Title "Claude, Give Me the /tldr", slug `cc-forge-tldr` (URL
  `/blog/cc-forge-tldr`, matching `cc-forge-land`). Title case follows the
  sibling posts; `/tldr` stays lowercase since it's the command.
- R16. No word limit. Concise, but err on more detail; trim in review. Tags
  `[claude-code, tooling]`. Example A as text, not a screenshot. Dated
  2026-09-28 with `draft: true` until reviewed.

## Open Questions

None. Next: write `src/content/posts/cc-forge-tldr.md`, then the LinkedIn
version.
