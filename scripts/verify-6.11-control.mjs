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
  bindings: fs.existsSync(path.join(root, 'js/control-bindings.js')) ? read('js/control-bindings.js') : '',
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

function runStaticChecks() {
  check('control binding helper exists', files.bindings.includes('EchoRiftControlBindings'));
  check('control binding helper loads before game', files.html.indexOf('js/control-bindings.js') > -1 && files.html.indexOf('js/control-bindings.js') < files.html.indexOf('js/game.js'));
  check('service worker precaches control helper', files.sw.includes('./js/control-bindings.js'));
  check('settings exposes keyboard remap grid', files.html.includes('keybindGrid') && files.html.includes('resetKeyBindingsBtn'));
  check('settings normalizes keyBindings', files.game.includes('normalizeKeyBindingMap') && files.game.includes('keyBindings'));
  check('runtime status exposes key bindings', files.game.includes('keyBindings: getKeyBindingStatus()'));
  check('runtime status exposes reroll economy metrics', files.game.includes('economy: getRunEconomyStatus()'));
  check('reroll records locked card count', files.game.includes('recordRerollEconomy(locked.length'));
  check('run history can store economy summary', files.game.includes('economy: getRunEconomySummary()'));
}

async function runBrowserChecks() {
  const { server, baseUrl } = await startServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await context.newPage();
    page.setDefaultTimeout(2500);
    page.baseUrl = baseUrl;
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await waitForGame(page);

    await page.locator('#settingsBtn').click();
    const fireBindButton = page.locator('[data-keybind-action="fire"]');
    const hasFireBindButton = await fireBindButton.count() === 1;
    check('settings UI has fire remap button', hasFireBindButton);
    if (hasFireBindButton) {
      await fireBindButton.click();
      await page.keyboard.press('KeyK');
      await page.waitForTimeout(100);
      let keyProbe = await page.evaluate(() => window.echoRiftStatus.keyBindings);
      check('settings UI remaps fire to KeyK', keyProbe?.fire?.token === 'KeyK', JSON.stringify(keyProbe?.fire));
      check('remapped key binding persists to localStorage', await page.evaluate(() => {
        const settings = JSON.parse(localStorage.getItem('echoRiftSettingsV1') || '{}');
        return settings.keyBindings?.fire === 'KeyK';
      }));
      await page.reload({ waitUntil: 'load' });
      await page.waitForFunction(() => window.__echoRiftQA && window.echoRiftStatus);
      keyProbe = await page.evaluate(() => window.echoRiftStatus.keyBindings);
      check('remapped fire survives reload', keyProbe?.fire?.token === 'KeyK', JSON.stringify(keyProbe?.fire));
      await page.locator('#settingsBtn').click();
      await page.locator('#resetKeyBindingsBtn').click();
      await page.waitForTimeout(100);
      keyProbe = await page.evaluate(() => window.echoRiftStatus.keyBindings);
      check('reset restores default fire key', keyProbe?.fire?.token === 'KeyJ', JSON.stringify(keyProbe?.fire));
    }

    const rerollProbe = await page.evaluate(() => {
      const qa = window.__echoRiftQA;
      qa.showDraft(['magnet', 'regen', 'coreHunter', 'echoCount'], ['common', 'uncommon', 'rare', 'epic']);
      const cardStructure = [...document.querySelectorAll('.upgrade-card')].map((card) => ({
        tag: card.tagName,
        buttonCount: card.querySelectorAll('button').length,
        lockTag: card.querySelector('.upgrade-lock')?.tagName || null,
        selectTag: card.querySelector('.upgrade-select')?.tagName || null,
      }));
      qa.lockChoice(0);
      qa.lockChoice(2);
      const before = window.echoRiftStatus;
      qa.reroll();
      const afterReroll = window.echoRiftStatus;
      qa.choose(1);
      const afterChoose = window.echoRiftStatus;
      return {
        beforeEconomy: before.economy,
        afterEconomy: afterReroll.economy,
        afterChooseEconomy: afterChoose.economy,
        afterChoices: afterReroll.choices,
        lockedChoiceIds: afterReroll.lockedChoiceIds,
        cardStructure,
      };
    });
    check('upgrade cards are non-button containers', rerollProbe.cardStructure.every((card) => card.tag === 'ARTICLE'), JSON.stringify(rerollProbe.cardStructure));
    check('upgrade card select and lock controls are sibling buttons', rerollProbe.cardStructure.every((card) => card.buttonCount >= 2 && card.lockTag === 'BUTTON' && card.selectTag === 'BUTTON'), JSON.stringify(rerollProbe.cardStructure));
    check('reroll economy records one reroll', rerollProbe.afterEconomy?.rerollsUsed === (rerollProbe.beforeEconomy?.rerollsUsed || 0) + 1, JSON.stringify(rerollProbe.afterEconomy));
    check('reroll economy records two locked cards', rerollProbe.afterEconomy?.lastLockedCards === 2, JSON.stringify(rerollProbe.afterEconomy));
    check('reroll economy averages locked cards', rerollProbe.afterEconomy?.averageLockedCards === 2, JSON.stringify(rerollProbe.afterEconomy));
    check('post-reroll selection increments metric', rerollProbe.afterChooseEconomy?.postRerollSelections === 1, JSON.stringify(rerollProbe.afterChooseEconomy));

    const mouseChoiceProbe = await page.evaluate(() => {
      const qa = window.__echoRiftQA;
      qa.showDraft(['magnet', 'regen', 'coreHunter', 'echoCount'], ['common', 'uncommon', 'rare', 'epic']);
      document.querySelector('.upgrade-card .upgrade-title-wrap')?.click();
      const afterBodyClick = { state: window.echoRiftStatus.state, level: window.echoRiftStatus.level, choices: window.echoRiftStatus.choices.length };

      qa.showDraft(['magnet', 'regen', 'coreHunter', 'echoCount'], ['common', 'uncommon', 'rare', 'epic']);
      document.querySelector('.upgrade-card .upgrade-lock')?.click();
      const afterLockClick = { state: window.echoRiftStatus.state, level: window.echoRiftStatus.level, locked: window.echoRiftStatus.lockedChoiceIds.length, choices: window.echoRiftStatus.choices.length };

      qa.showDraft(['magnet', 'regen', 'coreHunter', 'echoCount'], ['common', 'uncommon', 'rare', 'epic']);
      document.querySelector('.upgrade-card .upgrade-select')?.click();
      const afterSelectClick = { state: window.echoRiftStatus.state, level: window.echoRiftStatus.level, choices: window.echoRiftStatus.choices.length };
      return { afterBodyClick, afterLockClick, afterSelectClick };
    });
    check('upgrade card body click selects choice', mouseChoiceProbe.afterBodyClick.state === 'playing' && mouseChoiceProbe.afterBodyClick.choices === 0, JSON.stringify(mouseChoiceProbe.afterBodyClick));
    check('upgrade lock click toggles without selecting', mouseChoiceProbe.afterLockClick.state === 'upgrade' && mouseChoiceProbe.afterLockClick.locked === 1, JSON.stringify(mouseChoiceProbe.afterLockClick));
    check('upgrade select button still selects choice', mouseChoiceProbe.afterSelectClick.state === 'playing' && mouseChoiceProbe.afterSelectClick.choices === 0, JSON.stringify(mouseChoiceProbe.afterSelectClick));

    const allLockedProbe = await page.evaluate(() => {
      const qa = window.__echoRiftQA;
      qa.showDraft(['dashCD', 'attackSpeed', 'shieldMax', 'xpBoost'], ['common', 'common', 'uncommon', 'rare']);
      const before = window.echoRiftStatus;
      for (let i = 0; i < before.choices.length; i += 1) qa.lockChoice(i);
      const locked = window.echoRiftStatus;
      qa.reroll();
      const after = window.echoRiftStatus;
      return { lockedEconomy: locked.economy, afterEconomy: after.economy, beforeRerolls: locked.rerolls, afterRerolls: after.rerolls };
    });
    check('all-locked reroll still does not spend', allLockedProbe.beforeRerolls === allLockedProbe.afterRerolls, `${allLockedProbe.beforeRerolls} -> ${allLockedProbe.afterRerolls}`);
    check('all-locked reroll is not counted as spent economy', allLockedProbe.lockedEconomy?.rerollsUsed === allLockedProbe.afterEconomy?.rerollsUsed, JSON.stringify(allLockedProbe));

    const combatProbe = await page.evaluate(() => {
      const qa = window.__echoRiftQA;
      qa.startTraining();
      qa.skipTraining();
      qa.applyUpgrade('attackSpeed', 'rare');
      qa.applyUpgrade('echoDamage', 'rare');
      qa.applyUpgrade('echoCount', 'rare');
      for (const id of ['vital', 'shield', 'regen', 'armor', 'hitInvuln', 'onKillHeal', 'onKillShield', 'dashCD', 'moveSpeed']) {
        qa.applyUpgrade(id, 'legendary');
        qa.applyUpgrade(id, 'legendary');
      }
      for (let i = 0; i < 5400; i += 1) {
        const status = qa.status();
        if (status.state === 'upgrade') qa.choose(0);
        if (status.state === 'route') qa.chooseRoute(0);
        if (status.state === 'victory') qa.continueEndless();
        qa.botStep();
        qa.tick(1);
      }
      return window.echoRiftStatus;
    });
    check('90-second combat probe advances game time', combatProbe.time >= 89, `time=${combatProbe.time}`);
    check('90-second combat probe keeps player alive', combatProbe.playerHp > 0, `hp=${combatProbe.playerHp}`);
    check('90-second combat probe uses echo or records damage', (combatProbe.echoRecorder?.activations || 0) > 0 || (combatProbe.echoRecorder?.damage || 0) > 0, JSON.stringify(combatProbe.echoRecorder));
    check('90-second combat probe keeps economy status readable', typeof combatProbe.economy?.rerollsUsed === 'number', JSON.stringify(combatProbe.economy));

    check('browser console has no errors', consoleErrors.length === 0, consoleErrors.join('\n'));
    await context.close();
  } finally {
    if (browser) await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

runStaticChecks();
await runBrowserChecks();

if (failures.length) {
  console.error('verify-6.11-control failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('verify-6.11-control passed');
