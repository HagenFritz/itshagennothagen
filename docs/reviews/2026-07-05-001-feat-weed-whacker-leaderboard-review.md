---
title: Weed Whacker leaderboard (PR 3) review
target: feat/weed-whacker-leaderboard
date: 2026-07-05
---

# Weed Whacker leaderboard (PR 3) review

Six-agent review (correctness, reliability, test-coverage, adversarial,
security-typescript, code-simplicity) plus a learnings pass. SQL injection, XSS,
token forgery/re-split, secrets hygiene, and nonce replay all traced clean. No
P1. The findings cluster on two roots: the rate limit is the only unaccepted
control on DB growth and it is defeatable, and the post-write error paths report
committed writes as failures.

## Summary

| Priority  | Count | Label                      |
| --------- | ----- | -------------------------- |
| P1        | 0     | Critical, fix before merge |
| P2        | 6     | Important, should fix      |
| P3        | 7     | Nice-to-have               |
| **Total** | 13    |                            |

### P1 Issues

_None._

### P2 Issues

- [x] **ANSI escape injection via names into moderator terminal** — names keep
      C0/C1 controls; manual `wrangler` moderation is the sink. FIXED (8638858).
- [x] **Rate-limit TOCTOU race** — non-atomic COUNT-then-INSERT lets a
      concurrent burst blow past 20/hr. FIXED: folded count into an atomic
      INSERT, verified 60-concurrent burst caps at the limit.
- [ ] **Rate-limit bypass via CF-Connecting-IP spoof** — direct `*.pages.dev`
      origin trusts a client-settable header. OPS FOLLOW-UP: pages.dev redirect
      rule, noted in CLAUDE.md.
- [x] **Committed write reported as failure** — a post-INSERT throw returns 500;
      the retry then falsely says "not saved." FIXED (8638858).
- [x] **scores.ts POST has zero automated coverage** — replay branch, status
      mapping, rate-limit math, GET ordering guarded only by a one-time manual
      matrix. FIXED: `functions/api/scores.test.ts`, 14 cases over a fake D1,
      wired into `npm test` + CI.
- [x] **Silent failure paths** — every catch discards the error; a misconfigured
      preview secret is indistinguishable from a D1 outage. FIXED: both
      scores.ts catches now `console.error` before returning.

### P3 Issues

- [ ] **400/500 message conflation** — a server outage tells the player their
      name was rejected.
- [ ] **Combining-mark name floods board rows vertically** — horizontal clip
      only.
- [ ] **HMAC key reuse without domain separation** — same secret signs tokens
      and hashes IPs; safe today, one refactor from an oracle.
- [ ] **No submit-fetch timeout** — a hung POST freezes "Submitting..." with no
      retry affordance.
- [ ] **Slow token mint can void a legitimate run** — 5 s elapsed slack is eaten
      by mint latency on cold starts.
- [ ] **Weak/tautological tests** — elapsed-window tests pin the operator not
      the window; re-split sweep tests HMAC not parse.
- [ ] **Dead code** — unreachable `NAME_MAX_BYTES` branch, dead `isSafeInteger`
      guard, barrel over-exports.

---

## Groups

### G1: Rate limit is the only unaccepted DB-growth control, and it has three holes

**Issues:** P2-2, P2-3, P3-2

**Why grouped:** The accepted design leans entirely on the 20/hr per-IP limit to
bound row growth and board volume (scores themselves are forgeable-by-design).
P2-2 (race) and P2-3 (IP spoof) each independently nullify that cap; P3-2
(combining-mark flood) is the board-defacement payload that a nullified cap
amplifies from one row to unbounded rows.

**Suggested order:** P2-2 → P2-3 → P3-2

**Cascade:** Fixing P2-2 (fold the count into the INSERT) makes the claim atomic
but does not help if P2-3 lets the attacker mint unlimited distinct IP buckets;
both must hold for the cap to mean anything. P3-2 severity drops once the cap is
real again.

### G2: Post-write error handling reports success as failure

**Issues:** P2-4, P3-1

**Why grouped:** Both live in the submit response path (scores.ts outer catch +
play.astro status branching). The handler cannot distinguish "write committed,
placement query threw" from "write never happened," and the client's `else`
branch cannot distinguish 400 from 500.

**Suggested order:** P2-4 → P3-1

**Cascade:** Fixing P2-4 (never let a post-INSERT throw become a 5xx) removes
the worst case of P3-1; P3-1's status-branch fix then only needs to cover
genuine outages before the write.

