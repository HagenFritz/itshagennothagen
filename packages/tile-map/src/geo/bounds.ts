import { latToY, lonToX, xToLon, yToLat, type LatLon } from './projection'

export type Bounds = {
  minLat: number
  maxLat: number
  minLon: number
  maxLon: number
}

export type Padding = {
  top: number
  right: number
  bottom: number
  left: number
}

export function boundsOf(points: readonly LatLon[]): Bounds {
  const first = points[0]
  if (!first) throw new Error('boundsOf needs at least one point')
  let minLat = first.lat
  let maxLat = first.lat
  let minLon = first.lon
  let maxLon = first.lon
  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat
    if (p.lat > maxLat) maxLat = p.lat
    if (p.lon < minLon) minLon = p.lon
    if (p.lon > maxLon) maxLon = p.lon
  }
  return { minLat, maxLat, minLon, maxLon }
}

export function centerOf(bounds: Bounds): LatLon {
  return {
    lat: (bounds.minLat + bounds.maxLat) / 2,
    lon: (bounds.minLon + bounds.maxLon) / 2,
  }
}

export function fitZoom(
  bounds: Bounds,
  viewW: number,
  viewH: number,
  padding: Padding,
  minZoom: number,
  maxZoom: number,
): number {
  const availW = viewW - padding.left - padding.right
  const availH = viewH - padding.top - padding.bottom
  if (availW <= 0 || availH <= 0) return minZoom
  const spanX = Math.abs(lonToX(bounds.maxLon, 0) - lonToX(bounds.minLon, 0))
  const spanY = Math.abs(latToY(bounds.minLat, 0) - latToY(bounds.maxLat, 0))
  const zx = spanX > 0 ? Math.log2(availW / spanX) : Infinity
  const zy = spanY > 0 ? Math.log2(availH / spanY) : Infinity
  const z = Math.min(zx, zy)
  return Math.max(minZoom, Math.min(maxZoom, z))
}

// The padded viewport is off-center when padding is asymmetric, so the camera
// center is the bounds center shifted by half the padding imbalance.
export function fitCenter(
  bounds: Bounds,
  zoom: number,
  padding: Padding,
): LatLon {
  const midX = (lonToX(bounds.minLon, zoom) + lonToX(bounds.maxLon, zoom)) / 2
  const midY = (latToY(bounds.minLat, zoom) + latToY(bounds.maxLat, zoom)) / 2
  const dx = (padding.left - padding.right) / 2
  const dy = (padding.top - padding.bottom) / 2
  return {
    lat: yToLat(midY - dy, zoom),
    lon: xToLon(midX - dx, zoom),
  }
}

// atxactly/scoring has the same formula at R = 6371008.8, which its scores are
// pinned to. Keep these radii separate: changing this one is safe, changing
// that one moves every score.
export function haversineMeters(a: LatLon, b: LatLon): number {
  const R = 6371000
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLon = (b.lon - a.lon) * rad
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function nearest<T extends LatLon>(
  points: readonly T[],
  px: number,
  py: number,
  project: (p: LatLon) => { x: number; y: number },
  radiusPx: number,
): T | null {
  let best: T | null = null
  let bestDist = radiusPx
  for (const p of points) {
    const s = project(p)
    const d = Math.hypot(s.x - px, s.y - py)
    if (d <= bestDist) {
      best = p
      bestDist = d
    }
  }
  return best
}
