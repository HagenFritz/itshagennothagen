---
title: 'Designing Album Covers for My Playlists'
date: 2026-07-07
summary:
  I built a skill that turns a playlist's vibe into a topographic album cover
  and a SAT word for a title.
tags: [claude-code, music, lab]
---

I built a Claude Code skill that generates an album cover for each of my
Spotify playlists. It started when I was organizing my liked songs into
mood/genre based playlists. A colleague of mine does something similar with his
own music: dedicated albums for specific genres, each with a unifying visual
theme and I wanted that for mine too.

## The template

Every cover follows the same fixed template: dense topographic contour
lines on a near-black background, terrain shape and color both driven by the
playlist's mood. I wanted something simple and abstract, and topography felt
right.
* Contours: Sharp, jagged ridgelines for high-energy; slow, undulating lines
for hypnotic soundscapes
* Colors: warm reds for aggression; cool blue tones
for melancholic.

## SAT word title

Each cover's title is a SAT vocabulary word chosen to match the
playlist's character. Partly
because I like SAT words, partly because it's a fun way to pick up
vocabulary along the way. Plus, some of them make solid names.

## Figuring out the genre

Sometimes I already know the genre for a batch of songs. Other times I've
got just one song I want to build a playlist around it. The skill asks six questions
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

<figure class="figure-center">
  <img
    src="/blog/album-cover-propulsive.png"
    alt="Propulsive album cover: sharp red topographic contour lines on a near-black background"
    width="320"
    loading="lazy"
  />
</figure>

## See the playlists

The playlists these covers belong to are all on my tracker, with art and track
counts pulled live from Spotify. More covers show up there as I sort more songs.

**[Playlist Tracker](/labs/playlists)**
