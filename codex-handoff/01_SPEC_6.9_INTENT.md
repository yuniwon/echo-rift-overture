# ECHO RIFT 6.9 "INTENT" — 명세서 (Codex 작업용)

> 작성: 기획/아키텍처 담당 (선임 에이전트)
> 대상: 구현 담당 **Codex**
> 기준 소스: `main` 브랜치, v6.8.0 SIGNAL 머지 직후 (`js/game.js` 약 8,430줄, 외부 의존성 0인 Canvas 2D PWA)

---

## 1. 이번 릴리스의 단일 목표

**선택 통제와 데이터 안전.** 플레이어가 강화 선택을 더 능동적으로 협상하게 하고(부분 리롤),
브라우저 저장의 취약성(삭제·시크릿 모드·기기 이동)을 사용자 스스로 백업·복원할 수 있게 한다.

한 릴리스에서 **큰 독립 시스템은 2개까지만** 구현한다. 이번 범위:

| 우선순위 | 시스템 | 비고 |
|---|---|---|
| **P0** | 카드 고정 · 부분 리롤 | 핵심 플레이 변경 |
| **P0** | 저장 내보내기 · 가져오기 (JSON, 오프라인) | 데이터 안전 |
| P1(포함) | 로컬 런 기록 (최근 20개 요약) | 내보내기 봉투에 함께 포함, 분량이 커지면 6.9.1로 분리 |
| **제외** | 로컬 텔레메트리 | 이번 릴리스 비목표. 6.9.1 이후 별도 지시 |

권장 버전: **6.9.0**, 코드네임 **INTENT**.

---

## 2. 전달 기준선 (v6.8.0 SIGNAL에서 확인된 실제 구조)

이 명세는 추측이 아니라 실제 소스에서 확인한 이름을 사용한다. Codex는 그대로 신뢰하되,
편집 전 해당 함수를 한 번 더 열어 시그니처를 확인한다.

### 2.1 강화 선택/리롤 (실제 함수)

- `createUpgradeChoices(count = 4, isReroll = false)` — `js/game.js:3398`
  - `upgrades.filter(upgradeEligible)` 풀에서 `weightedChoice`로 뽑고, 동일 id 중복을 막는 지역 `excluded` Set 사용.
  - 반환 원소 형태: `{ upgrade, rarityKey, quality }` (`upgrade.id`, `upgrade.family`, `upgrade.name`, `upgrade.max` 등 보유).
  - **현재 외부 exclude 인자가 없다.** 부분 리롤을 위해 `options.excludeIds`를 추가해야 한다.
- `renderUpgradeChoices(choices, playRevealSound = true)` — `js/game.js:3513`
  - `currentUpgradeChoices = choices` 설정, `UI.upgradeChoices.innerHTML = ''` 후 카드 버튼 생성.
  - `#rerollCount`, `#rerollBtn` 갱신. 카드 클릭 → `selectUpgrade(choice)`.
- `rerollUpgradeChoices()` — `js/game.js:3610`
  - 현재: `player.rerolls--` 후 **전체** 재생성(`createUpgradeChoices(... , true)`) → `renderUpgradeChoices`.
- `selectUpgrade(choice)` — `js/game.js:3584`: 적용 후 `currentUpgradeChoices = []`.
- `openUpgradeScreen()` — `js/game.js:3563`: 새 강화 화면 진입 지점.
- 전역 상태: `currentUpgradeChoices` (`js/game.js:1612`), `player.rerolls`, `player.choiceCount`, `activeDraftChoiceBonus`.
- DOM: `#rerollBtn`, `#rerollCount`, `UI.upgradeChoices`.

### 2.2 저장/설정 (실제 키와 헬퍼)

- `SAVE_KEY = 'echoRiftSaveV2'` (`:101`), `LEGACY_SAVE_KEY = 'echoRiftSaveV1'` (`:102`), `SETTINGS_KEY = 'echoRiftSettingsV1'` (`:103`).
- `loadJSON(key, fallback)` (`:189`) — `{ ...fallback, ...JSON.parse(raw) }` 병합, 실패 시 fallback.
- `saveJSON(key, value)` (`:198`) — try/catch 래핑.
- `saveData` 객체 (`loadSaveData` `:255` 결과): `bestScore, bestTime, bestSector, runs, wins, tutorialSeen, advancedTutorialSeen, cores, totalCores, meta{...}`.
- `settings` 객체 + `applySettings()` (`:259`) — 모든 설정 검증·DOM 동기화의 단일 지점.
- 설정 추가 패턴(6.8에서 검증): `defaultSettings`에 키 추가 → `applySettings()`에서 검증·`$('#…')` 동기화 → 바인딩 블록(약 `:7600~`)에 `change` 이벤트 추가.

