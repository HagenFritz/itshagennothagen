---
title: 'Deep review: Weed Whacker sim core (PR 1)'
target: feat/weed-whacker-sim-core
date: 2026-07-03
---

# Deep review: Weed Whacker sim core (PR 1)

## Summary

| Priority  | Count | Label                      |
| --------- | ----- | -------------------------- |
| P1        | 2     | Critical, fix before merge |
| P2        | 4     | Important, should fix      |
| P3        | 6     | Nice-to-have               |
| **Total** | 12    |                            |

### P1 Issues

- [ ] **tick() accepts arbitrary dt** - NaN poisons the run forever, negative dt
      rewinds the clock, large dt breaks the spawn/income model.
- [ ] **MAX_SCORE invariant is false** - executed counterexamples reach 181
      whacks; the honest 60fps max is 178 due to float dust; the covering test
      is vacuous.

### P2 Issues

- [ ] **Malformed move dir throws mid-tick** - unknown direction poisons facing
      and breaks all future buys.
- [ ] **`weed-whacker: *` is a latent dependency-confusion squat** - name is
      unclaimed on the npm registry.
- [ ] **Multi-intent ticks untested** - move+chop ordering is load-bearing for
      PR2 and unpinned.
- [ ] **Weeds determinism test is degenerate** - chance 1.2 makes the seed
      irrelevant; proves nothing.

### P3 Issues

- [ ] **Cooldown-expiry-tick ordering untested** - tickCooldowns-before- intents
      contract unpinned.
- [ ] **Buy facing a weed tile untested** - weed branch of the denial
      unverified; facing-on-success also unasserted.
- [ ] **index.ts exports speculative surface** - nothing consumes most of it;
      trim to config + state.
- [ ] **timerWarning + runEnded co-emission unasserted** - both can arrive in
      one events array; PR2 must tolerate it.
- [ ] **Minor simplifications** - dead setTile bounds guard, premature
      `functions` tsconfig exclude, optional inBounds fold and init-loop
      shortening.
- [ ] **Unbounded intents array** - 10^6 buy intents allocate 10^6 events in one
      tick; PR2 shell is the only cap.

---

## Groups

### G1: tick() input contract and score-bound integrity

**Issues:** P1-1, P1-2, P2-1, P3-1, P3-4

**Why grouped:** All live in the tick() input path (run.ts, player.ts) and
define the contract PR2's shell and PR3's server bound build on. Three review
agents independently executed exploits here.

**Suggested order:** P1-1 -> P2-1 -> P1-2 -> P3-1 -> P3-4

**Cascade:** P1-1 (dt validation + fixed-step sub-stepping) defines which dt
values are legal, which changes how P1-2's max-score fix is implemented and
tested (with sub-stepping, internal dt is always TICK_MS, so integer-tick
accounting becomes natural). P2-1 is same-file input hardening. P3-1 and P3-4
are the behavioral tests that pin the fixed contract.

### G2: test-suite hardening

**Issues:** P2-3, P2-4, P3-2

**Why grouped:** All are additions/repairs to the core test suite with a shared
goal: pin contracts PR2 will silently depend on.

**Suggested order:** P2-3 -> P2-4 -> P3-2

**Cascade:** independent fixes, no ordering dependency.

### G3: scaffold hygiene

**Issues:** P2-2, P3-3, P3-5

**Why grouped:** All are packaging/config trims outside the sim logic.

**Suggested order:** P2-2 -> P3-3 -> P3-5

**Cascade:** independent fixes, no ordering dependency.

---

## Issues

### P1-1: tick() accepts arbitrary dt

**Status:** `open`

**Category:** correctness

**Confidence:** high

**Confidence rationale:** Reliability and adversarial agents both executed the
failures against the real code (NaN soft-lock, negative rewind, total
infestation at dt >= 50s).

**File(s):** `packages/weed-whacker/src/core/run.ts` (lines 13-49),
`packages/weed-whacker/src/core/weeds.ts` (line 13)

**Plain English:** `tick()` at `run.ts:13` trusts whatever dt the caller passes.
One NaN dt (the classic uninitialized-first-frame rAF bug) makes money, elapsed
time, and both cooldowns NaN forever: the run never ends and the chop cooldown
gate never closes. A negative dt rewinds the clock. A dt over 50 seconds makes
the spawn chance at `weeds.ts:13` exceed 1.0, turning every grass tile to weed
in one tick.

