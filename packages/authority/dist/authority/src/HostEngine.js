import { resolveTurn, DungeonGenerator, EntityType, mulberry32 } from '@roguewar/rules';
/**
 * The Authoritative Game Engine.
 * Manages the canonical GameState.
 */
export class HostEngine {
    state;
    connectedPlayers = new Set();
    constructor(seed = Date.now()) {
        this.state = this.createInitialState(seed);
    }
    getState() {
        // Return clone to prevent mutation leak? 
        // For perf in Host checks, maybe direct access is implied, 
        // but let's be safe.
        return JSON.parse(JSON.stringify(this.state));
    }
    createInitialState(seed) {
        const rng = mulberry32(seed);
        const gen = new DungeonGenerator(50, 50, rng);
        const { tiles, spawn, enemies } = gen.generate();
        const entityList = [];
        enemies.forEach((pos, idx) => {
            entityList.push({
                id: `enemy_${idx}`,
                type: EntityType.Enemy,
                pos: pos,
                hp: 30,
                maxHp: 30,
                attack: 5
            });
        });
        return {
            dungeon: tiles,
            entities: entityList,
            turn: 1,
            seed: Math.floor(rng() * 4294967296)
        };
    }
    connect(playerId) {
        this.connectedPlayers.add(playerId);
        // Process Join Action
        const joinAction = { type: 'join', actorId: playerId };
        const { nextState, events } = resolveTurn(this.state, joinAction);
        this.state = nextState;
        return {
            welcome: {
                type: 'welcome',
                playerId,
                initialState: this.state
            },
            broadcast: {
                type: 'delta',
                turn: this.state.turn,
                events,
                action: joinAction
            }
        };
    }
    processAction(playerId, action) {
        // Validation
        if (!this.connectedPlayers.has(playerId)) {
            return { type: 'error', message: "Player not connected" };
        }
        // Basic validation delegated to Rules mostly, but we define 'Identity' here.
        // If action.actorId != playerId, we reject? 
        // For P2P, we trust the Host Network layer to verify 'from' matches 'playerId'.
        const { nextState, events } = resolveTurn(this.state, action);
        this.state = nextState;
        return {
            type: 'delta',
            turn: this.state.turn,
            events,
            action
        };
    }
}
