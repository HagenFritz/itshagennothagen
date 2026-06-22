---
title: 'Which Pokémon Matches Your Volleyball Game?'
date: 2026-06-21
summary: A PowerPoint-night project that grew into something more. I mapped my volleyball friends' skills to Pokémon by base-stat shape, using cosine similarity.
tags: [pokemon, python, lab]
---

This idea came to me when I brainstorming for a PowerPoint night I was having with friends. I wanted to fuse three things I like: my research-y / quantitative side, Pokemon knowledge, and programming skills. The result was a script that takes a person's volleyball stat breakdown and tells
them which Pokémon they map to.

## The stat to skill mapping

Pokémon have six base stats: HP, Attack, Defense, Special Atk, Special Def, and
Speed. I mapped each of these stats to different beach volleyball dimensions:

<div style="margin: 1.5rem 0; display: flex; flex-direction: column; gap: 0.75rem;">
  <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem;">
    <div style="display: flex; align-items: center; gap: 0.6rem; min-width: 7rem;">
      <span style="font-size: 1.5rem;">🩺</span>
      <span style="font-weight: 600; letter-spacing: 0.05em;">HP</span>
    </div>
    <div style="flex: 1; min-width: 14rem; border: 1px solid var(--border); border-radius: 0.6rem; background: var(--card); padding: 0.6rem 0.9rem; line-height: 1.5;">
      Sustained energy during a rally<br />Ability to play many games
    </div>
  </div>
  <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem;">
    <div style="display: flex; align-items: center; gap: 0.6rem; min-width: 7rem;">
      <span style="font-size: 1.5rem;">🗡️</span>
      <span style="font-weight: 600; letter-spacing: 0.05em;">ATK</span>
    </div>
    <div style="flex: 1; min-width: 14rem; border: 1px solid var(--border); border-radius: 0.6rem; background: var(--card); padding: 0.6rem 0.9rem; line-height: 1.5;">
      Serve pressure<br />Hitting with power
    </div>
  </div>
  <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem;">
    <div style="display: flex; align-items: center; gap: 0.6rem; min-width: 7rem;">
      <span style="font-size: 1.5rem;">🛡️</span>
      <span style="font-weight: 600; letter-spacing: 0.05em;">DEF</span>
    </div>
    <div style="flex: 1; min-width: 14rem; border: 1px solid var(--border); border-radius: 0.6rem; background: var(--card); padding: 0.6rem 0.9rem; line-height: 1.5;">
      Digging ability<br />Blocking; pressing and hands
    </div>
  </div>
  <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem;">
    <div style="display: flex; align-items: center; gap: 0.6rem; min-width: 7rem;">
      <span style="font-size: 1.5rem;">🪄</span>
      <span style="font-weight: 600; letter-spacing: 0.05em;">SPA</span>
    </div>
    <div style="flex: 1; min-width: 14rem; border: 1px solid var(--border); border-radius: 0.6rem; background: var(--card); padding: 0.6rem 0.9rem; line-height: 1.5;">
      Cutting/shooting<br />Pokies/cobras<br />Tooling
    </div>
  </div>
  <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem;">
    <div style="display: flex; align-items: center; gap: 0.6rem; min-width: 7rem;">
      <span style="font-size: 1.5rem;">🧿</span>
      <span style="font-weight: 600; letter-spacing: 0.05em;">SPD</span>
    </div>
    <div style="flex: 1; min-width: 14rem; border: 1px solid var(--border); border-radius: 0.6rem; background: var(--card); padding: 0.6rem 0.9rem; line-height: 1.5;">
      Running down shots<br />Setting
    </div>
  </div>
  <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem;">
    <div style="display: flex; align-items: center; gap: 0.6rem; min-width: 7rem;">
      <span style="font-size: 1.5rem;">💨</span>
      <span style="font-weight: 600; letter-spacing: 0.05em;">SPE</span>
    </div>
    <div style="flex: 1; min-width: 14rem; border: 1px solid var(--border); border-radius: 0.6rem; background: var(--card); padding: 0.6rem 0.9rem; line-height: 1.5;">
      Speed<br />Strategy
    </div>
  </div>
