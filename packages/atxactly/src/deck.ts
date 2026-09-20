export function mulberry(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffled<T>(pool: T[], seed: number) {
  const rnd = mulberry(seed)
  const deck = [...pool]
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    const t = deck[i]!
    deck[i] = deck[j]!
    deck[j] = t
  }
  return deck
}

// Each band is a deck dealt front to back, `count` locations a day, so a
// location cannot come back until the whole band has played through: 42
// days for easy, 59 medium, 134 hard at the current pool.
//
// The deck is reshuffled every cycle, but a location stays in the half it
// was already in and is only shuffled within that half. That is what keeps
// the cycle boundary honest: a location dealt late in one cycle stays late
// in the next, so it cannot land right after itself across the seam. A
// plain reshuffle put repeats one day apart, and reshuffling once and never
// again fixed the order forever.
export function deckFor<T>(pool: T[], cycle: number, band: number) {
  let deck = shuffled(pool, band)
  for (let c = 1; c <= cycle; c++) {
    const h = Math.ceil(deck.length / 2)
    const s = (Math.imul(c, 0x9e3779b9) + band) | 0
    deck = [
      ...shuffled(deck.slice(0, h), s),
      ...shuffled(deck.slice(h), s ^ 0x5bf03635),
    ]
  }
  return deck
}

export function drawFrom<T>(
  pool: T[],
  day: number,
  count: number,
  band: number,
) {
  if (pool.length <= count) return pool.slice(0, count)
  const days = Math.floor(pool.length / count)
  const deck = deckFor(pool, Math.floor(day / days), band)
  const slot = (day % days) * count
  const out: T[] = []
  for (let i = 0; i < count; i++) out.push(deck[(slot + i) % deck.length]!)
  return out
}

// Rounds 1-2 easy, 3-4 medium, 5 hard.
export function buildRound<T extends { difficulty: number }>(
  pool: T[],
  day: number,
): T[] {
  const band = (d: number) => pool.filter((l) => l.difficulty === d)
  return [
    ...drawFrom(band(1), day, 2, 1),
    ...drawFrom(band(2), day, 2, 2),
    ...drawFrom(band(3), day, 1, 3),
  ]
}
