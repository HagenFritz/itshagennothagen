---
title: 'Designing Album Covers for My Playlists'
date: 2026-07-07
summary:
  I built a skill that turns a playlist's vibe into a topographic album cover
  and a SAT word for a title.
tags: [claude-code, music, lab]
---

I wanted to organize my Spotify liked songs into mood/genre based playlists. A colleague of mine does
something similar with his own music: dedicated albums for specific genres,
each with a unifying visual theme. I wanted that for mine too, so I built a
Claude Code skill that generates a cover for each playlist.

## The template

Every cover follows the same fixed template: dense topographic contour
lines on a near-black background, terrain shape and color both driven by the
playlist's mood. I wanted something simple and abstract, and topography felt
right. Sharp, jagged ridgelines read as high-energy. Slow, undulating ones
read as hypnotic. The color gradient (warm reds for aggressive, cool blues
for melancholic, and so on) layers a second signal on top.

## SAT word title

Each cover's title is a SAT vocabulary word chosen to match the
playlist's character. Partly
because I like SAT words, partly because it's a fun way to pick up
vocabulary along the way. Plus, some of them make solid names.

## Figuring out the genre

Sometimes I already know the genre for a batch of songs. Other times I've
got just one song I want to build a playlist around, and I'm not sure yet
what else belongs with it. In that case, the skill asks six questions
adapted from real music-information-retrieval (MIR) classification:

- ⚡&nbsp; **Arousal**: is the energy high and driving, or low and calm
- 🎭&nbsp; **Valence**: bright and positive, or dark and melancholic
- 🎸&nbsp; **Instrumentation**: electronic or acoustic, vocal or instrumental
- 🌡️&nbsp; **Timbre**: warm and rounded, or cold and sharp
- 📈&nbsp; **Structure**: builds to a peak, or holds one atmosphere throughout
- 🎯&nbsp; **Reference**: one artist or song this reminds me of

The answers place the song on a mood grid and suggest a genre from there.

My "Propulsive" playlist started that way: a handful of upbeat songs I
wanted grouped together, no genre in mind yet. The MIR questions landed on
tech house, the skill picked "Propulsive" as the word, and the cover came
back in sharp red ridgelines, matching the energy.

<figure style="margin: 1.5rem 0; display: flex; justify-content: center;">
  <img
    src="/blog/album-cover-propulsive.png"
    alt="Propulsive album cover: sharp red topographic contour lines on a near-black background"
    width="320"
    loading="lazy"
    style="border-radius: 0.5rem; height: auto;"
  />
</figure>

## See the playlists

**[Playlist Tracker](/labs/playlists)**
