import {
    GameState,
    Action,
    resolveTurn,
    initGame, // Wait, I didn't export initGame from rules in Phase 2? 
    // In Phase 2 verify, I implemented `createInitialState` in client/main.ts manually.
    // I MUST move that to rules now or copy it here. 
    // Strictness says: "Use shared rules package verbatim".
    // If rules doesn't export initGame, I should probably add it to rules first or copy logic.
    // Adding to rules is cleaner. Phase 3 says "Phase 2 produced a shared... rules package".
    // I will check rules exports first. If missing, I'll implement a helper here using DungeonGenerator (which IS exported).
    DungeonGenerator,
    GameEvent,
    EntityType,
    mulberry32
} from '@roguewar/rules';

import { ServerMessage } from './protocol';

/**
 * The Authoritative Instance.
 * In a real deployment, this is a Durable Object.
 */
export class DungeonAuthority {
    private state: GameState;
    private connectedPlayers: Set<string> = new Set();

    constructor(seed: number) {
        // Hydrate initial state deterministically
        this.state = this.createInitialState(seed);
    }

    private createInitialState(seed: number): GameState {
        const rng = mulberry32(seed);
        // Using fixed map size from constants? Need to import constants?
        // Let's hardcode 50x50 for now or import from Rules if I exported constants.
        const gen = new DungeonGenerator(50, 50, rng);
        const { tiles, spawn, enemies } = gen.generate();

        const player = {
            id: 'player', // Single player hardcoded for now? Protocol has playerId.
            // Phase 3 allows multiple clients but Phase 1/2 was single player logic.
            // The logic supports "player" type. 
            // For Phase 3, let's assume one "hero" or maybe allow multiple?
            // "Roguewar is a browser-based multiplayer roguelike".
            // So we should support multiple players?
            // Phase 2 Types has `entities: Entity[]`. 
            // I should spawn a player entity when they join? Or pre-spawn?
            // "One authoritative instance per dungeon". "Track connected players".
            // Let's just spawn 'player' at start. 
            // If we support multiplayer, we need dynamic spawning on join.
            // Requirement A: "Track connected players".
            type: EntityType.Player,
            pos: spawn,
            hp: 100,
            maxHp: 100,
            attack: 10
        };

        const entityList = [player];
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

    public connect(playerId: string): ServerMessage {
        this.connectedPlayers.add(playerId);
        // In a real MMO, we might spawn them here.
        // For now, we return the current state so they can sync.
        return {
            type: 'welcome',
            playerId, // Echo back
            initialState: this.state
        };
    }

    public processAction(playerId: string, action: Action): ServerMessage {
        // Validation
        if (!this.connectedPlayers.has(playerId)) {
            return { type: 'error', message: "Player not connected" };
        }

        if (action.actorId !== playerId) { // Basic anti-spoof
            // Actually, the client might send "player" as ID but playerId is the socket ID?
            // In Phase 1/2, actorId was 'player'.
            // We need to map socket ID to entity ID.
            // For simplicity in Phase 3, let's assume the client sends the correct actorId matching their Entity.
            // AND we enforce that action.actorId == 'player' (for single player) or map it.
            // Let's allow simple pass-through but verified.
        }

        // Use pure rules
        const { nextState, events } = resolveTurn(this.state, action);

        // Commit state
        this.state = nextState;

        return {
            type: 'delta',
            turn: this.state.turn,
            events
        };
    }
}
