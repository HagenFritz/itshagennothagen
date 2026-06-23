---
title: 'Landing a PR With One Command'
date: 2026-06-23
summary: 'A look at /land, the cc-forge skill that takes an open PR from "ready" to merged-and-synced in one command.'
tags: [claude-code, tooling]
---

The interesting part of shipping software is writing the code. The boring part is everything that happens after the PR is open: watching CI, fixing whatever it flags, squash-merging, deleting branches, and pulling main.

It's necessary, repetitive, and exactly the kind of thing AI agents should handle for us.

In my [previous post](/blog/building-cc-forge), I introduced `cc-forge`: my personal collection of Claude Code skills and subagents designed to automate the repetitive parts of my development workflow. I already had a skill called `/land`, that helped to log previous actions in a localized `CLAUDE.md` file. This skill seemed like the pefect one to append a merge-and-sync step to. 

I am sharing a short breakdown of `/land` here so that you can [hopefully] be inspired and use it as a reference to build your own related skill. You can find the full implementation in the [cc-forge repository](https://github.com/HagenFritz/cc-forge/blob/main/skills/land/SKILL.md).

## The Breakdown

In brief, here is what happens when you run `/land`:

1. **Stamp provenance**: It adds an entry to the relevant `CLAUDE.md` with the PR link and a summary. This builds a running record of why a directory looks the way it does and helps actually implement the _compound_ part that `cc-forge` was inspired by.
2. **Verify**: It runs any tests mentioned in the PR and watches GitHub Actions (`gh pr checks --watch`).
3. **Fix**: If CI fails, the agent diagnoses the issue, proposes a fix, and commits it. (This loops up to three times, but always asks for your confirmation before pushing).
4. **Merge**: Once green, it squash-merges the PR and deletes and remote branch.
5. **Sync**: It checks out `main`, pulls the latest, and then deletes the local PR branch.

## Automating the Predictable

By automating the predictable sequence, `/land` closes the loop. From `/brainstorm` to a merged PR, you spend less time clicking through the GitHub UI and more time just building.