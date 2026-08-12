---
date: 2026-08-11
sequence: 001
topic: austin-maptapp
---

# Austin MapTapp

## Problem Frame

MapTap (maptap.gg, one "p") is a daily geography game: five prompts a day, each
naming a world city, answered by tapping a spot on a rotatable 3D globe. Score
per question runs 0-100 by distance, with escalating multipliers for a
1000-point daily max. After all guesses are in, a "stories" panel gives
Wikipedia-sourced background on each location, so a bad round still teaches
something.

This project is "MapTapp" with two p's, to distinguish it from the original.

Observed by playing MapTap #781 (Aug 11, 2026) end to end. Verified mechanics
are recorded below rather than inferred from descriptions.

Hagen wants the same loop scoped to Austin. He grew up in DFW and moved to
Austin, and has never built a reliable mental map of either. A daily five-
question game over Austin-area places is a way to get steadily better, and it is
shareable with colleagues who have the same gap.

The nearest existing thing in this repo is `/labs/austin-pogo-map`, which
already solves the hard rendering problem: a canvas Web Mercator projection over
OpenStreetMap raster tiles with no mapping library. This reuses that.

## Requirements

- R1. Playable at `/labs/austin-maptapp`, with a card linking to it from the Lab
  page.
- R2. A daily round is five location prompts drawn deterministically from the
  UTC date, so every player worldwide gets the same five on the same day.
- R3. Each prompt shows a location name and its difficulty band with the
  multiplier ("Easy - 1x Multiplier"). The player pans and zooms a map and taps
  a guess. No typed answers. The guess commits immediately and advances to the
  next question with only a running score update. No blurb, no answer reveal
  mid-round (verified: MapTap advanced from St Louis straight to Fukuoka showing
  nothing but the new score).
- R4. Scoring is log-distance, 0-100 per question, tuned so the curve is
  forgiving near the target the way MapTap's is (80 km from New York City scored
  98 on its world-scale globe). At metro scale the constants shrink
  proportionally. Starting point:
  `100 * max(0, 1 - log10(1 + d/150) / log10(1 + 40000/150))` where `d` is
  meters. Roughly: 150 m -> ~90, 1 km -> ~65, 5 km -> ~40, 40 km -> 0. Needs
  playtesting against the real location set. Linear distance was rejected
  because at metro scale it makes downtown blocks invisible and suburb-scale
  errors dominant.
- R5. The five daily questions escalate in difficulty with multipliers **1x, 1x,
  2x, 3x, 3x**, for a 1000-point daily max. Bands map to stored difficulty: Easy
  = 1-2, Medium = 3, Hard = 4-5.

  Derived from playing MapTap #781, not from documentation. Observed bands: Q1
  St Louis (Easy 1x), Q2 Fukuoka (Easy 1x), Q3 Riga (Medium 2x), Q4 N'Djamena
  (Hard 3x). Running totals were 66, 79, 117, 225, 255, so the deltas were 13,
  38, 108, 30. Dividing by the shown multipliers gives clean raw scores of 13,
  19, and 36, confirming Q2-Q4. Q5's band was not captured before the round
  ended, but `1,1,2,3,3` is the only layout consistent with both the observed
  first four and a 1000 max (`1,1,1,2,3` sums to 800).

- R6. After the fifth guess, a collapsible "stories" panel reveals background on
  all five locations at once, with source attribution. MapTap sources these from
  Wikipedia and labels the panel accordingly.
- R7. No location repeats within a rolling 60-day window.
- R8. Scoring is server-authoritative. No true coordinate or story reaches the
  client until all five guesses are committed (see Security below).
- R9. A global daily leaderboard shows the day's top scores. Players are
  identified by a generated three-word handle plus a localStorage UUID, which
  also drives a personal streak and history on that device.
- R10. A Wordle-style emoji share grid summarizes the day's result for pasting
  into Slack.
- R11. Map tiles must show streets, highways, and water but no text labels, so
  the map cannot be read for the answer. This is what makes unrestricted zoom
  safe.
- R12. The map is full-bleed: everything below a compact header is playable
  canvas. No iframe, no letterboxing, no visible map frame. The header carries
  score, puzzle number, date, and the stories toggle, matching MapTap's layout.

## Bounding Box and Camera

Two distinct boxes, which is the part that matters for full-bleed rendering.

**Content box** - where locations may exist. Round Rock and Pflugerville north,
Bastrop east, Buda south, Dripping Springs west: `30.05, -98.05, 30.62, -97.35`.
That is 67.3 km wide by 63.0 km tall, an aspect ratio of 1.07, essentially
square. Content is weighted toward central Austin (inside Loop 1 / US-183 / Ben
White) where street-level knowledge is learnable, with a tail across the outer
metro.

