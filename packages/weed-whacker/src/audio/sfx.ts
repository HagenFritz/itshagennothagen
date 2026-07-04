// Small oscillator blips for events that have no recorded sound. Each is
// a short frequency sweep with an exponential gain decay to near-silence.
function blip(
  type: OscillatorType,
  fromHz: number,
  toHz: number,
  durationS: number,
  peak: number,
) {
  return (ctx: AudioContext, out: GainNode) => {
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(fromHz, t)
    osc.frequency.exponentialRampToValueAtTime(toHz, t + durationS)
    gain.gain.setValueAtTime(peak, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + durationS)
    osc.connect(gain)
    gain.connect(out)
    osc.start(t)
    osc.stop(t + durationS)
  }
}

export const purchaseSfx = blip('triangle', 440, 880, 0.12, 0.3)
export const denySfx = blip('sawtooth', 220, 110, 0.15, 0.2)
export const timerWarningSfx = blip('square', 660, 660, 0.2, 0.25)
export const runEndSfx = blip('sine', 520, 130, 0.5, 0.3)