</div>

## Assigning the stats

My method for assigning points followed these general considerations:

1. The person's strongest dimension gets **100**.
2. Every other stat is assigned **relative to that**, within that one person's kit.
3. The six stats sum to **420**.

The 420 budget was chosen by happenstance. The first two players I assigned points to both happened to sum to 420 so I decided to stick with that to keep everyone on the same scale. The key is that I was not measuring a person against anabsolute standard, but describing the *shape* of their game relative to itself.

That leads to two important notes:

> **A low stat does not mean "bad."** A low stat means that dimension isn't a
> comparative advantage *within your own kit*. The stats describe where your game
> lives, not what you're incapable of.

> **You cannot compare numbers between players.** The numbers describe shape, not
> magnitude. My 100 and your 100 are not the same amount of anything.

## The match: shape, not size

I chose to measure *shape* instead of *size*. Otherwise, a person scored on a 420 budget would
never match to a legendary Pokemon which typically have high base stat totals (500+). Also... it would require me to make comparative judgements between my friends' abilities which I was _not_ going to do.

Intsead, the process normalizes each stat breakdown into ratios where each
stat is a fraction of that total. Then I used
**[cosine similarity](https://www.youtube.com/watch?v=e9U0QAFbfLI)** to compare the ratios between people and Pokemon. Cosine similarity measures the angle between two vectors
and ignores their length entirely. Two stat breakdowns point the same direction when
they emphasize the same things in the same proportions, regardless of how big the
underlying numbers are.

This process lead to some interesting (and surprising) results.

## A worked example

Take one of my teammates. Let's call him Devin. He's a great defender, both digging hard-driven hits and chasing down cut/line shots. For that reason, I rated his defense and special defense the highest. If he is good at running shots down, his speed is also naturally high. So I rated his kit the following way:

<div style="margin: 1.5rem 0; display: flex; flex-direction: column; gap: 0.5rem; max-width: 32rem;">
  <div style="display: flex; align-items: center; gap: 0.75rem;">
    <span style="width: 3rem; font-weight: 600; letter-spacing: 0.05em; color: var(--muted-foreground);">HP</span>
    <div style="flex: 1; height: 1.4rem; background: var(--muted); border-radius: 0.4rem; overflow: hidden;"><div style="width: 65%; height: 100%; background: var(--primary);"></div></div>
    <span style="width: 2.5rem; text-align: right; font-variant-numeric: tabular-nums;">65</span>
  </div>
  <div style="display: flex; align-items: center; gap: 0.75rem;">
    <span style="width: 3rem; font-weight: 600; letter-spacing: 0.05em; color: var(--muted-foreground);">ATK</span>
    <div style="flex: 1; height: 1.4rem; background: var(--muted); border-radius: 0.4rem; overflow: hidden;"><div style="width: 50%; height: 100%; background: var(--primary);"></div></div>
    <span style="width: 2.5rem; text-align: right; font-variant-numeric: tabular-nums;">50</span>
  </div>
  <div style="display: flex; align-items: center; gap: 0.75rem;">
    <span style="width: 3rem; font-weight: 600; letter-spacing: 0.05em; color: var(--muted-foreground);">DEF</span>
    <div style="flex: 1; height: 1.4rem; background: var(--muted); border-radius: 0.4rem; overflow: hidden;"><div style="width: 100%; height: 100%; background: var(--primary);"></div></div>
    <span style="width: 2.5rem; text-align: right; font-variant-numeric: tabular-nums; font-weight: 700;">100</span>
  </div>
  <div style="display: flex; align-items: center; gap: 0.75rem;">
    <span style="width: 3rem; font-weight: 600; letter-spacing: 0.05em; color: var(--muted-foreground);">SPA</span>
    <div style="flex: 1; height: 1.4rem; background: var(--muted); border-radius: 0.4rem; overflow: hidden;"><div style="width: 60%; height: 100%; background: var(--primary);"></div></div>
    <span style="width: 2.5rem; text-align: right; font-variant-numeric: tabular-nums;">60</span>
  </div>
  <div style="display: flex; align-items: center; gap: 0.75rem;">
    <span style="width: 3rem; font-weight: 600; letter-spacing: 0.05em; color: var(--muted-foreground);">SPD</span>
    <div style="flex: 1; height: 1.4rem; background: var(--muted); border-radius: 0.4rem; overflow: hidden;"><div style="width: 80%; height: 100%; background: var(--primary);"></div></div>
    <span style="width: 2.5rem; text-align: right; font-variant-numeric: tabular-nums;">80</span>
  </div>
  <div style="display: flex; align-items: center; gap: 0.75rem;">
    <span style="width: 3rem; font-weight: 600; letter-spacing: 0.05em; color: var(--muted-foreground);">SPE</span>
    <div style="flex: 1; height: 1.4rem; background: var(--muted); border-radius: 0.4rem; overflow: hidden;"><div style="width: 65%; height: 100%; background: var(--primary);"></div></div>
    <span style="width: 2.5rem; text-align: right; font-variant-numeric: tabular-nums;">65</span>
  </div>
</div>

Defense is his 100; that's his identity. ATK is his floor at 50, because power
hitting isn't where his game lives (not to say he can't bounce a ball here and there).

