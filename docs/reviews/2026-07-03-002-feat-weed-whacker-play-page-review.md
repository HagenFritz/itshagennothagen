---
title:
  'Deep review: Weed Whacker play page (PR 2) with owner playtest directives'
target: feat/weed-whacker-play-page
date: 2026-07-03
---

# Deep review: Weed Whacker play page (PR 2) with owner playtest directives

Owner playtest feedback drove this review: the game is blurry, the grid should
stay fixed while the player moves across it, and the world should shrink to
10x10 fully visible. Those directives are P1 by fiat; agents diagnosed root
causes and swept the rest of the Phase 2 diff.

## Summary

| Priority  | Count | Label                      |
| --------- | ----- | -------------------------- |
| P1        | 3     | Critical, fix before merge |
| P2        | 5     | Important, should fix      |
| P3        | 4     | Nice-to-have               |
| **Total** | 12    |                            |

### P1 Issues

- [ ] **Blur root cause: soft sprites + fractional scale** - decoded PNGs are
      continuous-tone mush (200+ colors/tile) and the border shaves the slot to
      638px (1.99375x scale).
- [ ] **10x10 fixed grid redesign** - remove camera follow, whole grid always
      visible, player sprite moves across a static board.
- [ ] **HUD freezes between events** - countdown and money repaint only on
      event-bearing ticks; timer visibly stalls seconds at a time.

### P2 Issues

- [ ] **Stuck movement keys after tab-away** - canvas blur does not fire on
      Alt-Tab; held keys survive and the farmer walks on return.
- [ ] **Held movement unrecoverable after mute-click blur** - repeat guard
      blocks re-populating held keys while a key stays physically down.
- [ ] **rAF/destroy lifecycle cluster** - stale rAF chain survivable on restart;
      destroy() leaves running=true, bricking the handle.
- [ ] **Fixed RNG seed: identical board every run** - decision required:
      speedrun-fair same board vs fresh board per run.
- [ ] **Input buffer untestable inside mount()** - extract createInputBuffer so
      held/pressed/collect logic gets unit tests.

### P3 Issues

- [ ] **Start button inert during load, errors swallowed** - loading state +
      console.error on mount failure.
- [ ] **Simplicity pass** - audio module merge, sprites single-source, dead coin
      asset, dead param/re-export/wrapper trims.
- [ ] **Playwright clock spec** - five assertions catching HUD/end-screen/
      play-again regressions the unit suite cannot see.
- [ ] **Wav decode races first chop** - first chop of a run can be silent while
      the 192KB wav decodes; accepted or preload earlier.

---

## Groups

### G1: playtest redesign (blur + fixed 10x10 grid)

**Issues:** P1-1, P1-2, P3-2

**Why grouped:** One rebuild of the render path serves all three: new art
export, new internal resolution, camera deletion, and the simplicity trims that
live in the same files (renderer constant derivation, sprites single-source,
dead coin).

**Suggested order:** P1-2 and P1-1 together -> P3-2

**Cascade:** The 10x10 decision fixes the internal resolution (640x640 at 64px
tiles), which fixes the art export size, which fixes the scale snapping. Doing
P1-1 before P1-2 would mean re-exporting art twice.

### G2: shell input and loop bugs

**Issues:** P1-3, P2-1, P2-2, P2-3, P2-5

**Why grouped:** All live in mount.ts's input/loop closures. The input-buffer
extraction (P2-5) is the natural vehicle for the two key-state fixes (P2-1,
P2-2); the HUD gate (P1-3) and rAF/destroy fixes (P2-3) are adjacent lines.

**Suggested order:** P2-5 -> P2-2 -> P2-1 -> P1-3 -> P2-3

**Cascade:** Extracting the buffer first means the key-state fixes land in
tested code instead of being fixed twice.

---

## Issues

### P1-1: Blur root cause: soft sprites + fractional scale

**Status:** `done`

**Category:** correctness

**Confidence:** high

**Confidence rationale:** Agent decoded the shipped PNGs (grass tiles have
206-232 unique colors in 256 pixels; pixel art has 4-16) and computed the exact
fractional scale from the DOM (638/320 = 1.99375). The pixelated CSS class was
verified present in the built stylesheet and cleared as a cause.

**File(s):** `public/games/weed-whacker/*.png`, `src/pages/play.astro` (lines
25-30), `packages/weed-whacker/src/render/renderer.ts` (lines 7-9)

