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
    aiBehavior?: string; // Optional: For AI debugging/visualization
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
}

// Plan Types:
export type GameStateStrict = {
    turn: number;
    dungeon: Tile[][]; // Simplified Dungeon type? Plan said "dungeon: Dungeon".
    entities: Record<string, Entity>;
    seed: number;
}

// Events
export type GameEventType = 'moved' | 'attacked' | 'killed' | 'wait' | 'spawned' | 'victory' | 'defeat' | 'level_transition';

export interface GameEvent {
    type: GameEventType;
    [key: string]: any;
}

export type ActionType = 'move' | 'attack' | 'wait' | 'join' | 'use_stairs';

export interface Action {
    type: ActionType;
    actorId: string;
    payload?: any;
}
