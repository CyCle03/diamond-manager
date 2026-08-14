/**
 * 영어 / 한국어 전환.
 *
 * 이 게임의 원문은 영어다. 사전의 en 이 화면에 그대로 나가는 값이고,
 * ko 는 그 번역이다. 키가 사전에 없으면 en 으로, en 에도 없으면 키 문자열
 * 자체를 돌려준다 — 번역이 빠져도 화면이 비지 않게 하기 위해서다.
 *
 * **언어 설정은 localStorage 에만 둔다. 쿠키를 쓰지 않는다.**
 * 개인정보처리방침 9.1 이 "쿠키는 로그인 유지 목적 하나만 씁니다"라고
 * 못박고 있어서, 언어 쿠키를 하나 더 심으면 그 문장이 거짓이 된다.
 * 그래서 서브도메인끼리 자동으로 공유되지 않고, 대신 링크로 넘긴다
 * (영어 랜딩의 bm 링크가 ?lang=en 을 달고 온다).
 */

const STORE_KEY = 'bm_lang';
export const LANGS = ['en', 'ko'];

const DICT = {
  en: {
    'lang.other': '한국어',
    'lang.switchTitle': 'Switch language to Korean',

    // ── 시작 화면 ──
    'start.teamName': 'TEAM NAME',
    'start.selectSlot': 'SELECT SAVE SLOT',
    'start.slot': 'SLOT {n}',
    'start.slotEmpty': 'Empty - Create New',
    'start.slotSaved': '{team}<br>Season {season}<br>Round {round}',
    'start.aaaSettings': 'AAA SETTINGS',
    'start.autoAaa': 'Auto AAA management',
    'start.autoPromote': 'Auto promote/demote',
    'start.aaaActive': 'AAA ACTIVE (Season {season})',
    'start.aaaLocked': 'AAA unlocks in Season {season}',
    'start.matchSettings': 'MATCH SETTINGS',
    'start.autoClearLog': 'Auto clear match log after game',
    'start.close': 'Close options',
    'start.deleteSave': 'Delete Save',

    // ── 계정 ──
    'account.title': 'ACCOUNT — elcherlab single sign-on',
    'account.checking': 'Checking…',
    'account.loggedIn': 'Signed in as {user} — your saves are stored on the server.',
    'account.loggedOut': 'Not signed in. Saves stay in this browser only.',
    'account.idPlaceholder': 'ID (letters, digits, underscore; 3-20 chars)',
    'account.pwPlaceholder': 'Password (6 or more characters)',
    'account.consent':
      'I am 14 or older and agree to the ' +
      '<a href="https://elcherlab.com/terms.html" target="_blank" rel="noopener">Terms of Service</a> and ' +
      '<a href="https://elcherlab.com/privacy.html" target="_blank" rel="noopener">Privacy Policy</a> ' +
      '(Korean). Required to sign up.',
    'account.login': 'LOG IN',
    'account.signup': 'SIGN UP',
    'account.logout': 'LOG OUT',
    'account.errCredentials': 'Enter your ID and password.',
    'account.errConsent': 'Please confirm you are 14 or older and accept the terms.',
    'account.errRequest': 'Request failed ({status})',
    'account.errGeneric': 'The request could not be processed.',

    // ── 헤더 ──
    'nav.home': 'HOME',
    'nav.league': 'LEAGUE',
    'nav.dugout': 'DUGOUT',
    'nav.roster': 'ROSTER',
    'nav.market': 'MARKET',
    'nav.stats': 'STATS',
    'nav.match': 'MATCH',
    'nav.options': 'OPTIONS',
    'hdr.rank': 'RANK: {rank}',
    'hdr.rankNone': 'RANK: --',
    'hdr.fortyMan': '40-MAN: {count}/{max}',
    'hdr.waivers': 'WAIVERS: {count}',
    'hdr.tx': 'TX: {count}',

    // ── 홈 ──
    'home.seasonSummary': 'SEASON SUMMARY',
    'home.frontOffice': 'FRONT OFFICE',
    'home.rosterSnapshot': 'ROSTER SNAPSHOT',
    'home.quickActions': 'QUICK ACTIONS',
    'home.startSeason': 'START SEASON',
    'home.leagueView': 'LEAGUE VIEW',
    'home.rosterHub': 'ROSTER HUB',
    'home.nextMatch': 'NEXT MATCH',

    // ── 더그아웃 ──
    'dugout.title': 'DUGOUT',
    'dugout.auto': 'AUTO',
    'dugout.pitchers': 'PITCHERS',
    'dugout.rotation': 'PITCHING ROTATION',
    'dugout.rot4': '4-Man',
    'dugout.rot5': '5-Man',
    'dugout.rot6': '6-Man',
    'dugout.bullpenRoles': 'BULLPEN ROLES',
    'dugout.batters': 'BATTERS',
    'dugout.selectBatter': '{n}. Select Batter...',
    'dugout.benchBatters': 'BENCH BATTERS',
    'dugout.sort': 'SORT',
    'sort.age': 'AGE',
    'sort.name': 'NAME',
    'dugout.posRanks': 'LEAGUE POSITION RANKS',
    'dugout.startForRanks': 'Start Season to view rankings',

    // ── 경기 ──
    'match.toLeague': 'LEAGUE',
    'match.auto': 'AUTO',
    'match.manual': 'MANUAL',
    'match.pitch': 'PITCH',
    'match.batter': 'BATTER',
    'match.autoView': 'AUTO VIEW',
    'match.viewBatter': 'Batter-by-Batter',
    'match.viewPitch': 'Pitch-by-Pitch',
    'match.viewInning': 'Inning-by-Inning',
    'match.viewFull': 'Full Game',
    'match.bullpen': 'BULLPEN',
    'match.sub': 'SUB',
    'match.autoBp': 'AUTO BP',
    'match.filterAll': 'ALL',
    'match.filterHighlight': 'HIGHLIGHT',
    'match.teamAll': 'ALL',
    'match.teamHome': 'HOME',
    'match.teamAway': 'AWAY',
    'match.inning': 'INNING',
    'match.inningAll': 'ALL',
    'match.logWelcome1': '> Welcome to Diamond Manager.',
    'match.logWelcome2': '> Set your lineup and perform roster moves.',

    // ── 리그 ──
    'league.overview': 'SEASON OVERVIEW',
    'league.standings': 'LEAGUE STANDINGS',
    'tbl.team': 'TEAM',
    'tbl.player': 'PLAYER',
    'league.enterMatch': 'ENTER MATCH',
    'league.bracket': 'POSTSEASON BRACKET',
    'league.schedule': 'SCHEDULE',
    'league.round': 'ROUND',
    'league.filterAll': 'ALL',
    'league.filterMy': 'MY TEAM',
    'league.goals': 'GOALS',
    'league.transactions': 'TRANSACTIONS',
    'league.draftRoom': 'DRAFT ROOM',
    'draft.advance': 'ADVANCE PICK',
    'draft.best': 'DRAFT BEST',
    'draft.need': 'DRAFT NEED',

    // ── 기록 ──
    'stats.teamStats': 'TEAM STATS',
    'stats.runsTrend': 'RUNS TREND',
    'stats.batters': 'BATTERS',
    'stats.pitchers': 'PITCHERS',
    'stats.recentGames': 'RECENT GAMES',

    // ── 로스터 / 마켓 ──
    'roster.tabRoster': 'ROSTER',
    'roster.tabAaa': 'AAA',
    'roster.tabIl': 'IL',
    'roster.tabOptions': 'OPTIONS',
    'roster.tab40': '40-MAN',
    'roster.tabMarket': 'MARKET',
    'roster.multiView': 'Multi View (2-3 panels)',
    'roster.chkRoster': 'ROSTER',
    'roster.chkIl': 'IL',
    'roster.chkOptions': 'OPTIONS',
    'roster.chk40': '40-MAN',
    'roster.chkMarket': 'MARKET',
    'roster.myRoster': 'MY ROSTER',
    'roster.aaaRoster': 'AAA ROSTER',
    'roster.injuredList': 'INJURED LIST',
    'roster.optionsTracker': 'OPTIONS TRACKER',
    'roster.fortyMan': '40-MAN ROSTER',
    'market.fa': 'FA',
    'market.trade': 'TRADE',
    'market.scouting': 'SCOUTING',
    'market.waivers': 'WAIVERS',
    'market.freeAgents': 'FREE AGENTS',
    'market.tradeMarket': 'TRADE MARKET',
    'market.youGive': 'YOU GIVE',
    'market.theyGive': 'THEY GIVE',
    'market.cash': 'CASH',
    'market.propose': 'PROPOSE TRADE',
    'market.scoutingTitle': 'SCOUTING',
    'market.waiverWire': 'WAIVER WIRE',

    // ── 경기 요약 / 로그 ──
    'summary.title': 'GAME SUMMARY',
    'summary.nextMatch': 'NEXT MATCH',
    'summary.league': 'LEAGUE',
    'summary.ok': 'OK',
    'log.openMatchLog': 'OPEN MATCH LOG',
    'log.close': 'CLOSE',

    // ── 알림 · 확인 대화상자 ──
    'dlg.enterTeamName': 'Please enter a Team Name!',
    'dlg.deleteSlot': 'Delete Save Slot {slot}? This cannot be undone.',
    'dlg.loadFailed': 'Failed to load save data!',
    'dlg.signFa': 'Sign Free Agent {name} for ${amount}?',
    'dlg.release': 'Release {name}?',
    'dlg.releaseAaa': 'Release {name} from AAA?',
    'dlg.signScouted': 'Sign Scouted Player {name} for ${amount}?',
    'dlg.injuredCannotPitch': '{name} is injured and cannot pitch.',
    'dlg.onlyPitchers': 'Only Pitchers in Rotation!',
    'dlg.injuredCannotLineup': '{name} is injured and cannot be added to the lineup.',
    'dlg.notCompliant': 'Roster not MLB compliant: {issues}',
    'dlg.noStarter': 'No Starting Pitcher set for slot SP{n}!',
    'dlg.starterInjured': '{name} is injured and cannot start.',
    'dlg.playerInjured': '{name} is injured and cannot play.',
    'dlg.rosterFull': 'Roster is full (Max {max}).',
    'dlg.fortyFull': '40-man roster is full (Max {max}).',
    'dlg.positionLimit': 'Roster limit reached for this position (pitchers max 13).',
    'dlg.notEnoughBudget': 'Not enough budget to sign this player!',
    'dlg.signed': 'Signed {name}!',
    'dlg.released': 'Released {name}.',
    'dlg.cannotReleaseFloor': 'Cannot release player. Roster is at the minimum size of {floor}.',
    'dlg.notInjured': 'Player is not injured.',
    'dlg.stillInjured': 'Player is still injured.',
    'dlg.aaaInactive': 'AAA is not active yet.',
    'dlg.aaaFull': 'AAA roster is full.',
    'dlg.cannotDemote': 'Cannot demote below {floor} players.',
    'dlg.champion': '{name} wins the championship!',
    'dlg.seasonOver': 'SEASON OVER! Proceeding to Off-Season for player development.',
    'dlg.scoutBeforeSeason': 'Start the season before scouting.',
    'dlg.scoutBudget': 'Not enough budget to scout right now.',
    'dlg.draftBegun': 'Off-season draft has begun!',
    'dlg.yourPick': "It's your pick. Draft a player first.",
    'dlg.draftRosterFull': 'Roster is full (Max {max}). Release a player before drafting.',
    'dlg.draftFortyFull': '40-man roster is full (Max {max}). Release a player before drafting.',
    'dlg.seasonBegin': 'Season {season} is about to begin!',

    // ── 경기 로그 ──
    // 이미 세이브에 들어간 줄은 그때의 언어 그대로 남는다. 로그는 완성된
    // 문자열로 저장되므로 소급 번역이 되지 않는다.
    'log.matchStarting': 'MATCH STARTING!',
    'log.rosterWarning': 'Roster warning: {issues}',
    'log.homePitcher': 'Home Pitcher: {name}',
    'log.awayPitcher': 'Away Pitcher: {name}',
    'log.inningStart': '--- INNING {inning} START ---',
    'log.topInning': 'TOP {inning}: Away Team batting.',
    'log.botInning': 'BOT {inning}: Home Team batting.',
    'log.gameOver': 'GAME OVER! Final: Home: {home} - Away: {away}',
    'log.runner': 'Runner',
    'log.runnerOut': '{name} out at {base} ({outs} Out)',
    'log.base.home': 'home',
    'log.outcomeOut': '{name}: {desc} ({outs} Out)',
    'log.outcomeHit': '{name}: {desc}!',
    'log.homeRun': '>>> HOME RUN! <<<<',
    'log.walkOff': 'WALK-OFF!',

    'log.proratedSalary': 'Prorated salary of ${amount} charged for {name}.',
    'log.optioned': '{name} optioned to AAA. Options left: {left}.',
    'log.waived': '{name} placed on waivers.',
    'log.claimed': '{name} claimed off waivers.',
    'log.calledUp': '{name} was called up from AAA.',
    'log.releasedAaa': '{name} was released from AAA.',
    'log.fortyOver': '40-man roster exceeds limit ({count}/{max}).',
    'log.postseasonBegins': 'Postseason begins!',
    'log.champion': 'Champion: {name}',
    'log.postseasonRound': 'Postseason Round {n} begins!',
    'log.enterSetup': 'Enter Match Setup... Set Lineup then Play!',
    'log.noPostseasonMatch': 'No postseason match scheduled. Simulating remaining series...',
    'log.noMatchThisRound': 'No match scheduled for this round.',
    'log.matchStartingVs': 'MATCH STARTING! SP: {starter} vs {opponent}',
    'log.wonPrize': '> Your team won! You earned ${amount}!',
    'log.postseasonMissing': 'Postseason state missing.',
    'log.seriesUpdate': 'Series update: {home} {winsHome} - {away} {winsAway}',
    'log.salariesDeducted': 'Annual salaries of ${amount} deducted.',
    'log.resultSummary': '> Result: {outcome} (summary only)',
    'log.resultAi': '> Result: AI game (summary only)',
    'log.goalAchieved': 'Goal achieved: {label} (+${reward})',
    'log.injured': '{name} is injured ({days} games).',
    'log.scoutingReady': 'Scouting reports ready: {n} prospects added.',
    'log.pitchingChange': 'Pitching change: {name} enters.',
    'log.scoutingStarted': 'Scouting started. Reports ready in {n} games.',
    'log.drafted': 'Drafted {name} ({pos}).',
    'log.draftedBy': '{team} drafted {name}.',

    // ── 선수 카드 · 액션 · 뷰 ──
    'act.moveToIl': 'MOVE TO IL',
    'act.release': 'RELEASE',
    'act.sendToAaa': 'SEND TO AAA',
    'act.callUp': 'CALL UP',
    'act.activate': 'ACTIVATE',
    'act.claim': 'CLAIM',
    'act.resume': 'RESUME',
    'act.pause': 'PAUSE',
    'act.draft': 'DRAFT',
    'view.home': 'HOME VIEW',
    'view.league': 'LEAGUE VIEW',
    'view.dugout': 'DUGOUT VIEW',
    'view.roster': 'ROSTER VIEW',
    'view.market': 'MARKET VIEW',
    'view.stats': 'STATS VIEW',
    'view.match': 'MATCH VIEW',
    'view.marketHub': 'MARKET HUB',
    'view.rosterHub': 'ROSTER HUB',
    'view.rosterMarket': 'ROSTER / MARKET',
    'card.currentSeason': 'Current Season',
    'card.seasonHistory': 'Season History',
    'card.season': 'Season',
    'card.position': 'Position',
    'card.age': 'Age',
    'card.overall': 'Overall',
    'card.contact': 'Contact',
    'card.power': 'Power',
    'card.speed': 'Speed',
    'card.defense': 'Defense',
    'card.pitching': 'Pitching',
    'card.stamina': 'Stamina',
    'card.fatigue': 'Fatigue',
    'card.injury': 'Injury',
    'card.options': 'Options',
    'card.salary': 'Salary',
    'card.signingBonus': 'Signing Bonus',
    'card.days': '{n} days',
    'match.waiting': 'WAITING FOR MATCH...',
    'match.staminaNone': 'PITCHER STAMINA: --',
    'match.complete': 'Match complete. Ready for next game.',
    'match.playBallBang': 'PLAY BALL!',
    'match.setLineupHint': 'Set your lineup and click \"PLAY BALL\" to start.',
    'home.hq': 'Your Franchise HQ',
    'league.postseasonGame': 'POSTSEASON GAME',
    'sched.upcoming': 'UPCOMING',
    'sched.completed': 'COMPLETED',
    'sched.today': 'TODAY',
    'trade.deadlinePassed': 'Trade deadline has passed.',
    'trade.startSeasonFirst': 'Start season first',
    'trade.pickTeam': 'Pick a team and players to trade.',
    'trade.noCash': 'Not enough budget for cash add-on.',
    'trade.rejected': 'Trade rejected by the other team.',
    'trade.accepted': 'Trade accepted!',
    'trade.sentTo': 'Sent to {team}',
    'trade.acquiredFrom': 'Acquired from {team}',
    'trade.optionsLeft': 'Options left {n}',
    'draft.orderUnavailable': 'Draft order unavailable.',
    'goal.wins': 'Win {n} games',
    'goal.ops': 'Team OPS \u2265 .780',
    'goal.era': 'Team ERA \u2264 4.20',
    'empty.startSeasonFirst': 'Start Season first',
    'empty.startForScout': 'Start a season to scout',
    'empty.noAaa': 'No AAA players',
    'empty.noIl': 'No players on IL',
    'empty.noPlayers': 'No players available',
    'empty.noForty': 'No players on 40-man roster',
    'empty.noWaivers': 'No players on waivers',
    'empty.noScoutReports': 'No scouting reports yet',
    'empty.noBullpenPitchers': 'No bullpen pitchers',
    'empty.noBullpenAvailable': 'No bullpen available',
    'empty.noBench': 'No bench batters',
    'empty.startForSchedule': 'Start season to view schedule.',
    'empty.noLineScore': 'No line score available.',
    'empty.noDetailLog': 'No detailed log available.',
    'empty.noGoals': 'No goals yet',
    'empty.noTransactions': 'No transactions yet.',
    'empty.noGames': 'No games played yet.',
    'empty.noProspects': 'No prospects left',
  },

  ko: {
    'lang.other': 'English',
    'lang.switchTitle': '언어를 영어로 바꿉니다',

    // ── 시작 화면 ──
    'start.teamName': '팀 이름',
    'start.selectSlot': '세이브 슬롯 선택',
    'start.slot': '슬롯 {n}',
    'start.slotEmpty': '비어 있음 - 새로 시작',
    'start.slotSaved': '{team}<br>{season}시즌<br>{round}라운드',
    'start.aaaSettings': '3군 설정',
    'start.autoAaa': '3군 자동 관리',
    'start.autoPromote': '자동 승격/강등',
    'start.aaaActive': '3군 운영 중 ({season}시즌)',
    'start.aaaLocked': '3군은 {season}시즌부터 열립니다',
    'start.matchSettings': '경기 설정',
    'start.autoClearLog': '경기 후 경기 로그 자동 비우기',
    'start.close': '설정 닫기',
    'start.deleteSave': '세이브 삭제',

    // ── 계정 ──
    'account.title': '계정 — elcherlab 통합 로그인',
    'account.checking': '확인 중…',
    'account.loggedIn': '{user} 으로 로그인됨 — 세이브가 서버에 저장됩니다.',
    'account.loggedOut': '로그인하지 않았습니다. 세이브는 이 브라우저에만 저장됩니다.',
    'account.idPlaceholder': '아이디 (영문·숫자·밑줄 3~20자)',
    'account.pwPlaceholder': '비밀번호 (6자 이상)',
    'account.consent':
      '만 14세 이상이며, ' +
      '<a href="https://elcherlab.com/terms.html" target="_blank" rel="noopener">이용약관</a>과 ' +
      '<a href="https://elcherlab.com/privacy.html" target="_blank" rel="noopener">개인정보처리방침</a>에 ' +
      '동의합니다. (가입할 때만 필요)',
    'account.login': '로그인',
    'account.signup': '가입',
    'account.logout': '로그아웃',
    'account.errCredentials': '아이디와 비밀번호를 입력하세요.',
    'account.errConsent': '만 14세 이상 확인과 약관 동의에 체크해 주세요.',
    'account.errRequest': '요청 실패 ({status})',
    'account.errGeneric': '요청을 처리할 수 없습니다.',

    // ── 헤더 ──
    'nav.home': '홈',
    'nav.league': '리그',
    'nav.dugout': '더그아웃',
    'nav.roster': '로스터',
    'nav.market': '마켓',
    'nav.stats': '기록',
    'nav.match': '경기',
    'nav.options': '설정',
    'hdr.rank': '순위: {rank}',
    'hdr.rankNone': '순위: --',
    'hdr.fortyMan': '40인: {count}/{max}',
    'hdr.waivers': '웨이버: {count}',
    'hdr.tx': '트랜잭션: {count}',

    // ── 홈 ──
    'home.seasonSummary': '시즌 요약',
    'home.frontOffice': '프런트',
    'home.rosterSnapshot': '로스터 현황',
    'home.quickActions': '바로 가기',
    'home.startSeason': '시즌 시작',
    'home.leagueView': '리그 보기',
    'home.rosterHub': '로스터 허브',
    'home.nextMatch': '다음 경기',

    // ── 더그아웃 ──
    'dugout.title': '더그아웃',
    'dugout.auto': '자동',
    'dugout.pitchers': '투수',
    'dugout.rotation': '선발 로테이션',
    'dugout.rot4': '4인',
    'dugout.rot5': '5인',
    'dugout.rot6': '6인',
    'dugout.bullpenRoles': '불펜 보직',
    'dugout.batters': '타자',
    'dugout.selectBatter': '{n}. 타자 선택...',
    'dugout.benchBatters': '벤치 타자',
    'dugout.sort': '정렬',
    'sort.age': '나이',
    'sort.name': '이름',
    'dugout.posRanks': '리그 포지션 순위',
    'dugout.startForRanks': '시즌을 시작하면 순위가 나옵니다',

    // ── 경기 ──
    'match.toLeague': '리그',
    'match.auto': '자동',
    'match.manual': '수동',
    'match.pitch': '투구',
    'match.batter': '타자',
    'match.autoView': '자동 진행',
    'match.viewBatter': '타자별',
    'match.viewPitch': '투구별',
    'match.viewInning': '이닝별',
    'match.viewFull': '경기 전체',
    'match.bullpen': '불펜',
    'match.sub': '교체',
    'match.autoBp': '자동 불펜',
    'match.filterAll': '전체',
    'match.filterHighlight': '주요 장면',
    'match.teamAll': '전체',
    'match.teamHome': '홈',
    'match.teamAway': '원정',
    'match.inning': '이닝',
    'match.inningAll': '전체',
    'match.logWelcome1': '> 다이아몬드 매니저에 오신 것을 환영합니다.',
    'match.logWelcome2': '> 라인업을 짜고 로스터를 정리하세요.',

    // ── 리그 ──
    'league.overview': '시즌 개요',
    'league.standings': '리그 순위',
    'tbl.team': '팀',
    'tbl.player': '선수',
    'league.enterMatch': '경기 입장',
    'league.bracket': '포스트시즌 대진',
    'league.schedule': '일정',
    'league.round': '라운드',
    'league.filterAll': '전체',
    'league.filterMy': '우리 팀',
    'league.goals': '목표',
    'league.transactions': '트랜잭션',
    'league.draftRoom': '드래프트',
    'draft.advance': '픽 넘기기',
    'draft.best': '최고 선수 지명',
    'draft.need': '필요 포지션 지명',

    // ── 기록 ──
    'stats.teamStats': '팀 기록',
    'stats.runsTrend': '득실 추이',
    'stats.batters': '타자',
    'stats.pitchers': '투수',
    'stats.recentGames': '최근 경기',

    // ── 로스터 / 마켓 ──
    'roster.tabRoster': '로스터',
    'roster.tabAaa': '3군',
    'roster.tabIl': '부상자',
    'roster.tabOptions': '옵션',
    'roster.tab40': '40인',
    'roster.tabMarket': '마켓',
    'roster.multiView': '멀티 뷰 (2~3개 패널)',
    'roster.chkRoster': '로스터',
    'roster.chkIl': '부상자',
    'roster.chkOptions': '옵션',
    'roster.chk40': '40인',
    'roster.chkMarket': '마켓',
    'roster.myRoster': '내 로스터',
    'roster.aaaRoster': '3군 로스터',
    'roster.injuredList': '부상자 명단',
    'roster.optionsTracker': '옵션 현황',
    'roster.fortyMan': '40인 로스터',
    'market.fa': 'FA',
    'market.trade': '트레이드',
    'market.scouting': '스카우팅',
    'market.waivers': '웨이버',
    'market.freeAgents': '자유계약선수',
    'market.tradeMarket': '트레이드 시장',
    'market.youGive': '내가 줄 선수',
    'market.theyGive': '받을 선수',
    'market.cash': '현금',
    'market.propose': '트레이드 제안',
    'market.scoutingTitle': '스카우팅',
    'market.waiverWire': '웨이버 공시',

    // ── 경기 요약 / 로그 ──
    'summary.title': '경기 요약',
    'summary.nextMatch': '다음 경기',
    'summary.league': '리그',
    'summary.ok': '확인',
    'log.openMatchLog': '경기 로그 열기',
    'log.close': '닫기',

    // ── 알림 · 확인 대화상자 ──
    'dlg.enterTeamName': '팀 이름을 입력하세요!',
    'dlg.deleteSlot': '슬롯 {slot} 의 세이브를 지울까요? 되돌릴 수 없습니다.',
    'dlg.loadFailed': '세이브를 불러오지 못했습니다!',
    'dlg.signFa': 'FA {name} 을(를) ${amount} 에 영입할까요?',
    'dlg.release': '{name} 을(를) 방출할까요?',
    'dlg.releaseAaa': '{name} 을(를) 3군에서 방출할까요?',
    'dlg.signScouted': '스카우트한 {name} 을(를) ${amount} 에 영입할까요?',
    'dlg.injuredCannotPitch': '{name} 은(는) 부상 중이라 등판할 수 없습니다.',
    'dlg.onlyPitchers': '로테이션에는 투수만 넣을 수 있습니다!',
    'dlg.injuredCannotLineup': '{name} 은(는) 부상 중이라 라인업에 넣을 수 없습니다.',
    'dlg.notCompliant': '로스터가 규정에 맞지 않습니다: {issues}',
    'dlg.noStarter': 'SP{n} 자리에 선발 투수가 없습니다!',
    'dlg.starterInjured': '{name} 은(는) 부상 중이라 선발로 나갈 수 없습니다.',
    'dlg.playerInjured': '{name} 은(는) 부상 중이라 출전할 수 없습니다.',
    'dlg.rosterFull': '로스터가 가득 찼습니다 (최대 {max}명).',
    'dlg.fortyFull': '40인 로스터가 가득 찼습니다 (최대 {max}명).',
    'dlg.positionLimit': '이 포지션의 정원이 찼습니다 (투수는 최대 13명).',
    'dlg.notEnoughBudget': '이 선수를 영입할 예산이 부족합니다!',
    'dlg.signed': '{name} 영입 완료!',
    'dlg.released': '{name} 을(를) 방출했습니다.',
    'dlg.cannotReleaseFloor': '방출할 수 없습니다. 로스터가 최소 인원 {floor}명입니다.',
    'dlg.notInjured': '부상 중인 선수가 아닙니다.',
    'dlg.stillInjured': '아직 부상 중입니다.',
    'dlg.aaaInactive': '3군이 아직 열리지 않았습니다.',
    'dlg.aaaFull': '3군 로스터가 가득 찼습니다.',
    'dlg.cannotDemote': '{floor}명 아래로는 내릴 수 없습니다.',
    'dlg.champion': '{name} 이(가) 우승했습니다!',
    'dlg.seasonOver': '시즌 종료! 선수 성장을 위한 오프시즌으로 넘어갑니다.',
    'dlg.scoutBeforeSeason': '스카우팅은 시즌을 시작한 뒤에 할 수 있습니다.',
    'dlg.scoutBudget': '지금은 스카우팅할 예산이 부족합니다.',
    'dlg.draftBegun': '오프시즌 드래프트가 시작됐습니다!',
    'dlg.yourPick': '우리 차례입니다. 선수를 먼저 지명하세요.',
    'dlg.draftRosterFull': '로스터가 가득 찼습니다 (최대 {max}명). 지명 전에 선수를 방출하세요.',
    'dlg.draftFortyFull': '40인 로스터가 가득 찼습니다 (최대 {max}명). 지명 전에 선수를 방출하세요.',
    'dlg.seasonBegin': '{season}시즌이 곧 시작됩니다!',

    // ── 경기 로그 ──
    'log.matchStarting': '경기 시작!',
    'log.rosterWarning': '로스터 경고: {issues}',
    'log.homePitcher': '홈 선발: {name}',
    'log.awayPitcher': '원정 선발: {name}',
    'log.inningStart': '--- {inning}회 시작 ---',
    'log.topInning': '{inning}회 초: 원정팀 공격.',
    'log.botInning': '{inning}회 말: 홈팀 공격.',
    'log.gameOver': '경기 종료! 최종 홈 {home} - 원정 {away}',
    'log.runner': '주자',
    'log.runnerOut': '{name} {base} 아웃 ({outs}아웃)',
    'log.base.home': '홈에서',
    'log.outcomeOut': '{name}: {desc} ({outs}아웃)',
    'log.outcomeHit': '{name}: {desc}!',
    'log.homeRun': '>>> 홈런! <<<<',
    'log.walkOff': '끝내기!',

    'log.proratedSalary': '{name} 의 일할 연봉 ${amount} 이(가) 청구됐습니다.',
    'log.optioned': '{name} 3군 강등. 남은 옵션: {left}회.',
    'log.waived': '{name} 웨이버 공시.',
    'log.claimed': '{name} 웨이버 영입.',
    'log.calledUp': '{name} 1군 승격.',
    'log.releasedAaa': '{name} 3군에서 방출.',
    'log.fortyOver': '40인 로스터 정원 초과 ({count}/{max}).',
    'log.postseasonBegins': '포스트시즌 시작!',
    'log.champion': '우승: {name}',
    'log.postseasonRound': '포스트시즌 {n}라운드 시작!',
    'log.enterSetup': '경기 준비... 라인업을 짜고 시작하세요!',
    'log.noPostseasonMatch': '예정된 포스트시즌 경기가 없습니다. 남은 시리즈를 시뮬레이션합니다...',
    'log.noMatchThisRound': '이번 라운드에 예정된 경기가 없습니다.',
    'log.matchStartingVs': '경기 시작! 선발 {starter} vs {opponent}',
    'log.wonPrize': '> 우리 팀 승리! 상금 ${amount} 획득!',
    'log.postseasonMissing': '포스트시즌 정보가 없습니다.',
    'log.seriesUpdate': '시리즈 현황: {home} {winsHome} - {away} {winsAway}',
    'log.salariesDeducted': '연봉 총액 ${amount} 이(가) 지출됐습니다.',
    'log.resultSummary': '> 결과: {outcome} (요약만)',
    'log.resultAi': '> 결과: AI 경기 (요약만)',
    'log.goalAchieved': '목표 달성: {label} (+${reward})',
    'log.injured': '{name} 부상 ({days}경기).',
    'log.scoutingReady': '스카우팅 보고서 도착: 유망주 {n}명 추가.',
    'log.pitchingChange': '투수 교체: {name} 등판.',
    'log.scoutingStarted': '스카우팅 시작. {n}경기 뒤 보고서가 나옵니다.',
    'log.drafted': '{name} ({pos}) 지명 완료.',
    'log.draftedBy': '{team} 이(가) {name} 을(를) 지명했습니다.',

    // ── 선수 카드 · 액션 · 뷰 ──
    'act.moveToIl': '부상자 등재',
    'act.release': '방출',
    'act.sendToAaa': '3군행',
    'act.callUp': '승격',
    'act.activate': '복귀',
    'act.claim': '영입',
    'act.resume': '재개',
    'act.pause': '일시정지',
    'act.draft': '지명',
    'view.home': '홈 화면',
    'view.league': '리그 화면',
    'view.dugout': '더그아웃 화면',
    'view.roster': '로스터 화면',
    'view.market': '마켓 화면',
    'view.stats': '기록 화면',
    'view.match': '경기 화면',
    'view.marketHub': '마켓 허브',
    'view.rosterHub': '로스터 허브',
    'view.rosterMarket': '로스터 / 마켓',
    'card.currentSeason': '이번 시즌',
    'card.seasonHistory': '시즌별 기록',
    'card.season': '시즌',
    'card.position': '포지션',
    'card.age': '나이',
    'card.overall': '종합',
    'card.contact': '콘택트',
    'card.power': '파워',
    'card.speed': '주루',
    'card.defense': '수비',
    'card.pitching': '투구',
    'card.stamina': '체력',
    'card.fatigue': '피로도',
    'card.injury': '부상',
    'card.options': '옵션',
    'card.salary': '연봉',
    'card.signingBonus': '계약금',
    'card.days': '{n}일',
    'match.waiting': '경기 대기 중...',
    'match.staminaNone': '투수 체력: --',
    'match.complete': '경기 종료. 다음 경기를 준비하세요.',
    'match.playBallBang': '플레이 볼!',
    'match.setLineupHint': '라인업을 짜고 \"플레이 볼\" 을 누르세요.',
    'home.hq': '우리 구단 사무실',
    'league.postseasonGame': '포스트시즌 경기',
    'sched.upcoming': '예정',
    'sched.completed': '종료',
    'sched.today': '오늘',
    'trade.deadlinePassed': '트레이드 마감이 지났습니다.',
    'trade.startSeasonFirst': '시즌을 먼저 시작하세요',
    'trade.pickTeam': '팀과 선수를 고르세요.',
    'trade.noCash': '현금을 얹을 예산이 부족합니다.',
    'trade.rejected': '상대 팀이 트레이드를 거절했습니다.',
    'trade.accepted': '트레이드 성사!',
    'trade.sentTo': '{team} 으로 보냄',
    'trade.acquiredFrom': '{team} 에서 영입',
    'trade.optionsLeft': '남은 옵션 {n}회',
    'draft.orderUnavailable': '드래프트 순서를 불러올 수 없습니다.',
    'goal.wins': '{n}승 달성',
    'goal.ops': '팀 OPS \u2265 .780',
    'goal.era': '팀 ERA \u2264 4.20',
    'empty.startSeasonFirst': '시즌을 먼저 시작하세요',
    'empty.startForScout': '스카우팅은 시즌 시작 후',
    'empty.noAaa': '3군 선수가 없습니다',
    'empty.noIl': '부상자 명단이 비어 있습니다',
    'empty.noPlayers': '선수가 없습니다',
    'empty.noForty': '40인 로스터가 비어 있습니다',
    'empty.noWaivers': '웨이버 공시된 선수가 없습니다',
    'empty.noScoutReports': '아직 스카우팅 보고서가 없습니다',
    'empty.noBullpenPitchers': '불펜 투수가 없습니다',
    'empty.noBullpenAvailable': '가용 불펜 없음',
    'empty.noBench': '벤치 타자가 없습니다',
    'empty.startForSchedule': '시즌을 시작하면 일정이 나옵니다.',
    'empty.noLineScore': '이닝별 점수가 없습니다.',
    'empty.noDetailLog': '상세 로그가 없습니다.',
    'empty.noGoals': '아직 목표가 없습니다',
    'empty.noTransactions': '아직 트랜잭션이 없습니다.',
    'empty.noGames': '아직 치른 경기가 없습니다.',
    'empty.noProspects': '남은 유망주가 없습니다',
  },
};