**Plain English:** Two compounding causes. The sprites were downscaled from
1024px art with area-averaging, which produces soft anti-aliased tiles, so even
perfect nearest-neighbor upscaling magnifies mush. And the canvas wrapper's 1px
border at `play.astro:25` shaves the 640px slot to 638px, so the 320px buffer is
stretched by a fractional 1.99375x, smearing pixel columns unevenly.

**Problem:** The game looks blurry at every window size. CSS cannot fix soft
source art; art re-export cannot fix fractional scaling. Both must change.

**Fix:** Re-export sprites from the 1024px sources at 64px with point sampling
(`magick in.png -filter point -resize 64x64 out.png`; sips cannot select a
filter). With the 10x10 grid this gives a 640x640 internal canvas: 1:1 with the
layout slot at desktop, integer 2x on retina. Integer-snap the CSS size
(floor(available/640)\*640, min 320 fallback) instead of fluid `w-full`, move
the border off the sizing box, change aspect-ratio to 1/1, keep
`imageSmoothingEnabled = false` and the pixelated class.

**Effort:** Medium

---

### P1-2: 10x10 fixed grid redesign (owner directive)

**Status:** `done`

**Category:** architecture

**Confidence:** high

**Confidence rationale:** Owner directive from playtest; touch list verified
file-by-file by two agents, including the tests that would pass wrongly.

**File(s):** `packages/weed-whacker/src/core/config.ts` (line 1),
`packages/weed-whacker/src/render/camera.ts` (delete),
`packages/weed-whacker/src/render/camera.test.ts` (delete),
`packages/weed-whacker/src/render/renderer.ts`,
`packages/weed-whacker/src/core/economy.test.ts`,
`packages/weed-whacker/src/core/player.test.ts` (lines 40-46),
`packages/weed-whacker/src/core/run.test.ts` (lines 101-102),
`src/pages/play.astro`, plus doc text updates in
`docs/plans/2026-07-03-001-feat-weed-whacker-web-v1-plan.md` and
`docs/brainstorms/2026-07-03-001-weed-whacker-web-v1-requirements.md`

**Plain English:** The owner wants the player to move across a fixed board, not
a camera chasing the player across a big world. WORLD_GRID_SIZE drops 30 -> 10
at `config.ts:1`, the whole grid renders every frame, and `camera.ts` is
deleted. The centering math at `state.ts:50-51` already yields a correct 3..7
plot with the player at (5,5); no sim change needed.

**Problem:** Beyond the directive itself: tests hardcode 30-world coordinates
(13..17) that crash at grid 10, and one test (`player.test.ts:40-46`) keeps
passing for the wrong reason (13,13 becomes out-of-bounds, blocking via
undefined instead of ownership), so a fix-the-red-tests pass would miss it. Docs
still describe 30x30 + camera.

**Fix:** Config to 10; renderer loops 0..WORLD_GRID_SIZE with derived
`INTERNAL_WIDTH = WORLD_GRID_SIZE * TILE_SIZE` (square, drop the separate
height); delete camera + its test; rewrite hardcoded test coords to derive
center/start from config the way grid.test.ts already does, moving the
player.test ownership test to (3,3) explicitly; update plan/requirements text
(30x30 -> 10x10, camera-follow -> fixed board). Balance note: grass area is
unchanged but purchasable land drops 875 -> 75; income/cost curves may want a
playtest retune, flagged not blocking.

**Effort:** Medium

---

### P1-3: HUD freezes between events

**Status:** `done`

**Category:** correctness

**Confidence:** high

**Confidence rationale:** Found independently by three agents; the emit gate and
the absence of any per-second event were traced directly.

**File(s):** `packages/weed-whacker/src/mount.ts` (lines 44-47)

**Plain English:** `emit()` at `mount.ts:44` only calls the HUD repaint callback
when a tick produced events. Time and money advance silently every 50ms step,
and early-game events average one per ~2 seconds, so the countdown visibly
stalls and jumps. The pre-merge browser check missed it because a chop (an
event) forced a repaint right before the HUD was read.

**Problem:** The timer looks broken to every player and misleads decisions near
the 10-second warning. Display only; score unaffected.

**Fix:** Call `onStateChange(state)` unconditionally once per frame (and in the
visibility catch-up path), independent of events. Three DOM text writes per
frame are negligible.

**Effort:** Small

---

### P2-1: Stuck movement keys after tab-away

**Status:** `done`

**Category:** correctness

**Confidence:** high

**Confidence rationale:** Chromium behavior (element-level blur does not fire on
tab switch) is inferred from platform knowledge; the missing hidden- path clear
was verified in the code. The plan's own verification criterion ("no stuck keys
after Alt-Tab") is unmet.

