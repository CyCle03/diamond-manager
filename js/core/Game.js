import { PlayerGenerator } from './PlayerGenerator.js';
import { League } from './League.js';

export class Game {
    constructor(rules) {
        this.rules = rules;
        this.lineup = new Array(rules.getLineupSize()).fill(null);
        this.pitcher = null;
        this.roster = [];
        this.league = null;
        this.playerTeamId = "PLAYER_TEAM";
        this.isSimulating = false;
        this.currentTab = 'tab-roster';

        // Generate initial roster (Demo roster before season starts)
        this.roster = PlayerGenerator.createTeamRoster(rules, 15);

        this.initUI();
        this.renderCardList('tab-roster');
        this.renderLineup();
    }

    initUI() {
        // --- VIEW NAVIGATION ---
        const viewTeamBtn = document.getElementById('view-team-btn');
        const viewMatchBtn = document.getElementById('view-match-btn');

        if (viewTeamBtn) viewTeamBtn.addEventListener('click', () => this.switchView('team'));
        if (viewMatchBtn) viewMatchBtn.addEventListener('click', () => this.switchView('match'));

        // --- GAME ACTIONS ---
        const startBtn = document.getElementById('start-season-btn');
        if (startBtn) startBtn.addEventListener('click', () => this.startSeason());

        const playRoundBtn = document.getElementById('play-round-btn');
        if (playRoundBtn) playRoundBtn.addEventListener('click', () => this.enterMatchSetup());

        const autoLineupBtn = document.getElementById('auto-lineup-btn');
        if (autoLineupBtn) autoLineupBtn.addEventListener('click', () => this.autoLineup());

        // --- MATCH CONTROLS ---
        const playMatchBtn = document.getElementById('play-match-btn');
        if (playMatchBtn) playMatchBtn.addEventListener('click', () => {
            if (this.validateLineup()) {
                this.startMatch();
            } else {
                alert("Please fill your Lineup!");
            }
        });

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');

                // Switch Data View
                this.renderCardList(e.target.id);
            });
        });
    }

    validateLineup() {
        return this.rules.validateLineup(this.lineup, { pitcher: this.pitcher });
    }

    renderCardList(tabId) {
        this.currentTab = tabId;
        const container = document.getElementById('card-list-container');
        if (!container) return;
        container.innerHTML = '';

        let players = [];
        let isMarket = false;

        if (tabId === 'tab-roster') {
            players = this.roster;
        } else if (tabId === 'tab-market') {
            if (this.league) {
                players = this.league.freeAgents;
                isMarket = true;
            } else {
                container.innerHTML = '<div style="padding:10px; color:#888;">Start Season to view Market</div>';
                return;
            }
        }

        players.forEach(player => {
            const card = document.createElement('div');
            card.className = `player-card ${player.position === 'P' ? 'pitcher-card' : ''}`;
            card.draggable = !isMarket;

            const actionBtn = isMarket
                ? `<button class="sign-btn" style="background:var(--accent-green); border:none; color:white; padding:2px 5px; cursor:pointer;">SIGN</button>`
                : '';

            card.innerHTML = `
                <div class="card-pos">${player.position}</div>
                <div class="card-name">${player.name}</div>
                <div class="card-stats">
                   ${Object.keys(player.stats).slice(0, 2).map(k => `${k.toUpperCase().substr(0, 3)}:${Math.floor(player.stats[k])}`).join(' ')}
                </div>
                ${actionBtn}
            `;

            if (!isMarket) {
                card.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({ source: 'roster', playerId: player.id }));
                    card.classList.add('dragging');
                });
                card.addEventListener('dragend', () => card.classList.remove('dragging'));
                card.addEventListener('click', () => this.addToLineup(player));
            } else {
                // Sign Event
                const btn = card.querySelector('.sign-btn');
                if (btn) {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        this.signFreeAgent(player);
                    });
                }
            }

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

                // Keep minimal drag capability if needed for empty slots as targets?
                // renderLineup adds listeners to 'slot' variable which is the div.
                // listeners are added before this if/else block in previous code, let's verify.
                // No, listeners added to `slot` object which is created before.
                // So removing 'lineup-slot' class just changes visual.
            }
            container.appendChild(slot);
        });

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

    removePitcher() {
        this.pitcher = null;
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
        this.pitcher = null;

        // 1. Pick Best Pitcher
        // Sort by pitching stat descending
        const pitchers = this.roster.filter(p => p.position === 'P').sort((a, b) => b.stats.pitching - a.stats.pitching);
        if (pitchers.length > 0) {
            this.pitcher = pitchers[0];
        }

        // 2. Pick Best Hitters for remaining slots (simple logic: best combined stats)
        // Exclude the chosen pitcher if they are in the pitcher list (though DH rule might vary, let's exclude pitcher from batting for now or allow if 2-way)
        // Simple: just pick top 9 non-pitchers or remaining players
        const hitters = this.roster.filter(p => p !== this.pitcher).sort((a, b) => {
            const statA = a.stats.contact + a.stats.power + a.stats.speed;
            const statB = b.stats.contact + b.stats.power + b.stats.speed;
            return statB - statA;
        });

        for (let i = 0; i < 9; i++) {
            if (hitters[i]) {
                this.lineup[i] = hitters[i];
            }
        }

        this.renderLineup();
    }

    signFreeAgent(player) {
        if (this.roster.length >= 25) {
            alert("Roster is full (Max 25)!");
            return;
        }
        // Move from FA to Roster
        const faIndex = this.league.freeAgents.indexOf(player);
        if (faIndex > -1) this.league.freeAgents.splice(faIndex, 1);

        this.roster.push(player);
        this.renderCardList('tab-market');
        alert(`Signed ${player.name}!`);
    }

    // --- GAME FLOW ---

    startSeason() {
        // 1. Create League
        this.league = new League(this.rules);

        // 2. Register Player Team
        const myTeam = {
            id: this.playerTeamId,
            name: "My Team",
            roster: this.roster,
            lineup: this.lineup,
            pitcher: this.pitcher,
            isPlayer: true
        };

        this.league.initialize(myTeam);

        // 3. Hide Menu, Show League View
        document.getElementById('main-menu').classList.remove('active');
        this.updateLeagueView();
        document.getElementById('league-view').classList.add('active');

        // Default to Team View for management
        this.switchView('team');

        this.renderCardList('tab-roster');
        this.renderLineup();
    }

    enterMatchSetup() {
        document.getElementById('league-view').classList.remove('active');

        const round = this.league.getCurrentRound();
        const myMatch = round.find(m => m.home.id === this.playerTeamId || m.away.id === this.playerTeamId);

        if (!myMatch) {
            console.error("No match found for player this round?");
            return;
        }

        const opponent = myMatch.home.id === this.playerTeamId ? myMatch.away : myMatch.home;
        this.log(`NEXT MATCH VS: ${opponent.name}`);
        this.log("Set your lineup and click PLAY BALL.");
    }

    async startMatch() {
        // Switch to Match View
        this.switchView('match');

        const round = this.league.getCurrentRound();
        const myMatch = round.find(m => m.home.id === this.playerTeamId || m.away.id === this.playerTeamId);
        const isHome = myMatch.home.id === this.playerTeamId;

        // Sync latest lineup data
        const myTeamObj = isHome ? myMatch.home : myMatch.away;
        myTeamObj.lineup = this.lineup;
        myTeamObj.pitcher = this.pitcher;

        // Setup Match UI
        document.getElementById('play-match-btn').disabled = true;

        // Run Simulation
        const homeTeam = myMatch.home;
        const awayTeam = myMatch.away;

        if (!homeTeam.isPlayer && !homeTeam.pitcher) homeTeam.pitcher = homeTeam.roster[0];
        if (!awayTeam.isPlayer && !awayTeam.pitcher) awayTeam.pitcher = awayTeam.roster[0];

        await this.rules.simulateMatch(this, homeTeam, awayTeam);
    }

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
        document.getElementById('league-view').classList.add('active');
        this.updateLeagueView();

        document.getElementById('play-match-btn').disabled = false;
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
