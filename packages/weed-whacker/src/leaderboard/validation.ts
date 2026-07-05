import { MAX_SCORE, RUN_DURATION_MS } from '../core/config'

export const NAME_MAX_CODE_POINTS = 20

// A legitimate run takes the full 3 minutes; 5 s of slack covers clock skew
// between token issue and submit. Tokens older than 30 minutes are dead.
export const MIN_ELAPSED_MS = RUN_DURATION_MS - 5_000
export const MAX_ELAPSED_MS = 30 * 60_000

// Strip all control and formatting characters (\p{Cc} C0/C1, \p{Cf} bidi and
// zero-width), except ZWJ U+200D which composed emoji need. C0/C1 matters
// because names are read back in a terminal during moderation, where a raw ESC
// injects escape sequences. Variation selectors U+FE0E/U+FE0F are outside both
// classes and stay.
const STRIPPED_CHARS = /(?!\u200D)[\p{Cc}\p{Cf}]/gu

// A name needs at least one visible glyph: not a mark, space, or ZWJ.
const VISIBLE_CHAR = /[^\p{Mn}\p{Zs}\u200D]/u

export function normalizeName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const cleaned = raw.normalize('NFC').replace(STRIPPED_CHARS, '').trim()
  if (cleaned.length === 0) return null
  if ([...cleaned].length > NAME_MAX_CODE_POINTS) return null
  if (!VISIBLE_CHAR.test(cleaned)) return null
  return cleaned
}

export function isValidScore(raw: unknown): raw is number {
  return (
    typeof raw === 'number' &&
    Number.isInteger(raw) &&
    raw >= 0 &&
    raw <= MAX_SCORE
  )
}

export function isElapsedValid(issuedAtMs: number, nowMs: number): boolean {
  const elapsed = nowMs - issuedAtMs
  return elapsed >= MIN_ELAPSED_MS && elapsed <= MAX_ELAPSED_MS
}
