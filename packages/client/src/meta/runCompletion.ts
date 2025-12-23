import { GameLog } from '@roguewar/rules';
import { MetaGameContext } from './meta/MetaGameContext';
import { RunSummary } from './meta/types';
import { achievementManager, unlockRegistry, campaignManager } from './meta';
import { UnlockNotification } from './ui/UnlockNotification';

/**
 * Process run completion and update meta-game state
 * This is the ONLY place where run-level data touches meta-level state
 */
export async function processRunCompletion(
    gameLog: GameLog,
    metaGame: MetaGameContext,
    campaignContext?: { campaignId: string; nodeId: string }
): Promise<void> {
    const profile = metaGame.getProfile();

    // Create run summary from GameLog
    const runSummary: RunSummary = {
        gameId: gameLog.meta.gameId,
        campaignId: campaignContext?.campaignId,
        nodeId: campaignContext?.nodeId,
        outcome: 'abandoned', // TODO: Detect victory/defeat from final game state
        turns: gameLog.turns.length,
        timestamp: Date.now(),
        charactersPlayed: [] // TODO: Extract from game log
    };

    // Add to completed runs
    profile.completedRuns.push(runSummary);

    // Check achievements
    const earnedAchievements = achievementManager.checkAchievements(runSummary, profile);

    // Collect rewards
    const allUnlocks: string[] = [];

    // Campaign completion
    if (campaignContext && runSummary.outcome === 'victory') {
        const result = campaignManager.completeNode(
            profile,
            campaignContext.campaignId,
            campaignContext.nodeId
        );

        const node = campaignManager.getNode(campaignContext.campaignId, campaignContext.nodeId);
        if (node && node.unlocksOnComplete.length > 0) {
            allUnlocks.push(...node.unlocksOnComplete);
        }
    }

    // Achievement rewards
    for (const achievement of earnedAchievements) {
        if (achievement.rewards.length > 0) {
            allUnlocks.push(...achievement.rewards);
        }
    }

    // Apply all unlocks
    if (allUnlocks.length > 0) {
        const newUnlocks = await metaGame.applyUnlocks(allUnlocks);

        // Show notifications for new unlocks
        const notifications = newUnlocks.map(id => {
            const content = unlockRegistry.getContent(id);
            return {
                name: content?.name || id,
                description: content?.description || 'New content unlocked!'
            };
        });

        if (notifications.length > 0) {
            UnlockNotification.showMultiple(notifications);
        }
    }

    // Save profile
    await metaGame.saveProfile();

    console.log('[RunCompletion] Processed:', {
        runs: profile.completedRuns.length,
        achievements: earnedAchievements.length,
        unlocks: allUnlocks.length
    });
}
