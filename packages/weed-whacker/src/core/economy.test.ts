import { describe, expect, it } from 'vitest'
import {
  STARTING_TILE_COUNT,
  TILE_BASE_COST,
  TILE_COST_INCREMENT,
} from './config'
import { accrueIncome, applyBuy, nextTileCost } from './economy'
import { DIRECTION_DELTAS, countTiles, setTile, tileAt } from './grid'
import { createState } from './state'
import type { GameState } from './state'
import { findFrontier, findOwned } from './testutil'

// Place the player on a frontier tile facing a buyable neighbor, returning
// the target coordinates so assertions do not hardcode the random blob.
function facingBuyable(state: GameState): { x: number; y: number } {
  const f = findFrontier(state)
  state.player.x = f.x
  state.player.y = f.y
  state.player.facing = f.dir
  const [dx, dy] = DIRECTION_DELTAS[f.dir]
  return { x: f.x + dx, y: f.y + dy }
}

describe('accrueIncome', () => {
  it('earns per clear grass tile per second', () => {
    const state = createState()
    accrueIncome(state, 1000)
    expect(state.money).toBe(STARTING_TILE_COUNT)
  })

  it('earns nothing from weed tiles', () => {
    const state = createState()
    const owned = findOwned(state)
    setTile(state, owned.x, owned.y, 'weed')
    accrueIncome(state, 1000)
    expect(state.money).toBe(STARTING_TILE_COUNT - 1)
  })

  it('earns zero on a fully weeded plot', () => {
    const state = createState()
    for (let y = 0; y < state.tiles.length; y++) {
      for (let x = 0; x < state.tiles.length; x++) {
        if (state.tiles[y]![x] === 'grass') setTile(state, x, y, 'weed')
      }
    }
    accrueIncome(state, 1000)
    expect(state.money).toBe(0)
  })
})

describe('applyBuy', () => {
  it('buys the faced unowned tile at exactly the cost boundary', () => {
    const state = createState()
    const target = facingBuyable(state)
    state.money = TILE_BASE_COST
    const events = applyBuy(state)
    expect(events).toEqual([
      { type: 'tilePurchased', x: target.x, y: target.y, cost: TILE_BASE_COST },
    ])
    expect(state.money).toBe(0)
    expect(state.tilesPurchased).toBe(1)
    expect(tileAt(state, target.x, target.y)).toBe('grass')
    expect(countTiles(state, 'grass')).toBe(STARTING_TILE_COUNT + 1)
  })

  it('increments the cost with each purchase', () => {
    const state = createState()
    facingBuyable(state)
    state.money = 1000
    applyBuy(state)
    expect(nextTileCost(state)).toBe(TILE_BASE_COST + TILE_COST_INCREMENT)
    facingBuyable(state)
    applyBuy(state)
    expect(nextTileCost(state)).toBe(TILE_BASE_COST + 2 * TILE_COST_INCREMENT)
  })

  it('denies when short by any amount', () => {
    const state = createState()
    const target = facingBuyable(state)
    state.money = TILE_BASE_COST - 0.01
    expect(applyBuy(state)).toEqual([
      { type: 'buyDenied', reason: 'cannotAfford' },
    ])
    expect(state.tilesPurchased).toBe(0)
    expect(tileAt(state, target.x, target.y)).toBe('unowned')
  })

  it('denies when facing an owned tile', () => {
    const state = createState()
    // Find an owned tile with an owned neighbor and face it.
    let placed = false
    for (let y = 0; y < state.tiles.length && !placed; y++) {
      for (let x = 0; x < state.tiles.length && !placed; x++) {
        if (state.tiles[y]![x] !== 'grass') continue
        for (const dir of ['up', 'down', 'left', 'right'] as const) {
          const [dx, dy] = DIRECTION_DELTAS[dir]
          if (tileAt(state, x + dx, y + dy) === 'grass') {
            state.player.x = x
            state.player.y = y
            state.player.facing = dir
            placed = true
            break
          }
        }
      }
    }
    expect(placed).toBe(true)
    state.money = 100
    expect(applyBuy(state)).toEqual([{ type: 'buyDenied', reason: 'noTarget' }])
    expect(state.money).toBe(100)
  })

  it('denies when facing a weed tile and leaves the weed', () => {
    const state = createState()
    const target = facingBuyable(state)
    setTile(state, target.x, target.y, 'weed')
    state.money = 100
    expect(applyBuy(state)).toEqual([{ type: 'buyDenied', reason: 'noTarget' }])
    expect(tileAt(state, target.x, target.y)).toBe('weed')
    expect(state.money).toBe(100)
  })

  it('denies when facing out of bounds', () => {
    const state = createState()
    state.player.x = 0
    state.player.y = 0
    state.player.facing = 'up'
    state.money = 100
    expect(applyBuy(state)).toEqual([{ type: 'buyDenied', reason: 'noTarget' }])
  })
})