### G3: Dead/unreachable code with a misleading comment

**Issues:** P3-6 (partial), P3-7

**Why grouped:** `NAME_MAX_BYTES` (validation.ts) and the `isSafeInteger` guard
(token.ts) are both provably unreachable given upstream checks; the byte-cap
comment additionally misdescribes what the DB CHECK relies on. Same fix motion.

**Cascade:** independent fixes, no ordering dependency.

---

## Issues

### P2-1: ANSI escape injection via names into moderator terminal

**Status:** `open`

**Category:** security

**Confidence:** high

**Confidence rationale:** Traced `normalizeName`; `STRIPPED_CHARS` covers bidi
and zero-width only, and `trim()` touches edges. Moderation-via-terminal is the
documented moderation path (plan Unit 8, schema.sql comment).

**File(s):** `packages/weed-whacker/src/leaderboard/validation.ts:15-24`

**Plain English:** `normalizeName` strips direction and zero-width characters
but leaves ESC and other terminal control characters in the middle of a name.
The leaderboard is moderated by running `wrangler d1 execute ... "SELECT ..."`
in a terminal, so a name like `x]0;pwned` injects escape sequences into the
moderator's terminal, letting a submitter rewrite what the moderator sees, set
the window title, or clear the screen.

**Problem:** The browser is safe (all rendering is `textContent`), but the
SELECT output in a terminal is not. Escape sequences can hide the attacker's own
row, spoof other rows, or run OSC commands. Invisible-only names (a lone kept
ZWJ) also pass all length checks and create blank rows.

**Fix:** In `normalizeName`, strip all Unicode control characters and require at
least one visible character. Add `.replace(/[\p{Cc}-]/gu, '')` before the
existing `STRIPPED_CHARS` replace, and after trimming reject names with no
visible (non-`Cf`/`Mn`/`Zs`) code point. Add tests: interior ESC stripped,
invisible-only name rejected.

**Effort:** Small

---

### P2-2: Rate-limit TOCTOU race defeats the 20/hr cap

**Status:** `open`

**Category:** correctness

**Confidence:** high

**Confidence rationale:** Confirmed the limiter is a non-transactional
`SELECT COUNT` (scores.ts:64) then conditional `INSERT` (scores.ts:75); D1 does
not wrap sequential `.run()` calls in a transaction and concurrent Worker
invocations read independently.

**File(s):** `functions/api/scores.ts:64-83`

**Plain English:** The rate limit counts recent rows, then inserts, in two
separate database calls with nothing between them. If many submits arrive at
once, they all run their COUNT before any of them has inserted, so they all see
a count below 20 and all pass. Each has a distinct nonce, so the replay guard
does not stop them.

**Problem:** Mint 200 tokens (mint is unlimited by accepted design), wait the
175 s window once, fire all 200 concurrently from one IP. All observe `n < 20`
and all insert. The cap that exists to bound DB growth is gone in one burst.
This is distinct from the accepted "scores forgeable" risk, which assumes the
cap holds.

**Fix:** Make the claim atomic. Fold the recency count into the INSERT so the
same statement that claims the nonce enforces the limit:
`INSERT INTO scores (...) SELECT ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM scores WHERE ip_hash = ? AND created_at > ?) < 20 AND NOT EXISTS (SELECT 1 FROM scores WHERE nonce = ?)`,
then read `meta.changes === 0` as "replayed or rate-limited." Distinguishing the
two for the client message is optional. Verify against local D1 with a
concurrent `Promise.all` burst.

**Effort:** Medium

---

### P2-3: Rate-limit bypass via CF-Connecting-IP spoof on direct pages.dev origin

**Status:** `open`

**Category:** security

**Confidence:** medium

**Confidence rationale:** The header-trust flaw is definite; exploitability
depends on `*.pages.dev` being directly reachable, which is the Cloudflare
default and not addressed in the diff.

**File(s):** `functions/api/scores.ts:61`

**Plain English:** `CF-Connecting-IP` is only trustworthy when the request comes
through Cloudflare's edge, which overwrites any client-supplied copy. The
production domain is proxied, but the `itshagennothagen.pages.dev` deployment
URL and per-PR preview URLs are directly reachable, and there is no Access
policy in the diff. Hitting `/api/scores` there with a rotating
`CF-Connecting-IP` header resets the 20/hr bucket every request.

