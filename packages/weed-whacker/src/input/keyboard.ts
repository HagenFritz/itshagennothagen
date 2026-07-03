import type { Direction } from '../core/state'

const MOVE_KEYS: Record<string, Direction> = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
}

const CHOP_KEYS = new Set(['Space'])
const BUY_KEYS = new Set(['KeyB'])

export const GAME_KEYS = new Set([
  ...Object.keys(MOVE_KEYS),
  ...CHOP_KEYS,
  ...BUY_KEYS,
])

// Held direction, last pressed wins, so tapping a new key redirects
// immediately rather than waiting for the old key to lift.
export function heldDirection(
  held: string[],
  moveKeys: Record<string, Direction> = MOVE_KEYS,
): Direction | null {
  for (let i = held.length - 1; i >= 0; i--) {
    const dir = moveKeys[held[i]!]
    if (dir) return dir
  }
  return null
}

export function isChopKey(code: string): boolean {
  return CHOP_KEYS.has(code)
}

export function isBuyKey(code: string): boolean {
  return BUY_KEYS.has(code)
}
