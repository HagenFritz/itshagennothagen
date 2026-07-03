import { describe, expect, it } from 'vitest'
import { GAME_KEYS, heldDirection, isBuyKey, isChopKey } from './keyboard'

describe('heldDirection', () => {
  it('maps WASD and arrows to directions', () => {
    expect(heldDirection(['KeyW'])).toBe('up')
    expect(heldDirection(['ArrowDown'])).toBe('down')
    expect(heldDirection(['KeyA'])).toBe('left')
    expect(heldDirection(['ArrowRight'])).toBe('right')
  })

  it('returns the last-pressed direction when several are held', () => {
    expect(heldDirection(['KeyW', 'KeyD'])).toBe('right')
    expect(heldDirection(['KeyD', 'KeyW'])).toBe('up')
  })

  it('ignores non-movement keys in the held set', () => {
    expect(heldDirection(['Space', 'KeyA', 'KeyB'])).toBe('left')
    expect(heldDirection(['Space'])).toBeNull()
    expect(heldDirection([])).toBeNull()
  })
})

describe('key classification', () => {
  it('identifies chop and buy keys', () => {
    expect(isChopKey('Space')).toBe(true)
    expect(isChopKey('KeyB')).toBe(false)
    expect(isBuyKey('KeyB')).toBe(true)
    expect(isBuyKey('Space')).toBe(false)
  })

  it('collects every bound key into GAME_KEYS', () => {
    for (const code of ['KeyW', 'ArrowLeft', 'Space', 'KeyB']) {
      expect(GAME_KEYS.has(code)).toBe(true)
    }
    expect(GAME_KEYS.has('Tab')).toBe(false)
  })
})
