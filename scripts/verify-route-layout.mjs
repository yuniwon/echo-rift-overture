import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const files = {
  game: read('js/game.js'),
  html: read('index.html'),
  css: read('css/style.css'),
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
  check('route cards use compact main wrapper', files.game.includes('route-card-main'));
  check('route cards expose input key near title', files.game.includes('route-choice-key'));
  check('route cards include compact fact grid', files.game.includes('route-card-facts'));
  check('route cards include risk meter', files.game.includes('route-card-meter'));
  check('route card summary is intentionally concise', files.game.includes('routeCardImpactSummary') && !files.game.includes('routeForecastSummary(forecast,6)'));
  check('route readability CSS is present', files.css.includes('PRISM route readability pass'));
  check('route hint has close-by forecast label', files.html.includes('routeHint') && files.css.includes('.route-hint strong'));
  check('previewing route card has no inset double ring', !/\.route-card\.previewing\s*\{[^}]*inset/s.test(files.css));
}

async function openRouteScreen(page, baseUrl) {
  await page.goto(`${baseUrl}/index.html?qa=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__echoRiftQA && window.echoRiftStatus);
  await page.evaluate(() => {
    const qa = window.__echoRiftQA;
    qa.start();
    qa.skipTraining();
    qa.openRoute(2);
  });
  await page.waitForFunction(() => window.echoRiftStatus?.state === 'route' && document.querySelectorAll('.route-card').length === 3);
}

async function runBrowserChecks() {
  const { server, baseUrl } = await startServer();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const viewports = [
      { width: 2048, height: 1024 },
      { width: 1366, height: 768 },
      { width: 390, height: 844 },
      { width: 667, height: 375 },
    ];
    for (const viewport of viewports) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      page.setDefaultTimeout(3500);
      const consoleErrors = [];
      page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
      page.on('pageerror', (err) => consoleErrors.push(err.message));

      await openRouteScreen(page, baseUrl);
      const probe = await page.evaluate(() => {
        const cards = [...document.querySelectorAll('.route-card')];
        const first = cards[0];
        const firstStyle = getComputedStyle(first);
        const facts = cards.map((card) => card.querySelectorAll('.route-card-facts .route-effect').length);
        const keyLabels = cards.map((card) => card.querySelector('.route-choice-key')?.textContent?.trim() || '');
        const meters = cards.map((card) => card.querySelector('.route-card-meter')?.getAttribute('aria-label') || '');
        const routeGridRect = document.querySelector('.route-grid')?.getBoundingClientRect();
        const fontSize = (selector) => [...document.querySelectorAll(selector)].map((node) => Number.parseFloat(getComputedStyle(node).fontSize) || 0);
        const cardRects = cards.map((card) => {
          const rect = card.getBoundingClientRect();
          return { width: Number(rect.width.toFixed(1)), height: Number(rect.height.toFixed(1)) };
        });
        const overflow = [];
        for (const node of [...document.querySelectorAll('.route-card, .route-preview, .route-run-summary')]) {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          const allowsVerticalScroll = style.overflowY === 'auto' || style.overflowY === 'scroll';
          const allowsHorizontalScroll = style.overflowX === 'auto' || style.overflowX === 'scroll';
          const badHorizontal = node.scrollWidth > node.clientWidth + 2 && !allowsHorizontalScroll;
          const badVertical = node.scrollHeight > node.clientHeight + 2 && !allowsVerticalScroll;
          if (badHorizontal || badVertical) {
            overflow.push({
              className: node.className,
              width: Number(rect.width.toFixed(1)),
              height: Number(rect.height.toFixed(1)),
              scrollWidth: node.scrollWidth,
              clientWidth: node.clientWidth,
              scrollHeight: node.scrollHeight,
              clientHeight: node.clientHeight,
            });
          }
        }
        return {
          count: cards.length,
          facts,
          keyLabels,
          meters,
          firstBoxShadow: firstStyle.boxShadow,
          overflow,
          routeGridHeight: Number((routeGridRect?.height || 0).toFixed(1)),
          routePanelRect: (() => {
            const rect = document.querySelector('.route-panel')?.getBoundingClientRect();
            return rect ? { top: Number(rect.top.toFixed(1)), bottom: Number(rect.bottom.toFixed(1)), height: Number(rect.height.toFixed(1)), viewport: window.innerHeight } : null;
          })(),
          cardRects,
          hint: document.querySelector('#routeHint')?.textContent || '',
          fonts: {
            cardTitle: fontSize('.route-card h3'),
            cardBody: fontSize('.route-tagline, .route-card-facts .route-effect b'),
            cardLabel: fontSize('.route-card-facts .route-effect span, .route-risk, .route-choice-key, .route-final-grade'),
            previewMetric: fontSize('.forecast-metric b, .forecast-metric span'),
            hint: fontSize('#routeHint, #routeHint strong, #routeHint span'),
          },
        };
      });

      check(`route card count ${viewport.width}x${viewport.height}`, probe.count === 3, JSON.stringify(probe));
      check(`route cards expose 1-3 key labels ${viewport.width}x${viewport.height}`, probe.keyLabels.join(',') === '1,2,3', JSON.stringify(probe.keyLabels));
      check(`route cards expose three fact blocks ${viewport.width}x${viewport.height}`, probe.facts.every((count) => count === 3), JSON.stringify(probe.facts));
      check(`route cards expose risk meters ${viewport.width}x${viewport.height}`, probe.meters.every(Boolean), JSON.stringify(probe.meters));
      check(`route selected state is not double-ring inset ${viewport.width}x${viewport.height}`, !probe.firstBoxShadow.includes('inset'), probe.firstBoxShadow);
      check(`route text containers do not overflow ${viewport.width}x${viewport.height}`, probe.overflow.length === 0, JSON.stringify(probe.overflow));
      check(`route hint is forecast-labelled ${viewport.width}x${viewport.height}`, probe.hint.includes('FORECAST LOCKED'), probe.hint);
      check(`route card titles are readable ${viewport.width}x${viewport.height}`, probe.fonts.cardTitle.every((size) => size >= (viewport.width >= 900 ? 26 : 22)), JSON.stringify(probe.fonts.cardTitle));
      check(`route card decision text is readable ${viewport.width}x${viewport.height}`, probe.fonts.cardBody.every((size) => size >= 16), JSON.stringify(probe.fonts.cardBody));
      check(`route card labels are not microtext ${viewport.width}x${viewport.height}`, probe.fonts.cardLabel.every((size) => size >= 12), JSON.stringify(probe.fonts.cardLabel));
      check(`route preview metrics are readable ${viewport.width}x${viewport.height}`, probe.fonts.previewMetric.every((size) => size >= 14), JSON.stringify(probe.fonts.previewMetric));
      check(`route hint is readable ${viewport.width}x${viewport.height}`, probe.fonts.hint.every((size) => size >= 13), JSON.stringify(probe.fonts.hint));

      if (viewport.width >= 900) {
        check(`desktop route panel fits viewport ${viewport.width}x${viewport.height}`, probe.routePanelRect && probe.routePanelRect.top >= -1 && probe.routePanelRect.bottom <= probe.routePanelRect.viewport + 1, JSON.stringify(probe.routePanelRect));
        check(`desktop route cards fit readable text ${viewport.width}x${viewport.height}`, probe.cardRects.every((rect) => rect.height <= 280), JSON.stringify(probe.cardRects));
      }

      await page.locator('.route-card').nth(1).click();
      await page.waitForFunction(() => window.echoRiftStatus?.state === 'playing');
      check(`route click selects card ${viewport.width}x${viewport.height}`, await page.evaluate(() => window.echoRiftStatus?.state === 'playing'));
      check(`browser console has no errors ${viewport.width}x${viewport.height}`, consoleErrors.length === 0, consoleErrors.join('\n'));
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
  console.error(`verify-route-layout failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('verify-route-layout passed');
