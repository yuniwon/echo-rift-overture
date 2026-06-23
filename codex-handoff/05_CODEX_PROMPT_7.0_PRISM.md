너는 ECHO RIFT의 다음 버전을 맡는 렌더링·성능 담당이다. ECHO RIFT는 외부 의존성이 전혀 없는 단일 HTML/CSS/Vanilla JS/Canvas 2D PWA(시간 잔향 탄막 로그라이트)다. 저장소 `main` 최신 상태(현재 6.11 CONTROL)를 기준으로 작업한다.

# 이번 릴리스의 단일 목표
**전투 렌더링 성능 회복.** 네온 글로우 비주얼은 유지하되, 그것을 만드는 방식을 바꿔서 탄막 장면에서 프레임 드랍을 제거한다. 권장 버전 **7.0.0**, 코드네임 **PRISM**(저장소의 실제 최신 버전을 확인하고 그 다음 메이저로 올릴 것).

이번 릴리스는 **큰 작업 2개만** 한다. 그 외 기능 추가 금지.
1. (P0) **글로우 렌더링을 `ctx.shadowBlur` → 사전 렌더 글로우 스프라이트로 교체** — 핫패스에서 shadowBlur 완전 제거.
2. (P0) **자동 품질 강등 트리거를 "물체 수"가 아니라 "실측 프레임타임" 기준으로 교정** — 강등 후 유지(sticky)는 그대로 둔다.

# 반드시 먼저 할 것 — 실제 코드 재확인 (추측 금지)
`js/game.js`는 9,000줄이 넘고 줄 번호는 드리프트했을 수 있다. 아래 앵커를 **편집 전에 직접 grep/열람해 실측**하고 `BASELINE_AUDIT.md`에 기록하라.

- 글로우: `function setGlow(color, blur = 12)`와 `function clearGlow()` (대략 6977/6987 부근). 현재 구현은 `ctx.shadowBlur = quality === 2 ? blur * 0.75 : blur * 0.35` 이고, 밀집 가드(`dense`, 탄 합계 > 420)도 있다. `setGlow(` 호출 지점은 약 33곳(탄·적·입자·이펙트 draw 전반).
- 탄/적/입자 draw: `drawPlayerBullets`, `drawEnemyBullets`, 입자 렌더(렌더 그룹 `renderGroups.player/enemy/particles`, `addRenderGroup`/`clearRenderGroups`로 배치). 가산 합성 `globalCompositeOperation = 'lighter'` 사용 중.
- 자동 품질: `function updateQuality(frameDt)`(약 3398). 그 안에 **물체 수 기반 강등** `pressureTrip`(약 3425, `scenePressure > 520` 등), `frameTrip`(약 3426), 일방향 주석(약 3415), `applyQualityTier(...)`, `resetQualitySampling()`(약 3386), `measuredFps`, `recentLongFrameScore`(long-animation-frame observer, 약 3456).
- 해상도: `function resizeCanvas()`(약 2448) — `view.dpr` 픽셀 버짓 로직.
- 설정/검증: `defaultSettings`, `applySettings()`(약 850), `graphicsMode`('auto'/'high'/'balanced'/'performance'), `configuredQualityTier()`, `body[data-quality]`.
- 진단 HUD: 약 6741 — `FPS … · 렌더 {dpr}x · 적 … · 탄환 … · 입자 … · 긴 프레임 감지 …`. QA 상태 `window.echoRiftStatus`(약 8565), `window.__echoRiftQA`(약 8480~).

# 작업 1 — 사전 렌더 글로우 스프라이트
**기법:** 부팅 시(또는 최초 사용 시) 작은 오프스크린 캔버스에 방사형 글로우(중심 불투명 → 가장자리 0)를 **한 번** 굽고, 핫패스에서는 그 텍스처를 `drawImage`로 **가산 합성(`'lighter'`)** 해 글로우를 표현한다. `ctx.shadowBlur`는 핫패스에서 **0회**가 되어야 한다.

요구 사항:
- 글로우 스프라이트는 흰색(또는 무채색) 1장을 만들어 `globalAlpha`/색 틴트로 재사용하거나, 자주 쓰는 소수 색상별로 소량 캐시한다. **탄환마다 그라디언트 생성 금지**(런타임 `createRadialGradient` 호출이 매 프레임 늘지 않게).
- 크기는 반지름에 맞춰 `drawImage(sprite, x - r*k, y - r*k, r*k*2, r*k*2)`로 스케일. 스프라이트 자체는 고정 크기(예: 64px) 1장.
- 기존 **배치 구조 유지**: 소유권/색 그룹 단위로 묶어 그린다. shadowBlur 제거로 그룹당 draw 수가 늘지 않게, 글로우 패스는 그룹 1패스 + 코어 1패스 수준으로.
- `setGlow`/`clearGlow`는 제거하거나, 내부를 스프라이트 방식으로 재구현하되 **shadowBlur를 설정하지 않도록** 바꾼다. 잔여 `ctx.shadowBlur =` 가 핫 draw 경로에 남으면 안 된다(정적 검사로 확인).
- **비주얼 동등성:** 6.8 SIGNAL의 투사체 형상(현재=화살/잔향=마름모/적=고리)과 색약 팔레트(`combatPalette`), `projectileShapes` 토글, 치명타/엘리트 강조가 **그대로 보여야** 한다. 글로우는 "사라지는" 게 아니라 "싸게 그려지는" 것이다.
- 품질 단계별 비용 조절: `quality === 0`(성능)에서는 글로우 스프라이트 alpha/크기를 더 줄이거나 생략, `reduced-motion`/고대비에서도 정상 동작.

