import {
  hmacHex,
  isElapsedValid,
  isValidScore,
  normalizeName,
  verifyToken,
} from 'weed-whacker/leaderboard'

const TOP_N = 10
const RATE_LIMIT_WINDOW_MS = 60 * 60_000
const RATE_LIMIT_MAX_SUBMITS = 20

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const { results } = await env.DB.prepare(
      `SELECT name, score FROM scores
       ORDER BY score DESC, created_at ASC, id ASC LIMIT ?`,
    )
      .bind(TOP_N)
      .all<{ name: string; score: number }>()
    return Response.json(
      { scores: results },
      { headers: { 'Cache-Control': 'public, max-age=30' } },
    )
  } catch {
    return Response.json({ error: 'server_error' }, { status: 500 })
  }
}

// Validation runs cheapest-first so rejected requests cost at most one D1
// read: body shape, HMAC verify, elapsed window (CPU only), then the
// rate-limit COUNT, then the INSERT.
export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return Response.json({ error: 'invalid' }, { status: 400 })
    }
    if (typeof body !== 'object' || body === null) {
      return Response.json({ error: 'invalid' }, { status: 400 })
    }
    const { token, name, score } = body as Record<string, unknown>

    const parsed = await verifyToken(env.LEADERBOARD_SECRET, token)
    if (!parsed) {
      return Response.json({ error: 'invalid_token' }, { status: 401 })
    }

    const now = Date.now()
    if (!isElapsedValid(parsed.issuedAtMs, now)) {
      return Response.json({ error: 'invalid_token' }, { status: 401 })
    }

    const cleanName = normalizeName(name)
    if (cleanName === null || !isValidScore(score)) {
      return Response.json({ error: 'invalid' }, { status: 400 })
    }

    const ip = request.headers.get('CF-Connecting-IP') ?? ''
    const ipHash = await hmacHex(env.LEADERBOARD_SECRET, ip)

    const recent = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM scores WHERE ip_hash = ? AND created_at > ?',
    )
      .bind(ipHash, now - RATE_LIMIT_WINDOW_MS)
      .first<{ n: number }>()
    if ((recent?.n ?? 0) >= RATE_LIMIT_MAX_SUBMITS) {
      return Response.json({ error: 'rate_limited' }, { status: 429 })
    }

    // The INSERT is the nonce claim. Zero changed rows means the nonce was
    // already used: a replayed token.
    const insert = await env.DB.prepare(
      `INSERT INTO scores (name, score, nonce, ip_hash, created_at)
       VALUES (?, ?, ?, ?, ?) ON CONFLICT(nonce) DO NOTHING`,
    )
      .bind(cleanName, score, parsed.nonce, ipHash, now)
      .run()
    if (insert.meta.changes === 0) {
      return Response.json({ error: 'invalid_token' }, { status: 401 })
    }

    // The write is committed. A failure computing placement must not report the
    // saved score as a failure, so this query gets its own catch and a
    // placement-less success on error.
    try {
      const better = await env.DB.prepare(
        `SELECT COUNT(*) AS n FROM scores
         WHERE score > ? OR (score = ? AND created_at < ?)`,
      )
        .bind(score, score, now)
        .first<{ n: number }>()
      return Response.json({ placement: (better?.n ?? 0) + 1 })
    } catch (err) {
      console.error('scores POST placement query failed', err)
      return Response.json({ placement: null })
    }
  } catch (err) {
    console.error('scores POST failed', err)
    return Response.json({ error: 'server_error' }, { status: 500 })
  }
}
