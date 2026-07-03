import {
  WEED_SPAWN_CHANCE_PER_TILE_PER_SECOND,
  WORLD_GRID_SIZE,
} from './config'
import type { Rng } from './rng'
import type { GameEvent, GameState } from './state'

export function spawnWeeds(
  state: GameState,
  rng: Rng,
  dtMs: number,
): GameEvent[] {
  const chance = (WEED_SPAWN_CHANCE_PER_TILE_PER_SECOND * dtMs) / 1000
  const events: GameEvent[] = []
  for (let y = 0; y < WORLD_GRID_SIZE; y++) {
    for (let x = 0; x < WORLD_GRID_SIZE; x++) {
      if (state.tiles[y]![x] !== 'grass') continue
      if (rng() < chance) {
        state.tiles[y]![x] = 'weed'
        events.push({ type: 'weedSpawned', x, y })
      }
    }
  }
  return events
}