### 2.3 런 종료 지점 (런 기록 훅)

- `endGame()` (`:6132`) — 사망. `settleRun(1)` 호출, `#finalScore/#finalTime/#finalWave/#finalKills`, `buildRunRecap()` 사용.
- `showVictory()` (`:6175`) — 승리. `saveData.wins++`.
- 런 데이터 출처: `score`, `gameTime`, `currentWave?.number`, `kills`, `player.level`, `strongestFamilies()` (`:3444`, 상위 3계열), `buildRunRecap()` (`:5919`, 잔향 비율·위상 균열 등 계산).
- 결정성 시드가 있다면 런 기록 `seed` 필드로 사용 (없으면 생략하고 `endedAt`만 기록).

### 2.4 QA 훅 (테스트 진입점)

- `window.echoRiftStatus` (getter, `:7817`) — 이미 `choices: currentUpgradeChoices.map(c => ({ id: c.upgrade.id, rarity: c.rarityKey }))` (`:7867`) 노출.
- `window.__echoRiftQA` (`:7948`) — `grantLevel` 등 테스트 훅 보유. 신규 기능 테스트 훅은 여기에 추가하되 **일반 실행에 부작용을 만들지 않는다.**

---

## 3. 회귀 금지 조건 (절대 깨지 말 것)

6.8까지의 제품 계약. 구현 방식이 달라도 동작은 유지한다.

1. **잔향**: 입력 순간 스냅숏 고정, 미리보기=실제 전개, 취소 시 쿨다운 미소비, 마지막 에코 탄환·지속 피해 후 리포트 확정, 위상 균열 수치·출처 제한.
2. **경로**: 화면 예측값 = 실제 다음 웨이브 수치, 선택 후 재추첨 없음.
3. **튜토리얼**: 기본 4단계 / 고급 분리, 장치별 문구 일치.
4. **보스 인트로/실체화**: 피해 0, 시뮬레이션·런 타이머 정지, `COMBAT LIVE` 후 첫 공격 유예.
5. **자동 품질**: 런 중 재상향 금지, `다시 측정` 전까지 자동 시작 단계 유지.
6. **6.8 SIGNAL**: 투사체 소유권 형상(현재=화살/잔향=마름모/적=고리), 색약 팔레트(`combatPalette`), `projectileShapes` 토글, 결과 화면 대비, 짧은 가로 메뉴 CTA — 모두 유지.
7. **저장 호환**: 기존 `localStorage` 키(`echoRiftSaveV2`, `echoRiftSettingsV1`)를 임의 교체 금지. 새 필드는 fallback·migration 제공. 불러오기 실패 시 기존 저장 보존.
8. **오프라인 PWA**: 외부 CDN/폰트/엔진/네트워크 계정 추가 금지. **export/import는 파일 다운로드·업로드만 사용하고 네트워크 전송 0.**
9. **성능**: 전투 중 매 프레임 DOM 생성·`querySelector` 금지. 선택 화면 DOM은 1,000 노드 미만 권장.

---

## 4. 기능 명세

### 4.1 카드 고정 · 부분 리롤 (P0)

#### 문제
괜찮은 카드 1장과 나쁜 카드 여러 장이 섞였을 때 전체 리롤은 좋은 카드까지 버린다. 의도와 운의 협상 여지가 없다.

#### 필수 동작
- 각 강화 카드에 **잠금 토글 버튼**.
- 리롤 시 잠긴 카드는 **그대로 유지**, 잠기지 않은 카드만 새로 생성.
- 리롤 비용(`player.rerolls`)은 **한 번만** 소비.
- 새로 생성되는 카드는 **잠긴 카드의 upgrade id를 제외**해 중복을 막고, `upgradeEligible`·최대 단계·진화 조건을 다시 검증.
- 카드를 **모두 잠그면** 리롤 버튼 비활성화(소비 없음).
- 잠금 상태는 **카드 선택(`selectUpgrade`) 또는 새 강화 화면(`openUpgradeScreen`) 시 초기화.**
- 키보드·게임패드·터치 모두 잠금 가능(터치 목표 최소 44×44 CSS px).