**Problem:** Each spoofed header value hashes to a distinct `ip_hash`, so the
per-IP limit never trips. No concurrency needed. Same DB-growth / board-flood
outcome as P2-2.

**Fix:** This is an edge-trust boundary, not app logic. Force the custom domain:
a Cloudflare redirect rule from `*.pages.dev` to `itshagennothagen.dev`, or a
Cloudflare Access policy on the pages.dev hostnames. Document it in the ops
runbook. As defense in depth, reject requests with no `CF-Connecting-IP` (400)
rather than bucketing them under `HMAC('')` (see P2-1's invisible-name analog
and security P3-4).

**Effort:** Small (config, not code)

---

### P2-4: Committed write reported to the user as failure

**Status:** `open`

**Category:** reliability

**Confidence:** high

**Confidence rationale:** Plain sequential awaits inside one try block; any
throw after the INSERT (scores.ts:75) but before the response takes the outer
catch.

**File(s):** `functions/api/scores.ts:85-93`, `src/pages/play.astro`
(submitScore handler)

**Plain English:** The INSERT commits the row and claims the nonce, then the
placement `SELECT COUNT` runs. If that COUNT throws (a brief D1 blip), the outer
catch returns a generic 500, and the client shows "That name did not pass. Try
another." The user resubmits; the nonce is already claimed, so `meta.changes` is
0 and the server returns 401, and the client says "the score was not saved." The
score is on the board under the original name.

**Problem:** Two consecutive false messages after a successful write. The user
believes the score was lost.

**Fix:** Wrap only the placement COUNT in its own try. On its failure, return
200 without a placement (`{ placement: null }`) since the write succeeded; the
client shows "Score saved" without a rank. Never let a post-INSERT throw become
a 5xx.

**Effort:** Small

---

### P2-5: scores.ts POST has zero automated coverage

**Status:** `open`

**Category:** testing

**Confidence:** high

**Confidence rationale:** The suite passes with `functions/` deleted entirely;
the replay check, status mapping, rate-limit window, and GET ordering live only
in the handler, verified once by a manual curl matrix.

**File(s):** `functions/api/scores.ts:13-95`

**Plain English:** The anti-replay contract (`insert.meta.changes === 0` on
`ON CONFLICT(nonce) DO NOTHING`), the five ordered rejection paths, the 429
boundary, and the `score DESC, created_at ASC, id ASC` board order are not
tested helpers, they are handler logic with no test. A refactor that checks
`insert.success` instead, drops the `ON CONFLICT`, or reorders validation would
re-enable replays and every shipped test still passes.

**Problem:** The PR's actual purpose (replay-proof, rate-limited submission) has
no regression guard. `runs.ts` is a genuine thin wrapper and is fine untested;
`scores.ts` is not.

**Fix:** Add `functions/api/scores.test.ts` under a small root Vitest config
with a ~30-line fake `env.DB` (scripted `first`/`run` results). Handlers are
plain `{ env, request }` functions; Node's `Response.json` and `crypto.subtle`
suffice. Assert: bad JSON → 400, garbage token → 401, replayed nonce
(`changes: 0`) → 401, count ≥ 20 → 429, happy path → placement. This test also
covers the P2-2 fix once atomic.

**Effort:** Medium

---

### P2-6: Silent failure paths, no logging in any catch

**Status:** `open`

**Category:** reliability

**Confidence:** high

**Confidence rationale:** All catches are bare in the diff; Pages Functions
`console.error` is captured by Workers Logs / `wrangler pages deployment tail`.

**File(s):** `functions/api/runs.ts:10`, `functions/api/scores.ts:25,38,93`

**Plain English:** Every failure path returns a generic body and logs nothing. A
missing `LEADERBOARD_SECRET` in preview (empty-key HMAC import throws), a
missing `DB` binding, and a D1 outage are all indistinguishable from each other
and invisible in logs. When the leaderboard breaks, the only signal is user
reports.

**Problem:** Undiagnosable production failures. Given the preview secret is set
by hand in the dashboard (a step already done once for this PR), a silent
misconfiguration is a realistic failure mode.

**Fix:** `console.error('scores POST failed', err)` inside each catch before
returning; keep the response body generic. Optionally an explicit
`if (!env.LEADERBOARD_SECRET)` guard so misconfiguration logs distinctly.

**Effort:** Small

---

### P3-1: Client conflates 400 (name rejected) with 500 (server down)

**Status:** `open`

**Category:** maintainability

**Confidence:** high

