export class SaveManager {
    static getSaveKey(slotId) {
        return `diamond_manager_save_${slotId}`;
    }

    static save(slotId, data) {
        try {
            const key = this.getSaveKey(slotId);
            const serialized = JSON.stringify(data);
            localStorage.setItem(key, serialized);
            console.log(`Game saved to slot ${slotId}`);
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
    }
}
