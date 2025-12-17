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
        this.teamBudget = data.teamBudget || 5000000;
        this.playerTeamId = data.playerTeamId;
        this.currentRotationIndex = data.currentRotationIndex;
        this.rotationSize = data.rotationSize;

        // Re-hydrate Player objects
        const rehydrate = p => p ? new Player(p.id, p.name, p.position, p.age, p.stats) : null;

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


        // Manually update the UI to show the league view correctly
        const startBtn = document.getElementById('start-season-btn');
        const calendarArea = document.getElementById('calendar-area');
        if (startBtn) startBtn.style.display = 'none';
        if (calendarArea) calendarArea.style.display = 'block';

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

        // Options Button
        const optionsBtn = document.getElementById('options-btn');
        if (optionsBtn) optionsBtn.addEventListener('click', () => this.openOptions());

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
                    if (confirm(`Sign Free Agent ${player.name} for $${player.stats.signingBonus.toLocaleString()}?`)) {
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
                statsHtml = `CON:${player.stats.contact} POW:${player.stats.power} SPD:${player.stats.speed} DEF:${player.stats.defense}`;
            }

            if (isMarket) {
                statsHtml += ` | COST: $${player.stats.signingBonus.toLocaleString()}`;
            }

            card.innerHTML = `
                <div class="card-pos">${player.position} (${player.age})</div>
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

            const positions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
            const targetPos = positions[index];

            slot.addEventListener('drop', (e) => {
                e.preventDefault();
                slot.classList.remove('drag-over');
                const data = JSON.parse(e.dataTransfer.getData('application/json'));

                if (data.source === 'roster') {
                    const playerToAdd = this.roster.find(p => p.id === data.playerId);

                    if (playerToAdd) {
                        // Logic for flexible lineup
                        if (index === 8) { // DH
                            if (playerToAdd.position === 'P') {
                                alert("Pitchers cannot be DH!");
                                return;
                            }
                            this.setLineupSlot(index, playerToAdd);
                        } else {
                            if (playerToAdd.position !== targetPos) {
                                if (confirm(`Play ${playerToAdd.name} (${playerToAdd.position}) at ${targetPos}?`)) {
                                    this.setLineupSlot(index, playerToAdd);
                                }
                            } else {
                                this.setLineupSlot(index, playerToAdd);
                            }
                        }
                    }
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
                    <span class="player-pos" style="background: var(--accent-green); color: white; margin-right:5px;">${targetPos}</span>
                    <span class="player-name">${player.name}</span>
                    <span class="player-pos" style="font-size:0.8rem; opacity:0.7;">(${player.position})</span>
                    <button class="remove-btn">x</button>
                `;
                slot.querySelector('.remove-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.removeFromLineup(index);
                });
            } else {
                slot.className = 'empty-slot';
                slot.innerHTML = `<span style="color:var(--accent-green); font-weight:bold; margin-right:10px;">${targetPos}</span> Select Batter...`;
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
        // Check if all 9 slots are filled
        // this.lineup contains {player, role} or null
        return this.lineup.every(slot => slot !== null);
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

        const round = this.league.getCurrentRound();
        const myMatch = round.find(m => m.home.id === this.playerTeamId || m.away.id === this.playerTeamId);

        if (!myMatch) {
            this.log("No match scheduled for this round.");
            this.finishMatch();
            return;
        }

        // INITIALIZE SCOREBOARD
        const homeName = document.getElementById('score-home-name');
        const awayName = document.getElementById('score-away-name');
        if (homeName) homeName.innerText = myMatch.home.name;
        if (awayName) awayName.innerText = myMatch.away.name;

        // Highlight Player Team
        const sbHome = document.querySelector('.sb-team.home-team');
        const sbAway = document.querySelector('.sb-team.away-team');
        if (sbHome && sbAway) {
            sbHome.style.color = (myMatch.home.id === this.playerTeamId) ? 'var(--accent-green)' : 'white';
            sbAway.style.color = (myMatch.away.id === this.playerTeamId) ? 'var(--accent-green)' : 'white';
        }

        this.log(`MATCH STARTING! SP: ${starter.name} vs ${myMatch.home.id === this.playerTeamId ? myMatch.away.name : myMatch.home.name}`);
        document.getElementById('game-status-text').innerText = "PLAY BALL!";

        // 2. Simulate
        await this.simulateGame(myMatch, starter);
    }

    async simulateGame(match, starter) {
        // Visual Simulation
        const gameText = document.getElementById('game-status-text');
        const homeVal = document.getElementById('score-home-val');
        const awayVal = document.getElementById('score-away-val');
        const inningText = document.getElementById('sb-inning');

        if (gameText) gameText.innerText = "PLAYING...";

        let inning = 1;
        let homeScore = 0;
        let awayScore = 0;

        // Update Scoreboard Helper
        const updateUI = (inn, topBot) => {
            if (homeVal) homeVal.innerText = homeScore;
            if (awayVal) awayVal.innerText = awayScore;
            if (inningText) inningText.innerText = `${topBot ? 'TOP' : 'BOT'} ${inn}`;
            // Random Base Runners visual
            const bases = [1, 2, 3].filter(() => Math.random() > 0.7);
            document.querySelectorAll('.base').forEach(b => b.classList.remove('active'));
            bases.forEach(b => {
                const el = document.getElementById(`base-${b}`);
                if (el) el.classList.add('active');
            });
        };

        // Mock Simulation Loop
        while (inning <= 9) {
            // TOP (Away)
            updateUI(inning, true); // Top
            if (gameText) gameText.innerText = `TOP ${inning} - ${match.away.name} Batting`;
            await this.wait(400);

            // Random events
            if (Math.random() > 0.6) {
                awayScore += Math.floor(Math.random() * 3); // 0-2 runs
                this.log(`${match.away.name} scores!`);
            }

            // BOT (Home)
            updateUI(inning, false); // Bot
            if (gameText) gameText.innerText = `BOT ${inning} - ${match.home.name} Batting`;
            await this.wait(400);

            if (Math.random() > 0.6) {
                homeScore += Math.floor(Math.random() * 3);
                this.log(`${match.home.name} scores!`);
            }

            this.updateScoreboard(homeScore, awayScore); // Keep legacy updated too just in case
            inning++;
        }

        if (gameText) gameText.innerText = "MATCH FINISHED";
        if (homeVal) homeVal.innerText = homeScore;
        if (awayVal) awayVal.innerText = awayScore;

        this.finishMatch(homeScore, awayScore);
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

        this.saveGame();
    }

    advanceSeason() {
        alert("SEASON OVER! Proceeding to Off-Season for player development.");

        // Age all players and apply progression/regression
        const allPlayers = [...this.roster, ...this.league.freeAgents];
        allPlayers.forEach(player => {
            player.age++;
            this.rules.updatePlayerStatsForAge(player);
        });

        // Start a new season
        this.league.season++;
        this.league.currentRoundIndex = 0;
        this.league.generateSchedule(); // Regenerate schedule
        this.league.teams.forEach(t => { // Reset standings
            this.league.standings[t.id] = { w: 0, l: 0 };
        });


        // Refresh UI
        this.updateLeagueView();
        this.renderRosterAndMarket();
        this.saveGame();

        alert(`Season ${this.league.season} is about to begin!`);
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

        mainContent.classList.remove('league-mode', 'team-mode', 'match-mode');

        if (leagueBtn) leagueBtn.classList.remove('active');
        if (teamBtn) teamBtn.classList.remove('active');
        if (matchBtn) matchBtn.classList.remove('active');

        if (mode === 'team') {
            mainContent.classList.add('team-mode');
            if (teamBtn) teamBtn.classList.add('active');
        } else if (mode === 'match') {
            mainContent.classList.add('match-mode');
            if (matchBtn) matchBtn.classList.add('active');
        } else if (mode === 'league') {
            mainContent.classList.add('league-mode');
            if (leagueBtn) leagueBtn.classList.add('active');
        }
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