**File(s):** `packages/weed-whacker/src/mount.ts` (lines 89-103)

**Plain English:** `clearHeld` is bound only to the canvas `blur` event at
`mount.ts:103`. Alt-Tab does not blur the canvas element and the key release
while hidden is never delivered, so on return the farmer keeps walking in the
held direction until the player taps the key again.

**Problem:** Ghost movement after every Alt-Tab mid-run; on a leaderboard run
this walks the player away from weeds.

**Fix:** In the visibilitychange handler, call `clearHeld()` on the hidden
transition (currently an early return), and add a `window` blur listener
alongside the canvas one.

**Effort:** Small

---

### P2-2: Held movement unrecoverable after mute-click blur

**Status:** `done`

**Category:** correctness

**Confidence:** high

**Confidence rationale:** Traced: `onKeyDown` guards both held.push and
pressed.add behind `!e.repeat`, so OS auto-repeat after refocus never
re-establishes held.

**File(s):** `packages/weed-whacker/src/mount.ts` (lines 51-57)

**Plain English:** Hold W, click the mute button: the canvas blurs and the held
set is (correctly) cleared. The click handler refocuses the canvas, but the
player is still physically holding W, and every subsequent keydown carries
`e.repeat = true`, which `mount.ts:52` ignores entirely. The farmer stands still
until the player releases and re-presses.

**Problem:** Seconds of lost movement for honest players after any mid-run
blur/refocus; a chop queued just before the blur is also silently eaten.

**Fix:** Hoist the held-set update out of the repeat guard, keep pressed inside
it: repeat events then re-establish held after refocus while chop-per-press
semantics stay intact.

**Effort:** Small

---

### P2-3: rAF/destroy lifecycle cluster

**Status:** `done`

**Category:** correctness

**Confidence:** high

**Confidence rationale:** Interleavings traced by two agents; the destroy flag
bug verified directly. Real-world trigger window is tight (programmatic-speed
play-again after hidden-tab run end).

**File(s):** `packages/weed-whacker/src/mount.ts` (lines 98, 110, 118, 123-129)

**Plain English:** Two related holes. If a run ends inside the visibility
catch-up, the rAF queued before hiding is never cancelled; a fast restart then
runs two interleaved frame chains (double render, only one cancellable). And
`destroy()` cancels the rAF but never resets `running`, so a later `start()`
silently no-ops forever: a zombie handle.

**Problem:** Latent lifecycle bugs the redesign (resize handling, any future
unmount) will trip over even though today's page cannot reach them.

**Fix:** `cancelAnimationFrame(rafId)` at the top of `start()`; set
`running = false` in `destroy()` plus a destroyed flag that makes `start()` an
explicit no-op; optionally guard `frame` with `if (!running) return`.

**Effort:** Small

---

### P2-4: Fixed RNG seed: identical board every run

**Status:** `done`

**Category:** correctness

**Confidence:** high

**Confidence rationale:** Verified: mulberry32(1) at mount.ts:37 and :112,
reseeded to the same constant every start().

**File(s):** `packages/weed-whacker/src/mount.ts` (lines 37, 112)

**Plain English:** Every run rolls the same weed-spawn schedule, so replaying
players can memorize where the first weeds appear. Everyone competes on the same
board (speedrun-fair) but the top of a leaderboard converges on one rehearsed
route.

**Problem:** Not a bug; a design decision made implicitly. The owner should make
it explicitly before the leaderboard ships.

**Fix:** Decision: keep the fixed seed (same board for everyone, add a comment
saying so) or seed per run (`mulberry32(Date.now() >>> 0)`) for fresh boards.
One line either way.

**Effort:** Small

---

### P2-5: Input buffer untestable inside mount()

**Status:** `done`

**Category:** testing

**Confidence:** high

**Confidence rationale:** Verified: held/pressed/collect are closures inside
mount(), which cannot run under the node-environment vitest (needs 2d context
and Image.onload).

**File(s):** `packages/weed-whacker/src/mount.ts` (lines 38-78),
`packages/weed-whacker/src/input/` (new module + test)

**Plain English:** The key-state logic (held set, edge-triggered pressed set,
per-frame collect) lives in closures inside `mount()` at `mount.ts:38-78`, so
none of it is unit-tested. Losing the repeat guard alone would let a held B key
buy 60 tiles per second.

**Problem:** Load-bearing input logic with zero tests, about to be edited by two
bug fixes (P2-1, P2-2).

