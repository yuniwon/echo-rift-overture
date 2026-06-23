# ECHO RIFT — BASELINE AUDIT (pre-6.9.0)

Audited source: `main-8nq3th` handoff branch before INTENT implementation. Baseline release was **6.8.0 — SIGNAL**.

## Verified Present Before 6.9

| Area | Status | Evidence |
|---|---|---|
| Upgrade draft generation | Present | `createUpgradeChoices(count = 4, isReroll = false)` |
| Full reroll | Present | `rerollUpgradeChoices()` consumed one reroll and regenerated all choices |
| Save key compatibility | Present | `SAVE_KEY = 'echoRiftSaveV2'`, `SETTINGS_KEY = 'echoRiftSettingsV1'` |
| Settings validation pattern | Present | `defaultSettings` → `applySettings()` → event bindings |
| Run ending hooks | Present | `endGame()` for death, `showVictory()` for win |
| Run recap values | Present | `buildRunRecap()`, `strongestFamilies()`, echo/phase-rift counters |
| QA status hook | Present | `window.echoRiftStatus` with current choices and combat/readability state |
| 6.8 SIGNAL readability | Present | `combatPalette`, `projectileShapes`, shaped projectile rendering |
| Offline PWA | Present | `sw.js`, `manifest.webmanifest`, no external dependencies |

## Not Present Before 6.9

| Feature | Baseline status |
|---|---|
| Card lock / partial reroll | Absent |
| `createUpgradeChoices` external exclude ids | Absent |
| Save export/import JSON envelope | Absent |
| Import checksum and 1MB validation | Absent |
| Import backup key | Absent |
| Local run history key and list UI | Absent |
| 6.9 release metadata | Absent |

## Decision

The 6.9 handoff's single goal is **selection control and data safety**. The implemented scope is:

1. P0 card lock and partial reroll.
2. P0 offline save export/import with checksum validation and backup-before-apply.
3. P1 bounded local run history, included because it is small and shares the export envelope.

Telemetry, network services, new combat content, and Phase 3+ backlog remain excluded.

## Baseline Checks

- `node --check js/game.js` — OK before implementation
- `node --check sw.js` — OK before implementation
- `node scripts/verify-6.9.mjs` — failed before implementation, as expected, on missing 6.9 features and metadata
