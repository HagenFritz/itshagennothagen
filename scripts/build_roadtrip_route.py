#!/usr/bin/env python3
"""Write a road-following route polyline into a road trip's YAML.

Stdlib only. Reads the stops from src/content/roadtrips/<slug>.yaml, asks the
public OSRM demo server for a driving route through them in YAML order, and
replaces the top-level `route:` and `miles:` keys with the result.

    python3 scripts/build_roadtrip_route.py big-bend
    python3 scripts/build_roadtrip_route.py big-bend --tolerance 0.0005
    python3 scripts/build_roadtrip_route.py big-bend --dry-run

Coordinate order: this repo stores [lat, lon] everywhere (pogo-gyms.json, the
stop fields, the Fredericksburg widget). OSRM speaks lon,lat on both the
request path and the GeoJSON response, so the flip happens twice here. A missed
flip presents as OSRM `InvalidQuery` or a route through the Indian Ocean; the
returned geometry is checked against the stops' bounding box before any write.

Only hand-authored `route:` and `miles:` lines are touched. Every other line in
the file is preserved byte for byte, and the invariants are asserted against the
constructed text before it reaches disk.

Unsupported YAML shapes, because the scan is textual and refuses ambiguity
rather than guessing: flow-style stops ({lat: .., lon: ..}), inline comments
after a coordinate value, and commented-out stops. Stops must be block style
with `- title:`, `lat:`, and `lon:` on their own lines.

OSRM demo server etiquette (https://github.com/Project-OSRM/osrm-backend/wiki/
Api-usage-policy): non-commercial, best effort, may be withdrawn without notice,
no more than 1 request per second. One run makes one request. Routes are a
Produced Work from OpenStreetMap data under ODbL; the rendered map must credit
OpenStreetMap and OSRM.
"""

import argparse
import json
import math
import os
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

SITE = "https://itshagennothagen.dev"
UA = f"itshagennothagen-dev/1.0 build_roadtrip_route.py (+{SITE})"

DEFAULT_BASE_URL = "https://router.project-osrm.org"

# Degrees of slack around the stops' bounding box. A real route can bow well
# outside the straight line between two stops (Big Bend's only paved approach
# swings far north), so this is loose: it is here to catch a lat/lon swap, not
# to second-guess the router.
BOX_PAD = 3.0

METERS_PER_MILE = 1609.344


class Refused(Exception):
    """An invariant failed. Nothing is written."""


class Stop:
    def __init__(self, title, lat, lon, date, lat_text, lon_text):
        self.title = title
        self.lat = lat
        self.lon = lon
        self.date = date
        self.lat_text = lat_text
        self.lon_text = lon_text

    def __eq__(self, other):
        return (self.title, self.lat_text, self.lon_text) == \
            (other.title, other.lat_text, other.lon_text)


# ---------- reading the YAML, textually ----------

TOP_LEVEL = re.compile(r"^\S")
STOPS_KEY = re.compile(r"^stops:\s*$")
TITLE_LINE = re.compile(r"^\s*-\s+title:\s*(.+?)\s*$")
LAT_LINE = re.compile(r"^\s*lat:\s*(\S+)\s*$")
LON_LINE = re.compile(r"^\s*lon:\s*(\S+)\s*$")
DATE_LINE = re.compile(r"^\s*date:\s*(\S+)\s*$")


def split_lines(text):
    """Content lines, without the phantom empty element a trailing newline
    leaves behind. That phantom otherwise gets swallowed into the span of
    whichever key happens to be last, inflating its length by one."""
    lines = text.replace("\r\n", "\n").split("\n")
    if lines and lines[-1] == "":
        lines.pop()
    return lines


def top_level_keys(lines, name):
    """Indices of every line that opens top-level key `name`."""
    pattern = re.compile(rf"^{re.escape(name)}:")
    return [i for i, ln in enumerate(lines) if pattern.match(ln)]


def block_span(lines, start):
    """Half-open line range of the block opened at `start`, to the next
    top-level key or end of file."""
    end = start + 1
    while end < len(lines) and not TOP_LEVEL.match(lines[end]):
        end += 1
    return start, end


