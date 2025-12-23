import { GameRules } from '../core/GameRules.js';

export class BaseballRules extends GameRules {
    constructor(options = {}) {
        super("Baseball");
        const level = options.leagueLevel || 'mlb';
        this.setLeagueLevel(level);
    }

    getLeagueLevelConfig(level) {
        const levels = {
            mlb: { baserunnerAggression: 1.0, throwOutFactor: 1.0 },
            aaa: { baserunnerAggression: 0.97, throwOutFactor: 0.93 },
            aa: { baserunnerAggression: 0.93, throwOutFactor: 0.88 },
            college: { baserunnerAggression: 0.9, throwOutFactor: 0.82 },
            highschool: { baserunnerAggression: 0.86, throwOutFactor: 0.75 }
        };
        return levels[level] || levels.mlb;
    }

    setLeagueLevel(level) {
        const config = this.getLeagueLevelConfig(level);
        this.leagueLevel = level;
        this.baserunnerAggression = config.baserunnerAggression;
        this.throwOutFactor = config.throwOutFactor;
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

        let inning = 1;
        while (true) {
            game.log(`--- INNING ${inning} START ---`);

            // Top (Away Bats)
            game.log(`TOP ${inning}: Away Team batting.`);
            if (game.updateInningDisplay) {
                game.updateInningDisplay('TOP', inning);
            }
            const awayRuns = await this.simulateHalfInning(game, awayTeam, homeTeam, {
                canWalkOff: false,
                isHomeBatting: false,
                homeScore: scores.home,
                awayScore: scores.away
            });
            scores.away += awayRuns;
            if (game.updateLineScore) {
                game.updateLineScore('away', inning, awayRuns);
            }
            if (game.recordTeamRuns) {
                game.recordTeamRuns(awayTeam.id, homeTeam.id, awayRuns);
            }

            if (inning >= 9 && scores.home > scores.away) {
                break;
            }

            // Bot (Home Bats)
            game.log(`BOT ${inning}: Home Team batting.`);
            if (game.updateInningDisplay) {
                game.updateInningDisplay('BOT', inning);
            }
            const homeRuns = await this.simulateHalfInning(game, homeTeam, awayTeam, {
                canWalkOff: inning >= 9,
                isHomeBatting: true,
                homeScore: scores.home,
                awayScore: scores.away
            });
            scores.home += homeRuns;
            if (game.updateLineScore) {
                game.updateLineScore('home', inning, homeRuns);
            }
            if (game.recordTeamRuns) {
                game.recordTeamRuns(homeTeam.id, awayTeam.id, homeRuns);
            }

            game.updateScoreboard(scores.home, scores.away);
            if (inning >= 9 && scores.home !== scores.away) {
                break;
            }
            inning++;
        }

        game.log(`GAME OVER! Final: Home: ${scores.home} - Away: ${scores.away}`);

        // Notify game engine of result
        // This allows Game.js to update standings
        if (game.finishMatch) {
            await game.finishMatch(scores.home, scores.away);
        }

        return scores;
    }