**Problem:** PR2's shell will fast-forward after tab-hide and compute dt from
timestamps. Every one of these dt regimes is reachable by accident, and two of
them (NaN, large dt) were proven to break the run or the game model. The plan
says catch-up loops fixed ticks, but nothing in the code enforces it.

**Fix:** At the top of `tick()`: treat non-finite or negative dt as 0. Then
sub-step internally: consume dtMs in TICK_MS chunks (final partial chunk
allowed), clamping total advance at RUN_DURATION_MS - elapsedMs. This makes one
large call exactly reproduce the stepped simulation, fixes the spawn chance
overflow, income distortion, and elapsed overshoot in one change, and turns the
plan's fixed-step prose into an enforced code contract. Add tests:
NaN/negative/zero dt are no-ops; one tick(dt=180s) equals 10800 ticks of TICK_MS
for the same seed.

**Effort:** Medium

---

### P1-2: MAX_SCORE invariant is false in both directions

**Status:** `open`

**Category:** correctness

**Confidence:** high

**Confidence rationale:** Correctness and adversarial agents independently
executed counterexamples: 181 whacks via dt=0 first tick or dt=1000/7 loops; 178
max at fixed 60fps.

**File(s):** `packages/weed-whacker/src/core/config.ts` (line 18),
`packages/weed-whacker/src/core/player.ts` (lines 7-8, 26),
`packages/weed-whacker/src/core/run.ts` (lines 38-48),
`packages/weed-whacker/src/core/run.test.ts` (lines 75-79)

**Plain English:** `MAX_SCORE` at `config.ts:18` is exported as the score cap
the future server will trust, but the sim can legally produce 181 (first chop is
free and a final-tick chop lands after 180 cooldown periods), while an honest
player at 60fps can only ever reach 178 because repeated subtraction of 1000/60
leaves a 8.6e-13 residue that blocks the chop for one extra tick. The test named
for this at `run.test.ts:75` only checks 180 === 180000/1000, which proves
nothing about behavior.

**Problem:** PR3 rejects submissions above MAX_SCORE. As shipped, a legitimate
perfect run under a variable-dt shell would be rejected at 181, and under the
real fixed-step shell scores 179-180 are unreachable, so the advertised max is a
lie in both directions. Subtlety: the cooldown residue bug and the run-length
off-by-one (10801 ticks, not 10800) currently cancel; fixing either alone makes
181 reachable at 60fps. Fix together.

**Fix:** After P1-1 lands (internal fixed-step), account cooldowns and run
duration in integer ticks (or snap sub-epsilon residues to zero in
`tickCooldowns` AND clamp the run to exactly RUN_DURATION_MS of simulated time).
Target invariant: max achievable whacks at the enforced tick contract equals
MAX_SCORE exactly. Replace the vacuous test with a behavioral one: chop-spam a
full run with a weed always underfoot and assert whacked === MAX_SCORE, plus a
worst-case dt-sequence test asserting whacked <= MAX_SCORE.

**Effort:** Medium

---

### P2-1: Malformed move direction throws mid-tick and poisons facing

**Status:** `open`

**Category:** correctness

**Confidence:** high

**Confidence rationale:** Reliability agent executed it: TypeError from the
destructure, facing left as the invalid value, all subsequent buys throw.

**File(s):** `packages/weed-whacker/src/core/player.ts` (lines 13-16)

**Plain English:** `applyMove` at `player.ts:13` writes the direction into
`facing` before checking it is a real direction. An unmapped key in PR2's
keyboard layer producing `{ type: 'move', dir: 'north' }` throws when the delta
lookup fails, and because `facing` now holds garbage, every later buy intent
throws too at `economy.ts:21`.

**Problem:** One typo'd keybinding in the shell permanently breaks purchasing
and crashes ticks halfway through, leaving state partially mutated.

**Fix:** Look up the delta first; if undefined, return without touching facing.
TypeScript's Direction type guards compile-time misuse but not runtime data from
the shell's keymap. One test: unknown dir is a no-op.

**Effort:** Small

---

### P2-2: Workspace dependency "weed-whacker": "\*" invites dependency confusion

**Status:** `open`

