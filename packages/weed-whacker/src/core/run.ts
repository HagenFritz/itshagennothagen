import { RUN_DURATION_MS, TICK_MS, TIMER_WARNING_MS } from './config'
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
  dtMs: number = TICK_MS,
): GameEvent[] {
  if (state.phase !== 'running') return []

  const events: GameEvent[] = []
  tickCooldowns(state, dtMs)

  // Intents resolve before time advances, so an action landing on the
  // final tick still counts and anything after the run ends is ignored.
  for (const intent of intents) {
    if (intent.type === 'move') applyMove(state, intent.dir)
    else if (intent.type === 'chop') events.push(...applyChop(state))
    else events.push(...applyBuy(state))
  }

  accrueIncome(state, dtMs)
  events.push(...spawnWeeds(state, rng, dtMs))

  state.elapsedMs += dtMs
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

  return events
}
