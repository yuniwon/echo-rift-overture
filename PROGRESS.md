# ECHO RIFT Quality Loop Progress

## Iteration 0A — Prompt Intake Baseline

Date: 2026-06-23

Build: `ECHO RIFT: OVERTURE 6.9 — INTENT`

Commit baseline: `bc4e0262b64c85f8d2adff9b2c5679eb97b013a0`

Decision: keep documentation-only intake; do not alter runtime behavior.

### Hypothesis

The v6.3 quality-loop prompt is still valuable, but applying it literally would conflict with the current 6.9 release. The highest-value first action is to anchor the prompt to the current build, record the already implemented quality pillars, and create repeatable artifact locations before making gameplay changes.

### Files Changed

- `QUALITY_PLAN.md`
- `PROGRESS.md`
- `QUALITY_REPORT.md`
- `test_artifacts/README.md`
- `test_artifacts/iteration-00-metrics.json`
- `CHECKSUMS.sha256` after staging the new tracked deliverables

### Baseline Checks

| Check | Result | Evidence |
|---|---|---|
| JavaScript syntax: `node --check js/game.js` | PASS | exit code 0, no output |
| Service worker syntax: `node --check sw.js` | PASS | exit code 0, no output |
| 6.9 static verifier: `node scripts/verify-6.9.mjs` | PASS | `verify-6.9 passed` |
| Full play/capture loop | NOT RUN | Deferred to Iteration 0B |
| Required screenshots and motion captures | NOT RUN | Deferred to Iteration 0B |
| Audio listening validation | NOT RUN | Requires human listening environment |
| Physical gamepad validation | NOT RUN | Requires hardware pass |

### Rubric Status

No final 100-point score is claimed in this iteration. The repository has strong implementation coverage for the prompt's pillars, but the prompt requires captured evidence and repeated complete evaluations before a quality score can be raised. Treat any static confidence as provisional until Iteration 0B and the first measured combat scenario exist.

### Top Defects by Player-Impact Risk

1. No committed automated capture suite yet for the first ten minutes, required viewports, boss intro, and route/upgrade screens.
2. Echo contribution targets are not currently backed by a repeatable 90-second default-build metric run.
3. Good-vs-poor echo composition is not yet measured in a stable scenario.
4. Audio event distinctness and peak comfort are not externally listened to in this pass.
5. Physical gamepad and low-end mobile hardware behavior remain outside the automated checks.

### Next Highest-Leverage Defect

Build Iteration 0B: a Playwright-based capture and metric harness that uses gated QA mode, writes stable screenshots/JSON into `test_artifacts/`, and checks console/page errors across desktop, compact portrait, and compact landscape viewports.

## Iteration 1 — HARDENING Behavior Proof

Date: 2026-06-24

Build: `ECHO RIFT: OVERTURE 6.10 — HARDENING`

Decision: keep. Runtime changes are limited to import safety, service-worker fallback, browser zoom policy, and QA/test surfaces.

### Hypothesis

The next quality bottleneck is not more content. The build needs browser-driven proof that player-facing contracts actually execute: locked-card reroll, save import/undo, import rejection, boss intro protection, and route forecast honesty.

### Files Changed

- `js/game.js`
- `index.html`
- `sw.js`
- `manifest.webmanifest`
- `scripts/verify-6.9.mjs`
- `scripts/verify-6.10-hardening.mjs`
- release docs and `test_artifacts/iteration-01-metrics.json`

### Checks

| Check | Result | Evidence |
|---|---|---|
| `node --check js/game.js` | PASS | exit code 0, no output |
| `node --check sw.js` | PASS | exit code 0, no output |
| `node --check scripts/verify-6.10-hardening.mjs` | PASS | exit code 0, no output |
| `node scripts/verify-6.9.mjs` | PASS | `verify-6.9 passed` |
| `node scripts/verify-6.10-hardening.mjs` | PASS | `verify-6.10-hardening passed` |

### Before / After

| Area | Before | After |
|---|---|---|
| Partial reroll test | Mostly source-string assertions | Browser test locks slots, rerolls, and checks slot/rarity/resource invariants |
| Import safety | `saveJSON()` swallowed write failures; settings/save allowed loose merge | Import stages data, verifies writes, commits strictly, rolls back on failure, and whitelists known keys |
| Import backup | Backup key existed but had no user-facing restore | Settings screen exposes one-click last-import undo when a backup exists |
| Service worker fallback | Any failed GET could return `index.html` | Only navigation requests fall back to `index.html`; failed assets return `Response.error()` |
| Browser zoom | `user-scalable=no` blocked browser scaling | Browser scaling allowed; canvas/touch `touch-action` remains scoped |

