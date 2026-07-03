import type { GameEvent } from '../core/state'
import { createAudioEngine, type AudioEngine } from './audio'
import { denySfx, purchaseSfx, runEndSfx, timerWarningSfx } from './sfx'

export type { AudioEngine } from './audio'

export function createGameAudio(assetBaseUrl: string): AudioEngine {
  const base = assetBaseUrl.endsWith('/') ? assetBaseUrl : assetBaseUrl + '/'
  return createAudioEngine({ chop: `${base}hand_hoe.wav` })
}

export function playEventSound(engine: AudioEngine, event: GameEvent): void {
  switch (event.type) {
    case 'weedWhacked':
      engine.playBuffer('chop')
      break
    case 'tilePurchased':
      engine.playSynth(purchaseSfx)
      break
    case 'buyDenied':
      engine.playSynth(denySfx)
      break
    case 'timerWarning':
      engine.playSynth(timerWarningSfx)
      break
    case 'runEnded':
      engine.playSynth(runEndSfx)
      break
  }
}
