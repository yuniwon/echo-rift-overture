# ECHO RIFT: OVERTURE 6.10 — 기술 노트 (HARDENING)

## 6.10 목표

정적 문자열 검사를 넘어서 실제 브라우저 행동으로 핵심 계약을 검증합니다. 6.9 기능은 유지하고, 저장 가져오기와 서비스워커 실패 경로를 더 엄격하게 처리합니다. 신규 강화, 전투 수치 밸런스, 콘텐츠, 온라인 텔레메트리는 추가하지 않았습니다.

## 행동 기반 검증

`scripts/verify-6.10-hardening.mjs`는 로컬 정적 서버와 Playwright를 사용해 다음 행동을 실제 브라우저에서 수행합니다.

- 카드 두 장 잠금 후 부분 리롤: 잠긴 슬롯의 id·희귀도 유지와 리롤 자원 1회 소비 확인
- 모든 카드 잠금 후 리롤: 선택지와 리롤 자원 미변경 확인
- 저장 가져오기: save/settings/runHistory 적용, unknown key 제거, meta 상한 클램프 확인
- 마지막 가져오기 되돌리기: 설정 화면 버튼 활성화, 이전 저장 복원, 백업 제거 확인
- 손상 checksum, 미래 schema, 1MB 초과 파일 거부 확인
- 보스 인트로 중 피해·게임 시간·생명·보호막 정지 확인
- 경로 예고 수치와 실제 `currentWave.modifier` 수치 일치 확인

기존 `scripts/verify-6.9.mjs`는 6.9 기능 연결과 릴리스 메타데이터 구조 검사를 계속 담당합니다.

## 저장 가져오기 하드닝

`saveJSON()`은 기존 일반 저장 호출과의 호환을 위해 실패 시 `false`를 반환하는 완화 경로로 유지합니다. 반면 가져오기는 `strictSetJSON()`과 `strictSetItem()`을 사용해 쓰기 직후 동일 값을 다시 읽어 검증합니다.

가져오기 순서:

```text
파일 파싱
→ product/schema/payload/checksum 검증
→ save/settings/runHistory 화이트리스트 정규화
→ echoRiftImportStagingV1:* 임시 키에 쓰기
→ 임시 키 다시 읽기 확인
→ 현재 SAVE/SETTINGS/RUN_HISTORY 스냅숏을 IMPORT_BACKUP_KEY에 저장
→ 실제 키로 커밋
→ 실패 시 기존 스냅숏 복원
```

설정 화면에는 `마지막 가져오기 되돌리기` 버튼을 추가했습니다. 백업이 없으면 비활성화되고, 복원 성공 뒤 백업 키를 제거한 다음 새로고침합니다.

## 정규화 경계

저장 데이터는 알려진 save 필드와 `defaultMeta` 키만 남깁니다. boolean은 명시적 `true`만 인정하고, 숫자 필드는 유한 number만 받아 범위 안으로 보정합니다. meta 연구값은 실제 연구 노드 상한에 맞춰 클램프합니다.

설정 데이터는 `defaultSettings`의 키만 순회해 number/boolean/enum을 정규화합니다. 알 수 없는 설정 키와 잘못된 타입은 저장되지 않습니다.

## 서비스워커 폴백

`CACHE_NAME`은 `echo-rift-hardening-v6.10.0`입니다. fetch 전략은 요청 종류별로 분리했습니다.

- `request.mode === 'navigate'`: 네트워크 우선, 실패 시에만 캐시된 `index.html` 반환
- 스크립트·CSS·이미지·manifest 등 에셋: 캐시 우선, 네트워크 실패 시 `Response.error()`
- 동일 출처이면서 `response.ok`인 응답만 런타임 캐시에 저장
- `cache.put()`은 await해 404나 불완전 응답을 숨기지 않습니다.

## 접근성

viewport에서 `user-scalable=no`를 제거해 브라우저 확대를 허용했습니다. 게임 플레이 중 의도하지 않은 터치 확대와 스크롤은 기존처럼 캔버스와 터치 조작 영역의 `touch-action`으로 제한합니다.

---

## 6.9 목표

선택 통제와 데이터 안전을 추가합니다. 강화 선택은 카드별 잠금과 부분 리롤을 지원하고, 브라우저 저장은 오프라인 JSON 내보내기·가져오기와 최근 런 기록으로 보강합니다. 신규 강화, 수치 밸런스, 텔레메트리, 외부 서비스는 추가하지 않았습니다.

## 카드 잠금과 부분 리롤

`currentUpgradeChoices` 옆에 `lockedUpgradeIds` Set을 추가했습니다. 잠금 기준은 `upgrade.id`입니다. 현재 선택 화면에서는 동일 id가 중복되지 않으므로 카드 정체성을 id와 `rarityKey`로 유지할 수 있습니다.

