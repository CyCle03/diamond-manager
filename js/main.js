import { Game } from './core/Game.js';
import { BaseballRules } from './rules/BaseballRules.js';
import { syncBeforeBoot, wireAccountUI } from './core/cloud.js';

console.log("Diamond Manager Initialized");

// 로그인 상태면 서버 슬롯을 localStorage 로 먼저 맞춘 뒤 게임을 만든다.
// 그래야 아래 Game 이 지금까지처럼 SaveManager(=localStorage)만 읽으면 된다.
await syncBeforeBoot();

// Init boilerplate with Baseball Rules
const game = new Game(new BaseballRules());
wireAccountUI();

// Debugging global
window.game = game;
