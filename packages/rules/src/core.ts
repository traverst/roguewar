import { GameState, Action, Entity, EntityType, GameEvent, Position, GroundItem, EquipSlot } from './types';
import { mulberry32 } from './rng';
import { ModRegistry } from './mods';
import { addItem, removeItem } from './inventory';
import { equipItem, unequipItem, getDefaultSlot } from './equipment';
import { resolveAttack, applyTurnStartEffects } from './combat/combatEngine';
import { DEFAULT_STAT_DEFINITIONS } from './combat/statDefinitions';

// Helper to deep clone state (essential for pure functions)
function cloneState(state: GameState): GameState {
    return JSON.parse(JSON.stringify(state)); // Optimization: Use structuredClone if available or manual clone for perf later.
}

function isValidMove(state: GameState, entity: Entity, dx: number, dy: number): boolean {
    const newX = entity.pos.x + dx;
    const newY = entity.pos.y + dy;

    // Bounds
    if (newY < 0 || newY >= state.dungeon.length || newX < 0 || newX >= state.dungeon[0].length) {
        return false;
    }

    // Wall
    if (state.dungeon[newY][newX].type === 'wall') {
        return false;
    }

    // Entity Collision
    const blocker = state.entities.find(e => e.pos.x === newX && e.pos.y === newY && e.id !== entity.id && e.hp > 0);
    if (blocker) {
        return false;
    }

    return true;
}

function getEntityAt(state: GameState, x: number, y: number): Entity | undefined {
    return state.entities.find(e => e.pos.x === x && e.pos.y === y && e.hp > 0);
}

// Phase 11a helpers
function getGroundItemAt(state: GameState, x: number, y: number): GroundItem | undefined {
    return state.groundItems?.find(item => item.pos.x === x && item.pos.y === y);
}

function removeGroundItem(state: GameState, itemId: string): void {
    if (state.groundItems) {
        const idx = state.groundItems.findIndex(i => i.id === itemId);
        if (idx >= 0) state.groundItems.splice(idx, 1);
    }
}

