# IMPLEMENTATION PLAN — v6.9.0 "INTENT"

## Single Goal

선택 통제와 데이터 안전. 강화 선택지는 잠금/부분 리롤로 플레이어 의도를 보존하고, 브라우저 저장은 오프라인 JSON 내보내기·가져오기와 최근 런 기록으로 사용자가 직접 백업할 수 있게 한다.

## Files Modified

- `js/game.js` — 부분 리롤, 저장 export/import, 런 기록, QA 상태/훅, 버전 상수
- `index.html` — 6.9 버전 문구, 설정 화면 데이터 그룹
- `css/style.css` — 잠금 토글, 데이터 그룹, 런 기록 목록, 모바일 접힘 규칙
- `sw.js` / `manifest.webmanifest` / `VERSION.txt` — 6.9 INTENT 릴리스 메타데이터
- `README.md` / `CHANGELOG.md` / `TECHNICAL_NOTES.md` / `QA_REPORT.md` / `BASELINE_AUDIT.md` / `START_HERE.txt` — 릴리스 문서
- `scripts/verify-6.9.mjs` — 6.9 회귀 검증 스크립트
- `CHECKSUMS.sha256` — 배포 파일 체크섬

## Actual Functions and Data Flow

### Partial Reroll

- `createUpgradeChoices(count = 4, isReroll = false, options = {})`
  - `options.excludeIds`가 있으면 후보 풀에서 해당 `upgrade.id` 제외
  - 기존 rarity pity/guarantee 흐름 유지
- `lockedUpgradeIds`
  - 현재 강화 화면에서 잠긴 카드 id 저장
  - `openUpgradeScreen()`과 `selectUpgrade()`에서 초기화
- `renderUpgradeChoices()`
  - 카드별 잠금 컨트롤 렌더링
  - 모두 잠기면 `#rerollBtn` 비활성화
- `rerollUpgradeChoices()`
  - 잠긴 슬롯은 원래 위치 유지
  - 잠기지 않은 슬롯만 `createUpgradeChoices(needed, true, { excludeIds })`
  - 실제 교체가 있을 때만 `player.rerolls--`

### Save Export / Import

- `buildExportEnvelope(includeSettings)`
  - `saveData`, 선택적 `settings`, `loadRunHistory()`를 payload로 구성
  - `JSON.stringify(payload)`에 SHA-256 checksum 생성
- `parseImportFile(file)`
  - 파일 존재, 1MB 제한, JSON 파싱, product, schema, payload/save plain object, checksum 검증
  - `sanitizeImportedSave`, `sanitizeImportedSettings`, `validateRunHistory`로 보정
- `importSaveFile(file)`
  - 검증 완료 후 현재 save/settings/history를 `IMPORT_BACKUP_KEY`에 저장
  - 새 save/settings/history 적용 후 reload
  - 실패 시 기존 저장 키를 다시 쓰지 않음

### Local Run History

- `RUN_HISTORY_KEY = 'echoRiftRunHistoryV1'`
- 최대 20개 요약만 `{ version: 1, list }`로 저장
- `appendRunHistory(outcome)`은 `runHistoryRecorded`로 한 런에서 한 번만 기록
- `showVictory()`는 `win`, `endGame()`은 `death`
- 기록 목록은 설정 화면 데이터 그룹에서 읽기/초기화

## Migration and Compatibility

- 기존 `echoRiftSaveV2`, `echoRiftSettingsV1` 유지
- `loadSaveData()` 기본값을 `saveDataDefaults()`/`normalizeSaveData()`로 공용화
- 새 런 기록은 별도 키로 추가
- import 실패 시 기존 진행·설정·기록 보존

## Performance and Accessibility Risks

- 전투 루프에 DOM 작업 추가 없음
- 강화 선택 화면과 설정 화면에서만 새 DOM 생성
- 잠금 토글은 44px 이상 터치 목표와 `aria-pressed` 제공
- 데이터 그룹 버튼은 작은 화면에서 세로 배치

## Automatic Tests

- `node --check js/game.js`
- `node --check sw.js`
- `node scripts/verify-6.9.mjs`
- `sha256sum -c CHECKSUMS.sha256`

## Manual Tests Still Needed

- 실제 브라우저에서 부분 리롤 조작 체감
- export/import 왕복과 reload 후 설정 반영
- 모바일/가로/초소형 뷰포트 레이아웃
- 장시간 플레이에서 런 기록 수치와 결과 화면 일치

## Explicit Non-goals

로컬 텔레메트리, 서버/계정/네트워크 저장, 신규 강화, 수치 리밸런스, 공간 장치, 두 번째 보스, Phase 3 이후 기능.
