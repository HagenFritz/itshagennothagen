import { CHOP_COOLDOWN_MS, PLAYER_MOVE_COOLDOWN_MS } from './config'
import { DIRECTION_DELTAS, isOwned, setTile, tileAt } from './grid'
import type { Direction, GameEvent, GameState } from './state'

export function tickCooldowns(state: GameState, dtMs: number): void {
  const p = state.player
  p.moveCooldownMs = Math.max(0, p.moveCooldownMs - dtMs)
  p.chopCooldownMs = Math.max(0, p.chopCooldownMs - dtMs)
}

export function applyMove(state: GameState, dir: Direction): void {
  const p = state.player
  p.facing = dir
  if (p.moveCooldownMs > 0) return

  const [dx, dy] = DIRECTION_DELTAS[dir]
  const target = tileAt(state, p.x + dx, p.y + dy)
  if (!isOwned(target)) return

  p.x += dx
  p.y += dy
  p.moveCooldownMs = PLAYER_MOVE_COOLDOWN_MS
}

export function applyChop(state: GameState): GameEvent[] {
  const p = state.player
  if (p.chopCooldownMs > 0) return []
  if (tileAt(state, p.x, p.y) !== 'weed') return []

  setTile(state, p.x, p.y, 'grass')
  state.whacked++
  p.chopCooldownMs = CHOP_COOLDOWN_MS
  return [{ type: 'weedWhacked', x: p.x, y: p.y }]
}
