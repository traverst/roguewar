import { GameLog, GameState, ModRegistry } from '@roguewar/rules';
import { HostEngine } from '@roguewar/authority';

export class ReplayEngine {
    private log: GameLog;

    private registry?: ModRegistry;

    constructor(log: GameLog, registry?: ModRegistry) {
        this.log = log;
        this.registry = registry;
    }

    private stateCache: Map<number, GameState> = new Map();

    /**
     * Replays the entire game from the log and returns the final GameState.
     * This is a headless replay (no networking, no delay).
     */
    public replayAll(): GameState {
        const turnCount = this.log.turns.length;
        return this.seekTo(turnCount);
    }

    /**
     * Jump to a specific turn. 
     * Uses caching to avoid re-calculating from turn 0 every time.
     */
    public seekTo(turn: number): GameState {
        if (turn < 0) turn = 0;
        if (turn > this.log.turns.length) turn = this.log.turns.length;

        // Check cache
        if (this.stateCache.has(turn)) {
            return JSON.parse(JSON.stringify(this.stateCache.get(turn)));
        }

        // Find nearest checkpoint (greedy)
        let currentTurn = 0;
        let currentState: GameState | null = null;

        for (let i = turn; i >= 0; i--) {
            if (this.stateCache.has(i)) {
                currentTurn = i;
                currentState = JSON.parse(JSON.stringify(this.stateCache.get(i)));
                break;
            }
        }

        const engine = currentState
            ? HostEngine.fromState(currentState, this.log.config, this.registry)
            : new HostEngine(this.log.config.dungeonSeed, this.log.config, this.registry);

        engine.isReplaying = true;

        // Advance from currentTurn to turn
        for (let i = currentTurn; i < turn; i++) {
            const record = this.log.turns[i];
            engine.processAction(record.action.actorId, record.action);

            // Cache every 10 turns
            if ((i + 1) % 10 === 0) {
                this.stateCache.set(i + 1, engine.getState());
            }
        }

        const finalState = engine.getState();
        this.stateCache.set(turn, finalState);
        return finalState;
    }

    /**
     * Generator that yields each state during the replay.
     * Useful for step-through visualization.
     */
    public *replaySteps(): Generator<{ turn: number; state: GameState }> {
        for (let i = 0; i <= this.log.turns.length; i++) {
            yield { turn: i, state: this.seekTo(i) };
        }
    }

    /**
     * Verifies if two replays produce the same result.
     * Crucial for confirming determinism.
     */
    public verifyDeterminism(): boolean {
        this.stateCache.clear();
        const state1 = this.replayAll();
        this.stateCache.clear();
        const state2 = this.replayAll();

        return JSON.stringify(state1) === JSON.stringify(state2);
    }
}
