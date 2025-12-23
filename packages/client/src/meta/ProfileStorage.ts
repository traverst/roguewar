import { PlayerProfile } from './types';

const DB_NAME = 'roguewar-meta';
const DB_VERSION = 1;
const PROFILE_STORE = 'profiles';
const CURRENT_PROFILE_KEY = 'currentProfileId';

/**
 * ProfileStorage - IndexedDB-based storage for player profiles
 * Manages meta-game progression completely separate from GameLog storage
 */
export class ProfileStorage {
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

                // Create profiles store if it doesn't exist
                if (!db.objectStoreNames.contains(PROFILE_STORE)) {
                    db.createObjectStore(PROFILE_STORE, { keyPath: 'profileId' });
                }
            };
        });
    }

    /**
     * Save a player profile
     */
    async saveProfile(profile: PlayerProfile): Promise<void> {
        if (!this.db) throw new Error("ProfileStorage not initialized");

        profile.lastPlayed = Date.now();

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction(PROFILE_STORE, 'readwrite');
            const store = tx.objectStore(PROFILE_STORE);
            const request = store.put(profile);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Load a profile by ID
     */
    async loadProfile(profileId: string): Promise<PlayerProfile | null> {
        if (!this.db) throw new Error("ProfileStorage not initialized");

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction(PROFILE_STORE, 'readonly');
            const store = tx.objectStore(PROFILE_STORE);
            const request = store.get(profileId);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all profiles
     */
    async listProfiles(): Promise<PlayerProfile[]> {
        if (!this.db) throw new Error("ProfileStorage not initialized");

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction(PROFILE_STORE, 'readonly');
            const store = tx.objectStore(PROFILE_STORE);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete a profile
     */
    async deleteProfile(profileId: string): Promise<void> {
        if (!this.db) throw new Error("ProfileStorage not initialized");

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction(PROFILE_STORE, 'readwrite');
            const store = tx.objectStore(PROFILE_STORE);
            const request = store.delete(profileId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get the current active profile ID from localStorage
     */
    getCurrentProfileId(): string | null {
        return localStorage.getItem(CURRENT_PROFILE_KEY);
    }

    /**
     * Set the current active profile ID in localStorage
     */
    setCurrentProfileId(profileId: string): void {
        localStorage.setItem(CURRENT_PROFILE_KEY, profileId);
    }

    /**
     * Create a new default profile
     */
    createDefaultProfile(displayName?: string): PlayerProfile {
        const profileId = `profile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const profile: PlayerProfile = {
            profileId,
            displayName: displayName || `Player ${Math.floor(Math.random() * 1000)}`,
            unlockedContent: ['hero:default'], // Start with default hero
            completedRuns: [],
            achievements: [],
            campaignProgress: {},
            createdAt: Date.now(),
            lastPlayed: Date.now()
        };

        return profile;
    }

    /**
     * Get or create the active profile
     * This is the main entry point for profile management
     */
    async getOrCreateActiveProfile(): Promise<PlayerProfile> {
        const currentId = this.getCurrentProfileId();

        if (currentId) {
            const profile = await this.loadProfile(currentId);
            if (profile) {
                return profile;
            }
        }

        // No current profile, check if any exist
        const profiles = await this.listProfiles();
        if (profiles.length > 0) {
            // Use the most recently played profile
            const mostRecent = profiles.reduce((latest, current) =>
                (current.lastPlayed || 0) > (latest.lastPlayed || 0) ? current : latest
            );
            this.setCurrentProfileId(mostRecent.profileId);
            return mostRecent;
        }

        // Create new profile
        const newProfile = this.createDefaultProfile();
        await this.saveProfile(newProfile);
        this.setCurrentProfileId(newProfile.profileId);
        return newProfile;
    }
}
