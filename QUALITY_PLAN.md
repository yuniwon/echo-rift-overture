# ECHO RIFT 6.9 INTENT Quality Loop Plan

## 적용 범위

`ECHO_RIFT_v6.3_QUALITY_LOOP_PROMPT(2).md`는 `WITNESS v6.2.0`을 기준으로 작성된 레거시 품질 루프 브리프다. 이 저장소의 현재 기준은 `ECHO RIFT: OVERTURE 6.9 — INTENT`이므로, 이번 반영은 버전이나 런타임을 되돌리지 않고 6.9 이후 품질 반복을 운영하기 위한 계획, 기준선, 산출물 구조를 추가하는 것으로 제한한다.

이번 패스는 품질 루프의 **Iteration 0 intake**다. 자동 구문/구조 검사는 실행했지만, 전체 플레이 캡처·모바일 실기기·물리 게임패드·오디오 청감 평가는 아직 완료하지 않았다.

## 현재 시스템 지도

| 영역 | 소유 파일·함수 | 데이터 흐름과 계약 |
|---|---|---|
| 앱 셸·오프라인 | `index.html`, `manifest.webmanifest`, `sw.js`, `CHECKSUMS.sha256` | 정적 HTML/CSS/JS와 PWA 캐시가 외부 의존성 없이 실행된다. 서비스워커는 핵심 런타임·아이콘만 캐시하고, 릴리스 무결성은 체크섬 매니페스트가 담당한다. |
| 고정 스텝 시뮬레이션 | `js/game.js` `FIXED_DT`(line 99), `updateGame()`(line 6327) | `requestAnimationFrame` 위에서 60Hz 고정 업데이트를 유지한다. 보스 인트로 등 정지 상태는 일반 전투 업데이트 전에 분기해야 한다. |
| 입력·잔향 스냅숏 | `InputManager`, `activateEcho()`(line 5083) | 최근 약 3초 입력 기록을 잠금 순간 복사해 미리보기와 실제 전개가 같은 불변 샘플을 사용한다. E/Q, 게임패드, 터치 입력 경로는 동등해야 한다. |
| 피해·귀속·리포트 | `damageEnemy()`(line 5846), echo report queue | 현재 몸, 잔향 직접 피해, 잔향 기원 DoT, 위상 균열 추가 피해가 호출별 통계로 귀속된다. 마지막 연결 효과가 끝난 뒤 리포트를 확정한다. |
| 교차 사격 판정 | CROSSFIRE 6.3 phase rift constants and status | 현재 몸과 잔향이 짧은 창 안에 같은 유효 적을 맞히면 위상 균열을 열고, 추가 피해·시각/음향 피드백·통계 귀속을 제공한다. |
| 튜토리얼 | `tutorialSequences`, replay verification, Advanced Echo Lab | 기본 훈련은 4단계로 축소되어 첫 재현 검증까지 다룬다. 교차 사격과 리포트 판독은 선택형 고급 훈련으로 분리된다. |
| 경로 예측 | `routeForecast()`(line 4069), route selection state | 경로 화면에 표시한 최종 위험·보상 수치가 실제 다음 구역 modifier와 일치해야 한다. 선택 후 숨은 재추첨은 금지된다. |
| 보스 인트로 | `beginBossIntro()`(line 2813), boss cutscene state | 보스 구역 시작 때 탄환·레이저·입력 상태를 정리하고, 타이틀과 실체화 동안 전투·쿨다운·런 타이머를 멈춘다. 피해는 0이어야 한다. |
| 접근성·반응형 | `css/style.css`, settings UI | 투사체 형상, 색각 팔레트, 고대비, 감소 모션, 터치 컨트롤, 소형 세로/가로 레이아웃을 보존한다. |
| QA 인터페이스 | `window.echoRiftStatus`(line 8102), `window.__echoRiftQA`(line 8235) | 상태 조회는 일반 실행에서도 읽기 위주로 가능하되, 변경형 QA 훅은 `?qa=1`, `#qa`, 또는 사전 플래그에서만 노출한다. |
| 저장·데이터 안전 | `buildExportEnvelope()`(line 320), `appendRunHistory()`(line 485) | 기존 저장 키를 유지하고, 6.9는 체크섬 포함 JSON 내보내기·가져오기와 최대 20개 런 기록을 추가한다. |

## 이미 반영된 품질 축

