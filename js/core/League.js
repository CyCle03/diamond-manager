import { PlayerGenerator } from './PlayerGenerator.js';

export class League {
    constructor(rules) {
        this.rules = rules;
        this.teams = [];
        this.schedule = []; // Array of rounds (array of matches)
        this.currentRoundIndex = 0;
        this.standings = {}; // teamId -> { w, l, pts }
        this.freeAgents = [];
        this.waiverWire = [];
        this.calendar = { totalRounds: 0, tradeDeadlineRound: null, postseasonStartRound: null };
        this.season = 1;
    }

    initialize(playerTeam) {
        // 1. Create 7 AI Teams + 1 Player Team
        this.teams = [playerTeam];
        const teamNames = ["Red Dragons", "Blue Sharks", "Green Vipers", "Golden Eagles", "Silver Wolves", "Iron Titans", "Neon Phantoms"];

        teamNames.forEach(name => {
            const roster = PlayerGenerator.createTeamRoster(this.rules, 26);
            // Auto lineup for AI
            const lineup = roster.slice(0, this.rules.getLineupSize());
            const pitcher = roster.find(p => p.position === 'P') || roster[0];

            this.teams.push({
                id: Math.random().toString(36).substr(2, 9),
                name: name,
                roster: roster,
                aaaRoster: [],
                ilRoster: [],
                fortyManRoster: roster.map(player => player.id),
                transactionsLog: [],
                lineup: lineup,
                pitcher: pitcher,
                isPlayer: false,
                budget: 20000000
            });
        });

        // 1.5 Generate Free Agents
        this.freeAgents = PlayerGenerator.createTeamRoster(this.rules, 10); // Start with 10 FAs
        this.freeAgents.forEach(player => {
            player.rosterStatus = 'fa';
        });
        this.waiverWire = [];

        // 2. Initialize Standings
        this.teams.forEach(t => {
            this.standings[t.id] = { w: 0, l: 0 };
        });

        // 3. Generate Round Robin Schedule
        this.generateSchedule();
    }

    generateSchedule() {
        // 8 teams: 84-game season with 3-game series (H/A/H/A) vs each opponent.
        this.schedule = [];
        const numTeams = this.teams.length;
        if (numTeams % 2 !== 0) {
            // In case of odd teams, this simple algorithm might fail. Add a dummy if needed.
            // For now, we assume 8 teams.
        }

        const rounds = numTeams - 1;
        const half = numTeams / 2;
        const baseRounds = [];
        let teams = [...this.teams];

        for (let round = 0; round < rounds; round++) { // Single round robin base
            const roundMatches = [];
            for (let i = 0; i < half; i++) {
                const home = teams[i];
                const away = teams[numTeams - 1 - i];
                roundMatches.push({ home, away });
            }
            baseRounds.push(roundMatches);
            teams.splice(1, 0, teams.pop());
        }

        const seriesLength = 3;
        const cycles = 4; // 4 series per opponent, 2 home / 2 away in any order
        const seriesOrderMap = new Map();
        const shuffle = (arr) => {
            const copy = [...arr];
            for (let i = copy.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [copy[i], copy[j]] = [copy[j], copy[i]];
            }
            return copy;
        };

        baseRounds.forEach(roundMatches => {
            roundMatches.forEach(match => {
                const ids = [match.home.id, match.away.id].sort();
                const key = `${ids[0]}_${ids[1]}`;
                if (!seriesOrderMap.has(key)) {
                    seriesOrderMap.set(key, shuffle([true, true, false, false]));
                }
            });
        });

        for (let cycle = 0; cycle < cycles; cycle++) {
            baseRounds.forEach(roundMatches => {
                for (let game = 0; game < seriesLength; game++) {
                    const seriesRound = roundMatches.map(match => {
                        const ids = [match.home.id, match.away.id].sort();
                        const key = `${ids[0]}_${ids[1]}`;
                        const order = seriesOrderMap.get(key) || [true, true, false, false];
                        const baseHome = match.home;
                        const baseAway = match.away;
                        if (order[cycle]) return { home: baseHome, away: baseAway };
                        return { home: baseAway, away: baseHome };
                    });
                    this.schedule.push(seriesRound);
                }
            });
        }

        this.calendar.totalRounds = this.schedule.length;
    }

    getCurrentRound() {
        return this.schedule[this.currentRoundIndex];
    }

    updateStandings(winnerId, loserId) {
        this.standings[winnerId].w++;
        this.standings[loserId].l++;
    }

    getSortedStandings() {
        return Object.keys(this.standings)
            .map(id => {
                const team = this.teams.find(t => t.id === id);
                return { ...team, ...this.standings[id] };
            })
            .sort((a, b) => b.w - a.w); // Sort by Wins
    }

    getDraftOrder() {
        const sorted = this.getSortedStandings();
        return [...sorted].reverse();
    }
}