function createGroundItem(state: GameState, itemId: string, pos: Position, quantity: number = 1): GroundItem {
    const id = `ground_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const groundItem: GroundItem = { id, itemId, pos: { ...pos }, quantity };
    if (!state.groundItems) state.groundItems = [];
    state.groundItems.push(groundItem);
    return groundItem;
}

export function resolveTurn(initialState: GameState, action: Action, registry?: ModRegistry): { nextState: GameState; events: GameEvent[] } {
    const state = cloneState(initialState);
    const events: GameEvent[] = [];

    // 1. Process Player Action
    const actor = state.entities.find(e => e.id === action.actorId);

    if (actor && actor.hp > 0) {
        if (action.type === 'move') {
            const { dx, dy } = action.payload;
            const targetX = actor.pos.x + dx;
            const targetY = actor.pos.y + dy;
            const target = getEntityAt(state, targetX, targetY);

            if (target) {
                // Combat
                if (actor.type !== target.type) {
                    // Use data-driven combat engine
                    const combatResult = resolveAttack(actor, target, DEFAULT_STAT_DEFINITIONS);
                    target.hp -= combatResult.damage;

                    // Add combat events
                    events.push({
                        type: 'attacked',
                        attackerId: actor.id,
                        targetId: target.id,
                        damage: combatResult.damage
                    });
                    events.push(...combatResult.events as any[]);

                    if (target.hp <= 0) {
                        events.push({ type: 'killed', entityId: target.id });
                    }
                }
            } else {
                // Move
                if (isValidMove(state, actor, dx, dy)) {
                    actor.pos.x = targetX;
                    actor.pos.y = targetY;
                    events.push({ type: 'moved', entityId: actor.id, from: { x: actor.pos.x - dx, y: actor.pos.y - dy }, to: { x: actor.pos.x, y: actor.pos.y } });

                    // Auto-pickup: check if there's an item at the new position
                    if (state.groundItems) {
                        const itemIndex = state.groundItems.findIndex((item: any) => {
                            const ix = item.pos?.x ?? item.x;
                            const iy = item.pos?.y ?? item.y;
                            return ix === targetX && iy === targetY;
                        });

                        if (itemIndex >= 0) {
                            const groundItem = state.groundItems[itemIndex];

                            // Initialize inventory if needed
                            if (!actor.inventory) {
                                actor.inventory = { slots: [], equipment: {} };
                            }

                            // Add item to inventory
                            actor.inventory.slots.push({
                                itemId: groundItem.id,
                                name: groundItem.name,
                                icon: groundItem.icon || '🎁',
                                quantity: 1
                            });

                            // Remove from ground
                            state.groundItems.splice(itemIndex, 1);

                            events.push({
                                type: 'item_pickup' as any,
                                entityId: actor.id,
                                itemId: groundItem.id,
                                itemName: groundItem.name,
                                itemIcon: groundItem.icon
                            });
                        }
                    }
                }
            }
        } else if (action.type === 'wait') {
            events.push({ type: 'wait', entityId: actor.id });
        }

        // Phase 11a: Item Actions
        else if (action.type === 'pickup_item' && actor.inventory) {
            const groundItem = getGroundItemAt(state, actor.pos.x, actor.pos.y);
            if (groundItem) {
                const itemDef = registry?.getItem(groundItem.itemId);
                const isStackable = itemDef?.type === 'consumable';
                const newInventory = addItem(actor.inventory, groundItem.itemId, groundItem.quantity, isStackable);
                if (newInventory) {
                    actor.inventory = newInventory;
                    removeGroundItem(state, groundItem.id);
                    events.push({ type: 'item_pickup' as any, entityId: actor.id, itemId: groundItem.itemId, quantity: groundItem.quantity });
                }
            }
        }

        else if (action.type === 'drop_item' && actor.inventory) {
            const { slotIndex } = action.payload || {};
            if (slotIndex !== undefined && slotIndex < actor.inventory.slots.length) {
                const slot = actor.inventory.slots[slotIndex];
                const newInventory = removeItem(actor.inventory, slotIndex, slot.quantity);
                if (newInventory) {
                    actor.inventory = newInventory;
                    createGroundItem(state, slot.itemId, actor.pos, slot.quantity);
                    events.push({ type: 'item_drop' as any, entityId: actor.id, itemId: slot.itemId, quantity: slot.quantity });
                }
            }
        }

        else if (action.type === 'equip_item') {
            console.log('[Core] 🎒 Processing equip_item action:', action.payload);
            const { itemId, slot, slotIndex } = action.payload || {};

            // Support two formats: {itemId, slot} from UI or {slotIndex} from old code
            if (itemId && slot) {
                console.log('[Core] Using new format - itemId:', itemId, 'slot:', slot);
                // New format from InventoryUI: find item by ID in inventory
                const inventory = (actor as any).inventory;
                const equipment = (actor as any).equipment || { slots: {} };

                if (!inventory) return;

                const itemSlotIndex = inventory.slots.findIndex((s: any) => s.itemId === itemId);
                console.log('[Core] Found item at index:', itemSlotIndex);

                if (itemSlotIndex >= 0) {
                    const item = inventory.slots[itemSlotIndex];

                    // If something is already equipped in this slot, swap it to inventory
                    if (equipment.slots && equipment.slots[slot]) {
                        const currentEquipped = equipment.slots[slot];
                        console.log('[Core] Swapping out:', currentEquipped);
                        // If currentEquipped is an object, add it properly, otherwise create object
                        if (typeof currentEquipped === 'string') {
                            inventory.slots.push({
                                itemId: currentEquipped,
                                name: currentEquipped,
                                quantity: 1
                            });
                        } else {
                            inventory.slots.push(currentEquipped);
                        }
                    }

                    // Remove item from inventory
                    inventory.slots.splice(itemSlotIndex, 1);

                    // Equip item - store complete item data including stats
                    if (!equipment.slots) equipment.slots = {};
                    // Copy all data from inventory item to equipment slot
                    equipment.slots[slot] = { ...item };

                    (actor as any).equipment = equipment;
                    events.push({ type: 'item_equip' as any, entityId: actor.id, itemId, slot });

                    console.log(`[Core] ✅ Equipped ${item.name || itemId} to ${slot}`);
                } else {
                    console.warn('[Core] Item not found in inventory:', itemId);
                }
            } else if (slotIndex !== undefined && (actor as any).inventory && (actor as any).equipment) {
                // Old format support
                const inventory = (actor as any).inventory;
                const equipment = (actor as any).equipment;

                if (slotIndex < inventory.slots.length) {
                    const invSlot = inventory.slots[slotIndex];
                    const itemDef = registry?.getItem(invSlot.itemId);
                    if (itemDef) {
                        const equipSlot = getDefaultSlot(itemDef);
                        if (equipSlot) {
                            // Remove from inventory
                            const newInventory = removeItem(inventory, slotIndex, 1);
                            if (newInventory) {
                                (actor as any).inventory = newInventory;
                                // If slot has item, swap to inventory
                                const currentEquipped = equipment.slots[equipSlot];
                                if (currentEquipped) {
                                    (actor as any).inventory = addItem((actor as any).inventory, currentEquipped, 1, false) || (actor as any).inventory;
                                }
                                // Equip new item
                                (actor as any).equipment = equipItem(equipment, equipSlot, invSlot.itemId);
                                events.push({ type: 'item_equip' as any, entityId: actor.id, itemId: invSlot.itemId, slot: equipSlot });
                            }
                        }
                    }
                }
            }
        }

        else if (action.type === 'unequip_item') {
            const { slot } = action.payload || {};
            const inventory = (actor as any).inventory;
            const equipment = (actor as any).equipment;

            if (slot && equipment?.slots && equipment.slots[slot]) {
                const equippedItem = equipment.slots[slot];

                // Add item back to inventory (handle both object and string formats)
                if (typeof equippedItem === 'object') {
                    // New format: full item object
                    inventory.slots.push({
                        itemId: equippedItem.itemId,
                        name: equippedItem.name || equippedItem.itemId,
                        icon: equippedItem.icon || '🎁',
                        quantity: 1
                    });
                } else {
                    // Legacy format: just itemId string
                    inventory.slots.push({
                        itemId: equippedItem,
                        name: equippedItem,
                        quantity: 1
                    });
                }

                // Remove from equipment
                delete equipment.slots[slot];

                events.push({
                    type: 'item_unequip' as any,
                    entityId: actor.id,
                    itemId: typeof equippedItem === 'object' ? equippedItem.itemId : equippedItem,
                    slot
                });

                console.log(`[Core] ✅ Unequipped ${typeof equippedItem === 'object' ? equippedItem.name : equippedItem} from ${slot}`);
            }
        }

        else if (action.type === 'use_item' && actor.inventory) {
            const { slotIndex } = action.payload || {};
            if (slotIndex !== undefined && slotIndex < actor.inventory.slots.length) {
                const invSlot = actor.inventory.slots[slotIndex];
                const itemDef = registry?.getItem(invSlot.itemId);
                if (itemDef && itemDef.type === 'consumable') {
                    // Apply consumable effect (simple heal for now)
                    // TODO: Use rule bindings for custom effects
                    if (invSlot.itemId.includes('health_potion') || invSlot.itemId.includes('potion')) {
                        const healAmount = 25;
                        actor.hp = Math.min(actor.maxHp, actor.hp + healAmount);
                        events.push({ type: 'item_used' as any, entityId: actor.id, itemId: invSlot.itemId, effect: 'heal', amount: healAmount });
                    }
                    // Reduce quantity
                    const newInventory = removeItem(actor.inventory, slotIndex, 1);
                    if (newInventory) {
                        actor.inventory = newInventory;
                    }
                }
            }
        }
    }

    // 1.5 Handle Join Action
    if (action.type === 'join') {
        if (!state.entities.find(e => e.id === action.actorId)) {
            // Check for spawn hint from Quick Play or Campaign
            const spawnHint = (typeof window !== 'undefined')
                ? (window as any)._quickPlaySpawnHint || (window as any)._quickPlayDungeonSpawn
                : null;

            let spawnX = 5;
            let spawnY = 5;
            let found = false;

            // If there's a spawn hint, use it directly
            if (spawnHint && spawnHint.x !== undefined && spawnHint.y !== undefined) {
                spawnX = spawnHint.x;
                spawnY = spawnHint.y;
                found = true;
                console.log(`[Core] Using spawn hint: (${spawnX}, ${spawnY})`);
            } else {
                // Find valid spawn deterministically
                // Scan for first free floor tile from (5,5)
                // Pseudo-random offset based on actorId length to prevent stacking
                const offset = action.actorId.length * 7;

                for (let y = 2; y < 48; y++) {
                    for (let x = 2; x < 48; x++) {
                        const cx = (x + offset) % 46 + 2;
                        const cy = (y + offset) % 46 + 2; // Keep away from edges
                        if (state.dungeon[cy][cx].type === 'floor' && !getEntityAt(state, cx, cy)) {
                            spawnX = cx;
                            spawnY = cy;
                            found = true;
                            break;
                        }
                    }
                    if (found) break;
                }
            }

            const templateId = action.payload?.templateId || (action.actorId.startsWith('ai-') ? 'core:goblin' : 'core:player');
            let newPlayer: Entity | undefined;

            if (registry) {
                newPlayer = registry.createEntity(templateId, action.actorId, { x: spawnX, y: spawnY });
            }

            // Fallback for missing registry or template
            if (!newPlayer) {
                newPlayer = {
                    id: action.actorId,
                    type: action.actorId.startsWith('ai-') ? EntityType.Enemy : EntityType.Player,
                    templateId,
                    pos: { x: spawnX, y: spawnY },
                    hp: 100,
                    maxHp: 100,
                    attack: 10
                };
            }

            state.entities.push(newPlayer);
            events.push({ type: 'spawned', entityId: newPlayer.id, pos: newPlayer.pos, entity: newPlayer });
        }
    }

    // Cleanup dead entities
    state.entities = state.entities.filter(e => e.hp > 0);

    return { nextState: state, events };
}

/**
 * Advance the game clock by one turn.
 * Updates turn counter and progresses the RNG seed.
 */
export function advanceTurn(initialState: GameState): GameState {
    const state = cloneState(initialState);
    state.turn++;

    const rng = mulberry32(state.seed);
    state.seed = Math.floor(rng() * 4294967296);

    return state;
}
