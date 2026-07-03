import { RUN_DURATION_MS, SIM_STEP_MS } from './core/config'
import { mulberry32 } from './core/rng'
import { startRun, tick } from './core/run'
import { createState } from './core/state'
import type { GameEvent, GameState, Intent } from './core/state'
import { GAME_KEYS, heldDirection, isBuyKey, isChopKey } from './input/keyboard'
import { INTERNAL_HEIGHT, INTERNAL_WIDTH, render } from './render/renderer'
import { loadSprites } from './render/sprites'

const MAX_FRAME_MS = 250

export interface MountOptions {
  assetBaseUrl: string
  onEvent?: (event: GameEvent) => void
  onStateChange?: (state: GameState) => void
}

export interface GameHandle {
  start: () => void
  destroy: () => void
  focus: () => void
}

export async function mount(
  canvas: HTMLCanvasElement,
  options: MountOptions,
): Promise<GameHandle> {
  const sprites = await loadSprites(options.assetBaseUrl)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d canvas context unavailable')

  canvas.width = INTERNAL_WIDTH
  canvas.height = INTERNAL_HEIGHT
  canvas.tabIndex = 0

  let state = createState()
  let rng = mulberry32(1)
  const held: string[] = []
  const pressed = new Set<string>()
  let rafId = 0
  let lastMs = 0
  let running = false

  const emit = (events: GameEvent[]) => {
    for (const event of events) options.onEvent?.(event)
    if (events.length) options.onStateChange?.(state)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (!GAME_KEYS.has(e.code)) return
    e.preventDefault()
    if (!e.repeat) {
      if (!held.includes(e.code)) held.push(e.code)
      pressed.add(e.code)
    }
  }

  const onKeyUp = (e: KeyboardEvent) => {
    const i = held.indexOf(e.code)
    if (i !== -1) held.splice(i, 1)
  }

  const clearHeld = () => {
    held.length = 0
    pressed.clear()
  }

  const collectIntents = (): Intent[] => {
    const intents: Intent[] = []
    const dir = heldDirection(held)
    if (dir) intents.push({ type: 'move', dir })
    for (const code of pressed) {
      if (isChopKey(code)) intents.push({ type: 'chop' })
      else if (isBuyKey(code)) intents.push({ type: 'buy' })
    }
    pressed.clear()
    return intents
  }

  const frame = (nowMs: number) => {
    const dt = Math.min(nowMs - lastMs, MAX_FRAME_MS)
    lastMs = nowMs
    emit(tick(state, collectIntents(), rng, dt))
    render(ctx, state, sprites)
    if (state.phase === 'running') rafId = requestAnimationFrame(frame)
    else running = false
  }

  const onVisibility = () => {
    if (!running || document.hidden) return
    // The run is a wall-clock 3 minutes, so time spent hidden still
    // counts. rAF was throttled while away; advance the sim by the real
    // elapsed time (tick sub-steps and clamps at the run's end).
    const nowMs = performance.now()
    emit(tick(state, [], rng, nowMs - lastMs))
    render(ctx, state, sprites)
    lastMs = nowMs
    if (state.phase !== 'running') running = false
  }

  canvas.addEventListener('keydown', onKeyDown)
  canvas.addEventListener('keyup', onKeyUp)
  canvas.addEventListener('blur', clearHeld)
  document.addEventListener('visibilitychange', onVisibility)

  render(ctx, state, sprites)

  return {
    start() {
      if (running) return
      state = createState()
      rng = mulberry32(1)
      startRun(state)
      clearHeld()
      canvas.focus()
      running = true
      lastMs = performance.now()
      rafId = requestAnimationFrame(frame)
    },
    focus() {
      canvas.focus()
    },
    destroy() {
      cancelAnimationFrame(rafId)
      canvas.removeEventListener('keydown', onKeyDown)
      canvas.removeEventListener('keyup', onKeyUp)
      canvas.removeEventListener('blur', clearHeld)
      document.removeEventListener('visibilitychange', onVisibility)
    },
  }
}

export { RUN_DURATION_MS, SIM_STEP_MS }
