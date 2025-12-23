export class Player {
    constructor(id, name, position, age, stats, performance = null) {
        this.id = id;
        this.name = name;
        this.position = position; // 'P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'
        this.age = age;
        const stamina = typeof stats.stamina === 'number'
            ? stats.stamina
            : Player.deriveStamina(position, stats);

        // Stats 0-100
        this.stats = {
            contact: stats.contact || 50, // Hit chance
            power: stats.power || 50,     // HR/XBH chance
            speed: stats.speed || 50,     // Steal/Run chance
            defense: stats.defense || 50, // Error reduction
            pitching: stats.pitching || 0, // Pitcher only
            stamina: stamina,
            overall: stats.overall || 50,
            salary: stats.salary || 0,
            signingBonus: stats.signingBonus || 0
        };

        this.performance = performance || Player.defaultPerformance();
    }

    getOverview() {
        return `${this.name} (${this.position}) - CON:${this.stats.contact} POW:${this.stats.power}`;
    }

    static deriveStamina(position, stats) {
        const pitching = typeof stats.pitching === 'number' ? stats.pitching : null;
        const overall = typeof stats.overall === 'number' ? stats.overall : 50;
        const base = position === 'P' && pitching !== null ? pitching : overall;
        const scaled = position === 'P' ? 40 + base * 0.45 : 35 + base * 0.35;
        const min = position === 'P' ? 45 : 40;
        const max = position === 'P' ? 90 : 85;
        return Math.round(Math.max(min, Math.min(max, scaled)));
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
                sacFlies: 0,
                strikeouts: 0,
                outs: 0,
                pitcherBattersFaced: 0,
                pitcherHitsAllowed: 0,
                pitcherOuts: 0,
                pitcherWalksAllowed: 0,
                pitcherHitByPitchAllowed: 0,
                pitcherRunsAllowed: 0,
                pitcherEarnedRunsAllowed: 0,
                pitcherUnearnedRunsAllowed: 0,
                pitcherStrikeouts: 0,
                pitcherHomeRunsAllowed: 0
            },
            seasons: []
        };
    }
}
