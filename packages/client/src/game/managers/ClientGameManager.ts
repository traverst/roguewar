import { Action, GameState, resolveTurn, GameEvent, ModRegistry } from '@roguewar/rules';
import { Transport } from '../net/Transport';
import { CanvasRenderer } from '../render/CanvasRenderer';
import { InputManager } from '../input/InputManager';

export class ClientGameManager {
    private net: Transport;
    private renderer: CanvasRenderer;
    private input: InputManager;

    private authoritativeState: GameState | null = null;
    private predictedState: GameState | null = null;
    private isWaitingForServer: boolean = false;
    private localPlayerId: string | null = null;
    private registry: ModRegistry | null;

    constructor(renderer: CanvasRenderer, input: InputManager, transport: Transport, registry: ModRegistry | null = null) {
        this.renderer = renderer;
        this.input = input;
        this.net = transport;
        this.registry = registry;

        this.net.onMessage((msg) => {
            if (msg.type === 'welcome') {
                // Verify mods if we have a registry
                if (this.registry) {
                    const hostMods = msg.mods;
                    const localMods = this.registry.getAllManifests();
                    const mismatch = hostMods.length !== localMods.length ||
                        hostMods.some(h => !localMods.find(l => l.id === h.id && l.hash === h.hash));

                    if (mismatch) {
                        const error = `Mod Mismatch! Host mods: ${hostMods.map(m => m.id).join(', ')}`;
                        console.error(error, "Local has:", localMods.map(m => m.id).join(', '));
                        alert(error);
                        return;
                    }
                }

                this.localPlayerId = msg.playerId;
                this.authoritativeState = msg.initialState;
                this.predictedState = JSON.parse(JSON.stringify(this.authoritativeState));
                this.isWaitingForServer = false;
                console.log("Joined game as", this.localPlayerId);
            } else if (msg.type === 'delta') {
                this.handleDelta(msg);
            } else if (msg.type === 'error') {
                console.error("Server Error:", msg.message);
            }
        });
    }

    private handleDelta(msg: { turn: number; events: GameEvent[]; action: Action; currentState?: GameState }) {
        // console.log("Handling Delta:", msg); // Verbose
        if (!this.authoritativeState) return;

        // If server sent full currentState, use it (includes AI behaviors)
        if (msg.currentState) {
            console.log('[Client] Using currentState from server (includes AI behaviors)');
            this.authoritativeState = msg.currentState;
        } else {
            // Otherwise, apply action to current state
            const { nextState } = resolveTurn(this.authoritativeState, msg.action, this.registry || undefined);
            this.authoritativeState = nextState;
        }

        this.predictedState = JSON.parse(JSON.stringify(this.authoritativeState));

        // Unblock local player if this was their action
        if (msg.action.actorId === this.localPlayerId) {
            console.log(`[Client] Unlocking input. Action ID ${msg.action.actorId} matched Local ID ${this.localPlayerId}`);
            this.isWaitingForServer = false;
        } else {
            console.log(`[Client] Delta received but not for me. Action: ${msg.action.actorId}, Me: ${this.localPlayerId}`);
        }

        if (msg.events.length > 0) {
            console.log("Delta Events:", msg.events);
        }
    }

    public update() {
        if (!this.predictedState || !this.localPlayerId) {
            this.renderer.ctx.fillStyle = '#fff';
            this.renderer.ctx.fillText('Connecting...', 50, 50);
            return;
        }

        if (!this.isWaitingForServer) {
            const action = this.input.getAndClearAction();
            if (action) {
                console.log(`[Client] Sending Action for ${this.localPlayerId}:`, action);
                action.actorId = this.localPlayerId;

                // Client-side prediction
                const { nextState } = resolveTurn(this.predictedState, action, this.registry || undefined);
                this.predictedState = nextState;

                this.isWaitingForServer = true;
                console.log("[Client] Input Locked. Waiting for server...");

                this.net.send({
                    type: 'action',
                    playerId: this.localPlayerId,
                    action
                });
            }
        } else {
            // console.log("Waiting for server..."); 
        }

        this.renderer.render(this.predictedState, this.localPlayerId);
    }
}