**Confidence rationale:** The submit handler branches ok / 429 / 401 then a
final `else` whose message asserts the 400 case; a 500 falls through to it.

**File(s):** `src/pages/play.astro` (submitScore response handler)

**Plain English:** If the server is down (rate-limit COUNT throws before the
INSERT → 500), the player sees "That name did not pass. Try another." and
uselessly cycles names during an outage.

**Problem:** Wrong guidance during outages. State is recoverable (button
re-enabled, token unclaimed), only the message misleads.

**Fix:** Branch on `res.status === 400` for the name message; map `>= 500` to
"Leaderboard is having trouble. Try again."

**Effort:** Small

---

### P3-2: Combining-mark name floods board rows vertically

**Status:** `open`

**Category:** security

**Confidence:** medium

**Confidence rationale:** The validation gap is definite (no combining-mark
cap); rendering overflow is font/browser-dependent.

**File(s):** `packages/weed-whacker/src/leaderboard/validation.ts:15-24`,
rendered at `src/pages/play.astro` (name span)

**Plain English:** `normalizeName` does not limit combining marks. One base
character plus 19 stacked combining marks is 20 code points and passes every
cap. The name span clips horizontally (`whitespace-nowrap`, `text-ellipsis`) but
not vertically, so the stack overflows into adjacent rows for every viewer of
the top 10.

**Problem:** Board defacement for all visitors until a manual DELETE. "Vandalism
moderated manually" is accepted, but that assumes deletable text, not layout
breakage of the whole list.

**Fix:** Add `overflow-hidden` to the row `<li>` (currently only on the name
span) so a tall name cannot bleed into neighbors; optionally reject names whose
grapheme count is far below their code-point count.

**Effort:** Small

---

### P3-3: HMAC key reuse without domain separation

**Status:** `open`

**Category:** security

**Confidence:** high

**Confidence rationale:** Confirmed both uses key off `LEADERBOARD_SECRET`; also
confirmed not currently exploitable (message spaces disjoint, ip_hash never
leaves the DB, IP never client-controlled in production).

**File(s):** `functions/api/scores.ts:46,62`,
`packages/weed-whacker/src/leaderboard/token.ts` (mint/verify, hmacHex)

**Plain English:** The same secret signs tokens (over `"{ts}.{nonce}"`) and
hashes IPs. Today the two message shapes cannot collide and IPs are not
attacker-controlled, so it is safe. But the safety is coincidental: if a future
change ever routes a user-influenced string through `hmacHex` (a per-name hash,
a debug route, an export), that value becomes a signing oracle for forged
tokens.

**Problem:** A latent cross-protocol class, one refactor away from live.

**Fix:** Domain-separate: sign `'token:' + payload` and hash `'ip:' + ip`
(adjust mint and verify to prefix, wire format unchanged). Closes the class
permanently for two lines.

**Effort:** Small

---

### P3-4: No submit-fetch timeout

**Status:** `open`

**Category:** reliability

**Confidence:** high

**Confidence rationale:** Mechanism confirmed; severity medium since browser
timeouts eventually fire into the existing catch.

**File(s):** `src/pages/play.astro` (submitScore)

**Plain English:** If the submit POST hangs, the button stays disabled and the
message stuck at "Submitting..." until the browser's own timeout (minutes). Not
permanent (Play again resets), but the submit path itself has no escape for the
one run the player cares about.

**Problem:** Frozen UI with no retry affordance on a stalled connection.

**Fix:** `signal: AbortSignal.timeout(10_000)` on the submit fetch; the abort
lands in the existing catch that re-enables the button. Token fetch and board
GET degrade fine without timeouts, so only submit needs it.

**Effort:** Small

---

### P3-5: Slow token mint can void a legitimate run

**Status:** `open`

**Category:** correctness

**Confidence:** medium

**Confidence rationale:** Elapsed math traced end-to-end; triggering needs mint
latency > ~5 s plus name-typing time, plausible on cold start + mobile.

**File(s):** `packages/weed-whacker/src/leaderboard/validation.ts:10`,
`src/pages/play.astro` (`begin()` fires `fetchToken()` then `handle.start()`)

**Plain English:** The run's wall clock starts at `begin()`, but the token's
`issuedAtMs` is stamped when `/api/runs` runs, one round-trip later. Server
elapsed at submit is roughly `180 s − mint latency + typing time`. The floor is
175 s, so a mint slower than ~5 s (plus typing) makes a full legitimate run fail
verification with the button left disabled.