def top_level_block(lines, name):
    """The lines of top-level key `name`, including its own line. Empty when
    the key is absent."""
    heads = top_level_keys(lines, name)
    if not heads:
        return []
    start, end = block_span(lines, heads[0])
    return lines[start:end]


def strip_managed(lines):
    """Every line this script does not own, in order."""
    out = list(lines)
    for name in ("route", "miles"):
        heads = top_level_keys(out, name)
        if heads:
            start, end = block_span(out, heads[0])
            del out[start:end]
    return out


def scan_stops(text):
    """Stops in YAML order, read only from inside the top-level stops block.

    Bounding the scan is the whole point: an `intro` block scalar mentioning
    "lat:" would otherwise be read as a coordinate.
    """
    lines = split_lines(text)
    heads = [i for i, ln in enumerate(lines) if STOPS_KEY.match(ln)]
    if not heads:
        raise Refused("no top-level `stops:` key")
    if len(heads) > 1:
        raise Refused(f"{len(heads)} top-level `stops:` keys, expected one")

    start, end = block_span(lines, heads[0])
    titles, lats, lons, dates = [], [], [], []
    for ln in lines[start + 1:end]:
        if ln.lstrip().startswith("#"):
            continue
        m = TITLE_LINE.match(ln)
        if m:
            titles.append(m.group(1))
            continue
        m = LAT_LINE.match(ln)
        if m:
            lats.append(m.group(1))
            continue
        m = LON_LINE.match(ln)
        if m:
            lons.append(m.group(1))
            continue
        m = DATE_LINE.match(ln)
        if m:
            dates.append(m.group(1))

    if not (len(titles) == len(lats) == len(lons)):
        raise Refused(
            f"stops block has {len(titles)} `- title:`, {len(lats)} `lat:`, "
            f"and {len(lons)} `lon:` lines; they must match")
    if len(titles) < 2:
        raise Refused(f"{len(titles)} stop(s); a route needs at least two")
    if dates and len(dates) != len(titles):
        dates = [None] * len(titles)

    stops = []
    for i, title in enumerate(titles):
        try:
            lat, lon = float(lats[i]), float(lons[i])
        except ValueError:
            raise Refused(f"stop {title!r} has a non-numeric coordinate")
        if not (-90 <= lat <= 90 and -180 <= lon <= 180):
            raise Refused(f"stop {title!r} is outside the coordinate range")
        date = dates[i] if i < len(dates) else None
        stops.append(Stop(title, lat, lon, date, lats[i], lons[i]))
    return stops


def date_warning(stops):
    """Stops out of date order still route, into a zigzag nobody wanted.

    Non-fatal: a real trip can double back through a town it already visited.
    """
    dated = [s for s in stops if s.date]
    for a, b in zip(dated, dated[1:]):
        if b.date < a.date:
            return (f"stop dates are not in order: {a.title} ({a.date}) comes "
                    f"before {b.title} ({b.date}) but is dated later. YAML "
                    f"order is the waypoint order.")
    return None


# ---------- geometry ----------

def _perp_dist(p, a, b):
    if a == b:
        return math.dist(p, a)
    dx, dy = b[0] - a[0], b[1] - a[1]
    t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    return math.dist(p, (a[0] + t * dx, a[1] + t * dy))


def simplify(points, eps):
    """Ramer-Douglas-Peucker. Iterative, because a cross-state route can run
    to tens of thousands of vertices and blow the recursion limit."""
    if len(points) < 3:
        return list(points)
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        lo, hi = stack.pop()
        dmax, idx = 0.0, lo
        for i in range(lo + 1, hi):
            d = _perp_dist(points[i], points[lo], points[hi])
            if d > dmax:
                dmax, idx = d, i
        if dmax > eps:
            keep[idx] = True
            stack.append((lo, idx))
            stack.append((idx, hi))
    return [p for p, k in zip(points, keep) if k]


def isolated_stops(stops, limit=2):
    """The stops furthest from their nearest neighbour, as a printable list.

    OSRM does not say which waypoint failed to snap, so this is a hint, not an
    answer. With only two stops neither is more isolated than the other, so
    both are named rather than arbitrarily blaming the first.
    """
    ranked = sorted(stops, key=lambda s: -min(
        math.dist((s.lat, s.lon), (o.lat, o.lon))
        for o in stops if o is not s))
    return ", ".join(f"{s.title!r} at [{s.lat}, {s.lon}]"
                     for s in ranked[:limit])