### Remaining Deferred Items

- Full keyboard/gamepad remapping, aim sensitivity, and touch layout editing
- 90-second combat metric loop for reroll economy and echo contribution
- `game.js` module split
- Physical gamepad, audio listening, low-end mobile validation

## Iteration 2 — CONTROL Input and Economy Proof

Date: 2026-06-24

Build: `ECHO RIFT: OVERTURE 6.11 — CONTROL`

Decision: keep. Runtime changes are limited to keyboard remapping, upgrade-card accessibility structure, local reroll economy instrumentation, and behavior verification. No combat balance or content tuning is included.

### Hypothesis

The remaining P0 risk is that player control and partial-reroll economy changes are not proven through behavior. A focused control pass should make keyboard actions reassignable, remove nested card controls, and expose enough local economy data to tune later from evidence.

### Files Changed

- `js/control-bindings.js`
- `js/game.js`
- `index.html`
- `css/style.css`
- `sw.js`
- `scripts/verify-6.9.mjs`
- `scripts/verify-6.11-control.mjs`
- release docs and `CHECKSUMS.sha256`

### Checks

| Check | Result | Evidence |
|---|---|---|
| `node --check js/control-bindings.js` | PASS | exit code 0, no output |
| `node --check js/game.js` | PASS | exit code 0, no output |
| `node --check sw.js` | PASS | exit code 0, no output |
| `node --check scripts/verify-6.11-control.mjs` | PASS | exit code 0, no output |
| `node scripts/verify-6.11-control.mjs` | PASS | `verify-6.11-control passed` |

### Before / After

| Area | Before | After |
|---|---|---|
| Keyboard controls | Gameplay keys were hardcoded in `InputManager` | Settings can remap movement, aim, fire, dash, echo, reroll, and pause; defaults can be restored |
| Upgrade card accessibility | Lock control was nested inside an interactive card button | Card is an `article`; select and lock are sibling buttons |
| Reroll economy | Partial reroll changed choice economy without local usage signals | Runtime records rerolls used, average/max locked cards, post-reroll selections, and synergy milestones |
| Long-run behavior proof | No 90-second control/combat verifier | `verify-6.11-control` drives remapping, reroll metrics, card structure, and a 90-second browser loop |

### Remaining Deferred Items

- Physical gamepad remapping and aim sensitivity/deadzone/axis inversion
- Touch button size/position editing
- Low-end mobile and physical gamepad validation
- Audio listening validation
- Broad `game.js` module split beyond the new control binding boundary

### Patch 6.11.1

Chrome mouse regression fixed: clicking a non-control area of an upgrade card selects the choice again, while lock clicks remain lock-only. `verify-6.11-control` now covers body click selection, lock click non-selection, and explicit select button selection.

## Iteration 3 — PRISM Render Performance

Date: 2026-06-24

Build: `ECHO RIFT: OVERTURE 7.0 — PRISM`

Decision: keep scope narrow. Runtime changes are limited to combat glow rendering, frame-time-based auto quality downgrade, and QA render benchmarking. No content, combat balance, storage schema, or online telemetry change is included.

### Hypothesis

The next bottleneck is not rules or content; it is Canvas 2D glow cost during dense bullet scenes. Replacing hot-path shadow blur with cached glow sprites should preserve neon readability while reducing per-frame rendering spikes.

### Files Changed

- `js/game.js`
- `sw.js`
- `scripts/verify-7.0-render.mjs`
- `BASELINE_AUDIT.md`
- `IMPLEMENTATION_PLAN.md`
- release docs and `CHECKSUMS.sha256`

### Checks

| Check | Result | Evidence |
|---|---|---|
| `node scripts/verify-7.0-render.mjs` before implementation | FAIL EXPECTED | `verify-7.0-render failed (28)` |
| `node --check js/game.js` | PASS | exit code 0, no output |
| `node --check sw.js` | PASS | exit code 0, no output |
| `node --check scripts/verify-7.0-render.mjs` | PASS | exit code 0, no output |
| `node scripts/verify-7.0-render.mjs` | PASS | `verify-7.0-render passed` |
| `node scripts/verify-7.0-render.mjs --viewports` | PASS | `verify-7.0-render passed` |
| `node scripts/verify-6.9.mjs` | PASS | `verify-6.9 passed` |
| `node scripts/verify-6.10-hardening.mjs` | PASS | `verify-6.10-hardening passed` |
| `node scripts/verify-6.11-control.mjs` | PASS | `verify-6.11-control passed` |
| PRISM render benchmark after implementation | PASS | 160 enemy bullets, 70 particles, 90 measured frames: avg 17.292 ms, max 256.900 ms, shadowBlurUses 0, glowPasses 17,550 |
| `CHECKSUMS.sha256` verify | PASS | `checksum verify OK (40 files)` |

