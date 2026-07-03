import { WORLD_GRID_SIZE } from '../core/config'
import { DIRECTION_DELTAS, tileAt } from '../core/grid'
import type { GameState } from '../core/state'
import { cameraOffset } from './camera'
import type { SpriteName, SpriteSheet } from './sprites'

export const TILE_SIZE = 16
export const INTERNAL_WIDTH = 320
export const INTERNAL_HEIGHT = 240

const GRASS_VARIANTS: SpriteName[] = ['grass_1', 'grass_2', 'grass_3']

export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  sprites: SpriteSheet,
): void {
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT)

  const cam = cameraOffset(
    state.player.x,
    state.player.y,
    TILE_SIZE,
    INTERNAL_WIDTH,
    INTERNAL_HEIGHT,
  )

  const target = buyTarget(state)

  const minX = Math.floor(cam.x / TILE_SIZE)
  const minY = Math.floor(cam.y / TILE_SIZE)
  const maxX = Math.ceil((cam.x + INTERNAL_WIDTH) / TILE_SIZE)
  const maxY = Math.ceil((cam.y + INTERNAL_HEIGHT) / TILE_SIZE)

  for (let y = minY; y < maxY; y++) {
    for (let x = minX; x < maxX; x++) {
      if (x < 0 || x >= WORLD_GRID_SIZE || y < 0 || y >= WORLD_GRID_SIZE) {
        continue
      }
      const sx = Math.round(x * TILE_SIZE - cam.x)
      const sy = Math.round(y * TILE_SIZE - cam.y)
      const tile = state.tiles[y]![x]

      if (tile === 'grass' || tile === 'weed') {
        const variant = GRASS_VARIANTS[(x + y) % 3]!
        ctx.drawImage(sprites[variant], sx, sy, TILE_SIZE, TILE_SIZE)
        if (tile === 'weed') {
          ctx.drawImage(sprites.weed_basic, sx, sy, TILE_SIZE, TILE_SIZE)
        }
      } else {
        ctx.drawImage(sprites.tile, sx, sy, TILE_SIZE, TILE_SIZE)
        if (target && target.x === x && target.y === y) {
          ctx.strokeStyle = '#c2410c'
          ctx.lineWidth = 1
          ctx.strokeRect(sx + 0.5, sy + 0.5, TILE_SIZE - 1, TILE_SIZE - 1)
        }
      }
    }
  }

  const px = Math.round(state.player.x * TILE_SIZE - cam.x)
  const py = Math.round(state.player.y * TILE_SIZE - cam.y)
  ctx.drawImage(sprites.farmer, px, py, TILE_SIZE, TILE_SIZE)
}

function buyTarget(state: GameState): { x: number; y: number } | null {
  const [dx, dy] = DIRECTION_DELTAS[state.player.facing]
  const x = state.player.x + dx
  const y = state.player.y + dy
  return tileAt(state, x, y) === 'unowned' ? { x, y } : null
}
