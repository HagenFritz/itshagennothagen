import { describe, expect, it } from 'vitest'
import {
  EDGE_OFFSET,
  FLOOR,
  INSIDE_EDGE,
  MAXD,
  pointInRing,
  scoreLocation,
  scoreOf,
} from './scoring'

const SQUARE = {
  lat: 30.25,
  lon: -97.75,
  shape: [
    [
      [-97.76, 30.24],
      [-97.74, 30.24],
      [-97.74, 30.26],
      [-97.76, 30.26],
    ],
  ],
}

describe('scoreOf', () => {
  it('runs from 100 at the floor to 0 at the cap', () => {
    expect(scoreOf(0)).toBe(100)
    expect(scoreOf(FLOOR)).toBe(100)
    expect(scoreOf(1000)).toBe(56.6)
    expect(scoreOf(MAXD)).toBe(0)
    expect(scoreOf(30000)).toBe(0)
  })

  it('scores exactly INSIDE_EDGE at EDGE_OFFSET', () => {
    expect(EDGE_OFFSET).toBeCloseTo(298.0324046827702, 9)
    expect(scoreOf(EDGE_OFFSET)).toBe(INSIDE_EDGE)
  })
})

describe('scoreLocation on a polygon', () => {
  it('stays continuous across the boundary', () => {
    expect(scoreLocation(30.25, -97.75, SQUARE)).toEqual({
      base: 100,
      dist: 0,
    })
    const inside = scoreLocation(30.2401, -97.7599, SQUARE)
    const outside = scoreLocation(30.2399, -97.7601, SQUARE)
    expect(inside.base).toBe(75.3)
    expect(inside.dist).toBe(0)
    expect(outside.base).toBe(74.3)
    expect(outside.dist).toBeCloseTo(14.654580575599544, 9)
  })
})

describe('pointInRing', () => {
  it('separates an inside point from an outside one', () => {
    expect(pointInRing(-97.75, 30.25, SQUARE.shape[0]!)).toBe(true)
    expect(pointInRing(-97.8, 30.25, SQUARE.shape[0]!)).toBe(false)
  })
})
