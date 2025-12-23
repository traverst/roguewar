import { Action, GameEvent, GameState, ModManifest } from '@roguewar/rules';

export type ClientMessage = {
    type: 'action';
    playerId: string;
    action: Action;
} | {
    type: 'identity';
    userId: string;
} | {
    type: 'spectate';
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
    mods: ModManifest[];
    connectedEntityIds: string[];
};
