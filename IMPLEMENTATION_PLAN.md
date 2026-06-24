# ECHO RIFT 7.0 PRISM Implementation Plan

## Goal

Ship a narrow rendering-performance release: preserve the existing neon combat read while replacing hot-path Canvas 2D shadow blur with pre-rendered glow sprite draws, and change automatic quality downgrade so measured frame time is the primary trigger.

## Non-Goals

- No new enemies, upgrades, bosses, route rules, or balance tuning.
- No WebGL, framework, bundler, CDN, online telemetry, or external runtime dependency.
- No broad `game.js` module split in this pass.
- No removal of 6.8 projectile shape language or combat palette options.

## Sequence

1. Add `scripts/verify-7.0-render.mjs` and confirm it fails against 6.11.1 for the expected PRISM requirements.
2. Add a small glow sprite cache near existing render cache state:
   - build the radial glow sprite once;
   - cache tinted variants by color and quality radius bucket;
   - keep all gradient creation outside projectile/particle draw loops.
3. Replace `setGlow()` / `clearGlow()` with lightweight active-glow state that never writes `ctx.shadowBlur`.
4. Add `drawGlowSprite()` and call it from the hot projectile and particle paths before existing geometry draws:
   - player trail/head groups;
   - enemy trail/ring groups;
   - particle groups.
5. Preserve shape branches:
   - current bullets as arrows;
   - echo bullets as diamonds;
   - enemy bullets as hollow rings plus cores;
   - palette and high-contrast branches unchanged.
6. Change `updateQuality(frameDt)`:
   - compute frame milliseconds and sustained frame-time trip;
   - remove `pressureTrip` as a downgrade trigger;
   - keep object pressure as diagnostics only if useful;
   - keep grace window, manual fixed mode, reduced motion handling, and sticky one-way auto downgrade.
7. Add QA diagnostics:
   - `window.echoRiftStatus.renderPerf`;
   - `window.__echoRiftQA.renderBenchmark({ enemyBullets, particles, frames, warmup, seed })`;
   - return average/max/min frame time, glow pass count, shadow blur use count, quality, DPR, and object counts.
8. Update release metadata and docs:
   - `GAME_VERSION = '7.0.0'`;
   - `CACHE_NAME = 'echo-rift-prism-v7.0.0'`;
   - README, CHANGELOG, TECHNICAL_NOTES, QA_REPORT, QUALITY_REPORT, PROGRESS, VERSION.
9. Regenerate `CHECKSUMS.sha256` after all files are final.
10. Run syntax, PRISM verifier, existing 6.9/6.10/6.11 verifiers, viewport smoke, checksum verification, and forge done gate.

## Acceptance Evidence Targets

- Hot projectile/particle draw paths contain no `ctx.shadowBlur` assignment or radial gradient creation.
- Runtime source contains no `ctx.shadowBlur` writes.
- `renderBenchmark` returns `shadowBlurUses: 0` and positive `glowPasses`.
- The same 160 enemy bullet / 70 particle / 90 measured frame benchmark is recorded before and after.
- Existing control, hardening, and intent regression verifiers still pass.

## Manual Limits To Report

- Headless Chromium timing is useful for relative comparison only.
- High-refresh monitor, low-end mobile, and physical device performance remain manual confirmation items.
