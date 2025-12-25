/**
 * Inventory System - Phase 11a
 *
 * Pure functions for managing entity inventories.
 * All mutations return new objects (immutable).
 */
/**
 * Create a new empty inventory with given capacity
 */
export function createInventory(capacity) {
    return {
        capacity,
        slots: []
    };
}
/**
 * Check if an item can be added to inventory
 */
export function canAddItem(inventory, itemDef, _quantity = 1) {
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
export function addItem(inventory, itemId, quantity = 1, stackable = false) {
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
export function removeItem(inventory, slotIndex, quantity = 1) {
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
    }
    else {
        slots[slotIndex] = { ...slot, quantity: newQuantity };
    }
    return { ...inventory, slots };
}
/**
 * Get total number of items in inventory
 */
export function getItemCount(inventory) {
    return inventory.slots.reduce((sum, slot) => sum + slot.quantity, 0);
}
/**
 * Get number of used slots
 */
export function getUsedSlots(inventory) {
    return inventory.slots.length;
}
/**
 * Find slot index containing a specific item
 */
export function findItemSlot(inventory, itemId) {
    return inventory.slots.findIndex(s => s.itemId === itemId);
}
/**
 * Check if inventory contains an item
 */
export function hasItem(inventory, itemId, minQuantity = 1) {
    const slot = inventory.slots.find(s => s.itemId === itemId);
    return slot !== undefined && slot.quantity >= minQuantity;
}
/**
 * Get item from slot
 */
export function getSlot(inventory, slotIndex) {
    return inventory.slots[slotIndex];
}
