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
} | {
    type: 'ready';  // Player clicked Ready button (locks in action or waits)
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
} | {
    type: 'phase';  // Turn phase update for simultaneous turns
    phase: 'planning' | 'executing';
    timeRemaining: number;
    pendingPlayers: string[];  // Players who haven't submitted actions yet
};
