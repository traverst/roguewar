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
                type: EntityType.Player,
                pos: { x: spawnX, y: spawnY },
                hp: 100,
                maxHp: 100,
                attack: 10
            };
            state.entities.push(newPlayer);
            events.push({ type: 'spawned', entityId: newPlayer.id, pos: newPlayer.pos, entity: newPlayer });
        }
    }

    // 2. Process Enemies
    // Deterministic AI requires iterating in a stable order (by ID or index)
    const enemies = state.entities.filter(e => e.type === EntityType.Enemy && e.hp > 0);

    // Create RNG from seed + turn
    // This ensures that even if we re-run this turn, the enemies behave the same.
    // Note: We update the seed at the end of the turn.

    for (const enemy of enemies) {
        const player = state.entities.find(e => e.type === EntityType.Player && e.hp > 0);
        if (!player) break;

        const dx = Math.sign(player.pos.x - enemy.pos.x);
        const dy = Math.sign(player.pos.y - enemy.pos.y);

        // Simple AI: Move towards player.
        // Prioritize axis with larger distance? Or random?
        // Deterministic "Random" choice needs the seed.

        let moveX = 0;
        let moveY = 0;

        if (Math.abs(player.pos.x - enemy.pos.x) + Math.abs(player.pos.y - enemy.pos.y) === 1) {
            // Attack
            moveX = player.pos.x - enemy.pos.x;
            moveY = player.pos.y - enemy.pos.y;
            // Copied combat logic (refactor later)
            player.hp -= enemy.attack;
            events.push({ type: 'attacked', attackerId: enemy.id, targetId: player.id, damage: enemy.attack });
            if (player.hp <= 0) {
                events.push({ type: 'killed', entityId: player.id });
            }
        } else {
            // Move
            if (dx !== 0 && isValidMove(state, enemy, dx, 0)) {
                moveX = dx;
            } else if (dy !== 0 && isValidMove(state, enemy, 0, dy)) {
                moveY = dy;
            }

            if (moveX !== 0 || moveY !== 0) {
                enemy.pos.x += moveX;
                enemy.pos.y += moveY;
                events.push({ type: 'moved', entityId: enemy.id, from: { x: enemy.pos.x - moveX, y: enemy.pos.y - moveY }, to: { x: enemy.pos.x, y: enemy.pos.y } });
            }
        }
    }

    // Cleanup dead entities?
    state.entities = state.entities.filter(e => e.hp > 0);

    state.turn++;

    // Advance seed for next turn
    // Using a simple strategy: hash the current seed.
    // Or keep it simple: nextState.seed = next random number
    const rng = mulberry32(state.seed);
    state.seed = Math.floor(rng() * 4294967296);

    return { nextState: state, events };
}
