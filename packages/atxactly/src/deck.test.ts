import { describe, expect, it } from 'vitest'
import { buildRound, drawFrom } from './deck'

type Row = { id: string; difficulty: number }

const POOL: Row[] = [
  ...Array.from({ length: 6 }, (_, i) => ({ id: `e${i}`, difficulty: 1 })),
  ...Array.from({ length: 6 }, (_, i) => ({ id: `m${i}`, difficulty: 2 })),
  ...Array.from({ length: 4 }, (_, i) => ({ id: `h${i}`, difficulty: 3 })),
]

const ids = (rows: Row[]) => rows.map((r) => r.id)

describe('buildRound', () => {
  it('deals five rows in the 1-1-2-2-3 shape, the same way every call', () => {
    const round = buildRound(POOL, 0)
    expect(round.map((r) => r.difficulty)).toEqual([1, 1, 2, 2, 3])
    expect(ids(round)).toEqual(ids(buildRound(POOL, 0)))
  })

  it('matches the pinned draws for two days', () => {
    expect(ids(buildRound(POOL, 0))).toEqual(['e4', 'e1', 'm0', 'm2', 'h1'])
    expect(ids(buildRound(POOL, 20350))).toEqual(['e5', 'e3', 'm2', 'm5', 'h2'])
  })
})

describe('drawFrom', () => {
  it('deals a band through without repeating a location', () => {
    const band = POOL.filter((r) => r.difficulty === 1)
    const dealt: string[] = []
    for (let day = 0; day < band.length / 2; day++)
      dealt.push(...ids(drawFrom(band, day, 2, 1)))
    expect(dealt).toHaveLength(band.length)
    expect(new Set(dealt).size).toBe(band.length)
  })
})
