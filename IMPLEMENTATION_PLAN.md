# IMPLEMENTATION PLAN — v6.8.0 "SIGNAL"

## Single goal of this release
Combat legibility: make projectile ownership and run results readable without relying on colour alone,
and keep the start CTA reachable on short landscape screens.

## Files modified
- `js/game.js` — palette registry, two new settings, render shapes, settings bindings, version/cache string
- `index.html` — two new settings rows, `<title>`/version badge
- `css/style.css` — result-panel contrast, short-landscape menu rules
- `sw.js` / `manifest.webmanifest` / `VERSION.txt` / `README.md` / `CHANGELOG.md` / `TECHNICAL_NOTES.md` / `QA_REPORT.md`

## Existing functions / data reused
- `defaultSettings` (game.js:163), `applySettings` (259), settings change-binding block (~7589)
- `drawPlayerBullets` (6482), `drawEnemyBullets` (6512) — batched trail + head renderer
- Player bullet fields: `fromEcho`, `fromDrone`, `color`, `crit`, `radius`, `vx`, `vy`, `prevX/prevY`
- `.result-screen` / `.result-panel` (CSS 400), `.menu-command` / `#startBtn` (CSS 121+)

## New settings (with fallback + migration)
- `combatPalette`: `'default' | 'deuteranopia' | 'tritanopia' | 'mono'` (validated in `applySettings`, defaults to `default`)
- `projectileShapes`: boolean (defaults `true`, `!== false` guard)
Both are additive keys on the existing `echoRiftSettingsV1` object — `loadJSON` already merges over
`defaultSettings`, so old saves gain the new keys automatically. No save-schema bump needed.

## Rendering approach (performance-safe)
- Owner class: `echo` (fromEcho) / `main` (player + drone) / `enemy`.
- Display colour: in `default` palette keep each bullet's existing `b.color` (no visual regression); in other
  palettes remap to the palette's owner colour so ownership reads consistently.
- Shapes drawn by accumulating vertices into a **single path per owner group** (no per-bullet save/restore,
  no per-bullet `rotate`) using precomputed cos/sin — preserves the existing batched draw-call budget:
  - main → arrow head, echo → diamond head, enemy → ring outline + core.
- When `projectileShapes` is off, fall back to current arc heads. Shapes are kept even at quality 0
  (minimum shape requirement); only decorative dashed tails are dropped at low quality.
- Gameplay `b.color` is untouched, so explosion/burn/mark tint logic is unaffected.

## Save migration
None required (additive settings keys only). Existing progress/meta/highscore untouched.

## Performance risk
Shaped heads add a few `lineTo`s per bullet but stay one `fill`/`stroke` per group. Trails unchanged.
Target: no meaningful long-frame regression at 100+ projectiles.

## Accessibility risk
Goal is a net accessibility gain. Verify ownership distinguishable in `mono` palette (greyscale) by shape,
and that shapes persist under high-contrast + reduced-motion.

## Manual tests
- Toggle each palette → ownership still readable; setting persists across reload.
- Toggle projectile shapes off/on.
- Result screens (victory/death) readable over busy combat; primary stats visible at 320×568.
- Start CTA visible without scroll at 667×375, 740×360, 812×375.
- `node --check js/game.js`, `node --check sw.js`; no duplicate HTML IDs.

## Explicit non-goals this release
Mobile card density, partial reroll, save export, run history, telemetry, arena devices, second boss,
6.7 input remapping. (Recorded for later phases.)
