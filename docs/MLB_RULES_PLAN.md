# MLB 룰 확장 계획

이 문서는 현실적인 MLB 룰 도입을 위한 데이터 모델 변경안, UI/UX 변경 목록,
그리고 화면 흐름도를 정리합니다.

## 데이터 모델 변경안 (Player/League/Team)

### Player
- id, name, position, age, stats, performance (기존)
- health: { fatigue, injuryDays } (기존)
- optionsRemaining: number (구현됨)
- serviceTimeYears: number (구현됨, 시즌 종료 시 +1)
- contract: { years, salary, signingBonus, arbEligible, isFA } (기본 구조 반영)
- rosterStatus: "active" | "aaa" | "il" | "fa" | "waivers" (신규)
- ilType: "10" | "60" (구현됨)
- waiverInfo: { originTeamId, expiresRound } (구현됨)

### Team
- id, name, roster, lineup, pitcher, budget (기존)
- fortyManRoster: playerId[] (구현됨, 명시적 40인 리스트)
- ilRoster: playerId[] (구현됨)
- aaaRoster: playerId[] (구현됨, 팀 단위)
- transactionsLog: { round, type, playerId, notes }[] (구현됨)

### League
- teams, schedule, standings, season, freeAgents (기존)
- calendar: { totalRounds, tradeDeadlineRound, postseasonStartRound } (부분 반영)
- postseason: { rounds, roundIndex, champion } (현재 Game 레벨 구현)
- waiverWire: playerId[] (구현됨)

메모:
- 40인 로스터는 이제 명시적 리스트로 관리합니다.
- AAA 선수는 자동으로 40인에 포함되지 않습니다.

## UI/UX 변경 목록

이미 반영됨:
- 리그 화면에 트레이드 마감일 상태 표시.
- 포스트시즌 브래킷 패널 (상위 4팀, Best-of 시리즈).
- IL 탭 및 복귀 액션.
- 선수 모달/툴팁에 옵션 표시.
- OPTIONS 탭 (옵션 상태 확인).
- WAIVERS 탭 (웨이버 클레임).
- 40-MAN 탭 (40인 로스터 보기).
- TRANSACTIONS 패널 (거래 로그).
- HOME 화면 (요약/퀵액션).
- LEAGUE 화면 그리드 재구성 (좌: 순위/포스트시즌, 우: 일정/목표/거래).
- ROSTER 다중 패널 보기 (2~3개 동시).
- 스케줄 결과 클릭 시 상세 경기 로그 모달.
- 라인 스코어 모달 표시 및 경기 로그 검색/필터.
- MARKET 전용 화면 분리.

권장 추가:
- 시즌 캘린더에 마감일 마커.
- 헤더에 포스트시즌 배너 표시.

## 화면 흐름도

Start Screen
  -> Save Slot 선택
  -> 시즌 시작
    -> League View (정규시즌)
      -> Roster/Market/IL
      -> Match
      -> Draft Room (오프시즌)
    -> Postseason
      -> Postseason Match
      -> Postseason Bracket
    -> Offseason
      -> Draft Room
      -> 새 시즌 시작
