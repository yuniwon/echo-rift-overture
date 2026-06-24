(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // DOM & constants
  // ---------------------------------------------------------------------------
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const canvas = $('#gameCanvas');
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

  const UI = {
    screens: $$('.screen'),
    menu: $('#menu'),
    how: $('#howScreen'),
    settings: $('#settingsScreen'),
    meta: $('#metaScreen'),
    upgrade: $('#upgradeScreen'),
    route: $('#routeScreen'),
    pause: $('#pauseScreen'),
    gameOver: $('#gameOverScreen'),
    victory: $('#victoryScreen'),
    hud: $('#hud'),
    abilityHud: $('#abilityHud'),
    bossHud: $('#bossHud'),
    bossBarFill: $('#bossBarFill'),
    touch: $('#touchControls'),
    waveBanner: $('#waveBanner'),
    bannerEyebrow: $('#bannerEyebrow'),
    bannerTitle: $('#bannerTitle'),
    bannerSubtitle: $('#bannerSubtitle'),
    bossIntroMeta: $('#bossIntroMeta'),
    bossIntroCountdown: $('#bossIntroCountdown'),
    bossIntroProgress: $('#bossIntroProgress'),
    toast: $('#toast'),
    ariaLive: $('#ariaLive'),
    hpBar: $('#hpBar'),
    shieldBar: $('#shieldBar'),
    xpBar: $('#xpBar'),
    hpText: $('#hpText'),
    shieldText: $('#shieldText'),
    levelText: $('#levelText'),
    waveLabel: $('#waveLabel'),
    waveName: $('#waveName'),
    waveModifier: $('#waveModifier'),
    routeText: $('#routeText'),
    runClock: $('#runClock'),
    threatText: $('#threatText'),
    scoreText: $('#scoreText'),
    killText: $('#killText'),
    bestText: $('#bestText'),
    runCoreText: $('#runCoreText'),
    dashCooldown: $('#dashCooldown'),
    echoCooldown: $('#echoCooldown'),
    dashAbility: $('#dashAbility'),
    echoAbility: $('#echoAbility'),
    echoTimeline: $('#echoTimeline'),
    echoRecorderSummary: $('#echoRecorderSummary'),
    echoRecordDuration: $('#echoRecordDuration'),
    echoReport: $('#echoReport'),
    echoReportMain: $('#echoReportMain'),
    echoReportSub: $('#echoReportSub'),
    replayVerified: $('#replayVerified'),
    syncSuccess: $('#syncSuccess'),
    tutorialCoach: $('#tutorialCoach'),
    tutorialStepLabel: $('#tutorialStepLabel'),
    tutorialDeviceBadge: $('#tutorialDeviceBadge'),
    tutorialProgressText: $('#tutorialProgressText'),
    tutorialProgressBar: $('#tutorialProgressBar'),
    tutorialTitle: $('#tutorialTitle'),
    tutorialBody: $('#tutorialBody'),
    tutorialHint: $('#tutorialHint'),
    upgradeChoices: $('#upgradeChoices'),
    routeChoices: $('#routeChoices'),
    routeSubtitle: $('#routeSubtitle'),
    routeRunSummary: $('#routeRunSummary'),
    pauseRoute: $('#pauseRoute'),
    pauseEcho: $('#pauseEcho'),
    autoQualityStatus: $('#autoQualityStatus'),
    metaGrid: $('#metaGrid'),
    damageFlash: $('#damageFlash'),
    perfHud: $('#perfHud'),
    routePreview: $('#routePreview'),
    routePreviewIcon: $('#routePreviewIcon'),
    routePreviewRisk: $('#routePreviewRisk'),
    routePreviewGrade: $('#routePreviewGrade'),
    routePreviewName: $('#routePreviewName'),
    routePreviewTagline: $('#routePreviewTagline'),
    routePreviewAnomaly: $('#routePreviewAnomaly'),
    routePreviewStats: $('#routePreviewStats'),
    advancedTrainingBtn: $('#advancedTrainingBtn'),
    routePreviewCombat: $('#routePreviewCombat'),
    routePreviewReward: $('#routePreviewReward'),
    gameOverGrade: $('#gameOverGrade'),
    victoryGrade: $('#victoryGrade'),
  };

  const TAU = Math.PI * 2;
  const FIXED_DT = 1 / 60;
  const WORLD = { w: 2400, h: 1500, margin: 66 };
  const SAVE_KEY = 'echoRiftSaveV2';
  const LEGACY_SAVE_KEY = 'echoRiftSaveV1';
  const SETTINGS_KEY = 'echoRiftSettingsV1';
  const RUN_HISTORY_KEY = 'echoRiftRunHistoryV1';
  const IMPORT_BACKUP_KEY = 'echoRiftImportBackupV1';
  const IMPORT_STAGING_PREFIX = 'echoRiftImportStagingV1';
  const EXPORT_SCHEMA_VERSION = 1;
  const MAX_IMPORT_BYTES = 1_000_000;
  const MAX_RUN_HISTORY = 20;
  const GAME_VERSION = '7.0.0';
  const MAX_ENEMY_BULLETS = 680;
  const MAX_PLAYER_BULLETS = 360;
  const WORLD_UNITS_PER_METER = 10;

  // CROSSFIRE 6.3: current and echo hits within this window fracture the target.
  const PHASE_RIFT_WINDOW = 1.2;
  const PHASE_RIFT_DURATION = 1.6;
  const PHASE_RIFT_DAMAGE_MULT = 1.22;
  const PHASE_RIFT_COOLDOWN = 2.5;
  const BOSS_INTRO_DURATION = 1.6;
  const BOSS_MATERIALIZE_DURATION = 1.25;
  const BOSS_FIRST_ATTACK_DELAY = 1.05;
  let waveBannerTimer = null;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (min = 0, max = 1) => min + Math.random() * (max - min);
  const randi = (min, max) => Math.floor(rand(min, max + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const chance = (p) => Math.random() < p;
  const sqr = (v) => v * v;
  const distSq = (a, b) => sqr(a.x - b.x) + sqr(a.y - b.y);
  const length = (x, y) => Math.hypot(x, y);
  const normalize = (x, y) => {
    const l = Math.hypot(x, y) || 1;
    return { x: x / l, y: y / l };
  };
  const angleTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
  const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  const approach = (value, target, amount) => value < target ? Math.min(value + amount, target) : Math.max(value - amount, target);
  const expLerp = (current, target, speed, dt) => lerp(current, target, 1 - Math.exp(-speed * dt));

  function formatTime(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  function formatNumber(n) {
    return Math.max(0, Math.floor(n)).toLocaleString('ko-KR');
  }

  function uiIcon(name, className = '') {
    const safeName = String(name || 'anomaly').replace(/[^a-z0-9-]/gi, '');
    const safeClass = String(className || '').replace(/[^a-z0-9 _-]/gi, '');
    return `<svg${safeClass ? ` class="${safeClass}"` : ''} aria-hidden="true" focusable="false"><use href="#icon-${safeName}"></use></svg>`;
  }

  function mulberry32(seed) {
    return function rng() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------------------------------------------------------------------------
  // Persistence & settings
  // ---------------------------------------------------------------------------
  const controlBindings = window.EchoRiftControlBindings;
  const fallbackKeyBindings = {
    moveUp: 'KeyW',
    moveDown: 'KeyS',
    moveLeft: 'KeyA',
    moveRight: 'KeyD',
    aimUp: 'ArrowUp',
    aimDown: 'ArrowDown',
    aimLeft: 'ArrowLeft',
    aimRight: 'ArrowRight',
    fire: 'KeyJ',
    dash: 'Space',
    echoPrimary: 'KeyE',
    echoSecondary: 'KeyQ',
    reroll: 'KeyR',
    pause: 'Escape',
  };
  function defaultKeyBindingMap() {
    return controlBindings?.defaultKeyBindings?.() || { ...fallbackKeyBindings };
  }
  function normalizeKeyBindingMap(raw) {
    return controlBindings?.normalizeKeyBindingMap?.(raw) || { ...fallbackKeyBindings };
  }
  function keyBindingActionDefinitions() {
    return controlBindings?.actionDefinitions?.() || Object.keys(fallbackKeyBindings).map((id) => ({ id, label: id, group: '입력' }));
  }
  function eventKeyToken(event) {
    return controlBindings?.eventToken?.(event) || String(event?.key || '').toLowerCase();
  }
  function keyBindingLabel(token) {
    return controlBindings?.keyLabel?.(token) || String(token || '').toUpperCase();
  }
  function keyMatchesAction(actionId, token) {
    return controlBindings?.matchesAction?.(settings.keyBindings, actionId, token) || normalizeKeyBindingMap(settings.keyBindings)[actionId] === token;
  }

  const defaultSettings = {
    master: 0.78,
    music: true,
    musicVolume: 0.72,
    sfxVolume: 0.95,
    uiVolume: 0.86,
    shake: true,
    reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false,
    highContrast: false,
    autoFire: false,
    uiScale: window.innerWidth >= 1800 ? 1.24 : 1.08,
    graphicsMode: 'auto',
    autoQualityTier: 2,
    showPerf: false,
    hudSize: 'normal',
    hudOpacity: 0.92,
    hudMode: 'adaptive',
    choiceDensity: 'balanced',
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
    keyBindings: defaultKeyBindingMap(),
  };
  const SETTING_ENUMS = {
    graphicsMode: ['auto', 'high', 'balanced', 'performance'],
    hudSize: ['compact', 'normal', 'large'],
    hudMode: ['adaptive', 'compact', 'detailed'],
    choiceDensity: ['focused', 'balanced', 'full'],
    damageNumbers: ['full', 'reduced', 'minimal'],
    echoControlMode: ['adaptive', 'hold', 'toggle', 'instant'],
    echoReportMode: ['adaptive', 'detailed', 'compact', 'sector'],
    touchControlsMode: ['auto', 'always', 'hidden'],
    tutorialTimingMode: ['adaptive', 'relaxed', 'strict'],
    combatPalette: ['default', 'deuteranopia', 'tritanopia', 'mono'],
  };
  const SETTING_NUMBER_RANGES = {
    master: [0, 1],
    musicVolume: [0, 1],
    sfxVolume: [0, 1],
    uiVolume: [0, 1],
    uiScale: [0.9, 1.6],
    autoQualityTier: [0, 2, true],
    hudOpacity: [0.68, 1],
    flashIntensity: [0, 1],
  };

  // Owner colours per accessibility palette. Shape language is constant across palettes;
  // only the colour mapping changes so colour-vision users still read ownership by hue.
  const PROJECTILE_PALETTES = {
    default:      { main: '#69ecff', echo: '#b97aff', enemy: '#ff5d7e' },
    deuteranopia: { main: '#4cc9ff', echo: '#ffd166', enemy: '#ff6bcb' },
    tritanopia:   { main: '#35f3b5', echo: '#ff7a9e', enemy: '#ffe15a' },
    mono:         { main: '#ffffff', echo: '#b8b8b8', enemy: '#6f6f6f' },
  };
  const COMBAT_PALETTE_KEYS = ['default', 'deuteranopia', 'tritanopia', 'mono'];
  function activeProjectilePalette() {
    return PROJECTILE_PALETTES[settings.combatPalette] || PROJECTILE_PALETTES.default;
  }

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? { ...fallback, ...JSON.parse(raw) } : { ...fallback };
    } catch (_) {
      return { ...fallback };
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  function settingNumber(value, fallback, min, max, integer = false) {
    const numeric = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    const clamped = clamp(numeric, min, max);
    return integer ? Math.floor(clamped) : clamped;
  }

  function settingBoolean(value, fallback) {
    return typeof value === 'boolean' ? value : fallback;
  }

  function settingEnum(value, fallback, allowed) {
    return typeof value === 'string' && allowed.includes(value) ? value : fallback;
  }

  function hasOwnValue(object, key) {
    return Object.prototype.hasOwnProperty.call(object, key);
  }

  function normalizeSettingsData(raw = {}) {
    const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const normalized = {};
    for (const [key, fallback] of Object.entries(defaultSettings)) {
      if (key === 'keyBindings') {
        normalized[key] = normalizeKeyBindingMap(source[key]);
      } else if (hasOwnValue(SETTING_NUMBER_RANGES, key)) {
        const [min, max, integer = false] = SETTING_NUMBER_RANGES[key];
        normalized[key] = settingNumber(source[key], fallback, min, max, integer);
      } else if (hasOwnValue(SETTING_ENUMS, key)) {
        normalized[key] = settingEnum(source[key], fallback, SETTING_ENUMS[key]);
      } else if (typeof fallback === 'boolean') {
        normalized[key] = settingBoolean(source[key], fallback);
      } else {
        normalized[key] = fallback;
      }
    }
    return normalized;
  }

  function loadSettingsData() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return normalizeSettingsData(raw ? JSON.parse(raw) : {});
    } catch (_) {
      return normalizeSettingsData({});
    }
  }

  const settings = loadSettingsData();
  try {
    const migrationKey = 'echoRiftResonanceUiMigratedV5';
    if (!localStorage.getItem(migrationKey)) {
      if (window.innerWidth >= 1800 && Number(settings.uiScale) <= 1.18) settings.uiScale = 1.24;
      localStorage.setItem(migrationKey, '1');
      saveJSON(SETTINGS_KEY, settings);
    }
  } catch (_) { /* storage may be unavailable */ }

  const defaultMeta = {
    vitality: 0,
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
  };
  const metaImportMax = {
    vitality: 8,
    force: 10,
    cadence: 8,
    barrier: 8,
    reflex: 6,
    resonance: 8,
    memory: 8,
    luck: 8,
    salvage: 8,
    reroll: 3,
    arsenal: 4,
    defiance: 2,
  };

  function saveDataDefaults() {
    return {
      bestScore: 0,
      bestTime: 0,
      bestSector: 1,
      runs: 0,
      wins: 0,
      tutorialSeen: false,
      advancedTutorialSeen: false,
      cores: 0,
      totalCores: 0,
      meta: { ...defaultMeta },
    };
  }

  function normalizeSaveData(raw = {}) {
    const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const metaSource = source.meta && typeof source.meta === 'object' && !Array.isArray(source.meta) ? source.meta : {};
    const meta = {};
    for (const id of Object.keys(defaultMeta)) {
      const value = metaSource[id];
      const max = metaImportMax[id] ?? 99;
      meta[id] = typeof value === 'number' && Number.isFinite(value) ? clamp(Math.floor(value), 0, max) : 0;
    }
    return {
      bestScore: typeof source.bestScore === 'number' && Number.isFinite(source.bestScore) ? Math.max(0, Math.floor(source.bestScore)) : 0,
      bestTime: typeof source.bestTime === 'number' && Number.isFinite(source.bestTime) ? Math.max(0, source.bestTime) : 0,
      bestSector: typeof source.bestSector === 'number' && Number.isFinite(source.bestSector) ? Math.max(1, Math.floor(source.bestSector)) : 1,
      runs: typeof source.runs === 'number' && Number.isFinite(source.runs) ? Math.max(0, Math.floor(source.runs)) : 0,
      wins: typeof source.wins === 'number' && Number.isFinite(source.wins) ? Math.max(0, Math.floor(source.wins)) : 0,
      tutorialSeen: source.tutorialSeen === true,
      advancedTutorialSeen: source.advancedTutorialSeen === true,
      cores: typeof source.cores === 'number' && Number.isFinite(source.cores) ? Math.max(0, Math.floor(source.cores)) : 0,
      totalCores: typeof source.totalCores === 'number' && Number.isFinite(source.totalCores) ? Math.max(0, Math.floor(source.totalCores)) : 0,
      meta,
    };
  }

  function loadSaveData() {
    try {
      const current = localStorage.getItem(SAVE_KEY);
      const legacy = localStorage.getItem(LEGACY_SAVE_KEY);
      const parsed = current ? JSON.parse(current) : legacy ? JSON.parse(legacy) : {};
      return normalizeSaveData(parsed);
    } catch (_) {
      return saveDataDefaults();
    }
  }

  const saveData = loadSaveData();

  function cloneSerializable(value) {
    return JSON.parse(JSON.stringify(value ?? null));
  }

  function strictSetItem(key, serializedValue) {
    localStorage.setItem(key, serializedValue);
    if (localStorage.getItem(key) !== serializedValue) {
      throw new Error('브라우저 저장소에 쓴 값을 다시 확인하지 못했습니다.');
    }
  }

  function strictSetJSON(key, value) {
    const serialized = JSON.stringify(value);
    strictSetItem(key, serialized);
    return serialized;
  }

  function strictRemoveItem(key) {
    localStorage.removeItem(key);
    if (localStorage.getItem(key) !== null) {
      throw new Error('브라우저 저장소 값을 삭제하지 못했습니다.');
    }
  }

  function storageSnapshot() {
    return {
      save: localStorage.getItem(SAVE_KEY),
      settings: localStorage.getItem(SETTINGS_KEY),
      history: localStorage.getItem(RUN_HISTORY_KEY),
      backedUpAt: new Date().toISOString(),
    };
  }

  function restoreStorageSnapshot(snapshot) {
    const pairs = [
      [SAVE_KEY, snapshot?.save ?? null],
      [SETTINGS_KEY, snapshot?.settings ?? null],
      [RUN_HISTORY_KEY, snapshot?.history ?? null],
    ];
    for (const [key, value] of pairs) {
      if (value === null) strictRemoveItem(key);
      else strictSetItem(key, String(value));
    }
  }

  function clearImportStaging() {
    for (const suffix of ['save', 'settings', 'history']) {
      try { localStorage.removeItem(`${IMPORT_STAGING_PREFIX}:${suffix}`); } catch (_) { /* best effort cleanup */ }
    }
  }

  function stageImportPayload(imported) {
    clearImportStaging();
    return {
      save: strictSetJSON(`${IMPORT_STAGING_PREFIX}:save`, imported.save),
      settings: imported.settings ? strictSetJSON(`${IMPORT_STAGING_PREFIX}:settings`, imported.settings) : null,
      history: strictSetJSON(`${IMPORT_STAGING_PREFIX}:history`, { version: 1, list: imported.runHistory }),
    };
  }

  function assertPlainObject(value, label) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error(`${label} 형식이 올바르지 않습니다.`);
    }
  }

  function sanitizeImportedSave(raw) {
    assertPlainObject(raw, '진행 저장');
    return normalizeSaveData(raw);
  }

  function sanitizeImportedSettings(raw) {
    assertPlainObject(raw, '설정');
    return normalizeSettingsData(raw);
  }

  async function sha256Text(text) {
    if (!crypto?.subtle) throw new Error('이 브라우저에서는 체크섬 검증을 사용할 수 없습니다.');
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  async function buildExportEnvelope(includeSettings = true) {
    const payload = {
      save: cloneSerializable(saveData),
      settings: includeSettings ? cloneSerializable(settings) : null,
      runHistory: loadRunHistory(),
    };
    const payloadText = JSON.stringify(payload);
    return {
      product: 'ECHO_RIFT',
      exportSchemaVersion: EXPORT_SCHEMA_VERSION,
      gameVersion: GAME_VERSION,
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
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `echo-rift-save-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.rel = 'noopener';
      anchor.click();
      URL.revokeObjectURL(url);
      showToast('진행 저장을 내보냈습니다', 1700);
    } catch (err) {
      console.error('Export failed:', err);
      showToast(err?.message || '내보내기에 실패했습니다', 2600);
    }
  }

  async function parseImportFile(file) {
    if (!file) throw new Error('가져올 파일을 선택하세요.');
    if (file.size > MAX_IMPORT_BYTES) throw new Error('파일이 너무 큽니다. 1MB 이하의 저장 파일만 불러올 수 있습니다.');
    let envelope;
    try {
      envelope = JSON.parse(await file.text());
    } catch (_) {
      throw new Error('JSON 파일을 읽을 수 없습니다.');
    }
    assertPlainObject(envelope, '내보내기 파일');
    if (envelope.product !== 'ECHO_RIFT') throw new Error('ECHO RIFT 저장 파일이 아닙니다.');
    if (Number(envelope.exportSchemaVersion) > EXPORT_SCHEMA_VERSION) throw new Error('더 새로운 버전에서 만든 저장 파일입니다.');
    assertPlainObject(envelope.payload, '저장 내용');
    assertPlainObject(envelope.payload.save, '진행 저장');
    const checksum = await sha256Text(JSON.stringify(envelope.payload));
    if (checksum !== envelope.checksum) throw new Error('체크섬이 일치하지 않습니다. 파일이 손상되었을 수 있습니다.');
    return {
      save: sanitizeImportedSave(envelope.payload.save),
      settings: envelope.payload.settings ? sanitizeImportedSettings(envelope.payload.settings) : null,
      runHistory: validateRunHistory(envelope.payload.runHistory || []),
    };
  }

  async function importSaveFile(file) {
    const before = storageSnapshot();
    try {
      const imported = await parseImportFile(file);
      const staged = stageImportPayload(imported);
      strictSetJSON(IMPORT_BACKUP_KEY, before);
      strictSetItem(SAVE_KEY, staged.save);
      if (staged.settings !== null) strictSetItem(SETTINGS_KEY, staged.settings);
      strictSetItem(RUN_HISTORY_KEY, staged.history);
      clearImportStaging();
      updateImportBackupStatus();
      showToast('저장을 불러왔습니다. 다시 시작합니다...', 1700);
      window.setTimeout(() => location.reload(), 650);
    } catch (err) {
      try {
        restoreStorageSnapshot(before);
        clearImportStaging();
      } catch (rollbackErr) {
        console.error('Import rollback failed:', rollbackErr);
      }
      console.warn('Import failed:', err);
      showToast(err?.message || '저장 파일을 불러오지 못했습니다.', 3000);
    }
  }

  function loadImportBackup() {
    try {
      const raw = localStorage.getItem(IMPORT_BACKUP_KEY);
      if (!raw) return null;
      const backup = JSON.parse(raw);
      if (!backup || typeof backup !== 'object' || Array.isArray(backup)) return null;
      return {
        save: typeof backup.save === 'string' ? backup.save : null,
        settings: typeof backup.settings === 'string' ? backup.settings : null,
        history: typeof backup.history === 'string' ? backup.history : null,
        backedUpAt: typeof backup.backedUpAt === 'string' ? backup.backedUpAt : '',
      };
    } catch (_) {
      return null;
    }
  }

  function updateImportBackupStatus() {
    const button = $('#restoreImportBackupBtn');
    const status = $('#importBackupStatus');
    if (!button && !status) return;
    const backup = loadImportBackup();
    if (button) button.disabled = !backup;
    if (status) {
      status.textContent = backup
        ? `마지막 가져오기 백업: ${backup.backedUpAt ? new Date(backup.backedUpAt).toLocaleString() : '보관됨'}`
        : '되돌릴 가져오기 백업이 없습니다.';
    }
  }

  function restoreImportBackup() {
    const backup = loadImportBackup();
    if (!backup) {
      showToast('되돌릴 가져오기 백업이 없습니다.', 2200);
      updateImportBackupStatus();
      return;
    }
    const before = storageSnapshot();
    try {
      restoreStorageSnapshot(backup);
      strictRemoveItem(IMPORT_BACKUP_KEY);
      updateImportBackupStatus();
      showToast('마지막 가져오기를 되돌렸습니다. 다시 시작합니다...', 1800);
      window.setTimeout(() => location.reload(), 650);
    } catch (err) {
      try { restoreStorageSnapshot(before); } catch (rollbackErr) { console.error('Import undo rollback failed:', rollbackErr); }
      console.error('Import undo failed:', err);
      showToast(err?.message || '가져오기 되돌리기에 실패했습니다.', 3000);
    }
  }

  function normalizeRunEconomy(raw) {
    const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const milestones = Array.isArray(source.synergyMilestones) ? source.synergyMilestones.slice(0, 8).map((item) => ({
      family: String(item?.family || ''),
      rank: clamp(Math.floor(Number(item?.rank) || 0), 0, 3),
      level: Math.max(1, Math.floor(Number(item?.level) || 1)),
      timeSeconds: Math.max(0, Number(item?.timeSeconds) || 0),
    })).filter((item) => item.family && item.rank > 0) : [];
    return {
      rerollsUsed: Math.max(0, Math.floor(Number(source.rerollsUsed) || 0)),
      averageLockedCards: Number(clamp(Number(source.averageLockedCards) || 0, 0, 6).toFixed(2)),
      maxLockedCards: Math.max(0, Math.floor(Number(source.maxLockedCards) || 0)),
      postRerollSelections: Math.max(0, Math.floor(Number(source.postRerollSelections) || 0)),
      synergyMilestones: milestones,
    };
  }

  function normalizeRunHistoryEntry(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const outcome = raw.outcome === 'win' ? 'win' : raw.outcome === 'death' ? 'death' : null;
    if (!outcome) return null;
    const build = Array.isArray(raw.build)
      ? raw.build.slice(0, 3).map((item) => ({
          family: String(item?.family || ''),
          label: String(item?.label || item?.family || ''),
          rank: Math.max(0, Math.floor(Number(item?.rank) || 0)),
        })).filter((item) => item.family)
      : [];
    const phase = raw.phaseRift && typeof raw.phaseRift === 'object' && !Array.isArray(raw.phaseRift) ? raw.phaseRift : {};
    return {
      endedAt: Number.isNaN(Date.parse(raw.endedAt)) ? new Date().toISOString() : String(raw.endedAt),
      outcome,
      score: Math.max(0, Math.floor(Number(raw.score) || 0)),
      sector: Math.max(1, Math.floor(Number(raw.sector) || 1)),
      timeSeconds: Math.max(0, Number(raw.timeSeconds) || 0),
      level: Math.max(1, Math.floor(Number(raw.level) || 1)),
      kills: Math.max(0, Math.floor(Number(raw.kills) || 0)),
      build,
      echoShare: clamp(Number(raw.echoShare) || 0, 0, 999),
      phaseRift: {
        procs: Math.max(0, Math.floor(Number(phase.procs) || 0)),
        bonusDamage: Math.max(0, Math.round(Number(phase.bonusDamage) || 0)),
      },
      economy: normalizeRunEconomy(raw.economy),
      seed: raw.seed == null ? undefined : String(raw.seed),
    };
  }

  function validateRunHistory(list) {
    if (!Array.isArray(list)) return [];
    return list.map(normalizeRunHistoryEntry).filter(Boolean).slice(0, MAX_RUN_HISTORY);
  }

  function loadRunHistory() {
    const stored = loadJSON(RUN_HISTORY_KEY, { version: 1, list: [] });
    return validateRunHistory(stored.list);
  }

  function saveRunHistory(list) {
    saveJSON(RUN_HISTORY_KEY, { version: 1, list: validateRunHistory(list) });
  }

  function createRunSummary(outcome) {
    const build = strongestFamilies().map(([family, rank]) => ({ family, label: familyInfo[family]?.label || family, rank }));
    return {
      endedAt: new Date().toISOString(),
      outcome,
      score: Math.floor(score),
      sector: currentWave?.number || 1,
      timeSeconds: Number(gameTime.toFixed(2)),
      level: player?.level || 1,
      kills,
      build,
      echoShare: runDamageTotal > 0 ? Number(clamp(echoDamageTotal / runDamageTotal * 100, 0, 999).toFixed(2)) : 0,
      phaseRift: {
        procs: phaseRiftProcs,
        bonusDamage: Math.round(phaseRiftBonusDamage),
      },
      economy: getRunEconomySummary(),
      seed: runSeed ? String(runSeed) : undefined,
    };
  }

  function renderRunHistory() {
    const target = $('#runHistoryList');
    if (!target) return;
    const list = loadRunHistory();
    if (!list.length) {
      target.innerHTML = '<div class="run-history-empty">아직 보관된 런 기록이 없습니다.</div>';
      return;
    }
    target.innerHTML = list.map((run, index) => {
      const date = new Date(run.endedAt);
      const dateLabel = Number.isNaN(date.getTime()) ? '시간 미상' : date.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      const buildText = run.build.length ? run.build.map((item) => `${escapeHtml(item.label)} ${item.rank}`).join(' · ') : '빌드 미확립';
      const outcome = run.outcome === 'win' ? '승리' : '붕괴';
      const economy = run.economy || normalizeRunEconomy(null);
      const rerollText = economy.rerollsUsed > 0 ? ` · 리롤 ${economy.rerollsUsed}회 / 평균 잠금 ${economy.averageLockedCards.toFixed(1)}장` : '';
      return `<article class="run-history-item">
        <header><b>#${index + 1} ${outcome}</b><span>${dateLabel}</span></header>
        <p>점수 ${formatNumber(run.score)} · SECTOR ${String(run.sector).padStart(2, '0')} · ${formatTime(run.timeSeconds)} · L${run.level} · 처치 ${formatNumber(run.kills)}</p>
        <p>${buildText} · 잔향 ${run.echoShare.toFixed(run.echoShare >= 10 ? 0 : 1)}% · 균열 ${run.phaseRift.procs}회 / +${formatNumber(run.phaseRift.bonusDamage)}${rerollText}</p>
      </article>`;
    }).join('');
  }

  function appendRunHistory(outcome) {
    if (runHistoryRecorded) return;
    runHistoryRecorded = true;
    try {
      saveRunHistory([createRunSummary(outcome), ...loadRunHistory()].slice(0, MAX_RUN_HISTORY));
      renderRunHistory();
    } catch (err) {
      console.error('Run history failed:', err);
    }
  }

  function clearRunHistory() {
    saveRunHistory([]);
    renderRunHistory();
    showToast('최근 런 기록을 초기화했습니다', 1700);
  }

  let pendingKeyBindAction = null;

  function getKeyBindingStatus() {
    const bindings = normalizeKeyBindingMap(settings.keyBindings);
    return Object.fromEntries(keyBindingActionDefinitions().map((action) => {
      const token = bindings[action.id];
      return [action.id, {
        label: action.label,
        group: action.group,
        token,
        display: keyBindingLabel(token),
      }];
    }));
  }

  function renderKeyBindings() {
    const grid = $('#keybindGrid');
    if (!grid) return;
    const bindings = normalizeKeyBindingMap(settings.keyBindings);
    grid.innerHTML = '';
    let activeGroup = '';
    for (const action of keyBindingActionDefinitions()) {
      if (action.group !== activeGroup) {
        activeGroup = action.group;
        const heading = document.createElement('div');
        heading.className = 'keybind-group-label';
        heading.textContent = activeGroup;
        grid.appendChild(heading);
      }
      const row = document.createElement('div');
      row.className = 'keybind-row';
      const label = document.createElement('span');
      label.className = 'keybind-label';
      label.textContent = action.label;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'keybind-btn';
      button.dataset.keybindAction = action.id;
      button.setAttribute('aria-pressed', String(pendingKeyBindAction === action.id));
      button.textContent = pendingKeyBindAction === action.id ? '입력 대기' : keyBindingLabel(bindings[action.id]);
      row.append(label, button);
      grid.appendChild(row);
    }
    const status = $('#keybindStatus');
    if (status) status.textContent = pendingKeyBindAction
      ? '변경할 키를 누르세요. 같은 키를 여러 행동에 배정하면 동시에 작동합니다.'
      : '버튼을 선택한 뒤 새 키를 누르면 즉시 저장됩니다.';
  }

  function beginKeyRebind(actionId) {
    const action = keyBindingActionDefinitions().find((item) => item.id === actionId);
    if (!action) return;
    pendingKeyBindAction = action.id;
    renderKeyBindings();
  }

  function capturePendingKeyBinding(event) {
    if (!pendingKeyBindAction) return false;
    const token = eventKeyToken(event);
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!token) return true;
    const bindings = normalizeKeyBindingMap(settings.keyBindings);
    bindings[pendingKeyBindAction] = token;
    settings.keyBindings = normalizeKeyBindingMap(bindings);
    const action = keyBindingActionDefinitions().find((item) => item.id === pendingKeyBindAction);
    pendingKeyBindAction = null;
    saveJSON(SETTINGS_KEY, settings);
    applySettings();
    showToast(`${action?.label || '입력'} · ${keyBindingLabel(token)}`, 1300);
    return true;
  }

  function resetKeyBindings() {
    pendingKeyBindAction = null;
    settings.keyBindings = defaultKeyBindingMap();
    saveJSON(SETTINGS_KEY, settings);
    applySettings();
    showToast('키보드 입력을 기본값으로 되돌렸습니다', 1500);
  }

  function applySettings() {
    settings.master = clamp(Number(settings.master ?? defaultSettings.master), 0, 1);
    settings.musicVolume = clamp(Number(settings.musicVolume ?? defaultSettings.musicVolume), 0, 1);
    settings.sfxVolume = clamp(Number(settings.sfxVolume ?? defaultSettings.sfxVolume), 0, 1);
    settings.uiVolume = clamp(Number(settings.uiVolume ?? defaultSettings.uiVolume), 0, 1);
    settings.uiScale = clamp(Number(settings.uiScale) || defaultSettings.uiScale, 0.9, 1.6);
    settings.hudOpacity = clamp(Number(settings.hudOpacity ?? defaultSettings.hudOpacity), 0.68, 1);
    settings.autoQualityTier = clamp(Math.floor(Number(settings.autoQualityTier ?? 2)), 0, 2);
    settings.flashIntensity = clamp(Number(settings.flashIntensity ?? 0.72), 0, 1);
    if (!['auto', 'high', 'balanced', 'performance'].includes(settings.graphicsMode)) settings.graphicsMode = 'auto';
    if (!['compact', 'normal', 'large'].includes(settings.hudSize)) settings.hudSize = 'normal';
    if (!['adaptive', 'compact', 'detailed'].includes(settings.hudMode)) settings.hudMode = 'adaptive';
    if (!['focused', 'balanced', 'full'].includes(settings.choiceDensity)) settings.choiceDensity = 'balanced';
    if (!['full', 'reduced', 'minimal'].includes(settings.damageNumbers)) settings.damageNumbers = 'full';
    if (!['adaptive', 'hold', 'toggle', 'instant'].includes(settings.echoControlMode)) settings.echoControlMode = 'adaptive';
    if (!['adaptive', 'detailed', 'compact', 'sector'].includes(settings.echoReportMode)) settings.echoReportMode = 'adaptive';
    if (!['auto', 'always', 'hidden'].includes(settings.touchControlsMode)) settings.touchControlsMode = 'auto';
    if (!['adaptive', 'relaxed', 'strict'].includes(settings.tutorialTimingMode)) settings.tutorialTimingMode = 'adaptive';
    if (!COMBAT_PALETTE_KEYS.includes(settings.combatPalette)) settings.combatPalette = 'default';
    settings.projectileShapes = settings.projectileShapes !== false;
    settings.rarityPatterns = settings.rarityPatterns !== false;
    settings.echoTrail = settings.echoTrail !== false;
    settings.offscreenWarnings = settings.offscreenWarnings !== false;
    settings.keyBindings = normalizeKeyBindingMap(settings.keyBindings);

    document.documentElement.style.setProperty('--text-scale', settings.uiScale.toFixed(2));
    document.documentElement.style.setProperty('--hud-opacity', settings.hudOpacity.toFixed(2));
    document.documentElement.style.setProperty('--flash-opacity', settings.flashIntensity.toFixed(2));
    document.body.classList.toggle('reduced-motion', settings.reducedMotion);
    document.body.classList.toggle('high-contrast', settings.highContrast);
    document.body.classList.toggle('compact-hud', settings.hudMode === 'compact');
    document.body.classList.toggle('no-rarity-patterns', !settings.rarityPatterns);
    document.body.dataset.combatPalette = settings.combatPalette;
    document.body.dataset.hudSize = settings.hudSize;
    document.body.dataset.hudMode = settings.hudMode;
    document.body.dataset.choiceDensity = settings.choiceDensity;
    document.body.dataset.damageNumbers = settings.damageNumbers;
    document.body.dataset.quality = String(quality);

    $('#masterVolume').value = settings.master;
    $('#masterVolumeValue').textContent = `${Math.round(settings.master * 100)}%`;
    $('#musicToggle').checked = settings.music;
    $('#musicVolume').value = settings.musicVolume;
    $('#musicVolumeValue').textContent = `${Math.round(settings.musicVolume * 100)}%`;
    $('#sfxVolume').value = settings.sfxVolume;
    $('#sfxVolumeValue').textContent = `${Math.round(settings.sfxVolume * 100)}%`;
    $('#uiVolume').value = settings.uiVolume;
    $('#uiVolumeValue').textContent = `${Math.round(settings.uiVolume * 100)}%`;
    $('#shakeToggle').checked = settings.shake;
    $('#motionToggle').checked = settings.reducedMotion;
    $('#contrastToggle').checked = settings.highContrast;
    $('#autoFireToggle').checked = settings.autoFire;
    $('#uiScale').value = settings.uiScale;
    $('#uiScaleValue').textContent = `${Math.round(settings.uiScale * 100)}%`;
    $('#graphicsMode').value = settings.graphicsMode;
    if ($('#hudSize')) $('#hudSize').value = settings.hudSize;
    if ($('#hudOpacity')) $('#hudOpacity').value = settings.hudOpacity;
    if ($('#hudOpacityValue')) $('#hudOpacityValue').textContent = `${Math.round(settings.hudOpacity * 100)}%`;
    if ($('#hudMode')) $('#hudMode').value = settings.hudMode;
    if ($('#choiceDensity')) $('#choiceDensity').value = settings.choiceDensity;
    if ($('#damageNumbersMode')) $('#damageNumbersMode').value = settings.damageNumbers;
    if ($('#echoControlMode')) $('#echoControlMode').value = settings.echoControlMode;
    if ($('#echoReportMode')) $('#echoReportMode').value = settings.echoReportMode;
    if ($('#touchControlsMode')) $('#touchControlsMode').value = settings.touchControlsMode;
    if ($('#tutorialTimingMode')) $('#tutorialTimingMode').value = settings.tutorialTimingMode;
    if ($('#combatPalette')) $('#combatPalette').value = settings.combatPalette;
    if ($('#projectileShapesToggle')) $('#projectileShapesToggle').checked = settings.projectileShapes;
    if ($('#rarityPatternsToggle')) $('#rarityPatternsToggle').checked = settings.rarityPatterns;
    if ($('#echoTrailToggle')) $('#echoTrailToggle').checked = settings.echoTrail;
    if ($('#offscreenWarningsToggle')) $('#offscreenWarningsToggle').checked = settings.offscreenWarnings;
    if ($('#flashIntensity')) $('#flashIntensity').value = settings.flashIntensity;
    if ($('#flashIntensityValue')) $('#flashIntensityValue').textContent = `${Math.round(settings.flashIntensity * 100)}%`;
    updateAutoQualityStatus();
    $('#perfToggle').checked = settings.showPerf;
    UI.perfHud.classList.toggle('hidden', !settings.showPerf);
    audio.applyVolume();
    updateTouchControlsVisibility();
    renderKeyBindings();
  }

  const QUALITY_LABELS = ['성능 우선', '균형', '고화질'];

  function updateAutoQualityStatus() {
    if (!UI.autoQualityStatus) return;
    const tier = clamp(Math.floor(Number(settings.autoQualityTier ?? 2)), 0, 2);
    UI.autoQualityStatus.dataset.tier = String(tier);
    UI.autoQualityStatus.textContent = `현재 자동 시작 단계: ${QUALITY_LABELS[tier]} · 다시 측정 전까지 유지`;
  }

  function configuredQualityTier() {
    if (settings.reducedMotion || settings.graphicsMode === 'performance') return 0;
    if (settings.graphicsMode === 'balanced') return 1;
    if (settings.graphicsMode === 'high') return 2;
    return clamp(Math.floor(Number(settings.autoQualityTier ?? 2)), 0, 2);
  }

  function refreshMenuStats() {
    $('#menuBest').textContent = formatNumber(saveData.bestScore);
    $('#menuTime').textContent = formatTime(saveData.bestTime);
    $('#menuCores').textContent = formatNumber(saveData.cores);
    $('#menuSector').textContent = String(saveData.bestSector || 1).padStart(2, '0');
    $('#coreBalance').textContent = formatNumber(saveData.cores);
    $('#totalCoreText').textContent = formatNumber(saveData.totalCores);
    UI.bestText.textContent = formatNumber(saveData.bestScore);
  }

  // ---------------------------------------------------------------------------
  // Procedural audio engine (layered synthesis, dynamic mix, no external assets)
  // ---------------------------------------------------------------------------
  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.masterGain = null;
      this.outputGain = null;
      this.musicGain = null;
      this.musicDuckGain = null;
      this.musicFilter = null;
      this.sfxGain = null;
      this.uiGain = null;
      this.reverbInput = null;
      this.reverbGain = null;
      this.convolver = null;
      this.compressor = null;
      this.noiseBuffer = null;
      this.musicTimer = null;
      this.nextNoteTime = 0;
      this.musicStep = 0;
      this.lastShotAt = 0;
      this.lastHitAt = 0;
      this.lastPickupAt = 0;
      this.lastUiHoverAt = 0;
      this.lastUiSelectAt = 0;
      this.gameActive = false;
      this.enabled = true;
      this.unlocked = false;
      this.voiceCount = 0;
      this.debugEvents = Object.create(null);
    }

    mark(name) {
      this.debugEvents[name] = (this.debugEvents[name] || 0) + 1;
    }

    async init() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') {
          try { await this.ctx.resume(); } catch (_) { /* ignored */ }
        }
        this.unlocked = this.ctx.state === 'running';
        this.applyVolume();
        return this.unlocked;
      }
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
          this.enabled = false;
          return false;
        }
        this.ctx = new AudioContextClass({ latencyHint: 'interactive' });
        this.masterGain = this.ctx.createGain();
        this.outputGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.musicDuckGain = this.ctx.createGain();
        this.musicFilter = this.ctx.createBiquadFilter();
        this.sfxGain = this.ctx.createGain();
        this.uiGain = this.ctx.createGain();
        this.reverbInput = this.ctx.createGain();
        this.reverbGain = this.ctx.createGain();
        this.convolver = this.ctx.createConvolver();
        this.compressor = this.ctx.createDynamicsCompressor();

        this.musicFilter.type = 'lowpass';
        this.musicFilter.frequency.value = 7600;
        this.musicFilter.Q.value = 0.35;
        this.musicDuckGain.gain.value = 1;
        this.reverbInput.gain.value = 1;
        this.reverbGain.gain.value = 0.19;
        this.outputGain.gain.value = 0.96;

        this.compressor.threshold.value = -18;
        this.compressor.knee.value = 16;
        this.compressor.ratio.value = 4.5;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.19;

        this.musicGain.connect(this.musicDuckGain).connect(this.musicFilter).connect(this.masterGain);
        this.sfxGain.connect(this.masterGain);
        this.uiGain.connect(this.masterGain);
        this.reverbInput.connect(this.convolver).connect(this.reverbGain).connect(this.masterGain);
        this.masterGain.connect(this.compressor).connect(this.outputGain).connect(this.ctx.destination);

        this.buildNoiseBuffer();
        this.buildImpulseResponse();
        this.applyVolume();
        this.startMusic();
        if (this.ctx.state === 'suspended') {
          try { await this.ctx.resume(); } catch (_) { /* ignored */ }
        }
        this.unlocked = this.ctx.state === 'running';
        return this.unlocked;
      } catch (err) {
        console.warn('Audio initialization failed:', err);
        this.enabled = false;
        return false;
      }
    }

    buildNoiseBuffer() {
      if (!this.ctx) return;
      const lengthSamples = Math.floor(this.ctx.sampleRate * 2);
      this.noiseBuffer = this.ctx.createBuffer(1, lengthSamples, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      let brown = 0;
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        brown = (brown + 0.018 * white) / 1.018;
        data[i] = clamp(white * 0.68 + brown * 2.7, -1, 1) * 0.62;
      }
    }

    buildImpulseResponse() {
      if (!this.ctx || !this.convolver) return;
      const seconds = 1.35;
      const lengthSamples = Math.floor(this.ctx.sampleRate * seconds);
      const impulse = this.ctx.createBuffer(2, lengthSamples, this.ctx.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const data = impulse.getChannelData(channel);
        for (let i = 0; i < data.length; i++) {
          const t = i / data.length;
          const decay = Math.pow(1 - t, 3.1);
          const early = i < this.ctx.sampleRate * 0.045 ? 0.35 : 1;
          data[i] = (Math.random() * 2 - 1) * decay * early * (channel ? 0.93 : 1);
        }
      }
      this.convolver.buffer = impulse;
    }

    busFor(destination) {
      if (destination === 'music') return this.musicGain;
      if (destination === 'ui') return this.uiGain;
      return this.sfxGain;
    }

    connectVoice(node, destination = 'sfx', reverb = 0) {
      if (!node) return;
      node.connect(this.busFor(destination));
      if (reverb > 0 && this.reverbInput) {
        const send = this.ctx.createGain();
        send.gain.value = clamp(reverb, 0, 0.8);
        node.connect(send).connect(this.reverbInput);
      }
    }

    normalizedSetting(name, fallback) {
      return clamp(Number(settings[name] ?? fallback), 0, 1);
    }

    musicTarget() {
      if (!settings.music) return 0;
      const user = this.normalizedSetting('musicVolume', 0.72);
      return user * (this.gameActive ? 0.78 : 0.43);
    }

    applyVolume() {
      if (!this.ctx || !this.masterGain) return;
      const now = this.ctx.currentTime;
      const master = this.normalizedSetting('master', 0.78);
      const sfx = this.normalizedSetting('sfxVolume', 0.95);
      const ui = this.normalizedSetting('uiVolume', 0.86);
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(master, now + 0.055);
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.linearRampToValueAtTime(this.musicTarget(), now + 0.12);
      this.sfxGain.gain.cancelScheduledValues(now);
      this.sfxGain.gain.linearRampToValueAtTime(sfx, now + 0.055);
      this.uiGain.gain.cancelScheduledValues(now);
      this.uiGain.gain.linearRampToValueAtTime(ui, now + 0.055);
    }

    setGameState(active) {
      this.gameActive = Boolean(active);
      if (!this.ctx || !this.musicGain) return;
      const now = this.ctx.currentTime;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.linearRampToValueAtTime(this.musicTarget(), now + 0.28);
    }

    duckMusic(depth = 0.5, duration = 0.28) {
      if (!this.ctx || !this.musicDuckGain) return;
      const now = this.ctx.currentTime;
      const param = this.musicDuckGain.gain;
      const current = Math.max(0.08, param.value || 1);
      param.cancelScheduledValues(now);
      param.setValueAtTime(current, now);
      param.linearRampToValueAtTime(clamp(depth, 0.16, 1), now + 0.025);
      param.exponentialRampToValueAtTime(1, now + Math.max(0.08, duration));
    }

    tone({
      frequency = 440,
      endFrequency = frequency,
      duration = 0.1,
      type = 'sine',
      volume = 0.08,
      pan = 0,
      when = 0,
      attack = 0.004,
      release = 0.045,
      sustain = 0.72,
      destination = 'sfx',
      filterFrequency = 0,
      filterType = 'lowpass',
      q = 0.7,
      detune = 0,
      reverb = 0,
    } = {}) {
      if (!this.ctx || !this.enabled || this.normalizedSetting('master', 0.78) <= 0) return;
      const start = this.ctx.currentTime + Math.max(0, when);
      const lengthSeconds = Math.max(0.025, duration);
      const end = start + lengthSeconds;
      const peakAt = start + Math.min(Math.max(0.001, attack), lengthSeconds * 0.35);
      const releaseAt = Math.max(peakAt + 0.004, end - Math.min(Math.max(0.012, release), lengthSeconds * 0.55));
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      let sourceNode = osc;
      osc.type = type;
      osc.detune.value = detune;
      osc.frequency.setValueAtTime(Math.max(20, frequency), start);
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), end);
      if (filterFrequency > 0) {
        const filter = this.ctx.createBiquadFilter();
        filter.type = filterType;
        filter.frequency.setValueAtTime(Math.max(40, filterFrequency), start);
        filter.Q.value = q;
        osc.connect(filter);
        sourceNode = filter;
      }
      sourceNode.connect(gain);
      const peak = Math.max(0.0001, volume);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, peakAt);
      if (releaseAt > peakAt + 0.003) gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * clamp(sustain, 0.08, 1)), releaseAt);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      if (panner) {
        panner.pan.value = clamp(pan, -1, 1);
        gain.connect(panner);
        this.connectVoice(panner, destination, reverb);
      } else {
        this.connectVoice(gain, destination, reverb);
      }
      osc.start(start);
      osc.stop(end + 0.05);
      this.voiceCount++;
      osc.addEventListener('ended', () => { this.voiceCount = Math.max(0, this.voiceCount - 1); }, { once: true });
    }

    noise({
      duration = 0.12,
      volume = 0.06,
      frequency = 1200,
      endFrequency = frequency,
      pan = 0,
      when = 0,
      filterType = 'bandpass',
      q = 0.8,
      attack = 0.002,
      destination = 'sfx',
      reverb = 0,
    } = {}) {
      if (!this.ctx || !this.noiseBuffer || this.normalizedSetting('master', 0.78) <= 0) return;
      const start = this.ctx.currentTime + Math.max(0, when);
      const lengthSeconds = Math.max(0.02, duration);
      const end = start + lengthSeconds;
      const source = this.ctx.createBufferSource();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      source.buffer = this.noiseBuffer;
      filter.type = filterType;
      filter.frequency.setValueAtTime(Math.max(40, frequency), start);
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, endFrequency), end);
      filter.Q.value = q;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), start + Math.min(lengthSeconds * 0.3, Math.max(0.001, attack)));
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      source.connect(filter).connect(gain);
      if (panner) {
        panner.pan.value = clamp(pan, -1, 1);
        gain.connect(panner);
        this.connectVoice(panner, destination, reverb);
      } else {
        this.connectVoice(gain, destination, reverb);
      }
      source.start(start, Math.random() * 0.65, lengthSeconds + 0.02);
      this.voiceCount++;
      source.addEventListener('ended', () => { this.voiceCount = Math.max(0, this.voiceCount - 1); }, { once: true });
    }

    spatialPan(x) {
      if (!player) return 0;
      return clamp((x - player.x) / Math.max(400, view.w * 0.6), -0.86, 0.86);
    }

    shoot(x, echo = false) {
      if (!this.ctx || this.ctx.currentTime - this.lastShotAt < 0.042) return;
      this.lastShotAt = this.ctx.currentTime;
      const pan = this.spatialPan(x);
      this.tone({
        frequency: echo ? 610 : 330,
        endFrequency: echo ? 1040 : 145,
        duration: echo ? 0.105 : 0.075,
        type: echo ? 'sine' : 'square',
        volume: echo ? 0.061 : 0.052,
        pan,
        filterFrequency: echo ? 4200 : 2400,
        q: 0.6,
        reverb: echo ? 0.18 : 0.035,
      });
      if (!echo && this.voiceCount < 70) this.noise({ duration: 0.025, volume: 0.012, frequency: 3600, endFrequency: 1800, pan, q: 0.45 });
      this.mark('shoot');
    }

    hit(x) {
      if (!this.ctx || this.ctx.currentTime - this.lastHitAt < 0.032) return;
      this.lastHitAt = this.ctx.currentTime;
      const pan = this.spatialPan(x);
      this.noise({ duration: 0.058, volume: 0.043, frequency: 2300, endFrequency: 930, pan, q: 1.2 });
      this.tone({ frequency: 210, endFrequency: 112, duration: 0.055, type: 'triangle', volume: 0.018, pan, filterFrequency: 1600 });
      this.mark('hit');
    }

    kill(x, heavy = false) {
      const pan = this.spatialPan(x);
      this.noise({ duration: heavy ? 0.38 : 0.17, volume: heavy ? 0.17 : 0.068, frequency: heavy ? 410 : 980, endFrequency: heavy ? 110 : 320, pan, q: heavy ? 0.65 : 0.9, reverb: heavy ? 0.22 : 0.07 });
      this.tone({ frequency: heavy ? 145 : 285, endFrequency: heavy ? 38 : 78, duration: heavy ? 0.48 : 0.22, type: 'sawtooth', volume: heavy ? 0.16 : 0.066, pan, filterFrequency: heavy ? 760 : 1700, reverb: heavy ? 0.2 : 0.055 });
      if (heavy) {
        this.tone({ frequency: 58, endFrequency: 32, duration: 0.56, type: 'sine', volume: 0.17, pan, reverb: 0.08 });
        this.duckMusic(0.32, 0.54);
      }
      this.mark(heavy ? 'killHeavy' : 'kill');
    }

    dash() {
      this.noise({ duration: 0.18, volume: 0.082, frequency: 660, endFrequency: 4200, filterType: 'bandpass', q: 0.58, reverb: 0.09 });
      this.tone({ frequency: 150, endFrequency: 920, duration: 0.17, type: 'sawtooth', volume: 0.076, filterFrequency: 2600, reverb: 0.06 });
      this.mark('dash');
    }

    echo() {
      [0, 0.055, 0.11].forEach((when, i) => this.tone({
        frequency: 260 * Math.pow(1.5, i),
        endFrequency: 640 * Math.pow(1.5, i),
        duration: 0.46,
        type: i === 1 ? 'triangle' : 'sine',
        volume: 0.078 / (i * 0.36 + 1),
        pan: i === 0 ? -0.42 : i === 2 ? 0.42 : 0,
        when,
        attack: 0.012,
        release: 0.19,
        reverb: 0.34,
      }));
      this.noise({ duration: 0.58, volume: 0.058, frequency: 1800, endFrequency: 5400, q: 0.45, reverb: 0.26 });
      this.duckMusic(0.6, 0.36);
      this.mark('echo');
    }

    phaseRift(x) {
      const pan = this.spatialPan(x);
      this.tone({ frequency: 188, endFrequency: 76, duration: 0.34, type: 'sawtooth', volume: 0.085, pan, filterFrequency: 1450, q: 0.75, reverb: 0.18 });
      [0, 0.045, 0.09].forEach((when, index) => this.tone({
        frequency: [370, 555, 740][index],
        endFrequency: [520, 760, 1040][index],
        duration: 0.28,
        type: index === 1 ? 'triangle' : 'sine',
        volume: 0.058 - index * 0.007,
        pan: pan + (index - 1) * 0.13,
        when,
        destination: 'sfx',
        reverb: 0.24,
      }));
      this.noise({ duration: 0.21, volume: 0.055, frequency: 5200, endFrequency: 880, pan, filterType: 'bandpass', q: 0.62, reverb: 0.16 });
      this.duckMusic(0.72, 0.24);
      this.mark('phaseRift');
    }

    pickup() {
      if (!this.ctx || this.ctx.currentTime - this.lastPickupAt < 0.028) return;
      this.lastPickupAt = this.ctx.currentTime;
      this.tone({ frequency: 720, endFrequency: 1180, duration: 0.085, type: 'sine', volume: 0.047, destination: 'ui', reverb: 0.08 });
      this.mark('pickup');
    }

    levelUp() {
      [0, 0.075, 0.15].forEach((when, i) => this.tone({ frequency: [330, 495, 740][i], endFrequency: [390, 590, 880][i], duration: 0.3, type: 'triangle', volume: 0.072 - i * 0.008, when, destination: 'ui', reverb: 0.24 }));
      this.duckMusic(0.72, 0.34);
      this.mark('levelUp');
    }

    draftReveal(rarity = 0) {
      const tier = clamp(Math.floor(rarity), 0, 5);
      const root = 260 * Math.pow(2, tier / 12);
      [0, 0.055, 0.11].forEach((when, i) => this.tone({ frequency: root * [1, 1.25, 1.5][i], endFrequency: root * [1.05, 1.32, 1.62][i], duration: 0.25 + tier * 0.025, type: tier >= 4 ? 'sine' : 'triangle', volume: 0.043 + tier * 0.006, when, destination: 'ui', reverb: 0.14 + tier * 0.035 }));
      this.mark('draftReveal');
    }

    upgrade(rarity = 1) {
      const tier = clamp(Math.floor(rarity), 0, 5);
      const notes = tier >= 4 ? [220, 330, 440, 660, 880] : [220, 330, 440, 660];
      notes.forEach((frequency, i) => this.tone({
        frequency: frequency * Math.pow(2, tier / 24),
        endFrequency: frequency * 1.18 * Math.pow(2, tier / 24),
        duration: 0.4 + tier * 0.035,
        type: tier >= 3 ? 'sine' : 'triangle',
        volume: 0.074 + tier * 0.008,
        when: i * 0.075,
        destination: 'ui',
        reverb: 0.22 + tier * 0.035,
      }));
      this.noise({ duration: 0.2, volume: 0.034 + tier * 0.006, frequency: 1700, endFrequency: 6200, when: 0.08, filterType: 'highpass', q: 0.5, destination: 'ui', reverb: 0.16 });
      this.duckMusic(0.45, 0.5);
      this.mark('upgrade');
    }

    reroll() {
      [0, 0.07, 0.14].forEach((when, i) => this.tone({ frequency: 720 - i * 110, endFrequency: 250 + i * 80, duration: 0.28, type: 'triangle', volume: 0.055, pan: i === 0 ? -0.35 : i === 2 ? 0.35 : 0, when, destination: 'ui', reverb: 0.19 }));
      this.noise({ duration: 0.34, volume: 0.04, frequency: 4900, endFrequency: 780, filterType: 'bandpass', q: 0.45, destination: 'ui', reverb: 0.16 });
      this.mark('reroll');
    }

    routeSelect(risk = '') {
      const dangerous = /높음|극/.test(String(risk));
      const base = dangerous ? 180 : 240;
      [0, 0.085, 0.17].forEach((when, i) => this.tone({ frequency: base * [1, 1.5, 2][i], endFrequency: base * [1.08, 1.62, 2.16][i], duration: 0.36, type: dangerous ? 'sawtooth' : 'triangle', volume: 0.07, when, destination: 'ui', filterFrequency: dangerous ? 1500 : 3200, reverb: 0.2 }));
      this.duckMusic(0.58, 0.38);
      this.mark('routeSelect');
    }

    playerHit() {
      this.noise({ duration: 0.31, volume: 0.205, frequency: 650, endFrequency: 170, q: 0.72, reverb: 0.06 });
      this.tone({ frequency: 145, endFrequency: 42, duration: 0.36, type: 'sawtooth', volume: 0.14, filterFrequency: 820 });
      this.tone({ frequency: 62, endFrequency: 32, duration: 0.4, type: 'sine', volume: 0.16 });
      this.duckMusic(0.24, 0.46);
      this.mark('playerHit');
    }

    shieldBreak() {
      this.noise({ duration: 0.42, volume: 0.13, frequency: 4600, endFrequency: 520, q: 0.5, reverb: 0.24 });
      [0, 0.045].forEach((when, i) => this.tone({ frequency: 1120 - i * 220, endFrequency: 170 + i * 45, duration: 0.38, type: 'triangle', volume: 0.09, when, pan: i ? 0.35 : -0.35, reverb: 0.22 }));
      this.mark('shieldBreak');
    }

    bossPulse() {
      this.tone({ frequency: 76, endFrequency: 36, duration: 0.68, type: 'sawtooth', volume: 0.17, filterFrequency: 560, reverb: 0.12 });
      this.tone({ frequency: 38, endFrequency: 28, duration: 0.75, type: 'sine', volume: 0.18 });
      this.noise({ duration: 0.45, volume: 0.09, frequency: 320, endFrequency: 120, q: 0.55, reverb: 0.08 });
      this.duckMusic(0.3, 0.64);
      this.mark('bossPulse');
    }

    waveStart(number = 1, boss = false) {
      const base = boss ? 96 : 180 + ((number - 1) % 4) * 18;
      if (boss) {
        this.bossPulse();
        window.setTimeout(() => this.tone({ frequency: 110, endFrequency: 72, duration: 0.55, type: 'sawtooth', volume: 0.1, destination: 'ui', reverb: 0.18 }), 120);
      } else {
        [0, 0.075].forEach((when, i) => this.tone({ frequency: base * [1, 1.5][i], endFrequency: base * [1.08, 1.62][i], duration: 0.34, type: 'triangle', volume: 0.052, when, destination: 'ui', reverb: 0.12 }));
      }
      this.mark('waveStart');
    }

    victory() {
      const notes = [220, 330, 440, 554, 660, 880];
      notes.forEach((frequency, i) => this.tone({ frequency, endFrequency: frequency * 1.04, duration: 0.85, type: i < 2 ? 'triangle' : 'sine', volume: 0.09, when: i * 0.1, destination: 'ui', attack: 0.018, release: 0.32, reverb: 0.38 }));
      this.noise({ duration: 0.7, volume: 0.046, frequency: 2600, endFrequency: 7600, when: 0.25, filterType: 'highpass', q: 0.4, destination: 'ui', reverb: 0.32 });
      this.duckMusic(0.25, 1.25);
      this.mark('victory');
    }

    defeat() {
      [0, 0.12, 0.24].forEach((when, i) => this.tone({ frequency: [196, 147, 98][i], endFrequency: [108, 82, 43][i], duration: 0.7, type: 'sawtooth', volume: 0.095, when, destination: 'ui', filterFrequency: 950 - i * 170, reverb: 0.16 }));
      this.noise({ duration: 0.82, volume: 0.08, frequency: 520, endFrequency: 90, q: 0.6, destination: 'ui', reverb: 0.12 });
      this.duckMusic(0.2, 1.1);
      this.mark('defeat');
    }

    uiHover() {
      if (!this.ctx || this.ctx.currentTime - this.lastUiHoverAt < 0.055) return;
      this.lastUiHoverAt = this.ctx.currentTime;
      this.tone({ frequency: 690, endFrequency: 760, duration: 0.045, type: 'sine', volume: 0.022, destination: 'ui', reverb: 0.025 });
      this.mark('uiHover');
    }

    uiSelect() {
      if (!this.ctx || this.ctx.currentTime - this.lastUiSelectAt < 0.06) return;
      this.lastUiSelectAt = this.ctx.currentTime;
      this.tone({ frequency: 310, endFrequency: 620, duration: 0.095, type: 'triangle', volume: 0.055, destination: 'ui', reverb: 0.08 });
      this.noise({ duration: 0.04, volume: 0.024, frequency: 2600, endFrequency: 4100, filterType: 'highpass', q: 0.45, destination: 'ui' });
      this.mark('uiSelect');
    }

    uiBack() {
      this.tone({ frequency: 520, endFrequency: 260, duration: 0.12, type: 'triangle', volume: 0.05, destination: 'ui', reverb: 0.07 });
      this.mark('uiBack');
    }

    soundTest() {
      this.uiSelect();
      window.setTimeout(() => this.draftReveal(3), 160);
      window.setTimeout(() => {
        this.noise({ duration: 0.16, volume: 0.095, frequency: 1500, endFrequency: 340, q: 0.7, destination: 'sfx', reverb: 0.12 });
        this.tone({ frequency: 130, endFrequency: 58, duration: 0.24, type: 'sawtooth', volume: 0.11, destination: 'sfx', filterFrequency: 980 });
      }, 520);
      this.mark('soundTest');
    }

    startMusic() {
      if (!this.ctx || this.musicTimer) return;
      this.nextNoteTime = this.ctx.currentTime + 0.08;
      this.musicStep = 0;
      this.musicTimer = window.setInterval(() => this.scheduleMusic(), 45);
    }

    musicIntensity() {
      if (gameState !== 'playing') return 0.24;
      const sector = currentWave?.number || 1;
      const threat = currentWave?.threat || 1;
      const boss = currentWave?.isBoss ? 0.18 : 0;
      return clamp(0.42 + (sector - 1) * 0.04 + Math.max(0, threat - 1) * 0.14 + boss, 0.42, 1);
    }

    scheduleMusic() {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const horizon = this.ctx.currentTime + 0.28;
      while (this.nextNoteTime < horizon) {
        if (settings.music) this.scheduleMusicStep(this.nextNoteTime, this.musicStep);
        this.nextNoteTime += 0.25;
        this.musicStep++;
      }
      if (this.nextNoteTime < this.ctx.currentTime - 0.5) this.nextNoteTime = this.ctx.currentTime + 0.08;
    }

    scheduleKick(time, intensity) {
      const when = Math.max(0, time - this.ctx.currentTime);
      this.tone({ frequency: 118, endFrequency: 42, duration: 0.18, type: 'sine', volume: 0.075 + intensity * 0.035, when, attack: 0.001, release: 0.09, destination: 'music' });
      this.noise({ duration: 0.032, volume: 0.014 + intensity * 0.01, frequency: 1600, endFrequency: 620, when, filterType: 'lowpass', q: 0.45, destination: 'music' });
    }

    scheduleHat(time, intensity, open = false) {
      const when = Math.max(0, time - this.ctx.currentTime);
      this.noise({ duration: open ? 0.11 : 0.035, volume: 0.011 + intensity * 0.012, frequency: 7200, endFrequency: open ? 4100 : 6200, when, filterType: 'highpass', q: 0.35, destination: 'music', reverb: open ? 0.08 : 0.015 });
    }

    scheduleSnare(time, intensity) {
      const when = Math.max(0, time - this.ctx.currentTime);
      this.noise({ duration: 0.12, volume: 0.026 + intensity * 0.018, frequency: 1900, endFrequency: 820, when, filterType: 'bandpass', q: 0.7, destination: 'music', reverb: 0.08 });
      this.tone({ frequency: 188, endFrequency: 122, duration: 0.095, type: 'triangle', volume: 0.018 + intensity * 0.012, when, destination: 'music' });
    }

    scheduleMusicStep(time, step) {
      const sector = currentWave?.number || 1;
      const intensity = this.musicIntensity();
      const active = gameState === 'playing';
      const progression = [0, -2, 3, 5];
      const scale = [0, 3, 7, 10, 12, 15, 19, 22];
      const arpPattern = [0, 2, 1, 3, 2, 4, 3, 1];
      const chordIndex = Math.floor(step / 8) % progression.length;
      const rootOffset = progression[chordIndex] + ((sector - 1) % 3);
      const root = 55 * Math.pow(2, rootOffset / 12);
      const degree = scale[arpPattern[step % arpPattern.length]];
      const arpFrequency = root * 2 * Math.pow(2, degree / 12);
      const when = Math.max(0, time - this.ctx.currentTime);

      if (this.musicFilter) {
        const target = 3200 + intensity * 5200;
        this.musicFilter.frequency.setTargetAtTime(target, time, 0.14);
      }

      this.tone({
        frequency: arpFrequency,
        endFrequency: arpFrequency * 0.998,
        duration: active ? 0.22 : 0.38,
        type: step % 4 === 0 ? 'triangle' : 'sine',
        volume: (active ? 0.035 : 0.026) + intensity * 0.015,
        when,
        attack: 0.008,
        release: active ? 0.08 : 0.16,
        destination: 'music',
        pan: Math.sin(step * 1.35) * 0.32,
        filterFrequency: 4200 + intensity * 1800,
        q: 0.35,
        reverb: active ? 0.12 : 0.24,
      });

      if (step % 2 === 0) {
        this.tone({
          frequency: root,
          endFrequency: root * 0.982,
          duration: 0.42,
          type: 'sawtooth',
          volume: 0.035 + intensity * 0.018,
          when,
          attack: 0.006,
          release: 0.16,
          destination: 'music',
          filterFrequency: 520 + intensity * 420,
          q: 0.52,
          reverb: 0.025,
        });
      }

      if (step % 8 === 0) {
        [0, 3, 7].forEach((semitones, i) => this.tone({
          frequency: root * 2 * Math.pow(2, semitones / 12),
          endFrequency: root * 2 * Math.pow(2, semitones / 12) * 0.997,
          duration: 1.85,
          type: 'sine',
          volume: (active ? 0.016 : 0.022) + intensity * 0.004,
          pan: [-0.38, 0, 0.38][i],
          when,
          attack: 0.18,
          release: 0.55,
          sustain: 0.82,
          destination: 'music',
          reverb: 0.34,
        }));
      }

      if (active) {
        if (step % 4 === 0) this.scheduleKick(time, intensity);
        if (step % 8 === 4) this.scheduleSnare(time, intensity);
        if (step % 2 === 1) this.scheduleHat(time, intensity, step % 8 === 7);
        if (currentWave?.isBoss && step % 2 === 0) {
          this.tone({ frequency: root * 0.5, endFrequency: root * 0.43, duration: 0.48, type: 'sawtooth', volume: 0.034, when, destination: 'music', filterFrequency: 310, q: 0.8 });
        }
      }
    }

    status() {
      return Object.freeze({
        supported: this.enabled,
        initialized: Boolean(this.ctx),
        state: this.ctx?.state || 'uninitialized',
        unlocked: this.unlocked,
        activeVoices: this.voiceCount,
        gameActive: this.gameActive,
        master: this.masterGain ? Number(this.masterGain.gain.value.toFixed(3)) : 0,
        music: this.musicGain ? Number(this.musicGain.gain.value.toFixed(3)) : 0,
        sfx: this.sfxGain ? Number(this.sfxGain.gain.value.toFixed(3)) : 0,
        ui: this.uiGain ? Number(this.uiGain.gain.value.toFixed(3)) : 0,
        events: { ...this.debugEvents },
      });
    }
  }

  const audio = new AudioEngine();

  function updateAudioStatus(message, state = '') {
    const status = $('#audioStatus');
    if (!status) return;
    status.textContent = message;
    if (state) status.dataset.state = state;
    else delete status.dataset.state;
  }

  async function unlockAudio() {
    const ready = await audio.init();
    if (ready) updateAudioStatus('오디오 엔진 준비 완료 · 테스트로 믹스를 확인할 수 있습니다.', 'ready');
    else if (!audio.enabled) updateAudioStatus('이 브라우저에서는 Web Audio를 사용할 수 없습니다.', 'blocked');
    return ready;
  }

  document.addEventListener('pointerdown', unlockAudio, { once: true, capture: true });
  document.addEventListener('keydown', unlockAudio, { once: true, capture: true });

  // ---------------------------------------------------------------------------
  // Input: keyboard, mouse, touch, gamepad
  // ---------------------------------------------------------------------------
  const hasCoarsePointer = () => (navigator.maxTouchPoints || 0) > 0 || window.matchMedia?.('(pointer: coarse)').matches;

  function echoControlModeForDevice(device = 'keyboard') {
    if (settings.echoControlMode !== 'adaptive') return settings.echoControlMode;
    return device === 'touch' ? 'toggle' : 'hold';
  }

  function captureEchoSnapshot() {
    if (!player) return null;
    const recordFrames = Math.max(1, Math.ceil(player.echoRecordSeconds / FIXED_DT));
    return player.history.slice(-recordFrames).map((sample) => ({ ...sample }));
  }

  class InputManager {
    constructor() {
      this.keys = new Set();
      this.justPressed = new Set();
      this.echoKeyboardKeys = new Set();
      this.pointer = { x: innerWidth / 2, y: innerHeight / 2, down: false, type: 'mouse', moved: false };
      this.touchMove = { x: 0, y: 0 };
      this.touchAim = { x: 0, y: 0, active: false };
      this.touchFire = false;
      this.touchStickPointers = { move: null, aim: null };
      this.touchEchoPointerId = null;
      this.actions = { dash: false, echo: false };
      this.echoHeld = false;
      this.echoHoldStartedAt = 0;
      this.echoLock = null;
      this.echoRequestQueued = null;
      this.gamepad = { moveX: 0, moveY: 0, aimX: 0, aimY: 0, fire: false, connected: false };
      this.previousButtons = [];
      this.uiAxisLatch = { x: 0, y: 0 };
      this.lastDevice = hasCoarsePointer() ? 'touch' : 'keyboard';
      this.lastDeviceAt = performance.now();
      document.body.dataset.inputDevice = this.lastDevice;
      this.bind();
    }

    setLastDevice(device) {
      if (!device) return;
      const changed = this.lastDevice !== device;
      this.lastDeviceAt = performance.now();
      if (!changed) return;
      this.lastDevice = device;
      document.body.dataset.inputDevice = device;
      updateTouchControlsVisibility();
      // Before the first synchronization hit the timing window follows the
      // device the player actually chose, not the hardware the device happens
      // to expose (for example a touch-enabled laptop using mouse + keyboard).
      if (tutorial?.active && tutorial.step === 5 && !Number.isFinite(tutorial.echoHitAt) && !Number.isFinite(tutorial.presentHitAt)) {
        tutorial.syncWindowSeconds = NaN;
      }
      refreshTutorialCopy();
    }

    clearTouchState() {
      this.touchMove = { x: 0, y: 0 };
      this.touchAim = { x: 0, y: 0, active: false };
      this.touchFire = false;
      this.touchStickPointers.move = null;
      this.touchStickPointers.aim = null;
      this.touchEchoPointerId = null;
      $('.stick-knob', $('#moveZone'))?.style.setProperty('transform', 'translate(0, 0)');
      $('.stick-knob', $('#aimZone'))?.style.setProperty('transform', 'translate(0, 0)');
      $('#touchEcho')?.classList.remove('pressed');
    }

    bind() {
      window.addEventListener('keydown', (event) => {
        if (capturePendingKeyBinding(event)) return;
        const key = event.key.toLowerCase();
        const token = eventKeyToken(event);
        const echoKey = keyMatchesAction('echoPrimary', token) || keyMatchesAction('echoSecondary', token);
        if (!this.keys.has(token)) {
          if (echoKey) {
            this.echoKeyboardKeys.add(token);
            if (this.echoKeyboardKeys.size === 1) this.beginEcho('keyboard');
          } else this.justPressed.add(token);
        }
        this.keys.add(token);
        this.setLastDevice('keyboard');
        if (gameState === 'playing' || gameState === 'paused' || gameState === 'upgrade' || gameState === 'route') {
          const mappedAction = ['moveUp', 'moveDown', 'moveLeft', 'moveRight', 'aimUp', 'aimDown', 'aimLeft', 'aimRight', 'fire', 'dash', 'echoPrimary', 'echoSecondary', 'reroll', 'pause'].some((action) => keyMatchesAction(action, token));
          if (mappedAction || ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(token)) event.preventDefault();
        }
        if (keyMatchesAction('pause', token)) {
          if (gameState === 'playing' && this.cancelEcho('escape', false)) {
            showToast('잔향 잠금 취소 · 쿨다운은 소비되지 않았습니다', 1500);
            event.preventDefault();
            return;
          }
          if (gameState === 'playing') pauseGame();
          else if (gameState === 'paused') resumeGame();
        }
        if (gameState === 'upgrade' && ['1', '2', '3', '4', '5', '6'].includes(key)) {
          const button = UI.upgradeChoices.children[Number(key) - 1]?.querySelector?.('.upgrade-select') || UI.upgradeChoices.children[Number(key) - 1];
          if (button) button.click();
        }
        if (gameState === 'upgrade' && keyMatchesAction('reroll', token)) rerollUpgradeChoices();
        if (gameState === 'route' && ['1', '2', '3'].includes(key)) {
          const button = UI.routeChoices.children[Number(key) - 1];
          if (button) button.click();
        }
      });

      window.addEventListener('keyup', (event) => {
        const token = eventKeyToken(event);
        this.keys.delete(token);
        if (keyMatchesAction('echoPrimary', token) || keyMatchesAction('echoSecondary', token)) {
          this.echoKeyboardKeys.delete(token);
          if (this.echoKeyboardKeys.size === 0) this.endEcho('keyboard');
        }
      });
      window.addEventListener('blur', () => {
        this.keys.clear();
        this.echoKeyboardKeys.clear();
        this.pointer.down = false;
        this.clearTouchState();
        this.cancelEcho('blur', false);
        this.echoRequestQueued = null;
      });

      canvas.addEventListener('pointermove', (event) => {
        this.pointer.x = event.clientX;
        this.pointer.y = event.clientY;
        this.pointer.type = event.pointerType || 'mouse';
        this.pointer.moved = true;
        this.setLastDevice(event.pointerType === 'touch' ? 'touch' : 'mouse');
      });

      canvas.addEventListener('pointerdown', (event) => {
        this.pointer.x = event.clientX;
        this.pointer.y = event.clientY;
        this.pointer.type = event.pointerType || 'mouse';
        if (event.button === 0) this.pointer.down = true;
        if (event.button === 2) this.actions.dash = true;
        this.setLastDevice(event.pointerType === 'touch' ? 'touch' : 'mouse');
        if (gameState === 'playing') audio.init();
      });

      window.addEventListener('pointerup', (event) => {
        if (event.button === 0) this.pointer.down = false;
      });
      canvas.addEventListener('contextmenu', (event) => event.preventDefault());

      window.addEventListener('gamepadconnected', (event) => {
        this.gamepad.connected = true;
        showToast(`게임패드 연결됨 · ${event.gamepad.id.slice(0, 28)}`, 2600);
      });
      window.addEventListener('gamepaddisconnected', () => {
        this.gamepad.connected = false;
        this.previousButtons = [];
        if (this.echoLock?.device === 'gamepad') this.cancelEcho('disconnect', false);
        this.setLastDevice(hasCoarsePointer() ? 'touch' : 'keyboard');
      });

      this.bindTouchStick($('#moveZone'), 'move');
      this.bindTouchStick($('#aimZone'), 'aim');
      this.bindTouchAction($('#touchDash'), 'dash');
      this.bindTouchAction($('#touchEcho'), 'echo');
    }

    beginEcho(device = 'keyboard') {
      this.setLastDevice(device);
      if (gameState !== 'playing' || !player || player.echoCooldown > 0.01) return false;
      const mode = echoControlModeForDevice(device);
      if (mode === 'toggle' && this.echoLock) {
        this.queueLockedEcho();
        navigator.vibrate?.(18);
        return true;
      }
      if (this.echoLock) return false;
      const samples = captureEchoSnapshot();
      if (tutorial?.active && tutorial.step === 4 && !tutorial.replayStat) {
        tutorial.replayLockedSignature = echoSnapshotSignature(samples);
        tutorial.replayLockedFrames = samples?.length || 0;
      }
      const minimum = Math.min(45, Math.max(1, Math.ceil(player.echoRecordSeconds / FIXED_DT)));
      if (!samples || samples.length < minimum) {
        showToast('아직 재현할 과거가 충분하지 않습니다', 1300);
        return false;
      }
      const now = performance.now();
      if (mode === 'instant') {
        this.echoRequestQueued = { samples, device, lockedAt: now, mode };
        navigator.vibrate?.(18);
        return true;
      }
      this.echoLock = { samples, device, mode, lockedAt: now };
      this.echoHeld = mode === 'hold';
      this.echoHoldStartedAt = now;
      audio.uiHover();
      navigator.vibrate?.(10);
      return true;
    }

    endEcho(device = 'keyboard') {
      if (!this.echoLock || this.echoLock.device !== device) return false;
      if (this.echoLock.mode !== 'hold') return false;
      this.queueLockedEcho();
      return true;
    }

    queueLockedEcho() {
      if (!this.echoLock) return false;
      this.echoRequestQueued = {
        samples: this.echoLock.samples.map((sample) => ({ ...sample })),
        device: this.echoLock.device,
        lockedAt: this.echoLock.lockedAt,
        mode: this.echoLock.mode,
      };
      this.echoLock = null;
      this.echoHeld = false;
      this.echoHoldStartedAt = 0;
      return true;
    }

    cancelEcho(reason = 'cancel', notify = false) {
      if (!this.echoLock) {
        if (reason === 'blur' || reason === 'touch-cancel') this.touchEchoPointerId = null;
        return false;
      }
      this.echoLock = null;
      this.touchEchoPointerId = null;
      $('#touchEcho')?.classList.remove('pressed');
      this.echoHeld = false;
      this.echoHoldStartedAt = 0;
      if (notify) showToast('잔향 잠금을 취소했습니다', 1200);
      return true;
    }

    bindTouchStick(zone, type) {
      if (!zone) return;
      const base = $('.stick-base', zone);
      const knob = $('.stick-knob', zone);

      const update = (event) => {
        const rect = base.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        let dx = event.clientX - cx;
        let dy = event.clientY - cy;
        const max = Math.max(1, rect.width * 0.34);
        const len = Math.hypot(dx, dy);
        if (len > max) {
          dx = dx / len * max;
          dy = dy / len * max;
        }
        knob.style.transform = `translate(${dx}px, ${dy}px)`;
        const vector = { x: dx / max, y: dy / max };
        if (type === 'move') this.touchMove = vector;
        else {
          this.touchAim = { ...vector, active: Math.hypot(vector.x, vector.y) > 0.18 };
          this.touchFire = this.touchAim.active;
        }
        this.setLastDevice('touch');
      };

      zone.addEventListener('pointerdown', (event) => {
        if (this.touchStickPointers[type] !== null) return;
        this.touchStickPointers[type] = event.pointerId;
        try { zone.setPointerCapture?.(event.pointerId); } catch (_) { /* capture may be unavailable */ }
        update(event);
        event.preventDefault();
      });
      zone.addEventListener('pointermove', (event) => {
        if (event.pointerId !== this.touchStickPointers[type]) return;
        update(event);
        event.preventDefault();
      });
      const end = (event) => {
        if (event.pointerId !== this.touchStickPointers[type]) return;
        this.touchStickPointers[type] = null;
        knob.style.transform = 'translate(0, 0)';
        if (type === 'move') this.touchMove = { x: 0, y: 0 };
        else {
          this.touchAim = { x: 0, y: 0, active: false };
          this.touchFire = false;
        }
      };
      zone.addEventListener('pointerup', end);
      zone.addEventListener('pointercancel', end);
      zone.addEventListener('lostpointercapture', end);
    }

    bindTouchAction(button, action) {
      if (!button) return;
      if (action === 'echo') {
        button.addEventListener('pointerdown', (event) => {
          if (this.touchEchoPointerId !== null) return;
          this.touchEchoPointerId = event.pointerId;
          this.setLastDevice('touch');
          button.classList.add('pressed');
          try { button.setPointerCapture?.(event.pointerId); } catch (_) { /* capture may be unavailable */ }
          this.beginEcho('touch');
          event.preventDefault();
        });
        button.addEventListener('pointerup', (event) => {
          if (event.pointerId !== this.touchEchoPointerId) return;
          this.touchEchoPointerId = null;
          button.classList.remove('pressed');
          this.endEcho('touch');
          event.preventDefault();
        });
        const cancelTouchEcho = (event) => {
          if (event.pointerId !== this.touchEchoPointerId) return;
          this.touchEchoPointerId = null;
          button.classList.remove('pressed');
          if (this.echoLock?.device === 'touch' && this.echoLock.mode === 'hold') this.cancelEcho('touch-cancel', false);
        };
        button.addEventListener('pointercancel', cancelTouchEcho);
        button.addEventListener('lostpointercapture', cancelTouchEcho);
        return;
      }
      button.addEventListener('pointerdown', (event) => {
        this.actions[action] = true;
        this.setLastDevice('touch');
        navigator.vibrate?.(12);
        event.preventDefault();
      });
    }

    updateGamepad() {
      const pads = navigator.getGamepads?.() || [];
      const gp = [...pads].find(Boolean);
      if (!gp) {
        this.gamepad.moveX = this.gamepad.moveY = this.gamepad.aimX = this.gamepad.aimY = 0;
        this.gamepad.fire = false;
        this.uiAxisLatch = { x: 0, y: 0 };
        return;
      }
      this.gamepad.connected = true;
      const dead = (value, zone = 0.16) => Math.abs(value) < zone ? 0 : (value - Math.sign(value) * zone) / (1 - zone);
      this.gamepad.moveX = dead(gp.axes[0] || 0);
      this.gamepad.moveY = dead(gp.axes[1] || 0);
      this.gamepad.aimX = dead(gp.axes[2] || 0, 0.2);
      this.gamepad.aimY = dead(gp.axes[3] || 0, 0.2);
      this.gamepad.fire = (gp.buttons[7]?.value || 0) > 0.25 || gp.buttons[2]?.pressed;
      const pressed = gp.buttons.map((button) => button.pressed || button.value > 0.5);
      const rising = (index) => pressed[index] && !this.previousButtons[index];
      const inCombat = gameState === 'playing';
      const echoPressed = Boolean(pressed[1] || pressed[5]);
      const echoWasPressed = Boolean(this.previousButtons[1] || this.previousButtons[5]);

      if (inCombat) {
        if (rising(0) || rising(4)) this.actions.dash = true;
        if (echoPressed && !echoWasPressed) this.beginEcho('gamepad');
        if (!echoPressed && echoWasPressed) this.endEcho('gamepad');
        this.uiAxisLatch = { x: 0, y: 0 };
      } else {
        if (rising(0)) activateInterfaceControl();
        if (rising(1)) backFromInterface();
        const dpadX = rising(15) ? 1 : rising(14) ? -1 : 0;
        const dpadY = rising(13) ? 1 : rising(12) ? -1 : 0;
        if (dpadX || dpadY) navigateInterface(dpadX, dpadY);

        const axisX = Math.abs(this.gamepad.moveX) > 0.62 ? Math.sign(this.gamepad.moveX) : 0;
        const axisY = Math.abs(this.gamepad.moveY) > 0.62 ? Math.sign(this.gamepad.moveY) : 0;
        if (axisX && axisX !== this.uiAxisLatch.x) navigateInterface(axisX, 0);
        else if (axisY && axisY !== this.uiAxisLatch.y) navigateInterface(0, axisY);
        this.uiAxisLatch.x = axisX;
        this.uiAxisLatch.y = axisY;
      }

      if (rising(9)) {
        if (gameState === 'playing' && this.cancelEcho('gamepad-menu', false)) showToast('잔향 잠금 취소', 1100);
        else if (gameState === 'playing') pauseGame();
        else if (gameState === 'paused') resumeGame();
      }
      if (Math.hypot(this.gamepad.moveX, this.gamepad.moveY, this.gamepad.aimX, this.gamepad.aimY) > 0.2 || pressed.some(Boolean)) this.setLastDevice('gamepad');
      this.previousButtons = pressed;
    }

    actionDown(actionId) {
      return this.keys.has(normalizeKeyBindingMap(settings.keyBindings)[actionId]);
    }

    actionJustPressed(actionId) {
      return this.justPressed.has(normalizeKeyBindingMap(settings.keyBindings)[actionId]);
    }

    clearActionPress(actionId) {
      this.justPressed.delete(normalizeKeyBindingMap(settings.keyBindings)[actionId]);
    }

    getMove() {
      let x = 0;
      let y = 0;
      if (this.actionDown('moveLeft')) x -= 1;
      if (this.actionDown('moveRight')) x += 1;
      if (this.actionDown('moveUp')) y -= 1;
      if (this.actionDown('moveDown')) y += 1;
      x += this.touchMove.x + this.gamepad.moveX;
      y += this.touchMove.y + this.gamepad.moveY;
      const mag = Math.hypot(x, y);
      if (mag > 1) { x /= mag; y /= mag; }
      return { x, y, mag: Math.min(1, mag) };
    }

    getAim() {
      let x = 0;
      let y = 0;
      let active = false;
      const keyX = (this.actionDown('aimRight') ? 1 : 0) - (this.actionDown('aimLeft') ? 1 : 0);
      const keyY = (this.actionDown('aimDown') ? 1 : 0) - (this.actionDown('aimUp') ? 1 : 0);
      if (keyX || keyY) {
        x = keyX; y = keyY; active = true;
      } else if (this.touchAim.active) {
        x = this.touchAim.x; y = this.touchAim.y; active = true;
      } else if (Math.hypot(this.gamepad.aimX, this.gamepad.aimY) > 0.24) {
        x = this.gamepad.aimX; y = this.gamepad.aimY; active = true;
      } else if (this.pointer.moved && player) {
        const worldPoint = screenToWorld(this.pointer.x, this.pointer.y);
        x = worldPoint.x - player.x;
        y = worldPoint.y - player.y;
        active = Math.hypot(x, y) > 2;
      }
      if (active) {
        const n = normalize(x, y);
        return { x: n.x, y: n.y, active: true };
      }
      return player ? { x: Math.cos(player.angle), y: Math.sin(player.angle), active: false } : { x: 1, y: 0, active: false };
    }

    isFiring(aimActive) {
      return this.pointer.down || this.touchFire || this.gamepad.fire || this.actionDown('fire') || (settings.autoFire && aimActive);
    }

    consumeDash() {
      const keyDash = this.actionJustPressed('dash') || this.justPressed.has('ShiftLeft') || this.justPressed.has('ShiftRight');
      const result = keyDash || this.actions.dash;
      this.actions.dash = false;
      this.clearActionPress('dash');
      this.justPressed.delete('ShiftLeft');
      this.justPressed.delete('ShiftRight');
      if (result && this.cancelEcho('dash', false)) showToast('잔향 잠금 취소 · 대시 우선', 1050);
      return result;
    }

    consumeEcho() {
      let request = this.echoRequestQueued;
      this.echoRequestQueued = null;
      if (!request && this.actions.echo) {
        const samples = captureEchoSnapshot();
        if (samples) request = { samples, device: this.lastDevice, lockedAt: performance.now(), mode: 'legacy' };
      }
      this.actions.echo = false;
      this.clearActionPress('echoPrimary');
      this.clearActionPress('echoSecondary');
      return request;
    }

    isEchoLocked() {
      return Boolean(this.echoLock);
    }

    isEchoPreviewing() {
      if (!this.echoLock) return false;
      return this.echoLock.mode === 'toggle' || performance.now() - this.echoLock.lockedAt >= 150;
    }

    getEchoLockedSamples() {
      return this.echoLock?.samples || null;
    }

    endStep() {
      this.justPressed.clear();
    }

    reset() {
      this.keys.clear();
      this.justPressed.clear();
      this.echoKeyboardKeys.clear();
      this.pointer.down = false;
      this.clearTouchState();
      this.actions = { dash: false, echo: false };
      this.echoHeld = false;
      this.echoHoldStartedAt = 0;
      this.echoLock = null;
      this.echoRequestQueued = null;
    }

    rumble(strong = 0.4, duration = 80) {
      const pads = navigator.getGamepads?.() || [];
      const gp = [...pads].find(Boolean);
      const actuator = gp?.vibrationActuator || gp?.hapticActuators?.[0];
      try {
        actuator?.playEffect?.('dual-rumble', { duration, strongMagnitude: strong, weakMagnitude: strong * 0.55 });
      } catch (_) { /* unsupported */ }
    }
  }

  const input = new InputManager();

  function shouldShowTouchControls() {
    if (gameState !== 'playing') return false;
    if (settings.touchControlsMode === 'always') return true;
    if (settings.touchControlsMode === 'hidden') return false;
    return input.lastDevice === 'touch';
  }

  function updateTouchControlsVisibility() {
    if (!UI.touch) return;
    const visible = shouldShowTouchControls();
    UI.touch.classList.toggle('hidden', !visible);
    UI.touch.setAttribute('aria-hidden', visible ? 'false' : 'true');
    document.body.classList.toggle('touch-controls-visible', visible);
  }

  function activeInterfaceControls() {
    const root = $('.screen.active');
    if (!root) return [];
    return $$('button:not([disabled]), select:not([disabled]), input:not([disabled]):not([type="hidden"])', root)
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      });
  }

  function focusInterfaceControl(element) {
    if (!element) return;
    element.focus({ preventScroll: true });
    element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: settings.reducedMotion ? 'auto' : 'smooth' });
  }

  function navigateInterface(dx, dy) {
    const controls = activeInterfaceControls();
    if (!controls.length) return;
    const current = controls.includes(document.activeElement) ? document.activeElement : null;
    if (!current) {
      focusInterfaceControl(controls[0]);
      return;
    }
    const origin = current.getBoundingClientRect();
    const ox = origin.left + origin.width / 2;
    const oy = origin.top + origin.height / 2;
    let best = null;
    let bestScore = Infinity;
    for (const candidate of controls) {
      if (candidate === current) continue;
      const rect = candidate.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const vx = cx - ox;
      const vy = cy - oy;
      const forward = vx * dx + vy * dy;
      if (forward <= 2) continue;
      const cross = Math.abs(vx * dy - vy * dx);
      const score = forward + cross * 1.75 + Math.hypot(vx, vy) * 0.08;
      if (score < bestScore) { best = candidate; bestScore = score; }
    }
    if (best) focusInterfaceControl(best);
  }

  function activateInterfaceControl() {
    const controls = activeInterfaceControls();
    if (!controls.length) return;
    const target = controls.includes(document.activeElement) ? document.activeElement : controls[0];
    if (target.matches('input[type="checkbox"]')) target.checked = !target.checked;
    target.dispatchEvent(new Event(target.matches('input,select') ? 'change' : 'click', { bubbles: true }));
    if (!controls.includes(document.activeElement)) focusInterfaceControl(target);
  }

  function backFromInterface() {
    if (gameState === 'paused') { resumeGame(); return; }
    if (gameState === 'upgrade' || gameState === 'route') return;
    const active = $('.screen.active');
    if (active && active !== UI.menu) returnToMenu();
  }

  // ---------------------------------------------------------------------------
  // Game state & background
  // ---------------------------------------------------------------------------
  let gameState = 'menu';
  let player = null;
  let currentWave = null;
  let gameTime = 0;
  let score = 0;
  let kills = 0;
  let runCores = 0;
  let bossesKilled = 0;
  let elitesKilled = 0;
  let lastCorePayout = 0;
  let runSettled = false;
  let runHistoryRecorded = false;
  let runSeed = 0;
  let endlessMode = false;
  let pendingLevelUps = 0;
  let currentUpgradeChoices = [];
  const lockedUpgradeIds = new Set();
  let runEconomyStats = createRunEconomyStats();
  let activeDraftGuarantee = null;
  let activeDraftChoiceBonus = 0;
  let currentRoute = null;
  let routeHistory = [];
  let pendingRouteChoices = [];
  let pendingRouteWave = 0;
  let pendingRouteBaseModifier = null;
  let pendingRouteForecasts = Object.create(null);
  let echoActivations = 0;
  let echoDamageTotal = 0;
  let echoKillsTotal = 0;
  let echoBestDamage = 0;
  let runDamageTotal = 0;
  let phaseRiftProcs = 0;
  let phaseRiftBonusDamage = 0;
  let echoReports = [];
  let deferredEchoReports = [];
  let lastEchoReport = null;
  let echoReportTimer = null;
  let tutorial = null;
  let nextEntityId = 1;
  let wakeLock = null;
  let toastTimer = null;
  let quality = configuredQualityTier();
  let perfAccumulator = 0;
  let perfFrames = 0;

  function createRunEconomyStats() {
    return {
      rerollsUsed: 0,
      lockedCardsTotal: 0,
      maxLockedCards: 0,
      lastLockedCards: 0,
      postRerollSelections: 0,
      pendingPostRerollSelection: false,
      synergyMilestones: [],
    };
  }

  function getRunEconomyStatus() {
    const rerollsUsed = Math.max(0, Math.floor(runEconomyStats.rerollsUsed || 0));
    const averageLockedCards = rerollsUsed > 0 ? runEconomyStats.lockedCardsTotal / rerollsUsed : 0;
    return {
      rerollsUsed,
      averageLockedCards: Number(averageLockedCards.toFixed(2)),
      maxLockedCards: Math.max(0, Math.floor(runEconomyStats.maxLockedCards || 0)),
      lastLockedCards: Math.max(0, Math.floor(runEconomyStats.lastLockedCards || 0)),
      postRerollSelections: Math.max(0, Math.floor(runEconomyStats.postRerollSelections || 0)),
      synergyMilestones: runEconomyStats.synergyMilestones.map((item) => ({ ...item })),
    };
  }

  function getRunEconomySummary() {
    const status = getRunEconomyStatus();
    return {
      rerollsUsed: status.rerollsUsed,
      averageLockedCards: status.averageLockedCards,
      maxLockedCards: status.maxLockedCards,
      postRerollSelections: status.postRerollSelections,
      synergyMilestones: status.synergyMilestones.slice(0, 6),
    };
  }

  function recordRerollEconomy(lockedCount, totalChoices) {
    const locked = clamp(Math.floor(Number(lockedCount) || 0), 0, Math.max(0, Math.floor(Number(totalChoices) || 0)));
    runEconomyStats.rerollsUsed += 1;
    runEconomyStats.lockedCardsTotal += locked;
    runEconomyStats.maxLockedCards = Math.max(runEconomyStats.maxLockedCards, locked);
    runEconomyStats.lastLockedCards = locked;
    runEconomyStats.pendingPostRerollSelection = true;
  }

  function recordUpgradeEconomySelection(family, rank) {
    if (runEconomyStats.pendingPostRerollSelection) {
      runEconomyStats.postRerollSelections += 1;
      runEconomyStats.pendingPostRerollSelection = false;
    }
    const milestone = rank >= 3 ? 3 : rank >= 2 ? 2 : 0;
    if (!milestone || !family) return;
    const exists = runEconomyStats.synergyMilestones.some((item) => item.family === family && item.rank === milestone);
    if (!exists) {
      runEconomyStats.synergyMilestones.push({
        family,
        rank: milestone,
        level: player?.level || 1,
        timeSeconds: Number(gameTime.toFixed(2)),
      });
    }
  }
  let lowFpsDuration = 0;
  let measuredFps = 60;
  let hudAccumulator = 0;
  let qualityToastAt = 0;
  let autoQualityLocked = settings.graphicsMode === 'auto' && quality === 0;
  let recentLongFrameScore = 0;
  let longFrameCount = 0;
  let lastQualityChangeAt = 0;
  let qualitySampleStartedAt = performance.now();
  let qualityGraceUntil = qualitySampleStartedAt + 1500;
  let lastQualityReason = 'initial';
  let lastQualityFrameMs = 0;
  let lastScenePressure = 0;
  let frameGlowPasses = 0;
  let lastRenderGlowPasses = 0;
  let totalGlowPasses = 0;
  let lastRenderFrameMs = 0;
  let activeGlow = null;

  const view = { w: innerWidth, h: innerHeight, dpr: 1 };
  const camera = { x: WORLD.w / 2, y: WORLD.h / 2, shake: 0, traumaX: 0, traumaY: 0 };
  const arrays = {
    enemies: [],
    playerBullets: [],
    enemyBullets: [],
    particles: [],
    pickups: [],
    echoes: [],
    shockwaves: [],
    floaters: [],
    links: [],
    lasers: [],
  };
  const particlePool = [];
  const bulletPool = [];
  const enemyBulletPool = [];
  const pickupPool = [];
  const stars = [];
  const nebulae = [];

  function swapRemove(array, index) {
    const removed = array[index];
    const last = array.pop();
    if (index < array.length) array[index] = last;
    return removed;
  }

  class EnemySpatialGrid {
    constructor(cellSize = 180) {
      this.cellSize = cellSize;
      this.cells = new Map();
      this.byId = new Map();
    }
    clear() { this.cells.clear(); this.byId.clear(); }
    key(cx, cy) { return `${cx},${cy}`; }
    rebuild(items) {
      this.clear();
      for (const enemy of items) {
        if (enemy.dead || enemy.spawnTime > 0) continue;
        const cx = Math.floor(enemy.x / this.cellSize);
        const cy = Math.floor(enemy.y / this.cellSize);
        const key = this.key(cx, cy);
        let cell = this.cells.get(key);
        if (!cell) { cell = []; this.cells.set(key, cell); }
        cell.push(enemy);
        this.byId.set(enemy.id, enemy);
      }
    }
    get(id) { return this.byId.get(id) || null; }
    query(x, y, radius, out) {
      out.length = 0;
      const minX = Math.floor((x - radius - 100) / this.cellSize);
      const maxX = Math.floor((x + radius + 100) / this.cellSize);
      const minY = Math.floor((y - radius - 100) / this.cellSize);
      const maxY = Math.floor((y + radius + 100) / this.cellSize);
      for (let cy = minY; cy <= maxY; cy++) {
        for (let cx = minX; cx <= maxX; cx++) {
          const cell = this.cells.get(this.key(cx, cy));
          if (!cell) continue;
          for (const enemy of cell) {
            if (enemy.dead || enemy.spawnTime > 0) continue;
            const rr = radius + (enemy.radius || 0);
            if (sqr(enemy.x - x) + sqr(enemy.y - y) <= rr * rr) out.push(enemy);
          }
        }
      }
      return out;
    }
  }

  const enemyGrid = new EnemySpatialGrid(180);
  const collisionScratch = [];
  const searchScratch = [];
  const aoeScratch = [];
  const chainScratch = [];
  const renderGroups = { player: new Map(), enemy: new Map(), particles: new Map() };
  const renderCache = { background: null, vignettePlay: null, vignetteMenu: null, nebulaSprites: new Map(), glowBase: null, glowSprites: new Map() };

  function clearRenderGroups(map) {
    for (const group of map.values()) group.length = 0;
  }

  function addRenderGroup(map, key, item) {
    let group = map.get(key);
    if (!group) { group = []; map.set(key, group); }
    group.push(item);
  }

  function makeNebulaSprite(color) {
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = 256;
    const g = sprite.getContext('2d');
    const gradient = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gradient;
    g.fillRect(0, 0, 256, 256);
    return sprite;
  }

  function rebuildRenderCache() {
    renderCache.background = ctx.createLinearGradient(0, 0, view.w, view.h);
    renderCache.background.addColorStop(0, '#040615');
    renderCache.background.addColorStop(0.48, '#070b1d');
    renderCache.background.addColorStop(1, '#030512');
    const inner = Math.min(view.w, view.h) * 0.22;
    const outer = Math.max(view.w, view.h) * 0.72;
    renderCache.vignettePlay = ctx.createRadialGradient(view.w / 2, view.h / 2, inner, view.w / 2, view.h / 2, outer);
    renderCache.vignettePlay.addColorStop(0, 'rgba(0,0,0,0)');
    renderCache.vignettePlay.addColorStop(1, 'rgba(0,0,10,0.34)');
    renderCache.vignetteMenu = ctx.createRadialGradient(view.w / 2, view.h / 2, inner, view.w / 2, view.h / 2, outer);
    renderCache.vignetteMenu.addColorStop(0, 'rgba(0,0,0,0)');
    renderCache.vignetteMenu.addColorStop(1, 'rgba(0,0,8,0.52)');
    for (const nebula of nebulae) {
      if (!renderCache.nebulaSprites.has(nebula.color)) renderCache.nebulaSprites.set(nebula.color, makeNebulaSprite(nebula.color));
    }
  }

  function initBackground() {
    stars.length = 0;
    nebulae.length = 0;
    const rng = mulberry32(0xECA017);
    for (let i = 0; i < 280; i++) {
      stars.push({
        x: rng() * WORLD.w,
        y: rng() * WORLD.h,
        size: 0.45 + rng() * 1.75,
        depth: 0.05 + rng() * 0.32,
        alpha: 0.16 + rng() * 0.72,
        twinkle: rng() * TAU,
      });
    }
    const colors = ['rgba(64,81,180,0.10)', 'rgba(55,180,220,0.075)', 'rgba(162,68,210,0.07)', 'rgba(34,112,169,0.065)'];
    for (let i = 0; i < 6; i++) {
      nebulae.push({
        x: rng() * WORLD.w,
        y: rng() * WORLD.h,
        radius: 240 + rng() * 360,
        color: colors[i % colors.length],
      });
    }
  }

  function resizeCanvas() {
    view.w = window.innerWidth;
    view.h = window.innerHeight;
    const cssPixels = Math.max(1, view.w * view.h);
    const mode = settings.graphicsMode;
    let pixelBudget;
    let cap;
    if (settings.reducedMotion || mode === 'performance') { pixelBudget = 2300000; cap = 1.0; }
    else if (mode === 'balanced') { pixelBudget = 3600000; cap = 1.18; }
    else if (mode === 'high') { pixelBudget = 6800000; cap = 1.5; }
    else if (quality === 2) { pixelBudget = 5400000; cap = 1.35; }
    else if (quality === 1) { pixelBudget = 3600000; cap = 1.18; }
    else { pixelBudget = 2300000; cap = 1.0; }
    const budgetDpr = Math.sqrt(pixelBudget / cssPixels);
    view.dpr = Math.max(0.72, Math.min(window.devicePixelRatio || 1, cap, budgetDpr));
    canvas.width = Math.max(1, Math.floor(view.w * view.dpr));
    canvas.height = Math.max(1, Math.floor(view.h * view.dpr));
    canvas.style.width = `${view.w}px`;
    canvas.style.height = `${view.h}px`;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    rebuildRenderCache();
  }

  function worldToScreen(x, y) {
    return { x: x - camera.x + view.w / 2, y: y - camera.y + view.h / 2 };
  }

  function screenToWorld(x, y) {
    return { x: x + camera.x - view.w / 2, y: y + camera.y - view.h / 2 };
  }

  function clearWorld() {
    clearTimeout(waveBannerTimer);
    waveBannerTimer = null;
    document.body.classList.remove('boss-intro-active', 'boss-materializing');
    UI.waveBanner?.classList.remove('boss-intro');
    for (const key of Object.keys(arrays)) arrays[key].length = 0;
    bulletPool.length = 0;
    enemyBulletPool.length = 0;
    particlePool.length = 0;
    pickupPool.length = 0;
    enemyGrid.clear();
    nextEntityId = 1;
  }

  function showScreen(screen) {
    UI.screens.forEach((el) => el.classList.remove('active'));
    if (screen) {
      screen.classList.add('active');
      screen.scrollTop = 0;
      if (input.lastDevice === 'gamepad') {
        window.setTimeout(() => {
          const first = activeInterfaceControls()[0];
          first?.focus({ preventScroll: true });
        }, 70);
      }
    }
  }

  function showToast(message, duration = 2200) {
    clearTimeout(toastTimer);
    UI.toast.textContent = message;
    UI.toast.classList.remove('hidden');
    UI.ariaLive.textContent = message;
    toastTimer = window.setTimeout(() => UI.toast.classList.add('hidden'), duration);
  }


  const ECHO_TIMELINE_SEGMENTS = 30;

  function configuredTutorialSyncWindow() {
    if (settings.tutorialTimingMode === 'relaxed') return 2;
    if (settings.tutorialTimingMode === 'strict') return 0.9;
    return resolvedInputDeviceFamily() === 'touch' ? 1.45 : 1.1;
  }

  function tutorialSyncWindow() {
    if (tutorial?.active && tutorial.step === 5 && Number.isFinite(tutorial.syncWindowSeconds)) return tutorial.syncWindowSeconds;
    return configuredTutorialSyncWindow();
  }

  function initEchoTimeline() {
    if (!UI.echoTimeline || UI.echoTimeline.children.length === ECHO_TIMELINE_SEGMENTS) return;
    UI.echoTimeline.innerHTML = Array.from({ length: ECHO_TIMELINE_SEGMENTS }, () => '<i></i>').join('');
  }

  function analyzeEchoBuffer(samples = null) {
    if (!player) return { samples: [], frames: 0, shots: 0, dashEvents: 0, distance: 0, coverage: 0 };
    const recordFrames = Math.max(1, Math.ceil(player.echoRecordSeconds / FIXED_DT));
    const source = samples || player.history.slice(-recordFrames);
    let shots = 0;
    let dashEvents = 0;
    let distance = 0;
    let previousDash = false;
    for (let i = 0; i < source.length; i++) {
      const sample = source[i];
      if (sample.fire) shots++;
      if (sample.dash && !previousDash) dashEvents++;
      previousDash = Boolean(sample.dash);
      if (i > 0) distance += Math.hypot(sample.x - source[i - 1].x, sample.y - source[i - 1].y);
    }
    return {
      samples: source,
      frames: source.length,
      shots,
      dashEvents,
      distance,
      coverage: clamp(source.length / recordFrames, 0, 1),
    };
  }

  function resolvedInputDeviceFamily() {
    if (input.lastDevice === 'gamepad') return 'gamepad';
    if (input.lastDevice === 'touch') return 'touch';
    if (input.lastDevice === 'mouse') return 'mouse';
    return 'keyboard';
  }

  function echoSnapshotSignature(samples) {
    if (!Array.isArray(samples) || !samples.length) return 'empty';
    const first = samples[0];
    const last = samples[samples.length - 1];
    let shots = 0;
    let dashes = 0;
    for (const sample of samples) {
      if (sample.fire) shots++;
      if (sample.dash) dashes++;
    }
    return [
      samples.length,
      Math.round(first.x), Math.round(first.y), Math.round(first.angle * 1000),
      Math.round(last.x), Math.round(last.y), Math.round(last.angle * 1000),
      shots, dashes,
    ].join(':');
  }

  function effectiveEchoReportMode() {
    if (tutorial?.active) return 'detailed';
    if (settings.echoReportMode !== 'adaptive') return settings.echoReportMode;
    return resolvedInputDeviceFamily() === 'touch' ? 'compact' : 'detailed';
  }

  function updateEchoRecorderHUD() {
    if (!player || !UI.echoTimeline) return;
    initEchoTimeline();
    const recordFrames = Math.max(1, Math.ceil(player.echoRecordSeconds / FIXED_DT));
    const lockedSamples = input.getEchoLockedSamples();
    const samples = lockedSamples || player.history.slice(-recordFrames);
    const analysis = analyzeEchoBuffer(samples);
    const segments = [...UI.echoTimeline.children];
    const missingFrames = Math.max(0, recordFrames - samples.length);
    let lastPopulated = -1;
    for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
      const frameFrom = Math.floor(segmentIndex * recordFrames / ECHO_TIMELINE_SEGMENTS);
      const frameTo = Math.max(frameFrom + 1, Math.floor((segmentIndex + 1) * recordFrames / ECHO_TIMELINE_SEGMENTS));
      const dataFrom = Math.max(0, frameFrom - missingFrames);
      const dataTo = Math.max(0, frameTo - missingFrames);
      const bucket = samples.slice(dataFrom, dataTo);
      const node = segments[segmentIndex];
      node.className = '';
      if (!bucket.length) continue;
      lastPopulated = segmentIndex;
      let moved = false;
      let fired = false;
      let dashed = false;
      for (let i = 0; i < bucket.length; i++) {
        fired ||= Boolean(bucket[i].fire);
        dashed ||= Boolean(bucket[i].dash);
        const previous = i > 0 ? bucket[i - 1] : samples[Math.max(0, dataFrom - 1)];
        if (previous && Math.hypot(bucket[i].x - previous.x, bucket[i].y - previous.y) > 0.7) moved = true;
      }
      if (moved) node.classList.add('move');
      if (fired) node.classList.add('fire');
      if (dashed) node.classList.add('dash');
    }
    if (lastPopulated >= 0) segments[lastPopulated]?.classList.add('current');
    if (UI.echoRecordDuration) UI.echoRecordDuration.textContent = `${player.echoRecordSeconds.toFixed(1)}s`;
    const locked = input.isEchoLocked();
    if (UI.echoRecorderSummary) {
      UI.echoRecorderSummary.textContent = locked
        ? `LOCKED · 사격 ${analysis.shots}회 · 대시 ${analysis.dashEvents} · ${Math.round(analysis.distance / WORLD_UNITS_PER_METER)}m`
        : analysis.coverage < 0.82
          ? `기록 ${Math.round(analysis.coverage * 100)}% · 움직여 채우기`
          : `사격 ${analysis.shots}회 · 대시 ${analysis.dashEvents} · 이동 ${Math.round(analysis.distance / WORLD_UNITS_PER_METER)}m`;
    }
    const previewing = input.isEchoPreviewing() && player.echoCooldown <= 0 && analysis.frames >= Math.min(45, recordFrames);
    UI.echoAbility?.classList.toggle('previewing', previewing);
    UI.echoAbility?.classList.toggle('locked', locked);
    $('#echoRecorder')?.classList.toggle('locked', locked);
    const touchEcho = $('#touchEcho');
    touchEcho?.classList.toggle('locked', locked);
    const touchState = $('#touchEchoState');
    const deviceFamily = resolvedInputDeviceFamily();
    const mode = echoControlModeForDevice(deviceFamily);
    if (touchState) touchState.textContent = locked ? (mode === 'toggle' ? '전개' : '유지') : mode === 'toggle' ? 'LOCK' : mode === 'instant' ? 'NOW' : 'HOLD';
    const echoState = $('.ability-state', UI.echoAbility);
    const keyNode = $('.ability-key', UI.echoAbility);
    if (keyNode) keyNode.textContent = deviceFamily === 'gamepad' ? 'B/RB' : deviceFamily === 'touch' ? (mode === 'toggle' ? '2×' : 'HOLD') : 'E';
    if (locked && echoState) echoState.textContent = mode === 'toggle' ? '다시 눌러 전개' : '놓으면 재현';
  }

  function showEchoReport(stat, forcedMode = null) {
    if (!UI.echoReport || !stat) return;
    clearTimeout(echoReportTimer);
    const mode = forcedMode || effectiveEchoReportMode();
    const damage = Math.round(stat.damage || 0);
    const dotDamage = Math.round(stat.dotDamage || 0);
    const directDamage = Math.max(0, damage - dotDamage);
    const killsByEcho = Math.max(0, Math.floor(stat.kills || 0));
    const hitIndex = stat.shots > 0 ? Math.min(999, Math.round((stat.hits || 0) / stat.shots * 100)) : 0;
    const riftCount = Math.max(0, Math.floor(stat.phaseRifts || 0));
    const riftBonus = Math.max(0, Math.round(stat.phaseRiftBonusDamage || 0));
    const excellent = killsByEcho >= 3 || damage >= Math.max(140, (player?.damage || 20) * 18) || riftCount >= 2;
    UI.echoReport.classList.toggle('excellent', excellent);
    UI.echoReport.classList.toggle('compact', mode === 'compact');
    UI.echoReportMain.textContent = stat.sectorSummary
      ? `구역 합계 피해 ${formatNumber(damage)} · 처치 ${killsByEcho}`
      : `피해 ${formatNumber(damage)} · 처치 ${killsByEcho}`;
    let subText;
    if (stat.sectorSummary) subText = `호출 ${stat.calls || 0}회 · 호출당 평균 ${formatNumber((stat.calls || 0) > 0 ? damage / stat.calls : 0)} 피해${dotDamage > 0 ? ` · 지속 ${formatNumber(dotDamage)}` : ''}`;
    else if (dotDamage > 0) subText = `직접 ${formatNumber(directDamage)} + 지속 ${formatNumber(dotDamage)} · 유효 적중 지수 ${hitIndex}`;
    else if (excellent) subText = `정교한 3초였습니다 · 발사체당 유효 적중 지수 ${hitIndex}`;
    else if (damage <= 0) subText = '적이 지나갈 위치를 향해 사격하는 3초를 기록해 보세요.';
    else if (hitIndex < 28) subText = `유효 적중 지수 ${hitIndex} · 경로와 조준 방향을 함께 설계해 보세요.`;
    else subText = `유효 적중 지수 ${hitIndex} · 다음에는 교차 사격 각도를 더 크게 만들어 보세요.`;
    if (riftCount > 0) subText += ` · 위상 균열 ${riftCount}회 / 추가 ${formatNumber(riftBonus)}`;
    UI.echoReportSub.textContent = subText;
    UI.echoReport.classList.remove('hidden');
    lastEchoReport = { damage, directDamage, dotDamage, kills: killsByEcho, hitIndex, phaseRifts: riftCount, phaseRiftBonusDamage: riftBonus, calls: stat.calls || 1, at: gameTime };
    if (tutorial?.active && tutorial.syncSuccess && tutorial.step >= 5) {
      tutorial.reportSeen = true;
      tutorial.reportSeenAt = gameTime;
    }
    echoReportTimer = window.setTimeout(() => UI.echoReport.classList.add('hidden'), mode === 'compact' ? 1900 : 3600);
  }

  function queueEchoReport(stat) {
    if (!stat || stat.queued || stat.finalized) return;
    stat.queued = true;
    stat.playbackDoneAt = gameTime;
    // Normal bullets, ricochets and echo-origin burns all settle well inside
    // this safety window. The report still finalizes as soon as no linked
    // effect remains; the deadline only prevents a corrupt entity from
    // blocking feedback forever.
    const effectWindow = Math.max(8, (player?.bulletLife || 1.45) + 5.5);
    echoReports.push({ stat, readyAt: gameTime + 0.18, deadline: gameTime + effectWindow });
  }

  function echoHasPendingEffects(stat) {
    if (arrays.playerBullets.some((bullet) => bullet.echoStat === stat)) return true;
    return arrays.enemies.some((enemy) => !enemy.dead && (
      (Array.isArray(enemy.burnSources) && enemy.burnSources.some((source) => source.remaining > 0 && source.echoStat === stat))
      || (enemy.burnTime > 0 && enemy.burnEchoStat === stat)
      || (enemy.phaseRiftTime > 0 && enemy.phaseRiftSourceStat === stat)
    ));
  }

  function finalizeEchoReport(stat) {
    if (!stat || stat.finalized) return;
    stat.finalized = true;
    stat.finalizedAt = gameTime;
    const mode = effectiveEchoReportMode();
    if (mode === 'sector' && !tutorial?.active) deferredEchoReports.push(stat);
    else showEchoReport(stat, mode);
  }

  function updateEchoReports() {
    if (!echoReports.length) return;
    for (let i = echoReports.length - 1; i >= 0; i--) {
      const item = echoReports[i];
      if (gameTime < item.readyAt) continue;
      const pending = echoHasPendingEffects(item.stat);
      if (pending && gameTime < item.deadline) continue;
      echoReports.splice(i, 1);
      finalizeEchoReport(item.stat);
    }
  }

  function flushDeferredEchoReports() {
    if (!deferredEchoReports.length) return;
    const stats = deferredEchoReports.splice(0);
    const summary = stats.reduce((acc, stat) => {
      acc.damage += stat.damage || 0;
      acc.dotDamage += stat.dotDamage || 0;
      acc.kills += stat.kills || 0;
      acc.hits += stat.hits || 0;
      acc.shots += stat.shots || 0;
      acc.phaseRifts += stat.phaseRifts || 0;
      acc.phaseRiftBonusDamage += stat.phaseRiftBonusDamage || 0;
      return acc;
    }, { damage: 0, dotDamage: 0, kills: 0, hits: 0, shots: 0, phaseRifts: 0, phaseRiftBonusDamage: 0, calls: stats.length, sectorSummary: true });
    showEchoReport(summary, input.lastDevice === 'touch' ? 'compact' : 'detailed');
  }

  function tutorialDeviceFamily() {
    return resolvedInputDeviceFamily();
  }

  function tutorialInputNames() {
    const device = tutorialDeviceFamily();
    if (device === 'touch') return {
      device, label: 'TOUCH', move: '왼쪽 가상 스틱', aimFire: '오른쪽 가상 스틱을 끌어 조준하고 사격', dash: '대시 버튼', echo: '잔향 버튼', cancel: '대시 버튼',
    };
    if (device === 'gamepad') return {
      device, label: 'GAMEPAD', move: '왼쪽 스틱', aimFire: '오른쪽 스틱으로 조준하고 RT 또는 X로 사격', dash: 'A 또는 LB', echo: 'B 또는 RB', cancel: '메뉴 버튼 또는 대시',
    };
    if (device === 'mouse') return {
      device, label: 'KEYBOARD + MOUSE', move: 'WASD', aimFire: '마우스로 조준하고 클릭해 사격', dash: 'SPACE 또는 SHIFT', echo: 'E 또는 Q', cancel: 'ESC 또는 대시',
    };
    return {
      device, label: 'KEYBOARD', move: 'WASD', aimFire: '방향키로 조준하고 J를 눌러 사격', dash: 'SPACE 또는 SHIFT', echo: 'E 또는 Q', cancel: 'ESC 또는 대시',
    };
  }

  function tutorialEchoInstruction(names) {
    const mode = echoControlModeForDevice(names.device);
    if (mode === 'toggle') return `${names.echo}을 한 번 눌러 지금의 3초를 LOCKED로 고정하고, 다시 눌러 같은 기록을 전개하세요.`;
    if (mode === 'instant') return `${names.echo}을 누르면 그 순간의 3초가 고정되어 즉시 전개됩니다.`;
    return `${names.echo}을 누르는 순간 3초가 LOCKED로 고정됩니다. 유지해 궤적을 확인하고 놓아 전개하세요.`;
  }

  function echoQuickHint() {
    const names = tutorialInputNames();
    const mode = echoControlModeForDevice(names.device);
    if (mode === 'toggle') return `REC 확인 · ${names.echo} 한 번은 LOCK, 다시 한 번은 전개`;
    if (mode === 'instant') return `REC 확인 · ${names.echo}을 누르면 그 순간의 3초를 즉시 재현`;
    return `REC 확인 · ${names.echo}을 누르는 순간 LOCK, 모두 놓으면 같은 3초를 재현`;
  }

  const tutorialSteps = [
    { title: '이동하며 표적을 맞히세요', body: (n) => `${n.move}으로 움직이면서 ${n.aimFire}하세요. 오른쪽 훈련 표적을 맞히면 이동과 사격이 REC 타임라인에 함께 쌓입니다.`, hint: () => '청록은 이동, 보라는 사격, 청록+보라는 이동하며 사격한 시간입니다.' },
    { title: '조준하고 사격하세요', body: (n) => `${n.aimFire}하세요. 오른쪽 훈련 표적을 한 번 이상 맞히세요.`, hint: () => '보라 구간은 사격, 청록+보라 분할은 이동하며 사격한 시간입니다.' },
    { title: '대시를 찍어 넣으세요', body: (n) => `${n.dash}으로 위상 대시를 사용하세요. 굵은 금색 마커가 3초 기록에 남습니다.`, hint: () => '대시는 재생될 때 위치 변화로 그대로 되풀이됩니다.' },
    { title: '공격 패턴 3초를 작곡하세요', body: () => '움직이면서 표적을 향해 계속 사격해, 이동 15m와 사격 4회 이상을 한 버퍼에 담으세요.', hint: () => '지금 만드는 행동이 곧 다음 공격 패턴입니다.' },
    { title: '고정한 3초를 끝까지 확인하세요', body: (n) => `${tutorialEchoInstruction(n)} 호출한 잔향이 같은 궤적을 끝까지 재생하는 장면을 확인하세요.`, hint: (n) => `미리보기 중 기록은 변하지 않습니다. ${n.cancel}로 취소해도 쿨다운은 소비되지 않습니다.` },
    { title: '두 각도를 동시에 만드세요', body: (n) => `오른쪽 보라 표적을 향한 사격을 기록한 뒤 ${n.echo}으로 잠그세요. 현재의 몸은 왼쪽 청록 표적을 쏘고, 잔향은 보라 표적을 맞혀야 합니다.`, hint: () => `첫 적중 뒤 수축 링이 끝나기 전, ${tutorialSyncWindow().toFixed(2)}초 안에 다른 표적도 맞히세요.` },
    { title: '동기화 결과를 읽으세요', body: () => '잔향의 마지막 탄환과 지속 피해까지 정산된 뒤 직접 피해·지속 피해·처치·적중 지수가 표시됩니다.', hint: () => '고급 훈련은 여기서 끝납니다. 실제 런에서는 위상 균열과 경로 예측을 함께 활용하세요.' },
  ];

  const tutorialSequences = Object.freeze({
    basic: [0, 2, 3, 4],
    advanced: [3, 5, 6],
    full: [0, 1, 2, 3, 4, 5, 6],
  });

  function tutorialSequence(mode = tutorial?.mode || 'basic') {
    return tutorialSequences[mode] || tutorialSequences.basic;
  }

  function refreshTutorialCopy(force = false) {
    if (!tutorial?.active) return;
    const names = tutorialInputNames();
    const signature = `${tutorial.mode}:${names.device}:${echoControlModeForDevice(names.device)}:${tutorialSyncWindow().toFixed(2)}:${tutorial.step}`;
    if (!force && tutorial.copySignature === signature) return;
    tutorial.copySignature = signature;
    const data = tutorialSteps[tutorial.step];
    if (UI.tutorialDeviceBadge) UI.tutorialDeviceBadge.textContent = names.label;
    UI.tutorialTitle.textContent = data.title;
    UI.tutorialBody.textContent = data.body(names);
    UI.tutorialHint.textContent = data.hint(names);
  }

  function tutorialTargetReach(maximum = 390) {
    const horizontalRoom = Math.max(88, view.w * (view.h < 500 ? 0.23 : 0.29));
    const verticalRoom = Math.max(88, view.h * 0.24);
    return Math.min(maximum, horizontalRoom, verticalRoom + 120);
  }

  function spawnTrainingDummy(x, y, durable = true, role = 'neutral') {
    const dummy = spawnEnemy('wisp', clamp(x, 120, WORLD.w - 120), clamp(y, 120, WORLD.h - 120), true);
    if (!dummy) return null;
    dummy.trainingDummy = true;
    dummy.trainingRole = role;
    dummy.noReward = true;
    dummy.spawnTime = 0;
    dummy.speed = 0;
    dummy.damage = 0;
    dummy.radius = durable ? 34 : 28;
    dummy.hp = dummy.maxHp = durable ? 9999 : Math.max(80, (player?.damage || 20) * 5);
    dummy.vx = dummy.vy = 0;
    dummy.trainingHit = false;
    dummy.phaseBlockedAt = -999;
    return dummy;
  }

  function clearTrainingDummies() {
    for (const enemy of arrays.enemies) {
      if (enemy.trainingDummy) { enemy.dead = true; enemy.noReward = true; }
    }
    resolveEnemyDeaths();
  }

  function setupTutorialReplayProof() {
    clearTrainingDummies();
    for (let i = arrays.playerBullets.length - 1; i >= 0; i--) recyclePlayerBullet(i);
    player.echoCooldown = 0;
    tutorial.startEchoActivations = echoActivations;
    tutorial.replayEchoId = null;
    tutorial.replayStat = null;
    tutorial.replayHit = false;
    tutorial.replayVerified = false;
    tutorial.replayVerifiedAt = 0;
    tutorial.replayLockedSignature = 'empty';
    tutorial.replayLockedFrames = 0;
    tutorial.replayDeployedSignature = 'empty';
    tutorial.replaySignatureMatch = null;
    const samples = analyzeEchoBuffer().samples;
    const firing = samples.filter((sample) => sample.fire);
    const preferredIndex = Math.floor(firing.length * 0.55);
    const safeRayDistance = (sample) => {
      const dx = Math.cos(sample.angle);
      const dy = Math.sin(sample.angle);
      let distance = Infinity;
      if (dx > 0.001) distance = Math.min(distance, (WORLD.w - 100 - sample.x) / dx);
      else if (dx < -0.001) distance = Math.min(distance, (100 - sample.x) / dx);
      if (dy > 0.001) distance = Math.min(distance, (WORLD.h - 100 - sample.y) / dy);
      else if (dy < -0.001) distance = Math.min(distance, (100 - sample.y) / dy);
      return Math.max(0, distance);
    };
    let sample = firing[preferredIndex] || samples[Math.floor(samples.length * 0.6)] || { x: player.x, y: player.y, angle: player.angle, fire: true };
    if (firing.length && safeRayDistance(sample) < 145) {
      sample = firing.slice().sort((a, b) => safeRayDistance(b) - safeRayDistance(a))[0] || sample;
    }
    const desiredDistance = Math.min(250, Math.max(150, tutorialTargetReach(310) * 0.72));
    const availableDistance = safeRayDistance(sample);
    const distance = availableDistance >= 70 ? Math.min(desiredDistance, availableDistance - 22) : availableDistance * 0.5;
    const x = sample.x + Math.cos(sample.angle) * distance;
    const y = sample.y + Math.sin(sample.angle) * distance;
    const target = spawnTrainingDummy(x, y, true, 'proof');
    tutorial.replayProofTargetId = target?.id || null;
  }

  function triggerTutorialReplayVerified() {
    if (!tutorial?.active || tutorial.step !== 4 || tutorial.replayVerified) return;
    const expected = tutorial.replayLockedSignature;
    const deployed = tutorial.replayDeployedSignature || tutorial.replayStat?.snapshotSignature;
    tutorial.replaySignatureMatch = expected === 'empty' || !expected || expected === deployed;
    if (!tutorial.replaySignatureMatch) {
      showToast('재현 검증 실패 · 기록을 다시 잠가 주세요', 2200);
      tutorial.replayStat = null;
      tutorial.replayEchoId = null;
      tutorial.replayHit = false;
      player.echoCooldown = 0;
      return;
    }
    tutorial.replayVerified = true;
    tutorial.replayVerifiedAt = gameTime;
    if (UI.replayVerified) {
      const small = $('small', UI.replayVerified);
      const frames = tutorial.replayLockedFrames || tutorial.replayStat?.sampleCount || 0;
      if (small) small.textContent = tutorial.replayHit
        ? `LOCKED ${frames}프레임과 표적 적중까지 같은 순서로 실행됐습니다.`
        : `LOCKED ${frames}프레임의 이동·조준·사격이 끝까지 일치했습니다.`;
      UI.replayVerified.classList.remove('hidden');
      window.setTimeout(() => UI.replayVerified?.classList.add('hidden'), 1900);
    }
    createShockwave(player.x, player.y, '#c47cff', 230, 0.62, 4);
    audio.upgrade(3);
    input.rumble(0.48, 170);
    navigator.vibrate?.([20, 24, 42]);
  }

  function triggerTutorialSyncSuccess() {
    if (!tutorial?.active || tutorial.step !== 5 || tutorial.syncSuccess) return;
    tutorial.syncSuccess = true;
    tutorial.syncSuccessAt = gameTime;
    for (const enemy of arrays.enemies) if (enemy.trainingDummy && enemy.trainingRole !== 'neutral') enemy.trainingHit = true;
    UI.syncSuccess?.classList.remove('hidden');
    window.setTimeout(() => UI.syncSuccess?.classList.add('hidden'), 2200);
    createShockwave(player.x, player.y, '#ffd166', 300, 0.78, 5);
    for (const enemy of arrays.enemies) if (enemy.trainingDummy) createShockwave(enemy.x, enemy.y, enemy.trainingRole === 'echo' ? '#c47cff' : '#63eaff', 150, 0.62, 3);
    audio.upgrade(4);
    input.rumble(0.7, 260);
    navigator.vibrate?.([24, 30, 60]);
  }

  function registerTutorialPhaseHit(enemy, fromEcho) {
    if (!tutorial?.active || !enemy?.trainingRole) return;
    if (tutorial.step === 4 && enemy.trainingRole === 'proof' && fromEcho) {
      tutorial.replayHit = true;
      enemy.trainingHit = true;
      return;
    }
    if (tutorial.step !== 5) return;
    if (!Number.isFinite(tutorial.echoHitAt) && !Number.isFinite(tutorial.presentHitAt)) {
      tutorial.syncWindowSeconds = configuredTutorialSyncWindow();
    }
    if (enemy.trainingRole === 'echo' && fromEcho) tutorial.echoHitAt = gameTime;
    if (enemy.trainingRole === 'present' && !fromEcho) tutorial.presentHitAt = gameTime;
    const a = Number(tutorial.echoHitAt);
    const b = Number(tutorial.presentHitAt);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return;
    const delta = Math.abs(a - b);
    const windowSeconds = tutorialSyncWindow();
    if (delta <= windowSeconds) {
      triggerTutorialSyncSuccess();
      return;
    }
    tutorial.syncFailures = (tutorial.syncFailures || 0) + 1;
    tutorial.syncLastDelta = delta;
    showToast(`동기화 실패 · ${(delta - windowSeconds).toFixed(2)}초 늦었습니다`, 1450);
    for (const target of arrays.enemies) if (target.trainingRole === 'echo' || target.trainingRole === 'present') target.trainingHit = false;
    if (a > b) tutorial.presentHitAt = NaN;
    else tutorial.echoHitAt = NaN;
    tutorial.syncWindowSeconds = NaN;
  }

  function updateTutorialSyncTimeout() {
    if (!tutorial?.active || tutorial.step !== 5 || tutorial.syncSuccess) return;
    const a = Number(tutorial.echoHitAt);
    const b = Number(tutorial.presentHitAt);
    const first = Number.isFinite(a) && !Number.isFinite(b) ? a : Number.isFinite(b) && !Number.isFinite(a) ? b : NaN;
    if (!Number.isFinite(first)) return;
    const windowSeconds = tutorialSyncWindow();
    if (gameTime - first <= windowSeconds) return;
    tutorial.syncFailures = (tutorial.syncFailures || 0) + 1;
    showToast('동기화 실패 · 수축 링이 끝났습니다', 1300);
    for (const target of arrays.enemies) if (target.trainingRole === 'echo' || target.trainingRole === 'present') target.trainingHit = false;
    tutorial.echoHitAt = NaN;
    tutorial.presentHitAt = NaN;
    tutorial.syncWindowSeconds = NaN;
  }

  function setupTutorialSyncPuzzle() {
    clearTrainingDummies();
    arrays.echoes.length = 0;
    for (let i = arrays.playerBullets.length - 1; i >= 0; i--) recyclePlayerBullet(i);
    echoReports.length = 0;
    deferredEchoReports.length = 0;
    UI.echoReport?.classList.add('hidden');
    input.cancelEcho('tutorial-reset', false);
    player.x = WORLD.w / 2;
    player.y = WORLD.h / 2;
    player.vx = player.vy = 0;
    player.angle = 0;
    player.echoCooldown = 0;
    player.history.length = 0;
    tutorial.startEchoActivations = echoActivations;
    tutorial.echoHitAt = NaN;
    tutorial.presentHitAt = NaN;
    tutorial.syncSuccess = false;
    tutorial.syncSuccessAt = 0;
    tutorial.syncFailures = 0;
    tutorial.syncLastDelta = NaN;
    tutorial.syncWindowSeconds = NaN;
    const reach = tutorialTargetReach(390);
    // On narrow portrait screens the coaching panel occupies the upper band.
    // Keep both phase targets on a single horizontal staff so neither one hides
    // behind the lesson card or drops into the touch-control safe area.
    const compactPortrait = view.w <= 520 && view.h > view.w;
    const offsetY = compactPortrait ? 0 : Math.min(78, Math.max(32, view.h * (view.h < 500 ? 0.075 : 0.1)));
    spawnTrainingDummy(player.x + reach, player.y - offsetY, true, 'echo');
    spawnTrainingDummy(player.x - reach, player.y + offsetY, true, 'present');
  }

  function setTutorialStep(step) {
    if (!tutorial?.active) return;
    tutorial.step = clamp(step, 0, tutorialSteps.length - 1);
    const sequence = tutorialSequence();
    const sequenceIndex = sequence.indexOf(tutorial.step);
    if (sequenceIndex >= 0) tutorial.sequenceIndex = sequenceIndex;
    else { tutorial.sequence = [tutorial.step]; tutorial.sequenceIndex = 0; }
    tutorial.stepElapsed = 0;
    tutorial.originX = player.x;
    tutorial.originY = player.y;
    tutorial.startEchoActivations = echoActivations;
    tutorial.copySignature = '';
    const total = (tutorial.sequence || sequence).length;
    UI.tutorialStepLabel.textContent = `ECHO LAB · ${tutorial.sequenceIndex + 1}/${total}`;
    refreshTutorialCopy(true);
    UI.tutorialProgressBar.style.width = '0%';
    UI.tutorialProgressText.textContent = '0%';
    audio.uiSelect();

    if (tutorial.step === 0 && tutorial.mode === 'basic') {
      clearTrainingDummies();
      spawnTrainingDummy(player.x + tutorialTargetReach(390), player.y, true);
    } else if (tutorial.step === 1) {
      clearTrainingDummies();
      spawnTrainingDummy(player.x + tutorialTargetReach(390), player.y, true);
    } else if (tutorial.step === 3) {
      clearTrainingDummies();
      player.history.length = 0;
      const x = player.x + tutorialTargetReach(410);
      const spreadY = Math.min(98, Math.max(42, view.h * (view.h < 500 ? 0.1 : 0.13)));
      spawnTrainingDummy(x, player.y - spreadY, true);
      spawnTrainingDummy(x + Math.min(35, view.w * 0.07), player.y, true);
      spawnTrainingDummy(x, player.y + spreadY, true);
    } else if (tutorial.step === 4) {
      setupTutorialReplayProof();
    } else if (tutorial.step === 5) {
      tutorial.reportSeen = false;
      setupTutorialSyncPuzzle();
    }
  }

  function startEchoTutorial(mode = 'basic') {
    if (!player || !currentWave) return;
    const sequence = tutorialSequence(mode);
    tutorial = {
      active: true, mode, sequence: [...sequence], sequenceIndex: 0, step: sequence[0], stepElapsed: 0, originX: player.x, originY: player.y,
      startEchoActivations: echoActivations, reportSeen: false, reportSeenAt: 0,
      replayEchoId: null, replayStat: null, replayHit: false, replayVerified: false, replayVerifiedAt: 0,
      replayLockedSignature: 'empty', replayLockedFrames: 0, replayDeployedSignature: 'empty', replaySignatureMatch: null,
      syncSuccess: false, syncFailures: 0, syncLastDelta: NaN, syncWindowSeconds: NaN, copySignature: '',
    };
    currentWave.spawnTimer = 9999;
    currentWave.spawnRemaining = Math.max(0, currentWave.spawnRemaining || 0);
    currentWave.elapsed = 0;
    arrays.enemies.length = 0;
    enemyGrid.clear();
    for (let i = arrays.enemyBullets.length - 1; i >= 0; i--) recycleEnemyBullet(i);
    for (let i = arrays.playerBullets.length - 1; i >= 0; i--) recyclePlayerBullet(i);
    arrays.lasers.length = 0;
    arrays.pickups.length = 0;
    score = 0;
    kills = 0;
    runCores = 0;
    player.echoCooldown = 0;
    player.history.length = 0;
    input.cancelEcho('tutorial-start', false);
    UI.waveBanner.classList.add('hidden');
    UI.tutorialCoach.classList.remove('hidden');
    setTutorialStep(sequence[0]);
  }

  function finishEchoTutorial(skipped = false) {
    if (!tutorial?.active) return;
    tutorial.active = false;
    UI.tutorialCoach.classList.add('hidden');
    UI.replayVerified?.classList.add('hidden');
    UI.syncSuccess?.classList.add('hidden');
    const finishedMode = tutorial.mode || 'basic';
    if (finishedMode === 'advanced') saveData.advancedTutorialSeen = true;
    else saveData.tutorialSeen = true;
    saveJSON(SAVE_KEY, saveData);
    clearTrainingDummies();
    arrays.playerBullets.length = 0;
    arrays.enemyBullets.length = 0;
    arrays.echoes.length = 0;
    arrays.particles.length = 0;
    arrays.shockwaves.length = 0;
    arrays.links.length = 0;
    arrays.floaters.length = 0;
    echoReports.length = 0;
    deferredEchoReports.length = 0;
    input.cancelEcho('tutorial-finish', false);
    if (skipped) UI.echoReport?.classList.add('hidden');
    player.x = WORLD.w / 2;
    player.y = WORLD.h / 2;
    player.vx = player.vy = 0;
    player.hp = player.maxHp;
    player.shield = player.maxShield;
    player.invuln = 1.5;
    player.dashCooldown = 0;
    player.echoCooldown = Math.min(2.2, player.echoCooldownMax);
    player.history.length = 0;
    gameTime = 0;
    score = 0;
    kills = 0;
    runCores = 0;
    runDamageTotal = 0;
    echoActivations = 0;
    echoDamageTotal = 0;
    echoKillsTotal = 0;
    echoBestDamage = 0;
    lastEchoReport = null;
    if (currentWave) {
      currentWave.elapsed = 0;
      currentWave.threat = 1;
      currentWave.spawnTimer = 1.05;
      currentWave.completed = false;
    }
    camera.x = player.x;
    camera.y = player.y;
    resetQualitySampling();
    const info = waveInfo(1);
    showWaveBanner('SECTOR 01 · 기본 시간선', info.name, currentWave?.modifier?.subtitle || info.subtitle);
    audio.waveStart(1, false);
    const doneText = finishedMode === 'advanced'
      ? '고급 훈련 완료 · 교차 사격 퍼즐과 리포트까지 확인했습니다'
      : '기본 훈련 완료 · 고급 잔향 훈련은 메뉴에서 언제든 연습할 수 있습니다';
    showToast(skipped ? '훈련을 종료했습니다 · 실제 시간선 진입' : doneText, 3400);
  }

  function updateEchoTutorial(dt) {
    if (!tutorial?.active || !player) return;
    tutorial.stepElapsed += dt;
    refreshTutorialCopy();
    let progress = 0;
    if (tutorial.step === 0) {
      const moved = clamp(Math.hypot(player.x - tutorial.originX, player.y - tutorial.originY) / 95, 0, 1);
      if (tutorial.mode === 'basic') {
        const hit = arrays.enemies.some((enemy) => enemy.trainingDummy && enemy.trainingHit) ? 1 : 0;
        progress = Math.min(moved, hit);
      } else progress = moved;
    } else if (tutorial.step === 1) {
      progress = arrays.enemies.some((enemy) => enemy.trainingDummy && enemy.trainingHit) ? 1 : 0;
    } else if (tutorial.step === 2) {
      progress = player.dashedThisStep ? 1 : 0;
    } else if (tutorial.step === 3) {
      const analysis = analyzeEchoBuffer();
      progress = Math.min(clamp(analysis.distance / 150, 0, 1), clamp(analysis.shots / 4, 0, 1), clamp(analysis.coverage / 0.78, 0, 1));
    } else if (tutorial.step === 4) {
      if (tutorial.replayVerified) {
        progress = 0.94 + clamp((gameTime - tutorial.replayVerifiedAt) / 0.82, 0, 1) * 0.06;
      } else if (tutorial.replayStat) {
        const live = arrays.echoes.find((echo) => echo.id === tutorial.replayEchoId);
        const playback = live ? clamp(live.index / Math.max(1, live.samples.length), 0, 1) : tutorial.replayStat.playbackDoneAt ? 1 : 0.82;
        progress = 0.68 + playback * 0.25;
        // Do not advance on button release. The player must witness the replay:
        // a confirmed hit after most of the path, or the complete locked sequence.
        if ((tutorial.replayHit && playback >= 0.72) || playback >= 0.995 || tutorial.replayStat.finalized) triggerTutorialReplayVerified();
      } else {
        progress = input.isEchoPreviewing() ? 0.58 : input.isEchoLocked() ? 0.38 : 0.1;
      }
    } else if (tutorial.step === 5) {
      updateTutorialSyncTimeout();
      if (tutorial.syncSuccess) progress = 0.94 + clamp((gameTime - tutorial.syncSuccessAt) / 1.2, 0, 1) * 0.06;
      else {
        const analysis = analyzeEchoBuffer(input.getEchoLockedSamples() || null);
        const pattern = Math.min(clamp(analysis.shots / 3, 0, 1), clamp(analysis.coverage / 0.5, 0, 1));
        const deployed = echoActivations > tutorial.startEchoActivations ? 0.72 : input.isEchoLocked() ? 0.55 : pattern * 0.42;
        progress = deployed;
      }
    } else {
      progress = tutorial.reportSeen
        ? 0.94 + clamp((gameTime - tutorial.reportSeenAt) / 1.6, 0, 1) * 0.06
        : Math.min(0.9, clamp(tutorial.stepElapsed / 7, 0, 1));
    }
    const percent = Math.round(progress * 100);
    UI.tutorialProgressBar.style.width = `${percent}%`;
    UI.tutorialProgressText.textContent = `${percent}%`;
    if (progress < 1) return;
    const sequence = tutorial.sequence || tutorialSequence();
    if (tutorial.sequenceIndex < sequence.length - 1) setTutorialStep(sequence[tutorial.sequenceIndex + 1]);
    else finishEchoTutorial(false);
  }

  function hideWaveBanner() {
    clearTimeout(waveBannerTimer);
    waveBannerTimer = null;
    UI.waveBanner.classList.add('hidden');
    UI.waveBanner.classList.remove('boss-intro');
  }

  function showWaveBanner(eyebrow, title, subtitle, options = {}) {
    clearTimeout(waveBannerTimer);
    waveBannerTimer = null;
    UI.bannerEyebrow.textContent = eyebrow;
    UI.bannerTitle.textContent = title;
    UI.bannerSubtitle.textContent = subtitle;
    UI.waveBanner.classList.toggle('boss-intro', Boolean(options.boss));
    UI.waveBanner.classList.add('hidden');
    void UI.waveBanner.offsetWidth;
    UI.waveBanner.classList.remove('hidden');
    if (!options.hold) {
      const duration = Math.max(350, Number(options.duration) || 3400);
      waveBannerTimer = window.setTimeout(hideWaveBanner, duration);
    }
  }

  function updateBossIntroHud() {
    if (!currentWave?.introActive) return;
    const duration = Math.max(0.01, currentWave.introDuration || BOSS_INTRO_DURATION);
    const remaining = clamp(currentWave.introRemaining || 0, 0, duration);
    const progress = clamp(1 - remaining / duration, 0, 1);
    if (UI.bossIntroCountdown) UI.bossIntroCountdown.textContent = (Math.ceil(remaining * 10) / 10).toFixed(1);
    if (UI.bossIntroProgress) UI.bossIntroProgress.style.width = `${progress * 100}%`;
  }

  function bossIntroSpawnPoint() {
    const verticalOffset = Math.min(280, Math.max(190, view.h * 0.23));
    const upper = player.y - verticalOffset;
    const lower = player.y + verticalOffset;
    const minY = WORLD.margin + 130;
    const maxY = WORLD.h - WORLD.margin - 130;
    const y = upper >= minY ? upper : lower <= maxY ? lower : clamp(player.y, minY, maxY);
    return {
      x: clamp(player.x, WORLD.margin + 150, WORLD.w - WORLD.margin - 150),
      y: clamp(y, minY, maxY),
    };
  }

  function bossCutsceneActive() {
    return Boolean(currentWave?.isBoss && (currentWave.introActive || (currentWave.bossSpawned && !currentWave.combatLive)));
  }

  function beginBossIntro(info, modifier, bannerRule) {
    if (!currentWave?.isBoss) return;
    input.cancelEcho('boss-intro', false);
    input.echoRequestQueued = null;
    input.reset();
    while (arrays.playerBullets.length) recyclePlayerBullet(arrays.playerBullets.length - 1);
    while (arrays.enemyBullets.length) recycleEnemyBullet(arrays.enemyBullets.length - 1);
    arrays.lasers.length = 0;
    currentWave.introActive = true;
    currentWave.introDuration = BOSS_INTRO_DURATION;
    currentWave.introRemaining = BOSS_INTRO_DURATION;
    currentWave.introElapsed = 0;
    currentWave.introFinished = false;
    currentWave.bossSpawned = false;
    currentWave.bossId = null;
    currentWave.combatLive = false;
    currentWave.materializeRemaining = 0;
    currentWave.combatStartedAt = null;
    currentWave.spawnTimer = 0;
    document.body.classList.add('boss-intro-active');
    document.body.classList.remove('boss-materializing');
    UI.bossHud.classList.add('hidden');
    const phase = $('.boss-phase');
    if (phase) phase.textContent = 'SUSPENDED';
    showWaveBanner(
      `ARCHIVE THREAT · SECTOR ${String(currentWave.number).padStart(2, '0')}`,
      'NULL ARCHIVIST',
      `${info.name} · ${bannerRule} · 적대 시간선 완전 정지`,
      { boss: true, hold: true },
    );
    updateBossIntroHud();
    audio.waveStart(currentWave.number, true);
  }

  function finishBossIntro() {
    if (!currentWave?.isBoss || !currentWave.introActive) return false;
    currentWave.introActive = false;
    currentWave.introFinished = true;
    currentWave.introRemaining = 0;
    document.body.classList.remove('boss-intro-active');
    document.body.classList.add('boss-materializing');
    hideWaveBanner();
    input.reset();
    const spawn = bossIntroSpawnPoint();
    const boss = spawnEnemy('boss', spawn.x, spawn.y);
    if (!boss) return false;
    boss.spawnTime = BOSS_MATERIALIZE_DURATION;
    boss.introLocked = true;
    boss.vx = 0;
    boss.vy = 0;
    currentWave.bossSpawned = true;
    currentWave.bossId = boss.id;
    currentWave.materializeRemaining = BOSS_MATERIALIZE_DURATION;
    currentWave.combatLive = false;
    UI.bossHud.classList.remove('hidden');
    const phase = $('.boss-phase');
    if (phase) phase.textContent = 'MATERIALIZE';
    showToast('실체화 중 · 전투와 피해 판정은 아직 정지되어 있습니다', 1550);
    audio.bossPulse();
    return true;
  }

  function activateBossCombat() {
    if (!currentWave?.isBoss || currentWave.combatLive || !currentWave.bossSpawned) return false;
    const boss = arrays.enemies.find((enemy) => enemy.id === currentWave.bossId && !enemy.dead && enemy.type === 'boss')
      || arrays.enemies.find((enemy) => !enemy.dead && enemy.type === 'boss');
    if (!boss) return false;
    boss.spawnTime = 0;
    boss.introLocked = false;
    boss.shootTimer = Math.max(boss.shootTimer || 0, BOSS_FIRST_ATTACK_DELAY);
    boss.patternTimer = Math.max(boss.patternTimer || 0, 2.15);
    boss.summonTimer = Math.max(boss.summonTimer || 0, 4.4);
    boss.laserTimer = Math.max(boss.laserTimer || 0, 4.8);
    boss.contactCooldown = Math.max(boss.contactCooldown || 0, 0.75);
    currentWave.combatLive = true;
    currentWave.materializeRemaining = 0;
    currentWave.combatStartedAt = gameTime;
    document.body.classList.remove('boss-materializing');
    input.reset();
    const phase = $('.boss-phase');
    if (phase) phase.textContent = 'PHASE 1';
    player.invuln = Math.max(player.invuln || 0, 0.55);
    createShockwave(boss.x, boss.y, '#ff65d3', 310, 0.72, 4.5);
    burstParticles(boss.x, boss.y, '#ff65d3', quality === 0 ? 28 : 52, 40, 260, 1.8, 7);
    showToast('COMBAT LIVE · NULL ARCHIVIST의 기록을 파기하십시오', 2100);
    audio.bossPulse();
    input.rumble(0.34, 105);
    return true;
  }

  function updateBossIntro(dt) {
    if (!currentWave?.introActive) return false;
    currentWave.introElapsed += dt;
    currentWave.introRemaining = Math.max(0, currentWave.introRemaining - dt);
    updateBossIntroHud();
    if (currentWave.introRemaining <= 0.0001) finishBossIntro();
    return true;
  }

  function updateBossMaterialization(dt) {
    if (!currentWave?.isBoss || !currentWave.bossSpawned || currentWave.combatLive) return false;
    const boss = arrays.enemies.find((enemy) => enemy.id === currentWave.bossId && !enemy.dead && enemy.type === 'boss')
      || arrays.enemies.find((enemy) => !enemy.dead && enemy.type === 'boss');
    if (!boss) return false;
    boss.age += dt;
    boss.angle += dt * 0.42;
    boss.spawnTime = Math.max(0, boss.spawnTime - dt);
    currentWave.materializeRemaining = boss.spawnTime;
    if (boss.spawnTime <= 0) activateBossCombat();
    return true;
  }

  function updateBossCutscene(dt) {
    if (currentWave?.introActive) return updateBossIntro(dt);
    return updateBossMaterialization(dt);
  }


  async function requestWakeLock() {
    if (!('wakeLock' in navigator) || location.protocol === 'file:') return;
    try { wakeLock = await navigator.wakeLock.request('screen'); } catch (_) { wakeLock = null; }
  }

  async function releaseWakeLock() {
    try { await wakeLock?.release(); } catch (_) { /* ignored */ }
    wakeLock = null;
  }

  function applyQualityTier(nextTier, reason = 'fps', notify = true) {
    const next = clamp(Math.floor(nextTier), 0, 2);
    if (next === quality) return false;
    quality = next;
    document.body.dataset.quality = String(quality);
    lastQualityChangeAt = performance.now();
    lastQualityReason = reason;
    if (settings.graphicsMode === 'auto') {
      settings.autoQualityTier = Math.min(clamp(Math.floor(Number(settings.autoQualityTier ?? 2)), 0, 2), quality);
      autoQualityLocked = quality === 0;
      saveJSON(SETTINGS_KEY, settings);
      updateAutoQualityStatus();
    }
    resizeCanvas();
    if (notify && gameState === 'playing' && performance.now() - qualityToastAt > 5000) {
      qualityToastAt = performance.now();
      const suffix = quality === 0 ? ' · 이 단계로 고정' : '';
      showToast(`자동 성능 보호 · ${QUALITY_LABELS[quality]}${suffix}`, 2300);
    }
    return true;
  }

  function resetQualitySampling() {
    perfAccumulator = 0;
    perfFrames = 0;
    lowFpsDuration = 0;
    recentLongFrameScore = 0;
    const now = performance.now();
    qualitySampleStartedAt = now;
    qualityGraceUntil = now + 1500;
    lastQualityChangeAt = now;
    autoQualityLocked = settings.graphicsMode === 'auto' && quality === 0;
  }

  function updateQuality(frameDt) {
    const frameMs = frameDt * 1000;
    lastQualityFrameMs = frameMs;
    recentLongFrameScore = Math.max(0, recentLongFrameScore - frameDt * 0.55);
    perfAccumulator += frameDt;
    perfFrames++;

    const fixedMode = settings.graphicsMode === 'auto' ? null : configuredQualityTier();
    if (fixedMode !== null || settings.reducedMotion) {
      const target = configuredQualityTier();
      if (quality !== target) applyQualityTier(target, 'fixed', false);
      if (perfAccumulator >= 1.25) {
        measuredFps = perfFrames / Math.max(0.001, perfAccumulator);
        perfAccumulator = 0;
        perfFrames = 0;
      }
      return;
    }

    // Automatic mode is intentionally one-way: it can shed work, but never
    // raises quality again until the player explicitly asks for a re-measure.
    // A short arming window ignores one-off script compilation / scene setup spikes.
    const inGraceWindow = performance.now() < qualityGraceUntil;
    if (gameState === 'playing' && quality > 0 && !inGraceWindow) {
      lastScenePressure = arrays.enemyBullets.length
        + arrays.playerBullets.length
        + arrays.particles.length * 0.55
        + arrays.enemies.length * 7
        + arrays.lasers.length * 34;
      const frameTimeTrip = frameMs > (quality === 2 ? 68 : 82) || recentLongFrameScore >= (quality === 2 ? 1.8 : 2.8);
      if (frameTimeTrip && performance.now() - lastQualityChangeAt > 900) {
        applyQualityTier(quality - 1, 'frame-time');
        lowFpsDuration = 0;
      }
    }

    if (perfAccumulator < 1.25) return;
    measuredFps = perfFrames / Math.max(0.001, perfAccumulator);
    perfAccumulator = 0;
    perfFrames = 0;

    if (gameState !== 'playing' || quality <= 0 || inGraceWindow) {
      lowFpsDuration = 0;
      return;
    }

    const threshold = quality === 2 ? 54 : 50;
    if (measuredFps < threshold) {
      lowFpsDuration += 1.25;
      const required = quality === 2 ? 1.25 : 2.5;
      if (lowFpsDuration >= required && performance.now() - lastQualityChangeAt > 900) {
        applyQualityTier(quality - 1, 'frame-time');
        lowFpsDuration = 0;
      }
    } else {
      lowFpsDuration = Math.max(0, lowFpsDuration - 0.65);
    }
  }

  function initLongFrameObserver() {
    try {
      if (!('PerformanceObserver' in window)) return;
      if (!PerformanceObserver.supportedEntryTypes?.includes('long-animation-frame')) return;
      const observer = new PerformanceObserver((list) => {
        if (gameState !== 'playing' || settings.graphicsMode !== 'auto') return;
        for (const entry of list.getEntries()) {
          if (entry.startTime < qualitySampleStartedAt || performance.now() < qualityGraceUntil) continue;
          longFrameCount++;
          recentLongFrameScore += entry.duration >= 100 ? 2.2 : entry.duration >= 70 ? 1.3 : 0.7;
        }
      });
      observer.observe({ type: 'long-animation-frame', buffered: true });
    } catch (_) { /* optional diagnostics */ }
  }

  // ---------------------------------------------------------------------------
  // Permanent archive & run upgrades
  // ---------------------------------------------------------------------------
  const metaNodes = [
    {
      id: 'vitality', branch: '생존', name: '생체 기억', icon: '♥', color: '#ff718d', max: 8, baseCost: 8, growth: 1.48,
      desc: (level) => `런 시작 최대 생명 +${level * 6}. 다음 단계에서 +6.`,
    },
    {
      id: 'force', branch: '화력', name: '응축된 의지', icon: '◆', color: '#69eaff', max: 10, baseCost: 8, growth: 1.5,
      desc: (level) => `런 시작 공격력 +${level * 4}%. 다음 단계에서 +4%.`,
    },
    {
      id: 'reflex', branch: '기동', name: '신경 가속', icon: '⇢', color: '#78a2ff', max: 6, baseCost: 10, growth: 1.58,
      desc: (level) => `이동 속도 +${level * 2}%, 대시 대기시간 -${level * 3}%.`,
    },
    {
      id: 'luck', branch: '탐사', name: '확률 편향', icon: '✦', color: '#ffe07b', max: 8, baseCost: 10, growth: 1.6,
      desc: (level) => `고희귀도 기억 출현 확률과 엘리트 보상이 ${level ? '상승' : '해금'}합니다. 행운 +${level}.`,
    },
    {
      id: 'barrier', branch: '생존', name: '잔향 장벽', icon: '◯', color: '#67b7ff', max: 8, baseCost: 13, growth: 1.55, requires: { vitality: 2 },
      desc: (level) => `시작 보호막 +${level * 5}, 보호막 재생 +${(level * 0.18).toFixed(2)}/초.`,
    },
    {
      id: 'cadence', branch: '화력', name: '근육 기억', icon: '≋', color: '#72f0d0', max: 8, baseCost: 13, growth: 1.56, requires: { force: 2 },
      desc: (level) => `런 시작 발사 속도 +${Math.round(level * 3.5)}%.`,
    },
    {
      id: 'resonance', branch: '시간', name: '과거 증폭기', icon: '◈', color: '#cb82ff', max: 8, baseCost: 14, growth: 1.57, requires: { force: 2 },
      desc: (level) => `시간 잔향 피해 +${level * 5}%, 재사용 대기시간 -${level * 2}%.`,
    },
    {
      id: 'memory', branch: '탐사', name: '고속 학습', icon: '⌁', color: '#95f2ff', max: 8, baseCost: 14, growth: 1.58, requires: { luck: 2 },
      desc: (level) => `기억 편린 경험치 획득량 +${level * 4}%.`,
    },
    {
      id: 'salvage', branch: '탐사', name: '회수 프로토콜', icon: '⬡', color: '#ffd166', max: 8, baseCost: 16, growth: 1.62, requires: { luck: 2 },
      desc: (level) => `런 종료 잔향 코어 획득량 +${level * 8}%.`,
    },
    {
      id: 'reroll', branch: '선택', name: '분기 재작성', icon: '↻', color: '#a68cff', max: 3, baseCost: 28, growth: 1.85, requires: { memory: 2 },
      desc: (level) => `매 런 선택지 재구성 횟수 +${level}. 기본 1회와 합산됩니다.`,
    },
    {
      id: 'arsenal', branch: '선택', name: '확장된 가능성', icon: '✣', color: '#71f6bb', max: 4, baseCost: 36, growth: 1.82, requires: { cadence: 3, memory: 2 },
      desc: (level) => `2단계마다 레벨업 선택지 +1. 현재 ${4 + Math.floor(level / 2)}개가 제시됩니다.`,
    },
    {
      id: 'defiance', branch: '생존', name: '붕괴 거부', icon: '∞', color: '#ffb5d8', max: 2, baseCost: 90, growth: 2.1, requires: { vitality: 5, barrier: 4 },
      desc: (level) => `매 런 치명상을 ${level}회 거부하고 생명 30%로 복귀합니다.`,
    },
  ];

  function metaCost(node, level = saveData.meta[node.id] || 0) {
    return Math.round(node.baseCost * Math.pow(node.growth, level));
  }

  function metaRequirementsMet(node) {
    return Object.entries(node.requires || {}).every(([id, level]) => (saveData.meta[id] || 0) >= level);
  }

  function metaRequirementText(node) {
    if (!node.requires) return '선행 연구 없음';
    return Object.entries(node.requires).map(([id, level]) => {
      const target = metaNodes.find((item) => item.id === id);
      return `${target?.name || id} ${level}`;
    }).join(' · ');
  }

  const metaIconMap = {
    vitality: 'heart', force: 'ballistic', reflex: 'mobility', luck: 'utility', barrier: 'shield',
    cadence: 'ballistic', resonance: 'echo', memory: 'memory', salvage: 'core', reroll: 'reroll',
    arsenal: 'archive', defiance: 'survival',
  };

  function renderMetaGrid() {
    if (!UI.metaGrid) return;
    UI.metaGrid.innerHTML = '';
    for (const node of metaNodes) {
      const level = saveData.meta[node.id] || 0;
      const maxed = level >= node.max;
      const unlocked = metaRequirementsMet(node);
      const cost = maxed ? 0 : metaCost(node, level);
      const affordable = saveData.cores >= cost;
      const article = document.createElement('article');
      article.className = `meta-node${maxed ? ' maxed' : ''}${unlocked ? '' : ' locked'}`;
      article.style.setProperty('--node-color', node.color);
      article.style.setProperty('--node-max', node.max);
      article.dataset.branch = node.branch;
      const nextText = maxed ? '최대 단계에 도달했습니다.' : node.desc(level + 1);
      const levelTrack = Array.from({ length: node.max }, (_, index) => `<i class="${index < level ? 'filled' : ''}"></i>`).join('');
      article.innerHTML = `
        <div class="meta-node-head">
          <div class="meta-node-icon">${uiIcon(metaIconMap[node.id] || 'anomaly')}</div>
          <div><div class="meta-node-tier">${escapeHtml(node.branch)} · STAGE ${level}/${node.max}</div><h3>${escapeHtml(node.name)}</h3><p class="meta-flavor">${escapeHtml(node.flavor || '')}</p></div>
        </div>
        <div class="meta-level-track" aria-label="${level}/${node.max}단계">${levelTrack}</div>
        <div class="meta-effect"><b>현재 효과</b><span>${escapeHtml(node.desc(level))}</span></div>
        <div class="meta-next"><b>${maxed ? '연구 완료' : '다음 단계'}</b><span>${escapeHtml(nextText)}</span></div>
        <div class="meta-node-prereq">${unlocked ? (maxed ? '모든 동기화 완료' : escapeHtml(metaRequirementText(node))) : `잠김 · ${escapeHtml(metaRequirementText(node))}`}</div>
        <button type="button" class="btn meta-buy${maxed ? ' primary' : ''}" ${maxed || !unlocked || !affordable ? 'disabled' : ''} aria-label="${escapeHtml(node.name)} ${maxed ? '최대 단계' : `${level + 1}단계 연구`}">
          ${maxed ? `${uiIcon('check')}<span>완전 강화</span>` : unlocked ? `${uiIcon('core')}<span>강화 · ${formatNumber(cost)} 코어</span>` : `${uiIcon('lock')}<span>선행 강화 필요</span>`}
        </button>
      `;
      article.querySelector('button').addEventListener('click', () => buyMetaNode(node.id));
      UI.metaGrid.appendChild(article);
    }
    refreshMenuStats();
  }

  function buyMetaNode(id) {
    const node = metaNodes.find((item) => item.id === id);
    if (!node) return;
    const level = saveData.meta[id] || 0;
    if (level >= node.max || !metaRequirementsMet(node)) return;
    const cost = metaCost(node, level);
    if (saveData.cores < cost) {
      showToast('잔향 코어가 부족합니다', 1500);
      return;
    }
    saveData.cores -= cost;
    saveData.meta[id] = level + 1;
    saveJSON(SAVE_KEY, saveData);
    audio.upgrade(Math.min(4, level + 1));
    renderMetaGrid();
    showToast(`${node.name} ${level + 1}단계 동기화`, 1600);
  }

  function metaRefundTotal() {
    let total = 0;
    for (const node of metaNodes) {
      const level = saveData.meta[node.id] || 0;
      for (let i = 0; i < level; i++) total += metaCost(node, i);
    }
    return total;
  }

  function resetMetaProgression() {
    const refund = metaRefundTotal();
    if (refund <= 0) {
      showToast('환급할 영구 기억이 없습니다', 1400);
      return;
    }
    if (!window.confirm(`모든 영구 연구를 초기화하고 ${formatNumber(refund)} 코어를 환급받으시겠습니까?`)) return;
    saveData.cores += refund;
    saveData.meta = { ...defaultMeta };
    saveJSON(SAVE_KEY, saveData);
    renderMetaGrid();
    showToast(`연구 초기화 · ${formatNumber(refund)} 코어 환급`, 2000);
  }

  function openMetaScreen() {
    renderMetaGrid();
    showScreen(UI.meta);
  }

  const rarityOrder = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
  const rarityInfo = {
    common: { label: 'COMMON · 일반', color: '#67e8ff', weight: 56, power: 1, steps: 1, minLevel: 1 },
    uncommon: { label: 'UNCOMMON · 고급', color: '#71f6bb', weight: 25, power: 1.35, steps: 1, minLevel: 1 },
    rare: { label: 'RARE · 희귀', color: '#6f9cff', weight: 11, power: 1.8, steps: 1, minLevel: 2 },
    epic: { label: 'EPIC · 영웅', color: '#bd72ff', weight: 4.4, power: 2.45, steps: 2, minLevel: 4 },
    legendary: { label: 'LEGENDARY · 전설', color: '#ffd166', weight: 1.25, power: 3.25, steps: 2, minLevel: 6 },
    mythic: { label: 'MYTHIC · 신화', color: '#ff6ccf', weight: 0.22, power: 4.5, steps: 3, minLevel: 9 },
  };

  const familyInfo = {
    ballistic: { label: '탄도', color: '#66eaff', icon: 'ballistic', role: '직접 화력' },
    temporal: { label: '시간', color: '#c47dff', icon: 'temporal', role: '잔향 능력' },
    mobility: { label: '기동', color: '#7da2ff', icon: 'mobility', role: '회피·위치' },
    survival: { label: '생존', color: '#ff7894', icon: 'survival', role: '방어·회복' },
    anomaly: { label: '이상현상', color: '#ffd166', icon: 'anomaly', role: '특수 연계' },
    utility: { label: '탐사', color: '#77f1c3', icon: 'utility', role: '성장·보상' },
  };

  const rarityIndex = (key) => Math.max(0, rarityOrder.indexOf(key));
  const maxRarityKey = (a = 'common', b = 'common') => rarityIndex(a) >= rarityIndex(b) ? a : b;
  function rarityAllowedForLevel(requested = 'common') {
    const requestedIndex = rarityIndex(requested);
    for (let index = requestedIndex; index >= 0; index--) {
      const key = rarityOrder[index];
      if (player && player.level >= rarityInfo[key].minLevel) return key;
    }
    return 'common';
  }
  const percent = (value) => `${Math.round(value * 100)}%`;
  const discrete = (quality, base = 1) => Math.max(1, Math.round(base * quality.steps));
  const hasRanks = (requirements = {}) => Object.entries(requirements).every(([id, level]) => (player?.upgradeLevels[id] || 0) >= level);

  const upgrades = [
    // Ballistic core
    {
      id: 'cadence', family: 'ballistic', name: '훈련된 리듬', icon: '≋', max: 6, weight: 14,
      describe: (q) => `발사 속도가 ${Math.round(11 * q.power)}% 증가합니다. 연사 빌드의 기반입니다.`,
      apply: (p, q) => { p.fireRate *= 1 + 0.11 * q.power; },
    },
    {
      id: 'amplify', family: 'ballistic', name: '선명한 의지', icon: '◆', max: 6, weight: 14,
      describe: (q) => `모든 직접 공격 피해가 ${Math.round(14 * q.power)}% 증가합니다.`,
      apply: (p, q) => { p.damage *= 1 + 0.14 * q.power; },
    },
    {
      id: 'velocity', family: 'ballistic', name: '먼저 도착한 생각', icon: '➤', max: 4, weight: 10,
      describe: (q) => `탄환 속도 +${Math.round(16 * q.power)}%, 사거리 +${Math.round(7 * q.power)}%.`,
      apply: (p, q) => { p.bulletSpeed *= 1 + 0.16 * q.power; p.bulletLife *= 1 + 0.07 * q.power; },
    },
    {
      id: 'mass', family: 'ballistic', name: '중력 탄두', icon: '●', max: 4, weight: 9,
      describe: (q) => `탄환 크기 +${Math.round(18 * q.power)}%, 피해 +${Math.round(5 * q.power)}%.`,
      apply: (p, q) => { p.bulletSize *= 1 + 0.18 * q.power; p.damage *= 1 + 0.05 * q.power; },
    },
    {
      id: 'pierce', family: 'ballistic', name: '관통하는 기억', icon: '↦', max: 4, weight: 8, minLevel: 2,
      describe: (q) => `탄환이 적을 ${discrete(q)}명 더 관통하고 관통 후 피해 보존율이 상승합니다.`,
      apply: (p, q) => { p.pierce += discrete(q); p.pierceRetention = Math.min(0.96, p.pierceRetention + 0.025 * q.power); },
    },
    {
      id: 'split', family: 'ballistic', name: '다중 궤적', icon: '⋔', max: 3, weight: 7, minLevel: 2, rarityFloor: 'uncommon',
      describe: (q) => `추가 탄환 ${discrete(q)}발을 부채꼴로 발사합니다. 단발 피해는 6% 감소합니다.`,
      apply: (p, q) => { p.projectiles += discrete(q); p.spread = Math.min(0.34, p.spread + 0.028 * discrete(q)); p.damage *= 0.94; },
    },
    {
      id: 'critical', family: 'ballistic', name: '결정적 통찰', icon: '✦', max: 5, weight: 10,
      describe: (q) => `치명타 확률이 ${Math.round(7 * q.power)}%p 증가합니다.`,
      apply: (p, q) => { p.critChance = Math.min(0.72, p.critChance + 0.07 * q.power); },
    },
    {
      id: 'critPower', family: 'ballistic', name: '예리한 결론', icon: '✧', max: 4, weight: 8, minLevel: 2,
      describe: (q) => `치명타 배율이 +${(0.24 * q.power).toFixed(2)}배 증가합니다.`,
      apply: (p, q) => { p.critMultiplier += 0.24 * q.power; },
    },
    {
      id: 'homing', family: 'ballistic', name: '귀결의 궤도', icon: '⌁', max: 3, weight: 6, minLevel: 3, rarityFloor: 'rare',
      describe: (q) => `탄환이 주변 적을 향해 초당 ${(1.15 * q.power).toFixed(1)}라디안만큼 방향을 보정합니다.`,
      apply: (p, q) => { p.homing += 1.15 * q.power; },
    },
    {
      id: 'ricochet', family: 'ballistic', name: '반박하는 탄환', icon: '⌇', max: 3, weight: 5, minLevel: 4, rarityFloor: 'rare',
      describe: (q) => `탄환이 적 사이를 ${discrete(q)}회 도약합니다. 도약 피해 보존율도 상승합니다.`,
      apply: (p, q) => { p.ricochet += discrete(q); p.ricochetRetention = Math.min(0.9, p.ricochetRetention + 0.06 * q.power); },
    },
    {
      id: 'burn', family: 'ballistic', name: '잔류하는 문장', icon: '♨', max: 4, weight: 7, minLevel: 2,
      describe: (q) => `적중 시 ${Math.round(12 + 8 * q.power)}% 확률로 초당 공격력의 ${Math.round(18 * q.power)}% 피해를 주는 연소를 남깁니다.`,
      apply: (p, q) => { p.burnChance = Math.min(0.75, p.burnChance + 0.12 + 0.08 * q.power); p.burnRatio += 0.18 * q.power; },
    },
    {
      id: 'execute', family: 'ballistic', name: '삭제 명령', icon: '⌫', max: 3, weight: 5, minLevel: 4, rarityFloor: 'rare',
      describe: (q) => `일반 적의 생명이 ${Math.round((0.08 + 0.035 * q.power) * 100)}% 아래면 즉시 삭제합니다. 보스에는 추가 피해를 줍니다.`,
      apply: (p, q) => { p.executeThreshold = Math.min(0.32, p.executeThreshold + 0.08 + 0.035 * q.power); },
    },

    // Temporal architecture
    {
      id: 'echoPower', family: 'temporal', name: '더 선명한 과거', icon: '◈', max: 6, weight: 14,
      describe: (q) => `시간 잔향 피해가 ${Math.round(20 * q.power)}%p 증가합니다.`,
      apply: (p, q) => { p.echoDamage += 0.2 * q.power; },
    },
    {
      id: 'echoCooldown', family: 'temporal', name: '짧아진 회상', icon: '⌛', max: 5, weight: 12,
      describe: (q) => `시간 잔향 재사용 대기시간이 ${Math.round(10 * q.power)}% 감소합니다.`,
      apply: (p, q) => { p.echoCooldownMax *= Math.max(0.56, 1 - 0.1 * q.power); p.echoCooldown = Math.min(p.echoCooldown, p.echoCooldownMax); },
    },
    {
      id: 'echoLength', family: 'temporal', name: '긴 기억', icon: '⌂', max: 4, weight: 8, minLevel: 2,
      describe: (q) => `잔향이 재현하는 과거가 ${(0.45 * q.power).toFixed(1)}초 길어집니다.`,
      apply: (p, q) => { p.echoRecordSeconds += 0.45 * q.power; },
    },
    {
      id: 'echoCount', family: 'temporal', name: '다중의 나', icon: '♢', max: 3, weight: 5, minLevel: 4, rarityFloor: 'rare',
      describe: (q) => `동시에 존재할 수 있는 잔향이 ${discrete(q)}개 증가합니다.`,
      apply: (p, q) => { p.maxEchoes += discrete(q); },
    },
    {
      id: 'echoShield', family: 'temporal', name: '과거의 보호', icon: '◉', max: 4, weight: 8,
      describe: (q) => `잔향 호출 시 보호막을 ${Math.round(7 * q.power)} 회복합니다.`,
      apply: (p, q) => { p.echoShield += 7 * q.power; },
    },
    {
      id: 'resonantKill', family: 'temporal', name: '공명의 사냥', icon: '⌬', max: 4, weight: 8, minLevel: 2,
      describe: (q) => `적 격파 시 잔향 대기시간이 ${(0.12 * q.power).toFixed(2)}초 감소합니다.`,
      apply: (p, q) => { p.onKillEchoReduction += 0.12 * q.power; },
    },
    {
      id: 'echoNova', family: 'temporal', name: '회상의 충격파', icon: '◎', max: 4, weight: 7, minLevel: 2,
      describe: (q) => `잔향 호출 지점과 현재 위치에서 공격력의 ${(1.4 * q.power).toFixed(1)}배 범위 피해를 줍니다.`,
      apply: (p, q) => { p.echoNova += 1.4 * q.power; p.echoNovaRadius += 12 * q.power; },
    },
    {
      id: 'echoCrit', family: 'temporal', name: '과거의 확신', icon: '◇', max: 4, weight: 7, minLevel: 3,
      describe: (q) => `잔향 탄환이 ${Math.round(9 * q.power)}% 확률로 치명타를 냅니다.`,
      apply: (p, q) => { p.echoCritChance = Math.min(0.7, p.echoCritChance + 0.09 * q.power); },
    },
    {
      id: 'mark', family: 'temporal', name: '시간 낙인', icon: '⌾', max: 3, weight: 5, minLevel: 4, rarityFloor: 'rare',
      describe: (q) => `잔향이 적을 ${(2 + q.power).toFixed(1)}초간 표시합니다. 현재의 내가 표시된 적에게 ${Math.round(16 * q.power)}% 추가 피해를 줍니다.`,
      apply: (p, q) => { p.markDuration += 2 + q.power; p.markBonus += 0.16 * q.power; },
    },
    {
      id: 'temporalDividend', family: 'temporal', name: '시간 배당', icon: '↺', max: 3, weight: 6, minLevel: 3,
      describe: (q) => `잔향 호출 시 대시 대기시간을 ${(0.55 * q.power).toFixed(1)}초 줄이고 생명을 ${Math.round(2.5 * q.power)} 회복합니다.`,
      apply: (p, q) => { p.echoDashRefund += 0.55 * q.power; p.echoHeal += 2.5 * q.power; },
    },
    {
      id: 'echoProjectiles', family: 'temporal', name: '평행 사격', icon: '⋈', max: 3, weight: 5, minLevel: 4, rarityFloor: 'rare',
      describe: (q) => `잔향만 추가 탄환 ${discrete(q)}발을 발사합니다.`,
      apply: (p, q) => { p.echoProjectileBonus += discrete(q); },
    },

    // Mobility
    {
      id: 'speed', family: 'mobility', name: '먼저 움직인 몸', icon: '➟', max: 5, weight: 10,
      describe: (q) => `이동 속도가 ${Math.round(6 * q.power)}% 증가합니다.`,
      apply: (p, q) => { p.speed *= 1 + 0.06 * q.power; },
    },
    {
      id: 'dash', family: 'mobility', name: '망설임의 절단', icon: '⇢', max: 5, weight: 11,
      describe: (q) => `위상 대시 대기시간이 ${Math.round(11 * q.power)}% 감소합니다.`,
      apply: (p, q) => { p.dashCooldownMax *= Math.max(0.5, 1 - 0.11 * q.power); p.dashCooldown = Math.min(p.dashCooldown, p.dashCooldownMax); },
    },
    {
      id: 'dashBlast', family: 'mobility', name: '도약의 파문', icon: '◌', max: 4, weight: 8, minLevel: 2,
      describe: (q) => `대시 시작 시 공격력의 ${(1.25 * q.power).toFixed(1)}배 범위 피해를 줍니다.`,
      apply: (p, q) => { p.dashBlastRatio += 1.25 * q.power; p.dashBlastRadius += 8 * q.power; },
    },
    {
      id: 'dashTrail', family: 'mobility', name: '절단된 궤적', icon: '≋', max: 4, weight: 7, minLevel: 3,
      describe: (q) => `대시 경로가 공격력의 ${Math.round(38 * q.power)}% 피해를 반복해서 줍니다.`,
      apply: (p, q) => { p.dashTrailRatio += 0.38 * q.power; },
    },
    {
      id: 'dashPurge', family: 'mobility', name: '탄막 부정', icon: '⊘', max: 3, weight: 5, minLevel: 4, rarityFloor: 'rare',
      describe: (q) => `대시할 때 반경 ${Math.round(105 + 32 * q.power)} 안의 적 탄환을 삭제합니다.`,
      apply: (p, q) => { p.dashPurgeRadius = Math.max(p.dashPurgeRadius, 105 + 32 * q.power); },
    },
    {
      id: 'dashGuard', family: 'mobility', name: '가속 장벽', icon: '◍', max: 3, weight: 7, minLevel: 2,
      describe: (q) => `대시할 때 보호막을 ${Math.round(4.5 * q.power)} 회복합니다.`,
      apply: (p, q) => { p.dashShield += 4.5 * q.power; },
    },
    {
      id: 'phaseLength', family: 'mobility', name: '긴 위상', icon: '↝', max: 3, weight: 6, minLevel: 3,
      describe: (q) => `대시 무적 시간이 ${(0.035 * q.power).toFixed(2)}초 늘고 이동 거리가 증가합니다.`,
      apply: (p, q) => { p.dashDuration += 0.035 * q.power; p.dashSpeed *= 1 + 0.035 * q.power; },
    },
    {
      id: 'kinetic', family: 'mobility', name: '운동량 전환', icon: '⟫', max: 4, weight: 6, minLevel: 3,
      describe: (q) => `최고 속도로 이동할 때 주무기 피해가 최대 ${Math.round(12 * q.power)}% 증가합니다.`,
      apply: (p, q) => { p.kineticDamage += 0.12 * q.power; },
    },
    {
      id: 'hurtNova', family: 'mobility', name: '반사적 반격', icon: '✺', max: 3, weight: 5, minLevel: 3,
      describe: (q) => `피격 시 4초마다 공격력의 ${(1.6 * q.power).toFixed(1)}배 충격파를 방출합니다.`,
      apply: (p, q) => { p.hurtNovaRatio += 1.6 * q.power; },
    },

    // Survival
    {
      id: 'vital', family: 'survival', name: '살아남은 이유', icon: '♥', max: 5, weight: 12,
      describe: (q) => `최대 생명이 ${Math.round(15 * q.power)} 증가하고 즉시 전량 회복합니다.`,
      apply: (p, q) => { const gain = 15 * q.power; p.maxHp += gain; p.hp += gain; },
    },
    {
      id: 'shield', family: 'survival', name: '다정한 경계', icon: '◯', max: 5, weight: 12,
      describe: (q) => `최대 보호막 +${Math.round(11 * q.power)}, 재생 +${(0.35 * q.power).toFixed(1)}/초.`,
      apply: (p, q) => { const gain = 11 * q.power; p.maxShield += gain; p.shield += gain; p.shieldRegen += 0.35 * q.power; },
    },
    {
      id: 'regen', family: 'survival', name: '조용한 회복', icon: '✚', max: 4, weight: 7, minLevel: 2, rarityFloor: 'uncommon',
      describe: (q) => `매초 생명을 ${(0.42 * q.power).toFixed(2)} 회복합니다.`,
      apply: (p, q) => { p.regen += 0.42 * q.power; },
    },
    {
      id: 'armor', family: 'survival', name: '해석의 갑주', icon: '▣', max: 4, weight: 8, minLevel: 2,
      describe: (q) => `받는 피해가 ${Math.round(6 * q.power)}% 감소합니다.`,
      apply: (p, q) => { p.damageReduction = Math.min(0.62, p.damageReduction + 0.06 * q.power); },
    },
    {
      id: 'onKillHeal', family: 'survival', name: '생명 회수', icon: '♡', max: 4, weight: 7, minLevel: 2,
      describe: (q) => `적 격파 시 ${Math.round(9 + 6 * q.power)}% 확률로 생명 ${Math.round(1.7 * q.power)}를 회복합니다.`,
      apply: (p, q) => { p.killHealChance = Math.min(0.75, p.killHealChance + 0.09 + 0.06 * q.power); p.killHeal += 1.7 * q.power; },
    },
    {
      id: 'onKillShield', family: 'survival', name: '전리품 장벽', icon: '⬡', max: 4, weight: 7, minLevel: 2,
      describe: (q) => `적 격파 시 ${Math.round(14 + 7 * q.power)}% 확률로 보호막 ${Math.round(2.2 * q.power)}를 회복합니다.`,
      apply: (p, q) => { p.killShieldChance = Math.min(0.88, p.killShieldChance + 0.14 + 0.07 * q.power); p.killShield += 2.2 * q.power; },
    },
    {
      id: 'shieldBreak', family: 'survival', name: '경계 붕괴', icon: '⊙', max: 3, weight: 5, minLevel: 4, rarityFloor: 'rare',
      describe: (q) => `보호막이 깨질 때 8초마다 공격력의 ${(2.2 * q.power).toFixed(1)}배 충격파와 탄환 삭제를 일으킵니다.`,
      apply: (p, q) => { p.shieldBreakRatio += 2.2 * q.power; },
    },
    {
      id: 'secondChance', family: 'survival', name: '두 번째 문장', icon: '∞', max: 2, weight: 3, minLevel: 6, rarityFloor: 'legendary',
      describe: (q) => `치명적인 피해를 ${discrete(q)}회 견디고 생명 45%로 복귀합니다.`,
      apply: (p, q) => { p.extraLife += discrete(q); },
    },
    {
      id: 'lowHealth', family: 'survival', name: '절박한 명료함', icon: '!', max: 4, weight: 6, minLevel: 3,
      describe: (q) => `생명 35% 이하에서 피해와 발사 속도가 최대 ${Math.round(12 * q.power)}% 증가합니다.`,
      apply: (p, q) => { p.lowHealthPower += 0.12 * q.power; },
    },
    {
      id: 'hitInvuln', family: 'survival', name: '고통의 간격', icon: '◐', max: 3, weight: 6, minLevel: 3,
      describe: (q) => `피격 후 무적 시간이 ${(0.055 * q.power).toFixed(2)}초 늘어납니다.`,
      apply: (p, q) => { p.hitInvuln += 0.055 * q.power; },
    },
    {
      id: 'memoryMend', family: 'survival', name: '배움의 봉합', icon: '✣', max: 4, weight: 7, minLevel: 2,
      describe: (q) => `기억 편린 25개를 회수할 때마다 생명 ${Math.round(2.5 * q.power)}를 회복합니다.`,
      apply: (p, q) => { p.xpHeal += 2.5 * q.power; },
    },

    // Anomalies & utility
    {
      id: 'chain', family: 'anomaly', name: '연결된 호기심', icon: 'ϟ', max: 4, weight: 7, minLevel: 3, rarityFloor: 'rare',
      describe: (q) => `적중 시 ${Math.round(13 * q.power)}% 확률로 ${2 + discrete(q)}명의 적에게 번개가 이어집니다.`,
      apply: (p, q) => { p.chainChance = Math.min(0.78, p.chainChance + 0.13 * q.power); p.chainDamageRatio += 0.08 * q.power; p.chainJumps += discrete(q); },
    },
    {
      id: 'splash', family: 'anomaly', name: '의미의 폭발', icon: '✺', max: 4, weight: 7, minLevel: 3, rarityFloor: 'rare',
      describe: (q) => `적중 시 반경 ${Math.round(30 + 17 * q.power)}에 원 피해의 ${Math.round(23 + 9 * q.power)}%를 줍니다.`,
      apply: (p, q) => { p.splashRadius += 30 + 17 * q.power; p.splashRatio += 0.09 * q.power; },
    },
    {
      id: 'satellite', family: 'anomaly', name: '관찰자의 별', icon: '⊙', max: 4, weight: 6, minLevel: 3, rarityFloor: 'uncommon',
      describe: (q) => `자동 사격하는 기억 위성이 ${discrete(q)}기 추가됩니다.`,
      apply: (p, q) => { p.droneCount += discrete(q); },
    },
    {
      id: 'droneOverclock', family: 'anomaly', name: '위성 과열', icon: '☼', max: 4, weight: 5, minLevel: 4, requires: { satellite: 1 },
      describe: (q) => `위성 발사 속도 +${Math.round(15 * q.power)}%, 피해 +${Math.round(13 * q.power)}%.`,
      apply: (p, q) => { p.droneFireRate *= 1 + 0.15 * q.power; p.droneDamage += 0.13 * q.power; },
    },
    {
      id: 'slowBullets', family: 'anomaly', name: '고요한 시간', icon: '◌', max: 4, weight: 6, minLevel: 3,
      describe: (q) => `적 탄환 속도가 ${Math.round(6 * q.power)}% 느려집니다.`,
      apply: (p, q) => { p.enemyBulletSlow *= Math.max(0.58, 1 - 0.06 * q.power); },
    },
    {
      id: 'freeze', family: 'anomaly', name: '동결된 해석', icon: '❄', max: 4, weight: 6, minLevel: 3, rarityFloor: 'uncommon',
      describe: (q) => `적중 시 ${Math.round(10 * q.power)}% 확률로 적을 ${Math.round(22 + 8 * q.power)}% 둔화합니다.`,
      apply: (p, q) => { p.freezeChance = Math.min(0.72, p.freezeChance + 0.1 * q.power); p.freezeSlow = Math.min(0.72, p.freezeSlow + 0.08 + 0.05 * q.power); },
    },
    {
      id: 'magnet', family: 'utility', name: '끌어당기는 의미', icon: '⌁', max: 4, weight: 9,
      describe: (q) => `편린 회수 범위 +${Math.round(70 * q.power)}, 경험치 +${Math.round(4 * q.power)}%.`,
      apply: (p, q) => { p.magnet += 70 * q.power; p.xpGain += 0.04 * q.power; },
    },
    {
      id: 'fortune', family: 'utility', name: '우연의 편집', icon: '✦', max: 4, weight: 6, minLevel: 2,
      describe: (q) => `이번 런의 행운이 ${(1.4 * q.power).toFixed(1)} 증가해 고희귀도 기억 확률이 높아집니다.`,
      apply: (p, q) => { p.luck += 1.4 * q.power; },
    },
    {
      id: 'rerollToken', family: 'utility', name: '분기권', icon: '↻', max: 4, weight: 5, minLevel: 2,
      describe: (q) => `선택지 재구성 횟수를 ${discrete(q)}회 얻습니다.`,
      apply: (p, q) => { p.rerolls += discrete(q); },
    },
    {
      id: 'coreHunter', family: 'utility', name: '핵심 회수자', icon: '⬡', max: 4, weight: 5, minLevel: 3,
      describe: (q) => `이번 런의 코어 정산량이 ${Math.round(10 * q.power)}% 증가하고 엘리트 보상이 강화됩니다.`,
      apply: (p, q) => { p.coreGain += 0.1 * q.power; },
    },
    {
      id: 'glassCannon', family: 'anomaly', name: '유리로 된 태양', icon: '☀', max: 1, weight: 3, minLevel: 5, rarityFloor: 'epic',
      describe: (q) => `최대 생명 20%를 희생해 공격력 +${Math.round(34 * q.power)}%, 발사 속도 +${Math.round(12 * q.power)}%.`,
      apply: (p, q) => { p.maxHp *= 0.8; p.hp = Math.min(p.hp, p.maxHp); p.damage *= 1 + 0.34 * q.power; p.fireRate *= 1 + 0.12 * q.power; },
    },
    {
      id: 'bloodPrice', family: 'anomaly', name: '피의 가속', icon: '♦', max: 2, weight: 3, minLevel: 5, rarityFloor: 'epic',
      describe: (q) => `보호막 재생을 절반으로 줄이고 공격력과 이동 속도를 각각 ${Math.round(20 * q.power)}%, ${Math.round(7 * q.power)}% 높입니다.`,
      apply: (p, q) => { p.shieldRegen *= 0.5; p.damage *= 1 + 0.2 * q.power; p.speed *= 1 + 0.07 * q.power; },
    },

    // Evolutions — build-defining capstones
    {
      id: 'bulletStorm', family: 'ballistic', name: '진화 · 탄도 폭풍', icon: '☄', max: 1, weight: 18, minLevel: 7, rarityFloor: 'legendary', evolution: true, requires: { cadence: 3, split: 2 },
      describe: (q) => `추가 탄환 ${1 + discrete(q)}발, 발사 속도 +${Math.round(22 * q.power)}%. 움직일수록 산탄이 좁아집니다.`,
      apply: (p, q) => { p.projectiles += 1 + discrete(q); p.fireRate *= 1 + 0.22 * q.power; p.spread *= 0.72; p.bulletStorm = true; },
    },
    {
      id: 'singularity', family: 'anomaly', name: '진화 · 특이점 연쇄', icon: '✹', max: 1, weight: 18, minLevel: 7, rarityFloor: 'legendary', evolution: true, requires: { splash: 2, chain: 2 },
      describe: (q) => `치명타 폭발 반경과 연쇄 피해가 크게 증가하며 폭발이 다시 번개를 호출합니다.`,
      apply: (p, q) => { p.singularity = true; p.splashRadius += 52 * q.power; p.splashRatio += 0.25 * q.power; p.chainDamageRatio += 0.22 * q.power; },
    },
    {
      id: 'echoLegion', family: 'temporal', name: '진화 · 잔향 군단', icon: '♧', max: 1, weight: 18, minLevel: 7, rarityFloor: 'legendary', evolution: true, requires: { echoPower: 3, echoCount: 1 },
      describe: (q) => `동시 잔향 +${1 + discrete(q)}, 잔향 피해 +${Math.round(24 * q.power)}%p. 호출 시 모든 잔향이 충격파를 냅니다.`,
      apply: (p, q) => { p.maxEchoes += 1 + discrete(q); p.echoDamage += 0.24 * q.power; p.echoLegion = true; },
    },
    {
      id: 'eventHorizon', family: 'mobility', name: '진화 · 사건의 지평선', icon: '⊘', max: 1, weight: 18, minLevel: 7, rarityFloor: 'legendary', evolution: true, requires: { dashBlast: 2, dashPurge: 1 },
      describe: (q) => `대시가 넓은 탄막을 지우고 적을 끌어당긴 뒤 공격력의 ${(4.5 * q.power).toFixed(1)}배 피해를 줍니다.`,
      apply: (p, q) => { p.eventHorizon = true; p.dashPurgeRadius += 80 * q.power; p.dashBlastRatio += 4.5 * q.power; p.dashBlastRadius += 70; },
    },
    {
      id: 'immortalArchive', family: 'survival', name: '진화 · 불멸 기록', icon: '∞', max: 1, weight: 18, minLevel: 7, rarityFloor: 'legendary', evolution: true, requires: { vital: 2, shield: 2 },
      describe: (q) => `치명상 거부 +1, 생명 35% 이하에서 피해 감소 ${Math.round(15 * q.power)}%.`,
      apply: (p, q) => { p.extraLife += 1; p.lowHealthReduction += 0.15 * q.power; p.immortalArchive = true; },
    },
    {
      id: 'solarChoir', family: 'anomaly', name: '진화 · 태양의 합창', icon: '☼', max: 1, weight: 18, minLevel: 7, rarityFloor: 'legendary', evolution: true, requires: { satellite: 2, burn: 1 },
      describe: (q) => `위성 +${1 + discrete(q)}, 위성 탄환이 확정 연소를 부여하고 피해가 크게 증가합니다.`,
      apply: (p, q) => { p.droneCount += 1 + discrete(q); p.droneDamage += 0.35 * q.power; p.solarChoir = true; },
    },
    {
      id: 'frozenVerdict', family: 'anomaly', name: '진화 · 동결 판결', icon: '❅', max: 1, weight: 18, minLevel: 7, rarityFloor: 'legendary', evolution: true, requires: { freeze: 2, critical: 2 },
      describe: (q) => `둔화된 적에게 치명타 확률 +${Math.round(18 * q.power)}%p, 치명타 피해 +${Math.round(30 * q.power)}%.`,
      apply: (p, q) => { p.frozenVerdict = true; p.frozenCritChance += 0.18 * q.power; p.frozenCritDamage += 0.3 * q.power; },
    },
    {
      id: 'ouroboros', family: 'temporal', name: '진화 · 우로보로스', icon: '⟳', max: 1, weight: 18, minLevel: 7, rarityFloor: 'legendary', evolution: true, requires: { resonantKill: 2, onKillHeal: 2 },
      describe: (q) => `적 격파가 생명과 잔향 시간을 동시에 돌려줍니다. 잔향 중 처치하면 재사용 감소가 두 배가 됩니다.`,
      apply: (p, q) => { p.ouroboros = true; p.killHeal += 2.2 * q.power; p.onKillEchoReduction += 0.18 * q.power; },
    },
  ];


  const metaDisplayNames = {
    vitality: '최대 생명', force: '공격력', reflex: '이동·대시', luck: '희귀도 행운', barrier: '시작 보호막', cadence: '연사 속도',
    resonance: '잔향 강화', memory: '경험치 획득', salvage: '코어 획득', reroll: '리롤 횟수', arsenal: '선택지 수', defiance: '부활 횟수',
  };
  for (const node of metaNodes) { node.flavor = node.name; node.name = metaDisplayNames[node.id] || node.name; }

  const upgradeDisplayNames = {
    cadence:'연사 속도', amplify:'공격력', velocity:'탄속·사거리', mass:'탄환 크기', pierce:'관통', split:'추가 탄환', critical:'치명타 확률', critPower:'치명타 피해', homing:'유도 탄환', ricochet:'도탄', burn:'화상', execute:'처형',
    echoPower:'잔향 피해', echoCooldown:'잔향 쿨타임', echoLength:'잔향 재생 시간', echoCount:'잔향 동시 소환', echoShield:'잔향 보호막', resonantKill:'처치 시 잔향 충전', echoNova:'잔향 소환 폭발', echoCrit:'잔향 치명타', mark:'시간 표식', temporalDividend:'잔향 사용 시 회복', echoProjectiles:'잔향 추가 탄환',
    speed:'이동 속도', dash:'대시 쿨타임', dashBlast:'대시 폭발', dashTrail:'대시 피해 궤적', dashPurge:'대시로 탄막 제거', dashGuard:'대시 보호막', phaseLength:'대시 거리·무적', kinetic:'이동 중 공격력', hurtNova:'피격 반격',
    vital:'최대 생명', shield:'보호막', regen:'체력 재생', armor:'피해 감소', onKillHeal:'처치 시 회복', onKillShield:'처치 시 보호막', shieldBreak:'보호막 파괴 폭발', secondChance:'추가 목숨', lowHealth:'저체력 강화', hitInvuln:'피격 무적 시간', memoryMend:'경험치로 회복',
    chain:'연쇄 번개', splash:'범위 폭발', satellite:'공격 위성', droneOverclock:'위성 연사·피해', slowBullets:'적 탄환 감속', freeze:'빙결 둔화', magnet:'경험치 자석', fortune:'희귀도 행운', rerollToken:'리롤 추가', coreHunter:'코어 보너스', glassCannon:'유리 대포', bloodPrice:'보호막 희생 화력',
    bulletStorm:'진화: 탄환 폭풍', singularity:'진화: 폭발 연쇄', echoLegion:'진화: 잔향 군단', eventHorizon:'진화: 블랙홀 대시', immortalArchive:'진화: 불사 기록', solarChoir:'진화: 태양 위성군', frozenVerdict:'진화: 빙결 처형', ouroboros:'진화: 처치 순환',
  };
  for (const upgrade of upgrades) { upgrade.flavor = upgrade.name; upgrade.name = upgradeDisplayNames[upgrade.id] || upgrade.name; }

  function upgradeEligible(upgrade) {
    if (!player) return false;
    const rank = player.upgradeLevels[upgrade.id] || 0;
    if (rank >= upgrade.max) return false;
    if (player.level < (upgrade.minLevel || 1)) return false;
    if (!hasRanks(upgrade.requires)) return false;
    return true;
  }

  function weightedChoice(items, weightOf) {
    let total = 0;
    const weighted = [];
    for (const item of items) {
      const weight = Math.max(0.001, weightOf(item));
      total += weight;
      weighted.push([item, total]);
    }
    let roll = Math.random() * total;
    for (const [item, threshold] of weighted) if (roll <= threshold) return item;
    return items[items.length - 1];
  }

  function rollRarity(floor = 'common', forced = null) {
    if (forced) return forced;
    const floorIndex = rarityIndex(floor);
    const available = rarityOrder.filter((key, index) => index >= floorIndex && player.level >= rarityInfo[key].minLevel);
    const luck = Math.max(0, player.luck || 0);
    return weightedChoice(available, (key) => {
      const index = rarityIndex(key);
      const highBoost = 1 + luck * (index === 0 ? -0.035 : 0.018 + index * 0.018);
      return rarityInfo[key].weight * Math.max(index === 0 ? 0.18 : 0.6, highBoost);
    });
  }

  function upgradeWeight(upgrade) {
    const rank = player.upgradeLevels[upgrade.id] || 0;
    const familyRank = player.familyRanks[upgrade.family] || 0;
    let weight = upgrade.weight || 8;
    if (rank === 0) weight *= 1.15;
    if (familyRank > 0) weight *= 1 + Math.min(0.7, familyRank * 0.045);
    if (upgrade.evolution) weight *= 1.6;
    return weight;
  }

  function createUpgradeChoices(count = 4, isReroll = false, options = {}) {
    const excludeIds = options.excludeIds instanceof Set ? options.excludeIds : null;
    const pool = upgrades.filter((upgrade) => upgradeEligible(upgrade) && !(excludeIds && excludeIds.has(upgrade.id)));
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

    // Pity guarantees prevent a long sequence of visually identical low rolls.
    const screenNumber = player.upgradeScreens;
    let highestIndex = chosen.reduce((max, item) => Math.max(max, rarityIndex(item.rarityKey)), 0);
    // Every draft shows at least one visibly better-than-common option, so rarity matters from the first level-up.
    if (highestIndex < rarityIndex('uncommon') && chosen.length) {
      const index = randi(0, chosen.length - 1);
      chosen[index].rarityKey = 'uncommon';
      chosen[index].quality = rarityInfo.uncommon;
      highestIndex = rarityIndex('uncommon');
    }
    if (player.level >= 3 && screenNumber % 3 === 0 && highestIndex < rarityIndex('rare') && chosen.length) {
      const index = randi(0, chosen.length - 1);
      chosen[index].rarityKey = 'rare';
      chosen[index].quality = rarityInfo.rare;
    }
    if (player.level >= 7 && screenNumber % 8 === 0 && highestIndex < rarityIndex('legendary') && chosen.length) {
      const index = randi(0, chosen.length - 1);
      chosen[index].rarityKey = 'legendary';
      chosen[index].quality = rarityInfo.legendary;
      highestIndex = rarityIndex('legendary');
    }
    if (activeDraftGuarantee && chosen.length) {
      const guaranteed = rarityAllowedForLevel(activeDraftGuarantee);
      if (highestIndex < rarityIndex(guaranteed)) {
        const index = randi(0, chosen.length - 1);
        chosen[index].rarityKey = guaranteed;
        chosen[index].quality = rarityInfo[guaranteed];
      }
    }
    return chosen;
  }

  function strongestFamilies() {
    if (!player) return [];
    return Object.entries(player.familyRanks)
      .filter(([, rank]) => rank > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }

  function isChoiceLocked(choice) {
    return Boolean(choice?.upgrade && lockedUpgradeIds.has(choice.upgrade.id));
  }

  function toggleUpgradeLock(choice) {
    if (!choice?.upgrade) return;
    const id = choice.upgrade.id;
    if (lockedUpgradeIds.has(id)) lockedUpgradeIds.delete(id);
    else lockedUpgradeIds.add(id);
    renderUpgradeChoices(currentUpgradeChoices, false);
  }

  function updateBuildSummary() {
    const summary = $('#buildSummary');
    const pauseSummary = $('#pauseBuild');
    if (!summary || !player) return;
    const families = strongestFamilies();
    if (!families.length) {
      summary.textContent = '아직 형성된 빌드 계열이 없습니다. 첫 선택이 진화 경로를 엽니다.';
      if (pauseSummary) pauseSummary.textContent = '선택한 강화가 아직 없습니다.';
      return;
    }
    const markup = families.map(([key, rank]) => `<span style="color:${familyInfo[key].color}">${familyInfo[key].label} ${rank}</span>`).join(' · ') + ' <span>— 같은 계열을 쌓으면 진화 기억이 등장합니다.</span>';
    summary.innerHTML = markup;
    if (pauseSummary) pauseSummary.innerHTML = `<b>현재 주력</b> · ${markup}`;
  }


  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  }

  function emphasizeNumbers(text) {
    return escapeHtml(text).replace(/([+\-]?\d+(?:\.\d+)?(?:%p|%|배|초|명|발|회|기)?)/g, '<strong>$1</strong>');
  }

  function splitUpgradeDescription(text) {
    const parts = String(text).split(/\.\s+/);
    return { key: parts.shift() || text, detail: parts.join('. ') };
  }

  function evolutionPathFor(upgrade) {
    if (upgrade.evolution) return { html: '<span>진화 완성</span><b>새 전투 규칙이 즉시 활성화됩니다</b>', ready: true };
    const candidates = upgrades.filter((item) => item.evolution && item.requires && Object.hasOwn(item.requires, upgrade.id) && !(player.upgradeLevels[item.id] || 0));
    if (!candidates.length) return null;
    let best = null;
    let bestRatio = -1;
    for (const evolution of candidates) {
      let got = 0, need = 0;
      for (const [id, required] of Object.entries(evolution.requires)) {
        need += required;
        got += Math.min(required, (player.upgradeLevels[id] || 0) + (id === upgrade.id ? 1 : 0));
      }
      const ratio = got / Math.max(1, need);
      if (ratio > bestRatio) { bestRatio = ratio; best = { evolution, got, need }; }
    }
    if (!best) return null;
    const requirements = Object.entries(best.evolution.requires).map(([id, required]) => {
      const source = upgrades.find((item) => item.id === id);
      const rank = (player.upgradeLevels[id] || 0) + (id === upgrade.id ? 1 : 0);
      return `${source?.name || id} ${Math.min(rank, required)}/${required}`;
    }).join(' · ');
    return { html: `<span>진화 연결 ${best.got}/${best.need}</span><b>${best.evolution.name}</b><small>${requirements}</small>`, ready: best.got >= best.need };
  }
  function upgradeSynergyLabel(upgrade, rank) {
    const familyRank = player.familyRanks[upgrade.family] || 0;
    if (upgrade.evolution) return '진화 완성';
    if (familyRank >= 6) return '핵심 시너지';
    if (familyRank >= 3) return '높은 궁합';
    if (rank > 0) return '기존 축 강화';
    return familyRank > 0 ? '보조 시너지' : '새 빌드 축';
  }

  function renderUpgradeChoices(choices, playRevealSound = true) {
    currentUpgradeChoices = choices;
    UI.upgradeChoices.innerHTML = '';
    UI.upgradeChoices.dataset.count = String(choices.length);
    updateBuildSummary();
    $('#rerollCount').textContent = formatNumber(player.rerolls);
    const allLocked = choices.length > 0 && choices.every(isChoiceLocked);
    $('#rerollBtn').disabled = player.rerolls <= 0 || allLocked;
    const bestRarity = choices.reduce((best, item) => rarityIndex(item.rarityKey) > rarityIndex(best) ? item.rarityKey : best, 'common');
    const routeDraftNote = activeDraftGuarantee ? ` · 경로 보상 ${rarityInfo[rarityAllowedForLevel(activeDraftGuarantee)].label.split(' · ')[1]} 이상` : '';
    $('#upgradeSubtitle').textContent = `강화 단계 ${player.level} · 최고 선택지 ${rarityInfo[bestRarity].label.split(' · ')[1]}${routeDraftNote} · 핵심 변화와 빌드 궁합을 비교하세요`;

    choices.forEach((choice, index) => {
      const { upgrade, quality, rarityKey } = choice;
      const family = familyInfo[upgrade.family];
      const rank = player.upgradeLevels[upgrade.id] || 0;
      const familyRank = player.familyRanks[upgrade.family] || 0;
      const synergy = familyRank >= 2;
      const description = splitUpgradeDescription(upgrade.describe(quality));
      const path = evolutionPathFor(upgrade);
      const rarityBonus = Math.round((quality.power - 1) * 100);
      const locked = isChoiceLocked(choice);
      const card = document.createElement('article');
      card.className = `upgrade-card${synergy ? ' synergy' : ''}${upgrade.evolution ? ' evolution' : ''}${locked ? ' locked' : ''}`;
      card.dataset.rarity = rarityKey;
      card.dataset.family = upgrade.family;
      card.style.setProperty('--rarity-color', quality.color);
      card.style.setProperty('--family-color', family.color);
      card.setAttribute('aria-label', `${upgrade.name}, ${quality.label.split(' · ')[1]}, ${description.key}`);
      card.innerHTML = `
        <div class="upgrade-rarity-row"><div class="upgrade-rarity">${quality.label.split(' · ')[1]} · ${rarityBonus ? `효과 +${rarityBonus}%` : '기본 효과'}</div><div class="upgrade-family">${family.label} 계열</div></div>
        <div class="upgrade-card-head">
          <div class="upgrade-icon-frame">${uiIcon(family.icon)}</div>
          <div class="upgrade-title-wrap"><h3>${escapeHtml(upgrade.name)}</h3><div class="upgrade-flavor">${escapeHtml(upgrade.flavor)}</div></div>
        </div>
        <div class="upgrade-badges">${rank === 0 ? '<span class="upgrade-badge new">신규 효과</span>' : ''}${synergy ? '<span class="upgrade-badge synergy">주력 계열</span>' : ''}${upgrade.evolution ? '<span class="upgrade-badge evolution">최종 진화</span>' : ''}</div>
        <div class="upgrade-effect"><span class="upgrade-effect-text">${emphasizeNumbers(description.key)}</span></div>
        <p class="upgrade-detail">${description.detail ? emphasizeNumbers(description.detail) + '.' : '현재 빌드에 즉시 적용됩니다.'}</p>
        <div class="upgrade-analysis">
          <div><span>빌드 궁합</span><b>${upgradeSynergyLabel(upgrade, rank)}</b></div>
          <div><span>선택 결과</span><b>${rank}단계 → ${rank + 1}단계</b></div>
        </div>
        ${path ? `<div class="upgrade-path${path.ready ? ' ready' : ''}">${path.html}</div>` : ''}
        <div class="upgrade-card-footer"><div><div class="upgrade-power">${family.role} · ${rarityBonus ? `+${rarityBonus}% 증폭` : '표준 출력'}</div><div class="upgrade-level">현재 ${rank} / 최대 ${upgrade.max}</div></div><button type="button" class="upgrade-select"><span>선택</span><kbd>${index + 1}</kbd></button></div>
      `;
      const selectButton = card.querySelector('.upgrade-select');
      selectButton.setAttribute('aria-label', `${upgrade.name}, ${quality.label.split(' · ')[1]}, ${description.key}, 선택 시 ${rank + 1}단계`);
      selectButton.addEventListener('click', () => selectUpgrade(choice));
      const lock = document.createElement('button');
      lock.type = 'button';
      lock.className = 'upgrade-lock';
      lock.setAttribute('aria-pressed', String(locked));
      lock.setAttribute('aria-label', `${upgrade.name} ${locked ? '잠금 해제' : '잠금'}`);
      lock.innerHTML = `${uiIcon('lock')}<span>${locked ? '고정' : '잠금'}</span>`;
      lock.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleUpgradeLock(choice);
      });
      card.addEventListener('click', (event) => {
        if (event.target.closest('button, a, input, select, textarea, [role="button"]')) return;
        selectUpgrade(choice);
      });
      card.appendChild(lock);
      UI.upgradeChoices.appendChild(card);
    });
    if (playRevealSound) audio.draftReveal(rarityIndex(bestRarity));
  }

  function openUpgradeScreen() {
    if (!player || gameState !== 'playing' || pendingLevelUps <= 0) return;
    input.cancelEcho('upgrade', false);
    input.echoRequestQueued = null;
    lockedUpgradeIds.clear();
    pendingLevelUps--;
    gameState = 'upgrade';
    document.body.classList.add('choice-open');
    updateTouchControlsVisibility();
    UI.waveBanner.classList.add('hidden');
    audio.setGameState(false);
    player.upgradeScreens++;
    activeDraftGuarantee = player.nextDraftGuarantee || null;
    activeDraftChoiceBonus = Math.max(0, Math.floor(player.nextDraftChoiceBonus || 0));
    player.nextDraftGuarantee = null;
    player.nextDraftChoiceBonus = 0;
    const choices = createUpgradeChoices(Math.min(6, player.choiceCount + activeDraftChoiceBonus));
    renderUpgradeChoices(choices);
    showScreen(UI.upgrade);
    window.setTimeout(() => UI.upgradeChoices.firstElementChild?.focus({ preventScroll: true }), 70);
  }

  function selectUpgrade(choice) {
    if (gameState !== 'upgrade' || !choice?.upgrade) return;
    const { upgrade, quality, rarityKey } = choice;
    player.upgradeLevels[upgrade.id] = (player.upgradeLevels[upgrade.id] || 0) + 1;
    player.familyRanks[upgrade.family] = (player.familyRanks[upgrade.family] || 0) + (upgrade.evolution ? 3 : 1);
    recordUpgradeEconomySelection(upgrade.family, player.familyRanks[upgrade.family]);
    player.level++;
    player.upgradesChosen++;
    lockedUpgradeIds.clear();
    currentUpgradeChoices = [];
    activeDraftGuarantee = null;
    activeDraftChoiceBonus = 0;
    upgrade.apply(player, quality, rarityKey);
    player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.015);
    player.shield = Math.min(player.maxShield, player.shield + player.maxShield * 0.04);
    createShockwave(player.x, player.y, quality.color, 150 + rarityIndex(rarityKey) * 18, 0.55, 3 + rarityIndex(rarityKey) * 0.4);
    burstParticles(player.x, player.y, quality.color, 22 + rarityIndex(rarityKey) * 8, 70, 260 + rarityIndex(rarityKey) * 30, 3, 7);
    audio.upgrade(rarityIndex(rarityKey));
    showScreen(null);
    document.body.classList.remove('choice-open', 'boss-intro-active', 'boss-materializing');
    gameState = 'playing';
    updateTouchControlsVisibility();
    audio.setGameState(true);
    const rarityCallout = rarityIndex(rarityKey) >= 4 ? `${quality.label.split(' · ')[1]} 동기화 · ` : '';
    showToast(`${rarityCallout}${upgrade.name}`, rarityIndex(rarityKey) >= 4 ? 2800 : 1900);
    if (pendingLevelUps > 0) window.setTimeout(openUpgradeScreen, 230);
  }

  function rerollUpgradeChoices() {
    if (gameState !== 'upgrade' || !player || player.rerolls <= 0) return;
    const locked = currentUpgradeChoices.filter(isChoiceLocked);
    if (locked.length >= currentUpgradeChoices.length) {
      showToast('모든 선택지를 잠갔습니다', 1300);
      return;
    }
    const excludeIds = new Set(locked.map((choice) => choice.upgrade.id));
    const needed = currentUpgradeChoices.length - locked.length;
    const replacements = createUpgradeChoices(needed, true, { excludeIds });
    player.rerolls--;
    recordRerollEconomy(locked.length, currentUpgradeChoices.length);
    const nextChoices = currentUpgradeChoices.map((choice) => isChoiceLocked(choice) ? choice : replacements.shift()).filter(Boolean);
    currentUpgradeChoices = nextChoices;
    renderUpgradeChoices(currentUpgradeChoices, false);
    audio.reroll();
    showToast('잠그지 않은 선택지만 다시 계산했습니다', 1200);
  }


  // ---------------------------------------------------------------------------
  // Run setup, player, waves
  // ---------------------------------------------------------------------------
  const waveCatalog = [
    null,
    { name: '망각의 외곽', subtitle: '흩어진 기억 신호를 회수하십시오.' },
    { name: '흩어진 약속', subtitle: '적은 당신의 망설임을 추적합니다.' },
    { name: '붉은 회랑', subtitle: '직선으로 오는 위협은 직선으로 피하지 마십시오.' },
    { name: '기억의 폭풍', subtitle: '과거의 동선을 전술로 바꾸십시오.' },
    { name: '무명의 합창', subtitle: '수많은 목소리 속에서 자신의 궤적을 지키십시오.' },
    { name: '널 아카이브', subtitle: '망각을 기록하는 자가 깨어납니다.' },
  ];

  function waveInfo(number) {
    if (waveCatalog[number]) return waveCatalog[number];
    const endlessNames = ['회귀의 나선', '무한한 증언', '깨진 연대기', '침묵의 성운', '다시 쓰인 밤'];
    return { name: endlessNames[(number - 7) % endlessNames.length], subtitle: '끝없는 시간선이 스스로를 다시 조립합니다.' };
  }

  const waveModifiers = [
    { id: 'stable', name: '기본 규칙', subtitle: '기본 규칙이 유지됩니다.', hp: 1, damage: 1, speed: 1, spawn: 1, count: 1, bulletSpeed: 1, fireRate: 1, xp: 1, eliteChance: 0, core: 1 },
    { id: 'accelerated', name: '고속 적·빠른 공격', subtitle: '적이 빠르게 접근하고 더 자주 공격합니다.', hp: 0.96, damage: 1.08, speed: 1.2, spawn: 0.86, count: 1.05, bulletSpeed: 1.08, fireRate: 1.17, xp: 1.12, eliteChance: 0.02, core: 1.18 },
    { id: 'armored', name: '적 체력 증가', subtitle: '적의 생명이 크게 늘지만 편린 보상도 증가합니다.', hp: 1.38, damage: 1.04, speed: 0.92, spawn: 1.05, count: 0.92, bulletSpeed: 1, fireRate: 1, xp: 1.28, eliteChance: 0.015, core: 1.22 },
    { id: 'swarm', name: '적 수 증가', subtitle: '더 많은 적이 더 가까운 간격으로 출현합니다.', hp: 0.82, damage: 0.94, speed: 1.06, spawn: 0.73, count: 1.48, bulletSpeed: 1, fireRate: 1.02, xp: 0.9, eliteChance: 0.01, core: 1.2 },
    { id: 'ballistic', name: '탄환 속도·밀도 증가', subtitle: '적 탄환이 빠르고 밀도가 높습니다.', hp: 1, damage: 1.12, speed: 1, spawn: 0.95, count: 1.05, bulletSpeed: 1.22, fireRate: 1.28, xp: 1.18, eliteChance: 0.025, core: 1.28 },
    { id: 'elite', name: '엘리트 증가', subtitle: '엘리트 출현률이 폭증합니다.', hp: 1.05, damage: 1.06, speed: 1.04, spawn: 0.92, count: 1.08, bulletSpeed: 1.05, fireRate: 1.08, xp: 1.2, eliteChance: 0.14, core: 1.42 },
    { id: 'famine', name: '경험치 감소·코어 증가', subtitle: '편린은 적지만 코어 가치가 높습니다.', hp: 1.12, damage: 1.16, speed: 1.05, spawn: 0.92, count: 1.05, bulletSpeed: 1.08, fireRate: 1.08, xp: 0.72, eliteChance: 0.045, core: 1.55 },
  ];

  const routeCatalog = [
    {
      id: 'repair', name: '정비 구역', icon: '✚', color: '#71f6bb', risk: '위험 낮음',
      tagline: '성장 속도보다 생존 여유를 먼저 복구합니다.',
      combat: '전투 · 기본 규칙으로 안정화',
      reward: '보상 · 생명 30% 회복 · 보호막 완충 · 리롤 +1',
      forceStable: true,
      wave: {},
      player: {},
      onSelect: (p) => {
        p.hp = Math.min(p.maxHp, p.hp + p.maxHp * 0.3);
        p.shield = p.maxShield;
        p.rerolls += 1;
      },
    },
    {
      id: 'hunt', name: '엘리트 사냥', icon: '◆', color: '#ffd166', risk: '위험 높음',
      tagline: '강한 적을 더 자주 불러 코어와 희귀 강화를 노립니다.',
      combat: '전투 · 적 생명·공격 +10% · 엘리트 대폭 증가',
      reward: '보상 · 코어 +60% · 다음 강화 희귀 이상',
      wave: { hp: 1.1, damage: 1.1, eliteChance: 0.14, xp: 1.12, core: 1.6 },
      player: {},
      onSelect: (p) => { p.nextDraftGuarantee = maxRarityKey(p.nextDraftGuarantee || 'common', 'rare'); },
    },
    {
      id: 'swarm', name: '무리 소탕', icon: '✹', color: '#6fe8ff', risk: '위험 중간',
      tagline: '약한 적을 대량으로 상대해 경험치를 빠르게 끌어올립니다.',
      combat: '전투 · 적 수 +45% · 출현 속도 증가 · 적 생명 -15%',
      reward: '보상 · 경험치 +35% · 리롤 +1',
      wave: { hp: 0.85, damage: 0.96, spawn: 0.72, count: 1.45, xp: 1.35, core: 1.18 },
      player: {},
      onSelect: (p) => { p.rerolls += 1; },
    },
    {
      id: 'vault', name: '기억 보관소', icon: '✦', color: '#c47dff', risk: '위험 중상',
      tagline: '다음 강화 선택을 크게 개선하는 대신 단단한 적을 상대합니다.',
      combat: '전투 · 적 생명 +20% · 공격 +12% · 탄속 +10%',
      reward: '보상 · 다음 강화 선택지 +1 · 최고 등급 보장',
      wave: { hp: 1.2, damage: 1.12, bulletSpeed: 1.1, xp: 1.08, core: 1.25 },
      player: {},
      onSelect: (p) => {
        p.nextDraftChoiceBonus = Math.max(p.nextDraftChoiceBonus || 0, 1);
        p.nextDraftGuarantee = maxRarityKey(p.nextDraftGuarantee || 'common', 'epic');
      },
    },
    {
      id: 'overclock', name: '화력 과부하', icon: '⚡', color: '#ff7b9d', risk: '위험 높음',
      tagline: '적과 나 모두 빨라집니다. 짧고 위험한 화력 경주입니다.',
      combat: '전투 · 적 공격 +25% · 속도·연사 증가',
      reward: '보상 · 내 피해 +22% · 연사 +14% · 코어 +35%',
      wave: { damage: 1.25, speed: 1.12, fireRate: 1.14, xp: 1.2, core: 1.35 },
      player: { damage: 1.22, fireRate: 1.14 },
    },
    {
      id: 'echo', name: '잔향 증폭 시험', icon: '◈', color: '#9b82ff', risk: '위험 중상',
      tagline: '이 게임의 핵심 능력인 시간 잔향을 한 구역 동안 극대화합니다.',
      combat: '전투 · 적 탄속·연사 +14%',
      reward: '보상 · 잔향 즉시 충전 · 잔향 피해 +45% · 경험치 +22%',
      wave: { bulletSpeed: 1.14, fireRate: 1.14, hp: 1.08, xp: 1.22, core: 1.28 },
      player: { echo: 1.45 },
      onSelect: (p) => { p.echoCooldown = 0; },
    },
  ];

  const bossWaveModifier = {
    ...waveModifiers[4],
    id: 'cataclysm',
    name: '보스 탄막 강화',
    subtitle: '보스가 시간선을 강제로 압축합니다.',
    hp: 1.08, damage: 1.12, speed: 1.04, spawn: 0.88, count: 1,
    bulletSpeed: 1.12, fireRate: 1.18, xp: 1.25, eliteChance: 0.06, core: 1.4,
  };

  function combineWaveModifier(base, route) {
    if (!route) return { ...base, baseId: base.id };
    const wave = route.wave || {};
    return {
      ...base,
      id: `${base.id}:${route.id}`,
      baseId: base.id,
      name: base.name,
      subtitle: `${base.subtitle} ${route.combat.replace('전투 · ', '')}. ${route.reward.replace('보상 · ', '')}.`,
      hp: base.hp * (wave.hp || 1), damage: base.damage * (wave.damage || 1),
      speed: base.speed * (wave.speed || 1), spawn: base.spawn * (wave.spawn || 1),
      count: base.count * (wave.count || 1), bulletSpeed: base.bulletSpeed * (wave.bulletSpeed || 1),
      fireRate: base.fireRate * (wave.fireRate || 1), xp: base.xp * (wave.xp || 1),
      eliteChance: base.eliteChance + (wave.eliteChance || 0), core: base.core * (wave.core || 1),
    };
  }

  function rollBaseWaveModifier(number, boss) {
    if (number <= 1) return waveModifiers[0];
    if (boss) return bossWaveModifier;
    const candidates = waveModifiers.slice(1);
    const previousId = currentWave?.modifier?.baseId || currentWave?.modifier?.id;
    const filtered = candidates.filter((modifier) => modifier.id !== previousId);
    return pick(filtered.length ? filtered : candidates);
  }

  function finalBaseForRoute(route, rolledBase = pendingRouteBaseModifier) {
    return route?.forceStable ? waveModifiers[0] : (rolledBase || waveModifiers[0]);
  }

  function routeDangerScore(modifier) {
    const spawnPressure = Math.max(0, 1 / Math.max(0.2, modifier.spawn) - 1);
    return Math.max(0, modifier.hp - 1) * 0.9
      + Math.max(0, modifier.damage - 1) * 1.35
      + Math.max(0, modifier.speed - 1) * 0.75
      + Math.max(0, modifier.bulletSpeed - 1) * 0.72
      + Math.max(0, modifier.fireRate - 1)
      + Math.max(0, modifier.count - 1) * 0.72
      + spawnPressure * 0.58
      + Math.max(0, modifier.eliteChance) * 2.2;
  }

  function routeDangerGrade(modifier) {
    const score = routeDangerScore(modifier);
    if (score < 0.1) return 'C';
    if (score < 0.45) return 'B';
    if (score < 0.85) return 'A';
    if (score < 1.25) return 'S';
    return 'S+';
  }

  const routeMetricDefinitions = [
    { key: 'hp', label: '적 체력' }, { key: 'damage', label: '적 공격' },
    { key: 'speed', label: '적 속도' }, { key: 'bulletSpeed', label: '탄환 속도' },
    { key: 'fireRate', label: '적 연사' }, { key: 'count', label: '적 수' },
    { key: 'spawn', label: '출현 속도', inverse: true },
    { key: 'eliteChance', label: '엘리트', probability: true },
    { key: 'xp', label: '경험치' }, { key: 'core', label: '코어' },
  ];

  function routeMetricPercent(modifier, definition) {
    if (definition.probability) return modifier[definition.key] * 100;
    const value = definition.inverse ? 1 / Math.max(0.2, modifier[definition.key]) : modifier[definition.key];
    return (value - 1) * 100;
  }

  function formatRouteMetric(percent, probability = false) {
    const rounded = Math.abs(percent) < 0.5 ? 0 : Math.round(percent);
    if (rounded === 0) return '기본';
    return `${rounded > 0 ? '+' : ''}${rounded}%${probability ? 'p' : ''}`;
  }

  function routeForecast(route) {
    const base = finalBaseForRoute(route);
    const modifier = combineWaveModifier(base, route);
    const metrics = routeMetricDefinitions.map((definition) => {
      const percent = routeMetricPercent(modifier, definition);
      return { ...definition, percent, text: formatRouteMetric(percent, definition.probability) };
    });
    return { routeId: route.id, base, modifier, grade: routeDangerGrade(modifier), score: routeDangerScore(modifier), metrics };
  }

  function routeForecastSummary(forecast, limit = 5) {
    const priority = { damage:10, hp:9, fireRate:8, bulletSpeed:7, count:6, spawn:5, speed:4, eliteChance:3, xp:2, core:1 };
    const changed = forecast.metrics.filter((metric) => Math.abs(metric.percent) >= 0.5)
      .sort((a,b) => Math.abs(b.percent)*(priority[b.key]||1) - Math.abs(a.percent)*(priority[a.key]||1))
      .slice(0,limit);
    return changed.length ? changed.map((metric) => `${metric.label} ${metric.text}`).join(' · ') : '모든 전투 수치 기본';
  }

  function routeCardImpactSummary(forecast) {
    return routeForecastSummary(forecast, 3).replace('모든 전투 수치 기본', '전투 수치 기본');
  }

  function renderForecastMetrics(forecast) {
    return forecast.metrics.map((metric) => {
      const tone = metric.percent > 0.5 ? (metric.key === 'xp' || metric.key === 'core' ? 'reward' : 'danger') : metric.percent < -0.5 ? 'relief' : 'neutral';
      return `<div class="forecast-metric ${tone}"><span>${metric.label}</span><b>${metric.text}</b></div>`;
    }).join('');
  }

  function applyRoutePlayerModifiers(route) {
    if (!player) return;
    const bonus = route?.player || {};
    player.routeDamageMult = bonus.damage || 1;
    player.routeFireRateMult = bonus.fireRate || 1;
    player.routeMoveMult = bonus.move || 1;
    player.routeEchoMult = bonus.echo || 1;
  }

  function shouldOfferRoute(completedNumber, wasBoss) {
    if (wasBoss) return false;
    if (!endlessMode) return completedNumber === 1 || completedNumber === 3 || completedNumber === 5;
    return completedNumber >= 8 && (completedNumber - 8) % 3 === 0;
  }

  function createRouteChoices(nextWaveNumber) {
    const safe = routeCatalog[0];
    const recent = new Set(routeHistory.slice(-2));
    let candidates = routeCatalog.slice(1).filter((route) => !recent.has(route.id));
    if (candidates.length < 2) candidates = routeCatalog.slice(1);
    const chosen = [safe];
    while (chosen.length < 3 && candidates.length) {
      const index = randi(0, candidates.length - 1);
      chosen.push(candidates.splice(index, 1)[0]);
    }
    // Before a boss, always include one build-shaping reward if random selection missed both.
    if (nextWaveNumber === 6 && !chosen.some((route) => route.id === 'vault' || route.id === 'hunt')) {
      chosen[2] = routeCatalog.find((route) => route.id === 'vault');
    }
    return chosen;
  }

  function routeBuildSummary() {
    if (!player) return '';
    const families = strongestFamilies();
    const build = families.length
      ? families.slice(0, 2).map(([key, rank]) => `${familyInfo[key].label} ${rank}`).join(' · ')
      : '아직 주력 계열 없음';
    return `<b>현재 생존</b> ${Math.ceil(player.hp)}/${Math.ceil(player.maxHp)} · 보호막 ${Math.ceil(player.shield)}/${Math.ceil(player.maxShield)} · 리롤 ${player.rerolls}<br><b>현재 빌드</b> ${escapeHtml(build)} · 다음 구역 SECTOR ${String(pendingRouteWave).padStart(2, '0')}`;
  }

  const routeIconMap = {
    repair: 'repair', hunt: 'hunt', swarm: 'swarm', vault: 'vault', overclock: 'overclock', echo: 'echo',
  };

  function setRoutePreview(route, index = 0) {
    if (!route) return;
    const forecast = pendingRouteForecasts[route.id] || routeForecast(route);
    const analysis = $('.route-analysis');
    analysis?.setAttribute('data-preview', String(index));
    analysis?.style.setProperty('--route-preview-color', route.color);
    UI.routePreview?.style.setProperty('--route-preview-color', route.color);
    if (UI.routePreviewIcon) UI.routePreviewIcon.innerHTML = uiIcon(routeIconMap[route.id] || 'route');
    if (UI.routePreviewRisk) UI.routePreviewRisk.textContent = `경로 ${route.risk}`;
    if (UI.routePreviewGrade) { UI.routePreviewGrade.textContent = `최종 ${forecast.grade}`; UI.routePreviewGrade.dataset.grade = forecast.grade; }
    if (UI.routePreviewName) UI.routePreviewName.textContent = route.name;
    if (UI.routePreviewTagline) UI.routePreviewTagline.textContent = route.tagline;
    if (UI.routePreviewAnomaly) {
      const overridden = route.forceStable && pendingRouteBaseModifier?.id !== 'stable';
      UI.routePreviewAnomaly.textContent = overridden ? `${pendingRouteBaseModifier.name} 감지 · 정비 경로가 제거` : `${forecast.base.name} · ${forecast.base.subtitle}`;
    }
    if (UI.routePreviewCombat) UI.routePreviewCombat.textContent = `${routeForecastSummary(forecast, 7)} · 선택 뒤 추가 무작위 없음`;
    if (UI.routePreviewStats) UI.routePreviewStats.innerHTML = renderForecastMetrics(forecast);
    if (UI.routePreviewReward) UI.routePreviewReward.textContent = `${route.reward.replace('보상 · ', '')} · 최종 경험치 ${formatRouteMetric((forecast.modifier.xp-1)*100)} · 코어 ${formatRouteMetric((forecast.modifier.core-1)*100)}`;
    $$('.route-card', UI.routeChoices).forEach((card, cardIndex) => card.classList.toggle('previewing', cardIndex === index));
  }

  function renderRouteChoices(choices) {
    pendingRouteChoices = choices;
    pendingRouteForecasts = Object.create(null);
    for (const route of choices) pendingRouteForecasts[route.id] = routeForecast(route);
    UI.routeChoices.innerHTML = '';
    UI.routeSubtitle.textContent = `SECTOR ${String(pendingRouteWave).padStart(2,'0')} · 감지된 기본 이상 현상: ${pendingRouteBaseModifier?.name || '기본 규칙'} · 최종 수치는 이미 확정되었습니다.`;
    UI.routeRunSummary.innerHTML = `${routeBuildSummary()}<br><b>예측 신뢰도</b> 100% · 선택 뒤 숨겨진 추가 변형 없음`;
    choices.forEach((route,index) => {
      const forecast = pendingRouteForecasts[route.id];
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'route-card'; button.style.setProperty('--route-color',route.color);
      button.dataset.route = route.id; button.dataset.grade = forecast.grade;
      button.setAttribute('aria-label',`${route.name}, 경로 ${route.risk}, 최종 위험 ${forecast.grade}, 기본 이상 현상 ${forecast.base.name}. ${routeForecastSummary(forecast,8)}. ${route.reward}`);
      const anomalyText = route.forceStable && pendingRouteBaseModifier?.id !== 'stable' ? `${pendingRouteBaseModifier.name} 제거` : forecast.base.name;
      const meter = clamp(forecast.score / 1.35, 0.08, 1);
      button.innerHTML = `
        <div class="route-card-icon">${uiIcon(routeIconMap[route.id] || 'route')}</div>
        <div class="route-card-main">
          <div class="route-card-copy">
            <div class="route-card-top"><span class="route-choice-key">${index+1}</span><span class="route-risk">${escapeHtml(route.risk)}</span><span class="route-final-grade" data-grade="${forecast.grade}">최종 ${forecast.grade}</span></div>
            <h3>${escapeHtml(route.name)}</h3><div class="route-tagline">${escapeHtml(route.tagline)}</div>
          </div>
          <div class="route-card-meter" style="--route-meter:${meter.toFixed(3)}" aria-label="위험 계수 ${Math.round(meter * 100)}%"><i></i></div>
        </div>
        <div class="route-effects route-card-facts">
          <div class="route-effect anomaly"><span>기본 이상 현상</span><b>${escapeHtml(anomalyText)}</b></div>
          <div class="route-effect reward"><span>즉시·완료 보상</span><b>${escapeHtml(route.reward.replace('보상 · ',''))}</b></div>
          <div class="route-effect forecast"><span>핵심 변화 · 확정</span><b>${escapeHtml(routeCardImpactSummary(forecast))}</b></div>
        </div>`;
      button.addEventListener('pointerenter',()=>setRoutePreview(route,index));
      button.addEventListener('focus',()=>setRoutePreview(route,index));
      button.addEventListener('click',()=>selectRoute(route));
      UI.routeChoices.appendChild(button);
    });
    setRoutePreview(choices[0],0);
  }

  function openRouteScreen(nextWaveNumber) {
    if (!player || gameState !== 'playing') return;
    input.cancelEcho('route',false); input.echoRequestQueued = null; pendingRouteWave = nextWaveNumber;
    const boss = nextWaveNumber === 6 || (endlessMode && nextWaveNumber > 6 && (nextWaveNumber-6)%3 === 0);
    pendingRouteBaseModifier = { ...rollBaseWaveModifier(nextWaveNumber,boss) };
    gameState = 'route'; document.body.classList.add('choice-open'); updateTouchControlsVisibility(); audio.setGameState(false);
    renderRouteChoices(createRouteChoices(nextWaveNumber)); showScreen(UI.route);
    window.setTimeout(()=>UI.routeChoices.firstElementChild?.focus({preventScroll:true}),70);
  }

  function selectRoute(route) {
    if (gameState !== 'route' || !route || !player) return;
    const forecast = pendingRouteForecasts[route.id] || routeForecast(route);
    route.onSelect?.(player); routeHistory.push(route.id); currentRoute = route; audio.routeSelect(route.risk);
    const nextWave = pendingRouteWave; const lockedBase = { ...forecast.base };
    pendingRouteWave = 0; pendingRouteChoices = []; pendingRouteBaseModifier = null; pendingRouteForecasts = Object.create(null);
    showScreen(null); document.body.classList.remove('choice-open'); gameState='playing'; updateTouchControlsVisibility(); audio.setGameState(true);
    startWave(nextWave,route,lockedBase);
    showToast(`${route.name} · 최종 위험 ${forecast.grade} · ${forecast.base.name}`,3000);
  }

  function stabilizeBetweenWaves() {
    if (!player) return;
    const clearedBullets = arrays.enemyBullets.length;
    while (arrays.enemyBullets.length) recycleEnemyBullet(arrays.enemyBullets.length - 1);
    arrays.lasers.length = 0;
    const particleCap = quality === 0 ? 60 : quality === 1 ? 120 : 190;
    while (arrays.particles.length > particleCap) {
      const particle = swapRemove(arrays.particles, arrays.particles.length - 1);
      if (particle) particlePool.push(particle);
    }
    if (clearedBullets > 0) createShockwave(player.x, player.y, '#79f2db', Math.min(320, 120 + clearedBullets * 0.45), 0.55, 3);
  }

  function pickWaveModifier(number, boss, route = null, baseOverride = null) {
    const base = route?.forceStable ? waveModifiers[0] : (baseOverride || rollBaseWaveModifier(number,boss));
    return combineWaveModifier(base,route);
  }

  function createPlayer() {
    const p = {
      x: WORLD.w / 2,
      y: WORLD.h / 2,
      vx: 0,
      vy: 0,
      radius: 17,
      angle: -Math.PI / 2,
      speed: 310,
      hp: 80,
      maxHp: 80,
      shield: 12,
      maxShield: 12,
      shieldRegen: 2.4,
      shieldDelay: 0,
      regen: 0,
      invuln: 0,
      hitInvuln: 0,
      fireRate: 5.1,
      fireTimer: 0,
      bulletSpeed: 760,
      bulletLife: 1.45,
      damage: 16,
      bulletSize: 4.1,
      projectiles: 1,
      spread: 0.11,
      pierce: 0,
      pierceRetention: 0.82,
      ricochet: 0,
      ricochetRetention: 0.58,
      homing: 0,
      critChance: 0.055,
      critMultiplier: 1.75,
      splashRadius: 0,
      splashRatio: 0.22,
      chainChance: 0,
      chainDamageRatio: 0.34,
      chainJumps: 1,
      burnChance: 0,
      burnRatio: 0,
      freezeChance: 0,
      freezeSlow: 0,
      executeThreshold: 0,
      dashCooldownMax: 2.55,
      dashCooldown: 0,
      dashTimer: 0,
      dashDuration: 0.16,
      dashSpeed: 900,
      dashDirection: { x: 1, y: 0 },
      dashBlast: 0,
      dashBlastRatio: 0,
      dashBlastRadius: 105,
      dashTrailRatio: 0,
      dashTrailTimer: 0,
      dashPurgeRadius: 0,
      dashShield: 0,
      kineticDamage: 0,
      echoCooldownMax: 9.5,
      echoCooldown: 3.2,
      echoRecordSeconds: 3.05,
      echoDamage: 0.48,
      maxEchoes: 1,
      echoShield: 0,
      echoNova: 0,
      echoNovaRadius: 125,
      echoCritChance: 0,
      echoProjectileBonus: 0,
      echoDashRefund: 0,
      echoHeal: 0,
      markDuration: 0,
      markBonus: 0,
      onKillEchoReduction: 0,
      history: [],
      magnet: 135,
      xpGain: 1,
      xpHeal: 0,
      xpHealProgress: 0,
      enemyBulletSlow: 1,
      extraLife: 0,
      defianceCharges: saveData.meta.defiance || 0,
      damageReduction: 0,
      lowHealthReduction: 0,
      lowHealthPower: 0,
      hurtNovaRatio: 0,
      hurtNovaCooldown: 0,
      shieldBreakRatio: 0,
      shieldBreakCooldown: 0,
      killHealChance: 0,
      killHeal: 0,
      killShieldChance: 0,
      killShield: 0,
      level: 1,
      xp: 0,
      xpNext: 42,
      upgradeLevels: {},
      familyRanks: { ballistic: 0, temporal: 0, mobility: 0, survival: 0, anomaly: 0, utility: 0 },
      upgradesChosen: 0,
      upgradeScreens: 0,
      choiceCount: 4 + Math.floor((saveData.meta.arsenal || 0) / 2),
      rerolls: 1 + (saveData.meta.reroll || 0),
      luck: saveData.meta.luck || 0,
      coreGain: (saveData.meta.salvage || 0) * 0.08,
      nextDraftGuarantee: null,
      nextDraftChoiceBonus: 0,
      routeDamageMult: 1,
      routeFireRateMult: 1,
      routeMoveMult: 1,
      routeEchoMult: 1,
      shotThisStep: false,
      dashedThisStep: false,
      droneCount: 0,
      droneTimer: 0,
      droneDamage: 0.5,
      droneFireRate: 1,
      overdriveFlash: 0,
      eventHorizon: false,
      bulletStorm: false,
      singularity: false,
      echoLegion: false,
      immortalArchive: false,
      solarChoir: false,
      frozenVerdict: false,
      frozenCritChance: 0,
      frozenCritDamage: 0,
      ouroboros: false,
    };

    p.maxHp += (saveData.meta.vitality || 0) * 6;
    p.hp = p.maxHp;
    p.damage *= 1 + (saveData.meta.force || 0) * 0.04;
    p.fireRate *= 1 + (saveData.meta.cadence || 0) * 0.035;
    p.speed *= 1 + (saveData.meta.reflex || 0) * 0.02;
    p.dashCooldownMax *= 1 - Math.min(0.3, (saveData.meta.reflex || 0) * 0.03);
    p.maxShield += (saveData.meta.barrier || 0) * 5;
    p.shield = p.maxShield;
    p.shieldRegen += (saveData.meta.barrier || 0) * 0.18;
    p.echoDamage += (saveData.meta.resonance || 0) * 0.05;
    p.echoCooldownMax *= 1 - Math.min(0.3, (saveData.meta.resonance || 0) * 0.02);
    p.xpGain += (saveData.meta.memory || 0) * 0.04;
    return p;
  }

  function startGame(options = {}) {
    const forceTutorial = Boolean(options && options.training === true);
    const tutorialMode = options?.advancedTraining ? 'advanced' : options?.fullTraining ? 'full' : 'basic';
    const wantsTutorial = forceTutorial || !saveData.tutorialSeen;
    clearWorld();
    runSeed = Date.now() ^ Math.floor(Math.random() * 0xFFFFFF);
    player = createPlayer();
    gameTime = 0;
    score = 0;
    kills = 0;
    runCores = 0;
    bossesKilled = 0;
    elitesKilled = 0;
    lastCorePayout = 0;
    runSettled = false;
    runHistoryRecorded = false;
    endlessMode = false;
    pendingLevelUps = 0;
    currentUpgradeChoices = [];
    runEconomyStats = createRunEconomyStats();
    activeDraftGuarantee = null;
    activeDraftChoiceBonus = 0;
    currentRoute = null;
    routeHistory = [];
    pendingRouteChoices = [];
    pendingRouteWave = 0;
    pendingRouteBaseModifier = null;
    pendingRouteForecasts = Object.create(null);
    echoActivations = 0;
    echoDamageTotal = 0;
    echoKillsTotal = 0;
    echoBestDamage = 0;
    runDamageTotal = 0;
    phaseRiftProcs = 0;
    phaseRiftBonusDamage = 0;
    echoReports = [];
    deferredEchoReports = [];
    lastEchoReport = null;
    clearTimeout(echoReportTimer);
    echoReportTimer = null;
    tutorial = null;
    currentWave = null;
    UI.echoReport?.classList.add('hidden');
    UI.tutorialCoach?.classList.add('hidden');
    UI.replayVerified?.classList.add('hidden');
    UI.syncSuccess?.classList.add('hidden');
    quality = configuredQualityTier();
    document.body.dataset.quality = String(quality);
    resetQualitySampling();
    resizeCanvas();
    camera.x = player.x;
    camera.y = player.y;
    camera.shake = 0;
    input.reset();
    gameState = 'playing';
    document.body.classList.add('game-running');
    document.body.classList.remove('choice-open');
    saveData.runs++;
    saveJSON(SAVE_KEY, saveData);
    showScreen(null);
    UI.hud.classList.remove('hidden');
    UI.abilityHud.classList.remove('hidden');
    UI.bossHud.classList.add('hidden');
    updateTouchControlsVisibility();
    audio.init().then(() => {
      audio.setGameState(true);
      audio.applyVolume();
    });
    requestWakeLock();
    startWave(1, null);
    if (wantsTutorial) {
      // Enter training in the same task as wave creation. No normal spawn can
      // race the tutorial setup, even on a heavily delayed first frame.
      startEchoTutorial(tutorialMode);
    } else if (Object.values(saveData.meta).some((level) => level > 0)) {
      window.setTimeout(() => gameState === 'playing' && showToast('영구 기억이 적용되었습니다 · 이전 실패가 출발선을 밀어 올립니다', 2600), 1100);
    } else {
      window.setTimeout(() => gameState === 'playing' && showToast(echoQuickHint(), 2900), 900);
    }
  }

  function startWave(number, route = null, baseOverride = null) {
    const info = waveInfo(number);
    const boss = number === 6 || (endlessMode && number > 6 && (number - 6) % 3 === 0);
    currentRoute = route || null;
    applyRoutePlayerModifiers(currentRoute);
    const modifier = pickWaveModifier(number,boss,currentRoute,baseOverride);
    const rawCount = number <= 5 ? 11 + number * 6 : 22 + number * 4;
    const baseCount = Math.round(rawCount * modifier.count * (endlessMode ? 1 + Math.max(0, number - 6) * 0.055 : 1));
    currentWave = {
      number,
      name: info.name,
      subtitle: info.subtitle,
      modifier,
      route: currentRoute,
      isBoss: boss,
      spawnRemaining: boss ? 0 : baseCount,
      spawnTimer: boss ? 1.35 : 0.92,
      spawnInterval: Math.max(0.14, 0.59 - number * 0.044) * modifier.spawn,
      bossSpawned: false,
      clearTimer: 0,
      completed: false,
      phaseAnnounced: 0,
      elapsed: 0,
      threat: 1,
      introActive: false,
      introDuration: boss ? BOSS_INTRO_DURATION : 0,
      introRemaining: 0,
      introElapsed: 0,
      introFinished: !boss,
      bossId: null,
      combatLive: !boss,
      materializeRemaining: 0,
      combatStartedAt: boss ? null : gameTime,
    };
    UI.waveLabel.textContent = `SECTOR ${String(number).padStart(2, '0')}`;
    UI.waveName.textContent = info.name;
    UI.waveModifier.textContent = modifier.name;
    UI.routeText.textContent = `경로 · ${currentRoute?.name || '기본 진입'}`;
    if (UI.pauseRoute) UI.pauseRoute.textContent = `현재 경로 · ${currentRoute?.name || '기본 진입'} · ${currentRoute ? '이 구역 종료 시 효과 해제' : '추가 경로 효과 없음'}`;
    const bannerRule = currentRoute ? `${currentRoute.name} · ${modifier.name}` : modifier.name;
    if (boss) beginBossIntro(info, modifier, bannerRule);
    else {
      showWaveBanner(`SECTOR ${String(number).padStart(2, '0')} · ${bannerRule}`, info.name, modifier.subtitle);
      audio.waveStart(number, false);
    }
  }

  function updateWave(dt) {
    if (!currentWave || gameState !== 'playing' || tutorial?.active) return;

    if (currentWave.isBoss) {
      if (bossCutsceneActive()) return;
      if (!currentWave.bossSpawned) {
        // Defensive fallback for restored or externally manipulated states.
        beginBossIntro(waveInfo(currentWave.number), currentWave.modifier, currentWave.modifier?.name || '보스 규칙');
        return;
      }
    }

    currentWave.elapsed += dt;
    const endlessDepth = Math.max(0, currentWave.number - 6);
    currentWave.threat = 1 + (currentWave.number - 1) * 0.17 + Math.max(0, currentWave.elapsed - 22) * 0.008 + endlessDepth * 0.09;

    if (!currentWave.isBoss && currentWave.spawnRemaining > 0) {
      currentWave.spawnTimer -= dt;
      if (currentWave.spawnTimer <= 0) {
        const pressure = clamp(currentWave.threat - 1, 0, 1.5);
        const burstChance = 0.1 + currentWave.number * 0.055 + pressure * 0.08;
        const burst = chance(burstChance) ? (currentWave.number >= 4 && chance(0.28) ? 3 : 2) : 1;
        for (let i = 0; i < burst && currentWave.spawnRemaining > 0; i++) {
          spawnEnemy(selectEnemyType(currentWave.number));
          currentWave.spawnRemaining--;
        }
        currentWave.spawnTimer = currentWave.spawnInterval * rand(0.68, 1.15) / Math.min(1.45, 1 + pressure * 0.14);
      }
    }

    const aliveNonSummoned = arrays.enemies.some((enemy) => !enemy.dead && !enemy.summoned);
    const noSpawns = currentWave.isBoss ? currentWave.bossSpawned : currentWave.spawnRemaining <= 0;
    const bossAlive = arrays.enemies.some((enemy) => !enemy.dead && enemy.type === 'boss');
    const clearCondition = currentWave.isBoss ? (currentWave.bossSpawned && !bossAlive) : (noSpawns && !aliveNonSummoned);

    if (clearCondition && !currentWave.completed) {
      currentWave.clearTimer += dt;
      if (currentWave.clearTimer > 1.45) {
        currentWave.completed = true;
        const completedNumber = currentWave.number;
        const wasBoss = currentWave.isBoss;
        runCores += wasBoss ? 0 : Math.max(1, Math.floor(completedNumber / 2));
        score += 440 * completedNumber;
        player.hp = Math.min(player.maxHp, player.hp + 3 + completedNumber * 0.35);
        player.shield = Math.min(player.maxShield, player.shield + 7 + completedNumber * 0.5);
        stabilizeBetweenWaves();
        flushDeferredEchoReports();
        if (wasBoss && completedNumber === 6 && !endlessMode) {
          showVictory();
          return;
        }
        const nextWave = completedNumber + 1;
        if (shouldOfferRoute(completedNumber, wasBoss)) openRouteScreen(nextWave);
        else startWave(nextWave, null);
      }
    } else if (!clearCondition) {
      currentWave.clearTimer = 0;
    }
  }

  function selectEnemyType(waveNumber) {
    const roll = Math.random();
    if (waveNumber === 1) return roll < 0.68 ? 'wisp' : roll < 0.9 ? 'shard' : 'gunner';
    if (waveNumber === 2) return roll < 0.42 ? 'wisp' : roll < 0.71 ? 'gunner' : roll < 0.87 ? 'shard' : 'charger';
    if (waveNumber === 3) return roll < 0.25 ? 'wisp' : roll < 0.52 ? 'gunner' : roll < 0.72 ? 'charger' : roll < 0.88 ? 'splitter' : 'orbiter';
    if (waveNumber === 4) return roll < 0.18 ? 'wisp' : roll < 0.4 ? 'gunner' : roll < 0.62 ? 'charger' : roll < 0.82 ? 'orbiter' : 'splitter';
    return roll < 0.13 ? 'wisp' : roll < 0.34 ? 'gunner' : roll < 0.58 ? 'charger' : roll < 0.8 ? 'orbiter' : 'splitter';
  }

  function spawnPointAroundPlayer(minDistance = 390, maxDistance = 680) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const angle = rand(0, TAU);
      const distance = rand(minDistance, maxDistance);
      const x = clamp(player.x + Math.cos(angle) * distance, WORLD.margin + 40, WORLD.w - WORLD.margin - 40);
      const y = clamp(player.y + Math.sin(angle) * distance, WORLD.margin + 40, WORLD.h - WORLD.margin - 40);
      if (Math.hypot(x - player.x, y - player.y) >= minDistance * 0.72) return { x, y };
    }
    return { x: clamp(player.x + minDistance, 100, WORLD.w - 100), y: player.y };
  }

  function applyElite(enemy) {
    const variants = [
      { id: 'frenzied', name: '광폭', color: '#ff6d8e', hp: 1.55, speed: 1.32, damage: 1.24, fire: 0.64 },
      { id: 'bulwark', name: '철벽', color: '#71b8ff', hp: 2.45, speed: 0.84, damage: 1.12, fire: 0.9 },
      { id: 'volatile', name: '폭발성', color: '#ffd166', hp: 1.65, speed: 1.08, damage: 1.18, fire: 0.82 },
      { id: 'replicator', name: '복제', color: '#7ff0ad', hp: 1.82, speed: 1.04, damage: 1.12, fire: 0.84 },
      { id: 'null', name: '공허', color: '#d27cff', hp: 1.95, speed: 1.12, damage: 1.35, fire: 0.72 },
    ];
    const variant = pick(variants);
    enemy.elite = true;
    enemy.eliteType = variant.id;
    enemy.eliteName = variant.name;
    enemy.eliteColor = variant.color;
    enemy.hp *= variant.hp;
    enemy.maxHp = enemy.hp;
    enemy.speed *= variant.speed;
    enemy.damage *= variant.damage;
    enemy.attackMult *= variant.damage;
    enemy.fireCooldownMult *= variant.fire;
    enemy.radius *= variant.id === 'bulwark' ? 1.14 : 1.07;
    enemy.score *= 3.2;
    enemy.xp *= 2.55;
    enemy.coreValue = 1 + Math.floor((currentWave?.number || 1) / 3) + (variant.id === 'null' ? 1 : 0);
  }

  function spawnEnemy(type, x = null, y = null, summoned = false) {
    if (!player) return null;
    const isBoss = type === 'boss';
    const pos = x === null ? spawnPointAroundPlayer(isBoss ? 360 : 370, isBoss ? 500 : 650) : { x, y };
    const sector = currentWave?.number || 1;
    const modifier = currentWave?.modifier || waveModifiers[0];
    const endlessDepth = Math.max(0, sector - 6);
    const healthScale = (1 + Math.pow(Math.max(0, sector - 1), 1.16) * 0.18) * modifier.hp * Math.pow(1.15, endlessDepth);
    const damageScale = (1 + Math.max(0, sector - 1) * 0.105) * modifier.damage * Math.pow(1.075, endlessDepth);
    const speedScale = Math.min(1.48, (1 + Math.max(0, sector - 1) * 0.028) * modifier.speed * Math.pow(1.018, endlessDepth));
    const enemy = {
      id: nextEntityId++,
      type,
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
      radius: 15,
      hp: 40,
      maxHp: 40,
      speed: 100,
      damage: 10,
      score: 55,
      xp: 9,
      age: rand(0, 10),
      seed: rand(0, TAU),
      angle: 0,
      shootTimer: rand(0.2, 0.9),
      stateTimer: rand(0.7, 1.35),
      state: 'seek',
      hitFlash: 0,
      spawnTime: isBoss ? 1.1 : 0.48,
      dead: false,
      summoned,
      phase: 1,
      patternTimer: 0,
      summonTimer: 4.2,
      laserTimer: 4,
      spiralAngle: rand(0, TAU),
      contactCooldown: 0,
      attackMult: damageScale,
      bulletSpeedMult: modifier.bulletSpeed * (1 + Math.max(0, sector - 1) * 0.018),
      fireCooldownMult: 1 / (modifier.fireRate * (1 + Math.max(0, sector - 1) * 0.032)),
      xpMult: modifier.xp,
      coreMult: modifier.core,
      burnTime: 0,
      burnDps: 0,
      burnTick: 0,
      burnEchoStat: null,
      burnSources: [],
      slowTimer: 0,
      slowAmount: 0,
      markTime: 0,
      phaseRiftTime: 0,
      phaseRiftCooldown: 0,
      phaseRiftPulse: 0,
      phaseRiftLastPresentHit: -999,
      phaseRiftLastEchoHit: -999,
      phaseRiftLastEchoStat: null,
      phaseRiftSourceStat: null,
      elite: false,
      coreValue: 0,
      enraged: false,
      enrageTimer: 52,
    };

    switch (type) {
      case 'wisp':
        Object.assign(enemy, { radius: 14, hp: 42 * healthScale, maxHp: 42 * healthScale, speed: 134 * speedScale, damage: 13 * damageScale, score: 58, xp: 10 });
        break;
      case 'shard':
        Object.assign(enemy, { radius: 9, hp: 24 * healthScale, maxHp: 24 * healthScale, speed: 190 * speedScale, damage: 9 * damageScale, score: 31, xp: 6, spawnTime: 0.3 });
        break;
      case 'gunner':
        Object.assign(enemy, { radius: 19, hp: 78 * healthScale, maxHp: 78 * healthScale, speed: 89 * speedScale, damage: 15 * damageScale, score: 108, xp: 16, shootTimer: rand(0.35, 0.95) });
        break;
      case 'charger':
        Object.assign(enemy, { radius: 21, hp: 112 * healthScale, maxHp: 112 * healthScale, speed: 82 * speedScale, damage: 22 * damageScale, score: 142, xp: 20, stateTimer: rand(0.85, 1.35) });
        break;
      case 'splitter':
        Object.assign(enemy, { radius: 28, hp: 172 * healthScale, maxHp: 172 * healthScale, speed: 58 * speedScale, damage: 19 * damageScale, score: 196, xp: 27 });
        break;
      case 'orbiter':
        Object.assign(enemy, { radius: 18, hp: 94 * healthScale, maxHp: 94 * healthScale, speed: 105 * speedScale, damage: 14 * damageScale, score: 154, xp: 22, shootTimer: rand(0.35, 1) });
        break;
      case 'boss': {
        const bossDepth = endlessMode ? Math.max(0, Math.floor((sector - 6) / 3)) : 0;
        const bossScale = Math.pow(1.58, bossDepth);
        Object.assign(enemy, {
          radius: 74,
          hp: 5900 * bossScale * modifier.hp,
          maxHp: 5900 * bossScale * modifier.hp,
          speed: 78 * speedScale,
          damage: 30 * damageScale,
          score: 7800 * (1 + bossDepth),
          xp: 420 * (1 + bossDepth * 0.35),
          spawnTime: 1.45,
          shootTimer: 1,
          patternTimer: 1.8,
          summonTimer: 4.8,
          laserTimer: 4.4,
          coreValue: 18 + bossDepth * 8,
          enrageTimer: Math.max(34, 52 - bossDepth * 4),
        });
        break;
      }
    }

    enemy.xp *= modifier.xp;
    if (!isBoss && !summoned && type !== 'shard') {
      const eliteChance = clamp(0.035 + sector * 0.018 + modifier.eliteChance + (player.luck || 0) * 0.0015, 0, 0.34);
      if (chance(eliteChance)) applyElite(enemy);
    }
    enemy.hp = Math.round(enemy.hp);
    enemy.maxHp = enemy.hp;
    arrays.enemies.push(enemy);
    createShockwave(enemy.x, enemy.y, isBoss ? '#ff63d3' : enemy.elite ? enemy.eliteColor : '#735cff', isBoss ? 230 : enemy.elite ? 92 : 58, isBoss ? 1.1 : 0.48, isBoss ? 4 : 2);
    return enemy;
  }


  // ---------------------------------------------------------------------------
  // Effects, pooled projectiles, pickups
  // ---------------------------------------------------------------------------
  function maxParticles() {
    if (settings.reducedMotion || quality === 0) return 100;
    return quality === 2 ? 420 : 230;
  }

  function spawnParticle(x, y, options = {}) {
    if (arrays.particles.length >= maxParticles()) return;
    const p = particlePool.pop() || {};
    const angle = options.angle ?? rand(0, TAU);
    const speed = options.speed ?? rand(20, 120);
    p.x = x;
    p.y = y;
    p.vx = options.vx ?? Math.cos(angle) * speed;
    p.vy = options.vy ?? Math.sin(angle) * speed;
    p.life = options.life ?? rand(0.18, 0.55);
    p.maxLife = p.life;
    p.size = options.size ?? rand(1, 4);
    p.endSize = options.endSize ?? 0;
    p.color = options.color || '#72e8ff';
    p.alpha = options.alpha ?? 1;
    p.drag = options.drag ?? 4;
    p.gravity = options.gravity ?? 0;
    p.glow = options.glow ?? 10;
    p.shape = options.shape || 'circle';
    p.rotation = options.rotation ?? rand(0, TAU);
    p.spin = options.spin ?? rand(-5, 5);
    arrays.particles.push(p);
  }

  function burstParticles(x, y, color, count = 14, minSpeed = 40, maxSpeed = 190, minSize = 1, maxSize = 5) {
    const pressure = arrays.enemyBullets.length + arrays.playerBullets.length + arrays.particles.length;
    const pressureScale = pressure > 760 ? 0.35 : pressure > 520 ? 0.55 : 1;
    const qualityScale = settings.reducedMotion || quality === 0 ? 0.28 : quality === 1 ? 0.62 : 1;
    const scaledCount = Math.max(1, Math.ceil(count * pressureScale * qualityScale));
    for (let i = 0; i < scaledCount; i++) {
      const angle = rand(0, TAU);
      spawnParticle(x, y, {
        angle,
        speed: rand(minSpeed, maxSpeed),
        life: rand(0.25, 0.75),
        size: rand(minSize, maxSize),
        color,
        drag: rand(2, 6),
        glow: quality === 2 ? rand(5, 13) : 0,
        shape: chance(quality === 2 ? 0.2 : 0.1) ? 'line' : 'circle',
      });
    }
  }

  function createShockwave(x, y, color = '#5ce8ff', radius = 100, life = 0.45, width = 2) {
    arrays.shockwaves.push({ x, y, color, radius: 0, maxRadius: radius, life, maxLife: life, width });
  }

  function createFloater(x, y, text, color = '#ffffff', size = 12) {
    const important = size >= 14 || /CORE|⬡|치명/i.test(String(text));
    if (settings.damageNumbers === 'minimal' && !important) return;
    if (settings.damageNumbers === 'reduced' && !important && Math.random() > 0.34) return;
    const cap = settings.damageNumbers === 'minimal' ? 24 : settings.damageNumbers === 'reduced' ? 42 : 86;
    if ((settings.reducedMotion && arrays.floaters.length > 20) || arrays.floaters.length >= cap) return;
    arrays.floaters.push({ x, y, text, color, size, life: 0.75, maxLife: 0.75, vy: -42 });
  }

  function createLink(x1, y1, x2, y2, color = '#8eefff') {
    arrays.links.push({ x1, y1, x2, y2, color, life: 0.16, maxLife: 0.16, seed: Math.random() * 100 });
  }

  function spawnPlayerBullet(x, y, angle, damage, options = {}) {
    if (arrays.playerBullets.length >= MAX_PLAYER_BULLETS) return null;
    const b = bulletPool.pop() || {};
    const speed = options.speed || player.bulletSpeed;
    b.id = nextEntityId++;
    b.x = x;
    b.y = y;
    b.prevX = x;
    b.prevY = y;
    b.vx = Math.cos(angle) * speed;
    b.vy = Math.sin(angle) * speed;
    b.angle = angle;
    b.radius = options.radius || player.bulletSize;
    b.damage = damage;
    b.life = options.life || player.bulletLife;
    b.pierceLeft = options.pierce ?? player.pierce;
    b.ricochetLeft = options.ricochet ?? player.ricochet;
    b.homing = options.homing ?? player.homing;
    b.fromEcho = options.fromEcho || false;
    b.fromDrone = options.fromDrone || false;
    b.echoStat = options.echoStat || null;
    b.crit = options.crit || false;
    if (!b.hitIds) b.hitIds = []; else b.hitIds.length = 0;
    b.homingTargetId = 0;
    b.retargetTimer = rand(0, 0.09);
    b.color = options.color || (b.fromEcho ? '#b97aff' : b.fromDrone ? '#ffd166' : '#69ecff');
    arrays.playerBullets.push(b);
    return b;
  }

  function recyclePlayerBullet(index) {
    const b = swapRemove(arrays.playerBullets, index);
    if (b) {
      b.hitIds.length = 0;
      b.homingTargetId = 0;
      b.echoStat = null;
      bulletPool.push(b);
    }
  }

  function spawnEnemyBullet(x, y, angle, speed = 260, damage = 10, radius = 5, color = '#ff5e91', options = {}) {
    if (arrays.enemyBullets.length >= MAX_ENEMY_BULLETS) return null;
    const b = enemyBulletPool.pop() || {};
    b.x = x;
    b.y = y;
    b.prevX = x;
    b.prevY = y;
    b.vx = Math.cos(angle) * speed;
    b.vy = Math.sin(angle) * speed;
    b.angle = angle;
    b.speed = speed;
    b.damage = damage;
    b.radius = radius;
    b.color = color;
    b.life = options.life || 7;
    b.wave = options.wave || 0;
    b.age = 0;
    b.turnRate = options.turnRate || 0;
    b.targetAngle = options.targetAngle || angle;
    arrays.enemyBullets.push(b);
    return b;
  }

  function recycleEnemyBullet(index) {
    const b = swapRemove(arrays.enemyBullets, index);
    if (b) enemyBulletPool.push(b);
  }

  function spawnPickup(x, y, value) {
    const p = pickupPool.pop() || {};
    const angle = rand(0, TAU);
    const speed = rand(35, 120);
    p.x = x;
    p.y = y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.value = value;
    p.radius = 6 + Math.min(5, value * 0.08);
    p.life = 24;
    p.age = rand(0, TAU);
    arrays.pickups.push(p);
  }

  function recyclePickup(index) {
    const p = swapRemove(arrays.pickups, index);
    if (p) pickupPool.push(p);
  }

  function gainXP(amount) {
    if (!player) return;
    const gained = amount * player.xpGain;
    player.xp += gained;
    if (player.xpHeal > 0) {
      player.xpHealProgress += gained;
      while (player.xpHealProgress >= 25) {
        player.xpHealProgress -= 25;
        player.hp = Math.min(player.maxHp, player.hp + player.xpHeal);
      }
    }
    let leveledUp = false;
    while (player.xp >= player.xpNext) {
      player.xp -= player.xpNext;
      player.xpNext = Math.round(player.xpNext * 1.21 + 9);
      pendingLevelUps++;
      leveledUp = true;
    }
    if (leveledUp) audio.levelUp();
  }

  function cameraTrauma(amount) {
    if (!settings.shake || settings.reducedMotion) return;
    camera.shake = clamp(camera.shake + amount, 0, 1);
  }

  // ---------------------------------------------------------------------------
  // Player & echo mechanics
  // ---------------------------------------------------------------------------
  function updatePlayer(dt) {
    if (!player) return;
    player.shotThisStep = false;
    player.dashedThisStep = false;
    player.fireTimer = Math.max(0, player.fireTimer - dt);
    player.dashCooldown = Math.max(0, player.dashCooldown - dt);
    player.echoCooldown = Math.max(0, player.echoCooldown - dt);
    player.invuln = Math.max(0, player.invuln - dt);
    player.shieldDelay = Math.max(0, player.shieldDelay - dt);
    player.overdriveFlash = Math.max(0, player.overdriveFlash - dt);
    player.hurtNovaCooldown = Math.max(0, player.hurtNovaCooldown - dt);
    player.shieldBreakCooldown = Math.max(0, player.shieldBreakCooldown - dt);
    player.dashTrailTimer = Math.max(0, player.dashTrailTimer - dt);

    if (player.regen > 0 && player.hp > 0 && player.hp < player.maxHp) {
      player.hp = Math.min(player.maxHp, player.hp + player.regen * dt);
    }
    if (player.shieldDelay <= 0 && player.shield < player.maxShield) {
      player.shield = Math.min(player.maxShield, player.shield + player.shieldRegen * dt);
    }

    const move = input.getMove();
    const aim = input.getAim();
    if (aim.active) player.angle = Math.atan2(aim.y, aim.x);

    if (input.consumeDash() && player.dashCooldown <= 0) {
      const direction = move.mag > 0.15 ? normalize(move.x, move.y) : aim;
      startDash(direction.x, direction.y);
    }
    const echoRequest = input.consumeEcho();
    if (echoRequest && player.echoCooldown <= 0) activateEcho(echoRequest.samples);

    if (player.dashTimer > 0) {
      player.dashTimer -= dt;
      player.vx = player.dashDirection.x * player.dashSpeed;
      player.vy = player.dashDirection.y * player.dashSpeed;
      if (!settings.reducedMotion && chance(0.9)) {
        spawnParticle(player.x - player.dashDirection.x * 8, player.y - player.dashDirection.y * 8, {
          vx: -player.dashDirection.x * rand(40, 160) + rand(-35, 35),
          vy: -player.dashDirection.y * rand(40, 160) + rand(-35, 35),
          life: rand(0.18, 0.38), size: rand(2, 5), color: '#5ce8ff', drag: 2, glow: 15,
        });
      }
      if (player.dashTrailRatio > 0 && player.dashTrailTimer <= 0) {
        player.dashTrailTimer = 0.045;
        damageEnemiesInRadius(player.x, player.y, 54, player.damage * player.dashTrailRatio, null, '#69eaff');
      }
    } else {
      const routeMove = player.routeMoveMult || 1;
      const targetVx = move.x * player.speed * routeMove;
      const targetVy = move.y * player.speed * routeMove;
      player.vx = expLerp(player.vx, targetVx, move.mag > 0.05 ? 15 : 10, dt);
      player.vy = expLerp(player.vy, targetVy, move.mag > 0.05 ? 15 : 10, dt);
    }

    player.x += player.vx * dt;
    player.y += player.vy * dt;
    const minX = WORLD.margin + player.radius;
    const maxX = WORLD.w - WORLD.margin - player.radius;
    const minY = WORLD.margin + player.radius;
    const maxY = WORLD.h - WORLD.margin - player.radius;
    if (player.x < minX || player.x > maxX) player.vx *= -0.18;
    if (player.y < minY || player.y > maxY) player.vy *= -0.18;
    player.x = clamp(player.x, minX, maxX);
    player.y = clamp(player.y, minY, maxY);

    const firing = input.isFiring(aim.active);
    if (firing && player.fireTimer <= 0) {
      firePlayerWeapon(player.x, player.y, player.angle, false);
      const desperation = player.hp / player.maxHp <= 0.35 ? player.lowHealthPower : 0;
      player.fireTimer = 1 / (player.fireRate * (player.routeFireRateMult || 1) * (1 + desperation));
      player.shotThisStep = true;
    }

    updateDrones(dt);
    recordPlayerHistory();
  }

  function startDash(dx, dy) {
    const n = normalize(dx, dy);
    player.dashDirection = n;
    player.dashTimer = player.dashDuration;
    player.dashCooldown = player.dashCooldownMax;
    player.invuln = Math.max(player.invuln, player.dashDuration + 0.1);
    player.dashedThisStep = true;
    createShockwave(player.x, player.y, '#6aeaff', 105, 0.34, 3);
    burstParticles(player.x, player.y, '#63eaff', 15, 60, 240, 1, 4);
    if (player.dashShield > 0) player.shield = Math.min(player.maxShield, player.shield + player.dashShield);
    if (player.dashPurgeRadius > 0) {
      for (let i = arrays.enemyBullets.length - 1; i >= 0; i--) {
        const bullet = arrays.enemyBullets[i];
        if (sqr(bullet.x - player.x) + sqr(bullet.y - player.y) <= sqr(player.dashPurgeRadius)) {
          if (!settings.reducedMotion && chance(0.35)) burstParticles(bullet.x, bullet.y, '#83f4ff', 3, 10, 70, 1, 2.5);
          recycleEnemyBullet(i);
        }
      }
    }
    const blastRatio = player.dashBlastRatio + (player.dashBlast > 0 ? player.dashBlast / Math.max(1, player.damage) : 0);
    if (blastRatio > 0) {
      if (player.eventHorizon) {
        for (const enemy of arrays.enemies) {
          if (enemy.dead || enemy.spawnTime > 0 || enemy.type === 'boss') continue;
          const dxEnemy = player.x - enemy.x;
          const dyEnemy = player.y - enemy.y;
          const d = Math.hypot(dxEnemy, dyEnemy) || 1;
          if (d < player.dashBlastRadius * 1.25) {
            enemy.vx += dxEnemy / d * 240;
            enemy.vy += dyEnemy / d * 240;
          }
        }
      }
      damageEnemiesInRadius(player.x, player.y, player.dashBlastRadius, player.damage * blastRatio, null, '#6aeaff');
      createShockwave(player.x, player.y, player.eventHorizon ? '#d27cff' : '#6aeaff', player.dashBlastRadius, 0.46, 3);
    }
    audio.dash();
    cameraTrauma(0.16);
    input.rumble(0.25, 70);
  }

  function firePlayerWeapon(x, y, baseAngle, echo = false, drone = false, echoStat = null) {
    const count = drone ? 1 : player.projectiles + (echo ? player.echoProjectileBonus : 0);
    const movementRatio = clamp(Math.hypot(player.vx, player.vy) / Math.max(1, player.speed), 0, 1);
    const spreadScale = player.bulletStorm ? 1 - movementRatio * 0.35 : 1;
    const totalSpread = count <= 1 ? 0 : player.spread * spreadScale * (count - 1);
    const lowHealthBonus = player.hp / player.maxHp <= 0.35 ? player.lowHealthPower : 0;
    const kineticBonus = player.kineticDamage * movementRatio;
    const routeDamage = player.routeDamageMult || 1;
    const sourceScale = echo ? player.echoDamage * (player.routeEchoMult || 1) : drone ? player.droneDamage : routeDamage;
    const damageScale = sourceScale * (1 + lowHealthBonus + kineticBonus);
    for (let i = 0; i < count; i++) {
      const offset = count <= 1 ? 0 : -totalSpread / 2 + (totalSpread * i / (count - 1));
      const angle = baseAngle + offset;
      const critChance = echo ? player.echoCritChance : drone ? 0 : player.critChance;
      const isCrit = chance(critChance);
      const damage = player.damage * damageScale * (isCrit ? player.critMultiplier : 1);
      const muzzleX = x + Math.cos(angle) * (drone ? 8 : 21);
      const muzzleY = y + Math.sin(angle) * (drone ? 8 : 21);
      const bullet = spawnPlayerBullet(muzzleX, muzzleY, angle, damage, {
        fromEcho: echo,
        fromDrone: drone,
        echoStat,
        crit: isCrit,
        radius: drone ? 3.5 : player.bulletSize * (isCrit ? 1.32 : 1),
        speed: drone ? player.bulletSpeed * 0.88 : player.bulletSpeed,
        life: drone ? 1.2 : player.bulletLife,
        pierce: drone ? 0 : player.pierce,
        ricochet: drone ? 0 : player.ricochet,
        homing: drone ? player.homing * 0.45 : player.homing,
      });
      if (bullet && echoStat) echoStat.shots++;
    }
    const color = echo ? '#ba79ff' : drone ? '#ffd166' : '#63eaff';
    for (let i = 0; i < (settings.reducedMotion ? 1 : 3); i++) {
      spawnParticle(x + Math.cos(baseAngle) * 18, y + Math.sin(baseAngle) * 18, {
        angle: baseAngle + rand(-0.34, 0.34), speed: rand(50, 150), life: rand(0.08, 0.18), size: rand(1, 3), color, drag: 8, glow: 12,
      });
    }
    audio.shoot(x, echo);
  }

  function recordPlayerHistory() {
    player.history.push({
      x: player.x,
      y: player.y,
      angle: player.angle,
      fire: player.shotThisStep,
      dash: player.dashedThisStep || player.dashTimer > 0,
    });
    const maxFrames = Math.ceil(player.echoRecordSeconds / FIXED_DT) + 20;
    if (player.history.length > maxFrames) player.history.splice(0, player.history.length - maxFrames);
  }

  function activateEcho(snapshotSamples = null) {
    const recordFrames = Math.ceil(player.echoRecordSeconds / FIXED_DT);
    const source = Array.isArray(snapshotSamples) ? snapshotSamples : player.history.slice(-recordFrames);
    if (source.length < Math.min(45, recordFrames)) {
      showToast('아직 재현할 과거가 충분하지 않습니다', 1300);
      return;
    }
    // LOCKSTEP contract: the exact samples captured on button-down are the
    // samples previewed and deployed. Never read the live ring buffer here
    // when an input snapshot was supplied.
    const samples = source.slice(-recordFrames).map((sample) => ({ ...sample }));
    const buffer = analyzeEchoBuffer(samples);
    const echoId = nextEntityId++;
    const stat = {
      id: echoId,
      damage: 0,
      dotDamage: 0,
      phaseRifts: 0,
      phaseRiftBonusDamage: 0,
      kills: 0,
      hits: 0,
      shots: 0,
      recordedShots: buffer.shots,
      recordedDashes: buffer.dashEvents,
      recordedDistance: buffer.distance,
      queued: false,
      sampleCount: samples.length,
      snapshotSignature: echoSnapshotSignature(samples),
    };
    const echo = {
      id: echoId,
      stat,
      samples,
      index: 0,
      x: samples[0].x,
      y: samples[0].y,
      angle: samples[0].angle,
      alpha: 0,
      age: 0,
      colorPhase: Math.random() * TAU,
    };
    arrays.echoes.push(echo);
    if (tutorial?.active && tutorial.step === 4 && !tutorial.replayStat) {
      tutorial.replayEchoId = echoId;
      tutorial.replayStat = stat;
      tutorial.replayDeployedAt = gameTime;
      tutorial.replayDeployedSignature = stat.snapshotSignature;
      tutorial.replaySignatureMatch = !tutorial.replayLockedSignature
        || tutorial.replayLockedSignature === 'empty'
        || tutorial.replayLockedSignature === stat.snapshotSignature;
    }
    echoActivations++;
    while (arrays.echoes.length > player.maxEchoes) {
      const removed = arrays.echoes.shift();
      if (removed?.stat) queueEchoReport(removed.stat);
    }
    player.echoCooldown = player.echoCooldownMax;
    player.dashCooldown = Math.max(0, player.dashCooldown - player.echoDashRefund);
    if (player.echoShield > 0) player.shield = Math.min(player.maxShield, player.shield + player.echoShield);
    if (player.echoHeal > 0) player.hp = Math.min(player.maxHp, player.hp + player.echoHeal);
    if (player.echoNova > 0) {
      damageEnemiesInRadius(echo.x, echo.y, player.echoNovaRadius, player.damage * player.echoNova, null, '#c47cff', { fromEcho: true, echoStat: stat });
      damageEnemiesInRadius(player.x, player.y, player.echoNovaRadius, player.damage * player.echoNova * 0.72, null, '#5ce8ff', { fromEcho: true, echoStat: stat });
      createShockwave(echo.x, echo.y, '#c47cff', player.echoNovaRadius, 0.55, 3);
    }
    if (player.echoLegion) {
      for (const existing of arrays.echoes) {
        damageEnemiesInRadius(existing.x, existing.y, 115, player.damage * 1.25, null, '#d889ff', { fromEcho: true, echoStat: existing.stat || stat });
        createShockwave(existing.x, existing.y, '#d889ff', 125, 0.42, 2.5);
      }
    }
    createShockwave(echo.x, echo.y, '#c47cff', 170, 0.68, 3);
    createShockwave(player.x, player.y, '#5ce8ff', 130, 0.5, 2);
    burstParticles(echo.x, echo.y, '#bd78ff', 30, 40, 220, 2, 6);
    audio.echo();
    cameraTrauma(0.24);
    input.rumble(0.42, 130);
    showToast(`시간 잔향 전개 · 사격 ${buffer.shots}회 · 대시 ${buffer.dashEvents} · ${arrays.echoes.length}/${player.maxEchoes}`, 1700);
  }

  function updateEchoes(dt) {
    for (let i = arrays.echoes.length - 1; i >= 0; i--) {
      const echo = arrays.echoes[i];
      echo.age += dt;
      const sample = echo.samples[echo.index];
      if (!sample) {
        // A completed echo must only fade out. In TRACE 6.0 the alpha gain ran
        // before this branch, making the ghost mathematically immortal.
        queueEchoReport(echo.stat);
        echo.alpha = Math.max(0, echo.alpha - dt * 3.4);
        if (echo.alpha <= 0.001) arrays.echoes.splice(i, 1);
        continue;
      }
      echo.alpha = Math.min(0.78, echo.alpha + dt * 3.5);
      echo.x = sample.x;
      echo.y = sample.y;
      echo.angle = sample.angle;
      if (sample.fire) firePlayerWeapon(echo.x, echo.y, echo.angle, true, false, echo.stat);
      if (!settings.reducedMotion && (echo.index % (quality === 2 ? 2 : 4) === 0)) {
        spawnParticle(echo.x, echo.y, { vx: rand(-25, 25), vy: rand(-25, 25), life: 0.28, size: rand(1, 3), color: '#ad72ff', drag: 2, glow: 12, alpha: 0.65 });
      }
      echo.index++;
    }
  }

  function updateDrones(dt) {
    if (player.droneCount <= 0) return;
    player.droneTimer -= dt;
    if (player.droneTimer > 0 || arrays.enemies.length === 0) return;
    player.droneTimer = Math.max(0.2, (0.9 - player.droneCount * 0.07) / player.droneFireRate);
    const valid = arrays.enemies.filter((e) => !e.dead && e.spawnTime <= 0);
    if (!valid.length) return;
    for (let i = 0; i < player.droneCount; i++) {
      const angle = gameTime * 1.35 + i * TAU / player.droneCount;
      const dx = player.x + Math.cos(angle) * 48;
      const dy = player.y + Math.sin(angle) * 48;
      let target = null;
      let best = Infinity;
      for (const enemy of valid) {
        const d = sqr(enemy.x - dx) + sqr(enemy.y - dy);
        if (d < best) { best = d; target = enemy; }
      }
      if (target && best < sqr(650)) firePlayerWeapon(dx, dy, Math.atan2(target.y - dy, target.x - dx), false, true);
    }
  }

  // ---------------------------------------------------------------------------
  // Enemies, boss patterns, hostile projectiles
  // ---------------------------------------------------------------------------
  function moveEnemyToward(enemy, tx, ty, speed, response, dt) {
    const n = normalize(tx - enemy.x, ty - enemy.y);
    enemy.vx = expLerp(enemy.vx, n.x * speed, response, dt);
    enemy.vy = expLerp(enemy.vy, n.y * speed, response, dt);
    enemy.angle = Math.atan2(enemy.vy, enemy.vx);
  }

  function fireEnemyFan(enemy, count, spread, speed, damage, radius = 5, color = '#ff628f') {
    const base = Math.atan2(player.y - enemy.y, player.x - enemy.x);
    const total = count <= 1 ? 0 : spread * (count - 1);
    for (let i = 0; i < count; i++) {
      const offset = count <= 1 ? 0 : -total / 2 + total * i / (count - 1);
      spawnEnemyBullet(enemy.x + Math.cos(base + offset) * enemy.radius * 0.7, enemy.y + Math.sin(base + offset) * enemy.radius * 0.7, base + offset, speed, damage, radius, color);
    }
  }

  function fireRadial(enemy, count, speed, damage, offset = 0, color = '#ff64c7', radius = 5) {
    for (let i = 0; i < count; i++) {
      const angle = offset + i * TAU / count;
      spawnEnemyBullet(enemy.x + Math.cos(angle) * enemy.radius * 0.75, enemy.y + Math.sin(angle) * enemy.radius * 0.75, angle, speed, damage, radius, color);
    }
  }

  function spawnBossLaser(boss, angle) {
    arrays.lasers.push({
      bossId: boss.id,
      angle,
      telegraph: 1.05,
      active: 0.72,
      fade: 0.36,
      width: 25,
      hit: false,
      color: '#ff5ed1',
    });
    createShockwave(boss.x, boss.y, '#ff5ed1', 120, 0.5, 2);
  }

  function refreshBurnSummary(enemy) {
    const sources = Array.isArray(enemy.burnSources) ? enemy.burnSources : [];
    if (!sources.length) {
      enemy.burnTime = 0;
      enemy.burnDps = 0;
      enemy.burnEchoStat = null;
      return null;
    }
    let dominant = sources[0];
    for (let i = 1; i < sources.length; i++) {
      const source = sources[i];
      if (source.dps > dominant.dps + 0.001 || (Math.abs(source.dps - dominant.dps) <= 0.001 && source.appliedAt > dominant.appliedAt)) dominant = source;
    }
    enemy.burnTime = Math.max(...sources.map((source) => source.remaining));
    enemy.burnDps = dominant.dps;
    enemy.burnEchoStat = dominant.fromEcho ? dominant.echoStat : null;
    return dominant;
  }

  function applyBurnSource(enemy, dps, duration = 2.8, options = {}) {
    if (!enemy || enemy.dead || dps <= 0 || duration <= 0) return;
    if (!Array.isArray(enemy.burnSources)) enemy.burnSources = [];
    const echoStat = options.echoStat || null;
    const fromEcho = Boolean(options.fromEcho && echoStat);
    let source = enemy.burnSources.find((entry) => fromEcho ? entry.echoStat === echoStat : !entry.fromEcho);
    if (!source) {
      source = { dps: 0, remaining: 0, fromEcho, echoStat, appliedAt: gameTime };
      enemy.burnSources.push(source);
    }
    source.dps = Math.max(source.dps, dps);
    source.remaining = Math.max(source.remaining, duration);
    source.fromEcho = fromEcho;
    source.echoStat = fromEcho ? echoStat : null;
    source.appliedAt = gameTime;
    // Keep at most the strongest four independent sources. This preserves the
    // previous non-stacking burn balance while preventing stale attribution.
    if (enemy.burnSources.length > 4) {
      enemy.burnSources.sort((a, b) => b.dps - a.dps || b.remaining - a.remaining);
      enemy.burnSources.length = 4;
    }
    enemy.burnTick = Math.min(enemy.burnTick || 0.01, 0.08);
    refreshBurnSummary(enemy);
  }

  function updateBurnSources(enemy, dt) {
    if (!Array.isArray(enemy.burnSources) || !enemy.burnSources.length) {
      // Migrate a legacy single-source burn created by an older QA hook or save.
      if (enemy.burnTime > 0 && enemy.burnDps > 0) {
        applyBurnSource(enemy, enemy.burnDps, enemy.burnTime, { fromEcho: Boolean(enemy.burnEchoStat), echoStat: enemy.burnEchoStat });
      } else return;
    }
    for (let i = enemy.burnSources.length - 1; i >= 0; i--) {
      enemy.burnSources[i].remaining -= dt;
      if (enemy.burnSources[i].remaining <= 0) enemy.burnSources.splice(i, 1);
    }
    const dominant = refreshBurnSummary(enemy);
    if (!dominant) return;
    enemy.burnTick -= dt;
    if (enemy.burnTick > 0) return;
    enemy.burnTick += 0.25;
    damageEnemy(enemy, dominant.dps * 0.25, false, enemy.x, enemy.y, {
      dot: true,
      status: 'burn',
      fromEcho: dominant.fromEcho,
      echoStat: dominant.echoStat,
    });
    if (!settings.reducedMotion && chance(0.5)) spawnParticle(enemy.x + rand(-enemy.radius, enemy.radius), enemy.y + rand(-enemy.radius, enemy.radius), { vx: rand(-18, 18), vy: rand(-65, -25), life: 0.34, size: rand(1.5, 3.5), color: '#ff9b55', drag: 2, glow: 10 });
  }

  function updateEnemies(dt) {
    for (const enemy of arrays.enemies) {
      if (enemy.dead) continue;
      enemy.age += dt;
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
      enemy.contactCooldown = Math.max(0, enemy.contactCooldown - dt);
      enemy.markTime = Math.max(0, (enemy.markTime || 0) - dt);
      enemy.phaseRiftTime = Math.max(0, (enemy.phaseRiftTime || 0) - dt);
      enemy.phaseRiftCooldown = Math.max(0, (enemy.phaseRiftCooldown || 0) - dt);
      enemy.phaseRiftPulse = Math.max(0, (enemy.phaseRiftPulse || 0) - dt);
      if (enemy.phaseRiftTime <= 0) enemy.phaseRiftSourceStat = null;
      enemy.slowTimer = Math.max(0, (enemy.slowTimer || 0) - dt);
      const slowFactor = enemy.slowTimer > 0 ? Math.max(0.28, 1 - (enemy.slowAmount || 0)) : 1;
      const logicDt = dt * slowFactor;

      updateBurnSources(enemy, dt);
      if (enemy.dead) continue;

      if (enemy.spawnTime > 0) {
        enemy.spawnTime -= dt;
        enemy.vx *= Math.exp(-8 * dt);
        enemy.vy *= Math.exp(-8 * dt);
        continue;
      }

      if (enemy.trainingDummy) {
        enemy.vx = 0;
        enemy.vy = 0;
        enemy.angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        continue;
      }

      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const distance = Math.hypot(dx, dy) || 1;
      const ux = dx / distance;
      const uy = dy / distance;

      switch (enemy.type) {
        case 'wisp': {
          const wobble = Math.sin(enemy.age * 2.9 + enemy.seed) * 0.27;
          const c = Math.cos(wobble);
          const sin = Math.sin(wobble);
          const wx = ux * c - uy * sin;
          const wy = ux * sin + uy * c;
          enemy.vx = expLerp(enemy.vx, wx * enemy.speed * slowFactor, 6.1, logicDt);
          enemy.vy = expLerp(enemy.vy, wy * enemy.speed * slowFactor, 6.1, logicDt);
          enemy.angle = Math.atan2(enemy.vy, enemy.vx);
          break;
        }
        case 'shard': {
          const wobble = Math.sin(enemy.age * 7.4 + enemy.seed) * 0.42;
          enemy.vx = expLerp(enemy.vx, (ux * Math.cos(wobble) - uy * Math.sin(wobble)) * enemy.speed * slowFactor, 8.4, logicDt);
          enemy.vy = expLerp(enemy.vy, (ux * Math.sin(wobble) + uy * Math.cos(wobble)) * enemy.speed * slowFactor, 8.4, logicDt);
          enemy.angle = Math.atan2(enemy.vy, enemy.vx);
          break;
        }
        case 'gunner': {
          const radial = distance > 410 ? 1 : distance < 245 ? -1 : 0;
          const tangent = Math.sin(enemy.seed) > 0 ? 1 : -1;
          const desiredX = (ux * radial + -uy * tangent * 0.78) * enemy.speed * slowFactor;
          const desiredY = (uy * radial + ux * tangent * 0.78) * enemy.speed * slowFactor;
          enemy.vx = expLerp(enemy.vx, desiredX, 4.5, logicDt);
          enemy.vy = expLerp(enemy.vy, desiredY, 4.5, logicDt);
          enemy.angle = Math.atan2(dy, dx);
          enemy.shootTimer -= logicDt;
          if (enemy.shootTimer <= 0 && distance < 760) {
            const count = currentWave.number >= 4 ? 4 : currentWave.number >= 2 ? 3 : 2;
            fireEnemyFan(enemy, count, 0.13, (292 + currentWave.number * 7) * enemy.bulletSpeedMult, (10.5 + currentWave.number * 0.65) * enemy.attackMult, 4.8, settings.highContrast ? '#ff315b' : '#ff678e');
            enemy.shootTimer = rand(1.05, 1.48) * enemy.fireCooldownMult;
          }
          break;
        }
        case 'charger': {
          enemy.stateTimer -= logicDt;
          if (enemy.state === 'seek') {
            moveEnemyToward(enemy, player.x, player.y, enemy.speed * slowFactor, 4.8, logicDt);
            if (enemy.stateTimer <= 0 && distance < 660) {
              enemy.state = 'telegraph';
              enemy.stateTimer = Math.max(0.42, 0.62 * enemy.fireCooldownMult);
              enemy.chargeX = ux;
              enemy.chargeY = uy;
              enemy.vx *= 0.12;
              enemy.vy *= 0.12;
            }
          } else if (enemy.state === 'telegraph') {
            enemy.angle = Math.atan2(enemy.chargeY, enemy.chargeX);
            enemy.vx *= Math.exp(-10 * logicDt);
            enemy.vy *= Math.exp(-10 * logicDt);
            if (!settings.reducedMotion && chance(0.3)) {
              spawnParticle(enemy.x + rand(-12, 12), enemy.y + rand(-12, 12), { vx: -enemy.chargeX * rand(20, 70), vy: -enemy.chargeY * rand(20, 70), life: 0.25, size: 2.5, color: enemy.elite ? enemy.eliteColor : '#ffd166', glow: 12 });
            }
            if (enemy.stateTimer <= 0) {
              enemy.state = 'charge';
              enemy.stateTimer = 0.5;
              const chargeScale = clamp(enemy.speed / 82, 0.85, 1.55) * slowFactor;
              enemy.vx = enemy.chargeX * 545 * chargeScale;
              enemy.vy = enemy.chargeY * 545 * chargeScale;
              createShockwave(enemy.x, enemy.y, enemy.elite ? enemy.eliteColor : '#ffd166', 82, 0.3, 2);
            }
          } else if (enemy.state === 'charge') {
            if (!settings.reducedMotion && chance(0.48)) spawnParticle(enemy.x, enemy.y, { vx: -enemy.vx * 0.18 + rand(-30, 30), vy: -enemy.vy * 0.18 + rand(-30, 30), life: 0.24, size: 3, color: enemy.elite ? enemy.eliteColor : '#ffb548', drag: 3, glow: 9 });
            if (enemy.stateTimer <= 0) {
              enemy.state = 'recover';
              enemy.stateTimer = 0.62;
            }
          } else {
            enemy.vx *= Math.exp(-5 * logicDt);
            enemy.vy *= Math.exp(-5 * logicDt);
            if (enemy.stateTimer <= 0) {
              enemy.state = 'seek';
              enemy.stateTimer = rand(0.95, 1.5) * enemy.fireCooldownMult;
            }
          }
          break;
        }
        case 'splitter': {
          moveEnemyToward(enemy, player.x + Math.cos(enemy.age + enemy.seed) * 60, player.y + Math.sin(enemy.age + enemy.seed) * 60, enemy.speed * slowFactor, 2.6, logicDt);
          enemy.angle += Math.sin(enemy.age * 1.25 + enemy.seed) * 0.12 * logicDt;
          enemy.stateTimer -= logicDt;
          if (enemy.stateTimer <= 0 && distance < 660) {
            const count = currentWave.number >= 5 ? 12 : 10;
            fireRadial(enemy, count, 215 * enemy.bulletSpeedMult, (9.5 + currentWave.number * 0.55) * enemy.attackMult, enemy.age * 0.4, '#7cf0a8', 4.2);
            enemy.stateTimer = rand(2.65, 3.45) * enemy.fireCooldownMult;
          }
          break;
        }
        case 'orbiter': {
          const desiredRadius = 285 + Math.sin(enemy.seed) * 40;
          const radial = clamp((distance - desiredRadius) / 90, -1, 1);
          const tangent = Math.cos(enemy.seed) > 0 ? 1 : -1;
          const desiredX = (ux * radial + -uy * tangent) * enemy.speed * slowFactor;
          const desiredY = (uy * radial + ux * tangent) * enemy.speed * slowFactor;
          enemy.vx = expLerp(enemy.vx, desiredX, 4.8, logicDt);
          enemy.vy = expLerp(enemy.vy, desiredY, 4.8, logicDt);
          enemy.angle = Math.atan2(dy, dx) + Math.PI / 2;
          enemy.shootTimer -= logicDt;
          if (enemy.shootTimer <= 0) {
            fireEnemyFan(enemy, currentWave.number >= 4 ? 5 : 3, 0.17, 258 * enemy.bulletSpeedMult, (10 + currentWave.number * 0.58) * enemy.attackMult, 4.2, '#b373ff');
            enemy.shootTimer = rand(1.15, 1.65) * enemy.fireCooldownMult;
          }
          break;
        }
        case 'boss':
          updateBoss(enemy, logicDt, distance, ux, uy);
          break;
      }

      if (enemy.elite && enemy.type !== 'boss') {
        enemy.eliteTimer = (enemy.eliteTimer ?? rand(1.2, 2.2)) - logicDt;
        if (enemy.eliteTimer <= 0) {
          if (enemy.eliteType === 'null') {
            fireRadial(enemy, 7, 250 * enemy.bulletSpeedMult, 8.5 * enemy.attackMult, enemy.age, enemy.eliteColor, 4.5);
            enemy.eliteTimer = 2.25 * enemy.fireCooldownMult;
          } else if (enemy.eliteType === 'volatile') {
            fireRadial(enemy, 5, 225 * enemy.bulletSpeedMult, 7.5 * enemy.attackMult, enemy.age * 1.4, enemy.eliteColor, 4);
            enemy.eliteTimer = 2.8 * enemy.fireCooldownMult;
          } else {
            enemy.eliteTimer = rand(1.7, 2.8) * enemy.fireCooldownMult;
          }
        }
      }

      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      const pad = WORLD.margin + enemy.radius;
      if (enemy.x < pad || enemy.x > WORLD.w - pad) enemy.vx *= -0.58;
      if (enemy.y < pad || enemy.y > WORLD.h - pad) enemy.vy *= -0.58;
      enemy.x = clamp(enemy.x, pad, WORLD.w - pad);
      enemy.y = clamp(enemy.y, pad, WORLD.h - pad);

      const collisionDistance = player.radius + enemy.radius * (enemy.type === 'boss' ? 0.84 : 0.8);
      const postDx = player.x - enemy.x;
      const postDy = player.y - enemy.y;
      const postDist = Math.hypot(postDx, postDy) || 1;
      if (postDist < collisionDistance && enemy.contactCooldown <= 0) {
        damagePlayer(enemy.damage, enemy.x, enemy.y);
        enemy.contactCooldown = 0.56;
        const nx = postDx / postDist;
        const ny = postDy / postDist;
        player.vx += nx * 225;
        player.vy += ny * 225;
        enemy.vx -= nx * 95;
        enemy.vy -= ny * 95;
      }
    }
  }

  function updateBoss(boss, dt, distance, ux, uy) {
    const hpRatio = boss.hp / boss.maxHp;
    const newPhase = hpRatio > 0.7 ? 1 : hpRatio > 0.38 ? 2 : 3;
    if (newPhase !== boss.phase) {
      boss.phase = newPhase;
      const phaseLabel = $('.boss-phase');
      if (phaseLabel) phaseLabel.textContent = `PHASE ${newPhase}`;
      boss.shootTimer = 0.24;
      boss.patternTimer = 0.55;
      boss.laserTimer = 1.65;
      boss.summonTimer = 2.4;
      createShockwave(boss.x, boss.y, newPhase === 3 ? '#ff3e83' : '#c268ff', 330, 1, 5);
      burstParticles(boss.x, boss.y, newPhase === 3 ? '#ff4d91' : '#c66dff', 62, 50, 330, 2, 8);
      audio.bossPulse();
      cameraTrauma(0.68);
      showToast(newPhase === 2 ? '보스 위상 2 · 패턴 중첩 시작' : '보스 위상 3 · 삭제 명령 폭주', 2600);
    }

    boss.enrageTimer -= dt;
    if (!boss.enraged && boss.enrageTimer <= 0) {
      boss.enraged = true;
      const phaseLabel = $('.boss-phase');
      if (phaseLabel) phaseLabel.textContent = 'ENRAGED';
      boss.speed *= 1.22;
      boss.attackMult *= 1.18;
      createShockwave(boss.x, boss.y, '#ff315b', 420, 1.15, 7);
      burstParticles(boss.x, boss.y, '#ff315b', 90, 70, 420, 2, 10);
      audio.bossPulse();
      cameraTrauma(0.9);
      showToast('격노 · NULL ARCHIVIST가 시간 제한을 삭제했습니다', 3200);
    }

    const tempo = boss.enraged ? 0.68 : 1;
    const desiredRadius = boss.phase === 1 ? 365 : boss.phase === 2 ? 305 : 245;
    const radial = clamp((distance - desiredRadius) / 130, -1, 1);
    const tangent = boss.phase === 3 ? 1.38 : 0.82;
    const targetVx = ux * radial * boss.speed + -uy * tangent * boss.speed;
    const targetVy = uy * radial * boss.speed + ux * tangent * boss.speed;
    boss.vx = expLerp(boss.vx, targetVx, 2.6, dt);
    boss.vy = expLerp(boss.vy, targetVy, 2.6, dt);
    boss.angle += dt * (boss.phase === 3 ? 1.7 : 0.9);

    boss.shootTimer -= dt;
    boss.patternTimer -= dt;
    boss.summonTimer -= dt;
    boss.laserTimer -= dt;

    if (boss.phase === 1) {
      if (boss.shootTimer <= 0) {
        fireEnemyFan(boss, 7, 0.115, 310 * boss.bulletSpeedMult, 13.5 * boss.attackMult, 5.8, '#ff65bf');
        boss.shootTimer = 0.9 * tempo * boss.fireCooldownMult;
      }
      if (boss.patternTimer <= 0) {
        fireRadial(boss, 18, 225 * boss.bulletSpeedMult, 11.5 * boss.attackMult, boss.angle, '#a96dff', 5);
        boss.patternTimer = 2.55 * tempo * boss.fireCooldownMult;
        audio.bossPulse();
      }
    } else if (boss.phase === 2) {
      if (boss.shootTimer <= 0) {
        for (let arm = 0; arm < 4; arm++) spawnEnemyBullet(boss.x, boss.y, boss.spiralAngle + arm * TAU / 4, 278 * boss.bulletSpeedMult, 12 * boss.attackMult, 5, '#c06fff', { wave: 38 });
        boss.spiralAngle += 0.28;
        boss.shootTimer = 0.18 * tempo * boss.fireCooldownMult;
      }
      if (boss.patternTimer <= 0) {
        fireEnemyFan(boss, 9, 0.105, 345 * boss.bulletSpeedMult, 13.5 * boss.attackMult, 5.2, '#ff5f9e');
        boss.patternTimer = 1.55 * tempo * boss.fireCooldownMult;
      }
      if (boss.summonTimer <= 0) {
        for (let i = 0; i < 4; i++) {
          const a = boss.angle + i * TAU / 4;
          spawnEnemy(i % 2 ? 'gunner' : 'wisp', clamp(boss.x + Math.cos(a) * 150, 100, WORLD.w - 100), clamp(boss.y + Math.sin(a) * 150, 100, WORLD.h - 100), true);
        }
        boss.summonTimer = 5.1 * tempo;
      }
    } else {
      if (boss.shootTimer <= 0) {
        fireEnemyFan(boss, 9, 0.13, 380 * boss.bulletSpeedMult, 15 * boss.attackMult, 5.7, settings.highContrast ? '#ff315b' : '#ff4f85');
        boss.shootTimer = 0.58 * tempo * boss.fireCooldownMult;
      }
      if (boss.patternTimer <= 0) {
        fireRadial(boss, 24, 265 * boss.bulletSpeedMult, 13 * boss.attackMult, boss.angle * 1.45, '#bb65ff', 5.2);
        boss.patternTimer = 1.72 * tempo * boss.fireCooldownMult;
      }
      if (boss.laserTimer <= 0) {
        const base = Math.atan2(player.y - boss.y, player.x - boss.x) + rand(-0.18, 0.18);
        spawnBossLaser(boss, base);
        spawnBossLaser(boss, base + TAU / 3);
        spawnBossLaser(boss, base + TAU * 2 / 3);
        boss.laserTimer = 3.25 * tempo;
        audio.bossPulse();
      }
      if (boss.summonTimer <= 0) {
        for (let i = 0; i < 3; i++) {
          const a = rand(0, TAU);
          spawnEnemy(i === 2 ? 'orbiter' : 'charger', clamp(boss.x + Math.cos(a) * 175, 100, WORLD.w - 100), clamp(boss.y + Math.sin(a) * 175, 100, WORLD.h - 100), true);
        }
        boss.summonTimer = 5.7 * tempo;
      }
    }

    UI.bossBarFill.style.width = `${clamp(hpRatio * 100, 0, 100)}%`;
  }


  function updateLasers(dt) {
    for (let i = arrays.lasers.length - 1; i >= 0; i--) {
      const laser = arrays.lasers[i];
      const boss = arrays.enemies.find((e) => e.id === laser.bossId && !e.dead);
      if (!boss) {
        arrays.lasers.splice(i, 1);
        continue;
      }
      laser.x = boss.x;
      laser.y = boss.y;
      if (laser.telegraph > 0) {
        laser.telegraph -= dt;
        continue;
      }
      if (laser.active > 0) {
        laser.active -= dt;
        if (!laser.hit) {
          const dx = player.x - boss.x;
          const dy = player.y - boss.y;
          const perpendicular = Math.abs(-Math.sin(laser.angle) * dx + Math.cos(laser.angle) * dy);
          const along = Math.abs(Math.cos(laser.angle) * dx + Math.sin(laser.angle) * dy);
          if (perpendicular < laser.width + player.radius && along < 1500) {
            damagePlayer(Math.max(24, boss.damage * 0.86), boss.x, boss.y);
            laser.hit = true;
          }
        }
        if (!settings.reducedMotion && chance(0.4)) {
          const t = rand(-1100, 1100);
          const x = boss.x + Math.cos(laser.angle) * t;
          const y = boss.y + Math.sin(laser.angle) * t;
          spawnParticle(x, y, { vx: rand(-30, 30), vy: rand(-30, 30), life: 0.18, size: rand(2, 5), color: '#ff69d5', drag: 2, glow: 18 });
        }
        continue;
      }
      laser.fade -= dt;
      if (laser.fade <= 0) arrays.lasers.splice(i, 1);
    }
  }

  function updateEnemyBullets(dt) {
    for (let i = arrays.enemyBullets.length - 1; i >= 0; i--) {
      const b = arrays.enemyBullets[i];
      b.age += dt;
      b.life -= dt;
      b.prevX = b.x;
      b.prevY = b.y;
      if (b.turnRate && player) {
        const target = Math.atan2(player.y - b.y, player.x - b.x);
        const delta = wrapAngle(target - b.angle);
        b.angle += clamp(delta, -b.turnRate * dt, b.turnRate * dt);
        b.vx = Math.cos(b.angle) * b.speed;
        b.vy = Math.sin(b.angle) * b.speed;
      }
      const slow = player?.enemyBulletSlow || 1;
      let vx = b.vx * slow;
      let vy = b.vy * slow;
      if (b.wave) {
        const waveVelocity = Math.sin(b.age * 8) * b.wave;
        vx += -Math.sin(b.angle) * waveVelocity;
        vy += Math.cos(b.angle) * waveVelocity;
      }
      b.x += vx * dt;
      b.y += vy * dt;
      const outside = b.x < -120 || b.x > WORLD.w + 120 || b.y < -120 || b.y > WORLD.h + 120;
      if (b.life <= 0 || outside) {
        recycleEnemyBullet(i);
        continue;
      }
      const rr = b.radius + player.radius;
      if (sqr(b.x - player.x) + sqr(b.y - player.y) < rr * rr) {
        damagePlayer(b.damage, b.x, b.y);
        burstParticles(b.x, b.y, b.color, 5, 20, 100, 1, 3);
        recycleEnemyBullet(i);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Combat resolution & damage
  // ---------------------------------------------------------------------------
  function nearestBulletTarget(bullet, origin, maxDistance = 520) {
    let target = null;
    let best = sqr(maxDistance);
    const candidates = enemyGrid.query(bullet.x, bullet.y, maxDistance, searchScratch);
    for (const enemy of candidates) {
      if (enemy === origin || bullet.hitIds.includes(enemy.id)) continue;
      const dSq = sqr(enemy.x - bullet.x) + sqr(enemy.y - bullet.y);
      if (dSq < best) { best = dSq; target = enemy; }
    }
    return target;
  }

  function updatePlayerBullets(dt) {
    for (let i = arrays.playerBullets.length - 1; i >= 0; i--) {
      const b = arrays.playerBullets[i];
      b.life -= dt;
      b.prevX = b.x;
      b.prevY = b.y;
      if (b.homing > 0) {
        b.retargetTimer -= dt;
        let target = b.homingTargetId ? enemyGrid.get(b.homingTargetId) : null;
        if (!target || target.dead || b.retargetTimer <= 0 || sqr(target.x - b.x) + sqr(target.y - b.y) > sqr(520)) {
          target = nearestBulletTarget(b, null, 470);
          b.homingTargetId = target?.id || 0;
          b.retargetTimer = 0.1;
        }
        if (target) {
          const desired = Math.atan2(target.y - b.y, target.x - b.x);
          const delta = wrapAngle(desired - b.angle);
          b.angle += clamp(delta, -b.homing * dt, b.homing * dt);
          const speed = Math.hypot(b.vx, b.vy);
          b.vx = Math.cos(b.angle) * speed;
          b.vy = Math.sin(b.angle) * speed;
        }
      }
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.life <= 0 || b.x < 0 || b.x > WORLD.w || b.y < 0 || b.y > WORLD.h) {
        recyclePlayerBullet(i);
        continue;
      }

      let consumed = false;
      const nearbyEnemies = enemyGrid.query(b.x, b.y, b.radius + 10, collisionScratch);
      for (const enemy of nearbyEnemies) {
        if (enemy.dead || enemy.spawnTime > 0 || b.hitIds.includes(enemy.id)) continue;
        const rr = b.radius + enemy.radius;
        if (sqr(b.x - enemy.x) + sqr(b.y - enemy.y) > rr * rr) continue;
        b.hitIds.push(enemy.id);

        let hitCrit = b.crit;
        let hitDamage = b.damage;
        if (!b.fromEcho && enemy.markTime > 0) hitDamage *= 1 + player.markBonus;
        if (player.frozenVerdict && enemy.slowTimer > 0 && !hitCrit && chance(player.frozenCritChance)) {
          hitCrit = true;
          hitDamage *= player.critMultiplier * (1 + player.frozenCritDamage);
        } else if (player.frozenVerdict && enemy.slowTimer > 0 && hitCrit) {
          hitDamage *= 1 + player.frozenCritDamage;
        }

        damageEnemy(enemy, hitDamage, hitCrit, b.x, b.y, { fromEcho: b.fromEcho, fromDrone: b.fromDrone, echoStat: b.echoStat });
        if (b.fromEcho && player.markDuration > 0) enemy.markTime = Math.max(enemy.markTime, player.markDuration);

        const guaranteedBurn = b.fromDrone && player.solarChoir;
        if ((guaranteedBurn || chance(player.burnChance)) && !enemy.dead) {
          const nextBurnDps = player.damage * player.burnRatio * (b.fromDrone ? 0.8 : 1);
          applyBurnSource(enemy, nextBurnDps, 2.8, { fromEcho: b.fromEcho, echoStat: b.echoStat });
        }
        if (player.freezeChance > 0 && chance(player.freezeChance) && !enemy.dead) {
          enemy.slowTimer = Math.max(enemy.slowTimer, 2.2);
          enemy.slowAmount = Math.max(enemy.slowAmount, player.freezeSlow);
        }

        if (player.splashRadius > 0 && !b.fromDrone) {
          const evolved = player.singularity && hitCrit;
          const radius = player.splashRadius * (evolved ? 1.55 : 1);
          const ratio = player.splashRatio * (evolved ? 1.45 : 1);
          damageEnemiesInRadius(b.x, b.y, radius, hitDamage * ratio, enemy, b.color, { fromEcho: b.fromEcho, echoStat: b.echoStat });
          createShockwave(b.x, b.y, b.color, radius, evolved ? 0.34 : 0.22, evolved ? 2.5 : 1.4);
          if (evolved && player.chainChance > 0) chainFromEnemy(enemy, hitDamage * player.chainDamageRatio, player.chainJumps + 1, { fromEcho: b.fromEcho, echoStat: b.echoStat });
        }
        if (player.chainChance > 0 && !b.fromDrone && chance(player.chainChance)) {
          chainFromEnemy(enemy, hitDamage * player.chainDamageRatio, player.chainJumps + Math.floor((player.upgradeLevels.chain || 0) / 2), { fromEcho: b.fromEcho, echoStat: b.echoStat });
        }
        burstParticles(b.x, b.y, b.color, hitCrit ? 9 : 4, 25, hitCrit ? 170 : 100, 1, hitCrit ? 4 : 2.5);
        audio.hit(enemy.x);

        if (b.pierceLeft > 0) {
          b.pierceLeft--;
          b.damage *= player.pierceRetention;
          b.x += Math.cos(b.angle) * (enemy.radius + b.radius + 2);
          b.y += Math.sin(b.angle) * (enemy.radius + b.radius + 2);
        } else if (b.ricochetLeft > 0) {
          const target = nearestBulletTarget(b, enemy, 560);
          if (target) {
            b.ricochetLeft--;
            b.damage *= player.ricochetRetention;
            b.angle = Math.atan2(target.y - b.y, target.x - b.x);
            const speed = Math.hypot(b.vx, b.vy);
            b.vx = Math.cos(b.angle) * speed;
            b.vy = Math.sin(b.angle) * speed;
            b.x += Math.cos(b.angle) * (enemy.radius + b.radius + 3);
            b.y += Math.sin(b.angle) * (enemy.radius + b.radius + 3);
            createLink(enemy.x, enemy.y, target.x, target.y, b.color);
          } else {
            recyclePlayerBullet(i);
            consumed = true;
          }
        } else {
          recyclePlayerBullet(i);
          consumed = true;
        }
        break;
      }
      if (consumed) continue;
    }
  }

  function triggerPhaseRift(enemy, echoStat = null) {
    if (!enemy || enemy.dead || enemy.trainingDummy || enemy.phaseRiftCooldown > 0) return false;
    enemy.phaseRiftTime = PHASE_RIFT_DURATION;
    enemy.phaseRiftCooldown = PHASE_RIFT_COOLDOWN;
    enemy.phaseRiftPulse = 0.42;
    enemy.phaseRiftSourceStat = echoStat || null;
    enemy.phaseRiftLastPresentHit = -999;
    enemy.phaseRiftLastEchoHit = -999;
    enemy.phaseRiftLastEchoStat = null;
    phaseRiftProcs++;
    if (echoStat) echoStat.phaseRifts = (echoStat.phaseRifts || 0) + 1;
    if (phaseRiftProcs === 1) showToast('위상 균열 · 1.6초 동안 대상이 받는 피해 +22%', 2600);

    createShockwave(enemy.x, enemy.y, '#ffd166', enemy.radius + 92, 0.42, 3.2);
    createShockwave(enemy.x, enemy.y, '#b978ff', enemy.radius + 62, 0.34, 2.2);
    burstParticles(enemy.x, enemy.y, '#ffd166', quality === 0 ? 10 : 18, 32, 150, 1.5, 4.2);
    burstParticles(enemy.x, enemy.y, '#b978ff', quality === 0 ? 8 : 14, 24, 120, 1.2, 3.8);
    createFloater(enemy.x, enemy.y - enemy.radius - 16, 'PHASE RIFT', '#ffe39a', 14);
    audio.phaseRift(enemy.x);
    input.rumble(0.26, 72);
    return true;
  }

  function registerPhaseRiftHit(enemy, fromEcho, options = {}) {
    if (!enemy || enemy.dead || enemy.trainingDummy || options.dot || options.fromDrone) return false;
    if (fromEcho) {
      enemy.phaseRiftLastEchoHit = gameTime;
      if (options.echoStat) enemy.phaseRiftLastEchoStat = options.echoStat;
    } else {
      enemy.phaseRiftLastPresentHit = gameTime;
    }
    const echoAt = Number(enemy.phaseRiftLastEchoHit);
    const presentAt = Number(enemy.phaseRiftLastPresentHit);
    const paired = Number.isFinite(echoAt) && Number.isFinite(presentAt) && echoAt >= 0 && presentAt >= 0 && Math.abs(echoAt - presentAt) <= PHASE_RIFT_WINDOW;
    if (!paired || enemy.phaseRiftCooldown > 0 || enemy.hp <= 0) return false;
    return triggerPhaseRift(enemy, enemy.phaseRiftLastEchoStat || options.echoStat || null);
  }

  function damageEnemy(enemy, amount, crit = false, hitX = enemy.x, hitY = enemy.y, options = {}) {
    if (enemy.dead || enemy.spawnTime > 0) return 0;
    if (enemy.type === 'boss' && currentWave?.isBoss && !currentWave.combatLive) return 0;
    const fromEcho = Boolean(options.fromEcho);
    if (enemy.trainingDummy && (enemy.trainingRole === 'echo' || enemy.trainingRole === 'present' || enemy.trainingRole === 'proof')) {
      const allowed = enemy.trainingRole === 'present' ? !fromEcho : fromEcho;
      if (!allowed) {
        if (gameTime - (enemy.phaseBlockedAt || -999) > 0.18) {
          enemy.phaseBlockedAt = gameTime;
          const echoOnly = enemy.trainingRole === 'echo' || enemy.trainingRole === 'proof';
          const phaseColor = enemy.trainingRole === 'proof' ? '#ffd166' : echoOnly ? '#c47cff' : '#63eaff';
          const phaseText = enemy.trainingRole === 'proof' ? '재현 잔향 전용' : echoOnly ? '잔향 전용' : '현재 전용';
          createShockwave(enemy.x, enemy.y, phaseColor, enemy.radius * 1.65, 0.22, 1.5);
          createFloater(enemy.x, enemy.y - enemy.radius, phaseText, echoOnly ? '#dcb8ff' : '#aaf8ff', 10);
        }
        return 0;
      }
    }
    let actual = amount;
    const hpBefore = Math.max(0, enemy.hp);
    const hpRatioBefore = enemy.hp / enemy.maxHp;
    if (enemy.type === 'boss' && player?.executeThreshold > 0 && hpRatioBefore <= player.executeThreshold) {
      actual *= 1 + player.executeThreshold * 0.8;
    }
    const damageBeforePhaseRift = actual;
    const phaseRiftActive = !enemy.trainingDummy && enemy.phaseRiftTime > 0;
    if (phaseRiftActive) actual *= PHASE_RIFT_DAMAGE_MULT;
    enemy.hp -= actual;
    const dealt = Math.min(Math.max(0, actual), hpBefore);
    const baseDealt = Math.min(Math.max(0, damageBeforePhaseRift), hpBefore);
    const phaseBonusDealt = phaseRiftActive ? Math.max(0, dealt - baseDealt) : 0;
    if (phaseBonusDealt > 0) {
      phaseRiftBonusDamage += phaseBonusDealt;
      const sourceStat = enemy.phaseRiftSourceStat;
      if (sourceStat) sourceStat.phaseRiftBonusDamage = (sourceStat.phaseRiftBonusDamage || 0) + phaseBonusDealt;
    }
    if (enemy.trainingDummy && dealt > 0) {
      enemy.trainingHit = true;
      registerTutorialPhaseHit(enemy, fromEcho);
    } else if (dealt > 0) {
      runDamageTotal += dealt;
    }
    if (dealt > 0 && fromEcho) {
      enemy.lastHitFromEcho = true;
      enemy.lastEchoStat = options.echoStat || enemy.lastEchoStat || null;
      if (options.echoStat) {
        options.echoStat.damage += dealt;
        if (options.dot) options.echoStat.dotDamage = (options.echoStat.dotDamage || 0) + dealt;
        else options.echoStat.hits++;
        echoDamageTotal += dealt;
        echoBestDamage = Math.max(echoBestDamage, options.echoStat.damage);
      }
    } else if (dealt > 0) {
      // The most recent damaging source owns the kill, including non-echo DoT.
      enemy.lastHitFromEcho = false;
      enemy.lastEchoStat = null;
    }
    enemy.hitFlash = 0.085;
    let executed = false;
    if (enemy.type !== 'boss' && player?.executeThreshold > 0 && enemy.hp > 0 && enemy.hp / enemy.maxHp <= player.executeThreshold) {
      enemy.hp = 0;
      executed = true;
    }
    if (dealt > 0 && enemy.hp > 0) registerPhaseRiftHit(enemy, fromEcho, options);
    const text = executed ? 'DELETE' : `${crit ? '✦ ' : ''}${Math.round(actual)}`;
    if (executed || crit || actual >= 40 || (!options.dot && chance(0.28))) {
      createFloater(hitX + rand(-7, 7), hitY - enemy.radius * 0.4, text, executed ? '#ff6d9d' : crit ? '#ffe27a' : options.fromEcho ? '#d8adff' : '#dffbff', executed || crit ? 15 : 11);
    }
    if (enemy.hp <= 0) enemy.dead = true;
    return dealt;
  }

  function damageEnemiesInRadius(x, y, radius, amount, exclude = null, color = '#7beeff', options = {}) {
    const radiusSq = radius * radius;
    const candidates = enemyGrid.query(x, y, radius, aoeScratch);
    for (const enemy of candidates) {
      if (enemy === exclude) continue;
      const dSq = sqr(enemy.x - x) + sqr(enemy.y - y);
      if (dSq <= radiusSq) {
        const falloff = 1 - Math.sqrt(dSq) / radius * 0.45;
        damageEnemy(enemy, amount * falloff, false, enemy.x, enemy.y, options);
        createLink(x, y, enemy.x, enemy.y, color);
      }
    }
  }

  function chainFromEnemy(origin, damage, jumps, options = {}) {
    let current = origin;
    const visited = new Set([origin.id]);
    for (let jump = 0; jump < jumps; jump++) {
      let nearest = null;
      let best = sqr(215);
      const candidates = enemyGrid.query(current.x, current.y, 215, chainScratch);
      for (const enemy of candidates) {
        if (visited.has(enemy.id)) continue;
        const dSq = sqr(enemy.x - current.x) + sqr(enemy.y - current.y);
        if (dSq < best) { best = dSq; nearest = enemy; }
      }
      if (!nearest) break;
      createLink(current.x, current.y, nearest.x, nearest.y, '#a7f7ff');
      damageEnemy(nearest, damage * Math.pow(0.82, jump), false, nearest.x, nearest.y, options);
      visited.add(nearest.id);
      current = nearest;
    }
  }

  function resolveEnemyDeaths() {
    for (let i = arrays.enemies.length - 1; i >= 0; i--) {
      const enemy = arrays.enemies[i];
      if (!enemy.dead) continue;
      swapRemove(arrays.enemies, i);
      onEnemyDeath(enemy);
    }
  }

  function onEnemyDeath(enemy) {
    const noReward = enemy.noReward || false;
    if (!noReward && enemy.lastHitFromEcho && enemy.lastEchoStat) {
      enemy.lastEchoStat.kills++;
      echoKillsTotal++;
    }
    const heavy = enemy.type === 'boss' || enemy.type === 'splitter' || enemy.elite;
    const deathColor = enemy.type === 'boss' ? '#ff64d4' : enemy.elite ? enemy.eliteColor : enemy.type === 'splitter' ? '#7ff0ac' : '#ff668f';
    burstParticles(enemy.x, enemy.y, deathColor, enemy.type === 'boss' ? 140 : heavy ? 38 : 15, 40, enemy.type === 'boss' ? 440 : 230, 1.5, enemy.type === 'boss' ? 12 : 6);
    createShockwave(enemy.x, enemy.y, deathColor, enemy.type === 'boss' ? 560 : enemy.elite ? 210 : heavy ? 180 : 85, enemy.type === 'boss' ? 1.4 : 0.55, enemy.type === 'boss' ? 7 : 3);
    audio.kill(enemy.x, heavy);

    if (!noReward) {
      score += Math.round(enemy.score * (1 + player.level * 0.022));
      kills++;
      const echoReduction = player.onKillEchoReduction * (player.ouroboros && enemy.lastHitFromEcho ? 2 : 1);
      player.echoCooldown = Math.max(0, player.echoCooldown - echoReduction);
      if (player.killHealChance > 0 && chance(player.killHealChance)) player.hp = Math.min(player.maxHp, player.hp + player.killHeal);
      if (player.killShieldChance > 0 && chance(player.killShieldChance)) player.shield = Math.min(player.maxShield, player.shield + player.killShield);

      if (enemy.elite) {
        elitesKilled++;
        const coreDrop = Math.max(1, Math.round(enemy.coreValue * (enemy.coreMult || 1)));
        runCores += coreDrop;
        createFloater(enemy.x, enemy.y - enemy.radius, `⬡ +${coreDrop}`, '#ffd166', 14);
      }
      const dropCount = enemy.type === 'boss' ? 34 : enemy.elite ? 5 : enemy.type === 'splitter' ? 3 : enemy.type === 'orbiter' ? 2 : 1;
      const value = Math.max(1, Math.round(enemy.xp / dropCount));
      for (let j = 0; j < dropCount; j++) spawnPickup(enemy.x + rand(-enemy.radius * 0.55, enemy.radius * 0.55), enemy.y + rand(-enemy.radius * 0.55, enemy.radius * 0.55), value);
    }

    if (enemy.eliteType === 'volatile' && !enemy.noReward) {
      fireRadial(enemy, 10, 245 * (enemy.bulletSpeedMult || 1), 9 * (enemy.attackMult || 1), enemy.age, enemy.eliteColor, 4.5);
    }
    if (enemy.eliteType === 'replicator' && !enemy.noReward) {
      for (let j = 0; j < 2; j++) {
        const a = rand(0, TAU);
        const clone = spawnEnemy('wisp', clamp(enemy.x + Math.cos(a) * 34, 90, WORLD.w - 90), clamp(enemy.y + Math.sin(a) * 34, 90, WORLD.h - 90), true);
        if (clone) { clone.noReward = true; clone.vx = Math.cos(a) * 120; clone.vy = Math.sin(a) * 120; }
      }
    }

    if (enemy.type === 'splitter' && !enemy.noReward) {
      for (let j = 0; j < 3; j++) {
        const a = j * TAU / 3 + rand(-0.25, 0.25);
        const shard = spawnEnemy('shard', clamp(enemy.x + Math.cos(a) * 25, 90, WORLD.w - 90), clamp(enemy.y + Math.sin(a) * 25, 90, WORLD.h - 90), enemy.summoned);
        if (shard) {
          shard.vx = Math.cos(a) * 185;
          shard.vy = Math.sin(a) * 185;
        }
      }
    }

    if (enemy.type === 'boss') {
      bossesKilled++;
      const bossCore = Math.max(1, Math.round((enemy.coreValue || 18) * (enemy.coreMult || 1)));
      runCores += bossCore;
      createFloater(enemy.x, enemy.y - enemy.radius, `CORE +${bossCore}`, '#ffd166', 20);
      for (const other of arrays.enemies) {
        other.dead = true;
        other.noReward = true;
      }
      while (arrays.enemyBullets.length) recycleEnemyBullet(arrays.enemyBullets.length - 1);
      arrays.lasers.length = 0;
      UI.bossHud.classList.add('hidden');
      cameraTrauma(1);
      input.rumble(1, 500);
      score += 4200;
    } else {
      cameraTrauma(heavy ? 0.24 : 0.07);
    }
  }

  function damagePlayer(amount, sourceX, sourceY) {
    if (!player || gameState !== 'playing' || player.invuln > 0 || bossCutsceneActive()) return false;
    const lowReduction = player.hp / player.maxHp <= 0.35 ? player.lowHealthReduction : 0;
    let remaining = amount * (1 - clamp(player.damageReduction + lowReduction, 0, 0.72));
    const shieldBefore = player.shield;
    if (player.shield > 0) {
      const absorbed = Math.min(player.shield, remaining);
      player.shield -= absorbed;
      remaining -= absorbed;
    }
    if (remaining > 0) player.hp -= remaining;
    player.shieldDelay = 4.1;
    player.invuln = 0.34 + player.hitInvuln;
    const n = normalize(player.x - sourceX, player.y - sourceY);
    player.vx += n.x * 190;
    player.vy += n.y * 190;
    createShockwave(player.x, player.y, remaining > 0 ? '#ff5079' : '#5ce8ff', 90, 0.32, 3);
    burstParticles(player.x, player.y, remaining > 0 ? '#ff5d80' : '#68eaff', 14, 40, 210, 1, 5);

    if (shieldBefore > 0 && player.shield <= 0) audio.shieldBreak();
    if (shieldBefore > 0 && player.shield <= 0 && player.shieldBreakRatio > 0 && player.shieldBreakCooldown <= 0) {
      player.shieldBreakCooldown = 8;
      const radius = 250;
      for (let i = arrays.enemyBullets.length - 1; i >= 0; i--) {
        const bullet = arrays.enemyBullets[i];
        if (sqr(bullet.x - player.x) + sqr(bullet.y - player.y) < sqr(radius)) recycleEnemyBullet(i);
      }
      damageEnemiesInRadius(player.x, player.y, radius, player.damage * player.shieldBreakRatio, null, '#69dfff');
      createShockwave(player.x, player.y, '#69dfff', radius, 0.7, 4);
      showToast('경계 붕괴 · 탄막 삭제', 1200);
    }
    if (player.hurtNovaRatio > 0 && player.hurtNovaCooldown <= 0) {
      player.hurtNovaCooldown = 4;
      damageEnemiesInRadius(player.x, player.y, 155, player.damage * player.hurtNovaRatio, null, '#ff8ab1');
      createShockwave(player.x, player.y, '#ff8ab1', 165, 0.48, 3);
    }

    cameraTrauma(remaining > 0 ? 0.56 : 0.29);
    audio.playerHit();
    input.rumble(0.75, 180);
    navigator.vibrate?.(remaining > 0 ? [24, 18, 45] : 20);
    UI.damageFlash.classList.add('active');
    window.setTimeout(() => UI.damageFlash.classList.remove('active'), 100);

    if (player.hp <= 0) {
      let revivalLabel = '';
      let revivalRatio = 0;
      if (player.extraLife > 0) {
        player.extraLife--;
        revivalLabel = '두 번째 문장';
        revivalRatio = 0.45;
      } else if (player.defianceCharges > 0) {
        player.defianceCharges--;
        revivalLabel = '영구 기억 · 붕괴 거부';
        revivalRatio = 0.3;
      }
      if (revivalRatio > 0) {
        player.hp = player.maxHp * revivalRatio;
        player.shield = player.maxShield;
        player.invuln = 2.2;
        for (let i = arrays.enemyBullets.length - 1; i >= 0; i--) {
          const bullet = arrays.enemyBullets[i];
          if (sqr(bullet.x - player.x) + sqr(bullet.y - player.y) < sqr(470)) recycleEnemyBullet(i);
        }
        damageEnemiesInRadius(player.x, player.y, 360, player.damage * 7.5, null, '#ffe27a');
        createShockwave(player.x, player.y, '#ffe27a', 470, 1.05, 6);
        burstParticles(player.x, player.y, '#ffe27a', 78, 60, 430, 2, 9);
        audio.upgrade(4);
        showToast(`${revivalLabel} · 이 시간선은 아직 끝나지 않았습니다`, 3000);
      } else {
        player.hp = 0;
        endGame();
      }
    }
    return true;
  }

  function updatePickups(dt) {
    for (let i = arrays.pickups.length - 1; i >= 0; i--) {
      const p = arrays.pickups[i];
      p.life -= dt;
      p.age += dt * 3;
      const dx = player.x - p.x;
      const dy = player.y - p.y;
      const distance = Math.hypot(dx, dy) || 1;
      const waveClearing = currentWave?.clearTimer > 0;
      const attractRadius = waveClearing ? 1200 : player.magnet;
      if (distance < attractRadius) {
        const force = waveClearing ? 1300 : 500 + (1 - distance / attractRadius) * 1100;
        p.vx = expLerp(p.vx, dx / distance * force, waveClearing ? 8 : 5, dt);
        p.vy = expLerp(p.vy, dy / distance * force, waveClearing ? 8 : 5, dt);
      } else {
        p.vx *= Math.exp(-2.2 * dt);
        p.vy *= Math.exp(-2.2 * dt);
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (distance < player.radius + p.radius + 7) {
        gainXP(p.value);
        score += p.value * 4;
        audio.pickup();
        if (!settings.reducedMotion) burstParticles(p.x, p.y, '#b978ff', 5, 15, 90, 1, 3);
        recyclePickup(i);
      } else if (p.life <= 0) {
        recyclePickup(i);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // World updates, run lifecycle
  // ---------------------------------------------------------------------------
  function updateEffects(dt) {
    for (let i = arrays.particles.length - 1; i >= 0; i--) {
      const p = arrays.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        swapRemove(arrays.particles, i);
        particlePool.push(p);
        continue;
      }
      p.vx *= Math.exp(-p.drag * dt);
      p.vy *= Math.exp(-p.drag * dt);
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.spin * dt;
    }
    for (let i = arrays.shockwaves.length - 1; i >= 0; i--) {
      const s = arrays.shockwaves[i];
      s.life -= dt;
      const progress = 1 - s.life / s.maxLife;
      s.radius = s.maxRadius * (1 - Math.pow(1 - progress, 2));
      if (s.life <= 0) swapRemove(arrays.shockwaves, i);
    }
    for (let i = arrays.floaters.length - 1; i >= 0; i--) {
      const f = arrays.floaters[i];
      f.life -= dt;
      f.y += f.vy * dt;
      f.vy *= Math.exp(-2 * dt);
      if (f.life <= 0) swapRemove(arrays.floaters, i);
    }
    for (let i = arrays.links.length - 1; i >= 0; i--) {
      arrays.links[i].life -= dt;
      if (arrays.links[i].life <= 0) swapRemove(arrays.links, i);
    }
  }

  function updateCamera(dt) {
    if (!player) return;
    let targetX = player.x + player.vx * 0.09;
    let targetY = player.y + player.vy * 0.09;
    if (view.w < WORLD.w) targetX = clamp(targetX, view.w / 2 - 20, WORLD.w - view.w / 2 + 20);
    else targetX = WORLD.w / 2;
    if (view.h < WORLD.h) targetY = clamp(targetY, view.h / 2 - 20, WORLD.h - view.h / 2 + 20);
    else targetY = WORLD.h / 2;
    camera.x = expLerp(camera.x, targetX, settings.reducedMotion ? 10 : 5.5, dt);
    camera.y = expLerp(camera.y, targetY, settings.reducedMotion ? 10 : 5.5, dt);
    camera.shake = Math.max(0, camera.shake - dt * 2.4);
  }

  function buildRunRecap() {
    if (!player) return '';
    const families = strongestFamilies().slice(0, 3);
    const familyText = families.length
      ? families.map(([key, rank]) => `${escapeHtml(familyInfo[key].label)} ${rank}`).join(' · ')
      : '아직 확립되지 않음';
    const routeNames = routeHistory.length
      ? routeHistory.slice(-5).map((id) => routeCatalog.find((route) => route.id === id)?.name || id).map(escapeHtml).join(' → ')
      : '기본 시간선';
    const upgradeRanks = Object.values(player.upgradeLevels || {}).reduce((sum, value) => sum + Number(value || 0), 0);
    const echoShare = runDamageTotal > 0 ? clamp(echoDamageTotal / runDamageTotal * 100, 0, 999) : 0;
    const echoAverage = echoActivations > 0 ? echoDamageTotal / echoActivations : 0;
    return `
      <div class="recap-grid">
        <div><span>주력 빌드</span><b>${familyText}</b></div>
        <div><span>선택한 경로</span><b>${routeNames}</b></div>
        <div><span>강화 누적</span><b>${upgradeRanks}단계 · L${player.level}</b></div>
        <div><span>전투 기록</span><b>처치 ${formatNumber(kills)} · 엘리트 ${elitesKilled} · 보스 ${bossesKilled}</b></div>
        <div><span>잔향 기여</span><b>전체 피해의 ${echoShare.toFixed(echoShare >= 10 ? 0 : 1)}% · 처치 ${echoKillsTotal}</b></div>
        <div><span>잔향 정밀도</span><b>호출 ${echoActivations} · 평균 ${formatNumber(echoAverage)} · 최고 ${formatNumber(echoBestDamage)}</b></div>
        <div class="phase-rift-recap"><span>위상 균열</span><b>발동 ${phaseRiftProcs}회 · 추가 피해 ${formatNumber(phaseRiftBonusDamage)}</b></div>
      </div>`;
  }

  function calculateCorePayout(multiplier = 1) {
    if (!player) return 0;
    const sector = Math.max(1, currentWave?.number || 1);
    const firstRecovery = saveData.totalCores === 0 ? 4 : 0;
    const base = 5 + firstRecovery
      + Math.floor(kills / 7)
      + Math.max(0, sector - 1) * 5
      + Math.floor(gameTime / 32)
      + elitesKilled * 2
      + bossesKilled * 15
      + runCores
      + Math.max(0, sector - 6) * 4;
    const progressionMultiplier = 1 + (player.coreGain || 0);
    return Math.max(1, Math.floor(base * progressionMultiplier * multiplier));
  }

  function settleRun(multiplier = 1) {
    if (runSettled) return lastCorePayout;
    lastCorePayout = calculateCorePayout(multiplier);
    runSettled = true;
    saveData.cores += lastCorePayout;
    saveData.totalCores += lastCorePayout;
    saveData.bestScore = Math.max(saveData.bestScore, Math.floor(score));
    saveData.bestTime = Math.max(saveData.bestTime, gameTime);
    saveData.bestSector = Math.max(saveData.bestSector || 1, currentWave?.number || 1);
    saveJSON(SAVE_KEY, saveData);
    refreshMenuStats();
    return lastCorePayout;
  }

  function restartRun() {
    if (player && !runSettled) settleRun(0.5);
    startGame();
  }

  function archiveRun() {
    if (gameState !== 'victory') return;
    settleRun(1.1);
    returnToMenu();
  }

  function openMetaFromResult() {
    returnToMenu();
    openMetaScreen();
  }

  function updateHUD(dt = FIXED_DT, force = false) {
    if (!player) return;
    hudAccumulator += dt;
    if (!force && hudAccumulator < 0.1) return;
    hudAccumulator = 0;
    const hpRatio = clamp(player.hp / Math.max(1, player.maxHp), 0, 1);
    const shieldRatio = clamp(player.shield / Math.max(1, player.maxShield), 0, 1);
    const xpRatio = clamp(player.xp / Math.max(1, player.xpNext), 0, 1);
    UI.hpBar.style.width = `${hpRatio * 100}%`;
    UI.shieldBar.style.width = `${shieldRatio * 100}%`;
    UI.xpBar.style.width = `${xpRatio * 100}%`;
    UI.hpText.textContent = `${Math.ceil(player.hp)}`;
    UI.shieldText.textContent = `${Math.ceil(player.shield)}`;
    UI.levelText.textContent = `L${player.level}`;
    UI.runClock.textContent = formatTime(gameTime);
    UI.scoreText.textContent = formatNumber(score);
    UI.killText.textContent = formatNumber(kills);
    UI.bestText.textContent = formatNumber(Math.max(saveData.bestScore, score));
    UI.runCoreText.textContent = formatNumber(runCores);

    const vitals = $('.hud-vitals');
    const shieldResource = $('.shield-resource');
    vitals?.classList.toggle('critical', hpRatio <= 0.35);
    vitals?.classList.toggle('shield-broken', player.maxShield > 0 && shieldRatio <= 0.02);
    shieldResource?.classList.toggle('depleted', player.maxShield > 0 && shieldRatio <= 0.02);
    vitals?.setAttribute('aria-label', `생명 ${Math.ceil(player.hp)}/${Math.ceil(player.maxHp)}, 보호막 ${Math.ceil(player.shield)}/${Math.ceil(player.maxShield)}`);

    if (currentWave) {
      UI.waveModifier.textContent = currentWave.modifier?.name || '기본 규칙';
      UI.routeText.innerHTML = `${uiIcon('route')}<span>경로 · ${escapeHtml(currentWave.route?.name || '기본 진입')}</span>`;
      UI.threatText.textContent = `위협 ${Math.round((currentWave.threat || 1) * 100)}%`;
    }
    const dashRatio = 1 - player.dashCooldown / player.dashCooldownMax;
    const echoRatio = 1 - player.echoCooldown / player.echoCooldownMax;
    UI.dashCooldown.style.width = `${clamp(dashRatio * 100, 0, 100)}%`;
    UI.echoCooldown.style.width = `${clamp(echoRatio * 100, 0, 100)}%`;
    const dashCooling = player.dashCooldown > 0.01;
    const echoCooling = player.echoCooldown > 0.01;
    UI.dashAbility.classList.toggle('cooling', dashCooling);
    UI.echoAbility.classList.toggle('cooling', echoCooling);
    UI.dashAbility.classList.toggle('ready', !dashCooling);
    UI.echoAbility.classList.toggle('ready', !echoCooling);
    const dashState = $('.ability-state', UI.dashAbility);
    const echoState = $('.ability-state', UI.echoAbility);
    if (dashState) dashState.textContent = dashCooling ? `${player.dashCooldown.toFixed(1)}초` : '준비';
    if (echoState) echoState.textContent = echoCooling ? `${player.echoCooldown.toFixed(1)}초` : '준비';
    UI.dashAbility.setAttribute('aria-label', `위상 대시 ${dashCooling ? `${player.dashCooldown.toFixed(1)}초 후 준비` : '사용 가능'}`);
    UI.echoAbility.setAttribute('aria-label', `시간 잔향 ${echoCooling ? `${player.echoCooldown.toFixed(1)}초 후 준비` : '사용 가능'}`);
    updateEchoRecorderHUD();

    if (settings.showPerf) {
      const totalBullets = arrays.enemyBullets.length + arrays.playerBullets.length;
      const qualityMode = settings.graphicsMode === 'auto'
        ? (autoQualityLocked ? '자동 고정' : '자동 · 하향만')
        : '수동 고정';
      UI.perfHud.textContent = `FPS ${measuredFps.toFixed(0)}  ·  렌더 ${view.dpr.toFixed(2)}x
적 ${arrays.enemies.length}  ·  탄환 ${totalBullets}
입자 ${arrays.particles.length}  ·  ${QUALITY_LABELS[quality]} (${qualityMode})
긴 프레임 감지 ${longFrameCount}`;
    }
  }

  function updateGame(dt) {
    if (gameState !== 'playing' || !player) return;
    input.updateGamepad();
    if (bossCutsceneActive()) {
      updateBossCutscene(dt);
      updateEffects(dt);
      updateCamera(dt);
      updateHUD(dt, true);
      input.endStep();
      return;
    }
    gameTime += dt;
    updatePlayer(dt);
    updateEchoes(dt);
    updateEchoTutorial(dt);
    updateEnemies(dt);
    enemyGrid.rebuild(arrays.enemies);
    updateLasers(dt);
    updatePlayerBullets(dt);
    updateEnemyBullets(dt);
    updatePickups(dt);
    resolveEnemyDeaths();
    updateEffects(dt);
    updateEchoReports();
    updateWave(dt);
    updateCamera(dt);
    updateHUD(dt);
    input.endStep();
    if (pendingLevelUps > 0 && gameState === 'playing') openUpgradeScreen();
  }

  function pauseGame(fromVisibility = false) {
    if (gameState !== 'playing') return;
    input.cancelEcho('pause', false);
    input.echoRequestQueued = null;
    gameState = 'paused';
    updateTouchControlsVisibility();
    if (UI.pauseRoute) {
      const routeName = currentWave?.route?.name || '기본 진입';
      const qualityState = settings.graphicsMode === 'auto' ? `${QUALITY_LABELS[quality]} · 런 도중 상향 없음` : `${QUALITY_LABELS[quality]} · 수동 고정`;
      UI.pauseRoute.textContent = `현재 경로 · ${routeName} · 그래픽 ${qualityState}`;
    }
    updateBuildSummary();
    if (UI.pauseEcho) {
      const share = runDamageTotal > 0 ? echoDamageTotal / runDamageTotal * 100 : 0;
      const average = echoActivations > 0 ? echoDamageTotal / echoActivations : 0;
      const latest = lastEchoReport ? ` · 최근 ${formatNumber(lastEchoReport.damage)} 피해 / ${lastEchoReport.kills}처치` : '';
      UI.pauseEcho.textContent = echoActivations > 0
        ? `잔향 분석 · 호출 ${echoActivations} · 전체 피해 ${share.toFixed(share >= 10 ? 0 : 1)}% · 호출당 ${formatNumber(average)} · 균열 ${phaseRiftProcs}회 / +${formatNumber(phaseRiftBonusDamage)}${latest}`
        : '잔향 분석 · 아직 호출 기록이 없습니다.';
    }
    showScreen(UI.pause);
    audio.setGameState(false);
    releaseWakeLock();
    if (fromVisibility) showToast('창이 비활성화되어 시간선을 자동 정지했습니다', 1800);
  }

  function resumeGame() {
    if (gameState !== 'paused') return;
    gameState = 'playing';
    showScreen(null);
    input.reset();
    updateTouchControlsVisibility();
    audio.init().then(() => audio.setGameState(true));
    requestWakeLock();
  }

  function calculateRunGrade(victory = false) {
    const sector = Math.max(1, currentWave?.number || 1);
    const level = Math.max(1, player?.level || 1);
    let points = sector * 9 + Math.min(24, kills / 7) + Math.min(18, level * 1.7) + bossesKilled * 12 + Math.min(12, elitesKilled * 0.8);
    if (victory) points += 24;
    if (endlessMode && sector > 6) points += Math.min(28, (sector - 6) * 4);
    if (points >= 112) return 'S+';
    if (points >= 92) return 'S';
    if (points >= 72) return 'A';
    if (points >= 54) return 'B';
    if (points >= 36) return 'C';
    return 'D';
  }

  function endGame() {
    if (gameState === 'gameover') return;
    input.cancelEcho('gameover', false);
    input.echoRequestQueued = null;
    const isNewBest = score > saveData.bestScore;
    gameState = 'gameover';
    document.body.classList.remove('game-running', 'choice-open', 'boss-intro-active', 'boss-materializing');
    audio.setGameState(false);
    audio.defeat();
    releaseWakeLock();
    UI.touch.classList.add('hidden');
    UI.hud.classList.add('hidden');
    UI.abilityHud.classList.add('hidden');
    UI.bossHud.classList.add('hidden');
    hideWaveBanner();
    document.body.classList.remove('boss-intro-active');
    UI.toast.classList.add('hidden');
    UI.tutorialCoach?.classList.add('hidden');
    UI.replayVerified?.classList.add('hidden');
    UI.syncSuccess?.classList.add('hidden');
    UI.echoReport?.classList.add('hidden');
    const earned = settleRun(1);
    appendRunHistory('death');
    $('#finalScore').textContent = formatNumber(score);
    $('#finalTime').textContent = formatTime(gameTime);
    $('#finalWave').textContent = `SECTOR ${String(currentWave?.number || 1).padStart(2, '0')}`;
    $('#finalKills').textContent = formatNumber(kills);
    $('#earnedCores').textContent = formatNumber(earned);
    $('#gameOverCoreBalance').textContent = formatNumber(saveData.cores);
    if (UI.gameOverGrade) UI.gameOverGrade.textContent = calculateRunGrade(false);
    $('#newBest').classList.toggle('hidden', !isNewBest);
    const quotes = [
      '“실패한 시간선도 다음 선택의 기억이 된다.”',
      '“이번 죽음은 패배가 아니라 다음 몸의 설계도다.”',
      '“무너진 궤적에서 코어를 회수했다. 같은 출발선은 두 번 오지 않는다.”',
      '“과거는 판결문이 아니라 데이터다. 이번에는 숫자까지 남았다.”',
    ];
    $('#deathQuote').textContent = pick(quotes);
    const gameOverRecap = $('#gameOverRecap');
    if (gameOverRecap) gameOverRecap.innerHTML = buildRunRecap();
    showScreen(UI.gameOver);
    refreshMenuStats();
  }

  function showVictory() {
    if (gameState !== 'playing') return;
    input.cancelEcho('victory', false);
    input.echoRequestQueued = null;
    gameState = 'victory';
    document.body.classList.remove('game-running', 'choice-open', 'boss-intro-active', 'boss-materializing');
    audio.setGameState(false);
    audio.victory();
    releaseWakeLock();
    UI.touch.classList.add('hidden');
    UI.hud.classList.add('hidden');
    UI.abilityHud.classList.add('hidden');
    UI.bossHud.classList.add('hidden');
    hideWaveBanner();
    document.body.classList.remove('boss-intro-active');
    UI.toast.classList.add('hidden');
    UI.tutorialCoach?.classList.add('hidden');
    UI.replayVerified?.classList.add('hidden');
    UI.syncSuccess?.classList.add('hidden');
    UI.echoReport?.classList.add('hidden');
    saveData.wins++;
    appendRunHistory('win');
    saveData.bestScore = Math.max(saveData.bestScore, Math.floor(score));
    saveData.bestTime = Math.max(saveData.bestTime, gameTime);
    saveData.bestSector = Math.max(saveData.bestSector || 1, 6);
    saveJSON(SAVE_KEY, saveData);
    $('#victoryScore').textContent = formatNumber(score);
    $('#victoryTime').textContent = formatTime(gameTime);
    $('#victoryKills').textContent = formatNumber(kills);
    $('#victoryLevel').textContent = `${player.level}`;
    $('#victoryEarnedCores').textContent = formatNumber(calculateCorePayout(1.1));
    if (UI.victoryGrade) UI.victoryGrade.textContent = calculateRunGrade(true);
    const victoryRecap = $('#victoryRecap');
    if (victoryRecap) victoryRecap.innerHTML = buildRunRecap();
    showScreen(UI.victory);
    refreshMenuStats();
  }

  function continueEndless() {
    if (gameState !== 'victory') return;
    endlessMode = true;
    gameState = 'playing';
    document.body.classList.add('game-running');
    showScreen(null);
    UI.hud.classList.remove('hidden');
    UI.abilityHud.classList.remove('hidden');
    updateTouchControlsVisibility();
    player.hp = Math.min(player.maxHp, Math.max(player.hp, player.maxHp * 0.65));
    player.shield = player.maxShield;
    player.invuln = 1.5;
    player.rerolls += 1;
    arrays.enemies.length = 0;
    arrays.lasers.length = 0;
    while (arrays.enemyBullets.length) recycleEnemyBullet(arrays.enemyBullets.length - 1);
    startWave(7, null);
    audio.init().then(() => audio.setGameState(true));
    requestWakeLock();
    showToast('끝없는 시간선 · 보상은 누적되고 난도는 기하급수적으로 상승합니다', 3200);
  }

  function returnToMenu() {
    if (player && !runSettled && ['playing', 'paused', 'victory', 'upgrade', 'route'].includes(gameState)) settleRun(gameState === 'victory' ? 1.1 : 0.5);
    gameState = 'menu';
    document.body.classList.remove('game-running', 'choice-open', 'boss-intro-active', 'boss-materializing');
    player = null;
    currentWave = null;
    clearWorld();
    input.reset();
    camera.x = WORLD.w / 2;
    camera.y = WORLD.h / 2;
    UI.hud.classList.add('hidden');
    UI.abilityHud.classList.add('hidden');
    UI.bossHud.classList.add('hidden');
    UI.touch.classList.add('hidden');
    UI.waveBanner.classList.add('hidden');
    UI.toast.classList.add('hidden');
    UI.tutorialCoach?.classList.add('hidden');
    UI.replayVerified?.classList.add('hidden');
    UI.syncSuccess?.classList.add('hidden');
    UI.echoReport?.classList.add('hidden');
    tutorial = null;
    pendingRouteChoices = [];
    pendingRouteWave = 0;
    pendingRouteBaseModifier = null;
    pendingRouteForecasts = Object.create(null);
    echoReports.length = 0;
    deferredEchoReports.length = 0;
    lastEchoReport = null;
    clearTimeout(echoReportTimer);
    echoReportTimer = null;
    UI.routeText.textContent = '경로 · 기본 진입';
    audio.setGameState(false);
    releaseWakeLock();
    refreshMenuStats();
    showScreen(UI.menu);
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------
  function visible(x, y, radius = 80) {
    return x > camera.x - view.w / 2 - radius && x < camera.x + view.w / 2 + radius && y > camera.y - view.h / 2 - radius && y < camera.y + view.h / 2 + radius;
  }

  function buildGlowSprite() {
    if (renderCache.glowBase) return renderCache.glowBase;
    const size = 96;
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = size;
    const g = sprite.getContext('2d');
    const gradient = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,0.92)');
    gradient.addColorStop(0.32, 'rgba(255,255,255,0.42)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gradient;
    g.fillRect(0, 0, size, size);
    renderCache.glowBase = sprite;
    return sprite;
  }

  function glowSpriteForColor(color) {
    const key = String(color || '#ffffff');
    const cached = renderCache.glowSprites.get(key);
    if (cached) return cached;
    if (renderCache.glowSprites.size > 48) renderCache.glowSprites.clear();
    const base = buildGlowSprite();
    const sprite = document.createElement('canvas');
    sprite.width = base.width;
    sprite.height = base.height;
    const g = sprite.getContext('2d');
    g.drawImage(base, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = key;
    g.fillRect(0, 0, sprite.width, sprite.height);
    renderCache.glowSprites.set(key, sprite);
    return sprite;
  }

  function setGlow(color, blur = 12) {
    const dense = arrays.enemyBullets.length + arrays.playerBullets.length > 620;
    activeGlow = (quality === 0 || settings.reducedMotion || dense)
      ? null
      : { color, blur: Math.max(0, Number(blur) || 0) };
    return activeGlow;
  }

  function clearGlow() {
    activeGlow = null;
  }

  function drawGlowSprite(x, y, radius, color = activeGlow?.color, alpha = 0.48) {
    if (quality === 0 || settings.reducedMotion || !color || radius <= 0) return false;
    const sprite = glowSpriteForColor(color);
    const scale = quality === 2 ? 6.2 : 4.4;
    const size = clamp(radius * scale, 10, 104);
    const previousAlpha = ctx.globalAlpha;
    const previousComposite = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
    ctx.globalAlpha = previousAlpha;
    ctx.globalCompositeOperation = previousComposite;
    frameGlowPasses += 1;
    totalGlowPasses += 1;
    return true;
  }

  function tracePolygon(sides, radius, rotation = 0, alternate = 1) {
    ctx.beginPath();
    for (let i = 0; i < sides; i++) {
      const r = i % 2 ? radius * alternate : radius;
      const a = rotation + i * TAU / sides;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function drawBackground(time) {
    ctx.fillStyle = renderCache.background || '#050817';
    ctx.fillRect(0, 0, view.w, view.h);

    ctx.save();
    const starStep = quality === 0 ? 3 : quality === 1 ? 2 : 1;
    for (let starIndex = 0; starIndex < stars.length; starIndex += starStep) {
      const star = stars[starIndex];
      let sx = star.x - camera.x * star.depth + view.w / 2;
      let sy = star.y - camera.y * star.depth + view.h / 2;
      sx = ((sx % (view.w + 40)) + view.w + 40) % (view.w + 40) - 20;
      sy = ((sy % (view.h + 40)) + view.h + 40) % (view.h + 40) - 20;
      const twinkle = 0.72 + Math.sin(time * (0.6 + star.depth) + star.twinkle) * 0.28;
      ctx.globalAlpha = star.alpha * twinkle;
      ctx.fillStyle = star.size > 1.45 ? '#bdeeff' : '#718aa7';
      ctx.fillRect(sx, sy, star.size, star.size);
    }
    ctx.restore();

    if (gameState === 'menu' || gameState === 'gameover' || gameState === 'victory') {
      const cx = view.w * 0.5;
      const cy = view.h * 0.5;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const radius = 180 + i * 52 + Math.sin(time * (0.34 + i * 0.03) + i) * 12;
        ctx.globalAlpha = 0.055 - i * 0.006;
        ctx.strokeStyle = i % 2 ? '#8e65ff' : '#4edfff';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4 + i * 2, 16 + i * 4]);
        ctx.lineDashOffset = time * (i % 2 ? -18 : 15);
        ctx.beginPath();
        ctx.ellipse(0, 0, radius, radius * 0.42, time * 0.07 + i * 0.36, 0, TAU);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      const core = ctx.createRadialGradient(0, 0, 0, 0, 0, 220);
      core.addColorStop(0, 'rgba(92,232,255,0.12)');
      core.addColorStop(0.28, 'rgba(108,80,255,0.05)');
      core.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = core;
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 220, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawArena(time) {
    if (quality > 0 && !settings.reducedMotion) {
      const step = quality === 1 ? 2 : 1;
      for (let i = 0; i < nebulae.length; i += step) {
        const nebula = nebulae[i];
        if (!visible(nebula.x, nebula.y, nebula.radius)) continue;
        const sprite = renderCache.nebulaSprites.get(nebula.color);
        if (sprite) ctx.drawImage(sprite, nebula.x - nebula.radius, nebula.y - nebula.radius, nebula.radius * 2, nebula.radius * 2);
      }
    }

    const grid = 100;
    const left = Math.max(WORLD.margin, Math.floor((camera.x - view.w / 2 - 100) / grid) * grid);
    const right = Math.min(WORLD.w - WORLD.margin, camera.x + view.w / 2 + 100);
    const top = Math.max(WORLD.margin, Math.floor((camera.y - view.h / 2 - 100) / grid) * grid);
    const bottom = Math.min(WORLD.h - WORLD.margin, camera.y + view.h / 2 + 100);
    ctx.save();
    ctx.lineWidth = 1;
    for (let x = left; x <= right; x += grid) {
      const major = x % 500 === 0;
      ctx.strokeStyle = major ? 'rgba(96,176,224,0.105)' : 'rgba(96,176,224,0.036)';
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
      ctx.stroke();
    }
    for (let y = top; y <= bottom; y += grid) {
      const major = y % 500 === 0;
      ctx.strokeStyle = major ? 'rgba(96,176,224,0.105)' : 'rgba(96,176,224,0.036)';
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(90,222,255,0.22)';
    ctx.lineWidth = 2;
    ctx.setLineDash([18, 12]);
    ctx.lineDashOffset = -time * 10;
    ctx.strokeRect(WORLD.margin, WORLD.margin, WORLD.w - WORLD.margin * 2, WORLD.h - WORLD.margin * 2);
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(130,104,255,0.16)';
    ctx.lineWidth = 1;
    ctx.strokeRect(WORLD.margin + 10, WORLD.margin + 10, WORLD.w - (WORLD.margin + 10) * 2, WORLD.h - (WORLD.margin + 10) * 2);

    const corner = 44;
    ctx.strokeStyle = 'rgba(92,232,255,0.45)';
    ctx.lineWidth = 3;
    const x1 = WORLD.margin, x2 = WORLD.w - WORLD.margin, y1 = WORLD.margin, y2 = WORLD.h - WORLD.margin;
    for (const [x, y, sx, sy] of [[x1,y1,1,1],[x2,y1,-1,1],[x1,y2,1,-1],[x2,y2,-1,-1]]) {
      ctx.beginPath();
      ctx.moveTo(x, y + sy * corner);
      ctx.lineTo(x, y);
      ctx.lineTo(x + sx * corner, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawShockwaves() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const s of arrays.shockwaves) {
      if (!visible(s.x, s.y, s.radius + 20)) continue;
      const alpha = clamp(s.life / s.maxLife, 0, 1);
      ctx.globalAlpha = alpha * 0.72;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width * (0.5 + alpha);
      setGlow(s.color, 14);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, TAU);
      ctx.stroke();
    }
    clearGlow();
    ctx.restore();
  }

  function drawPickups(time) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of arrays.pickups) {
      if (!visible(p.x, p.y, 30)) continue;
      const pulse = 1 + Math.sin(p.age + time * 4) * 0.14;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.age * 0.55);
      ctx.globalAlpha = clamp(p.life, 0, 1) * 0.92;
      ctx.fillStyle = '#b47aff';
      setGlow('#aa6cff', 15);
      tracePolygon(4, p.radius * pulse, Math.PI / 4);
      ctx.fill();
      ctx.fillStyle = '#e3c5ff';
      ctx.globalAlpha *= 0.85;
      tracePolygon(4, p.radius * 0.38 * pulse, Math.PI / 4);
      ctx.fill();
      ctx.restore();
    }
    clearGlow();
    ctx.restore();
  }

  function drawLasers() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const laser of arrays.lasers) {
      if (laser.x === undefined) continue;
      const x1 = laser.x - Math.cos(laser.angle) * 1700;
      const y1 = laser.y - Math.sin(laser.angle) * 1700;
      const x2 = laser.x + Math.cos(laser.angle) * 1700;
      const y2 = laser.y + Math.sin(laser.angle) * 1700;
      if (laser.telegraph > 0) {
        const pulse = 0.28 + Math.sin(laser.telegraph * 26) * 0.12;
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = '#ff80db';
        ctx.lineWidth = 2;
        ctx.setLineDash([15, 12]);
        ctx.lineDashOffset = laser.telegraph * 60;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        const active = laser.active > 0;
        const alpha = active ? 0.72 : clamp(laser.fade / 0.36, 0, 1) * 0.35;
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = '#ff4fc9';
        ctx.lineWidth = active ? laser.width * 2.8 : laser.width;
        setGlow('#ff4fc9', active ? 36 : 18);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.strokeStyle = '#fff0fb';
        ctx.globalAlpha = active ? 0.9 : alpha;
        ctx.lineWidth = active ? 5 : 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
    ctx.setLineDash([]);
    clearGlow();
    ctx.restore();
  }

  // Append an owner-marker shape to the CURRENT path (no per-bullet save/restore or ctx.rotate,
  // so shaped heads keep the same batched single-fill draw budget as plain dots).
  // Local geometry points along +x and is rotated into world space via precomputed cos/sin.
  function appendArrowHead(px, py, ca, sa, r) {
    ctx.moveTo(px + (r * 1.6) * ca, py + (r * 1.6) * sa);
    ctx.lineTo(px - r * ca + (r * 0.7) * sa, py - r * sa - (r * 0.7) * ca);
    ctx.lineTo(px - (r * 0.45) * ca, py - (r * 0.45) * sa);
    ctx.lineTo(px - r * ca - (r * 0.7) * sa, py - r * sa + (r * 0.7) * ca);
    ctx.closePath();
  }
  function appendDiamondHead(px, py, ca, sa, r) {
    ctx.moveTo(px + (r * 1.35) * ca, py + (r * 1.35) * sa);
    ctx.lineTo(px + r * sa, py - r * ca);
    ctx.lineTo(px - (r * 1.35) * ca, py - (r * 1.35) * sa);
    ctx.lineTo(px - r * sa, py + r * ca);
    ctx.closePath();
  }

  function drawPlayerBullets() {
    clearRenderGroups(renderGroups.player);
    const palette = activeProjectilePalette();
    const usePalette = settings.combatPalette !== 'default';
    const shapes = settings.projectileShapes;
    for (const b of arrays.playerBullets) {
      if (!visible(b.x, b.y, 30)) continue;
      const owner = b.fromEcho ? 'echo' : 'main';
      const color = usePalette ? palette[owner] : b.color;
      addRenderGroup(renderGroups.player, `${color}|${b.crit ? 1 : 0}|${b.fromEcho ? 1 : b.fromDrone ? 2 : 0}`, b);
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const group of renderGroups.player.values()) {
      if (!group.length) continue;
      const sample = group[0];
      const owner = sample.fromEcho ? 'echo' : 'main';
      const color = usePalette ? palette[owner] : sample.color;
      ctx.strokeStyle = color;
      ctx.globalAlpha = sample.fromEcho ? 0.56 : sample.fromDrone ? 0.7 : 0.76;
      ctx.lineWidth = Math.max(1.3, sample.radius * (sample.crit ? 1.05 : 0.75));
      setGlow(color, sample.crit ? 14 : 8);
      for (const b of group) {
        const glowRadius = Math.max(2.8, b.radius * (b.crit ? 2.8 : 2.1));
        drawGlowSprite(b.x, b.y, glowRadius, color, b.crit ? 0.5 : sample.fromEcho ? 0.34 : 0.4);
      }
      ctx.beginPath();
      for (const b of group) { ctx.moveTo(b.prevX, b.prevY); ctx.lineTo(b.x - b.vx * 0.012, b.y - b.vy * 0.012); }
      ctx.stroke();
      clearGlow();
      if (shapes) {
        // Echo bullets read as diamonds, current-body/drone bullets as arrows — colour-independent ownership.
        ctx.globalAlpha = 0.96;
        ctx.fillStyle = sample.crit ? '#fff4b0' : (usePalette ? color : '#ecfeff');
        ctx.beginPath();
        if (sample.fromEcho) {
          for (const b of group) {
            const a = Math.atan2(b.vy, b.vx); const r = Math.max(2.4, b.radius * (b.crit ? 1.02 : 0.82));
            appendDiamondHead(b.x, b.y, Math.cos(a), Math.sin(a), r);
          }
        } else {
          for (const b of group) {
            const a = Math.atan2(b.vy, b.vx); const r = Math.max(2.4, b.radius * (b.crit ? 1.02 : 0.82));
            appendArrowHead(b.x, b.y, Math.cos(a), Math.sin(a), r);
          }
        }
        ctx.fill();
      } else {
        ctx.fillStyle = sample.crit ? '#fff4b0' : '#ecfeff';
        ctx.globalAlpha = 0.94;
        ctx.beginPath();
        for (const b of group) { ctx.moveTo(b.x + b.radius, b.y); ctx.arc(b.x, b.y, b.radius * (b.crit ? 0.88 : 0.6), 0, TAU); }
        ctx.fill();
      }
    }
    clearGlow();
    ctx.restore();
  }

  function drawEnemyBullets() {
    clearRenderGroups(renderGroups.enemy);
    const palette = activeProjectilePalette();
    const usePalette = settings.combatPalette !== 'default';
    const shapes = settings.projectileShapes;
    for (const b of arrays.enemyBullets) {
      if (!visible(b.x, b.y, 30)) continue;
      const color = usePalette ? palette.enemy : (settings.highContrast ? '#ff6b91' : b.color);
      addRenderGroup(renderGroups.enemy, color, b);
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const [color, group] of renderGroups.enemy) {
      if (!group.length) continue;
      const sample = group[0];
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.4, sample.radius * 0.65);
      setGlow(color, 9);
      for (const b of group) {
        drawGlowSprite(b.x, b.y, Math.max(3.2, b.radius * 2.5), color, 0.38);
      }
      ctx.beginPath();
      for (const b of group) { ctx.moveTo(b.prevX, b.prevY); ctx.lineTo(b.x, b.y); }
      ctx.stroke();
      clearGlow();
      if (shapes) {
        // Enemy bullets read as hollow rings (vs. solid player heads) — distinct even in greyscale.
        ctx.globalAlpha = 0.95;
        ctx.lineWidth = Math.max(1.4, sample.radius * 0.5);
        ctx.beginPath();
        for (const b of group) { ctx.moveTo(b.x + b.radius, b.y); ctx.arc(b.x, b.y, b.radius, 0, TAU); }
        ctx.stroke();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = (usePalette || settings.highContrast) ? color : '#fff1f5';
        ctx.beginPath();
        for (const b of group) { const r = Math.max(1, b.radius * 0.42); ctx.moveTo(b.x + r, b.y); ctx.arc(b.x, b.y, r, 0, TAU); }
        ctx.fill();
      } else {
        ctx.globalAlpha = 0.94;
        ctx.fillStyle = settings.highContrast ? '#fff1f5' : color;
        ctx.beginPath();
        for (const b of group) { ctx.moveTo(b.x + b.radius, b.y); ctx.arc(b.x, b.y, b.radius, 0, TAU); }
        ctx.fill();
        if (quality > 0) {
          ctx.globalAlpha = 0.82;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          for (const b of group) { const r=Math.max(1,b.radius*0.27); ctx.moveTo(b.x+r,b.y); ctx.arc(b.x,b.y,r,0,TAU); }
          ctx.fill();
        }
      }
    }
    clearGlow();
    ctx.restore();
  }


  function drawRecordedEchoPath(time) {
    if (!settings.echoTrail || !player || gameState !== 'playing') return;
    const recordFrames = Math.max(1, Math.ceil(player.echoRecordSeconds / FIXED_DT));
    const lockedSamples = input.getEchoLockedSamples();
    const samples = lockedSamples || player.history.slice(-recordFrames);
    if (samples.length < 2) return;
    const previewing = input.isEchoPreviewing() && player.echoCooldown <= 0 && samples.length >= Math.min(45, recordFrames);
    const ready = player.echoCooldown <= 0;
    const alpha = previewing ? 0.68 : ready ? 0.18 : 0.075;
    const step = quality === 0 ? 6 : quality === 1 ? 4 : 3;
    ctx.save();
    ctx.globalCompositeOperation = previewing ? 'lighter' : 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = settings.reducedMotion ? alpha * 0.7 : alpha;
    ctx.strokeStyle = previewing ? '#d4a2ff' : '#6edff2';
    ctx.lineWidth = previewing ? 3 : 1.4;
    ctx.setLineDash(previewing ? [9, 6] : [3, 8]);
    ctx.lineDashOffset = previewing && !settings.reducedMotion ? -time * 42 : 0;
    if (previewing) setGlow('#b978ff', 18);
    ctx.beginPath();
    for (let i = 0; i < samples.length; i += step) {
      const sample = samples[i];
      if (i === 0) ctx.moveTo(sample.x, sample.y); else ctx.lineTo(sample.x, sample.y);
    }
    const last = samples[samples.length - 1];
    ctx.lineTo(last.x, last.y);
    ctx.stroke();
    ctx.setLineDash([]);
    clearGlow();

    const markerStep = quality === 0 ? 12 : 8;
    for (let i = 0; i < samples.length; i += markerStep) {
      const sample = samples[i];
      if (!sample.fire && !sample.dash) continue;
      ctx.globalAlpha = previewing ? 0.9 : alpha * 2.3;
      if (sample.fire) {
        ctx.fillStyle = '#cf84ff';
        ctx.beginPath();
        ctx.arc(sample.x, sample.y, previewing ? 3.4 : 2.2, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = '#d7b0ff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sample.x, sample.y);
        ctx.lineTo(sample.x + Math.cos(sample.angle) * (previewing ? 28 : 17), sample.y + Math.sin(sample.angle) * (previewing ? 28 : 17));
        ctx.stroke();
      }
      if (sample.dash) {
        ctx.save();
        ctx.translate(sample.x, sample.y);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#ffd166';
        ctx.fillRect(-3, -3, 6, 6);
        ctx.restore();
      }
    }

    const first = samples[0];
    ctx.globalAlpha = previewing ? 0.95 : alpha * 2;
    ctx.strokeStyle = previewing ? '#f2d8ff' : '#a77ad0';
    ctx.lineWidth = previewing ? 2 : 1;
    ctx.beginPath();
    ctx.arc(first.x, first.y, previewing ? 18 : 10, 0, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(first.x, first.y);
    ctx.lineTo(first.x + Math.cos(first.angle) * (previewing ? 28 : 15), first.y + Math.sin(first.angle) * (previewing ? 28 : 15));
    ctx.stroke();
    if (previewing) {
      const device = resolvedInputDeviceFamily();
      const mode = echoControlModeForDevice(device);
      const releaseLabel = mode === 'toggle'
        ? '다시 눌러 → 이 3초 재현'
        : device === 'gamepad' ? 'B/RB 해제 → 이 3초 재현'
          : device === 'touch' ? '버튼 해제 → 이 3초 재현'
            : 'E 해제 → 이 3초 재현';
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = '#f1dcff';
      ctx.font = '800 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(releaseLabel, first.x, first.y - 29);

      // If the frozen recording starts outside the camera, expose the missing
      // spatial information with an edge marker instead of asking the player
      // to infer where the echo will enter from.
      const firstScreen = worldToScreen(first.x, first.y);
      const margin = 72;
      const outside = firstScreen.x < margin || firstScreen.x > view.w - margin || firstScreen.y < margin || firstScreen.y > view.h - margin;
      if (outside) {
        const cx = view.w / 2;
        const cy = view.h / 2;
        const dx = firstScreen.x - cx;
        const dy = firstScreen.y - cy;
        const scaleX = Math.abs(dx) > 0.001 ? (view.w / 2 - margin) / Math.abs(dx) : Infinity;
        const scaleY = Math.abs(dy) > 0.001 ? (view.h / 2 - margin) / Math.abs(dy) : Infinity;
        const scale = Math.min(scaleX, scaleY);
        const edgeScreenX = cx + dx * scale;
        const edgeScreenY = cy + dy * scale;
        const edgeWorld = screenToWorld(edgeScreenX, edgeScreenY);
        const angle = Math.atan2(dy, dx);
        ctx.save();
        ctx.translate(edgeWorld.x, edgeWorld.y);
        ctx.rotate(angle);
        ctx.globalAlpha = 0.96;
        ctx.fillStyle = '#d9b6ff';
        setGlow('#b978ff', 14);
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-7, -7);
        ctx.lineTo(-3, 0);
        ctx.lineTo(-7, 7);
        ctx.closePath();
        ctx.fill();
        clearGlow();
        ctx.restore();
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = '#f1dcff';
        ctx.font = '900 10px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ECHO START', edgeWorld.x, edgeWorld.y - 18);
      }
    }
    ctx.restore();
  }

  function drawEchoes(time) {
    for (const echo of arrays.echoes) {
      if (!visible(echo.x, echo.y, 90)) continue;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const start = Math.max(0, echo.index - 34);
      ctx.beginPath();
      for (let i = start; i < echo.index && i < echo.samples.length; i++) {
        const s = echo.samples[i];
        if (i === start) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
      }
      ctx.strokeStyle = '#9f6cff';
      ctx.lineWidth = 2;
      ctx.globalAlpha = echo.alpha * 0.28;
      setGlow('#9f6cff', 17);
      ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(echo.x, echo.y);
      ctx.rotate(echo.angle);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = echo.alpha * (0.78 + Math.sin(time * 8 + echo.colorPhase) * 0.14);
      setGlow('#ad74ff', 22);
      ctx.strokeStyle = '#c892ff';
      ctx.fillStyle = 'rgba(154,92,255,0.18)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(21, 0);
      ctx.lineTo(-13, -12);
      ctx.lineTo(-7, 0);
      ctx.lineTo(-13, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#72e8ff';
      ctx.globalAlpha *= 0.72;
      ctx.beginPath();
      ctx.moveTo(-6, -8);
      ctx.lineTo(12, 0);
      ctx.lineTo(-6, 8);
      ctx.stroke();
      clearGlow();
      ctx.restore();
    }
  }

  function drawPhaseRiftMark(enemy, time) {
    if (!enemy || enemy.phaseRiftTime <= 0) return;
    const lifeRatio = clamp(enemy.phaseRiftTime / PHASE_RIFT_DURATION, 0, 1);
    const pulseRatio = clamp((enemy.phaseRiftPulse || 0) / 0.42, 0, 1);
    const baseRadius = enemy.radius + 14;
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.5 + lifeRatio * 0.35;
    ctx.lineWidth = 2.2;
    setGlow('#ffd166', 18);

    ctx.save();
    ctx.rotate(time * 1.9 + enemy.seed);
    ctx.strokeStyle = '#ffd166';
    ctx.setLineDash([11, 7]);
    ctx.lineDashOffset = -time * 32;
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius + Math.sin(time * 5 + enemy.seed) * 2, 0, TAU);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.rotate(-time * 1.45 - enemy.seed * 0.5);
    ctx.strokeStyle = '#b978ff';
    ctx.setLineDash([4, 8]);
    ctx.lineDashOffset = time * 26;
    ctx.beginPath();
    ctx.arc(0, 0, baseRadius + 7, 0, TAU);
    ctx.stroke();
    ctx.restore();

    ctx.setLineDash([]);
    ctx.strokeStyle = '#7fe9ff';
    ctx.globalAlpha *= 0.8;
    for (let i = 0; i < 4; i++) {
      const angle = i * TAU / 4 + time * 0.34;
      const inner = baseRadius - 4;
      const outer = baseRadius + 9;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner);
      ctx.lineTo(Math.cos(angle + 0.16) * outer, Math.sin(angle + 0.16) * outer);
      ctx.stroke();
    }

    if (pulseRatio > 0) {
      ctx.globalAlpha = pulseRatio * 0.78;
      ctx.strokeStyle = '#fff0b0';
      ctx.lineWidth = 3.2 * pulseRatio + 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius + (1 - pulseRatio) * 48, 0, TAU);
      ctx.stroke();
    }
    clearGlow();
    ctx.restore();
  }

  function drawEnemy(enemy, time) {
    if (!visible(enemy.x, enemy.y, enemy.radius + 60)) return;
    const spawnDuration = enemy.type === 'boss' ? 1.5 : enemy.type === 'shard' ? 0.35 : 0.58;
    const spawnProgress = 1 - clamp(enemy.spawnTime / spawnDuration, 0, 1);
    const scale = 0.2 + spawnProgress * 0.8;
    const flash = enemy.hitFlash > 0;

    if (enemy.spawnTime > 0) {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35 + spawnProgress * 0.35;
      ctx.strokeStyle = enemy.type === 'boss' ? '#ff6bd6' : enemy.elite ? enemy.eliteColor : '#8b6cff';
      ctx.lineWidth = enemy.elite ? 2.8 : 2;
      ctx.setLineDash([5, 8]);
      ctx.lineDashOffset = -time * 38;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * (2.6 - spawnProgress * 0.8), 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Elite silhouettes must read immediately, even in a dense bullet field.
    if (enemy.elite && enemy.type !== 'boss' && spawnProgress > 0.15) {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (0.34 + Math.sin(time * 5.5 + enemy.seed) * 0.08) * spawnProgress;
      ctx.strokeStyle = enemy.eliteColor;
      ctx.lineWidth = 2.2;
      setGlow(enemy.eliteColor, 20);
      ctx.setLineDash([7, 8]);
      ctx.lineDashOffset = -time * (enemy.eliteType === 'frenzied' ? 70 : 32);
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius + 10 + Math.sin(time * 3 + enemy.seed) * 2, 0, TAU);
      ctx.stroke();
      ctx.rotate(time * (enemy.eliteType === 'null' ? -0.7 : 0.48) + enemy.seed);
      ctx.setLineDash([]);
      ctx.globalAlpha *= 0.72;
      for (let i = 0; i < 4; i++) {
        ctx.rotate(TAU / 4);
        ctx.beginPath();
        ctx.moveTo(enemy.radius + 12, -3);
        ctx.lineTo(enemy.radius + 20, 0);
        ctx.lineTo(enemy.radius + 12, 3);
        ctx.stroke();
      }
      clearGlow();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.rotate(enemy.angle);
    ctx.scale(scale, scale);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.92 * spawnProgress;

    switch (enemy.type) {
      case 'wisp':
        setGlow(flash ? '#ffffff' : '#ff5d8c', 16);
        ctx.fillStyle = flash ? '#ffffff' : '#ff527e';
        tracePolygon(4, enemy.radius, Math.PI / 4, 0.58);
        ctx.fill();
        ctx.fillStyle = '#ffd8e1';
        ctx.globalAlpha *= 0.85;
        ctx.beginPath();
        ctx.arc(2, 0, enemy.radius * 0.28, 0, TAU);
        ctx.fill();
        break;
      case 'shard':
        setGlow(flash ? '#ffffff' : '#ff7b9c', 12);
        ctx.fillStyle = flash ? '#ffffff' : '#ff6f92';
        tracePolygon(3, enemy.radius * 1.2, 0);
        ctx.fill();
        break;
      case 'gunner':
        setGlow(flash ? '#ffffff' : '#d05dff', 17);
        ctx.strokeStyle = flash ? '#ffffff' : '#d477ff';
        ctx.fillStyle = flash ? '#ffffff' : 'rgba(164,73,220,0.42)';
        ctx.lineWidth = 2.2;
        tracePolygon(6, enemy.radius, Math.PI / 6);
        ctx.fill(); ctx.stroke();
        ctx.rotate(-enemy.angle + enemy.age * 0.7);
        ctx.globalAlpha *= 0.55;
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius * 1.3, 0, TAU);
        ctx.stroke();
        ctx.globalAlpha = 0.9 * spawnProgress;
        ctx.fillStyle = '#f2c9ff';
        ctx.beginPath();
        ctx.arc(0, 0, 4.2, 0, TAU);
        ctx.fill();
        break;
      case 'charger': {
        const telegraph = enemy.state === 'telegraph';
        setGlow(flash ? '#ffffff' : '#ffc94d', telegraph ? 26 : 17);
        ctx.strokeStyle = flash ? '#ffffff' : telegraph ? '#fff0a3' : '#ffbd42';
        ctx.fillStyle = flash ? '#ffffff' : 'rgba(255,175,43,0.32)';
        ctx.lineWidth = telegraph ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(enemy.radius * 1.25, 0);
        ctx.lineTo(-enemy.radius * 0.8, -enemy.radius * 0.72);
        ctx.lineTo(-enemy.radius * 0.38, 0);
        ctx.lineTo(-enemy.radius * 0.8, enemy.radius * 0.72);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        if (telegraph) {
          ctx.globalAlpha = 0.32 + Math.sin(time * 24) * 0.15;
          ctx.strokeStyle = '#ffd86a';
          ctx.beginPath();
          ctx.moveTo(enemy.radius, 0);
          ctx.lineTo(enemy.radius + 170, 0);
          ctx.stroke();
        }
        break;
      }
      case 'splitter':
        setGlow(flash ? '#ffffff' : '#64eaa1', 20);
        ctx.fillStyle = flash ? '#ffffff' : 'rgba(62,202,122,0.34)';
        ctx.strokeStyle = flash ? '#ffffff' : '#74f0ad';
        ctx.lineWidth = 2.4;
        tracePolygon(12, enemy.radius, enemy.age * 0.18, 0.76);
        ctx.fill(); ctx.stroke();
        ctx.rotate(-enemy.angle - enemy.age * 0.4);
        ctx.globalAlpha *= 0.62;
        tracePolygon(6, enemy.radius * 0.58, 0, 0.7);
        ctx.stroke();
        ctx.fillStyle = '#ddffeb';
        ctx.globalAlpha = 0.86 * spawnProgress;
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, TAU);
        ctx.fill();
        break;
      case 'orbiter':
        setGlow(flash ? '#ffffff' : '#8b6cff', 20);
        ctx.strokeStyle = flash ? '#ffffff' : '#a878ff';
        ctx.fillStyle = flash ? '#ffffff' : 'rgba(112,72,226,0.28)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius, 0, TAU);
        ctx.fill(); ctx.stroke();
        ctx.rotate(-enemy.angle + enemy.age * 1.5);
        for (let i = 0; i < 3; i++) {
          const a = i * TAU / 3;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * enemy.radius * 1.35, Math.sin(a) * enemy.radius * 1.35, 3.2, 0, TAU);
          ctx.fillStyle = '#d7c2ff';
          ctx.fill();
        }
        break;
      case 'boss':
        drawBoss(enemy, time, flash, spawnProgress);
        break;
    }
    clearGlow();
    ctx.restore();

    if (spawnProgress >= 0.9) drawPhaseRiftMark(enemy, time);

    if (spawnProgress >= 0.9 && !enemy.trainingDummy && enemy.type !== 'boss') {
      let warningRatio = 0;
      let warningColor = '#ff7aa4';
      if (enemy.type === 'gunner' && enemy.shootTimer > 0 && enemy.shootTimer < 0.34) {
        warningRatio = 1 - enemy.shootTimer / 0.34;
        warningColor = '#e39aff';
      } else if (enemy.type === 'orbiter' && enemy.shootTimer > 0 && enemy.shootTimer < 0.38) {
        warningRatio = 1 - enemy.shootTimer / 0.38;
        warningColor = '#b894ff';
      } else if (enemy.type === 'splitter' && enemy.stateTimer > 0 && enemy.stateTimer < 0.58) {
        warningRatio = 1 - enemy.stateTimer / 0.58;
        warningColor = '#7ff0ad';
      }
      if (warningRatio > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.35 + warningRatio * 0.55;
        ctx.strokeStyle = warningColor;
        ctx.lineWidth = 1.5 + warningRatio * 1.5;
        setGlow(warningColor, 13);
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius + 18 - warningRatio * 8, 0, TAU);
        ctx.stroke();
        const aim = Math.atan2(player.y - enemy.y, player.x - enemy.x);
        ctx.globalAlpha *= 0.52;
        ctx.beginPath();
        ctx.moveTo(enemy.x + Math.cos(aim) * (enemy.radius + 5), enemy.y + Math.sin(aim) * (enemy.radius + 5));
        ctx.lineTo(enemy.x + Math.cos(aim) * (enemy.radius + 54), enemy.y + Math.sin(aim) * (enemy.radius + 54));
        ctx.stroke();
        clearGlow();
        ctx.restore();
      }
    }

    if (enemy.trainingDummy) {
      const phaseEcho = enemy.trainingRole === 'echo';
      const phasePresent = enemy.trainingRole === 'present';
      const phaseProof = enemy.trainingRole === 'proof';
      const phaseColor = phaseEcho ? '#c47cff' : phasePresent ? '#63eaff' : phaseProof ? '#ffd166' : enemy.trainingHit ? '#8af2c7' : '#8adfff';
      const phaseLabel = tutorial?.syncSuccess && (phaseEcho || phasePresent)
        ? 'SYNC · 동기화 완료'
        : phaseEcho ? 'ECHO ONLY · 잔향 전용'
          : phasePresent ? 'NOW ONLY · 현재 전용'
            : phaseProof ? (tutorial?.replayHit ? 'REPLAY HIT · 재현 적중' : 'REPLAY TARGET · 재현 확인')
              : enemy.trainingHit ? 'HIT · 기록됨' : '훈련 표적';
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = phaseColor;
      ctx.font = '900 10px Inter, system-ui, sans-serif';
      setGlow(phaseColor, phaseEcho || phasePresent || phaseProof ? 10 : 6);
      const compactPortraitLabel = view.w <= 520 && view.h > view.w && (phaseEcho || phasePresent);
      const phaseLabelY = compactPortraitLabel ? enemy.y + enemy.radius + 21 : enemy.y - enemy.radius - 22;
      ctx.fillText(phaseLabel, enemy.x, phaseLabelY);
      ctx.strokeStyle = phaseColor;
      ctx.globalAlpha = 0.68;
      ctx.lineWidth = phaseEcho || phasePresent || phaseProof ? 2.2 : 1;
      ctx.setLineDash(phaseEcho ? [3, 4] : phasePresent ? [9, 4] : phaseProof ? [2, 3, 8, 3] : [4, 5]);
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius + 12 + Math.sin(time * 3) * 2, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      if (phaseEcho || phasePresent || phaseProof) {
        ctx.globalAlpha = 0.14 + Math.sin(time * 4 + enemy.seed) * 0.035;
        ctx.fillStyle = phaseColor;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius + 7, 0, TAU);
        ctx.fill();
      }

      if (tutorial?.active && tutorial.step === 5 && !tutorial.syncSuccess && (phaseEcho || phasePresent)) {
        const firstHitAt = phaseEcho ? Number(tutorial.presentHitAt) : Number(tutorial.echoHitAt);
        const ownHitAt = phaseEcho ? Number(tutorial.echoHitAt) : Number(tutorial.presentHitAt);
        if (Number.isFinite(firstHitAt) && !Number.isFinite(ownHitAt)) {
          const windowSeconds = tutorialSyncWindow();
          const remaining = Math.max(0, windowSeconds - (gameTime - firstHitAt));
          const ratio = clamp(remaining / windowSeconds, 0, 1);
          ctx.globalAlpha = 0.95;
          ctx.strokeStyle = remaining > windowSeconds * 0.35 ? '#ffd166' : '#ff6d8e';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y, enemy.radius + 23, -Math.PI / 2, -Math.PI / 2 + TAU * ratio);
          ctx.stroke();
          ctx.fillStyle = remaining > windowSeconds * 0.35 ? '#ffe4a0' : '#ff9cb0';
          ctx.font = '950 11px ui-monospace, monospace';
          const timerY = compactPortraitLabel ? enemy.y + enemy.radius + 38 : enemy.y + enemy.radius + 31;
          ctx.fillText(`SYNC ${remaining.toFixed(1)}s`, enemy.x, timerY);
        }
      }
      clearGlow();
      ctx.restore();
    }

    if (enemy.type !== 'boss' && spawnProgress >= 0.9) {
      const statusY = enemy.y + enemy.radius + 12;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalCompositeOperation = 'lighter';
      if (enemy.elite) {
        ctx.globalAlpha = 0.92;
        ctx.font = '800 9px Inter, system-ui, sans-serif';
        ctx.fillStyle = enemy.eliteColor;
        setGlow(enemy.eliteColor, 9);
        ctx.fillText(`◆ ${enemy.eliteName} 엘리트`, enemy.x, enemy.y - enemy.radius - 23);
      }
      const statuses = [];
      if (enemy.burnTime > 0) statuses.push({ glyph: '✦', color: '#ff9b55' });
      if (enemy.slowTimer > 0) statuses.push({ glyph: '❄', color: '#75eaff' });
      if (enemy.markTime > 0) statuses.push({ glyph: '⌾', color: '#cf8bff' });
      if (enemy.phaseRiftTime > 0) statuses.push({ glyph: '✧', color: '#ffd166' });
      if (statuses.length) {
        const start = enemy.x - (statuses.length - 1) * 7;
        ctx.font = '900 10px Inter, system-ui, sans-serif';
        statuses.forEach((status, index) => {
          ctx.fillStyle = status.color;
          setGlow(status.color, 7);
          ctx.fillText(status.glyph, start + index * 14, statusY);
        });
      }
      clearGlow();
      ctx.restore();
    }

    if (enemy.type !== 'boss' && (enemy.hp < enemy.maxHp || enemy.elite) && enemy.radius >= 18 && spawnProgress >= 1) {
      const w = enemy.radius * (enemy.elite ? 2.45 : 2.1);
      const ratio = clamp(enemy.hp / enemy.maxHp, 0, 1);
      ctx.save();
      ctx.globalAlpha = enemy.elite ? 0.92 : 0.72;
      ctx.fillStyle = 'rgba(2,4,12,.82)';
      ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 13, w, enemy.elite ? 4 : 3);
      ctx.fillStyle = enemy.elite ? enemy.eliteColor : enemy.type === 'splitter' ? '#67edaa' : '#ff668f';
      if (enemy.elite) setGlow(enemy.eliteColor, 8);
      ctx.fillRect(enemy.x - w / 2, enemy.y - enemy.radius - 13, w * ratio, enemy.elite ? 4 : 3);
      clearGlow();
      ctx.restore();
    }
  }

  function drawBoss(enemy, time, flash, spawnProgress) {
    const phaseColor = enemy.enraged ? '#ff315b' : enemy.phase === 3 ? '#ff4b83' : enemy.phase === 2 ? '#c467ff' : '#ff66ce';
    setGlow(flash ? '#ffffff' : phaseColor, 34);
    ctx.strokeStyle = flash ? '#ffffff' : phaseColor;
    ctx.fillStyle = flash ? '#ffffff' : 'rgba(115,45,142,0.34)';
    ctx.lineWidth = 3.4;
    tracePolygon(12, enemy.radius, time * 0.16, 0.84);
    ctx.fill(); ctx.stroke();

    ctx.save();
    ctx.rotate(-enemy.angle + time * (enemy.phase === 3 ? -1.35 : -0.65));
    ctx.globalAlpha *= 0.72;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * 1.28, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    for (let i = 0; i < 6; i++) {
      const a = i * TAU / 6;
      ctx.save();
      ctx.translate(Math.cos(a) * enemy.radius * 1.28, Math.sin(a) * enemy.radius * 1.28);
      ctx.rotate(a);
      ctx.fillStyle = phaseColor;
      tracePolygon(4, 6, Math.PI / 4, 0.55);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    ctx.globalAlpha = 0.94 * spawnProgress;
    ctx.fillStyle = '#fff2fb';
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * 0.24, 0, TAU);
    ctx.fill();
    ctx.fillStyle = phaseColor;
    ctx.beginPath();
    ctx.arc(Math.sin(time * 2.2) * 4, 0, enemy.radius * 0.11, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 0.3 + Math.sin(time * 4.5) * 0.12;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.radius * (0.43 + Math.sin(time * 3) * 0.03), 0, TAU);
    ctx.stroke();
  }

  function drawPlayer(time) {
    if (!player || !visible(player.x, player.y, 120)) return;

    // Orbiting memory satellites
    if (player.droneCount > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < player.droneCount; i++) {
        const a = gameTime * 1.35 + i * TAU / player.droneCount;
        const x = player.x + Math.cos(a) * 48;
        const y = player.y + Math.sin(a) * 48;
        ctx.strokeStyle = 'rgba(255,209,102,.28)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(player.x, player.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.fillStyle = '#ffe08a';
        setGlow('#ffd166', 15);
        ctx.beginPath();
        ctx.arc(x, y, 5.5, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, TAU);
        ctx.fill();
      }
      clearGlow();
      ctx.restore();
    }

    if (player.shield > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const ratio = player.shield / player.maxShield;
      ctx.globalAlpha = 0.18 + ratio * 0.28;
      ctx.strokeStyle = '#62e8ff';
      ctx.lineWidth = 1.5 + ratio * 1.2;
      setGlow('#56dcff', 16);
      ctx.setLineDash([6, 7]);
      ctx.lineDashOffset = -time * 22;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 11 + Math.sin(time * 3.8) * 1.5, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      clearGlow();
      ctx.restore();
    }

    const flicker = player.invuln > 0 && Math.floor(player.invuln * 22) % 2 === 0;
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    if (player.dashTimer > 0) ctx.scale(1.28, 0.72);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = flicker ? 0.38 : 1;

    const speedRatio = clamp(Math.hypot(player.vx, player.vy) / player.speed, 0, 1.8);
    if (speedRatio > 0.08) {
      const flame = 12 + speedRatio * 13 + Math.sin(time * 30) * 3;
      const grad = ctx.createLinearGradient(-8, 0, -flame - 10, 0);
      grad.addColorStop(0, 'rgba(108,238,255,.9)');
      grad.addColorStop(0.35, 'rgba(94,126,255,.55)');
      grad.addColorStop(1, 'rgba(91,63,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-8, -5);
      ctx.lineTo(-flame - 8, 0);
      ctx.lineTo(-8, 5);
      ctx.closePath();
      ctx.fill();
    }

    setGlow('#59e9ff', 24);
    ctx.fillStyle = 'rgba(61,184,229,0.28)';
    ctx.strokeStyle = '#72efff';
    ctx.lineWidth = 2.3;
    ctx.beginPath();
    ctx.moveTo(23, 0);
    ctx.lineTo(-13, -13);
    ctx.lineTo(-8, -4);
    ctx.lineTo(-10, 0);
    ctx.lineTo(-8, 4);
    ctx.lineTo(-13, 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#e8fdff';
    ctx.lineWidth = 1.3;
    ctx.globalAlpha *= 0.8;
    ctx.beginPath();
    ctx.moveTo(-7, -8);
    ctx.lineTo(13, 0);
    ctx.lineTo(-7, 8);
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = flicker ? 0.3 : 0.9;
    ctx.beginPath();
    ctx.arc(4, 0, 2.4, 0, TAU);
    ctx.fill();
    clearGlow();
    ctx.restore();
  }

  function drawParticles() {
    clearRenderGroups(renderGroups.particles);
    for (const p of arrays.particles) {
      if (!visible(p.x, p.y, 30)) continue;
      const t = clamp(p.life / p.maxLife, 0, 1);
      const bucket = Math.max(0, Math.min(3, Math.floor(t * 4)));
      addRenderGroup(renderGroups.particles, `${p.color}|${p.shape}|${bucket}`, p);
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const group of renderGroups.particles.values()) {
      if (!group.length) continue;
      const sample = group[0];
      const sampleT = clamp(sample.life / sample.maxLife, 0, 1);
      ctx.globalAlpha = sample.alpha * sampleT;
      ctx.fillStyle = sample.color;
      ctx.strokeStyle = sample.color;
      if (quality === 2 && group.length < 35) {
        for (const p of group) {
          const t = clamp(p.life / p.maxLife, 0, 1);
          const size = Math.max(.2, lerp(p.endSize, p.size, t));
          drawGlowSprite(p.x, p.y, Math.max(size, p.glow * 0.45), sample.color, sample.alpha * t * 0.3);
        }
      }
      if (sample.shape === 'line') {
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (const p of group) { ctx.moveTo(p.x,p.y); ctx.lineTo(p.x-p.vx*0.045,p.y-p.vy*0.045); }
        ctx.stroke();
      } else {
        ctx.beginPath();
        for (const p of group) {
          const t = clamp(p.life / p.maxLife, 0, 1);
          const size = Math.max(.2, lerp(p.endSize,p.size,t));
          ctx.moveTo(p.x+size,p.y); ctx.arc(p.x,p.y,size,0,TAU);
        }
        ctx.fill();
      }
      clearGlow();
    }
    ctx.restore();
  }

  function drawLinks() {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const link of arrays.links) {
      const alpha = link.life / link.maxLife;
      const segments = 6;
      const dx = link.x2 - link.x1;
      const dy = link.y2 - link.y1;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      ctx.beginPath();
      ctx.moveTo(link.x1, link.y1);
      for (let i = 1; i < segments; i++) {
        const t = i / segments;
        const jitter = Math.sin(link.seed * 17 + i * 9.7 + alpha * 16) * 10 * alpha;
        ctx.lineTo(link.x1 + dx * t + nx * jitter, link.y1 + dy * t + ny * jitter);
      }
      ctx.lineTo(link.x2, link.y2);
      ctx.globalAlpha = alpha * 0.9;
      ctx.strokeStyle = link.color;
      ctx.lineWidth = 2.4;
      setGlow(link.color, 18);
      ctx.stroke();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    clearGlow();
    ctx.restore();
  }

  function drawFloaters() {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const f of arrays.floaters) {
      if (!visible(f.x, f.y, 40)) continue;
      const alpha = clamp(f.life / f.maxLife, 0, 1);
      ctx.globalAlpha = Math.min(1, alpha * 1.5);
      ctx.font = `800 ${f.size}px Inter, system-ui, sans-serif`;
      ctx.fillStyle = f.color;
      setGlow(f.color, 10);
      ctx.fillText(f.text, f.x, f.y);
    }
    clearGlow();
    ctx.restore();
  }

  function drawMinimap() {
    if (!player || view.w < 880 || resolvedInputDeviceFamily() === 'touch') return;
    const w = 156;
    const h = 94;
    const x = view.w - w - 18;
    const y = view.h - h - 18;
    ctx.save();
    ctx.globalAlpha = 0.84;
    ctx.fillStyle = 'rgba(6,11,28,.72)';
    ctx.strokeStyle = 'rgba(92,232,255,.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, 10); else ctx.rect(x, y, w, h);
    ctx.fill(); ctx.stroke();
    const pad = 8;
    const mapX = (wx) => x + pad + wx / WORLD.w * (w - pad * 2);
    const mapY = (wy) => y + pad + wy / WORLD.h * (h - pad * 2);
    ctx.globalCompositeOperation = 'lighter';
    for (const enemy of arrays.enemies) {
      if (enemy.dead) continue;
      ctx.fillStyle = enemy.type === 'boss' ? '#ff5fd2' : enemy.elite ? enemy.eliteColor : '#ff668f';
      ctx.globalAlpha = enemy.type === 'boss' ? 0.95 : enemy.elite ? 0.9 : 0.55;
      ctx.beginPath();
      ctx.arc(mapX(enemy.x), mapY(enemy.y), enemy.type === 'boss' ? 3.2 : enemy.elite ? 2.15 : 1.3, 0, TAU);
      ctx.fill();
    }
    for (const echo of arrays.echoes) {
      ctx.fillStyle = '#b376ff';
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(mapX(echo.x), mapY(echo.y), 1.8, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#6cefff';
    ctx.globalAlpha = 1;
    setGlow('#6cefff', 8);
    ctx.beginPath();
    ctx.arc(mapX(player.x), mapY(player.y), 2.5, 0, TAU);
    ctx.fill();
    clearGlow();
    ctx.restore();
  }


  function drawOffscreenWarnings(time) {
    if (!settings.offscreenWarnings || !player || gameState !== 'playing') return;
    const margin = 46;
    const candidates = [];
    for (const enemy of arrays.enemies) {
      if (enemy.dead || enemy.spawnTime > 0 || enemy.trainingDummy) continue;
      const sx = enemy.x - camera.x + view.w / 2;
      const sy = enemy.y - camera.y + view.h / 2;
      const inside = sx >= margin && sx <= view.w - margin && sy >= margin && sy <= view.h - margin;
      if (inside) continue;
      const dx = sx - view.w / 2;
      const dy = sy - view.h / 2;
      const distance = Math.hypot(dx, dy);
      const urgent = enemy.type === 'boss' || enemy.elite || enemy.state === 'telegraph' || enemy.state === 'charge';
      if (!urgent && distance > Math.max(view.w, view.h) * 0.82) continue;
      const priority = (enemy.type === 'boss' ? 1000 : enemy.elite ? 600 : enemy.state === 'telegraph' || enemy.state === 'charge' ? 420 : 100) - distance * 0.03;
      candidates.push({ enemy, dx, dy, distance, priority });
    }
    candidates.sort((a, b) => b.priority - a.priority);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const item of candidates.slice(0, 6)) {
      const { enemy, dx, dy, distance } = item;
      const angle = Math.atan2(dy, dx);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const tx = cos > 0 ? (view.w / 2 - margin) / Math.max(0.001, cos) : (-view.w / 2 + margin) / Math.min(-0.001, cos);
      const ty = sin > 0 ? (view.h / 2 - margin) / Math.max(0.001, sin) : (-view.h / 2 + margin) / Math.min(-0.001, sin);
      const t = Math.min(Math.abs(tx), Math.abs(ty));
      const x = view.w / 2 + cos * t;
      const y = view.h / 2 + sin * t;
      const color = enemy.type === 'boss' ? '#ff65d3' : enemy.elite ? enemy.eliteColor : enemy.state === 'telegraph' || enemy.state === 'charge' ? '#ffd166' : '#ff6c91';
      const pulse = settings.reducedMotion ? 1 : 0.82 + Math.sin(time * 7 + enemy.seed) * 0.18;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.globalAlpha = 0.72 + pulse * 0.2;
      ctx.fillStyle = color;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      setGlow(color, enemy.type === 'boss' ? 18 : 10);
      ctx.beginPath();
      ctx.moveTo(14 * pulse, 0);
      ctx.lineTo(-8, -7);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-8, 7);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.55;
      ctx.stroke();
      clearGlow();
      ctx.restore();
      if (enemy.type === 'boss' || enemy.elite) {
        ctx.globalAlpha = 0.88;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '900 9px Inter, system-ui, sans-serif';
        ctx.fillText(enemy.type === 'boss' ? 'BOSS' : `${Math.max(1, Math.round(distance / WORLD_UNITS_PER_METER))}m`, x - cos * 23, y - sin * 23);
      }
    }
    clearGlow();
    ctx.restore();
  }

  function drawCrosshair() {
    if (!player || gameState !== 'playing' || input.lastDevice !== 'mouse') return;
    const x = input.pointer.x;
    const y = input.pointer.y;
    const world = screenToWorld(x, y);
    const overEnemy = arrays.enemies.some((e) => !e.dead && sqr(e.x - world.x) + sqr(e.y - world.y) < sqr(e.radius + 12));
    const color = overEnemy ? '#ff638d' : '#6cecff';
    ctx.save();
    ctx.translate(x, y);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 1.3;
    setGlow(color, 10);
    const r = overEnemy ? 10 : 8;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * (r + 4), Math.sin(a) * (r + 4));
      ctx.lineTo(Math.cos(a) * (r + 9), Math.sin(a) * (r + 9));
      ctx.stroke();
    }
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.85;
    ctx.fillRect(-1, -1, 2, 2);
    clearGlow();
    ctx.restore();
  }

  function render(time) {
    const renderStartedAt = performance.now();
    frameGlowPasses = 0;
    ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    clearGlow();
    drawBackground(time);

    if (player) {
      const shakeMagnitude = settings.shake && !settings.reducedMotion ? camera.shake * camera.shake * 19 : 0;
      const shakeX = rand(-shakeMagnitude, shakeMagnitude);
      const shakeY = rand(-shakeMagnitude, shakeMagnitude);
      ctx.save();
      ctx.translate(view.w / 2 - camera.x + shakeX, view.h / 2 - camera.y + shakeY);
      drawArena(time);
      drawRecordedEchoPath(time);
      drawShockwaves();
      drawPickups(time);
      drawLasers();
      drawEnemyBullets();
      drawEchoes(time);
      drawPlayerBullets();
      for (const enemy of arrays.enemies) drawEnemy(enemy, time);
      drawPlayer(time);
      drawParticles();
      drawLinks();
      drawFloaters();
      ctx.restore();
      drawMinimap();
      drawOffscreenWarnings(time);
      drawCrosshair();
    }

    ctx.fillStyle = gameState === 'playing' ? renderCache.vignettePlay : renderCache.vignetteMenu;
    ctx.fillRect(0, 0, view.w, view.h);
    lastRenderGlowPasses = frameGlowPasses;
    lastRenderFrameMs = performance.now() - renderStartedAt;
  }

  // ---------------------------------------------------------------------------
  // UI wiring & main loop
  // ---------------------------------------------------------------------------
  $('#startBtn').addEventListener('click', startGame);
  $('#trainingBtn')?.addEventListener('click', () => startGame({ training: true }));
  $('#advancedTrainingBtn')?.addEventListener('click', () => startGame({ training: true, advancedTraining: true }));
  $('#tutorialSkipBtn')?.addEventListener('click', () => finishEchoTutorial(true));
  $('#retryBtn').addEventListener('click', startGame);
  $('#restartBtn').addEventListener('click', restartRun);
  $('#resumeBtn').addEventListener('click', resumeGame);
  $('#quitBtn').addEventListener('click', returnToMenu);
  $('#endlessBtn').addEventListener('click', continueEndless);
  $('#archiveBtn').addEventListener('click', archiveRun);
  $('#metaBtn').addEventListener('click', openMetaScreen);
  $('#gameOverMetaBtn').addEventListener('click', openMetaFromResult);
  $('#metaResetBtn').addEventListener('click', resetMetaProgression);
  $('#rerollBtn').addEventListener('click', rerollUpgradeChoices);
  $('#exportSaveBtn')?.addEventListener('click', exportSaveFile);
  $('#importSaveInput')?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) importSaveFile(file);
  });
  $('#restoreImportBackupBtn')?.addEventListener('click', restoreImportBackup);
  $('#clearRunHistoryBtn')?.addEventListener('click', clearRunHistory);
  $('#keybindGrid')?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-keybind-action]');
    if (button) beginKeyRebind(button.dataset.keybindAction);
  });
  $('#resetKeyBindingsBtn')?.addEventListener('click', resetKeyBindings);
  $('#howBtn').addEventListener('click', () => showScreen(UI.how));
  $('#settingsBtn').addEventListener('click', () => { renderRunHistory(); updateImportBackupStatus(); showScreen(UI.settings); });
  $$('[data-back-menu]').forEach((button) => button.addEventListener('click', returnToMenu));

  let lastAudioHoverControl = null;
  document.addEventListener('pointerover', (event) => {
    if (event.pointerType === 'touch') return;
    const control = event.target.closest('button:not(:disabled), select, input[type="checkbox"]');
    if (!control || control === lastAudioHoverControl || control.contains(event.relatedTarget)) return;
    lastAudioHoverControl = control;
    audio.uiHover();
  }, { passive: true });
  document.addEventListener('pointerout', (event) => {
    const control = event.target.closest('button, select, input[type="checkbox"]');
    if (control && !control.contains(event.relatedTarget)) lastAudioHoverControl = null;
  }, { passive: true });
  document.addEventListener('focusin', (event) => {
    const control = event.target.closest('button:not(:disabled), select, input[type="checkbox"]');
    if (control) audio.uiHover();
  });
  document.addEventListener('click', (event) => {
    const control = event.target.closest('button:not(:disabled), select, input[type="checkbox"]');
    if (!control) return;
    if (control.matches('[data-back-menu], #quitBtn')) audio.uiBack();
    else if (!control.matches('.upgrade-select, .route-card, .meta-buy, #rerollBtn, #soundTestBtn')) audio.uiSelect();
  });

  $('#masterVolume').addEventListener('input', (event) => {
    settings.master = clamp(Number(event.target.value), 0, 1);
    $('#masterVolumeValue').textContent = `${Math.round(settings.master * 100)}%`;
    saveJSON(SETTINGS_KEY, settings);
    audio.applyVolume();
  });
  $('#musicToggle').addEventListener('change', (event) => {
    settings.music = event.target.checked;
    saveJSON(SETTINGS_KEY, settings);
    audio.applyVolume();
    updateAudioStatus(settings.music ? '배경 음악이 활성화되었습니다.' : '배경 음악이 꺼졌습니다. 전투·UI 효과음은 유지됩니다.', 'ready');
  });
  $('#musicVolume').addEventListener('input', (event) => {
    settings.musicVolume = clamp(Number(event.target.value), 0, 1);
    $('#musicVolumeValue').textContent = `${Math.round(settings.musicVolume * 100)}%`;
    saveJSON(SETTINGS_KEY, settings);
    audio.applyVolume();
  });
  $('#sfxVolume').addEventListener('input', (event) => {
    settings.sfxVolume = clamp(Number(event.target.value), 0, 1);
    $('#sfxVolumeValue').textContent = `${Math.round(settings.sfxVolume * 100)}%`;
    saveJSON(SETTINGS_KEY, settings);
    audio.applyVolume();
  });
  $('#uiVolume').addEventListener('input', (event) => {
    settings.uiVolume = clamp(Number(event.target.value), 0, 1);
    $('#uiVolumeValue').textContent = `${Math.round(settings.uiVolume * 100)}%`;
    saveJSON(SETTINGS_KEY, settings);
    audio.applyVolume();
  });
  $('#soundTestBtn').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const ready = await unlockAudio();
    if (!ready) return;
    audio.soundTest();
    button.classList.add('playing');
    updateAudioStatus('재생 중 · UI → 강화 → 전투 효과', 'ready');
    window.setTimeout(() => {
      button.classList.remove('playing');
      updateAudioStatus('믹스 테스트 완료 · 각 음량을 따로 조절할 수 있습니다.', 'ready');
    }, 1150);
  });
  $('#shakeToggle').addEventListener('change', (event) => {
    settings.shake = event.target.checked;
    saveJSON(SETTINGS_KEY, settings);
  });
  $('#motionToggle').addEventListener('change', (event) => {
    settings.reducedMotion = event.target.checked;
    quality = configuredQualityTier();
    document.body.dataset.quality = String(quality);
    resetQualitySampling();
    saveJSON(SETTINGS_KEY, settings);
    applySettings();
    resizeCanvas();
  });
  $('#contrastToggle').addEventListener('change', (event) => {
    settings.highContrast = event.target.checked;
    saveJSON(SETTINGS_KEY, settings);
    applySettings();
  });
  $('#autoFireToggle').addEventListener('change', (event) => {
    settings.autoFire = event.target.checked;
    saveJSON(SETTINGS_KEY, settings);
  });
  $('#hudSize')?.addEventListener('change', (event) => {
    settings.hudSize = event.target.value;
    saveJSON(SETTINGS_KEY, settings);
    applySettings();
  });
  $('#hudOpacity')?.addEventListener('input', (event) => {
    settings.hudOpacity = clamp(Number(event.target.value), 0.68, 1);
    $('#hudOpacityValue').textContent = `${Math.round(settings.hudOpacity * 100)}%`;
    document.documentElement.style.setProperty('--hud-opacity', settings.hudOpacity.toFixed(2));
    saveJSON(SETTINGS_KEY, settings);
  });
  $('#hudMode')?.addEventListener('change', (event) => {
    settings.hudMode = event.target.value;
    saveJSON(SETTINGS_KEY, settings);
    applySettings();
  });
  $('#choiceDensity')?.addEventListener('change', (event) => {
    settings.choiceDensity = event.target.value;
    saveJSON(SETTINGS_KEY, settings);
    applySettings();
  });
  $('#damageNumbersMode')?.addEventListener('change', (event) => {
    settings.damageNumbers = event.target.value;
    saveJSON(SETTINGS_KEY, settings);
    applySettings();
  });
  $('#echoControlMode')?.addEventListener('change', (event) => {
    input.cancelEcho('setting-change', false);
    settings.echoControlMode = event.target.value;
    saveJSON(SETTINGS_KEY, settings);
    applySettings();
    updateEchoRecorderHUD();
  });
  $('#echoReportMode')?.addEventListener('change', (event) => {
    settings.echoReportMode = event.target.value;
    deferredEchoReports.length = 0;
    saveJSON(SETTINGS_KEY, settings);
    applySettings();
  });
  $('#touchControlsMode')?.addEventListener('change', (event) => {
    settings.touchControlsMode = event.target.value;
    saveJSON(SETTINGS_KEY, settings);
    applySettings();
    updateTouchControlsVisibility();
  });
  $('#tutorialTimingMode')?.addEventListener('change', (event) => {
    settings.tutorialTimingMode = event.target.value;
    saveJSON(SETTINGS_KEY, settings);
    applySettings();
    refreshTutorialCopy(true);
  });
  $('#combatPalette')?.addEventListener('change', (event) => {
    settings.combatPalette = COMBAT_PALETTE_KEYS.includes(event.target.value) ? event.target.value : 'default';
    saveJSON(SETTINGS_KEY, settings);
    applySettings();
  });
  $('#projectileShapesToggle')?.addEventListener('change', (event) => {
    settings.projectileShapes = event.target.checked;
    saveJSON(SETTINGS_KEY, settings);
    applySettings();
  });
  $('#rarityPatternsToggle')?.addEventListener('change', (event) => {
    settings.rarityPatterns = event.target.checked;
    saveJSON(SETTINGS_KEY, settings);
    applySettings();
  });
  $('#echoTrailToggle')?.addEventListener('change', (event) => {
    settings.echoTrail = event.target.checked;
    saveJSON(SETTINGS_KEY, settings);
    applySettings();
  });
  $('#offscreenWarningsToggle')?.addEventListener('change', (event) => {
    settings.offscreenWarnings = event.target.checked;
    saveJSON(SETTINGS_KEY, settings);
    applySettings();
  });
  $('#flashIntensity')?.addEventListener('input', (event) => {
    settings.flashIntensity = clamp(Number(event.target.value), 0, 1);
    $('#flashIntensityValue').textContent = `${Math.round(settings.flashIntensity * 100)}%`;
    document.documentElement.style.setProperty('--flash-opacity', settings.flashIntensity.toFixed(2));
    saveJSON(SETTINGS_KEY, settings);
  });
  $('#uiScale').addEventListener('input', (event) => {
    settings.uiScale = clamp(Number(event.target.value), 0.9, 1.6);
    $('#uiScaleValue').textContent = `${Math.round(settings.uiScale * 100)}%`;
    document.documentElement.style.setProperty('--text-scale', settings.uiScale.toFixed(2));
    saveJSON(SETTINGS_KEY, settings);
  });
  $('#graphicsMode').addEventListener('change', (event) => {
    settings.graphicsMode = event.target.value;
    quality = configuredQualityTier();
    document.body.dataset.quality = String(quality);
    autoQualityLocked = settings.graphicsMode === 'auto' && quality === 0;
    resetQualitySampling();
    updateAutoQualityStatus();
    saveJSON(SETTINGS_KEY, settings);
    resizeCanvas();
  });
  $('#autoQualityResetBtn')?.addEventListener('click', () => {
    settings.autoQualityTier = 2;
    if (settings.graphicsMode === 'auto' && !settings.reducedMotion) quality = 2;
    document.body.dataset.quality = String(quality);
    autoQualityLocked = false;
    longFrameCount = 0;
    resetQualitySampling();
    saveJSON(SETTINGS_KEY, settings);
    updateAutoQualityStatus();
    resizeCanvas();
    showToast('자동 품질 측정을 고화질부터 다시 시작합니다', 2200);
  });
  $('#perfToggle').addEventListener('change', (event) => {
    settings.showPerf = event.target.checked;
    UI.perfHud.classList.toggle('hidden', !settings.showPerf);
    saveJSON(SETTINGS_KEY, settings);
    updateHUD(1, true);
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'F3') {
      event.preventDefault();
      settings.showPerf = !settings.showPerf;
      $('#perfToggle').checked = settings.showPerf;
      UI.perfHud.classList.toggle('hidden', !settings.showPerf);
      saveJSON(SETTINGS_KEY, settings);
      updateHUD(1, true);
    }
  });

  window.addEventListener('resize', resizeCanvas, { passive: true });
  window.addEventListener('orientationchange', () => window.setTimeout(resizeCanvas, 120), { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && gameState === 'playing') pauseGame(true);
    else if (!document.hidden && gameState === 'playing') requestWakeLock();
  });

  window.addEventListener('error', (event) => {
    console.error('ECHO RIFT runtime error:', event.error || event.message);
    if (gameState === 'playing') showToast('신호 오류가 감지되었습니다. 새 시간선을 시작해 주세요.', 4000);
  });

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
  }

  function clearBenchmarkScene() {
    arrays.enemies.length = 0;
    while (arrays.playerBullets.length) recyclePlayerBullet(arrays.playerBullets.length - 1);
    while (arrays.enemyBullets.length) recycleEnemyBullet(arrays.enemyBullets.length - 1);
    while (arrays.particles.length) {
      const particle = swapRemove(arrays.particles, arrays.particles.length - 1);
      if (particle) particlePool.push(particle);
    }
    arrays.lasers.length = 0;
    arrays.pickups.length = 0;
    arrays.echoes.length = 0;
    arrays.shockwaves.length = 0;
    arrays.floaters.length = 0;
    arrays.links.length = 0;
    enemyGrid.clear();
    if (currentWave) {
      currentWave.spawnTimer = 9999;
      currentWave.spawnRemaining = 1;
      currentWave.completed = false;
      currentWave.clearTimer = 0;
    }
  }

  function spawnBenchmarkEnemyBullets(count = 160, seed = 700) {
    if (!player) return 0;
    const rng = mulberry32(Math.floor(Number(seed) || 700));
    const total = clamp(Math.floor(Number(count) || 160), 1, MAX_ENEMY_BULLETS);
    const centerX = player.x;
    const centerY = player.y;
    const colors = ['#ff5e91', '#ff9ac0', '#d66bff'];
    for (let i = 0; i < total; i += 1) {
      const angle = i * TAU / total;
      const ring = 105 + (i % 5) * 18 + rng() * 8;
      spawnEnemyBullet(
        centerX + Math.cos(angle) * ring,
        centerY + Math.sin(angle) * ring,
        angle + Math.PI * 0.42 + (rng() - 0.5) * 0.18,
        180 + (i % 7) * 12,
        1,
        3.6 + (i % 4) * 0.7,
        colors[i % colors.length],
        { life: 9 }
      );
    }
    return arrays.enemyBullets.length;
  }

  function spawnBenchmarkParticles(count = 70, seed = 701) {
    if (!player) return 0;
    const rng = mulberry32(Math.floor(Number(seed) || 701));
    const total = clamp(Math.floor(Number(count) || 70), 0, maxParticles());
    const centerX = player.x;
    const centerY = player.y;
    for (let i = 0; i < total; i += 1) {
      const angle = i * TAU / Math.max(1, total);
      spawnParticle(centerX + Math.cos(angle) * (70 + (i % 9) * 12), centerY + Math.sin(angle) * (55 + (i % 7) * 10), {
        angle: angle + 0.8 + (rng() - 0.5) * 0.12,
        speed: 40 + (i % 8) * 8,
        life: 1.6,
        size: 1.5 + (i % 5) * 0.55,
        endSize: 0,
        color: i % 2 ? '#72e8ff' : '#ff80b5',
        glow: 8,
        shape: i % 6 === 0 ? 'line' : 'circle',
        alpha: 0.85,
        drag: 4,
        gravity: 0,
        rotation: 0,
        spin: 0,
      });
    }
    return arrays.particles.length;
  }

  function withRenderShadowProbe(callback) {
    const prop = 'shadow' + 'Blur';
    const proto = CanvasRenderingContext2D.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, prop);
    let uses = 0;
    let patched = false;
    try {
      if (desc?.get && desc?.set) {
        Object.defineProperty(ctx, prop, {
          configurable: true,
          get() { return desc.get.call(ctx); },
          set(value) {
            if (Number(value) > 0) uses += 1;
            desc.set.call(ctx, value);
          },
        });
        patched = true;
      }
    } catch (_) {
      patched = false;
    }
    try {
      return callback(() => uses);
    } finally {
      if (patched) delete ctx[prop];
    }
  }

  function renderBenchmark(options = {}) {
    if (!player) startGame();
    if (tutorial?.active) finishEchoTutorial(true);
    if (!player) return null;
    const previousSettings = {
      graphicsMode: settings.graphicsMode,
      reducedMotion: settings.reducedMotion,
      shake: settings.shake,
      autoQualityTier: settings.autoQualityTier,
    };
    const previousQuality = quality;
    const previousAutoLocked = autoQualityLocked;
    const frames = clamp(Math.floor(Number(options.frames ?? 90)), 1, 360);
    const warmup = clamp(Math.floor(Number(options.warmup ?? 30)), 0, 120);
    const seed = Math.floor(Number(options.seed) || 700);
    try {
      settings.graphicsMode = 'high';
      settings.reducedMotion = false;
      settings.shake = false;
      quality = 2;
      document.body.dataset.quality = String(quality);
      autoQualityLocked = false;
      resizeCanvas();
      clearBenchmarkScene();
      camera.x = player.x;
      camera.y = player.y;
      const enemyBullets = spawnBenchmarkEnemyBullets(options.enemyBullets ?? 160, seed);
      const particles = spawnBenchmarkParticles(options.particles ?? 70, seed + 1);
      const samples = [];
      const result = withRenderShadowProbe((shadowCount) => {
        let measuredGlowBefore = totalGlowPasses;
        let measuredShadowBefore = shadowCount();
        for (let i = 0; i < warmup + frames; i += 1) {
          if (i === warmup) {
            measuredGlowBefore = totalGlowPasses;
            measuredShadowBefore = shadowCount();
          }
          const started = performance.now();
          render((started + i * 16.6667) / 1000);
          const elapsed = performance.now() - started;
          if (i >= warmup) samples.push(elapsed);
        }
        const sorted = samples.slice().sort((a, b) => a - b);
        const sum = samples.reduce((total, value) => total + value, 0);
        const percentile = (p) => sorted[Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p)))] || 0;
        return {
          version: GAME_VERSION,
          enemyBullets,
          particles,
          frames,
          warmup,
          avgFrameMs: Number((sum / samples.length).toFixed(3)),
          maxFrameMs: Number(Math.max(...samples).toFixed(3)),
          minFrameMs: Number(Math.min(...samples).toFixed(3)),
          p50FrameMs: Number(percentile(0.5).toFixed(3)),
          p95FrameMs: Number(percentile(0.95).toFixed(3)),
          glowPasses: totalGlowPasses - measuredGlowBefore,
          shadowBlurUses: shadowCount() - measuredShadowBefore,
          quality,
          dpr: Number(view.dpr.toFixed(3)),
          viewport: { w: view.w, h: view.h },
        };
      });
      return result;
    } finally {
      settings.graphicsMode = previousSettings.graphicsMode;
      settings.reducedMotion = previousSettings.reducedMotion;
      settings.shake = previousSettings.shake;
      settings.autoQualityTier = previousSettings.autoQualityTier;
      quality = previousQuality;
      document.body.dataset.quality = String(quality);
      autoQualityLocked = previousAutoLocked;
      resizeCanvas();
    }
  }

  // Read-only diagnostics make the offline build verifiable without exposing mutable state.
  Object.defineProperty(window, 'echoRiftStatus', {
    get() {
      return Object.freeze({
        state: gameState,
        score: Math.floor(score),
        time: Number(gameTime.toFixed(2)),
        wave: currentWave?.number || 0,
        modifier: currentWave?.modifier?.id || null,
        route: currentWave?.route?.id || null,
        routeHistory: [...routeHistory],
        routeChoices: pendingRouteChoices.map((route) => route.id),
        routeForecastBase: pendingRouteBaseModifier ? { id: pendingRouteBaseModifier.id, name: pendingRouteBaseModifier.name } : null,
        routeForecasts: pendingRouteChoices.map((route) => {
          const forecast = pendingRouteForecasts[route.id] || routeForecast(route);
          return { routeId:route.id, baseId:forecast.base.id, baseName:forecast.base.name, modifierId:forecast.modifier.id, grade:forecast.grade, score:Number(forecast.score.toFixed(3)), hp:Number(forecast.modifier.hp.toFixed(3)), damage:Number(forecast.modifier.damage.toFixed(3)), speed:Number(forecast.modifier.speed.toFixed(3)), spawn:Number(forecast.modifier.spawn.toFixed(3)), count:Number(forecast.modifier.count.toFixed(3)), bulletSpeed:Number(forecast.modifier.bulletSpeed.toFixed(3)), fireRate:Number(forecast.modifier.fireRate.toFixed(3)), eliteChance:Number(forecast.modifier.eliteChance.toFixed(3)), xp:Number(forecast.modifier.xp.toFixed(3)), core:Number(forecast.modifier.core.toFixed(3)) };
        }),
        modifierStats: currentWave?.modifier ? { baseId:currentWave.modifier.baseId, hp:Number(currentWave.modifier.hp.toFixed(3)), damage:Number(currentWave.modifier.damage.toFixed(3)), speed:Number(currentWave.modifier.speed.toFixed(3)), spawn:Number(currentWave.modifier.spawn.toFixed(3)), count:Number(currentWave.modifier.count.toFixed(3)), bulletSpeed:Number(currentWave.modifier.bulletSpeed.toFixed(3)), fireRate:Number(currentWave.modifier.fireRate.toFixed(3)), eliteChance:Number(currentWave.modifier.eliteChance.toFixed(3)), xp:Number(currentWave.modifier.xp.toFixed(3)), core:Number(currentWave.modifier.core.toFixed(3)) } : null,
        threat: currentWave ? Number((currentWave.threat || 1).toFixed(2)) : 0,
        bossIntro: currentWave?.isBoss ? (() => {
          const boss = arrays.enemies.find((enemy) => !enemy.dead && enemy.type === 'boss');
          return {
            active: Boolean(currentWave.introActive),
            finished: Boolean(currentWave.introFinished),
            remaining: Number((currentWave.introRemaining || 0).toFixed(3)),
            duration: Number((currentWave.introDuration || 0).toFixed(3)),
            materializing: Boolean(currentWave.bossSpawned && !currentWave.combatLive),
            materializeRemaining: Number((currentWave.materializeRemaining || 0).toFixed(3)),
            materializeDuration: BOSS_MATERIALIZE_DURATION,
            bossSpawned: Boolean(currentWave.bossSpawned),
            combatLive: Boolean(currentWave.combatLive),
            bossSpawnTime: Number((boss?.spawnTime || 0).toFixed(3)),
            bossHp: boss ? Number(boss.hp.toFixed(1)) : null,
            playerInvulnerable: bossCutsceneActive(),
            bannerVisible: !UI.waveBanner.classList.contains('hidden'),
          };
        })() : null,
        enemies: arrays.enemies.filter((enemy) => !enemy.dead).length,
        elites: arrays.enemies.filter((enemy) => !enemy.dead && enemy.elite).length,
        enemyBullets: arrays.enemyBullets.length,
        playerBullets: arrays.playerBullets.length,
        playerHp: player ? Number(player.hp.toFixed(1)) : null,
        playerMaxHp: player ? Number(player.maxHp.toFixed(1)) : null,
        playerX: player ? Number(player.x.toFixed(3)) : null,
        playerY: player ? Number(player.y.toFixed(3)) : null,
        shield: player ? Number(player.shield.toFixed(1)) : null,
        playerDamage: player ? Number(player.damage.toFixed(2)) : null,
        fireRate: player ? Number(player.fireRate.toFixed(2)) : null,
        moveSpeed: player ? Number(player.speed.toFixed(1)) : null,
        level: player?.level || 0,
        rerolls: player?.rerolls || 0,
        pendingLevelUps,
        choices: currentUpgradeChoices.map((choice) => ({ id: choice.upgrade.id, rarity: choice.rarityKey })),
        lockedChoiceIds: [...lockedUpgradeIds],
        runHistoryCount: loadRunHistory().length,
        keyBindings: getKeyBindingStatus(),
        economy: getRunEconomyStatus(),
        runCores,
        bankedCores: saveData.cores,
        payoutPreview: player && !runSettled ? calculateCorePayout(1) : lastCorePayout,
        fps: Number(measuredFps.toFixed(1)),
        quality,
        qualityMode: settings.graphicsMode,
        settings: {
          uiScale: Number(settings.uiScale.toFixed(2)),
          hudSize: settings.hudSize,
          hudOpacity: Number(settings.hudOpacity.toFixed(2)),
          hudMode: settings.hudMode,
          choiceDensity: settings.choiceDensity,
          showPerf: Boolean(settings.showPerf),
        },
        autoQualityTier: settings.autoQualityTier,
        autoQualityLocked,
        longFrameCount,
        renderScale: Number(view.dpr.toFixed(2)),
        renderPerf: {
          lastFrameMs: Number(lastRenderFrameMs.toFixed(3)),
          glowPasses: lastRenderGlowPasses,
          totalGlowPasses,
          qualityFrameMs: Number(lastQualityFrameMs.toFixed(3)),
          scenePressure: Number(lastScenePressure.toFixed(1)),
          lastQualityReason,
        },
        particles: arrays.particles.length,
        phaseRift: {
          procs: phaseRiftProcs,
          bonusDamage: Math.round(phaseRiftBonusDamage),
          activeEnemies: arrays.enemies.filter((enemy) => !enemy.dead && enemy.phaseRiftTime > 0).length,
          window: PHASE_RIFT_WINDOW,
          duration: PHASE_RIFT_DURATION,
          damageMultiplier: PHASE_RIFT_DAMAGE_MULT,
          cooldown: PHASE_RIFT_COOLDOWN,
        },
        input: {
          lastDevice: input.lastDevice,
          resolvedDevice: resolvedInputDeviceFamily(),
          touchControlsVisible: !UI.touch.classList.contains('hidden'),
          touchControlsMode: settings.touchControlsMode,
          echoKeyboardKeys: input.echoKeyboardKeys.size,
          touchEchoPointerId: input.touchEchoPointerId,
        },
        tutorial: tutorial ? {
          active: Boolean(tutorial.active),
          mode: tutorial.mode || 'basic',
          step: tutorial.step,
          sequenceIndex: tutorial.sequenceIndex || 0,
          sequenceLength: tutorial.sequence?.length || tutorialSteps.length,
          reportSeen: Boolean(tutorial.reportSeen),
          replayHit: Boolean(tutorial.replayHit),
          replayVerified: Boolean(tutorial.replayVerified),
          replayEchoLive: Boolean(arrays.echoes.some((echo) => echo.id === tutorial.replayEchoId)),
          replayFinalized: Boolean(tutorial.replayStat?.finalized),
          replayLockedFrames: tutorial.replayLockedFrames || 0,
          replayLockedSignature: tutorial.replayLockedSignature || 'empty',
          replayDeployedSignature: tutorial.replayDeployedSignature || 'empty',
          replaySignatureMatch: tutorial.replaySignatureMatch,
          syncSuccess: Boolean(tutorial.syncSuccess),
          syncWindow: tutorialSyncWindow(),
          syncFailures: tutorial.syncFailures || 0,
          nonTrainingEnemies: arrays.enemies.filter((enemy) => !enemy.dead && !enemy.trainingDummy).length,
        } : null,
        echoRecorder: player ? {
          seconds: Number(player.echoRecordSeconds.toFixed(2)),
          cooldown: Number(player.echoCooldown.toFixed(2)),
          bufferedFrames: analyzeEchoBuffer().frames,
          bufferedSignature: echoSnapshotSignature(analyzeEchoBuffer().samples),
          locked: input.isEchoLocked(),
          lockedFrames: input.getEchoLockedSamples()?.length || 0,
          lockedSignature: echoSnapshotSignature(input.getEchoLockedSamples()),
          previewing: input.isEchoPreviewing(),
          activations: echoActivations,
          damage: Math.round(echoDamageTotal),
          runDamage: Math.round(runDamageTotal),
          kills: echoKillsTotal,
          bestDamage: Math.round(echoBestDamage),
          liveEchoes: arrays.echoes.length,
          activeSignature: echoSnapshotSignature(arrays.echoes[0]?.samples),
          pendingReports: echoReports.length,
          deferredReports: deferredEchoReports.length,
          linkedProjectiles: arrays.playerBullets.filter((bullet) => Boolean(bullet.echoStat)).length,
          linkedBurns: arrays.enemies.reduce((count, enemy) => count + (enemy.dead ? 0 : (enemy.burnSources || []).filter((source) => source.remaining > 0 && source.echoStat).length), 0),
          linkedPhaseRifts: arrays.enemies.filter((enemy) => !enemy.dead && enemy.phaseRiftTime > 0 && enemy.phaseRiftSourceStat).length,
          lastReport: lastEchoReport ? { ...lastEchoReport } : null,
        } : null,
        audio: audio.status(),
      });
    },
  });

  // Gated QA controls are only constructed when an automated harness requests them
  // before this script runs (or when the page is opened with ?qa=1 / #qa).
  const qaRequested = Boolean(window.__ECHO_QA_REQUESTED__) || new URLSearchParams(location.search).has('qa') || location.hash === '#qa';
  if (qaRequested) {
    Object.defineProperty(window, '__echoRiftQA', {
      value: Object.freeze({
        start: () => startGame(),
        startTraining: () => startGame({ training: true }),
        startAdvancedTraining: () => startGame({ training: true, advancedTraining: true }),
        skipTraining: () => { finishEchoTutorial(true); return !tutorial?.active; },
        activateEcho: () => { if (!player || gameState !== 'playing') return false; player.echoCooldown = 0; activateEcho(); return arrays.echoes.length > 0; },
        status: () => window.echoRiftStatus,
        lockChoice: (index = 0) => {
          const choice = currentUpgradeChoices[Math.max(0, Math.floor(Number(index) || 0))];
          if (choice) toggleUpgradeLock(choice);
          return [...lockedUpgradeIds];
        },
        reroll: () => {
          rerollUpgradeChoices();
          return window.echoRiftStatus;
        },
        audioStatus: () => audio.status(),
        renderBenchmark: (options = {}) => renderBenchmark(options),
        audioTest: async () => {
          const ready = await audio.init();
          if (ready) audio.soundTest();
          return audio.status();
        },
        tick: (frames = 1, draw = false) => {
          const count = clamp(Math.floor(Number(frames) || 1), 1, 3600);
          for (let i = 0; i < count && gameState === 'playing'; i++) updateGame(FIXED_DT);
          if (draw) render(performance.now() / 1000);
          return window.echoRiftStatus;
        },
        render: () => { render(performance.now() / 1000); return true; },
        fillEchoPattern: (variant = 0, frames = 183) => {
          if (!player) return false;
          const count = clamp(Math.floor(Number(frames) || 183), 45, 360);
          const baseX = WORLD.w / 2 + Number(variant || 0) * 37;
          const baseY = WORLD.h / 2 - Number(variant || 0) * 23;
          player.history = Array.from({ length: count }, (_, index) => ({
            x: baseX + index * (variant % 2 ? -0.72 : 0.86),
            y: baseY + Math.sin(index * 0.075 + variant) * (32 + variant * 3),
            angle: variant * 0.31 + Math.sin(index * 0.042) * 0.22,
            fire: index % (variant % 2 ? 5 : 4) === 0,
            dash: index === Math.floor(count * 0.56),
          }));
          return echoSnapshotSignature(player.history);
        },
        readyEcho: () => { if (!player) return false; player.echoCooldown = 0; return true; },
        beginEcho: (device = 'keyboard') => input.beginEcho(device),
        releaseEcho: (device = 'keyboard') => input.endEcho(device),
        cancelEcho: () => input.cancelEcho('qa', false),
        setInputDevice: (device = 'keyboard') => {
          const allowed = ['keyboard', 'mouse', 'touch', 'gamepad'];
          input.setLastDevice(allowed.includes(device) ? device : 'keyboard');
          return { ...window.echoRiftStatus.input };
        },
        setTouchControlsMode: (mode = 'auto') => {
          settings.touchControlsMode = ['auto', 'always', 'hidden'].includes(mode) ? mode : 'auto';
          saveJSON(SETTINGS_KEY, settings);
          applySettings();
          return { ...window.echoRiftStatus.input };
        },
        setTutorialTiming: (mode = 'adaptive') => {
          settings.tutorialTimingMode = ['adaptive', 'relaxed', 'strict'].includes(mode) ? mode : 'adaptive';
          if (tutorial) tutorial.syncWindowSeconds = NaN;
          saveJSON(SETTINGS_KEY, settings);
          applySettings();
          refreshTutorialCopy(true);
          return tutorialSyncWindow();
        },
        spawnPhaseRiftTarget: (hp = 2400) => {
          if (!player || gameState !== 'playing') return null;
          arrays.enemies.length = 0;
          while (arrays.enemyBullets.length) recycleEnemyBullet(arrays.enemyBullets.length - 1);
          arrays.lasers.length = 0;
          enemyGrid.clear();
          if (currentWave) { currentWave.spawnTimer = 9999; currentWave.spawnRemaining = Math.max(1, currentWave.spawnRemaining || 1); currentWave.completed = false; currentWave.clearTimer = 0; }
          const target = spawnEnemy('gunner', player.x + 300, player.y, true);
          if (!target) return null;
          target.spawnTime = 0;
          target.hp = target.maxHp = Math.max(500, Number(hp) || 2400);
          target.speed = 0;
          target.damage = 0;
          target.attackMult = 0;
          target.shootTimer = 9999;
          target.noReward = true;
          target.qaEchoStat = { id: nextEntityId++, damage: 0, dotDamage: 0, phaseRifts: 0, phaseRiftBonusDamage: 0, kills: 0, hits: 0, shots: 1, queued: false };
          enemyGrid.rebuild(arrays.enemies);
          return { id: target.id, hp: target.hp };
        },
        phaseRiftHit: (id, source = 'present', amount = 100) => {
          const target = arrays.enemies.find((enemy) => enemy.id === Number(id) && !enemy.dead);
          if (!target) return null;
          const options = source === 'echo'
            ? { fromEcho: true, echoStat: target.qaEchoStat }
            : source === 'drone'
              ? { fromDrone: true }
              : source === 'echoDot'
                ? { fromEcho: true, echoStat: target.qaEchoStat, dot: true }
                : source === 'presentDot'
                  ? { dot: true }
                  : {};
          const dealt = damageEnemy(target, Math.max(0, Number(amount) || 0), false, target.x, target.y, options);
          return {
            dealt: Number(dealt.toFixed(3)),
            hp: Number(target.hp.toFixed(3)),
            active: Number((target.phaseRiftTime || 0).toFixed(3)),
            cooldown: Number((target.phaseRiftCooldown || 0).toFixed(3)),
            procs: phaseRiftProcs,
            bonusDamage: Number(phaseRiftBonusDamage.toFixed(3)),
            echoStat: { ...target.qaEchoStat },
          };
        },
        phaseRiftTarget: (id) => {
          const target = arrays.enemies.find((enemy) => enemy.id === Number(id));
          return target ? {
            id: target.id,
            hp: Number(target.hp.toFixed(3)),
            active: Number((target.phaseRiftTime || 0).toFixed(3)),
            cooldown: Number((target.phaseRiftCooldown || 0).toFixed(3)),
            lastPresentHit: Number((target.phaseRiftLastPresentHit || -999).toFixed(3)),
            lastEchoHit: Number((target.phaseRiftLastEchoHit || -999).toFixed(3)),
            echoStat: target.qaEchoStat ? { ...target.qaEchoStat } : null,
          } : null;
        },
        queuePhaseRiftReport: (id) => {
          const target = arrays.enemies.find((enemy) => enemy.id === Number(id));
          if (!target?.qaEchoStat) return null;
          queueEchoReport(target.qaEchoStat);
          return { pendingReports: echoReports.length, linkedPhaseRifts: window.echoRiftStatus.echoRecorder?.linkedPhaseRifts || 0 };
        },
        tutorialStep: (step = 0) => { if (!tutorial?.active) return false; setTutorialStep(step); return tutorial.step; },
        tutorialPhaseProbe: () => {
          if (!tutorial?.active) return null;
          if (tutorial.step !== 5) setTutorialStep(5);
          const echoTarget = arrays.enemies.find((enemy) => enemy.trainingRole === 'echo');
          const presentTarget = arrays.enemies.find((enemy) => enemy.trainingRole === 'present');
          if (!echoTarget || !presentTarget) return null;
          const wrongEcho = damageEnemy(echoTarget, 10, false, echoTarget.x, echoTarget.y, { fromEcho: false });
          const wrongPresent = damageEnemy(presentTarget, 10, false, presentTarget.x, presentTarget.y, { fromEcho: true, echoStat: { damage:0,hits:0,shots:1 } });
          const stat = { damage:0,hits:0,shots:1 };
          const rightEcho = damageEnemy(echoTarget, 10, false, echoTarget.x, echoTarget.y, { fromEcho: true, echoStat: stat });
          const rightPresent = damageEnemy(presentTarget, 10, false, presentTarget.x, presentTarget.y, { fromEcho: false });
          return { wrongEcho, wrongPresent, rightEcho, rightPresent, syncSuccess: Boolean(tutorial.syncSuccess) };
        },
        tutorialHit: (role = 'present', fromEcho = false) => {
          if (!tutorial?.active) return null;
          if (tutorial.step !== 5) setTutorialStep(5);
          const target = arrays.enemies.find((enemy) => enemy.trainingRole === role);
          if (!target) return null;
          const stat = fromEcho ? { damage: 0, dotDamage: 0, hits: 0, shots: 1 } : null;
          const dealt = damageEnemy(target, 10, false, target.x, target.y, { fromEcho: Boolean(fromEcho), echoStat: stat });
          return { dealt, role, fromEcho: Boolean(fromEcho), syncSuccess: Boolean(tutorial.syncSuccess), syncWindow: tutorialSyncWindow() };
        },
        startEchoReportProbe: (distance = 520) => {
          if (!player || gameState !== 'playing') return null;
          clearTrainingDummies();
          while (arrays.playerBullets.length) recyclePlayerBullet(arrays.playerBullets.length - 1);
          echoReports.length = 0;
          deferredEchoReports.length = 0;
          lastEchoReport = null;
          UI.echoReport?.classList.add('hidden');
          if (currentWave) { currentWave.spawnTimer = 9999; currentWave.spawnRemaining = 1; }
          const target = spawnTrainingDummy(player.x + Math.max(180, Number(distance) || 520), player.y, true, 'neutral');
          const stat = { id: nextEntityId++, damage: 0, kills: 0, hits: 0, shots: 1, recordedShots: 1, recordedDashes: 0, recordedDistance: 0, queued: false };
          spawnPlayerBullet(player.x + 20, player.y, 0, Math.max(10, player.damage), { fromEcho: true, echoStat: stat, speed: player.bulletSpeed, life: player.bulletLife });
          queueEchoReport(stat);
          return { statId: stat.id, targetId: target?.id || null, deadline: echoReports[0]?.deadline || null };
        },
        startEchoBurnReportProbe: (duration = 2.8) => {
          if (!player || gameState !== 'playing') return null;
          clearTrainingDummies();
          while (arrays.playerBullets.length) recyclePlayerBullet(arrays.playerBullets.length - 1);
          echoReports.length = 0;
          deferredEchoReports.length = 0;
          lastEchoReport = null;
          UI.echoReport?.classList.add('hidden');
          if (currentWave) { currentWave.spawnTimer = 9999; currentWave.spawnRemaining = 1; }
          const target = spawnTrainingDummy(player.x + 260, player.y, true, 'neutral');
          const stat = { id: nextEntityId++, damage: 0, kills: 0, hits: 1, shots: 1, recordedShots: 1, recordedDashes: 0, recordedDistance: 0, queued: false };
          applyBurnSource(target, 12, Math.max(0.5, Number(duration) || 2.8), { fromEcho: true, echoStat: stat });
          queueEchoReport(stat);
          return { statId: stat.id, targetId: target.id, deadline: echoReports[0]?.deadline || null };
        },
        startMixedBurnAttributionProbe: () => {
          if (!player || gameState !== 'playing') return null;
          clearTrainingDummies();
          while (arrays.playerBullets.length) recyclePlayerBullet(arrays.playerBullets.length - 1);
          echoReports.length = 0;
          deferredEchoReports.length = 0;
          lastEchoReport = null;
          UI.echoReport?.classList.add('hidden');
          if (currentWave) { currentWave.spawnTimer = 9999; currentWave.spawnRemaining = 1; }
          const target = spawnTrainingDummy(player.x + 260, player.y, true, 'neutral');
          const stat = { id: nextEntityId++, damage: 0, dotDamage: 0, kills: 0, hits: 1, shots: 1, recordedShots: 1, recordedDashes: 0, recordedDistance: 0, queued: false };
          // A stronger present-time burn owns the first second. The echo burn
          // remains independently tracked and owns only its later ticks.
          applyBurnSource(target, 12, 2.8, { fromEcho: true, echoStat: stat });
          applyBurnSource(target, 20, 1.05, { fromEcho: false, echoStat: null });
          queueEchoReport(stat);
          return { statId: stat.id, targetId: target.id, sources: target.burnSources.length, deadline: echoReports[0]?.deadline || null };
        },
        showDraft: (ids = ['magnet', 'regen', 'coreHunter', 'echoCount'], rarities = ['common', 'uncommon', 'common', 'rare']) => {
          if (!player) startGame();
          if (!player) return false;
          const choices = ids.map((id, index) => {
            const upgrade = upgrades.find((item) => item.id === id);
            const rarityKey = rarityInfo[rarities[index]] ? rarities[index] : 'common';
            return upgrade ? { upgrade, rarityKey, quality: rarityInfo[rarityKey] } : null;
          }).filter(Boolean);
          if (!choices.length) return false;
          gameState = 'upgrade';
          document.body.classList.add('choice-open');
          audio.setGameState(false);
          renderUpgradeChoices(choices, false);
          showScreen(UI.upgrade);
          return choices.map((choice) => choice.upgrade.id);
        },
        grantLevel: (count = 1) => {
          if (!player || gameState !== 'playing') return false;
          for (let i = 0; i < Math.max(1, Math.floor(count)); i++) gainXP(player.xpNext - player.xp + 1);
          if (pendingLevelUps > 0) openUpgradeScreen();
          return true;
        },
        choose: (index = 0) => {
          if (gameState !== 'upgrade') return false;
          const choice = currentUpgradeChoices[Math.max(0, Math.min(currentUpgradeChoices.length - 1, Math.floor(index)))];
          if (!choice) return false;
          selectUpgrade(choice);
          return true;
        },
        pause: () => { pauseGame(); return gameState; },
        resume: () => { resumeGame(); return gameState; },
        startBossIntro: (number = 6) => {
          if (!player) return false;
          arrays.enemies.length = 0;
          while (arrays.playerBullets.length) recyclePlayerBullet(arrays.playerBullets.length - 1);
          while (arrays.enemyBullets.length) recycleEnemyBullet(arrays.enemyBullets.length - 1);
          arrays.lasers.length = 0;
          startWave(Math.max(6, Math.floor(Number(number) || 6)), null);
          return window.echoRiftStatus.bossIntro;
        },
        finishBossIntro: () => finishBossIntro(),
        bossIntroDamageProbe: (amount = 999) => {
          if (!player || !currentWave?.isBoss) return null;
          const before = { hp: player.hp, shield: player.shield };
          const applied = damagePlayer(Math.max(1, Number(amount) || 999), player.x + 10, player.y);
          return { applied, before, after: { hp: player.hp, shield: player.shield }, cutscene: bossCutsceneActive() };
        },
        finishBossCutscene: () => {
          if (!currentWave?.isBoss) return false;
          if (currentWave.introActive) finishBossIntro();
          const boss = arrays.enemies.find((enemy) => !enemy.dead && enemy.type === 'boss');
          if (boss) boss.spawnTime = 0;
          return activateBossCombat();
        },
        hitBossDuringIntro: (amount = 100) => {
          const boss = arrays.enemies.find((enemy) => !enemy.dead && enemy.type === 'boss');
          if (!boss) return null;
          const before = boss.hp;
          const dealt = damageEnemy(boss, Math.max(0, Number(amount) || 0), false, boss.x, boss.y, {});
          return { before, dealt, after: boss.hp, combatLive: Boolean(currentWave?.combatLive) };
        },
        setWave: (number) => {
          if (!player) return false;
          arrays.enemies.length = 0;
          while (arrays.enemyBullets.length) recycleEnemyBullet(arrays.enemyBullets.length - 1);
          arrays.lasers.length = 0;
          startWave(Math.max(1, Math.floor(number)), null);
          return true;
        },
        freezeCombat: () => {
          if (!player || gameState !== 'playing' || !currentWave) return false;
          for (const enemy of arrays.enemies) { enemy.dead = true; enemy.noReward = true; }
          resolveEnemyDeaths();
          while (arrays.enemyBullets.length) recycleEnemyBullet(arrays.enemyBullets.length - 1);
          arrays.lasers.length = 0;
          currentWave.spawnTimer = 9999;
          currentWave.spawnRemaining = Math.max(1, currentWave.spawnRemaining || 1);
          currentWave.completed = false;
          currentWave.clearTimer = 0;
          return true;
        },
        spawnElite: (type = 'gunner') => {
          if (!player) return false;
          const enemy = spawnEnemy(type);
          if (!enemy) return false;
          if (!enemy.elite && enemy.type !== 'boss') applyElite(enemy);
          enemy.spawnTime = 0;
          return true;
        },
        spawnEnemy: (type = 'wisp') => {
          if (!player || gameState !== 'playing') return false;
          const enemy = spawnEnemy(type);
          if (!enemy) return false;
          enemy.spawnTime = 0;
          return true;
        },
        applyUpgrade: (id, rarityKey = 'common') => {
          if (!player || gameState !== 'playing') return false;
          const upgrade = upgrades.find((item) => item.id === id);
          const quality = rarityInfo[rarityKey] || rarityInfo.common;
          if (!upgrade) return false;
          player.upgradeLevels[upgrade.id] = (player.upgradeLevels[upgrade.id] || 0) + 1;
          player.familyRanks[upgrade.family] = (player.familyRanks[upgrade.family] || 0) + (upgrade.evolution ? 3 : 1);
          upgrade.apply(player, quality, rarityKey);
          return true;
        },
        openRoute: (nextWave = 2) => {
          if (!player || gameState !== 'playing') return false;
          stabilizeBetweenWaves();
          openRouteScreen(Math.max(2, Math.floor(nextWave)));
          return gameState === 'route';
        },
        chooseRoute: (index = 0) => {
          if (gameState !== 'route') return false;
          const route = pendingRouteChoices[Math.max(0, Math.min(pendingRouteChoices.length - 1, Math.floor(index)))];
          if (!route) return false;
          selectRoute(route);
          return true;
        },
        completeWave: () => {
          if (!player || gameState !== 'playing' || !currentWave) return false;
          currentWave.spawnRemaining = 0;
          currentWave.bossSpawned = true;
          for (const enemy of arrays.enemies) enemy.dead = true;
          resolveEnemyDeaths();
          currentWave.clearTimer = 2;
          updateWave(FIXED_DT);
          return true;
        },
        forceAutoTier: (tier = 0) => {
          settings.graphicsMode = 'auto';
          settings.reducedMotion = false;
          settings.autoQualityTier = clamp(Math.floor(tier), 0, 2);
          quality = settings.autoQualityTier;
          document.body.dataset.quality = String(quality);
          autoQualityLocked = quality === 0;
          resetQualitySampling();
          saveJSON(SETTINGS_KEY, settings);
          updateAutoQualityStatus();
          resizeCanvas();
          return quality;
        },
        catalog: () => Object.freeze({
          upgrades: upgrades.map((upgrade) => upgrade.id),
          evolutions: upgrades.filter((upgrade) => upgrade.evolution).map((upgrade) => upgrade.id),
          rarities: [...rarityOrder],
          metaNodes: metaNodes.map((node) => node.id),
          routes: routeCatalog.map((route) => route.id),
        }),
        botStep: () => {
          if (!player || gameState !== 'playing') return false;
          const targets = arrays.enemies.filter((enemy) => !enemy.dead && enemy.spawnTime <= 0);
          let target = null;
          let best = Infinity;
          for (const enemy of targets) {
            const d = sqr(enemy.x - player.x) + sqr(enemy.y - player.y);
            if (d < best) { best = d; target = enemy; }
          }
          if (target) {
            const dx = target.x - player.x;
            const dy = target.y - player.y;
            const n = normalize(dx, dy);
            input.touchAim = { x: n.x, y: n.y, active: true };
            input.touchFire = true;
            const distance = Math.sqrt(best);
            const orbit = Math.sin(gameTime * 0.43) > 0 ? 1 : -1;
            const away = distance < 285 ? -1 : distance > 520 ? 0.35 : 0;
            let mx = n.x * away + -n.y * orbit * 0.88;
            let my = n.y * away + n.x * orbit * 0.88;
            // Softly steer away from arena edges so the test bot demonstrates realistic movement.
            mx += clamp((WORLD.w / 2 - player.x) / 620, -0.65, 0.65);
            my += clamp((WORLD.h / 2 - player.y) / 420, -0.65, 0.65);
            const movement = normalize(mx, my);
            input.touchMove = movement;
            if (distance < 145 && player.dashCooldown <= 0.01) input.actions.dash = true;
            if (player.echoCooldown <= 0.01 && player.history.length >= 60 && targets.length >= 5) input.actions.echo = true;
          } else {
            input.touchMove = { x: 0, y: 0 };
            input.touchAim = { x: 1, y: 0, active: true };
            input.touchFire = false;
          }
          return true;
        },
        clearEnemies: () => {
          for (const enemy of arrays.enemies) { enemy.dead = true; enemy.noReward = false; }
          resolveEnemyDeaths();
          return true;
        },
        forceVictory: () => {
          if (!player || gameState !== 'playing') return false;
          currentWave = { ...(currentWave || {}), number: 6 };
          showVictory();
          return gameState === 'victory';
        },
        continueEndless: () => {
          if (gameState !== 'victory') return false;
          continueEndless();
          return gameState === 'playing' && endlessMode && currentWave?.number === 7;
        },
        killPlayer: () => {
          if (!player || gameState !== 'playing') return false;
          player.extraLife = 0;
          player.defianceCharges = 0;
          player.invuln = 0;
          player.shield = 0;
          damagePlayer(player.maxHp * 20, player.x - 1, player.y);
          return true;
        },
        grantCores: (amount = 500) => {
          saveData.cores += Math.max(0, Math.floor(amount));
          saveData.totalCores += Math.max(0, Math.floor(amount));
          saveJSON(SAVE_KEY, saveData);
          refreshMenuStats();
          return saveData.cores;
        },
        resetSave: () => {
          localStorage.removeItem(SAVE_KEY);
          localStorage.removeItem(LEGACY_SAVE_KEY);
          return true;
        },
      }),
      configurable: false,
      writable: false,
    });
  }

  initLongFrameObserver();
  initBackground();
  applySettings();
  refreshMenuStats();
  resizeCanvas();

  let lastFrame = performance.now();
  let accumulator = 0;
  function frame(now) {
    const frameDt = Math.min(0.1, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    updateQuality(frameDt);
    if (gameState !== 'playing') input.updateGamepad();

    if (gameState === 'playing') {
      accumulator += frameDt;
      let steps = 0;
      while (accumulator >= FIXED_DT && steps < 6 && gameState === 'playing') {
        updateGame(FIXED_DT);
        accumulator -= FIXED_DT;
        steps++;
      }
      if (steps >= 6) accumulator = 0;
    } else {
      accumulator = 0;
      if (!player && gameState === 'menu') {
        camera.x = WORLD.w / 2 + Math.sin(now * 0.00007) * 160;
        camera.y = WORLD.h / 2 + Math.cos(now * 0.00005) * 90;
      }
    }

    render(now / 1000);
    requestAnimationFrame(frame);
  }
  if (!window.__ECHO_MANUAL_FRAME__) requestAnimationFrame(frame);
})();