| 프롬프트 기둥 | 현재 구현 상태 |
|---|---|
| Echo is a co-star | 6.3 CROSSFIRE의 위상 균열, 잔향 통계, 리포트, 회고 수치가 존재한다. 다음 반복은 실제 90초 플레이에서 잔향 기여도와 좋은/나쁜 기록의 차이를 측정해야 한다. |
| Information is honest | 6.4 FORECAST가 경로 확정 전 최종 modifier를 공개하고 실제 구역과 맞추는 구조를 제공한다. |
| Teach fantasy quickly | 6.5 ONRAMP가 필수 훈련을 4단계로 줄이고 고급 훈련을 분리했다. |
| Spectacle may not obscure danger | 6.6 보스 인트로는 전투·타이머·쿨다운을 멈추고 보스 실체화 중 피해를 0으로 만든다. |
| Readability beyond hue | 6.8 SIGNAL이 현재/잔향/적 탄환 형상과 색각 팔레트를 제공한다. |
| Mobile first-class layout | 6.2 이후 소형 세로/가로 보강, 6.8 짧은 가로 메뉴 CTA, 터치 조작 상태가 유지된다. |
| Player intent and data safety | 6.9 INTENT가 카드 잠금·부분 리롤, JSON 저장 내보내기·가져오기, 최근 런 기록을 추가했다. |

## 기준선 가설

1. 현재 빌드는 프롬프트의 핵심 설계 기둥을 기능적으로 보유하지만, 반복 가능한 플레이 캡처와 수치 증거가 부족하다.
2. 가장 큰 결함 후보는 새로운 런타임 기능 부재가 아니라, first-ten-minute 품질을 객관적으로 재현·측정하는 자동/반자동 하네스 부족이다.
3. 런타임 변경은 캡처 기반 기준선 뒤에 한 가지 가설씩만 적용해야 한다.
4. 오디오, 물리 게임패드, 저사양 모바일은 자동 검증만으로 완료 판정을 내릴 수 없다.

## 위험 지도

| 위험 | 심각도 | 완화 |
|---|---:|---|
| 품질 루프 문서가 실제 플레이 검증 완료처럼 오해될 수 있음 | P1 | `PROGRESS.md`와 `QUALITY_REPORT.md`에 캡처/청감/실기기 미완료를 명시한다. |
| 체크섬에 새 산출물이 빠져 배포 무결성 검증이 다시 실패 | P1 | 새 추적 파일을 포함해 `CHECKSUMS.sha256`를 재생성하고 Git archive에서 검증한다. |
| 오래된 v6.2/v6.3 브리프가 6.9 기능을 덮어쓰는 지시로 해석됨 | P2 | 모든 품질 산출물의 기준을 6.9 INTENT로 고정한다. |
| 빠른 런타임 패치가 저장·오프라인·접근성 회귀를 만들 수 있음 | P1 | 다음 반복부터는 한 가설, 작은 변경, 전체 회귀 검증 원칙을 적용한다. |

## 반복 계획

| 반복 | 목표 | 성공 기준 |
|---|---|---|
| 0A | 레거시 품질 프롬프트를 6.9 기준 산출물로 흡수 | 문서·메트릭 JSON·체크섬이 추가되고 기존 6.9 검증이 통과한다. |
| 0B | 자동 캡처 기준선 구축 | 필수 뷰포트 스크린샷, 콘솔 오류, 메뉴/전투/경로/보스 상태 캡처가 `test_artifacts/`에 생성된다. |
| 1 | 90초 기본 전투 시나리오 계측 | 잔향 기여도, 위상 균열 횟수, TTK, 프레임 지표가 JSON으로 남는다. |
| 2 | 좋은 기록과 나쁜 기록 비교 | 의도적 교차 사격 기록이 poor recording보다 명확히 좋은 수치와 피드백을 보인다. |
| 3 | 모바일·짧은 가로 레이아웃 확인 | 지정 뷰포트에서 수평 오버플로, 중요 HUD 겹침, CTA 은닉이 없다. |
| 4 | 보스 인트로 보호 회귀 | QA probe로 인트로 중 피해 0, 보스 활성화 전 공격 불가, 첫 공격 유예를 재확인한다. |
| 5 | 외부 검증 목록 정리 | 오디오 청감, 물리 게임패드, 저사양 모바일의 남은 확인 항목을 분리한다. |

## 수용 테스트

이번 문서 반영 패스의 수용 기준은 다음 명령으로 검증한다.

```powershell
node -e "const fs=require('fs');const files=['QUALITY_PLAN.md','PROGRESS.md','QUALITY_REPORT.md','test_artifacts/README.md','test_artifacts/iteration-00-metrics.json'];let ok=true;for(const f of files){if(!fs.existsSync(f)){console.error('missing '+f);ok=false}else console.log(f+': exists')}for(const f of ['QUALITY_PLAN.md','PROGRESS.md','QUALITY_REPORT.md']){const s=fs.readFileSync(f,'utf8');if(!/6\\.9|INTENT/.test(s)){console.error(f+': missing 6.9/INTENT anchor');ok=false}else console.log(f+': current-scope anchor OK')}process.exit(ok?0:1)"
node scripts/verify-6.9.mjs
```

체크섬은 변경 커밋 후 Git archive를 풀어 `sha256sum -c CHECKSUMS.sha256`로 검증한다.
