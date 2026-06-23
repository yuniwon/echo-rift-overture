# ECHO RIFT 6.9 "INTENT" — 작업 지시서 (Codex)

이 문서는 Codex가 명세(`01_SPEC_6.9_INTENT.md`)를 안전하게 구현하기 위한 절차다.
**추측 금지. 편집 전 실제 함수를 열어 시그니처를 확인한다.**

---

## 1. 시작 전

1. `main` 최신 상태에서 작업 브랜치 생성: 예 `intent-6.9` (또는 지정 브랜치). `main`에 직접 푸시하지 않는다.
2. 기준 검사:
   ```bash
   node --check js/game.js && node --check sw.js
   ```
3. `BASELINE_AUDIT.md`에 현재 상태 표로 기록:
   - 부분 리롤 / export-import / 런 기록 — **현재 없음** 확인.
   - `createUpgradeChoices`/`rerollUpgradeChoices`/`renderUpgradeChoices` 시그니처 실측.
   - 저장 키(`echoRiftSaveV2`, `echoRiftSettingsV1`)와 `saveData` 형태 실측.
4. `IMPLEMENTATION_PLAN.md` 작성: 단일 목표, 수정 파일, 실제 함수·데이터 흐름, 저장 migration, 성능/접근성 위험, 자동/수동 테스트, 명시적 비목표.

---

## 2. 구현 순서 (작은 단위로, 각 단계 후 `node --check`)

> 한 릴리스 2개 큰 시스템 원칙. 아래 순서로 진행하고, 분량이 커지면 4.3(런 기록)을 6.9.1로 분리.

### 단계 A — 부분 리롤
1. `createUpgradeChoices(count, isReroll, options = {})`로 시그니처 확장. `options.excludeIds`(Set<string>)를 풀 필터에 반영.
2. 잠금 상태 전역: `const lockedUpgradeIds = new Set();` (upgrade.id 기준; 카드 정체성은 `upgrade.id`로 충분 — 같은 id가 두 번 나오지 않으므로).
3. `renderUpgradeChoices`에서 카드별 잠금 버튼 추가(`aria-pressed`, 44×44). 클릭 시 `event.stopPropagation()` 후 토글·재렌더(소리 없이).
4. `rerollUpgradeChoices`를 부분 리롤로 교체(잠긴 카드 유지 + 부족분만 `excludeIds`로 생성). 모두 잠김 시 비활성.
5. `selectUpgrade`와 `openUpgradeScreen`에서 `lockedUpgradeIds.clear()`.
6. `#rerollBtn` 비활성 조건에 "모두 잠금" 추가.

### 단계 B — 저장 내보내기/가져오기
1. 상수: `EXPORT_SCHEMA_VERSION = 1`, `MAX_IMPORT_BYTES = 1_000_000`, `RUN_HISTORY_KEY`, 백업 키.
2. `sha256Text`, `buildExportEnvelope`, `exportSaveFile`, `parseImportFile`, `importSaveFile` 추가.
3. 설정에 내보내기/가져오기 UI(버튼·파일 input·설정 포함 체크박스) — 설정 패널 하단 "데이터" 그룹 신설.
4. 가져오기 검증·백업·실패 보존 철저히. 성공 후 `applySettings()` 재적용 또는 `location.reload()`.

### 단계 C — 로컬 런 기록 (분량 여유 시)
1. `loadRunHistory`, `createRunSummary(outcome)`, `appendRunHistory(outcome)` 추가.
2. `endGame()`에 `appendRunHistory('death')`, `showVictory()`에 `appendRunHistory('win')` — 각 1회.
3. 결과 화면 또는 메뉴에 기록 목록(읽기 전용). 초기화 버튼.
4. 내보내기 봉투 `payload.runHistory`에 포함, 가져오기 시 `validateRunHistory`.

---

## 3. 코딩 규칙

- 외부 라이브러리·CDN·폰트·네트워크 추가 금지. 기존 Canvas 2D/정적 PWA 유지.
- 전투 루프 안에서 DOM 탐색·생성 반복 금지. 선택 화면(비전투)에서만 DOM 작업.
- **설정 추가는 6.8 패턴 준수**: `defaultSettings` → `applySettings()` 검증·동기화 → 바인딩 블록 `change` 이벤트. 항상 fallback 제공.
- **저장 구조 변경 시 migration** 제공, 실패해도 원본 보존:
  ```js
  function migrateSave(raw) {
    const save = structuredClone(raw || {});
    const v = Number(save.schemaVersion || 1);
    // 향후 버전 분기. 현재 save에는 schemaVersion이 없으므로 1로 간주.
    save.schemaVersion = SAVE_SCHEMA_VERSION; // 도입 시 정의
    return save;
  }
  ```
  단, **기존 `saveData`에는 현재 `schemaVersion` 필드가 없다.** import 경로에서만 도입하고, 기존 `loadSaveData`의 관대한 병합은 유지한다(부수효과 없이).
