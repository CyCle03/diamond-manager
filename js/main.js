import { Game } from './core/Game.js';
import { BaseballRules } from './rules/BaseballRules.js';
import { syncBeforeBoot, wireAccountUI } from './core/cloud.js';
import { DEBUG_ENABLED, debugLog } from './core/debug.js';

debugLog("Diamond Manager Initialized");

// 로그인 상태면 서버 슬롯을 localStorage 로 먼저 맞춘 뒤 게임을 만든다.
// 그래야 아래 Game 이 지금까지처럼 SaveManager(=localStorage)만 읽으면 된다.
await syncBeforeBoot();

// Init boilerplate with Baseball Rules
const game = new Game(new BaseballRules());
wireAccountUI();

// 콘솔에서 들여다보기 위한 개발용 전역. 게임 코드는 이걸 참조하지 않는다.
// 배포본에 두면 콘솔에서 게임 상태를 그대로 고칠 수 있고, 이제는 그 상태가
// 서버 저장으로 다른 기기까지 따라간다. 그래서 디버그일 때만 노출한다.
if (DEBUG_ENABLED) window.game = game;
