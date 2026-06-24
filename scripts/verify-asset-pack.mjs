import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const runStatic = args.has('--static') || !args.has('--browser');
const runBrowser = args.has('--browser') || !args.has('--static');

const assetFiles = [
  'assets/audio/kenney-ui/ui-hover.ogg',
  'assets/audio/kenney-ui/ui-select.ogg',
  'assets/audio/kenney-ui/ui-switch.ogg',
  'assets/audio/kenney-sci-fi/laser-small.ogg',
  'assets/audio/kenney-sci-fi/force-field.ogg',
  'assets/audio/kenney-sci-fi/explosion-crunch.ogg',
  'assets/audio/kenney-sci-fi/low-boom.ogg',
  'assets/images/kenney-space/impact-cloud.png',
  'assets/images/kenney-space/rift-flare.png',
  'assets/vendor/kenney/ui-audio/License.txt',
  'assets/vendor/kenney/sci-fi-sounds/License.txt',
  'assets/vendor/kenney/space-shooter-extension/License.txt',
  'THIRD_PARTY_NOTICES.md',
];

const failures = [];
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

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
  if (ext === '.txt' || ext === '.md') return 'text/plain; charset=utf-8';
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

function verifyChecksums() {
  const checksumPath = path.join(root, 'CHECKSUMS.sha256');
  if (!fs.existsSync(checksumPath)) {
    check('checksum manifest exists', false);
    return;
  }
  const entries = new Map();
  for (const line of fs.readFileSync(checksumPath, 'utf8').trim().split(/\r?\n/)) {
    const match = line.match(/^(\S+)\s+(.+)$/);
    if (match) entries.set(match[2].trim().replaceAll('\\', '/').replace(/^\.\//, ''), match[1]);
  }
  for (const file of assetFiles) {
    const expected = entries.get(file);
    check(`checksum includes ${file}`, Boolean(expected));
    if (!expected || !exists(file)) continue;
    const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex');
    check(`checksum matches ${file}`, actual === expected, `${actual} !== ${expected}`);
  }
}

function verifyStatic() {
  const game = read('js/game.js');
  const sw = read('sw.js');
  const notices = read('THIRD_PARTY_NOTICES.md');
  for (const file of assetFiles) check(`asset exists ${file}`, exists(file));
  check('Kenney UI Audio notice includes CC0 and source', notices.includes('https://kenney.nl/assets/ui-audio') && notices.includes('Creative Commons Zero'));
  check('Kenney Sci-Fi notice includes CC0 and source', notices.includes('https://kenney.nl/assets/sci-fi-sounds') && notices.includes('Creative Commons Zero'));
  check('Kenney Space notice includes CC0 and source', notices.includes('https://kenney.nl/assets/space-shooter-extension') && notices.includes('Creative Commons Zero'));
  for (const license of [
    'assets/vendor/kenney/ui-audio/License.txt',
    'assets/vendor/kenney/sci-fi-sounds/License.txt',
    'assets/vendor/kenney/space-shooter-extension/License.txt',
  ]) {
    const text = read(license);
    check(`license is CC0 ${license}`, /Creative Commons (Zero|CC0)|CC0/i.test(text) && /commercial/i.test(text));
  }
  for (const file of assetFiles) check(`service worker caches ${file}`, sw.includes(`'./${file}'`) || file === 'THIRD_PARTY_NOTICES.md' && sw.includes("'./THIRD_PARTY_NOTICES.md'"));
  check('audio manifest is local and frozen', game.includes('const THIRD_PARTY_AUDIO_ASSETS = Object.freeze') && game.includes('./assets/audio/kenney-ui/ui-hover.ogg'));
  check('image manifest is local and frozen', game.includes('const THIRD_PARTY_IMAGE_ASSETS = Object.freeze') && game.includes('./assets/images/kenney-space/impact-cloud.png'));
  check('sample loader decodes through Web Audio', game.includes('decodeAudioData') && game.includes('playSample(name'));
  check('sample status is exposed', game.includes('samples: {') && game.includes('sampleBuffers.size'));
  check('image status is exposed', game.includes('assetImageStatus') && game.includes('manifests:'));
  check('particle renderer supports asset shapes', game.includes("shape: `asset:${assetName}`") && game.includes("sample.shape.startsWith('asset:')"));
  verifyChecksums();
}

async function verifyBrowser() {
  const { server, baseUrl } = await startServer();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
  const consoleIssues = [];
  const requestIssues = [];
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) consoleIssues.push(`${message.type()}: ${message.text()}`);
  });
  page.on('pageerror', (error) => consoleIssues.push(`pageerror: ${error.message}`));
  page.on('requestfailed', (request) => {
    const url = request.url();
    if (/assets\/(audio|images|vendor)\//.test(url)) requestIssues.push(`${url}: ${request.failure()?.errorText || 'failed'}`);
  });
  try {
    await page.goto(`${baseUrl}/index.html?qa=1`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__echoRiftQA && window.echoRiftStatus);
    await page.waitForFunction(() => {
      const images = window.echoRiftStatus?.assets?.images || {};
      return images.impactCloud === 'loaded' && images.riftFlare === 'loaded';
    }, { timeout: 6000 });
    await page.mouse.click(24, 24);
    const result = await page.evaluate(async () => {
      const status = await window.__echoRiftQA.audioTest();
      const smoke = window.__echoRiftQA.assetSmoke();
      await new Promise((resolve) => setTimeout(resolve, 900));
      return {
        status: window.__echoRiftQA.audioStatus(),
        rift: window.echoRiftStatus?.assets || null,
        smoke,
      };
    });
    check('asset image status loaded in browser', result.rift?.images?.impactCloud === 'loaded' && result.rift?.images?.riftFlare === 'loaded', JSON.stringify(result.rift?.images || {}));
    check('audio samples decoded in browser', result.status.samples.loaded === result.status.samples.expected && result.status.samples.ready, JSON.stringify(result.status.samples));
    check('audio sample events fired', (result.status.events['sample:uiSelect'] || 0) > 0 && (result.status.events['sample:forceField'] || 0) > 0, JSON.stringify(result.status.events));
    check('asset smoke hook reports local manifests', Boolean(result.smoke?.manifests?.audio?.uiHover && result.smoke?.manifests?.images?.impactCloud), JSON.stringify(result.smoke || {}));
    check('no browser console asset issues', consoleIssues.length === 0, consoleIssues.join('\n'));
    check('no browser request failures', requestIssues.length === 0, requestIssues.join('\n'));
  } finally {
    await browser.close();
    server.close();
  }
}

if (runStatic) verifyStatic();
if (runBrowser) await verifyBrowser();

if (failures.length) {
  console.error(`verify-asset-pack failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`verify-asset-pack passed${runStatic && runBrowser ? '' : runStatic ? ' --static' : ' --browser'}`);
