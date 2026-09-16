import { describe, expect, it } from 'vitest'
import {
  boundsOf,
  centerOf,
  fitCenter,
  fitZoom,
  haversineMeters,
  nearest,
  type Bounds,
  type Padding,
} from './bounds'
import { latToY, lonToX, type LatLon } from './projection'

const austin = { lat: 30.2672, lon: -97.7431 }
const marfa = { lat: 30.3095, lon: -104.0206 }

const pad = (p: Partial<Padding> = {}): Padding => ({
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  ...p,
})

function corners(
  bounds: Bounds,
  center: LatLon,
  zoom: number,
  viewW: number,
  viewH: number,
) {
  const ox = lonToX(center.lon, zoom) - viewW / 2
  const oy = latToY(center.lat, zoom) - viewH / 2
  return {
    left: lonToX(bounds.minLon, zoom) - ox,
    right: lonToX(bounds.maxLon, zoom) - ox,
    top: latToY(bounds.maxLat, zoom) - oy,
    bottom: latToY(bounds.minLat, zoom) - oy,
  }
}

describe('boundsOf', () => {
  it('spans every point', () => {
    expect(boundsOf([austin, marfa, { lat: 31.5, lon: -100 }])).toEqual({
      minLat: 30.2672,
      maxLat: 31.5,
      minLon: -104.0206,
      maxLon: -97.7431,
    })
  })

  it('throws on an empty list', () => {
    expect(() => boundsOf([])).toThrow()
  })
})

describe('fitZoom', () => {
  const bounds = boundsOf([austin, marfa])

  it('fits the bounds inside the padded view but one level higher does not', () => {
    const p = pad({ top: 20, right: 20, bottom: 20, left: 20 })
    const z = fitZoom(bounds, 800, 500, p, 4, 17)
    const c = corners(bounds, fitCenter(bounds, z, p), z, 800, 500)
    expect(c.left).toBeGreaterThanOrEqual(p.left - 1e-6)
    expect(c.right).toBeLessThanOrEqual(800 - p.right + 1e-6)
    expect(c.top).toBeGreaterThanOrEqual(p.top - 1e-6)
    expect(c.bottom).toBeLessThanOrEqual(500 - p.bottom + 1e-6)

    const z2 = z + 1
    const c2 = corners(bounds, fitCenter(bounds, z2, p), z2, 800, 500)
    const fitsHigher =
      c2.left >= p.left &&
      c2.right <= 800 - p.right &&
      c2.top >= p.top &&
      c2.bottom <= 500 - p.bottom
    expect(fitsHigher).toBe(false)
  })

  it('shifts the fit into the upper band when the bottom padding is large', () => {
    const p = pad({ bottom: 200 })
    const z = fitZoom(bounds, 800, 500, p, 4, 17)
    const c = corners(bounds, fitCenter(bounds, z, p), z, 800, 500)
    expect(c.bottom).toBeLessThanOrEqual(300 + 1e-6)
    expect(c.top).toBeGreaterThanOrEqual(-1e-6)
    expect((c.top + c.bottom) / 2).toBeCloseTo(150, 6)
  })

  it('clamps to maxZoom for tiny bounds and minZoom for enormous ones', () => {
    const tiny = boundsOf([austin, { lat: 30.2673, lon: -97.743 }])
    expect(fitZoom(tiny, 800, 500, pad(), 4, 17)).toBe(17)
    const huge = { minLat: -80, maxLat: 80, minLon: -179, maxLon: 179 }
    expect(fitZoom(huge, 200, 120, pad(), 4, 17)).toBe(4)
  })

  it('returns minZoom when the padding consumes the view', () => {
    expect(fitZoom(bounds, 100, 100, pad({ left: 60, right: 60 }), 4, 17)).toBe(
      4,
    )
  })
})

describe('centerOf', () => {
  it('is the midpoint of the bounds', () => {
    expect(centerOf(boundsOf([austin, marfa]))).toEqual({
      lat: (30.2672 + 30.3095) / 2,
      lon: (-104.0206 + -97.7431) / 2,
    })
  })
})

describe('haversineMeters', () => {
  it('measures Austin to Marfa at about 603 km great-circle', () => {
    const m = haversineMeters(austin, marfa)
    expect(Math.abs(m - 603000) / 603000).toBeLessThan(0.01)
  })

  it('is zero for a point against itself', () => {
    expect(haversineMeters(austin, austin)).toBe(0)
  })
})

describe('nearest', () => {
  const project = (p: LatLon) => ({ x: p.lon, y: p.lat })
  const points = [
    { lat: 0, lon: 0, name: 'origin' },
    { lat: 10, lon: 0, name: 'far' },
    { lat: 3, lon: 0, name: 'mid' },
  ]

  it('returns the closest point within the radius', () => {
    expect(nearest(points, 0, 2, project, 5)?.name).toBe('mid')
  })

  it('prefers the closer of two candidates inside the radius', () => {
    expect(nearest(points, 0, 1, project, 5)?.name).toBe('origin')
  })

  it('returns null when nothing is within the radius', () => {
    expect(nearest(points, 0, 100, project, 5)).toBeNull()
  })

  it('returns null for an empty list', () => {
    expect(nearest([], 0, 0, project, 5)).toBeNull()
  })
})
