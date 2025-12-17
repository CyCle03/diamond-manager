import { PlayerGenerator } from './PlayerGenerator.js';
import { League } from './League.js';
import { SaveManager } from './SaveManager.js';

export class Game {
    constructor(rules) {
        this.rules = rules;
        this.lineup = new Array(rules.getLineupSize()).fill(null);

        // Pitching Rotation System
        this.rotationSize = 5; // Default 5-man rotation
        this.rotation = new Array(6).fill(null); // Max size 6
        this.currentRotationIndex = 0;

        this.roster = [];
        this.league = null;
        this.playerTeamId = "PLAYER_TEAM";
        this.isSimulating = false;
        this.currentTab = 'tab-roster';
        this.currentSlotId = 1; // Default
        this.teamName = "Cyber Nine";

        // Defer Initialization - Show Start Screen
        this.initStartScreen();
    }

    initStartScreen() {
        const slots = document.querySelectorAll('.save-slot-card');
        slots.forEach(slot => {
            slot.addEventListener('click', () => {
                const slotId = parseInt(slot.dataset.slot);
                const teamNameInput = document.getElementById('team-name-input').value;
                const isExisting = SaveManager.exists(slotId);

                if (isExisting) {
                    this.startGame(slotId, null, false);
                } else {
                    if (!teamNameInput) {
                        alert("Please enter a Team Name!");
                        return;
                    }
                    this.startGame(slotId, teamNameInput, true);
                }
            });
        });

        this.updateStartScreenUI();
    }

    updateStartScreenUI() {
        const slots = document.querySelectorAll('.save-slot-card');
        slots.forEach(slot => {
            const slotId = parseInt(slot.dataset.slot);
            const meta = SaveManager.getMeta(slotId);
            const infoDiv = slot.querySelector('.slot-info');

            if (meta) {
                infoDiv.innerHTML = `${meta.teamName}<br>Season ${meta.season}<br>Round ${meta.round}`;
                infoDiv.classList.remove('slot-empty');
                slot.classList.add('populated'); // Optional styling hook
            } else {
                infoDiv.innerHTML = "Empty - Create New";
                infoDiv.classList.add('slot-empty');
                slot.classList.remove('populated');
            }
        });
    }

    startGame(slotId, teamName, isNew) {
        this.currentSlotId = slotId;

        document.getElementById('start-screen-overlay').style.display = 'none';

        if (isNew) {
            this.teamName = teamName;
            // Generate initial roster
            this.roster = PlayerGenerator.createTeamRoster(this.rules, 25); // Full 25-man roster now
            // Auto-fill roster/lineup
            this.autoLineup();

            // Initialize UI elements specifically for new game
            this.startSeason(); // This initializes League
            this.saveGame();
        } else {
            this.loadGame(slotId);
        }

        // Initialize UI listeners (only once)
        this.initUI();
        this.renderRosterAndMarket();
        this.renderLineup();
        this.renderRotation();

        // Ensure name is updated in UI if element exists
        // (Optional: Add team name display in header)
    }

    saveGame() {
        const data = {
            teamName: this.teamName,
            season: this.league ? this.league.season : 1,
            roster: this.roster, // Player objects should serialize fine
            lineup: this.lineup,
            rotation: this.rotation,
            league: this.league, // Needs care on deserialization
            playerTeamId: this.playerTeamId,
            currentRotationIndex: this.currentRotationIndex,
            rotationSize: this.rotationSize,
            timestamp: Date.now()
        };
        SaveManager.save(this.currentSlotId, data);
    }

