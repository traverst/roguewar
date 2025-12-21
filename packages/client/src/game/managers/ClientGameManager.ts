import { Action, GameState, resolveTurn, GameEvent } from '@roguewar/rules';
import { NetworkClient } from '../net/NetworkClient';
import { CanvasRenderer } from '../render/CanvasRenderer';
import { InputManager } from '../input/InputManager';

export class ClientGameManager {
    private net: NetworkClient;
    private renderer: CanvasRenderer;
    private input: InputManager;

    private authoritativeState: GameState | null = null;
    private predictedState: GameState | null = null;

    // Lock input locally while waiting for server? 
    // Phase 4 says: "Disable further input until resolved".
    // This simplifies reconciliation as we don't need to re-replay a queue of pending inputs.
    // We just predict the one action, wait for delta, then unlock.
    private isWaitingForServer: boolean = false;

    // Local player ID assigned by server
    private localPlayerId: string | null = null;

    constructor(renderer: CanvasRenderer, input: InputManager) {
        this.renderer = renderer;
        this.input = input;
        this.net = new NetworkClient();

        this.net.onWelcome((msg) => this.handleWelcome(msg));
        this.net.onDelta((msg) => this.handleDelta(msg));

        // Connect automatically on start
        this.net.connect();
    }

    private handleWelcome(msg: { playerId: string; initialState: GameState }) {
        this.localPlayerId = msg.playerId;
        this.authoritativeState = msg.initialState;
        // Clone for prediction
        this.predictedState = JSON.parse(JSON.stringify(this.authoritativeState));
        console.log("Joined game as", this.localPlayerId);

        // Unlock input
        this.isWaitingForServer = false;
    }

    private handleDelta(msg: { turn: number; events: GameEvent[]; action: Action }) {
        if (!this.authoritativeState) return;

        // Apply authoritative update
        // We act as if we are the server running the specific action
        const { nextState } = resolveTurn(this.authoritativeState, msg.action);
        this.authoritativeState = nextState;

        // Reconciliation:
        // Since we lock input, our 'predicted' state contains exactly this action (if it was us)
        // or nothing (if it was someone else and we haven't predicted them).

        // Actually, for other players, we didn't predict them.
        // For us, we did.
        // In stable state, predicted == authoritative.
        // So we just reset predicted to authoritative.
        this.predictedState = JSON.parse(JSON.stringify(this.authoritativeState));

        // Unlock if it was our action that just resolved
        if (msg.action.actorId === this.localPlayerId) {
            this.isWaitingForServer = false;
        }

        // Log events for debugging/feedback
        if (msg.events.length > 0) {
            console.log("Delta Events:", msg.events);
        }
    }

    public update() {
        if (!this.predictedState || !this.localPlayerId) {
            // Loading screen?
            this.renderer.ctx.fillStyle = '#fff';
            this.renderer.ctx.fillText('Connecting...', 50, 50);
            return;
        }

        // 1. Process Input
        if (!this.isWaitingForServer) {
            const action = this.input.getAndClearAction();
            if (action) {
                // stamp with our ID (input manager might put 'player', we need real ID)
                action.actorId = this.localPlayerId;

                // Predict
                // We use resolveTurn locally.
                const { nextState, events } = resolveTurn(this.predictedState, action);
                this.predictedState = nextState;

                // Send to server
                this.net.sendAction(action);

                // Lock
                this.isWaitingForServer = true;
            }
        }

        // 2. Render
        // We always render PREDICTED state to feel responsive
        this.renderer.render(this.predictedState, this.localPlayerId);
    }
}
