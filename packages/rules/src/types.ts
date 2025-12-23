export type Position = { x: number; y: number };

export enum Direction {
    North = 0,
    East = 1,
    South = 2,
    West = 3
}

export type TileType = 'floor' | 'wall';

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
    entities: Entity[]; // Array for now, map later if strict? Plan said Record<string, Entity>, let's stick to array for Phase 2 strictness if possible, but let's match Phase 1 for now to easy refactor, then tighten?
    // Phase 2 Req: "entities: Record<EntityId, Entity>"
    // Okay, I will follow the Phase 2 Plan Strictness.
    // Wait, if I change to Record, I break the client heavily. Plan said "Refactor Client". So I should do it.
    // Let's stick to the Plan's types.
    turn: number;
    seed: number;
}

// Plan Types:
export type GameStateStrict = {
    turn: number;
    dungeon: Tile[][]; // Simplified Dungeon type? Plan said "dungeon: Dungeon".
    entities: Record<string, Entity>;
    seed: number;
}

// Events
export type GameEventType = 'moved' | 'attacked' | 'killed' | 'wait' | 'spawned';

export interface GameEvent {
    type: GameEventType;
    [key: string]: any;
}

export type ActionType = 'move' | 'attack' | 'wait' | 'join';

export interface Action {
    type: ActionType;
    actorId: string;
    payload?: any;
}
