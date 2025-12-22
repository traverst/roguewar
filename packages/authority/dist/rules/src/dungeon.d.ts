import { Tile, Position } from './types.js';
import { PRNG } from './rng.js';
export declare class DungeonGenerator {
    width: number;
    height: number;
    tiles: Tile[][];
    rooms: Room[];
    rng: PRNG;
    constructor(width: number, height: number, rng: PRNG);
    generate(): {
        tiles: Tile[][];
        spawn: Position;
        enemies: Position[];
    };
    createRoom(room: Room): void;
    createHTunnel(x1: number, x2: number, y: number): void;
    createVTunnel(y1: number, y2: number, x: number): void;
}
declare class Room {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    constructor(x: number, y: number, w: number, h: number);
    intersects(other: Room): boolean;
    center(): Position;
}
export {};
