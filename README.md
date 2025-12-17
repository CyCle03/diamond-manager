# ⚾ Diamond Manager (Web Auto-Battler)

[![Play Game](https://img.shields.io/badge/Play-Diamond%20Manager-2ea44f?style=for-the-badge&logo=github)](https://cycle03.github.io/diamond-manager/)

A web-based Baseball Manager Auto-Battler game where you build your roster, manage your lineup and pitching rotation, and compete in a simulated league.

## 🎮 Features

*   **League System**: Compete in a full season against 7 AI teams.
*   **Team Management (Dashboard)**:
    *   **Strategic Auto-Lineup**: Automatically selects the best defensive players and orders the batting lineup based on stats (Speed #1, Power #4, etc.).
    *   **Flexible Lineup**: Drag & Drop players to any slot. Use the dropdown menu to assign any defensive position (e.g., Catcher batting cleanup).
    *   **Pitching Rotation**: Manage a 4-6 man rotation with full Drag & Drop support for reordering starters.
    *   **Roster & Market**: Sign free agents and manage your 25-man squad.
*   **Save System**: Auto-saves your progress. Use the **Options** menu to switch save slots or delete data.
*   **Match Simulation**: Watch play-by-play visual simulations of your games.

## 🕹️ Controls

*   **Lineup**: Drag players from Roster to Lineup. Drag within Lineup to swap.
*   **Position Change**: Click the green dropdown (e.g., "SS") next to a player in the lineup to change their defensive role.
*   **Rotation**: Drag Pitchers from Roster/Lineup to Rotation slots. Drag within Rotation to swap order.
*   **Options**: Click the **OPTIONS** button in the header to manage save data.

## 🛠️ Tech Stack

*   **Core**: Vanilla JavaScript (ES6+)
*   **UI**: HTML5, CSS3 (Grid/Flexbox), Custom "Cyber/Sports" Theme.

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
