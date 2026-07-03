import { describe, expect, it } from 'vitest'
import { WORLD_GRID_SIZE } from '../core/config'
import { cameraOffset } from './camera'

const TILE = 16
const VIEW_W = 320
const VIEW_H = 240
const WORLD_PX = WORLD_GRID_SIZE * TILE // 480

describe('cameraOffset', () => {
  it('centers on the player away from the edges', () => {
    const cam = cameraOffset(15, 15, TILE, VIEW_W, VIEW_H)
    expect(cam.x).toBe(15.5 * TILE - VIEW_W / 2)
    expect(cam.y).toBe(15.5 * TILE - VIEW_H / 2)
  })

  it('clamps to zero at the top-left corner', () => {
    const cam = cameraOffset(0, 0, TILE, VIEW_W, VIEW_H)
    expect(cam.x).toBe(0)
    expect(cam.y).toBe(0)
  })

  it('clamps to the world edge at the bottom-right corner', () => {
    const cam = cameraOffset(
      WORLD_GRID_SIZE - 1,
      WORLD_GRID_SIZE - 1,
      TILE,
      VIEW_W,
      VIEW_H,
    )
    expect(cam.x).toBe(WORLD_PX - VIEW_W)
    expect(cam.y).toBe(WORLD_PX - VIEW_H)
  })

  it('pins to zero on an axis where the world is smaller than the view', () => {
    const cam = cameraOffset(15, 15, TILE, 1000, 1000)
    expect(cam.x).toBe(0)
    expect(cam.y).toBe(0)
  })
})