Feed that into the script and the top match comes back at **0.9935** similarity with a rather popular legendary beast:

```
#1  Suicune
    Type:       Water
    Stats:      100 / 75 / 115 / 90 / 115 / 85  (Total: 580)
    Similarity: 0.993502
```

> Suicune. A divine, graceful Pokémon said to embody the compassion of a pure spring and the north wind. It races across the world purifying fouled water wherever it appears.

<figure style="margin: 1.5rem 0; display: flex; justify-content: center;">
  <img
    src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/245.gif"
    alt="Animated Suicune sprite"
    width="120"
    loading="lazy"
    style="image-rendering: pixelated; height: auto;"
  />
</figure>

Legendary Pokemon! Nice! However... the next best match was:

```
#3  Burmy (Plant Cloak)
    Type:       Bug
    Stats:      40 / 29 / 45 / 29 / 45 / 36  (Total: 224)
    Similarity: 0.993192
```

> Burmy. To shelter itself from cold, wintry winds, it covers itself with a cloak made of twigs and leaves.

<figure style="margin: 1.5rem 0; display: flex; justify-content: center;">
  <img
    src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/412.gif"
    alt="Animated Burmy sprite"
    width="80"
    loading="lazy"
    style="image-rendering: pixelated; height: auto;"
  />
</figure>

A first-evolution bug Pokémon with a 224 base-stat total which is less than half of
Suicune's total. The two ranked side by side because they share the same silhouette:
tanky on both defenses, weak on offense. Different size, identical shape. That's
the feature, not a bug (well, I guess it _is_ a bug in this case 😜).

The graphics below hopefully make things more concrete. On the left, the three stat lines drawn as
vectors: wildly different lengths (Suicune's 580 down to Burmy's 224), but only a
few degrees of angle separating them. Cosine only sees that tiny spread, not the
length. On the right, the same three drawn as _ratios_ on stat axes. The
hexagons land almost on top of each other.

