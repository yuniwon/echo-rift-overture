# ECHO RIFT Quality Loop Report

## 현재 상태 — 7.1.0 FIRST CONTACT

Iteration 4에서 첫 일반 런의 초반 60초가 실제 행동 보상으로 닫히도록 FIRST CONTACT 패스를 추가했다. 기본 훈련 직후 정상 웨이브 압력을 잠시 멈추고, 안전한 워밍업 처치, 전투용 3초 기록, 잔향 호출, 전용 표적 위상 균열, 첫 강화 선택이 하나의 원인-결과 사슬로 이어진다. 튜토리얼 단계 전환에는 키보드·포인터·터치·게임패드 중립 게이트를 추가해 이전 입력 carryover가 다음 단계 성공으로 읽히지 않게 했다. 현재 자동 검증 기준은 `scripts/verify-7.1-first-contact.mjs`, `scripts/verify-first-run-coach.mjs`, `scripts/verify-7.0-render.mjs`, `scripts/verify-asset-pack.mjs`, `scripts/verify-ui-readability.mjs`, `scripts/verify-route-layout.mjs`, `scripts/verify-6.10-hardening.mjs`, `scripts/verify-6.11-control.mjs`이다.

## 7.1.0 First Contact Pass

- 첫 접촉 게이트: `fieldCoachSeen`이 없는 첫 일반 런에서만 정상 웨이브 `elapsed/threat/spawnRemaining`을 첫 강화 선택 전까지 정지한다.
- 워밍업 표적: 공격하지 않는 summoned wisp를 생성해 실제 처치와 소량 XP를 경험하게 하되, 웨이브 클리어에는 포함하지 않는다.
- 전용 균열 표적: 보상 없는 gunner를 `firstContactTarget`으로 생성하고, 이 표적에서 위상 균열이 열릴 때만 부족한 XP를 지급해 첫 강화 화면을 한 번 연다.
- 보상 idempotency: `rewardClaims`, `reservedLevelUps`, `firstContactRewardClaimed`를 통해 반복 hit/QA/pause 경로에서 두 번째 보상이 생기지 않도록 검증한다.
- 입력 중립화: 튜토리얼 단계 전환 중 입력이 모두 중립인 상태로 0.15초 유지될 때까지 진행률과 이동/사격/대시/잔향을 막는다.
- 검증: `verify-7.1-first-contact`가 신선 저장 첫 접촉, 게이트 정지/해제, timeout/dismiss/death cleanup, 키보드·포인터·터치·합성 게임패드 중립화를 Playwright로 확인한다.

## 7.0.3 Focus Pass

- 협공 표적: 필드 코치의 마지막 단계에서 노릴 적을 표시한다. 기존 적을 우선 사용하고, 없을 때만 보상/공격이 없는 연습 표적을 생성한다.
- 시간 초과 정책: 성공 전 타임아웃은 `fieldCoachSeen`을 저장하지 않아 다음 일반 런에서 다시 안내한다. 완료와 수동 숨김은 저장된다.
- 가독성: 320px대 세로와 667×375 짧은 가로에서 필드 코치 제목/본문/힌트/버튼/신호 글자가 11px 아래로 내려가지 않도록 검증한다.
- 릴리스 게이트: `scripts/verify-6.9.mjs`는 삭제하지 않고 PRISM 7.0.x 메타데이터 허용 범위를 갱신했다.

## 7.0.2 Field Coach Pass

- 대상: 첫 일반 런. 기본/고급 훈련, 선택 화면, 경로 화면, 보스 인트로에는 코치를 띄우지 않는다.
- 완료 근거: REC 버퍼 사격 기록, 실제 잔향 호출, `phaseRiftProcs` 증가.
- 저장: 성공 또는 숨김은 `fieldCoachSeen`을 기록해 반복 노출을 막는다. 성공 전 시간 초과는 다음 런에 재시도된다.
- 검증: `scripts/verify-first-run-coach.mjs`가 Playwright로 행동 단계와 2048×1024, 390×844, 667×375 레이아웃을 확인한다.
- 미확인 한계: 실제 신규 플레이어가 60초 안에 안내를 이해하는지, 물리 게임패드/터치 실기기에서의 체감, 장시간 플레이 중 코치 노출 타이밍은 수동 플레이테스트가 필요하다.

## 7.0.1 Asset Pass

