[한국어](README.md) | **English**

# ⚾ Diamond Manager (Web Baseball Manager)

[![Play Game](https://img.shields.io/badge/Play-Diamond%20Manager-2ea44f?style=for-the-badge&logo=github)](https://bm.elcherlab.com/)

A web-based Baseball Manager game where you build your roster, manage your lineup and pitching rotation, and compete in a simulated league.

Screen language is available in **English and Korean**. Switch it with the language button in the
header (or on the start screen); your choice is remembered in this browser. You can also open the
game with `?lang=en` / `?lang=ko`.

## 🚀 How to Run Locally

You can use any static file server. Choose one:

1.  Clone the repository:
    ```bash
    git clone https://github.com/CyCle03/diamond-manager.git
    ```
2.  Navigate to the directory:
    ```bash
    cd diamond-manager
    ```
3.  Start a local server (Modules/CORS requires a server):
    ```bash
    # Python 3
    python3 -m http.server 8000
    ```
    ```bash
    # Node.js (no install)
    npx serve .
    ```
    ```bash
    # PHP
    php -S localhost:8000
    ```
4.  Open `http://localhost:8000` in your browser.

## 🎮 Features

*   **League System**: Compete in a full season against 7 AI teams with last-5 and streak indicators.
*   **Deeper Simulation**:
    *   **Player Development**: Players age each season. Their stats will progress or regress based on their age, with young players improving and older players declining.
    *   **Team Finances**: Manage a team budget. Signing players from the free agent market costs money, so spend wisely.
    *   **Expanded Player Stats**: Players have `Age` and `Defense` stats, providing more strategic depth.
*   **Team Management (Dashboard)**:
    *   **Strategic Auto-Lineup**: Automatically selects the best defensive players and orders the batting lineup based on stats (Speed #1, Power #4, etc.).
    *   **Flexible Lineup**: Drag-and-drop players to any slot. Use the dropdown menu to assign any defensive position (e.g., Catcher batting cleanup).
    *   **Pitching Rotation**: Manage a 4-6 man rotation with full drag-and-drop support for reordering starters.
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
*   **Trade Deadline**: Trades are disabled after the mid-season deadline.
*   **Postseason**: Top 4 teams advance to a bracket-style postseason.
*   **Injured List (IL)**: Move injured players to IL and activate them when healthy.
*   **40-Man Roster**: Organization roster cap shared across Active/AAA/IL (10-day).
*   **Options & Waivers**: Demotions use options; no options triggers waivers.
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
*   **Injured List**: Use the **IL** tab to stash injured players and activate them after recovery.
*   **Scout**: Click **SCOUT** in the Roster/Market panel to find new prospects.
*   **Draft**: Use the Draft Room in the League panel to make your picks.
*   **Match Pace**:
    *   **AUTO**: Simulates automatically (choose Pitch-by-Pitch or Batter-by-Batter).
    *   **PITCH**: Step through each pitch event.
    *   **BATTER**: Step through each batter outcome.
*   **Next Game**: Click **NEXT GAME** in Match to start the next scheduled game immediately.
*   **Stats**: Open **STATS** in the header to view team rankings.
*   **Pitching Change**: Use the Bullpen dropdown in Match to swap pitchers.
*   **Auto Bullpen**: Toggle **AUTO BP** to automatically swap pitchers when stamina dips.
*   **Match Log**: Toggle **Auto clear match log after game** in **Options** to reset the log at game end.
*   **Language**: Use the language button in the header to switch between English and Korean.

## 🛠️ Tech Stack

*   **Core**: Vanilla JavaScript (ES6+), Modular architecture using ES6 Modules (Core, Rules)
*   **UI**: HTML5, CSS3 (Grid/Flexbox), Custom "Cyber/Sports" Theme.

## 💾 Save Data

*   Save files live in browser `localStorage` per slot.
*   Use the in-game **Options** menu to switch slots or delete saves.
*   Clearing site data in your browser will remove saves.
*   Signing in with an elcherlab account also uploads the same saves to the server, so you can continue on another device.

## 🧭 Project Structure

*   **index.html**: UI shell and layout for league/team/match views.
*   **js/main.js**: Bootstraps the game with the baseball ruleset.
*   **js/core/Game.js**: Game state, UI orchestration, season flow, and save hooks.
*   **js/core/GameRules.js**: The interface a ruleset must satisfy (swap the sport, keep the core).
*   **js/core/League.js**: Schedule generation and standings tracking.
*   **js/core/Player*.js**: Player data model and roster generation.
*   **js/core/SaveManager.js**: Reads and writes per-slot saves.
*   **js/core/cloud.js**: elcherlab single sign-on + save sync to the server.
*   **js/core/i18n.js**: English/Korean dictionary and language switching (English is the source).
*   **js/core/debug.js**: Console helpers for development.
*   **js/rules/BaseballRules.js**: Lineup validation and match simulation.
*   **server/**: Save-sync backend (Express, session cookie verification).
*   **scripts/deploy.sh**: Refreshes the web root and restarts the backend (run by the runner).
*   **docs/**: The MLB rules porting plan and a manual smoke-test checklist.

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

