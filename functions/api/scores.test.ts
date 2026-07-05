import { describe, expect, it } from 'vitest'
import { MIN_ELAPSED_MS, mintToken } from 'weed-whacker/leaderboard'
import { onRequestGet, onRequestPost } from './scores'

const SECRET = 'test-secret'
// A token old enough to clear the elapsed floor, with a second of slack.
const backdatedIssue = (nowMs: number) => nowMs - MIN_ELAPSED_MS - 1_000

// Minimal D1 stand-in. Each prepared statement is matched by a fragment of its
// SQL and returns a scripted result; bound params are captured for assertions.
type StmtResult = {
  run?: { meta: { changes: number } }
  first?: unknown
  all?: { results: unknown[] }
}

function fakeDb(route: (sql: string, params: unknown[]) => StmtResult) {
  const calls: { sql: string; params: unknown[] }[] = []
  const db = {
    prepare(sql: string) {
      let params: unknown[] = []
      const stmt = {
        bind(...args: unknown[]) {
          params = args
          return stmt
        },
        run() {
          calls.push({ sql, params })
          return Promise.resolve(
            route(sql, params).run ?? { meta: { changes: 1 } },
          )
        },
        first() {
          calls.push({ sql, params })
          return Promise.resolve(route(sql, params).first ?? null)
        },
        all() {
          calls.push({ sql, params })
          return Promise.resolve(route(sql, params).all ?? { results: [] })
        },
      }
      return stmt
    },
  }
  return { db, calls }
}

const env = (db: unknown): Env =>
  ({ DB: db, LEADERBOARD_SECRET: SECRET }) as unknown as Env

function postRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://example.dev/api/scores', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

async function post(body: unknown, route: Parameters<typeof fakeDb>[0]) {
  const { db, calls } = fakeDb(route)
  const res = await onRequestPost({
    env: env(db),
    request: postRequest(body),
  } as never)
  return { status: res.status, body: (await res.json()) as never, calls }
}

const insertedRoute =
  (changes: number, better = 0): Parameters<typeof fakeDb>[0] =>
  (sql) => {
    if (sql.includes('INSERT')) return { run: { meta: { changes } } }
    if (sql.includes('WHERE score >')) return { first: { n: better } }
    if (sql.includes('WHERE nonce =')) return { first: null }
    return {}
  }

describe('onRequestPost', () => {
  it('rejects a non-JSON body with 400', async () => {
    const { db } = fakeDb(() => ({}))
    const res = await onRequestPost({
      env: env(db),
      request: postRequest('not json{'),
    } as never)
    expect(res.status).toBe(400)
  })

  it('rejects a non-object body with 400', async () => {
    const { status } = await post(42, () => ({}))
    expect(status).toBe(400)
  })

  it('rejects a garbage token with 401 before any DB call', async () => {
    const { status, calls } = await post(
      { token: 'garbage', name: 'Hagen', score: 10 },
      () => ({}),
    )
    expect(status).toBe(401)
    expect(calls).toHaveLength(0)
  })

  it('rejects a token that is too fresh (elapsed floor) with 401', async () => {
    const token = await mintToken(SECRET, Date.now())
    const { status, calls } = await post(
      { token, name: 'Hagen', score: 10 },
      () => ({}),
    )
    expect(status).toBe(401)
    expect(calls).toHaveLength(0)
  })

  it('rejects an out-of-range score with 400 after token checks', async () => {
    const token = await mintToken(SECRET, backdatedIssue(Date.now()))
    const { status } = await post(
      { token, name: 'Hagen', score: 999 },
      () => ({}),
    )
    expect(status).toBe(400)
  })

  it('rejects an invisible-only name with 400', async () => {
    const token = await mintToken(SECRET, backdatedIssue(Date.now()))
    const { status } = await post({ token, name: '‍', score: 10 }, () => ({}))
    expect(status).toBe(400)
  })

  it('inserts a valid submit and returns placement', async () => {
    const token = await mintToken(SECRET, backdatedIssue(Date.now()))
    const { status, body } = await post(
      { token, name: 'Hagen', score: 42 },
      insertedRoute(1, 3),
    )
    expect(status).toBe(200)
    expect(body).toEqual({ placement: 4 })
  })

  it('maps a zero-change insert with an existing nonce to 401 (replay)', async () => {
    const token = await mintToken(SECRET, backdatedIssue(Date.now()))
    const { status, body } = await post(
      { token, name: 'Hagen', score: 42 },
      (sql) => {
        if (sql.includes('INSERT')) return { run: { meta: { changes: 0 } } }
        if (sql.includes('WHERE nonce =')) return { first: { 1: 1 } }
        return {}
      },
    )
    expect(status).toBe(401)
    expect(body).toEqual({ error: 'invalid_token' })
  })

  it('maps a zero-change insert with no existing nonce to 429 (rate limited)', async () => {
    const token = await mintToken(SECRET, backdatedIssue(Date.now()))
    const { status, body } = await post(
      { token, name: 'Hagen', score: 42 },
      (sql) => {
        if (sql.includes('INSERT')) return { run: { meta: { changes: 0 } } }
        if (sql.includes('WHERE nonce =')) return { first: null }
        return {}
      },
    )
    expect(status).toBe(429)
    expect(body).toEqual({ error: 'rate_limited' })
  })

  it('returns placement null when the placement query throws', async () => {
    const token = await mintToken(SECRET, backdatedIssue(Date.now()))
    const { db } = fakeDb((sql) => {
      if (sql.includes('INSERT')) return { run: { meta: { changes: 1 } } }
      if (sql.includes('WHERE score >')) throw new Error('D1 blip')
      return {}
    })
    const res = await onRequestPost({
      env: env(db),
      request: postRequest({ token, name: 'Hagen', score: 42 }),
    } as never)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ placement: null })
  })

  it('returns a generic 500 when the insert throws', async () => {
    const token = await mintToken(SECRET, backdatedIssue(Date.now()))
    const { db } = fakeDb((sql) => {
      if (sql.includes('INSERT')) throw new Error('D1 down')
      return {}
    })
    const res = await onRequestPost({
      env: env(db),
      request: postRequest({ token, name: 'Hagen', score: 42 }),
    } as never)
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'server_error' })
  })

  it('binds the rate-limit window and nonce guard into the insert', async () => {
    const token = await mintToken(SECRET, backdatedIssue(Date.now()))
    const { calls } = await post(
      { token, name: 'Hagen', score: 42 },
      insertedRoute(1),
    )
    const insert = calls.find((c) => c.sql.includes('INSERT'))
    expect(insert).toBeDefined()
    // name, score, nonce, ipHash, now, nonce, ipHash, windowStart, maxSubmits
    expect(insert!.params).toHaveLength(9)
    expect(insert!.params[8]).toBe(20)
  })
})

describe('onRequestGet', () => {
  it('returns the top-10 rows ordered by the board query with a cache header', async () => {
    const rows = [
      { name: 'A', score: 50 },
      { name: 'B', score: 40 },
    ]
    const { db, calls } = fakeDb((sql) => {
      expect(sql).toContain('ORDER BY score DESC, created_at ASC, id ASC')
      return { all: { results: rows } }
    })
    const res = await onRequestGet({ env: env(db) } as never)
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=30')
    expect(await res.json()).toEqual({ scores: rows })
    expect(calls[0]!.params).toEqual([10])
  })

  it('returns a generic 500 when the read throws', async () => {
    const { db } = fakeDb(() => {
      throw new Error('D1 down')
    })
    const res = await onRequestGet({ env: env(db) } as never)
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'server_error' })
  })
})
