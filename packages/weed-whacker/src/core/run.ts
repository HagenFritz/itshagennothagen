import { RUN_DURATION_MS, SIM_STEP_MS, TIMER_WARNING_MS } from './config'
import { accrueIncome, applyBuy } from './economy'
import { applyChop, applyMove, tickCooldowns } from './player'
import type { Rng } from './rng'
import type { GameEvent, GameState, Intent } from './state'
import { spawnWeeds } from './weeds'

export function startRun(state: GameState): void {
  if (state.phase !== 'idle') return
  state.phase = 'running'
}

export function tick(
  state: GameState,
  intents: Intent[],
  rng: Rng,
  dtMs: number = SIM_STEP_MS,
): GameEvent[] {
  if (state.phase !== 'running') return []
  if (!Number.isFinite(dtMs) || dtMs <= 0) return []

  const events: GameEvent[] = []

  // Intents resolve once per call, before time advances, so an action
  // landing while the run is live always counts and anything after the
  // run ends is ignored. One intent per type per call: a keyboard cannot
  // express more, and unbounded arrays otherwise allocate unbounded
  // denial events.
  const applied = new Set<Intent['type']>()
  for (const intent of intents) {
    if (applied.has(intent.type)) continue
    applied.add(intent.type)
    if (intent.type === 'move') applyMove(state, intent.dir)
    else if (intent.type === 'chop') events.push(...applyChop(state))
    else events.push(...applyBuy(state))
  }

  // Time advances only in exact SIM_STEP_MS steps; the remainder waits in
  // the accumulator. One large dt (tab-hide catch-up) reproduces the
  // stepped simulation exactly and stops dead at the run's end.
  state.accumulatorMs += dtMs
  while (state.accumulatorMs >= SIM_STEP_MS && state.phase === 'running') {
    state.accumulatorMs -= SIM_STEP_MS
    step(state, rng, events)
  }

  return events
}

function step(state: GameState, rng: Rng, events: GameEvent[]): void {
  tickCooldowns(state, SIM_STEP_MS)
  accrueIncome(state, SIM_STEP_MS)
  events.push(...spawnWeeds(state, rng, SIM_STEP_MS))

  state.elapsedMs += SIM_STEP_MS
  if (
    !state.timerWarningFired &&
    RUN_DURATION_MS - state.elapsedMs <= TIMER_WARNING_MS
  ) {
    state.timerWarningFired = true
    events.push({ type: 'timerWarning' })
  }
  if (state.elapsedMs >= RUN_DURATION_MS) {
    state.phase = 'ended'
    events.push({ type: 'runEnded', whacked: state.whacked })
  }
}
