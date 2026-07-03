import { describe, expect, it } from 'vitest'
import {
  MAX_SCORE,
  RUN_DURATION_MS,
  SIM_STEP_MS,
  TIMER_WARNING_MS,
} from './config'
import { setTile, tileAt } from './grid'
import { mulberry32 } from './rng'
import { startRun, tick } from './run'
import { createState } from './state'
import type { GameEvent, GameState } from './state'

const neverSpawn = () => 0.999999

function runningState(): GameState {
  const state = createState()
  startRun(state)
  return state
}

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

describe('tick dt contract', () => {
  it.each([NaN, Infinity, -1, 0])(
    'rejects dt=%s without applying intents or advancing time',
    (dt) => {
      const state = runningState()
      setTile(state, state.player.x, state.player.y, 'weed')
      expect(tick(state, [{ type: 'chop' }], neverSpawn, dt)).toEqual([])
      expect(state.whacked).toBe(0)
      expect(state.elapsedMs).toBe(0)
      expect(state.money).toBe(0)
    },
  )

  it('advances time only in whole steps, banking the remainder', () => {
    const state = runningState()
    tick(state, [], neverSpawn, SIM_STEP_MS - 1)
    expect(state.elapsedMs).toBe(0)
    tick(state, [], neverSpawn, 1)
    expect(state.elapsedMs).toBe(SIM_STEP_MS)
    expect(state.accumulatorMs).toBe(0)
  })

  it('makes one large dt reproduce the stepped simulation exactly', () => {
    const big = runningState()
    const bigEvents = tick(big, [], mulberry32(5), RUN_DURATION_MS)

    const stepped = runningState()
    const steppedRng = mulberry32(5)
    const steppedEvents: GameEvent[] = []
    for (let i = 0; i < RUN_DURATION_MS / SIM_STEP_MS; i++) {
      steppedEvents.push(...tick(stepped, [], steppedRng))
    }

    expect(big).toEqual(stepped)
    expect(bigEvents).toEqual(steppedEvents)
  })

  it('stops dead at the run end regardless of dt overshoot', () => {
    const state = runningState()
    tick(state, [], neverSpawn, RUN_DURATION_MS * 10)
    expect(state.phase).toBe('ended')
    expect(state.elapsedMs).toBe(RUN_DURATION_MS)
  })
})

describe('tick intents', () => {
  it('does nothing while idle or ended', () => {
    const state = createState()
    expect(tick(state, [{ type: 'chop' }], neverSpawn)).toEqual([])
    expect(state.elapsedMs).toBe(0)
  })

  it('resolves move before chop so the chop lands on the destination', () => {
    const state = runningState()
    const { x, y } = state.player
    setTile(state, x + 1, y, 'weed')
    const events = tick(
      state,
      [{ type: 'move', dir: 'right' }, { type: 'chop' }],
      neverSpawn,
    )
    expect(events).toContainEqual({ type: 'weedWhacked', x: x + 1, y })
    expect(tileAt(state, x + 1, y)).toBe('grass')
  })

  it('applies at most one intent per type per call', () => {
    const state = runningState()
    state.money = 100
    state.player.x = 13
    state.player.y = 13
    state.player.facing = 'up'
    const events = tick(
      state,
      [{ type: 'buy' }, { type: 'buy' }, { type: 'buy' }],
      neverSpawn,
    )
    expect(events.filter((e) => e.type === 'tilePurchased')).toHaveLength(1)
    expect(state.tilesPurchased).toBe(1)
  })

  it('counts a chop landing on the final step', () => {
    const state = runningState()
    state.elapsedMs = RUN_DURATION_MS - SIM_STEP_MS
    setTile(state, state.player.x, state.player.y, 'weed')
    const events = tick(state, [{ type: 'chop' }], neverSpawn)
    expect(state.phase).toBe('ended')
    expect(events).toContainEqual({ type: 'runEnded', whacked: 1 })
  })

  it('ignores intents after the run ends', () => {
    const state = runningState()
    tick(state, [], neverSpawn, RUN_DURATION_MS)
    setTile(state, state.player.x, state.player.y, 'weed')
    expect(tick(state, [{ type: 'chop' }], neverSpawn)).toEqual([])
    expect(state.whacked).toBe(0)
  })
})

describe('run lifecycle', () => {
  it('fires the timer warning exactly once', () => {
    const state = runningState()
    const warned = tick(
      state,
      [],
      neverSpawn,
      RUN_DURATION_MS - TIMER_WARNING_MS,
    )
    expect(warned).toContainEqual({ type: 'timerWarning' })
    const again = tick(state, [], neverSpawn)
    expect(again).not.toContainEqual({ type: 'timerWarning' })
  })

  it('emits warning before runEnded when one call passes both', () => {
    const state = runningState()
    const events = tick(state, [], neverSpawn, RUN_DURATION_MS)
    const warningIndex = events.findIndex((e) => e.type === 'timerWarning')
    const endedIndex = events.findIndex((e) => e.type === 'runEnded')
    expect(warningIndex).toBeGreaterThanOrEqual(0)
    expect(endedIndex).toBeGreaterThan(warningIndex)
    expect(state.phase).toBe('ended')
  })
})

describe('score bound', () => {
  function chopSpamRun(dtMs: number): number {
    const state = runningState()
    while (state.phase === 'running') {
      if (tileAt(state, state.player.x, state.player.y) === 'grass') {
        setTile(state, state.player.x, state.player.y, 'weed')
      }
      tick(state, [{ type: 'chop' }], neverSpawn, dtMs)
    }
    return state.whacked
  }

  it('MAX_SCORE is exactly achievable at the step rate', () => {
    expect(chopSpamRun(SIM_STEP_MS)).toBe(MAX_SCORE)
  })

  it('MAX_SCORE cannot be exceeded under adversarial dt patterns', () => {
    expect(chopSpamRun(1000 / 7)).toBeLessThanOrEqual(MAX_SCORE)
    expect(chopSpamRun(1)).toBeLessThanOrEqual(MAX_SCORE)
    expect(chopSpamRun(RUN_DURATION_MS)).toBeLessThanOrEqual(MAX_SCORE)
  })
})

describe('full run', () => {
  it('is deterministic across identical runs', () => {
    const runOnce = () => {
      const state = runningState()
      const rng = mulberry32(123)
      const allEvents: GameEvent[] = []
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
    const state = runningState()
    const rng = mulberry32(7)
    let runEndedCount = 0
    let spawned = 0
    while (state.phase === 'running') {
      for (const event of tick(state, [{ type: 'chop' }], rng)) {
        if (event.type === 'runEnded') runEndedCount++
        if (event.type === 'weedSpawned') spawned++
      }
    }
    expect(runEndedCount).toBe(1)
    expect(spawned).toBeGreaterThan(0)
    expect(state.whacked).toBeGreaterThan(0)
    expect(state.whacked).toBeLessThanOrEqual(MAX_SCORE)
    expect(state.money).toBeGreaterThan(0)
    expect(state.elapsedMs).toBe(RUN_DURATION_MS)
  })
})
