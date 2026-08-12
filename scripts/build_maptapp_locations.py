#!/usr/bin/env python3
"""Build the Austin MapTapp location pool from public data sources.

Stdlib only. See docs/brainstorms/2026-08-11-001-austin-maptapp-requirements.md
for the sources, the category taxonomy, and why each source is shaped this way.

    python3 scripts/build_maptapp_locations.py discover
    python3 scripts/build_maptapp_locations.py discover --source osm-poi
    python3 scripts/build_maptapp_locations.py stats

Hand-edited fields (story, difficulty, category, name, status, lat, lon) are
never overwritten by a re-run. Discovery merges on `id`: new entries are added,
existing entries keep every field a human may have touched. Nothing is ever
promoted to `eligible` automatically.
"""

import argparse
import json
import math
import re
import subprocess
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

# Two files, because they have different audiences and lifespans.
# POOL ships with the site and holds only reviewed locations, so the Astro
# bundle never carries 2,300 unreviewed OSM rows. RAW is the working harvest,
# kept out of src/ and used only by this script.
POOL = REPO / "src" / "data" / "maptapp-locations.json"
RAW = REPO / "docs" / "maptapp" / "candidates.json"

UA = "itshagennothagen-dev/1.0 (+https://itshagennothagen.dev)"

# Content box: where locations may exist. Padding for tiles is a render concern,
# not a data concern, so discovery uses the content box unpadded.
SOUTH, WEST, NORTH, EAST = 30.05, -98.05, 30.62, -97.35
BBOX = f"{SOUTH},{WEST},{NORTH},{EAST}"

COA_URL = "https://data.austintexas.gov/resource/inrm-c3ee.json?$limit=500"
OVERPASS = "https://overpass-api.de/api/interpreter"

# Central Austin: inside Loop 1 / US-183 / Ben White, roughly. Used to seed the
# tier field, which the hand pass then corrects.
CENTRAL = (30.22, -97.79, 30.33, -97.70)
URBAN = (30.15, -97.88, 30.45, -97.60)

# Fields a human may edit. Discovery must not clobber these on re-run.
PROTECTED = ("name", "lat", "lon", "category", "tier", "difficulty",
             "story", "storySource", "storyUrl", "status", "notes")

CATEGORIES = ("neighborhood", "district", "park", "water",
              "landmark", "civic", "venue", "town")


def fetch_json(url, data=None, tries=4):
    """GET or POST with backoff. Overpass 429s under load; the CoA portal is
    reliable but slow enough to need a real timeout."""
    body = data.encode() if data else None
    for attempt in range(tries):
        req = urllib.request.Request(url, data=body, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            if e.code in (429, 504, 503) and attempt < tries - 1:
                wait = 10 * (attempt + 1)
                print(f"  HTTP {e.code}, retrying in {wait}s", file=sys.stderr)
                time.sleep(wait)
                continue
            raise
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt < tries - 1:
                print(f"  {e}, retrying", file=sys.stderr)
                time.sleep(10)
                continue
            raise
    raise RuntimeError("unreachable")


def slugify(text):
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^\w\s-]", "", text).strip().lower()
    return re.sub(r"[-\s]+", "-", text)


ACRONYMS = {"RMMA", "MLK", "UT", "NPA", "ACC", "ABIA"}
LOWER_WORDS = {"of", "the", "and", "at", "in", "on", "de", "del"}


def titlecase(name):
    """CoA names arrive as uppercase zoning labels ("HYDE PARK", "MLK-183").

    Only a curated set stays uppercase. Matching "any all-caps token" would
    match every word in the input, which is entirely uppercase.
    """
    words = []
    for i, w in enumerate(name.split()):
        core = w.strip(".,")
        if core.upper() in ACRONYMS:
            words.append(core.upper())
        elif re.fullmatch(r"[A-Z]{2,}-\d+", core):   # MLK-183
            words.append(core)
        elif "-" in w:
            words.append("-".join(p.capitalize() for p in w.split("-")))
        elif i > 0 and core.lower() in LOWER_WORDS:
            words.append(core.lower())
        else:
            words.append(core.capitalize())
    return " ".join(words)


def in_box(lat, lon, box):
    s, w, n, e = box
    return s <= lat <= n and w <= lon <= e


