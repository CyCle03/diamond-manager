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

        // Ensure some spread (very basic logic)
        positions.forEach(pos => roster.push(this.createPlayer(rules, pos)));

        while (roster.length < size) {
            roster.push(this.createPlayer(rules));
        }

        return roster;
    }
}
