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

function createGroundItem(state: GameState, itemId: string, pos: Position, quantity: number = 1, itemData?: any): GroundItem {
    const id = `ground_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // Preserve all item data (name, icon, type, stats, etc.) when dropping
    const groundItem: GroundItem = {
        id,
        itemId,
        pos: { ...pos },
        quantity,
        ...(itemData || {})  // Spread full item data onto ground item
    };
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
        // === CHECK FOR STUNNED STATUS ===
        // Stunned entities still take their turn (for multiplayer), but can't act
        const isStunned = actor.statusEffects?.some(e => e.type === 'stunned' && e.duration > 0);
        if (isStunned) {
            console.log(`[Core] ${actor.name || actor.id} is stunned and cannot act!`);
            events.push({
                type: 'stunned',
                entityId: actor.id,
                message: `${actor.name || actor.id} is stunned and cannot act!`
            } as any);

            // Tick status effects at end of stunned turn
            if (actor.statusEffects) {
                actor.statusEffects.forEach(effect => {
                    effect.duration = Math.max(0, effect.duration - 1);
                });
                actor.statusEffects = actor.statusEffects.filter(e => e.duration > 0);
            }

            // Return early - turn consumed but no action taken
            return { nextState: state, events };
        }

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

                    // Check if this was a fumble - fumble events have their own display
                    const isFumble = combatResult.events.some((e: any) => e.type === 'fumble');

                    // Only add attacked event for non-fumbles (fumbles already have their own event)
                    if (!isFumble) {
                        const combatEvent = combatResult.events.find((e: any) => e.type === 'damage' || e.type === 'critical_hit');
                        const attackedEvent = {
                            type: 'attacked',
                            attackerId: actor.id,
                            attackerName: actor.name || actor.id,
                            targetId: target.id,
                            targetName: target.name || target.id,
                            damage: combatResult.damage,
                            attackRoll: combatEvent?.attackRoll,
                            targetAC: combatEvent?.targetAC,
                            hit: !(combatEvent?.miss),
                            critical: combatEvent?.type === 'critical_hit',
                            fumble: false
                        };
                        console.log('[Core] ATTACK EVENT:', attackedEvent);
                        events.push(attackedEvent);
                    }
                    events.push(...combatResult.events as any[]);

                    if (target.hp <= 0) {
                        events.push({ type: 'killed', entityId: target.id, entityName: target.name || target.id });

                        // === GRANT XP TO ATTACKER ===
                        // Calculate XP value (use enemy's xpValue or calculate from stats)
                        const xpValue = target.xpValue ?? Math.floor(10 + ((target.maxHp || 10) / 5) + ((target.attack || 0) * 2));

                        // Grant XP to attacker (immutable update)
                        const oldXP = actor.xp || 0;
                        const oldLevel = actor.level || 1;
                        actor.xp = oldXP + xpValue;

                        // Simple level calculation (100 XP per level, scales up)
                        // Level thresholds: 0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500
                        const levelThresholds = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500];
                        let newLevel = 1;
                        for (let i = 0; i < levelThresholds.length; i++) {
                            if (actor.xp >= levelThresholds[i]) {
                                newLevel = i + 1;
                            }
                        }

                        // Check for level up
                        if (newLevel > oldLevel) {
                            actor.level = newLevel;

                            // Grant rewards for each level gained
                            const attrPointsPerLevel = 2;
                            const skillPointsPerLevel = (newLevel % 2 === 1) ? 1 : 0; // Skill points on odd levels
                            const hpPerLevel = 5;

                            for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
                                actor.unspentAttributePoints = (actor.unspentAttributePoints || 0) + attrPointsPerLevel;
                                if (lvl % 2 === 1) {
                                    actor.unspentSkillPoints = (actor.unspentSkillPoints || 0) + skillPointsPerLevel;
                                }
                                actor.maxHp = (actor.maxHp || 100) + hpPerLevel;
                                actor.hp = Math.min(actor.hp + hpPerLevel, actor.maxHp); // Heal for HP bonus
                            }

                            events.push({
                                type: 'level_up',
                                entityId: actor.id,
                                oldLevel,
                                newLevel,
                                attributePoints: actor.unspentAttributePoints,
                                skillPoints: actor.unspentSkillPoints
                            } as any);
                            console.log(`[Core] LEVEL UP! ${actor.name || actor.id}: ${oldLevel} -> ${newLevel}`);
                        }

                        events.push({
                            type: 'xp_gained',
                            entityId: actor.id,
                            amount: xpValue,
                            source: `kill:${target.templateId || target.id}`,
                            totalXP: actor.xp,
                            level: actor.level || newLevel
                        } as any);
                        console.log(`[Core] XP gained: ${actor.name || actor.id} +${xpValue} XP (total: ${actor.xp})`);

                        // Drop loot when enemy dies - inventory items and equipped items
                        const lootItems = [
                            ...(target.inventory?.slots || []),
                            ...Object.values(target.equipment?.slots || {}).filter(Boolean)
                        ];

                        for (const item of lootItems) {
                            if (item) {
                                const itemId = (item as any).itemId || (item as any).id;
                                // Pass full item data so dropped loot keeps name, icon, type, stats
                                const groundItem = {
                                    id: `ground_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID
                                    itemId,
                                    pos: { x: target.pos.x, y: target.pos.y }, // Use pos object
                                    quantity: (item as any).quantity || 1, // Preserve quantity if available, else 1
                                    // Preserve all item properties (name, icon, damage, armorBonus, etc.)
                                    name: (item as any).name || itemId,
                                    icon: (item as any).icon,
                                    type: (item as any).type,
                                    damage: (item as any).damage,
                                    armorBonus: (item as any).armorBonus,
                                    armorType: (item as any).armorType,
                                    description: (item as any).description,
                                    rarity: (item as any).rarity,
                                    isLoot: true, // Mark as loot
                                    // Copy any other custom properties
                                    ...(item as any)
                                };
                                if (!state.groundItems) state.groundItems = [];
                                state.groundItems.push(groundItem);
                                events.push({
                                    type: 'item_dropped',
                                    entityId: target.id, // Add entityId for context
                                    itemId,
                                    x: target.pos.x,
                                    y: target.pos.y,
                                    quantity: groundItem.quantity
                                });
                                console.log(`[Core] Dropped loot: ${groundItem.name} at (${target.pos.x}, ${target.pos.y})`);
                            }
                        }
                    }
                }
            } else {
                // Move
                if (isValidMove(state, actor, dx, dy)) {
                    actor.pos.x = targetX;
                    actor.pos.y = targetY;
                    events.push({ type: 'moved', entityId: actor.id, from: { x: actor.pos.x - dx, y: actor.pos.y - dy }, to: { x: actor.pos.x, y: actor.pos.y } });

                    // Auto-pickup: check for ALL items at the new position
                    if (state.groundItems) {
                        // Find all items at this position
                        const itemsAtPos = state.groundItems.filter((item: any) => {
                            const ix = item.pos?.x ?? item.x;
                            const iy = item.pos?.y ?? item.y;
                            return ix === targetX && iy === targetY;
                        });

                        // Pick up each item
                        for (const groundItem of itemsAtPos) {
                            // Initialize inventory if needed
                            if (!actor.inventory) {
                                actor.inventory = { slots: [], equipment: {} };
                            }

                            // Add item to inventory - strip ground-only fields (pos, id, isLoot)
                            const { x, y, id, pos, isLoot, ...itemData } = groundItem as any;
                            actor.inventory.slots.push({
                                itemId: id,         // Rename id to itemId for inventory
                                ...itemData,        // All other item data (damage, defence, customProperties, etc.)
                                quantity: 1
                            });

                            console.log('[Core] Picked up item with data:', actor.inventory.slots[actor.inventory.slots.length - 1]);

                            // Remove from ground
                            const idx = state.groundItems.indexOf(groundItem);
                            if (idx >= 0) state.groundItems.splice(idx, 1);

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
                    // Pass full slot data so dropped item keeps name, icon, type, stats, etc.
                    const { quantity, itemId, ...restSlotData } = slot;
                    createGroundItem(state, itemId, actor.pos, quantity, restSlotData);
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

                    // Equip item - enrich with full data from ContentLibrary
                    if (!equipment.slots) equipment.slots = {};

                    // Look up item data from ContentLibrary to get stats
                    const ContentLib = (typeof window !== 'undefined') ? (window as any).ContentLibrary : null;
                    const itemData = ContentLib ? ContentLib.getItem(item.itemId) : null;

                    // Combine inventory item with library data
                    equipment.slots[slot] = {
                        ...item,                    // itemId, name, icon, quantity from inventory
                        ...(itemData?.data || {})   // damage, defence, customProperties, etc. from library
                    };

                    console.log('[Core] ✅ Equipped', item.name || itemId, 'with data:', equipment.slots[slot]);

                    (actor as any).equipment = equipment;
                    events.push({ type: 'item_equip' as any, entityId: actor.id, itemId, slot });

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

    // === LEVEL-UP ACTION ===
    // Apply attribute and skill point allocations from level-up UI
    if (action.type === 'level_up' && actor) {
        // Allocations come from action.payload.allocations (from main.ts)
        const payload = (action as any).payload || {};
        const allocations = payload.allocations || (action as any).allocations || {};
        const attrAllocations = allocations.attributes || {};
        const skillAllocations = allocations.skills || {};

        console.log(`[Core] Processing level_up for ${actor.id}:`, allocations);

        // Calculate total points being spent
        const attrPointsSpent = Object.values(attrAllocations).reduce((sum: number, v: any) => sum + (v || 0), 0);
        const skillPointsSpent = Object.values(skillAllocations).reduce((sum: number, v: any) => sum + (v || 0), 0);

        // Validate player has enough points
        if (attrPointsSpent > (actor.unspentAttributePoints || 0)) {
            events.push({ type: 'error', message: 'Not enough attribute points' } as any);
        } else if (skillPointsSpent > (actor.unspentSkillPoints || 0)) {
            events.push({ type: 'error', message: 'Not enough skill points' } as any);
        } else {
            // Apply attribute allocations
            for (const [attr, amount] of Object.entries(attrAllocations)) {
                const numAmount = amount as number;
                if (numAmount > 0) {
                    (actor as any)[attr] = ((actor as any)[attr] || 10) + numAmount;
                    console.log(`[Core] Level-up: ${actor.id} +${numAmount} ${attr} = ${(actor as any)[attr]}`);
                }
            }

            // Apply skill allocations
            if (!actor.skills) actor.skills = {};
            for (const [skill, amount] of Object.entries(skillAllocations)) {
                const numAmount = amount as number;
                if (numAmount > 0) {
                    actor.skills[skill] = (actor.skills[skill] || 0) + numAmount;
                    console.log(`[Core] Level-up: ${actor.id} +${numAmount} ${skill} skill = ${actor.skills[skill]}`);
                }
            }

            // Deduct spent points
            actor.unspentAttributePoints = (actor.unspentAttributePoints || 0) - attrPointsSpent;
            actor.unspentSkillPoints = (actor.unspentSkillPoints || 0) - skillPointsSpent;

            // Apply CON bonus to max HP if constitution increased
            if (attrAllocations.constitution) {
                const conBonus = attrAllocations.constitution as number;
                actor.maxHp = (actor.maxHp || 100) + conBonus;
                actor.hp = Math.min(actor.hp + conBonus, actor.maxHp);
            }

            events.push({
                type: 'level_up_applied',
                entityId: actor.id,
                attributes: attrAllocations,
                skills: skillAllocations
            } as any);
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
                    attack: 0,  // Base attack bonus (before equipment)
                    defense: 10,  // Base AC (lower is better, armor subtracts)
                    // D&D Ability Scores
                    strength: 12,      // Affects melee damage (+1 modifier)
                    dexterity: 14,     // Affects AC and attack rolls (+2 modifier)
                    constitution: 13,  // Affects HP (+1 modifier)
                    intelligence: 10,  // Future: spells, skills (0 modifier)
                    wisdom: 11,        // Future: perception, willpower (+0 modifier)
                    charisma: 10   // Future: social, leadership (0 modifier)
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