`createUpgradeChoices(count, isReroll, options = {})`는 `options.excludeIds`를 받아 후보 풀에서 해당 id를 제외합니다. `rerollUpgradeChoices()`는 현재 카드 배열에서 잠긴 슬롯을 유지하고, 잠기지 않은 슬롯 수만큼 새 선택지를 생성해 원래 위치에 채웁니다. 모든 카드가 잠겼을 때는 리롤 버튼이 비활성화되고, 함수가 조기 반환해 `player.rerolls`를 소비하지 않습니다.

잠금 상태는 `openUpgradeScreen()`과 `selectUpgrade()`에서 초기화합니다. 잠금 토글은 카드 내부 별도 컨트롤로 렌더링되며 클릭/Enter/Space 이벤트가 카드 선택 이벤트로 전파되지 않도록 분리했습니다.

## 저장 내보내기와 가져오기

새 상수:

```text
RUN_HISTORY_KEY = 'echoRiftRunHistoryV1'
IMPORT_BACKUP_KEY = 'echoRiftImportBackupV1'
EXPORT_SCHEMA_VERSION = 1
MAX_IMPORT_BYTES = 1_000_000
GAME_VERSION = '6.9.0'
```

내보내기는 `buildExportEnvelope()`가 다음 봉투를 만들고 `exportSaveFile()`이 Blob 다운로드를 수행합니다.

```text
{
  product: 'ECHO_RIFT',
  exportSchemaVersion,
  gameVersion,
  exportedAt,
  checksum,
  payload: { save, settings, runHistory }
}
```

`checksum`은 `JSON.stringify(payload)`에 대한 SHA-256입니다. 구현은 `crypto.subtle.digest('SHA-256', ...)`를 사용합니다.

가져오기는 `parseImportFile()`에서 파일 크기, product, schema version, payload/save plain object, checksum을 모두 검증한 뒤 sanitize된 save/settings/runHistory만 반환합니다. `importSaveFile()`은 이 검증이 끝난 후 현재 `SAVE_KEY`, `SETTINGS_KEY`, `RUN_HISTORY_KEY` 값을 `IMPORT_BACKUP_KEY`에 보관하고 새 값을 씁니다. 실패 경로에서는 저장 키를 다시 쓰지 않습니다.

기존 `echoRiftSaveV2`와 `echoRiftSettingsV1` 키는 유지합니다. `loadSaveData()`의 기본값은 `saveDataDefaults()`와 `normalizeSaveData()`로 공용화해 기존 로드와 import sanitize가 같은 보정 규칙을 사용합니다.

## 최근 런 기록

런 기록은 `{ version: 1, list: [...] }` 형태로 `echoRiftRunHistoryV1`에 저장합니다. `validateRunHistory()`는 배열이 아닌 값, 알 수 없는 outcome, 비정상 숫자, 과도한 build 항목을 보정하거나 제외하며, 항상 `MAX_RUN_HISTORY = 20`개로 자릅니다.

`appendRunHistory(outcome)`은 `runHistoryRecorded` 플래그로 한 런에서 한 번만 기록합니다. `startGame()`이 플래그를 초기화하고, `showVictory()`는 `win`, `endGame()`은 `death`를 기록합니다. 승리 뒤 끝없는 시간선으로 이어지는 흐름에서 같은 런이 중복 기록되지 않도록 이 플래그를 유지합니다.

기록 요약은 점수, 구역, 시간, 레벨, 처치, 상위 빌드 계열, 잔향 피해 비중, 위상 균열 횟수/추가 피해, seed만 저장합니다. 탄환 프레임, 입력 샘플, 60Hz 전체 기록은 저장하지 않습니다.

## UI와 접근성

설정 화면에 데이터 그룹을 추가했습니다. 새 버튼은 기존 `.btn`/`.setting-row` 체계를 따르며, 작은 화면에서는 세로로 접히도록 보강했습니다. 강화 카드 잠금 컨트롤은 44px 이상 터치 목표, `aria-pressed`, 독립 포커스 상태를 갖습니다.

---

# ECHO RIFT: OVERTURE 6.8 — 기술 노트 (SIGNAL)

## 6.8 목표

색상에만 의존하지 않고 투사체 소유권을 읽을 수 있게 합니다. 현재·잔향·적 탄환을 형상으로 구분하고,
색약 보정/단색 팔레트로 색상도 함께 조정하되 형상 언어는 팔레트와 무관하게 고정합니다.

## 설정 구조

`defaultSettings`에 두 키를 추가했습니다(추가 키이므로 저장 스키마 변경 없음, `loadJSON`이 기존 저장 위에 병합).

```text
combatPalette: 'default' | 'deuteranopia' | 'tritanopia' | 'mono'
projectileShapes: boolean (기본 true)
```

`applySettings()`에서 `COMBAT_PALETTE_KEYS`로 검증하고 잘못된 값은 `default`로 되돌립니다.
`document.body.dataset.combatPalette`를 노출합니다. 팔레트는 `PROJECTILE_PALETTES` 레지스트리로 정의합니다.

## 렌더링

`drawPlayerBullets`/`drawEnemyBullets`는 기존 배치 구조(소유권 그룹별 단일 stroke/fill)를 유지합니다.

