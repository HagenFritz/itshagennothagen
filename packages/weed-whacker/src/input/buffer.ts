import type { Intent } from '../core/state'
import { heldDirection, isBuyKey, isChopKey } from './keyboard'

// Level-triggered movement (held keys drive continuous moves, sim cooldown
// paces them) and edge-triggered chop/buy (one per physical press). Held is
// updated on every keydown including OS auto-repeat, so a key still down
// after a blur/refocus re-establishes itself; pressed only takes the first
// (non-repeat) event so one press is one action.
export interface InputBuffer {
  keydown: (code: string, repeat: boolean) => void
  keyup: (code: string) => void
  clear: () => void
  collect: () => Intent[]
}

export function createInputBuffer(): InputBuffer {
  const held: string[] = []
  const pressed = new Set<string>()

  return {
    keydown(code, repeat) {
      if (!held.includes(code)) held.push(code)
      if (!repeat) pressed.add(code)
    },
    keyup(code) {
      const i = held.indexOf(code)
      if (i !== -1) held.splice(i, 1)
    },
    clear() {
      held.length = 0
      pressed.clear()
    },
    collect() {
      const intents: Intent[] = []
      const dir = heldDirection(held)
      if (dir) intents.push({ type: 'move', dir })
      for (const code of pressed) {
        if (isChopKey(code)) intents.push({ type: 'chop' })
        else if (isBuyKey(code)) intents.push({ type: 'buy' })
      }
      pressed.clear()
      return intents
    },
  }
}
