import { describe, expect, it } from 'vitest'
import { routeToSvgPath } from './svg'
import type { RouteCoord } from './projection'

const coords = (d: string) =>
  [...d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map((m) => ({
    x: Number(m[1]),
    y: Number(m[2]),
  }))

describe('routeToSvgPath', () => {
  it('draws a two-point diagonal as M then L inside the padded box', () => {
    const route: RouteCoord[] = [
      [30.2672, -97.7431],
      [31.7619, -106.485],
    ]
    const { d, viewBox } = routeToSvgPath(route, 120, 80, 8)
    expect(viewBox).toBe('0 0 120 80')
    expect(d.startsWith('M')).toBe(true)
    expect(d.split(' L').length).toBe(2)
    for (const p of coords(d)) {
      expect(p.x).toBeGreaterThanOrEqual(8 - 1e-6)
      expect(p.x).toBeLessThanOrEqual(120 - 8 + 1e-6)
      expect(p.y).toBeGreaterThanOrEqual(8 - 1e-6)
      expect(p.y).toBeLessThanOrEqual(80 - 8 + 1e-6)
    }
  })

  it('centers a horizontal-only route vertically', () => {
    const route: RouteCoord[] = [
      [30, -100],
      [30, -95],
    ]
    const { d } = routeToSvgPath(route, 120, 80, 8)
    for (const p of coords(d)) expect(p.y).toBeCloseTo(40, 6)
  })

  it('centers a vertical-only route horizontally', () => {
    const route: RouteCoord[] = [
      [28, -100],
      [33, -100],
    ]
    const { d } = routeToSvgPath(route, 120, 80, 8)
    for (const p of coords(d)) expect(p.x).toBeCloseTo(60, 6)
  })

  it('places a single point at the center of the box', () => {
    const { d } = routeToSvgPath([[30, -97]], 120, 80, 8)
    expect(coords(d)).toEqual([{ x: 60, y: 40 }])
  })

  it('emits no NaN for any of these routes', () => {
    const routes: RouteCoord[][] = [
      [
        [30.2672, -97.7431],
        [31.7619, -106.485],
      ],
      [
        [30, -100],
        [30, -95],
      ],
      [[30, -97]],
    ]
    for (const r of routes)
      expect(routeToSvgPath(r, 120, 80, 8).d).not.toMatch(/NaN/)
  })

  it('returns an empty path for an empty route', () => {
    expect(routeToSvgPath([], 120, 80, 8)).toEqual({
      d: '',
      viewBox: '0 0 120 80',
    })
  })
})