def seed_tier(lat, lon):
    if in_box(lat, lon, CENTRAL):
        return "central"
    if in_box(lat, lon, URBAN):
        return "urban"
    return "suburb"


# ---------- geometry: point-on-surface without shapely ----------

def ring_area(ring):
    a = 0.0
    for i in range(len(ring) - 1):
        x1, y1 = ring[i]
        x2, y2 = ring[i + 1]
        a += x1 * y2 - x2 * y1
    return a / 2.0


def point_in_ring(pt, ring):
    x, y = pt
    inside = False
    for i in range(len(ring) - 1):
        x1, y1 = ring[i]
        x2, y2 = ring[i + 1]
        if (y1 > y) != (y2 > y):
            xint = (x2 - x1) * (y - y1) / (y2 - y1) + x1
            if x < xint:
                inside = not inside
    return inside


def point_in_poly(pt, poly):
    if not point_in_ring(pt, poly[0]):
        return False
    return not any(point_in_ring(pt, hole) for hole in poly[1:])


def point_on_surface(polys):
    """A representative interior point of the largest polygon.

    A vertex average is wrong for concave or multi-part areas: Highland's
    centroid falls outside the neighborhood entirely. Try the centroid, and if
    it is not inside, grid-sample and take the interior point furthest from any
    edge so the answer marker sits somewhere defensible.
    """
    best = max(polys, key=lambda p: abs(ring_area(p[0])))
    ring = best[0]
    xs = [p[0] for p in ring]
    ys = [p[1] for p in ring]
    cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)
    if point_in_poly((cx, cy), best):
        return cy, cx
    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    bestpt, bestd = None, -1.0
    N = 48
    for i in range(1, N):
        px = minx + (maxx - minx) * i / N
        for j in range(1, N):
            py = miny + (maxy - miny) * j / N
            if not point_in_poly((px, py), best):
                continue
            d = min(math.dist((px, py), v) for r in best for v in r)
            if d > bestd:
                bestd, bestpt = d, (px, py)
    if bestpt is None:
        return cy, cx
    return bestpt[1], bestpt[0]


# ---------- sources ----------

def discover_coa():
    """City of Austin Neighborhood Planning Areas. 95 rows, ~65 distinct areas
    once polygon fragments are merged by name."""
    print("fetching City of Austin planning areas")
    rows = fetch_json(COA_URL)
    groups = {}
    for row in rows:
        name = row.get("planning_area_name")
        geom = row.get("the_geom")
        if not name or not geom:
            continue
        polys = (geom["coordinates"] if geom["type"] == "MultiPolygon"
                 else [geom["coordinates"]])
        groups.setdefault(name, []).extend(polys)

    out = []
    for raw_name, polys in groups.items():
        lat, lon = point_on_surface(polys)
        if not in_box(lat, lon, (SOUTH, WEST, NORTH, EAST)):
            continue
        name = titlecase(raw_name)
        out.append({
            "id": slugify(name),
            "name": name,
            "lat": round(lat, 6),
            "lon": round(lon, 6),
            "category": "neighborhood",
            "tier": seed_tier(lat, lon),
            "difficulty": None,
            "story": None,
            "storySource": None,
            "storyUrl": None,
            "sourceRef": raw_name,
            "source": "coa-npa",
            "status": "candidate",
            "fragments": len(polys),
        })
    print(f"  {len(rows)} rows -> {len(out)} distinct areas")
    return out


PLACE_CATEGORY = {
    "town": "town", "village": "town",
    "suburb": "district", "neighbourhood": "neighborhood",
}


def discover_osm_places():
    print("fetching OSM place nodes")
    q = (f'[out:json][timeout:120];'
         f'(node["place"~"^(suburb|neighbourhood|town|village)$"]({BBOX}););'
         f'out body;')
    data = fetch_json(OVERPASS, urllib.parse.urlencode({"data": q}))
    out = []
    for el in data["elements"]:
        tags = el.get("tags", {})
        name = tags.get("name")
        if not name:
            continue
        lat, lon = el["lat"], el["lon"]
        out.append({
            "id": slugify(name),
            "name": name,
            "lat": round(lat, 6),
            "lon": round(lon, 6),
            "category": PLACE_CATEGORY.get(tags.get("place"), "neighborhood"),
            "tier": seed_tier(lat, lon),
            "difficulty": None,
            "story": None,
            "storySource": "wikipedia" if wiki_of(tags) else None,
            "storyUrl": wiki_of(tags),
            "sourceRef": f"node/{el['id']}",
            "source": "osm-place",
            "status": "candidate",
        })
    print(f"  {len(out)} place nodes")
    return out


