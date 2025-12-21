import {
    GameState,
    Action,
    resolveTurn,
    DungeonGenerator,
    EntityType,
    mulberry32,
    Position,
    Entity
} from '@roguewar/rules';

import { ServerMessage } from './protocol.js';

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

        const entityList: Entity[] = [];
        enemies.forEach((pos: Position, idx: number) => {
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

    public connect(playerId: string): { welcome: ServerMessage; broadcast: ServerMessage } {
        this.connectedPlayers.add(playerId);

        // Process Join Action
        const joinAction: Action = { type: 'join', actorId: playerId };
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
            events,
            action
        };
    }
}