# 작업 2 — 자동 품질 강등 트리거 교정
- **물체 수 기반 강등(`pressureTrip`)을 제거하거나, 실측 프레임타임 보조 신호로만 강등하도록** 바꾼다. 강등 판단의 1차 근거는 **실측 프레임 시간/FPS**여야 한다(예: 실측 평균 프레임 > 예산을 일정 시간 지속할 때만 강등).
- **강등 후 유지(one-way sticky)는 유지한다** — 의도된 동작이다. 진동(oscillation) 방지 목적. 재상향은 기존처럼 `다시 측정`에서만.
- 글로우 비용이 사라지면 강등 자체가 거의 안 걸려야 정상이다. 트리거가 과민하지 않은지 실측으로 확인.
- `body[data-quality]`/`graphicsMode` 수동 고정 경로, `resetQualitySampling`, grace window 등 기존 계약은 보존.

# 측정 — 추측 금지, 수치로 증명
- `window.__echoRiftQA`에 **결정적 벤치 훅**을 추가하라(일반 실행에 부작용 없게): 예) 적탄 N개를 화면 전역에 스폰하고 K프레임 렌더해 **평균/최대 프레임타임**과 `ctx.shadowBlur` 호출 수(또는 글로우 패스 수)를 반환.
- **변경 전/후를 같은 시나리오(예: 적탄 ~160, 입자 ~70)로 비교**해 `QUALITY_REPORT`에 수치로 기록. 기준 증상: 고사양에서 적탄 160대에 38fps로 떨어지던 장면이 리프레시 근처로 회복.
- 헤드리스/소프트웨어 렌더 FPS는 실제 GPU를 대표하지 않으므로, 헤드리스 수치는 "상대 비교/회귀 감지용"으로만 쓰고 절대치로 과장하지 마라. 실기기(고주사율) 확인은 "수동 확인 필요"로 분리.

# 절대 회귀 금지
- 6.8 SIGNAL(형상·팔레트·`projectileShapes`·결과 화면 대비·짧은 가로 메뉴 CTA), 6.9 INTENT(잠금/부분 리롤·export/import·런 기록), 6.10/6.11(하드닝·컨트롤) 기능 전부 유지.
- 잔향 스냅숏=실제 전개, 위상 균열 수치·출처, 경로 예측=실제 웨이브, 튜토리얼 분리, 보스 인트로/실체화 중 피해·시뮬레이션 정지.
- 외부 의존성 0(외부 CDN/폰트/엔진/네트워크 금지), 오프라인 PWA, 기존 저장 키(`echoRiftSaveV2`/`echoRiftSettingsV1`) 호환.
- 전투 중 매 프레임 DOM 생성/`querySelector` 금지. 탄환마다 그라디언트/오브젝트 생성 금지(스프라이트는 1회 생성·재사용).

# 절차
1. `main`에서 작업 브랜치 생성(직접 푸시 금지). `node --check js/game.js`, `node --check sw.js`.
2. `BASELINE_AUDIT.md`: 위 앵커 실측, `setGlow` 호출 지점 목록, 현재 강등 트리거 동작, 변경 전 벤치 수치.
3. `IMPLEMENTATION_PLAN.md`: 단일 목표, 수정 파일, 실제 함수·데이터 흐름, 성능/접근성 위험, 자동/수동 테스트, 비목표.
4. 글로우 스프라이트 교체 → 강등 트리거 교정 순으로, 각 단계 후 `node --check`.
5. `scripts/verify-7.0-render.mjs`(또는 해당 버전) 작성: 핫 draw 경로에 `shadowBlur` 미사용, 글로우 스프라이트 1회 생성, 6.8 형상/팔레트 분기 유지, 강등 트리거가 프레임타임 기반인지 정적 검사.
6. 뷰포트 점검: 2560×1440 / 1920×1080 / 1366×768 / 390×844 / 360×640 / 320×568 / 667×375. 콘솔 오류·페이지 예외 0.
7. 문서/버전 갱신: `<title>`, `edition-badge`, `VERSION.txt`, `README.md`, `CHANGELOG.md`(맨 위 7.0 섹션), `TECHNICAL_NOTES.md`, `QA_REPORT.md`, `QUALITY_REPORT.md`, `manifest.webmanifest`, `sw.js` `CACHE_NAME`(예: `echo-rift-prism-v7.0.0`).
8. `CHECKSUMS.sha256` 재생성 후 `sha256sum -c`로 검증(계획/핸드오프 문서 제외 규칙 유지).

# 완료 정의
- 핫 draw 경로 `ctx.shadowBlur` 사용 0, 글로우 비주얼은 동등.
- 변경 전/후 벤치 수치가 `QUALITY_REPORT`에 명시되고, 대표 탄막 장면(적탄 ~160)에서 프레임타임이 유의미하게 개선.
- 강등 트리거가 물체 수가 아닌 실측 프레임타임 기반, sticky 유지.
- 회귀 금지 항목 전부 통과, `node --check` 통과, HTML ID 중복 0, manifest 파싱 통과, 체크섬 검증 통과.
- 보고는 과장 없이: 단일 목표 / 실제 변경 / 자동 검사 통과·실패 수 / 변경 전후 성능 수치 / 변경하지 않은 시스템 / 실기기에서 확인 못 한 한계(고주사율 실측 등). 확인하지 않은 것을 통과했다고 쓰지 마라. 범위가 커지면 멈추고 더 작은 버전으로 나누는 계획을 먼저 보고하라.
