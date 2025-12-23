import { GameLog } from '@roguewar/rules';

const DB_NAME = 'roguewar';
const DB_VERSION = 3; // Bumped for meta.gameId keyPath
const STORE_NAME = 'games';

export class GameStorage {
    private db: IDBDatabase | null = null;

    async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                // If it exists, delete and recreate for the new keyPath
                if (db.objectStoreNames.contains(STORE_NAME)) {
                    db.deleteObjectStore(STORE_NAME);
                }
                db.createObjectStore(STORE_NAME, { keyPath: 'meta.gameId' });
            };
        });
    }

    async saveGame(log: GameLog): Promise<void> {
        if (!this.db) throw new Error("Database not initialized");
        log.meta.lastSaved = Date.now();

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(log);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async loadGame(gameId: string): Promise<GameLog | null> {
        if (!this.db) throw new Error("Database not initialized");
        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(gameId);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteGame(gameId: string): Promise<void> {
        if (!this.db) throw new Error("Database not initialized");
        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.delete(gameId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async listGames(): Promise<GameLog[]> {
        if (!this.db) throw new Error("Database not initialized");
        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getLatestGame(): Promise<GameLog | null> {
        const games = await this.listGames();
        if (games.length === 0) return null;
        return games.reduce((latest, current) =>
            (current.meta.lastSaved || 0) > (latest.meta.lastSaved || 0) ? current : latest
        );
    }

    async clearAll(): Promise<void> {
        if (!this.db) throw new Error("Database not initialized");
        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    exportToJSON(log: GameLog): string {
        return JSON.stringify(log, null, 2);
    }

    importFromJSON(json: string): GameLog {
        return JSON.parse(json);
    }
}
