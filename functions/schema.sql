-- Weed Whacker leaderboard schema. Idempotent: re-running this file against
-- any environment (local, preview, remote) is the universal repair for drift.
-- Future ALTER TABLE steps need their own runbook notes since IF NOT EXISTS
-- does not cover column adds.
--
-- The score CHECK literal duplicates MAX_SCORE (RUN_DURATION_MS /
-- CHOP_COOLDOWN_MS) from packages/weed-whacker/src/core/config.ts by design:
-- DDL is the only guard on the manual-wrangler write path. App validation
-- stays authoritative. Name CHECK counts code points (SQLite length()).

CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 20),
  score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 60),
  nonce TEXT NOT NULL UNIQUE,
  ip_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Top-10 read: ORDER BY score DESC, created_at ASC, id ASC.
CREATE INDEX IF NOT EXISTS idx_scores_top ON scores (score DESC, created_at ASC);

-- Rate-limit count: recent submits per ip_hash. Without this every submit
-- full-scans, making the limiter the cheapest thing to attack.
CREATE INDEX IF NOT EXISTS idx_scores_rate ON scores (ip_hash, created_at);
