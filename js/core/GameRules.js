/**
 * Base class / Interface for Sports Rules
 * All sport-specific logic should implement this interface.
 */
export class GameRules {
    constructor(name) {
        this.name = name;
    }

    /**
     * Returns a list of valid position codes
     * @returns {string[]} e.g. ['P', 'C', '1B']
     */
    getPositions() {
        return [];
    }

    /**
     * Returns the target lineup size (excluding bench)
     * @returns {number}
     */
    getLineupSize() {
        return 0;
    }

    /**
     * Calculates stats for a generated player based on position
     * @param {string} position
     * @returns {object} e.g. { contact: 50, power: 50 }
     */
    generatePlayerStats(position) {
        return {};
    }

    /**
     * Validates if a lineup is legally constructed
     * @param {Array} lineup
     * @param {object} extras (e.g. pitcher)
     * @returns {boolean}
     */
    validateLineup(lineup, extras) {
        return false;
    }

    /**
     * Runs the full match simulation
     * @param {object} gameContext - Reference to the main Game instance (for logging/ui updates)
     * @param {object} homeTeam - { lineup: [], pitcher: {} }
     * @param {object} awayTeam
     */
    async simulateMatch(gameContext, homeTeam, awayTeam) {
        console.warn("simulateMatch not implemented");
    }
}
