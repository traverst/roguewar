/**
 * Inventory System - Phase 11a
 * 
 * Pure functions for managing entity inventories.
 * All mutations return new objects (immutable).
 */

import { Inventory, InventorySlot } from './types';
import { ItemTemplate } from './schemas';

/**
 * Create a new empty inventory with given capacity
 */
export function createInventory(capacity: number): Inventory {
    return {
        capacity,
        slots: []
    };
}

/**
 * Check if an item can be added to inventory
 */
export function canAddItem(inventory: Inventory, itemDef: ItemTemplate, _quantity: number = 1): boolean {
    // Check if item can stack with existing slot
    if (itemDef.type === 'consumable') {
        const existingSlot = inventory.slots.find(s => s.itemId === itemDef.id);
        if (existingSlot) {
            // Consumables can stack (no max for now)
            return true;
        }
    }

    // Check if there's room for a new slot
    return inventory.slots.length < inventory.capacity;
}

/**
 * Add an item to inventory (returns new inventory)
 * Returns null if cannot add
 */
export function addItem(
    inventory: Inventory,
    itemId: string,
    quantity: number = 1,
    stackable: boolean = false
): Inventory | null {
    const slots = [...inventory.slots];

    // Try to stack with existing slot
    if (stackable) {
        const existingIndex = slots.findIndex(s => s.itemId === itemId);
        if (existingIndex >= 0) {
            slots[existingIndex] = {
                ...slots[existingIndex],
                quantity: slots[existingIndex].quantity + quantity
            };
            return { ...inventory, slots };
        }
    }

    // Add as new slot if room
    if (slots.length >= inventory.capacity) {
        return null; // No room
    }

    slots.push({ itemId, quantity });
    return { ...inventory, slots };
}

/**
 * Remove item(s) from a slot (returns new inventory)
 * If quantity reaches 0, removes the slot
 */
export function removeItem(
    inventory: Inventory,
    slotIndex: number,
    quantity: number = 1
): Inventory | null {
    if (slotIndex < 0 || slotIndex >= inventory.slots.length) {
        return null;
    }

    const slot = inventory.slots[slotIndex];
    if (slot.quantity < quantity) {
        return null; // Not enough items
    }

    const newQuantity = slot.quantity - quantity;
    const slots = [...inventory.slots];

    if (newQuantity <= 0) {
        // Remove the slot entirely
        slots.splice(slotIndex, 1);
    } else {
        slots[slotIndex] = { ...slot, quantity: newQuantity };
    }

    return { ...inventory, slots };
}

/**
 * Get total number of items in inventory
 */
export function getItemCount(inventory: Inventory): number {
    return inventory.slots.reduce((sum, slot) => sum + slot.quantity, 0);
}

/**
 * Get number of used slots
 */
export function getUsedSlots(inventory: Inventory): number {
    return inventory.slots.length;
}

/**
 * Find slot index containing a specific item
 */
export function findItemSlot(inventory: Inventory, itemId: string): number {
    return inventory.slots.findIndex(s => s.itemId === itemId);
}

/**
 * Check if inventory contains an item
 */
export function hasItem(inventory: Inventory, itemId: string, minQuantity: number = 1): boolean {
    const slot = inventory.slots.find(s => s.itemId === itemId);
    return slot !== undefined && slot.quantity >= minQuantity;
}

/**
 * Get item from slot
 */
export function getSlot(inventory: Inventory, slotIndex: number): InventorySlot | undefined {
    return inventory.slots[slotIndex];
}
