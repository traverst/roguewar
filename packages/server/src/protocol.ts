import { Action, GameEvent, GameState } from '@roguewar/rules';

export type ClientMessage = {
    type: 'action';
    playerId: string;
    action: Action;
}

export type ServerMessage = {
    type: 'delta';
    turn: number;
    events: GameEvent[];
} | {
    type: 'error';
    message: string;
} | {
    type: 'welcome';
    playerId: string;
    initialState: GameState;
}
