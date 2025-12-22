import { GameLog, GameState } from '@roguewar/rules';
import { HostEngine } from '@roguewar/authority';

export class ReplayEngine {
    private log: GameLog;

    constructor(log: GameLog) {
        this.log = log;
    }

    /**
     * Replays the entire game from the log and returns the final GameState.
     * This is a headless replay (no networking, no delay).
     */
    public replayAll(): GameState {
        const engine = HostEngine.fromLog(this.log);
        return engine.getState();
    }

    /**
     * Generator that yields each state during the replay.
     * Useful for step-through visualization.
     */
    public *replaySteps(): Generator<{ turn: number; state: GameState }> {
        // We recreate the fromLog logic here to yield intermediate steps
        const engine = new HostEngine(this.log.config.dungeonSeed, this.log.config);

        yield { turn: 0, state: engine.getState() };

        for (const record of this.log.turns) {
            engine.processAction(record.action.actorId, record.action);
            yield { turn: record.turn, state: engine.getState() };
        }
    }

    /**
     * Verifies if two replays produce the same result.
     * Crucial for confirming determinism.
     */
    public verifyDeterminism(): boolean {
        const state1 = this.replayAll();
        const state2 = this.replayAll();

        return JSON.stringify(state1) === JSON.stringify(state2);
    }
}
