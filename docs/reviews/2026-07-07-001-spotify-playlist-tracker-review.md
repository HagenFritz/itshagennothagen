---
title: Spotify Playlist Tracker — deep review
target: uncommitted working-tree diff (not a PR)
date: 2026-07-07
---

# Spotify Playlist Tracker — deep review

## Summary

| Priority  | Count | Label                       |
| --------- | ----- | --------------------------- |
| P1        | 3     | Critical — fix before merge |
| P2        | 5     | Important — should fix      |
| P3        | 4     | Nice-to-have                |
| **Total** | 12    |                             |

### P1 Issues

- [ ] **No rate limiting on either Spotify endpoint** — anyone can hammer
      `/api/spotify-playlists` or `/api/spotify-playlist-tracks` and exhaust the
      site's Spotify quota for everyone.
- [ ] **Unbounded fan-out via `?ids=` on `spotify-playlists.ts`** — one request
      can trigger thousands of parallel outbound Spotify calls.
- [ ] **401/429 from Spotify collapse into misleading client-facing errors** — a
      stale token or rate limit reports as "not found" or silently vanishes,
      with no distinguishing signal.

### P2 Issues

- [ ] **No cap on pagination depth in `spotify-playlist-tracks.ts`** — a large
      playlist or a malformed `next` cursor can loop indefinitely with no
      timeout.
- [ ] **No timeout on any `fetch` call, client or server** — a hung upstream
      connection leaves the dialog stuck on "Loading…" forever with no recovery
      but a page reload.
- [ ] **Unvalidated id fallback in `spotify-playlist-tracks.ts`** — non-matching
      input is spliced raw into the Spotify API path instead of being rejected.
- [ ] **Token-cache hit path has zero test coverage** — the entire point of the
      cache (avoiding refetch) could silently regress with no test failing.
- [ ] **Malformed Spotify response shapes throw uncaught, killing the whole
      batch** — one playlist missing an expected field returns 500 for
      everything instead of a graceful per-item skip.

### P3 Issues

- [ ] **Token cache key isn't environment-scoped** — production and preview
      deployments could share a cached token at the same edge PoP.
- [ ] **`extractPlaylistId` duplicated a third time with no shared source** —
      client script, `_spotify.ts`, and (historically) `spotify-playlists.ts`
      all carry independent copies.
- [ ] **Error-path test assertions check status code only, not body shape** —
      deviates from this repo's own `scores.test.ts` convention.
- [ ] **Playlists that fail to load get stuck on "Loading…" forever** — no
      distinguishing error state, and failed/unloaded cards sort to the front
      alphabetically.

---

## Groups

### G1: Spotify error-response handling is inconsistent and misleading end-to-end

**Issues:** P1-3, P2-5, P3-4

**Why grouped:** All three trace the same root cause — none of the fetch call
sites in `_spotify.ts`, `spotify-playlists.ts`, or `spotify-playlist-tracks.ts`
inspect `res.status` beyond a boolean `!res.ok` check, so a 429, 401,
malformed-200, and genuine 404 are all indistinguishable by the time they reach
the client. Fixing the status-handling in one endpoint (P1-3) directly informs
the fix for malformed-body handling (P2-5) and the client's stuck-"Loading…"
state (P3-4), since all three need the same underlying signal: a real
distinction between "transient/auth failure, worth retrying" and "genuinely
missing."

**Suggested order:** P1-3 → P2-5 → P3-4

**Cascade:** Fixing P1-3 (status-code branching) makes P2-5's fix (catching
malformed bodies without killing the batch) straightforward to slot into the
same per-item error path. P3-4's client-side fix (showing a real error state
instead of permanent "Loading…") depends on the server actually emitting a
distinguishable error signal from P1-3/P2-5 — fixing the client first would have
nothing better to render.

### G2: No abuse protection on either public endpoint

**Issues:** P1-1, P1-2, P2-1

