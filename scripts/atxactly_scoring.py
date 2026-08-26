#!/usr/bin/env python3
"""Reference implementation of ATXactly guess scoring.

Ported to TypeScript for the Pages Function; kept here so the rules can be
exercised and tested without standing up the API. See
docs/brainstorms/2026-08-11-001-austin-atxactly-requirements.md.
"""

import math

# Distance at which the curve bottoms out, about the diameter of Austin proper.
# Anywhere in the city still scores something; the wrong end of the metro does
# not. The content box is 92 km corner to corner and the two furthest eligible
# locations are 83 km apart, so both correctly score zero.
MAX_M = 25_000.0
# Below this, a guess is treated as exact. Sized off the map, not taste: the
# board opens at zoom 11 where one pixel is 66 m, so a tighter floor would be
# reachable only by zooming repeatedly rather than by knowing the answer.
FLOOR_M = 100.0


def haversine(a_lat, a_lon, b_lat, b_lon):
    R = 6371008.8
    p1, p2 = math.radians(a_lat), math.radians(b_lat)
    dp = p2 - p1
    dl = math.radians(b_lon - a_lon)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))


def _point_in_ring(lon, lat, ring):
    inside = False
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        if (y1 > lat) != (y2 > lat):
            xint = (x2 - x1) * (lat - y1) / (y2 - y1) + x1
            if lon < xint:
                inside = not inside
    return inside


def _dist_to_segment(lat, lon, a, b):
    """Metres from a point to a lon/lat segment, via local equirectangular
    projection. Exact enough at neighbourhood scale and far cheaper than a
    geodesic solve."""
    latr = math.radians(lat)
    kx = 111320.0 * math.cos(latr)
    ky = 110574.0
    px, py = lon * kx, lat * ky
    ax, ay = a[0] * kx, a[1] * ky
    bx, by = b[0] * kx, b[1] * ky
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.dist((px, py), (ax, ay))
    t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    return math.dist((px, py), (ax + t * dx, ay + t * dy))


def distance_to_shape(lat, lon, shape):
    """0.0 when the guess is inside any ring, else metres to the nearest edge."""
    for ring in shape:
        if _point_in_ring(lon, lat, ring):
            return 0.0
    best = float("inf")
    for ring in shape:
        n = len(ring)
        for i in range(n):
            d = _dist_to_segment(lat, lon, ring[i], ring[(i + 1) % n])
            if d < best:
                best = d
    return best


# Inside an area, the score eases from 100 at the centre to INSIDE_EDGE at the
# boundary, scaled to that polygon's own radius. Flat-100-anywhere-inside made
# a tap on the far edge of Georgetown (176 km2) worth the same as one on the
# courthouse; a fixed metre falloff instead punished small parks for being
# small. Anywhere inside still beats being outside: the worst interior score
# is 75, and a guess 1 km beyond any boundary scores 57.
INSIDE_EDGE = 75.0


def _reach(location):
    """Distance from the stored point to the furthest vertex."""
    best = 0.0
    for ring in location["shape"]:
        for lon, lat in ring:
            d = haversine(location["lat"], location["lon"], lat, lon)
            if d > best:
                best = d
    return best


def score_inside(guess_lat, guess_lon, location):
    reach = _reach(location)
    if reach <= 0:
        return 100.0
    d = haversine(guess_lat, guess_lon, location["lat"], location["lon"])
    frac = min(1.0, d / reach)
    return round(100.0 - (100.0 - INSIDE_EDGE) * frac, 1)


def effective_distance(guess_lat, guess_lon, location):
    """Distance used for scoring.

    Area locations measure to the polygon edge, so anywhere inside is 0. A
    2.7 km-wide neighbourhood scored from its centroid punished a correct
    answer: a dead-centre tap in West Oak Hill was 3.5 km from the stored
    point and scored 43.
    """
    shape = location.get("shape")
    if shape:
        return distance_to_shape(guess_lat, guess_lon, shape)
    return haversine(guess_lat, guess_lon, location["lat"], location["lon"])


def score_distance(metres):
    if metres <= FLOOR_M:
        return 100.0
    if metres >= MAX_M:
        return 0.0
    num = math.log10(1 + metres / FLOOR_M)
    den = math.log10(1 + MAX_M / FLOOR_M)
    return round(100.0 * max(0.0, 1.0 - num / den), 1)


# Distance on the point curve that already scores exactly INSIDE_EDGE. Adding
# it to an outside-a-polygon distance makes the curve continuous across the
# boundary: without it, stepping 1 m outside a shape jumped the score from 75
# back to 100, so a player gained points by deliberately missing.
_EDGE_OFFSET_M = FLOOR_M * (
    10 ** ((1 - INSIDE_EDGE / 100) * math.log10(1 + MAX_M / FLOOR_M)) - 1
)


def score_outside_shape(metres):
    """Score for a guess `metres` beyond an area's boundary."""
    return score_distance(metres + _EDGE_OFFSET_M)


def score_location(guess_lat, guess_lon, location):
    """Base score, 0-100, for one guess against one location."""
    d = effective_distance(guess_lat, guess_lon, location)
    if not location.get("shape"):
        return score_distance(d)
    if d == 0.0:
        return score_inside(guess_lat, guess_lon, location)
    return score_outside_shape(d)


def score_guess(guess_lat, guess_lon, location, multiplier=1):
    d = effective_distance(guess_lat, guess_lon, location)
    base = score_location(guess_lat, guess_lon, location)
    return {
        "distance_m": round(d),
        "base": base,
        "multiplier": multiplier,
        "points": round(base * multiplier, 1),
        "inside": bool(location.get("shape")) and d == 0.0,
    }


MULTIPLIERS = (1, 1, 2, 3, 3)   # 1000-point daily max
