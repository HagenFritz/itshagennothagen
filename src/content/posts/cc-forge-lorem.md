---
title: 'Lorem Ipsum by the Character, Word, or Token'
date: 2026-10-23
summary: '/lorem prints filler text at an exact count of characters, words, or paragraphs, estimates tokens, and copies it to the clipboard, all without leaving Claude Code.'
tags: [claude-code, tooling]
draft: false
---

I use [lipsum.com](https://www.lipsum.com/) any time I need to check
that a UI handles scrolling, overflow, or a character limit. I go there, grab a
block of filler text, and paste it in.

Two things about using lipsum.com started to bug me:
1. lipsum.com counts by paragraphs, words, or bytes. No option for character or token.
2. Having to navigate away from Claude Code to get the text

Finally, when I needed 500 characters to test the limit of a text entry box, I decided to create my own skill. Thus, `/lorem` was born. It is a
[Claude Code skill](https://code.claude.com/docs/en/skills) in my Claude Code workflow repository [cc-forge](/blog/building-cc-forge)

## What it does

You type `/lorem`, a count, and a unit:

```text
/lorem 160 chars
```

The unit is `[c]hars`, `[w]ords`, `[p]aragraphs`, or `[t]okens`. The text prints in
the session and copies to your clipboard.

## Why a skill and script

The skill is primarily a shortcut for a prompt. `/lorem 160 chars` is what I would
otherwise type out as "give me exactly 160 characters of lorem ipsum", the same
way [`/tldr`](/blog/cc-forge-tldr) replaced "please respond in one or two
sentences". The skill file holds the prompt and its rules so I only type the
two arguments.

But the skill also helps create more reliable token-based outputs. Claude can count well enough. I tested it: asked for
exactly 500 characters or 50 words with tools switched off and Opus 5.5 hit the
number every time. Tokens are where Claude struggles. I asked for exactly 100 tokens and received 154, 229, and 250 across
three tries, because a model has no tokenizer to consult while it writes. But every ask is a model call, and the text comes out
different each run. So I use a script to generate the filler text. The script sizes the text from a characters-per-token ratio, sends that text to Anthropic's
[`count_tokens`](https://platform.claude.com/docs/en/api/messages/count_tokens)
endpoint, and lets Haiku 5.5 count it. If the answer is off by more than 2%, it
resizes once and counts again. Two or three round trips, and what comes back is a decent estimate rather than an exact hit. The bundled-script idea comes from
[intellectronica's lorem-ipsum skill](https://github.com/intellectronica/agent-skills/blob/main/skills/lorem-ipsum/SKILL.md),
which generates its filler with a Python script.

## Three runs

### Words

```text
/lorem 25 words
```

```text
Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis
```

### Characters
Characters are a hard cut, so the text stops mid-word when the count says so.

```text
/lorem 160 chars
```

```text
Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostru
```

### Tokens

```text
/lorem 60 tokens
```

```text
Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
```

> 58 tokens by Haiku 5.5's counter

## Try it

The skill is a folder with two files, the skill file and the script:
[`skills/lorem`](https://github.com/HagenFritz/cc-forge/tree/main/skills/lorem).
Copy it into your own skills folder, or use it as a starting point for your
own.
