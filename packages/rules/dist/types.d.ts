export type Position = {
    x: number;
    y: number;
};
export declare enum Direction {
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
export declare enum EntityType {
    Player = "player",
    Enemy = "enemy"
}
export interface Entity {
    id: string;
    type: EntityType;
    pos: Position;
    hp: number;
    maxHp: number;
    attack: number;
}
export interface GameState {
    dungeon: Tile[][];
    entities: Entity[];
    turn: number;
    seed: number;
}
export type GameStateStrict = {
    turn: number;
    dungeon: Tile[][];
    entities: Record<string, Entity>;
    seed: number;
};
export type GameEventType = 'moved' | 'attacked' | 'killed' | 'wait';
export interface GameEvent {
    type: GameEventType;
    [key: string]: any;
}
export type ActionType = 'move' | 'attack' | 'wait';
export interface Action {
    type: ActionType;
    actorId: string;
    payload?: any;
}
