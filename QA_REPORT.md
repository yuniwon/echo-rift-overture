# ECHO RIFT: OVERTURE 7.1 — QA 보고서 (FIRST CONTACT)

검증일: 2026-06-25

## 환경 한계

이번 패치는 정적 파일 기반 브라우저 게임의 첫 60초 온보딩 흐름을 보강했습니다. 자동 검증은 Node 기반 구문 검사, `scripts/verify-7.1-first-contact.mjs`의 신선 저장 첫 접촉 행동 검사, `scripts/verify-7.0-render.mjs`의 렌더 계약/벤치 검사, `scripts/verify-first-run-coach.mjs`의 기존 코치 행동 검사, `scripts/verify-6.9.mjs`, `scripts/verify-6.10-hardening.mjs`, `scripts/verify-6.11-control.mjs`의 기존 회귀 검사를 수행합니다. 실제 모바일 터치 실기기, 물리 게임패드, 오디오 청감, 저사양 장시간 성능, 고주사율 모니터 체감 검사는 별도 수동 확인이 필요합니다.

## 실행한 자동 검사

| 검사 | 목적 |
|---|---|
| `node --check js/game.js` | 브라우저 런타임 스크립트 구문 검사 |
| `node --check js/control-bindings.js` | 키보드 바인딩 헬퍼 구문 검사 |
| `node --check sw.js` | 서비스워커 구문 검사 |
| `node --check scripts/verify-7.1-first-contact.mjs` | 7.1 첫 접촉 verifier 구문 검사 |
| `node scripts/verify-7.1-first-contact.mjs` | 신선 저장 첫 접촉, 페이싱 게이트, 보상 중복 방지, XP 경계값, cleanup, 입력 중립화 행동 검사 |
| `node scripts/verify-7.0-render.mjs` | PRISM 글로우/프레임타임 품질/렌더 벤치 검사 |
| `node scripts/verify-first-run-coach.mjs` | 기존 필드 코치 표시, 단계 전환, 숨김/타임아웃, 레이아웃 회귀 검사 |
| `node scripts/verify-6.9.mjs` | 6.9 기능 연결, HTML ID 중복, manifest 파싱, 현재 릴리스 문자열 검사 |
| `node scripts/verify-6.10-hardening.mjs` | 부분 리롤, import/undo, import 거부, 보스 인트로, 경로 예고 일치의 실제 브라우저 행동 검사 |
| `node scripts/verify-6.11-control.mjs` | 설정 리매핑, 강화 카드 구조, 리롤 경제 계측, 90초 전투 루프 행동 검사 |
| Playwright 브라우저 스모크 | 1366×768 로드, 설정 화면 진입, 데이터 UI ID, QA 훅, 콘솔/페이지 오류 확인 |
| Node SHA-256 검증 스크립트 | 배포 파일 체크섬 검증 |

## `verify-7.1-first-contact` 검사 범위

- 신선 저장에서 기본 훈련 종료 뒤 첫 접촉 코치와 페이싱 게이트가 켜지는지 확인
- 게이트 중 정상 웨이브 `threat`, `waveElapsed`, `spawnRemaining`이 진행되지 않는지 확인
- 워밍업 표적 처치가 첫 처치로 기록되지만 혼자서는 강화 화면을 열지 않는지 확인
- 전용 균열 표적에서 위상 균열이 열릴 때 첫 보상이 정확히 한 번 예약되고 강화 화면이 열리는지 확인
- 반복 hit/QA 호출이 `rewardClaims`와 강화 선택지를 중복 증가시키지 않는지 확인
- `player.xpGain > 1` 상태에서도 첫 접촉 보상이 정확히 한 선택지만 열고 추가 pending level을 남기지 않는지 확인
- 이미 `pendingLevelUps > 0`인 예외 상태에서 첫 접촉 보상이 두 번째 레벨 예약을 만들지 않는지 확인
- 강화 선택 뒤 게이트가 해제되고 정상 웨이브가 다시 스폰되는지 확인
- timeout, dismiss, death 경로에서 임시 표적이 남지 않고 보상이 지급되지 않는지 확인
- 튜토리얼 단계 전환 중 키보드, 포인터, 터치, 합성 게임패드 입력이 중립화되는지 확인
- 중립 게이트가 켜진 뒤 새로 들어온 pointerdown이 pointerup 전까지 게이트를 유지하는지 확인

## `verify-7.0-render` 검사 범위

- 런타임 소스에 `ctx.shadowBlur` 직접 사용이 없는지 확인
- player/enemy bullet과 particle hot path가 사전 렌더 글로우 스프라이트를 사용하는지 확인
- 6.8 SIGNAL의 화살·마름모·고리 형상과 팔레트 분기 유지 확인
- 자동 품질 강등이 frame-time 기반이고 sticky 계약을 유지하는지 확인
- QA `renderBenchmark`가 160 적탄 / 70 입자 / 90프레임 장면의 frame time, glow pass, shadow blur use를 반환하는지 확인

## PRISM 렌더 벤치 결과

1366×768 headless Chromium에서 160 적탄 / 70 입자 / 30 warmup 제외 / 90 measured render frames 기준으로 측정했습니다. 6.11.1 baseline은 임시 in-memory QA 주입으로 측정했고, 7.0.0 after는 커밋된 `renderBenchmark()`로 측정했습니다.

| 항목 | 6.11.1 baseline | 7.0.0 after |
|---|---:|---:|
| 평균 렌더 프레임 | 64.644 ms | 17.292 ms |
| 최대 렌더 프레임 | 3091.700 ms | 256.900 ms |
| positive shadow blur writes | 720 | 0 |
| glow sprite passes | N/A | 17,550 |

