import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const files = {
  game: read('js/game.js'),
  html: read('index.html'),
  css: read('css/style.css'),
  sw: read('sw.js'),
  manifest: read('manifest.webmanifest'),
  version: read('VERSION.txt'),
  readme: read('README.md'),
  changelog: read('CHANGELOG.md'),
  technical: read('TECHNICAL_NOTES.md'),
  qa: read('QA_REPORT.md'),
};

const failures = [];
function check(name, condition, detail = '') {
  if (!condition) failures.push(`${name}${detail ? `: ${detail}` : ''}`);
}

function includes(file, text) {
  return file.includes(text);
}

function match(file, pattern) {
  return pattern.test(file);
}

function idsFromHtml(html) {
  return [...html.matchAll(/\sid=(["'])(.*?)\1/g)].map((m) => m[2]);
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

function assertNoDuplicateHtmlIds() {
  const ids = idsFromHtml(files.html);
  const seen = new Set();
  const duplicates = new Set();
  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  check('HTML ids are unique', duplicates.size === 0, [...duplicates].join(', '));
  check('HTML has many expected ids', ids.length > 190, `found ${ids.length}`);
}

function assertPartialReroll() {
  check('createUpgradeChoices accepts options', includes(files.game, 'function createUpgradeChoices(count = 4, isReroll = false, options = {})'));
  check('createUpgradeChoices filters excludeIds', match(files.game, /excludeIds[^;\n]+Set[\s\S]{0,600}excludeIds\.has\(upgrade\.id\)/));
  check('lockedUpgradeIds state exists', includes(files.game, 'lockedUpgradeIds'));
  check('locked choices rerender without reveal sound', includes(files.game, 'renderUpgradeChoices(currentUpgradeChoices, false)'));
  check('reroll preserves locked choices', match(functionBody(files.game, 'rerollUpgradeChoices'), /currentUpgradeChoices\.filter\(isChoiceLocked\)[\s\S]+createUpgradeChoices\(needed,\s*true,\s*\{\s*excludeIds\s*\}\)[\s\S]+player\.rerolls--/));
  check('reroll all-locked path does not spend', match(functionBody(files.game, 'rerollUpgradeChoices'), /locked\.length\s*>?=\s*currentUpgradeChoices\.length[\s\S]+return;/));
  check('select/open clear locks', match(functionBody(files.game, 'selectUpgrade'), /lockedUpgradeIds\.clear\(\)/) && match(functionBody(files.game, 'openUpgradeScreen'), /lockedUpgradeIds\.clear\(\)/));
  check('lock button present in card markup', includes(files.game, 'upgrade-lock') && includes(files.css, '.upgrade-lock'));
  check('QA exposes lock and reroll helpers', includes(files.game, 'lockChoice:') && includes(files.game, 'reroll: () =>'));
  check('status exposes locked ids', includes(files.game, 'lockedChoiceIds: [...lockedUpgradeIds]'));
}

function assertImportExport() {
  const exportBody = functionBody(files.game, 'exportSaveFile');
  const importBody = functionBody(files.game, 'importSaveFile');
  check('export constants exist', includes(files.game, "EXPORT_SCHEMA_VERSION = 1") && includes(files.game, 'MAX_IMPORT_BYTES = 1_000_000'));
  check('run history key exists', includes(files.game, "RUN_HISTORY_KEY = 'echoRiftRunHistoryV1'"));
  check('backup key exists', includes(files.game, 'IMPORT_BACKUP_KEY'));
  check('checksum helper uses Web Crypto SHA-256', match(functionBody(files.game, 'sha256Text'), /crypto\.subtle\.digest\(['"]SHA-256['"]/));
  check('export envelope has product/schema/version/checksum/payload', ['product: \'ECHO_RIFT\'', 'exportSchemaVersion', 'gameVersion', 'checksum', 'payload'].every((text) => includes(files.game, text)));
  check('import parser rejects >1MB', match(functionBody(files.game, 'parseImportFile'), /file\.size\s*>\s*MAX_IMPORT_BYTES/));
  check('import parser checks product/schema/payload/checksum', ['envelope.product', 'exportSchemaVersion', 'payload.save', 'checksum !== envelope.checksum'].every((text) => includes(files.game, text)));
  check('import backs up before apply', importBody.indexOf('strictSetJSON(IMPORT_BACKUP_KEY') >= 0 && importBody.indexOf('strictSetJSON(IMPORT_BACKUP_KEY') < importBody.indexOf('strictSetItem(SAVE_KEY'));
  check('import failure path does not restore over current state', !/catch[\s\S]{0,500}saveJSON\(SAVE_KEY/.test(importBody));
  check('export/import UI ids exist', ['includeSettingsExport', 'exportSaveBtn', 'importSaveInput', 'runHistoryList', 'clearRunHistoryBtn'].every((id) => includes(files.html, `id="${id}"`)));
  check('export/import events are bound', ['#exportSaveBtn', '#importSaveInput', '#clearRunHistoryBtn'].every((selector) => includes(files.game, selector)));
  check('new import/export functions do not use network send APIs', !/(fetch\s*\(|sendBeacon\s*\(|eval\s*\(|new Function\s*\()/.test(`${exportBody}\n${importBody}\n${functionBody(files.game, 'parseImportFile')}`));
}

function assertRunHistory() {
  check('run history max exists', includes(files.game, 'MAX_RUN_HISTORY = 20'));
  check('run history helpers exist', ['loadRunHistory', 'validateRunHistory', 'createRunSummary', 'appendRunHistory', 'renderRunHistory'].every((name) => includes(files.game, `function ${name}`)));
  check('run history records both outcomes', includes(functionBody(files.game, 'endGame'), "appendRunHistory('death')") && includes(functionBody(files.game, 'showVictory'), "appendRunHistory('win')"));
  check('run history has duplicate guard', includes(files.game, 'runHistoryRecorded'));
  check('startGame resets run history guard', match(functionBody(files.game, 'startGame'), /runHistoryRecorded\s*=\s*false/));
  check('run history is exported/imported', includes(files.game, 'runHistory: loadRunHistory()') && includes(files.game, 'validateRunHistory(envelope.payload.runHistory'));
  check('status exposes run history count', includes(files.game, 'runHistoryCount: loadRunHistory().length'));
}

function assertReleaseMetadata() {
  const manifest = JSON.parse(files.manifest);
  check('manifest product name is player-facing', manifest.name === 'ECHO RIFT: OVERTURE', manifest.name);
  check('service worker cache updated', includes(files.sw, "const CACHE_NAME = 'echo-rift-hardening-v6.10.0';"));
  check('title updated', includes(files.html, 'ECHO RIFT: OVERTURE'));
  check('edition badge updated', includes(files.html, 'v6.10 · HARDENING'));
  check('VERSION updated', includes(files.version, 'Version 6.10.0') && includes(files.version, 'Codename: HARDENING'));
  check('README updated', includes(files.readme, '6.10') && includes(files.readme, 'HARDENING'));
  check('CHANGELOG has 6.10.0 first section', match(files.changelog, /^# .+\r?\n\r?\n## 6\.10\.0 — OVERTURE \/ HARDENING/m));
  check('TECHNICAL_NOTES updated', includes(files.technical, '6.10') && includes(files.technical, 'verify-6.10-hardening'));
  check('QA_REPORT updated', includes(files.qa, '6.10') && includes(files.qa, 'HARDENING'));
}

assertNoDuplicateHtmlIds();
assertPartialReroll();
assertImportExport();
assertRunHistory();
assertReleaseMetadata();

if (failures.length) {
  console.error(`verify-6.9 failed (${failures.length})`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('verify-6.9 passed');
