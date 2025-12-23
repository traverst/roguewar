import { Achievement, PlayerProfile, RunSummary } from './types';

/**
 * Achievement definitions
 * Each achievement has a check function that determines if it's earned
 */
export const achievements: Achievement[] = [
    {
        id: 'achievement:first-victory',
        name: 'First Blood',
        description: 'Complete your first successful run',
        check: (run: RunSummary, profile: PlayerProfile) => {
            return run.outcome === 'victory';
        },
        rewards: []
    },
    {
        id: 'achievement:tutorial-complete',
        name: 'Quick Learner',
        description: 'Complete the tutorial campaign',
        check: (run: RunSummary, profile: PlayerProfile) => {
            const tutorialProgress = profile.campaignProgress['campaign:tutorial'];
            if (!tutorialProgress) return false;
            return tutorialProgress.completedNodes.length === 3;
        },
        rewards: ['hero:warrior']
    },
    {
        id: 'achievement:warrior',
        name: 'Slayer',
        description: 'Defeat 10 enemies in a single run',
        check: (run: RunSummary, profile: PlayerProfile) => {
            // Note: This would require tracking enemy defeats in RunSummary
            // For now, simplified to always false until we add that tracking
            return false;
        },
        rewards: ['hero:scout']
    },
    {
        id: 'achievement:survivor',
        name: 'Survivor',
        description: 'Complete 5 runs successfully',
        check: (run: RunSummary, profile: PlayerProfile) => {
            const victories = profile.completedRuns.filter(r => r.outcome === 'victory').length;
            return victories >= 5;
        },
        rewards: ['theme:ice-caves']
    }
];

/**
 * Achievement Manager - Check and grant achievements
 */
export class AchievementManager {
    private achievements: Map<string, Achievement> = new Map();

    constructor() {
        // Register all achievements
        achievements.forEach(ach => {
            this.achievements.set(ach.id, ach);
        });
    }

    /**
     * Check a completed run against all achievements
     * Returns newly earned achievements
     */
    checkAchievements(runSummary: RunSummary, profile: PlayerProfile): Achievement[] {
        const earned: Achievement[] = [];

        for (const achievement of this.achievements.values()) {
            // Skip if already earned
            if (profile.achievements.includes(achievement.id)) {
                continue;
            }

            // Check if achievement condition is met
            if (achievement.check(runSummary, profile)) {
                earned.push(achievement);
                profile.achievements.push(achievement.id);
            }
        }

        return earned;
    }

    /**
     * Get all achievements
     */
    getAllAchievements(): Achievement[] {
        return Array.from(this.achievements.values());
    }

    /**
     * Get earned achievements for a profile
     */
    getEarnedAchievements(profile: PlayerProfile): Achievement[] {
        return profile.achievements
            .map(id => this.achievements.get(id))
            .filter(ach => ach !== undefined) as Achievement[];
    }

    /**
     * Get unearned achievements for a profile
     */
    getUnearnedAchievements(profile: PlayerProfile): Achievement[] {
        return this.getAllAchievements()
            .filter(ach => !profile.achievements.includes(ach.id))
            .filter(ach => !ach.hidden); // Don't show hidden achievements
    }
}

/**
 * Global singleton instance
 */
export const achievementManager = new AchievementManager();
