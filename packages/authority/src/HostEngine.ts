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
import { ReactiveBot, createPerception, AIPlayer } from '@roguewar/ai';

export type AuthorityMessage = {
    type: 'delta';
    turn: number;
    events: GameEvent[];
    action: Action;
    currentState?: GameState; // Full state for AI behavior sync
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
    private aiPlayers: Map<string, AIPlayer> = new Map();

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

        // Process human action
        const { nextState, events } = resolveTurn(this.state, action);
        this.state = nextState;

        // AFTER human action, query AI for their actions
        this.processAIActions();

        // Include current state so clients get AI behavior updates
        return {
            type: 'delta',
            turn: this.state.turn,
            events,
            action,
            currentState: this.state
        };
    }

    /**
     * Process all AI player actions.
     * Called after each human action to give AI a chance to react.
     */
    private processAIActions(): void {
        for (const [aiId, bot] of this.aiPlayers) {
            // Create filtered perception for this AI
            const perception = createPerception(this.state, aiId);

            // AI decides action
            const aiAction = bot.decide(perception);

            // Process AI action through rules (same as human)
            const { nextState } = resolveTurn(this.state, aiAction);
            this.state = nextState;

            // Store AI behavior on entity for visualization AFTER state update
            if ('debugBehavior' in aiAction) {
                const entity = this.state.entities.find(e => e.id === aiId);
                if (entity) {
                    entity.aiBehavior = aiAction.debugBehavior;
                    console.log(`[HostEngine] Set aiBehavior for ${aiId}: ${entity.aiBehavior}`);
                } else {
                    console.warn(`[HostEngine] Could not find entity ${aiId} to set aiBehavior`);
                }
            }
        }
    }

    /**
     * Spawn an AI player.
     * The AI will be treated as a normal player - gets an ID, joins the game.
     * Returns ConnectResult so caller can broadcast the join event.
     */
    public spawnAI(id?: string): ConnectResult {
        const aiId = id || `ai-${Date.now()}`;
        const bot = new ReactiveBot(aiId);

        this.aiPlayers.set(aiId, bot);

        // AI "connects" like a normal player
        const result = this.connect(aiId);

        return result;
    }

    /**
     * Remove an AI player.
     */
    public removeAI(aiId: string): void {
        this.aiPlayers.delete(aiId);
        this.connectedPlayers.delete(aiId);
    }
}