POI_QUERIES = [
    ('nwr["tourism"~"^(attraction|museum|artwork|viewpoint)$"]["name"]', "landmark"),
    ('nwr["leisure"="park"]["name"]', "park"),
    ('nwr["leisure"~"^(nature_reserve|water_park)$"]["name"]', "park"),
    ('nwr["natural"~"^(water|spring|peak)$"]["name"]', "water"),
    ('nwr["waterway"="waterfall"]["name"]', "water"),
    ('nwr["amenity"~"^(theatre|cinema|university|college|hospital|library|'
     'townhall|arts_centre)$"]["name"]', "civic"),
    ('nwr["amenity"~"^(bar|pub|nightclub|restaurant)$"]["name"]["wikipedia"]', "venue"),
    ('nwr["shop"="mall"]["name"]', "venue"),
    ('nwr["aeroway"="aerodrome"]["name"]', "civic"),
    ('nwr["historic"~"^(monument|memorial|building)$"]["name"]', "landmark"),
    ('nwr["man_made"~"^(bridge|tower|lighthouse)$"]["name"]', "landmark"),
]


def wiki_of(tags):
    w = tags.get("wikipedia")
    if w and ":" in w:
        lang, title = w.split(":", 1)
        return f"https://{lang}.wikipedia.org/wiki/{urllib.parse.quote(title.replace(' ', '_'))}"
    return None


def discover_osm_pois():
    """Landmarks, parks, water, civic buildings, notable venues.

    Split into several Overpass calls rather than one giant union: a single
    query for all of this times out, and a partial failure here should not cost
    the whole run.
    """
    seen = {}
    for selector, category in POI_QUERIES:
        label = selector[:48]
        print(f"fetching OSM POIs: {category} ({label}...)")
        q = f'[out:json][timeout:120];({selector}({BBOX}););out tags center;'
        try:
            data = fetch_json(OVERPASS, urllib.parse.urlencode({"data": q}))
        except Exception as e:
            print(f"  FAILED: {e}", file=sys.stderr)
            continue
        n = 0
        for el in data["elements"]:
            tags = el.get("tags", {})
            name = tags.get("name")
            if not name:
                continue
            lat = el.get("lat") or (el.get("center") or {}).get("lat")
            lon = el.get("lon") or (el.get("center") or {}).get("lon")
            if lat is None or lon is None:
                continue
            if not in_box(lat, lon, (SOUTH, WEST, NORTH, EAST)):
                continue
            key = slugify(name)
            if key in seen:
                continue
            seen[key] = {
                "id": key,
                "name": name,
                "lat": round(lat, 6),
                "lon": round(lon, 6),
                "category": category,
                "tier": seed_tier(lat, lon),
                "difficulty": None,
                "story": None,
                "storySource": "wikipedia" if wiki_of(tags) else None,
                "storyUrl": wiki_of(tags),
                "sourceRef": f"{el['type']}/{el['id']}",
                "source": "osm-poi",
                "status": "candidate",
                "osmTags": {k: v for k, v in tags.items()
                            if k in ("tourism", "leisure", "amenity", "natural",
                                     "historic", "man_made", "shop", "aeroway",
                                     "wikidata", "wikipedia")},
            }
            n += 1
        print(f"  +{n}")
        time.sleep(2)  # be polite to a free shared endpoint
    print(f"  {len(seen)} distinct POIs")
    return list(seen.values())


# ---------- merge ----------

def load_existing():
    """Both files as one list. Every command works on the union and write()
    re-splits by status, so an entry promoted to shortlist/eligible migrates
    from the raw harvest into the shipped pool automatically."""
    entries = []
    for path in (POOL, RAW):
        if path.exists():
            entries.extend(json.loads(path.read_text()))
    return entries