**Tile box** - where tiles are fetched. Padded to `29.83, -98.45, 30.84, -96.95`
(144 km x 112 km). The padding exists so the canvas is never showing empty
background at any zoom or pan position the player can reach.

A single padded box cannot satisfy every viewport: filling 16:9 desktop needs
~22 km of extra width per side, while a 9:19.5 phone needs ~41 km of extra
height per side. Chasing one number produces huge dead margins on the other form
factor. So padding is not the mechanism that guarantees full-bleed.

Instead, **constrain the camera, not the data**. The canvas sizes to the
viewport and the camera clamps so that the content box always covers the
viewport at minimum zoom, computed per-viewport at runtime:

    minZoom = zoom at which the content box's smaller dimension fills the
              viewport's corresponding dimension

Pan is clamped so the camera center stays inside the content box. Tiles are
fetched from the padded box, so the overflow at edges and high zoom is always
real map, never background. This is the same clamping problem the pogo map
already solves, extended with a per-viewport minimum zoom.

## Location Data: Sources and Method

This section is the record of how the location set was built. Rerunning
discovery should not require rediscovering any of this.

### Source 1 - City of Austin Neighborhood Planning Areas

`https://data.austintexas.gov/resource/inrm-c3ee.json` (Socrata, no auth, no
key). 95 rows with full MultiPolygon geometry.

This source is in scope and worth using. Earlier framing of it as "bad" was
wrong: obscure planning-area names are a feature, because the post-round story
is where the player learns something. RMMA earns its place precisely because
"Robert Mueller Municipal Airport, Austin's airport until 1999, now a planned
neighborhood where the control tower still stands" is worth knowing.

Real handling notes, none of them disqualifying:

- Names are uppercase zoning labels and need title-casing plus, in some cases, a
  friendlier display name. `RMMA` should probably display as "RMMA (Mueller)".
- Rows repeat per polygon fragment. `HIGHLAND` appears five times,
  `UPPER BOGGY CREEK` five times. 95 rows is roughly 60 distinct areas. Dedupe
  by `planning_area_name` and merge geometry before computing a centroid.
- Coverage is the city proper only. Nothing in Round Rock, Pflugerville,
  Bastrop, Buda, or Dripping Springs, which is what Source 2 is for.
- Centroids of concave or multi-part polygons can land outside the area. Use a
  point-on-surface calculation, not a naive average of vertices.

### Source 2 - OSM place nodes via Overpass

Overpass QL against `https://overpass-api.de/api/interpreter`:

    [out:json][timeout:50];
    (node["place"~"^(suburb|neighbourhood|town|village)$"](30.05,-98.05,30.62,-97.35););
    out body;

Returns 408 nodes in the bbox: 376 `neighbourhood`, 19 `village`, 9 `town`, 4
`suburb`. Point geometry, already usable as a centroid. Unlike Source 1 this
covers the full bbox (Pflugerville, Elgin, Taylor, Lago Vista, Sunset Valley all
present) and uses colloquial names (Tanglewood Forest, Shady Hollow, Bear
Creek).

### Source 3 - OSM POIs via Overpass

    [out:json][timeout:50];
    (nwr["tourism"="attraction"](BBOX);
     nwr["leisure"="park"]["name"](BBOX);
     nwr["amenity"~"^(theatre|cinema|university|hospital|library)$"]["name"](BBOX);
     nwr["shop"="mall"]["name"](BBOX););
    out tags center;

Returns 991 elements: 789 parks, 48 libraries, 45 theatres, 41 hospitals, 33
cinemas, 21 attractions, 10 universities, 5 malls.

Quality is uneven and requires pruning. The attraction list mixes Barton Springs
Pool and the South Congress Bat Colony with "Abandoned zoo cage" and "Texas
paintball". Parks especially need a size or prominence filter.

POIs matter beyond variety: at high zoom a player in a blank residential grid
has nothing to orient by. Recognizable landmarks in the location set give the
map anchors that the unlabeled basemap does not.

### The extractor

`scripts/build_maptapp_locations.py`, stdlib-only Python 3. Three commands:

    discover [--source coa|osm-place|osm-poi]   fetch and merge
    triage   [--limit N] [--category C]         rank candidates by prominence
    shortlist [--floor N] [--dry-run]           mark candidates for review

Two output files, split by status:

- `src/data/maptapp-locations.json` (66 KB, 152 entries) - `shortlist` and
  `eligible` only. This is what the site bundles.
- `docs/maptapp/candidates.json` (915 KB, 2357 entries) - the raw harvest.
  Working file, never imported by the site. Promoting an entry migrates it into
  the shipped pool automatically on the next run.

Two invariants, both covered by a manual check before committing changes:

