# ECHO RIFT 6.9 "INTENT" — 수정 코드 예시 (Codex)

> 이 코드는 **이 저장소의 실제 함수명에 맞춘 참조 구현**이다. 변수/DOM 이름은 실측했으나,
> 편집 직전 해당 줄을 다시 열어 최종 확인한다. 줄 번호는 v6.8.0 머지 시점 기준.

---

## 1. 카드 고정 · 부분 리롤

### 1.1 `createUpgradeChoices`에 exclude 추가 (`js/game.js:3398`)

```js
// 변경 전 시그니처: function createUpgradeChoices(count = 4, isReroll = false)
function createUpgradeChoices(count = 4, isReroll = false, options = {}) {
  const excludeIds = options.excludeIds instanceof Set ? options.excludeIds : null;
  const pool = upgrades.filter((u) => upgradeEligible(u) && !(excludeIds && excludeIds.has(u.id)));
  const chosen = [];
  const excluded = new Set();
  while (chosen.length < count && excluded.size < pool.length) {
    const candidates = pool.filter((upgrade) => !excluded.has(upgrade.id));
    if (!candidates.length) break;
    const upgrade = weightedChoice(candidates, upgradeWeight);
    excluded.add(upgrade.id);
    const routeFloor = activeDraftGuarantee ? rarityAllowedForLevel(activeDraftGuarantee) : 'common';
    const rarityKey = rollRarity(maxRarityKey(upgrade.rarityFloor || 'common', routeFloor));
    chosen.push({ upgrade, rarityKey, quality: rarityInfo[rarityKey] });
  }
  // …이하 pity/guarantee 블록은 그대로 유지…
  return chosen;
}
```

> 주의: pity 블록(`uncommon/rare/legendary` 보정)은 `chosen` 길이에 따라 동작하므로,
> 부분 리롤로 `count`가 줄어들어도 안전하다. 그대로 둔다.

### 1.2 잠금 상태 + 토글 (`currentUpgradeChoices` 근처 `:1612`)

```js
let currentUpgradeChoices = [];
const lockedUpgradeIds = new Set();   // upgrade.id 기준

function isChoiceLocked(choice) {
  return lockedUpgradeIds.has(choice.upgrade.id);
}

function toggleUpgradeLock(choice) {
  const id = choice.upgrade.id;
  if (lockedUpgradeIds.has(id)) lockedUpgradeIds.delete(id);
  else lockedUpgradeIds.add(id);
  renderUpgradeChoices(currentUpgradeChoices, false); // 잠금 시각 갱신, 리빌 사운드 없이
}
```

### 1.3 카드에 잠금 버튼 (`renderUpgradeChoices` 내부 `:3524~`)

`button.innerHTML = ...` 직후, `UI.upgradeChoices.appendChild(button)` 전에 삽입:

```js
const locked = isChoiceLocked(choice);
button.classList.toggle('locked', locked);

const lock = document.createElement('button');
lock.type = 'button';
lock.className = 'upgrade-lock';
lock.setAttribute('aria-pressed', String(locked));
lock.setAttribute('aria-label', `${upgrade.name} ${locked ? '잠금 해제' : '잠금'}`);
lock.innerHTML = uiIcon(locked ? 'lock' : 'unlock'); // 아이콘 심볼 없으면 텍스트 '🔒/🔓' 대체 가능
lock.addEventListener('click', (event) => {
  event.stopPropagation();      // 카드 선택과 분리
  toggleUpgradeLock(choice);
});
button.appendChild(lock);
```

리롤 버튼 비활성 조건도 보강(같은 함수 내 `#rerollBtn` 설정부 `:3519`):

```js
const allLocked = choices.length > 0 && choices.every(isChoiceLocked);
$('#rerollBtn').disabled = player.rerolls <= 0 || allLocked;
```

### 1.4 부분 리롤로 교체 (`rerollUpgradeChoices` `:3610`)

```js
function rerollUpgradeChoices() {
  if (gameState !== 'upgrade' || !player || player.rerolls <= 0) return;

  const locked = currentUpgradeChoices.filter(isChoiceLocked);
  if (locked.length >= currentUpgradeChoices.length) {
    showToast('모든 카드를 잠갔습니다', 1300);
    return; // 리롤 미소비
  }

  const excludeIds = new Set(locked.map((c) => c.upgrade.id));
  const needed = currentUpgradeChoices.length - locked.length;
  const replacements = createUpgradeChoices(needed, true, { excludeIds });

  player.rerolls--; // 1회만 소비
  currentUpgradeChoices = [...locked, ...replacements];
  renderUpgradeChoices(currentUpgradeChoices, false);
  audio.reroll();
  showToast('잠그지 않은 시간선을 다시 계산했습니다', 1200);
}
```

### 1.5 잠금 초기화

`selectUpgrade`(`:3591`, `currentUpgradeChoices = []` 근처)와 `openUpgradeScreen`(`:3578` 직전)에 추가:

```js
lockedUpgradeIds.clear();
```

### 1.6 CSS (`css/style.css`, 업그레이드 카드 규칙 근처)

