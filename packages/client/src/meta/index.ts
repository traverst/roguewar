/**
 * Meta-game system exports
 * All meta-game components are exported from this single entry point
 */

// Types
export * from './types';

// Storage
export { ProfileStorage } from './ProfileStorage';

// Managers
export { UnlockRegistry, unlockRegistry } from './unlocks';
export { CampaignManager, campaignManager } from './campaigns';
export { AchievementManager, achievementManager, achievements } from './achievements';

// Content
export { tutorialCampaign } from './content/tutorial-campaign';