- 소스: Kenney UI Audio, Sci-Fi Sounds, Space Shooter Extension.
- 라이선스: Creative Commons Zero, 각 로컬 복사본은 `assets/vendor/kenney/**/License.txt`.
- 런타임 파일: OGG 7개, PNG 효과 2개, `THIRD_PARTY_NOTICES.md`.
- 적용 방식: 기존 Web Audio 합성음 위에 짧은 샘플을 겹치고, 기존 particle pool 안에서 충격 구름/위상 플레어를 그린다.
- 미확인 한계: 실제 스피커/헤드폰 청감 밸런스, 저사양 모바일 오디오 지연, 장시간 플레이 중 샘플 선호도는 수동 확인 필요.

## PRISM Before / After

`renderBenchmark` 시나리오: 1366×768 headless Chromium, high quality, reduced motion off, 160 enemy bullets, 70 particles, 30 warmup frames excluded, 90 measured render frames.

| Metric | Before 6.11.1 CONTROL | After 7.0.0 PRISM |
|---|---:|---:|
| Avg render frame | 64.644 ms | 17.292 ms |
| Max render frame | 3091.700 ms | 256.900 ms |
| Min render frame | 0.100 ms | 0.300 ms |
| P50 render frame | Not captured | 0.500 ms |
| P95 render frame | Not captured | 237.800 ms |
| Positive shadow blur writes | 720 | 0 |
| Glow sprite passes | N/A | 17,550 |
| Console/page errors | 0 | 0 |

Headless Chromium timing is a relative comparison signal only. High-refresh and low-end device feel still require manual confirmation.

아직 완료로 주장하지 않는 항목은 물리 게임패드 리매핑, 조준 감도/데드존/축 반전, 터치 버튼 위치 편집, 저사양 모바일 실기기, 오디오 청감, 필수 뷰포트 캡처 세트다.

## 결과 요약

요청된 `ECHO_RIFT_v6.3_QUALITY_LOOP_PROMPT(2).md`를 현재 `6.9 INTENT` 저장소에 반영했다. 이번 변경은 런타임 기능 패치가 아니라 품질 루프 산출물 도입이다. 게임 코드, UI 스타일, 서비스워커 캐시 이름, 버전 문자열, 저장 스키마, 밸런스는 변경하지 않았다.

## Before / After

| 항목 | 이전 | 이후 |
|---|---|---|
| 품질 루프 계획 | 레거시 프롬프트가 외부 다운로드 파일에만 존재 | `QUALITY_PLAN.md`가 6.9 기준 시스템 지도, 위험, 반복 계획을 기록 |
| 반복 진행 기록 | 없음 | `PROGRESS.md`에 Iteration 0A 기준선과 다음 결함 기록 |
| 품질 보고서 | 6.9 기능 QA 보고서만 존재 | `QUALITY_REPORT.md`가 이번 프롬프트 반영 상태와 남은 검증을 분리 |
| 테스트 산출물 위치 | 없음 | `test_artifacts/`와 Iteration 0 메트릭 JSON 추가 |
| 체크섬 | 기존 릴리스 파일 기준 | 새 품질 산출물까지 포함하도록 재생성 예정 |

## 실행한 검증

| 명령 | 결과 |
|---|---|
| `node --check js/game.js` | PASS, exit code 0 |
| `node --check sw.js` | PASS, exit code 0 |
| `node scripts/verify-6.9.mjs` | PASS, `verify-6.9 passed` |

체크섬 검증은 새 파일을 스테이징하고 매니페스트를 재생성한 뒤 Git archive에서 수행한다.

## 남은 외부 검증

- 필수 뷰포트 스크린샷: 2560x1440, 1440x900, 390x844, 320x568, 667x375
- 실제 first-ten-minute 플레이 캡처
- 좋은 잔향 기록과 나쁜 잔향 기록의 수치 비교
- 보스 인트로 중 피해 0 QA probe 재실행 및 캡처
- 오디오 청감: lock, deploy, convergence, boss release, damage, death의 구분감
- 물리 게임패드와 저사양 모바일 하드웨어 확인

## 완료 판정

이 패스는 품질 루프의 시작 조건을 정리한 것이며, 프롬프트의 최종 stopping condition을 만족했다고 주장하지 않는다. Iteration 1에서 행동 기반 Playwright 검증과 import/service-worker 하드닝을 추가했고, Iteration 2에서 90초 전투/컨트롤 계측 루프를 추가했다. 다만 required viewport screenshot set, 물리 입력 장치, 오디오 청감, 저사양 모바일 검증은 아직 별도 반복이 필요하다.
