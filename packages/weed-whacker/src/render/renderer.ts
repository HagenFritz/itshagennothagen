import { WORLD_GRID_SIZE } from '../core/config'
import { DIRECTION_DELTAS, tileAt } from '../core/grid'
import type { GameState } from '../core/state'
import type { SpriteName, SpriteSheet } from './sprites'

export const TILE_SIZE = 64
export const INTERNAL_SIZE = WORLD_GRID_SIZE * TILE_SIZE

const GRASS_VARIANTS: SpriteName[] = ['grass_1', 'grass_2', 'grass_3']

export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  sprites: SpriteSheet,
): void {
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, INTERNAL_SIZE, INTERNAL_SIZE)

  const target = buyTarget(state)

  for (let y = 0; y < WORLD_GRID_SIZE; y++) {
    for (let x = 0; x < WORLD_GRID_SIZE; x++) {
      const sx = x * TILE_SIZE
      const sy = y * TILE_SIZE
      const tile = state.tiles[y]![x]

      if (tile === 'grass' || tile === 'weed') {
        const variant = GRASS_VARIANTS[(x + y) % 3]!
        ctx.drawImage(sprites[variant], sx, sy, TILE_SIZE, TILE_SIZE)
        if (tile === 'weed') {
          ctx.drawImage(sprites.weed_basic, sx, sy, TILE_SIZE, TILE_SIZE)
        }
      } else {
        // Unowned ground is bare dirt with a faint grid line; the buyable
        // tile the player faces gets an accent outline.
        ctx.fillStyle = '#2a2118'
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE)
        ctx.strokeStyle = '#3a3020'
        ctx.lineWidth = 1
        ctx.strokeRect(sx + 0.5, sy + 0.5, TILE_SIZE - 1, TILE_SIZE - 1)
        if (target && target.x === x && target.y === y) {
          ctx.strokeStyle = '#c2410c'
          ctx.lineWidth = 3
          ctx.strokeRect(sx + 2, sy + 2, TILE_SIZE - 4, TILE_SIZE - 4)
        }
      }
    }
  }

  ctx.drawImage(
    sprites.farmer,
    state.player.x * TILE_SIZE,
    state.player.y * TILE_SIZE,
    TILE_SIZE,
    TILE_SIZE,
  )
}

function buyTarget(state: GameState): { x: number; y: number } | null {
  const [dx, dy] = DIRECTION_DELTAS[state.player.facing]
  const x = state.player.x + dx
  const y = state.player.y + dy
  return tileAt(state, x, y) === 'unowned' ? { x, y } : null
}
