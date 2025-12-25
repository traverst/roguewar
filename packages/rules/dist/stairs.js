import { DungeonGenerator } from './dungeon';
import { mulberry32 } from './rng';
/**
 * Generate all dungeon levels upfront
 */
export function generateMultiLevelDungeon(seed, levelCount, width = 60, height = 40) {
    const rng = mulberry32(seed);
    const levels = [];
    const stairPositions = {};
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
export function handleStairsAction(state, actorId, multiLevelDungeon, spawnEnemiesOnNewLevel) {
    const actor = state.entities.find(e => e.id === actorId);
    if (!actor) {
        return { nextState: state, events: [] };
    }
    // Check if actor is on stairs
    const currentTile = state.dungeon[actor.pos.y][actor.pos.x];
    let newLevel = state.currentLevel;
    let targetPos;
    if (currentTile.type === 'stairs_down') {
        // Go down one level
        if (state.currentLevel < state.maxLevels - 1) {
            newLevel = state.currentLevel + 1;
            // Place on stairs_up of new level
            targetPos = multiLevelDungeon.stairPositions[newLevel]?.up;
        }
    }
    else if (currentTile.type === 'stairs_up') {
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
    const nextState = {
        ...state,
        currentLevel: newLevel,
        dungeon: multiLevelDungeon.levels[newLevel],
        levelEnemies: levelEnemies,
        entities: [
            ...playersOnly.map(e => e.id === actorId
                ? { ...e, pos: targetPos }
                : e),
            ...targetLevelEnemies
        ]
    };
    const event = {
        type: 'level_transition',
        entityId: actorId,
        from: state.currentLevel,
        to: newLevel,
        pos: targetPos
    };
    return { nextState, events: [event] };
}