#### 완료 기준
- 1장 잠금 → 나머지만 변경. 2장 이상 잠금 가능.
- 잠금 후 리롤해도 잠긴 카드의 `upgrade.id` + `rarityKey` 동일.
- 중복 강화·최대 단계 강화가 새 카드에 나오지 않음.
- 모두 잠그면 리롤 비활성.
- 선택 후 잠금 초기화.

### 4.2 저장 내보내기 · 가져오기 (P0)

#### 문제
브라우저 저장은 캐시 삭제·시크릿 모드·기기 이동에 취약하다.

#### 필수 동작
- **내보내기**: 진행 저장(`saveData`) + (선택) 설정 + 런 기록을 **버전 봉투 JSON**으로 다운로드.
  - 봉투: `{ product:'ECHO_RIFT', exportSchemaVersion, gameVersion, exportedAt, checksum, payload }`.
  - `checksum`은 `payload` 직렬화에 대한 SHA-256(`crypto.subtle.digest`).
  - 설정 포함 여부 체크박스.
- **가져오기**: 파일 선택 → 검증 → 적용.
  - 검증: `product` 일치, `exportSchemaVersion ≤ 현재`, `payload`/`payload.save`가 plain object, 체크섬 일치, **1MB 초과 거부**.
  - 적용 전 **현재 저장을 백업 키에 보관**. 실패 시 기존 저장 **불변**.
  - 성공 후 설정·UI·오디오 즉시 재적용(또는 `location.reload()`).
  - **네트워크 전송 0** (`fetch`/`sendBeacon` 금지). `eval`·동적 스크립트 금지.

#### 완료 기준
- 새 브라우저 프로필에서 왕복 복원 성공.
- 손상 JSON·체크섬 불일치·1MB 초과·미래 schemaVersion 거부(명확한 메시지).
- 이전 schema는 migration 통과.
- 가져오기 실패 시 기존 저장·설정·기록 보존.

### 4.3 로컬 런 기록 (P1, 포함)

#### 필수 동작
- 최대 **20개** 요약만 저장(`RUN_HISTORY_KEY = 'echoRiftRunHistoryV1'`).
- 필드: `endedAt, outcome('win'|'death'), score, sector, timeSeconds, level, kills, build(상위 계열), echoShare, phaseRift(횟수/추가피해 가능 범위), seed?`.
- 전체 탄환·60Hz 전체 기록 **저장 금지**(요약만).
- `endGame()`·`showVictory()`에서 **각각 한 번만** 추가.
- 결과 화면 또는 메뉴에서 열람. 내보내기 JSON에 선택적으로 포함.

#### 완료 기준
- 21번째 추가 시 가장 오래된 항목 제거(상한 20).
- 결과 수치와 기록 수치 일치.
- 저장 크기 상한 준수. 기록 초기화 가능.

---

## 5. 하지 말 것 (비목표)

- 로컬 텔레메트리(이번 제외), 공간 장치·두 번째 보스·일일 시드(후속 Phase).
- 강화 종류 무작정 추가, 광범위한 수치 재밸런스.
- 네트워크 서버·계정, 외부 엔진 이식.
- 저장 키 전체 교체, 자동 품질 런 중 재상향 복원.
- 한 버전에 모든 백로그 합치기, UI 장식 때문에 전투 성능 희생.

---

## 6. 산출물 (릴리스 시)

- 수정된 `js/game.js`, `index.html`, `css/style.css`.
- 버전 갱신: `<title>`, 메뉴 `edition-badge`, `VERSION.txt`, `README.md`, `CHANGELOG.md`, `TECHNICAL_NOTES.md`, `QA_REPORT.md`, `manifest.webmanifest`, `sw.js`의 `CACHE_NAME`(`echo-rift-intent-v6.9.0`).
- `BASELINE_AUDIT.md`(이번 기준 재확인), `IMPLEMENTATION_PLAN.md`.
- `CHECKSUMS.sha256` 재생성·검증.

---

## 7. 완료 정의

- 명세 기능이 실제 플레이에서 작동.
- §3 회귀 금지 조건 위반 없음.
- `node --check js/game.js`, `node --check sw.js` 통과, HTML ID 중복 없음, manifest 파싱 통과.
- 저장 migration·재시작 유지·가져오기 실패 보존 통과.
- 콘솔 오류·페이지 예외 0(실제 확인한 범위만 "통과"로 기재).
- 부분 리롤·export/import·런 기록 각 기능별 테스트 통과.
- 사용자가 체감 확인 전 다음 Phase(텔레메트리·Phase 3) 구현하지 않음.
