# ECHO RIFT Quality Loop Report

## 현재 상태 — 7.0 PRISM

Iteration 3에서 전투 렌더링 성능 회복을 위해 hot path `ctx.shadowBlur` 글로우를 사전 렌더 글로우 스프라이트로 교체하고, 자동 품질 강등을 frame-time 기반으로 교정했다. 7.0.1 에셋 패스에서는 Kenney CC0 에셋의 작은 로컬 부분 집합을 사운드/시각 피드백 레이어로 추가했다. 현재 자동 검증 기준은 `scripts/verify-7.0-render.mjs`, `scripts/verify-asset-pack.mjs`, `scripts/verify-ui-readability.mjs`, `scripts/verify-route-layout.mjs`, `scripts/verify-6.10-hardening.mjs`, `scripts/verify-6.11-control.mjs`이다.

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
