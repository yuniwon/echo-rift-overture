import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const files = {
  game: read('js/game.js'),
  sw: read('sw.js'),
  readme: read('README.md'),
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

async function waitForQa(page, baseUrl) {
  await page.goto(`${baseUrl}/index.html?qa=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__echoRiftQA && window.echoRiftStatus);
}

async function startFreshFirstContact(page) {
  await page.evaluate(() => {
    localStorage.removeItem('echoRiftSaveV2');
    localStorage.removeItem('echoRiftSettingsV1');
    localStorage.removeItem('echoRiftRunHistoryV1');
    window.__echoRiftQA.start();
  });
  await page.waitForFunction(() => window.echoRiftStatus?.tutorial?.active === true);
  await page.evaluate(() => window.__echoRiftQA.skipTraining());
  await page.waitForFunction(() => window.echoRiftStatus?.fieldCoach?.active === true, null, { timeout: 3500 });
  return page.evaluate(() => window.echoRiftStatus);
}

async function advanceCoachToPair(page) {
  await page.evaluate(() => {
    window.__echoRiftQA.fillEchoPattern(1, 183);
    window.__echoRiftQA.tick(5, true);
  });
  await page.waitForFunction(() => window.echoRiftStatus?.fieldCoach?.key === 'deploy');
  await page.evaluate(() => {
    window.__echoRiftQA.readyEcho();
    window.__echoRiftQA.activateEcho();
    window.__echoRiftQA.tick(5, true);
  });
  await page.waitForFunction(() => window.echoRiftStatus?.fieldCoach?.key === 'pair');
  return page.evaluate(() => window.echoRiftStatus);
}

function runStaticChecks() {
  check('7.1 runtime version is present', files.game.includes("GAME_VERSION = '7.1.0'"));
  check('FIRST CONTACT docs are present', files.readme.includes('FIRST CONTACT'));
  check('7.1 cache name is present', files.sw.includes('echo-rift-first-contact-v7.1.0'));
  check('onboarding status is exposed', files.game.includes('onboarding: getRunOnboardingStatus()'));
  check('first-contact QA hooks are exposed', files.game.includes('startFirstContactProbe') && files.game.includes('tutorialNeutralGateProbe'));
}

async function runFirstContactProbe(page, baseUrl) {
  await waitForQa(page, baseUrl);
  const initial = await startFreshFirstContact(page);
  check('fresh save enters field coach after basic training', initial.fieldCoach?.active === true && initial.fieldCoach?.key === 'record', JSON.stringify(initial.fieldCoach));
  check('first-contact onboarding status exists', Boolean(initial.onboarding), JSON.stringify(initial.onboarding));
  check('first-contact pacing gate starts active', initial.onboarding?.active === true && initial.onboarding?.pacingGate === true, JSON.stringify(initial.onboarding));
  check('warmup target spawns during record step', Number.isFinite(initial.onboarding?.firstCombatTargetSpawnAt), JSON.stringify(initial.onboarding));
  check('active enemies before first upgrade stay bounded', (initial.onboarding?.maxActiveEnemiesBeforeFirstUpgrade || 0) <= 2, JSON.stringify(initial.onboarding));

  const pausedBefore = await page.evaluate(() => ({
    time: window.echoRiftStatus.time,
    threat: window.echoRiftStatus.threat,
    waveElapsed: window.echoRiftStatus.waveElapsed,
    spawnRemaining: window.echoRiftStatus.spawnRemaining,
    onboarding: window.echoRiftStatus.onboarding,
  }));
  await page.evaluate(() => window.__echoRiftQA.tick(180, true));
  const pausedAfter = await page.evaluate(() => ({
    time: window.echoRiftStatus.time,
    threat: window.echoRiftStatus.threat,
    waveElapsed: window.echoRiftStatus.waveElapsed,
    spawnRemaining: window.echoRiftStatus.spawnRemaining,
    onboarding: window.echoRiftStatus.onboarding,
    enemies: window.echoRiftStatus.enemies,
  }));
  check('normal wave threat is paused by first-contact gate', pausedAfter.threat === pausedBefore.threat, JSON.stringify({ pausedBefore, pausedAfter }));
  check('normal wave elapsed time is paused by first-contact gate', pausedAfter.waveElapsed === pausedBefore.waveElapsed, JSON.stringify({ pausedBefore, pausedAfter }));
  check('normal wave spawn budget is not consumed by first-contact gate', pausedAfter.spawnRemaining === pausedBefore.spawnRemaining, JSON.stringify({ pausedBefore, pausedAfter }));
  check('first-contact enemy pressure remains small before reward', pausedAfter.enemies <= 2 && pausedAfter.onboarding?.maxActiveEnemiesBeforeFirstUpgrade <= 2, JSON.stringify(pausedAfter));

  const warmup = await page.evaluate(() => {
    const targets = window.__echoRiftQA.firstContactTargets();
    if (targets.warmupId) window.__echoRiftQA.phaseRiftHit(targets.warmupId, 'present', 999);
    window.__echoRiftQA.tick(8, true);
    return { targets, status: window.echoRiftStatus };
  });
  check('warmup kill is recorded as first kill', Number.isFinite(warmup.status.onboarding?.firstKillAt), JSON.stringify(warmup));
  check('warmup kill does not open upgrade by itself', warmup.status.state === 'playing' && warmup.status.choices.length === 0, JSON.stringify(warmup.status));

  const pair = await advanceCoachToPair(page);
  check('pair step uses dedicated phase target', pair.fieldCoach?.focusTarget?.active === true && pair.onboarding?.phaseTargetId === pair.fieldCoach?.focusTarget?.enemyId, JSON.stringify({ fieldCoach: pair.fieldCoach, onboarding: pair.onboarding }));
  check('echo activation metric is first-write only', Number.isFinite(pair.onboarding?.firstEchoActivationAt), JSON.stringify(pair.onboarding));

  const reward = await page.evaluate(() => {
    const targetId = window.echoRiftStatus.onboarding?.phaseTargetId || window.echoRiftStatus.fieldCoach?.focusTarget?.enemyId;
    const first = window.__echoRiftQA.phaseRiftHit(targetId, 'present', 20);
    const second = window.__echoRiftQA.phaseRiftHit(targetId, 'echo', 20);
    window.__echoRiftQA.tick(45, true);
    return { targetId, first, second, status: window.echoRiftStatus };
  });
  check('phase target rift claims first-contact reward', reward.status.onboarding?.firstContactRewardClaimed === true, JSON.stringify(reward.status.onboarding));
  check('first phase rift metric is recorded', Number.isFinite(reward.status.onboarding?.firstPhaseRiftAt), JSON.stringify(reward.status.onboarding));
  check('first upgrade opens from first-contact reward', reward.status.state === 'upgrade' && reward.status.choices.length > 0 && Number.isFinite(reward.status.onboarding?.firstUpgradeOpenedAt), JSON.stringify(reward.status));
  check('reward is reserved exactly once', reward.status.onboarding?.rewardClaims === 1 && reward.status.onboarding?.reservedLevelUps === 1, JSON.stringify(reward.status.onboarding));
  check('pacing gate holds while upgrade is open', reward.status.onboarding?.pacingGate === true && !Number.isFinite(reward.status.onboarding?.pacingGateReleasedAt), JSON.stringify(reward.status.onboarding));

  const duplicate = await page.evaluate((targetId) => {
    const before = window.echoRiftStatus;
    const present = window.__echoRiftQA.phaseRiftHit(targetId, 'present', 999);
    const echo = window.__echoRiftQA.phaseRiftHit(targetId, 'echo', 999);
    window.__echoRiftQA.tick(8, true);
    return { before, present, echo, after: window.echoRiftStatus };
  }, reward.targetId);
  check('repeated hits cannot duplicate first-contact reward', duplicate.after.onboarding?.rewardClaims === 1 && duplicate.after.level === duplicate.before.level && duplicate.after.choices.length === duplicate.before.choices.length, JSON.stringify(duplicate));

  const released = await page.evaluate(() => {
    window.__echoRiftQA.choose(0);
    window.__echoRiftQA.tick(90, true);
    return window.echoRiftStatus;
  });
  check('upgrade choice releases first-contact pacing gate', released.state === 'playing' && released.onboarding?.pacingGate === false && Number.isFinite(released.onboarding?.pacingGateReleasedAt), JSON.stringify(released));
  check('normal wave resumes after first upgrade choice', released.enemies > 0 && released.spawnRemaining < pausedBefore.spawnRemaining, JSON.stringify(released));
  check('first upgrade chosen metric is recorded', Number.isFinite(released.onboarding?.firstUpgradeChosenAt), JSON.stringify(released.onboarding));
}

async function runCleanupProbe(page, baseUrl) {
  await waitForQa(page, baseUrl);
  await page.evaluate(() => window.__echoRiftQA.startFirstContactProbe());
  await page.waitForFunction(() => window.echoRiftStatus?.fieldCoach?.active === true);
  await page.evaluate(() => window.__echoRiftQA.dismissFieldCoach());
  const dismissed = await page.evaluate(() => window.echoRiftStatus);
  check('dismiss cleans first-contact targets and releases gate', dismissed.fieldCoach?.active === false && dismissed.onboarding?.active === false && dismissed.onboarding?.tempTargetsActive === 0 && dismissed.onboarding?.firstContactRewardClaimed === false, JSON.stringify(dismissed.onboarding));

  await page.evaluate(() => window.__echoRiftQA.startFirstContactProbe());
  await page.waitForFunction(() => window.echoRiftStatus?.fieldCoach?.active === true);
  await page.evaluate(() => window.__echoRiftQA.forceFieldCoachTimeout());
  const timeout = await page.evaluate(() => window.echoRiftStatus);
  check('timeout cleans first-contact targets without marking reward', timeout.fieldCoach?.reason === 'timeout' && timeout.onboarding?.active === false && timeout.onboarding?.tempTargetsActive === 0 && timeout.onboarding?.firstContactRewardClaimed === false, JSON.stringify(timeout.onboarding));

  await page.evaluate(() => window.__echoRiftQA.startFirstContactProbe());
  await page.waitForFunction(() => window.echoRiftStatus?.fieldCoach?.active === true);
  await page.evaluate(() => window.__echoRiftQA.killPlayer());
  const death = await page.evaluate(() => window.echoRiftStatus);
  check('death cleans first-contact targets', death.state === 'gameover' && death.onboarding?.tempTargetsActive === 0, JSON.stringify(death.onboarding));
}

async function runInputNeutralProbe(page, baseUrl) {
  await waitForQa(page, baseUrl);
  const probe = await page.evaluate(() => window.__echoRiftQA.tutorialNeutralGateProbe());
  check('tutorial neutral gate probe exists', Boolean(probe), JSON.stringify(probe));
  check('held movement is suppressed until keyup and neutral delay', probe?.keyboard?.blockedMoveMag === 0 && probe?.keyboard?.releasedMoveMag > 0, JSON.stringify(probe?.keyboard));
  check('held pointer fire is suppressed until pointer release and neutral delay', probe?.pointer?.blockedFire === false && probe?.pointer?.releasedFire === true, JSON.stringify(probe?.pointer));
  check('touch state is cleared and suppressed through gate', probe?.touch?.blockedMoveMag === 0 && probe?.touch?.releasedMoveMag > 0, JSON.stringify(probe?.touch));
  check('synthetic gamepad axes are suppressed until neutral', probe?.gamepad?.blockedMoveMag === 0 && probe?.gamepad?.releasedMoveMag > 0, JSON.stringify(probe?.gamepad));
  check('tutorial progress is frozen while neutral gate is active', probe?.tutorial?.progressWhileBlocked === 0 && probe?.tutorial?.progressAfterRelease >= 0, JSON.stringify(probe?.tutorial));
}

runStaticChecks();
const { server, baseUrl } = await startServer();
let browser;
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  const page = await context.newPage();
  page.setDefaultTimeout(4500);
  const consoleErrors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  page.on('pageerror', (err) => consoleErrors.push(err.message));
  await runFirstContactProbe(page, baseUrl);
  await runCleanupProbe(page, baseUrl);
  await runInputNeutralProbe(page, baseUrl);
  check('browser console has no errors', consoleErrors.length === 0, consoleErrors.join('\n'));
  await context.close();
} catch (err) {
  failures.push(`browser checks threw: ${err.stack || err.message}`);
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

if (failures.length) {
  console.error(`verify-7.1-first-contact failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('verify-7.1-first-contact passed');
