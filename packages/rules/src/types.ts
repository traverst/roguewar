export type Position = { x: number; y: number };

export enum Direction {
    North = 0,
    East = 1,
    South = 2,
    West = 3
}

export type TileType = 'floor' | 'wall' | 'stairs_down' | 'stairs_up' | 'exit';

export interface Tile {
    type: TileType;
    seen: boolean;
}

export enum EntityType {
    Player = 'player',
    Enemy = 'enemy'
}

export interface Entity {
    id: string;
    type: EntityType;
    templateId?: string; // Reference to modded content (e.g. 'core:goblin')
    pos: Position;
    hp: number;
    maxHp: number;
    attack: number;
    defense?: number;
    aiBehavior?: string; // Optional: For AI debugging/visualization
    name?: string;       // Display name
    statusEffects?: Array<{  // Temporary status effects
        type: 'stunned' | 'poisoned' | 'blessed' | 'cursed' | 'sleeping';
        duration: number;
        source?: string;
    }>;

    // Phase 11a additions
    inventory?: Inventory;
    equipment?: Equipment;
    vision?: VisionProfile;

    // Experience & Progression System
    xp?: number;                    // Current total XP earned
    level?: number;                 // Current level (1-based)
    xpValue?: number;               // XP granted when this entity is killed (for enemies)
    pendingRewards?: Array<{        // Queued rewards from level-up (not yet applied)
        type: 'AttributePoints' | 'SkillPoints' | 'MaxHP' | 'AbilityUnlock' | 'PassiveModifier';
        amount?: number;
        abilityId?: string;
        modifierId?: string;
    }>;
    unspentAttributePoints?: number;
    unspentSkillPoints?: number;
    skills?: Record<string, number>;  // Skill name -> level
}

export interface GameState {
    dungeon: Tile[][];
    entities: Entity[];
    turn: number;
    seed: number;
    currentLevel: number;      // Track which dungeon level (0-indexed)
    maxLevels: number;         // Total levels in this dungeon
    victoryAchieved?: boolean; // Victory flag when exit reached
    levelEnemies?: { [level: number]: Entity[] }; // Store enemies per level for persistence

    // Phase 11a additions
    groundItems: GroundItem[]; // Items placed in the world
}

// Plan Types:
export type GameStateStrict = {
    turn: number;
    dungeon: Tile[][]; // Simplified Dungeon type? Plan said "dungeon: Dungeon".
    entities: Record<string, Entity>;
    seed: number;
}

// Events
export type GameEventType = 'moved' | 'attacked' | 'killed' | 'wait' | 'spawned' | 'victory' | 'defeat' | 'level_transition' | 'message' | 'status_effect' | 'item_used' | 'item_dropped';

export interface GameEvent {
    type: GameEventType;
    [key: string]: any;
}

export type ActionType = 'move' | 'attack' | 'wait' | 'join' | 'use_stairs'
    | 'pickup_item' | 'drop_item' | 'equip_item' | 'unequip_item' | 'use_item'
    | 'level_up' | 'sleep';  // Allocate attribute/skill points from level-up

export interface Action {
    type: ActionType;
    actorId: string;
    payload?: any;
}

// ===== Phase 11a: Inventory, Equipment, and Vision Types =====

/**
 * Equipment slots for wearable/holdable items
 */
export enum EquipSlot {
    Head = 'head',
    Body = 'body',
    Hands = 'hands',
    Ring = 'ring',
    Weapon = 'weapon'
}

/**
 * A single slot in an inventory containing an item and quantity
 */
export interface InventorySlot {
    itemId: string;      // Reference to item template ID
    quantity: number;    // Stack size (1 for non-stackable)
}

/**
 * Bounded container for items owned by an entity
 */
export interface Inventory {
    capacity: number;           // Max number of slots
    slots: InventorySlot[];     // Current items
}

/**
 * Equipment slots with currently equipped item IDs
 */
export interface Equipment {
    slots: Partial<Record<EquipSlot, string>>;  // EquipSlot -> itemId or undefined
}

/**
 * Vision profile determining how an entity sees the world
 */
export interface VisionProfile {
    range: number;              // Tiles visible in each direction
    shape: 'circle' | 'cone' | 'square';
    blocksThroughWalls: boolean;
}

/**
 * An item placed in the world (on the ground)
 */
export interface GroundItem {
    id: string;         // Unique instance ID
    itemId: string;     // Reference to item template
    pos: Position;      // Location in dungeon
    quantity: number;   // Stack size
    name?: string;      // Cached display name
    icon?: string;      // Cached display icon
}

/**
 * Stat modifiers applied by equipment or effects
 */
export interface StatModifiers {
    attack?: number;
    defense?: number;
    maxHp?: number;
    visionRange?: number;
}
