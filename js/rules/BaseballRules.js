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
            pitching: 0,
            stamina: 45 + Math.random() * 35
        };

        // Position specific adjustments
        if (position === 'P') {
            baseStats.pitching = 50 + Math.random() * 50;
            baseStats.contact = Math.random() * 30;
            baseStats.power = Math.random() * 20;
            baseStats.stamina = 55 + Math.random() * 30;
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

        // Add overall and financial stats
        const overall = position === 'P'
            ? baseStats.pitching * 0.8 + baseStats.power * 0.1 + baseStats.contact * 0.1
            : baseStats.contact * 0.3 + baseStats.power * 0.3 + baseStats.speed * 0.2 + baseStats.defense * 0.2;
        
        baseStats.overall = Math.round(overall);
        baseStats.salary = Math.round(overall * 15000);
        baseStats.signingBonus = baseStats.salary * 10;

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
            if (game.updateInningDisplay) {
                game.updateInningDisplay('TOP', inning);
            }
            const awayRuns = await this.simulateHalfInning(game, awayTeam, homeTeam);
            scores.away += awayRuns;
            if (game.recordTeamRuns) {
                game.recordTeamRuns(awayTeam.id, homeTeam.id, awayRuns);
            }

            // Bot (Home Bats)
            game.log(`BOT ${inning}: Home Team batting.`);
            if (game.updateInningDisplay) {
                game.updateInningDisplay('BOT', inning);
            }
            const homeRuns = await this.simulateHalfInning(game, homeTeam, awayTeam);
            scores.home += homeRuns;
            if (game.recordTeamRuns) {
                game.recordTeamRuns(homeTeam.id, awayTeam.id, homeRuns);
            }

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

    async simulateHalfInning(game, battingTeam, fieldingTeam) {
        let outs = 0;
        let runs = 0;

        // Helper to get a player object whether the lineup item is a raw Player or an {player, role} entry.
        const getPlayer = (entry) => entry.player || entry;

        // Calculate average defense for the fielding team
        const fielders = battingTeam && fieldingTeam && fieldingTeam.lineup
            ? fieldingTeam.lineup
                .filter(entry => entry && (entry.player || entry))
                .map(entry => {
                    const player = getPlayer(entry);
                    const role = entry && entry.role ? entry.role : player.position;
                    return { player, role };
                }).filter(entry => entry.player && entry.player.position !== 'P')
            : [];
        const weightedDefense = fielders.reduce((sum, entry) => {
            const weight = entry.role === 'C' ? 1.85 : (entry.role === 'SS' || entry.role === 'CF' ? 1.35 : 1);
            return sum + entry.player.stats.defense * weight;
        }, 0);
        const weightTotal = fielders.reduce((sum, entry) => {
            const weight = entry.role === 'C' ? 1.85 : (entry.role === 'SS' || entry.role === 'CF' ? 1.35 : 1);
            return sum + weight;
        }, 0);
        const averageDefense = weightTotal > 0 ? weightedDefense / weightTotal : 50; // Default to 50 if no fielders

        while (outs < 3) {
            // Get a random batter from the batting lineup
            const matchup = game.getNextBatterInfo ? game.getNextBatterInfo(battingTeam) : null;
            const batter = matchup ? matchup.batter : getPlayer(battingTeam.lineup[Math.floor(Math.random() * battingTeam.lineup.length)]);
            const nextBatter = matchup ? matchup.nextBatter : null;
            const opponentPitcher = fieldingTeam.pitcher;

            if (!batter) return runs;
            game.updateMatchupDisplay(batter, opponentPitcher, nextBatter);
            for (let pitchIndex = 0; pitchIndex < 3; pitchIndex++) {
                if (game.waitForSimulationEvent) {
                    await game.waitForSimulationEvent('pitch');
                } else {
                    await game.wait(200);
                }
                if (game.consumePitcherStamina) {
                    game.consumePitcherStamina(opponentPitcher, 1);
                }
            }

            if (game.waitForSimulationEvent) {
                await game.waitForSimulationEvent('batter');
            } else {
                await game.wait(500);
            }

            const fatigue = game.getPitcherFatigueMultiplier ? game.getPitcherFatigueMultiplier(opponentPitcher) : 0;
            const outcome = this.calculateOutcome(batter, opponentPitcher, averageDefense, fatigue);

            let recordedOutcome = outcome;
            let sacFlyTriggered = false;
            if (outcome.type === 'out' && outcome.desc.includes('Flyout') && Math.random() < 0.35) {
                sacFlyTriggered = true;
                recordedOutcome = { type: 'sac_fly', desc: 'Sac Fly' };
            }

            if (game.recordAtBat) {
                game.recordAtBat(batter, recordedOutcome);
            }
            if (game.recordPitcherOutcome) {
                game.recordPitcherOutcome(opponentPitcher, recordedOutcome);
            }

            if (recordedOutcome.type === 'sac_fly') {
                outs++;
                if (game.updateOutsDisplay) {
                    game.updateOutsDisplay(outs);
                }
                runs++;
                game.log(`${batter.name}: Sac Fly (${outs} Out)`, { highlight: true });
                if (game.recordPitcherRun) {
                    game.recordPitcherRun(opponentPitcher, 1, true);
                }
            } else if (outcome.type === 'out') {
                outs++;
                if (game.updateOutsDisplay) {
                    game.updateOutsDisplay(outs);
                }
                game.log(`${batter.name}: ${outcome.desc} (${outs} Out)`);
            } else {
                game.log(`${batter.name}: ${outcome.desc}!`);
                if (outcome.type === 'hit') {
                    if (outcome.desc.includes('Home Run')) {
                        runs++;
                        game.log(`>>> HOME RUN! <<<<`, { highlight: true });
                        if (game.recordPitcherRun) {
                            game.recordPitcherRun(opponentPitcher, 1, true);
                        }
                    } else {
                        if (Math.random() > 0.7) {
                            runs++;
                            game.log(`> Runner scores!`, { highlight: true });
                            if (game.recordPitcherRun) {
                                game.recordPitcherRun(opponentPitcher, 1, Math.random() > 0.15);
                            }
                        }
                    }
                }
            }
            if (game.advanceBatter) {
                game.advanceBatter(battingTeam);
            }
        }
        return runs;
    }

    calculateOutcome(batter, pitcher, fieldingDefense, fatigue = 0) {
        // Reuse logic from Game.js but isolated here
        let hitChance = ((batter.stats.contact || 50) - (pitcher.stats.pitching || 50) * 0.5) / 100 + 0.25;
        
        // Adjust hit chance based on fielding defense
        // A higher fieldingDefense reduces hit chance
        hitChance -= (fieldingDefense - 50) * 0.0012;
        hitChance += fatigue;
        hitChance = Math.max(0.05, Math.min(0.6, hitChance));
        
        const roll = Math.random();

        if (roll < hitChance) {
            const powerRoll = Math.random() * 100;
            const power = batter.stats.power || 50;
            if (powerRoll < power * 0.3) return { type: 'hit', desc: 'Home Run' };
            if (powerRoll < power * 0.6) return { type: 'hit', desc: 'Double' };
            return { type: 'hit', desc: 'Single' };
        } else {
            const secondaryRoll = Math.random();
            if (secondaryRoll < 0.07) return { type: 'walk', desc: 'Walk' };
            if (secondaryRoll < 0.08) return { type: 'hbp', desc: 'Hit By Pitch' };
            const outType = Math.random();
            if (outType < 0.3) return { type: 'out', desc: 'Strikeout' };
            if (outType < 0.6) return { type: 'out', desc: 'Groundout' };
            return { type: 'out', desc: 'Flyout' };
        }
    }

    updatePlayerStatsForAge(player) {
        const { stats, age, position } = player;
        const statKeys = ['contact', 'power', 'speed', 'defense', 'pitching'];

        statKeys.forEach(key => {
            if (key === 'pitching' && position !== 'P') return;
            if (key !== 'pitching' && position === 'P') return;

            let change = 0;
            if (age < 27) {
                // Young players: Improve
                change = Math.random() * 4; // 0-4
            } else if (age >= 27 && age <= 31) {
                // Prime players: Fluctuate
                change = Math.random() * 2 - 1; // -1 to +1
            } else {
                // Old players: Decline
                change = -(Math.random() * 4); // -4 to 0
            }
            stats[key] += change;
            stats[key] = Math.floor(Math.max(0, Math.min(99, stats[key])));
        });

        // Recalculate overall and financial stats
        const newOverall = position === 'P'
            ? stats.pitching * 0.8 + stats.power * 0.1 + stats.contact * 0.1
            : stats.contact * 0.3 + stats.power * 0.3 + stats.speed * 0.2 + stats.defense * 0.2;
        
        stats.overall = Math.round(newOverall);
        stats.salary = Math.round(newOverall * 15000);
        stats.signingBonus = stats.salary * 10;
        
        player.stats = stats;
    }
}