- 파일 I/O·JSON 파싱은 `try/catch`. 사용자 메시지는 원인 설명, 콘솔에는 디버깅 로그. 실패 시 상태 유지.
- `eval`·동적 스크립트·외부 업로드 금지. `fetch`/`sendBeacon` 금지(오프라인 계약).
- 접근성: 새 시각/조작 정보는 색상 하나에 의존하지 않음. 잠금 버튼은 `aria-pressed`+아이콘/형상. `highContrast`·`reducedMotion`·UI 배율·색약 팔레트에서 확인.
- 터치 목표 최소 44×44 CSS px.

---

## 4. 테스트 우선

### 4.1 기준선 회귀 (구현 전 1회, 구현 후 1회)
- 새 런 시작 → 강제 레벨업/카드 선택 → 경로 → 보스 인트로 → 승리 → 끝없는 시간선 → 사망 → 코어 정산 → 메뉴.
- 기존 저장 로딩, 6.8 팔레트·형상 토글 동작.
- QHD·1920×1080·1366×768·390×844·360×640·320×568·667×375 가로 오버플로·콘솔 오류·페이지 예외.

### 4.2 기능별 (실패 테스트 먼저)
- **부분 리롤**: `__echoRiftQA.grantLevel(1)` 후 첫 카드 잠금 → 리롤 → 잠긴 카드 `upgrade.id` 동일, 나머지 변경. 중복·최대 단계 없음. 전부 잠금 시 리롤 비활성.
- **import**: 손상 JSON·체크섬 불일치·1MB 초과·미래 schema 거부. 정상 파일 왕복. 실패 시 기존 저장 불변.
- **런 기록**: 21개째에서 최古 제거. 결과 수치 일치.

### 4.3 성능
- 선택 화면 DOM 노드 수, 한 프레임 최대 시간 비교. 전투 중 신규 DOM 0 확인.

> 헤드리스 브라우저가 없으면, 6.8과 동일하게 **로직 단위 검사**(노드 스텁)로 순수 함수를 검증하고, 브라우저 검증 항목은 QA_REPORT에 "수동 확인 필요"로 정직하게 분리한다. "오류 없음"은 실제로 0을 확인한 범위에만 쓴다.

---

## 5. UI 검토 뷰포트

`2560×1440 / 1920×1080 / 1366×768 / 390×844 / 360×640 / 320×568 / 667×375`

- 잠금 버튼이 카드 선택 클릭 영역과 충돌하지 않음.
- 데이터 그룹 버튼·파일 input이 작은 화면에서 넘치지 않음.
- 런 기록 목록 스크롤·Safe Area·포커스 외곽선·한국어 줄바꿈.

---

## 6. 문서·버전·캐시 (완료 시)

- `<title>`, `edition-badge` → `OVERTURE 6.9 · INTENT`.
- `VERSION.txt`, `README.md`, `CHANGELOG.md`(맨 위 6.9.0 섹션), `TECHNICAL_NOTES.md`, `QA_REPORT.md`.
- `manifest.webmanifest` name/description.
- `sw.js`: `const CACHE_NAME = 'echo-rift-intent-v6.9.0';`
- `CHECKSUMS.sha256` 재생성 후 `sha256sum -c`로 검증(계획 문서·핸드오프 폴더는 제외 규칙 유지).

---

## 7. 중단 조건

다음이면 멈추고 사실·로그·선택지를 보고한다(추측 수정 금지).

- 기준선 테스트가 이미 실패.
- 저장 migration 경로를 안전하게 결정할 수 없음.
- 회귀 금지 조건을 깨야만 구현 가능.
- 범위가 한 릴리스에 과도 → 더 작은 버전 분할 계획 먼저 제시.

---

## 8. 최종 보고 형식

1. 버전명·단일 목표  2. 실제 변경 내용  3. 자동 검사 통과/실패 수
4. 변경하지 않은 주요 시스템  5. 실제로 확인하지 못한 한계  6. (브랜치/PR 정보)

과장 금지. 확인하지 않은 것을 통과했다고 쓰지 않는다.
