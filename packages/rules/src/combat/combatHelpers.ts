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
    stats.strength = entity.strength || 0;
    stats.constitution = entity.constitution || 0;
    stats.attack = entity.attack || 0;
    stats.defense = entity.defense || 0;
    stats.hp = entity.hp || 0;
    stats.maxHp = entity.maxHp || entity.hp || 10;

    // Get equipment bonuses
    const equipment = entity.equipment?.slots || {};

    // Try to get item data from window.ContentLibrary
    try {
        const ContentLibrary = (typeof window !== 'undefined') ? (window as any).ContentLibrary : null;

        if (ContentLibrary) {
            const allItems = ContentLibrary.getAllItems();

            // Check each equipped item for bonuses
            Object.values(equipment).forEach((equippedItem: any) => {
                if (!equippedItem) return;

                const itemId = typeof equippedItem === 'object' ? equippedItem.itemId : equippedItem;
                const itemData = allItems.find((i: any) => i.id === itemId);

                if (itemData?.data) {
                    // Add damage/defence from equipment
                    if (itemData.data.damage) {
                        stats.attack = (stats.attack || 0) + itemData.data.damage;
                    }
                    if (itemData.data.defence) {
                        stats.defense = (stats.defense || 0) + itemData.data.defence;
                    }

                    // Add custom properties
                    if (itemData.data.customProperties) {
                        Object.keys(itemData.data.customProperties).forEach(key => {
                            const value = itemData.data.customProperties[key];
                            if (typeof value === 'number') {
                                stats[key] = (stats[key] || 0) + value;
                            }
                        });
                    }
                }
            });
        }
    } catch (e) {
        console.warn('[CombatHelpers] Could not access ContentLibrary:', e);
    }

    // Add custom bonuses from inventory
    if (entity.inventory?.customBonuses) {
        Object.keys(entity.inventory.customBonuses).forEach(key => {
            stats[key] = (stats[key] || 0) + entity.inventory.customBonuses[key];
        });
    }

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

        const itemId = typeof weaponSlot === 'object' ? weaponSlot.itemId : weaponSlot;

        const ContentLibrary = (typeof window !== 'undefined') ? (window as any).ContentLibrary : null;
        if (!ContentLibrary) return null;

        const allItems = ContentLibrary.getAllItems();
        const item = allItems.find((i: any) => i.id === itemId);

        return item?.data || null;
    } catch (e) {
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

        const itemId = typeof armorSlot === 'object' ? armorSlot.itemId : armorSlot;

        const ContentLibrary = (typeof window !== 'undefined') ? (window as any).ContentLibrary : null;
        if (!ContentLibrary) return null;

        const allItems = ContentLibrary.getAllItems();
        const item = allItems.find((i: any) => i.id === itemId);

        return item?.data || null;
    } catch (e) {
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
