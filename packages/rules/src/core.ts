import { GameState, Action, Entity, EntityType, GameEvent, Position, ActionType } from './types.js';
import { PRNG, mulberry32 } from './rng.js';

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

export function resolveTurn(initialState: GameState, action: Action): { nextState: GameState; events: GameEvent[] } {
    const state = cloneState(initialState);
    const events: GameEvent[] = [];

    // 1. Process Player Action
    const actor = state.entities.find(e => e.id === action.actorId);

    if (actor && actor.hp > 0) {
        if (action.type === 'move') {
            const { dx, dy } = action.payload;
            const targetX = actor.pos.x + dx;
            const targetY = actor.pos.y + dy;
            const target = getEntityAt(state, targetX, targetY);

            if (target) {
                // Combat
                if (actor.type !== target.type) {
                    target.hp -= actor.attack;
                    events.push({ type: 'attacked', attackerId: actor.id, targetId: target.id, damage: actor.attack });
                    if (target.hp <= 0) {
                        events.push({ type: 'killed', entityId: target.id });
                        // Remove entity? or just keep with 0 hp?
                        // Filter dead entities at end of turn usually, or flag them.
                        // For now, let's keep them in array but validMove checks hp > 0.
                    }
                }
            } else {
                // Move
                if (isValidMove(state, actor, dx, dy)) {
                    actor.pos.x = targetX;
                    actor.pos.y = targetY;
                    events.push({ type: 'moved', entityId: actor.id, from: { x: actor.pos.x - dx, y: actor.pos.y - dy }, to: { x: actor.pos.x, y: actor.pos.y } });
                }
            }
        } else if (action.type === 'wait') {
            events.push({ type: 'wait', entityId: actor.id });
        }
    }

    // 1.5 Handle Join Action
    if (action.type === 'join') {
        if (!state.entities.find(e => e.id === action.actorId)) {
            // Find valid spawn deterministically
            // Scan for first free floor tile from (5,5)
            let spawnX = 5;
            let spawnY = 5;
            let found = false;

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

            const newPlayer: Entity = {
                id: action.actorId,
                type: action.actorId.startsWith('ai-') ? EntityType.Enemy : EntityType.Player,
                pos: { x: spawnX, y: spawnY },
                hp: 100,
                maxHp: 100,
                attack: 10
            };
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
