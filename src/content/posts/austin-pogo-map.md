---
title: 'Finding Breakfast Within Raid Range'
date: 2026-07-25
summary:
  Niantic is rerunning a GO Fest raid day this Sunday. I went looking for an
  Austin breakfast spot with two gyms in range of the table.
tags: [pokemon, lab]
---

Niantic is
[rerunning a raid day](https://pokemongo.com/news/gofest2026-global-update)
from the recent GO Fest this Sunday with 12 free raid passes. My friend and I
wanted to do some of it together, but it is late July in Austin and Sunday is
supposed to be in the neighborhood of 100 degrees. Walking around a park was
something we wanted to avoid if we could. We wanted breakfast somewhere we
could sit, catch up, and still jump into raids without going outside.

Ideally two gyms in range of the table. One to raid, one to raid next, and
repeat.

## The 80 meter restriction

In PoGo you can interact with a gym from ~80 meters away, so a restaurant only
counts if the gym is basically at the building. Two gyms from one seat is much
harder. They have to be within 160 meters of each other and you have to be
sitting between them. In practice that means the same plaza or the same church
parking lot.

## No shortcut on the data

I figured I could query gym locations and score every breakfast spot at once,
but I could not. Niantic keeps stops and gyms in its own system. There are
[community-driven maps](https://www.pogomap.info/) out there, but the data is
crowd-sourced by their members and there is no way to pull from it
systematically.

So it was manual, through
[Campfire](https://pokemongo.com/post/campfire-global-launch-team-up-feature),
Niantic's companion app that shows nearby gyms and active raids on a map. My
process:

1. Note the gym details in Campfire
2. Click to open its location in Google Maps
3. Copy the coordinates
4. Log the gym's location alongside some metadata

Restaurants were easier. I grab the coordinates from the Google Maps URL and
use OpenStreetMap to fill in details about the place.

## Two ways to search

I tried it from two angles:

- **Starting from food**: I picked places I already thought had at least decent
  breakfast, leaning toward dense areas where a strip center might have
  collected a few gyms over the years. The best finds were gyms named after the
  restaurant they sit at. "Kerbey Lane Cafe" is a gym. So is "Summer Moon
  Coffee."
- **Starting from gyms**: I scrolled Campfire looking for tight clusters, but
  learned that density does not mean good food coverage. Arbor Trails has five
  gyms inside 600 meters, all spread across the shopping center, none close
  enough to share a table. A church campus in South Austin has three within 150
  meters, but nowhere to eat.

Neither direction found the thing I was after.

## Where I landed

The two-gym table is still a unicorn. There are areas I did not check, like the
Domain, that probably fit, but the drive is too far.

So we are settling for the south Kerbey Lane. Its own sign is a gym, 14 meters
out, and there is a small pond and trail nearby with two more gyms along the
path.

## My map

I put everything I logged into a small JSON file and had Claude Opus 5
(recently released) build me something to read it. The plan is to keep adding
to the list and eventually find the elusive double-gym restaurant in Austin.

**[Austin Pokémon GO Map](/labs/austin-pogo-map)**
