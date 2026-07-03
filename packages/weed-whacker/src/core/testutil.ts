import { WORLD_GRID_SIZE } from './config'
import { DIRECTION_DELTAS, isOwned, tileAt } from './grid'
import type { Direction, GameState } from './state'

// The starting plot is a random connected blob, so tests locate tiles by
// property at runtime rather than hardcoding coordinates.

export function findOwned(state: GameState): { x: number; y: number } {
  for (let y = 0; y < WORLD_GRID_SIZE; y++) {
    for (let x = 0; x < WORLD_GRID_SIZE; x++) {
      if (isOwned(tileAt(state, x, y))) return { x, y }
    }
  }
  throw new Error('no owned tile')
}

// An owned tile whose neighbor in some direction is unowned, plus that
// direction. Used to place the player facing a buyable tile.
export function findFrontier(state: GameState): {
  x: number
  y: number
  dir: Direction
} {
  for (let y = 0; y < WORLD_GRID_SIZE; y++) {
    for (let x = 0; x < WORLD_GRID_SIZE; x++) {
      if (!isOwned(tileAt(state, x, y))) continue
      for (const dir of Object.keys(DIRECTION_DELTAS) as Direction[]) {
        const [dx, dy] = DIRECTION_DELTAS[dir]
        if (tileAt(state, x + dx, y + dy) === 'unowned') {
          return { x, y, dir }
        }
      }
    }
  }
  throw new Error('no frontier tile')
}
