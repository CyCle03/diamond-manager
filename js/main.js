import { Game } from './core/Game.js';
import { BaseballRules } from './rules/BaseballRules.js';

console.log("Diamond Manager Initialized");

// Init boilerplate with Baseball Rules
const game = new Game(new BaseballRules());

// Debugging global
window.game = game;
