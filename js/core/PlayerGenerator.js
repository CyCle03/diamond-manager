import { Player } from './Player.js';

const FIRST_NAMES = ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles", "Shohei", "Mookie", "Mike", "Aaron", "Juan", "Gerrit", "Jacob", "Clayton", "Max", "Justin"];
const LAST_NAMES = ["Smith", "Johnson", "Williams", "Jones", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor", "Ohtani", "Betts", "Trout", "Judge", "Soto", "Cole", "deGrom", "Kershaw", "Scherzer", "Verlander"];

export class PlayerGenerator {
    static generateRandomId() {
        return Math.random().toString(36).substr(2, 9);
    }

    static generateName() {
        const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
        const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
        return `${first} ${last}`;
    }

    static createPlayer(rules, position = null) {
        const positions = rules.getPositions();
        const chosenPos = position || positions[Math.floor(Math.random() * positions.length)];
        const age = 18 + Math.floor(Math.random() * 7); // Generate age 18-24

        return new Player(
            this.generateRandomId(),
            this.generateName(),
            chosenPos,
            age,
            rules.generatePlayerStats(chosenPos)
        );
    }

    static createProspect(rules, options = {}) {
        const positions = rules.getPositions();
        const chosenPos = options.position || positions[Math.floor(Math.random() * positions.length)];
        const minAge = options.minAge ?? 18;
        const maxAge = options.maxAge ?? 22;
        const age = minAge + Math.floor(Math.random() * (maxAge - minAge + 1));

        return new Player(
            this.generateRandomId(),
            this.generateName(),
            chosenPos,
            age,
            rules.generatePlayerStats(chosenPos)
        );
    }

    static createTeamRoster(rules, size = 25) {
        const roster = [];
        const positions = rules.getPositions();

        // 1. Ensure at least one of each position
        positions.forEach(pos => roster.push(this.createPlayer(rules, pos)));

        // 2. Ensure Pitching Staff (Target ~12 Pitchers)
        let pitcherCount = roster.filter(p => p.position === 'P').length;
        const targetPitchers = 12;

        while (pitcherCount < targetPitchers && roster.length < size) {
            roster.push(this.createPlayer(rules, 'P'));
            pitcherCount++;
        }

        // 3. Fill the rest with random players
        while (roster.length < size) {
            roster.push(this.createPlayer(rules));
        }

        return roster;
    }

    static createDraftPool(rules, size) {
        const pool = [];
        for (let i = 0; i < size; i++) {
            pool.push(this.createProspect(rules, { minAge: 18, maxAge: 22 }));
        }
        return pool;
    }

    static createScoutingPool(rules, size) {
        const pool = [];
        for (let i = 0; i < size; i++) {
            pool.push(this.createProspect(rules, { minAge: 19, maxAge: 26 }));
        }
        return pool;
    }
}