    async simulateHalfInning(game, battingTeam, fieldingTeam, options = {}) {
        let outs = 0;
        let runs = 0;
        const bases = { first: null, second: null, third: null };
        const canWalkOff = options.canWalkOff;
        const isHomeBatting = options.isHomeBatting;
        const homeScore = options.homeScore || 0;
        const awayScore = options.awayScore || 0;
        let walkOffReached = false;

        // Helper to get a player object whether the lineup item is a raw Player or an {player, role} entry.
        const getPlayer = (entry) => entry.player || entry;
        const baserunnerAggression = this.baserunnerAggression || 1;
        const throwOutFactor = this.throwOutFactor || 1;
        const scoreRunner = (runner, earned = true) => {
            if (!runner) return;
            runs++;
            if (game.recordPitcherRun) {
                game.recordPitcherRun(fieldingTeam.pitcher, 1, earned);
            }
            if (canWalkOff && isHomeBatting && (homeScore + runs) > awayScore) {
                walkOffReached = true;
            }
        };
        const recordRunnerOut = (runner, desc) => {
            outs++;
            if (game.updateOutsDisplay) {
                game.updateOutsDisplay(outs);
            }
            const name = runner?.name || 'Runner';
            game.log(`${name} out at ${desc} (${outs} Out)`, { highlight: true });
        };
        const forceAdvance = (batter) => {
            if (bases.first) {
                if (bases.second) {
                    if (bases.third) {
                        scoreRunner(bases.third);
                    }
                    bases.third = bases.second;
                }
                bases.second = bases.first;
            }
            bases.first = batter;
        };
        const maybeTakeExtraBase = (runner, baseChance) => {
            const speed = runner?.stats?.speed || 50;
            const twoOutBoost = outs >= 2 ? 0.08 : 0;
            const adjusted = (baseChance + twoOutBoost) * baserunnerAggression;
            const chance = Math.max(0.15, Math.min(0.9, adjusted + (speed - 50) * 0.006));
            return Math.random() < chance;
        };
        const outfieldArmWeights = { LF: 1.0, CF: 1.1, RF: 1.35 };
        const getDefenseByRole = (roles, weights = {}) => {
            if (!fielders.length) return averageDefense;
            const roleSet = new Set(roles);
            const defenders = fielders.filter(entry => roleSet.has(entry.role));
            if (defenders.length === 0) return averageDefense;
            const total = defenders.reduce((sum, entry) => {
                const weight = weights[entry.role] ?? 1;
                return sum + (entry.player.stats.defense || 50) * weight;
            }, 0);
            const weightTotal = defenders.reduce((sum, entry) => sum + (weights[entry.role] ?? 1), 0);
            return weightTotal > 0 ? total / weightTotal : averageDefense;
        };
        const attemptScoreWithThrow = (runner, baseOutChance, armDefense) => {
            const speed = runner?.stats?.speed || 50;
            const speedFactor = Math.max(0.55, Math.min(1.4, 1 - (speed - 50) * 0.007));
            const defenseFactor = Math.max(0.6, Math.min(1.5, (armDefense || 50) / 60));
            const outChance = Math.min(0.6, baseOutChance * throwOutFactor * speedFactor * defenseFactor);
            if (Math.random() < outChance) {
                recordRunnerOut(runner, 'home');
                return false;
            }
            return true;
        };
        const advanceOnSingle = (batter) => {
            if (bases.third) {
                scoreRunner(bases.third);
                bases.third = null;
            }
            if (bases.second) {
                if (maybeTakeExtraBase(bases.second, 0.62)) {
                    const armDefense = getDefenseByRole(['LF', 'CF', 'RF'], outfieldArmWeights);
                    if (attemptScoreWithThrow(bases.second, 0.08, armDefense)) {
                        scoreRunner(bases.second);
                    }
                    bases.second = null;
                } else {
                    bases.third = bases.second;
                    bases.second = null;
                }
            }
            if (bases.first) {
                const tryHome = outs >= 2 && !bases.third && maybeTakeExtraBase(bases.first, 0.12);
                if (tryHome) {
                    const armDefense = getDefenseByRole(['LF', 'CF', 'RF'], outfieldArmWeights);
                    if (attemptScoreWithThrow(bases.first, 0.28, armDefense)) {
                        scoreRunner(bases.first);
                    }
                    bases.first = null;
                } else {
                    if (!bases.third && maybeTakeExtraBase(bases.first, 0.28)) {
                        bases.third = bases.first;
                    } else {
                        bases.second = bases.first;
                    }
                    bases.first = null;
                }
            }
            bases.first = batter;
        };
        const advanceOnDouble = (batter) => {
            if (bases.third) {
                scoreRunner(bases.third);
                bases.third = null;
            }
            if (bases.second) {
                scoreRunner(bases.second);
                bases.second = null;
            }
            if (bases.first) {
                if (maybeTakeExtraBase(bases.first, 0.62)) {
                    const armDefense = getDefenseByRole(['LF', 'CF', 'RF'], outfieldArmWeights);
                    if (attemptScoreWithThrow(bases.first, 0.18, armDefense)) {
                        scoreRunner(bases.first);
                    }
                    bases.first = null;
                } else {
                    bases.third = bases.first;
                    bases.first = null;
                }
            }
            bases.second = batter;
        };
        const advanceOnTriple = (batter) => {
            if (bases.third) scoreRunner(bases.third);
            if (bases.second) scoreRunner(bases.second);
            if (bases.first) scoreRunner(bases.first);
            bases.first = null;
            bases.second = null;
            bases.third = batter;
        };
        const advanceOnHomer = (batter) => {
            if (bases.third) scoreRunner(bases.third);
            if (bases.second) scoreRunner(bases.second);
            if (bases.first) scoreRunner(bases.first);
            bases.first = null;
            bases.second = null;
            bases.third = null;
            scoreRunner(batter);
        };
        const getPitchCountEstimate = (batter, pitcher) => {
            const contact = batter?.stats?.contact || 50;
            const pitching = pitcher?.stats?.pitching || 50;
            const base = 3 + Math.floor(Math.random() * 3);
            const variance = Math.round((contact - pitching) / 40);
            const bonus = Math.random() < 0.35 ? 1 : 0;
            return Math.max(3, Math.min(8, base + variance + bonus));
        };

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
            const pitchCount = getPitchCountEstimate(batter, opponentPitcher);
            for (let pitchIndex = 0; pitchIndex < pitchCount; pitchIndex++) {
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
            if (outcome.type === 'out' && outcome.desc.includes('Flyout') && bases.third && outs < 2 && Math.random() < 0.35) {
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
                game.log(`${batter.name}: Sac Fly (${outs} Out)`, { highlight: true });
                scoreRunner(bases.third);
                bases.third = null;
            } else if (outcome.type === 'out') {
                const isGrounder = outcome.desc.includes('Groundout');
                if (isGrounder && bases.first && outs < 2 && Math.random() < 0.22) {
                    outs += 2;
                    bases.first = null;
                    game.log(`${batter.name}: Groundout DP (${outs} Out)`, { highlight: true });
                } else {
                    outs++;
                    game.log(`${batter.name}: ${outcome.desc} (${outs} Out)`);
                }
                if (game.updateOutsDisplay) {
                    game.updateOutsDisplay(outs);
                }
            } else {
                game.log(`${batter.name}: ${outcome.desc}!`);
                if (outcome.type === 'hit') {
                    if (outcome.desc.includes('Home Run')) {
                        game.log(`>>> HOME RUN! <<<<`, { highlight: true });
                        advanceOnHomer(batter);
                    } else if (outcome.desc.includes('Triple')) {
                        advanceOnTriple(batter);
                    } else if (outcome.desc.includes('Double')) {
                        advanceOnDouble(batter);
                    } else {
                        advanceOnSingle(batter);
                    }
                } else if (outcome.type === 'walk' || outcome.type === 'hbp') {
                    forceAdvance(batter);
                }
            }
            if (walkOffReached) {
                game.log(`WALK-OFF!`, { highlight: true });
                return runs;
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
