import { hmacHex } from 'weed-whacker/leaderboard'

const WINDOW_MS = 60_000
const MAX_REQUESTS_PER_WINDOW = 20

// Sliding-window limiter shared by the Spotify proxy endpoints. Insert this
// request's row and prune anything outside the window in one batch, then
// count what's left for this route+ip. Unlike scores.ts's atomic
// INSERT-with-WHERE (a hard replay guard), a concurrent burst here can read
// a slightly stale count and let a few extra requests through before the
// next request sees the limit — acceptable for a soft abuse deterrent, not
// acceptable for the leaderboard's nonce check.
export async function isRateLimited(
  db: D1Database,
  secret: string,
  request: Request,
  route: string,
): Promise<boolean> {
  const ip = request.headers.get('CF-Connecting-IP') ?? ''
  const ipHash = await hmacHex(secret, ip)
  const now = Date.now()
  const windowStart = now - WINDOW_MS

  await db.batch([
    db
      .prepare(
        `INSERT INTO api_requests (route, ip_hash, created_at) VALUES (?, ?, ?)`,
      )
      .bind(route, ipHash, now),
    db
      .prepare(`DELETE FROM api_requests WHERE created_at <= ?`)
      .bind(windowStart),
  ])

  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM api_requests
       WHERE route = ? AND ip_hash = ? AND created_at > ?`,
    )
    .bind(route, ipHash, windowStart)
    .first<{ n: number }>()

  return (row?.n ?? 0) > MAX_REQUESTS_PER_WINDOW
}