**Category:** security

**Confidence:** high

**Confidence rationale:** Reliability agent verified the name is unclaimed
(registry 404) and the lockfile currently pins the workspace link.

**File(s):** `package.json` (dependencies)

**Plain English:** The site depends on `weed-whacker: "*"`, which today resolves
to the workspace folder. The name is unclaimed on the public npm registry, so
anyone can publish a package called weed-whacker tomorrow, and any future
install that cannot see the workspace folder (partial checkout, lockfile regen)
would fetch the stranger's code at any version.

**Problem:** Classic dependency-confusion setup, currently latent because the
lockfile pins the link. Latent is the right time to fix it.

**Fix:** Change the dependency to `"weed-whacker": "file:packages/weed-whacker"`
(npm has no workspace: protocol). `file:` makes registry fallback impossible.
Run npm install once to update the lockfile.

**Effort:** Small

---

### P2-3: Multi-intent ticks are untested

**Status:** `open`

**Category:** testing

**Confidence:** high

**Confidence rationale:** Coverage agent read every intents array in
run.test.ts; all are empty or single-element.

**File(s):** `packages/weed-whacker/src/core/run.test.ts`

**Plain English:** Every test drives `tick()` with zero or one intent, but PR2
will routinely send move+chop in the same tick. The code at `run.ts:26-30`
processes them in order, so the chop lands on the tile the player just moved to.
Nothing pins that: a regression that drops or reorders intents passes all 36
tests.

**Problem:** The move-then-chop resolution order is load-bearing gameplay
behavior about to gain its first real consumer.

**Fix:** Add a test passing `[{move right}, {chop}]` with a weed on the
destination tile, asserting weedWhacked fires at the new coordinates. Optionally
include a buy in the same array.

**Effort:** Small

---

### P2-4: Weeds determinism test is degenerate

**Status:** `open`

**Category:** testing

**Confidence:** high

**Confidence rationale:** Coverage agent checked the arithmetic: 0.02 \* 60 =
1.2, and rng() < 1.2 is always true.

**File(s):** `packages/weed-whacker/src/core/weeds.test.ts` (lines 31-38)

**Plain English:** The "deterministic for the same seed" test at
`weeds.test.ts:31` uses dt = 60000, which makes the spawn chance 1.2, so every
tile spawns no matter what the RNG returns. Any two different seeds would also
pass; the test cannot detect a determinism regression.

**Problem:** The one test guarding RNG-order determinism proves nothing.

**Fix:** Use dt = 1000 (chance 0.02) so outcomes depend on the seed, and assert
the event count is strictly between 0 and the plot size to prove the roll
discriminated. (P1-1's chance clamp makes the old variant even more degenerate,
so fix alongside.)

**Effort:** Small

---

### P3-1: Cooldown-expires-this-tick ordering untested

**Status:** `open`

**Category:** testing

**Confidence:** high

**Confidence rationale:** Coverage agent verified no test sets a cooldown to
exactly one tick and chops in that tick.

**File(s):** `packages/weed-whacker/src/core/run.test.ts`

**Plain English:** `tick()` decrements cooldowns before processing intents
(`run.ts:22`), so a chop whose cooldown expires this tick succeeds. Swapping
those two lines shifts every action one tick later and no test notices.

**Problem:** Half of the documented ordering contract (the time half is tested,
the cooldown half is not).

**Fix:** Set `chopCooldownMs = TICK_MS`, weed underfoot, tick with a chop
intent, expect weedWhacked. Coordinate with P1-2's integer-tick rework.

**Effort:** Small

---

### P3-2: Buy facing a weed tile and facing-on-success untested

**Status:** `open`

**Category:** testing

**Confidence:** medium

**Confidence rationale:** Coverage agent verified the gaps exist; the refactors
that would break them are narrower than the P2 gaps.

**File(s):** `packages/weed-whacker/src/core/economy.test.ts`,
`packages/weed-whacker/src/core/player.test.ts`

**Plain English:** The buy-denial test only faces grass, never a weed, so a
regression that lets players pay to convert weeds to grass (bypassing chop)
would pass. Separately, `facing` is asserted on blocked and cooldown paths but
never after a successful move, and buys aim via facing.

**Problem:** Two one-line-fix blind spots in otherwise good suites.

