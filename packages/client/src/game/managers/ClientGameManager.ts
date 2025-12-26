import { Action, GameState, resolveTurn, GameEvent, ModRegistry } from '@roguewar/rules';
import { Transport } from '../net/Transport';
import { CanvasRenderer } from '../render/CanvasRenderer';
import { InputManager } from '../input/InputManager';

export class ClientGameManager {
    private net: Transport;
    private renderer: CanvasRenderer;
    private input: InputManager;

    public authoritativeState: GameState | null = null;
    private predictedState: GameState | null = null;
    private isWaitingForServer: boolean = false;
    public localPlayerId: string | null = null;
    private pendingIdentity: string | null = null;
    private registry: ModRegistry | null;

    public connectedEntityIds: string[] = [];
    public onGameStateChanged: ((state: GameState, connectedIds: string[]) => void) | null = null;
    public onGameEnd: ((outcome: 'victory' | 'defeat') => void) | null = null;
    public onInventoryUpdate: ((player: any) => void) | null = null;

    constructor(renderer: CanvasRenderer, input: InputManager, transport: Transport, registry: ModRegistry | null = null) {
        this.renderer = renderer;
        this.input = input;
        this.net = transport;
        this.registry = registry;

        this.net.onMessage((msg) => {
            console.log("[ClientGameManager] Received message:", msg.type);
            if (msg.type === 'welcome') {
                console.log("[ClientGameManager] Processing welcome message");
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

                // CRITICAL: Update connected IDs
                if ('connectedEntityIds' in msg) {
                    this.connectedEntityIds = msg.connectedEntityIds;
                }

                console.log("Joined/Spectating as", this.localPlayerId);

                if (this.onGameStateChanged && this.authoritativeState) {
                    this.onGameStateChanged(this.authoritativeState, this.connectedEntityIds);
                }

            } else if (msg.type === 'delta') {
                this.handleDelta(msg);
            } else if (msg.type === 'error') {
                console.error("Server Error:", msg.message);
                // CRITICAL FIX: Unlock input on error so user can retry!
                this.isWaitingForServer = false;
                alert(`Action Failed: ${msg.message}`);
            }
        });
    }

    public claimIdentity(userId: string) {
        console.log(`[Client] Claiming identity: ${userId}`);
        this.pendingIdentity = userId;
        this.net.send({ type: 'identity', userId });
    }

    private handleDelta(msg: { turn: number; events: GameEvent[]; action: Action; currentState?: GameState }) {
        console.log(`[Client] HandleDelta Turn ${msg.turn} | Action: ${msg.action.type} by ${msg.action.actorId} | Me: ${this.localPlayerId}`);

        if (!this.authoritativeState) return;

        // If server sent full currentState, use it (includes AI behaviors)
        if (msg.currentState) {
            // console.log('[Client] Using currentState from server');
            this.authoritativeState = msg.currentState;
        } else {
            // Otherwise, apply action to current state
            const { nextState } = resolveTurn(this.authoritativeState, msg.action, this.registry || undefined);
            this.authoritativeState = nextState;
        }

        this.predictedState = JSON.parse(JSON.stringify(this.authoritativeState));

        // CRITICAL CHECK: Unblock local player if this was their action OR if the turn advanced
        // We also simply unlock on ANY state update to be safe against desyncs, 
        // as long as the state is fresh.
        if (msg.action.actorId === this.localPlayerId) {
            console.log(`[Client] ✅ Unlocking input. My action confirmed.`);
            this.isWaitingForServer = false;
        } else {
            // Identity Consummation: If this is a JOIN action for a user we claimed, switch identity
            if (msg.action.type === 'join' && (this.pendingIdentity && msg.action.actorId === this.pendingIdentity)) {
                console.log(`[Client] Identity Claim Confirmed! Switching to ${this.pendingIdentity}`);
                this.localPlayerId = this.pendingIdentity;
                this.pendingIdentity = null;
                this.isWaitingForServer = false; // Just in case
            }

            console.log(`[Client] Delta is valid but not my action. waiting=${this.isWaitingForServer}`);
        }

        // Check for victory/defeat events
        if (msg.events && msg.events.length > 0) {
            const hasVictory = msg.events.some(e => e.type === 'victory');
            const hasDefeat = msg.events.some(e => e.type === 'defeat');

            if (hasVictory) {
                console.log('[Client] 🎉 VICTORY DETECTED!');
                if (this.onGameEnd) {
                    this.onGameEnd('victory');
                } else {
                    setTimeout(() => {
                        alert('🎉 VICTORY! You reached the exit and completed the dungeon!');
                        window.location.reload();
                    }, 300);
                }
            } else if (hasDefeat) {
                console.log('[Client] ☠️ DEFEAT DETECTED!');
                if (this.onGameEnd) {
                    this.onGameEnd('defeat');
                } else {
                    setTimeout(() => {
                        alert('☠️ DEFEAT! All heroes have fallen.');
                        window.location.reload();
                    }, 300);
                }
            }
        }
    }

    public update() {
        if (!this.predictedState) {
            this.renderer.ctx.fillStyle = '#fff';
            this.renderer.ctx.fillText('Connecting...', 50, 50);
            return;
        }

        if (!this.isWaitingForServer) {
            const action = this.input.getAndClearAction();
            if (action && this.localPlayerId) {
                // Only process actions if we have a player ID (not a spectator)
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

        // Update inventory UI if callback is set
        if (this.onInventoryUpdate && this.localPlayerId) {
            const player = this.predictedState.entities.find(e => e.id === this.localPlayerId);
            if (player) {
                this.onInventoryUpdate(player);
            }
        }
    }
}
