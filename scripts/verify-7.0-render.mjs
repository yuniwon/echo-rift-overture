import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const files = {
  game: read('js/game.js'),
  html: read('index.html'),
  sw: read('sw.js'),
  manifest: read('manifest.webmanifest'),
  readme: read('README.md'),
  changelog: read('CHANGELOG.md'),
  technical: read('TECHNICAL_NOTES.md'),
  qa: read('QA_REPORT.md'),
  quality: read('QUALITY_REPORT.md'),
  version: read('VERSION.txt'),
};

const failures = [];
const args = new Set(process.argv.slice(2));

function check(name, condition, detail = '') {
  if (!condition) failures.push(`${name}${detail ? `: ${detail}` : ''}`);
}

function functionBody(source, name) {
  const start = source.indexOf(`function ${name}`);
  if (start < 0) return '';
  const signatureEnd = source.indexOf(') {', start);
  const brace = signatureEnd >= 0 ? source.indexOf('{', signatureEnd) : source.indexOf('{', start);
  if (brace < 0) return '';
  let depth = 0;
  for (let i = brace; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    else if (source[i] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  return '';
}

function mimeType(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.js' || ext === '.mjs') return 'text/javascript; charset=utf-8';
  if (ext === '.json' || ext === '.webmanifest') return 'application/json; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml; charset=utf-8';
  if (ext === '.png') return 'image/png';
  return 'application/octet-stream';
}

function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    const relative = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const target = path.normalize(path.join(root, relative));
    if (!target.startsWith(root)) {
      res.writeHead(403).end('forbidden');
      return;
    }
    fs.readFile(target, (err, buffer) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('not found');
        return;
      }
      res.writeHead(200, {
        'Content-Type': mimeType(target),
        'Cache-Control': 'no-cache',
        'Cross-Origin-Opener-Policy': 'same-origin',
      });
      res.end(buffer);
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

async function waitForGame(page, baseUrl) {
  await page.goto(`${baseUrl}/index.html?qa=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__echoRiftQA && window.echoRiftStatus);
}

function assertReleaseMetadata() {
  const manifest = JSON.parse(files.manifest);
  check('GAME_VERSION is 7.0.0', files.game.includes("const GAME_VERSION = '7.0.0';"));
  check('service worker cache is PRISM 7.0.x', /const CACHE_NAME = 'echo-rift-prism-v7\.0\.(?:0|1-assets)';/.test(files.sw));
  check('manifest remains player-facing', manifest.name === 'ECHO RIFT: OVERTURE' && /3초/.test(manifest.description), manifest.description);
  check('VERSION marks PRISM', files.version.includes('Version 7.0.0') && files.version.includes('Codename: PRISM'));
  check('README marks PRISM', files.readme.includes('7.0') && files.readme.includes('PRISM'));
  check('CHANGELOG has 7.0 section first', /^# .+\r?\n\r?\n## 7\.0\.0 — OVERTURE \/ PRISM/m.test(files.changelog));
  check('TECHNICAL_NOTES marks render verifier', files.technical.includes('verify-7.0-render'));
  check('QA_REPORT marks PRISM', files.qa.includes('7.0') && files.qa.includes('PRISM'));
  check('QUALITY_REPORT contains PRISM before/after metrics', files.quality.includes('PRISM') && files.quality.includes('Before / After') && files.quality.includes('renderBenchmark'));
}

function assertGlowRenderingContract() {
  const setGlowBody = functionBody(files.game, 'setGlow');
  const clearGlowBody = functionBody(files.game, 'clearGlow');
  const playerBody = functionBody(files.game, 'drawPlayerBullets');
  const enemyBody = functionBody(files.game, 'drawEnemyBullets');
  const particleBody = functionBody(files.game, 'drawParticles');
  const hotBodies = `${setGlowBody}\n${clearGlowBody}\n${playerBody}\n${enemyBody}\n${particleBody}`;

  check('pre-render glow cache exists', files.game.includes('glowSprites') && files.game.includes('buildGlowSprite'));
  check('glow sprite is drawn by drawImage', functionBody(files.game, 'drawGlowSprite').includes('drawImage'));
  check('glow sprite uses additive composition', functionBody(files.game, 'drawGlowSprite').includes("globalCompositeOperation = 'lighter'"));
  check('setGlow no longer touches shadowBlur', !/shadowBlur/.test(setGlowBody));
  check('clearGlow no longer touches shadowBlur', !/shadowBlur/.test(clearGlowBody));
  check('player bullet hot path has no shadowBlur', !/shadowBlur/.test(playerBody));
  check('enemy bullet hot path has no shadowBlur', !/shadowBlur/.test(enemyBody));
  check('particle hot path has no shadowBlur', !/shadowBlur/.test(particleBody));
  check('hot projectile/particle paths do not create gradients', !/createRadialGradient/.test(`${playerBody}\n${enemyBody}\n${particleBody}`));
  check('player bullets draw sprite glow', playerBody.includes('drawGlowSprite'));
  check('enemy bullets draw sprite glow', enemyBody.includes('drawGlowSprite'));
  check('particles draw sprite glow', particleBody.includes('drawGlowSprite'));
  check('ctx.shadowBlur is absent from runtime source', !/ctx\.shadowBlur/.test(files.game), (files.game.match(/ctx\.shadowBlur/g) || []).length.toString());
  check('6.8 player projectile shape branches remain', files.game.includes('appendDiamondHead') && files.game.includes('appendArrowHead') && files.game.includes('Echo bullets read as diamonds'));
  check('6.8 enemy ring branch remains', files.game.includes('Enemy bullets read as hollow rings') && enemyBody.includes('ctx.arc(b.x, b.y, b.radius, 0, TAU)'));
  check('combat palette branch remains', files.game.includes('function activeProjectilePalette') && playerBody.includes('activeProjectilePalette()') && enemyBody.includes('activeProjectilePalette()'));
  check('quality 0 and reduced motion disable decorative glow sprites', files.game.includes('settings.reducedMotion') && functionBody(files.game, 'drawGlowSprite').includes('quality === 0'));
}

function assertFrameTimeQualityContract() {
  const qualityBody = functionBody(files.game, 'updateQuality');
  const applyBody = functionBody(files.game, 'applyQualityTier');
  check('quality downgrade computes measured frame ms', /frameMs\s*=/.test(qualityBody));
  check('quality downgrade uses frame-time trip', /frameTimeTrip/.test(qualityBody));
  check('quality downgrade no longer uses pressureTrip', !/pressureTrip/.test(qualityBody));
  check('quality downgrade reason is frame-time', qualityBody.includes("applyQualityTier(quality - 1, 'frame-time'"));
  check('sticky auto quality lock remains', applyBody.includes('autoQualityLocked = quality === 0') && files.game.includes('raises quality again until the player explicitly asks for a re-measure'));
  check('manual graphics mode still bypasses auto downgrade', qualityBody.includes("settings.graphicsMode === 'auto' ? null : configuredQualityTier()"));
  check('scene pressure is not primary downgrade trigger', !/applyQualityTier\(quality - 1,\s*['"]pressure['"]/.test(qualityBody));
}

function assertQaBenchmarkContract() {
  check('QA render benchmark hook exists', files.game.includes('renderBenchmark:'));
  check('render benchmark reports glow passes', files.game.includes('glowPasses'));
  check('render benchmark spawns requested enemy bullet count', files.game.includes('enemyBullets') && files.game.includes('spawnBenchmarkEnemyBullets'));
  check('render benchmark spawns requested particle count', files.game.includes('spawnBenchmarkParticles'));
  check('status exposes render perf diagnostics', files.game.includes('renderPerf:'));
}

async function runBrowserChecks() {
  const { server, baseUrl } = await startServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const viewports = args.has('--viewports')
      ? [
          { width: 2560, height: 1440 },
          { width: 1920, height: 1080 },
          { width: 1440, height: 900 },
          { width: 1366, height: 768 },
          { width: 390, height: 844 },
          { width: 320, height: 568 },
          { width: 667, height: 375 },
        ]
      : [{ width: 1366, height: 768 }];

    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      page.setDefaultTimeout(3500);
      const consoleErrors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => consoleErrors.push(err.message));

      await waitForGame(page, baseUrl);
      const result = await page.evaluate(() => {
        const qa = window.__echoRiftQA;
        qa.start();
        qa.skipTraining();
        return qa.renderBenchmark({ enemyBullets: 160, particles: 70, frames: 45, seed: 700 });
      });
      check(`render benchmark returns requested bullet count ${viewport.width}x${viewport.height}`, result?.enemyBullets === 160, JSON.stringify(result));
      check(`render benchmark returns requested particle count ${viewport.width}x${viewport.height}`, result?.particles === 70, JSON.stringify(result));
      check(`render benchmark reports frame times ${viewport.width}x${viewport.height}`, result?.avgFrameMs > 0 && result?.maxFrameMs >= result?.avgFrameMs, JSON.stringify(result));
      check(`render benchmark reports glow passes ${viewport.width}x${viewport.height}`, result?.glowPasses > 0, JSON.stringify(result));
      check(`render benchmark reports shadow blur zero ${viewport.width}x${viewport.height}`, result?.shadowBlurUses === 0, JSON.stringify(result));
      check(`browser console has no errors ${viewport.width}x${viewport.height}`, consoleErrors.length === 0, consoleErrors.join('\n'));
      await context.close();
    }
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

assertReleaseMetadata();
assertGlowRenderingContract();
assertFrameTimeQualityContract();
assertQaBenchmarkContract();

await runBrowserChecks().catch((err) => {
  failures.push(`browser checks threw: ${err.stack || err.message}`);
});

if (failures.length) {
  console.error(`verify-7.0-render failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('verify-7.0-render passed');