def route_from_payload(payload, stops):
    """Validated [lat, lon] geometry and distance in meters from an OSRM body."""
    code = payload.get("code")
    if code != "Ok":
        message = payload.get("message") or "(no message)"
        if code == "NoRoute":
            raise Refused(
                f"OSRM found no route: {message}. The likeliest cause is a "
                f"stop that does not snap to a drivable road; the most "
                f"isolated ones are {isolated_stops(stops)}.")
        if code == "InvalidQuery":
            raise Refused(
                f"OSRM rejected the query: {message}. OSRM takes lon,lat; "
                f"check the stop coordinates are not swapped.")
        if code == "TooBig":
            raise Refused(
                f"OSRM refused the request size: {message}. Use fewer "
                f"waypoints.")
        raise Refused(f"OSRM returned {code}: {message}")

    routes = payload.get("routes") or []
    if not routes:
        raise Refused("OSRM returned Ok with no routes")
    coords = routes[0].get("geometry", {}).get("coordinates") or []
    if len(coords) < 2:
        raise Refused(f"OSRM returned {len(coords)} geometry point(s)")

    south = min(s.lat for s in stops) - BOX_PAD
    north = max(s.lat for s in stops) + BOX_PAD
    west = min(s.lon for s in stops) - BOX_PAD
    east = max(s.lon for s in stops) + BOX_PAD

    route = []
    for lon, lat in coords:
        if not (south <= lat <= north and west <= lon <= east):
            raise Refused(
                f"geometry point [{lat}, {lon}] falls outside the stops' box "
                f"padded by {BOX_PAD} degrees "
                f"([{south}, {west}] to [{north}, {east}]). "
                f"This is what a lat/lon swap looks like.")
        route.append((lat, lon))
    return route, float(routes[0].get("distance") or 0.0)


# ---------- constructing the new file text ----------

def fmt_point(lat, lon):
    # Fixed width, never bare round(): round(30.1, 5) is 30.1, which writes as
    # "30.1" one run and "30.10000" the next if the value ever changes shape.
    return "  - [%.5f, %.5f]" % (lat, lon)


def build_text(text, route, miles):
    """The file with `route:` and `miles:` rewritten and nothing else touched."""
    newline = "\r\n" if "\r\n" in text else "\n"
    trailing = text.endswith(("\n", "\r\n"))
    lines = split_lines(text)

    block = ["route:"] + [fmt_point(lat, lon) for lat, lon in route]

    heads = top_level_keys(lines, "route")
    if len(heads) > 1:
        raise Refused(f"{len(heads)} top-level `route:` keys, expected one")
    if heads:
        start, end = block_span(lines, heads[0])
        lines[start:end] = block
    else:
        lines.extend(block)

    miles_line = f"miles: {miles}"
    heads = top_level_keys(lines, "miles")
    if len(heads) > 1:
        raise Refused(f"{len(heads)} top-level `miles:` keys, expected one")
    if heads:
        start, end = block_span(lines, heads[0])
        lines[start:end] = [miles_line]
    else:
        # Directly after the first line so it reads as trip metadata, not as a
        # stray key appended below the stops.
        lines.insert(1, miles_line)

    out = newline.join(lines)
    return out + newline if trailing else out


def check_invariants(original, constructed, route_points):
    """Refuse to write anything that fails one of these.

    The atxactly pipeline shipped one silent geometry corruption caught only in
    review. These run against the constructed text, not the inputs, so a bug in
    the block splicing is caught before it reaches disk.
    """
    lines = split_lines(constructed)
    n_route = len(top_level_keys(lines, "route"))
    if n_route != 1:
        raise Refused(f"constructed text has {n_route} top-level `route:` keys")
    n_miles = len(top_level_keys(lines, "miles"))
    if n_miles > 1:
        raise Refused(f"constructed text has {n_miles} top-level `miles:` keys")

    before, after = scan_stops(original), scan_stops(constructed)
    if before != after:
        raise Refused("stop coordinates changed while rewriting the route")

    n_points = len(top_level_block(lines, "route")) - 1
    if n_points != route_points:
        raise Refused(
            f"constructed route block has {n_points} points, expected "
            f"{route_points}")

    # Compare what is left after removing both managed blocks. Arithmetic on
    # line counts has to know whether `miles:` was inserted or replaced and
    # gets that wrong on a re-run; this just checks that every unmanaged line
    # survived, in order, byte for byte.
    if strip_managed(split_lines(original)) != strip_managed(lines):
        raise Refused("a line outside the route and miles blocks changed")


