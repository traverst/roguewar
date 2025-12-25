/**
 * Vision System - Phase 11a (Fog of War)
 * 
 * Visibility is COMPUTED, not stored.
 * These functions derive visibility from authoritative state.
 * 
 * Key principle: Same inputs = same outputs (deterministic)
 */

import { Position, Tile, GameState, VisionProfile, Entity } from './types';

/**
 * Visibility states for tiles
 */
export type VisibilityState = 'unseen' | 'seen_previously' | 'visible_now';

/**
 * Map of tile coordinates to visibility state
 * Key format: "x,y"
 */
export type VisibilityMap = Map<string, VisibilityState>;

/**
 * Create a coordinate key for the visibility map
 */
export function coordKey(x: number, y: number): string {
    return `${x},${y}`;
}

/**
 * Parse a coordinate key back to x,y
 */
export function parseCoordKey(key: string): Position {
    const [x, y] = key.split(',').map(Number);
    return { x, y };
}

/**
 * Default vision profile for entities without one
 */
export const DEFAULT_VISION: VisionProfile = {
    range: 8,
    shape: 'circle',
    blocksThroughWalls: true
};

/**
 * Check if a position is within dungeon bounds
 */
export function inBounds(dungeon: Tile[][], x: number, y: number): boolean {
    return y >= 0 && y < dungeon.length && x >= 0 && x < (dungeon[0]?.length || 0);
}

/**
 * Check if a tile blocks vision
 */
export function blocksVision(dungeon: Tile[][], x: number, y: number): boolean {
    if (!inBounds(dungeon, x, y)) return true;
    return dungeon[y][x].type === 'wall';
}

/**
 * Simple line of sight check using Bresenham's line algorithm
 * Returns true if there's a clear line of sight between two points
 */
export function lineOfSight(
    from: Position,
    to: Position,
    dungeon: Tile[][]
): boolean {
    let x0 = from.x;
    let y0 = from.y;
    const x1 = to.x;
    const y1 = to.y;

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
        // Check current position (skip start and end)
        if ((x0 !== from.x || y0 !== from.y) && (x0 !== to.x || y0 !== to.y)) {
            if (blocksVision(dungeon, x0, y0)) {
                return false;
            }
        }

        if (x0 === x1 && y0 === y1) break;

        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x0 += sx;
        }
        if (e2 < dx) {
            err += dx;
            y0 += sy;
        }
    }

    return true;
}

/**
 * Compute visible tiles using simple raycasting
 * Returns a set of coordinate keys that are visible
 */
export function computeVisibleTiles(
    center: Position,
    range: number,
    dungeon: Tile[][],
    blockThroughWalls: boolean = true
): Set<string> {
    const visible = new Set<string>();

    // Always see your own tile
    visible.add(coordKey(center.x, center.y));

    // Cast rays in all directions
    for (let angle = 0; angle < 360; angle += 2) { // 2 degree increments
        const radians = (angle * Math.PI) / 180;

        for (let r = 1; r <= range; r++) {
            const x = Math.round(center.x + r * Math.cos(radians));
            const y = Math.round(center.y + r * Math.sin(radians));

            if (!inBounds(dungeon, x, y)) break;

            const key = coordKey(x, y);

            if (blockThroughWalls) {
                // Check line of sight
                if (lineOfSight(center, { x, y }, dungeon)) {
                    visible.add(key);
                } else {
                    break; // Stop this ray
                }
            } else {
                visible.add(key);
            }

            // Stop at walls (but see the wall itself)
            if (blocksVision(dungeon, x, y)) {
                visible.add(key);
                break;
            }
        }
    }

    return visible;
}

/**
 * Compute visibility map for an entity
 * Combines current visibility with previously seen tiles (from entity memory)
 */
export function computeVisibility(
    state: GameState,
    entity: Entity,
    previouslySeen: Set<string> = new Set()
): VisibilityMap {
    const vision = entity.vision || DEFAULT_VISION;
    const visMap: VisibilityMap = new Map();

    // Compute currently visible tiles
    const nowVisible = computeVisibleTiles(
        entity.pos,
        vision.range,
        state.dungeon,
        vision.blocksThroughWalls
    );

    // Mark all tiles
    for (let y = 0; y < state.dungeon.length; y++) {
        for (let x = 0; x < (state.dungeon[0]?.length || 0); x++) {
            const key = coordKey(x, y);

            if (nowVisible.has(key)) {
                visMap.set(key, 'visible_now');
            } else if (previouslySeen.has(key)) {
                visMap.set(key, 'seen_previously');
            } else {
                visMap.set(key, 'unseen');
            }
        }
    }

    return visMap;
}

/**
 * Get visibility state for a specific tile
 */
export function getTileVisibility(
    visMap: VisibilityMap,
    x: number,
    y: number
): VisibilityState {
    return visMap.get(coordKey(x, y)) || 'unseen';
}

/**
 * Check if a tile is currently visible
 */
export function isVisible(visMap: VisibilityMap, x: number, y: number): boolean {
    return getTileVisibility(visMap, x, y) === 'visible_now';
}

/**
 * Check if a tile has ever been seen
 */
export function hasBeenSeen(visMap: VisibilityMap, x: number, y: number): boolean {
    const state = getTileVisibility(visMap, x, y);
    return state === 'visible_now' || state === 'seen_previously';
}

/**
 * Get all currently visible tile positions
 */
export function getVisiblePositions(visMap: VisibilityMap): Position[] {
    const positions: Position[] = [];
    for (const [key, state] of visMap) {
        if (state === 'visible_now') {
            positions.push(parseCoordKey(key));
        }
    }
    return positions;
}

/**
 * Merge current visibility into previously seen set (for persistence)
 */
export function updateSeenTiles(
    previouslySeen: Set<string>,
    currentlyVisible: VisibilityMap
): Set<string> {
    const updated = new Set(previouslySeen);
    for (const [key, state] of currentlyVisible) {
        if (state === 'visible_now') {
            updated.add(key);
        }
    }
    return updated;
}
