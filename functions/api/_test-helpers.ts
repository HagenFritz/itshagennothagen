import { vi } from 'vitest'

// The real Workers runtime always provides caches.default; the vitest node
// environment doesn't, so token caching in _spotify.ts needs a stand-in.
export function stubCaches() {
  const store = new Map<string, Response>()
  vi.stubGlobal('caches', {
    default: {
      match: async (key: string) => store.get(key)?.clone(),
      put: async (key: string, res: Response) => {
        store.set(key, res.clone())
      },
      delete: async (key: string) => store.delete(key),
    },
  })
}

// Minimal D1 stand-in for the rate-limit table. Tracks inserted rows in
// memory so isRateLimited's COUNT query reflects prior inserts within a
// test, without needing a real database.
export function fakeRateLimitDb() {
  const rows: { route: string; ip_hash: string; created_at: number }[] = []
  const db = {
    prepare(sql: string) {
      let params: unknown[] = []
      const stmt = {
        bind(...args: unknown[]) {
          params = args
          return stmt
        },
        run() {
          if (sql.startsWith('INSERT')) {
            const [route, ipHash, createdAt] = params as [
              string,
              string,
              number,
            ]
            rows.push({ route, ip_hash: ipHash, created_at: createdAt })
          } else if (sql.startsWith('DELETE')) {
            const [windowStart] = params as [number]
            for (let i = rows.length - 1; i >= 0; i--) {
              if (rows[i]!.created_at <= windowStart) rows.splice(i, 1)
            }
          }
          return Promise.resolve({ meta: { changes: 1 } })
        },
        first<T>() {
          const [route, ipHash, windowStart] = params as [
            string,
            string,
            number,
          ]
          const n = rows.filter(
            (r) =>
              r.route === route &&
              r.ip_hash === ipHash &&
              r.created_at > windowStart,
          ).length
          return Promise.resolve({ n } as T)
        },
      }
      return stmt
    },
    batch(statements: { run(): Promise<unknown> }[]) {
      return Promise.all(statements.map((s) => s.run()))
    },
  }
  return db
}