**Problem:** Sporadic, inexplicable score loss on slow connections; no retry.

**Fix:** Widen the floor slack to ~15 s (`RUN_DURATION_MS - 15_000`). Costs
nothing against forgery (scores are client-reported by accepted design; the
elapsed check is only a speed-run heuristic). Alternatively `await fetchToken()`
before `handle.start()`.

**Effort:** Small

---

### P3-6: Weak or tautological tests

**Status:** `open`

**Category:** testing

**Confidence:** high

**Confidence rationale:** Read both test files; boundaries are expressed
relative to the exported constants, and the re-split sweep asserts
`verifyToken === null` which HMAC alone satisfies.

**File(s):** `packages/weed-whacker/src/leaderboard/validation.test.ts:70-90`,
`packages/weed-whacker/src/leaderboard/token.test.ts:85-97`

**Plain English:** The elapsed-window tests use `issued + MIN_ELAPSED_MS - 1`
etc., so if `MIN_ELAPSED_MS` regressed to 1000 (dropping the
must-play-a-full-run rule) every test still passes. The re-split sweep's comment
claims it proves strict parsing rejects re-splits before signature check, but
any re-split changes the payload bytes so HMAC verification rejects it
regardless; the parse layer is untested there.

**Problem:** The tests pin the operators, not the security-relevant values.

**Fix:** Add absolute assertions:
`expect(MIN_ELAPSED_MS).toBe(RUN_DURATION_MS - 5_000)` and
`expect(MAX_ELAPSED_MS).toBe(30 * 60_000)`; in the re-split loop also assert
`parseToken(candidate) === null`. (If P3-5 widens the floor, update the pinned
value.)

**Effort:** Small

---

### P3-7: Dead code and over-broad exports

**Status:** `open`

**Category:** maintainability

**Confidence:** high

**Confidence rationale:** Traced each: byte cap unreachable given the 20
code-point cap (max 4 bytes each = 80 = the cap); `isSafeInteger` unreachable
given `\d{1,15}` < MAX_SAFE_INTEGER; no external consumer of the barrel's extra
exports.

**File(s):** `packages/weed-whacker/src/leaderboard/validation.ts:4-6,20`,
`packages/weed-whacker/src/leaderboard/token.ts:48-49`,
`packages/weed-whacker/src/leaderboard/index.ts:1-3`

**Plain English:** `NAME_MAX_BYTES` and its check can never fire, and its
comment wrongly says the DB CHECK relies on a byte bound (SQLite `length()`
counts code points). The `Number.isSafeInteger` guard in `parseToken` can never
be true. The `index.ts` barrel `export *` publishes `parseToken`, `base64Url*`,
`MIN/MAX_ELAPSED_MS`, `NAME_MAX_CODE_POINTS`, and re-exports `MAX_SCORE`, none
of which any consumer outside the package imports.

**Problem:** Dead defense-in-depth and unused public surface, against the repo's
no-YAGNI rule.

**Fix:** Delete `NAME_MAX_BYTES` (const + check + comment) and the
`isSafeInteger` guard. Replace the barrel with explicit named exports of the six
functions `functions/api/*.ts` actually imports: `mintToken`, `verifyToken`,
`hmacHex`, `normalizeName`, `isValidScore`, `isElapsedValid`.

**Effort:** Small

---

## Accepted design, not flagged

Client-reported forgeable scores; unlimited token mint; D1-COUNT rate limiting
as the pattern; ip_hash indefinite retention; no CORS (CSRF structurally
inapplicable, no cookies); generic 500 bodies; manual moderation; MAX_SCORE
literal duplicated in the schema CHECK; multiple tabs each minting tokens; no
replay validation.

## Verified clean

SQL injection (all `.bind()`, no interpolation); XSS (all `textContent`, sole
`innerHTML` is a static literal); token forgery and re-split (strict two-layer
parse, 32-byte sig pin, `crypto.subtle.verify` constant-time, issuedAt trusted
only post-verify, negative elapsed rejected); nonce double-submit (UNIQUE +
`ON CONFLICT` is atomic, the one correct atomic guard); prototype pollution
(plain destructure, no merge); secrets hygiene (`.dev.vars`/`.wrangler`
gitignored, never committed, no `console.*` of secrets, types.d.ts leaks only
binding names); wrangler.toml database ids (addressing, not credentials,
standard practice); cache interaction (browser-only hint, no-store refresh sees
fresh score, errors uncached).
