import { GameLog } from '@roguewar/rules';
import { MetaGameContext } from './MetaGameContext';
import { RunSummary } from './types';
import { achievementManager, unlockRegistry, campaignManager } from './index';
import { UnlockNotification } from '../ui/UnlockNotification';

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

    // Detect outcome from game log events
    let outcome: 'victory' | 'defeat' | 'abandoned' = 'abandoned';

    // Check last few turns for victory/defeat events
    for (let i = gameLog.turns.length - 1; i >= Math.max(0, gameLog.turns.length - 5); i--) {
        const turn = gameLog.turns[i];
        if (turn.events.some(e => e.type === 'victory')) {
            outcome = 'victory';
            break;
        }
        if (turn.events.some(e => e.type === 'defeat')) {
            outcome = 'defeat';
            break;
        }
    }

    // Create run summary from GameLog
    const runSummary: RunSummary = {
        gameId: gameLog.meta.gameId,
        campaignId: campaignContext?.campaignId,
        nodeId: campaignContext?.nodeId,
        outcome,
        turns: gameLog.turns.length,
        timestamp: Date.now(),
        charactersPlayed: []
    };

    // Add to completed runs
    profile.completedRuns.push(runSummary);

    // Check achievements
    const earnedAchievements = achievementManager.checkAchievements(runSummary, profile);

    // Collect rewards
    const allUnlocks: string[] = [];

    // Campaign completion
    if (campaignContext && runSummary.outcome === 'victory') {
        console.log('[RunCompletion] Processing campaign victory:', campaignContext);

        // Update profile's campaign progress directly (works for both library and hardcoded campaigns)
        const progress = profile.campaignProgress[campaignContext.campaignId];
        if (progress) {
            // Add node to completed list if not already there
            if (!progress.completedNodes.includes(campaignContext.nodeId)) {
                progress.completedNodes.push(campaignContext.nodeId);
                console.log('[RunCompletion] Added node to completedNodes:', campaignContext.nodeId);
            }

            // Load campaign from library to find next nodes to unlock
            const libraryJson = localStorage.getItem('roguewar_content_library');
            const library = libraryJson ? JSON.parse(libraryJson) : [];
            const campaignItem = library.find((item: any) => item.id === campaignContext.campaignId);

            if (campaignItem) {
                const campaign = campaignItem.data;
                const completedNode = campaign.nodes?.find((n: any) => n.id === campaignContext.nodeId);

                // Unlock next nodes
                if (completedNode?.nextNodes) {
                    completedNode.nextNodes.forEach((nextNodeId: string) => {
                        if (!progress.unlockedNodes.includes(nextNodeId)) {
                            progress.unlockedNodes.push(nextNodeId);
                            console.log('[RunCompletion] Unlocked next node:', nextNodeId);
                        }
                    });
                }
            }
        }

        // Also try campaignManager for hardcoded campaigns (backward compatibility)
        try {
            campaignManager.completeNode(
                profile,
                campaignContext.campaignId,
                campaignContext.nodeId
            );
        } catch (e) {
            // Ignore - campaign not in campaignManager (probably a library campaign)
        }

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
