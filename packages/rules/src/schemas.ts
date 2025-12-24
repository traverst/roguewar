import { TileType, Position } from './types';

/**
 * Dungeon Definition Schema
 * Used by level editor and dungeon generator
 */
export interface DungeonDefinition {
    id: string;
    version: string;
    name: string;
    description?: string;
    width: number;
    height: number;
    tiles: TileType[][];
    playerSpawn: Position;
    enemySpawns: Position[];
    zones?: DungeonZone[];
    metadata?: {
        author?: string;
        created?: number;
        tags?: string[];
    };
}

/**
 * Zone annotation for procedural generation hints
 */
export interface DungeonZone {
    id: string;
    type: 'room' | 'corridor' | 'chamber' | 'entrance' | 'exit';
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    properties?: Record<string, any>;
}

/**
 * Item Template Schema
 * Weapons, armor, consumables, etc.
 */
export interface ItemTemplate {
    id: string;
    type: 'weapon' | 'armor' | 'consumable' | 'key_item';
    name: string;
    description?: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'unique';

    // Combat properties
    damage?: number;
    damageType?: 'physical' | 'fire' | 'ice' | 'lightning' | 'poison';
    defense?: number;

    // Status effects
    appliesStatus?: StatusEffect[];

    // Visual
    icon?: string;
    color?: string;
}

/**
 * Status Effect Schema
 */
export interface StatusEffect {
    id: string;
    name: string;
    description?: string;
    duration: number; // -1 for permanent
    stackBehavior: 'replace' | 'stack' | 'refresh';
    effects: {
        damagePerTurn?: number;
        movementModifier?: number; // Multiplier: 0.5 = half speed, 0 = immobilized
        attackModifier?: number;
        defenseModifier?: number;
    };
}

/**
 * Skill Template Schema
 */
export interface SkillTemplate {
    id: string;
    name: string;
    description?: string;
    cooldown: number;
    targetType: 'self' | 'enemy' | 'ally' | 'area';
    range: number;

    effects: {
        damage?: number;
        damageType?: string;
        appliesStatus?: string[]; // Status effect IDs
        healing?: number;
    };
}

/**
 * AI Behavior Parameters Schema
 */
export interface AIBehaviorParams {
    detectionRange: number;
    attackRange: number;
    aggressionLevel: number; // 0-1: 0 = passive, 1 = extremely aggressive
    movementPattern: 'stationary' | 'patrol' | 'wander' | 'chase';
    fleeThreshold?: number; // HP percentage to flee
    groupBehavior?: 'independent' | 'pack' | 'defensive';
}

/**
 * Extended Entity Template (builds on existing)
 * Used by entity editor
 */
export interface ExtendedEntityTemplate {
    id: string;
    name: string;
    description?: string;

    // Base stats
    hp: number;
    maxHp: number;
    attack: number;
    defense?: number;

    // AI configuration
    aiBehavior?: AIBehaviorParams;
    aiPolicy?: string; // Reference to AI policy type

    // Visual
    sprite?: string;
    color?: string;

    // Metadata
    tags?: string[];
}

/**
 * Tileset Definition Schema
 */
export interface TilesetDefinition {
    id: string;
    name: string;
    description?: string;
    mappings: {
        [key in TileType]?: {
            character?: string; // ASCII representation
            color?: string;
            backgroundColor?: string;
            sprite?: string; // For graphical tilesets
        };
    };
}

/**
 * Content Asset - wrapper for versioning and hashing
 */
export interface ContentAsset<T> {
    id: string;
    version: string;
    hash: string;
    createdAt: number;
    modifiedAt: number;
    data: T;
}
