const MUTE_KEY = 'weed-whacker:muted'

export interface AudioEngine {
  unlock: () => void
  playBuffer: (name: string) => void
  playSynth: (render: (ctx: AudioContext, out: GainNode) => void) => void
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
// a buffer, or schedule a node degrades to silence and never reaches the
// game loop.
export function createAudioEngine(
  bufferUrls: Record<string, string>,
): AudioEngine {
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let muted = readMuted()
  const buffers = new Map<string, AudioBuffer>()

  const ensureContext = (): AudioContext | null => {
    if (ctx) return ctx
    try {
      ctx = new AudioContext()
      master = ctx.createGain()
      master.gain.value = muted ? 0 : 1
      master.connect(ctx.destination)
      for (const [name, url] of Object.entries(bufferUrls))
        void decode(name, url)
    } catch {
      ctx = null
    }
    return ctx
  }

  const decode = async (name: string, url: string): Promise<void> => {
    if (!ctx) return
    try {
      const res = await fetch(url)
      const bytes = await res.arrayBuffer()
      buffers.set(name, await ctx.decodeAudioData(bytes))
    } catch {
      // Missing or undecodable asset: that sound is simply silent.
    }
  }

  return {
    unlock() {
      const c = ensureContext()
      if (c && c.state === 'suspended') void c.resume()
    },
    playBuffer(name) {
      if (muted || !ctx || !master) return
      const buffer = buffers.get(name)
      if (!buffer) return
      try {
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.connect(master)
        source.start()
      } catch {
        // Scheduling failed; skip this sound.
      }
    },
    playSynth(render) {
      if (muted || !ctx || !master) return
      try {
        render(ctx, master)
      } catch {
        // Synth graph failed; skip this sound.
      }
    },
    isMuted() {
      return muted
    },
    setMuted(next) {
      muted = next
      writeMuted(next)
      if (master) master.gain.value = next ? 0 : 1
      if (!next) this.unlock()
    },
  }
}
