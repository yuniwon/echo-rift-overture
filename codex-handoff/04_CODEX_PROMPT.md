# Codex 전달 프롬프트 — ECHO RIFT 6.9 "INTENT"

아래 전체를 Codex에게 그대로 붙여넣는다. 같은 폴더의 `01_SPEC`, `02_WORK_INSTRUCTIONS`, `03_CODE_EXAMPLES`도 함께 제공한다.

---

너는 ECHO RIFT의 6.9 버전을 맡는 구현 담당이다. ECHO RIFT는 외부 의존성이 없는 오프라인 브라우저 액션 로그라이트로,
HTML/CSS/Vanilla JS/Canvas 2D/Web Audio + Service Worker 구조다. 현재 소스는 `main` 브랜치의 v6.8.0 SIGNAL이다.

먼저 동봉 문서를 이 순서로 읽어라: `01_SPEC_6.9_INTENT.md` → `02_WORK_INSTRUCTIONS.md` → `03_CODE_EXAMPLES.md`.

## 이번 버전의 단일 목표
**선택 통제와 데이터 안전.** 다음 두 P0 시스템만 이번 릴리스에 구현한다.
1. **카드 고정 · 부분 리롤** — 강화 화면에서 카드별 잠금, 리롤 시 잠긴 카드 유지·나머지만 재생성, 리롤 1회만 소비, 모두 잠그면 비활성, 선택/새 화면 시 잠금 초기화.
2. **저장 내보내기 · 가져오기** — 버전 봉투 JSON(SHA-256 체크섬) 다운로드/업로드. 가져오기 전 검증·백업, 실패 시 기존 저장 보존, 1MB 초과·손상·미래 schema·체크섬 불일치 거부. **네트워크 전송 0.**

분량이 남으면 **로컬 런 기록(최근 20개 요약)**까지 포함한다. 커지면 6.9.1로 분리한다.
**로컬 텔레메트리와 Phase 3 이후는 이번에 구현하지 않는다.**

## 실제 코드 기준점 (추측 금지, 편집 전 재확인)
- `createUpgradeChoices(count, isReroll)` `js/game.js:3398` — 부분 리롤용 `options.excludeIds` 추가 필요.
- `renderUpgradeChoices(choices, playRevealSound)` `:3513`, `rerollUpgradeChoices()` `:3610`, `selectUpgrade(choice)` `:3584`, `openUpgradeScreen()` `:3563`. 전역 `currentUpgradeChoices` `:1612`, `player.rerolls`, DOM `#rerollBtn`/`#rerollCount`.
- 저장 키: `SAVE_KEY='echoRiftSaveV2'` `:101`, `SETTINGS_KEY='echoRiftSettingsV1'` `:103`, 헬퍼 `loadJSON`/`saveJSON` `:189`/`:198`, 객체 `saveData`·`settings`, 검증 단일 지점 `applySettings()` `:259`, 설정 바인딩 블록 `:7600~`.
- 런 종료: `endGame()` `:6132`, `showVictory()` `:6175`, `buildRunRecap()` `:5919`, `strongestFamilies()` `:3444`.
- QA 훅: `window.echoRiftStatus` `:7817`(이미 `choices` 노출), `window.__echoRiftQA` `:7948`.

## 절대 회귀시키지 말 것
- 잔향 스냅숏·미리보기=실제 전개, 마지막 에코 탄환·지속 피해 후 리포트 확정, 위상 균열 수치·출처.
- 경로 예측=실제 웨이브, 기본/고급 튜토리얼 분리, 보스 인트로·실체화 중 피해/시뮬레이션 정지.
- 자동 품질 런 중 재상향 금지.
- **6.8 SIGNAL 전부 유지**: 투사체 형상(현재=화살/잔향=마름모/적=고리), `combatPalette`, `projectileShapes`, 결과 화면 대비, 짧은 가로 메뉴 CTA.
- 기존 저장 키 호환(새 필드는 fallback·migration), 불러오기 실패 시 기존 저장 보존.
- 외부 의존성 없는 오프라인 PWA(`fetch`/`sendBeacon`/`eval`/외부 스크립트 금지).

## 구현 절차
1. `main`에서 작업 브랜치 생성(`main` 직접 푸시 금지). `node --check js/game.js && node --check sw.js`.
2. `BASELINE_AUDIT.md` 작성(부분 리롤·export/import·런 기록 미존재 확인, 실제 시그니처 기록).
3. `IMPLEMENTATION_PLAN.md` 작성(단일 목표, 수정 파일, 실제 데이터 흐름, 저장 migration, 성능/접근성 위험, 테스트, 비목표).
4. 실패 테스트 먼저 → 부분 리롤 구현 → export/import 구현 → (여유 시) 런 기록.
5. 검사: 새 런→레벨업/선택→경로→보스 인트로→승리→끝없는 시간선→사망→코어 정산→메뉴. 6.8 팔레트·형상 토글. 기존 저장 로딩·import 실패 보존.
6. 뷰포트: 2560×1440 / 1920×1080 / 1366×768 / 390×844 / 360×640 / 320×568 / 667×375. 콘솔 오류·페이지 예외 0 확인.
7. 문서·버전 갱신: `<title>`, `edition-badge`=`OVERTURE 6.9 · INTENT`, `VERSION.txt`, `README.md`, `CHANGELOG.md`(맨 위 6.9.0), `TECHNICAL_NOTES.md`, `QA_REPORT.md`, `manifest.webmanifest`, `sw.js` `CACHE_NAME='echo-rift-intent-v6.9.0'`.
8. `CHECKSUMS.sha256` 재생성 후 `sha256sum -c`로 검증(계획 문서·`codex-handoff/`는 제외 규칙 유지).

## 기술 조건
- 전투 중 매 프레임 DOM 생성/`querySelector` 금지. 선택 화면(비전투)에서만 DOM 작업.
- 설정 추가는 6.8 패턴: `defaultSettings`→`applySettings()` 검증·동기화→바인딩 `change`. 항상 fallback.
- 저장 구조 변경/가져오기 경로에 try/catch·검증·백업. 실패 시 원본 보존. 사용자 메시지는 원인 설명.
- 잠금 버튼 등 새 UI는 색상 하나에 의존하지 않음(`aria-pressed`+아이콘/형상), 터치 목표 ≥ 44×44 CSS px.
- 같은 시드가 필요한 결정적 시스템은 `Math.random` 직접 사용 금지(이번 범위엔 해당 없음).
- 테스트 전용 API는 일반 실행에 부작용을 만들지 않는다.

## 최종 보고
새 버전명·단일 목표 / 실제 변경 내용 / 자동 검사 통과·실패 수 / 변경하지 않은 주요 시스템 / 실제로 확인하지 못한 한계 / 브랜치(PR) 정보.
헤드리스 브라우저가 없으면 순수 로직은 노드 단위 검사로 검증하고, 브라우저 검증 항목은 "수동 확인 필요"로 정직하게 분리하라.
**과장 금지. 확인하지 않은 것을 통과했다고 쓰지 마라. 범위가 커지면 멈추고 더 작은 버전으로 나누는 계획을 먼저 보고하라.**