**Why grouped:** P1-1 (no rate limiting) and P1-2 (unbounded `ids=` fan-out) are
two angles on the same missing control — this site has an existing D1-backed
rate-limit pattern in `functions/api/scores.ts` that was not applied here. P2-1
(unbounded pagination depth) is a second amplification vector reachable even
with a single valid id, and stacks with P1-1/P1-2 under concurrent abuse.

**Suggested order:** P1-1 → P1-2 → P2-1

**Cascade:** A rate limiter (P1-1) bounds _how often_ an attacker can trigger
either amplification path but does not bound the cost of one request; the `ids=`
cap (P1-2) and the pagination cap (P2-1) bound the cost of one request. All
three are independent fixes that compose — none blocks the others, but shipping
only one leaves a real gap.

### G3: No fetch anywhere in this feature has a timeout

**Issues:** P2-2

**Why grouped:** Single issue, but flagged here since it's the mechanism that
turns transient upstream hangs into a permanently stuck UI (feeding P3-4's
symptom) and into a Worker CPU/wall-time risk (feeding P2-1's blast radius).
Kept as its own P2 rather than folded into G1/G2 since the fix (an
`AbortController` wrapper) is orthogonal to both status-code handling and rate
limiting.

**Cascade:** independent fix — no ordering dependency, but fixing it before
G1/G2 removes one class of "stuck forever" symptom those groups' client-side
fixes would otherwise still need to handle separately.

---

## Issues

### P1-1: No rate limiting on either Spotify endpoint

**Status:** `open`

**Category:** security

**Confidence:** high

**Confidence rationale:** Verified directly — neither `onRequestGet` in
`spotify-playlists.ts` nor `spotify-playlist-tracks.ts` reads any header,
counter, or D1/KV state before doing work, unlike the existing
`functions/api/scores.ts:32-94` D1-backed per-IP limiter on the leaderboard's
POST path.

**File(s):** `functions/api/spotify-playlists.ts:12` (onRequestGet entry),
`functions/api/spotify-playlist-tracks.ts:18` (onRequestGet entry)

**Plain English:** Anyone on the internet can call these two endpoints as many
times as they want — there's no cap per visitor, unlike the leaderboard's submit
endpoint at `functions/api/scores.ts:32-94`, which does check a per-IP counter
before writing.

**Problem:** Both endpoints proxy Spotify using this site's own
client-credentials app (shared across every visitor). Sustained hammering from
one attacker exhausts the site's Spotify API quota or gets the app temporarily
rate-limited/banned by Spotify, taking the feature down for legitimate visitors.
`CF-Connecting-IP`-based limiting is already known to be spoofable on
`*.pages.dev`/preview hosts per this repo's own CLAUDE.md note, and that gap
applies identically here since neither endpoint even attempts to read that
header.

**Fix:** Add the same D1-backed per-IP-hash counter pattern already used in
`functions/api/scores.ts:61-72`, or use Cloudflare's native zone-level Rate
Limiting Rules on these two routes (sidesteps the spoofable-header problem
entirely since it's evaluated at the edge before the Worker runs). Given
CLAUDE.md's existing ops follow-up (redirect `*.pages.dev` to the apex domain),
landing that redirect would also close this gap — but until it ships, both
routes are open on every preview URL and production alike.

**Effort:** Medium

---

### P1-2: Unbounded fan-out via `?ids=` on `spotify-playlists.ts`

**Status:** `open`

**Category:** security

**Confidence:** high

**Confidence rationale:** Verified directly — `idsParam.split(',')` has no
length cap before feeding into `Promise.all` over one fetch per id.

**File(s):** `functions/api/spotify-playlists.ts:15-17` (split/map with no
length check), `functions/api/spotify-playlists.ts:25-41` (`Promise.all` over
unbounded `ids`)

**Plain English:** A single request to `spotify-playlists.ts:15` with thousands
of comma-separated fake playlist ids fans out into thousands of concurrent
outbound calls to Spotify from one Worker invocation — there's no limit on how
many ids one request can pack in.

**Problem:** URLs can carry ~8KB of query string on most edges, fitting roughly
350+ minimal fake ids (each just needs to match the `playlist/<id>` regex shape)
into one request. That single request then fires that many parallel `fetch`
calls, hitting Cloudflare Pages Functions' per-request subrequest limit and
burning Spotify quota/Worker CPU per request — a stronger amplification vector
than the sequential pagination issue (P2-1) since it's parallel and trivial to
construct.

**Fix:** Cap `ids.length` to a small number (e.g. 20-50, comfortably above the
13 playlists this site actually tracks) before fetching; return 400 if the count
or raw param byte length exceeds a threshold.

**Effort:** Small

---

### P1-3: 401/429 from Spotify collapse into misleading client-facing errors

**Status:** `open`

**Category:** correctness

**Confidence:** high

**Confidence rationale:** Traced all three call sites directly — none inspects
`res.status` beyond `!res.ok`.

**File(s):** `functions/api/_spotify.ts:22` (token fetch throws generically on
any non-ok status), `functions/api/spotify-playlists.ts:31` (per-playlist fetch
returns `null` on any non-ok status, silently filtered out),
`functions/api/spotify-playlist-tracks.ts:36-38` (pagination fetch returns
`{error: 'not_found'}` / 404 on _any_ non-ok status, including 429)

**Plain English:** If Spotify rate-limits this app (429) or the cached token has
gone stale (401), `spotify-playlist-tracks.ts:37` reports it to the client as
"not found" — the same response a genuinely deleted playlist would get — and
`spotify-playlists.ts:31` just drops that playlist from the list with no error
signal at all, leaving its card stuck on "Loading…" (see P3-4).

**Problem:** There's no way for an operator or the UI to distinguish "this
playlist doesn't exist," "we got rate-limited," and "our token expired" — they
all look identical. Combined with the 55-minute token cache TTL
(`functions/api/_spotify.ts:20`), a single stale-token window means every
playlist and every track fetch fails with a misleading error code for up to 55
minutes, with no retry.

**Fix:** Check `res.status === 429` and `res.status === 401` explicitly at each
of the three call sites. On a 401 from the playlist/tracks fetch, invalidate the
cached token (so the next call fetches fresh) and retry once before giving up.
On 429, return a distinct `rate_limited` error (429) instead of fabricating 404,
and avoid caching a failed token fetch. On `spotify-playlists.ts:31`, log the
actual status per-id instead of collapsing to `null` so a stale token doesn't
look identical to a deleted playlist in logs.

**Effort:** Medium

---

### P2-1: No cap on pagination depth in `spotify-playlist-tracks.ts`

**Status:** `open`

**Category:** reliability

**Confidence:** high

**Confidence rationale:** Verified directly — the `while (nextUrl !== null)`
loop has no iteration cap, no visited-URL dedup, and no wall-clock timeout.

**File(s):** `functions/api/spotify-playlist-tracks.ts:32-48`

**Plain English:** The loop that fetches all of a playlist's tracks trusts
Spotify's `next` cursor unconditionally — a very large playlist (Spotify allows
10,000+ tracks) turns into 200+ sequential round-trips in one request, and a
malformed or cyclic `next` value would loop forever with nothing to stop it.

**Problem:** Each page is awaited serially, not pipelined, so one request
against a large playlist holds the Pages Function invocation open for the full
duration of 200+ round-trips — risking a platform CPU/wall-clock kill mid-loop
with no partial response ever sent. This also compounds with P1-1/P1-2: an
attacker repeating this request concurrently multiplies Worker CPU billing and
concurrent-invocation pressure.

**Fix:** Cap total iterations (e.g. `MAX_PAGES = 100`) and/or total accumulated
tracks, breaking out and returning what's been accumulated so far (with a
truncation flag) rather than looping unboundedly.

