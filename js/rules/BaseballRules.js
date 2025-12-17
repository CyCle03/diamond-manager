import { GameRules } from '../core/GameRules.js';

export class BaseballRules extends GameRules {
    constructor() {
        super("Baseball");
    }

    getPositions() {
        return ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
    }

    getLineupSize() {
        return 9;
    }

    generatePlayerStats(position) {
        const baseStats = {
            contact: 30 + Math.random() * 60,
            power: 20 + Math.random() * 70,
            speed: 30 + Math.random() * 60,
            defense: 40 + Math.random() * 50,
            pitching: 0
        };

        // Position specific adjustments
        if (position === 'P') {
            baseStats.pitching = 50 + Math.random() * 50;
            baseStats.contact = Math.random() * 30;
            baseStats.power = Math.random() * 20;
        } else if (position === '1B' || position === 'DH') {
            baseStats.power += 10;
            baseStats.speed -= 10;
        } else if (position === 'SS' || position === 'CF' || position === '2B') {
            baseStats.defense += 10;
            baseStats.speed += 10;
        } else if (position === 'C') {
            baseStats.defense += 15;
            baseStats.speed -= 20;
        }

        // Clamp stats
        Object.keys(baseStats).forEach(key => {
            baseStats[key] = Math.floor(Math.max(0, Math.min(99, baseStats[key])));
        });

        return baseStats;
    }

    validateLineup(lineup, extras) {
        // Baseball requires a full 9-man batting order and 1 pitcher
        const isLineupFull = lineup.length === 9 && lineup.every(p => p !== null);
        const hasPitcher = extras && extras.pitcher !== null;
        return isLineupFull && hasPitcher;
    }

    async simulateMatch(game, homeTeam, awayTeam) {
        game.log("MATCH STARTING!");
        game.log(`Home Pitcher: ${homeTeam.pitcher.name}`);
        game.log(`Away Pitcher: ${awayTeam.pitcher.name}`);

        const scores = { home: 0, away: 0 };

        for (let inning = 1; inning <= 9; inning++) {
            game.log(`--- INNING ${inning} START ---`);

            // Top (Away Bats)
            game.log(`TOP ${inning}: Away Team batting.`);
            scores.away += await this.simulateHalfInning(game, awayTeam.lineup, homeTeam.pitcher);

            // Bot (Home Bats)
            game.log(`BOT ${inning}: Home Team batting.`);
            scores.home += await this.simulateHalfInning(game, homeTeam.lineup, awayTeam.pitcher);

            game.updateScoreboard(scores.home, scores.away);
        }

        game.log(`GAME OVER! Final: Home: ${scores.home} - Away: ${scores.away}`);

        // Notify game engine of result
        // This allows Game.js to update standings
        if (game.finishMatch) {
            await game.finishMatch(scores.home, scores.away);
        }

        return scores;
    }

    async simulateHalfInning(game, lineup, opponentPitcher) {
        let outs = 0;
        let runs = 0;

        while (outs < 3) {
            // Simplified random rotation
            const batter = lineup[Math.floor(Math.random() * lineup.length)];

            game.updateMatchupDisplay(batter, opponentPitcher);
            await game.wait(500);

            const outcome = this.calculateOutcome(batter, opponentPitcher);

            if (outcome.type === 'out') {
                outs++;
                game.log(`${batter.name}: ${outcome.desc} (${outs} Out)`);
            } else {
                game.log(`${batter.name}: ${outcome.desc}!`);
                if (outcome.type === 'hit') {
                    if (outcome.desc.includes('Home Run')) {
                        runs++;
                        game.log(`>>> HOME RUN! <<<<`);
                    } else {
                        if (Math.random() > 0.7) {
                            runs++;
                            game.log(`> Runner scores!`);
                        }
                    }
                }
            }
        }
        return runs;
    }

    calculateOutcome(batter, pitcher) {
        // Reuse logic from Game.js but isolated here
        const hitChance = ((batter.stats.contact || 50) - (pitcher.stats.pitching || 50) * 0.5) / 100 + 0.25;
        const roll = Math.random();

        if (roll < hitChance) {
            const powerRoll = Math.random() * 100;
            const power = batter.stats.power || 50;
            if (powerRoll < power * 0.3) return { type: 'hit', desc: 'Home Run' };
            if (powerRoll < power * 0.6) return { type: 'hit', desc: 'Double' };
            return { type: 'hit', desc: 'Single' };
        } else {
            const outType = Math.random();
            if (outType < 0.3) return { type: 'out', desc: 'Strikeout' };
            if (outType < 0.6) return { type: 'out', desc: 'Groundout' };
            return { type: 'out', desc: 'Flyout' };
        }
    }
}
