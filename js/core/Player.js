export class Player {
    constructor(id, name, position, stats) {
        this.id = id;
        this.name = name;
        this.position = position; // 'P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'

        // Stats 0-100
        this.stats = {
            contact: stats.contact || 50, // Hit chance
            power: stats.power || 50,     // HR/XBH chance
            speed: stats.speed || 50,     // Steal/Run chance
            defense: stats.defense || 50, // Error reduction
            pitching: stats.pitching || 0 // Pitcher only
        };
    }

    getOverview() {
        return `${this.name} (${this.position}) - CON:${this.stats.contact} POW:${this.stats.power}`;
    }
}
