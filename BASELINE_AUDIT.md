# ECHO RIFT 7.0 PRISM Baseline Audit

Date: 2026-06-24

Branch: `prism/render-performance-7.0`

Baseline commit: `b7f2067968127360dc6812e86f3e1ea6558adad5`

Build audited: `6.11.1 / CONTROL`

## Scope

This audit records the pre-change renderer and quality-downgrade state for the PRISM performance pass. The target is narrow: keep the existing Canvas 2D neon combat language while removing hot-path `ctx.shadowBlur` use and making automatic quality downgrade primarily frame-time based.

## Source Findings

| Area | Current state before PRISM |
|---|---|
| Version/cache | `GAME_VERSION = '6.11.1'`; service worker cache `echo-rift-control-v6.11.1`. |
| Glow helper | `setGlow(color, blur)` writes `ctx.shadowColor` and positive `ctx.shadowBlur` when quality is above 0 and bullet density is not over 420. |
| Glow reset | `clearGlow()` writes `ctx.shadowBlur = 0` and `ctx.shadowColor = 'transparent'`. |
| Player bullets | `drawPlayerBullets()` groups projectiles, sets `globalCompositeOperation = 'lighter'`, then calls `setGlow(color, sample.crit ? 14 : 8)` before batched trails. Shape branches for current arrows and echo diamonds are present. |
| Enemy bullets | `drawEnemyBullets()` groups by color, calls `setGlow(color, 9)` before trails, then draws hollow ring/core shape branches. |
| Particles | `drawParticles()` calls `setGlow(sample.color, Math.min(7, sample.glow))` for high-quality small particle groups. |
| Other combat effects | Shockwaves, pickups, lasers, echoes, enemies, player aura, links, floaters, minimap, offscreen warnings, and crosshair also call `setGlow()`. |
| Gradient creation | Radial gradients are already cached for nebula/vignette, but there is no projectile glow sprite cache. |
| Quality downgrade | `updateQuality(frameDt)` computes `scenePressure` and `pressureTrip`, then downgrades on `(pressureTrip || frameTrip)`; later FPS-window downgrade also exists. |
| Sticky behavior | The one-way automatic quality comment exists; `applyQualityTier()` preserves `autoQualityLocked = quality === 0` for auto mode. |
| QA surface | `window.__echoRiftQA` exists behind `?qa=1`, but no deterministic render benchmark hook exists yet. |

## Pre-Change Static Red Test

Command:

```text
node scripts/verify-7.0-render.mjs
```

Observed result before production renderer implementation:

```text
verify-7.0-render failed (28)
```

Representative expected failures:

- `GAME_VERSION is 7.0.0`
- `pre-render glow cache exists`
- `setGlow no longer touches shadowBlur`
- `ctx.shadowBlur is absent from runtime source: 3`
- `quality downgrade computes measured frame ms`
- `QA render benchmark hook exists`
- `browser checks threw: page.evaluate: TypeError: qa.renderBenchmark is not a function`

This is the intended RED state for the PRISM verifier.

## Pre-Change Render Benchmark

Because the benchmark hook did not exist in 6.11.1, the baseline was measured with a Playwright route that injected a temporary in-memory QA method into the served `js/game.js`. The repository files were not modified for this measurement.

Scenario:

- Browser: headless Chromium via Playwright
- Viewport: 1366 x 768
- Quality: forced high (`quality = 2`)
- Reduced motion: false
- Enemy bullets: 160
- Particles: 70
- Warmup: 30 render frames
- Measured frames: 90 render frames
- Update simulation: not advanced during measurement; render-only cost is isolated

Result:

| Metric | 6.11.1 baseline |
|---|---:|
| Enemy bullets | 160 |
| Particles | 70 |
| Measured frames | 90 |
| Warmup frames excluded | 30 |
| Average render frame | 64.644 ms |
| Max render frame | 3091.700 ms |
| Min render frame | 0.100 ms |
| Positive `shadowBlur` writes during measured frames | 720 |
| Console/page errors | 0 |

Notes:

- The very high max frame is a headless Chromium outlier and should not be read as a player-facing high-refresh result.
- The meaningful baseline signal is that the synthetic bullet/particle scene performs hundreds of positive `shadowBlur` writes in the render path.
- PRISM after-measurement must use the committed `__echoRiftQA.renderBenchmark()` hook with the same scenario and report relative results, while marking real device/high-refresh confirmation as manual.