function detect() {
  // 링크로 넘어온 값이 가장 세다 — 영어 랜딩에서 들어온 사람은 영어로 시작한다.
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (LANGS.includes(q)) return q;
  } catch {
    /* URL 파싱 실패는 무시하고 다음 단계로 */
  }
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (LANGS.includes(saved)) return saved;
  } catch {
    /* 저장소가 막힌 브라우저 — 감지로 넘어간다 */
  }
  // 브라우저 밖(배포 파이프라인의 import 검사 등)에서도 불릴 수 있으므로 확인하고 읽는다.
  const nav = (typeof navigator !== 'undefined' && navigator.language || '').toLowerCase();
  return nav.startsWith('ko') ? 'ko' : 'en';
}

let lang = detect();

export function getLang() {
  return lang;
}

/**
 * 사전 문구에 <br> 이 들어 있어 innerHTML 로 넣는 자리가 있다. 거기에 팀 이름처럼
 * 사용자가 친 값을 끼울 때는 반드시 이걸 통과시킨다.
 */
export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 인자 자리에 **다시 번역해야 하는 값**을 넣을 때 쓴다.
 *
 * 경기 로그는 키와 인자를 세이브에 담는데, 인자에 번역 결과를 그대로 넣으면
 * (`desc: tEvent('Home Run')` → '홈런') 그 자리만 옛 언어로 굳는다. 대신 표시를
 * 미루는 표식을 넣어 두고 t() 가 그릴 때 푼다.
 */
