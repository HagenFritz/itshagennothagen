import { MAX_SCORE, RUN_DURATION_MS } from '../core/config'

export const NAME_MAX_CODE_POINTS = 20
// 20 code points at 4 UTF-8 bytes each; defense in depth alongside the
// code-point cap, and the bound the DB column implicitly relies on.
export const NAME_MAX_BYTES = 80

// A legitimate run takes the full 3 minutes; 5 s of slack covers clock skew
// between token issue and submit. Tokens older than 30 minutes are dead.
export const MIN_ELAPSED_MS = RUN_DURATION_MS - 5_000
export const MAX_ELAPSED_MS = 30 * 60_000

// Bidi controls and zero-width characters (except ZWJ U+200D, which composed
// emoji need). Variation selectors U+FE0E/U+FE0F are kept for the same reason.
const STRIPPED_CHARS =
  /[\u061C\u200B\u200C\u200E\u200F\u202A-\u202E\u2060\u2066-\u2069\uFEFF]/g

export function normalizeName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const cleaned = raw.normalize('NFC').replace(STRIPPED_CHARS, '').trim()
  if (cleaned.length === 0) return null
  if ([...cleaned].length > NAME_MAX_CODE_POINTS) return null
  if (new TextEncoder().encode(cleaned).length > NAME_MAX_BYTES) return null
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
