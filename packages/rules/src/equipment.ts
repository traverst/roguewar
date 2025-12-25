/**
 * Equipment System - Phase 11a
 * 
 * Pure functions for managing entity equipment.
 * Equipment modifies entity stats via stat modifiers.
 */

import { Equipment, EquipSlot, StatModifiers } from './types';
import { ItemTemplate } from './schemas';

/**
 * Create empty equipment (no slots filled)
 */
export function createEquipment(): Equipment {
    return {
        slots: {}
    };
}

/**
 * Equip an item to a slot (returns new equipment)
 */
export function equipItem(equipment: Equipment, slot: EquipSlot, itemId: string): Equipment {
    return {
        slots: {
            ...equipment.slots,
            [slot]: itemId
        }
    };
}

/**
 * Unequip an item from a slot (returns new equipment)
 */
export function unequipItem(equipment: Equipment, slot: EquipSlot): Equipment {
    const newSlots = { ...equipment.slots };
    delete newSlots[slot];
    return { slots: newSlots };
}

/**
 * Get currently equipped item ID in a slot
 */
export function getEquippedItem(equipment: Equipment, slot: EquipSlot): string | undefined {
    return equipment.slots[slot];
}

/**
 * Check if a slot is occupied
 */
export function isSlotOccupied(equipment: Equipment, slot: EquipSlot): boolean {
    return equipment.slots[slot] !== undefined;
}

/**
 * Get all equipped item IDs
 */
export function getAllEquippedItems(equipment: Equipment): string[] {
    return Object.values(equipment.slots).filter((id): id is string => id !== undefined);
}

/**
 * Calculate total stat modifiers from all equipped items
 */
export function getEquipmentStats(equipment: Equipment, getItem: (id: string) => ItemTemplate | undefined): StatModifiers {
    const modifiers: StatModifiers = {
        attack: 0,
        defense: 0,
        maxHp: 0,
        visionRange: 0
    };

    for (const itemId of getAllEquippedItems(equipment)) {
        const item = getItem(itemId);
        if (!item) continue;

        // Add item stats to modifiers
        if (item.damage) {
            modifiers.attack = (modifiers.attack || 0) + item.damage;
        }
        if (item.defense) {
            modifiers.defense = (modifiers.defense || 0) + item.defense;
        }
    }

    return modifiers;
}

/**
 * Check if an item can be equipped to a given slot
 */
export function canEquipToSlot(item: ItemTemplate, slot: EquipSlot): boolean {
    // Weapons go to weapon slot
    if (item.type === 'weapon' && slot === EquipSlot.Weapon) return true;

    // Armor can go to body/head/hands based on type
    if (item.type === 'armor') {
        // For now, armor goes to body by default
        return slot === EquipSlot.Body || slot === EquipSlot.Head || slot === EquipSlot.Hands;
    }

    // Key items and consumables cannot be equipped
    return false;
}

/**
 * Get the default slot for an item type
 */
export function getDefaultSlot(item: ItemTemplate): EquipSlot | undefined {
    switch (item.type) {
        case 'weapon': return EquipSlot.Weapon;
        case 'armor': return EquipSlot.Body;
        default: return undefined;
    }
}