# ---------- writing ----------

def write_yaml(path, text, dry_run, prettier=True):
    if dry_run:
        print("dry run, nothing written")
        return
    tmp = path.with_suffix(".yaml.tmp")
    tmp.write_text(text)
    os.replace(tmp, path)
    print(f"wrote {path}")
    if prettier:
        run_prettier(path)


def run_prettier(path):
    """CI runs `prettier --check`. Without this the script and CI rewrite each
    other's output on every run."""
    try:
        subprocess.run(["npx", "--no-install", "prettier", "--write", str(path)],
                       cwd=REPO, check=True, capture_output=True, timeout=180)
    except subprocess.CalledProcessError as e:
        sys.exit(f"prettier failed (exit {e.returncode}) on {path}:\n"
                 f"{e.stderr.decode(errors='replace')}\n"
                 f"The route was written; run `npm run format` before committing.")
    except (subprocess.TimeoutExpired, FileNotFoundError) as e:
        print(f"  note: prettier did not run ({type(e).__name__}); "
              f"run `npm run format` before committing", file=sys.stderr)


# ---------- OSRM ----------

def osrm_url(base_url, stops):
    pairs = ";".join(f"{s.lon},{s.lat}" for s in stops)
    return (f"{base_url.rstrip('/')}/route/v1/driving/{pairs}"
            f"?overview=full&geometries=geojson")


def fetch_route(url, tries=3):
    """One request per run, well under the demo server's 1 req/s ceiling."""
    for attempt in range(tries):
        req = urllib.request.Request(
            url, headers={"User-Agent": UA, "Referer": SITE})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and attempt < tries - 1:
                wait = 5 * (attempt + 1)
                print(f"  HTTP {e.code}, retrying in {wait}s", file=sys.stderr)
                time.sleep(wait)
                continue
            raise
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt < tries - 1:
                print(f"  {e}, retrying", file=sys.stderr)
                time.sleep(5)
                continue
            raise
    raise RuntimeError("unreachable")


def main():
    p = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("slug", help="trip slug, without the .yaml extension")
    p.add_argument("--tolerance", type=float, default=0.001,
                   help="Douglas-Peucker tolerance in degrees "
                        "(default 0.001, about 100 m)")
    p.add_argument("--base-url", default=DEFAULT_BASE_URL,
                   help=f"OSRM instance (default {DEFAULT_BASE_URL})")
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    path = REPO / "src" / "content" / "roadtrips" / f"{args.slug}.yaml"
    if not path.exists():
        sys.exit(f"no such trip: {path}")
    text = path.read_text()

    try:
        stops = scan_stops(text)
        warning = date_warning(stops)
        if warning:
            print(f"  warning: {warning}", file=sys.stderr)

        url = osrm_url(args.base_url, stops)
        print(f"routing {len(stops)} stops through {args.base_url}")
        payload = fetch_route(url)
        route, meters = route_from_payload(payload, stops)

        simplified = simplify(route, args.tolerance)
        miles = round(meters / METERS_PER_MILE)
        constructed = build_text(text, simplified, miles)
        check_invariants(text, constructed, len(simplified))
    except Refused as e:
        sys.exit(f"refused: {e}")

    waypoints = len(payload.get("waypoints") or [])
    print(f"  {len(route)} raw points -> {len(simplified)} at "
          f"tolerance {args.tolerance}")
    print(f"  {miles} miles, {waypoints} waypoints snapped")
    write_yaml(path, constructed, args.dry_run)
    if not args.dry_run:
        print(f"  review with: git diff {path.relative_to(REPO)}")


if __name__ == "__main__":
    main()
