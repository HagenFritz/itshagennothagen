import { STARTING_GRID_SIZE, WORLD_GRID_SIZE } from './config'

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
  phase: RunPhase
  timerWarningFired: boolean
}

export function createState(): GameState {
  const tiles: TileType[][] = []
  for (let y = 0; y < WORLD_GRID_SIZE; y++) {
    const row: TileType[] = []
    for (let x = 0; x < WORLD_GRID_SIZE; x++) {
      row.push('unowned')
    }
    tiles.push(row)
  }

  const center = Math.floor(WORLD_GRID_SIZE / 2)
  const start = center - Math.floor(STARTING_GRID_SIZE / 2)
  for (let y = start; y < start + STARTING_GRID_SIZE; y++) {
    for (let x = start; x < start + STARTING_GRID_SIZE; x++) {
      tiles[y]![x] = 'grass'
    }
  }

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
    phase: 'idle',
    timerWarningFired: false,
  }
}
