import { describe, expect, it } from 'vitest'
import { STARTING_GRID_SIZE } from './config'
import { countTiles } from './grid'
import { mulberry32 } from './rng'
import { createState } from './state'
import { spawnWeeds } from './weeds'

const PLOT_TILES = STARTING_GRID_SIZE * STARTING_GRID_SIZE

describe('spawnWeeds', () => {
  it('spawns on every grass tile when the roll always hits', () => {
    const state = createState()
    const events = spawnWeeds(state, () => 0, 1000)
    expect(events).toHaveLength(PLOT_TILES)
    expect(countTiles(state, 'weed')).toBe(PLOT_TILES)
    expect(countTiles(state, 'grass')).toBe(0)
  })

  it('never spawns when the roll always misses', () => {
    const state = createState()
    expect(spawnWeeds(state, () => 0.999999, 1000)).toHaveLength(0)
    expect(countTiles(state, 'weed')).toBe(0)
  })

  it('does not double-spawn on weeded tiles', () => {
    const state = createState()
    spawnWeeds(state, () => 0, 1000)
    expect(spawnWeeds(state, () => 0, 1000)).toHaveLength(0)
  })

  it('is deterministic for the same seed with a discriminating roll', () => {
    const a = createState()
    const b = createState()
    // dt=25000 -> chance 0.5, so the outcome actually depends on the seed
    const eventsA = spawnWeeds(a, mulberry32(9), 25_000)
    const eventsB = spawnWeeds(b, mulberry32(9), 25_000)
    expect(eventsA.length).toBeGreaterThan(0)
    expect(eventsA.length).toBeLessThan(PLOT_TILES)
    expect(eventsA).toEqual(eventsB)
    expect(a.tiles).toEqual(b.tiles)
  })
})
