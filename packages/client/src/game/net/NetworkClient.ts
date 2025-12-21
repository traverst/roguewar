import { Action, GameEvent, GameState } from '@roguewar/rules';

// Duplicate from server protocol (or we should share it, but for now we copy to avoid heavy coupling if we don't have a shared 'common' package yet, or just rely on manual sync for this phase. The Plan mentions NetworkClient but not a shared protocol package, although sharing Types is better.
// Actually, I can import types from '@roguewar/rules' but `ServerMessage` is defined in `server/src/protocol.ts`.
// I CANNOT import from `packages/server` in `packages/client`. That violates boundaries.
// Protocol types *should* technically be in a shared package or `rules` if they are pure.
// For Phase 4, I will re-define the message types locally in NetworkClient or a separate file, mirroring the server.
// `Phase 3` instructions said "Clear separation between networking and game logic".
// I'll define `ClientProtocol.ts` in client.

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

export type ClientMessage = {
    type: 'action';
    playerId: string;
    action: Action;
};

type DeltaHandler = (msg: { turn: number; events: GameEvent[]; action: Action }) => void;
type WelcomeHandler = (msg: { playerId: string; initialState: GameState }) => void;

export class NetworkClient {
    private ws: WebSocket | null = null;
    private onDeltaCallbacks: DeltaHandler[] = [];
    private onWelcomeCallbacks: WelcomeHandler[] = [];
    private playerId: string | null = null;

    constructor(private url: string = 'ws://localhost:3000') { }

    connect() {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log('Connected to server');
        };

        this.ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data) as ServerMessage;
                this.handleMessage(msg);
            } catch (e) {
                console.error('Failed to parse message', e);
            }
        };

        this.ws.onerror = (e) => {
            console.error('WebSocket error', e);
        };
    }

    private handleMessage(msg: ServerMessage) {
        switch (msg.type) {
            case 'welcome':
                this.playerId = msg.playerId;
                this.onWelcomeCallbacks.forEach(cb => cb({ playerId: msg.playerId, initialState: msg.initialState }));
                break;
            case 'delta':
                this.onDeltaCallbacks.forEach(cb => cb({ turn: msg.turn, events: msg.events, action: msg.action }));
                break;
            case 'error':
                console.error('Server Error:', msg.message);
                break;
        }
    }

    sendAction(action: Action) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('Cannot send action, not connected');
            return;
        }
        if (!this.playerId) {
            console.warn('Cannot send action, no playerId');
            return;
        }

        const msg: ClientMessage = {
            type: 'action',
            playerId: this.playerId,
            action
        };
        this.ws.send(JSON.stringify(msg));
    }

    onDelta(cb: DeltaHandler) {
        this.onDeltaCallbacks.push(cb);
    }

    onWelcome(cb: WelcomeHandler) {
        this.onWelcomeCallbacks.push(cb);
    }
}