- 소유권: `fromEcho` → echo, 그 외(플레이어·드론) → main, 적 → enemy.
- 표시 색: 기본 팔레트에서는 탄환별 `b.color`를 보존(시각 회귀 없음), 다른 팔레트에서는 소유권 색으로 치환.
- 형상 머리는 `appendArrowHead`/`appendDiamondHead`가 **현재 path에 정점을 누적**해 그룹당 한 번 `fill`.
  탄환별 `ctx.save/restore`나 `ctx.rotate` 없이 미리 계산한 `cos/sin`으로 월드 좌표를 직접 산출합니다.
- 적 탄환은 고리(stroke)+코어(fill)로 그려 플레이어의 채워진 머리와 구분합니다.
- `projectileShapes`가 꺼지면 기존 원형 머리 경로로 폴백합니다.
- 게임플레이용 `b.color`는 건드리지 않아 폭발·화상·표식 색 로직에 영향이 없습니다.

## CSS

- `.result-screen`/`.result-panel` 배경 불투명도와 그림자를 높이고 `body.high-contrast` 전용 단색 배경을 추가.
- `@media (orientation: landscape) and (max-height: 420px)`에서 `.menu-shell`을 flex 컬럼으로 바꾸고
  `.menu-command`를 `order:-1` + `position:sticky`로 상단 고정해 시작 버튼을 첫 화면에 노출.

---

# ECHO RIFT: OVERTURE 6.6 — 기술 노트

## 목표

보스 타이틀과 전투 시뮬레이션을 완전히 분리합니다. 단순히 플레이어를 무적으로 만드는 방식이 아니라, 인트로 동안 보스·탄환·AI·쿨다운·런 타이머가 전부 진행되지 않는 **시뮬레이션 정지 상태**를 사용합니다.

## 상태 구조

보스 웨이브의 `currentWave`에 다음 필드를 추가했습니다.

```text
introActive
introDuration
introRemaining
introElapsed
introFinished
bossSpawned
```

타이틀 길이는 `BOSS_INTRO_DURATION = 1.6`초, 보스 실체화 길이는 `BOSS_MATERIALIZE_DURATION = 1.25`초입니다. `BOSS_FIRST_ATTACK_DELAY = 1.05`초가 전투 활성화 뒤 첫 공격을 추가로 유예합니다.

## 고정 시간 단계 처리

`updateGame()`은 보스 인트로가 활성화된 경우 일반 전투 업데이트보다 먼저 분기합니다.

```text
게임패드 상태 확인
→ boss intro timer 갱신
→ 카메라·HUD만 갱신
→ 입력 프레임 종료
→ return
```

다음 함수는 호출되지 않습니다.

- `updatePlayer`
- `updateEchoes`
- `updateEnemies`
- `updateLasers`
- 플레이어·적 탄환 업데이트
- 픽업·충돌·사망 처리
- `updateWave`
- `gameTime += dt`

따라서 보스 인트로 중 피해, 쿨다운, 잔향 기록, 위협도와 생존 시간은 정지합니다.

## 보스 생성 순서

`startWave()`가 보스 웨이브를 감지하면 일반 배너 대신 `beginBossIntro()`를 호출합니다.

1. 잠긴 잔향 입력 취소
2. 이전 구역의 플레이어·적 탄환과 레이저 정리
3. 터치·키보드·게임패드 입력 상태 초기화
4. `boss-intro-active` 시각 상태 적용
5. 인트로 카운트다운 시작
6. 1.6초 뒤 `finishBossIntro()` 호출
7. 배너 숨김
8. 보스 생성
9. 보스 HUD 표시
10. 기존 보스 생성 텔레그래프 시작

보스는 타이틀 단계가 끝나기 전 배열에 존재하지 않습니다. 실체화 단계에서는 배열에 존재하지만 `combatLive = false`이며, `damageEnemy()`도 보스 피해를 0으로 반환합니다. 일반 `updateEnemies()`와 탄환·충돌 업데이트는 호출되지 않습니다.

## 일시정지와 결과 화면

일시정지 상태에서는 고정 업데이트가 실행되지 않으므로 타이틀과 실체화 남은 시간이 모두 변하지 않습니다. 승리·사망·메인 메뉴 전환 시 배너 타이머, `boss-intro-active` 클래스와 전용 스타일을 명시적으로 정리합니다.

## 반응형 표시

- QHD: 760px 이하의 중앙 타이틀 프레임
- 760px 이하: 제목과 내부 여백 축소
- 높이 500px 이하 가로 화면: 한 줄 높이에 맞게 추가 축소
- 진행 막대는 CSS width만 변경
- 장식 애니메이션은 `transform`과 `opacity`만 사용
- 움직임 감소 설정에서는 진입 애니메이션 제거

## 유지된 성능 구조

- Canvas 2D 고정 60Hz 시뮬레이션
- 공간 격자와 배치 렌더링
- 탄환·입자·픽업 풀
- HUD 10Hz 갱신
- 자동 품질 단방향 하향
- 잔향 스냅숏과 지속 피해 정산 구조