def merge(existing, discovered):
    """Add new entries; never overwrite human-edited fields on existing ones.

    Machine fields (sourceRef, osmTags, fragments) refresh so upstream data
    corrections flow through. Everything in PROTECTED is left exactly as-is.
    """
    by_id = {e["id"]: e for e in existing}
    added = updated = 0
    for new in discovered:
        cur = by_id.get(new["id"])
        if cur is None:
            by_id[new["id"]] = new
            added += 1
            continue
        before = dict(cur)
        for k, v in new.items():
            if k in PROTECTED:
                continue
            # Provenance belongs to whichever source first contributed the
            # entry; a later source corroborating the same slug must not
            # rewrite where it came from.
            if k in ("source", "sourceRef"):
                continue
            cur[k] = v
        others = set(cur.get("alsoIn", []))
        if new["source"] != cur.get("source"):
            others.add(new["source"])
        if others:
            cur["alsoIn"] = sorted(others)
        # Backfill only fields still unset by a human.
        for k in ("category", "tier", "storyUrl", "storySource"):
            if cur.get(k) in (None, "") and new.get(k) not in (None, ""):
                cur[k] = new[k]
        if cur != before:
            updated += 1
    return list(by_id.values()), added, updated


def write(entries):
    entries.sort(key=lambda e: (e["category"], e["id"]))
    pool = [e for e in entries if e.get("status") in ("shortlist", "eligible")]
    raw = [e for e in entries if e.get("status") not in ("shortlist", "eligible")]
    for path, rows in ((POOL, pool), (RAW, raw)):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(rows, indent=2, ensure_ascii=False) + "\n")
        print(f"wrote {path.relative_to(REPO)} ({len(rows)} entries)")
    # CI runs `prettier --check`. Python's json.dumps always expands short
    # arrays that prettier keeps inline, so without this the two tools rewrite
    # each other's output on every run.
    run_prettier([POOL, RAW])


def run_prettier(paths):
    try:
        subprocess.run(["npx", "--no-install", "prettier", "--write",
                        *[str(p) for p in paths]],
                       cwd=REPO, check=True, capture_output=True, timeout=180)
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired,
            FileNotFoundError) as e:
        print(f"  note: prettier did not run ({type(e).__name__}); "
              f"run `npm run format` before committing", file=sys.stderr)


# ---------- commands ----------

def cmd_discover(args):
    sources = {
        "coa": discover_coa,
        "osm-place": discover_osm_places,
        "osm-poi": discover_osm_pois,
    }
    picked = [args.source] if args.source else list(sources)
    found = []
    for s in picked:
        found.extend(sources[s]())
    existing = load_existing()
    merged, added, updated = merge(existing, found)
    print(f"\n{added} added, {updated} refreshed, {len(merged)} total")
    write(merged)
    cmd_stats(args)


NOISE_NAME = re.compile(
    r"\b(pond|detention|wet pond|retention|drainage|easement|tract|lot \d|"
    r"bldg|building \d|parking|greenbelt access|trailhead|substation)\b", re.I)

# historic=memorial is overwhelmingly individual grave markers and roadside
# plaques in this bbox (582 of them). Named people are not places.
PERSON_NAME = re.compile(r"^(mr|mrs|dr|judge|rev|capt|col|gen)\.?\s|"
                         r"^[A-Z]\.\s*[A-Z]\.\s|"
                         r"\b(memorial|cemetery|grave|headstone)\b", re.I)


def prominence(e):
    """Heuristic 0-100 for how likely a person is to know this place.

    Not a difficulty score. This only decides what is worth a human's attention
    during pruning; difficulty is hand-tagged afterward.
    """
    score = 0
    tags = e.get("osmTags", {})
    if e.get("storyUrl"):
        score += 50          # has a Wikipedia article
    if tags.get("wikidata"):
        score += 15
    if e["source"] == "coa-npa":
        score += 30          # an official planning area is a real place
    # Corroboration is the strongest non-Wikipedia signal available: a name
    # that shows up independently in the city's zoning data and in OSM is a
    # place people actually refer to.
    score += 20 * len(e.get("alsoIn", []))
    if e["category"] in ("town", "district"):
        score += 25
    if e["category"] == "neighborhood":
        score += 10
    kind = (tags.get("historic") or tags.get("man_made") or tags.get("natural")
            or tags.get("amenity") or tags.get("leisure") or "")
    if kind in ("memorial", "artwork"):
        score -= 25
    if kind in ("university", "aerodrome", "museum", "attraction"):
        score += 20
    if NOISE_NAME.search(e["name"]):
        score -= 30
    if PERSON_NAME.search(e["name"]):
        score -= 30
    if len(e["name"]) <= 3:
        score -= 20
    return max(0, min(100, score))


