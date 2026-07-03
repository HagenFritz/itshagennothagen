import { WORLD_GRID_SIZE } from './config'
import type { Direction, GameState, TileType } from './state'

export const DIRECTION_DELTAS: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
}

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && x < WORLD_GRID_SIZE && y >= 0 && y < WORLD_GRID_SIZE
}

export function tileAt(
  state: GameState,
  x: number,
  y: number,
): TileType | undefined {
  if (!inBounds(x, y)) return undefined
  return state.tiles[y]![x]
}

export function setTile(
  state: GameState,
  x: number,
  y: number,
  tile: TileType,
): void {
  if (!inBounds(x, y)) return
  state.tiles[y]![x] = tile
}

export function isOwned(tile: TileType | undefined): boolean {
  return tile === 'grass' || tile === 'weed'
}

export function countTiles(state: GameState, tile: TileType): number {
  let count = 0
  for (const row of state.tiles) {
    for (const t of row) {
      if (t === tile) count++
    }
  }
  return count
}
