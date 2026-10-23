# LinkedIn post: /tldr

Site post: `/blog/cc-forge-tldr`

```text
Opus 5 is brilliant, but loves to talk.

If I ask Claude Code a simple question like:"What's the difference between a list and a tuple in Python?"

I get back something ~200 words with two code blocks, four bullet points, a gotcha section, and a closing tip. That's even with a "be concise" note in my global CLAUDE.md.

So I built /tldr <N>, a small, but mighty Claude Code skill. Put /tldr 1 in front of the same question and I get:

"A list is mutable and a tuple is not: lists grow and change in place, tuples are fixed once made (and so can be dict keys)."

"Be brief" doesn't work well because it doesn't provide concrete direction. The skill does:
- N sentences is a hard limit
- Cut length, not content
- Plain words over jargon
- File paths, error strings, and API names never get paraphrased

My most-used form: /tldr 2 the issue and the solution. Cuts out unnecessary fluff and gets right to the point so I can make a decision (or know how to ask for more detail).

I have a more detailed write-up here: https://lnkd.in/gYq_QTiJ
The full skill file is here: https://lnkd.in/gY8nKRuP
```