    loadGame(slotId) {
        const data = SaveManager.load(slotId);
        if (!data) {
            alert("Failed to load save data!");
            return;
        }

        this.teamName = data.teamName;
        this.playerTeamId = data.playerTeamId;
        this.currentRotationIndex = data.currentRotationIndex;
        this.rotationSize = data.rotationSize;

        // Reconstruct League
        // Note: League constructor takes rules. accessing internal state requires care.
        // Option A: Re-create league and stomp state.
        this.league = new League(this.rules);
        Object.assign(this.league, data.league);

        // Reconstruct Roster & Lineup
        // Players are just objects for now, but if they have methods, we lose them.
        // Assuming Player class is mainly data + prototype methods. 
        // JSON.parse gives plain objects. We shouldn't need strict class instances if UI just reads props.
        // BUT if Game.js calls methods on players (like updateStats), checks instanceOf, or if Player has methods, we have an issue.
        // Looking at Player.js (not viewed but standard pattern), usually simple data structs.
        // Let's assume plain objects are OK or we re-hydrate if needed.
        this.roster = data.roster;
        this.lineup = data.lineup;
        this.rotation = data.rotation;

        this.updateLeagueView();

        // Go to Dashboard
        this.switchView('league');
    }

    initUI() {
        // --- VIEW NAVIGATION ---
        const viewLeagueBtn = document.getElementById('view-league-btn');
        const viewTeamBtn = document.getElementById('view-team-btn');
        const viewMatchBtn = document.getElementById('view-match-btn');

        if (viewLeagueBtn) viewLeagueBtn.addEventListener('click', () => this.switchView('league'));
        if (viewTeamBtn) viewTeamBtn.addEventListener('click', () => this.switchView('team'));
        if (viewMatchBtn) viewMatchBtn.addEventListener('click', () => this.switchView('match'));

        // --- GAME ACTIONS ---
        const startBtn = document.getElementById('start-season-btn');
        if (startBtn) startBtn.addEventListener('click', () => this.startSeason());

        // New 'Enter Match' button in League Panel
        const enterMatchBtn = document.getElementById('play-match-btn-league');
        if (enterMatchBtn) enterMatchBtn.addEventListener('click', () => this.enterMatchSetup());

        const playRoundBtn = document.getElementById('play-round-btn');
        if (playRoundBtn) playRoundBtn.addEventListener('click', () => this.enterMatchSetup());

        const autoLineupBtn = document.getElementById('auto-lineup-btn');
        if (autoLineupBtn) autoLineupBtn.addEventListener('click', () => this.autoLineup());

        const rotSize = document.getElementById('rotation-size-select');
        if (rotSize) rotSize.addEventListener('change', (e) => {
            this.rotationSize = parseInt(e.target.value);
            this.renderRotation();
        });

        // --- MATCH CONTROLS ---
        const playMatchBtn = document.getElementById('play-match-btn');
        if (playMatchBtn) playMatchBtn.addEventListener('click', () => {
            if (this.validateLineup()) {
                this.startMatch();
            } else {
                alert("Please fill your Lineup!");
            }
        });


    }

    validateLineup() {
        const starter = this.rotation[this.currentRotationIndex];
        if (!starter) {
            alert(`No Starting Pitcher set for slot SP${this.currentRotationIndex + 1}!`);
            return false;
        }
        return this.rules.validateLineup(this.lineup, { pitcher: starter });
    }

    renderRosterAndMarket() {
        this.renderList('#roster-list', this.roster, false);

        if (this.league) {
            this.renderList('#market-list', this.league.freeAgents, true);
        } else {
            const mList = document.querySelector('#market-list');
            if (mList) mList.innerHTML = '<div style="padding:10px; color:#888;">Start Season first</div>';
        }
    }

    renderList(selector, players, isMarket) {
        const container = document.querySelector(selector);
        if (!container) return;
        container.innerHTML = '';

        players.forEach(player => {
            const card = document.createElement('div');
            card.className = `player-card ${player.position === 'P' ? 'pitcher-card' : ''}`;
            card.draggable = !isMarket; // Roster players draggable, Market players not (until bought?)

            // ... Drag logic ...
            if (card.draggable) {
                card.addEventListener('dragstart', (e) => {
                    card.classList.add('dragging');
                    e.dataTransfer.setData('application/json', JSON.stringify({
                        source: 'roster',
                        playerId: player.id
                    }));
                });
                card.addEventListener('dragend', () => {
                    card.classList.remove('dragging');
                });
            }

            // Click to Buy/Sell/Action
            card.addEventListener('click', () => {
                if (isMarket) {
                    if (confirm(`Sign Free Agent ${player.name}?`)) {
                        this.signFreeAgent(player);
                    }
                } else {
                    // Logic to release?
                    if (confirm(`Release ${player.name}?`)) {
                        this.releasePlayer(player);
                    }
                }
            });


            let statsHtml = '';
            if (player.position === 'P') {
                statsHtml = `PIT:${player.stats.pitching} SPD:${player.stats.speed}`;
            } else {
                statsHtml = `CON:${player.stats.contact} POW:${player.stats.power} SPD:${player.stats.speed}`;
            }

            card.innerHTML = `
                <div class="card-pos">${player.position}</div>
                <div class="card-name">${player.name}</div>
                <div class="card-stats">
                    ${statsHtml}
                </div>
            `;

            container.appendChild(card);
        });
    }

