import { describe, expect, it } from 'vitest'
import { Camera } from './camera'
import { TILE_SIZE } from './geo/index'

const BOUNDS = { minLat: 30.1, maxLat: 30.5, minLon: -97.9, maxLon: -97.5 }
const NO_PADDING = { top: 0, right: 0, bottom: 0, left: 0 }
const VIEW = { width: 800, height: 600 }

const makeCamera = (
  over: Partial<ConstructorParameters<typeof Camera>[0]> = {},
) =>
  new Camera({
    bounds: BOUNDS,
    minZoom: 11,
    maxZoom: 18,
    padding: NO_PADDING,
    ...over,
  })

describe('clamp', () => {
  it('holds zoom inside the range', () => {
    const camera = makeCamera()
    camera.zoom = 42
    camera.clamp()
    expect(camera.zoom).toBe(18)
    camera.zoom = 2
    camera.clamp()
    expect(camera.zoom).toBe(11)
  })

  it('holds the center inside the bounds', () => {
    const camera = makeCamera()
    camera.center = { lat: 40, lon: -80 }
    camera.clamp()
    expect(camera.center.lat).toBeCloseTo(BOUNDS.maxLat, 10)
    expect(camera.center.lon).toBeCloseTo(BOUNDS.maxLon, 10)

    camera.center = { lat: 20, lon: -120 }
    camera.clamp()
    expect(camera.center.lat).toBeCloseTo(BOUNDS.minLat, 10)
    expect(camera.center.lon).toBeCloseTo(BOUNDS.minLon, 10)
  })

  it('relaxes the southern bound by the bottom padding', () => {
    const padded = makeCamera({
      padding: { ...NO_PADDING, bottom: 200 },
    })
    padded.zoom = 13
    padded.center = { lat: 0, lon: -97.7 }
    padded.clamp()
    expect(padded.center.lat).toBeLessThan(BOUNDS.minLat)

    const plain = makeCamera()
    plain.zoom = 13
    plain.center = { lat: 0, lon: -97.7 }
    plain.clamp()
    expect(plain.center.lat).toBeCloseTo(BOUNDS.minLat, 10)
  })
})

describe('zoomAt', () => {
  it('leaves the center unchanged when anchored at the view center', () => {
    const camera = makeCamera()
    camera.setView({ lat: 30.3, lon: -97.7 }, 13)
    const before = { ...camera.center }
    camera.zoomAt(1, VIEW.width / 2, VIEW.height / 2, VIEW)
    expect(camera.zoom).toBe(14)
    expect(camera.center.lat).toBeCloseTo(before.lat, 9)
    expect(camera.center.lon).toBeCloseTo(before.lon, 9)
  })

  it('keeps the point under an off-center anchor fixed', () => {
    const camera = makeCamera()
    camera.setView({ lat: 30.3, lon: -97.7 }, 13)
    const anchor = { x: 120, y: 470 }
    const before = camera.unproject(anchor.x, anchor.y, VIEW)
    camera.zoomAt(1, anchor.x, anchor.y, VIEW)
    const after = camera.unproject(anchor.x, anchor.y, VIEW)
    expect(after.lat).toBeCloseTo(before.lat, 6)
    expect(after.lon).toBeCloseTo(before.lon, 6)
  })
})

describe('panBy', () => {
  it('shifts longitude by one tile width in degrees', () => {
    const wide = makeCamera({
      bounds: { minLat: -80, maxLat: 80, minLon: -179, maxLon: 179 },
      minZoom: 2,
    })
    const zoom = 6
    wide.setView({ lat: 0, lon: 0 }, zoom)
    wide.panBy(TILE_SIZE, 0)
    expect(wide.center.lon).toBeCloseTo(-360 / 2 ** zoom, 9)
  })
})

describe('fit', () => {
  it('frames the bounds inside the view', () => {
    const camera = makeCamera({ minZoom: 4 })
    camera.fit(VIEW)
    const nw = camera.project({ lat: BOUNDS.maxLat, lon: BOUNDS.minLon }, VIEW)
    const se = camera.project({ lat: BOUNDS.minLat, lon: BOUNDS.maxLon }, VIEW)
    expect(nw.x).toBeGreaterThanOrEqual(-0.001)
    expect(nw.y).toBeGreaterThanOrEqual(-0.001)
    expect(se.x).toBeLessThanOrEqual(VIEW.width + 0.001)
    expect(se.y).toBeLessThanOrEqual(VIEW.height + 0.001)
  })
})