**Fix:** Extract `createInputBuffer()` into `src/input/` with
`keydown(code, repeat)`, `keyup(code)`, `clear()`, `collect(): Intent[]`; mount
consumes it. Land the P2-1/P2-2 fixes inside the extracted, tested module. Four
small tests: repeat guard, pressed-clear-per-collect, blur clear, held
dedupe/removal.

**Effort:** Small

---

### P3-1: Start button inert during load, errors swallowed

**Status:** `done`

**Category:** maintainability

**Confidence:** high

**Confidence rationale:** Verified: listeners attach only after mount resolves;
the catch discards the error object.

**File(s):** `src/pages/play.astro` (lines 141-157, 170)

**Plain English:** Until sprite loading finishes, the Start button is visible
but does nothing (`play.astro:170` attaches the handler after the await). And
when mount fails, the catch at `play.astro:153` shows "could not load" but
throws away the error, so a production 404 on one sprite is undiagnosable.

**Problem:** Confusing dead button on slow connections; zero observability on
load failure.

**Fix:** Render Start disabled with "Loading..." and enable on mount resolve;
add `console.error(err)` in the catch.

**Effort:** Small

---

### P3-2: Simplicity pass

**Status:** `done`

**Category:** maintainability

**Confidence:** high

**Confidence rationale:** Each item verified by the simplicity agent (coin
confirmed drawn nowhere; dead param confirmed uncalled; dead re-export confirmed
unimported).

**File(s):** `packages/weed-whacker/src/audio/*`,
`packages/weed-whacker/src/render/sprites.ts` (lines 1-18),
`packages/weed-whacker/src/input/keyboard.ts` (lines 14-15, 27, 36-42),
`packages/weed-whacker/src/mount.ts` (lines 14-15, 21, 120-122, 133),
`packages/weed-whacker/src/index.ts`

**Plain English:** The audio engine is a generic buffer framework for exactly
one wav (`audio.ts:30`); merging it into `createGameAudio` with a
`playEvent(event)` method cuts ~50 lines and fixes the fragile `this.unlock()`.
The `SpriteName` union and `NAMES` array duplicate the same seven strings; the
coin sprite is loaded on every page view but never drawn; `heldDirection`'s
injection param, mount's dead re-export, and the `focus()` wrapper have no
callers.

**Problem:** ~70 lines of speculative surface across the new modules.

**Fix:** Audio merge (keep the `blip()` factory and the swallow-to-silence
catches, both earn their keep); `NAMES as const` deriving the union; drop coin
from the load set; delete the dead param, re-export, and focus wrapper; make
mount's two callbacks required. Renderer constant derivation happens in P1-2,
not here.

**Effort:** Small

---

### P3-3: Playwright clock spec

**Status:** `deferred`

**Category:** testing

**Confidence:** medium

**Confidence rationale:** The approach (page.clock patches performance.now and
rAF; fixed seed makes no-input runs deterministic) is standard but was not
prototyped.

**File(s):** new spec file (location per repo convention when added)

**Plain English:** Five scripted browser assertions would catch the whole class
of shell regressions the unit suite cannot see: start hides overlay and focuses
canvas; after 3 clock-seconds the HUD reads 2:57 (this exact check catches P1-3,
which today fails); at 3:00 the end screen shows with matching score; play-again
resets and the timer moves again; touch emulation shows the mobile note and a
blocked png shows the failure message.

**Problem:** The one manual browser check missed P1-3 because a chop forced a
repaint right before reading the HUD.

**Fix:** One local Playwright spec with the five assertions, run manually before
shipping game PRs. Adding it to CI is disproportionate for this repo; skip that.

**Effort:** Medium

---

### P3-4: Wav decode races first chop

**Status:** `deferred`

**Category:** maintainability

**Confidence:** high

**Confidence rationale:** Verified: decode starts at first unlock(); playBuffer
silently skips when the buffer is not yet cached.

**File(s):** `packages/weed-whacker/src/audio/audio.ts` (lines 45-46, 69-71)

**Plain English:** The 192KB chop wav starts downloading and decoding only when
Start is clicked (`audio.ts:45`), so the first chop or two of a player's first
run can be silent while it races the decode.

**Problem:** Minor polish gap consistent with the documented best-effort audio
contract.

**Fix:** Either accept (document in the audio comment) or kick off the context +
decode on page load muted-aware, keeping the resume-on-gesture for the autoplay
policy. Also worth re-encoding the wav smaller (192KB stereo 48kHz for a 1s
blip; mono 22kHz is ~1/4 the size).

**Effort:** Small

---