export function ev(desc) {
  return { $ev: desc };
}

/** 인자 자리에 들어갈 사전 키. ev() 와 같은 이유로 표시를 미룬다. */
export function tk(key) {
  return { $t: key };
}

function resolveVar(v) {
  if (v && typeof v === 'object') {
    if (typeof v.$ev === 'string') return tEvent(v.$ev);
    if (typeof v.$t === 'string') return t(v.$t);
  }
  return v;
}

/** t('start.slot', { n: 1 }) 처럼 {이름} 자리를 채운다. */
export function t(key, vars) {
  let s = DICT[lang]?.[key] ?? DICT.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.split(`{${k}}`).join(String(resolveVar(v)));
    }
  }
  return s;
}

/**
 * 경기 결과 이름(outcome.desc). 이 값은 게임 로직의 분기 조건이자 세이브에
 * 들어가는 값이라 영어를 원본으로 두고, 화면에 나갈 때만 여기서 갈아 끼운다.
 */
const EVENT_KO = {
  'Single': '안타',
  'Double': '2루타',
  'Triple': '3루타',
  'Home Run': '홈런',
  'Walk': '볼넷',
  'Hit By Pitch': '몸에 맞는 공',
  'Strikeout': '삼진',
  'Groundout': '땅볼 아웃',
  'Groundout DP': '병살타',
  'Flyout': '뜬공 아웃',
  'Sac Fly': '희생플라이',
};

