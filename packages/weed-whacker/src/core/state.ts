import { STARTING_TILE_COUNT, WORLD_GRID_SIZE } from './config'
import type { Rng } from './rng'
import { mulberry32 } from './rng'

export type TileType = 'grass' | 'weed' | 'unowned'
export type Direction = 'up' | 'down' | 'left' | 'right'
export type RunPhase = 'idle' | 'running' | 'ended'

export type Intent =
  | { type: 'move'; dir: Direction }
  | { type: 'chop' }
  | { type: 'buy' }

export type GameEvent =
  | { type: 'weedWhacked'; x: number; y: number }
  | { type: 'weedSpawned'; x: number; y: number }
  | { type: 'tilePurchased'; x: number; y: number; cost: number }
  | { type: 'buyDenied'; reason: 'noTarget' | 'cannotAfford' }
  | { type: 'timerWarning' }
  | { type: 'runEnded'; whacked: number }

export interface PlayerState {
  x: number
  y: number
  facing: Direction
  moveCooldownMs: number
  chopCooldownMs: number
}

export interface GameState {
  tiles: TileType[][]
  player: PlayerState
  money: number
  tilesPurchased: number
  whacked: number
  elapsedMs: number
  accumulatorMs: number
  phase: RunPhase
  timerWarningFired: boolean
}

export function createState(rng: Rng = mulberry32(1)): GameState {
  const tiles: TileType[][] = []
  for (let y = 0; y < WORLD_GRID_SIZE; y++) {
    const row: TileType[] = []
    for (let x = 0; x < WORLD_GRID_SIZE; x++) {
      row.push('unowned')
    }
    tiles.push(row)
  }

  const center = Math.floor(WORLD_GRID_SIZE / 2)
  growStartingPlot(tiles, center, rng)

  return {
    tiles,
    player: {
      x: center,
      y: center,
      facing: 'down',
      moveCooldownMs: 0,
      chopCooldownMs: 0,
    },
    money: 0,
    tilesPurchased: 0,
    whacked: 0,
    elapsedMs: 0,
    accumulatorMs: 0,
    phase: 'idle',
    timerWarningFired: false,
  }
}

// Grow a connected random blob of STARTING_TILE_COUNT grass tiles out from
// the center. Connected so the player (who spawns at center and can only
// walk owned tiles) can reach every starting tile. Each step picks a random
// unowned tile orthogonally adjacent to the blob so far.
function growStartingPlot(tiles: TileType[][], center: number, rng: Rng): void {
  tiles[center]![center] = 'grass'
  let count = 1

  const key = (x: number, y: number) => y * WORLD_GRID_SIZE + x
  const frontier = new Map<number, [number, number]>()
  const deltas: [number, number][] = [
    [0, -1],
    [0, 1],
    [-1, 0],
    [1, 0],
  ]
  const addFrontier = (x: number, y: number) => {
    for (const [dx, dy] of deltas) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || nx >= WORLD_GRID_SIZE || ny < 0 || ny >= WORLD_GRID_SIZE) {
        continue
      }
      if (tiles[ny]![nx] === 'grass') continue
      frontier.set(key(nx, ny), [nx, ny])
    }
  }
  addFrontier(center, center)

  while (count < STARTING_TILE_COUNT && frontier.size > 0) {
    const candidates = [...frontier.values()]
    const [x, y] = candidates[Math.floor(rng() * candidates.length)]!
    frontier.delete(key(x, y))
    tiles[y]![x] = 'grass'
    count++
    addFrontier(x, y)
  }
}
