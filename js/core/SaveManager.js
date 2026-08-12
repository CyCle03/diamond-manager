import { queuePush, deleteRemote } from './cloud.js';
import { debugLog } from './debug.js';

/**
 * 세이브 슬롯 저장소.
 *
 * 게임의 모든 저장·삭제가 이 클래스를 지난다. 그래서 서버 반영도 여기서만
 * 건다 — 호출부는 로그인 여부를 몰라도 되고, 로그아웃 상태면 cloud.js 가
 * 아무 일도 하지 않는다.
 */
export class SaveManager {
    static getSaveKey(slotId) {
        return `diamond_manager_save_${slotId}`;
    }

    static save(slotId, data) {
        try {
            const key = this.getSaveKey(slotId);
            const serialized = JSON.stringify(data);
            localStorage.setItem(key, serialized);
            // 로그인 상태면 같은 저장본을 서버에도 올린다(전송은 cloud.js 가 몰아서 한다).
            queuePush(slotId, serialized);
            debugLog(`Game saved to slot ${slotId}`);
            return true;
        } catch (e) {
            console.error("Save failed:", e);
            alert("Failed to save game! Local storage might be full.");
            return false;
        }
    }

    static load(slotId) {
        try {
            const key = this.getSaveKey(slotId);
            const serialized = localStorage.getItem(key);
            if (!serialized) return null;
            return JSON.parse(serialized);
        } catch (e) {
            console.error("Load failed:", e);
            return null;
        }
    }

    static exists(slotId) {
        return localStorage.getItem(this.getSaveKey(slotId)) !== null;
    }

    static getMeta(slotId) {
        const data = this.load(slotId);
        if (!data) return null;
        return {
            teamName: data.teamName,
            season: data.season,
            round: data.league ? (data.league.currentRoundIndex + 1) : 1,
            timestamp: data.timestamp || Date.now()
        };
    }

    static clear(slotId) {
        localStorage.removeItem(this.getSaveKey(slotId));
        // 서버 슬롯도 함께 지운다. 안 지우면 다음 부팅 때 그대로 돌아온다.
        deleteRemote(slotId);
    }

    static setLastUsedSlot(slotId) {
        localStorage.setItem('diamond_manager_last_slot', slotId);
    }

    static getLastUsedSlot() {
        return localStorage.getItem('diamond_manager_last_slot');
    }

    static delete(slotId) {
        this.clear(slotId);
        // If we deleted the last used slot, clear that record too
        if (this.getLastUsedSlot() == slotId) {
            localStorage.removeItem('diamond_manager_last_slot');
        }
    }
}
