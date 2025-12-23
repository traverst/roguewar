import { PlayerProfile } from '../meta/types';
import {
    ProfileStorage,
    campaignManager,
    unlockRegistry,
    achievementManager,
    tutorialCampaign
} from '../meta';

/**
 * MetaGameContext - Global meta-game state manager
 * Handles profile loading, campaign registration, and meta-state coordination
 */
export class MetaGameContext {
    private profileStorage: ProfileStorage;
    public currentProfile: PlayerProfile | null = null;

    constructor() {
        this.profileStorage = new ProfileStorage();
    }

    /**
     * Initialize meta-game system
     */
    async init(): Promise<void> {
        // Initialize profile storage
        await this.profileStorage.init();

        // Load or create active profile
        this.currentProfile = await this.profileStorage.getOrCreateActiveProfile();

        // Register campaigns
        campaignManager.registerCampaign(tutorialCampaign);

        console.log('[MetaGame] Initialized with profile:', this.currentProfile.displayName);
    }

    /**
     * Get current profile
     */
    getProfile(): PlayerProfile {
        if (!this.currentProfile) {
            throw new Error('Meta-game not initialized');
        }
        return this.currentProfile;
    }

    /**
     * Save current profile
     */
    async saveProfile(): Promise<void> {
        if (!this.currentProfile) return;
        await this.profileStorage.saveProfile(this.currentProfile);
    }

    /**
     * Check if content is unlocked
     */
    isUnlocked(contentId: string): boolean {
        return unlockRegistry.isUnlocked(this.getProfile(), contentId);
    }

    /**
     * Apply unlocks and save
     */
    async applyUnlocks(unlockIds: string[]): Promise<string[]> {
        const profile = this.getProfile();
        const newUnlocks = unlockRegistry.applyUnlocks(profile, unlockIds);

        if (newUnlocks.length > 0) {
            await this.saveProfile();
        }

        return newUnlocks;
    }

    /**
     * Grant achievements and process rewards
     */
    async grantAchievements(achievementIds: string[]): Promise<void> {
        const profile = this.getProfile();
        const allRewards: string[] = [];

        for (const achId of achievementIds) {
            if (!profile.achievements.includes(achId)) {
                profile.achievements.push(achId);

                // Get rewards from achievement
                const achievement = achievementManager.getAllAchievements()
                    .find(a => a.id === achId);

                if (achievement && achievement.rewards.length > 0) {
                    allRewards.push(...achievement.rewards);
                }
            }
        }

        // Apply all rewards
        if (allRewards.length > 0) {
            await this.applyUnlocks(allRewards);
        } else {
            await this.saveProfile();
        }
    }
}
