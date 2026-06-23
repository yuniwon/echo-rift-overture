import crypto from 'node:crypto';
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
};

const failures = [];
function check(name, condition, detail = '') {
  if (!condition) failures.push(`${name}${detail ? `: ${detail}` : ''}`);
}

function sha256Text(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function buildEnvelope(payload, overrides = {}) {
  return {
    product: 'ECHO_RIFT',
    exportSchemaVersion: 1,
    gameVersion: '6.10.0',
    exportedAt: '2026-06-24T00:00:00.000Z',
    checksum: sha256Text(JSON.stringify(payload)),
    payload,
    ...overrides,
  };
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

async function waitForGame(page) {
  await page.goto(`${page.baseUrl}/index.html?qa=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__echoRiftQA && window.echoRiftStatus);
}

async function settlePage(page) {
  await page.waitForLoadState('load', { timeout: 2500 }).catch(() => {});
  await page.waitForFunction(() => document.readyState === 'complete', { timeout: 2500 }).catch(() => {});
  await page.waitForTimeout(150);
}

async function setImportFile(page, name, data) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(JSON.stringify(data), 'utf8');
  await page.locator('#importSaveInput').setInputFiles({
    name,
    mimeType: 'application/json',
    buffer,
  });
  await page.waitForTimeout(900);
  await settlePage(page);
}

function sampleSave(overrides = {}) {
  return {
    bestScore: 7,
    bestTime: 12.5,
    bestSector: 2,
    runs: 1,
    wins: 0,
    tutorialSeen: true,
    advancedTutorialSeen: false,
    cores: 3,
    totalCores: 5,
    meta: {
      vitality: 1,
      force: 0,
      cadence: 0,
      barrier: 0,
      reflex: 0,
      resonance: 0,
      memory: 0,
      luck: 0,
      salvage: 0,
      reroll: 0,
      arsenal: 0,
      defiance: 0,
    },
    ...overrides,
  };
}

function sampleSettings(overrides = {}) {
  return {
    master: 0.62,
    music: true,
    musicVolume: 0.4,
    sfxVolume: 0.8,
    uiVolume: 0.7,
    shake: true,
    reducedMotion: false,
    highContrast: false,
    autoFire: false,
    uiScale: 1.08,
    graphicsMode: 'auto',
    autoQualityTier: 2,
    showPerf: false,
    hudMode: 'adaptive',
    damageNumbers: 'full',
    rarityPatterns: true,
    echoTrail: true,
    offscreenWarnings: true,
    echoControlMode: 'adaptive',
    echoReportMode: 'adaptive',
    touchControlsMode: 'auto',
    tutorialTimingMode: 'adaptive',
    flashIntensity: 0.72,
    combatPalette: 'default',
    projectileShapes: true,
    ...overrides,
  };
}

function runStaticChecks() {
  check('viewport allows browser zoom', !files.html.includes('user-scalable=no'));
  check('import undo UI exists', files.html.includes('restoreImportBackupBtn') && files.html.includes('importBackupStatus'));
  check('import copy says integrity not safety', files.html.includes('파일 무결성 확인'));
  check('status exposes rerolls for behavior tests', files.game.includes('rerolls: player?.rerolls || 0'));
  check('settings import uses whitelist normalizer', files.game.includes('function normalizeSettingsData') && files.game.includes('return normalizeSettingsData(raw);'));
  check('save import removes unknown save fields', !/return\s*\{[\s\S]{0,200}\.\.\.source/.test(files.game));
  check('import stages before commit', files.game.includes('stageImportPayload(imported)') && files.game.indexOf('stageImportPayload(imported)') < files.game.indexOf('strictSetItem(SAVE_KEY'));
  check('import backup can be restored by UI', files.game.includes('function restoreImportBackup') && files.game.includes('#restoreImportBackupBtn'));
  check('service worker has navigate-only fallback', files.sw.includes("event.request.mode === 'navigate'") && files.sw.includes("caches.match('./index.html')"));
  check('service worker asset failures return Response.error', files.sw.includes('Response.error()'));
  check('service worker caches only ok same-origin responses', files.sw.includes('isSameOrigin(request)') && files.sw.includes('!response?.ok'));
  check('service worker awaits cache.put', /await cache\.put\(request, response\.clone\(\)\)/.test(files.sw));
}

async function runBrowserChecks() {
  const { server, baseUrl } = await startServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    page.baseUrl = baseUrl;
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await waitForGame(page);
    const rerollProbe = await page.evaluate(() => {
      const qa = window.__echoRiftQA;
      qa.showDraft(['magnet', 'regen', 'coreHunter', 'echoCount'], ['common', 'uncommon', 'rare', 'epic']);
      const before = window.echoRiftStatus;
      const beforeChoices = before.choices.map((choice) => ({ ...choice }));
      const beforeRerolls = before.rerolls;
      qa.lockChoice(0);
      qa.lockChoice(2);
      const after = qa.reroll();
      return {
        beforeChoices,
        afterChoices: after.choices.map((choice) => ({ ...choice })),
        locked: after.lockedChoiceIds,
        beforeRerolls,
        afterRerolls: window.echoRiftStatus.rerolls,
      };
    });
    check('partial reroll keeps locked slot 0 id', rerollProbe.afterChoices[0]?.id === rerollProbe.beforeChoices[0]?.id);
    check('partial reroll keeps locked slot 0 rarity', rerollProbe.afterChoices[0]?.rarity === rerollProbe.beforeChoices[0]?.rarity);
    check('partial reroll keeps locked slot 2 id', rerollProbe.afterChoices[2]?.id === rerollProbe.beforeChoices[2]?.id);
    check('partial reroll spends one reroll', rerollProbe.afterRerolls === Math.max(0, rerollProbe.beforeRerolls - 1), `${rerollProbe.beforeRerolls} -> ${rerollProbe.afterRerolls}`);

    const allLockedProbe = await page.evaluate(() => {
      const qa = window.__echoRiftQA;
      qa.showDraft(['dashCD', 'attackSpeed', 'shieldMax', 'xpBoost'], ['common', 'common', 'uncommon', 'rare']);
      const before = window.echoRiftStatus;
      for (let i = 0; i < before.choices.length; i += 1) qa.lockChoice(i);
      const beforeLocked = window.echoRiftStatus;
      qa.reroll();
      const after = window.echoRiftStatus;
      return {
        beforeChoices: beforeLocked.choices,
        afterChoices: after.choices,
        beforeRerolls: beforeLocked.rerolls,
        afterRerolls: after.rerolls,
      };
    });
    check('all-locked reroll keeps choices', JSON.stringify(allLockedProbe.beforeChoices) === JSON.stringify(allLockedProbe.afterChoices));
    check('all-locked reroll does not spend', allLockedProbe.beforeRerolls === allLockedProbe.afterRerolls);

    const previousSave = sampleSave({ bestScore: 41, cores: 9 });
    await page.evaluate((save) => {
      localStorage.clear();
      localStorage.setItem('echoRiftSaveV2', JSON.stringify(save));
    }, previousSave);
    const importPayload = {
      save: sampleSave({
        bestScore: 1234,
        bestSector: 6,
        tutorialSeen: true,
        injected: 'remove-me',
        meta: { ...sampleSave().meta, vitality: 4, reroll: 99, force: 'bad', defiance: -2 },
      }),
      settings: sampleSettings({
        master: 0.42,
        music: false,
        uiScale: 99,
        graphicsMode: 'invalid',
        highContrast: true,
        injected: 'remove-me',
      }),
      runHistory: [{ outcome: 'win', endedAt: '2026-06-24T00:00:00.000Z', score: 100, sector: 6, duration: 120 }],
    };
    await setImportFile(page, 'valid-import.json', buildEnvelope(importPayload));
    const importProbe = await page.evaluate(() => {
      const save = JSON.parse(localStorage.getItem('echoRiftSaveV2'));
      const settings = JSON.parse(localStorage.getItem('echoRiftSettingsV1'));
      const history = JSON.parse(localStorage.getItem('echoRiftRunHistoryV1'));
      const backup = JSON.parse(localStorage.getItem('echoRiftImportBackupV1'));
      return { save, settings, history, backupExists: Boolean(backup?.save) };
    });
    check('import writes normalized save', importProbe.save.bestScore === 1234 && importProbe.save.bestSector === 6);
    check('import removes unknown save fields', !Object.prototype.hasOwnProperty.call(importProbe.save, 'injected'));
    check('import clamps meta values', importProbe.save.meta.reroll === 3 && importProbe.save.meta.force === 0 && importProbe.save.meta.defiance === 0);
    check('import writes normalized settings', importProbe.settings.master === 0.42 && importProbe.settings.music === false && importProbe.settings.graphicsMode === 'auto');
    check('import removes unknown settings', !Object.prototype.hasOwnProperty.call(importProbe.settings, 'injected'));
    check('import keeps bounded settings', importProbe.settings.uiScale === 1.6);
    check('import writes run history', Array.isArray(importProbe.history.list) && importProbe.history.list.length === 1);
    check('import creates backup', importProbe.backupExists);

    await page.locator('#settingsBtn').click();
    check('restore import backup button enabled', await page.locator('#restoreImportBackupBtn').isEnabled());
    await page.locator('#restoreImportBackupBtn').click();
    await page.waitForTimeout(900);
    await settlePage(page);
    const undoProbe = await page.evaluate(() => ({
      save: JSON.parse(localStorage.getItem('echoRiftSaveV2')),
      backup: localStorage.getItem('echoRiftImportBackupV1'),
    }));
    check('import undo restores previous save', undoProbe.save.bestScore === previousSave.bestScore && undoProbe.save.cores === previousSave.cores);
    check('import undo clears backup', undoProbe.backup === null);

    const beforeReject = await page.evaluate(() => localStorage.getItem('echoRiftSaveV2'));
    const badPayload = { save: sampleSave({ bestScore: 999 }), settings: null, runHistory: [] };
    const damaged = buildEnvelope(badPayload);
    damaged.payload.save.bestScore = 1000;
    await setImportFile(page, 'damaged.json', damaged);
    const afterDamaged = await page.evaluate(() => localStorage.getItem('echoRiftSaveV2'));
    check('damaged checksum import is rejected', afterDamaged === beforeReject);

    await setImportFile(page, 'future.json', buildEnvelope(badPayload, { exportSchemaVersion: 999 }));
    const afterFuture = await page.evaluate(() => localStorage.getItem('echoRiftSaveV2'));
    check('future schema import is rejected', afterFuture === beforeReject);

    await setImportFile(page, 'too-large.json', Buffer.alloc(1_000_010, 0x20));
    const afterLarge = await page.evaluate(() => localStorage.getItem('echoRiftSaveV2'));
    check('oversized import is rejected', afterLarge === beforeReject);

    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'load' });
    await page.waitForFunction(() => window.__echoRiftQA && window.echoRiftStatus);
    const bossProbe = await page.evaluate(() => {
      const qa = window.__echoRiftQA;
      qa.start();
      qa.skipTraining();
      qa.startBossIntro(6);
      const before = window.echoRiftStatus;
      const damage = qa.bossIntroDamageProbe(999);
      qa.tick(90);
      const after = window.echoRiftStatus;
      return { before, after, damage };
    });
    check('boss intro damage probe applies no damage', bossProbe.damage?.applied === false && bossProbe.damage?.after.hp === bossProbe.damage?.before.hp);
    check('boss intro freezes game time', bossProbe.after.time === bossProbe.before.time);
    check('boss intro preserves hp and shield while ticking', bossProbe.after.playerHp === bossProbe.before.playerHp && bossProbe.after.shield === bossProbe.before.shield);
    check('boss intro remains protected during early tick', bossProbe.after.bossIntro?.playerInvulnerable === true);

    const routeProbe = await page.evaluate(() => {
      const qa = window.__echoRiftQA;
      qa.start();
      qa.skipTraining();
      qa.openRoute(2);
      const before = window.echoRiftStatus;
      const forecast = before.routeForecasts[0];
      qa.chooseRoute(0);
      const after = window.echoRiftStatus;
      return { forecast, modifier: after.modifierStats };
    });
    for (const field of ['baseId', 'hp', 'damage', 'speed', 'spawn', 'count', 'bulletSpeed', 'fireRate', 'eliteChance', 'xp', 'core']) {
      check(`route forecast matches actual ${field}`, routeProbe.forecast?.[field] === routeProbe.modifier?.[field], `${routeProbe.forecast?.[field]} vs ${routeProbe.modifier?.[field]}`);
    }

    check('browser behavior run has no console/page errors', consoleErrors.length === 0, consoleErrors.join(' | '));
    await browser.close();
    browser = null;
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

runStaticChecks();
await runBrowserChecks();

if (failures.length) {
  console.error(`verify-6.10-hardening failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('verify-6.10-hardening passed');
