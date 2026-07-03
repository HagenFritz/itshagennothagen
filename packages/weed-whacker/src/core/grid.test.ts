import { describe, expect, it } from 'vitest'
import { STARTING_GRID_SIZE, WORLD_GRID_SIZE } from './config'
import { countTiles, inBounds, isOwned, tileAt } from './grid'
import { createState } from './state'

describe('createState', () => {
  it('creates a centered starting plot of grass', () => {
    const state = createState()
    expect(countTiles(state, 'grass')).toBe(
      STARTING_GRID_SIZE * STARTING_GRID_SIZE,
    )
    expect(countTiles(state, 'weed')).toBe(0)

    const center = Math.floor(WORLD_GRID_SIZE / 2)
    const start = center - Math.floor(STARTING_GRID_SIZE / 2)
    expect(tileAt(state, start, start)).toBe('grass')
    expect(tileAt(state, start + STARTING_GRID_SIZE - 1, start)).toBe('grass')
    expect(tileAt(state, start - 1, start)).toBe('unowned')
  })

  it('starts the player at the center on an owned tile', () => {
    const state = createState()
    const center = Math.floor(WORLD_GRID_SIZE / 2)
    expect(state.player.x).toBe(center)
    expect(state.player.y).toBe(center)
    expect(isOwned(tileAt(state, center, center))).toBe(true)
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
