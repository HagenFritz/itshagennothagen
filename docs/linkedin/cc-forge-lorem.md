# LinkedIn post: /lorem

Site post: `/blog/cc-forge-lorem`

```text
I use lipsum.com any time I need to test a UI: scrolling, overflow, character limits. Paste in filler, see what breaks.

Then I needed exactly 500 characters to test a text box. lipsum.com counts paragraphs, words, or bytes. No characters, no tokens. And every trip there is a trip out of Claude Code.

So I built /lorem <N> <unit>, a Claude Code skill that's really a shortcut for a prompt:

/lorem 160 chars
/lorem 25 words
/lorem 60 tokens

The text prints in the session and lands on my clipboard.

Claude can count characters and words just fine. With tools off, Opus 5.5 hit 500 characters and 50 words every time. Tokens are a different story. I asked for exactly 100 and got 154, 229, and 250.

So the skill doesn't let the model write the filler. A small bundled script does:
- Characters, words, and paragraphs are exact
- Tokens are sized from a measured ratio, then counted by Haiku through Anthropic's count_tokens endpoint
- Off by more than 2%? It resizes once and recounts
- Two or three round trips for a decent estimate, and it says "estimate" every time

Small skill, but it keeps me in Claude Code instead of a browser tab.

I have a more detailed write-up here: https://itshagennothagen.dev/blog/cc-forge-lorem
The skill is here: https://github.com/HagenFritz/cc-forge/tree/main/skills/lorem
```