def cmd_triage(args):
    """Rank candidates by prominence so pruning starts with what matters."""
    entries = load_existing()
    cands = [e for e in entries if e.get("status") in ("candidate", "shortlist")]
    for e in cands:
        e["_p"] = prominence(e)
    cands.sort(key=lambda e: (-e["_p"], e["category"], e["name"]))
    if args.category:
        cands = [e for e in cands if e["category"] == args.category]
    shown = cands[:args.limit]
    print(f"{len(cands)} candidates, showing top {len(shown)} by prominence\n")
    for e in shown:
        w = "W" if e.get("storyUrl") else " "
        print(f"  {e['_p']:3d} [{w}] {e['category']:13s} {e['tier']:8s} "
              f"{e['name'][:46]:48s} {e['id']}")
    below = [e for e in cands if e["_p"] < args.floor]
    print(f"\n{len(below)} candidates score below {args.floor} "
          f"and are likely prunable")


def cmd_shortlist(args):
    """Mark high-prominence candidates as `shortlist` for human review.

    Deliberately non-destructive. An early pass at floor 30 would have dropped
    Alamo Drafthouse, ACC Highland, and Dell Seton purely for lacking a
    Wikipedia tag, so the low scorers stay in the file as `candidate` and can be
    promoted later by raising the floor or by hand. Nothing is deleted, and the
    scorer is a triage aid, not an oracle.
    """
    entries = load_existing()
    n = 0
    for e in entries:
        if e.get("status") not in ("candidate", "shortlist"):
            continue
        want = "shortlist" if prominence(e) >= args.floor else "candidate"
        if e["status"] != want:
            e["status"] = want
            n += 1
    print(f"{n} status changes at floor {args.floor}")
    if args.dry_run:
        print("dry run, nothing written")
        return
    write(entries)
    cmd_stats(args)


def cmd_stats(args):
    entries = load_existing()
    if not entries:
        print("no data yet")
        return
    print(f"\n{'':-<52}\npool: {len(entries)} entries")
    for field in ("status", "source", "category", "tier"):
        c = Counter(e.get(field) for e in entries)
        print(f"\n{field}:")
        for k, v in c.most_common():
            print(f"  {str(k):16s} {v:4d}")
    elig = [e for e in entries if e.get("status") == "eligible"]
    withstory = [e for e in entries if e.get("story")]
    wikitagged = [e for e in entries if e.get("storyUrl")]
    print(f"\neligible:        {len(elig):4d}")
    print(f"has story:       {len(withstory):4d}")
    print(f"wikipedia link:  {len(wikitagged):4d}  (story fetchable)")
    bands = Counter()
    for e in elig:
        d = e.get("difficulty")
        if d in (1, 2):
            bands["easy 1x"] += 1
        elif d == 3:
            bands["medium 2x"] += 1
        elif d in (4, 5):
            bands["hard 3x"] += 1
        else:
            bands["untagged"] += 1
    if elig:
        print("\neligible by band (need 12+ each for a 60-day window):")
        for k in ("easy 1x", "medium 2x", "hard 3x", "untagged"):
            print(f"  {k:16s} {bands[k]:4d}")


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    d = sub.add_parser("discover", help="fetch sources and merge into the pool")
    d.add_argument("--source", choices=("coa", "osm-place", "osm-poi"),
                   help="run a single source instead of all three")
    d.set_defaults(func=cmd_discover)
    t = sub.add_parser("triage", help="rank candidates by prominence")
    t.add_argument("--limit", type=int, default=60)
    t.add_argument("--floor", type=int, default=30)
    t.add_argument("--category", choices=CATEGORIES)
    t.set_defaults(func=cmd_triage)
    sl = sub.add_parser("shortlist",
                        help="mark high-prominence candidates for review")
    sl.add_argument("--floor", type=int, default=30)
    sl.add_argument("--dry-run", action="store_true")
    sl.set_defaults(func=cmd_shortlist)
    s = sub.add_parser("stats", help="summarize the current pool")
    s.set_defaults(func=cmd_stats)
    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
