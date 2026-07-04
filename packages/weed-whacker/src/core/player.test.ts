import { describe, expect, it } from 'vitest'
import { CHOP_COOLDOWN_MS, PLAYER_MOVE_COOLDOWN_MS } from './config'
import { setTile, tileAt } from './grid'
import { applyChop, applyMove, tickCooldowns } from './player'
import { createState } from './state'
import type { GameState } from './state'
import { findFrontier } from './testutil'

// A state with a known owned horizontal strip for movement mechanics, so
// assertions do not depend on the random starting blob's shape.
function stateWithOwnedRow(): GameState {
  const state = createState()
  const y = state.player.y
  for (let x = 0; x < state.tiles.length; x++) setTile(state, x, y, 'grass')
  state.player.x = 1
  return state
}

describe('applyMove', () => {
  it('moves onto owned tiles, faces the direction, and sets the cooldown', () => {
    const state = stateWithOwnedRow()
    const { x, y } = state.player
    applyMove(state, 'right')
    expect(state.player.x).toBe(x + 1)
    expect(state.player.y).toBe(y)
    expect(state.player.facing).toBe('right')
    expect(state.player.moveCooldownMs).toBe(PLAYER_MOVE_COOLDOWN_MS)
  })

  it('ignores an unknown direction without touching facing', () => {
    const state = createState()
    const { x, y } = state.player
    applyMove(state, 'north' as never)
    expect(state.player.x).toBe(x)
    expect(state.player.y).toBe(y)
    expect(state.player.facing).toBe('down')
  })

  it('blocks a second move until the cooldown expires', () => {
    const state = stateWithOwnedRow()
    const { x } = state.player
    applyMove(state, 'right')
    applyMove(state, 'right')
    expect(state.player.x).toBe(x + 1)
    tickCooldowns(state, PLAYER_MOVE_COOLDOWN_MS)
    applyMove(state, 'right')
    expect(state.player.x).toBe(x + 2)
  })

  it('does not walk onto unowned tiles but still turns', () => {
    const state = createState()
    // A frontier tile has an in-bounds unowned neighbor: blocking there
    // exercises the ownership check, not an out-of-bounds fallthrough.
    const f = findFrontier(state)
    state.player.x = f.x
    state.player.y = f.y
    applyMove(state, f.dir)
    expect(state.player.x).toBe(f.x)
    expect(state.player.y).toBe(f.y)
    expect(state.player.facing).toBe(f.dir)
    expect(state.player.moveCooldownMs).toBe(0)
  })

  it('updates facing even while on cooldown', () => {
    const state = createState()
    applyMove(state, 'right')
    applyMove(state, 'down')
    expect(state.player.facing).toBe('down')
  })
})

describe('applyChop', () => {
  it('whacks a weed on the player tile', () => {
    const state = createState()
    const { x, y } = state.player
    setTile(state, x, y, 'weed')
    const events = applyChop(state)
    expect(events).toEqual([{ type: 'weedWhacked', x, y }])
    expect(tileAt(state, x, y)).toBe('grass')
    expect(state.whacked).toBe(1)
    expect(state.player.chopCooldownMs).toBe(CHOP_COOLDOWN_MS)
  })

  it('whiffs on grass without consuming the cooldown', () => {
    const state = createState()
    const { x, y } = state.player
    expect(applyChop(state)).toEqual([])
    expect(state.player.chopCooldownMs).toBe(0)
    setTile(state, x, y, 'weed')
    expect(applyChop(state)).toHaveLength(1)
  })

  it('cannot chop again until the cooldown expires', () => {
    const state = createState()
    const { x, y } = state.player
    setTile(state, x, y, 'weed')
    applyChop(state)
    setTile(state, x, y, 'weed')
    expect(applyChop(state)).toEqual([])
    tickCooldowns(state, CHOP_COOLDOWN_MS)
    expect(applyChop(state)).toHaveLength(1)
    expect(state.whacked).toBe(2)
  })
})
