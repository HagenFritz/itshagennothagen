import { describe, expect, it } from 'vitest'
import { STARTING_TILE_COUNT, WORLD_GRID_SIZE } from './config'
import { countTiles, inBounds, isOwned, tileAt } from './grid'
import { mulberry32 } from './rng'
import { createState } from './state'

describe('createState', () => {
  it('creates a connected starting plot of the configured size', () => {
    const state = createState()
    expect(countTiles(state, 'grass')).toBe(STARTING_TILE_COUNT)
    expect(countTiles(state, 'weed')).toBe(0)
  })

  it('starts the player at the center on an owned tile', () => {
    const state = createState()
    const center = Math.floor(WORLD_GRID_SIZE / 2)
    expect(state.player.x).toBe(center)
    expect(state.player.y).toBe(center)
    expect(isOwned(tileAt(state, center, center))).toBe(true)
  })

  it('produces the same plot for the same seed and different for different', () => {
    const a = createState(mulberry32(3))
    const b = createState(mulberry32(3))
    const c = createState(mulberry32(4))
    expect(a.tiles).toEqual(b.tiles)
    expect(a.tiles).not.toEqual(c.tiles)
  })

  it('makes every starting tile reachable from the center', () => {
    for (const seed of [1, 2, 7, 42, 99]) {
      const state = createState(mulberry32(seed))
      const center = Math.floor(WORLD_GRID_SIZE / 2)
      const seen = new Set<number>()
      const stack: [number, number][] = [[center, center]]
      let cell: [number, number] | undefined
      while ((cell = stack.pop())) {
        const [x, y] = cell
        const k = y * WORLD_GRID_SIZE + x
        if (seen.has(k) || !isOwned(tileAt(state, x, y))) continue
        seen.add(k)
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
      }
      expect(seen.size).toBe(countTiles(state, 'grass'))
    }
  })

  it('starts idle with zeroed counters', () => {
    const state = createState()
    expect(state.phase).toBe('idle')
    expect(state.money).toBe(0)
    expect(state.whacked).toBe(0)
    expect(state.elapsedMs).toBe(0)
  })
})

describe('grid helpers', () => {
  it('bounds-checks reads', () => {
    const state = createState()
    expect(inBounds(-1, 0)).toBe(false)
    expect(inBounds(WORLD_GRID_SIZE, 0)).toBe(false)
    expect(tileAt(state, -1, 0)).toBeUndefined()
  })

  it('treats grass and weed as owned', () => {
    expect(isOwned('grass')).toBe(true)
    expect(isOwned('weed')).toBe(true)
    expect(isOwned('unowned')).toBe(false)
    expect(isOwned(undefined)).toBe(false)
  })
})
