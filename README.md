# ⚾ Diamond Manager (Web Auto-Battler)

[![Play Game](https://img.shields.io/badge/Play-Diamond%20Manager-2ea44f?style=for-the-badge&logo=github)](https://cycle03.github.io/diamond-manager/)

A web-based Baseball Manager Auto-Battler game where you build your roster, manage your lineup and pitching rotation, and compete in a simulated league.

## 🎮 Features

*   **League System**: Compete in a full season against 7 AI teams.
*   **Deeper Simulation**:
    *   **Player Development**: Players age each season. Their stats will progress or regress based on their age, with young players improving and older players declining.
    *   **Team Finances**: Manage a team budget. Signing players from the free agent market costs money, so spend wisely.
    *   **Expanded Player Stats**: Players have `Age` and `Defense` stats, providing more strategic depth.
*   **Team Management (Dashboard)**:
    *   **Strategic Auto-Lineup**: Automatically selects the best defensive players and orders the batting lineup based on stats (Speed #1, Power #4, etc.).
    *   **Flexible Lineup**: Drag & Drop players to any slot. Use the dropdown menu to assign any defensive position (e.g., Catcher batting cleanup).
    *   **Pitching Rotation**: Manage a 4-6 man rotation with full Drag & Drop support for reordering starters.
    *   **Roster & Market**: Sign free agents from a dynamic market to manage your 25-man squad, keeping an eye on your budget.
*   **Scouting & Draft**: Spend budget to scout prospects during the season, then draft players in a 5-round offseason draft.
*   **Team Stats**: Compare league-wide team rankings (AVG/OPS/ERA/WHIP, Runs, RA, RA/G, RA9) and run trends.
*   **Player Rankings**: View your team's batter/pitcher leaderboards.
*   **Bullpen Roles & Stamina**: Assign bullpen roles and manage pitcher stamina with in-game substitutions.
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

---

## ⚾ 다이아몬드 매니저 (웹 오토 배틀러)

라인업과 로테이션을 구성하고, 리그를 시뮬레이션하며 시즌을 운영하는 웹 야구 매니저 게임입니다.

## 🎮 주요 기능

*   **리그 시스템**: 7개의 AI 팀과 시즌을 진행합니다.
*   **선수 성장**: 시즌마다 나이에 따라 능력치가 성장/하락합니다.
*   **팀 재정**: 예산으로 FA/스카우트 선수 영입을 관리합니다.
*   **스카우트 & 드래프트**: 시즌 중 스카우트, 시즌 종료 후 5라운드 드래프트 진행.
*   **팀 스탯 순위**: AVG/OPS/ERA/WHIP, 득점/실점/RA/G/RA9 순위를 확인합니다.
*   **팀 득점/실점 추세**: 경기별 득점/실점 흐름 그래프를 확인합니다.
*   **개인 순위**: 팀 내 타자/투수 순위를 확인합니다.
*   **불펜 역할/체력**: 불펜 역할을 지정하고 투수 체력을 관리하며 교체할 수 있습니다.

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

## 📸 Screenshots

*(Add screenshots here after uploading)*
