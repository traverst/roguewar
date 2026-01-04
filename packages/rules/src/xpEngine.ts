/**
 * XP Engine - Core Experience Logic
 * 
 * Pure functions for XP handling and level-up detection.
 * All functions are deterministic and side-effect free.
 * 
 * Follows SoftwarePrinciples.md:
 * - Pure by Default: All functions are pure
 * - Explicit Inputs/Outputs: No hidden state
 * - Single Source of Truth: ProgressionConfig is the authority
 */

import { Entity } from './types';
import type { ProgressionConfig, Reward, XPEvent } from './progression';
import {
    getLevelFromXP,
    getRewardsForLevel,
    DEFAULT_PROGRESSION_CONFIG
} from './progression';

// =============================================================================
// XP GRANTING
// =============================================================================

/**
 * Result of granting XP to an entity
 */
export interface XPGrantResult {
    entity: Entity;           // Updated entity (immutable pattern)
    xpEvent: XPEvent;         // XP event for logging
    leveledUp: boolean;       // Whether a level-up occurred
    oldLevel: number;
    newLevel: number;
    rewards: Reward[];        // Rewards from any level-ups
}

/**
 * Grant XP to an entity and check for level-ups
 * 
 * @param entity - The entity receiving XP
 * @param amount - Amount of XP to grant
 * @param source - Source of the XP (for logging)
 * @param config - Progression configuration
 * @returns Result with updated entity and level-up info
 * 
 * @example
 * const result = grantXP(player, 50, 'kill:goblin', config);
 * if (result.leveledUp) {
 *   console.log(`Level up! ${result.oldLevel} -> ${result.newLevel}`);
 * }
 */
export function grantXP(
    entity: Entity,
    amount: number,
    source: string,
    config: ProgressionConfig = DEFAULT_PROGRESSION_CONFIG
): XPGrantResult {
    // Calculate new XP
    const oldXP = entity.xp || 0;
    const multiplier = config.xpMultiplier ?? 1.0;
    const adjustedAmount = Math.floor(amount * multiplier);
    const newXP = oldXP + adjustedAmount;

    // Get levels before and after
    const oldLevel = entity.level || getLevelFromXP(oldXP, config);
    const newLevel = getLevelFromXP(newXP, config);
    const leveledUp = newLevel > oldLevel;

    // Collect rewards from any level-ups
    const rewards: Reward[] = [];
    if (leveledUp) {
        for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
            rewards.push(...getRewardsForLevel(lvl, config));
        }
    }

    // Calculate pending attribute/skill points from rewards
    let attributePoints = entity.unspentAttributePoints || 0;
    let skillPoints = entity.unspentSkillPoints || 0;
    let maxHpBonus = 0;

    for (const reward of rewards) {
        if (reward.type === 'AttributePoints') {
            attributePoints += reward.amount;
        } else if (reward.type === 'SkillPoints') {
            skillPoints += reward.amount;
        } else if (reward.type === 'MaxHP') {
            maxHpBonus += reward.amount;
        }
    }

    // Create updated entity (immutable)
    const updatedEntity: Entity = {
        ...entity,
        xp: newXP,
        level: newLevel,
        unspentAttributePoints: attributePoints,
        unspentSkillPoints: skillPoints,
        maxHp: (entity.maxHp || 100) + maxHpBonus,
        hp: Math.min(entity.hp + maxHpBonus, (entity.maxHp || 100) + maxHpBonus), // Heal for MaxHP bonus
        pendingRewards: [
            ...(entity.pendingRewards || []),
            ...rewards.filter(r => r.type === 'AbilityUnlock' || r.type === 'PassiveModifier')
        ]
    };

    // Create XP event for logging
    const xpEvent: XPEvent = {
        id: `xp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: adjustedAmount,
        source,
        timestamp: Date.now()
    };

    return {
        entity: updatedEntity,
        xpEvent,
        leveledUp,
        oldLevel,
        newLevel,
        rewards
    };
}

// =============================================================================
// LEVEL-UP HELPERS
// =============================================================================

/**
 * Check if an entity has pending level-up rewards to allocate
 */
export function hasPendingLevelUp(entity: Entity): boolean {
    return (entity.unspentAttributePoints || 0) > 0 ||
        (entity.unspentSkillPoints || 0) > 0;
}

/**
 * Get XP progress towards next level
 * 
 * @returns {current, required, percentage}
 */
export function getXPProgress(
    entity: Entity,
    config: ProgressionConfig = DEFAULT_PROGRESSION_CONFIG
): { current: number; required: number; percentage: number } {
    const xp = entity.xp || 0;
    const level = entity.level || 1;

    // Find current and next level thresholds
    const currentLevelDef = config.levels.find(l => l.level === level);
    const nextLevelDef = config.levels.find(l => l.level === level + 1);

    if (!nextLevelDef) {
        // Max level reached
        return { current: xp, required: xp, percentage: 100 };
    }

    const currentThreshold = currentLevelDef?.xpRequired || 0;
    const nextThreshold = nextLevelDef.xpRequired;
    const xpIntoLevel = xp - currentThreshold;
    const xpNeeded = nextThreshold - currentThreshold;

    return {
        current: xpIntoLevel,
        required: xpNeeded,
        percentage: Math.min(100, Math.floor((xpIntoLevel / xpNeeded) * 100))
    };
}

// =============================================================================
// XP VALUE CALCULATION
// =============================================================================

/**
 * Calculate XP value for an enemy based on their stats
 * Used when xpValue is not explicitly set on the entity
 * 
 * @param enemy - The enemy entity
 * @returns Calculated XP value
 */
export function calculateXPValue(enemy: Entity): number {
    // If explicit xpValue is set, use it
    if (enemy.xpValue !== undefined) {
        return enemy.xpValue;
    }

    // Otherwise, calculate based on stats
    // Formula: Base 10 + (HP/5) + (Attack*2) + (Defense*2) + (Level*5)
    const base = 10;
    const hpBonus = Math.floor((enemy.maxHp || 10) / 5);
    const attackBonus = (enemy.attack || 0) * 2;
    const defenseBonus = (enemy.defense || 10) - 10; // Above base AC
    const levelBonus = ((enemy.level || 1) - 1) * 5;

    return base + hpBonus + attackBonus + defenseBonus + levelBonus;
}

// =============================================================================
// EXPORTS
// =============================================================================

// Re-export types and helpers from progression.ts
export type { ProgressionConfig, Reward, XPEvent, LevelDefinition, SkillType } from './progression';
export {
    DEFAULT_PROGRESSION_CONFIG,
    getLevelFromXP,
    getRewardsForLevel,
    getXPForLevel,
    getAttributeCap,
    getSkillCap
} from './progression';
