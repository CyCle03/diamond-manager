export class Player {
    constructor(id, name, position, age, stats, performance = null) {
        this.id = id;
        this.name = name;
        this.position = position; // 'P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'
        this.age = age;

        // Stats 0-100
        this.stats = {
            contact: stats.contact || 50, // Hit chance
            power: stats.power || 50,     // HR/XBH chance
            speed: stats.speed || 50,     // Steal/Run chance
            defense: stats.defense || 50, // Error reduction
            pitching: stats.pitching || 0, // Pitcher only
            overall: stats.overall || 50,
            salary: stats.salary || 0,
            signingBonus: stats.signingBonus || 0
        };

        this.performance = performance || Player.defaultPerformance();
    }

    getOverview() {
        return `${this.name} (${this.position}) - CON:${this.stats.contact} POW:${this.stats.power}`;
    }

    static defaultPerformance() {
        return {
            currentSeason: {
                games: 0,
                plateAppearances: 0,
                atBats: 0,
                hits: 0,
                singles: 0,
                doubles: 0,
                triples: 0,
                homeRuns: 0,
                walks: 0,
                hitByPitch: 0,
                outs: 0,
                pitcherBattersFaced: 0,
                pitcherHitsAllowed: 0,
                pitcherOuts: 0,
                pitcherWalksAllowed: 0,
                pitcherHitByPitchAllowed: 0,
                pitcherRunsAllowed: 0
            },
            seasons: []
        };
    }
}
