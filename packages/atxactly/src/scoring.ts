export type ScorableLocation = {
  lat: number
  lon: number
  shape?: number[][][]
}

export const MULTIPLIERS = [1, 1, 2, 2, 3]

export function haversine(
  aLat: number,
  aLon: number,
  bLat: number,
  bLon: number,
) {
  const R = 6371008.8
  const rad = Math.PI / 180
  const dLat = (bLat - aLat) * rad
  const dLon = (bLon - aLon) * rad
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function pointInRing(lon: number, lat: number, ring: number[][]) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const x1 = ring[i]![0]!,
      y1 = ring[i]![1]!
    const x2 = ring[j]![0]!,
      y2 = ring[j]![1]!
    if (y1 > lat !== y2 > lat) {
      const xint = ((x2 - x1) * (lat - y1)) / (y2 - y1) + x1
      if (lon < xint) inside = !inside
    }
  }
  return inside
}

export function distToSegment(
  lat: number,
  lon: number,
  a: number[],
  b: number[],
) {
  const kx = 111320 * Math.cos((lat * Math.PI) / 180)
  const ky = 110574
  const px = lon * kx,
    py = lat * ky
  const ax = a[0]! * kx,
    ay = a[1]! * ky
  const bx = b[0]! * kx,
    by = b[1]! * ky
  const dx = bx - ax,
    dy = by - ay
  if (dx === 0 && dy === 0) return Math.hypot(px - ax, py - ay)
  let t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

// Areas score flat 100 anywhere inside; outside measures to the edge.
export function effectiveDistance(
  lat: number,
  lon: number,
  loc: ScorableLocation,
) {
  if (!loc.shape) return haversine(lat, lon, loc.lat, loc.lon)
  for (const ring of loc.shape) if (pointInRing(lon, lat, ring)) return 0
  let best = Infinity
  for (const ring of loc.shape)
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++)
      best = Math.min(best, distToSegment(lat, lon, ring[i]!, ring[j]!))
  return best
}

// FLOOR: a guess this close counts as exact. The board opens at zoom 11
// where one pixel is 66 m, so anything tighter rewards zooming rather than
// knowing. MAXD: about the diameter of Austin proper, so being in the city
// still scores and the wrong end of the metro does not.
export const FLOOR = 100,
  MAXD = 25000
// Inside an area the score eases from 100 at the centre to INSIDE_EDGE at
// the boundary, scaled to that polygon's own radius. Flat-100 made a tap on
// the far edge of Georgetown (176 km²) worth as much as one on the
// courthouse; a fixed metre falloff punished small parks for being small.
// Anywhere inside still beats outside: worst interior is 75, and 1 km beyond
// any boundary scores 52.
export const INSIDE_EDGE = 75

export type ShapedLocation = ScorableLocation & { shape: number[][][] }

const hasShape = (loc: ScorableLocation): loc is ShapedLocation =>
  loc.shape !== undefined

export function reachOf(loc: ShapedLocation) {
  let best = 0
  for (const ring of loc.shape)
    for (const pt of ring) {
      const d = haversine(loc.lat, loc.lon, pt[1]!, pt[0]!)
      if (d > best) best = d
    }
  return best
}

export function scoreInside(lat: number, lon: number, loc: ShapedLocation) {
  const reach = reachOf(loc)
  if (reach <= 0) return 100
  const frac = Math.min(1, haversine(lat, lon, loc.lat, loc.lon) / reach)
  return Math.round((100 - (100 - INSIDE_EDGE) * frac) * 10) / 10
}

// Distance on the point curve that already scores exactly INSIDE_EDGE.
// Adding it to an outside-a-polygon distance keeps the curve continuous
// across the boundary: without it, stepping 1 m outside a shape jumped the
// score from 75 back to 100, rewarding a deliberate miss.
export const EDGE_OFFSET =
  FLOOR * (10 ** ((1 - INSIDE_EDGE / 100) * Math.log10(1 + MAXD / FLOOR)) - 1)

export function scoreOf(m: number) {
  if (m <= FLOOR) return 100
  if (m >= MAXD) return 0
  const v = 100 * (1 - Math.log10(1 + m / FLOOR) / Math.log10(1 + MAXD / FLOOR))
  return Math.round(v * 10) / 10
}

export function scoreLocation(lat: number, lon: number, loc: ScorableLocation) {
  const d = effectiveDistance(lat, lon, loc)
  if (!hasShape(loc)) return { base: scoreOf(d), dist: d }
  if (d === 0) return { base: scoreInside(lat, lon, loc), dist: 0 }
  return { base: scoreOf(d + EDGE_OFFSET), dist: d }
}
