import { latToY, lonToX, type RouteCoord } from './projection'

const REFERENCE_ZOOM = 8

export type SvgRoute = { d: string; viewBox: string }

// Deliberately not sharing an aspect-fit helper with fitZoom: that one returns a
// tile zoom level, this one scales into an arbitrary box.
export function routeToSvgPath(
  route: readonly RouteCoord[],
  width: number,
  height: number,
  padding: number,
): SvgRoute {
  const viewBox = `0 0 ${width} ${height}`
  if (route.length === 0) return { d: '', viewBox }

  const pts = route.map(([lat, lon]) => ({
    x: lonToX(lon, REFERENCE_ZOOM),
    y: latToY(lat, REFERENCE_ZOOM),
  }))
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const availW = width - padding * 2
  const availH = height - padding * 2
  const spanX = maxX - minX
  const spanY = maxY - minY
  const scale =
    spanX > 0 || spanY > 0
      ? Math.min(
          spanX > 0 ? availW / spanX : Infinity,
          spanY > 0 ? availH / spanY : Infinity,
        )
      : 1
  const offsetX = (width - spanX * scale) / 2 - minX * scale
  const offsetY = (height - spanY * scale) / 2 - minY * scale

  const d = pts
    .map((p, i) => {
      const x = p.x * scale + offsetX
      const y = p.y * scale + offsetY
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(' ')

  return { d, viewBox }
}