```css
.upgrade-lock {
  position: absolute; top: 8px; right: 8px;
  width: 44px; height: 44px; display: grid; place-items: center;
  border: 1px solid rgba(120,191,240,.28); border-radius: 10px;
  background: rgba(8,14,32,.7); color: #9fb6c8; cursor: pointer;
}
.upgrade-lock[aria-pressed="true"] { border-color: var(--cyan); color: var(--cyan); background: rgba(98,233,255,.12); }
.upgrade-card.locked { outline: 1px solid rgba(98,233,255,.4); }
.upgrade-card { position: relative; } /* 이미 relative면 생략 */
```

### 1.7 QA 훅

`window.echoRiftStatus`(`:7817~7867`)는 이미 `choices`를 노출한다. 잠금도 노출:

```js
lockedChoiceIds: [...lockedUpgradeIds],
```

`__echoRiftQA`(`:7948`)에 테스트 보조 추가(일반 실행 부작용 없음):

```js
lockChoice: (index) => { const c = currentUpgradeChoices[index]; if (c) toggleUpgradeLock(c); return [...lockedUpgradeIds]; },
reroll: () => { rerollUpgradeChoices(); return window.echoRiftStatus.choices; },
```

---

## 2. 저장 내보내기 · 가져오기

### 2.1 상수 (저장 키 근처 `:101~103`)

```js
const RUN_HISTORY_KEY = 'echoRiftRunHistoryV1';
const EXPORT_SCHEMA_VERSION = 1;
const MAX_IMPORT_BYTES = 1_000_000;
const IMPORT_BACKUP_KEY = 'echoRiftSaveV2_backup_before_import';
```

### 2.2 내보내기

```js
async function sha256Text(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function buildExportEnvelope(includeSettings = true) {
  const payload = {
    save: structuredClone(saveData),
    settings: includeSettings ? structuredClone(settings) : null,
    runHistory: loadRunHistory(),
  };
  const payloadText = JSON.stringify(payload);
  return {
    product: 'ECHO_RIFT',
    exportSchemaVersion: EXPORT_SCHEMA_VERSION,
    gameVersion: '6.9.0',
    exportedAt: new Date().toISOString(),
    checksum: await sha256Text(payloadText),
    payload,
  };
}

async function exportSaveFile() {
  try {
    const includeSettings = $('#includeSettingsExport')?.checked !== false;
    const envelope = await buildExportEnvelope(includeSettings);
    const blob = new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `echo-rift-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('저장 파일을 내보냈습니다', 1600);
  } catch (err) {
    console.error('Export failed:', err);
    showToast('내보내기에 실패했습니다', 2200);
  }
}
```

### 2.3 가져오기 검증·적용

```js
function assertPlainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} 형식이 올바르지 않습니다.`);
  }
}

async function parseImportFile(file) {
  if (!file) throw new Error('파일을 선택하세요.');
  if (file.size > MAX_IMPORT_BYTES) throw new Error('파일이 너무 큽니다(1MB 초과).');

  const text = await file.text();
  const envelope = JSON.parse(text);              // try/catch는 호출부에서
  assertPlainObject(envelope, '내보내기 파일');
  if (envelope.product !== 'ECHO_RIFT') throw new Error('ECHO RIFT 저장 파일이 아닙니다.');
  if (Number(envelope.exportSchemaVersion) > EXPORT_SCHEMA_VERSION) {
    throw new Error('더 새로운 버전에서 만든 저장 파일입니다.');
  }
  assertPlainObject(envelope.payload, '저장 내용');
  assertPlainObject(envelope.payload.save, '진행 저장');

  const checksum = await sha256Text(JSON.stringify(envelope.payload));
  if (checksum !== envelope.checksum) throw new Error('체크섬이 일치하지 않습니다(파일 손상).');

  return {
    save: sanitizeImportedSave(envelope.payload.save),     // saveData 기본값으로 보정
    settings: envelope.payload.settings ? sanitizeImportedSettings(envelope.payload.settings) : null,
    runHistory: validateRunHistory(envelope.payload.runHistory || []),
  };
}

// 기존 loadSaveData/defaultSettings의 관대한 병합을 재사용해 누락/이상 필드 보정.
function sanitizeImportedSave(raw) {
  return { ...structuredClone(saveDataDefaults()), ...raw,
    meta: { ...defaultMeta, ...(raw.meta || {}) },
    cores: Math.max(0, Math.floor(Number(raw.cores) || 0)),
    bestSector: Math.max(1, Number(raw.bestSector) || 1) };
}
function sanitizeImportedSettings(raw) {
  return { ...defaultSettings, ...raw };
}

async function importSaveFile(file) {
  const backup = {
    save: localStorage.getItem(SAVE_KEY),
    settings: localStorage.getItem(SETTINGS_KEY),
    history: localStorage.getItem(RUN_HISTORY_KEY),
  };
  try {
    const imported = await parseImportFile(file);
    saveJSON(IMPORT_BACKUP_KEY, backup);          // 적용 전 백업
    saveJSON(SAVE_KEY, imported.save);
    if (imported.settings) saveJSON(SETTINGS_KEY, imported.settings);
    saveJSON(RUN_HISTORY_KEY, imported.runHistory);
    showToast('저장을 불러왔습니다. 다시 시작합니다…', 1600);
    setTimeout(() => location.reload(), 600);     // 설정·UI·오디오 깨끗하게 재적용
  } catch (err) {
    console.error('Import failed:', err);          // 실패 시 localStorage 미변경 → 기존 저장 보존
    showToast(err.message || '저장 파일을 불러오지 못했습니다.', 2800);
  }
}
```

