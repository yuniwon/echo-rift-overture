import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const files = {
  css: read('css/style.css'),
  game: read('js/game.js'),
  html: read('index.html'),
};

const failures = [];
function check(name, condition, detail = '') {
  if (!condition) failures.push(`${name}${detail ? `: ${detail}` : ''}`);
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
    server.listen(0, '127.0.0.1', () => resolve({ server, baseUrl: `http://127.0.0.1:${server.address().port}` }));
  });
}

function runStaticChecks() {
  check('cross-screen readability CSS marker exists', files.css.includes('PRISM cross-screen readability pass'));
  check('upgrade cards remain article containers', files.game.includes("document.createElement('article')") && files.game.includes('upgrade-select') && files.game.includes('upgrade-lock'));
  check('HUD roots remain present', files.html.includes('id="hud"') && files.html.includes('id="abilityHud"') && files.html.includes('id="perfHud"'));
  check('route readability pass remains present', files.css.includes('PRISM route readability pass'));
}

async function waitForQa(page, baseUrl) {
  await page.goto(`${baseUrl}/index.html?qa=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__echoRiftQA && window.echoRiftStatus);
}

function everyAtLeast(values, floor) {
  return values.length > 0 && values.every((value) => value >= floor);
}

async function openUpgradeDraft(page, baseUrl) {
  await waitForQa(page, baseUrl);
  await page.evaluate(() => {
    window.__echoRiftQA.showDraft(
      ['magnet', 'regen', 'coreHunter', 'echoCount'],
      ['common', 'uncommon', 'rare', 'epic'],
    );
  });
  await page.waitForFunction(() => window.echoRiftStatus?.state === 'upgrade' && document.querySelectorAll('.upgrade-card').length === 4);
}

async function inspectUpgrade(page) {
  return page.evaluate(() => {
    const visible = (node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const fontSize = (selector) => [...document.querySelectorAll(selector)]
      .filter(visible)
      .map((node) => Number.parseFloat(getComputedStyle(node).fontSize) || 0);
    const rectOf = (node) => {
      const rect = node.getBoundingClientRect();
      return {
        left: Number(rect.left.toFixed(1)),
        top: Number(rect.top.toFixed(1)),
        right: Number(rect.right.toFixed(1)),
        bottom: Number(rect.bottom.toFixed(1)),
        width: Number(rect.width.toFixed(1)),
        height: Number(rect.height.toFixed(1)),
      };
    };
    const overflow = [];
    for (const node of [...document.querySelectorAll('.upgrade-card, .upgrade-effect, .upgrade-detail, .upgrade-analysis, .upgrade-path, .upgrade-card-footer, .build-summary, .reroll-btn')]) {
      const style = getComputedStyle(node);
      const allowsX = style.overflowX === 'auto' || style.overflowX === 'scroll';
      const allowsY = style.overflowY === 'auto' || style.overflowY === 'scroll';
      if ((node.scrollWidth > node.clientWidth + 2 && !allowsX) || (node.scrollHeight > node.clientHeight + 2 && !allowsY)) {
        overflow.push({
          className: node.className,
          scrollWidth: node.scrollWidth,
          clientWidth: node.clientWidth,
          scrollHeight: node.scrollHeight,
          clientHeight: node.clientHeight,
        });
      }
    }
    const cards = [...document.querySelectorAll('.upgrade-card')];
    return {
      cardCount: cards.length,
      panel: rectOf(document.querySelector('.upgrade-panel')),
      screen: rectOf(document.querySelector('#upgradeScreen')),
      cards: cards.map(rectOf),
      overflow,
      pageScroll: {
        x: document.scrollingElement.scrollWidth - window.innerWidth,
        y: document.scrollingElement.scrollHeight - window.innerHeight,
      },
      fonts: {
        title: fontSize('.upgrade-title-wrap h3'),
        effect: fontSize('.upgrade-effect'),
        detail: fontSize('.upgrade-detail'),
        bodyStrong: fontSize('.upgrade-analysis b, .upgrade-power, .upgrade-path b'),
        label: fontSize('.upgrade-rarity, .upgrade-family, .upgrade-badge, .upgrade-analysis span, .upgrade-level, .upgrade-path span, .upgrade-path small, .upgrade-lock, .upgrade-select span, .upgrade-select kbd, .choice-footer'),
        toolbar: fontSize('.build-summary, .reroll-btn b, .reroll-btn small'),
      },
    };
  });
}

async function checkUpgradeClicks(page) {
  return page.evaluate(() => {
    const qa = window.__echoRiftQA;
    qa.showDraft(['magnet', 'regen', 'coreHunter', 'echoCount'], ['common', 'uncommon', 'rare', 'epic']);
    document.querySelector('.upgrade-card .upgrade-title-wrap')?.click();
    const bodyClick = { state: window.echoRiftStatus.state, choices: window.echoRiftStatus.choices.length };

    qa.showDraft(['magnet', 'regen', 'coreHunter', 'echoCount'], ['common', 'uncommon', 'rare', 'epic']);
    document.querySelector('.upgrade-card .upgrade-lock')?.click();
    const lockClick = { state: window.echoRiftStatus.state, locked: window.echoRiftStatus.lockedChoiceIds.length, choices: window.echoRiftStatus.choices.length };

    qa.showDraft(['magnet', 'regen', 'coreHunter', 'echoCount'], ['common', 'uncommon', 'rare', 'epic']);
    document.querySelector('.upgrade-card .upgrade-select')?.click();
    const selectClick = { state: window.echoRiftStatus.state, choices: window.echoRiftStatus.choices.length };
    return { bodyClick, lockClick, selectClick };
  });
}

async function openCombat(page, baseUrl) {
  await waitForQa(page, baseUrl);
  await page.evaluate(() => {
    const qa = window.__echoRiftQA;
    qa.start();
    qa.skipTraining();
    qa.tick(12, true);
    document.querySelector('#waveBanner')?.classList.add('hidden');
    const perf = document.querySelector('#perfHud');
    if (perf) {
      perf.classList.remove('hidden');
      perf.textContent = 'FPS 165\\n렌더 1.00x\\n적 15 · 탄환 15\\n긴 프레임 감지 0';
    }
  });
  await page.waitForFunction(() => window.echoRiftStatus?.state === 'playing' && !document.querySelector('#hud')?.classList.contains('hidden'));
}

async function inspectHud(page) {
  return page.evaluate(() => {
    const visible = (node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const fontSize = (selector) => [...document.querySelectorAll(selector)]
      .filter(visible)
      .map((node) => Number.parseFloat(getComputedStyle(node).fontSize) || 0);
    const rectOf = (node) => {
      const rect = node.getBoundingClientRect();
      return {
        className: node.id || node.className,
        left: Number(rect.left.toFixed(1)),
        top: Number(rect.top.toFixed(1)),
        right: Number(rect.right.toFixed(1)),
        bottom: Number(rect.bottom.toFixed(1)),
        width: Number(rect.width.toFixed(1)),
        height: Number(rect.height.toFixed(1)),
      };
    };
    const rects = [...document.querySelectorAll('.hud-module, .ability-module, .perf-hud')]
      .filter(visible)
      .map(rectOf);
    const overlaps = [];
    for (let i = 0; i < rects.length; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) {
        const a = rects[i];
        const b = rects[j];
        const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (x > 2 && y > 2) overlaps.push([a.className, b.className, Number((x * y).toFixed(1))]);
      }
    }
    const centerElements = document.elementsFromPoint(window.innerWidth / 2, window.innerHeight / 2)
      .map((node) => node.id || node.className || node.tagName)
      .filter(Boolean);
    const centerBlocked = centerElements.some((value) => /hud|ability|perf|banner/i.test(String(value)));
    const occupiedArea = rects.reduce((sum, rect) => sum + rect.width * rect.height, 0);
    return {
      rects,
      overlaps,
      centerElements,
      centerBlocked,
      occupiedRatio: Number((occupiedArea / (window.innerWidth * window.innerHeight)).toFixed(4)),
      fonts: {
        resourceLabel: fontSize('.resource-heading span'),
        resourceValue: fontSize('.resource-heading strong'),
        missionIndex: fontSize('.mission-index, .mission-index b'),
        waveName: fontSize('.wave-name'),
        missionRule: fontSize('.mission-rule, .route-text'),
        telemetryLabel: fontSize('.hud-telemetry span'),
        telemetryValue: fontSize('.hud-telemetry strong'),
        abilityTitle: fontSize('.ability-copy b'),
        abilityState: fontSize('.ability-state, .ability-key, .echo-recorder-head b'),
        perf: fontSize('.perf-hud'),
      },
    };
  });
}

async function runBrowserChecks() {
  const { server, baseUrl } = await startServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const viewports = [
      { width: 2048, height: 1024, name: 'desktop-qhd' },
      { width: 1366, height: 768, name: 'laptop' },
      { width: 390, height: 844, name: 'portrait-mobile' },
      { width: 667, height: 375, name: 'short-landscape' },
    ];

    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      page.setDefaultTimeout(4500);
      const consoleErrors = [];
      page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      page.on('pageerror', (err) => consoleErrors.push(err.message));

      await openUpgradeDraft(page, baseUrl);
      const upgrade = await inspectUpgrade(page);
      const desktop = viewport.width >= 900;
      check(`upgrade has four cards ${viewport.name}`, upgrade.cardCount === 4, JSON.stringify(upgrade));
      check(`upgrade title readable ${viewport.name}`, everyAtLeast(upgrade.fonts.title, desktop ? 25 : 22), JSON.stringify(upgrade.fonts.title));
      check(`upgrade primary effect readable ${viewport.name}`, everyAtLeast(upgrade.fonts.effect, desktop ? 18 : 16), JSON.stringify(upgrade.fonts.effect));
      check(`upgrade detail readable ${viewport.name}`, everyAtLeast(upgrade.fonts.detail, desktop ? 14 : 13), JSON.stringify(upgrade.fonts.detail));
      check(`upgrade strong body text readable ${viewport.name}`, everyAtLeast(upgrade.fonts.bodyStrong, desktop ? 14 : 12), JSON.stringify(upgrade.fonts.bodyStrong));
      check(`upgrade labels avoid microtext ${viewport.name}`, everyAtLeast(upgrade.fonts.label, desktop ? 12 : 10.5), JSON.stringify(upgrade.fonts.label));
      check(`upgrade toolbar readable ${viewport.name}`, everyAtLeast(upgrade.fonts.toolbar, desktop ? 13 : 12), JSON.stringify(upgrade.fonts.toolbar));
      check(`upgrade text does not overflow ${viewport.name}`, upgrade.overflow.length === 0, JSON.stringify(upgrade.overflow));
      check(`upgrade page has no unintended horizontal scroll ${viewport.name}`, upgrade.pageScroll.x <= 2, JSON.stringify(upgrade.pageScroll));
      if (viewport.width >= 1800) {
        check(`desktop upgrade cards fit viewport ${viewport.name}`, upgrade.cards.every((rect) => rect.bottom <= upgrade.screen.bottom - 24), JSON.stringify({ cards: upgrade.cards, screen: upgrade.screen }));
      }
      if (desktop) {
        check(`desktop upgrade panel starts in viewport ${viewport.name}`, upgrade.panel.top >= -1 && upgrade.panel.left >= 0, JSON.stringify(upgrade.panel));
      }
      const clickProbe = await checkUpgradeClicks(page);
      check(`upgrade body click selects ${viewport.name}`, clickProbe.bodyClick.state === 'playing' && clickProbe.bodyClick.choices === 0, JSON.stringify(clickProbe.bodyClick));
      check(`upgrade lock click does not select ${viewport.name}`, clickProbe.lockClick.state === 'upgrade' && clickProbe.lockClick.locked === 1, JSON.stringify(clickProbe.lockClick));
      check(`upgrade select button selects ${viewport.name}`, clickProbe.selectClick.state === 'playing' && clickProbe.selectClick.choices === 0, JSON.stringify(clickProbe.selectClick));

      await openCombat(page, baseUrl);
      const hud = await inspectHud(page);
      if (desktop) {
        check(`HUD resource labels readable ${viewport.name}`, everyAtLeast(hud.fonts.resourceLabel, 12), JSON.stringify(hud.fonts.resourceLabel));
        check(`HUD resource values readable ${viewport.name}`, everyAtLeast(hud.fonts.resourceValue, 16), JSON.stringify(hud.fonts.resourceValue));
        check(`HUD mission index readable ${viewport.name}`, everyAtLeast(hud.fonts.missionIndex, 12), JSON.stringify(hud.fonts.missionIndex));
        check(`HUD wave name readable ${viewport.name}`, everyAtLeast(hud.fonts.waveName, 18), JSON.stringify(hud.fonts.waveName));
        check(`HUD mission rule readable ${viewport.name}`, everyAtLeast(hud.fonts.missionRule, 12), JSON.stringify(hud.fonts.missionRule));
        check(`HUD telemetry labels readable ${viewport.name}`, everyAtLeast(hud.fonts.telemetryLabel, 12), JSON.stringify(hud.fonts.telemetryLabel));
        check(`HUD telemetry values readable ${viewport.name}`, everyAtLeast(hud.fonts.telemetryValue, 16), JSON.stringify(hud.fonts.telemetryValue));
        check(`HUD ability titles readable ${viewport.name}`, everyAtLeast(hud.fonts.abilityTitle, 15), JSON.stringify(hud.fonts.abilityTitle));
        check(`HUD ability states readable ${viewport.name}`, everyAtLeast(hud.fonts.abilityState, 11), JSON.stringify(hud.fonts.abilityState));
        check(`performance HUD readable ${viewport.name}`, everyAtLeast(hud.fonts.perf, 12), JSON.stringify(hud.fonts.perf));
      } else {
        check(`mobile visible HUD text remains legible ${viewport.name}`, [
          ...hud.fonts.resourceLabel,
          ...hud.fonts.resourceValue,
          ...hud.fonts.abilityTitle,
          ...hud.fonts.abilityState,
        ].every((size) => size >= 9), JSON.stringify(hud.fonts));
      }
      check(`HUD modules do not overlap ${viewport.name}`, hud.overlaps.length === 0, JSON.stringify(hud.overlaps));
      check(`HUD leaves center playfield clear ${viewport.name}`, !hud.centerBlocked, JSON.stringify(hud.centerElements));
      check(`HUD occupies restrained area ${viewport.name}`, hud.occupiedRatio <= (desktop ? 0.18 : 0.24), JSON.stringify(hud));
      check(`browser console has no errors ${viewport.name}`, consoleErrors.length === 0, consoleErrors.join('\n'));
      await context.close();
    }
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

runStaticChecks();
await runBrowserChecks().catch((err) => failures.push(`browser checks threw: ${err.stack || err.message}`));

if (failures.length) {
  console.error(`verify-ui-readability failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('verify-ui-readability passed');
