(() => {
  'use strict';

  const ACTIONS = Object.freeze([
    { id: 'moveUp', label: '이동 위', group: '이동' },
    { id: 'moveDown', label: '이동 아래', group: '이동' },
    { id: 'moveLeft', label: '이동 왼쪽', group: '이동' },
    { id: 'moveRight', label: '이동 오른쪽', group: '이동' },
    { id: 'aimUp', label: '조준 위', group: '조준' },
    { id: 'aimDown', label: '조준 아래', group: '조준' },
    { id: 'aimLeft', label: '조준 왼쪽', group: '조준' },
    { id: 'aimRight', label: '조준 오른쪽', group: '조준' },
    { id: 'fire', label: '사격', group: '전투' },
    { id: 'dash', label: '대시', group: '전투' },
    { id: 'echoPrimary', label: '잔향 호출 1', group: '전투' },
    { id: 'echoSecondary', label: '잔향 호출 2', group: '전투' },
    { id: 'reroll', label: '선택지 재구성', group: '메뉴' },
    { id: 'pause', label: '일시정지', group: '메뉴' },
  ]);

  const DEFAULT_BINDINGS = Object.freeze({
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
  });

  const LABELS = Object.freeze({
    Space: 'SPACE',
    Escape: 'ESC',
    Tab: 'TAB',
    Enter: 'ENTER',
    Backspace: 'BACKSPACE',
    ShiftLeft: 'L SHIFT',
    ShiftRight: 'R SHIFT',
    ControlLeft: 'L CTRL',
    ControlRight: 'R CTRL',
    AltLeft: 'L ALT',
    AltRight: 'R ALT',
    ArrowUp: 'UP',
    ArrowDown: 'DOWN',
    ArrowLeft: 'LEFT',
    ArrowRight: 'RIGHT',
  });

  const actionIds = new Set(ACTIONS.map((action) => action.id));
  const validCode = /^[A-Za-z0-9]+(?:Left|Right)?$/;

  function defaultKeyBindings() {
    return { ...DEFAULT_BINDINGS };
  }

  function normalizeToken(token, fallback) {
    if (typeof token !== 'string') return fallback;
    const trimmed = token.trim();
    if (!trimmed || trimmed.length > 32) return fallback;
    if (LABELS[trimmed] || /^Key[A-Z]$/.test(trimmed) || /^Digit[0-9]$/.test(trimmed) || /^Numpad[0-9]$/.test(trimmed) || /^F(?:[1-9]|1[0-2])$/.test(trimmed)) return trimmed;
    return validCode.test(trimmed) ? trimmed : fallback;
  }

  function normalizeKeyBindingMap(raw = {}) {
    const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const normalized = defaultKeyBindings();
    for (const action of ACTIONS) {
      normalized[action.id] = normalizeToken(source[action.id], DEFAULT_BINDINGS[action.id]);
    }
    return normalized;
  }

  function eventToken(event) {
    if (!event) return '';
    if (typeof event.code === 'string' && event.code) return event.code;
    const key = String(event.key || '');
    if (key === ' ') return 'Space';
    if (key.length === 1 && /[a-z]/i.test(key)) return `Key${key.toUpperCase()}`;
    if (key.length === 1 && /[0-9]/.test(key)) return `Digit${key}`;
    return normalizeToken(key, '');
  }

  function keyLabel(token) {
    const normalized = normalizeToken(token, '');
    if (!normalized) return '미지정';
    if (LABELS[normalized]) return LABELS[normalized];
    if (/^Key[A-Z]$/.test(normalized)) return normalized.slice(3);
    if (/^Digit[0-9]$/.test(normalized)) return normalized.slice(5);
    if (/^Numpad[0-9]$/.test(normalized)) return `NUM ${normalized.slice(6)}`;
    return normalized.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase();
  }

  function actionDefinitions() {
    return ACTIONS.map((action) => ({ ...action }));
  }

  function bindingFor(bindings, actionId) {
    if (!actionIds.has(actionId)) return '';
    const normalized = normalizeKeyBindingMap(bindings);
    return normalized[actionId] || DEFAULT_BINDINGS[actionId];
  }

  function matchesAction(bindings, actionId, token) {
    if (!actionIds.has(actionId)) return false;
    return bindingFor(bindings, actionId) === normalizeToken(token, '');
  }

  window.EchoRiftControlBindings = Object.freeze({
    actionDefinitions,
    bindingFor,
    defaultKeyBindings,
    eventToken,
    keyLabel,
    matchesAction,
    normalizeKeyBindingMap,
  });
})();
