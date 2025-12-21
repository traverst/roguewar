import { GameState, Action, GameEvent } from './types';
export declare function resolveTurn(initialState: GameState, action: Action): {
    nextState: GameState;
    events: GameEvent[];
};
