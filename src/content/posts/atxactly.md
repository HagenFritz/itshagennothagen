---
title: 'A Daily Guessing Game for Austin Geography'
date: 2026-08-31
summary:
  I have lived in Austin for years and still could not point to half its
  neighborhoods. So I built a five-a-day game that makes me place them.
tags: [austin, game, lab, claude-code]
---

I have lived in Austin long enough to have opinions about traffic, but ask me
where Govalle is and I would stare at you blankly. I know the names, just can't
tell you much after that.

I wanted to do something about it, but studying a static map didn't seem like
fun. My colleagues and I have been playing [MapTap](https://maptap.gg/), which
asks you to pinpoint cities/countries around the world and I have seen how
quickly it helps you learn. The format felt like a perfect fit for my problem.
So I decided to build one for Austin: [ATXactly](/labs/atxactly).

## How a round works

- 📍&nbsp; **Five rounds**: two easy, two medium, one hard
- 🎯&nbsp; **100 points each**, scaled by how close your tap lands
- ✖️&nbsp; **Multipliers**: rounds 1 and 2 count once, 3 and 4 double, round 5
  triples
- 🏆&nbsp; **900 is perfect**, and I have never come close
- 🌙&nbsp; **One puzzle a day**, the same one for everybody, resetting at
  midnight

The game is heavily inspired by MapTap. What changed is the scale. MapTap asks
you to find Latvia on a globe; here everything sits inside one metro area, so
the whole game happens in the last few zoom levels, where a couple of hundred
meters is the difference between a good guess and a great one.

<figure class="figure-center">
  <img
    src="/blog/atxactly-round.png"
    alt="ATXactly round one: an unlabelled dark map of Austin with the prompt Broken Spoke in the header"
    width="640"
    loading="lazy"
  />
</figure>

## A neighborhood is a blob, not a pin

The first version stored one latitude and longitude per location and scored the
distance from your tap to that point. Fine for the Capitol. Terrible for
anywhere with an actual footprint.

Oak Hill is about fifteen kilometers across. A player who confidently taps its
far edge is not wrong, they are correct, and the game was handing them a 21.
Georgetown was worse: a 13 for an answer inside the town.

So locations with a real boundary now carry that boundary, and the score
measures to the polygon edge instead of the centre. Anywhere inside counts as a
hit:

| tapping the far edge of | scored before | scores now |
| ----------------------- | ------------- | ---------- |
| Oak Hill                | 21            | 76         |
| Georgetown              | 13            | 70         |

Inside a shape the score still eases from 100 at the middle down to 75 at the
boundary, so a bullseye beats a technicality.

## Where the locations came from

The pool is _currently_ 337 places, pulled from OpenStreetMap and the City of
Austin's open data and will continue to grow and evolve. Originally, Claude
extracted a couple thousand candidates, but they were mostly noise. So we
worked together to refine the list, pull valid locations, and tie interesting
tidbits to each one.

## Play it

[ATXactly is here](/labs/atxactly). Play it and see if you can get 900. Let the
learning commence!