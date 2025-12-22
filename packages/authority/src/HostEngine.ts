import {
    GameState,
    Action,
    resolveTurn,
    DungeonGenerator,
    EntityType,
    mulberry32,
    Position,
    Entity,
    GameEvent,
    GameLog,
    GameConfig,
    TurnRecord,
    advanceTurn
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
    private connectedPlayers: Map<string, string> = new Map(); // peerId -> userId (entityId)
    private aiPlayers: Map<string, AIPlayer> = new Map();
    private isReplaying: boolean = false;
    private gameLog: GameLog;

    constructor(seed: number = Date.now(), config?: GameConfig) {
        console.log(`[HostEngine] Constructor: seed=${seed}, hasConfig=${!!config}`);
        this.gameLog = {
            meta: {
                gameId: `game-${Date.now()}`,
                createdAt: Date.now(),
                rulesVersion: '1.0.0',
                lastSaved: Date.now()
            },
            config: config || {
                dungeonSeed: seed,
                rngSeed: seed,
                players: []
            },
            turns: []
        };
        console.log(`[HostEngine] Using dungeonSeed: ${this.gameLog.config.dungeonSeed}`);
        this.state = this.createInitialState(this.gameLog.config.dungeonSeed);
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
            const id = `enemy_${idx}`;
            entityList.push({
                id,
                type: EntityType.Enemy,
                pos: pos,
                hp: 30,
                maxHp: 30,
                attack: 5
            });
            // Initialize bot for dungeon enemy
            this.aiPlayers.set(id, new ReactiveBot(id));
        });

        return {
            dungeon: tiles,
            entities: entityList,
            turn: 1,
            seed: Math.floor(rng() * 4294967296)
        };
    }

    public connect(peerId: string, persistentId?: string): ConnectResult {
        const userId = persistentId || peerId;
        this.connectedPlayers.set(peerId, userId);

        // Process Join Action
        const joinAction: Action = { type: 'join', actorId: userId };

        let events: GameEvent[] = [];

        // IDENTITY MARRIAGE: If player already exists (from replayed save), don't spawn again!
        const existing = this.state.entities.find(e => e.id === userId);
        if (!existing) {
            const result = resolveTurn(this.state, joinAction);
            this.state = result.nextState;
            events = result.events;
        } else {
            console.log(`[HostEngine] User identity matched: ${userId}. Reclaiming existing entity.`);
            events = [{ type: 'spawned', entityId: userId, pos: existing.pos, entity: existing }]; // Re-broadcast spawn for UI
        }

        // Restore AI bot if needed
        if (userId.startsWith('ai-') && !this.aiPlayers.has(userId)) {
            this.aiPlayers.set(userId, new ReactiveBot(userId));
        }

        // Record join in log
        if (!this.isReplaying) {
            this.gameLog.turns.push({
                turn: this.state.turn,
                action: joinAction,
                events,
                timestamp: Date.now()
            });
        }

        return {
            welcome: {
                type: 'welcome',
                playerId: userId,
                initialState: this.getState()
            },
            broadcast: {
                type: 'delta',
                turn: this.state.turn,
                events,
                action: joinAction
            }
        };
    }

    public processAction(peerId: string, action: Action): AuthorityMessage {
        // Validation - ensure this connection is mapped to a userId
        let userId = this.connectedPlayers.get(peerId);

        if (this.isReplaying && !userId) {
            // During replay, we trust the actorId in the log
            userId = peerId;
        }

        if (!userId) {
            return { type: 'error', message: "Player not connected" };
        }

        // Force actorId to the mapped userId to prevent spoofing
        action.actorId = userId;

        // Process human action
        if (action.type === 'join') {
            const requestedUserId = action.payload?.userId;
            const result = this.connect(peerId, requestedUserId);
            return result.broadcast;
        }

        const { nextState, events } = resolveTurn(this.state, action);
        this.state = nextState;

        // AFTER human action, query AI for their actions
        this.processAIActions();

        // Advance turn once after all actors have had a chance to act
        this.state = advanceTurn(this.state);

        // Record turn in log
        if (!this.isReplaying) {
            this.gameLog.turns.push({
                turn: this.state.turn,
                action,
                events,
                timestamp: Date.now()
            });
        }

        // Include current state so clients get AI behavior updates
        return {
            type: 'delta',
            turn: this.state.turn,
            events,
            action,
            currentState: this.state
        };
    }

    public getGameLog(): GameLog {
        return JSON.parse(JSON.stringify(this.gameLog));
    }

    public static fromLog(log: GameLog): HostEngine {
        console.log(`[HostEngine] Reconstructing from log. GameID: ${log.meta.gameId}, Turns: ${log.turns.length}`);
        const engine = new HostEngine(log.config.dungeonSeed, log.config);
        engine.isReplaying = true;

        for (let i = 0; i < log.turns.length; i++) {
            const record = log.turns[i];
            console.log(`[HostEngine] Replaying turn ${i + 1}/${log.turns.length}: ${record.action.type} by ${record.action.actorId}`);
            try {
                const res = engine.processAction(record.action.actorId, record.action);
                if (res.type === 'error') {
                    console.error(`[HostEngine] Replay Error at turn ${i + 1}: ${res.message}`);
                }
            } catch (err) {
                console.error(`[HostEngine] Replay Crash at turn ${i + 1}:`, err);
            }
        }

        engine.isReplaying = false;
        engine.gameLog = JSON.parse(JSON.stringify(log));

        const hostEntity = engine.state.entities.find(e => !e.id.startsWith('ai-') && !e.id.startsWith('enemy_'));
        console.log(`[HostEngine] REPLAY SUCCESS. Final Turn: ${engine.state.turn}. Host Pos: ${hostEntity ? JSON.stringify(hostEntity.pos) : 'Unknown'}`);

        return engine;
    }

    /**
     * Process all AI player actions.
     * Called after each human action to give AI a chance to react.
     */
    private processAIActions(): void {
        const deadAis: string[] = [];

        for (const [aiId, bot] of this.aiPlayers) {
            // Prune dead AI entities
            const entity = this.state.entities.find(e => e.id === aiId);
            if (!entity || entity.hp <= 0) {
                console.log(`[HostEngine] Pruning dead AI: ${aiId}`);
                deadAis.push(aiId);
                continue;
            }

            // Create filtered perception for this AI
            const perception = createPerception(this.state, aiId);

            // AI decides action
            const aiAction = bot.decide(perception);

            // Process AI action through rules (same as human)
            const { nextState } = resolveTurn(this.state, aiAction);
            this.state = nextState;

            // Store AI behavior on entity for visualization AFTER state update
            if ('debugBehavior' in aiAction) {
                const updatedEntity = this.state.entities.find(e => e.id === aiId);
                if (updatedEntity) {
                    updatedEntity.aiBehavior = aiAction.debugBehavior;
                }
            }
        }

        // Final cleanup of AI bot instances
        for (const id of deadAis) {
            this.aiPlayers.delete(id);
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
        // Find peerId linked to this AI (if any)
        for (const [peer, user] of this.connectedPlayers) {
            if (user === aiId) {
                this.connectedPlayers.delete(peer);
                break;
            }
        }
    }

    /**
     * Get a list of all player entities in the current state.
     * Useful for character selection UI on reload.
     */
    public getPlayerIdentities(): { id: string; pos: Position }[] {
        return this.state.entities
            .filter(e => e.type === EntityType.Player)
            .map(e => ({ id: e.id, pos: e.pos }));
    }
}
