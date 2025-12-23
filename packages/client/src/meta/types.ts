import { GameConfig } from '@roguewar/rules';

/**
 * Player Profile - Contains all meta-game progression data
 * Stored locally in IndexedDB, never sent over network
 */
export interface PlayerProfile {
    profileId: string;
    displayName: string;
    unlockedContent: string[];        // Content IDs (e.g., 'hero:warrior', 'theme:ice-caves')
    completedRuns: RunSummary[];
    achievements: string[];           // Achievement IDs
    campaignProgress: CampaignProgress;
    createdAt: number;
    lastPlayed: number;
}

/**
 * Summary of a completed run
 * Extracted from GameLog but stored separately for meta-tracking
 */
export interface RunSummary {
    gameId: string;
    campaignId?: string;             // If part of a campaign
    nodeId?: string;                 // Specific campaign node
    outcome: 'victory' | 'defeat' | 'abandoned';
    turns: number;
    timestamp: number;
    charactersPlayed?: string[];     // Entity IDs used
}

/**
 * Campaign progress tracking
 */
export interface CampaignProgress {
    [campaignId: string]: {
        currentNodeId: string;
        completedNodes: string[];
        unlockedNodes: string[];
    };
}

/**
 * Campaign definition - ordered graph of runs
 */
export interface Campaign {
    id: string;
    name: string;
    description: string;
    nodes: CampaignNode[];
    startNodeId: string;
}

/**
 * Campaign node - represents a single dungeon run within a campaign
 */
export interface CampaignNode {
    id: string;
    name: string;
    description?: string;
    dungeonConfig: Partial<GameConfig>;  // Config overrides for this node
    unlocksOnComplete: string[];         // Content unlocked on victory
    nextNodes: string[];                 // Paths available after completion
    requiredNodes?: string[];            // Nodes that must be completed first
}

/**
 * Achievement definition
 */
export interface Achievement {
    id: string;
    name: string;
    description: string;
    check: (runSummary: RunSummary, profile: PlayerProfile) => boolean;
    rewards: string[];                   // Unlock IDs granted on achievement
    hidden?: boolean;                    // Don't show until unlocked
}

/**
 * Unlockable content definition
 */
export interface UnlockableContent {
    id: string;
    type: 'hero' | 'theme' | 'loadout' | 'cosmetic';
    name: string;
    description: string;
    unlockRequirement?: string;          // Human-readable unlock condition
}