- **Hand-edited fields are never overwritten.** Discovery merges on `id`;
  `name`, `lat`, `lon`, `category`, `tier`, `difficulty`, `story`,
  `storySource`, `storyUrl`, `status`, and `notes` are left alone once a human
  touches them. Provenance (`source`, `sourceRef`) belongs to whichever source
  first contributed an entry; later corroborating sources append to `alsoIn`.
- **Re-runs are idempotent.** Stable sort by `(category, id)`, and the script
  shells out to prettier after writing, because Python's `json.dumps` expands
  short arrays that prettier keeps inline. Without that, the two tools rewrite
  each other's output forever and CI's `prettier --check` fails.

### Prominence scoring and triage

Raw discovery returns 2509 candidates, and most are unusable:
`historic=memorial` alone contributes 582 individual grave markers and roadside
plaques, and the water category is full of "Squig Pond" and "Vrbo Rubber Duck
Pond".

`prominence()` scores 0-100 as a triage aid, not as difficulty. Wikipedia
article +50, wikidata +15, CoA planning area +30, each corroborating source +20,
town/district +25, neighborhood +10, university/airport/museum +20; memorial or
artwork -25, noise-word or person-name match -30.

At floor 30 this yields **152 shortlisted** of 2509, with a natural gap in the
distribution (12 entries score 20-29, then nothing until 30). Sanity check:
Zilker 60, Hyde Park 55, Barton Springs Pool 65, RMMA 40, Squig Pond 0.

The scorer is not trusted to delete. An early destructive version at the same
floor would have dropped Alamo Drafthouse, ACC Highland, and Dell Seton purely
for lacking a Wikipedia tag, all of which are places a resident knows. So
`shortlist` only re-labels; the low scorers stay in the raw file and can be
promoted by lowering the floor or by hand.

Known wart: an entry can pick up `osmTags` from a same-named but unrelated OSM
feature. Hyde Park carries `historic=memorial` from a historical marker of the
same name. The coordinate is correct (it comes from the CoA polygon, which wins
provenance), so this only affects the tag hints shown during triage.

### Pool growth model

Discovery is cheap; stories are the bottleneck. A location becomes `eligible`
for the daily draw once it has a story, a category, and a difficulty tag. 84 of
the shortlisted entries carry a Wikipedia URL, so those stories can be
bulk-fetched; the hand-written remainder is the real work.

The pool ships playable at ~80 eligible and grows toward 400+ without rerunning
discovery or revisiting these decisions. A 60-day no-repeat window only needs 60
eligible locations, but the draw also needs enough in each difficulty band: at
minimum 12 Easy, 12 Medium, 12 Hard to avoid band starvation over two months.

Current shortlist by category: 69 neighborhood, 27 town, 26 landmark, 18 civic,
6 venue, 5 park, 1 water. Parks and water are underrepresented because the
prominence filter is harsh on them, and venues because OSM rarely tags bars and
music halls with Wikipedia links. Those three categories will need hand
promotion from the raw file rather than a lower floor, which would readmit
hundreds of pocket parks.

### Per-location fields

    id           stable slug, e.g. "rmma-mueller"
    name         display name shown as the prompt
    lat, lon     answer coordinate
    category     see taxonomy below
    tier         central | urban | suburb | exurb
    difficulty   1-5, hand-tagged
    story        post-round background text
    storySource  wikipedia | hand | null
    sourceRef    originating dataset id or OSM element id
    source       coa-npa | osm-place | osm-poi
    status       candidate | eligible

### Category taxonomy

Categories exist so the pool can be audited for balance, so the daily draw can
avoid five parks in a row, and so post-round stats can show a player which kinds
of places they are weak on. Deliberately kept to eight:

    neighborhood   Hyde Park, Bouldin Creek, RMMA
    district       Downtown, The Domain, Rainey Street, South Congress
    park           Zilker, Barton Creek Greenbelt, McKinney Falls
    water          Lady Bird Lake, Barton Springs, Lake Travis, Bull Creek
    landmark       Capitol, Mount Bonnell, Pennybacker Bridge, Moonlight Towers
    civic          UT campus, ABIA, Dell Seton, central library
    venue          Moody Center, Continental Club, Alamo Drafthouse locations
    town           Round Rock, Pflugerville, Bastrop, Buda, Dripping Springs

`tier` and `category` are independent axes: Round Rock is `town` + `suburb`,
Zilker is `park` + `central`. The draw uses tier for geographic spread and
category for variety.

Difficulty is seeded heuristically at extraction (category, tier, OSM tag
richness, whether the polygon is large) then corrected by hand. It is a stored
field, never derived at runtime: Zilker and RMMA are both neighborhoods in the
loose sense but nowhere near the same difficulty.

### Stories

Every eligible location needs a story, shown only after all five guesses. Two
provenances:

- `wikipedia` - OSM POIs frequently carry `wikipedia` or `wikidata` tags, and
  the City of Austin areas often have articles. Pull an extract via the
  Wikipedia REST summary endpoint, store it, and attribute it. This is what
  MapTap does, and its results panel is labeled "Wikipedia".
