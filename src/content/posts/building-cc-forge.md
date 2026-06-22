---
title: 'cc-forge: My Workflow Toolkit for Claude Code'
date: 2026-06-20
summary: 'My GitHub workflows and a plugin I stumbled upon became cc-forge: a collection of skills and subagents I use in Claude Code that you can cherry-pick from.'
tags: [claude-code, tooling]
---

Claude Code has become a real part of how I build, and I wanted to start shaping
it to fit the way I work rather than reaching for defaults or repeating the same things over and over. So I
began writing my own skills, starting with the GitHub steps I ran on nearly every
task. That first set grew into a small collection, which I gathered into one
place: [cc-forge](https://github.com/HagenFritz/cc-forge).

## It started with my GitHub flow

The first skills I wrote were for the steps I run on nearly every task: open an
issue, cut a branch from that issue, do the work, open a PR. I had
opinions about each of those — how issues should be templated, how branches
should be named, what a PR description should contain — and writing skills let me
bake those opinions in once instead of re-typing them every time.

So the starting point for cc-forge was this flow:

- `/issue-from-context` — turn whatever we just discussed into a tracked issue,
  using my template.
- `/branch-from-context` — cut a branch straight from an issue either from context or by providing the issue number.
- `/ship` — open the PR with my structure already filled in.

That was the whole project at first: my common GitHub steps, with my templates,
one skill each.

## Then I found compound-engineering

Once I had the GitHub flow working, I was inspired. I wanted to see what other people were doing and found an _extensive_ list at [awesome claude code](https://github.com/hesreallyhim/awesome-claude-code/tree/bccc51cdd02fa0aecedcd6a4c257fc6f7ea0f811?tab=readme-ov-file). That's when I came across
Kieran Klaassen's
[compound-engineering plugin](https://github.com/EveryInc/compound-engineering-plugin)
(from [Every](https://every.to/guides/compound-engineering)), and I instantly
loved it.

What sold me was the loop itself: plan → work → assess → compound. You plan a
change before touching code, do the work, run it through review, and then capture
what you learned so it carries into the next change. Each pass leaves the codebase documented a little better than before, so the work builds on itself instead
of starting cold every time. My GitHub commands were shortcuts; this was a whole
development process you could encode and refine. It pushed cc-forge from "automate
my git habits" into "capture the way I actually build software."

## The brainstorm-to-ship loop

The second primary component is the build loop the commands chain into:

```
/brainstorm → /plan → /work → /deep-review
```

`/brainstorm` pulls requirements out through dialogue. `/plan` turns that into a
structured implementation plan grounded in the actual repo. `/work` executes it.
`/deep-review` runs a multi-agent code review. From there, you can either attack each item enumerated in the review or set out again brainstorming and planning solutions to those issues before working them out. 

## A confession about compounding

I was so enamored with the brainstorm, work, planning, and reviewing steps, that I
basically never used `/compound`; the skill that captures what you learned so it
carries into the next change. The literal _compounding_ part of "compound
engineering"...

However, some of this is genuine hesitation. `/compound`
writes solution docs that later get retrieved and trusted by `/plan`. That could be a doubled-edged sword. I'm still learning a lot, and I'm not confident every fix implemented is actually right. Bad knowledge compounds exactly like good knowledge. On top of that, our codebase moves fast. A solution
that's correct today can quietly go stale. The idea of the tool
faithfully retaining something wrong, then building on it, is enough to make me
hold off until I trust my own judgment more. 

## What it is (and isn't)

cc-forge is a **reference collection, meant to be cherry-picked, not installed as
a dependency.** You can pull it in as a Claude Code plugin:

```
/plugin marketplace add /path/to/clone/cc-forge
/plugin install cc-forge
```

...or just copy the individual skills and agents you want into your own
`~/.claude/skills/` and `~/.claude/agents/` and adapt them. cc-forge is meant as a starting kit, not a black box. A workflow is personal; what works for me
won't map cleanly onto someone else's repo, stack, or taste. The value is in the
patterns, not the install.

## Since then and what's next

Since April of this year, I've reworked some skills,
added new ones, and left others exactly as I found them; ported straight from
compound-engineering. I plan to write and share more about these updates so that hopefully others can be inspired too!
