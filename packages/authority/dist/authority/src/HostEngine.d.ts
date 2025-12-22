import { GameState, Action, GameEvent } from '@roguewar/rules';
export type AuthorityMessage = {
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
/**
 * Valid return type for connecting.
 * The 'welcome' message goes to the new peer.
 * The 'broadcast' message goes to all peers (including the new one if desired).
 */
export type ConnectResult = {
    welcome: {
        type: 'welcome';
        playerId: string;
        initialState: GameState;
    };
    broadcast: {
        type: 'delta';
        turn: number;
        events: GameEvent[];
        action: Action;
    };
};
/**
 * The Authoritative Game Engine.
 * Manages the canonical GameState.
 */
export declare class HostEngine {
    private state;
    private connectedPlayers;
    constructor(seed?: number);
    getState(): GameState;
    private createInitialState;
    connect(playerId: string): ConnectResult;
    processAction(playerId: string, action: Action): AuthorityMessage;
}
