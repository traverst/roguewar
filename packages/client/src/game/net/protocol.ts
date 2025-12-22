import { Action, GameEvent, GameState } from '@roguewar/rules';

export type ClientMessage = {
    type: 'action';
    playerId: string;
    action: Action;
} | {
    type: 'identity';
    userId: string;
};

export type ServerMessage = {
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
};
