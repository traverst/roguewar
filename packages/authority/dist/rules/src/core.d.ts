import { GameState, Action, GameEvent } from './types.js';
export declare function resolveTurn(initialState: GameState, action: Action): {
    nextState: GameState;
    events: GameEvent[];
};
