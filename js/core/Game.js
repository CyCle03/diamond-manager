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
        this.teamBudget = 20000000; // Starting budget
        this.playerIsHomeInCurrentMatch = true;
        this.scoutCost = 75000;
        this.scoutCount = 3;
        this.scoutingLeadTimeGames = 2;
        this.maxDraftRounds = 5;
        this.scoutingPool = [];
        this.scoutingQueue = [];
        this.draftPool = [];
        this.draftActive = false;
        this.draftRound = 0;
        this.draftPickIndex = 0;
        this.draftOrder = [];
        this.teamSeasonStats = {};
        this.seasonGoals = [];
        this.scoutingQueue = [];
        this.simulationMode = 'auto';
        this.manualStepMode = 'batter';
        this.autoViewMode = 'batter';
        this.halfInningPausePending = false;
        this.simPitchDelayMs = 250;
        this.simBatterDelayMs = 600;
        this.pendingSimResolve = null;
        this.pendingSimType = null;
        this.teamStatsSortKey = 'ops';
        this.teamStatsSortDir = 'desc';
        this.batterRankSortKey = 'ops';
        this.batterRankSortDir = 'desc';
        this.pitcherRankSortKey = 'era';
        this.pitcherRankSortDir = 'asc';
        this.benchSortKey = 'overall';
        this.benchSortDir = 'desc';
        this.activeRosterLimit = 26;
        this.rosterFloor = 20;
        this.draftRosterLimit = 40;
        this.maxPitchersActive = 13;
        this.minPitchersActive = 9;
        this.minCatchersActive = 2;
        this.minInfieldByPosition = { '1B': 1, '2B': 1, '3B': 1, 'SS': 1 };
        this.minOutfieldActive = 4;
        this.fortyManLimit = 40;
        this.ilRoster = [];
        this.fortyManRoster = [];
        this.ilEligibleMinDays = 1;
        this.tradeDeadlineRound = null;
        this.tradeDeadlinePassed = false;
        this.postseason = null;
        this.postseasonActive = false;
        this.postseasonSeriesLengths = [3, 5];
        this.transactionsLogLimit = 80;
        this.aaaEnabledSeason = 3;
        this.aaaActive = false;
        this.aaaRoster = [];
        this.aaaRosterLimit = 26;
        this.aaaSalaryMultiplier = 0.25;
        this.aaaAutoManagement = true;
        this.aaaAutoPromotions = false;
        this.battingOrderState = new Map();
        this.isAutoSubstituting = false;
        this.currentLineScore = null;
        this.rosterView = 'roster';
        this.marketTab = 'fa';
        this.pitcherStamina = new Map();
        this.pitcherRestDays = new Map();
        this.pitcherWorkload = new Map();
        this.pitcherWorkloadHistory = new Map();
        this.pitcherPitchCount = new Map();
        this.currentMatch = null;
        this.bullpenRoles = ['Long Relief', 'Middle Relief', 'Setup', 'Closer', 'Opener'];
        this.autoBullpenEnabled = false;
        this.autoBullpenThreshold = 0.4;
        this.autoClearMatchLog = false;
        this.matchCompleted = false;
        this.matchSummary = null;
        this.currentPostseasonSeries = null;
        this.scheduleViewRoundIndex = null;
        this.scheduleFilter = 'all';
        this.currentMatchLog = [];
        this.matchLogSearchTerm = '';
        this.matchLogFilterMode = 'all';
        this.matchLogTeamFilter = 'all';
        this.matchLogInningFilter = 'all';
        this.multiRosterPanels = new Set(['roster', 'il', 'options']);

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

        const aaaAutoManage = document.getElementById('aaa-auto-manage');
        if (aaaAutoManage) {
            aaaAutoManage.addEventListener('change', (e) => {
                this.aaaAutoManagement = e.target.checked;
                this.saveGame();
            });
        }
        const aaaAutoPromote = document.getElementById('aaa-auto-promote');
        if (aaaAutoPromote) {
            aaaAutoPromote.addEventListener('change', (e) => {
                this.aaaAutoPromotions = e.target.checked;
                this.saveGame();
            });
        }
        const matchLogClearToggle = document.getElementById('match-log-auto-clear');
        if (matchLogClearToggle) {
            matchLogClearToggle.addEventListener('change', (e) => {
                this.autoClearMatchLog = e.target.checked;
                if (this.roster && this.roster.length > 0) {
                    this.saveGame();
                }
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
        this.updateAaaOptionsUI();
        this.updateMatchOptionsUI();
    }

    updateBudgetUI() {
        const budgetEl = document.getElementById('team-budget');
        if (budgetEl) {
            budgetEl.innerText = `BUDGET: $${this.teamBudget.toLocaleString()}`;
        }
    }

    updateAaaOptionsUI() {
        const autoManage = document.getElementById('aaa-auto-manage');
        const autoPromote = document.getElementById('aaa-auto-promote');
        const statusEl = document.getElementById('aaa-status');
        if (!autoManage || !autoPromote || !statusEl) return;
        const season = this.league ? this.league.season : 1;
        const isActive = season >= this.aaaEnabledSeason;
        autoManage.checked = !!this.aaaAutoManagement;
        autoPromote.checked = !!this.aaaAutoPromotions;
        autoManage.disabled = !isActive;
        autoPromote.disabled = !isActive;
        statusEl.innerText = isActive
            ? `AAA ACTIVE (Season ${season})`
            : `AAA unlocks in Season ${this.aaaEnabledSeason}`;
    }

    updateMatchOptionsUI() {
        const matchLogClearToggle = document.getElementById('match-log-auto-clear');
        if (matchLogClearToggle) {
            matchLogClearToggle.checked = !!this.autoClearMatchLog;
        }
    }

    openOptions() {
        document.getElementById('start-screen-overlay').style.display = 'flex';
        this.updateStartScreenUI();
        this.updateAaaOptionsUI();

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
            this.teamBudget = 20000000;
            this.currentRotationIndex = 0; // Explicitly reset for new game
            this.scoutingPool = [];
            this.draftPool = [];
            this.draftActive = false;
            this.draftRound = 0;
            this.draftPickIndex = 0;
            this.draftOrder = [];
            this.teamSeasonStats = {};
            this.aaaActive = false;
            this.aaaRoster = [];
            this.ilRoster = [];
            this.postseason = null;
            this.postseasonActive = false;
            this.tradeDeadlineRound = null;
            this.tradeDeadlinePassed = false;
            this.aaaAutoManagement = true;
            this.aaaAutoPromotions = false;
            const matchLogClearToggle = document.getElementById('match-log-auto-clear');
            this.autoClearMatchLog = matchLogClearToggle ? matchLogClearToggle.checked : false;
            // Generate initial roster
            this.roster = PlayerGenerator.createTeamRoster(this.rules, 26); // Full 26-man roster now
            this.roster.forEach(player => this.setPlayerRosterStatus(player, 'active'));
            this.fortyManRoster = this.roster.map(player => player.id);
            this.ensureRosterMinimums();
            this.ensureRosterHealth();
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
        this.switchView('home', 'view-home-btn');

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
            seasonGoals: this.seasonGoals,
            autoBullpenEnabled: this.autoBullpenEnabled,
            autoClearMatchLog: this.autoClearMatchLog,
            pitcherStamina: Array.from(this.pitcherStamina.entries()),
            pitcherRestDays: Array.from(this.pitcherRestDays.entries()),
            pitcherWorkloadHistory: Array.from(this.pitcherWorkloadHistory.entries()),
            scoutingQueue: this.scoutingQueue,
            aaaActive: this.aaaActive,
            aaaRoster: this.aaaRoster,
            aaaRosterLimit: this.aaaRosterLimit,
            aaaAutoManagement: this.aaaAutoManagement,
            aaaAutoPromotions: this.aaaAutoPromotions,
            ilRoster: this.ilRoster,
            fortyManRoster: this.fortyManRoster,
            transactionsLog: this.getPlayerTeam()?.transactionsLog || [],
            tradeDeadlineRound: this.tradeDeadlineRound,
            tradeDeadlinePassed: this.tradeDeadlinePassed,
            postseason: this.postseason,
            postseasonActive: this.postseasonActive,
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

        const rehydrate = p => {
            if (!p) return null;
            const player = new Player(p.id, p.name, p.position, p.age, p.stats, p.performance);
            player.optionsRemaining = typeof p.optionsRemaining === 'number' ? p.optionsRemaining : 3;
            player.rosterStatus = p.rosterStatus || 'active';
            player.serviceTimeYears = typeof p.serviceTimeYears === 'number' ? p.serviceTimeYears : 0;
            player.contract = p.contract || player.contract;
            if (p.health) player.health = { ...p.health };
            if (p.ilType) player.ilType = p.ilType;
            if (p.waiverInfo) player.waiverInfo = { ...p.waiverInfo };
            return player;
        };

        this.teamName = data.teamName;
        this.teamBudget = data.teamBudget || 20000000;
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
        this.seasonGoals = data.seasonGoals || [];
        this.autoBullpenEnabled = !!data.autoBullpenEnabled;
        this.autoClearMatchLog = !!data.autoClearMatchLog;
        this.pitcherStamina = new Map(data.pitcherStamina || []);
        this.pitcherRestDays = new Map(data.pitcherRestDays || []);
        this.pitcherWorkloadHistory = new Map(data.pitcherWorkloadHistory || []);
        this.scoutingQueue = (data.scoutingQueue || []).map(entry => ({
            gamesRemaining: entry.gamesRemaining,
            prospects: (entry.prospects || []).map(rehydrate)
        }));
        this.aaaActive = !!data.aaaActive;
        this.aaaRoster = (data.aaaRoster || []).map(rehydrate);
        this.aaaRosterLimit = data.aaaRosterLimit || this.aaaRosterLimit;
        this.aaaAutoManagement = data.aaaAutoManagement !== undefined ? data.aaaAutoManagement : true;
        this.aaaAutoPromotions = data.aaaAutoPromotions !== undefined ? data.aaaAutoPromotions : false;
        this.ilRoster = (data.ilRoster || []).map(rehydrate);
        this.fortyManRoster = (data.fortyManRoster || []).slice();
        this.tradeDeadlineRound = typeof data.tradeDeadlineRound === 'number' ? data.tradeDeadlineRound : null;
        this.tradeDeadlinePassed = !!data.tradeDeadlinePassed;
        this.postseason = data.postseason || null;
        this.postseasonActive = !!data.postseasonActive;

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
        this.league.waiverWire = (this.league.waiverWire || []).map(rehydrate);
        if (!this.league.waiverWire) this.league.waiverWire = [];
        const playerTeam = this.getPlayerTeam();
        if (playerTeam) {
            playerTeam.transactionsLog = data.transactionsLog || playerTeam.transactionsLog || [];
        }
        this.ensureRosterPerformance();
        this.ensureTeamSeasonStats();
        this.ensureBullpenRoles();
        this.ensurePitcherRestDays();
        this.ensureAllPlayerHealth();
        this.ensureSeasonGoals();
        this.ensureAAAInitialized();
        this.ensureFortyManRosterInitialized();
        this.syncPlayerTeamRosterState();
        this.rehydratePostseasonTeams();


        // Manually update the UI to show the league view correctly
        const startBtn = document.getElementById('start-season-btn');
        const calendarArea = document.getElementById('calendar-area');
        if (startBtn) startBtn.style.display = 'none';
        if (calendarArea) calendarArea.style.display = 'block';

        this.updateLeagueView();
        this.updateDraftUI();
        this.updateMatchOptionsUI();
        this.renderTransactions();
        this.updateHeaderIndicators();

        // Go to Home by default after load
        this.switchView('home', 'view-home-btn');
    }

    initUI() {
        // --- VIEW NAVIGATION ---
        const viewLeagueBtn = document.getElementById('view-league-btn');
        const viewTeamBtn = document.getElementById('view-team-btn');
        const viewRosterBtn = document.getElementById('view-roster-btn');
        const viewMarketBtn = document.getElementById('view-market-btn');
        const viewMatchBtn = document.getElementById('view-match-btn');
        const viewStatsBtn = document.getElementById('view-stats-btn');
        const viewHomeBtn = document.getElementById('view-home-btn');

        if (viewHomeBtn) viewHomeBtn.addEventListener('click', () => this.switchView('home', 'view-home-btn'));
        if (viewLeagueBtn) viewLeagueBtn.addEventListener('click', () => this.switchView('league'));
        if (viewTeamBtn) viewTeamBtn.addEventListener('click', () => this.switchView('team'));
        if (viewRosterBtn) viewRosterBtn.addEventListener('click', () => {
            this.setRosterView('roster');
            this.switchView('roster', 'view-roster-btn');
        });
        if (viewMarketBtn) viewMarketBtn.addEventListener('click', () => {
            this.setRosterView('market');
            this.setMarketTab('fa');
            this.switchView('market', 'view-market-btn');
        });
        if (viewMatchBtn) viewMatchBtn.addEventListener('click', () => this.switchView('match'));
        if (viewStatsBtn) viewStatsBtn.addEventListener('click', () => this.switchView('stats'));

        const homeStart = document.getElementById('home-start-season');
        if (homeStart) {
            homeStart.addEventListener('click', () => {
                if (this.league) {
                    this.switchView('league');
                } else {
                    this.startSeason();
                    this.switchView('league');
                }
            });
        }
        const homeLeague = document.getElementById('home-go-league');
        if (homeLeague) homeLeague.addEventListener('click', () => this.switchView('league'));
        const homeRoster = document.getElementById('home-go-roster');
        if (homeRoster) {
            homeRoster.addEventListener('click', () => {
                this.setRosterView('roster');
                this.switchView('roster', 'view-roster-btn');
            });
        }
        const homeMatch = document.getElementById('home-go-match');
        if (homeMatch) {
            homeMatch.addEventListener('click', () => {
                if (!this.league) {
                    this.startSeason();
                }
                this.switchView('match');
            });
        }

        const logSearch = document.getElementById('match-log-search');
        if (logSearch) {
            logSearch.addEventListener('input', (e) => {
                this.matchLogSearchTerm = e.target.value || '';
                this.renderMatchLogView();
            });
        }
        const logFilterAll = document.getElementById('match-log-filter-all');
        const logFilterHighlight = document.getElementById('match-log-filter-highlight');
        if (logFilterAll) {
            logFilterAll.addEventListener('click', () => {
                this.matchLogFilterMode = 'all';
                this.renderMatchLogView();
            });
        }
        if (logFilterHighlight) {
            logFilterHighlight.addEventListener('click', () => {
                this.matchLogFilterMode = 'highlight';
                this.renderMatchLogView();
            });
        }
        const logTeamAll = document.getElementById('match-log-team-all');
        const logTeamHome = document.getElementById('match-log-team-home');
        const logTeamAway = document.getElementById('match-log-team-away');
        if (logTeamAll) {
            logTeamAll.addEventListener('click', () => {
                this.matchLogTeamFilter = 'all';
                this.renderMatchLogView();
            });
        }
        if (logTeamHome) {
            logTeamHome.addEventListener('click', () => {
                this.matchLogTeamFilter = 'home';
                this.renderMatchLogView();
            });
        }
        if (logTeamAway) {
            logTeamAway.addEventListener('click', () => {
                this.matchLogTeamFilter = 'away';
                this.renderMatchLogView();
            });
        }
        const logInningSelect = document.getElementById('match-log-inning');
        if (logInningSelect) {
            logInningSelect.addEventListener('change', (e) => {
                const value = e.target.value;
                this.matchLogInningFilter = value === 'all' ? 'all' : parseInt(value, 10);
                this.renderMatchLogView();
            });
        }

        const scheduleOverlay = document.getElementById('schedule-log-overlay');
        if (scheduleOverlay) {
            scheduleOverlay.addEventListener('click', (e) => {
                if (e.target === scheduleOverlay) scheduleOverlay.classList.add('hidden');
            });
        }

        const scheduleSelect = document.getElementById('schedule-round-select');
        if (scheduleSelect) {
            scheduleSelect.addEventListener('change', (e) => {
                this.scheduleViewRoundIndex = parseInt(e.target.value, 10);
                this.renderSchedule();
            });
        }
        const scheduleFilterAll = document.getElementById('schedule-filter-all');
        const scheduleFilterMy = document.getElementById('schedule-filter-my');
        if (scheduleFilterAll) {
            scheduleFilterAll.addEventListener('click', () => {
                this.scheduleFilter = 'all';
                this.renderSchedule();
            });
        }
        if (scheduleFilterMy) {
            scheduleFilterMy.addEventListener('click', () => {
                this.scheduleFilter = 'my';
                this.renderSchedule();
            });
        }

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
                if (this.matchCompleted) {
                    this.resetMatchView();
                }
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

        const draftNeedBtn = document.getElementById('draft-need-btn');
        if (draftNeedBtn) draftNeedBtn.addEventListener('click', () => this.draftBestForNeed());

        this.initMatchControls();
        this.initPlayerModal();
        this.initStatsSorting();
        this.initBenchControls();
        this.initTradeControls();
        this.initRosterMarketNav();
        this.initRosterMultiControls();
        this.renderBullpen();
        this.updateHomeView();

    }

    renderRosterAndMarket() {
        this.syncPlayerTeamRosterState();
        this.ensureRosterHealth();
        this.renderList('#roster-list', this.roster, false);
        this.renderAaaList();
        this.renderIlList();
        this.renderOptionsList();
        this.renderFortyManList();
        this.renderWaiverList();
        this.updateHeaderIndicators();

        if (this.league) {
            this.renderList('#market-list', this.league.freeAgents, true);
        } else {
            const mList = document.querySelector('#market-list');
            if (mList) mList.innerHTML = '<div style="padding:10px; color:#888;">Start Season first</div>';
        }

        this.renderScoutingList();
        this.renderBullpen();
        this.renderBench();
        this.renderTradeUI();
        this.updateRosterMarketUI();
        this.renderPositionRankings();
    }

    renderList(selector, players, isMarket) {
        const container = document.querySelector(selector);
        if (!container) return;
        container.innerHTML = '';

        players.forEach(player => {
            const card = document.createElement('div');
            const injuryDays = player.health?.injuryDays || 0;
            const fatigue = player.health?.fatigue || 0;
            card.className = `player-card ${player.position === 'P' ? 'pitcher-card' : ''} ${injuryDays > 0 ? 'injured' : ''}`;
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
                    const isInjured = (player.health?.injuryDays || 0) > 0;
                    const primaryLabel = isInjured ? 'MOVE TO IL' : 'RELEASE';
                    const primaryAction = isInjured
                        ? () => this.movePlayerToIL(player, player.health.injuryDays >= 30 ? '60' : '10')
                        : () => {
                            if (confirm(`Release ${player.name}?`)) {
                                this.releasePlayer(player);
                            }
                        };
                    const secondaryLabel = isInjured
                        ? 'RELEASE'
                        : (this.aaaActive ? 'SEND TO AAA' : null);
                    const secondaryAction = isInjured
                        ? () => {
                            if (confirm(`Release ${player.name}?`)) {
                                this.releasePlayer(player);
                            }
                        }
                        : (this.aaaActive ? () => this.sendPlayerToAAA(player) : null);
                    this.openPlayerModal(player, {
                        showPerformance: true,
                        actionLabel: primaryLabel,
                        action: primaryAction,
                        secondaryActionLabel: secondaryLabel,
                        secondaryAction: secondaryAction
                    });
                }
            });


            let statsHtml = '';
            if (player.position === 'P') {
                const staminaDisplay = isMarket
                    ? Math.round(player.stats.stamina || 0)
                    : (() => {
                        const { current, max } = this.getPitcherStaminaValues(player);
                        return `${Math.round(current)}/${Math.round(max)}`;
                    })();
                statsHtml = `PIT:${player.stats.pitching} STA:${staminaDisplay} SPD:${player.stats.speed}`;
            } else {
                statsHtml = `CON:${player.stats.contact} POW:${player.stats.power} SPD:${player.stats.speed} DEF:${player.stats.defense}`;
            }

            if (isMarket) {
                statsHtml += ` | COST: $${player.stats.signingBonus.toLocaleString()}`;
            }

            const badges = [];
            if (injuryDays > 0) badges.push(`<span class="status-badge injury">INJ ${injuryDays}</span>`);
            if (fatigue >= 60) badges.push(`<span class="status-badge fatigue">FAT ${Math.round(fatigue)}</span>`);

            card.innerHTML = `
                <div class="card-pos">${player.position}</div>
                <div class="card-age">(${player.age})</div>
                <div class="card-name">${player.name}${badges.join('')}</div>
                <div class="card-stats">
                    ${statsHtml}
                </div>
            `;

            container.appendChild(card);
        });
    }

    renderAaaList() {
        const container = document.getElementById('aaa-list');
        if (!container) return;
        container.innerHTML = '';
        if (!this.aaaActive) {
            container.innerHTML = `<div style="padding:10px; color:#888;">AAA unlocks in Season ${this.aaaEnabledSeason}</div>`;
            return;
        }
        if (!this.aaaRoster || this.aaaRoster.length === 0) {
            container.innerHTML = '<div style="padding:10px; color:#888;">No AAA players</div>';
            return;
        }
        this.aaaRoster.forEach(player => {
            const card = document.createElement('div');
            const injuryDays = player.health?.injuryDays || 0;
            const fatigue = player.health?.fatigue || 0;
            card.className = `player-card ${player.position === 'P' ? 'pitcher-card' : ''} ${injuryDays > 0 ? 'injured' : ''}`;
            card.title = this.buildPlayerTooltip(player, { includeCost: false, includePerformance: true });
            const badges = [];
            if (injuryDays > 0) badges.push(`<span class="status-badge injury">INJ ${injuryDays}</span>`);
            if (fatigue >= 60) badges.push(`<span class="status-badge fatigue">FAT ${Math.round(fatigue)}</span>`);
            const statsHtml = player.position === 'P'
                ? `PIT:${player.stats.pitching} STA:${Math.round(player.stats.stamina || 0)} SPD:${player.stats.speed}`
                : `CON:${player.stats.contact} POW:${player.stats.power} SPD:${player.stats.speed} DEF:${player.stats.defense}`;

            card.innerHTML = `
                <div class="card-pos">${player.position}</div>
                <div class="card-age">(${player.age})</div>
                <div class="card-name">${player.name}${badges.join('')}</div>
                <div class="card-stats">
                    ${statsHtml}
                </div>
            `;
            card.addEventListener('click', () => {
                this.openPlayerModal(player, {
                    showPerformance: true,
                    actionLabel: 'CALL UP',
                    action: () => this.callUpPlayerFromAAA(player),
                    secondaryActionLabel: 'RELEASE',
                    secondaryAction: () => {
                        if (confirm(`Release ${player.name} from AAA?`)) {
                            this.releasePlayerFromAAA(player);
                        }
                    }
                });
            });
            container.appendChild(card);
        });
    }

    renderIlList() {
        const container = document.getElementById('il-list');
        if (!container) return;
        container.innerHTML = '';
        if (!this.ilRoster || this.ilRoster.length === 0) {
            container.innerHTML = '<div style="padding:10px; color:#888;">No players on IL</div>';
            return;
        }
        this.ilRoster.forEach(player => {
            const card = document.createElement('div');
            this.ensurePlayerHealth(player);
            const injuryDays = player.health?.injuryDays || 0;
            const fatigue = player.health?.fatigue || 0;
            const ilTag = player.ilType || '10';
            card.className = `player-card ${player.position === 'P' ? 'pitcher-card' : ''} ${injuryDays > 0 ? 'injured' : ''}`;
            card.title = this.buildPlayerTooltip(player, { includeCost: false, includePerformance: true });
            const badges = [];
            badges.push(`<span class="status-badge injury">IL${ilTag}</span>`);
            if (injuryDays > 0) badges.push(`<span class="status-badge injury">INJ ${injuryDays}</span>`);
            if (fatigue >= 60) badges.push(`<span class="status-badge fatigue">FAT ${Math.round(fatigue)}</span>`);
            const statsHtml = player.position === 'P'
                ? `PIT:${player.stats.pitching} STA:${Math.round(player.stats.stamina || 0)} SPD:${player.stats.speed}`
                : `CON:${player.stats.contact} POW:${player.stats.power} SPD:${player.stats.speed} DEF:${player.stats.defense}`;

            card.innerHTML = `
                <div class="card-pos">${player.position}</div>
                <div class="card-age">(${player.age})</div>
                <div class="card-name">${player.name}${badges.join('')}</div>
                <div class="card-stats">
                    ${statsHtml}
                </div>
            `;
            card.addEventListener('click', () => {
                this.openPlayerModal(player, {
                    showPerformance: true,
                    actionLabel: 'ACTIVATE',
                    action: () => this.activatePlayerFromIL(player)
                });
            });
            container.appendChild(card);
        });
    }

    renderOptionsList() {
        const container = document.getElementById('options-list');
        if (!container) return;
        container.innerHTML = '';
        const players = [...this.roster, ...this.aaaRoster, ...this.ilRoster];
        if (players.length === 0) {
            container.innerHTML = '<div style="padding:10px; color:#888;">No players available</div>';
            return;
        }
        players.forEach(player => {
            const card = document.createElement('div');
            const optionsLeft = typeof player.optionsRemaining === 'number' ? player.optionsRemaining : 0;
            const status = player.rosterStatus || (this.roster.includes(player) ? 'active' : 'aaa');
            const statusLabel = status.toUpperCase();
            card.className = `player-card ${player.position === 'P' ? 'pitcher-card' : ''}`;
            card.title = this.buildPlayerTooltip(player, { includeCost: false, includePerformance: true });
            const statsHtml = player.position === 'P'
                ? `PIT:${player.stats.pitching} STA:${Math.round(player.stats.stamina || 0)} SPD:${player.stats.speed}`
                : `CON:${player.stats.contact} POW:${player.stats.power} SPD:${player.stats.speed} DEF:${player.stats.defense}`;
            card.innerHTML = `
                <div class="card-pos">${player.position}</div>
                <div class="card-age">(${player.age})</div>
                <div class="card-name">${player.name}<span class="status-badge">${statusLabel}</span><span class="status-badge">OPT ${optionsLeft}</span></div>
                <div class="card-stats">
                    ${statsHtml}
                </div>
            `;
            container.appendChild(card);
        });
    }

    renderFortyManList() {
        const container = document.getElementById('forty-man-list');
        if (!container) return;
        container.innerHTML = '';
        if (!this.fortyManRoster || this.fortyManRoster.length === 0) {
            container.innerHTML = '<div style="padding:10px; color:#888;">No players on 40-man roster</div>';
            return;
        }

        const pool = new Map();
        [...this.roster, ...this.aaaRoster, ...this.ilRoster].forEach(player => {
            pool.set(player.id, player);
        });

        const players = this.fortyManRoster
            .map(id => pool.get(id))
            .filter(Boolean)
            .sort((a, b) => (a.position || '').localeCompare(b.position || ''));

        players.forEach(player => {
            const card = document.createElement('div');
            const status = player.rosterStatus || 'active';
            card.className = `player-card ${player.position === 'P' ? 'pitcher-card' : ''}`;
            card.title = this.buildPlayerTooltip(player, { includeCost: false, includePerformance: true });
            const statsHtml = player.position === 'P'
                ? `PIT:${player.stats.pitching} STA:${Math.round(player.stats.stamina || 0)} SPD:${player.stats.speed}`
                : `CON:${player.stats.contact} POW:${player.stats.power} SPD:${player.stats.speed} DEF:${player.stats.defense}`;
            card.innerHTML = `
                <div class="card-pos">${player.position}</div>
                <div class="card-age">(${player.age})</div>
                <div class="card-name">${player.name}<span class="status-badge">${status.toUpperCase()}</span></div>
                <div class="card-stats">
                    ${statsHtml}
                </div>
            `;
            container.appendChild(card);
        });
    }

    renderWaiverList() {
        const container = document.getElementById('waiver-list');
        if (!container) return;
        container.innerHTML = '';
        if (!this.league || !this.league.waiverWire || this.league.waiverWire.length === 0) {
            container.innerHTML = '<div style="padding:10px; color:#888;">No players on waivers</div>';
            this.updateHeaderIndicators();
            return;
        }
        this.league.waiverWire.forEach(player => {
            const card = document.createElement('div');
            const optionsLeft = typeof player.optionsRemaining === 'number' ? player.optionsRemaining : 0;
            const waiverInfo = player.waiverInfo || {};
            const expiresRound = waiverInfo.expiresRound || '-';
            card.className = `player-card ${player.position === 'P' ? 'pitcher-card' : ''}`;
            card.title = this.buildPlayerTooltip(player, { includeCost: false, includePerformance: true });
            const statsHtml = player.position === 'P'
                ? `PIT:${player.stats.pitching} STA:${Math.round(player.stats.stamina || 0)} SPD:${player.stats.speed}`
                : `CON:${player.stats.contact} POW:${player.stats.power} SPD:${player.stats.speed} DEF:${player.stats.defense}`;
            card.innerHTML = `
                <div class="card-pos">${player.position}</div>
                <div class="card-age">(${player.age})</div>
                <div class="card-name">${player.name}<span class="status-badge">OPT ${optionsLeft}</span></div>
                <div class="card-stats">
                    ${statsHtml} | EXPIRES: R${expiresRound}
                </div>
            `;
            const claimBtn = document.createElement('button');
            claimBtn.className = 'cyber-button compact';
            claimBtn.innerText = 'CLAIM';
            const rosterFull = this.roster.length >= this.activeRosterLimit || this.getFortyManCount() >= this.fortyManLimit;
            const ownWaiver = waiverInfo.originTeamId === this.playerTeamId;
            claimBtn.disabled = rosterFull || ownWaiver;
            claimBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.claimWaiverPlayer(player);
            });
            card.appendChild(claimBtn);
            container.appendChild(card);
        });
        this.updateHeaderIndicators();
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
            const pendingCount = (this.scoutingQueue || []).reduce((sum, entry) => sum + (entry.prospects ? entry.prospects.length : 0), 0);
            if (pendingCount > 0) {
                const nextReady = Math.min(...this.scoutingQueue.map(entry => entry.gamesRemaining));
                statusEl.innerText = `Scouting in progress: ${pendingCount} prospects • ${nextReady} game(s) remaining`;
            } else {
                statusEl.innerText = `Find ${this.scoutCount} prospects • $${this.scoutCost.toLocaleString()}`;
            }
        }
        if (scoutBtn) {
            scoutBtn.innerText = `SCOUT ($${this.scoutCost.toLocaleString()})`;
            scoutBtn.disabled = this.teamBudget < this.scoutCost;
        }

        container.innerHTML = '';
        if (this.scoutingPool.length === 0) {
            if (this.scoutingQueue && this.scoutingQueue.length > 0) {
                const nextReady = Math.min(...this.scoutingQueue.map(entry => entry.gamesRemaining));
                container.innerHTML = `<div style="padding:10px; color:#888;">Scouting reports ready in ${nextReady} game(s)</div>`;
            } else {
                container.innerHTML = '<div style="padding:10px; color:#888;">No scouting reports yet</div>';
            }
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
                        if (player.health?.injuryDays > 0) {
                            alert(`${player.name} is injured and cannot pitch.`);
                            return;
                        }
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
                slot.dataset.pitcherId = p.id;
                const { current, max } = this.getPitcherStaminaValues(p);
                const injuryDays = p.health?.injuryDays || 0;
                if (injuryDays > 0) slot.classList.add('injured');
                const injuryBadge = injuryDays > 0 ? `<span class="status-badge injury">INJ ${injuryDays}</span>` : '';

                slot.innerHTML = `
                    <span class="order-num">SP${i + 1}</span>
                    <span class="player-name">${p.name}${injuryBadge}</span>
                    <span class="player-pos">P</span>
                    <span class="player-stamina" data-stamina-for="${p.id}">STA ${Math.round(current)}/${Math.round(max)}</span>
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

        this.updatePitcherStaminaBadges();
    }

    renderBullpen() {
        const container = document.getElementById('bullpen-list');
        if (!container) return;
        container.innerHTML = '';

        this.autoAssignBullpenRoles();

        const bullpen = this.getBullpenPitchers();
        if (bullpen.length === 0) {
            container.innerHTML = '<div style="padding:6px; color:#777;">No bullpen pitchers</div>';
            return;
        }

        bullpen.forEach(player => {
            this.ensureBullpenRole(player);
            const card = document.createElement('div');
            card.className = 'bullpen-card';
            card.dataset.pitcherId = player.id;
            const select = document.createElement('select');
            this.bullpenRoles.forEach(role => {
                const option = document.createElement('option');
                option.value = role;
                option.textContent = role;
                if (player.bullpenRole === role) option.selected = true;
                select.appendChild(option);
            });
            select.addEventListener('change', (e) => {
                player.bullpenRole = e.target.value;
                this.saveGame();
            });
            const { current, max } = this.getPitcherStaminaValues(player);
            card.innerHTML = `
                <div class="bullpen-meta">
                    <div class="bullpen-name">${player.name}</div>
                    <div class="bullpen-stamina" data-stamina-for="${player.id}">STA ${Math.round(current)}/${Math.round(max)}</div>
                </div>
            `;
            card.appendChild(select);
            container.appendChild(card);
        });

        this.updateBullpenSelect();
        this.updatePitcherStaminaBadges();
    }

    addToLineup(player) {
        if (player.health?.injuryDays > 0) {
            alert(`${player.name} is injured and cannot be added to the lineup.`);
            return;
        }
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
        const getStarterScore = (p) => (p.stats.pitching * 0.75) + ((p.stats.stamina || 0) * 0.25);
        const allPitchers = this.roster
            .filter(p => p.position === 'P')
            .sort((a, b) => getStarterScore(b) - getStarterScore(a));
        const healthyPitchers = allPitchers.filter(p => (p.health?.injuryDays || 0) === 0);
        const pitcherPool = healthyPitchers.length >= this.rotationSize ? healthyPitchers : allPitchers;
        this.rotation = new Array(this.rotationSize).fill(null);
        for (let i = 0; i < this.rotationSize; i++) {
            if (pitcherPool[i]) this.rotation[i] = pitcherPool[i];
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
        const healthyBatters = this.roster.filter(p => p.position !== 'P' && (p.health?.injuryDays || 0) === 0);
        const batterPool = healthyBatters.length >= 9 ? healthyBatters : this.roster.filter(p => p.position !== 'P');
        positionsNeeded.forEach(pos => {
            const candidates = batterPool.filter(p => p.position === pos && !usedIds.has(p.id))
                .sort((a, b) => getRating(b) - getRating(a));
            let pick = null;
            if (candidates.length > 0) {
                pick = candidates[0];
            } else {
                // Fallback
                const fallback = batterPool.filter(p => p.position !== 'P' && !usedIds.has(p.id))
                    .sort((a, b) => getRating(b) - getRating(a));
                if (fallback.length > 0) pick = fallback[0];
            }

            if (pick) {
                selectedEntries.push({ player: pick, role: pos });
                usedIds.add(pick.id);
            }
        });

        // B. Fill DH
        const dhCandidates = batterPool.filter(p => p.position !== 'P' && !usedIds.has(p.id))
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
        this.renderBench();
    }

    renderBench() {
        const container = document.getElementById('bench-list');
        if (!container) return;
        container.innerHTML = '';

        const lineupIds = new Set(
            this.lineup
                .filter(entry => entry && entry.player)
                .map(entry => entry.player.id)
        );
        const bench = this.roster.filter(player => player.position !== 'P' && !lineupIds.has(player.id));

        if (bench.length === 0) {
            container.innerHTML = '<div style="padding:6px; color:#777;">No bench batters</div>';
            return;
        }

        const benchData = bench.map(player => {
            const perf = this.ensurePerformance(player).currentSeason;
            const batting = this.calculateBattingStats(perf);
            return { player, perf, batting };
        });

        const getSortValue = (entry) => {
            const { player, perf, batting } = entry;
            switch (this.benchSortKey) {
                case 'ops':
                    return parseFloat(batting.ops);
                case 'avg':
                    return parseFloat(batting.avg);
                case 'hr':
                    return perf.homeRuns || 0;
                case 'contact':
                    return player.stats.contact;
                case 'power':
                    return player.stats.power;
                case 'speed':
                    return player.stats.speed;
                case 'age':
                    return player.age;
                case 'name':
                    return player.name;
                case 'overall':
                default:
                    return player.stats.overall;
            }
        };

        benchData.sort((a, b) => {
            const aVal = getSortValue(a);
            const bVal = getSortValue(b);
            if (typeof aVal === 'string') {
                return this.benchSortDir === 'asc'
                    ? aVal.localeCompare(bVal)
                    : bVal.localeCompare(aVal);
            }
            return this.benchSortDir === 'asc' ? aVal - bVal : bVal - aVal;
        });

        benchData.forEach(({ player, perf, batting }) => {
            const card = document.createElement('div');
            const injuryDays = player.health?.injuryDays || 0;
            const fatigue = player.health?.fatigue || 0;
            const badges = [];
            if (injuryDays > 0) badges.push(`<span class="status-badge injury">INJ ${injuryDays}</span>`);
            if (fatigue >= 60) badges.push(`<span class="status-badge fatigue">FAT ${Math.round(fatigue)}</span>`);
            card.className = `bench-card ${injuryDays > 0 ? 'injured' : ''}`;
            card.draggable = true;
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({
                    source: 'roster',
                    playerId: player.id
                }));
            });
            card.addEventListener('click', () => {
                this.openPlayerModal(player, {
                    showPerformance: true,
                    actionLabel: 'RELEASE',
                    action: () => {
                        if (confirm(`Release ${player.name}?`)) {
                            this.releasePlayer(player);
                        }
                    }
                });
            });
            card.innerHTML = `
                <div class="bench-meta">
                    <span class="bench-pos">${player.position}</span>
                    <span class="bench-name">${player.name}</span>
                    <span class="bench-age">(${player.age})</span>
                    ${badges.join('')}
                </div>
                <div class="bench-stats">OVR ${player.stats.overall} | AVG ${batting.avg} | OPS ${batting.ops} | HR ${perf.homeRuns || 0}</div>
                <div class="bench-stats">CON ${player.stats.contact} | POW ${player.stats.power} | SPD ${player.stats.speed}</div>
            `;
            container.appendChild(card);
        });
    }

    validateLineup() {
        const compliance = this.isRosterCompliant(this.roster);
        if (!compliance.ok) {
            alert(`Roster not MLB compliant: ${compliance.issues.join(' ')}`);
            return false;
        }
        const starter = this.rotation[this.currentRotationIndex];
        if (!starter) {
            alert(`No Starting Pitcher set for slot SP${this.currentRotationIndex + 1}!`);
            return false;
        }
        if (starter.health?.injuryDays > 0) {
            alert(`${starter.name} is injured and cannot start.`);
            return false;
        }
        const injured = this.lineup.find(slot => slot && slot.player && slot.player.health?.injuryDays > 0);
        if (injured) {
            alert(`${injured.player.name} is injured and cannot play.`);
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
                        if (player.health?.injuryDays > 0) {
                            alert(`${player.name} is injured and cannot be added to the lineup.`);
                            return;
                        }
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
                const injuryDays = player.health?.injuryDays || 0;
                if (injuryDays > 0) slot.classList.add('injured');
                const injuryBadge = injuryDays > 0 ? `<span class=\"status-badge injury\">INJ ${injuryDays}</span>` : '';

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
                    <span class="player-name">${player.name}${injuryBadge}</span>
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
        if (this.roster.length >= this.activeRosterLimit) {
            alert(`Roster is full (Max ${this.activeRosterLimit})!`);
            return;
        }
        if (this.getFortyManCount() >= this.fortyManLimit) {
            alert(`40-man roster is full (Max ${this.fortyManLimit}).`);
            return;
        }
        if (!this.canAddPlayerToRoster(player)) {
            alert("Roster limit reached for this position (pitchers max 13).");
            return;
        }

        const cost = player.stats.signingBonus;
        const salaryCharge = this.getProratedSalaryCharge(player.stats.salary || 0);
        const totalCharge = cost + salaryCharge;
        if (this.teamBudget < totalCharge) {
            alert("Not enough budget to sign this player!");
            return;
        }

        this.teamBudget -= cost;
        if (salaryCharge > 0) {
            this.teamBudget -= salaryCharge;
            this.log(`Prorated salary of $${salaryCharge.toLocaleString()} charged for ${player.name}.`);
        }
        this.updateBudgetUI();

        // Move from FA to Roster
        this.ensurePlayerHealth(player);
        this.setPlayerRosterStatus(player, 'active');
        this.addToFortyManRoster(player);
        this.roster.push(player);
        this.league.freeAgents = this.league.freeAgents.filter(p => p.id !== player.id);
        alert(`Signed ${player.name}!`);
        this.ensureRosterCompliance();
        this.renderRosterAndMarket();
        this.logTransaction('SIGN FA', player, `$${player.stats.signingBonus.toLocaleString()}`);
        this.saveGame();
    }

    signScoutedPlayer(player) {
        if (this.roster.length >= this.activeRosterLimit) {
            alert(`Roster is full (Max ${this.activeRosterLimit})!`);
            return;
        }
        if (this.getFortyManCount() >= this.fortyManLimit) {
            alert(`40-man roster is full (Max ${this.fortyManLimit}).`);
            return;
        }
        if (!this.canAddPlayerToRoster(player)) {
            alert("Roster limit reached for this position (pitchers max 13).");
            return;
        }

        const cost = player.stats.signingBonus;
        if (this.teamBudget < cost) {
            alert("Not enough budget to sign this player!");
            return;
        }

        this.teamBudget -= cost;
        this.updateBudgetUI();

        this.ensurePlayerHealth(player);
        this.setPlayerRosterStatus(player, 'active');
        this.addToFortyManRoster(player);
        this.roster.push(player);
        this.scoutingPool = this.scoutingPool.filter(p => p.id !== player.id);
        alert(`Signed ${player.name}!`);
        this.ensureRosterCompliance();
        this.renderRosterAndMarket();
        this.logTransaction('SIGN SCOUT', player, `$${player.stats.signingBonus.toLocaleString()}`);
        this.saveGame();
    }

    releasePlayer(player) {
        if (!this.releasePlayerFromTeam(this.getPlayerTeam(), player, { enforceMinRoster: true })) {
            return;
        }
        alert(`Released ${player.name}.`);

        // Re-render UI
        this.renderRosterAndMarket();
        this.renderLineup();
        this.renderRotation();
        this.logTransaction('RELEASE', player);

        // Save game
        this.saveGame();
    }

    releasePlayerFromTeam(team, player, options = {}) {
        if (!team || !player) return false;
        const enforceMinRoster = !!options.enforceMinRoster;
        const addToFreeAgents = options.addToFreeAgents !== false;
        if (team.id === this.playerTeamId && enforceMinRoster && this.roster.length <= this.rosterFloor) {
            alert(`Cannot release player. Roster is at the minimum size of ${this.rosterFloor}.`);
            return false;
        }

        team.roster = team.roster.filter(p => p.id !== player.id);
        if (team.id === this.playerTeamId) {
            this.roster = this.roster.filter(p => p.id !== player.id);
            this.lineup = this.lineup.map(slot => (slot && slot.player.id === player.id) ? null : slot);
            this.rotation = this.rotation.map(p => (p && p.id === player.id) ? null : p);
            this.removeFromFortyManRoster(player);
        } else if (team.lineup) {
            team.lineup = team.lineup.map(entry => {
                const p = entry && entry.player ? entry.player : entry;
                if (p && p.id === player.id) return null;
                return entry;
            }).filter(Boolean);
        }
        if (team.fortyManRoster) {
            team.fortyManRoster = team.fortyManRoster.filter(id => id !== player.id);
        }
        if (team.pitcher && team.pitcher.id === player.id) {
            team.pitcher = team.roster.find(p => p.position === 'P') || team.roster[0] || null;
        }

        if (addToFreeAgents && this.league && this.league.freeAgents) {
            const exists = this.league.freeAgents.some(p => p.id === player.id);
            if (!exists) this.league.freeAgents.push(player);
            this.setPlayerRosterStatus(player, 'fa');
        }
        return true;
    }

    movePlayerToIL(player, ilType = '10') {
        if (!player) return false;
        this.ensurePlayerHealth(player);
        if ((player.health.injuryDays || 0) < this.ilEligibleMinDays) {
            alert('Player is not injured.');
            return false;
        }
        const removed = this.releasePlayerFromTeam(this.getPlayerTeam(), player, { enforceMinRoster: false, addToFreeAgents: false });
        if (!removed) return false;
        player.ilType = ilType;
        this.setPlayerRosterStatus(player, 'il');
        this.ilRoster.push(player);
        if (ilType === '60') {
            this.removeFromFortyManRoster(player);
        } else {
            this.addToFortyManRoster(player);
        }
        this.ensureFortyManLimit();
        this.renderRosterAndMarket();
        this.renderLineup();
        this.renderRotation();
        this.logTransaction('IL', player, `IL${ilType}`);
        this.saveGame();
        return true;
    }

    activatePlayerFromIL(player) {
        if (!player) return false;
        this.ensurePlayerHealth(player);
        if (player.health.injuryDays > 0) {
            alert('Player is still injured.');
            return false;
        }
        if (this.roster.length >= this.activeRosterLimit) {
            alert(`Roster is full (Max ${this.activeRosterLimit}).`);
            return false;
        }
        const needsFortyMan = player.ilType === '60' && !(this.fortyManRoster || []).includes(player.id);
        if (needsFortyMan && this.getFortyManCount() >= this.fortyManLimit) {
            alert(`40-man roster is full (Max ${this.fortyManLimit}).`);
            return false;
        }
        this.ilRoster = this.ilRoster.filter(p => p.id !== player.id);
        delete player.ilType;
        this.setPlayerRosterStatus(player, 'active');
        this.addToFortyManRoster(player);
        this.roster.push(player);
        this.ensureRosterCompliance();
        this.renderRosterAndMarket();
        this.logTransaction('ACTIVATE', player);
        this.saveGame();
        return true;
    }

    sendPlayerToAAA(player, options = {}) {
        if (!this.aaaActive) {
            alert("AAA is not active yet.");
            return false;
        }
        if (this.aaaRoster.length >= this.aaaRosterLimit && !options.allowRelease) {
            alert("AAA roster is full.");
            return false;
        }
        if (this.roster.length <= this.rosterFloor && !options.silent) {
            alert(`Cannot demote below ${this.rosterFloor} players.`);
            return false;
        }
        const removed = this.releasePlayerFromTeam(this.getPlayerTeam(), player, { enforceMinRoster: false, addToFreeAgents: false });
        if (!removed) return false;
        const skipOptions = !!options.skipOptions;
        player.optionsRemaining = typeof player.optionsRemaining === 'number' ? player.optionsRemaining : 0;
        if (!skipOptions && player.optionsRemaining > 0) {
            player.optionsRemaining -= 1;
            this.setPlayerRosterStatus(player, 'aaa');
            if (this.aaaRoster.length >= this.aaaRosterLimit && options.allowRelease) {
                this.league.freeAgents.push(player);
                this.setPlayerRosterStatus(player, 'fa');
                this.removeFromFortyManRoster(player);
            } else {
                this.aaaRoster.push(player);
            }
            if (!options.silent) {
                this.log(`${player.name} optioned to AAA. Options left: ${player.optionsRemaining}.`);
                this.logTransaction('OPTION', player, `Options left ${player.optionsRemaining}`);
            }
        } else if (!skipOptions) {
            this.placePlayerOnWaivers(player);
            if (!options.silent) {
                this.log(`${player.name} placed on waivers.`);
                this.logTransaction('WAIVERS', player);
            }
        } else {
            this.setPlayerRosterStatus(player, 'aaa');
            if (this.aaaRoster.length >= this.aaaRosterLimit && options.allowRelease) {
                this.league.freeAgents.push(player);
                this.setPlayerRosterStatus(player, 'fa');
                this.removeFromFortyManRoster(player);
            } else {
                this.aaaRoster.push(player);
            }
        }
        this.renderRosterAndMarket();
        this.renderLineup();
        this.renderRotation();
        this.saveGame();
        return true;
    }

    placePlayerOnWaivers(player) {
        if (!this.league || !player) return;
        player.waiverInfo = {
            originTeamId: this.playerTeamId,
            expiresRound: (this.league.currentRoundIndex || 0) + 2
        };
        this.setPlayerRosterStatus(player, 'waivers');
        this.removeFromFortyManRoster(player);
        if (!this.league.waiverWire) this.league.waiverWire = [];
        this.league.waiverWire.push(player);
    }

    claimWaiverPlayer(player) {
        if (!this.league || !player) return false;
        if (this.roster.length >= this.activeRosterLimit) {
            alert(`Roster is full (Max ${this.activeRosterLimit}).`);
            return false;
        }
        if (this.getFortyManCount() >= this.fortyManLimit) {
            alert(`40-man roster is full (Max ${this.fortyManLimit}).`);
            return false;
        }
        this.league.waiverWire = (this.league.waiverWire || []).filter(p => p.id !== player.id);
        delete player.waiverInfo;
        this.setPlayerRosterStatus(player, 'active');
        this.addToFortyManRoster(player);
        this.roster.push(player);
        this.log(`${player.name} claimed off waivers.`);
        this.logTransaction('CLAIM', player);
        this.renderRosterAndMarket();
        this.saveGame();
        return true;
    }

    processWaiverWire() {
        if (!this.league || !this.league.waiverWire || this.league.waiverWire.length === 0) return;
        const currentRound = this.league.currentRoundIndex + 1;
        const standings = this.league.getSortedStandings();
        const claimOrder = [...standings].reverse().filter(team => team.id !== this.playerTeamId);
        const remaining = [];

        this.league.waiverWire.forEach(player => {
            const waiverInfo = player.waiverInfo || { originTeamId: null, expiresRound: currentRound };
            let claimedBy = null;
            claimOrder.forEach(team => {
                if (claimedBy) return;
                if (team.id === waiverInfo.originTeamId) return;
                const recordGames = (team.w || 0) + (team.l || 0);
                const pct = recordGames > 0 ? team.w / recordGames : 0.5;
                const claimChance = Math.min(0.7, Math.max(0.2, 0.55 - pct));
                if (Math.random() < claimChance) {
                    claimedBy = team;
                }
            });

            if (claimedBy) {
                delete player.waiverInfo;
                this.setPlayerRosterStatus(player, 'active');
                if (claimedBy.id === this.playerTeamId) {
                    this.addToFortyManRoster(player);
                    this.roster.push(player);
                } else {
                    if (waiverInfo.originTeamId === this.playerTeamId) {
                        this.removeFromFortyManRoster(player);
                    }
                    claimedBy.roster.push(player);
                    if (claimedBy.fortyManRoster && !claimedBy.fortyManRoster.includes(player.id)) {
                        claimedBy.fortyManRoster.push(player.id);
                    }
                }
                this.enforceRosterLimitsForTeam(claimedBy);
                return;
            }

            if (waiverInfo.expiresRound && currentRound >= waiverInfo.expiresRound) {
                delete player.waiverInfo;
                if (waiverInfo.originTeamId === this.playerTeamId) {
                    if (this.aaaActive && this.aaaRoster.length < this.aaaRosterLimit) {
                        this.setPlayerRosterStatus(player, 'aaa');
                        this.aaaRoster.push(player);
                    } else {
                        this.setPlayerRosterStatus(player, 'fa');
                        this.league.freeAgents.push(player);
                        this.removeFromFortyManRoster(player);
                    }
                } else {
                    this.setPlayerRosterStatus(player, 'fa');
                    this.league.freeAgents.push(player);
                }
                return;
            }

            remaining.push(player);
        });

        this.league.waiverWire = remaining;
        this.renderWaiverList();
    }

    callUpPlayerFromAAA(player, options = {}) {
        if (this.roster.length >= this.activeRosterLimit) {
            if (!options.silent) alert(`Roster is full (Max ${this.activeRosterLimit}).`);
            return false;
        }
        if (!this.canAddPlayerToRoster(player)) {
            if (!options.silent) alert("Roster limit reached for this position (pitchers max 13).");
            return false;
        }
        this.aaaRoster = this.aaaRoster.filter(p => p.id !== player.id);
        this.setPlayerRosterStatus(player, 'active');
        this.addToFortyManRoster(player);
        this.roster.push(player);
        if (!options.silent) {
            this.log(`${player.name} was called up from AAA.`);
            this.logTransaction('CALL UP', player);
        }
        this.renderRosterAndMarket();
        this.saveGame();
        return true;
    }

    releasePlayerFromAAA(player, options = {}) {
        this.aaaRoster = this.aaaRoster.filter(p => p.id !== player.id);
        if (this.league && this.league.freeAgents) {
            this.league.freeAgents.push(player);
        }
        this.setPlayerRosterStatus(player, 'fa');
        this.removeFromFortyManRoster(player);
        if (!options.silent) {
            this.log(`${player.name} was released from AAA.`);
            this.logTransaction('RELEASE AAA', player);
        }
        this.renderRosterAndMarket();
        this.saveGame();
    }

    getRosterCounts(roster) {
        const counts = {
            total: roster.length,
            P: 0,
            C: 0,
            OF: 0,
            '1B': 0,
            '2B': 0,
            '3B': 0,
            'SS': 0
        };
        roster.forEach(player => {
            if (!player) return;
            if (player.position === 'P') counts.P += 1;
            if (player.position === 'C') counts.C += 1;
            if (['LF', 'CF', 'RF'].includes(player.position)) counts.OF += 1;
            if (['1B', '2B', '3B', 'SS'].includes(player.position)) {
                counts[player.position] += 1;
            }
        });
        return counts;
    }

    getFortyManCount() {
        if (!this.fortyManRoster || this.fortyManRoster.length === 0) {
            this.rebuildFortyManRoster();
        }
        return (this.fortyManRoster || []).length;
    }

    rebuildFortyManRoster() {
        const ids = new Set();
        this.roster.forEach(player => ids.add(player.id));
        this.ilRoster.forEach(player => {
            if (player.ilType !== '60') ids.add(player.id);
        });
        this.fortyManRoster = [...ids];
    }

    ensureFortyManRosterInitialized() {
        if (!this.fortyManRoster || this.fortyManRoster.length === 0) {
            this.rebuildFortyManRoster();
        }
    }

    addToFortyManRoster(player) {
        if (!player) return;
        if (!this.fortyManRoster) this.fortyManRoster = [];
        if (!this.fortyManRoster.includes(player.id)) {
            this.fortyManRoster.push(player.id);
        }
    }

    removeFromFortyManRoster(player) {
        if (!player || !this.fortyManRoster) return;
        this.fortyManRoster = this.fortyManRoster.filter(id => id !== player.id);
    }

    syncPlayerTeamRosterState() {
        const team = this.getPlayerTeam();
        if (!team) return;
        team.roster = this.roster;
        team.aaaRoster = this.aaaRoster;
        team.ilRoster = this.ilRoster;
        team.fortyManRoster = this.fortyManRoster || [];
    }

    setPlayerRosterStatus(player, status) {
        if (!player) return;
        player.rosterStatus = status;
    }

    ensureFortyManLimit() {
        let count = this.getFortyManCount();
        if (count <= this.fortyManLimit) return;
        this.log(`40-man roster exceeds limit (${count}/${this.fortyManLimit}).`);
    }

    getRosterComplianceIssues(roster) {
        const issues = [];
        const counts = this.getRosterCounts(roster);
        if (counts.total > this.activeRosterLimit) {
            issues.push(`Roster exceeds ${this.activeRosterLimit} players.`);
        }
        if (counts.total < this.activeRosterLimit) {
            issues.push(`Roster below ${this.activeRosterLimit} players.`);
        }
        if (counts.P > this.maxPitchersActive) {
            issues.push(`Pitchers exceed ${this.maxPitchersActive}.`);
        }
        if (counts.P < this.minPitchersActive) {
            issues.push(`Pitchers below ${this.minPitchersActive}.`);
        }
        if (counts.C < this.minCatchersActive) {
            issues.push(`Catchers below ${this.minCatchersActive}.`);
        }
        Object.keys(this.minInfieldByPosition).forEach(pos => {
            if ((counts[pos] || 0) < this.minInfieldByPosition[pos]) {
                issues.push(`${pos} below ${this.minInfieldByPosition[pos]}.`);
            }
        });
        if (counts.OF < this.minOutfieldActive) {
            issues.push(`Outfielders below ${this.minOutfieldActive}.`);
        }
        return issues;
    }

    isRosterCompliant(roster) {
        const issues = this.getRosterComplianceIssues(roster);
        return { ok: issues.length === 0, issues };
    }

    canAddPlayerToRoster(player) {
        if (!player) return false;
        const counts = this.getRosterCounts(this.roster);
        if (counts.total >= this.activeRosterLimit) return false;
        if (player.position === 'P' && counts.P >= this.maxPitchersActive) return false;
        return true;
    }

    ensureRosterCompliance() {
        const compliance = this.isRosterCompliant(this.roster);
        if (compliance.ok) return;
        const message = `Roster warning: ${compliance.issues.join(' ')}`;
        this.log(message);
    }

    ensureRosterMinimums() {
        if (!this.roster || !this.rules) return;
        let counts = this.getRosterCounts(this.roster);
        const required = [
            { pos: 'C', min: this.minCatchersActive },
            { pos: '1B', min: this.minInfieldByPosition['1B'] },
            { pos: '2B', min: this.minInfieldByPosition['2B'] },
            { pos: '3B', min: this.minInfieldByPosition['3B'] },
            { pos: 'SS', min: this.minInfieldByPosition['SS'] }
        ];
        const outfieldMin = this.minOutfieldActive;
        const needOutfield = () => counts.OF < outfieldMin;

        const canRemove = (player, c) => {
            if (player.position === 'P') return c.P > this.minPitchersActive;
            if (player.position === 'C') return c.C > this.minCatchersActive;
            if (['1B', '2B', '3B', 'SS'].includes(player.position)) {
                return (c[player.position] || 0) > this.minInfieldByPosition[player.position];
            }
            if (['LF', 'CF', 'RF'].includes(player.position)) {
                return c.OF > this.minOutfieldActive;
            }
            return true;
        };

        const removePlayer = (player) => {
            this.roster = this.roster.filter(p => p.id !== player.id);
            this.lineup = this.lineup.map(slot => (slot && slot.player.id === player.id) ? null : slot);
            this.rotation = this.rotation.map(p => (p && p.id === player.id) ? null : p);
            if (this.league && this.league.freeAgents) {
                this.league.freeAgents.push(player);
            }
            this.setPlayerRosterStatus(player, 'fa');
            this.removeFromFortyManRoster(player);
        };

        const addPlayer = (pos) => {
            const player = PlayerGenerator.createPlayer(this.rules, pos);
            this.ensurePlayerHealth(player);
            this.setPlayerRosterStatus(player, 'active');
            this.addToFortyManRoster(player);
            this.roster.push(player);
        };

        const findReplacement = () => {
            const candidates = this.roster.filter(player => canRemove(player, counts));
            if (candidates.length === 0) return null;
            return candidates.sort((a, b) => (a.stats.overall || 0) - (b.stats.overall || 0))[0];
        };

        const ensurePosition = (pos, min) => {
            while ((counts[pos] || 0) < min) {
                const replacement = findReplacement();
                if (replacement) {
                    removePlayer(replacement);
                }
                addPlayer(pos);
                counts = this.getRosterCounts(this.roster);
            }
        };

        required.forEach(entry => ensurePosition(entry.pos, entry.min));
        while (needOutfield()) {
            const replacement = findReplacement();
            if (replacement) {
                removePlayer(replacement);
            }
            const ofPos = ['LF', 'CF', 'RF'][Math.floor(Math.random() * 3)];
            addPlayer(ofPos);
            counts = this.getRosterCounts(this.roster);
        }
        if (counts.P < this.minPitchersActive) {
            ensurePosition('P', this.minPitchersActive);
        }
    }

    getRosterCutCandidate(team, roster, options = {}) {
        const avoidPositions = new Set(options.avoidPositions || []);
        const counts = this.getRosterCounts(roster);
        const isEligible = (player) => {
            if (avoidPositions.has(player.position)) return false;
            if (player.position === 'P' && counts.P <= this.minPitchersActive) return false;
            if (player.position === 'C' && counts.C <= this.minCatchersActive) return false;
            if (['1B', '2B', '3B', 'SS'].includes(player.position)) {
                if ((counts[player.position] || 0) <= this.minInfieldByPosition[player.position]) return false;
            }
            if (['LF', 'CF', 'RF'].includes(player.position) && counts.OF <= this.minOutfieldActive) return false;
            return true;
        };
        const candidates = roster.filter(isEligible);
        if (candidates.length === 0) return null;
        const getScore = (player) => {
            const perf = player.performance?.currentSeason;
            const ops = perf ? this.calculateBattingStats(perf).ops : '0.000';
            const pitching = perf ? this.calculatePitchingStats(perf) : { era: '99.99' };
            const perfScore = player.position === 'P' ? -parseFloat(pitching.era) : parseFloat(ops);
            const salary = player.stats.salary || 0;
            return (player.stats.overall || 0) + (perfScore * 10) - (salary / 50000);
        };
        return candidates.sort((a, b) => getScore(a) - getScore(b))[0];
    }

    enforceRosterLimitsForTeam(team) {
        if (!team || !team.roster) return;
        let roster = team.roster;
        const counts = this.getRosterCounts(roster);
        if (counts.P > this.maxPitchersActive) {
            const pitchers = roster.filter(p => p.position === 'P');
            pitchers.sort((a, b) => (a.stats.pitching || 0) - (b.stats.pitching || 0));
            while (this.getRosterCounts(roster).P > this.maxPitchersActive) {
                const toCut = pitchers.shift();
                if (!toCut) break;
                if (!this.releasePlayerFromTeam(team, toCut, { enforceMinRoster: false })) break;
                roster = team.roster;
            }
        }
        while (team.roster.length > this.activeRosterLimit) {
            const candidate = this.getRosterCutCandidate(team, team.roster);
            if (!candidate) break;
            this.releasePlayerFromTeam(team, candidate, { enforceMinRoster: false });
        }
    }

    fillAiRosterFromFA(team) {
        if (!this.league || !this.league.freeAgents || !team) return;
        while (team.roster.length < this.activeRosterLimit && this.league.freeAgents.length > 0) {
            const counts = this.getRosterCounts(team.roster);
            const needs = [];
            if (counts.P < this.minPitchersActive) needs.push('P');
            if (counts.C < this.minCatchersActive) needs.push('C');
            Object.keys(this.minInfieldByPosition).forEach(pos => {
                if ((counts[pos] || 0) < this.minInfieldByPosition[pos]) needs.push(pos);
            });
            if (counts.OF < this.minOutfieldActive) needs.push('OF');
            const pick = this.pickFreeAgentForNeed(needs);
            if (!pick) break;
            const budget = typeof team.budget === 'number' ? team.budget : 20000000;
            const cost = pick.stats.signingBonus || 0;
            if (budget < cost) break;
            team.budget = budget - cost;
            pick.rosterStatus = 'active';
            team.roster.push(pick);
            if (team.fortyManRoster && !team.fortyManRoster.includes(pick.id)) {
                team.fortyManRoster.push(pick.id);
            }
            this.league.freeAgents = this.league.freeAgents.filter(p => p.id !== pick.id);
        }
        this.autoFillAiLineup(team);
    }

    pickFreeAgentForNeed(needs) {
        if (!this.league || !this.league.freeAgents) return null;
        const pool = this.league.freeAgents;
        const filtered = needs.length
            ? pool.filter(p => needs.includes(p.position) || (needs.includes('OF') && ['LF', 'CF', 'RF'].includes(p.position)))
            : pool;
        if (filtered.length === 0) return pool[0] || null;
        return filtered.sort((a, b) => (b.stats.overall || 0) - (a.stats.overall || 0))[0];
    }

    applyAiPayrollForRound() {
        if (!this.league || !this.league.schedule) return;
        const totalRounds = this.league.schedule.length;
        if (totalRounds <= 0) return;
        const perRoundFactor = 1 / totalRounds;
        this.league.teams.forEach(team => {
            if (team.id === this.playerTeamId) return;
            if (typeof team.budget !== 'number') team.budget = 20000000;
            const payroll = (team.roster || []).reduce((sum, p) => sum + (p.stats.salary || 0), 0);
            team.budget -= Math.round(payroll * perRoundFactor);
        });
    }

    manageAiRosterAfterRound() {
        if (!this.league || !this.league.teams) return;
        this.applyAiPayrollForRound();
        this.league.teams.forEach(team => {
            if (team.id === this.playerTeamId) return;
            this.enforceRosterLimitsForTeam(team);
            const standings = this.league.standings[team.id] || { w: 0, l: 0 };
            const games = standings.w + standings.l;
            const pct = games > 0 ? standings.w / games : 0.5;
            const budget = typeof team.budget === 'number' ? team.budget : 20000000;
            if (pct < 0.4 || budget < 1000000) {
                const candidate = this.getRosterCutCandidate(team, team.roster);
                if (candidate) {
                    this.releasePlayerFromTeam(team, candidate, { enforceMinRoster: false });
                }
            }
            this.fillAiRosterFromFA(team);
        });
    }

    ensureAAAInitialized() {
        if (!this.league) return;
        if (this.league.season < this.aaaEnabledSeason) return;
        if (!this.aaaActive) {
            this.aaaActive = true;
        }
        if (!this.aaaRoster) this.aaaRoster = [];
        if (this.aaaRoster.length === 0) {
            this.createAaaRoster();
        }
        if (this.aaaAutoManagement) {
            this.balanceAaaRosters();
        }
        this.ensureFortyManLimit();
    }

    createAaaRoster() {
        if (!this.league) return;
        this.aaaRoster = this.aaaRoster || [];
        const needed = Math.max(0, this.aaaRosterLimit - this.aaaRoster.length);
        if (needed === 0) return;
        const pool = [...this.league.freeAgents].sort((a, b) => (a.stats.overall || 0) - (b.stats.overall || 0));
        const fromFa = pool.slice(0, needed);
        fromFa.forEach(player => {
            this.setPlayerRosterStatus(player, 'aaa');
        });
        this.aaaRoster.push(...fromFa);
        this.league.freeAgents = this.league.freeAgents.filter(p => !fromFa.some(fa => fa.id === p.id));
        const remaining = this.aaaRosterLimit - this.aaaRoster.length;
        if (remaining > 0) {
            for (let i = 0; i < remaining; i++) {
                const prospect = PlayerGenerator.createProspect(this.rules, { minAge: 19, maxAge: 26 });
                this.setPlayerRosterStatus(prospect, 'aaa');
                this.aaaRoster.push(prospect);
            }
        }
    }

    balanceAaaRosters() {
        if (!this.aaaActive) return;
        if (this.roster.length > this.activeRosterLimit) {
            while (this.roster.length > this.activeRosterLimit) {
                const candidate = this.getRosterCutCandidate(this.getPlayerTeam(), this.roster);
                if (!candidate) break;
                this.sendPlayerToAAA(candidate, { silent: true, allowRelease: true, skipOptions: true });
            }
        }
        while (this.aaaRoster.length > this.aaaRosterLimit) {
            const lowest = [...this.aaaRoster].sort((a, b) => (a.stats.overall || 0) - (b.stats.overall || 0))[0];
            if (!lowest) break;
            this.releasePlayerFromAAA(lowest, { silent: true });
        }
        if (this.aaaRoster.length < this.aaaRosterLimit) {
            this.fillAaaRosterFromFA();
        }
    }

    fillAaaRosterFromFA() {
        if (!this.league || !this.league.freeAgents) return;
        const needed = this.aaaRosterLimit - this.aaaRoster.length;
        if (needed <= 0) return;
        const pool = [...this.league.freeAgents].sort((a, b) => (a.stats.overall || 0) - (b.stats.overall || 0));
        const picks = pool.slice(0, needed);
        if (picks.length === 0) return;
        picks.forEach(player => {
            this.setPlayerRosterStatus(player, 'aaa');
        });
        this.aaaRoster.push(...picks);
        this.league.freeAgents = this.league.freeAgents.filter(p => !picks.some(pick => pick.id === p.id));
        const remaining = this.aaaRosterLimit - this.aaaRoster.length;
        if (remaining > 0) {
            for (let i = 0; i < remaining; i++) {
                const prospect = PlayerGenerator.createProspect(this.rules, { minAge: 19, maxAge: 26 });
                this.setPlayerRosterStatus(prospect, 'aaa');
                this.aaaRoster.push(prospect);
            }
        }
    }

    manageAaaAfterRound() {
        if (!this.aaaActive) return;
        if (this.aaaAutoManagement) {
            this.balanceAaaRosters();
        }
        if (this.aaaAutoPromotions) {
            this.autoPromoteFromAAA();
        }
    }

    autoPromoteFromAAA() {
        if (!this.aaaActive) return;
        while (this.roster.length < this.activeRosterLimit) {
            const pick = this.getBestAaaCallup();
            if (!pick) break;
            this.callUpPlayerFromAAA(pick, { silent: true });
        }
    }

    getBestAaaCallup() {
        if (!this.aaaRoster || this.aaaRoster.length === 0) return null;
        const counts = this.getRosterCounts(this.roster);
        const rankMultipliers = this.getPositionRankMultipliers();
        const baseWeights = {
            P: 1.15,
            C: 1.1,
            SS: 1.08,
            CF: 1.05,
            '2B': 1.02,
            '3B': 1.02,
            LF: 1.0,
            RF: 1.0,
            '1B': 0.98,
            DH: 0.95
        };
        const getNeedBoost = (pos) => {
            if (pos === 'P' && counts.P < this.minPitchersActive) return 1.2;
            if (pos === 'C' && counts.C < this.minCatchersActive) return 1.2;
            if (['1B', '2B', '3B', 'SS'].includes(pos) && (counts[pos] || 0) < this.minInfieldByPosition[pos]) return 1.15;
            if (['LF', 'CF', 'RF'].includes(pos) && counts.OF < this.minOutfieldActive) return 1.15;
            return 1;
        };
        const avoidPitchers = counts.P >= this.maxPitchersActive;
        const getValue = (player) => player.position === 'P'
            ? (player.stats.pitching || 0)
            : (player.stats.overall || 0);
        const score = (player) => {
            if (avoidPitchers && player.position === 'P') return -Infinity;
            const base = baseWeights[player.position] || 1;
            const rankMult = rankMultipliers[player.position] || 1;
            const needBoost = getNeedBoost(player.position);
            return getValue(player) * base * rankMult * needBoost;
        };
        return [...this.aaaRoster].sort((a, b) => score(b) - score(a))[0];
    }

    getProratedSalaryCharge(salary) {
        if (!this.league || !this.league.schedule || this.league.schedule.length === 0) {
            return salary;
        }
        const totalRounds = this.league.schedule.length;
        const remainingRounds = Math.max(0, totalRounds - (this.league.currentRoundIndex || 0));
        const ratio = remainingRounds / totalRounds;
        return Math.round(salary * ratio);
    }

    // --- GAME FLOW ---

    startSeason() {
        // 1. Create League
        this.league = new League(this.rules);
        this.ensureFortyManRosterInitialized();

        // 2. Register Player Team
        const myTeam = {
            id: this.playerTeamId,
            name: this.teamName,
            roster: this.roster,
            aaaRoster: this.aaaRoster,
            ilRoster: this.ilRoster,
            fortyManRoster: this.fortyManRoster,
            transactionsLog: [],
            lineup: this.lineup,
            pitcher: this.pitcher,
            isPlayer: true,
            budget: this.teamBudget
        };

        this.league.initialize(myTeam);
        this.initTeamSeasonStats();
        this.initSeasonGoals();
        this.ensureAllPlayerHealth();
        this.ensureRosterCompliance();
        this.ensureAAAInitialized();
        this.tradeDeadlineRound = Math.max(1, Math.floor(this.league.schedule.length * 0.7));
        this.tradeDeadlinePassed = false;
        this.postseason = null;
        this.postseasonActive = false;
        if (this.league && this.league.calendar) {
            this.league.calendar.tradeDeadlineRound = this.tradeDeadlineRound;
            this.league.calendar.postseasonStartRound = this.league.schedule.length + 1;
        }

        // 3. Update League Panel UI
        document.getElementById('start-season-btn').style.display = 'none';
        document.getElementById('calendar-area').style.display = 'block';

        this.updateLeagueView();

        // 4. Go to Team View
    }

    startPostseason() {
        if (!this.league) return;
        const sorted = this.league.getSortedStandings();
        const seeded = sorted.slice(0, 4);
        if (seeded.length < 4) {
            this.advanceSeason();
            return;
        }
        const seedMap = {};
        seeded.forEach((team, index) => {
            seedMap[team.id] = index + 1;
        });
        const bestOf = this.postseasonSeriesLengths[0] || 3;
        const roundOne = {
            name: 'Semifinals',
            series: [
                { home: seeded[0], away: seeded[3], winsHome: 0, winsAway: 0, bestOf },
                { home: seeded[1], away: seeded[2], winsHome: 0, winsAway: 0, bestOf }
            ]
        };
        this.postseason = {
            rounds: [roundOne],
            roundIndex: 0,
            seedMap,
            champion: null
        };
        this.postseasonActive = true;
        this.currentPostseasonSeries = null;
        this.log('Postseason begins!');
        this.renderPostseason();
    }

    getCurrentPostseasonRound() {
        if (!this.postseason || !this.postseason.rounds) return null;
        return this.postseason.rounds[this.postseason.roundIndex] || null;
    }

    getPostseasonSeriesForTeam(teamId) {
        const round = this.getCurrentPostseasonRound();
        if (!round) return null;
        return round.series.find(entry => entry.home.id === teamId || entry.away.id === teamId) || null;
    }

    isSeriesComplete(series) {
        if (!series) return false;
        const winsNeeded = Math.ceil(series.bestOf / 2);
        return series.winsHome >= winsNeeded || series.winsAway >= winsNeeded;
    }

    isPostseasonRoundComplete(round) {
        if (!round) return true;
        return round.series.every(entry => this.isSeriesComplete(entry));
    }

    advancePostseasonRound() {
        if (!this.postseason) return;
        const currentRound = this.getCurrentPostseasonRound();
        if (!currentRound) return;
        const winners = currentRound.series.map(series => (series.winsHome >= series.winsAway ? series.home : series.away));
        if (winners.length === 1) {
            this.postseason.champion = winners[0];
            this.postseasonActive = false;
            this.log(`Champion: ${winners[0].name}`);
            alert(`${winners[0].name} wins the championship!`);
            this.advanceSeason();
            return;
        }
        const seedMap = this.postseason.seedMap || {};
        const roundIndex = this.postseason.roundIndex + 1;
        const bestOf = this.postseasonSeriesLengths[Math.min(roundIndex, this.postseasonSeriesLengths.length - 1)] || 5;
        const [teamA, teamB] = winners;
        const home = (seedMap[teamA.id] || 99) <= (seedMap[teamB.id] || 99) ? teamA : teamB;
        const away = home.id === teamA.id ? teamB : teamA;
        const nextRound = {
            name: 'Finals',
            series: [{ home, away, winsHome: 0, winsAway: 0, bestOf }]
        };
        this.postseason.rounds[roundIndex] = nextRound;
        this.postseason.roundIndex = roundIndex;
        this.currentPostseasonSeries = null;
        this.log(`Postseason Round ${roundIndex + 1} begins!`);
    }

    simulatePostseasonRound() {
        const currentRound = this.getCurrentPostseasonRound();
        if (!currentRound) return;
        currentRound.series.forEach(series => {
            if (this.isSeriesComplete(series)) return;
            const hScore = Math.floor(Math.random() * 10);
            const aScore = Math.floor(Math.random() * 10);
            if (hScore >= aScore) {
                series.winsHome += 1;
            } else {
                series.winsAway += 1;
            }
            this.recordTeamGame(series.home.id, series.away.id, hScore, aScore);
            const lineScore = this.buildLineScoreFromTotals(hScore, aScore);
            this.persistMatchLog({ home: series.home, away: series.away }, this.league.currentRoundIndex + 1, {
                isPostseason: true,
                lineScore,
                matchLog: []
            });
            this.applyMatchFatigue(series.home, series.away);
            this.applyMatchFatigue(series.away, series.home);
        });
        if (this.isPostseasonRoundComplete(currentRound)) {
            this.advancePostseasonRound();
        }
        this.updateLeagueView();
        this.saveGame();
    }

    renderPostseason() {
        const area = document.getElementById('postseason-area');
        const bracket = document.getElementById('postseason-bracket');
        if (!area || !bracket) return;
        if (!this.postseasonActive || !this.postseason) {
            area.style.display = 'none';
            bracket.innerHTML = '';
            return;
        }

        area.style.display = 'block';
        bracket.innerHTML = '';
        this.postseason.rounds.forEach((round, index) => {
            const roundEl = document.createElement('div');
            roundEl.className = 'postseason-round';
            round.series.forEach(series => {
                const winsNeeded = Math.ceil(series.bestOf / 2);
                const seriesEl = document.createElement('div');
                seriesEl.className = 'postseason-series';
                seriesEl.innerHTML = `
                    <div class="series-title">${round.name || `Round ${index + 1}`} • Best of ${series.bestOf}</div>
                    <div class="series-team">
                        <span>${series.home.name}</span>
                        <span>${series.winsHome}/${winsNeeded}</span>
                    </div>
                    <div class="series-team">
                        <span>${series.away.name}</span>
                        <span>${series.winsAway}/${winsNeeded}</span>
                    </div>
                `;
                roundEl.appendChild(seriesEl);
            });
            bracket.appendChild(roundEl);
        });
    }

    rehydratePostseasonTeams() {
        if (!this.postseason || !this.league || !this.league.teams) return;
        this.postseason.rounds = (this.postseason.rounds || []).map(round => ({
            ...round,
            series: (round.series || []).map(series => {
                const home = this.league.teams.find(team => team.id === series.home?.id) || series.home;
                const away = this.league.teams.find(team => team.id === series.away?.id) || series.away;
                return { ...series, home, away };
            })
        }));
    }

    enterMatchSetup() {
        this.switchView('match');
        this.log("Enter Match Setup... Set Lineup then Play!");
    }

    async startMatch() {
        if (this.isSimulating) return;

        const starter = this.rotation[this.currentRotationIndex];
        let myMatch = null;

        this.currentMatchLog = [];

        if (this.postseasonActive) {
            const postseason = this.getPostseasonSeriesForTeam(this.playerTeamId);
            if (!postseason) {
                this.log("No postseason match scheduled. Simulating remaining series...");
                this.simulatePostseasonRound();
                return;
            }
            myMatch = { home: postseason.home, away: postseason.away };
            this.currentPostseasonSeries = postseason;
        } else {
            const round = this.league.getCurrentRound();
            myMatch = round.find(m => m.home.id === this.playerTeamId || m.away.id === this.playerTeamId);
            if (!myMatch) {
                this.log("No match scheduled for this round.");
                return;
            }
        }
        
        if (myMatch.home.id === this.playerTeamId) {
            myMatch.home.pitcher = starter;
        } else {
            myMatch.away.pitcher = starter;
        }

        this.incrementGamesForTeam(myMatch.home);
        this.incrementGamesForTeam(myMatch.away);
        this.currentMatch = myMatch;
        this.matchCompleted = false;
        this.playerIsHomeInCurrentMatch = myMatch.home.id === this.playerTeamId;
        this.initMatchBattingOrder(myMatch);
        this.initLineScore();
        this.initMatchSummary(myMatch);
        this.ensurePitcherStamina();
        this.ensurePitcherRestDays();
        this.pitcherWorkload = new Map();
        this.pitcherPitchCount = new Map();
        this.updatePitcherStaminaUI();
        this.updateBullpenSelect();
        this.ensurePitcherStaminaForTeam(myMatch.home);
        this.ensurePitcherStaminaForTeam(myMatch.away);

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

        if (this.postseasonActive) {
            this.finishPostseasonMatch(homeScore, awayScore);
            return;
        }

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

        this.recordTeamGame(myMatch.home.id, myMatch.away.id, homeScore, awayScore);
        this.persistMatchLog(myMatch, this.league.currentRoundIndex + 1);
        this.advanceScoutingProgress();
        this.applyMatchFatigue(myMatch.home, myMatch.away);
        this.applyMatchFatigue(myMatch.away, myMatch.home);

        // 2. Simulate Rest of Round (AI vs AI)
        round.forEach(match => {
            if (match === myMatch) return; // Skip player match

            // Random Sim
            const hScore = Math.floor(Math.random() * 10);
            const aScore = Math.floor(Math.random() * 10);
            const win = hScore >= aScore ? match.home.id : match.away.id;
            const lose = hScore >= aScore ? match.away.id : match.home.id;
            this.league.updateStandings(win, lose);
            this.recordTeamGame(match.home.id, match.away.id, hScore, aScore);
            const lineScore = this.buildLineScoreFromTotals(hScore, aScore);
            this.persistMatchLog(match, this.league.currentRoundIndex + 1, { lineScore, matchLog: [] });
            this.applyMatchFatigue(match.home, match.away);
            this.applyMatchFatigue(match.away, match.home);
        });

        this.processWaiverWire();
        this.manageAiRosterAfterRound();
        this.ensureAAAInitialized();
        this.manageAaaAfterRound();

        // 3. Advance Round
        this.league.currentRoundIndex++;
        this.tradeDeadlinePassed = this.isTradeDeadlinePassed();

        // 4. Advance Rotation (Player Team)
        this.currentRotationIndex = (this.currentRotationIndex + 1) % this.rotationSize;
        this.renderRotation(); // Update UI to show next starter

        if (this.league.currentRoundIndex >= this.league.schedule.length) {
            this.startPostseason();
            return;
        }

        // 5. Update League View data but stay on Match screen
        await this.wait(2000);
        this.updateLeagueView();

        document.getElementById('play-match-btn').disabled = false;
        this.isSimulating = false;
        this.updateSimControls();
        this.currentMatch = null;
        this.matchCompleted = false;
        this.updatePitcherStaminaUI();
        this.updatePitcherRestDaysAfterMatch();
        this.advancePlayerRecovery();
        this.recoverPitcherStamina();
        this.renderRotation();
        this.renderBullpen();
        if (this.autoClearMatchLog) {
            this.setMatchLogMessage('Match complete. Ready for next game.');
        }
        this.matchCompleted = true;
        this.updateMatchSummary(homeScore, awayScore);
        this.updateSimControls();

        this.saveGame();
    }

    finishPostseasonMatch(homeScore, awayScore) {
        const currentRound = this.getCurrentPostseasonRound();
        const series = this.currentPostseasonSeries;
        if (!currentRound || !series) {
            this.log('Postseason state missing.');
            this.postseasonActive = false;
            return;
        }

        const winnerIsHome = homeScore >= awayScore;
        if (winnerIsHome) {
            series.winsHome += 1;
        } else {
            series.winsAway += 1;
        }

        const seriesCompleted = this.isSeriesComplete(series);

        this.recordTeamGame(series.home.id, series.away.id, homeScore, awayScore);
        this.persistMatchLog({ home: series.home, away: series.away }, this.league.currentRoundIndex + 1, { isPostseason: true });
        this.applyMatchFatigue(series.home, series.away);
        this.applyMatchFatigue(series.away, series.home);

        currentRound.series.forEach(entry => {
            if (entry === series) return;
            if (this.isSeriesComplete(entry)) return;
            const hScore = Math.floor(Math.random() * 10);
            const aScore = Math.floor(Math.random() * 10);
            if (hScore >= aScore) {
                entry.winsHome += 1;
            } else {
                entry.winsAway += 1;
            }
            this.recordTeamGame(entry.home.id, entry.away.id, hScore, aScore);
            const lineScore = this.buildLineScoreFromTotals(hScore, aScore);
            this.persistMatchLog({ home: entry.home, away: entry.away }, this.league.currentRoundIndex + 1, {
                isPostseason: true,
                lineScore,
                matchLog: []
            });
            this.applyMatchFatigue(entry.home, entry.away);
            this.applyMatchFatigue(entry.away, entry.home);
        });

        this.processWaiverWire();
        this.manageAiRosterAfterRound();
        this.ensureAAAInitialized();
        this.manageAaaAfterRound();

        this.currentRotationIndex = (this.currentRotationIndex + 1) % this.rotationSize;
        this.renderRotation();

        if (this.isPostseasonRoundComplete(currentRound)) {
            this.advancePostseasonRound();
        }

        this.updateLeagueView();
        const playBtn = document.getElementById('play-match-btn');
        if (playBtn) playBtn.disabled = false;
        this.updatePitcherStaminaUI();
        this.updatePitcherRestDaysAfterMatch();
        this.advancePlayerRecovery();
        this.recoverPitcherStamina();
        this.renderRotation();
        this.renderBullpen();
        if (this.autoClearMatchLog) {
            this.setMatchLogMessage('Match complete. Ready for next game.');
        }
        this.matchCompleted = true;
        this.updateMatchSummary(homeScore, awayScore);
        this.updateSimControls();
        this.currentMatch = null;
        this.currentPostseasonSeries = null;

        this.saveGame();

        if (seriesCompleted) {
            this.log(`Series update: ${series.home.name} ${series.winsHome} - ${series.away.name} ${series.winsAway}`);
        }
    }

    advanceSeason() {
        this.postseason = null;
        this.postseasonActive = false;
        this.currentPostseasonSeries = null;
        if (this.league) this.league.waiverWire = [];
        // Calculate and deduct annual salaries for all players on the roster
        let totalSalaries = 0;
        this.roster.forEach(player => {
            totalSalaries += player.stats.salary;
        });
        if (this.aaaActive && this.aaaRoster && this.aaaRoster.length > 0) {
            const aaaSalaries = this.aaaRoster.reduce((sum, player) => sum + (player.stats.salary || 0), 0);
            totalSalaries += Math.round(aaaSalaries * this.aaaSalaryMultiplier);
        }

        this.teamBudget -= totalSalaries;
        this.log(`Annual salaries of $${totalSalaries.toLocaleString()} deducted.`);
        this.updateBudgetUI();

        this.incrementServiceTime();
        this.applyPerformanceTraining();
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

    incrementServiceTime() {
        const teams = this.league ? this.league.teams : [];
        teams.forEach(team => {
            (team.roster || []).forEach(player => {
                if (!player.rosterStatus) player.rosterStatus = 'active';
                if (player.rosterStatus !== 'active') return;
                player.serviceTimeYears = (player.serviceTimeYears || 0) + 1;
            });
        });
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
            const lastFive = this.getTeamLastFive(t.id);
            const streak = this.getTeamStreak(t.id);

            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${t.name}</td>
                <td>${t.w}</td>
                <td>${t.l}</td>
                <td>${pct}</td>
                <td>${lastFive}</td>
                <td>${streak}</td>
            `;
            tbody.appendChild(tr);
        });

        // Update Next Match Text
        const display = document.getElementById('next-opponent-display');
        if (display) {
            if (this.postseasonActive) {
                const series = this.getPostseasonSeriesForTeam(this.playerTeamId);
                if (series) {
                    const opponent = series.home.id === this.playerTeamId ? series.away : series.home;
                    display.innerText = `POSTSEASON: vs ${opponent.name}`;
                } else {
                    display.innerText = 'POSTSEASON: Eliminated';
                }
            } else {
                const round = this.league.getCurrentRound();
                if (round) {
                    const myMatch = round.find(m => m.home.id === this.playerTeamId || m.away.id === this.playerTeamId);
                    const opponent = myMatch.home.id === this.playerTeamId ? myMatch.away : myMatch.home;
                    display.innerText = `NEXT: vs ${opponent.name}`;
                }
            }
        }
        const playBtn = document.getElementById('play-match-btn-league');
        if (playBtn) {
            playBtn.innerText = this.postseasonActive ? 'POSTSEASON GAME' : 'ENTER MATCH';
        }

        const deadlineEl = document.getElementById('trade-deadline-status');
        if (deadlineEl && this.league && this.tradeDeadlineRound) {
            const currentRound = this.league.currentRoundIndex + 1;
            const passed = this.isTradeDeadlinePassed();
            deadlineEl.innerText = passed
                ? `TRADE DEADLINE PASSED (Round ${this.tradeDeadlineRound})`
                : `TRADE DEADLINE: Round ${this.tradeDeadlineRound} • Current Round ${currentRound}`;
        }

        this.renderPostseason();
        this.renderSchedule();
        this.updateDraftUI();
        this.updateTeamStatsView();
        this.updateGoalProgress();
        this.updateGoalUI();
        this.renderPositionRankings();
        this.renderTransactions();
        this.updateHeaderIndicators();
        this.updateAaaOptionsUI();
        this.updateHomeView();
    }

    updateHomeView() {
        const teamNameEl = document.getElementById('home-team-name');
        const seasonEl = document.getElementById('home-season');
        const recordEl = document.getElementById('home-record');
        const nextEl = document.getElementById('home-next');
        const budgetEl = document.getElementById('home-budget');
        const fortyEl = document.getElementById('home-forty');
        const waiversEl = document.getElementById('home-waivers');
        const activeEl = document.getElementById('home-active-count');
        const ilEl = document.getElementById('home-il-count');
        const optionsEl = document.getElementById('home-options-count');
        if (teamNameEl) teamNameEl.innerText = this.teamName || 'Your Franchise HQ';
        if (!this.league) {
            if (seasonEl) seasonEl.innerText = 'SEASON 1 (Not Started)';
            if (recordEl) recordEl.innerText = 'Record: 0-0';
            if (nextEl) nextEl.innerText = 'Next: --';
            if (budgetEl) budgetEl.innerText = `Budget: $${(this.teamBudget || 0).toLocaleString()}`;
            if (fortyEl) fortyEl.innerText = `40-Man: ${this.getFortyManCount()}/${this.fortyManLimit}`;
            if (waiversEl) waiversEl.innerText = `Waivers: 0`;
            if (activeEl) activeEl.innerText = `Active: ${this.roster.length}`;
            if (ilEl) ilEl.innerText = `IL: ${(this.ilRoster || []).length}`;
            if (optionsEl) optionsEl.innerText = `Options: ${this.getOptionsRemainingCount()}`;
            return;
        }
        if (seasonEl) seasonEl.innerText = `SEASON ${this.league.season}`;
        const standings = this.league.standings?.[this.playerTeamId] || { w: 0, l: 0 };
        if (recordEl) recordEl.innerText = `Record: ${standings.w}-${standings.l}`;
        const round = this.league.getCurrentRound();
        if (round) {
            const myMatch = round.find(m => m.home.id === this.playerTeamId || m.away.id === this.playerTeamId);
            if (myMatch) {
                const opponent = myMatch.home.id === this.playerTeamId ? myMatch.away : myMatch.home;
                if (nextEl) nextEl.innerText = `Next: vs ${opponent.name}`;
            }
        }
        if (budgetEl) budgetEl.innerText = `Budget: $${(this.teamBudget || 0).toLocaleString()}`;
        if (fortyEl) fortyEl.innerText = `40-Man: ${this.getFortyManCount()}/${this.fortyManLimit}`;
        if (waiversEl) waiversEl.innerText = `Waivers: ${this.league?.waiverWire?.length || 0}`;
        if (activeEl) activeEl.innerText = `Active: ${this.roster.length}`;
        if (ilEl) ilEl.innerText = `IL: ${(this.ilRoster || []).length}`;
        if (optionsEl) optionsEl.innerText = `Options: ${this.getOptionsRemainingCount()}`;
    }

    getOptionsRemainingCount() {
        const players = [...this.roster, ...this.aaaRoster, ...this.ilRoster];
        return players.reduce((sum, player) => sum + (player.optionsRemaining || 0), 0);
    }

    getTeamLastFive(teamId) {
        const results = (this.teamSeasonStats[teamId]?.results || []);
        const lastFive = results.slice(-5);
        return lastFive.length ? lastFive.join('') : '-';
    }

    getTeamStreak(teamId) {
        const results = (this.teamSeasonStats[teamId]?.results || []);
        if (results.length === 0) return '-';
        const last = results[results.length - 1];
        let count = 1;
        for (let i = results.length - 2; i >= 0; i--) {
            if (results[i] !== last) break;
            count++;
        }
        return `${last}${count}`;
    }

    getTeamNameById(teamId) {
        if (!this.league || !this.league.teams) return null;
        const team = this.league.teams.find(entry => entry.id === teamId);
        return team ? team.name : null;
    }

    renderSchedule() {
        const list = document.getElementById('schedule-list');
        const select = document.getElementById('schedule-round-select');
        if (!list || !select) return;
        if (!this.league || !this.league.schedule || this.league.schedule.length === 0) {
            list.innerHTML = '<div class="schedule-row">Start season to view schedule.</div>';
            select.innerHTML = '';
            return;
        }

        select.innerHTML = '';
        this.league.schedule.forEach((_, index) => {
            const opt = document.createElement('option');
            opt.value = index;
            opt.textContent = `Round ${index + 1}`;
            select.appendChild(opt);
        });

        const current = typeof this.scheduleViewRoundIndex === 'number'
            ? this.scheduleViewRoundIndex
            : this.league.currentRoundIndex;
        const safeIndex = Math.max(0, Math.min(current, this.league.schedule.length - 1));
        this.scheduleViewRoundIndex = safeIndex;
        select.value = String(safeIndex);

        const round = this.league.schedule[safeIndex] || [];
        list.innerHTML = '';
        const currentRoundNumber = this.league.currentRoundIndex + 1;
        const roundNumber = safeIndex + 1;
        const filterMyTeam = this.scheduleFilter === 'my';
        const filterAllBtn = document.getElementById('schedule-filter-all');
        const filterMyBtn = document.getElementById('schedule-filter-my');
        if (filterAllBtn) filterAllBtn.classList.toggle('active', !filterMyTeam);
        if (filterMyBtn) filterMyBtn.classList.toggle('active', filterMyTeam);

        const getMatchResult = (homeId, awayId) => {
            const log = this.teamSeasonStats?.[homeId]?.gameLog || [];
            const entry = log.find(item => item.round === roundNumber && item.opponentId === awayId && item.isHome);
            if (!entry) return null;
            return {
                homeRuns: entry.runsFor,
                awayRuns: entry.runsAgainst,
                result: entry.result,
                matchLog: entry.matchLog || null
            };
        };

        round.forEach(match => {
            const row = document.createElement('div');
            const isPlayerMatch = match.home.id === this.playerTeamId || match.away.id === this.playerTeamId;
            if (filterMyTeam && !isPlayerMatch) return;
            row.className = `schedule-row ${isPlayerMatch ? 'player-team' : ''}`;
            const result = getMatchResult(match.home.id, match.away.id);
            let statusText = 'UPCOMING';
            if (roundNumber < currentRoundNumber) {
                statusText = result ? `FINAL ${result.awayRuns}-${result.homeRuns}` : 'COMPLETED';
            } else if (roundNumber === currentRoundNumber) {
                statusText = isPlayerMatch ? 'NEXT' : 'TODAY';
            }
            if (result?.matchLog) row.classList.add('clickable');
            row.innerHTML = `
                <span>${match.away.name} @ ${match.home.name}</span>
                <span class="schedule-status">${statusText}</span>
            `;
            if (result?.matchLog) {
                row.addEventListener('click', () => {
                    this.openMatchLogForRound(match, roundNumber, result);
                });
            }
            list.appendChild(row);
        });
    }

    openMatchLogForRound(match, roundNumber, result) {
        if (!match || !result) return;
        this.setScheduleLogModal(match, roundNumber, result);
    }

    setScheduleLogModal(match, roundNumber, result) {
        const overlay = document.getElementById('schedule-log-overlay');
        const titleEl = document.getElementById('schedule-log-title');
        const scoreEl = document.getElementById('schedule-log-score');
        const bodyEl = document.getElementById('schedule-log-body');
        const lineScoreEl = document.getElementById('schedule-log-linescore');
        const openBtn = document.getElementById('schedule-log-open-match');
        const closeBtn = document.getElementById('schedule-log-close');
        const closeBtnAlt = document.getElementById('schedule-log-close-btn');
        if (!overlay || !titleEl || !scoreEl || !bodyEl) return;
        titleEl.innerText = `R${roundNumber} ${match.away.name} @ ${match.home.name}`;
        scoreEl.innerText = `FINAL ${result.awayRuns}-${result.homeRuns}`;
        if (lineScoreEl) {
            lineScoreEl.innerHTML = '';
            const line = result.matchLog?.lineScore;
            if (line) {
                const innings = line.home.length;
                const headCells = Array.from({ length: innings }, (_, i) => `<th>${i + 1}</th>`).join('');
                const homeCells = line.home.map(val => `<td>${val}</td>`).join('');
                const awayCells = line.away.map(val => `<td>${val}</td>`).join('');
                const totalHome = line.home.reduce((sum, val) => sum + val, 0);
                const totalAway = line.away.reduce((sum, val) => sum + val, 0);
                lineScoreEl.innerHTML = `
                    <table class="schedule-log-table">
                        <thead>
                            <tr>
                                <th></th>
                                ${headCells}
                                <th>R</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>${match.away.name}</td>
                                ${awayCells}
                                <td>${totalAway}</td>
                            </tr>
                            <tr>
                                <td>${match.home.name}</td>
                                ${homeCells}
                                <td>${totalHome}</td>
                            </tr>
                        </tbody>
                    </table>
                `;
            } else {
                lineScoreEl.innerHTML = '<div class="subtext">No line score available.</div>';
            }
        }
        bodyEl.innerHTML = '';
        if (result.matchLog?.matchLog?.length) {
            result.matchLog.matchLog.forEach(entry => {
                const row = document.createElement('div');
                row.className = 'log-entry';
                row.innerText = typeof entry === 'string' ? entry : entry.text;
                bodyEl.appendChild(row);
            });
        } else {
            bodyEl.innerHTML = '<div class="log-entry">No detailed log available.</div>';
        }
        const close = () => overlay.classList.add('hidden');
        if (closeBtn) closeBtn.onclick = close;
        if (closeBtnAlt) closeBtnAlt.onclick = close;
        if (openBtn) {
            openBtn.onclick = () => {
                overlay.classList.add('hidden');
                this.openStoredMatchLog(match, roundNumber, result);
            };
        }
        overlay.classList.remove('hidden');
    }

    openStoredMatchLog(match, roundNumber, result) {
        this.switchView('match');
        this.setMatchLogMessage(`R${roundNumber} ${match.away.name} @ ${match.home.name} FINAL ${result.awayRuns}-${result.homeRuns}`);
        if (result.matchLog?.matchLog?.length) {
            this.currentMatchLog = result.matchLog.matchLog.map(entry => this.normalizeMatchLogEntry(entry)).filter(Boolean);
            this.renderMatchLogView(this.currentMatchLog);
        } else {
            const isPlayerHome = match.home.id === this.playerTeamId;
            const isPlayerAway = match.away.id === this.playerTeamId;
            if (isPlayerHome || isPlayerAway) {
                const outcome = isPlayerHome
                    ? (result.homeRuns >= result.awayRuns ? 'W' : 'L')
                    : (result.awayRuns >= result.homeRuns ? 'W' : 'L');
                this.log(`> Result: ${outcome} (summary only)`);
            } else {
                this.log('> Result: AI game (summary only)');
            }
        }
    }

    renderPositionRankings() {
        const container = document.getElementById('position-rankings');
        if (!container) return;
        if (!this.league) {
            container.innerHTML = '<div class="empty-slot">Start Season to view rankings</div>';
            return;
        }

        const positions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'P'];
        const teamStrengths = this.league.teams.map(team => ({
            teamId: team.id,
            map: this.calculatePositionStrength(team)
        }));

        const playerMap = teamStrengths.find(entry => entry.teamId === this.playerTeamId);
        container.innerHTML = '';
        positions.forEach(pos => {
            const ranked = [...teamStrengths]
                .map(entry => ({ teamId: entry.teamId, value: entry.map[pos] || 0 }))
                .sort((a, b) => b.value - a.value);
            const rankIndex = ranked.findIndex(entry => entry.teamId === this.playerTeamId);
            const rank = rankIndex >= 0 ? rankIndex + 1 : '-';
            const value = playerMap ? playerMap.map[pos] || 0 : 0;
            const row = document.createElement('div');
            row.className = 'position-rank-row';
            row.innerHTML = `
                <span class="pos-name">${pos}</span>
                <span class="pos-rank">#${rank} / ${ranked.length}</span>
                <span class="pos-value">${Math.round(value)}</span>
            `;
            container.appendChild(row);
        });
    }

    calculatePositionStrength(team) {
        const map = {};
        const roster = team.roster || [];
        const getBest = (pos) => {
            const candidates = roster.filter(p => p.position === pos);
            if (candidates.length === 0) return 0;
            return candidates.sort((a, b) => (b.stats.overall || 0) - (a.stats.overall || 0))[0].stats.overall || 0;
        };
        ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'].forEach(pos => {
            map[pos] = getBest(pos);
        });
        const dhCandidates = roster.filter(p => p.position !== 'P');
        map.DH = dhCandidates.length
            ? dhCandidates.sort((a, b) => (b.stats.overall || 0) - (a.stats.overall || 0))[0].stats.overall || 0
            : 0;
        const pitchers = roster.filter(p => p.position === 'P');
        map.P = pitchers.length
            ? pitchers.sort((a, b) => (b.stats.pitching || 0) - (a.stats.pitching || 0))[0].stats.pitching || 0
            : 0;
        return map;
    }

    initSeasonGoals() {
        if (!this.league) return;
        const totalGames = this.league.schedule.length || 14;
        const winTarget = Math.max(8, Math.round(totalGames * 0.6));
        this.seasonGoals = [
            { id: 'wins', label: `Win ${winTarget} games`, target: winTarget, current: 0, reward: 250000, comparator: '>=', achieved: false, claimed: false },
            { id: 'ops', label: 'Team OPS ≥ .780', target: 0.78, current: 0, reward: 150000, comparator: '>=', achieved: false, claimed: false },
            { id: 'era', label: 'Team ERA ≤ 4.20', target: 4.2, current: 99, reward: 150000, comparator: '<=', achieved: false, claimed: false }
        ];
    }

    ensureSeasonGoals() {
        if (!this.seasonGoals || this.seasonGoals.length === 0) {
            this.initSeasonGoals();
        }
    }

    updateGoalProgress() {
        if (!this.league || !this.seasonGoals) return;
        const standings = this.league.standings[this.playerTeamId] || { w: 0, l: 0 };
        const team = this.league.teams.find(t => t.id === this.playerTeamId);
        const stats = team ? this.calculateTeamStats(team) : null;

        this.seasonGoals.forEach(goal => {
            if (goal.id === 'wins') goal.current = standings.w;
            if (goal.id === 'ops' && stats) goal.current = parseFloat(stats.ops);
            if (goal.id === 'era' && stats) goal.current = parseFloat(stats.era);

            const achieved = goal.comparator === '>='
                ? goal.current >= goal.target
                : goal.current <= goal.target;
            if (achieved && !goal.achieved) {
                goal.achieved = true;
            }
            if (goal.achieved && !goal.claimed) {
                goal.claimed = true;
                this.teamBudget += goal.reward;
                this.updateBudgetUI();
                this.log(`Goal achieved: ${goal.label} (+$${goal.reward.toLocaleString()})`);
            }
        });
        this.saveGame();
    }

    updateGoalUI() {
        const list = document.getElementById('goal-list');
        if (!list) return;
        list.innerHTML = '';
        if (!this.seasonGoals || this.seasonGoals.length === 0) {
            list.innerHTML = '<div style="padding:8px; color:#777;">No goals yet</div>';
            return;
        }
        this.seasonGoals.forEach(goal => {
            const row = document.createElement('div');
            row.className = `goal-row ${goal.achieved ? 'achieved' : ''}`;
            const progress = goal.id === 'wins'
                ? `${goal.current}/${goal.target}`
                : `${goal.current.toFixed ? goal.current.toFixed(3) : goal.current} / ${goal.target}`;
            row.innerHTML = `
                <div class="goal-label">${goal.label}</div>
                <div class="goal-meta">$${goal.reward.toLocaleString()} • ${progress}</div>
            `;
            list.appendChild(row);
        });
    }

    initTeamSeasonStats() {
        if (!this.league) return;
        this.teamSeasonStats = {};
        this.league.teams.forEach(team => {
            this.teamSeasonStats[team.id] = {
                runsFor: 0,
                runsAgainst: 0,
                games: 0,
                runsForByGame: [],
                runsAgainstByGame: [],
                results: [],
                gameLog: []
            };
        });
    }

    ensureTeamSeasonStats() {
        if (!this.league) return;
        if (!this.teamSeasonStats) this.teamSeasonStats = {};
        this.league.teams.forEach(team => {
            if (!this.teamSeasonStats[team.id]) {
                this.teamSeasonStats[team.id] = {
                    runsFor: 0,
                    runsAgainst: 0,
                    games: 0,
                    runsForByGame: [],
                    runsAgainstByGame: [],
                    results: [],
                    gameLog: []
                };
            }
            if (!this.teamSeasonStats[team.id].results) {
                this.teamSeasonStats[team.id].results = [];
            }
            if (!this.teamSeasonStats[team.id].gameLog) {
                this.teamSeasonStats[team.id].gameLog = [];
            }
        });
    }

    recordTeamRuns(battingTeamId, fieldingTeamId, runs) {
        if (!this.teamSeasonStats) this.teamSeasonStats = {};
        if (!this.teamSeasonStats[battingTeamId]) {
            this.teamSeasonStats[battingTeamId] = { runsFor: 0, runsAgainst: 0, games: 0, runsForByGame: [], runsAgainstByGame: [] };
        }
        if (!this.teamSeasonStats[fieldingTeamId]) {
            this.teamSeasonStats[fieldingTeamId] = { runsFor: 0, runsAgainst: 0, games: 0, runsForByGame: [], runsAgainstByGame: [] };
        }
        this.teamSeasonStats[battingTeamId].runsFor += runs;
        this.teamSeasonStats[fieldingTeamId].runsAgainst += runs;
    }

    recordTeamGame(homeTeamId, awayTeamId, homeRuns, awayRuns) {
        if (!this.teamSeasonStats) this.teamSeasonStats = {};
        const ensure = (id) => {
            if (!this.teamSeasonStats[id]) {
                this.teamSeasonStats[id] = {
                    runsFor: 0,
                    runsAgainst: 0,
                    games: 0,
                    runsForByGame: [],
                    runsAgainstByGame: [],
                    results: [],
                    gameLog: []
                };
            }
            if (!this.teamSeasonStats[id].results) this.teamSeasonStats[id].results = [];
            if (!this.teamSeasonStats[id].gameLog) this.teamSeasonStats[id].gameLog = [];
        };
        ensure(homeTeamId);
        ensure(awayTeamId);
        this.teamSeasonStats[homeTeamId].runsForByGame.push(homeRuns);
        this.teamSeasonStats[homeTeamId].runsAgainstByGame.push(awayRuns);
        this.teamSeasonStats[awayTeamId].runsForByGame.push(awayRuns);
        this.teamSeasonStats[awayTeamId].runsAgainstByGame.push(homeRuns);
        this.teamSeasonStats[homeTeamId].games += 1;
        this.teamSeasonStats[awayTeamId].games += 1;
        const homeResult = homeRuns >= awayRuns ? 'W' : 'L';
        const awayResult = homeRuns >= awayRuns ? 'L' : 'W';
        this.teamSeasonStats[homeTeamId].results.push(homeResult);
        this.teamSeasonStats[awayTeamId].results.push(awayResult);

        const round = this.league ? (this.league.currentRoundIndex + 1) : 0;
        const homeName = this.getTeamNameById(homeTeamId) || 'HOME';
        const awayName = this.getTeamNameById(awayTeamId) || 'AWAY';
        this.teamSeasonStats[homeTeamId].gameLog.push({
            round,
            opponentId: awayTeamId,
            opponentName: awayName,
            isHome: true,
            runsFor: homeRuns,
            runsAgainst: awayRuns,
            result: homeResult
        });
        this.teamSeasonStats[awayTeamId].gameLog.push({
            round,
            opponentId: homeTeamId,
            opponentName: homeName,
            isHome: false,
            runsFor: awayRuns,
            runsAgainst: homeRuns,
            result: awayResult
        });
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
        const lineHome = document.getElementById('line-score-home-name');
        const lineAway = document.getElementById('line-score-away-name');
        if (lineHome) lineHome.innerText = myMatch.home.name;
        if (lineAway) lineAway.innerText = myMatch.away.name;

        // Reset scores and inning
        document.getElementById('score-home-val').innerText = '0';
        document.getElementById('score-away-val').innerText = '0';
        document.getElementById('sb-inning').innerText = 'TOP 1';
        this.updateOutsDisplay(0);
        this.initLineScore();
        this.updateBasesDisplay({ first: null, second: null, third: null });

        // Reset game status text and log
        document.getElementById('game-status-text').innerText = 'WAITING FOR MATCH...';
        this.setMatchLogMessage('Set your lineup and click "PLAY BALL" to start.');

        // Reset matchup display
        this.updateMatchupDisplay({ name: '---' }, { name: '---' }, { name: '---' });
        
        // Ensure play button is enabled
        document.getElementById('play-match-btn').disabled = false;
        this.isSimulating = false;
        this.updateSimControls();
        this.currentMatch = null;
        this.matchCompleted = false;
        this.matchSummary = null;
        this.setMatchSummaryVisible(false);
        this.pitcherPitchCount = new Map();
        this.updatePitcherStaminaUI();
    }

    // --- UI Helpers called by Rules Strategy ---

    updateMatchupDisplay(batter, pitcher, nextBatter = null) {
        document.querySelector('.matchup-batter').innerText = `BATTER: ${batter.name}`;
        document.querySelector('.matchup-pitcher').innerText = `PITCHER: ${pitcher.name}`;
        const nextEl = document.querySelector('.matchup-next');
        if (nextEl) {
            const nextName = nextBatter && nextBatter.name ? nextBatter.name : '---';
            nextEl.innerText = `NEXT: ${nextName}`;
        }
        this.updatePitcherStaminaUI();
    }

    updateScoreboard(homeScore, awayScore) {
        const homeScoreEl = document.getElementById('score-home-val');
        const awayScoreEl = document.getElementById('score-away-val');
        if (homeScoreEl) homeScoreEl.innerText = homeScore;
        if (awayScoreEl) awayScoreEl.innerText = awayScore;
    }

    updateBasesDisplay(bases) {
        const first = document.getElementById('base-1');
        const second = document.getElementById('base-2');
        const third = document.getElementById('base-3');
        if (!first || !second || !third) return;
        const occupied = bases || {};
        first.classList.toggle('active', !!occupied.first);
        second.classList.toggle('active', !!occupied.second);
        third.classList.toggle('active', !!occupied.third);
    }

    initLineScore() {
        this.currentLineScore = {
            home: new Array(9).fill(0),
            away: new Array(9).fill(0)
        };
        const homeName = document.getElementById('score-home-name')?.innerText || 'HOME';
        const awayName = document.getElementById('score-away-name')?.innerText || 'AWAY';
        const homeNameEl = document.getElementById('line-score-home-name');
        const awayNameEl = document.getElementById('line-score-away-name');
        if (homeNameEl) homeNameEl.innerText = homeName;
        if (awayNameEl) awayNameEl.innerText = awayName;
        for (let inning = 1; inning <= 9; inning++) {
            this.setLineScoreCell('home', inning, 0);
            this.setLineScoreCell('away', inning, 0);
        }
        this.setLineScoreTotal('home');
        this.setLineScoreTotal('away');
    }

    setLineScoreCell(team, inning, value) {
        const cell = document.querySelector(`[data-line-score="${team}-${inning}"]`);
        if (cell) cell.innerText = value;
    }

    setLineScoreTotal(team) {
        const total = (this.currentLineScore?.[team] || []).reduce((sum, val) => sum + val, 0);
        const cell = document.querySelector(`[data-line-score="${team}-r"]`);
        if (cell) cell.innerText = total;
    }

    updateLineScore(team, inning, runs) {
        if (!this.currentLineScore) this.initLineScore();
        if (inning < 1 || inning > 9) return;
        this.currentLineScore[team][inning - 1] = runs;
        this.setLineScoreCell(team, inning, runs);
        this.setLineScoreTotal(team);
    }

    buildLineScoreFromTotals(homeRuns, awayRuns) {
        const distribute = (total) => {
            const innings = 9;
            const runs = new Array(innings).fill(0);
            const count = Math.max(0, Math.floor(total || 0));
            for (let i = 0; i < count; i++) {
                const index = Math.floor(Math.random() * innings);
                runs[index] += 1;
            }
            return runs;
        };
        return {
            home: distribute(homeRuns),
            away: distribute(awayRuns)
        };
    }

    updateInningDisplay(half, inning) {
        const inningEl = document.getElementById('sb-inning');
        if (!inningEl) return;
        inningEl.innerText = `${half} ${inning}`;
        this.updateOutsDisplay(0);
        this.halfInningPausePending = this.simulationMode === 'auto' && this.autoViewMode === 'inning';
    }

    updateOutsDisplay(outs) {
        const dots = document.querySelectorAll('.sb-outs .dot');
        if (!dots || dots.length === 0) return;
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index < outs);
        });
    }

    log(msg, options = {}) {
        const log = document.getElementById('game-log');
        if (this.currentMatchLog && this.isSimulating) {
            const inning = Number.isFinite(options.inning) ? options.inning : null;
            const team = options.team === 'home' || options.team === 'away' ? options.team : null;
            this.currentMatchLog.push({ text: msg, highlight: !!options.highlight, inning, team });
            this.renderMatchLogView();
            return;
        }
        if (log) {
            const cls = options.highlight ? 'log-entry highlight' : 'log-entry';
            log.innerHTML += `<div class="${cls}">${msg}</div>`;
            log.scrollTop = log.scrollHeight;
        }
    }

    setMatchLogMessage(message) {
        const log = document.getElementById('game-log');
        if (log) {
            log.innerHTML = `<div class="log-entry">> ${message}</div>`;
        }
        this.currentMatchLog = [];
    }

    normalizeMatchLogEntry(entry) {
        if (!entry) return null;
        if (typeof entry === 'string') return { text: entry, highlight: false, inning: null, team: null };
        if (typeof entry.text === 'string') {
            const parsedInning = entry.inning != null ? parseInt(entry.inning, 10) : null;
            const inning = Number.isFinite(entry.inning) ? entry.inning : (Number.isFinite(parsedInning) ? parsedInning : null);
            const team = entry.team === 'home' || entry.team === 'away' ? entry.team : null;
            return { text: entry.text, highlight: !!entry.highlight, inning, team };
        }
        return null;
    }

    getFilteredMatchLogEntries(entries) {
        const term = (this.matchLogSearchTerm || '').toLowerCase();
        const teamFilter = this.matchLogTeamFilter || 'all';
        const inningFilter = this.matchLogInningFilter ?? 'all';
        return entries.filter(entry => {
            if (!entry) return false;
            if (this.matchLogFilterMode === 'highlight' && !entry.highlight) return false;
            if (teamFilter !== 'all' && entry.team !== teamFilter) return false;
            if (inningFilter !== 'all' && entry.inning !== inningFilter) return false;
            if (!term) return true;
            return entry.text.toLowerCase().includes(term);
        });
    }

    renderMatchLogView(entriesOverride = null) {
        const log = document.getElementById('game-log');
        if (!log) return;
        const baseEntries = (entriesOverride || this.currentMatchLog || [])
            .map(entry => this.normalizeMatchLogEntry(entry))
            .filter(Boolean);
        const filtered = this.getFilteredMatchLogEntries(baseEntries);
        log.innerHTML = filtered
            .map(entry => `<div class="log-entry ${entry.highlight ? 'highlight' : ''}">${entry.text}</div>`)
            .join('');
        log.scrollTop = log.scrollHeight;
        const filterAll = document.getElementById('match-log-filter-all');
        const filterHighlight = document.getElementById('match-log-filter-highlight');
        if (filterAll) filterAll.classList.toggle('active', this.matchLogFilterMode === 'all');
        if (filterHighlight) filterHighlight.classList.toggle('active', this.matchLogFilterMode === 'highlight');
        const teamAll = document.getElementById('match-log-team-all');
        const teamHome = document.getElementById('match-log-team-home');
        const teamAway = document.getElementById('match-log-team-away');
        if (teamAll) teamAll.classList.toggle('active', this.matchLogTeamFilter === 'all');
        if (teamHome) teamHome.classList.toggle('active', this.matchLogTeamFilter === 'home');
        if (teamAway) teamAway.classList.toggle('active', this.matchLogTeamFilter === 'away');
        const inningSelect = document.getElementById('match-log-inning');
        if (inningSelect) {
            inningSelect.value = this.matchLogInningFilter === 'all'
                ? 'all'
                : String(this.matchLogInningFilter);
        }
    }

    persistMatchLog(match, roundNumber, options = {}) {
        if (!match || !roundNumber) return;
        const homeLog = this.teamSeasonStats?.[match.home.id]?.gameLog || [];
        const awayLog = this.teamSeasonStats?.[match.away.id]?.gameLog || [];
        const homeEntry = homeLog.find(entry => entry.round === roundNumber && entry.opponentId === match.away.id && entry.isHome);
        const awayEntry = awayLog.find(entry => entry.round === roundNumber && entry.opponentId === match.home.id && !entry.isHome);
        const matchLogEntries = Array.isArray(options.matchLog)
            ? options.matchLog
            : (Array.isArray(this.currentMatchLog) ? this.currentMatchLog : []);
        const baseLineScore = options.lineScore
            || (this.currentLineScore ? { home: [...this.currentLineScore.home], away: [...this.currentLineScore.away] } : null);
        const lineScore = baseLineScore && Array.isArray(baseLineScore.home) && Array.isArray(baseLineScore.away)
            ? { home: [...baseLineScore.home], away: [...baseLineScore.away] }
            : null;
        const logPayload = {
            matchLog: [...matchLogEntries],
            postseason: !!options.isPostseason,
            lineScore
        };
        if (homeEntry) homeEntry.matchLog = logPayload;
        if (awayEntry) awayEntry.matchLog = logPayload;
    }

    initMatchSummary(match) {
        if (!match) return;
        this.matchSummary = {
            homeId: match.home.id,
            awayId: match.away.id,
            homeName: match.home.name,
            awayName: match.away.name,
            home: { hits: 0, homeRuns: 0, walks: 0, strikeouts: 0, hitByPitch: 0 },
            away: { hits: 0, homeRuns: 0, walks: 0, strikeouts: 0, hitByPitch: 0 }
        };
        const homeNameEl = document.getElementById('match-summary-home-name');
        const awayNameEl = document.getElementById('match-summary-away-name');
        if (homeNameEl) homeNameEl.innerText = match.home.name;
        if (awayNameEl) awayNameEl.innerText = match.away.name;
        this.setMatchSummaryVisible(false);
    }

    recordMatchEvent(team, outcome) {
        if (!this.matchSummary || !team || !outcome) return;
        const side = team.id === this.matchSummary.homeId
            ? this.matchSummary.home
            : (team.id === this.matchSummary.awayId ? this.matchSummary.away : null);
        if (!side) return;
        if (outcome.type === 'hit') {
            side.hits += 1;
            if (outcome.desc && outcome.desc.includes('Home Run')) {
                side.homeRuns += 1;
            }
        } else if (outcome.type === 'walk') {
            side.walks += 1;
        } else if (outcome.type === 'hbp') {
            side.hitByPitch += 1;
        } else if (outcome.type === 'out' && outcome.desc && outcome.desc.includes('Strikeout')) {
            side.strikeouts += 1;
        }
    }

    updateMatchSummary(homeScore, awayScore) {
        if (!this.matchSummary) return;
        const summary = document.getElementById('match-summary-overlay');
        if (!summary) return;
        const home = this.matchSummary.home;
        const away = this.matchSummary.away;
        const homeScoreEl = document.getElementById('match-summary-home-r');
        const awayScoreEl = document.getElementById('match-summary-away-r');
        if (homeScoreEl) homeScoreEl.innerText = homeScore;
        if (awayScoreEl) awayScoreEl.innerText = awayScore;
        const scoreEl = document.getElementById('match-summary-score');
        if (scoreEl) scoreEl.innerText = `FINAL: ${this.matchSummary.awayName} ${awayScore} - ${this.matchSummary.homeName} ${homeScore}`;
        const updateStat = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.innerText = value;
        };
        updateStat('match-summary-home-h', home.hits);
        updateStat('match-summary-home-hr', home.homeRuns);
        updateStat('match-summary-home-bb', home.walks);
        updateStat('match-summary-home-so', home.strikeouts);
        updateStat('match-summary-home-hbp', home.hitByPitch);
        updateStat('match-summary-away-h', away.hits);
        updateStat('match-summary-away-hr', away.homeRuns);
        updateStat('match-summary-away-bb', away.walks);
        updateStat('match-summary-away-so', away.strikeouts);
        updateStat('match-summary-away-hbp', away.hitByPitch);
        this.setMatchSummaryVisible(true);
    }

    setMatchSummaryVisible(visible) {
        const summary = document.getElementById('match-summary-overlay');
        if (!summary) return;
        summary.classList.toggle('hidden', !visible);
        summary.style.display = visible ? 'flex' : 'none';
    }

    switchView(mode, activeOverrideId = null) {
        const mainContent = document.querySelector('.main-content');
        const leagueBtn = document.getElementById('view-league-btn');
        const teamBtn = document.getElementById('view-team-btn');
        const rosterBtn = document.getElementById('view-roster-btn');
        const marketBtn = document.getElementById('view-market-btn');
        const matchBtn = document.getElementById('view-match-btn');
        const statsBtn = document.getElementById('view-stats-btn');

        mainContent.className = 'main-content';

        const navButtons = [leagueBtn, teamBtn, rosterBtn, marketBtn, matchBtn, statsBtn, document.getElementById('view-home-btn')];
        navButtons.forEach(btn => {
            if (btn) btn.classList.remove('active');
        });

        const modeDisplay = document.getElementById('view-mode-display');
        if (modeDisplay) {
            const labels = {
                home: 'HOME VIEW',
                league: 'LEAGUE VIEW',
                team: 'DUGOUT VIEW',
                roster: 'ROSTER VIEW',
                market: 'MARKET VIEW',
                stats: 'STATS VIEW',
                match: 'MATCH VIEW'
            };
            modeDisplay.innerText = labels[mode] || 'DUGOUT VIEW';
        }
        const rosterTitle = document.getElementById('roster-panel-title');
        if (rosterTitle) {
            if (mode === 'market') {
                rosterTitle.innerText = 'MARKET HUB';
            } else if (mode === 'roster') {
                rosterTitle.innerText = 'ROSTER HUB';
            } else {
                rosterTitle.innerText = 'ROSTER / MARKET';
            }
        }

        if (mode === 'home') {
            mainContent.classList.add('home-mode');
            if (activeOverrideId) {
                const activeBtn = document.getElementById(activeOverrideId);
                if (activeBtn) activeBtn.classList.add('active');
            }
            this.updateHomeView();
        } else if (mode === 'team') {
            mainContent.classList.add('team-mode');
            if (activeOverrideId) {
                const activeBtn = document.getElementById(activeOverrideId);
                if (activeBtn) activeBtn.classList.add('active');
            } else if (teamBtn) {
                teamBtn.classList.add('active');
            }
        } else if (mode === 'roster') {
            mainContent.classList.add('roster-mode');
            if (activeOverrideId) {
                const activeBtn = document.getElementById(activeOverrideId);
                if (activeBtn) activeBtn.classList.add('active');
            } else if (rosterBtn) {
                rosterBtn.classList.add('active');
            }
        } else if (mode === 'market') {
            mainContent.classList.add('market-mode');
            if (activeOverrideId) {
                const activeBtn = document.getElementById(activeOverrideId);
                if (activeBtn) activeBtn.classList.add('active');
            } else if (marketBtn) {
                marketBtn.classList.add('active');
            }
        } else if (mode === 'match') {
            mainContent.classList.add('match-mode');
            if (matchBtn) matchBtn.classList.add('active');
            this.resetMatchView(); // Reset the view when switching to it
        } else if (mode === 'league') {
            mainContent.classList.add('league-mode');
            if (activeOverrideId) {
                const activeBtn = document.getElementById(activeOverrideId);
                if (activeBtn) activeBtn.classList.add('active');
            } else if (leagueBtn) {
                leagueBtn.classList.add('active');
            }
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
            this.updateLeagueView();
        } else if (mode === 'stats') {
            mainContent.classList.add('stats-mode');
            if (statsBtn) statsBtn.classList.add('active');
            this.updateTeamStatsView();
        }
        if (mode === 'roster' || mode === 'market') {
            this.updateRosterMarketUI();
        }
        this.updateHeaderIndicators();
    }

    wait(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    initMatchControls() {
        const autoBtn = document.getElementById('sim-auto-btn');
        const pitchBtn = document.getElementById('sim-pitch-btn');
        const batterBtn = document.getElementById('sim-batter-btn');
        const autoViewSelect = document.getElementById('auto-view-select');
        const bullpenSelect = document.getElementById('bullpen-select');
        const subBtn = document.getElementById('sub-pitcher-btn');
        const autoBullpenToggle = document.getElementById('auto-bullpen-toggle');
        const nextMatchBtn = document.getElementById('next-match-btn');
        const summaryNextBtn = document.getElementById('summary-next-match-btn');
        const summaryLeagueBtn = document.getElementById('summary-league-btn');
        const summaryConfirmBtn = document.getElementById('summary-confirm-btn');

        if (autoBtn) autoBtn.addEventListener('click', () => this.setSimulationMode('auto'));
        if (pitchBtn) pitchBtn.addEventListener('click', () => this.setSimulationMode('pitch'));
        if (batterBtn) batterBtn.addEventListener('click', () => this.setSimulationMode('batter'));

        if (autoViewSelect) {
            autoViewSelect.addEventListener('change', (e) => {
                this.autoViewMode = e.target.value;
            });
        }

        if (subBtn) {
            subBtn.addEventListener('click', () => {
                const selectedId = bullpenSelect ? bullpenSelect.value : null;
                if (selectedId) {
                    this.substitutePitcher(selectedId);
                }
            });
        }

        if (autoBullpenToggle) {
            autoBullpenToggle.addEventListener('change', (e) => {
                this.autoBullpenEnabled = e.target.checked;
                this.saveGame();
            });
        }

        if (nextMatchBtn) {
            nextMatchBtn.addEventListener('click', () => {
                if (!this.league || this.isSimulating) return;
                this.updateLeagueView();
                this.switchView('league');
            });
        }
        if (summaryNextBtn) {
            summaryNextBtn.addEventListener('click', () => {
                if (this.isSimulating || !this.matchCompleted) return;
                if (this.validateLineup()) {
                    this.resetMatchView();
                    this.startMatch();
                }
            });
        }
        if (summaryLeagueBtn) {
            summaryLeagueBtn.addEventListener('click', () => {
                if (!this.league) return;
                this.updateLeagueView();
                this.switchView('league');
            });
        }
        if (summaryConfirmBtn) {
            summaryConfirmBtn.addEventListener('click', () => {
                this.setMatchSummaryVisible(false);
            });
        }

        this.updateSimControls();
    }

    initBenchControls() {
        const sortSelect = document.getElementById('bench-sort-select');
        const sortDirBtn = document.getElementById('bench-sort-dir');

        if (sortSelect) {
            sortSelect.value = this.benchSortKey;
            sortSelect.addEventListener('change', (e) => {
                this.benchSortKey = e.target.value;
                this.renderBench();
            });
        }

        if (sortDirBtn) {
            sortDirBtn.addEventListener('click', () => {
                this.benchSortDir = this.benchSortDir === 'desc' ? 'asc' : 'desc';
                this.updateBenchSortUI();
                this.renderBench();
            });
        }

        this.updateBenchSortUI();
    }

    initTradeControls() {
        const teamSelect = document.getElementById('trade-team-select');
        const tradeBtn = document.getElementById('trade-submit-btn');
        if (teamSelect) {
            teamSelect.addEventListener('change', () => this.updateTradeTargets());
        }
        if (tradeBtn) {
            tradeBtn.addEventListener('click', () => this.proposeTrade());
        }
    }

    initRosterMarketNav() {
        const rosterTab = document.getElementById('roster-tab-btn');
        const aaaTab = document.getElementById('aaa-tab-btn');
        const ilTab = document.getElementById('il-tab-btn');
        const optionsTab = document.getElementById('options-tab-btn');
        const fortyManTab = document.getElementById('forty-man-tab-btn');
        const marketTab = document.getElementById('market-tab-btn');
        const faTab = document.getElementById('market-fa-tab');
        const tradeTab = document.getElementById('market-trade-tab');
        const scoutTab = document.getElementById('market-scout-tab');
        const waiverTab = document.getElementById('market-waiver-tab');

        if (rosterTab) rosterTab.addEventListener('click', () => this.setRosterView('roster'));
        if (aaaTab) aaaTab.addEventListener('click', () => this.setRosterView('aaa'));
        if (ilTab) ilTab.addEventListener('click', () => this.setRosterView('il'));
        if (optionsTab) optionsTab.addEventListener('click', () => this.setRosterView('options'));
        if (fortyManTab) fortyManTab.addEventListener('click', () => this.setRosterView('forty-man'));
        if (marketTab) marketTab.addEventListener('click', () => this.setRosterView('market'));
        if (faTab) faTab.addEventListener('click', () => this.setMarketTab('fa'));
        if (tradeTab) tradeTab.addEventListener('click', () => this.setMarketTab('trade'));
        if (scoutTab) scoutTab.addEventListener('click', () => this.setMarketTab('scout'));
        if (waiverTab) waiverTab.addEventListener('click', () => this.setMarketTab('waivers'));

        this.updateRosterMarketUI();
    }

    setRosterView(view) {
        this.rosterView = view;
        this.updateRosterMarketUI();
    }

    setMarketTab(tab) {
        this.marketTab = tab;
        this.updateRosterMarketUI();
    }

    initRosterMultiControls() {
        const controls = document.getElementById('roster-multi-controls');
        if (!controls) return;
        controls.querySelectorAll('button[data-multi-panel]').forEach(btn => {
            btn.addEventListener('click', () => {
                const panel = btn.dataset.multiPanel;
                this.toggleMultiRosterPanel(panel);
            });
        });
        this.updateRosterMultiView();
    }

    toggleMultiRosterPanel(panel) {
        if (!panel) return;
        const active = new Set(this.multiRosterPanels || []);
        if (active.has(panel)) {
            if (active.size <= 2) return;
            active.delete(panel);
        } else {
            if (active.size >= 3) return;
            active.add(panel);
        }
        this.multiRosterPanels = active;
        this.updateRosterMultiView();
    }

    updateRosterMultiView() {
        const controls = document.getElementById('roster-multi-controls');
        if (controls) {
            controls.querySelectorAll('button[data-multi-panel]').forEach(btn => {
                const panel = btn.dataset.multiPanel;
                btn.classList.toggle('active', this.multiRosterPanels?.has(panel));
            });
        }
        const panelMap = {
            roster: document.getElementById('roster-view'),
            il: document.getElementById('il-view'),
            options: document.getElementById('options-view'),
            'forty-man': document.getElementById('forty-man-view'),
            market: document.getElementById('market-view'),
            aaa: document.getElementById('aaa-view')
        };
        Object.entries(panelMap).forEach(([key, node]) => {
            if (!node) return;
            node.classList.toggle('multi-active', this.multiRosterPanels?.has(key));
        });
    }

    updateRosterMarketUI() {
        const rosterView = document.getElementById('roster-view');
        const aaaView = document.getElementById('aaa-view');
        const ilView = document.getElementById('il-view');
        const optionsView = document.getElementById('options-view');
        const fortyManView = document.getElementById('forty-man-view');
        const marketView = document.getElementById('market-view');
        const rosterTab = document.getElementById('roster-tab-btn');
        const aaaTab = document.getElementById('aaa-tab-btn');
        const ilTab = document.getElementById('il-tab-btn');
        const optionsTab = document.getElementById('options-tab-btn');
        const fortyManTab = document.getElementById('forty-man-tab-btn');
        const marketTab = document.getElementById('market-tab-btn');
        const rosterContent = document.querySelector('.roster-content');
        const rosterPanel = document.querySelector('.roster-panel');
        const mainContent = document.querySelector('.main-content');

        if (!this.aaaActive && this.rosterView === 'aaa') {
            this.rosterView = 'roster';
        }

        if (rosterView) rosterView.classList.toggle('active', this.rosterView === 'roster');
        if (aaaView) aaaView.classList.toggle('active', this.rosterView === 'aaa');
        if (ilView) ilView.classList.toggle('active', this.rosterView === 'il');
        if (optionsView) optionsView.classList.toggle('active', this.rosterView === 'options');
        if (fortyManView) fortyManView.classList.toggle('active', this.rosterView === 'forty-man');
        if (marketView) marketView.classList.toggle('active', this.rosterView === 'market');
        if (rosterTab) rosterTab.classList.toggle('active', this.rosterView === 'roster');
        if (aaaTab) aaaTab.classList.toggle('active', this.rosterView === 'aaa');
        if (ilTab) ilTab.classList.toggle('active', this.rosterView === 'il');
        if (optionsTab) optionsTab.classList.toggle('active', this.rosterView === 'options');
        if (fortyManTab) fortyManTab.classList.toggle('active', this.rosterView === 'forty-man');
        if (marketTab) marketTab.classList.toggle('active', this.rosterView === 'market');

        if (aaaTab) {
            aaaTab.style.display = this.aaaActive ? 'inline-flex' : 'none';
        }
        if (ilTab) {
            ilTab.style.display = 'inline-flex';
        }
        if (optionsTab) {
            optionsTab.style.display = 'inline-flex';
        }
        if (fortyManTab) {
            fortyManTab.style.display = 'inline-flex';
        }

        const inMultiMode = !!mainContent && mainContent.classList.contains('roster-mode');
        if (rosterPanel) rosterPanel.classList.toggle('multi-mode', inMultiMode);
        if (rosterContent) rosterContent.classList.toggle('multi-mode', inMultiMode);
        if (inMultiMode) {
            this.updateRosterMultiView();
        }

        const faTab = document.getElementById('market-fa-tab');
        const tradeTab = document.getElementById('market-trade-tab');
        const scoutTab = document.getElementById('market-scout-tab');
        const waiverTab = document.getElementById('market-waiver-tab');
        const faSection = document.getElementById('market-fa-section');
        const tradeSection = document.getElementById('market-trade-section');
        const scoutSection = document.getElementById('market-scouting-section');
        const waiverSection = document.getElementById('market-waiver-section');

        const tradeDeadlinePassed = this.isTradeDeadlinePassed();
        if (tradeDeadlinePassed && this.marketTab === 'trade') {
            this.marketTab = 'fa';
        }

        if (faTab) faTab.classList.toggle('active', this.marketTab === 'fa');
        if (tradeTab) tradeTab.classList.toggle('active', this.marketTab === 'trade');
        if (scoutTab) scoutTab.classList.toggle('active', this.marketTab === 'scout');
        if (waiverTab) waiverTab.classList.toggle('active', this.marketTab === 'waivers');
        if (faSection) faSection.classList.toggle('active', this.marketTab === 'fa');
        if (tradeSection) tradeSection.classList.toggle('active', this.marketTab === 'trade');
        if (scoutSection) scoutSection.classList.toggle('active', this.marketTab === 'scout');
        if (waiverSection) waiverSection.classList.toggle('active', this.marketTab === 'waivers');
        if (tradeTab) tradeTab.disabled = tradeDeadlinePassed;
        if (tradeTab) tradeTab.title = tradeDeadlinePassed ? 'Trade deadline has passed.' : '';
    }

    updateHeaderIndicators() {
        const fortyEl = document.getElementById('forty-man-indicator');
        const waiverEl = document.getElementById('waiver-indicator');
        const txEl = document.getElementById('transactions-indicator');
        if (fortyEl) fortyEl.innerText = `40-MAN: ${this.getFortyManCount()}/${this.fortyManLimit}`;
        if (waiverEl) waiverEl.innerText = `WAIVERS: ${this.league?.waiverWire?.length || 0}`;
        const txCount = this.getPlayerTeam()?.transactionsLog?.length || 0;
        if (txEl) txEl.innerText = `TX: ${txCount}`;
    }

    logTransaction(type, player, notes = '') {
        const team = this.getPlayerTeam();
        if (!team) return;
        if (!team.transactionsLog) team.transactionsLog = [];
        const round = this.league ? (this.league.currentRoundIndex + 1) : 0;
        team.transactionsLog.push({
            round,
            type,
            playerId: player ? player.id : null,
            playerName: player ? player.name : '',
            notes,
            timestamp: Date.now()
        });
        if (team.transactionsLog.length > this.transactionsLogLimit) {
            team.transactionsLog = team.transactionsLog.slice(-this.transactionsLogLimit);
        }
        this.renderTransactions();
        this.updateHeaderIndicators();
    }

    renderTransactions() {
        const list = document.getElementById('transactions-list');
        if (!list) return;
        const team = this.getPlayerTeam();
        if (!team || !team.transactionsLog || team.transactionsLog.length === 0) {
            list.innerHTML = '<div class="recent-game-row">No transactions yet.</div>';
            return;
        }
        const recent = [...team.transactionsLog].slice(-12).reverse();
        list.innerHTML = '';
        recent.forEach(entry => {
            const row = document.createElement('div');
            row.className = 'recent-game-row';
            const detail = entry.notes ? ` • ${entry.notes}` : '';
            row.innerHTML = `
                <span>R${entry.round} ${entry.type}</span>
                <span>${entry.playerName}${detail}</span>
            `;
            list.appendChild(row);
        });
    }

    isTradeDeadlinePassed() {
        if (!this.league || !this.league.schedule) return false;
        if (this.postseasonActive) return true;
        if (typeof this.tradeDeadlineRound !== 'number') return false;
        const currentRound = this.league.currentRoundIndex + 1;
        return currentRound > this.tradeDeadlineRound;
    }

    renderTradeUI() {
        const teamSelect = document.getElementById('trade-team-select');
        const playerSelect = document.getElementById('trade-player-select');
        const targetSelect = document.getElementById('trade-target-select');
        const cashInput = document.getElementById('trade-cash-input');
        const tradeBtn = document.getElementById('trade-submit-btn');
        const status = document.getElementById('trade-status');
        if (!teamSelect || !playerSelect) return;

        if (!this.league) {
            teamSelect.innerHTML = '';
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'Start season first';
            teamSelect.appendChild(opt);
            playerSelect.innerHTML = '';
            return;
        }

        const deadlinePassed = this.isTradeDeadlinePassed();
        if (deadlinePassed) {
            if (tradeBtn) tradeBtn.disabled = true;
            if (status) status.innerText = 'Trade deadline has passed.';
        } else {
            if (tradeBtn) tradeBtn.disabled = false;
            if (status) status.innerText = 'Pick a team and players to trade.';
        }
        if (teamSelect) teamSelect.disabled = deadlinePassed;
        if (playerSelect) playerSelect.disabled = deadlinePassed;
        if (targetSelect) targetSelect.disabled = deadlinePassed;
        if (cashInput) cashInput.disabled = deadlinePassed;

        const aiTeams = this.league.teams.filter(team => team.id !== this.playerTeamId);
        teamSelect.innerHTML = '';
        aiTeams.forEach(team => {
            const opt = document.createElement('option');
            opt.value = team.id;
            opt.textContent = team.name;
            teamSelect.appendChild(opt);
        });

        playerSelect.innerHTML = '';
        this.roster.forEach(player => {
            const opt = document.createElement('option');
            opt.value = player.id;
            opt.textContent = `${player.name} (${player.position})`;
            playerSelect.appendChild(opt);
        });

        this.updateTradeTargets();
    }

    updateTradeTargets() {
        const teamSelect = document.getElementById('trade-team-select');
        const targetSelect = document.getElementById('trade-target-select');
        if (!teamSelect || !targetSelect) return;
        const team = this.league ? this.league.teams.find(t => t.id === teamSelect.value) : null;
        targetSelect.innerHTML = '';
        if (!team) return;
        team.roster.forEach(player => {
            const opt = document.createElement('option');
            opt.value = player.id;
            opt.textContent = `${player.name} (${player.position})`;
            targetSelect.appendChild(opt);
        });
    }

    proposeTrade() {
        const teamSelect = document.getElementById('trade-team-select');
        const giveSelect = document.getElementById('trade-player-select');
        const getSelect = document.getElementById('trade-target-select');
        const cashInput = document.getElementById('trade-cash-input');
        const status = document.getElementById('trade-status');
        if (!teamSelect || !giveSelect || !getSelect || !cashInput) return;

        if (this.isTradeDeadlinePassed()) {
            if (status) status.innerText = 'Trade deadline has passed.';
            return;
        }

        const team = this.league ? this.league.teams.find(t => t.id === teamSelect.value) : null;
        if (!team) return;

        const givePlayer = this.roster.find(p => p.id === giveSelect.value);
        const getPlayer = team.roster.find(p => p.id === getSelect.value);
        if (!givePlayer || !getPlayer) return;

        const cash = Math.max(0, parseInt(cashInput.value, 10) || 0);
        if (cash > this.teamBudget) {
            if (status) status.innerText = 'Not enough budget for cash add-on.';
            return;
        }

        const aiValue = this.getTradeValue(team, givePlayer) + cash;
        const askValue = this.getTradeValue(this.getPlayerTeam(), getPlayer);
        const ratio = askValue > 0 ? aiValue / askValue : 0;
        let accepted = false;
        if (ratio >= 1.05) {
            accepted = true;
        } else {
            const chance = Math.max(0.05, Math.min(0.6, (ratio - 0.8) / 0.25));
            accepted = Math.random() < chance;
        }

        if (!accepted) {
            if (status) status.innerText = 'Trade rejected by the other team.';
            return;
        }

        this.teamBudget -= cash;
        this.updateBudgetUI();
        this.swapPlayersBetweenTeams(team, givePlayer, getPlayer);
        if (status) status.innerText = 'Trade accepted!';
        this.renderRosterAndMarket();
        this.renderLineup();
        this.renderRotation();
        this.logTransaction('TRADE', givePlayer, `Sent to ${team.name}`);
        this.logTransaction('TRADE', getPlayer, `Acquired from ${team.name}`);
        this.saveGame();
    }

    getTradeValue(team, player) {
        if (!team || !player) return 0;
        const isPitcher = player.position === 'P';
        const base = isPitcher
            ? (player.stats.pitching || 50) * 110000
            : (player.stats.overall || 50) * 100000;
        const age = player.age || 27;
        let ageFactor = 1;
        if (age <= 25) ageFactor = 1.15;
        else if (age <= 29) ageFactor = 1.05;
        else if (age <= 32) ageFactor = 1.0;
        else if (age <= 35) ageFactor = 0.9;
        else ageFactor = 0.8;

        const injuryDays = player.health?.injuryDays || 0;
        const fatigue = player.health?.fatigue || 0;
        let healthFactor = 1;
        if (injuryDays > 0) healthFactor -= Math.min(0.3, injuryDays * 0.03);
        if (fatigue >= 70) healthFactor -= 0.08;
        healthFactor = Math.max(0.5, healthFactor);

        const needFactor = this.getPositionNeedMultiplier(team, player.position);
        return base * ageFactor * healthFactor * needFactor;
    }

    getPositionNeedMultiplier(team, position) {
        const roster = team.roster || [];
        let candidates = roster.filter(player => player.position === position);
        if (position === 'DH') {
            candidates = roster.filter(player => player.position !== 'P');
        }
        if (position === 'P') {
            candidates = roster.filter(player => player.position === 'P');
        }
        const values = candidates
            .map(player => position === 'P' ? (player.stats.pitching || 0) : (player.stats.overall || 0))
            .sort((a, b) => b - a);
        const top = values[0] || 0;
        const second = values[1] || 0;

        let mult = 1;
        if (candidates.length < 2) mult += 0.1;
        if (top < 65) mult += 0.12;
        if (second < 60) mult += 0.08;
        if (['C', 'SS', 'CF'].includes(position)) mult += 0.05;
        return mult;
    }

    swapPlayersBetweenTeams(otherTeam, givePlayer, getPlayer) {
        this.removePlayerFromTeam(this.getPlayerTeam(), givePlayer);
        this.removePlayerFromTeam(otherTeam, getPlayer);
        this.addPlayerToTeam(this.getPlayerTeam(), getPlayer);
        this.addPlayerToTeam(otherTeam, givePlayer);
        this.setPlayerRosterStatus(getPlayer, 'active');
        this.setPlayerRosterStatus(givePlayer, 'active');
        this.addToFortyManRoster(getPlayer);
        this.removeFromFortyManRoster(givePlayer);
        if (otherTeam.fortyManRoster) {
            if (!otherTeam.fortyManRoster.includes(givePlayer.id)) {
                otherTeam.fortyManRoster.push(givePlayer.id);
            }
            otherTeam.fortyManRoster = otherTeam.fortyManRoster.filter(id => id !== getPlayer.id);
        }
        this.enforceRosterLimitsForTeam(this.getPlayerTeam());
        this.enforceRosterLimitsForTeam(otherTeam);
        this.autoFillAiLineup(otherTeam);
    }

    getPlayerTeam() {
        return this.league ? this.league.teams.find(team => team.id === this.playerTeamId) : null;
    }

    removePlayerFromTeam(team, player) {
        if (!team) return;
        team.roster = team.roster.filter(p => p.id !== player.id);
        if (team.id === this.playerTeamId) {
            this.lineup = this.lineup.map(slot => (slot && slot.player.id === player.id) ? null : slot);
            this.rotation = this.rotation.map(p => (p && p.id === player.id) ? null : p);
            this.removeFromFortyManRoster(player);
        } else if (team.lineup) {
            team.lineup = team.lineup.map(entry => {
                const p = entry && entry.player ? entry.player : entry;
                if (p && p.id === player.id) return null;
                return entry;
            });
        }
        if (team.pitcher && team.pitcher.id === player.id) {
            team.pitcher = team.roster.find(p => p.position === 'P') || team.roster[0] || null;
        }
        if (team.fortyManRoster) {
            team.fortyManRoster = team.fortyManRoster.filter(id => id !== player.id);
        }
    }

    addPlayerToTeam(team, player) {
        if (!team) return;
        team.roster.push(player);
        player.rosterStatus = 'active';
        if (team.fortyManRoster && !team.fortyManRoster.includes(player.id)) {
            team.fortyManRoster.push(player.id);
        }
        if (team.id !== this.playerTeamId && team.lineup) {
            const filled = team.lineup.filter(Boolean).length;
            if (filled < this.rules.getLineupSize() && player.position !== 'P') {
                team.lineup.push(player);
            }
        }
    }

    autoFillAiLineup(team) {
        if (!team || team.id === this.playerTeamId) return;
        const lineupSize = this.rules.getLineupSize();
        const current = (team.lineup || []).map(entry => entry && entry.player ? entry.player : entry).filter(Boolean);
        const used = new Set(current.map(p => p.id));
        const candidates = team.roster.filter(p => p.position !== 'P' && !used.has(p.id));
        while (current.length < lineupSize && candidates.length > 0) {
            current.push(candidates.shift());
        }
        team.lineup = current.slice(0, lineupSize);
    }

    updateBenchSortUI() {
        const sortSelect = document.getElementById('bench-sort-select');
        const sortDirBtn = document.getElementById('bench-sort-dir');
        if (sortSelect) sortSelect.value = this.benchSortKey;
        if (sortDirBtn) sortDirBtn.innerText = this.benchSortDir.toUpperCase();
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
        const autoBullpenToggle = document.getElementById('auto-bullpen-toggle');

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
            autoViewSelect.disabled = false;
        }
        if (autoBullpenToggle) {
            autoBullpenToggle.disabled = false;
            autoBullpenToggle.checked = this.autoBullpenEnabled;
        }

        const bullpenSelect = document.getElementById('bullpen-select');
        const subBtn = document.getElementById('sub-pitcher-btn');
        const nextMatchBtn = document.getElementById('next-match-btn');
        if (bullpenSelect) bullpenSelect.disabled = false;
        if (subBtn) subBtn.disabled = !enabled;
        if (nextMatchBtn) {
            nextMatchBtn.disabled = this.isSimulating;
            nextMatchBtn.style.display = 'block';
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
            if (this.autoViewMode === 'game') {
                return Promise.resolve();
            }
            if (this.autoViewMode === 'inning') {
                if (type === 'batter' && this.halfInningPausePending) {
                    this.halfInningPausePending = false;
                    return this.wait(1200);
                }
                return Promise.resolve();
            }
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

    updatePitcherStaminaUI() {
        const staminaEl = document.getElementById('pitcher-stamina');
        if (!staminaEl) return;
        const pitcher = this.getCurrentPlayerPitcher();
        if (!pitcher) {
            staminaEl.innerText = 'PITCHER STAMINA: --';
            return;
        }
        const { current, max, ratio } = this.getPitcherStaminaValues(pitcher);
        const pitches = this.pitcherPitchCount.get(pitcher.id) || 0;
        staminaEl.innerText = `PITCHER STAMINA: ${Math.round(current)}/${Math.round(max)} (${Math.round(ratio * 100)}%) • PITCHES ${pitches}`;
        this.maybeAutoSubstitute(pitcher, ratio);
        this.updatePitcherStaminaBadges();
    }

    updatePitcherStaminaBadges() {
        const nodes = document.querySelectorAll('[data-stamina-for]');
        if (nodes.length === 0) return;
        const pitchers = new Map(this.roster.filter(p => p.position === 'P').map(p => [String(p.id), p]));
        nodes.forEach(node => {
            const id = node.dataset.staminaFor;
            const pitcher = pitchers.get(id);
            if (!pitcher) return;
            const { current, max } = this.getPitcherStaminaValues(pitcher);
            node.textContent = `STA ${Math.round(current)}/${Math.round(max)}`;
        });
    }

    getBullpenPitchers() {
        const starters = new Set(this.rotation.filter(Boolean).map(p => p.id));
        return this.roster.filter(player => player.position === 'P' && !starters.has(player.id));
    }

    ensureBullpenRole(player) {
        if (!player.bullpenRole) {
            player.bullpenRole = 'Long Relief';
        }
    }

    ensureBullpenRoles() {
        this.roster.forEach(player => {
            if (player.position === 'P') {
                this.ensureBullpenRole(player);
            }
        });
    }

    autoAssignBullpenRoles() {
        const bullpen = this.getBullpenPitchers();
        if (bullpen.length === 0) return;

        const byPitching = [...bullpen].sort((a, b) => b.stats.pitching - a.stats.pitching);
        const byStamina = [...bullpen].sort((a, b) => (b.stats.stamina || 80) - (a.stats.stamina || 80));
        const byLowStamina = [...bullpen].sort((a, b) => (a.stats.stamina || 80) - (b.stats.stamina || 80));
        const pool = new Set(bullpen);
        const pickFrom = (list, predicate = null) => {
            for (const player of list) {
                if (pool.has(player) && (!predicate || predicate(player))) {
                    pool.delete(player);
                    return player;
                }
            }
            return null;
        };

        const getStamina = (player) => player.stats.stamina || 80;
        const getPitching = (player) => player.stats.pitching || 50;
        const getOverall = (player) => player.stats.overall || 50;
        const getPerformanceScore = (player) => {
            const perf = this.ensurePerformance(player).currentSeason;
            const outs = perf.pitcherOuts || 0;
            if (outs < 15) return 0;
            const pitching = this.calculatePitchingStats(perf);
            const era = parseFloat(pitching.era);
            const whip = parseFloat(pitching.whip);
            const eraScore = Number.isFinite(era) ? Math.max(0, 5 - era) : 0;
            const whipScore = Number.isFinite(whip) ? Math.max(0, 2 - whip) : 0;
            return (eraScore * 6) + (whipScore * 6);
        };
        const score = (player, weights) => (
            getPitching(player) * weights.pitching +
            getStamina(player) * weights.stamina +
            getOverall(player) * weights.overall +
            getPerformanceScore(player) * weights.performance
        );
        const pickBest = (weights, predicate = null) => {
            let best = null;
            let bestScore = -Infinity;
            pool.forEach(player => {
                if (predicate && !predicate(player)) return;
                const value = score(player, weights);
                if (value > bestScore) {
                    bestScore = value;
                    best = player;
                }
            });
            if (best) pool.delete(best);
            return best;
        };

        const closer = pickBest(
            { pitching: 1.35, stamina: -0.1, overall: 0.35, performance: 0.55 },
            player => getPitching(player) >= 78
        ) || pickBest({ pitching: 1.2, stamina: 0.0, overall: 0.25, performance: 0.4 });

        const setup = pickBest(
            { pitching: 1.15, stamina: 0.15, overall: 0.25, performance: 0.4 },
            player => getPitching(player) >= 72
        ) || pickBest({ pitching: 1.05, stamina: 0.2, overall: 0.2, performance: 0.3 });

        const middle = pickBest({ pitching: 0.9, stamina: 0.4, overall: 0.2, performance: 0.15 });
        const longRelief = pickBest(
            { pitching: 0.4, stamina: 1.2, overall: 0.1, performance: 0.1 },
            player => getStamina(player) >= 70
        ) || pickBest({ pitching: 0.3, stamina: 1.0, overall: 0.1, performance: 0.05 });
        const opener = pickBest(
            { pitching: 0.8, stamina: 0.6, overall: 0.2, performance: 0.2 },
            player => getStamina(player) <= 70
        ) || pickBest({ pitching: 0.7, stamina: 0.7, overall: 0.2, performance: 0.15 });

        if (closer) closer.bullpenRole = 'Closer';
        if (setup) setup.bullpenRole = 'Setup';
        if (middle) middle.bullpenRole = 'Middle Relief';
        if (longRelief) longRelief.bullpenRole = 'Long Relief';
        if (opener) opener.bullpenRole = 'Opener';

        pool.forEach(player => {
            player.bullpenRole = 'Middle Relief';
        });
    }

    getCurrentPlayerPitcher() {
        if (!this.currentMatch) return null;
        return this.playerIsHomeInCurrentMatch ? this.currentMatch.home.pitcher : this.currentMatch.away.pitcher;
    }

    resetPitcherStamina() {
        this.pitcherStamina = new Map();
        this.roster.forEach(player => {
            if (player.position === 'P') {
                const max = Math.max(50, player.stats.stamina || 80);
                this.pitcherStamina.set(player.id, max);
            }
        });
    }

    ensurePitcherStamina() {
        this.roster.forEach(player => {
            if (player.position !== 'P') return;
            if (!this.pitcherStamina.has(player.id)) {
                const max = Math.max(50, player.stats.stamina || 80);
                this.pitcherStamina.set(player.id, max);
            }
        });
    }

    ensurePitcherStaminaForTeam(team) {
        if (!team || !team.roster) return;
        team.roster.forEach(player => {
            if (player.position !== 'P') return;
            if (!this.pitcherStamina.has(player.id)) {
                const max = Math.max(50, player.stats.stamina || 80);
                this.pitcherStamina.set(player.id, max);
            }
        });
    }

    ensurePitcherRestDays() {
        this.roster.forEach(player => {
            if (player.position !== 'P') return;
            if (!this.pitcherRestDays.has(player.id)) {
                this.pitcherRestDays.set(player.id, 2);
            }
            if (!this.pitcherWorkloadHistory.has(player.id)) {
                this.pitcherWorkloadHistory.set(player.id, []);
            }
        });
    }

    consumePitcherStamina(pitcher, amount) {
        if (!pitcher) return;
        const current = this.pitcherStamina.get(pitcher.id);
        if (typeof current !== 'number') return;
        const max = Math.max(50, pitcher.stats.stamina || 80);
        const staminaBonus = Math.max(0, (max - 60) / 200);
        const randomFactor = 0.8 + Math.random() * 0.4;
        const fatigueFactor = Math.max(0.6, 1 - staminaBonus);
        const drain = Math.max(0.5, amount * randomFactor * fatigueFactor);
        this.pitcherStamina.set(pitcher.id, Math.max(0, current - drain));
        const workload = this.pitcherWorkload.get(pitcher.id) || 0;
        this.pitcherWorkload.set(pitcher.id, workload + drain);
        const pitchCount = this.pitcherPitchCount.get(pitcher.id) || 0;
        this.pitcherPitchCount.set(pitcher.id, pitchCount + Math.max(1, Math.round(amount)));
    }

    getPitcherStaminaRatio(pitcher) {
        return this.getPitcherStaminaValues(pitcher).ratio;
    }

    getPitcherStaminaValues(pitcher) {
        if (!pitcher) return { current: 0, max: 0, ratio: 0 };
        const max = Math.max(50, pitcher.stats.stamina || 80);
        const stored = this.pitcherStamina.get(pitcher.id);
        const current = typeof stored === 'number' ? stored : max;
        const ratio = Math.max(0, Math.min(1, current / Math.max(1, max)));
        return { current, max, ratio };
    }

    getPitcherFatigueMultiplier(pitcher) {
        const ratio = this.getPitcherStaminaRatio(pitcher);
        return (1 - ratio) * 0.18;
    }

    recoverPitcherStamina() {
        this.roster.forEach(player => {
            if (player.position !== 'P') return;
            const max = Math.max(50, player.stats.stamina || 80);
            const current = this.pitcherStamina.get(player.id) ?? max;
            const used = this.pitcherWorkload.get(player.id) || 0;
            const usedRatio = Math.min(1, used / max);
            const restDays = Math.min(5, this.pitcherRestDays.get(player.id) || 0);
            const history = this.pitcherWorkloadHistory.get(player.id) || [];
            const recentAvg = history.length
                ? history.reduce((sum, val) => sum + val, 0) / history.length
                : 0;
            const recentRatio = Math.min(1, recentAvg / max);
            const staminaBonus = Math.max(0, (max - 60) / 200);
            const isStarter = this.rotation.some(starter => starter && starter.id === player.id);
            let recoveryCap;
            if (isStarter) {
                const restFactor = Math.min(4, restDays) / 4;
                recoveryCap = 0.5 + (restFactor * 0.45);
                if (usedRatio > 0.95) recoveryCap -= 0.28;
                else if (usedRatio > 0.75) recoveryCap -= 0.2;
                else if (usedRatio > 0.6) recoveryCap -= 0.12;
                if (recentRatio > 0.7) recoveryCap -= 0.08;
                recoveryCap += staminaBonus * 0.12;
            } else {
                const restFactor = Math.min(3, restDays) / 3;
                recoveryCap = 0.65 + (restFactor * 0.3);
                if (used >= 50) recoveryCap -= 0.4;
                else if (used >= 35) recoveryCap -= 0.28;
                else if (used >= 20) recoveryCap -= 0.14;
                if (recentRatio > 0.6) recoveryCap -= 0.08;
                recoveryCap += staminaBonus * 0.1;
            }
            recoveryCap = Math.max(0.4, Math.min(1, recoveryCap));
            const target = Math.round(max * recoveryCap);
            this.pitcherStamina.set(player.id, Math.max(current, target));
        });
        this.pitcherWorkload = new Map();
    }

    updatePitcherRestDaysAfterMatch() {
        this.roster.forEach(player => {
            if (player.position !== 'P') return;
            const used = this.pitcherWorkload.get(player.id) || 0;
            if (used > 0) {
                this.pitcherRestDays.set(player.id, 0);
                const history = this.pitcherWorkloadHistory.get(player.id) || [];
                history.push(used);
                while (history.length > 3) history.shift();
                this.pitcherWorkloadHistory.set(player.id, history);
            } else {
                const current = this.pitcherRestDays.get(player.id) || 0;
                this.pitcherRestDays.set(player.id, Math.min(5, current + 1));
            }
        });
    }

    getTeamLineupPlayers(team) {
        if (!team || !team.lineup) return [];
        return team.lineup
            .map(entry => entry && entry.player ? entry.player : entry)
            .filter(player => player && player.position !== 'P');
    }

    initMatchBattingOrder(match) {
        this.battingOrderState = new Map();
        if (!match) return;
        [match.home, match.away].forEach(team => {
            const order = this.getTeamLineupPlayers(team);
            this.battingOrderState.set(team.id, { order, index: 0 });
        });
    }

    ensureBattingOrderState(team) {
        if (!team) return null;
        const existing = this.battingOrderState.get(team.id);
        const order = this.getTeamLineupPlayers(team);
        if (!existing || existing.order.length !== order.length) {
            const state = { order, index: 0 };
            this.battingOrderState.set(team.id, state);
            return state;
        }
        return existing;
    }

    getNextBatterInfo(team) {
        const state = this.ensureBattingOrderState(team);
        if (!state || state.order.length === 0) {
            return { batter: null, nextBatter: null };
        }
        const batter = state.order[state.index % state.order.length];
        const nextIndex = (state.index + 1) % state.order.length;
        const nextBatter = state.order[nextIndex];
        return { batter, nextBatter };
    }

    advanceBatter(team) {
        const state = this.ensureBattingOrderState(team);
        if (!state || state.order.length === 0) return;
        state.index = (state.index + 1) % state.order.length;
    }

    getTeamActivePitcher(team) {
        if (!team) return null;
        if (team.pitcher) return team.pitcher;
        return team.roster ? team.roster.find(player => player.position === 'P') : null;
    }

    applyMatchFatigue(team, opponent) {
        if (!team) return;
        const batters = this.getTeamLineupPlayers(team);
        const pitcher = this.getTeamActivePitcher(team);

        batters.forEach(player => {
            this.ensurePlayerHealth(player);
            const fatigueGain = 8 + Math.random() * 6;
            player.health.fatigue = Math.min(100, player.health.fatigue + fatigueGain);
            this.applyInjuryCheck(player, 0.006);
        });

        if (pitcher) {
            this.ensurePlayerHealth(pitcher);
            const fatigueGain = 12 + Math.random() * 8;
            pitcher.health.fatigue = Math.min(100, pitcher.health.fatigue + fatigueGain);
            this.applyInjuryCheck(pitcher, 0.01);
        }
    }

    applyInjuryCheck(player, baseChance) {
        if (!player || player.health.injuryDays > 0) return;
        const fatigue = player.health.fatigue || 0;
        if (fatigue < 75) return;
        const chance = baseChance + Math.max(0, (fatigue - 75) / 250);
        if (Math.random() < chance) {
            const longInjury = Math.random() < 0.2;
            const minDays = longInjury ? 30 : 7;
            const maxDays = longInjury ? 60 : 21;
            player.health.injuryDays = minDays + Math.floor(Math.random() * (maxDays - minDays + 1));
            this.log(`${player.name} is injured (${player.health.injuryDays} games).`, { highlight: true });
        }
    }

    advancePlayerRecovery() {
        const players = this.getAllLeaguePlayers();
        players.forEach(player => {
            this.ensurePlayerHealth(player);
            if (player.health.injuryDays > 0) {
                player.health.injuryDays = Math.max(0, player.health.injuryDays - 1);
                player.health.fatigue = Math.max(0, player.health.fatigue - 4);
            } else {
                player.health.fatigue = Math.max(0, player.health.fatigue - 12);
            }
        });
    }

    advanceScoutingProgress() {
        if (!this.scoutingQueue || this.scoutingQueue.length === 0) return;
        const completed = [];
        this.scoutingQueue = this.scoutingQueue.map(entry => ({
            ...entry,
            gamesRemaining: Math.max(0, entry.gamesRemaining - 1)
        }));
        this.scoutingQueue = this.scoutingQueue.filter(entry => {
            if (entry.gamesRemaining <= 0) {
                completed.push(...(entry.prospects || []));
                return false;
            }
            return true;
        });
        if (completed.length > 0) {
            this.scoutingPool = [...this.scoutingPool, ...completed];
            this.log(`Scouting reports ready: ${completed.length} prospects added.`);
        }
        this.renderScoutingList();
        this.saveGame();
    }

    updateBullpenSelect() {
        const select = document.getElementById('bullpen-select');
        if (!select) return;
        const bullpen = this.getBullpenPitchers();
        select.innerHTML = '';
        bullpen.forEach(player => {
            const option = document.createElement('option');
            option.value = player.id;
            option.textContent = `${player.name} (${player.bullpenRole || 'Long Relief'})`;
            select.appendChild(option);
        });
        if (bullpen.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No bullpen available';
            select.appendChild(option);
        }
    }

    maybeAutoSubstitute(pitcher, ratio) {
        if (!this.autoBullpenEnabled || !this.isSimulating || !this.currentMatch) return;
        if (!pitcher || typeof ratio !== 'number') return;
        if (ratio > this.autoBullpenThreshold) return;
        if (this.isAutoSubstituting) return;

        const bullpen = this.getBullpenPitchers().filter(player => player.id !== pitcher.id);
        if (bullpen.length === 0) return;

        const rolePriority = ['Middle Relief', 'Long Relief', 'Setup', 'Closer', 'Opener'];
        const best = bullpen
            .map(player => ({
                player,
                roleIndex: rolePriority.indexOf(player.bullpenRole || 'Long Relief'),
                staminaRatio: this.getPitcherStaminaRatio(player)
            }))
            .sort((a, b) => {
                if (a.roleIndex !== b.roleIndex) return a.roleIndex - b.roleIndex;
                return b.staminaRatio - a.staminaRatio;
            })[0];

        if (best && best.player && best.player.id !== pitcher.id) {
            this.isAutoSubstituting = true;
            try {
                this.substitutePitcher(best.player.id);
            } finally {
                this.isAutoSubstituting = false;
            }
        }
    }

    maybeAutoSubstituteForTeam(team, pitcher) {
        if (!this.autoBullpenEnabled || !this.isSimulating || !team) return;
        if (!pitcher) return;
        const ratio = this.getPitcherStaminaRatio(pitcher);
        if (ratio > this.autoBullpenThreshold) return;
        if (this.isAutoSubstituting) return;

        const bullpen = (team.roster || []).filter(player => player.position === 'P' && player.id !== pitcher.id);
        if (bullpen.length === 0) return;
        bullpen.forEach(player => this.ensureBullpenRole(player));

        const rolePriority = ['Middle Relief', 'Long Relief', 'Setup', 'Closer', 'Opener'];
        const best = bullpen
            .map(player => ({
                player,
                roleIndex: rolePriority.indexOf(player.bullpenRole || 'Long Relief'),
                staminaRatio: this.getPitcherStaminaRatio(player)
            }))
            .sort((a, b) => {
                if (a.roleIndex !== b.roleIndex) return a.roleIndex - b.roleIndex;
                return b.staminaRatio - a.staminaRatio;
            })[0];

        if (best && best.player && best.player.id !== pitcher.id) {
            this.isAutoSubstituting = true;
            try {
                this.substitutePitcherForTeam(team, best.player);
            } finally {
                this.isAutoSubstituting = false;
            }
        }
    }

    substitutePitcher(playerId) {
        if (!this.currentMatch) return;
        const pitcher = this.roster.find(player => player.id === playerId);
        if (!pitcher) return;
        if (this.playerIsHomeInCurrentMatch) {
            this.currentMatch.home.pitcher = pitcher;
        } else {
            this.currentMatch.away.pitcher = pitcher;
        }
        if (!this.pitcherStamina.has(pitcher.id)) {
            const max = Math.max(50, pitcher.stats.stamina || 80);
            this.pitcherStamina.set(pitcher.id, max);
        }
        this.updatePitcherStaminaUI();
        this.log(`Pitching change: ${pitcher.name} enters.`);
    }

    substitutePitcherForTeam(team, pitcher) {
        if (!team || !pitcher) return;
        team.pitcher = pitcher;
        if (!this.pitcherStamina.has(pitcher.id)) {
            const max = Math.max(50, pitcher.stats.stamina || 80);
            this.pitcherStamina.set(pitcher.id, max);
        }
        if (this.currentMatch && (team.id === this.playerTeamId)) {
            this.updatePitcherStaminaUI();
        }
        this.log(`Pitching change: ${pitcher.name} enters.`);
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
        if (player.health) {
            lines.push(`FAT ${Math.round(player.health.fatigue || 0)} • INJ ${player.health.injuryDays || 0}`);
        }
        if (typeof player.optionsRemaining === 'number') {
            lines.push(`OPTIONS ${player.optionsRemaining}`);
        }
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
        const secondaryBtn = document.getElementById('player-modal-secondary');
        if (!overlay || !titleEl || !bodyEl || !actionBtn) return;

        titleEl.innerText = player.name;
        const stats = player.stats;
        const performance = this.ensurePerformance(player);
        const current = performance.currentSeason;
        const staminaValues = player.position === 'P' ? this.getPitcherStaminaValues(player) : null;
        const staminaDisplay = player.position === 'P'
            ? `${Math.round(staminaValues.current)}/${Math.round(staminaValues.max)}`
            : Math.round(stats.stamina || 0);
        const perfHtml = options.showPerformance
            ? `
            <div class="modal-section">
                <div class="modal-section-title">Current Season</div>
                <div class="season-line">BAT ${this.formatBattingLine(current)}</div>
                <div class="season-line">PIT ${this.formatPitchingLine(current)}</div>
                <div class="season-line">G ${current.games} • PA ${current.plateAppearances} • HR ${current.homeRuns} • BB ${current.walks} • HBP ${current.hitByPitch} • K ${current.strikeouts || 0}</div>
                <div class="season-line">R ${current.pitcherRunsAllowed} • ER ${current.pitcherEarnedRunsAllowed} • UER ${current.pitcherUnearnedRunsAllowed} • K ${current.pitcherStrikeouts || 0} • HR ${current.pitcherHomeRunsAllowed || 0}</div>
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
            <div class="stat-label">Stamina</div><div class="stat-value">${staminaDisplay}</div>
            <div class="stat-label">Fatigue</div><div class="stat-value">${Math.round(player.health?.fatigue || 0)}</div>
            <div class="stat-label">Injury</div><div class="stat-value">${player.health?.injuryDays || 0} days</div>
            <div class="stat-label">Options</div><div class="stat-value">${typeof player.optionsRemaining === 'number' ? player.optionsRemaining : 0}</div>
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

        if (secondaryBtn) {
            if (options.secondaryActionLabel && options.secondaryAction) {
                secondaryBtn.innerText = options.secondaryActionLabel;
                secondaryBtn.style.display = 'inline-flex';
                secondaryBtn.onclick = () => {
                    options.secondaryAction();
                    overlay.classList.add('hidden');
                };
            } else {
                secondaryBtn.style.display = 'none';
                secondaryBtn.onclick = null;
            }
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
                strikeouts: legacy.strikeouts || 0,
                stolenBases: legacy.stolenBases || 0,
                caughtStealing: legacy.caughtStealing || 0,
                outs: legacy.outs || 0,
                pitcherBattersFaced: legacy.pitcherBattersFaced || 0,
                pitcherHitsAllowed: legacy.pitcherHitsAllowed || 0,
                pitcherOuts: legacy.pitcherOuts || 0,
                pitcherWalksAllowed: legacy.pitcherWalksAllowed || 0,
                pitcherHitByPitchAllowed: legacy.pitcherHitByPitchAllowed || 0,
                pitcherRunsAllowed: legacy.pitcherRunsAllowed || 0,
                pitcherEarnedRunsAllowed: legacy.pitcherEarnedRunsAllowed || 0,
                pitcherUnearnedRunsAllowed: legacy.pitcherUnearnedRunsAllowed || 0,
                pitcherStrikeouts: legacy.pitcherStrikeouts || 0,
                pitcherHomeRunsAllowed: legacy.pitcherHomeRunsAllowed || 0
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
            current.strikeouts = current.strikeouts || 0;
            current.stolenBases = current.stolenBases || 0;
            current.caughtStealing = current.caughtStealing || 0;
            current.pitcherWalksAllowed = current.pitcherWalksAllowed || 0;
            current.pitcherHitByPitchAllowed = current.pitcherHitByPitchAllowed || 0;
            current.pitcherEarnedRunsAllowed = current.pitcherEarnedRunsAllowed || 0;
            current.pitcherUnearnedRunsAllowed = current.pitcherUnearnedRunsAllowed || 0;
            current.pitcherStrikeouts = current.pitcherStrikeouts || 0;
            current.pitcherHomeRunsAllowed = current.pitcherHomeRunsAllowed || 0;
        }

        return player.performance;
    }

    ensureRosterPerformance() {
        this.roster.forEach(player => this.ensurePerformance(player));
    }

    ensurePlayerHealth(player) {
        if (!player.health) {
            player.health = { fatigue: 0, injuryDays: 0 };
        }
        if (typeof player.health.fatigue !== 'number') player.health.fatigue = 0;
        if (typeof player.health.injuryDays !== 'number') player.health.injuryDays = 0;
        if (!player.rosterStatus) player.rosterStatus = 'active';
    }

    ensureRosterHealth() {
        this.roster.forEach(player => this.ensurePlayerHealth(player));
    }

    ensureAllPlayerHealth() {
        const players = this.league ? this.getAllLeaguePlayers() : this.roster;
        players.forEach(player => this.ensurePlayerHealth(player));
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
        const wobaDenominator = obpDenominator;
        const woba = wobaDenominator
            ? (0.69 * walks + 0.72 * hbp + 0.88 * singles + 1.247 * doubles + 1.578 * triples + 2.031 * homeRuns) / wobaDenominator
            : 0;
        return {
            avg: this.formatAverage(hits, atBats),
            obp: this.formatRate(obp),
            slg: this.formatRate(slg),
            ops: this.formatRate(ops),
            woba: this.formatRate(woba),
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

        const display = this.sortTeamStats(teamStats, opsRankMap, eraRankMap);

        tableBody.innerHTML = '';
        display.forEach((entry, index) => {
            const tr = document.createElement('tr');
            if (entry.team.id === this.playerTeamId) tr.classList.add('player-team');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${entry.team.name}</td>
                <td>${entry.avg}</td>
                <td>${entry.ops}</td>
                <td>${entry.runsFor}</td>
                <td>${entry.hits}</td>
                <td>${entry.homeRuns}</td>
                <td>${entry.walks}</td>
                <td>${entry.strikeouts}</td>
                <td>${entry.hitByPitch}</td>
                <td>${entry.stolenBases}</td>
                <td>${entry.caughtStealing}</td>
                <td>${entry.der}</td>
                <td>${entry.era}</td>
                <td>${entry.whip}</td>
                <td>${entry.runsAgainst}</td>
                <td>${entry.raPerGame}</td>
                <td>${entry.ra9}</td>
                <td>${opsRankMap.get(entry.team.id)}</td>
                <td>${eraRankMap.get(entry.team.id)}</td>
            `;
            tableBody.appendChild(tr);
        });

        this.renderTeamTrendChart();
        this.renderPlayerRankings();
        this.renderRecentGames();
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
            acc.strikeouts += perf.strikeouts || 0;
            acc.stolenBases += perf.stolenBases || 0;
            acc.caughtStealing += perf.caughtStealing || 0;
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
            sacFlies: 0,
            strikeouts: 0,
            stolenBases: 0,
            caughtStealing: 0
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
            acc.pitcherStrikeouts += perf.pitcherStrikeouts || 0;
            acc.pitcherHomeRunsAllowed += perf.pitcherHomeRunsAllowed || 0;
            return acc;
        }, {
            pitcherOuts: 0,
            pitcherRunsAllowed: 0,
            pitcherEarnedRunsAllowed: 0,
            pitcherUnearnedRunsAllowed: 0,
            pitcherHitsAllowed: 0,
            pitcherWalksAllowed: 0,
            pitcherHitByPitchAllowed: 0,
            pitcherStrikeouts: 0,
            pitcherHomeRunsAllowed: 0
        });

        const pitching = this.calculatePitchingStats(pitchingTotals);
        const teamSeason = this.teamSeasonStats[team.id] || { runsFor: 0, runsAgainst: 0, games: 0 };
        const ip = pitchingTotals.pitcherOuts / 3;
        const ra9 = ip ? ((teamSeason.runsAgainst * 9) / ip).toFixed(2) : '0.00';
        const raPerGame = teamSeason.games ? (teamSeason.runsAgainst / teamSeason.games).toFixed(2) : '0.00';
        const outsInPlay = Math.max(0, pitchingTotals.pitcherOuts - pitchingTotals.pitcherStrikeouts);
        const hitsInPlay = Math.max(0, pitchingTotals.pitcherHitsAllowed - pitchingTotals.pitcherHomeRunsAllowed);
        const bipTotal = outsInPlay + hitsInPlay;
        const derValue = bipTotal ? (outsInPlay / bipTotal) : 0;

        return {
            avg: batting.avg,
            ops: batting.ops,
            hits: battingTotals.hits,
            homeRuns: battingTotals.homeRuns,
            walks: battingTotals.walks,
            strikeouts: battingTotals.strikeouts,
            hitByPitch: battingTotals.hitByPitch,
            stolenBases: battingTotals.stolenBases,
            caughtStealing: battingTotals.caughtStealing,
            der: this.formatRate(derValue),
            era: pitching.era,
            whip: pitching.whip,
            runsFor: teamSeason.runsFor,
            runsAgainst: teamSeason.runsAgainst,
            raPerGame,
            ra9,
            opsValue: parseFloat(batting.ops),
            eraValue: parseFloat(pitching.era)
        };
    }

    sortTeamStats(teamStats, opsRankMap, eraRankMap) {
        const key = this.teamStatsSortKey;
        const dir = this.teamStatsSortDir === 'asc' ? 1 : -1;
        const getValue = (entry) => {
            switch (key) {
                case 'team':
                    return entry.team.name;
                case 'avg':
                    return parseFloat(entry.avg);
                case 'ops':
                    return parseFloat(entry.ops);
                case 'era':
                    return parseFloat(entry.era);
                case 'whip':
                    return parseFloat(entry.whip);
                case 'runsFor':
                    return entry.runsFor;
                case 'hits':
                    return entry.hits;
                case 'homeRuns':
                    return entry.homeRuns;
                case 'walks':
                    return entry.walks;
                case 'strikeouts':
                    return entry.strikeouts;
                case 'hitByPitch':
                    return entry.hitByPitch;
                case 'stolenBases':
                    return entry.stolenBases;
                case 'caughtStealing':
                    return entry.caughtStealing;
                case 'der':
                    return parseFloat(entry.der);
                case 'runsAgainst':
                    return entry.runsAgainst;
                case 'raPerGame':
                    return parseFloat(entry.raPerGame);
                case 'ra9':
                    return parseFloat(entry.ra9);
                case 'opsRank':
                    return opsRankMap.get(entry.team.id);
                case 'eraRank':
                    return eraRankMap.get(entry.team.id);
                default:
                    return parseFloat(entry.ops);
            }
        };

        return [...teamStats].sort((a, b) => {
            const aVal = getValue(a);
            const bVal = getValue(b);
            if (typeof aVal === 'string') {
                return aVal.localeCompare(bVal) * dir;
            }
            return (aVal - bVal) * dir;
        });
    }

    initStatsSorting() {
        const headers = document.querySelectorAll('#team-stats-table thead th[data-sort-key]');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const key = header.dataset.sortKey;
                if (!key) return;
                if (this.teamStatsSortKey === key) {
                    this.teamStatsSortDir = this.teamStatsSortDir === 'asc' ? 'desc' : 'asc';
                } else {
                    this.teamStatsSortKey = key;
                    this.teamStatsSortDir = key === 'era' || key === 'whip' || key === 'raPerGame' || key === 'ra9' ? 'asc' : 'desc';
                }
                this.updateTeamStatsView();
            });
        });

        const batterHeaders = document.querySelectorAll('#player-rank-batters thead th[data-sort-key]');
        batterHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const key = header.dataset.sortKey;
                if (!key) return;
                if (this.batterRankSortKey === key) {
                    this.batterRankSortDir = this.batterRankSortDir === 'asc' ? 'desc' : 'asc';
                } else {
                    this.batterRankSortKey = key;
                    this.batterRankSortDir = key === 'name' ? 'asc' : 'desc';
                }
                this.renderPlayerRankings();
            });
        });

        const pitcherHeaders = document.querySelectorAll('#player-rank-pitchers thead th[data-sort-key]');
        pitcherHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const key = header.dataset.sortKey;
                if (!key) return;
                if (this.pitcherRankSortKey === key) {
                    this.pitcherRankSortDir = this.pitcherRankSortDir === 'asc' ? 'desc' : 'asc';
                } else {
                    this.pitcherRankSortKey = key;
                    this.pitcherRankSortDir = key === 'era' || key === 'whip' ? 'asc' : (key === 'name' ? 'asc' : 'desc');
                }
                this.renderPlayerRankings();
            });
        });
    }

    renderPlayerRankings() {
        const batterBody = document.querySelector('#player-rank-batters tbody');
        const pitcherBody = document.querySelector('#player-rank-pitchers tbody');
        if (!batterBody || !pitcherBody) return;

        if (!this.roster || this.roster.length === 0) {
            batterBody.innerHTML = '';
            pitcherBody.innerHTML = '';
            return;
        }

        const batters = this.roster.filter(player => player.position !== 'P').map(player => {
            const perf = this.ensurePerformance(player).currentSeason;
            const batting = this.calculateBattingStats(perf);
            return {
                player,
                avg: batting.avg,
                obp: batting.obp,
                slg: batting.slg,
                ops: batting.ops,
                woba: batting.woba,
                ab: perf.atBats || 0,
                hits: perf.hits || 0,
                doubles: perf.doubles || 0,
                triples: perf.triples || 0,
                hr: perf.homeRuns || 0,
                bb: perf.walks || 0,
                so: perf.strikeouts || 0
            };
        });

        const pitchers = this.roster.filter(player => player.position === 'P').map(player => {
            const perf = this.ensurePerformance(player).currentSeason;
            const pitching = this.calculatePitchingStats(perf);
            const ip = perf.pitcherOuts ? (perf.pitcherOuts / 3).toFixed(1) : '0.0';
            return {
                player,
                era: pitching.era,
                whip: pitching.whip,
                ip,
                k: perf.pitcherStrikeouts || 0,
                bb: perf.pitcherWalksAllowed || 0,
                hr: perf.pitcherHomeRunsAllowed || 0,
                h: perf.pitcherHitsAllowed || 0,
                games: perf.games
            };
        });

        const sortedBatters = this.sortPlayerRanking(batters, this.batterRankSortKey, this.batterRankSortDir);
        const sortedPitchers = this.sortPlayerRanking(pitchers, this.pitcherRankSortKey, this.pitcherRankSortDir);

        batterBody.innerHTML = '';
        sortedBatters.forEach((entry, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${entry.player.name}</td>
                <td>${entry.avg}</td>
                <td>${entry.obp}</td>
                <td>${entry.slg}</td>
                <td>${entry.ops}</td>
                <td>${entry.woba}</td>
                <td>${entry.ab}</td>
                <td>${entry.hits}</td>
                <td>${entry.doubles}</td>
                <td>${entry.triples}</td>
                <td>${entry.hr}</td>
                <td>${entry.bb}</td>
                <td>${entry.so}</td>
            `;
            batterBody.appendChild(row);
        });

        pitcherBody.innerHTML = '';
        sortedPitchers.forEach((entry, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${entry.player.name}</td>
                <td>${entry.era}</td>
                <td>${entry.whip}</td>
                <td>${entry.ip}</td>
                <td>${entry.k}</td>
                <td>${entry.bb}</td>
                <td>${entry.hr}</td>
                <td>${entry.h}</td>
                <td>${entry.games}</td>
            `;
            pitcherBody.appendChild(row);
        });
    }

    sortPlayerRanking(entries, key, dir) {
        const multiplier = dir === 'asc' ? 1 : -1;
        return [...entries].sort((a, b) => {
            const aVal = a[key];
            const bVal = b[key];
            if (typeof aVal === 'string') {
                return aVal.localeCompare(bVal) * multiplier;
            }
            return (parseFloat(aVal) - parseFloat(bVal)) * multiplier;
        });
    }

    renderTeamTrendChart() {
        const chart = document.getElementById('team-trend-chart');
        if (!chart) return;
        const teamStats = this.teamSeasonStats[this.playerTeamId];
        if (!teamStats || teamStats.games === 0) {
            chart.innerText = 'No games played yet.';
            return;
        }

        const runsFor = teamStats.runsForByGame;
        const runsAgainst = teamStats.runsAgainstByGame;
        const maxVal = Math.max(1, ...runsFor, ...runsAgainst);
        const width = 520;
        const height = 110;
        const pad = 10;

        const buildPath = (data) => data.map((val, idx) => {
            const x = pad + (idx / Math.max(1, data.length - 1)) * (width - pad * 2);
            const y = height - pad - (val / maxVal) * (height - pad * 2);
            return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
        }).join(' ');

        const svg = `
            <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
                <path d="${buildPath(runsFor)}" stroke="#4caf50" stroke-width="2" fill="none"/>
                <path d="${buildPath(runsAgainst)}" stroke="#ff5252" stroke-width="2" fill="none"/>
            </svg>
        `;
        chart.innerHTML = svg;
    }

    renderRecentGames() {
        const list = document.getElementById('recent-games-list');
        if (!list) return;
        const teamStats = this.teamSeasonStats[this.playerTeamId];
        if (!teamStats || !teamStats.gameLog || teamStats.gameLog.length === 0) {
            list.innerHTML = '<div class="recent-game-row">No games played yet.</div>';
            return;
        }
        const recent = [...teamStats.gameLog].slice(-8).reverse();
        list.innerHTML = '';
        recent.forEach(entry => {
            const row = document.createElement('div');
            row.className = 'recent-game-row';
            const resultClass = entry.result === 'W' ? 'result' : 'result loss';
            const homeAway = entry.isHome ? 'vs' : '@';
            row.innerHTML = `
                <span>R${entry.round} ${homeAway} ${entry.opponentName}</span>
                <span>${entry.runsFor}-${entry.runsAgainst}</span>
                <span class="${resultClass}">${entry.result}</span>
            `;
            list.appendChild(row);
        });
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

    applyPerformanceTraining() {
        const players = this.getAllLeaguePlayers();
        players.forEach(player => {
            const perf = this.ensurePerformance(player).currentSeason;
            if (player.position === 'P') {
                this.applyPitcherPerformanceTraining(player, perf);
            } else {
                this.applyBatterPerformanceTraining(player, perf);
            }
            this.recalculatePlayerFinancials(player);
        });
    }

    applyBatterPerformanceTraining(player, perf) {
        const plateAppearances = perf.plateAppearances || 0;
        const playingFactor = Math.min(1.1, plateAppearances / 450);
        const batting = this.calculateBattingStats(perf);
        const ops = parseFloat(batting.ops);
        const avg = parseFloat(batting.avg);
        const deltas = { contact: 0, power: 0, speed: 0, defense: 0 };

        if (plateAppearances >= 120) {
            if (ops >= 0.9) { deltas.power += 2; deltas.contact += 1; }
            else if (ops >= 0.82) { deltas.power += 1; deltas.contact += 1; }
            else if (ops <= 0.55) { deltas.power -= 1; deltas.contact -= 2; }
            else if (ops <= 0.62) { deltas.power -= 1; deltas.contact -= 1; }

            if (avg >= 0.3) deltas.contact += 1;
            else if (avg <= 0.22) deltas.contact -= 1;
        }

        const trainingRoll = Math.random();
        const trainingGain = Math.round((0.6 + Math.random() * 0.8) * playingFactor);
        if (trainingGain > 0) {
            if (trainingRoll < 0.4) deltas.contact += trainingGain;
            else if (trainingRoll < 0.7) deltas.power += trainingGain;
            else if (trainingRoll < 0.85) deltas.defense += trainingGain;
            else deltas.speed += trainingGain;
        }

        this.applyStatDeltas(player, deltas);
    }

    applyPitcherPerformanceTraining(player, perf) {
        const outs = perf.pitcherOuts || 0;
        const innings = outs / 3;
        const pitching = this.calculatePitchingStats(perf);
        const era = parseFloat(pitching.era);
        const whip = parseFloat(pitching.whip);
        const deltas = { pitching: 0, stamina: 0 };
        const maxStamina = Math.max(50, player.stats.stamina || 80);
        const staminaBoost = 1 + Math.max(0, (maxStamina - 60) / 200);

        if (innings >= 15) {
            if (era <= 2.75) deltas.pitching += 2;
            else if (era <= 3.5) deltas.pitching += 1;
            else if (era >= 6) deltas.pitching -= 2;
            else if (era >= 5) deltas.pitching -= 1;

            if (whip <= 1.15) deltas.pitching += 1;
            else if (whip >= 1.45) deltas.pitching -= 1;
        }

        const trainingGain = Math.round((0.5 + Math.random() * 0.9) * staminaBoost);
        if (trainingGain > 0 && outs >= 9) {
            if (Math.random() < 0.7) deltas.pitching += trainingGain;
            else deltas.stamina += Math.max(1, Math.round(trainingGain * 0.7));
        }

        this.applyStatDeltas(player, deltas);
    }

    applyStatDeltas(player, deltas) {
        const stats = player.stats;
        Object.entries(deltas).forEach(([key, value]) => {
            if (typeof value !== 'number' || value === 0) return;
            if (key === 'pitching' && player.position !== 'P') return;
            stats[key] = Math.floor(Math.max(0, Math.min(99, (stats[key] || 0) + value)));
        });
        player.stats = stats;
    }

    recalculatePlayerFinancials(player) {
        const stats = player.stats;
        const overall = player.position === 'P'
            ? stats.pitching * 0.8 + stats.power * 0.1 + stats.contact * 0.1
            : stats.contact * 0.3 + stats.power * 0.3 + stats.speed * 0.2 + stats.defense * 0.2;
        stats.overall = Math.round(overall);
        stats.salary = Math.round(overall * 15000);
        stats.signingBonus = stats.salary * 10;
        player.stats = stats;
    }
    getAllLeaguePlayers() {
        const seen = new Map();
        const addPlayer = (player) => {
            if (!player || !player.id) return;
            seen.set(player.id, player);
        };

        this.roster.forEach(addPlayer);
        this.aaaRoster.forEach(addPlayer);
        this.ilRoster.forEach(addPlayer);
        if (this.league) {
            this.league.teams.forEach(team => {
                team.roster.forEach(addPlayer);
                if (team.pitcher) addPlayer(team.pitcher);
            });
            this.league.freeAgents.forEach(addPlayer);
            (this.league.waiverWire || []).forEach(addPlayer);
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
            if (outcome.desc && outcome.desc.includes('Strikeout')) {
                current.strikeouts = (current.strikeouts || 0) + 1;
            }
        }
    }

    recordPitcherOutcome(pitcher, outcome) {
        const perf = this.ensurePerformance(pitcher);
        const current = perf.currentSeason;
        current.pitcherBattersFaced += 1;
        if (outcome.type === 'hit') {
            current.pitcherHitsAllowed += 1;
            if (outcome.desc && outcome.desc.includes('Home Run')) {
                current.pitcherHomeRunsAllowed = (current.pitcherHomeRunsAllowed || 0) + 1;
            }
        } else if (outcome.type === 'walk') {
            current.pitcherWalksAllowed += 1;
        } else if (outcome.type === 'hbp') {
            current.pitcherHitByPitchAllowed += 1;
        } else if (outcome.type === 'sac_fly') {
            current.pitcherOuts += 1;
        } else if (outcome.type === 'out') {
            current.pitcherOuts += 1;
            if (outcome.desc && outcome.desc.includes('Strikeout')) {
                current.pitcherStrikeouts = (current.pitcherStrikeouts || 0) + 1;
            }
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
        this.scoutingQueue.push({
            gamesRemaining: this.scoutingLeadTimeGames,
            prospects: newProspects
        });
        this.renderScoutingList();
        this.saveGame();
        this.log(`Scouting started. Reports ready in ${this.scoutingLeadTimeGames} games.`);
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
        const needBtn = document.getElementById('draft-need-btn');
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
        if (needBtn) needBtn.disabled = !isPlayerTurn;

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

    draftBestForNeed() {
        if (!this.draftActive) return;
        const currentTeamId = this.draftOrder[this.draftPickIndex];
        if (currentTeamId !== this.playerTeamId) return;
        if (this.draftPool.length === 0) return;

        const counts = this.getRosterCounts(this.roster);
        const rankMultipliers = this.getPositionRankMultipliers();
        const baseWeights = {
            P: 1.15,
            C: 1.1,
            SS: 1.08,
            CF: 1.05,
            '2B': 1.02,
            '3B': 1.02,
            LF: 1.0,
            RF: 1.0,
            '1B': 0.98,
            DH: 0.95
        };
        const getNeedBoost = (pos) => {
            if (pos === 'P' && counts.P < this.minPitchersActive) return 1.2;
            if (pos === 'C' && counts.C < this.minCatchersActive) return 1.2;
            if (['1B', '2B', '3B', 'SS'].includes(pos) && (counts[pos] || 0) < this.minInfieldByPosition[pos]) return 1.15;
            if (['LF', 'CF', 'RF'].includes(pos) && counts.OF < this.minOutfieldActive) return 1.15;
            return 1;
        };
        const getValue = (player) => player.position === 'P'
            ? (player.stats.pitching || 0)
            : (player.stats.overall || 0);
        const avoidPitchers = counts.P >= this.maxPitchersActive;
        const scorePlayer = (player) => {
            if (avoidPitchers && player.position === 'P') return -Infinity;
            const base = baseWeights[player.position] || 1;
            const rankMult = rankMultipliers[player.position] || 1;
            const needBoost = getNeedBoost(player.position);
            return getValue(player) * base * rankMult * needBoost;
        };
        const best = [...this.draftPool].sort((a, b) => scorePlayer(b) - scorePlayer(a))[0];
        if (best) this.draftPlayer(best.id);
    }

    getPositionRankMultipliers() {
        if (!this.league) return {};
        const positions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH', 'P'];
        const teamStrengths = this.league.teams.map(team => ({
            teamId: team.id,
            map: this.calculatePositionStrength(team)
        }));
        const multipliers = {};
        positions.forEach(pos => {
            const ranked = [...teamStrengths]
                .map(entry => ({ teamId: entry.teamId, value: entry.map[pos] || 0 }))
                .sort((a, b) => b.value - a.value);
            const rankIndex = ranked.findIndex(entry => entry.teamId === this.playerTeamId);
            const rank = rankIndex >= 0 ? rankIndex + 1 : ranked.length;
            multipliers[pos] = 1 + Math.max(0, rank - 1) * 0.03;
        });
        return multipliers;
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
            if (this.roster.length >= this.draftRosterLimit) {
                alert(`Roster is full (Max ${this.draftRosterLimit}). Release a player before drafting.`);
                return;
            }
            if (this.getFortyManCount() >= this.fortyManLimit) {
                alert(`40-man roster is full (Max ${this.fortyManLimit}). Release a player before drafting.`);
                return;
            }
            this.setPlayerRosterStatus(player, 'active');
            this.addToFortyManRoster(player);
            this.roster.push(player);
            this.log(`Drafted ${player.name} (${player.position}).`);
        } else {
            if (currentTeam.roster.length < this.draftRosterLimit) {
                player.rosterStatus = 'active';
                currentTeam.roster.push(player);
                if (currentTeam.fortyManRoster && !currentTeam.fortyManRoster.includes(player.id)) {
                    currentTeam.fortyManRoster.push(player.id);
                }
            }
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
        this.league.waiverWire = [];
        this.tradeDeadlineRound = Math.max(1, Math.floor(this.league.schedule.length * 0.7));
        this.tradeDeadlinePassed = false;
        this.postseason = null;
        this.postseasonActive = false;
        if (this.league.calendar) {
            this.league.calendar.tradeDeadlineRound = this.tradeDeadlineRound;
            this.league.calendar.postseasonStartRound = this.league.schedule.length + 1;
        }

        this.resetSeasonStatsForNewSeason();
        this.initTeamSeasonStats();
        this.enforceRosterLimitsForTeam(this.getPlayerTeam());
        this.league.teams.forEach(team => {
            if (team.id === this.playerTeamId) return;
            this.enforceRosterLimitsForTeam(team);
        });
        this.ensureAAAInitialized();

        this.updateLeagueView();
        this.renderRosterAndMarket();
        this.saveGame();
        alert(`Season ${this.league.season} is about to begin!`);
    }
}
