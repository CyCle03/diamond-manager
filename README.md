# ⚾ Diamond Manager (Web Auto-Battler)

[![Play Game](https://img.shields.io/badge/Play-Diamond%20Manager-2ea44f?style=for-the-badge&logo=github)](https://cycle03.github.io/diamond-manager/)

A web-based Baseball Manager Auto-Battler game where you build your roster, manage your lineup and pitching rotation, and compete in a simulated league.

## 🎮 Features

*   **League System**: Compete in a full season against 7 AI teams with last-5 and streak indicators.
*   **Deeper Simulation**:
    *   **Player Development**: Players age each season. Their stats will progress or regress based on their age, with young players improving and older players declining.
    *   **Team Finances**: Manage a team budget. Signing players from the free agent market costs money, so spend wisely.
    *   **Expanded Player Stats**: Players have `Age` and `Defense` stats, providing more strategic depth.
*   **Team Management (Dashboard)**:
    *   **Strategic Auto-Lineup**: Automatically selects the best defensive players and orders the batting lineup based on stats (Speed #1, Power #4, etc.).
    *   **Flexible Lineup**: Drag & Drop players to any slot. Use the dropdown menu to assign any defensive position (e.g., Catcher batting cleanup).
    *   **Pitching Rotation**: Manage a 4-6 man rotation with full Drag & Drop support for reordering starters.
    *   **Roster & Market**: Sign free agents from a dynamic market to manage your 25-man squad, keeping an eye on your budget.
    *   **Position Rankings**: View your team’s league rank by position in the Dugout.
*   **Scouting & Draft**: Spend budget to scout prospects during the season, then draft players in a 5-round offseason draft.
*   **Scouting Lead Time**: Scouting reports now arrive after a short delay (a few games), not instantly.
*   **Team Stats**: Compare league-wide team rankings (AVG/OPS/ERA/WHIP, Runs, RA, RA/G, RA9) and run trends.
*   **Player Rankings**: View your team's batter/pitcher leaderboards.
*   **Bullpen Roles & Stamina**: Assign bullpen roles and manage pitcher stamina with in-game substitutions.
*   **Performance-Based Training**: Player attributes adjust based on seasonal performance plus end-of-season training.
*   **Injuries & Fatigue**: Players accumulate fatigue and can miss games when injured.
*   **Goals & Rewards**: Complete season goals for budget bonuses.
*   **Trades**: Propose player-for-player trades with AI teams (optional cash add-on).
*   **MLB-Style Rosters**: 26-man active roster with pitcher limits and position minimums.
*   **AAA System (Season 3)**: AAA roster unlocks with optional auto management and auto call-ups.
*   **Draft Need Button**: Draft by team needs and weak league position ranks.
*   **Save System**: Saves on key actions (sign/release, match results, season advance). Use the **Options** menu to switch save slots or delete data.
*   **Match Simulation**: Watch play-by-play visual simulations of your games.

## 🕹️ Controls

*   **Lineup**: Drag players from Roster to Lineup. Drag within Lineup to swap.
*   **Position Change**: Click the green dropdown (e.g., "SS") next to a player in the lineup to change their defensive role.
*   **Rotation**: Drag Pitchers from Roster/Lineup to Rotation slots. Drag within Rotation to swap order.
*   **Options**: Click the **OPTIONS** button in the header to manage save data.
*   **Scout**: Click **SCOUT** in the Roster/Market panel to find new prospects.
*   **Draft**: Use the Draft Room in the League panel to make your picks.
*   **Match Pace**:
    *   **AUTO**: Simulates automatically (choose Pitch-by-Pitch or Batter-by-Batter).
    *   **PITCH**: Step through each pitch event.
    *   **BATTER**: Step through each batter outcome.
*   **Stats**: Open **STATS** in the header to view team rankings.
*   **Pitching Change**: Use the Bullpen dropdown in Match to swap pitchers.
*   **Auto Bullpen**: Toggle **AUTO BP** to automatically swap pitchers when stamina dips.

## 🛠️ Tech Stack

*   **Core**: Vanilla JavaScript (ES6+), Modular architecture using ES6 Modules (Core, Rules)
*   **UI**: HTML5, CSS3 (Grid/Flexbox), Custom "Cyber/Sports" Theme.

## 💾 Save Data

*   Save files live in browser `localStorage` per slot.
*   Use the in-game **Options** menu to switch slots or delete saves.
*   Clearing site data in your browser will remove saves.

## 🧭 Project Structure

*   **index.html**: UI shell and layout for league/team/match views.
*   **js/main.js**: Bootstraps the game with the baseball ruleset.
*   **js/core/Game.js**: Game state, UI orchestration, season flow, and save hooks.
*   **js/core/League.js**: Schedule generation and standings tracking.
*   **js/core/Player*.js**: Player data model and roster generation.
*   **js/rules/BaseballRules.js**: Lineup validation and match simulation.

## 🔁 Game Flow

*   Pick a save slot or start a new team from the start screen.
*   Set your lineup and rotation, then start the season.
*   Enter a match to simulate play-by-play and advance the league.
*   After the season ends, draft new prospects over 5 rounds.

## 🧾 Roster Rules

*   26-man active roster.
*   Pitchers: 9-13 on active roster.
*   Minimums: C (2), 1B/2B/3B/SS (1 each), OF (4).

## 🧑‍🌾 AAA (Season 3)

*   AAA unlocks automatically in Season 3.
*   Defaults to auto management; manual control is available in **Options**.
*   Auto promotions/demotions can be toggled independently.

---

## ⚾ 다이아몬드 매니저 (웹 오토 배틀러)

라인업과 로테이션을 구성하고, 리그를 시뮬레이션하며 시즌을 운영하는 웹 야구 매니저 게임입니다.

## 🎮 주요 기능

*   **리그 시스템**: 7개의 AI 팀과 시즌을 진행하며 최근 5경기/연속 승패를 확인합니다.
*   **선수 성장**: 시즌마다 나이에 따라 능력치가 성장/하락합니다.
*   **팀 재정**: 예산으로 FA/스카우트 선수 영입을 관리합니다.
*   **스카우트 & 드래프트**: 시즌 중 스카우트, 시즌 종료 후 5라운드 드래프트 진행.
*   **스카우트 소요 시간**: 스카우트 결과는 즉시가 아니라 몇 경기 후 도착합니다.
*   **포지션 순위**: DUGOUT에서 포지션별 리그 순위를 확인할 수 있습니다.
*   **팀 스탯 순위**: AVG/OPS/ERA/WHIP, 득점/실점/RA/G/RA9 순위를 확인합니다.
*   **팀 득점/실점 추세**: 경기별 득점/실점 흐름 그래프를 확인합니다.
*   **개인 순위**: 팀 내 타자/투수 순위를 확인합니다.
*   **불펜 역할/체력**: 불펜 역할을 지정하고 투수 체력을 관리하며 교체할 수 있습니다.
*   **성적 기반 성장**: 시즌 성적과 훈련에 따라 능력치가 변화합니다.
*   **부상 & 피로**: 선수 피로 누적과 부상으로 결장이 발생합니다.
*   **목표 & 보상**: 시즌 목표 달성 시 예산 보상을 받습니다.
*   **트레이드**: AI 팀과 선수 트레이드를 제안할 수 있습니다.
*   **MLB 스타일 로스터**: 26인 액티브 로스터, 투수 제한 및 포지션 최소 인원 적용.
*   **AAA 시스템 (시즌 3)**: AAA 로스터가 열리며 자동/수동 관리 옵션 제공.
*   **DRAFT NEED 버튼**: 팀 필요와 리그 포지션 약점을 반영한 자동 픽.

## 🕹️ 조작

*   **라인업/로테이션**: 드래그 앤 드롭으로 배치/교체.
*   **스카우트**: 오른쪽 패널의 **SCOUT** 버튼으로 유망주 확보.
*   **드래프트**: League 패널의 Draft Room에서 픽 진행.
*   **경기 진행 속도**:
    *   **AUTO**: 자동 진행 (Pitch-by-Pitch / Batter-by-Batter 선택)
    *   **PITCH**: 공 하나씩 진행
    *   **BATTER**: 타자 단위로 진행
*   **STATS**: 상단 **STATS** 탭에서 팀 성적 순위 확인
*   **투수 교체**: 경기 화면의 Bullpen 선택으로 투수 교체
*   **불펜 자동 교체**: **AUTO BP** 토글로 체력 낮을 때 자동 교체

## 🚀 How to Run Locally

1.  Clone the repository:
    ```bash
    git clone https://github.com/CyCle03/diamond-manager.git
    ```
2.  Navigate to the directory:
    ```bash
    cd diamond-manager
    ```
3.  Run a local server (required for Modules/CORS):
    ```bash
    # Python 3
    python3 -m http.server 8000
    ```
4.  Open `http://localhost:8000` in your browser.

## 🚀 로컬 실행 방법

1.  저장소 클론:
    ```bash
    git clone https://github.com/CyCle03/diamond-manager.git
    ```
2.  디렉토리 이동:
    ```bash
    cd diamond-manager
    ```
3.  로컬 서버 실행 (Modules/CORS 때문에 필요):
    ```bash
    # Python 3
    python3 -m http.server 8000
    ```
4.  브라우저에서 `http://localhost:8000` 접속.

## 📸 Screenshots

*(Add screenshots here after uploading)*

## 💾 데이터/세이브

*   세이브 데이터는 브라우저 `localStorage`에 슬롯별로 저장됩니다.
*   **Options** 메뉴에서 슬롯 전환/삭제가 가능합니다.
*   브라우저 사이트 데이터를 삭제하면 세이브도 함께 삭제됩니다.

## 🧾 로스터 규정

*   26인 액티브 로스터.
*   투수 9~13명 제한.
*   최소 인원: C 2명, 1B/2B/3B/SS 각 1명, 외야수 4명.

## 🧑‍🌾 AAA (시즌 3)

*   시즌 3에 AAA가 자동 활성화됩니다.
*   기본은 자동 관리이며 **Options**에서 수동 전환 가능합니다.
*   승격/강등 자동화는 별도로 켜고 끌 수 있습니다.
