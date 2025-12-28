/**
 * Combat Helper Functions
 * Utilities for reading entity stats, equipment, and calculating effective values
 */

import { Entity } from '../types';
import { StatDefinition } from './statDefinitions';
import { evaluateFormula } from './formulaEvaluator';

/**
 * Get all effective stats for an entity including equipment bonuses
 */
export function getEffectiveStats(entity: any): Record<string, number> {
    const stats: Record<string, number> = {};

    // Base stats
    stats.strength = entity.strength || 10;
    stats.dexterity = entity.dexterity || 10;
    stats.constitution = entity.constitution || 10;
    stats.attack = entity.attack || 0;
    stats.defense = entity.defense || 0;
    stats.hp = entity.hp || 0;
    stats.maxHp = entity.maxHp || entity.hp || 10;

    // Get equipment bonuses
    const equipment = entity.equipment?.slots || {};

    console.log('[CombatHelpers] Equipment slots:', equipment);

    // Equipment slots now contain complete item data!
    Object.values(equipment).forEach((equippedItem: any) => {
        if (!equippedItem) return;

        console.log('[CombatHelpers] Processing equipped item:', equippedItem);

        // Add attackBonus (to-hit bonus) to attack stat
        if (equippedItem.attackBonus) {
            stats.attack = (stats.attack || 0) + equippedItem.attackBonus;
            console.log(`[CombatHelpers] Added attackBonus: ${equippedItem.attackBonus}, new attack: ${stats.attack}`);
        }

        // NOTE: weapon.damage (dice notation like "1d8") is NOT added to attack stat
        // It's used directly in combat engine for damage rolls!

        // Add defence from armor
        if (equippedItem.defence) {
            stats.defense = (stats.defense || 0) + equippedItem.defence;
            console.log(`[CombatHelpers] Added defence: ${equippedItem.defence}, new defense: ${stats.defense}`);
        }

        // Add custom properties
        if (equippedItem.customProperties) {
            Object.keys(equippedItem.customProperties).forEach(key => {
                const value = equippedItem.customProperties[key];
                if (typeof value === 'number') {
                    stats[key] = (stats[key] || 0) + value;
                    console.log(`[CombatHelpers] Added custom property ${key}: ${value}`);
                }
            });
        }
    });

    console.log('[CombatHelpers] Final effective stats:', stats);

    return stats;
}

/**
 * Calculate the effective value of a specific stat for an entity
 */
export function calculateEffectiveStat(
    entity: any,
    statKey: string,
    statDefs: Record<string, StatDefinition>
): number {
    const stats = getEffectiveStats(entity);
    let total = stats[statKey] || 0;

    // Apply all "modify_stat" effects that target this stat
    Object.keys(stats).forEach(sourceKey => {
        const def = statDefs[sourceKey];
        if (!def) return;

        def.effects.forEach(effect => {
            if (effect.type === 'modify_stat' && effect.target === statKey) {
                const bonus = evaluateFormula(effect.formula, { value: stats[sourceKey] });
                total += bonus;
            }
        });
    });

    return total;
}

/**
 * Get the equipped weapon item data
 */
export function getEquippedWeapon(entity: any): any {
    try {
        const weaponSlot = entity.equipment?.slots?.weapon;
        if (!weaponSlot) return null;

        // Equipment slots now store complete item data!
        // Just return the slot data directly
        console.log('[CombatHelpers] Weapon slot data:', weaponSlot);
        return weaponSlot;
    } catch (e) {
        console.error('[CombatHelpers] Error getting weapon:', e);
        return null;
    }
}

/**
 * Get the equipped armor item data
 */
export function getEquippedArmor(entity: any): any {
    try {
        const armorSlot = entity.equipment?.slots?.armor;
        if (!armorSlot) return null;

        // Equipment slots now store complete item data!
        // Just return the slot data directly
        console.log('[CombatHelpers] Armor slot data:', armorSlot);
        return armorSlot;
    } catch (e) {
        console.error('[CombatHelpers] Error getting armor:', e);
        return null;
    }
}

/**
 * Get a custom bonus value for an entity
 */
export function getCustomBonus(entity: any, bonusKey: string): number {
    const stats = getEffectiveStats(entity);
    return stats[bonusKey] || 0;
}
