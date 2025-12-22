import {
    GameState,
    Action,
    resolveTurn,
    DungeonGenerator,
    EntityType,
    mulberry32,
    Position,
    Entity,
    GameEvent
} from '@roguewar/rules';

export type AuthorityMessage = {
    type: 'delta';
    turn: number;
    events: GameEvent[];
    action: Action;
} | {
    type: 'error';
    message: string;
} | {
    type: 'welcome';
    playerId: string;
    initialState: GameState;
}

/**
 * Valid return type for connecting.
 * The 'welcome' message goes to the new peer.
 * The 'broadcast' message goes to all peers (including the new one if desired).
 */
export type ConnectResult = {
    welcome: { type: 'welcome'; playerId: string; initialState: GameState };
    broadcast: { type: 'delta'; turn: number; events: GameEvent[]; action: Action };
}

/**
 * The Authoritative Game Engine.
 * Manages the canonical GameState.
 */
export class HostEngine {
    private state: GameState;
    private connectedPlayers: Set<string> = new Set();

    constructor(seed: number = Date.now()) {
        this.state = this.createInitialState(seed);
    }

    public getState(): GameState {
        // Return clone to prevent mutation leak? 
        // For perf in Host checks, maybe direct access is implied, 
        // but let's be safe.
        return JSON.parse(JSON.stringify(this.state));
    }

    private createInitialState(seed: number): GameState {
        const rng = mulberry32(seed);
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

    public connect(playerId: string): ConnectResult {
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

    public processAction(playerId: string, action: Action): AuthorityMessage {
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
