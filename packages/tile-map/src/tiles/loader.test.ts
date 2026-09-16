import { describe, expect, it } from 'vitest'
import { trimCache } from './loader'

describe('trimCache', () => {
  it('leaves a cache under the limit alone', () => {
    const cache = new Map<string, number>()
    for (let i = 0; i < 600; i++) cache.set(`k${i}`, i)
    trimCache(cache)
    expect(cache.size).toBe(600)
  })

  it('drops the oldest entries once the limit is passed', () => {
    const cache = new Map<string, number>()
    for (let i = 0; i < 601; i++) cache.set(`k${i}`, i)
    trimCache(cache)
    expect(cache.size).toBe(301)
    expect(cache.has('k0')).toBe(false)
    expect(cache.has('k299')).toBe(false)
    expect(cache.has('k300')).toBe(true)
    expect(cache.has('k600')).toBe(true)
  })
})