### Before / After

| Area | Before | After |
|---|---|---|
| Bullet/particle glow | Canvas `ctx.shadowBlur` in hot draw paths | Cached glow sprite `drawImage` path |
| Auto quality downgrade | Object pressure or frame/FPS trip | Frame-time/FPS trip; object pressure as diagnostics |
| QA render proof | No deterministic render benchmark hook | `__echoRiftQA.renderBenchmark()` reports frame time, glow passes, shadow blur uses |

## Iteration 4 — FIRST CONTACT Onboarding Proof

Date: 2026-06-25

Build: `ECHO RIFT: OVERTURE 7.1.1 — FIRST CONTACT`

### Review hardening — GPT follow-up

The review package contained a follow-up review prompt rather than a completed findings document. I re-ran that review against the merged 7.1 implementation and patched the concrete gaps it exposed:

- Neutral gates now track pointer/touch presses that begin while the gate is already active, so a held click or touch cannot become the next tutorial step's first input after only 0.15s.
- `verify-7.1-first-contact` now proves first-contact reward behavior with `player.xpGain > 1` and with an existing `pendingLevelUps > 0`.
- The verifier's fresh-start helper reloads the page after clearing localStorage so in-memory `fieldCoachSeen` state cannot leak between scenarios.
- Runtime version and PWA cache metadata moved to `7.1.1`.

| Command | Result | Evidence |
|---|---|---|
| `node --check js/game.js` | PASS | exit code 0, no output |
| `node --check scripts/verify-7.1-first-contact.mjs` | PASS | exit code 0, no output |
| `node scripts/verify-7.1-first-contact.mjs` | PASS | `verify-7.1-first-contact passed` |

Decision: keep scope narrow. Runtime changes are limited to the first normal run's first-minute pacing gate, first-contact reward chain, tutorial input neutralization, and QA proof. No combat balance, new content, storage schema, rendering path, external dependency, or online telemetry change is included.

### Hypothesis

The next bottleneck is not another feature. A fresh player should experience the core verb as a cause-and-effect chain: kill safely, record a usable 3 seconds, deploy the echo, open a phase rift with the past self, and receive the first upgrade because of that cooperation.

### Files Changed

- `AGENTS.md`
- `js/game.js`
- `sw.js`
- `index.html`
- `VERSION.txt`
- `scripts/verify-7.1-first-contact.mjs`
- `scripts/verify-6.11-control.mjs`
- `scripts/verify-6.9.mjs`
- release docs and `CHECKSUMS.sha256`

### Checks

| Check | Result | Evidence |
|---|---|---|
| `node scripts/verify-7.1-first-contact.mjs` before implementation | FAIL EXPECTED | missing onboarding status, first-contact hooks, metadata, and wave pressure pause |
| `node --check js/game.js` | PASS | exit code 0, no output |
| `node --check js/control-bindings.js` | PASS | exit code 0, no output |
| `node --check sw.js` | PASS | exit code 0, no output |
| `node --check scripts/verify-7.1-first-contact.mjs` | PASS | exit code 0, no output |
| `node scripts/verify-7.1-first-contact.mjs` | PASS | `verify-7.1-first-contact passed` |
| Prior regression suite | PASS | `verify-first-run-coach`, `verify-6.11-control`, `verify-6.10-hardening`, `verify-route-layout`, `verify-ui-readability`, `verify-7.0-render`, `verify-asset-pack`, `verify-6.9` passed |
| `CHECKSUMS.sha256` verify | PASS | `checksum verify OK (59 files)` |

### Before / After

| Area | Before | After |
|---|---|---|
| First-run pressure | Normal wave could spawn while the field coach was still teaching the core verb | First-contact gate pauses normal wave elapsed/threat/spawns until the first upgrade is chosen |
| First phase-rift payoff | Coach completion and first upgrade were loosely related | Dedicated first-contact target grants exactly one first upgrade from the first phase rift |
| Tutorial step transition | Held input could leak into the next step | Keyboard, pointer, touch, and gamepad must be neutral for 0.15s before progress/input resumes |
| QA proof | First-run coach and PRISM were tested separately | `verify-7.1-first-contact` tests the full fresh-save first-contact chain and cleanup paths |
