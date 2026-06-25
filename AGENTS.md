# AGENTS.md - ECHO RIFT repository instructions

## Product contract

ECHO RIFT is a dependency-free, offline-first Canvas 2D browser action roguelite. The defining mechanic is recording roughly three seconds of movement, aim, fire, and dash, then deploying that snapshot as an echo and pairing present/echo hits to trigger a phase rift.

Preserve these contracts unless the active task explicitly changes them:

- Static HTML/CSS/JavaScript and offline PWA operation.
- No runtime CDN, framework, account, server, or online telemetry dependency.
- Existing save keys and backward compatibility: `echoRiftSaveV2`, `echoRiftSettingsV1`, and current run-history/export behavior.
- Keyboard, mouse, touch, and gamepad input paths.
- Reduced-motion, high-contrast, combat palette, projectile-shape, and UI scaling settings.
- Boss-intro simulation freeze and route-forecast accuracy.
- Card locking, partial reroll, import rollback, and existing QA hooks.

## Working method

1. Read `README.md`, `TECHNICAL_NOTES.md`, `QA_REPORT.md`, `QUALITY_REPORT.md`, and the active work order before editing.
2. Inspect the current implementation and reuse existing state, rendering, audio, pooling, and QA patterns.
3. Add or update a behavior-based verifier before or alongside implementation. Do not rely only on source-string assertions.
4. Make the smallest coherent change that satisfies the acceptance criteria. Do not broadly rewrite or modularize `js/game.js` during a focused gameplay pass.
5. Avoid wall-clock-only gameplay transitions when a deterministic game-state transition can be used.
6. Any one-shot reward must be idempotent and impossible to duplicate through repeated hits, retries, pause/resume, or QA calls.
7. Clean up temporary enemies, bullets, targets, input locks, CSS state, and timers on success, timeout, dismissal, death, restart, and return-to-menu paths.
8. Keep comments focused on invariants and non-obvious race prevention.
9. Update release metadata and documentation only after behavior and regressions pass.
10. Never claim a hardware test was performed unless it was actually performed.

## Required validation

At minimum run all checks that exist in the repository and are relevant to touched code, including:

```bash
node --check js/game.js
node --check js/control-bindings.js
node --check sw.js
node scripts/verify-7.0-render.mjs
node scripts/verify-first-run-coach.mjs
node scripts/verify-asset-pack.mjs
node scripts/verify-ui-readability.mjs
node scripts/verify-route-layout.mjs
node scripts/verify-6.9.mjs
node scripts/verify-6.10-hardening.mjs
node scripts/verify-6.11-control.mjs
```

Also run the new verifier introduced by the active task.

## Final response format

Report:

- concise implementation summary;
- files changed;
- important design choices and invariants;
- exact commands run and pass/fail results;
- measurable before/after behavior where available;
- remaining manual or hardware checks;
- any deliberate deviation from the work order and its reason.
