---
title: 'Claude, Give Me the /tldr'
date: 2026-09-28
summary: '/tldr caps a Claude Code answer at N sentences in plain language. Why I built it, the rules that make it work, and when not to use it.'
tags: [claude-code, tooling]
draft: false
---

If you have used Opus 5 for any length of time, you know it has a lot to say.
Reddit's verdict was that it is
[a genius that will not shut up](https://botmonster.com/ai/claude-opus-5-reddit-reception/),
and one [GitHub issue](https://github.com/anthropics/claude-code/issues/83510)
measured roughly 60% more words per answer than Opus 4.8 on the same prompts.

I ran into the same thing. I would ask a yes or no question and get back three
paragraphs. Worse, I would ask it to _respond with just yes or no_, and it would
say "Yes." and then keep going for another sentence anyway.

So I built `/tldr`, a small
[Claude Code skill](https://code.claude.com/docs/en/skills) in
[cc-forge](/blog/building-cc-forge), my collection of Claude Code skills.

## What it does

You type `/tldr` followed by a number and your question:

```text
/tldr 2 why is the build failing?
```

The number is the most sentences Claude is allowed to use for a
_plain-language_ answer. It applies to that one response only; the next message
goes back to normal.

While Opus 5.5 has been noticeably better so far, I still reach for `/tldr`
when I need a simple, short response.

## Why not just ask for a short answer?

I was already doing that. I kept typing "please respond in one or two
sentences" or "please respond yes or no" at the end of my questions, and I
wanted something faster to type.

The bigger reason is that "be brief" is not enough instruction. It tells the
model to be shorter, but not what to keep and what to cut whereas a skill can
spell that out. The rules are what help it do that:

1. **N is a hard limit.** Ask for two sentences and you get two. Claude usually
   uses all N sentences, but it has yet to go over.
2. **Cut length, not content.** The facts stay exact. Hedging, filler, and
   background are what go.
3. **Plain words.** "The check runs too early" beats "there is a temporal
   ordering issue with the validation invocation" 🤮
4. **Exact identifiers stay exact.** File paths, error strings, and API names
   are never paraphrased, even when everything around them gets simplified.

## An example

I asked Opus 5 the same question two ways from an empty folder. My global
`CLAUDE.md` already tells Claude to be concise (it also gives Claude a
skater persona that calls me "dood" - a story for another time), so
this is with a brevity rule in place.

The question:

```text
What's the difference between a list and a tuple in Python?
```

Asked plainly (187 words):

````text
Dood — core difference: **mutability**.

```python
xs = [1, 2, 3]   # list, mutable
ts = (1, 2, 3)   # tuple, immutable
xs[0] = 99       # fine
ts[0] = 99       # TypeError
```

What follows from that:

- **Hashable** — tuples can be dict keys / set members (if their contents are hashable). Lists can't.
- **Methods** — lists have `append`, `extend`, `insert`, `remove`, `pop`, `sort`, `reverse`. Tuples have only `count` and `index`.
- **Memory/speed** — tuples are slightly smaller and faster to construct; lists over-allocate to make `append` amortized O(1). Not a reason to pick one in most code.
- **Semantics** — the real reason. Lists are homogeneous sequences of varying length ("all the users"). Tuples are fixed-size records where position means something (`(x, y)`, `(host, port)`). That's why `dict.items()` yields tuples and why functions return tuples for multiple values.

Gotcha worth knowing: immutable ≠ deeply immutable.

```python
t = ([1], [2])
t[0].append(9)   # works — t is (([1, 9]), [2])
hash(t)          # TypeError: unhashable
```

If you want a named fixed record, `typing.NamedTuple` or `@dataclass(frozen=True)` beats a bare tuple — same immutability, readable field access.
````

With `/tldr 1` in front:

```text
A list is mutable and a tuple is not, dood — lists grow and change in place, tuples are fixed once made (and so can be dict keys).
```

## How I use it

Almost always one of two ways:

- `/tldr 1` for a concept that does not deserve a paragraph.
- `/tldr 2 the issue and the solution` gets me one sentence on what is wrong
  and one on how to fix it. This is most of my usage.

I go to 3-5 for a bigger concept, but never higher. I only use `/tldr`
while coding, but I know the concept would translate to more generic prompts. 

## When not to use it

`/tldr` is for questions that deserve a sentence or three. If you give it a
wide open "why" question and a tight cap, the model will try to fit everything
in anyway, using semicolons and clauses stacked on clauses.

Match N to the question. Sometimes a big question deserves a long-winded answer.

## Try it

The whole skill is one short file:
[`skills/tldr/SKILL.md`](https://github.com/HagenFritz/cc-forge/blob/main/skills/tldr/SKILL.md).
Copy it into your own skills folder, or use it as a starting point for your
own.
