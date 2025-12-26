import { GameState, Action, Entity, EntityType, GameEvent, Position, GroundItem, EquipSlot } from './types';
import { mulberry32 } from './rng';
import { ModRegistry } from './mods';
import { addItem, removeItem } from './inventory';
import { equipItem, unequipItem, getDefaultSlot } from './equipment';

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
                    target.hp -= actor.attack;
                    events.push({ type: 'attacked', attackerId: actor.id, targetId: target.id, damage: actor.attack });
                    if (target.hp <= 0) {
                        events.push({ type: 'killed', entityId: target.id });
                        // Remove entity? or just keep with 0 hp?
                        // Filter dead entities at end of turn usually, or flag them.
                        // For now, let's keep them in array but validMove checks hp > 0.
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

        else if (action.type === 'equip_item' && actor.inventory && actor.equipment) {
            const { slotIndex } = action.payload || {};
            if (slotIndex !== undefined && slotIndex < actor.inventory.slots.length) {
                const invSlot = actor.inventory.slots[slotIndex];
                const itemDef = registry?.getItem(invSlot.itemId);
                if (itemDef) {
                    const equipSlot = getDefaultSlot(itemDef);
                    if (equipSlot) {
                        // Remove from inventory
                        const newInventory = removeItem(actor.inventory, slotIndex, 1);
                        if (newInventory) {
                            actor.inventory = newInventory;
                            // If slot has item, swap to inventory
                            const currentEquipped = actor.equipment.slots[equipSlot];
                            if (currentEquipped) {
                                actor.inventory = addItem(actor.inventory, currentEquipped, 1, false) || actor.inventory;
                            }
                            // Equip new item
                            actor.equipment = equipItem(actor.equipment, equipSlot, invSlot.itemId);
                            events.push({ type: 'item_equip' as any, entityId: actor.id, itemId: invSlot.itemId, slot: equipSlot });
                        }
                    }
                }
            }
        }

        else if (action.type === 'unequip_item' && actor.inventory && actor.equipment) {
            const { slot } = action.payload || {};
            if (slot && actor.equipment.slots[slot as EquipSlot]) {
                const itemId = actor.equipment.slots[slot as EquipSlot]!;
                // Add to inventory
                const newInventory = addItem(actor.inventory, itemId, 1, false);
                if (newInventory) {
                    actor.inventory = newInventory;
                    actor.equipment = unequipItem(actor.equipment, slot as EquipSlot);
                    events.push({ type: 'item_unequip' as any, entityId: actor.id, itemId, slot });
                }
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