export function tEvent(desc) {
  if (lang !== 'ko' || !desc) return desc;
  return EVENT_KO[desc] || desc;
}

/**
 * 트랜잭션 종류(SIGN FA, RELEASE ...). 이 값은 세이브에 그대로 들어가므로
 * 영어를 원본으로 저장하고 화면에 낼 때만 옮긴다 — 그래야 예전 세이브의
 * 기록도 지금 언어로 보인다.
 */
const TX_KO = {
  'SIGN FA': 'FA 영입',
  'SIGN SCOUT': '스카우트 영입',
  'RELEASE': '방출',
  'RELEASE AAA': '3군 방출',
  'ACTIVATE': '복귀',
  'OPTION': '3군 강등',
  'WAIVERS': '웨이버 공시',
  'CLAIM': '웨이버 영입',
  'CALL UP': '승격',
  'TRADE': '트레이드',
};

export function tTx(type) {
  if (lang !== 'ko' || !type) return type;
  return TX_KO[type] || type;
}

/** 불펜 보직. player.bullpenRole 에 영어로 저장되므로 화면에서만 옮긴다. */
const ROLE_KO = {
  'Long Relief': '롱릴리프',
  'Middle Relief': '중간계투',
  'Setup': '셋업',
  'Closer': '마무리',
  'Opener': '오프너',
};

