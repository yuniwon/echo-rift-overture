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
