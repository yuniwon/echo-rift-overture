# ECHO RIFT — BASELINE AUDIT (pre-6.8.0)

Audited source: working tree at `js/game.js` (8,308 lines), `index.html`, `css/style.css`.
Method: code inspection + `node --check`. Version file reports **6.6.0 — BOSS INTRO SUSPENSION**.

## Verified present (do not rebuild)

| Area | Status | Evidence |
|---|---|---|
| Echo snapshot lock + preview parity | Present | `input.getEchoLockedSamples()`, `drawRecordedEchoPath` (game.js ~6551) |
| Crossfire "phase rift" reward | Present | `registerPhaseRiftHit` (~5535) |
| Route final forecast | Present | route preview DOM (`#routePreviewName`) |
| Tutorial split (basic/advanced) | Present | `advancedTutorialSeen` save field |
| Boss intro simulation freeze (6.6) | Present | VERSION.txt + boss intro banner CSS |
| Accessibility: high contrast, reduced motion, UI scale, flash intensity, rarity patterns | Present | `defaultSettings` (163), `applySettings` (259) |
| Auto-quality sticky tier (no runtime up-shift) | Present | `autoQualityTier`, `configuredQualityTier` (331) |
| Legacy localStorage compatibility | Present | `loadSaveData` reads `LEGACY_SAVE_KEY` |
| Offline PWA | Present | `sw.js`, `manifest.webmanifest` |

## NOT present (gaps vs. handoff "expected baseline")

| Feature | Status |
|---|---|
| 6.7 input remapping (keyboard/gamepad rebinds, deadzone, sensitivity, axis invert, touch handedness) | **Absent** — no `keyBindings`/`gamepadDeadzone`/`touchHandedness` in source |
| Combat colour-vision palettes | Absent (`combatPalette` = 0 hits) |
| Projectile owner shapes | Absent — bullets distinguished by colour/alpha only (`drawPlayerBullets` 6482, `drawEnemyBullets` 6512) |
| Mobile card density modes | Absent (`cardDensity` = 0 hits) |
| Partial reroll / save export / run history / telemetry | Absent |

## Decision

The handoff's prioritized **remaining-work backlog (MASTER_SPEC §4) begins at Phase 1 "SIGNAL"**; the 6.7
input-remapping work is listed only as an assumed baseline, not as a scoped backlog phase. Following the
"first incomplete backlog item, one goal per release" rule, this release implements **Phase 1 SIGNAL (v6.8.0)**:

1. Projectile owner shapes (colour-independent)
2. Combat colour-vision palettes
3. Result-panel contrast / readability
4. Short-landscape menu start CTA

Mobile card density (P1) is deferred to a follow-up patch (6.8.1/6.9) per the handoff's split guidance.
The 6.7 input-remapping gap is recorded here and surfaced to the user; it is **not** silently skipped.

## Baseline checks

- `node --check js/game.js` → OK
- `node --check sw.js` → OK
