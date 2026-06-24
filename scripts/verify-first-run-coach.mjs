import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const files = {
  html: read('index.html'),
  css: read('css/style.css'),
  game: read('js/game.js'),
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
  if (ext === '.ogg') return 'audio/ogg';
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
  check('field coach DOM exists', files.html.includes('id="fieldCoach"') && files.html.includes('id="fieldCoachDismiss"'));
  check('field coach CSS exists', files.css.includes('.field-coach') && files.css.includes('body.choice-open') && files.css.includes('.field-coach-progress'));
  check('field coach save flag is normalized', files.game.includes('fieldCoachSeen: false') && files.game.includes('source.fieldCoachSeen === true'));
  check('field coach runtime status is exposed', files.game.includes('fieldCoach: getFieldCoachStatus()') && files.game.includes('startFieldCoachProbe'));
  check('field coach is normal-run scoped', files.game.includes('wantsFieldCoachAfterTutorial') && files.game.includes('!forceTutorial && !wantsTutorial'));
}

async function waitForQa(page, baseUrl) {
  await page.goto(`${baseUrl}/index.html?qa=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__echoRiftQA && window.echoRiftStatus);
}

async function startCoach(page) {
  await page.evaluate(() => window.__echoRiftQA.startFieldCoachProbe());
  await page.waitForFunction(() => window.echoRiftStatus?.fieldCoach?.active === true);
  return page.evaluate(() => window.echoRiftStatus);
}

async function inspectCoachLayout(page) {
  return page.evaluate(() => {
    const coach = document.querySelector('#fieldCoach');
    const rect = coach.getBoundingClientRect();
    const styles = getComputedStyle(coach);
    const centerElements = document.elementsFromPoint(window.innerWidth / 2, window.innerHeight / 2)
      .map((node) => node.id || node.className || node.tagName)
      .filter(Boolean);
    const fontSize = (selector) => Number.parseFloat(getComputedStyle(document.querySelector(selector)).fontSize) || 0;
    return {
      visible: !coach.classList.contains('hidden') && styles.display !== 'none' && styles.visibility !== 'hidden',
      rect: {
        left: Number(rect.left.toFixed(1)),
        top: Number(rect.top.toFixed(1)),
        right: Number(rect.right.toFixed(1)),
        bottom: Number(rect.bottom.toFixed(1)),
        width: Number(rect.width.toFixed(1)),
        height: Number(rect.height.toFixed(1)),
      },
      centerElements,
      fonts: {
        title: fontSize('#fieldCoachTitle'),
        body: fontSize('#fieldCoachBody'),
        hint: fontSize('#fieldCoachHint'),
      },
      pointerEvents: styles.pointerEvents,
      dismissPointerEvents: getComputedStyle(document.querySelector('#fieldCoachDismiss')).pointerEvents,
    };
  });
}

async function runBehaviorProbe(page, baseUrl) {
  await waitForQa(page, baseUrl);
  const initial = await startCoach(page);
  check('coach starts in normal playing state', initial.state === 'playing' && initial.fieldCoach?.key === 'record', JSON.stringify(initial.fieldCoach));
  check('coach does not start tutorial', !initial.tutorial?.active, JSON.stringify(initial.tutorial));

  await page.evaluate(() => {
    window.__echoRiftQA.fillEchoPattern(0, 183);
    window.__echoRiftQA.tick(3, true);
  });
  await page.waitForFunction(() => window.echoRiftStatus?.fieldCoach?.key === 'deploy');
  const afterRecord = await page.evaluate(() => window.echoRiftStatus.fieldCoach);
  check('record step advances from real echo buffer', afterRecord.key === 'deploy', JSON.stringify(afterRecord));

  await page.evaluate(() => {
    window.__echoRiftQA.readyEcho();
    window.__echoRiftQA.activateEcho();
    window.__echoRiftQA.tick(3, true);
  });
  await page.waitForFunction(() => window.echoRiftStatus?.fieldCoach?.key === 'pair');
  const afterDeploy = await page.evaluate(() => window.echoRiftStatus);
  check('deploy step advances from real echo activation', afterDeploy.fieldCoach?.key === 'pair' && afterDeploy.echoRecorder?.activations >= 1, JSON.stringify(afterDeploy.fieldCoach));

  const target = await page.evaluate(() => window.__echoRiftQA.spawnPhaseRiftTarget(2400));
  await page.evaluate((id) => {
    window.__echoRiftQA.phaseRiftHit(id, 'present', 30);
    window.__echoRiftQA.phaseRiftHit(id, 'echo', 30);
    window.__echoRiftQA.tick(3, true);
  }, target.id);
  await page.waitForFunction(() => window.echoRiftStatus?.fieldCoach?.active === false && window.echoRiftStatus?.fieldCoach?.seen === true);
  const completed = await page.evaluate(() => ({
    fieldCoach: window.echoRiftStatus.fieldCoach,
    phaseRift: window.echoRiftStatus.phaseRift,
    save: JSON.parse(localStorage.getItem('echoRiftSaveV2') || '{}'),
  }));
  check('pair step completes from actual phase-rift counter', completed.phaseRift.procs >= 1 && completed.fieldCoach.reason === 'complete', JSON.stringify(completed));
  check('field coach completion persists', completed.save.fieldCoachSeen === true, JSON.stringify(completed.save));

  await page.evaluate(() => window.__echoRiftQA.start());
  await page.waitForTimeout(1200);
  const repeat = await page.evaluate(() => window.echoRiftStatus.fieldCoach);
  check('coach does not repeat after seen flag', repeat.active === false && repeat.seen === true, JSON.stringify(repeat));
}

async function runDismissProbe(page, baseUrl) {
  await waitForQa(page, baseUrl);
  await startCoach(page);
  await page.locator('#fieldCoachDismiss').click();
  await page.waitForFunction(() => window.echoRiftStatus?.fieldCoach?.active === false);
  const dismissed = await page.evaluate(() => ({
    fieldCoach: window.echoRiftStatus.fieldCoach,
    save: JSON.parse(localStorage.getItem('echoRiftSaveV2') || '{}'),
  }));
  check('coach can be dismissed and persisted', dismissed.fieldCoach.reason === 'dismissed' && dismissed.save.fieldCoachSeen === true, JSON.stringify(dismissed));
}

async function runScopeProbe(page, baseUrl) {
  await waitForQa(page, baseUrl);
  await page.evaluate(() => {
    localStorage.removeItem('echoRiftSaveV2');
    window.__echoRiftQA.startTraining();
  });
  await page.waitForFunction(() => window.echoRiftStatus?.tutorial?.active === true);
  await page.waitForTimeout(600);
  const training = await page.evaluate(() => window.echoRiftStatus);
  check('manual training does not show field coach', training.tutorial?.active === true && training.fieldCoach?.active === false, JSON.stringify(training.fieldCoach));
}

async function runLayoutChecks(browser, baseUrl) {
  const viewports = [
    { width: 2048, height: 1024, name: 'desktop-qhd' },
    { width: 390, height: 844, name: 'portrait-mobile' },
    { width: 667, height: 375, name: 'short-landscape' },
  ];
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.setDefaultTimeout(3500);
    const consoleErrors = [];
    page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    page.on('pageerror', (err) => consoleErrors.push(err.message));
    await waitForQa(page, baseUrl);
    await startCoach(page);
    const layout = await inspectCoachLayout(page);
    check(`coach visible ${viewport.name}`, layout.visible, JSON.stringify(layout));
    check(`coach stays in viewport ${viewport.name}`, layout.rect.left >= -1 && layout.rect.top >= -1 && layout.rect.right <= viewport.width + 1 && layout.rect.bottom <= viewport.height + 1, JSON.stringify(layout.rect));
    check(`coach leaves playfield center clear ${viewport.name}`, !layout.centerElements.some((item) => String(item).includes('fieldCoach')), JSON.stringify(layout.centerElements));
    check(`coach text readable ${viewport.name}`, layout.fonts.title >= 15 && layout.fonts.body >= 9.5 && layout.fonts.hint >= 9, JSON.stringify(layout.fonts));
    check(`coach does not intercept general aiming ${viewport.name}`, layout.pointerEvents === 'none' && layout.dismissPointerEvents === 'auto', JSON.stringify(layout));
    check(`browser console has no errors ${viewport.name}`, consoleErrors.length === 0, consoleErrors.join('\n'));
    await context.close();
  }
}

runStaticChecks();
const { server, baseUrl } = await startServer();
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  page.setDefaultTimeout(3500);
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => consoleErrors.push(err.message));
  await runBehaviorProbe(page, baseUrl);
  await runDismissProbe(page, baseUrl);
  await runScopeProbe(page, baseUrl);
  check('browser console has no errors behavior probes', consoleErrors.length === 0, consoleErrors.join('\n'));
  await context.close();
  await runLayoutChecks(browser, baseUrl);
} catch (err) {
  failures.push(`browser checks threw: ${err.stack || err.message}`);
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

if (failures.length) {
  console.error(`verify-first-run-coach failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('verify-first-run-coach passed');
