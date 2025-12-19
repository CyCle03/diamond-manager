import { Player } from './Player.js';
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
        this.teamBudget = 5000000; // Starting budget
        this.playerIsHomeInCurrentMatch = true;
        this.scoutCost = 75000;
        this.scoutCount = 3;
        this.maxDraftRounds = 5;
        this.scoutingPool = [];
        this.draftPool = [];
        this.draftActive = false;
        this.draftRound = 0;
        this.draftPickIndex = 0;
        this.draftOrder = [];
        this.teamSeasonStats = {};
        this.simulationMode = 'auto';
        this.manualStepMode = 'batter';
        this.autoViewMode = 'batter';
        this.simPitchDelayMs = 250;
        this.simBatterDelayMs = 600;
        this.pendingSimResolve = null;
        this.pendingSimType = null;

        // Initialize Start Screen listeners (Always needed for Options menu)
        this.initStartScreen();

        // Auto-Load Check
        const lastSlot = SaveManager.getLastUsedSlot();
        if (lastSlot && SaveManager.exists(lastSlot)) {
            console.log("Auto-loading slot", lastSlot);
            this.startGame(lastSlot, null, false);
        } else {
            // Show Start Screen (already initialized)
            document.getElementById('start-screen-overlay').style.display = 'flex'; // Ensure visible if not auto-loading
        }
    }

    initStartScreen() {
        const slots = document.querySelectorAll('.save-slot-card');
        slots.forEach(slot => {
            // Slot Click
            slot.addEventListener('click', (e) => {
                // Ignore if clicked delete button
                if (e.target.classList.contains('delete-btn')) return;

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

            // Delete Button Handling
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '&times;';
            deleteBtn.title = 'Delete Save';
            deleteBtn.style.display = 'none'; // Hidden by default, shown by CSS if populated

            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Don't trigger slot click
                const slotId = parseInt(slot.dataset.slot);
                if (confirm(`Delete Save Slot ${slotId}? This cannot be undone.`)) {
                    SaveManager.delete(slotId);
                    this.updateStartScreenUI();
                }
            });

            // Append if not exists (initStartScreen might be called multiple times? No, constructor only, or openOptions re-binds?
            // We should be careful not to double bind. Ideally check existence.)
            if (!slot.querySelector('.delete-btn')) {
                slot.appendChild(deleteBtn);
            }
        });

        // Close Options Button
        const closeBtn = document.getElementById('close-options-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.getElementById('start-screen-overlay').style.display = 'none';
            });
        }

        this.updateStartScreenUI();
    }

    updateStartScreenUI() {
        const slots = document.querySelectorAll('.save-slot-card');
        slots.forEach(slot => {
            const slotId = parseInt(slot.dataset.slot);
            const meta = SaveManager.getMeta(slotId);
            const infoDiv = slot.querySelector('.slot-info');
            const deleteBtn = slot.querySelector('.delete-btn');

            if (meta) {
                infoDiv.innerHTML = `${meta.teamName}<br>Season ${meta.season}<br>Round ${meta.round}`;
                infoDiv.classList.remove('slot-empty');
                slot.classList.add('populated');
                if (deleteBtn) deleteBtn.style.display = 'block';
            } else {
                infoDiv.innerHTML = "Empty - Create New";
                infoDiv.classList.add('slot-empty');
                slot.classList.remove('populated');
                if (deleteBtn) deleteBtn.style.display = 'none';
            }
        });
    }

    updateBudgetUI() {
        const budgetEl = document.getElementById('team-budget');
        if (budgetEl) {
            budgetEl.innerText = `BUDGET: $${this.teamBudget.toLocaleString()}`;
        }
    }

    openOptions() {
        document.getElementById('start-screen-overlay').style.display = 'flex';
        this.updateStartScreenUI();

        // Show Close button only if we are inside a game (roster exists)
        const closeBtn = document.getElementById('close-options-btn');
        if (closeBtn) {
            // If we have a roster, we assume game is running
            closeBtn.style.display = (this.roster && this.roster.length > 0) ? 'block' : 'none';
        }
    }

    startGame(slotId, teamName, isNew) {
        this.currentSlotId = slotId;
        SaveManager.setLastUsedSlot(slotId); // Remember this slot

        document.getElementById('start-screen-overlay').style.display = 'none';

        if (isNew) {
            this.teamName = teamName;
            this.teamBudget = 5000000;
            this.currentRotationIndex = 0; // Explicitly reset for new game
            this.scoutingPool = [];
            this.draftPool = [];
            this.draftActive = false;
            this.draftRound = 0;
            this.draftPickIndex = 0;
            this.draftOrder = [];
            this.teamSeasonStats = {};
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
        this.updateBudgetUI();

        // Ensure name is updated in UI if element exists
        // (Optional: Add team name display in header)
    }

    saveGame() {
        const data = {
            teamName: this.teamName,
            teamBudget: this.teamBudget,
            season: this.league ? this.league.season : 1,
            roster: this.roster, // Player objects should serialize fine
            lineup: this.lineup,
            rotation: this.rotation,
            league: this.league, // Needs care on deserialization
            playerTeamId: this.playerTeamId,
            currentRotationIndex: this.currentRotationIndex,
            rotationSize: this.rotationSize,
            scoutingPool: this.scoutingPool,
            draftPool: this.draftPool,
            draftActive: this.draftActive,
            draftRound: this.draftRound,
            draftPickIndex: this.draftPickIndex,
            draftOrder: this.draftOrder,
            teamSeasonStats: this.teamSeasonStats,
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

        const rehydrate = p => p ? new Player(p.id, p.name, p.position, p.age, p.stats, p.performance) : null;

        this.teamName = data.teamName;
        this.teamBudget = data.teamBudget || 5000000;
        this.playerTeamId = data.playerTeamId;
        this.currentRotationIndex = data.currentRotationIndex;
        this.rotationSize = data.rotationSize;
        this.scoutingPool = (data.scoutingPool || []).map(rehydrate);
        this.draftPool = (data.draftPool || []).map(rehydrate);
        this.draftActive = data.draftActive || false;
        this.draftRound = data.draftRound || 0;
        this.draftPickIndex = data.draftPickIndex || 0;
        this.draftOrder = data.draftOrder || [];
        this.teamSeasonStats = data.teamSeasonStats || {};

        // Re-hydrate Player objects
        this.roster = data.roster.map(rehydrate);
        this.lineup = data.lineup.map(slot => slot ? { ...slot, player: rehydrate(slot.player) } : null);
        this.rotation = data.rotation.map(rehydrate);

        // Reconstruct League and its players
        this.league = new League(this.rules);
        Object.assign(this.league, data.league);
        this.league.teams.forEach(team => {
            team.roster = team.roster.map(rehydrate);
            // lineup and pitcher objects in AI teams are simpler, direct assignment is fine for now
        });
        this.league.freeAgents = this.league.freeAgents.map(rehydrate);
        this.ensureRosterPerformance();
        this.ensureTeamSeasonStats();


        // Manually update the UI to show the league view correctly
        const startBtn = document.getElementById('start-season-btn');
        const calendarArea = document.getElementById('calendar-area');
        if (startBtn) startBtn.style.display = 'none';
        if (calendarArea) calendarArea.style.display = 'block';

        this.updateLeagueView();
        this.updateDraftUI();

        // Go to Dashboard
        this.switchView('league');
    }

    initUI() {
        // --- VIEW NAVIGATION ---
        const viewLeagueBtn = document.getElementById('view-league-btn');
        const viewTeamBtn = document.getElementById('view-team-btn');
        const viewMatchBtn = document.getElementById('view-match-btn');
        const viewStatsBtn = document.getElementById('view-stats-btn');

        if (viewLeagueBtn) viewLeagueBtn.addEventListener('click', () => this.switchView('league'));
        if (viewTeamBtn) viewTeamBtn.addEventListener('click', () => this.switchView('team'));
        if (viewMatchBtn) viewMatchBtn.addEventListener('click', () => this.switchView('match'));
        if (viewStatsBtn) viewStatsBtn.addEventListener('click', () => this.switchView('stats'));

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
            }
        });

        // Options Button
        const optionsBtn = document.getElementById('options-btn');
        if (optionsBtn) optionsBtn.addEventListener('click', () => this.openOptions());

        const scoutBtn = document.getElementById('scout-btn');
        if (scoutBtn) scoutBtn.addEventListener('click', () => this.scoutPlayers());

        const draftAdvanceBtn = document.getElementById('draft-advance-btn');
        if (draftAdvanceBtn) draftAdvanceBtn.addEventListener('click', () => this.advanceDraftPick());

        const draftBestBtn = document.getElementById('draft-best-btn');
        if (draftBestBtn) draftBestBtn.addEventListener('click', () => this.draftBestAvailable());

        this.initMatchControls();
        this.initPlayerModal();

    }

    renderRosterAndMarket() {
        this.renderList('#roster-list', this.roster, false);

        if (this.league) {
            this.renderList('#market-list', this.league.freeAgents, true);
        } else {
            const mList = document.querySelector('#market-list');
            if (mList) mList.innerHTML = '<div style="padding:10px; color:#888;">Start Season first</div>';
        }

        this.renderScoutingList();
    }

    renderList(selector, players, isMarket) {
        const container = document.querySelector(selector);
        if (!container) return;
        container.innerHTML = '';

        players.forEach(player => {
            const card = document.createElement('div');
            card.className = `player-card ${player.position === 'P' ? 'pitcher-card' : ''}`;
            card.draggable = !isMarket; // Roster players draggable, Market players not (until bought?)
            card.title = this.buildPlayerTooltip(player, { includeCost: isMarket, includePerformance: !isMarket });

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

            card.addEventListener('click', () => {
                if (isMarket) {
                    this.openPlayerModal(player, {
                        showPerformance: false,
                        actionLabel: 'SIGN',
                        action: () => {
                            if (confirm(`Sign Free Agent ${player.name} for $${player.stats.signingBonus.toLocaleString()}?`)) {
                                this.signFreeAgent(player);
                            }
                        }
                    });
                } else {
                    this.openPlayerModal(player, {
                        showPerformance: true,
                        actionLabel: 'RELEASE',
                        action: () => {
                            if (confirm(`Release ${player.name}?`)) {
                                this.releasePlayer(player);
                            }
                        }
                    });
                }
            });


            let statsHtml = '';
            if (player.position === 'P') {
                statsHtml = `PIT:${player.stats.pitching} SPD:${player.stats.speed}`;
            } else {
                statsHtml = `CON:${player.stats.contact} POW:${player.stats.power} SPD:${player.stats.speed} DEF:${player.stats.defense}`;
            }

            if (isMarket) {
                statsHtml += ` | COST: $${player.stats.signingBonus.toLocaleString()}`;
            }

            card.innerHTML = `
                <div class="card-pos">${player.position}</div>
                <div class="card-age">(${player.age})</div>
                <div class="card-name">${player.name}</div>
                <div class="card-stats">
                    ${statsHtml}
                </div>
            `;

            container.appendChild(card);
        });
    }

    renderScoutingList() {
        const container = document.querySelector('#scouting-list');
        const statusEl = document.getElementById('scout-status');
        const scoutBtn = document.getElementById('scout-btn');
        if (!container) return;

        if (!this.league) {
            container.innerHTML = '<div style="padding:10px; color:#888;">Start Season first</div>';
            if (statusEl) statusEl.innerText = 'Start a season to scout';
            if (scoutBtn) scoutBtn.disabled = true;
            return;
        }

        if (statusEl) {
            statusEl.innerText = `Find ${this.scoutCount} prospects • $${this.scoutCost.toLocaleString()}`;
        }
        if (scoutBtn) {
            scoutBtn.innerText = `SCOUT ($${this.scoutCost.toLocaleString()})`;
            scoutBtn.disabled = this.teamBudget < this.scoutCost;
        }

        container.innerHTML = '';
        if (this.scoutingPool.length === 0) {
            container.innerHTML = '<div style="padding:10px; color:#888;">No scouting reports yet</div>';
            return;
        }

        this.scoutingPool.forEach(player => {
            const card = document.createElement('div');
            card.className = `player-card ${player.position === 'P' ? 'pitcher-card' : ''}`;
            card.title = this.buildPlayerTooltip(player, { includeCost: true, includePerformance: false });

            let statsHtml = '';
            if (player.position === 'P') {
                statsHtml = `PIT:${player.stats.pitching} SPD:${player.stats.speed}`;
            } else {
                statsHtml = `CON:${player.stats.contact} POW:${player.stats.power} SPD:${player.stats.speed} DEF:${player.stats.defense}`;
            }

            statsHtml += ` | COST: $${player.stats.signingBonus.toLocaleString()}`;

            card.innerHTML = `
                <div class="card-pos">${player.position}</div>
                <div class="card-age">(${player.age})</div>
                <div class="card-name">${player.name}</div>
                <div class="card-stats">
                    ${statsHtml}
                </div>
            `;

            card.addEventListener('click', () => {
                this.openPlayerModal(player, {
                    showPerformance: false,
                    actionLabel: 'SIGN',
                    action: () => {
                        if (confirm(`Sign Scouted Player ${player.name} for $${player.stats.signingBonus.toLocaleString()}?`)) {
                            this.signScoutedPlayer(player);
                        }
                    }
                });
            });

            container.appendChild(card);
        });
    }

    renderRotation() {
        console.log('Rendering Rotation', this.rotation);
        const container = document.getElementById('rotation-slots');
        if (!container) return;
        container.innerHTML = '';

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
                } else if (data.source === 'rotation') {
                    // Swap Logic
                    const sourceIndex = data.index;
                    const temp = this.rotation[i];
                    this.rotation[i] = this.rotation[sourceIndex];
                    this.rotation[sourceIndex] = temp;
                    this.renderRotation();
                }
            });

            if (p) {
                // Drag Source Logic
                slot.draggable = true;
                slot.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({ source: 'rotation', index: i }));
                    slot.classList.add('dragging');
                });
                slot.addEventListener('dragend', () => slot.classList.remove('dragging'));

                slot.innerHTML = `
                    <span class="order-num">SP${i + 1}</span>
                    <span class="player-name">${p.name}</span>
                    <span class="player-pos">P</span>
                    <button class="remove-btn">x</button>
                `;
                slot.querySelector('.remove-btn').addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent drag/click propagation
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
                // Default role = player's primary position, or DH if slot 9 (index 8)
                const role = (emptyIndex === 8) ? 'DH' : player.position;
                this.lineup[emptyIndex] = { player, role };
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

    setLineupSlot(index, player, role = null) {
        // Use existing role if updating same player, or default
        const effectiveRole = role || ((index === 8) ? 'DH' : player.position);
        this.lineup[index] = { player, role: effectiveRole };
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
        const allPitchers = this.roster.filter(p => p.position === 'P').sort((a, b) => b.stats.pitching - a.stats.pitching);
        this.rotation = new Array(this.rotationSize).fill(null);
        for (let i = 0; i < this.rotationSize; i++) {
            if (allPitchers[i]) this.rotation[i] = allPitchers[i];
        }

        // --- 2. Select Starting 9 (Defensive Integrity) ---
        // --- 3. Sort into Batting Order (Strategy) ---
        // We now have ~9 players in selectedPlayers. Let's order them.

        // Map player IDs to their assigned roles (from Phase 2A/2B)
        const roleMap = new Map();
        // RE-REFACTORING PHASE 2 TO STORE ROLES
        const selectedEntries = []; // Array of { player, role }
        const usedIds = new Set();

        // Helper: Get Overall Hitting Ability
        const getRating = (p) => p.stats.contact + p.stats.power + p.stats.speed;

        // A. Fill Fielders
        const positionsNeeded = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
        positionsNeeded.forEach(pos => {
            const candidates = this.roster.filter(p => p.position === pos && !usedIds.has(p.id))
                .sort((a, b) => getRating(b) - getRating(a));
            let pick = null;
            if (candidates.length > 0) {
                pick = candidates[0];
            } else {
                // Fallback
                const fallback = this.roster.filter(p => p.position !== 'P' && !usedIds.has(p.id))
                    .sort((a, b) => getRating(b) - getRating(a));
                if (fallback.length > 0) pick = fallback[0];
            }

            if (pick) {
                selectedEntries.push({ player: pick, role: pos });
                usedIds.add(pick.id);
            }
        });

        // B. Fill DH
        const dhCandidates = this.roster.filter(p => p.position !== 'P' && !usedIds.has(p.id))
            .sort((a, b) => getRating(b) - getRating(a));
        if (dhCandidates.length > 0) {
            selectedEntries.push({ player: dhCandidates[0], role: 'DH' });
            usedIds.add(dhCandidates[0].id);
        }

        // --- Sort into Batting Order ---
        const battingOrder = new Array(9).fill(null);
        let pool = [...selectedEntries]; // Pool of {player, role} objects

        // Evaluators
        const getSpeed = (entry) => entry.player.stats.speed;
        const getPower = (entry) => entry.player.stats.power;
        const getContact = (entry) => entry.player.stats.contact;
        const getOPS = (entry) => entry.player.stats.contact + entry.player.stats.power;

        // 1. Leadoff (#1): Best Speed
        if (pool.length > 0) {
            pool.sort((a, b) => getSpeed(b) - getSpeed(a));
            battingOrder[0] = pool.shift();
        }
        // 2. Cleanup (#4): Best Power
        if (pool.length > 0) {
            pool.sort((a, b) => getPower(b) - getPower(a));
            battingOrder[3] = pool.shift();
        }
        // 3. 3-Hole (#3): Best OPS
        if (pool.length > 0) {
            pool.sort((a, b) => getOPS(b) - getOPS(a));
            battingOrder[2] = pool.shift();
        }
        // 4. 2-Hole (#2): Best Contact
        if (pool.length > 0) {
            pool.sort((a, b) => getContact(b) - getContact(a));
            battingOrder[1] = pool.shift();
        }
        // 5. 5-Hole (#5): Best remaining Power
        if (pool.length > 0) {
            pool.sort((a, b) => getPower(b) - getPower(a));
            battingOrder[4] = pool.shift();
        }
        // 6. Remaining
        const remainingSlots = [5, 6, 7, 8];
        const getRatingEntry = (entry) => getRating(entry.player);
        pool.sort((a, b) => getRatingEntry(b) - getRatingEntry(a));

        remainingSlots.forEach(slotIndex => {
            if (pool.length > 0) battingOrder[slotIndex] = pool.shift();
        });

        // Apply
        this.lineup = battingOrder; // Now contains {player, role} objects or null
        this.renderLineup();
        this.renderRotation();
    }

    validateLineup() {
        const starter = this.rotation[this.currentRotationIndex];
        if (!starter) {
            alert(`No Starting Pitcher set for slot SP${this.currentRotationIndex + 1}!`);
            return false;
        }
        return this.rules.validateLineup(this.lineup, { pitcher: starter });
    }

    renderLineup() {
        const container = document.getElementById('batting-order-list');
        if (!container) return;
        container.innerHTML = '';

        this.lineup.forEach((entry, index) => {
            const slot = document.createElement('div');
            slot.className = 'lineup-slot';
            slot.dataset.index = index;

            // Events
            slot.addEventListener('dragover', e => { e.preventDefault(); slot.classList.add('drag-over'); });
            slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
            slot.addEventListener('drop', e => {
                e.preventDefault();
                slot.classList.remove('drag-over');
                const data = JSON.parse(e.dataTransfer.getData('application/json'));

                if (data.source === 'roster') {
                    const player = this.roster.find(p => p.id === data.playerId);

                    if (player) {
                        // When dropping from roster, default role is primary relative to slot
                        // If OOP, we can just assign primary and let them change it.
                        this.setLineupSlot(index, player, player.position);
                    }
                } else if (data.source === 'lineup') {
                    this.swapLineupSlots(data.index, index);
                }
            });

            if (entry && entry.player) {
                const { player, role } = entry;
                slot.draggable = true;
                slot.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('application/json', JSON.stringify({ source: 'lineup', index: index }));
                    slot.classList.add('dragging');
                });
                slot.addEventListener('dragend', () => slot.classList.remove('dragging'));

                slot.classList.add('filled');

                // Construct HTML with Select dropdown
                const roles = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
                let optionsHtml = '';
                roles.forEach(r => {
                    optionsHtml += `<option value="${r}" ${r === role ? 'selected' : ''}>${r}</option>`;
                });

                slot.innerHTML = `
                    <span class="order-num">${index + 1}.</span>
                    <select class="role-select" style="margin-right:5px; background:var(--accent-green); color:white; border:none; border-radius:3px; padding:2px; cursor:pointer; font-weight:bold;">
                        ${optionsHtml}
                    </select>
                    <span class="player-name">${player.name}</span>
                    <span class="player-pos-natural" style="font-size:0.8rem; opacity:0.7; margin-left:5px;">(${player.position})</span>
                    <button class="remove-btn">x</button>
                `;

                // Add Listeners
                const select = slot.querySelector('select');
                select.addEventListener('change', (e) => {
                    entry.role = e.target.value;
                });
                select.addEventListener('click', e => e.stopPropagation()); // Prevent drag

                slot.querySelector('.remove-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.removeFromLineup(index);
                });
            } else {
                slot.className = 'empty-slot';
                slot.innerHTML = `<span>${index + 1}. Select Batter...</span>`;
            }
            container.appendChild(slot);
        });

        this.renderRotation();
    }

    signFreeAgent(player) {
        if (this.roster.length >= 25) {
            alert("Roster is full (Max 25)!");
            return;
        }

        const cost = player.stats.signingBonus;
        if (this.teamBudget < cost) {
            alert("Not enough budget to sign this player!");
            return;
        }

        this.teamBudget -= cost;
        this.updateBudgetUI();

        // Move from FA to Roster
        this.roster.push(player);
        this.league.freeAgents = this.league.freeAgents.filter(p => p.id !== player.id);
        alert(`Signed ${player.name}!`);
        this.renderRosterAndMarket();
        this.saveGame();
    }

    signScoutedPlayer(player) {
        if (this.roster.length >= 25) {
            alert("Roster is full (Max 25)!");
            return;
        }

        const cost = player.stats.signingBonus;
        if (this.teamBudget < cost) {
            alert("Not enough budget to sign this player!");
            return;
        }

        this.teamBudget -= cost;
        this.updateBudgetUI();

        this.roster.push(player);
        this.scoutingPool = this.scoutingPool.filter(p => p.id !== player.id);
        alert(`Signed ${player.name}!`);
        this.renderRosterAndMarket();
        this.saveGame();
    }

    releasePlayer(player) {
        // 1. Minimum roster size check
        if (this.roster.length <= 16) { // Let's set a minimum
            alert("Cannot release player. Roster is at the minimum size of 16.");
            return;
        }

        // 2. Remove from roster
        this.roster = this.roster.filter(p => p.id !== player.id);

        // 3. Add to free agents
        if (this.league && this.league.freeAgents) {
            this.league.freeAgents.push(player);
        }

        // 4. Remove from lineup and rotation
        this.lineup = this.lineup.map(slot => (slot && slot.player.id === player.id) ? null : slot);
        this.rotation = this.rotation.map(p => (p && p.id === player.id) ? null : p);

        alert(`Released ${player.name}.`);

        // 5. Re-render UI
        this.renderRosterAndMarket();
        this.renderLineup();
        this.renderRotation();

        // 6. Save game
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
        this.initTeamSeasonStats();

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

        const starter = this.rotation[this.currentRotationIndex];

        const round = this.league.getCurrentRound();
        const myMatch = round.find(m => m.home.id === this.playerTeamId || m.away.id === this.playerTeamId);
        if (!myMatch) {
            this.log("No match scheduled for this round.");
            return;
        }
        
        if (myMatch.home.id === this.playerTeamId) {
            myMatch.home.pitcher = starter;
        } else {
            myMatch.away.pitcher = starter;
        }

        this.incrementGamesForTeam(myMatch.home);
        this.incrementGamesForTeam(myMatch.away);

        // 3. Update UI to "Simulating" state
        this.isSimulating = true;
        this.updateSimControls();
        document.getElementById('play-match-btn').disabled = true;
        document.getElementById('game-status-text').innerText = "PLAY BALL!";
        this.log(`MATCH STARTING! SP: ${starter.name} vs ${myMatch.home.id === this.playerTeamId ? myMatch.away.name : myMatch.home.name}`);

        // 4. Simulate
        await this.rules.simulateMatch(this, myMatch.home, myMatch.away);
    }



    // Previous 'finishMatch' at lines 516-540 is DELETED. 
    // We keep the one below (callback style).

    // Callback after match ends
    // Callback after match ends
    async finishMatch(homeScore, awayScore) {
        this.isSimulating = false; // RESET FLAG

        // 1. Update League Standings for Player Match
        const round = this.league.getCurrentRound();
        const myMatch = round.find(m => m.home.id === this.playerTeamId || m.away.id === this.playerTeamId);

        const winnerId = homeScore > awayScore ? myMatch.home.id : myMatch.away.id;
        const loserId = homeScore > awayScore ? myMatch.away.id : myMatch.home.id;

        this.league.updateStandings(winnerId, loserId);

        // Add budget reward for a win
        if (winnerId === this.playerTeamId) {
            const prizeMoney = 50000;
            this.teamBudget += prizeMoney;
            this.updateBudgetUI();
            this.log(`> Your team won! You earned $${prizeMoney.toLocaleString()}!`);
        }

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

        // 4. Advance Rotation (Player Team)
        this.currentRotationIndex = (this.currentRotationIndex + 1) % this.rotationSize;
        this.renderRotation(); // Update UI to show next starter

        if (this.league.currentRoundIndex >= this.league.schedule.length) {
            this.advanceSeason();
            return;
        }

        // 5. Show League View again
        await this.wait(2000);
        this.updateLeagueView();
        this.switchView('league');

        document.getElementById('play-match-btn').disabled = false;
        this.isSimulating = false;
        this.updateSimControls();

        this.saveGame();
    }

    advanceSeason() {
        // Calculate and deduct annual salaries for all players on the roster
        let totalSalaries = 0;
        this.roster.forEach(player => {
            totalSalaries += player.stats.salary;
        });

        this.teamBudget -= totalSalaries;
        this.log(`Annual salaries of $${totalSalaries.toLocaleString()} deducted.`);
        this.updateBudgetUI();

        this.finalizeSeasonStats(this.league.season);
        
        alert("SEASON OVER! Proceeding to Off-Season for player development.");

        // Age all players and apply progression/regression
        const allPlayers = [...this.roster, ...this.league.freeAgents];
        allPlayers.forEach(player => {
            player.age++;
            this.rules.updatePlayerStatsForAge(player);
        });

        this.startDraft();
    }

    // --- VIEW UPDATES ---

    updateLeagueView() {
        // Update season display
        const seasonDisplay = document.getElementById('season-display');
        if (seasonDisplay) seasonDisplay.innerText = `SEASON ${this.league.season}`;

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

        this.updateDraftUI();
        this.updateTeamStatsView();
    }

    initTeamSeasonStats() {
        if (!this.league) return;
        this.teamSeasonStats = {};
        this.league.teams.forEach(team => {
            this.teamSeasonStats[team.id] = { runsFor: 0, runsAgainst: 0 };
        });
    }

    ensureTeamSeasonStats() {
        if (!this.league) return;
        if (!this.teamSeasonStats) this.teamSeasonStats = {};
        this.league.teams.forEach(team => {
            if (!this.teamSeasonStats[team.id]) {
                this.teamSeasonStats[team.id] = { runsFor: 0, runsAgainst: 0 };
            }
        });
    }

    recordTeamRuns(battingTeamId, fieldingTeamId, runs) {
        if (!this.teamSeasonStats) this.teamSeasonStats = {};
        if (!this.teamSeasonStats[battingTeamId]) {
            this.teamSeasonStats[battingTeamId] = { runsFor: 0, runsAgainst: 0 };
        }
        if (!this.teamSeasonStats[fieldingTeamId]) {
            this.teamSeasonStats[fieldingTeamId] = { runsFor: 0, runsAgainst: 0 };
        }
        this.teamSeasonStats[battingTeamId].runsFor += runs;
        this.teamSeasonStats[fieldingTeamId].runsAgainst += runs;
    }

    resetMatchView() {
        if (!this.league) return;

        // Get next match details
        const round = this.league.getCurrentRound();
        if (!round) return;

        const myMatch = round.find(m => m.home.id === this.playerTeamId || m.away.id === this.playerTeamId);
        if (!myMatch) return;

        // Set team names
        document.getElementById('score-home-name').innerText = myMatch.home.name;
        document.getElementById('score-away-name').innerText = myMatch.away.name;

        // Reset scores and inning
        document.getElementById('score-home-val').innerText = '0';
        document.getElementById('score-away-val').innerText = '0';
        document.getElementById('sb-inning').innerText = 'TOP 1';

        // Reset game status text and log
        document.getElementById('game-status-text').innerText = 'WAITING FOR MATCH...';
        document.getElementById('game-log').innerHTML = '<div class="log-entry">> Set your lineup and click "PLAY BALL" to start.</div>';

        // Reset matchup display
        this.updateMatchupDisplay({ name: '---' }, { name: '---' });
        
        // Ensure play button is enabled
        document.getElementById('play-match-btn').disabled = false;
        this.isSimulating = false;
        this.updateSimControls();
    }

    // --- UI Helpers called by Rules Strategy ---

    updateMatchupDisplay(batter, pitcher) {
        document.querySelector('.matchup-batter').innerText = `BATTER: ${batter.name}`;
        document.querySelector('.matchup-pitcher').innerText = `PITCHER: ${pitcher.name}`;
    }

    updateScoreboard(homeScore, awayScore) {
        const homeScoreEl = document.getElementById('score-home-val');
        const awayScoreEl = document.getElementById('score-away-val');
        if (homeScoreEl) homeScoreEl.innerText = homeScore;
        if (awayScoreEl) awayScoreEl.innerText = awayScore;
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
        const leagueBtn = document.getElementById('view-league-btn');
        const teamBtn = document.getElementById('view-team-btn');
        const matchBtn = document.getElementById('view-match-btn');
        const statsBtn = document.getElementById('view-stats-btn');

        mainContent.classList.remove('league-mode', 'team-mode', 'match-mode', 'stats-mode');

        if (leagueBtn) leagueBtn.classList.remove('active');
        if (teamBtn) teamBtn.classList.remove('active');
        if (matchBtn) matchBtn.classList.remove('active');
        if (statsBtn) statsBtn.classList.remove('active');

        if (mode === 'team') {
            mainContent.classList.add('team-mode');
            if (teamBtn) teamBtn.classList.add('active');
        } else if (mode === 'match') {
            mainContent.classList.add('match-mode');
            if (matchBtn) matchBtn.classList.add('active');
            this.resetMatchView(); // Reset the view when switching to it
        } else if (mode === 'league') {
            mainContent.classList.add('league-mode');
            if (leagueBtn) leagueBtn.classList.add('active');
            const calendarArea = document.getElementById('calendar-area');
            const seasonInfoArea = document.getElementById('season-info-area');
            const statsArea = document.getElementById('team-stats-area');
            if (statsArea) statsArea.style.display = 'none';
            if (this.league) {
                if (calendarArea) calendarArea.style.display = 'block';
                if (seasonInfoArea) seasonInfoArea.style.display = 'none';
            } else {
                if (calendarArea) calendarArea.style.display = 'none';
                if (seasonInfoArea) seasonInfoArea.style.display = 'block';
            }
        } else if (mode === 'stats') {
            mainContent.classList.add('stats-mode');
            if (statsBtn) statsBtn.classList.add('active');
            this.updateTeamStatsView();
        }
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    initMatchControls() {
        const autoBtn = document.getElementById('sim-auto-btn');
        const pitchBtn = document.getElementById('sim-pitch-btn');
        const batterBtn = document.getElementById('sim-batter-btn');
        const autoViewSelect = document.getElementById('auto-view-select');

        if (autoBtn) autoBtn.addEventListener('click', () => this.setSimulationMode('auto'));
        if (pitchBtn) pitchBtn.addEventListener('click', () => this.setSimulationMode('pitch'));
        if (batterBtn) batterBtn.addEventListener('click', () => this.setSimulationMode('batter'));

        if (autoViewSelect) {
            autoViewSelect.addEventListener('change', (e) => {
                this.autoViewMode = e.target.value;
            });
        }

        this.updateSimControls();
    }

    setSimulationMode(mode) {
        if (mode === 'auto') {
            this.simulationMode = 'auto';
        } else {
            this.simulationMode = 'manual';
            this.manualStepMode = mode;
        }
        this.updateSimControls();
        this.resolvePendingSimStep(mode);
    }

    updateSimControls() {
        const autoBtn = document.getElementById('sim-auto-btn');
        const pitchBtn = document.getElementById('sim-pitch-btn');
        const batterBtn = document.getElementById('sim-batter-btn');
        const autoViewSelect = document.getElementById('auto-view-select');

        const enabled = this.isSimulating;
        if (autoBtn) {
            autoBtn.disabled = !enabled;
            autoBtn.classList.toggle('active', this.simulationMode === 'auto');
        }
        if (pitchBtn) {
            pitchBtn.disabled = !enabled;
            pitchBtn.classList.toggle('active', this.simulationMode === 'manual' && this.manualStepMode === 'pitch');
            pitchBtn.onclick = () => {
                if (this.simulationMode === 'manual' && this.manualStepMode === 'pitch') {
                    this.resolvePendingSimStep('pitch');
                }
            };
        }
        if (batterBtn) {
            batterBtn.disabled = !enabled;
            batterBtn.classList.toggle('active', this.simulationMode === 'manual' && this.manualStepMode === 'batter');
            batterBtn.onclick = () => {
                if (this.simulationMode === 'manual' && this.manualStepMode === 'batter') {
                    this.resolvePendingSimStep('batter');
                }
            };
        }
        if (autoViewSelect) {
            autoViewSelect.disabled = !enabled;
        }
    }

    resolvePendingSimStep(triggeredMode) {
        if (this.pendingSimResolve) {
            if (this.simulationMode === 'manual') {
                if (this.manualStepMode === 'batter' && this.pendingSimType === 'pitch') {
                    return;
                }
                if (this.manualStepMode === 'pitch' && (triggeredMode === 'pitch' || this.pendingSimType === 'pitch' || this.pendingSimType === 'batter')) {
                    this.pendingSimResolve();
                } else if (this.manualStepMode === 'batter' && this.pendingSimType === 'batter') {
                    this.pendingSimResolve();
                }
            }
            this.pendingSimResolve = null;
            this.pendingSimType = null;
        }
    }

    waitForSimulationEvent(type) {
        if (!this.isSimulating) return Promise.resolve();

        if (this.simulationMode === 'auto') {
            if (this.autoViewMode === 'pitch') {
                return this.wait(type === 'pitch' ? this.simPitchDelayMs : this.simBatterDelayMs);
            }
            if (type === 'pitch') return Promise.resolve();
            return this.wait(this.simBatterDelayMs);
        }

        if (this.manualStepMode === 'batter' && type === 'pitch') {
            return Promise.resolve();
        }

        return new Promise(resolve => {
            this.pendingSimResolve = resolve;
            this.pendingSimType = type;
        });
    }

    buildPlayerTooltip(player, options = {}) {
        const stats = player.stats;
        const performance = this.ensurePerformance(player);
        const current = performance.currentSeason;
        const lines = [
            `${player.name} (${player.position})`,
            `Age ${player.age} • OVR ${stats.overall}`,
            `CON ${stats.contact} | POW ${stats.power} | SPD ${stats.speed} | DEF ${stats.defense}`,
            `PIT ${stats.pitching}`
        ];
        if (options.includePerformance) {
            const batting = this.formatBattingLine(current);
            const pitching = this.formatPitchingLine(current);
            lines.push(`BAT ${batting}`);
            lines.push(`PIT ${pitching}`);
        }
        if (options.includeCost && stats.signingBonus) {
            lines.push(`COST $${stats.signingBonus.toLocaleString()}`);
        }
        return lines.join('\n');
    }

    initPlayerModal() {
        const overlay = document.getElementById('player-modal');
        const closeBtn = document.getElementById('player-modal-close');
        const cancelBtn = document.getElementById('player-modal-cancel');

        if (!overlay) return;

        const close = () => overlay.classList.add('hidden');
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });
        if (closeBtn) closeBtn.addEventListener('click', close);
        if (cancelBtn) cancelBtn.addEventListener('click', close);
    }

    openPlayerModal(player, options = {}) {
        const overlay = document.getElementById('player-modal');
        const titleEl = document.getElementById('player-modal-title');
        const bodyEl = document.getElementById('player-modal-body');
        const actionBtn = document.getElementById('player-modal-action');
        if (!overlay || !titleEl || !bodyEl || !actionBtn) return;

        titleEl.innerText = player.name;
        const stats = player.stats;
        const performance = this.ensurePerformance(player);
        const current = performance.currentSeason;
        const perfHtml = options.showPerformance
            ? `
            <div class="modal-section">
                <div class="modal-section-title">Current Season</div>
                <div class="season-line">BAT ${this.formatBattingLine(current)}</div>
                <div class="season-line">PIT ${this.formatPitchingLine(current)}</div>
                <div class="season-line">G ${current.games} • PA ${current.plateAppearances} • HR ${current.homeRuns} • BB ${current.walks} • HBP ${current.hitByPitch}</div>
                <div class="season-line">R ${current.pitcherRunsAllowed} • ER ${current.pitcherEarnedRunsAllowed} • UER ${current.pitcherUnearnedRunsAllowed}</div>
            </div>
            ${this.renderSeasonHistory(performance)}
            `
            : '';

        bodyEl.innerHTML = `
            <div class="stat-label">Position</div><div class="stat-value">${player.position}</div>
            <div class="stat-label">Age</div><div class="stat-value">${player.age}</div>
            <div class="stat-label">Overall</div><div class="stat-value">${stats.overall}</div>
            <div class="stat-label">Contact</div><div class="stat-value">${stats.contact}</div>
            <div class="stat-label">Power</div><div class="stat-value">${stats.power}</div>
            <div class="stat-label">Speed</div><div class="stat-value">${stats.speed}</div>
            <div class="stat-label">Defense</div><div class="stat-value">${stats.defense}</div>
            <div class="stat-label">Pitching</div><div class="stat-value">${stats.pitching}</div>
            <div class="stat-label">Salary</div><div class="stat-value">$${stats.salary.toLocaleString()}</div>
            <div class="stat-label">Signing Bonus</div><div class="stat-value">$${stats.signingBonus.toLocaleString()}</div>
            ${perfHtml}
        `;

        if (options.actionLabel && options.action) {
            actionBtn.innerText = options.actionLabel;
            actionBtn.style.display = 'inline-flex';
            actionBtn.onclick = () => {
                options.action();
                overlay.classList.add('hidden');
            };
        } else {
            actionBtn.style.display = 'none';
            actionBtn.onclick = null;
        }

        overlay.classList.remove('hidden');
    }

    ensurePerformance(player) {
        if (!player.performance) {
            player.performance = Player.defaultPerformance();
        }

        if (!player.performance.currentSeason) {
            const legacy = player.performance;
            player.performance = Player.defaultPerformance();
            player.performance.currentSeason = {
                ...player.performance.currentSeason,
                games: legacy.games || 0,
                plateAppearances: legacy.plateAppearances || 0,
                atBats: legacy.atBats || 0,
                hits: legacy.hits || 0,
                singles: legacy.singles || 0,
                doubles: legacy.doubles || 0,
                triples: legacy.triples || 0,
                homeRuns: legacy.homeRuns || 0,
                walks: legacy.walks || 0,
                hitByPitch: legacy.hitByPitch || 0,
                sacFlies: legacy.sacFlies || 0,
                outs: legacy.outs || 0,
                pitcherBattersFaced: legacy.pitcherBattersFaced || 0,
                pitcherHitsAllowed: legacy.pitcherHitsAllowed || 0,
                pitcherOuts: legacy.pitcherOuts || 0,
                pitcherWalksAllowed: legacy.pitcherWalksAllowed || 0,
                pitcherHitByPitchAllowed: legacy.pitcherHitByPitchAllowed || 0,
                pitcherRunsAllowed: legacy.pitcherRunsAllowed || 0,
                pitcherEarnedRunsAllowed: legacy.pitcherEarnedRunsAllowed || 0,
                pitcherUnearnedRunsAllowed: legacy.pitcherUnearnedRunsAllowed || 0
            };
            player.performance.seasons = legacy.seasons || [];
        }

        if (!player.performance.seasons) {
            player.performance.seasons = [];
        }

        const current = player.performance.currentSeason;
        if (current) {
            current.walks = current.walks || 0;
            current.hitByPitch = current.hitByPitch || 0;
            current.sacFlies = current.sacFlies || 0;
            current.pitcherWalksAllowed = current.pitcherWalksAllowed || 0;
            current.pitcherHitByPitchAllowed = current.pitcherHitByPitchAllowed || 0;
            current.pitcherEarnedRunsAllowed = current.pitcherEarnedRunsAllowed || 0;
            current.pitcherUnearnedRunsAllowed = current.pitcherUnearnedRunsAllowed || 0;
        }

        return player.performance;
    }

    ensureRosterPerformance() {
        this.roster.forEach(player => this.ensurePerformance(player));
    }

    formatAverage(hits, atBats) {
        if (!atBats) return '.000';
        const avg = (hits / atBats).toFixed(3);
        return avg.startsWith('0') ? avg.slice(1) : avg;
    }

    formatRate(value) {
        const rate = value.toFixed(3);
        return rate.startsWith('0') ? rate.slice(1) : rate;
    }

    calculateBattingStats(stats) {
        const atBats = stats.atBats || 0;
        const hits = stats.hits || 0;
        const walks = stats.walks || 0;
        const hbp = stats.hitByPitch || 0;
        const sacFlies = stats.sacFlies || 0;
        const obpDenominator = atBats + walks + hbp + sacFlies;
        const obp = obpDenominator ? (hits + walks + hbp) / obpDenominator : 0;
        const singles = stats.singles || Math.max(0, hits - (stats.doubles || 0) - (stats.triples || 0) - (stats.homeRuns || 0));
        const doubles = stats.doubles || 0;
        const triples = stats.triples || 0;
        const homeRuns = stats.homeRuns || 0;
        const totalBases = singles + 2 * doubles + 3 * triples + 4 * homeRuns;
        const slg = atBats ? totalBases / atBats : 0;
        const ops = obp + slg;
        return {
            avg: this.formatAverage(hits, atBats),
            obp: this.formatRate(obp),
            slg: this.formatRate(slg),
            ops: this.formatRate(ops),
            totalBases
        };
    }

    calculatePitchingStats(stats) {
        const outs = stats.pitcherOuts || 0;
        const ip = outs / 3;
        const runsAllowed = stats.pitcherRunsAllowed || 0;
        const earnedRuns = stats.pitcherEarnedRunsAllowed || runsAllowed;
        const hitsAllowed = stats.pitcherHitsAllowed || 0;
        const walksAllowed = stats.pitcherWalksAllowed || 0;
        const hbpAllowed = stats.pitcherHitByPitchAllowed || 0;
        const era = ip ? (earnedRuns * 9) / ip : 0;
        const whip = ip ? (hitsAllowed + walksAllowed + hbpAllowed) / ip : 0;
        return {
            ip,
            era: era.toFixed(2),
            whip: whip.toFixed(2)
        };
    }

    formatBattingLine(stats) {
        const batting = this.calculateBattingStats(stats);
        return `AVG ${batting.avg} / OBP ${batting.obp} / SLG ${batting.slg} / OPS ${batting.ops}`;
    }

    formatPitchingLine(stats) {
        const pitching = this.calculatePitchingStats(stats);
        const ip = pitching.ip ? pitching.ip.toFixed(1) : '0.0';
        return `ERA ${pitching.era} • WHIP ${pitching.whip} • IP ${ip}`;
    }

    renderSeasonHistory(performance) {
        if (!performance.seasons || performance.seasons.length === 0) return '';
        const recent = [...performance.seasons].slice(-5).reverse();
        const rows = recent.map(seasonEntry => {
            const batting = this.calculateBattingStats(seasonEntry.stats);
            const pitching = this.calculatePitchingStats(seasonEntry.stats);
            const ip = pitching.ip ? pitching.ip.toFixed(1) : '0.0';
            return `
                <tr>
                    <td>S${seasonEntry.season}</td>
                    <td>${batting.avg}</td>
                    <td>${batting.ops}</td>
                    <td>${seasonEntry.stats.homeRuns}</td>
                    <td>${pitching.era}</td>
                    <td>${seasonEntry.stats.pitcherEarnedRunsAllowed || 0}</td>
                    <td>${ip}</td>
                </tr>
            `;
        }).join('');
        return `
            <div class="modal-section">
                <div class="modal-section-title">Season History</div>
                <table class="season-table">
                    <thead>
                        <tr>
                            <th>Season</th>
                            <th>AVG</th>
                            <th>OPS</th>
                            <th>HR</th>
                            <th>ERA</th>
                            <th>ER</th>
                            <th>IP</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;
    }

    updateTeamStatsView() {
        const statsArea = document.getElementById('team-stats-area');
        const calendarArea = document.getElementById('calendar-area');
        const seasonInfoArea = document.getElementById('season-info-area');
        const tableBody = document.querySelector('#team-stats-table tbody');

        if (!statsArea || !tableBody) return;

        const mainContent = document.querySelector('.main-content');
        if (!mainContent || !mainContent.classList.contains('stats-mode')) {
            statsArea.style.display = 'none';
            return;
        }

        if (!this.league) {
            statsArea.style.display = 'none';
            if (calendarArea) calendarArea.style.display = 'none';
            if (seasonInfoArea) seasonInfoArea.style.display = 'block';
            return;
        }

        this.ensureTeamSeasonStats();
        statsArea.style.display = 'block';
        if (calendarArea) calendarArea.style.display = 'none';
        if (seasonInfoArea) seasonInfoArea.style.display = 'none';

        const teamStats = this.league.teams.map(team => {
            const stats = this.calculateTeamStats(team);
            return {
                team,
                ...stats
            };
        });

        const opsRank = [...teamStats].sort((a, b) => b.opsValue - a.opsValue);
        const eraRank = [...teamStats].sort((a, b) => a.eraValue - b.eraValue);

        const opsRankMap = new Map(opsRank.map((entry, index) => [entry.team.id, index + 1]));
        const eraRankMap = new Map(eraRank.map((entry, index) => [entry.team.id, index + 1]));

        const display = [...teamStats].sort((a, b) => opsRankMap.get(a.team.id) - opsRankMap.get(b.team.id));

        tableBody.innerHTML = '';
        display.forEach((entry, index) => {
            const tr = document.createElement('tr');
            if (entry.team.id === this.playerTeamId) tr.classList.add('player-team');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${entry.team.name}</td>
                <td>${entry.avg}</td>
                <td>${entry.ops}</td>
                <td>${entry.era}</td>
                <td>${entry.whip}</td>
                <td>${entry.runsFor}</td>
                <td>${entry.runsAgainst}</td>
                <td>${entry.ra9}</td>
                <td>${opsRankMap.get(entry.team.id)}</td>
                <td>${eraRankMap.get(entry.team.id)}</td>
            `;
            tableBody.appendChild(tr);
        });
    }

    calculateTeamStats(team) {
        const batters = [];
        team.lineup.forEach(entry => {
            if (!entry) return;
            batters.push(entry.player || entry);
        });

        const battingTotals = batters.reduce((acc, player) => {
            const perf = this.ensurePerformance(player).currentSeason;
            acc.plateAppearances += perf.plateAppearances;
            acc.atBats += perf.atBats;
            acc.hits += perf.hits;
            acc.singles += perf.singles;
            acc.doubles += perf.doubles;
            acc.triples += perf.triples;
            acc.homeRuns += perf.homeRuns;
            acc.walks += perf.walks || 0;
            acc.hitByPitch += perf.hitByPitch || 0;
            acc.sacFlies += perf.sacFlies || 0;
            return acc;
        }, {
            plateAppearances: 0,
            atBats: 0,
            hits: 0,
            singles: 0,
            doubles: 0,
            triples: 0,
            homeRuns: 0,
            walks: 0,
            hitByPitch: 0,
            sacFlies: 0
        });

        const batting = this.calculateBattingStats(battingTotals);

        const pitchers = team.roster.filter(player => player.position === 'P');
        const pitchingTotals = pitchers.reduce((acc, player) => {
            const perf = this.ensurePerformance(player).currentSeason;
            acc.pitcherOuts += perf.pitcherOuts || 0;
            acc.pitcherRunsAllowed += perf.pitcherRunsAllowed || 0;
            acc.pitcherEarnedRunsAllowed += perf.pitcherEarnedRunsAllowed || 0;
            acc.pitcherUnearnedRunsAllowed += perf.pitcherUnearnedRunsAllowed || 0;
            acc.pitcherHitsAllowed += perf.pitcherHitsAllowed || 0;
            acc.pitcherWalksAllowed += perf.pitcherWalksAllowed || 0;
            acc.pitcherHitByPitchAllowed += perf.pitcherHitByPitchAllowed || 0;
            return acc;
        }, {
            pitcherOuts: 0,
            pitcherRunsAllowed: 0,
            pitcherEarnedRunsAllowed: 0,
            pitcherUnearnedRunsAllowed: 0,
            pitcherHitsAllowed: 0,
            pitcherWalksAllowed: 0,
            pitcherHitByPitchAllowed: 0
        });

        const pitching = this.calculatePitchingStats(pitchingTotals);
        const teamSeason = this.teamSeasonStats[team.id] || { runsFor: 0, runsAgainst: 0 };
        const ip = pitchingTotals.pitcherOuts / 3;
        const ra9 = ip ? ((teamSeason.runsAgainst * 9) / ip).toFixed(2) : '0.00';

        return {
            avg: batting.avg,
            ops: batting.ops,
            era: pitching.era,
            whip: pitching.whip,
            runsFor: teamSeason.runsFor,
            runsAgainst: teamSeason.runsAgainst,
            ra9,
            opsValue: parseFloat(batting.ops),
            eraValue: parseFloat(pitching.era)
        };
    }

    finalizeSeasonStats(seasonNumber) {
        const players = this.getAllLeaguePlayers();
        players.forEach(player => {
            const perf = this.ensurePerformance(player);
            const current = perf.currentSeason;
            const hasActivity = current.games > 0 || current.plateAppearances > 0 || current.pitcherBattersFaced > 0;
            if (hasActivity) {
                perf.seasons.push({
                    season: seasonNumber,
                    stats: { ...current }
                });
            }
            perf.currentSeason = { ...Player.defaultPerformance().currentSeason };
        });
    }

    resetSeasonStatsForNewSeason() {
        const players = this.getAllLeaguePlayers();
        players.forEach(player => {
            const perf = this.ensurePerformance(player);
            perf.currentSeason = { ...Player.defaultPerformance().currentSeason };
        });
    }

    getAllLeaguePlayers() {
        const seen = new Map();
        const addPlayer = (player) => {
            if (!player || !player.id) return;
            seen.set(player.id, player);
        };

        this.roster.forEach(addPlayer);
        if (this.league) {
            this.league.teams.forEach(team => {
                team.roster.forEach(addPlayer);
                if (team.pitcher) addPlayer(team.pitcher);
            });
            this.league.freeAgents.forEach(addPlayer);
        }

        return [...seen.values()];
    }

    incrementGamesForTeam(team) {
        const players = [];
        team.lineup.forEach(entry => {
            if (!entry) return;
            const player = entry.player || entry;
            players.push(player);
        });
        if (team.pitcher) players.push(team.pitcher);
        players.forEach(player => {
            const perf = this.ensurePerformance(player);
            perf.currentSeason.games += 1;
        });
    }

    recordAtBat(batter, outcome) {
        const perf = this.ensurePerformance(batter);
        const current = perf.currentSeason;
        current.plateAppearances += 1;
        if (outcome.type === 'hit') {
            current.atBats += 1;
            current.hits += 1;
            if (outcome.desc.includes('Home Run')) {
                current.homeRuns += 1;
            } else if (outcome.desc.includes('Double')) {
                current.doubles += 1;
            } else if (outcome.desc.includes('Triple')) {
                current.triples += 1;
            } else {
                current.singles += 1;
            }
        } else if (outcome.type === 'walk') {
            current.walks += 1;
        } else if (outcome.type === 'hbp') {
            current.hitByPitch += 1;
        } else if (outcome.type === 'sac_fly') {
            current.outs += 1;
            current.sacFlies = (current.sacFlies || 0) + 1;
        } else if (outcome.type === 'out') {
            current.atBats += 1;
            current.outs += 1;
        }
    }

    recordPitcherOutcome(pitcher, outcome) {
        const perf = this.ensurePerformance(pitcher);
        const current = perf.currentSeason;
        current.pitcherBattersFaced += 1;
        if (outcome.type === 'hit') {
            current.pitcherHitsAllowed += 1;
        } else if (outcome.type === 'walk') {
            current.pitcherWalksAllowed += 1;
        } else if (outcome.type === 'hbp') {
            current.pitcherHitByPitchAllowed += 1;
        } else if (outcome.type === 'sac_fly') {
            current.pitcherOuts += 1;
        } else if (outcome.type === 'out') {
            current.pitcherOuts += 1;
        }
    }

    recordPitcherRun(pitcher, runs = 1, earned = true) {
        const perf = this.ensurePerformance(pitcher);
        perf.currentSeason.pitcherRunsAllowed += runs;
        if (earned) {
            perf.currentSeason.pitcherEarnedRunsAllowed += runs;
        } else {
            perf.currentSeason.pitcherUnearnedRunsAllowed += runs;
        }
    }

    scoutPlayers() {
        if (!this.league) {
            alert("Start the season before scouting.");
            return;
        }

        if (this.teamBudget < this.scoutCost) {
            alert("Not enough budget to scout right now.");
            return;
        }

        this.teamBudget -= this.scoutCost;
        this.updateBudgetUI();
        const newProspects = PlayerGenerator.createScoutingPool(this.rules, this.scoutCount);
        this.scoutingPool = [...this.scoutingPool, ...newProspects];
        this.renderScoutingList();
        this.saveGame();
        this.log(`Scouted ${this.scoutCount} prospects.`);
    }

    startDraft() {
        if (!this.league) return;

        this.draftActive = true;
        this.draftRound = 1;
        this.draftPickIndex = 0;
        const order = this.league.getDraftOrder();
        this.draftOrder = order.map(team => team.id);
        const totalPicks = this.draftOrder.length * this.maxDraftRounds;
        this.draftPool = PlayerGenerator.createDraftPool(this.rules, totalPicks);

        alert("Off-season draft has begun!");
        this.switchView('league');
        this.updateDraftUI();
        this.saveGame();
    }

    updateDraftUI() {
        const draftArea = document.getElementById('draft-area');
        const statusEl = document.getElementById('draft-status');
        const advanceBtn = document.getElementById('draft-advance-btn');
        const bestBtn = document.getElementById('draft-best-btn');
        const listEl = document.getElementById('draft-list');

        if (!draftArea) return;

        if (!this.draftActive) {
            draftArea.style.display = 'none';
            if (listEl) listEl.innerHTML = '';
            return;
        }

        draftArea.style.display = 'block';
        if (this.draftOrder.length === 0) {
            if (statusEl) statusEl.innerText = 'Draft order unavailable.';
            if (listEl) listEl.innerHTML = '';
            return;
        }
        const currentTeamId = this.draftOrder[this.draftPickIndex];
        const currentTeam = this.league.teams.find(t => t.id === currentTeamId);
        const isPlayerTurn = currentTeamId === this.playerTeamId;

        if (statusEl) {
            const teamName = currentTeam ? currentTeam.name : 'Unknown';
            statusEl.innerText = `ROUND ${this.draftRound} • PICK ${this.draftPickIndex + 1} • ${teamName}${isPlayerTurn ? ' (YOUR PICK)' : ''}`;
        }

        if (advanceBtn) advanceBtn.disabled = isPlayerTurn;
        if (bestBtn) bestBtn.disabled = !isPlayerTurn;

        if (listEl) {
            listEl.innerHTML = '';
            const sorted = [...this.draftPool].sort((a, b) => b.stats.overall - a.stats.overall);
            const preview = sorted.slice(0, 12);
            if (preview.length === 0) {
                listEl.innerHTML = '<div style="padding:10px; color:#888;">No prospects left</div>';
            } else {
                preview.forEach(player => {
                    const card = document.createElement('div');
                    card.className = `player-card ${player.position === 'P' ? 'pitcher-card' : ''}`;
                    card.title = this.buildPlayerTooltip(player, { includeCost: false, includePerformance: false });
                    const statsLine = player.position === 'P'
                        ? `PIT:${player.stats.pitching} SPD:${player.stats.speed}`
                        : `CON:${player.stats.contact} POW:${player.stats.power} SPD:${player.stats.speed} DEF:${player.stats.defense}`;

                    const actionHtml = isPlayerTurn ? '<button class="draft-pick-btn">DRAFT</button>' : '';

                    card.innerHTML = `
                        <div class="card-pos">${player.position}</div>
                        <div class="card-age">(${player.age})</div>
                        <div class="card-name">${player.name}</div>
                        <div class="card-stats">
                            OVR:${player.stats.overall} | ${statsLine}
                            ${actionHtml}
                        </div>
                    `;

                    if (isPlayerTurn) {
                        const btn = card.querySelector('.draft-pick-btn');
                        if (btn) {
                            btn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                this.draftPlayer(player.id);
                            });
                        }
                        card.addEventListener('click', () => {
                            this.openPlayerModal(player, {
                                showPerformance: false,
                                actionLabel: 'DRAFT',
                                action: () => this.draftPlayer(player.id)
                            });
                        });
                    } else {
                        card.addEventListener('click', () => this.openPlayerModal(player, { showPerformance: false }));
                    }

                    listEl.appendChild(card);
                });
            }
        }
    }

    draftBestAvailable() {
        if (!this.draftActive) return;
        const currentTeamId = this.draftOrder[this.draftPickIndex];
        if (currentTeamId !== this.playerTeamId) return;
        if (this.draftPool.length === 0) return;
        const best = [...this.draftPool].sort((a, b) => b.stats.overall - a.stats.overall)[0];
        this.draftPlayer(best.id);
    }

    advanceDraftPick() {
        if (!this.draftActive) return;
        const currentTeamId = this.draftOrder[this.draftPickIndex];
        if (currentTeamId === this.playerTeamId) {
            alert("It's your pick. Draft a player first.");
            return;
        }

        const best = [...this.draftPool].sort((a, b) => b.stats.overall - a.stats.overall)[0];
        if (best) {
            this.draftPlayer(best.id, true);
        }
    }

    draftPlayer(playerId, isAuto = false) {
        const player = this.draftPool.find(p => p.id === playerId);
        if (!player) return;

        const currentTeamId = this.draftOrder[this.draftPickIndex];
        const currentTeam = this.league.teams.find(t => t.id === currentTeamId);
        if (!currentTeam) return;

        if (currentTeamId === this.playerTeamId) {
            if (this.roster.length >= 30) {
                alert("Roster is full (Max 30). Release a player before drafting.");
                return;
            }
            this.roster.push(player);
            this.log(`Drafted ${player.name} (${player.position}).`);
        } else {
            currentTeam.roster.push(player);
            if (!isAuto) {
                this.log(`${currentTeam.name} drafted ${player.name}.`);
            }
        }

        this.draftPool = this.draftPool.filter(p => p.id !== playerId);
        this.advanceDraftState();
    }

    advanceDraftState() {
        this.draftPickIndex += 1;
        if (this.draftPickIndex >= this.draftOrder.length) {
            this.draftPickIndex = 0;
            this.draftRound += 1;
        }

        if (this.draftRound > this.maxDraftRounds || this.draftPool.length === 0) {
            this.finishDraft();
            return;
        }

        this.updateDraftUI();
        this.saveGame();
    }

    finishDraft() {
        this.draftActive = false;
        this.draftRound = 0;
        this.draftPickIndex = 0;
        this.draftOrder = [];
        this.draftPool = [];

        this.league.season++;
        this.league.currentRoundIndex = 0;
        this.league.generateSchedule();
        this.league.teams.forEach(t => {
            this.league.standings[t.id] = { w: 0, l: 0 };
        });

        this.resetSeasonStatsForNewSeason();
        this.initTeamSeasonStats();

        this.updateLeagueView();
        this.renderRosterAndMarket();
        this.saveGame();
        alert(`Season ${this.league.season} is about to begin!`);
    }
}
