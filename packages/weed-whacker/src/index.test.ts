import { describe, expect, it } from 'vitest'
import { VERSION } from './index'

describe('package pipeline', () => {
  it('exports a version', () => {
    expect(VERSION).toBe('0.1.0')
  })
})
