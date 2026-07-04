import type { GameEvent } from '../core/state'
import { denySfx, purchaseSfx, runEndSfx, timerWarningSfx } from './sfx'

const MUTE_KEY = 'weed-whacker:muted'

export interface GameAudio {
  unlock: () => void
  playEvent: (event: GameEvent) => void
  isMuted: () => boolean
  setMuted: (muted: boolean) => void
}

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

function writeMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {
    // Private-mode or blocked storage; mute still works for this session.
  }
}

// All audio is best-effort: any failure to construct the context, decode
// the buffer, or schedule a node degrades to silence and never reaches the
// game loop.
export function createGameAudio(assetBaseUrl: string): GameAudio {
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let chop: AudioBuffer | null = null
  let muted = readMuted()

  const ensureContext = (): AudioContext | null => {
    if (ctx) return ctx
    try {
      ctx = new AudioContext()
      master = ctx.createGain()
      master.gain.value = muted ? 0 : 1
      master.connect(ctx.destination)
      void decodeChop()
    } catch {
      ctx = null
    }
    return ctx
  }

  const decodeChop = async (): Promise<void> => {
    if (!ctx) return
    try {
      const res = await fetch(`${assetBaseUrl}hand_hoe.wav`)
      chop = await ctx.decodeAudioData(await res.arrayBuffer())
    } catch {
      // Missing or undecodable asset: the chop is simply silent.
    }
  }

  const playChop = () => {
    if (muted || !ctx || !master || !chop) return
    try {
      const source = ctx.createBufferSource()
      source.buffer = chop
      source.connect(master)
      source.start()
    } catch {
      // Scheduling failed; skip this sound.
    }
  }

  const playSynth = (render: (ctx: AudioContext, out: GainNode) => void) => {
    if (muted || !ctx || !master) return
    try {
      render(ctx, master)
    } catch {
      // Synth graph failed; skip this sound.
    }
  }

  const unlock = () => {
    const c = ensureContext()
    if (c && c.state === 'suspended') void c.resume()
  }

  return {
    unlock,
    playEvent(event) {
      switch (event.type) {
        case 'weedWhacked':
          playChop()
          break
        case 'tilePurchased':
          playSynth(purchaseSfx)
          break
        case 'buyDenied':
          playSynth(denySfx)
          break
        case 'timerWarning':
          playSynth(timerWarningSfx)
          break
        case 'runEnded':
          playSynth(runEndSfx)
          break
      }
    },
    isMuted() {
      return muted
    },
    setMuted(next) {
      muted = next
      writeMuted(next)
      if (master) master.gain.value = next ? 0 : 1
      if (!next) unlock()
    },
  }
}