<figure style="margin: 1.75rem 0;">
  <svg viewBox="0 0 660 320" role="img" aria-label="Left: three vectors of very different lengths but nearly the same direction — Suicune, Devin, and Burmy. Right: a radar chart overlaying all three normalized stat lines as nearly identical hexagons." style="width: 100%; height: auto; max-width: 660px;">
    <!-- ── Left panel: three vectors ── -->
    <g transform="translate(20,0)">
      <text x="125" y="22" text-anchor="middle" fill="var(--muted-foreground)" font-size="13" font-weight="600" letter-spacing="0.05em">SAME DIRECTION, ANY LENGTH</text>
      <!-- origin 40,250; each ~6.5° apart (their real pairwise angle); lengths scaled by total -->
      <line x1="40" y1="250" x2="169.3" y2="84.5" stroke="#3b5bdb" stroke-width="3" marker-end="url(#arrowBlue2)" />
      <line x1="40" y1="250" x2="146.7" y2="141.6" stroke="#c2410c" stroke-width="3" marker-end="url(#arrowOrange2)" />
      <line x1="40" y1="250" x2="103.2" y2="199.2" stroke="#1f7a43" stroke-width="3" marker-end="url(#arrowForest)" />
      <text x="176" y="80" fill="#3b5bdb" font-size="13" font-weight="600">Suicune (580)</text>
      <text x="155" y="138" fill="#c2410c" font-size="13" font-weight="600">Devin (420)</text>
      <text x="112" y="200" fill="var(--forest)" font-size="13" font-weight="600">Burmy (224)</text>
    </g>
    <!-- ── Right panel: radar ── -->
    <g transform="translate(300,10)">
      <text x="160" y="12" text-anchor="middle" fill="var(--muted-foreground)" font-size="13" font-weight="600" letter-spacing="0.05em">ALL THREE, SAME SHAPE</text>
      <polygon points="160.0,113.3 191.8,131.7 191.8,168.3 160.0,186.7 128.2,168.3 128.2,131.7" fill="none" stroke="var(--border)" stroke-width="1" />
      <polygon points="160.0,76.7 223.5,113.3 223.5,186.7 160.0,223.3 96.5,186.7 96.5,113.3" fill="none" stroke="var(--border)" stroke-width="1" />
      <polygon points="160.0,40.0 255.3,95.0 255.3,205.0 160.0,260.0 64.7,205.0 64.7,95.0" fill="none" stroke="var(--border)" stroke-width="1" />
      <g stroke="var(--border)" stroke-width="1">
        <line x1="160" y1="150" x2="160.0" y2="40.0" />
        <line x1="160" y1="150" x2="255.3" y2="95.0" />
        <line x1="160" y1="150" x2="255.3" y2="205.0" />
        <line x1="160" y1="150" x2="160.0" y2="260.0" />
        <line x1="160" y1="150" x2="64.7" y2="205.0" />
        <line x1="160" y1="150" x2="64.7" y2="95.0" />
      </g>
      <polygon points="160.0,70.3 211.7,120.1 239.3,195.8 160.0,221.7 80.7,195.8 101.4,116.1" fill="#3b5bdb" fill-opacity="0.14" stroke="#3b5bdb" stroke-width="2" />
      <polygon points="160.0,78.5 207.6,122.5 255.3,205.0 160.0,216.0 83.8,194.0 98.1,114.2" fill="#c2410c" fill-opacity="0.14" stroke="#c2410c" stroke-width="2" />
      <polygon points="160.0,67.5 211.8,120.1 240.4,196.4 160.0,209.8 79.6,196.4 95.7,112.9" fill="var(--forest)" fill-opacity="0.14" stroke="var(--forest)" stroke-width="2" />
      <g fill="var(--muted-foreground)" font-size="12" text-anchor="middle">
        <text x="160" y="34">HP</text>
        <text x="274" y="92">ATK</text>
        <text x="274" y="216">DEF</text>
        <text x="160" y="278">SPA</text>
        <text x="46" y="216">SPD</text>
        <text x="46" y="92">SPE</text>
      </g>
    </g>
    <defs>
      <marker id="arrowBlue2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#3b5bdb" /></marker>
      <marker id="arrowOrange2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#c2410c" /></marker>
      <marker id="arrowForest" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#1f7a43" /></marker>
    </defs>
  </svg>
</figure>

## Try it yourself

Claude and I ported the matcher from Python to JS to run right in the browser. Drag the bars to set your six
stats and see which Pokémon matches your beach volleyball stat shape:

**[Pokemon Stat Matcher](/labs/pokemon-matcher)**
