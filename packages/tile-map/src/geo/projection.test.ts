import { describe, expect, it } from 'vitest'
import {
  latToY,
  lonToX,
  MAX_MERCATOR_LAT,
  metersPerPixel,
  TILE_SIZE,
  toLatLon,
  xToLon,
  yToLat,
} from './projection'

const places = [
  { lat: 30.2672, lon: -97.7431 },
  { lat: 30.3095, lon: -104.0206 },
  { lat: 0, lon: 0 },
  { lat: -33.8688, lon: 151.2093 },
]

describe('projection round-trips', () => {
  it('recovers lon and lat at zooms 4, 11, and 17', () => {
    for (const z of [4, 11, 17]) {
      for (const p of places) {
        expect(xToLon(lonToX(p.lon, z), z)).toBeCloseTo(p.lon, 9)
        expect(yToLat(latToY(p.lat, z), z)).toBeCloseTo(p.lat, 9)
      }
    }
  })

  it('round-trips at fractional zoom', () => {
    expect(xToLon(lonToX(-97.7431, 12.37), 12.37)).toBeCloseTo(-97.7431, 9)
    expect(yToLat(latToY(30.2672, 12.37), 12.37)).toBeCloseTo(30.2672, 9)
  })
})

describe('known anchors', () => {
  it('puts lon 0 and lat 0 at the middle of the world', () => {
    for (const z of [0, 4, 11]) {
      const world = Math.pow(2, z) * TILE_SIZE
      expect(lonToX(0, z)).toBeCloseTo(world / 2, 9)
      expect(latToY(0, z)).toBeCloseTo(world / 2, 9)
    }
  })

  it('puts the mercator limit near the top of the world', () => {
    expect(latToY(MAX_MERCATOR_LAT, 4)).toBeCloseTo(0, 6)
    expect(lonToX(-180, 4)).toBe(0)
    expect(lonToX(180, 4)).toBe(Math.pow(2, 4) * TILE_SIZE)
  })
})

describe('metersPerPixel', () => {
  it('halves with each zoom level and shrinks with latitude', () => {
    expect(metersPerPixel(0, 1)).toBeCloseTo(metersPerPixel(0, 0) / 2, 6)
    expect(metersPerPixel(60, 10)).toBeLessThan(metersPerPixel(0, 10))
  })
})

describe('toLatLon', () => {
  it('reads a route tuple as lat then lon', () => {
    expect(toLatLon([30.2672, -97.7431])).toEqual({
      lat: 30.2672,
      lon: -97.7431,
    })
  })
})
