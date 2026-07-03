import { WORLD_GRID_SIZE } from '../core/config'

// Camera top-left in pixels, centering the player but clamped so the
// viewport never shows past the world edges.
export function cameraOffset(
  playerX: number,
  playerY: number,
  tileSize: number,
  viewW: number,
  viewH: number,
): { x: number; y: number } {
  const worldPx = WORLD_GRID_SIZE * tileSize
  return {
    x: clamp((playerX + 0.5) * tileSize - viewW / 2, 0, worldPx - viewW),
    y: clamp((playerY + 0.5) * tileSize - viewH / 2, 0, worldPx - viewH),
  }
}

function clamp(v: number, lo: number, hi: number): number {
  if (hi < lo) return lo
  return Math.max(lo, Math.min(hi, v))
}
