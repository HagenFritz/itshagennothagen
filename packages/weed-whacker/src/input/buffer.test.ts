import { describe, expect, it } from 'vitest'
import { createInputBuffer } from './buffer'

describe('createInputBuffer', () => {
  it('emits a move intent for a held direction', () => {
    const b = createInputBuffer()
    b.keydown('KeyD', false)
    expect(b.collect()).toEqual([{ type: 'move', dir: 'right' }])
    // Still held on the next frame with no new event.
    expect(b.collect()).toEqual([{ type: 'move', dir: 'right' }])
  })

  it('re-establishes a held key from repeat events after a clear', () => {
    const b = createInputBuffer()
    b.keydown('KeyW', false)
    b.clear()
    expect(b.collect()).toEqual([])
    // OS auto-repeat while the key stays physically down.
    b.keydown('KeyW', true)
    expect(b.collect()).toEqual([{ type: 'move', dir: 'up' }])
  })

  it('fires chop and buy once per physical press, not per repeat', () => {
    const b = createInputBuffer()
    b.keydown('Space', false)
    b.keydown('Space', true)
    b.keydown('Space', true)
    expect(b.collect()).toEqual([{ type: 'chop' }])
    // Consumed: no repeat next frame.
    expect(b.collect()).toEqual([])
  })

  it('drops a direction on keyup', () => {
    const b = createInputBuffer()
    b.keydown('KeyA', false)
    b.keyup('KeyA')
    expect(b.collect()).toEqual([])
  })

  it('does not duplicate a held key pressed twice', () => {
    const b = createInputBuffer()
    b.keydown('KeyD', false)
    b.keydown('KeyD', false)
    b.keyup('KeyD')
    expect(b.collect()).toEqual([])
  })
})