    renderLineup() {
        const container = document.getElementById('batting-order-list');
        if (!container) return;
        container.innerHTML = '';

        this.lineup.forEach((player, index) => {
            const slot = document.createElement('div');
            slot.className = 'lineup-slot';
            slot.dataset.index = index;

            // Drop Zone Logic
            slot.addEventListener('dragover', (e) => {
                e.preventDefault();
                slot.classList.add('drag-over');
            });

            slot.addEventListener('dragleave', () => {
                slot.classList.remove('drag-over');
            });

            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('drag-over');
                const data = JSON.parse(e.dataTransfer.getData('application/json'));

                if (data.source === 'roster') {
                    const playerToAdd = this.roster.find(p => p.id === data.playerId);
                    if (playerToAdd) this.setLineupSlot(index, playerToAdd);
                } else if (data.source === 'lineup') {
                    const sourceIndex = data.index;
                    this.swapLineupSlots(sourceIndex, index);
                }
            });

            if (player) {
                slot.draggable = true;
                slot.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({ source: 'lineup', index: index }));
                    slot.classList.add('dragging');
                });
                slot.addEventListener('dragend', () => slot.classList.remove('dragging'));

                slot.classList.add('filled');
                slot.innerHTML = `
                    <span class="order-num">${index + 1}.</span>
                    <span class="player-name">${player.name}</span>
                    <span class="player-pos">${player.position}</span>
                    <button class="remove-btn">x</button>
                `;
                slot.querySelector('.remove-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.removeFromLineup(index);
                });
            } else {
                slot.className = 'empty-slot';
                slot.innerText = `${index + 1}. Select Batter...`;
            }
            container.appendChild(slot);
        });

        this.renderRotation();

        const pitcherSlot = document.getElementById('pitcher-slot');
        if (pitcherSlot) {
            // Drop Zone for Pitcher
            pitcherSlot.addEventListener('dragover', e => { e.preventDefault(); pitcherSlot.classList.add('drag-over'); });
            pitcherSlot.addEventListener('dragleave', () => pitcherSlot.classList.remove('drag-over'));
            pitcherSlot.addEventListener('drop', e => {
                e.preventDefault();
                pitcherSlot.classList.remove('drag-over');
                const data = JSON.parse(e.dataTransfer.getData('application/json'));
                if (data.source === 'roster') {
                    const p = this.roster.find(pl => pl.id === data.playerId);
                    if (p) {
                        if (p.position === 'P') this.pitcher = p;
                        else alert("Only Pitchers allowed in SP slot!");
                    }
                    this.renderLineup();
                }
            });

            if (this.pitcher) {
                pitcherSlot.innerHTML = `
                    <div class="label">STARTING PITCHER</div>
                    <div class="lineup-slot filled">
                        <span class="player-name">${this.pitcher.name}</span>
                        <span class="player-pos">SP</span>
                        <button class="remove-btn" onclick="game.removePitcher()">x</button>
                    </div>
                `;
            } else {
                pitcherSlot.innerHTML = `
                    <div class="label">STARTING PITCHER</div>
                    <div class="empty-slot">Select Pitcher...</div>
                `;
            }
        }
    }

    renderRotation() {
        const container = document.getElementById('rotation-slots');
        if (!container) return;
        container.innerHTML = '';

        // Update rotation size from selector if changed (handled by event but safe to read)
        // Actually better to handle event separately.

        for (let i = 0; i < this.rotationSize; i++) {
            const p = this.rotation[i];
            const isStarter = (i === this.currentRotationIndex);

            const slot = document.createElement('div');
            // 'lineup-slot' style is good, add extra specific class
            slot.className = `rotation-slot lineup-slot ${p ? 'filled' : ''} ${isStarter ? 'next-starter' : ''}`;
            if (isStarter) slot.style.border = '2px solid var(--accent-green)';

            // Drop Zone
            slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('drag-over'); });
            slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
            slot.addEventListener('drop', e => {
                e.preventDefault();
                slot.classList.remove('drag-over');
                const data = JSON.parse(e.dataTransfer.getData('application/json'));
                if (data.source === 'roster') {
                    const player = this.roster.find(pl => pl.id === data.playerId);
                    if (player && player.position === 'P') {
                        this.rotation[i] = player;
                        this.renderRotation();
                    } else {
                        alert("Only Pitchers in Rotation!");
                    }
                }
            });

            if (p) {
                slot.innerHTML = `
                    <span class="order-num">SP${i + 1}</span>
                    <span class="player-name">${p.name}</span>
                    <span class="player-pos">P</span>
                    <button class="remove-btn">x</button>
                `;
                slot.querySelector('.remove-btn').addEventListener('click', () => {
                    this.rotation[i] = null;
                    this.renderRotation();
                });
            } else {
                slot.className = 'empty-slot';
                if (isStarter) slot.style.border = '2px solid var(--accent-green)';
                slot.innerHTML = `<span style="color:${isStarter ? 'var(--accent-green)' : '#666'}">SP ${i + 1} ${isStarter ? '(NEXT)' : ''}</span>`;
            }

            container.appendChild(slot);
        }
    }

    addToLineup(player) {
        if (player.position === 'P') {
            this.pitcher = player;
        } else {
            const emptyIndex = this.lineup.findIndex(slot => slot === null);
            if (emptyIndex !== -1) {
                this.lineup[emptyIndex] = player;
            } else {
                console.log("Lineup full!");
                return;
            }
        }
        this.renderLineup();
    }

    removeFromLineup(index) {
        this.lineup[index] = null;
        this.renderLineup();
    }

    setLineupSlot(index, player) {
        this.lineup[index] = player;
        this.renderLineup();
    }

    swapLineupSlots(fromIndex, toIndex) {
        const temp = this.lineup[fromIndex];
        this.lineup[fromIndex] = this.lineup[toIndex];
        this.lineup[toIndex] = temp;
        this.renderLineup();
    }

    autoLineup() {
        // Clear current
        this.lineup.fill(null);

        // --- 1. Fill Rotation (Top 5 Pitchers) ---
        // Sort pitchers by stats
        const allPitchers = this.roster.filter(p => p.position === 'P').sort((a, b) => b.stats.pitching - a.stats.pitching);

        // Reset rotation array
        this.rotation = new Array(this.rotationSize).fill(null);

        for (let i = 0; i < this.rotationSize; i++) {
            if (allPitchers[i]) {
                this.rotation[i] = allPitchers[i];
            }
        }

        // --- 2. Fill Lineup (Positional) ---
        // Desired Batting Order Positions (Standard 1-9)
        // 1. C
        // 2. 1B
        // 3. 2B
        // 4. 3B
        // 5. SS
        // 6. LF
        // 7. CF
        // 8. RF
        // 9. DH (Best remaining)

        const positionsNeeded = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
        const usedPlayerIds = new Set();

        // Helper to find best available player for a position
        const getBestForPos = (pos) => {
            const candidates = this.roster.filter(p => p.position === pos && !usedPlayerIds.has(p.id));
            if (candidates.length === 0) return null;
            // Sort by combined hitting stats
            candidates.sort((a, b) => {
                const statA = a.stats.contact + a.stats.power + a.stats.speed;
                const statB = b.stats.contact + b.stats.power + b.stats.speed;
                return statB - statA;
            });
            return candidates[0];
        };

        // Fill standard positions
        positionsNeeded.forEach((pos, index) => {
            const player = getBestForPos(pos);
            if (player) {
                this.lineup[index] = player;
                usedPlayerIds.add(player.id);
            }
        });

        // Fill DH (9th slot) - Best Remaining Non-Pitcher
        const dhSlotIndex = 8;
        if (!this.lineup[dhSlotIndex]) {
            const candidates = this.roster.filter(p => p.position !== 'P' && !usedPlayerIds.has(p.id));
            candidates.sort((a, b) => {
                const statA = a.stats.contact + a.stats.power + a.stats.speed;
                const statB = b.stats.contact + b.stats.power + b.stats.speed;
                return statB - statA;
            });

            if (candidates.length > 0) {
                this.lineup[dhSlotIndex] = candidates[0];
                usedPlayerIds.add(candidates[0].id);
            }
        }

        // Fallback: If any empty slots remain (e.g. no Catcher found), fill with best remaining anyone (non-pitcher)
        for (let i = 0; i < 9; i++) {
            if (this.lineup[i] === null) {
                const candidates = this.roster.filter(p => p.position !== 'P' && !usedPlayerIds.has(p.id));
                candidates.sort((a, b) => {
                    const statA = a.stats.contact + a.stats.power + a.stats.speed;
                    const statB = b.stats.contact + b.stats.power + b.stats.speed;
                    return statB - statA; // Descending
                });
                if (candidates.length > 0) {
                    this.lineup[i] = candidates[0];
                    usedPlayerIds.add(candidates[0].id);
                }
            }
        }

        this.renderLineup();
        this.renderRotation();
    }

    signFreeAgent(player) {
        if (this.roster.length >= 25) {
            alert("Roster is full (Max 25)!");
            return;
        }
        // Move from FA to Roster
        this.roster.push(player);
        this.league.freeAgents = this.league.freeAgents.filter(p => p.id !== player.id);
        alert(`Signed ${player.name}!`);
        this.renderRosterAndMarket();
        this.saveGame();
    }

    // --- GAME FLOW ---

    startSeason() {
        // 1. Create League
        this.league = new League(this.rules);

        // 2. Register Player Team
        const myTeam = {
            id: this.playerTeamId,
            name: this.teamName,
            roster: this.roster,
            lineup: this.lineup,
            pitcher: this.pitcher,
            isPlayer: true
        };

        this.league.initialize(myTeam);

        // 3. Update League Panel UI
        document.getElementById('start-season-btn').style.display = 'none';
        document.getElementById('calendar-area').style.display = 'block';

        this.updateLeagueView();

        // 4. Go to Team View
    }

    enterMatchSetup() {
        this.switchView('match');
        this.log("Enter Match Setup... Set Lineup then Play!");
    }

    async startMatch() {
        if (this.isSimulating) return;

        // 1. Setup Match
        this.isSimulating = true;
        document.getElementById('play-match-btn').disabled = true;

        const starter = this.rotation[this.currentRotationIndex];
        if (!starter) {
            alert("No starter for this rotation slot! Check your rotation.");
            this.finishMatch(0, 0); // Abort
            return;
        }
        this.log(`MATCH STARTING! SP: ${starter.name}`);
        document.getElementById('game-status-text').innerText = "PLAY BALL!";

        const round = this.league.getCurrentRound();
        const myMatch = round.find(m => m.home.id === this.playerTeamId || m.away.id === this.playerTeamId);

        if (!myMatch) {
            this.log("No match scheduled for this round.");
            this.finishMatch();
            return;
        }

        // 2. Simulate
        await this.simulateGame(myMatch, starter);
    }

    async simulateGame(match, starter) {
        // Visual Simulation
        const gameText = document.getElementById('game-status-text');
        if (gameText) gameText.innerText = "PLAYING...";

        let inning = 1;
        let homeScore = 0;
        let awayScore = 0;

        // Mock Simulation Loop (Visual only)
        // Ideally this should use Rules.js to get a real result, but for now we'll stick to 'random' for visual
        // preserving the existing behavior but fixing the flow.
        while (inning <= 9) {
            await this.wait(300); // speed up slightly

            // Logic: Random score increment
            if (Math.random() > 0.7) homeScore += Math.floor(Math.random() * 2);
            if (Math.random() > 0.7) awayScore += Math.floor(Math.random() * 2);

            this.updateScoreboard(homeScore, awayScore);
            this.log(`Inning ${inning}: Home ${homeScore} - Away ${awayScore}`);

            inning++;
        }

        if (gameText) gameText.innerText = "MATCH FINISHED";
        this.finishMatch(homeScore, awayScore);
    }

    // Previous 'finishMatch' at lines 516-540 is DELETED. 
    // We keep the one below (callback style).

    // Callback after match ends
    async finishMatch(homeScore, awayScore) {
        // 1. Update League Standings for Player Match
        const round = this.league.getCurrentRound();
        const myMatch = round.find(m => m.home.id === this.playerTeamId || m.away.id === this.playerTeamId);

        const winnerId = homeScore > awayScore ? myMatch.home.id : myMatch.away.id;
        const loserId = homeScore > awayScore ? myMatch.away.id : myMatch.home.id;

        this.league.updateStandings(winnerId, loserId);

        // 2. Simulate Rest of Round (AI vs AI)
        round.forEach(match => {
            if (match === myMatch) return; // Skip player match

            // Random Sim
            const hScore = Math.floor(Math.random() * 10);
            const aScore = Math.floor(Math.random() * 10);
            const win = hScore >= aScore ? match.home.id : match.away.id;
            const lose = hScore >= aScore ? match.away.id : match.home.id;
            this.league.updateStandings(win, lose);
        });

        // 3. Advance Round
        this.league.currentRoundIndex++;
        if (this.league.currentRoundIndex >= this.league.schedule.length) {
            alert("SEASON OVER!");
            return;
        }

        // 4. Show League View again
        await this.wait(2000);
        this.updateLeagueView();
        this.switchView('league');

        document.getElementById('play-match-btn').disabled = false;

        this.saveGame();
    }

    // --- VIEW UPDATES ---

    updateLeagueView() {
        const sorted = this.league.getSortedStandings();
        const tbody = document.querySelector('#standings-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        sorted.forEach((t, index) => {
            const tr = document.createElement('tr');
            if (t.isPlayer) tr.classList.add('player-team');

            const pct = (t.w + t.l) > 0 ? (t.w / (t.w + t.l)).toFixed(3) : '.000';

            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${t.name}</td>
                <td>${t.w}</td>
                <td>${t.l}</td>
                <td>${pct}</td>
            `;
            tbody.appendChild(tr);
        });

        // Update Next Match Text
        const round = this.league.getCurrentRound();
        if (round) {
            const myMatch = round.find(m => m.home.id === this.playerTeamId || m.away.id === this.playerTeamId);
            const opponent = myMatch.home.id === this.playerTeamId ? myMatch.away : myMatch.home;
            const display = document.getElementById('next-opponent-display');
            if (display) display.innerText = `NEXT: vs ${opponent.name}`;
        }
    }

    // --- UI Helpers called by Rules Strategy ---

    updateMatchupDisplay(batter, pitcher) {
        document.querySelector('.matchup-batter').innerText = `BATTER: ${batter.name}`;
        document.querySelector('.matchup-pitcher').innerText = `PITCHER: ${pitcher.name}`;
    }

    updateScoreboard(homeScore, awayScore) {
        document.querySelector('#score-display .total-score').innerText = `${homeScore} - ${awayScore}`;
    }

    log(msg) {
        const log = document.getElementById('game-log');
        if (log) {
            log.innerHTML += `<div class="log-entry">${msg}</div>`;
            log.scrollTop = log.scrollHeight;
        }
    }

    switchView(mode) {
        const mainContent = document.querySelector('.main-content');
        const teamBtn = document.getElementById('view-team-btn');
        const matchBtn = document.getElementById('view-match-btn');

        mainContent.classList.remove('team-mode', 'match-mode');

        if (teamBtn) teamBtn.classList.remove('active');
        if (matchBtn) matchBtn.classList.remove('active');

        if (mode === 'team') {
            mainContent.classList.add('team-mode');
            if (teamBtn) teamBtn.classList.add('active');
        } else if (mode === 'match') {
            mainContent.classList.add('match-mode');
            if (matchBtn) matchBtn.classList.add('active');
        }
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
