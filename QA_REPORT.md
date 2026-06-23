# ECHO RIFT: OVERTURE 6.9 — QA 보고서 (INTENT)

검증일: 2026-06-23

## 환경 한계

이번 패치는 정적 파일 기반 브라우저 게임에 기능을 추가했습니다. 자동 검증은 Node 기반 구문 검사, `scripts/verify-6.9.mjs`의 정적/구조 검사, Playwright 브라우저 스모크를 수행했습니다. 실제 플레이 뷰포트 캡처, 모바일 터치 실기기, 물리 게임패드, 장시간 성능 검사는 별도 수동 확인이 필요합니다.

## 실행한 자동 검사

| 검사 | 목적 |
|---|---|
| `node --check js/game.js` | 브라우저 런타임 스크립트 구문 검사 |
| `node --check sw.js` | 서비스워커 구문 검사 |
| `node scripts/verify-6.9.mjs` | 6.9 기능 연결, HTML ID 중복, manifest 파싱, 릴리스 문자열 검사 |
| Playwright 브라우저 스모크 | 1366×768 로드, 설정 화면 진입, 데이터 UI ID, QA 훅, 콘솔/페이지 오류 확인 |
| Git for Windows `sha256sum.exe -c CHECKSUMS.sha256` | 배포 파일 체크섬 검증 |

## `verify-6.9` 검사 범위

- `createUpgradeChoices(count, isReroll, options = {})` 시그니처와 `excludeIds` 필터
- `lockedUpgradeIds`, 잠금 토글, 잠금 카드 유지 리롤, 모두 잠김 미소비 경로
- `window.echoRiftStatus.lockedChoiceIds`와 QA `lockChoice`/`reroll` 훅
- export/import 상수, SHA-256 checksum helper, product/schema/payload/checksum 검증
- 1MB 초과 import 거부와 적용 전 백업 순서
- export/import 함수 내부의 `fetch`/`sendBeacon`/`eval`/`new Function` 미사용
- 데이터 설정 UI ID 연결
- 런 기록 상수, 로드/검증/추가/렌더링 헬퍼, 20개 상한, 중복 기록 방지 플래그
- HTML ID 중복 없음, manifest JSON 파싱, 6.9 INTENT 버전 문자열

## 브라우저 스모크 확인 범위

- `index.html?qa=1` 로드 성공
- 문서 제목과 edition badge가 6.9 INTENT로 표시
- 설정 화면 진입 성공
- `includeSettingsExport`, `exportSaveBtn`, `importSaveInput`, `runHistoryList`, `clearRunHistoryBtn` 존재
- `window.__echoRiftQA` 활성화
- `window.echoRiftStatus.runHistoryCount` 노출
- 확인 범위의 page error 0, console error 0

## 회귀 잠금 점검

| 회귀 잠금 | 영향 |
|---|---|
| 잔향 스냅숏·미리보기 일치 | 미변경 |
| 위상 균열 수치·출처 | 읽기/요약만 추가, 전투 계산 미변경 |
| 경로 예측 = 실제 웨이브 | 미변경 |
| 기본·고급 튜토리얼 분리 | 미변경 |
| 보스 인트로 피해/시뮬레이션 정지 | 미변경 |
| 자동 품질 런 중 재상향 금지 | 미변경 |
| 6.8 SIGNAL 투사체 형상·팔레트 | 미변경 |
| 기존 저장 키 호환 | 유지 (`echoRiftSaveV2`, `echoRiftSettingsV1` 유지) |
| 오프라인 PWA | 유지, 외부 의존성 추가 없음 |

## 수동 확인 필요

- 강화 화면에서 실제 키보드/마우스/터치/게임패드 포커스로 잠금 토글과 부분 리롤 체감 확인
- 새 브라우저 프로필에서 정상 export/import 왕복과 reload 후 설정 재적용 확인
- 손상 파일, 미래 schema, 1MB 초과 파일의 사용자 메시지 문구 확인
- 설정 화면 데이터 그룹과 런 기록 목록의 2560×1440 / 1920×1080 / 1366×768 / 390×844 / 360×640 / 320×568 / 667×375 뷰포트 확인
- 장시간 플레이에서 런 기록이 결과 수치와 일치하는지 확인

## 비목표

로컬 텔레메트리, 서버 동기화, 계정, 신규 강화, 전투 수치 리밸런스, 공간 장치, 두 번째 보스, Phase 3 이후 기능은 이번 릴리스에서 제외했습니다.
