import {
  INCOME_PER_TILE_PER_SECOND,
  TILE_BASE_COST,
  TILE_COST_INCREMENT,
} from './config'
import { DIRECTION_DELTAS, countTiles, setTile, tileAt } from './grid'
import type { GameEvent, GameState } from './state'

export function nextTileCost(state: GameState): number {
  return TILE_BASE_COST + state.tilesPurchased * TILE_COST_INCREMENT
}

export function accrueIncome(state: GameState, dtMs: number): void {
  const grass = countTiles(state, 'grass')
  state.money += (grass * INCOME_PER_TILE_PER_SECOND * dtMs) / 1000
}

export function applyBuy(state: GameState): GameEvent[] {
  const p = state.player
  const [dx, dy] = DIRECTION_DELTAS[p.facing]
  const x = p.x + dx
  const y = p.y + dy

  // The target faces the player, whose own tile is always owned, so the
  // adjacent-to-owned rule from the original economy.py holds implicitly.
  if (tileAt(state, x, y) !== 'unowned') {
    return [{ type: 'buyDenied', reason: 'noTarget' }]
  }

  const cost = nextTileCost(state)
  if (state.money < cost) {
    return [{ type: 'buyDenied', reason: 'cannotAfford' }]
  }

  state.money -= cost
  state.tilesPurchased++
  setTile(state, x, y, 'grass')
  return [{ type: 'tilePurchased', x, y, cost }]
}