> `saveDataDefaults()`/`defaultMeta`는 기존 `loadSaveData`의 `defaults`/`defaultMeta`를 재사용한다.
> 현재 `defaultMeta`는 `:212`에 모듈 상수로 존재하므로 그대로 참조 가능. `defaults`는 `loadSaveData`
> 내부 지역 변수이므로, 공용 `saveDataDefaults()`로 추출하거나 동일 객체를 모듈 상수로 올린다.

### 2.4 설정 UI (`index.html` 설정 패널에 "데이터" 그룹 신설)

```html
<div class="setting-group"><h3>데이터</h3>
  <label class="setting-row"><span><b>설정 포함 내보내기</b><small>저장 파일에 화면·접근성 설정도 포함</small></span><input id="includeSettingsExport" type="checkbox" checked /></label>
  <div class="setting-row"><span><b>진행 내보내기</b><small>JSON 파일로 저장(네트워크 전송 없음)</small></span><button id="exportSaveBtn" class="btn compact-btn" type="button">내보내기</button></div>
  <div class="setting-row"><span><b>진행 가져오기</b><small>가져오기 전 현재 저장을 자동 백업</small></span><label class="btn compact-btn" for="importSaveInput">가져오기</label><input id="importSaveInput" type="file" accept="application/json" hidden /></div>
</div>
```

### 2.5 바인딩 (설정 이벤트 블록 `:7600~`)

```js
$('#exportSaveBtn')?.addEventListener('click', exportSaveFile);
$('#importSaveInput')?.addEventListener('change', (e) => {
  const file = e.target.files?.[0];
  e.target.value = ''; // 같은 파일 재선택 허용
  if (file) importSaveFile(file);
});
```

---

## 3. 로컬 런 기록

```js
const MAX_RUN_HISTORY = 20;

function loadRunHistory() {
  const v = loadJSON(RUN_HISTORY_KEY, { list: [] });
  return Array.isArray(v.list) ? v.list.slice(0, MAX_RUN_HISTORY) : [];
}

function validateRunHistory(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((r) => r && typeof r === 'object').slice(0, MAX_RUN_HISTORY);
}

function createRunSummary(outcome) {
  const recapShare = (typeof echoDamageShare === 'function') ? echoDamageShare() : null; // 있으면 사용
  return {
    endedAt: new Date().toISOString(),
    outcome,                                   // 'win' | 'death'
    score: Math.floor(score),
    sector: currentWave?.number || 1,
    timeSeconds: Number(gameTime.toFixed(2)),
    level: player?.level || 1,
    kills,
    build: strongestFamilies().map(([family, rank]) => ({ family, rank })),
    echoShare: recapShare,                     // 없으면 null로 두고 후속에 채움
  };
}

function appendRunHistory(outcome) {
  try {
    const list = loadRunHistory();
    list.unshift(createRunSummary(outcome));
    saveJSON(RUN_HISTORY_KEY, { version: 1, list: list.slice(0, MAX_RUN_HISTORY) });
  } catch (err) { console.error('run history failed', err); }
}
```

호출(각 1회):

```js
// endGame() 내부, settleRun(1) 직후 한 곳
appendRunHistory('death');
// showVictory() 내부, saveData.wins++ 근처 한 곳
appendRunHistory('win');
```

> 주의: 끝없는 시간선(엔드리스)에서 `showVictory` → 이후 `endGame`이 모두 불릴 수 있으니,
> **이중 기록 방지** 플래그를 둔다(예: `runHistoryRecorded` 런 단위 불리언, 새 런 시작 시 false).
> 6.8 QA 계약의 "사망 뒤 코어 정산 1회"와 같은 원칙을 따른다.

`echoShare`/`phaseRift` 정확 수치는 `buildRunRecap()`(`:5919`)이 계산하는 값을 재사용하면 좋다.
가능하면 `buildRunRecap`이 내부에서 만드는 수치를 작은 헬퍼로 분리해 런 기록과 공유한다.

---

## 4. 테스트 스텁 (헤드리스 없을 때 로직 단위 검사)

순수 로직만 분리해 노드로 검증(6.8에서 사용한 방식).

```js
// excludeIds 동작: 잠긴 id가 새 후보에 없어야 함 (createUpgradeChoices의 풀 필터만 발췌해 검증)
// 봉투 왕복: buildExportEnvelope→parseImportFile 체크섬 일치, 손상 시 throw
// 런 기록 상한: 25개 push 후 length === 20, 최신이 앞
```

브라우저 전용(잠금 클릭→리롤 결과, import reload, 결과 화면 표시)은 QA_REPORT에 "수동 확인 필요"로 분리.