- `hand` - everything else, especially planning areas whose interesting fact is
  local knowledge rather than an encyclopedia entry.

Storing the text rather than fetching live keeps the results panel instant,
avoids a runtime dependency, and lets stories be edited for length and voice.
Wikipedia text is CC BY-SA, so attribution and a link are required.

## Map Rendering

Reuses the canvas Mercator projection and tile cache from
`src/pages/labs/austin-pogo-map.astro` (tile cache at line 355).

Tile source is CARTO `dark_nolabels`:
`https://{a-d}.basemaps.cartocdn.com/rastertiles/dark_nolabels/{z}/{x}/{y}.png`

Verified serving keyless with HTTP 200. Inspected at z13 and z15 over central
Austin: full street grid, highway geometry, and the river render clearly with
zero text. Already dark, so it needs no filtering to match the site theme.

Rejected alternatives:

- `tile.openstreetmap.org` (what the pogo map uses): labels neighborhoods and
  POIs directly, which hands over the answer at high zoom.
- Stadia `stamen_toner_lines`: returns HTTP 401 without an API key.
- Esri World Imagery: serves keyless but satellite imagery reads as texture
  rather than the street-network clue MapTap's rivers provide.

Attribution required: `© OpenStreetMap, © CARTO`.

Risk, unverified: CARTO's published terms for keyless raster tile use are thin.
The tiles have served publicly for years and personal-site traffic is
negligible, but rate limits are not documented and this is not a contractual
guarantee. Fallback is self-hosting a tile subset for the bbox, which is
tractable given the fixed geographic scope.

Because the basemap carries no labels, zoom is unrestricted.

## Backend

Cloudflare Pages Functions plus the existing D1 database, reusing the pattern
established by the Weed Whacker leaderboard.

Tables:

- `maptapp_scores` - date, player id, handle, total score, per-question
  distances, submitted timestamp.
- Reuses `api_requests` and `functions/api/_rate-limit.ts` unchanged.

The daily five are derived deterministically from the UTC date via a seeded PRNG
over the eligible pool, so no table of rounds is needed and server and client
agree without a write.

### Security

A daily global leaderboard makes client-side scoring untenable, and unlike the
Weed Whacker leaderboard the answers themselves are secret. If the client ships
with five coordinates embedded, they are readable from the JS bundle.

Flow:

1. Client fetches today's five prompts: names, difficulty bands, multipliers,
   and ids only. No coordinates, no stories.
2. Client posts one guess at a time. Server returns only that question's
   distance and score, plus the running total. It does not return the true
   coordinate, because the round does not reveal answers mid-play.
3. After the fifth guess, the server returns all five true coordinates, the five
   stories, and the final total in one payload. That payload is what the results
   view and the stories panel render.
4. The submitted leaderboard score is the server's number, never the client's.

Deferring the reveal to step 3 is a security improvement over revealing per
question: for the first four questions there is no answer material on the client
at all, so there is nothing to extract even by replaying requests.

Guesses must be posted in order and each question accepted only once per player
per day, or a client could probe the same question repeatedly and binary-search
the answer from the distance readouts. Enforce sequence server-side.

Open ops item, inherited and more consequential here: rate limiting keys on
`CF-Connecting-IP`, which is only trustworthy behind the Cloudflare edge. The
`*.pages.dev` deployment and PR preview URLs are directly reachable and can
spoof it. Mitigation is the redirect rule already noted in CLAUDE.md.

## Player Identity

Three-word handles generated at first play, in the spirit of what3words.

what3words itself divides the world into a 3 m x 3 m grid (~57 trillion cells),
each with a permanent three-word address. It is a commercial product with a
proprietary wordlist and a paid API, and using it here would mean geocoding
players, so only the naming aesthetic is borrowed.

Generation: two adjective lists of 256 plus a noun list of 512 yields ~33M
combinations (`swift-cedar-armadillo`). Collisions are rare and handled by a
server-side uniqueness check on insert. The handle plus a localStorage UUID
persists a player's name, streak, and history on that device.

Players may reroll a handle but not type one, which removes the moderation
burden that free-text names would carry on a public site.

## Non-Goals for v1

- Accounts, cross-device sync, or any real authentication.
- DFW or any second metro. The location schema is metro-agnostic, but shipping a
  second city is out of scope.
- Practice or unlimited modes. Five a day is the whole loop.
- Tier-adaptive difficulty that targets a player's weakest area. Interesting,
  but needs play history to be worth anything.

## Open Questions

- Does the eligible pool grow fast enough to keep the 60-day no-repeat window
  honest, or does the window need to shrink at launch?
- Should a missed day break the streak, or is a forgiveness token warranted for
  a game whose whole point is daily habit?