export function tRole(role) {
  if (lang !== 'ko' || !role) return role;
  return ROLE_KO[role] || role;
}

/**
 * 순위 표기. 영어는 서수(1st·2nd·3rd), 한국어는 "3위" 처럼 뒤에 붙는다.
 * 언어마다 붙는 자리가 달라 사전 문구로는 깔끔하게 안 나와서 함수로 둔다.
 */
export function tOrdinal(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return String(n);
  if (lang === 'ko') return `${num}위`;
  const rem100 = num % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${num}th`;
  const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[num % 10] || 'th';
  return `${num}${suffix}`;
}

/**
 * data-i18n* 속성이 붙은 노드를 현재 언어로 채운다.
 * 언어를 바꿀 때마다 다시 부르므로, 원문을 지우지 않고 키만 보고 다시 쓴다.
 */
export function applyI18n(root = document) {
  const fill = (attr, apply) => {
    root.querySelectorAll(`[${attr}]`).forEach((el) => {
      const key = el.getAttribute(attr);
      const vars = el.dataset.i18nVars ? JSON.parse(el.dataset.i18nVars) : null;
      apply(el, t(key, vars));
    });
  };
  fill('data-i18n', (el, v) => { el.textContent = v; });
  // 사전 안의 HTML 만 넣는다. 사용자 입력은 절대 여기로 오지 않는다.
  fill('data-i18n-html', (el, v) => { el.innerHTML = v; });
  fill('data-i18n-ph', (el, v) => { el.placeholder = v; });
  fill('data-i18n-title', (el, v) => { el.title = v; });
  fill('data-i18n-aria', (el, v) => { el.setAttribute('aria-label', v); });
  if (root === document) document.documentElement.lang = lang;
}

/**
 * 언어를 바꾸고 화면을 다시 칠한다.
 * 정적 문구는 여기서 바로 반영되고, 게임이 그려 넣은 부분은 bm:langchange 를
 * 듣는 쪽(Game.js)이 다시 그린다. 경기 중에도 새로고침 없이 바뀌어야 하므로
 * location.reload() 는 쓰지 않는다 — 진행 중인 경기가 날아간다.
 */
export function setLang(next) {
  if (!LANGS.includes(next) || next === lang) return;
  lang = next;
  try {
    localStorage.setItem(STORE_KEY, lang);
  } catch {
    /* 저장소가 막혀 있으면 이번 방문에만 적용된다 */
  }
  applyI18n(document);
  document.dispatchEvent(new CustomEvent('bm:langchange', { detail: { lang } }));
}

/**
 * 언어 토글 버튼(헤더 · 시작 화면)을 연결한다. **여러 번 불러도 안전하다.**
 *
 * 시작 화면은 슬롯을 고르기 전에 뜨는데, 예전에는 이 연결과 applyI18n 이 모두
 * Game.initUI() 안에 있었다. 그 함수는 슬롯을 고른 뒤에야 도는 탓에 시작 화면에서는
 *   - 사전이 한 번도 적용되지 않아 마크업의 영어 원문이 그대로 남았고,
 *   - 동의 문구(account.consent)는 마크업에 원문이 없어 **아예 비어 있었으며**,
 *   - 언어 버튼은 라벨도 빈 채로 눌러도 아무 일이 없었다.
 * 그래서 부팅 때(main.js) 한 번, Game.initUI() 에서 다시 한 번 불러도 되도록
 * 이미 연결한 버튼은 건너뛴다.
 */
export function initLangButtons() {
  ['lang-btn', 'lang-btn-start'].forEach((id) => {
    const btn = document.getElementById(id);
    if (!btn || btn.dataset.langBound) return;
    btn.dataset.langBound = '1';
    btn.addEventListener('click', () => toggleLang());
  });
}

/** 토글 버튼에 붙인다. 지금 언어의 "반대쪽"으로 넘어간다. */
export function toggleLang() {
  setLang(lang === 'en' ? 'ko' : 'en');
}
