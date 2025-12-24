import { GameState, GameEvent, Position, Entity } from './types';
import { DungeonGenerator } from './dungeon';
import { mulberry32 } from './rng';

/**
 * Multi-level dungeon structure
 * Stores all levels generated upfront for deterministic replay
 */
export interface MultiLevelDungeon {
    levels: GameState['dungeon'][];
    stairPositions: {
        [level: number]: {
            up?: Position;
            down?: Position;
            exit?: Position;
        };
    };
}

/**
 * Generate all dungeon levels upfront
 */
export function generateMultiLevelDungeon(
    seed: number,
    levelCount: number,
    width: number = 60,
    height: number = 40
): MultiLevelDungeon {
    const rng = mulberry32(seed);
    const levels: GameState['dungeon'][] = [];
    const stairPositions: MultiLevelDungeon['stairPositions'] = {};

    for (let i = 0; i < levelCount; i++) {
        const isEntrance = i === 0;
        const isFinal = i === levelCount - 1;

        const generator = new DungeonGenerator(width, height, rng);
        const result = generator.generate({ isEntrance, isFinal });

        levels.push(result.tiles);
        stairPositions[i] = {
            up: result.stairsUp,
            down: result.stairsDown,
            exit: result.exit
        };
    }

    return { levels, stairPositions };
}

/**
 * Handle stairs action - transition between levels
 */
export function handleStairsAction(
    state: GameState,
    actorId: string,
    multiLevelDungeon: MultiLevelDungeon,
    spawnEnemiesOnNewLevel: (level: number, dungeon: GameState['dungeon']) => Entity[]
): { nextState: GameState; events: GameEvent[] } {
    const actor = state.entities.find(e => e.id === actorId);
    if (!actor) {
        return { nextState: state, events: [] };
    }

    // Check if actor is on stairs
    const currentTile = state.dungeon[actor.pos.y][actor.pos.x];

    let newLevel = state.currentLevel;
    let targetPos: Position | undefined;

    if (currentTile.type === 'stairs_down') {
        // Go down one level
        if (state.currentLevel < state.maxLevels - 1) {
            newLevel = state.currentLevel + 1;
            // Place on stairs_up of new level
            targetPos = multiLevelDungeon.stairPositions[newLevel]?.up;
        }
    } else if (currentTile.type === 'stairs_up') {
        // Go up one level
        if (state.currentLevel > 0) {
            newLevel = state.currentLevel - 1;
            // Place on stairs_down of new level
            targetPos = multiLevelDungeon.stairPositions[newLevel]?.down;
        }
    }

    if (newLevel === state.currentLevel || !targetPos) {
        // Invalid transition
        return { nextState: state, events: [] };
    }

    // Save current level's enemies before transitioning
    const currentLevelEnemies = state.entities.filter(e => e.id.startsWith('enemy_'));
    const levelEnemies = state.levelEnemies || {};
    levelEnemies[state.currentLevel] = currentLevelEnemies;

    // Restore or spawn enemies for target level
    const playersOnly = state.entities.filter(e => !e.id.startsWith('enemy_'));
    let targetLevelEnemies = levelEnemies[newLevel];

    if (!targetLevelEnemies) {
        // First visit to this level - spawn new enemies
        targetLevelEnemies = spawnEnemiesOnNewLevel(newLevel, multiLevelDungeon.levels[newLevel]);
        levelEnemies[newLevel] = targetLevelEnemies;
    }

    // Create new state with different level
    const nextState: GameState = {
        ...state,
        currentLevel: newLevel,
        dungeon: multiLevelDungeon.levels[newLevel],
        levelEnemies: levelEnemies,
        entities: [
            ...playersOnly.map(e =>
                e.id === actorId
                    ? { ...e, pos: targetPos! }
                    : e
            ),
            ...targetLevelEnemies
        ]
    };

    const event: GameEvent = {
        type: 'level_transition',
        entityId: actorId,
        from: state.currentLevel,
        to: newLevel,
        pos: targetPos
    };

    return { nextState, events: [event] };
}