**Fix:** (1) Face a weed tile, assert buyDenied/noTarget and the tile stays
weed. (2) Assert facing equals the moved direction after a successful move.

**Effort:** Small

---

### P3-3: index.ts exports a speculative public surface

**Status:** `open`

**Category:** maintainability

**Confidence:** high

**Confidence rationale:** Simplicity agent grepped consumers: nothing imports
index.ts today; planned consumers need only config, state types, and the future
mount.

**File(s):** `packages/weed-whacker/src/index.ts`

**Plain English:** `index.ts` re-exports tick, startRun, mulberry32,
nextTileCost, and three grid helpers, but per the plan the only external
consumers ever are the /play page (which gets a `mount()` wrapper in PR2) and
the PR3 API function (which needs MAX_SCORE). The extra exports are surface area
to keep stable with no consumer.

**Problem:** Speculative API surface; also currently untested (deleting any line
leaves the suite green).

**Fix:** Cut index.ts to `export * from './core/config'` and
`export * from './core/state'`. PR2 adds mount when it exists; internal code
keeps importing ./core/\* directly.

**Effort:** Small

---

### P3-4: timerWarning and runEnded co-emission unasserted

**Status:** `open`

**Category:** testing

**Confidence:** high

**Confidence rationale:** Correctness agent executed a dt=180000 tick and
observed both events in one array; no test asserts it.

**File(s):** `packages/weed-whacker/src/core/run.test.ts`

**Plain English:** A single large tick past the end emits timerWarning and
runEnded in the same events array (`run.ts:36-46`). The existing end-of-run test
asserts only runEnded, so a refactor that drops the warning on a frame skip goes
unnoticed, and PR2's shell may not expect both at once.

**Problem:** Unpinned event-batch contract that PR2 must tolerate.

**Fix:** In the end-of-run test, also assert timerWarning is present and
precedes runEnded. Revisit expected semantics after P1-1's sub-stepping (warning
should then fire in its own step).

**Effort:** Small

---

### P3-5: Minor simplifications from the simplicity pass

**Status:** `open`

**Category:** maintainability

**Confidence:** high

**Confidence rationale:** Simplicity agent verified each: setTile's guard is
only reachable from the test written for it; `functions/` does not exist until
PR3.

**File(s):** `packages/weed-whacker/src/core/grid.ts` (lines 11-13, 30),
`tsconfig.json` (line 4), `packages/weed-whacker/src/core/state.ts` (lines
40-47)

**Plain English:** Four small trims: the out-of-bounds guard in setTile at
`grid.ts:30` can never fire from production code and silently ignoring such a
write would hide real bugs; the root tsconfig excludes a `functions` directory
that will not exist until PR3; optionally inline inBounds into its one
production caller and shorten the createState fill loop.

**Problem:** Small dead weight; the guard actively masks bugs it would catch by
throwing.

**Fix:** Remove the setTile guard (body becomes the direct write) and its
dedicated test assertion; drop `"functions"` from the root tsconfig exclude
until PR3 adds the directory; items 3 (inBounds fold) and 4 (init loop) at
author's discretion. Explicitly keep: noUncheckedIndexedAccess, the three
distinct grid loops, tickCooldowns twin lines, the two why-comments.

**Effort:** Small

---

### P3-6: Unbounded intents array per tick

**Status:** `open`

**Category:** architecture

**Confidence:** high

**Confidence rationale:** Adversarial agent executed 10^6 buy intents in one
tick: ~58 ms and 10^6 allocated buyDenied events.

**File(s):** `packages/weed-whacker/src/core/run.ts` (lines 26-31)

**Plain English:** `tick()` processes however many intents it is given, and each
denied buy allocates an event. A buggy or hostile shell can pass a million
intents and get a million event objects back in one tick. Also, facing changes
are free within a tick and buy has no cooldown, so up to 4 purchases can land in
one tick.

**Problem:** Self-DoS only (score is chop-gated), but PR2's input layer becomes
the sole cap and nothing documents that responsibility.

**Fix:** Either cap intents per tick in the sim (e.g. one move, one chop, one
buy per tick, matching what a keyboard can express) or record the constraint as
a binding note in the PR2 unit of the plan. The per-tick intent dedupe is the
simpler and more robust option.

**Effort:** Small
