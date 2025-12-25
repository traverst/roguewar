/**
 * Equipment System - Phase 11a
 *
 * Pure functions for managing entity equipment.
 * Equipment modifies entity stats via stat modifiers.
 */
import { EquipSlot } from './types';
/**
 * Create empty equipment (no slots filled)
 */
export function createEquipment() {
    return {
        slots: {}
    };
}
/**
 * Equip an item to a slot (returns new equipment)
 */
export function equipItem(equipment, slot, itemId) {
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
export function unequipItem(equipment, slot) {
    const newSlots = { ...equipment.slots };
    delete newSlots[slot];
    return { slots: newSlots };
}
/**
 * Get currently equipped item ID in a slot
 */
export function getEquippedItem(equipment, slot) {
    return equipment.slots[slot];
}
/**
 * Check if a slot is occupied
 */
export function isSlotOccupied(equipment, slot) {
    return equipment.slots[slot] !== undefined;
}
/**
 * Get all equipped item IDs
 */
export function getAllEquippedItems(equipment) {
    return Object.values(equipment.slots).filter((id) => id !== undefined);
}
/**
 * Calculate total stat modifiers from all equipped items
 */
export function getEquipmentStats(equipment, getItem) {
    const modifiers = {
        attack: 0,
        defense: 0,
        maxHp: 0,
        visionRange: 0
    };
    for (const itemId of getAllEquippedItems(equipment)) {
        const item = getItem(itemId);
        if (!item)
            continue;
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
export function canEquipToSlot(item, slot) {
    // Weapons go to weapon slot
    if (item.type === 'weapon' && slot === EquipSlot.Weapon)
        return true;
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
export function getDefaultSlot(item) {
    switch (item.type) {
        case 'weapon': return EquipSlot.Weapon;
        case 'armor': return EquipSlot.Body;
        default: return undefined;
    }
}
