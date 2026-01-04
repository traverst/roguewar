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
    advanceTurn,
    ModRegistry,
    ModManifest,
    generateMultiLevelDungeon,
    MultiLevelDungeon,
    handleStairsAction
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
    mods: ModManifest[];
}

/**
 * Valid return type for connecting.
 * The 'welcome' message goes to the new peer.
 * The 'broadcast' message goes to all peers (including the new one if desired).
 */
export type ConnectResult = {
    welcome: { type: 'welcome'; playerId: string; initialState: GameState; mods: ModManifest[]; connectedEntityIds: string[] };
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
    public isReplaying: boolean = false;
    private gameLog: GameLog;
    private registry: ModRegistry;
    private multiLevelDungeon?: MultiLevelDungeon; // Store multi-level dungeon structure

    // Simultaneous turn system state
    private turnPhase: 'planning' | 'executing' = 'planning';
    private pendingActions: Map<string, Action> = new Map(); // playerId -> action
    private readyPlayers: Set<string> = new Set(); // players who clicked "Ready"
    private planningTimeRemaining: number = 15; // seconds
    private planningTimer: ReturnType<typeof setInterval> | null = null;
    private onPhaseChange: ((phase: string, timeRemaining: number, pendingPlayers: string[]) => void) | null = null;
    private onDeltaReady: ((delta: AuthorityMessage) => void) | null = null;  // Callback to broadcast delta
    private static readonly PLANNING_DURATION = 15; // seconds

    constructor(seed: number = Date.now(), config?: GameConfig, registry?: ModRegistry, gameName?: string, campaignContext?: { campaignId: string; nodeId: string }) {
        console.log(`[HostEngine] Constructor: seed=${seed}, hasConfig=${!!config}, hasRegistry=${!!registry}, name=${gameName}`);
        this.registry = registry || new ModRegistry();
        this.gameLog = {
            meta: {
                gameId: `game-${Date.now()}`,
                gameName: gameName || `Game ${new Date().toLocaleString()}`,
                createdAt: Date.now(),
                rulesVersion: '1.0.0',
                lastSaved: Date.now(),
                ...(campaignContext && { campaignId: campaignContext.campaignId, nodeId: campaignContext.nodeId })
            },
            config: config || {
                dungeonSeed: seed,
                rngSeed: seed,
                players: [],
                mods: this.registry.getAllManifests()
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
        // Check for custom level data (from Level Editor / Quick Play)
        // This ensures saved games with designer levels restore correctly
        const customLevel = (this.gameLog.config as any).customLevel;
        console.log('[HostEngine] createInitialState: hasCustomLevel=', !!customLevel,
            'configKeys=', Object.keys(this.gameLog.config));
        if (customLevel) {
            console.log('[HostEngine] Creating state from custom level data (restore-safe)');
            return this.createStateFromCustomLevel(customLevel, seed);
        }

        // Check if multi-level config is specified
        const maxLevels = (this.gameLog.config as any).maxLevels || 1;

        if (maxLevels > 1) {
            // Multi-level dungeon
            console.log(`[HostEngine] Generating multi-level dungeon: ${maxLevels} levels`);
            this.multiLevelDungeon = generateMultiLevelDungeon(seed, maxLevels, 50, 50);
            const firstLevel = this.multiLevelDungeon.levels[0];

            console.log(`[HostEngine] First level dimensions: ${firstLevel.length}x${firstLevel[0]?.length}`);

            // Get spawn from first room
            const spawn = this.findFloorTile(firstLevel);
            const enemies: Position[] = [];

            // Place 5 enemies on first level
            const enemyCount = 5;
            for (let i = 0; i < enemyCount; i++) {
                const enemyPos = this.findFloorTile(firstLevel, [spawn, ...enemies]);
                if (enemyPos) enemies.push(enemyPos);
            }

            const entityList: Entity[] = [];
            enemies.forEach((pos: Position, idx: number) => {
                const id = `enemy_${idx}`;
                const enemy = this.registry.createEntity('core:goblin', id, pos);
                if (enemy) {
                    entityList.push(enemy);
                    this.aiPlayers.set(id, new ReactiveBot(id));
                }
            });

            console.log(`[HostEngine] Multi-level state created: ${entityList.length} enemies, spawn at (${spawn.x}, ${spawn.y})`);

            return {
                dungeon: firstLevel,
                entities: entityList,
                groundItems: [],
                turn: 0,
                seed,
                currentLevel: 0,
                maxLevels: maxLevels,
                victoryAchieved: false,
                levelEnemies: { 0: entityList } // Initialize with first level enemies
            };
        } else {
            // Single-level dungeon (backward compatible)
            const rng = mulberry32(seed);
            const gen = new DungeonGenerator(50, 50, rng);
            const { tiles, spawn, enemies } = gen.generate();

            const entityList: Entity[] = [];
            enemies.forEach((pos: Position, idx: number) => {
                const id = `enemy_${idx}`;
                const enemy = this.registry.createEntity('core:goblin', id, pos);
                if (enemy) {
                    entityList.push(enemy);
                    this.aiPlayers.set(id, new ReactiveBot(id));
                }
            });

            return {
                dungeon: tiles,
                entities: entityList,
                groundItems: [],
                turn: 0,
                seed,
                currentLevel: 0,
                maxLevels: 1,
                victoryAchieved: false
            };
        }
    }

    /**
     * Create state from custom level data (from Level Editor).
     * This ensures saved games with designer levels restore identically.
     */
    private createStateFromCustomLevel(levelData: any, seed: number): GameState {
        console.log('[HostEngine] Parsing custom level data:', {
            hasTiles: !!levelData.tiles,
            tileRows: levelData.tiles?.length,
            hasEnrichedEntities: !!levelData.enrichedEntities,
            enrichedEntityCount: levelData.enrichedEntities?.length || 0,
            hasEnrichedItems: !!levelData.enrichedItems,
            enrichedItemCount: levelData.enrichedItems?.length || 0,
            enemySpawns: levelData.enemySpawns?.length || 0,
            items: levelData.items?.length || 0
        });

        // Convert tiles to dungeon format
        const dungeon = levelData.tiles.map((row: any[]) =>
            row.map(tileType => ({ type: tileType, seen: false }))
        );

        // Use enriched entities if available (from save), otherwise fall back to spawns
        let entityList: Entity[];

        if (levelData.enrichedEntities && levelData.enrichedEntities.length > 0) {
            // Use pre-enriched entities from saved game
            console.log('[HostEngine] Using enriched entities from save');
            entityList = levelData.enrichedEntities.map((entity: any, index: number) => {
                // Ensure proper structure
                const restored = {
                    ...entity,
                    pos: entity.pos || { x: entity.x, y: entity.y }
                };
                // Register AI for enemies
                if (entity.type === 'enemy' || entity.id?.startsWith('enemy_')) {
                    this.aiPlayers.set(entity.id, new ReactiveBot(entity.id));
                }
                return restored as Entity;
            });
        } else {
            // Fallback: create entities from spawns (original behavior)
            entityList = [];
            const spawns = levelData.enemySpawns || [];
            spawns.forEach((spawn: any, index: number) => {
                const entityId = spawn.entityId || spawn.id;
                const pos = { x: spawn.x, y: spawn.y };

                // Try to create from registry, fallback to basic enemy
                let enemy = this.registry.createEntity(entityId, `enemy_${index}`, pos);

                if (!enemy) {
                    // Fallback: create basic enemy from spawn data
                    console.log(`[HostEngine] Entity ${entityId} not in registry, creating from spawn data`);
                    enemy = {
                        id: `enemy_${index}`,
                        type: 'enemy' as any,
                        pos,
                        hp: spawn.hp || 10,
                        maxHp: spawn.maxHp || spawn.hp || 10,
                        attack: spawn.attack || 1,
                        defense: spawn.defense || 0,
                        xp: 0,
                        level: spawn.level || 1,
                        aiBehavior: spawn.aiBehavior
                    };
                }

                entityList.push(enemy);
                this.aiPlayers.set(`enemy_${index}`, new ReactiveBot(`enemy_${index}`));
            });
        }

        // Use enriched items if available (from save), otherwise fall back to raw items
        let groundItems: any[];

        if (levelData.enrichedItems && levelData.enrichedItems.length > 0) {
            // Use pre-enriched items from saved game
            console.log('[HostEngine] Using enriched items from save');
            groundItems = levelData.enrichedItems.map((item: any) => ({
                ...item,
                pos: item.pos || { x: item.x, y: item.y }
            }));
        } else {
            // Fallback: load ground items from raw level data
            groundItems = (levelData.items || []).map((item: any) => {
                const x = item.pos?.x ?? item.x;
                const y = item.pos?.y ?? item.y;
                return {
                    ...item,
                    x,
                    y,
                    pos: { x, y }  // Ensure pos object exists for auto-pickup
                };
            });
        }

        console.log(`[HostEngine] Custom level state created: ${entityList.length} enemies, ${groundItems.length} items`);

        return {
            dungeon,
            entities: entityList,
            groundItems,
            turn: 0,
            seed,
            currentLevel: 0,
            maxLevels: 1,
            victoryAchieved: false
        };
    }
    private findFloorTile(dungeon: GameState['dungeon'], exclude: Position[] = []): Position {
        for (let y = 0; y < dungeon.length; y++) {
            for (let x = 0; x < dungeon[y].length; x++) {
                if (dungeon[y][x].type === 'floor') {
                    const isExcluded = exclude.some(p => p.x === x && p.y === y);
                    if (!isExcluded) {
                        return { x, y };
                    }
                }
            }
        }
        return { x: 1, y: 1 }; // Fallback
    }

    private spawnEnemiesForLevel(level: number, dungeon: GameState['dungeon']): Entity[] {
        const enemies: Position[] = [];
        const enemyCount = 3 + level; // More enemies on deeper levels

        for (let i = 0; i < enemyCount; i++) {
            const enemyPos = this.findFloorTile(dungeon, enemies);
            if (enemyPos) enemies.push(enemyPos);
        }

        const entityList: Entity[] = [];
        enemies.forEach((pos: Position, idx: number) => {
            const id = `enemy_L${level}_${idx}`;
            const enemy = this.registry.createEntity('core:goblin', id, pos);
            if (enemy) {
                entityList.push(enemy);
                this.aiPlayers.set(id, new ReactiveBot(id));
            }
        });

        return entityList;
    }

    public getConnectedEntityIds(): string[] {
        return Array.from(this.connectedPlayers.values());
    }

    /**
     * Get mapping of peerId → userId for alive player checking
     */
    public getPlayerMappings(): Map<string, string> {
        return new Map(this.connectedPlayers);
    }

    public connect(peerId: string, persistentId?: string): ConnectResult {
        const userId = persistentId || peerId;
        console.log(`[HostEngine.connect] peerId=${peerId}, userId=${userId}`);
        console.log(`[HostEngine.connect] BEFORE: connectedPlayers=`, Array.from(this.connectedPlayers.entries()));
        console.log(`[HostEngine.connect] All entity IDs in state:`, this.state.entities.map(e => e.id));
        this.connectedPlayers.set(peerId, userId);
        console.log(`[HostEngine.connect] AFTER: connectedPlayers=`, Array.from(this.connectedPlayers.entries()));

        // Process Join Action
        const joinAction: Action = { type: 'join', actorId: userId };

        let events: GameEvent[] = [];

        // IDENTITY MARRIAGE: If player already exists (from replayed save), don't spawn again!
        const existing = this.state.entities.find(e => e.id === userId);
        console.log(`[HostEngine.connect] Looking for existing entity with id='${userId}', found:`, existing ? `YES (hp=${existing.hp}, xp=${(existing as any).xp}, pos=${JSON.stringify(existing.pos)})` : 'NO');
        if (!existing) {
            const result = resolveTurn(this.state, joinAction, this.registry);
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
                initialState: this.getState(),
                mods: this.registry.getAllManifests(),
                connectedEntityIds: Array.from(this.connectedPlayers.values())
            },
            broadcast: {
                type: 'delta',
                turn: this.state.turn,
                events,
                action: joinAction
            }
        };
    }

    public processAction(peerId: string, action: Action, options?: { skipAI?: boolean; skipTurnAdvance?: boolean }): AuthorityMessage {
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

        // Process action
        let events: GameEvent[] = [];
        let nextState = this.state;

        // Normal action resolution
        const result = resolveTurn(this.state, action, this.registry);
        nextState = result.nextState;
        events = result.events;
        this.state = nextState;

        // Check if actor is now on stairs/exit and auto-trigger
        const actor = this.state.entities.find(e => e.id === action.actorId);
        if (actor && this.multiLevelDungeon && this.state.maxLevels > 1) {
            const tile = this.state.dungeon[actor.pos.y]?.[actor.pos.x];

            // Auto-use stairs
            if (tile?.type === 'stairs_down' || tile?.type === 'stairs_up') {
                const stairsResult = handleStairsAction(
                    this.state,
                    action.actorId,
                    this.multiLevelDungeon,
                    (level, dungeon) => this.spawnEnemiesForLevel(level, dungeon)
                );
                this.state = stairsResult.nextState;
                events.push(...stairsResult.events);
            }
        }

        // Check victory condition (player reached exit)
        if (actor && !this.state.victoryAchieved) {
            const tile = this.state.dungeon[actor.pos.y]?.[actor.pos.x];
            console.log(`[HostEngine] Actor ${actor.id} at (${actor.pos.x}, ${actor.pos.y}), tile type: ${tile?.type}`);
            if (tile?.type === 'exit') {
                console.log(`[HostEngine] VICTORY DETECTED! ${actor.id} reached the exit!`);
                this.state.victoryAchieved = true;
                events.push({
                    type: 'victory',
                    entityId: actor.id,
                    message: `${actor.id} has reached the exit!`
                });
                console.log(`[HostEngine] Victory event pushed, total events: ${events.length}`);
            }
        }

        // Check defeat condition (all human players dead)
        const humanPlayers = this.state.entities.filter(e =>
            e.type === EntityType.Player && !e.id.startsWith('ai-') && !e.id.startsWith('enemy_')
        );
        const allDead = humanPlayers.length > 0 && humanPlayers.every(p => p.hp <= 0);

        if (allDead && !this.state.victoryAchieved) {
            events.push({
                type: 'defeat',
                message: 'All heroes have fallen!'
            });
        }


        // AFTER human action, query AI for their actions
        // First, process static enemies with aiBehavior (placed via Level Editor)
        console.log('[HostEngine] === Starting AI Processing ===');
        console.log('[HostEngine] All entities:', this.state.entities.map(e => ({
            id: e.id, type: e.type, hp: e.hp, hasAiBehavior: !!e.aiBehavior
        })));

        const staticEnemies = this.state.entities.filter(e =>
            e.type === EntityType.Enemy &&
            e.hp > 0 &&
            e.aiBehavior &&
            !this.aiPlayers.has(e.id)
        );

        console.log('[HostEngine] Found', staticEnemies.length, 'static enemies');
        if (staticEnemies.length > 0) {
            console.log('[HostEngine] Static enemies:', staticEnemies.map(e => ({
                id: e.id, name: e.name, pos: e.pos, aiBehavior: e.aiBehavior
            })));
        }

        for (const enemy of staticEnemies) {
            console.log(`[HostEngine] Processing AI for ${enemy.name} (${enemy.id})`);

            // Create AI bot for this enemy using its aiBehavior config
            const bot = new ReactiveBot(enemy.aiBehavior);
            const perception = createPerception(this.state, enemy.id);
            const aiAction = bot.decide(perception);

            // CRITICAL FIX: Override actorId with entity ID (bot incorrectly sets it to aiBehavior object)
            aiAction.actorId = enemy.id;

            console.log(`[HostEngine] ${enemy.name} decided:`, aiAction);

            // Process enemy action through rules AND capture events
            const enemyResult = resolveTurn(this.state, aiAction);
            this.state = enemyResult.nextState;

            // Add enemy combat events to the main events array so clients see them
            events.push(...enemyResult.events);
        }

        console.log('[HostEngine] Finished static enemies');

        // Process AI only if not skipped (for simultaneous turns, AI runs once at end)
        if (!options?.skipAI) {
            const aiPlayerEvents = this.processAIActions();
            events.push(...aiPlayerEvents);
        }

        // Advance turn only if not skipped (for simultaneous turns, advance once at end)
        if (!options?.skipTurnAdvance) {
            this.state = advanceTurn(this.state);
        }

        // Record turn in log
        if (!this.isReplaying) {
            this.gameLog.turns.push({
                turn: this.state.turn,
                action,
                events,
                timestamp: Date.now()
            });
            // Save complete state snapshot for reliable restore
            // Action replay is non-deterministic for complex state (items, equipment, etc.)
            this.gameLog.stateSnapshot = JSON.parse(JSON.stringify(this.state));
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

    public static fromLog(log: GameLog, registry?: ModRegistry): HostEngine {
        console.log(`[HostEngine] Reconstructing from log. GameID: ${log.meta.gameId}, Turns: ${log.turns.length}`);
        const engine = new HostEngine(log.config.dungeonSeed, log.config, registry);

        // METHOD 1: Fast Restore via State Snapshot (Preferred)
        if (log.stateSnapshot) {
            console.log('[HostEngine] Found state snapshot in log - restoring directly (skipping replay)');
            engine.state = JSON.parse(JSON.stringify(log.stateSnapshot));

            // Re-initialize AI players based on entities present in the state
            engine.aiPlayers.clear();
            engine.state.entities.forEach(entity => {
                if (entity.id.startsWith('ai-') || (entity.type === 'enemy' && entity.aiBehavior)) {
                    engine.aiPlayers.set(entity.id, new ReactiveBot(entity.id));
                }
            });

            // Restore game log structure so new actions can be appended
            engine.gameLog = JSON.parse(JSON.stringify(log));

            // Clear connected players - they need to rejoin via connect()
            engine.connectedPlayers.clear();

            console.log(`[HostEngine] SNAPSHOT RESTORE SUCCESS. Turn: ${engine.state.turn}`);
            return engine;
        }

        // METHOD 2: Replay Action Log (Legacy/Fallback)
        console.log('[HostEngine] No snapshot found - falling back to action replay');
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

        // Clear connected players - the replay added them but they're not actually connected yet
        engine.connectedPlayers.clear();
        console.log(`[HostEngine] Cleared connectedPlayers after replay`);

        const hostEntity = engine.state.entities.find(e => !e.id.startsWith('ai-') && !e.id.startsWith('enemy_'));
        console.log(`[HostEngine] REPLAY SUCCESS. Final Turn: ${engine.state.turn}. Host Pos: ${hostEntity ? JSON.stringify(hostEntity.pos) : 'Unknown'}`);

        return engine;
    }

    /**
     * Create a HostEngine from a specific GameState and Config.
     * Useful for resuming from a checkpoint (e.g. for replays or save-reclaims).
     */
    public static fromState(state: GameState, config: GameConfig, registry?: ModRegistry): HostEngine {
        const engine = new HostEngine(config.dungeonSeed, config, registry);
        engine.state = JSON.parse(JSON.stringify(state));

        // Re-initialize AI players based on entities present in the state
        engine.aiPlayers.clear();
        engine.state.entities.forEach(entity => {
            if (entity.id.startsWith('ai-') || entity.id.startsWith('enemy_')) {
                engine.aiPlayers.set(entity.id, new ReactiveBot(entity.id));
            }
        });

        return engine;
    }

    /**
     * Process all AI player actions.
     * Called after each human action to give AI a chance to react.
     */
    private processAIActions(): GameEvent[] {
        const deadAis: string[] = [];
        const allEvents: GameEvent[] = [];

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

            // Process AI action through rules AND capture events
            const { nextState, events } = resolveTurn(this.state, aiAction);
            this.state = nextState;

            // Add combat events to collection
            allEvents.push(...events);

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

        return allEvents;
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

    // ===== SIMULTANEOUS TURN SYSTEM =====

    /**
     * Set callback for phase changes (used to broadcast to clients)
     */
    public setPhaseChangeCallback(callback: (phase: string, timeRemaining: number, pendingPlayers: string[]) => void): void {
        this.onPhaseChange = callback;
    }

    /**
     * Set callback for when a delta is ready (used to broadcast timer-triggered turn executions)
     */
    public setDeltaReadyCallback(callback: (delta: AuthorityMessage) => void): void {
        this.onDeltaReady = callback;
    }

    /**
     * Get current turn phase info
     */
    public getTurnPhaseInfo(): { phase: string; timeRemaining: number; pendingPlayers: string[] } {
        const allPlayerIds = this.getHumanPlayerIds();
        const pendingPlayers = allPlayerIds.filter(id => !this.pendingActions.has(id));
        return {
            phase: this.turnPhase,
            timeRemaining: this.planningTimeRemaining,
            pendingPlayers
        };
    }

    /**
     * Get IDs of all human players (not AI)
     */
    private getHumanPlayerIds(): string[] {
        return Array.from(this.connectedPlayers.values())
            .filter(id => !id.startsWith('ai-'));
    }

    /**
     * Queue an action during planning phase
     * Returns acknowledgment or error
     */
    public queueAction(peerId: string, action: Action): AuthorityMessage | null {
        const userId = this.connectedPlayers.get(peerId);
        if (!userId) {
            return { type: 'error', message: "Player not connected" };
        }

        // Force actorId to the mapped userId
        action.actorId = userId;

        // Handle join actions immediately (not queued)
        if (action.type === 'join') {
            const requestedUserId = action.payload?.userId;
            const result = this.connect(peerId, requestedUserId);
            return result.broadcast;
        }

        // During execution phase, reject new turn-ending actions (but allow free actions)
        const turnEndingTypes = ['move', 'attack'];
        const isTurnEndingAction = turnEndingTypes.includes(action.type);

        if (this.turnPhase === 'executing' && isTurnEndingAction) {
            console.log(`[HostEngine] Turn-ending action rejected - currently executing`);
            return { type: 'error', message: "Turn is executing, please wait" };
        }

        // FREE ACTIONS: equip, unequip, use, drop, wait - execute immediately, don't end turn
        if (!isTurnEndingAction) {
            console.log(`[HostEngine] Free action from ${userId}:`, action.type);
            const result = resolveTurn(this.state, action, this.registry);
            this.state = result.nextState;

            // Broadcast the result immediately
            return {
                type: 'delta',
                turn: this.state.turn,
                events: result.events,
                action: action,
                currentState: this.state
            };
        }

        // TURN-ENDING ACTIONS: move, attack - queue until all players have acted
        console.log(`[HostEngine] Turn-ending action from ${userId}:`, action.type);
        this.pendingActions.set(userId, action);

        // Check if all players have submitted a turn-ending action
        const allPlayerIds = this.getHumanPlayerIds();
        const allSubmitted = allPlayerIds.every(id => this.pendingActions.has(id));

        console.log(`[HostEngine] Turn-ending actions queued: ${this.pendingActions.size}/${allPlayerIds.length}`);

        if (allSubmitted) {
            console.log(`[HostEngine] All players have acted, executing turn`);
            return this.executeSimultaneousTurn();
        }

        // Notify about pending status (but don't execute yet)
        this.broadcastPhaseUpdate();
        return null; // No delta yet, action is queued
    }

    /**
     * Mark a player as "ready" (locks in their current action)
     */
    public markPlayerReady(peerId: string): void {
        const userId = this.connectedPlayers.get(peerId);
        if (userId) {
            this.readyPlayers.add(userId);
            console.log(`[HostEngine] Player ${userId} marked ready`);

            // If they haven't submitted an action, queue a "wait" action
            if (!this.pendingActions.has(userId)) {
                this.pendingActions.set(userId, { type: 'wait', actorId: userId });
            }

            // Check if all ready
            const allPlayerIds = this.getHumanPlayerIds();
            const allReady = allPlayerIds.every(id => this.readyPlayers.has(id));

            if (allReady) {
                const delta = this.executeSimultaneousTurn();
                if (this.onDeltaReady) {
                    this.onDeltaReady(delta);
                }
            } else {
                this.broadcastPhaseUpdate();
            }
        }
    }

    /**
     * Start a new planning phase (no timer - wait for all players to move/attack)
     */
    public startPlanningPhase(): void {
        this.turnPhase = 'planning';
        this.pendingActions.clear();
        this.readyPlayers.clear();

        console.log(`[HostEngine] Planning phase started - waiting for all players to move/attack`);

        // Clear any existing timer (legacy cleanup)
        if (this.planningTimer) {
            clearInterval(this.planningTimer);
            this.planningTimer = null;
        }

        this.broadcastPhaseUpdate();
    }

    /**
     * Broadcast current phase info to all clients
     */
    private broadcastPhaseUpdate(): void {
        if (this.onPhaseChange) {
            const info = this.getTurnPhaseInfo();
            this.onPhaseChange(info.phase, info.timeRemaining, info.pendingPlayers);
        }
    }

    /**
     * Execute all queued actions simultaneously
     */
    private executeSimultaneousTurn(): AuthorityMessage {
        // Stop timer
        if (this.planningTimer) {
            clearInterval(this.planningTimer);
            this.planningTimer = null;
        }

        this.turnPhase = 'executing';
        console.log(`[HostEngine] Executing ${this.pendingActions.size} queued actions`);

        // Auto-wait for players who didn't submit
        const allPlayerIds = this.getHumanPlayerIds();
        for (const playerId of allPlayerIds) {
            if (!this.pendingActions.has(playerId)) {
                console.log(`[HostEngine] Auto-wait for ${playerId}`);
                this.pendingActions.set(playerId, { type: 'wait', actorId: playerId });
            }
        }

        // Collect all events from all actions
        let allEvents: GameEvent[] = [];
        const processedActions: Action[] = [];

        // Process all player actions
        for (const [playerId, action] of this.pendingActions) {
            console.log(`[HostEngine] Processing action for ${playerId}:`, action.type);

            const result = resolveTurn(this.state, action, this.registry);
            this.state = result.nextState;
            allEvents.push(...result.events);
            processedActions.push(action);
        }

        // Check victory/defeat conditions
        this.checkVictoryDefeat(allEvents);

        // Process AI enemies
        const staticEnemyEvents = this.processStaticEnemies();
        allEvents.push(...staticEnemyEvents);

        // Process AI players
        const aiPlayerEvents = this.processAIActions();
        allEvents.push(...aiPlayerEvents);

        // Advance turn
        this.state = advanceTurn(this.state);

        // Record in log (use first action for log, but note it's simultaneous)
        if (!this.isReplaying && processedActions.length > 0) {
            this.gameLog.turns.push({
                turn: this.state.turn,
                action: processedActions[0], // Primary action for log
                events: allEvents,
                timestamp: Date.now()
            });
        }

        // Clear pending actions and ready for next turn
        this.pendingActions.clear();
        this.readyPlayers.clear();

        // Start next planning phase immediately (not delayed)
        // Use setImmediate-style to allow current call stack to complete
        queueMicrotask(() => this.startPlanningPhase());

        return {
            type: 'delta',
            turn: this.state.turn,
            events: allEvents,
            action: processedActions[0] || { type: 'wait', actorId: 'system' },
            currentState: this.state
        };
    }

    /**
     * Process static enemies (from Level Editor) - extracted from processAction
     */
    private processStaticEnemies(): GameEvent[] {
        const events: GameEvent[] = [];

        const staticEnemies = this.state.entities.filter(e =>
            e.type === EntityType.Enemy &&
            e.hp > 0 &&
            e.aiBehavior &&
            !this.aiPlayers.has(e.id)
        );

        for (const enemy of staticEnemies) {
            const bot = new ReactiveBot(enemy.aiBehavior);
            const perception = createPerception(this.state, enemy.id);
            const aiAction = bot.decide(perception);
            aiAction.actorId = enemy.id;

            const enemyResult = resolveTurn(this.state, aiAction);
            this.state = enemyResult.nextState;
            events.push(...enemyResult.events);
        }

        return events;
    }

    /**
     * Check victory/defeat conditions
     */
    private checkVictoryDefeat(events: GameEvent[]): void {
        // Check victory - any player on exit
        for (const playerId of this.getHumanPlayerIds()) {
            const actor = this.state.entities.find(e => e.id === playerId);
            if (actor && !this.state.victoryAchieved) {
                const tile = this.state.dungeon[actor.pos.y]?.[actor.pos.x];
                if (tile?.type === 'exit') {
                    this.state.victoryAchieved = true;
                    events.push({
                        type: 'victory',
                        entityId: actor.id,
                        message: `${actor.id} has reached the exit!`
                    });
                }
            }
        }

        // Check defeat - all human players dead
        const humanPlayers = this.state.entities.filter(e =>
            e.type === EntityType.Player && !e.id.startsWith('ai-') && !e.id.startsWith('enemy_')
        );
        const allDead = humanPlayers.length > 0 && humanPlayers.every(p => p.hp <= 0);

        if (allDead && !this.state.victoryAchieved) {
            events.push({
                type: 'defeat',
                message: 'All heroes have fallen!'
            });
        }
    }
}
