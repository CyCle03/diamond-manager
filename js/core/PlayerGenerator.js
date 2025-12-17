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

        return new Player(
            this.generateRandomId(),
            this.generateName(),
            chosenPos,
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
}