## `verify-6.11-control` 검사 범위

- 설정 화면에서 사격 키를 `KeyK`로 리매핑하고 localStorage 저장 확인
- 새로고침 후 리매핑 유지와 기본값 복구 확인
- 강화 카드가 `<article>` 컨테이너이며 선택/잠금 컨트롤이 형제 `<button>`인지 확인
- 강화 카드 본문 클릭은 선택되고, 잠금 버튼 클릭은 선택되지 않으며, 선택 버튼은 계속 선택되는지 확인
- 카드 두 장 잠금 후 리롤 경제 계측값 기록 확인
- 모든 카드 잠금 후 리롤 자원과 경제 계측값 미변경 확인
- 90초 전투 루프에서 게임 시간 진행, 생존 상태, 잔향 사용/피해 상태, 경제 상태 노출 확인

## `verify-6.10-hardening` 검사 범위

- 카드 두 장 잠금 후 리롤 시 잠긴 카드 id·희귀도·슬롯 유지와 리롤 자원 소비 확인
- 모든 카드 잠금 후 리롤 시 선택지와 리롤 자원 미변경 확인
- 저장 가져오기 성공 시 save/settings/runHistory 적용, unknown key 제거, meta 상한 클램프 확인
- 마지막 가져오기 되돌리기 버튼 활성화와 이전 저장 복원 확인
- checksum 손상, 미래 schema, 1MB 초과 import 거부 확인
- 보스 인트로 동안 피해, 게임 시간, 생명, 보호막 정지 확인
- 경로 예고 수치와 실제 wave modifier 수치 일치 확인
- 서비스워커 navigate-only `index.html` 폴백과 asset `Response.error()` 경계 정적 확인

## `verify-6.9` 검사 범위

- `createUpgradeChoices(count, isReroll, options = {})` 시그니처와 `excludeIds` 필터
- `lockedUpgradeIds`, 잠금 토글, 잠금 카드 유지 리롤, 모두 잠김 미소비 경로
- `window.echoRiftStatus.lockedChoiceIds`와 QA `lockChoice`/`reroll` 훅
- export/import 상수, SHA-256 checksum helper, product/schema/payload/checksum 검증
- 1MB 초과 import 거부와 적용 전 백업 순서
- export/import 함수 내부의 `fetch`/`sendBeacon`/`eval`/`new Function` 미사용
- 데이터 설정 UI ID 연결
- 런 기록 상수, 로드/검증/추가/렌더링 헬퍼, 20개 상한, 중복 기록 방지 플래그
- HTML ID 중복 없음, manifest JSON 파싱, 현재 FIRST CONTACT 릴리스 문자열

## 브라우저 스모크 확인 범위

- `index.html?qa=1` 로드 성공
- 문서 제목과 edition badge가 FIRST CONTACT 릴리스로 표시
- 설정 화면 진입 성공
- `includeSettingsExport`, `exportSaveBtn`, `importSaveInput`, `runHistoryList`, `clearRunHistoryBtn`, `keybindGrid`, `resetKeyBindingsBtn` 존재
- `window.__echoRiftQA` 활성화
- `window.echoRiftStatus.runHistoryCount` 노출
- `window.echoRiftStatus.keyBindings`와 `window.echoRiftStatus.economy` 노출
- 확인 범위의 page error 0, console error 0

## 회귀 잠금 점검

| 회귀 잠금 | 영향 |
|---|---|
| 잔향 스냅숏·미리보기 일치 | 미변경 |
| 위상 균열 수치·출처 | 미변경 |
| 부분 리롤 경제 | 계측만 추가, 카드 생성·리롤 비용 미변경 |
| 경로 예측 = 실제 웨이브 | 미변경 |
| 기본·고급 튜토리얼 분리 | 미변경 |
| 튜토리얼 단계 전환 입력 carryover | 0.15초 중립 게이트 추가 |
| 첫 일반 런 웨이브 압력 | 첫 강화 선택 전까지만 일시 정지 |
| 보스 인트로 피해/시뮬레이션 정지 | 미변경 |
| 자동 품질 런 중 재상향 금지 | 미변경 |
| 6.8 SIGNAL 투사체 형상·팔레트 | 미변경 |
| 기존 저장 키 호환 | 유지 (`echoRiftSaveV2`, `echoRiftSettingsV1` 유지) |
| 오프라인 PWA | 유지, 외부 의존성 추가 없음 |

## 수동 확인 필요

- 물리 게임패드 리매핑, 조준 감도/데드존/축 반전 설계와 실기기 검증
- 터치 버튼 크기·위치 편집 UI와 실기기 검증
- 강화 화면에서 실제 키보드/마우스/터치/게임패드 포커스로 잠금 토글과 부분 리롤 체감 확인
- 새 브라우저 프로필에서 정상 export/import 왕복과 reload 후 설정 재적용 확인
- 손상 파일, 미래 schema, 1MB 초과 파일의 사용자 메시지 문구 확인
- 설정 화면 데이터 그룹과 런 기록 목록의 2560×1440 / 1920×1080 / 1366×768 / 390×844 / 360×640 / 320×568 / 667×375 뷰포트 확인
- 장시간 플레이에서 런 기록과 리롤 경제 요약이 결과 수치와 일치하는지 확인

## 비목표

로컬 텔레메트리, 서버 동기화, 계정, 신규 강화, 전투 수치 리밸런스, 공간 장치, 두 번째 보스, Phase 3 이후 기능은 이번 릴리스에서 제외했습니다.
