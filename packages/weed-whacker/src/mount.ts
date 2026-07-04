import { mulberry32 } from './core/rng'
import { startRun, tick } from './core/run'
import { createState } from './core/state'
import type { GameEvent, GameState } from './core/state'
import { createInputBuffer } from './input/buffer'
import { GAME_KEYS } from './input/keyboard'
import { INTERNAL_SIZE, render } from './render/renderer'
import { loadSprites } from './render/sprites'

const MAX_FRAME_MS = 250

export interface MountOptions {
  assetBaseUrl: string
  seed?: number
  onEvent: (event: GameEvent) => void
  onStateChange: (state: GameState) => void
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

  canvas.width = INTERNAL_SIZE
  canvas.height = INTERNAL_SIZE
  canvas.tabIndex = 0

  const input = createInputBuffer()
  let state = createState()
  let rng = mulberry32(1)
  let rafId = 0
  let lastMs = 0
  let running = false
  let destroyed = false

  const emit = (events: GameEvent[]) => {
    for (const event of events) options.onEvent(event)
    // Repaint every frame, not only on event-bearing ticks: the countdown
    // and money advance silently and would otherwise freeze between events.
    options.onStateChange(state)
  }

  const advance = (dtMs: number) => {
    emit(tick(state, input.collect(), rng, dtMs))
    render(ctx, state, sprites)
    if (state.phase !== 'running') running = false
  }

  const frame = (nowMs: number) => {
    advance(Math.min(nowMs - lastMs, MAX_FRAME_MS))
    lastMs = nowMs
    if (running) rafId = requestAnimationFrame(frame)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (!GAME_KEYS.has(e.code)) return
    e.preventDefault()
    input.keydown(e.code, e.repeat)
  }
  const onKeyUp = (e: KeyboardEvent) => input.keyup(e.code)

  const onVisibility = () => {
    if (!running) return
    if (document.hidden) {
      // Held keys cannot release while hidden (no keyup is delivered), so
      // drop them now to avoid ghost movement on return.
      input.clear()
      return
    }
    // The run is a wall-clock 3 minutes, so time spent hidden still counts.
    const nowMs = performance.now()
    advance(nowMs - lastMs)
    lastMs = nowMs
    if (running) rafId = requestAnimationFrame(frame)
  }

  canvas.addEventListener('keydown', onKeyDown)
  canvas.addEventListener('keyup', onKeyUp)
  canvas.addEventListener('blur', input.clear)
  window.addEventListener('blur', input.clear)
  document.addEventListener('visibilitychange', onVisibility)

  render(ctx, state, sprites)

  return {
    start() {
      if (destroyed || running) return
      cancelAnimationFrame(rafId)
      rng = mulberry32(options.seed ?? (Date.now() % 0xffffffff) + 1)
      state = createState(rng)
      startRun(state)
      input.clear()
      canvas.focus()
      running = true
      lastMs = performance.now()
      rafId = requestAnimationFrame(frame)
    },
    focus() {
      canvas.focus()
    },
    destroy() {
      destroyed = true
      running = false
      cancelAnimationFrame(rafId)
      canvas.removeEventListener('keydown', onKeyDown)
      canvas.removeEventListener('keyup', onKeyUp)
      canvas.removeEventListener('blur', input.clear)
      window.removeEventListener('blur', input.clear)
      document.removeEventListener('visibilitychange', onVisibility)
    },
  }
}
