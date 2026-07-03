import { describe, expect, it } from 'vitest'
import {
  STARTING_GRID_SIZE,
  TILE_BASE_COST,
  TILE_COST_INCREMENT,
} from './config'
import { accrueIncome, applyBuy, nextTileCost } from './economy'
import { countTiles, setTile, tileAt } from './grid'
import { createState } from './state'
import type { GameState } from './state'

const PLOT_TILES = STARTING_GRID_SIZE * STARTING_GRID_SIZE

function stateFacingUnowned(): GameState {
  const state = createState()
  state.player.x = 13
  state.player.y = 13
  state.player.facing = 'up'
  return state
}

describe('accrueIncome', () => {
  it('earns per clear grass tile per second', () => {
    const state = createState()
    accrueIncome(state, 1000)
    expect(state.money).toBe(PLOT_TILES)
  })

  it('earns nothing from weed tiles', () => {
    const state = createState()
    setTile(state, 13, 13, 'weed')
    accrueIncome(state, 1000)
    expect(state.money).toBe(PLOT_TILES - 1)
  })

  it('earns zero on a fully weeded plot', () => {
    const state = createState()
    for (let y = 13; y <= 17; y++) {
      for (let x = 13; x <= 17; x++) {
        setTile(state, x, y, 'weed')
      }
    }
    accrueIncome(state, 1000)
    expect(state.money).toBe(0)
  })
})

describe('applyBuy', () => {
  it('buys the faced unowned tile at exactly the cost boundary', () => {
    const state = stateFacingUnowned()
    state.money = TILE_BASE_COST
    const events = applyBuy(state)
    expect(events).toEqual([
      { type: 'tilePurchased', x: 13, y: 12, cost: TILE_BASE_COST },
    ])
    expect(state.money).toBe(0)
    expect(state.tilesPurchased).toBe(1)
    expect(tileAt(state, 13, 12)).toBe('grass')
    expect(countTiles(state, 'grass')).toBe(PLOT_TILES + 1)
  })

  it('increments the cost with each purchase', () => {
    const state = stateFacingUnowned()
    state.money = 100
    applyBuy(state)
    expect(nextTileCost(state)).toBe(TILE_BASE_COST + TILE_COST_INCREMENT)
    state.player.facing = 'left'
    applyBuy(state)
    expect(nextTileCost(state)).toBe(TILE_BASE_COST + 2 * TILE_COST_INCREMENT)
  })

  it('denies when short by any amount', () => {
    const state = stateFacingUnowned()
    state.money = TILE_BASE_COST - 0.01
    expect(applyBuy(state)).toEqual([
      { type: 'buyDenied', reason: 'cannotAfford' },
    ])
    expect(state.tilesPurchased).toBe(0)
    expect(tileAt(state, 13, 12)).toBe('unowned')
  })

  it('denies when facing an owned tile', () => {
    const state = createState()
    state.money = 100
    expect(applyBuy(state)).toEqual([{ type: 'buyDenied', reason: 'noTarget' }])
    expect(state.money).toBe(100)
  })

  it('denies when facing a weed tile and leaves the weed', () => {
    const state = stateFacingUnowned()
    setTile(state, 13, 12, 'weed')
    state.money = 100
    expect(applyBuy(state)).toEqual([{ type: 'buyDenied', reason: 'noTarget' }])
    expect(tileAt(state, 13, 12)).toBe('weed')
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