**Effort:** Small

---

### P2-2: No timeout on any `fetch` call, client or server

**Status:** `open`

**Category:** reliability

**Confidence:** high

**Confidence rationale:** Verified — every fetch call site in `_spotify.ts`,
both API functions, and the client script in `playlists.astro` was checked
directly; none wraps its `fetch` in an `AbortController` or any timeout
mechanism.

**File(s):** `src/pages/labs/playlists.astro:170` (client track fetch),
`functions/api/_spotify.ts:18` (token fetch),
`functions/api/spotify-playlists.ts:27-30` (per-playlist fetch),
`functions/api/spotify-playlist-tracks.ts:33-35` (pagination fetch)

**Plain English:** If Spotify (or the network) hangs instead of erroring, there
is nothing anywhere in this feature that gives up after a few seconds — the
request just sits open indefinitely.

**Problem:** On the client, `playlists.astro:167-180`'s `trackCache` only evicts
an entry on rejection; a fetch that never settles (hangs, doesn't reject) leaves
that cache entry permanently pending, so reopening the same playlist's dialog
just re-awaits the same stuck promise forever, with no recovery short of a full
page reload. On the server, a hung upstream connection holds the Pages Function
open with no bound, compounding P2-1's CPU/timeout risk.

**Fix:** Wrap every `fetch` call (all four sites listed above) in an
`AbortController` with an 8-10s timeout, treating a timeout the same as any
other rejection so the existing cache-eviction-on-error logic (already correct
for real rejections) actually gets triggered.

**Effort:** Medium

---

### P2-3: Unvalidated id fallback in `spotify-playlist-tracks.ts`

**Status:** `open`

**Category:** security

**Confidence:** medium

**Confidence rationale:** The path-injection into Spotify's own URL space is
verified directly; whether `..`-style traversal actually resolves to a different
Spotify endpoint via `fetch()`'s URL normalization was not confirmed against
live Spotify, so the practical exploit depth is unconfirmed even though the
missing validation is real.

**File(s):** `functions/api/spotify-playlist-tracks.ts:20-21` (fallback to raw
`idParam`), `functions/api/spotify-playlist-tracks.ts:30` (unvalidated `id`
spliced into the fetch URL)

**Plain English:** If the `id` query param doesn't match the expected
`playlist/<id>` shape, the code falls back to using the raw, unvalidated string
as-is — `spotify-playlists.ts:17-18` rejects anything that doesn't match the
same regex, but `spotify-playlist-tracks.ts` doesn't, so the two endpoints
handle identical input inconsistently.

**Problem:** `API_BASE` is a hardcoded `https://api.spotify.com/v1` constant, so
this can't redirect the request to a non-Spotify host (no cross-origin SSRF) —
but an attacker-controlled string still reaches Spotify's own API path
unchecked, e.g. `id=nonexistent/../../me` could plausibly resolve differently
than intended depending on how `fetch()`'s URL parser collapses `..` segments
before the request leaves.

**Fix:** After the `extractPlaylistId(idParam) ?? idParam` fallback, validate
the result against Spotify's base62 id charset (`/^[a-zA-Z0-9]+$/`) and reject
with 400 if it doesn't match, mirroring the stricter behavior already in
`spotify-playlists.ts`.

**Effort:** Small

---

### P2-4: Token-cache hit path has zero test coverage

**Status:** `open`

**Category:** testing

**Confidence:** high

**Confidence rationale:** Verified directly — `_test-helpers.ts:5-15`'s
`stubCaches()` creates a fresh empty Map every test via `beforeEach`, so
`cache.match` always misses in every existing test; the read-back branch at
`_spotify.ts:11-15` is never exercised.

**File(s):** `functions/api/_spotify.ts:11-15` (cache-hit branch, never executed
by any test), `functions/api/_test-helpers.ts:5-15` (stub reset every test)

**Plain English:** The whole point of caching the Spotify token is to avoid
refetching it on every request — but no test ever calls the token-getter twice
against a populated cache, so a bug that silently defeats the caching (wrong
key, broken read, always-refetch) would pass every test in `npm test`.

**Problem:** This is the single most important behavior of `_spotify.ts`, and a
regression here would only surface in production as unexpected Spotify
rate-limiting (feeding directly into P1-3's failure mode), not as a CI failure.

**Fix:** Add a test that drives `getAccessToken` (or `onRequestGet`) twice
against the same `stubCaches()` store instance (not recreated between the two
calls) and asserts the token-endpoint fetch fires only once — e.g.
`expect(fetchMock.mock.calls.filter(([u]) => u.includes('accounts.spotify.com'))).toHaveLength(1)`
— while both calls still return a valid token.

**Effort:** Small

---

### P2-5: Malformed Spotify response shapes throw uncaught, killing the whole batch

**Status:** `open`

**Category:** correctness

**Confidence:** high

**Confidence rationale:** Verified directly — none of the flagged property
accesses are guarded, and the outer `try/catch` in each function turns any
thrown error into a blanket 500 for the entire request.

**File(s):** `functions/api/spotify-playlists.ts:36-38`
(`p.external_urls.spotify`, `p.images[0]?.url`, `p.tracks.total`),
`functions/api/spotify-playlist-tracks.ts:44` (`item.track.artists.map(...)`),
`functions/api/_spotify.ts:27` (`data.access_token` with no shape check)

**Plain English:** If Spotify ever returns a playlist object missing an expected
field (e.g. no `external_urls`), the code throws a `TypeError` that's caught by
the outer `try/catch` and turned into a 500 for the _entire batch_ of playlists
— not just the one malformed item, unlike the graceful per-item `!res.ok`
handling that already exists for network-level failures at
`spotify-playlists.ts:31`.

**Problem:** This is an asymmetry worth fixing deliberately: a transient network
failure on one playlist is tolerated and filtered out, but a malformed-but-200
response on one playlist takes down every other playlist in the same request.
Separately, `_spotify.ts:27` never checks that `data.access_token` actually
exists — a 200 response body without that field would silently produce the
literal string `"undefined"` as a bearer token sent to Spotify, rather than
failing loudly.

**Fix:** Wrap the per-item field access in `spotify-playlists.ts` and
`spotify-playlist-tracks.ts` in a check (or a nested try/catch) that treats a
malformed item the same as a fetch failure — skip it, don't fail the batch. Add
an explicit check in `_spotify.ts:27` that `access_token` is a non-empty string,
throwing a clear error if not, instead of letting `undefined` propagate silently
into an `Authorization` header.

**Effort:** Medium

---

### P3-1: Token cache key isn't environment-scoped

**Status:** `open`

**Category:** architecture

**Confidence:** medium

**Confidence rationale:** The mechanism is verified (a fixed, non-parameterized
cache key), but whether production and preview deployments actually share the
same edge PoP/cache namespace in practice wasn't independently confirmed —
flagged as a plausible risk based on how Cloudflare's Cache API is generally
scoped, not a proven collision.

**File(s):** `functions/api/_spotify.ts:8`
(`TOKEN_CACHE_KEY = 'https://cache.internal/spotify-token'`, no environment
discriminator)

**Plain English:** Unlike D1 bindings, which this repo already splits into
separate production and preview databases (`wrangler.toml`, per CLAUDE.md), the
Spotify token cache uses one fixed key with no per-environment scoping — a
preview deployment and production could plausibly read/write the same cached
token if they share an edge location's cache namespace.

**Problem:** In practice this is low-severity, since both environments would be
caching the _same_ valid credential (there's only one Spotify app), so a
collision wouldn't cause incorrect behavior — just a cross-environment cache
dependency that has no precedent elsewhere in this codebase and isn't documented
anywhere.

**Fix:** Include an environment discriminator in the cache key (e.g. append
`env.CF_PAGES_BRANCH` or similar) if strict environment isolation matters here;
otherwise, leave as-is and note the decision inline as a one-line comment, since
it's intentional-if-unstated behavior.

**Effort:** Small

---

### P3-2: `extractPlaylistId` duplicated a third time with no shared source

**Status:** `open`

**Category:** duplication

**Confidence:** high

**Confidence rationale:** Verified directly — `functions/api/_spotify.ts:39-42`
and `src/pages/labs/playlists.astro:106-109` are byte-identical copies with
nothing enforcing they stay in sync.

**File(s):** `functions/api/_spotify.ts:39-42`,
`src/pages/labs/playlists.astro:106-109`

**Plain English:** The server-side helper module and the client-side `<script>`
block each maintain their own independent copy of the same id-extraction regex —
a future edit to one that isn't mirrored in the other causes silent id
mismatches between client and server with no compiler or test signal.

**Problem:** Concretely, if the regex diverges, a card's `data-url` could fail
to extract an id client-side while the server-side list endpoint still returns
data keyed by an id the client never computes — the card stays on "Loading…"
forever (ties into P3-4), sorts first alphabetically (empty-string fallback),
and clicking it silently does nothing since `openDialog` bails when extraction
returns `null`.

**Fix:** This specific duplication is inherent to the client/server boundary (a
Cloudflare Pages Function and a browser `<script>` block can't literally share a
module without a build step), so full elimination may not be worth the
complexity for a 4-line regex. At minimum, add a one-line comment at both copies
cross-referencing the other location, so an editor is nudged to update both.

**Effort:** Small

---

### P3-3: Error-path test assertions check status code only, not body shape

**Status:** `open`

**Category:** testing

**Confidence:** high

**Confidence rationale:** Direct comparison against this repo's own established
convention in `scores.test.ts`.

**File(s):** `functions/api/spotify-playlists.test.ts:81-91`,
`functions/api/spotify-playlist-tracks.test.ts:88-105,107-117`

**Plain English:** These tests confirm a 404 or 500 status code fires, but never
check _what_ the error body actually says —
`scores.test.ts:146-148,161-162,189-191` in this same repo consistently asserts
the full `{ error: '...' }` body on every error branch, and the new tests don't
follow that pattern.

**Problem:** A regression that changes an error code string (breaking a
client-side check on that string) or that accidentally leaks an internal error
message into the response body would pass every current test.

**Fix:** Add `expect(await res.json()).toEqual({ error: '...' })` to each
status-only assertion in both new test files, matching `scores.test.ts`'s
existing convention.

**Effort:** Small

---

### P3-4: Playlists that fail to load get stuck on "Loading…" forever

**Status:** `open`

**Category:** correctness

**Confidence:** medium

**Confidence rationale:** The stuck-state mechanism is verified directly (the
client silently returns with no fallback text when a playlist has no match after
fetch); the practical trigger frequency depends on how often P1-3's error
collapsing actually occurs in production, which wasn't measured.

**File(s):** `src/pages/labs/playlists.astro:132` (`if (!match) return` —
silently exits, leaving the initial server-rendered "Loading…" text untouched)

**Plain English:** If a playlist fails to load for any reason (see P1-3), its
card just keeps showing "Loading…" and an empty track count indefinitely —
there's no visual difference between "still fetching" and "permanently failed,"
and no retry affordance.

**Problem:** Compounding this, the alphabetical sort at
`playlists.astro:146-154` treats a never-loaded card's empty-string name as
sorting before every real name, so a permanently failed card floats to the front
of the grid rather than staying in place or moving to the end — a real but minor
UX inconsistency alongside the stuck-text issue.

**Fix:** After `loadPlaylistInfo()`'s fetch resolves, treat any card with no
match in `infoById` as an explicit error state ("Could not load") rather than
leaving the initial "Loading…" markup untouched. Depends on P1-3 first providing
a real error signal to distinguish this from "still loading" if that distinction
matters (e.g. a very slow but not-yet-failed batch fetch).

**Effort:** Small
