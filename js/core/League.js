import { PlayerGenerator } from './PlayerGenerator.js';

export class League {
    constructor(rules) {
        this.rules = rules;
        this.teams = [];
        this.schedule = []; // Array of rounds (array of matches)
        this.currentRoundIndex = 0;
        this.standings = {}; // teamId -> { w, l, pts }
        this.freeAgents = [];
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
                lineup: lineup,
                pitcher: pitcher,
                isPlayer: false,
                budget: 5000000
            });
        });

        // 1.5 Generate Free Agents
        this.freeAgents = PlayerGenerator.createTeamRoster(this.rules, 10); // Start with 10 FAs

        // 2. Initialize Standings
        this.teams.forEach(t => {
            this.standings[t.id] = { w: 0, l: 0 };
        });

        // 3. Generate Round Robin Schedule
        this.generateSchedule();
    }

    generateSchedule() {
        // Simple Round Robin algorithm
        this.schedule = []; // Clear existing schedule
        const numTeams = this.teams.length;
        if (numTeams % 2 !== 0) {
            // In case of odd teams, this simple algorithm might fail. Add a dummy if needed.
            // For now, we assume 8 teams.
        }
        const rounds = numTeams - 1;
        const half = numTeams / 2;

        let teams = [...this.teams];

        for (let round = 0; round < rounds * 2; round++) { // Double Round Robin (Home & Away)
            const roundMatches = [];
            for (let i = 0; i < half; i++) {
                let home = teams[i];
                let away = teams[numTeams - 1 - i];

                // For the second half of the season, swap home and away to ensure fairness
                if (round >= rounds) {
                    [home, away] = [away, home];
                }

                roundMatches.push({ home, away });
            }
            this.schedule.push(roundMatches);

            // Rotate teams (keep first fixed)
            teams.splice(1, 0, teams.pop());
        }
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
