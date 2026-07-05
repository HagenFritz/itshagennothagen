---
title: 'Weed Whacker: A Tiny Pixel-Art Game'
date: 2026-07-05
summary: 'A small, simple pixel-art game I started building. Weed Whacker is a one-minute tile game with a global leaderboard, playable in the browser. A tiny first cut of a bigger idea.'
tags: [game, lab]
---

I have wanted to build a pixel-art game for a while. Not a big one, just
something small and simple to get started on. Weed Whacker is my first cut: a
one-minute tile game where you clear weeds, earn a little cash, and buy more
land to grow on. Whack as many weeds as you can before the timer runs out, then
put your score on the board.

It started as a Python/Pygame prototype and got ported to TypeScript so it runs
right in the browser. The game logic lives in a headless sim core with the
rendering, input, and sound bolted on around it, which keeps the door open for
where I want to take this next.

This is a small slice of a bigger idea. The plan, if it ever gets built, is to
grow it: more tools beyond the starting hoe, different kinds of weeds, weather
that changes how a run plays, and some player customization. No timeline, no
promises. For now it is one hoe, one weed, and one minute.

## Play it

Keyboard only for the moment. Move with WASD or the arrow keys, chop with space,
and buy the tile you are facing with B.

**[Play Weed Whacker](/play)**
