import { describe, expect, it } from 'vitest'
import { MAX_SCORE, RUN_DURATION_MS } from '../core/config'
import {
  isElapsedValid,
  isValidScore,
  MAX_ELAPSED_MS,
  MIN_ELAPSED_MS,
  normalizeName,
} from './validation'

describe('normalizeName', () => {
  it('rejects non-strings', () => {
    expect(normalizeName(42)).toBeNull()
    expect(normalizeName(null)).toBeNull()
    expect(normalizeName(undefined)).toBeNull()
    expect(normalizeName(['a'])).toBeNull()
  })

  it('rejects empty and whitespace-only names', () => {
    expect(normalizeName('')).toBeNull()
    expect(normalizeName('   ')).toBeNull()
    expect(normalizeName('\t\n')).toBeNull()
  })

  it('trims surrounding whitespace', () => {
    expect(normalizeName('  Hagen  ')).toBe('Hagen')
  })

  it('keeps emoji including ZWJ sequences', () => {
    expect(normalizeName('🧑‍🌾 farmer')).toBe('🧑‍🌾 farmer')
    expect(normalizeName('☺️')).toBe('☺️')
  })

  it('strips zero-width and bidi control characters', () => {
    expect(normalizeName('Ha​gen')).toBe('Hagen')
    expect(normalizeName('‮groblehcs‬ ltr')).toBe('groblehcs ltr')
    expect(normalizeName('⁦abc⁩')).toBe('abc')
    expect(normalizeName('​‎﻿')).toBeNull()
  })

  it('strips terminal control characters (C0/C1)', () => {
    expect(normalizeName('x\u001B]0;pwned\u0007')).toBe('x]0;pwned')
    expect(normalizeName('a\u001Bb')).toBe('ab')
    expect(normalizeName('line\u0000null')).toBe('linenull')
  })

  it('rejects names with no visible glyph', () => {
    expect(normalizeName('\u200D')).toBeNull()
    expect(normalizeName('\u0301\u0301')).toBeNull()
    expect(normalizeName('\u001B\u001B')).toBeNull()
  })

  it('applies NFC normalization', () => {
    expect(normalizeName('é')).toBe('é')
  })

  it('accepts exactly 20 code points and rejects 21', () => {
    expect(normalizeName('a'.repeat(20))).toBe('a'.repeat(20))
    expect(normalizeName('a'.repeat(21))).toBeNull()
    expect(normalizeName('🌱'.repeat(20))).toBe('🌱'.repeat(20))
    expect(normalizeName('🌱'.repeat(21))).toBeNull()
  })
})

describe('isValidScore', () => {
  it('accepts 0 and MAX_SCORE', () => {
    expect(isValidScore(0)).toBe(true)
    expect(isValidScore(MAX_SCORE)).toBe(true)
  })

  it('rejects out-of-range, non-integer, and non-number values', () => {
    expect(isValidScore(-1)).toBe(false)
    expect(isValidScore(MAX_SCORE + 1)).toBe(false)
    expect(isValidScore(1.5)).toBe(false)
    expect(isValidScore(NaN)).toBe(false)
    expect(isValidScore(Infinity)).toBe(false)
    expect(isValidScore('10')).toBe(false)
    expect(isValidScore(null)).toBe(false)
  })
})

describe('isElapsedValid', () => {
  const issued = 1_000_000_000_000

  it('rejects submits earlier than a full run', () => {
    expect(isElapsedValid(issued, issued + MIN_ELAPSED_MS - 1)).toBe(false)
    expect(isElapsedValid(issued, issued)).toBe(false)
  })

  it('accepts the window boundaries', () => {
    expect(isElapsedValid(issued, issued + MIN_ELAPSED_MS)).toBe(true)
    expect(isElapsedValid(issued, issued + RUN_DURATION_MS)).toBe(true)
    expect(isElapsedValid(issued, issued + MAX_ELAPSED_MS)).toBe(true)
  })

  it('rejects expired tokens', () => {
    expect(isElapsedValid(issued, issued + MAX_ELAPSED_MS + 1)).toBe(false)
  })

  it('rejects tokens issued in the future', () => {
    expect(isElapsedValid(issued, issued - 1)).toBe(false)
  })
})
