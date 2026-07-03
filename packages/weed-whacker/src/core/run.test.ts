import { describe, expect, it } from 'vitest'
import {
  CHOP_COOLDOWN_MS,
  MAX_SCORE,
  RUN_DURATION_MS,
  TICK_MS,
  TIMER_WARNING_MS,
} from './config'
import { setTile } from './grid'
import { mulberry32 } from './rng'
import { startRun, tick } from './run'
import { createState } from './state'

const neverSpawn = () => 0.999999

describe('startRun', () => {
  it('moves idle to running and nothing else', () => {
    const state = createState()
    startRun(state)
    expect(state.phase).toBe('running')
    state.phase = 'ended'
    startRun(state)
    expect(state.phase).toBe('ended')
  })
})

describe('tick', () => {
  it('does nothing while idle or ended', () => {
    const state = createState()
    expect(tick(state, [{ type: 'chop' }], neverSpawn)).toEqual([])
    expect(state.elapsedMs).toBe(0)
  })

  it('fires the timer warning exactly once', () => {
    const state = createState()
    startRun(state)
    const warned = tick(
      state,
      [],
      neverSpawn,
      RUN_DURATION_MS - TIMER_WARNING_MS,
    )
    expect(warned).toContainEqual({ type: 'timerWarning' })
    const again = tick(state, [], neverSpawn, TICK_MS)
    expect(again).not.toContainEqual({ type: 'timerWarning' })
  })

  it('ends the run at the duration and reports the score', () => {
    const state = createState()
    startRun(state)
    const events = tick(state, [], neverSpawn, RUN_DURATION_MS)
    expect(state.phase).toBe('ended')
    expect(events).toContainEqual({ type: 'runEnded', whacked: 0 })
  })

  it('counts a chop landing on the final tick', () => {
    const state = createState()
    startRun(state)
    state.elapsedMs = RUN_DURATION_MS - TICK_MS
    setTile(state, state.player.x, state.player.y, 'weed')
    const events = tick(state, [{ type: 'chop' }], neverSpawn)
    expect(state.phase).toBe('ended')
    expect(events).toContainEqual({ type: 'runEnded', whacked: 1 })
  })

  it('ignores intents after the run ends', () => {
    const state = createState()
    startRun(state)
    tick(state, [], neverSpawn, RUN_DURATION_MS)
    setTile(state, state.player.x, state.player.y, 'weed')
    expect(tick(state, [{ type: 'chop' }], neverSpawn)).toEqual([])
    expect(state.whacked).toBe(0)
  })

  it('caps theoretical whacks at MAX_SCORE', () => {
    expect(MAX_SCORE).toBe(RUN_DURATION_MS / CHOP_COOLDOWN_MS)
  })

  it('is deterministic across identical runs', () => {
    const runOnce = () => {
      const state = createState()
      startRun(state)
      const rng = mulberry32(123)
      const allEvents = []
      for (let i = 0; i < 600; i++) {
        allEvents.push(...tick(state, [{ type: 'chop' }], rng))
      }
      return { state, allEvents }
    }
    const a = runOnce()
    const b = runOnce()
    expect(a.state).toEqual(b.state)
    expect(a.allEvents).toEqual(b.allEvents)
  })

  it('produces a sane end state over a full simulated run', () => {
    const state = createState()
    startRun(state)
    const rng = mulberry32(7)
    let runEndedCount = 0
    let spawned = 0
    const ticks = Math.ceil(RUN_DURATION_MS / TICK_MS)
    for (let i = 0; i <= ticks; i++) {
      for (const event of tick(state, [{ type: 'chop' }], rng)) {
        if (event.type === 'runEnded') runEndedCount++
        if (event.type === 'weedSpawned') spawned++
      }
    }
    expect(state.phase).toBe('ended')
    expect(runEndedCount).toBe(1)
    expect(spawned).toBeGreaterThan(0)
    expect(state.whacked).toBeGreaterThan(0)
    expect(state.whacked).toBeLessThanOrEqual(MAX_SCORE)
    expect(state.money).toBeGreaterThan(0)
    expect(state.elapsedMs).toBeGreaterThanOrEqual(RUN_DURATION_MS)
  })
})
