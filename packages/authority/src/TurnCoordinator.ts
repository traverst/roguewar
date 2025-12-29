/**
 * TurnCoordinator - Wrapper around HostEngine for simultaneous multiplayer turns
 * 
 * Design principles:
 * - Does NOT modify HostEngine - only wraps it
 * - Free actions (equip/use/drop) bypass the queue and execute immediately
 * - Turn-ending actions (move/attack) are queued until all ALIVE players have acted
 * - Falls back to engine.processAction for any edge cases
 */

import { HostEngine, AuthorityMessage } from './HostEngine';
import { Action } from '@roguewar/rules';

export class TurnCoordinator {
    private engine: HostEngine;
    private pendingActions: Map<string, Action> = new Map();
    private playerIds: Set<string> = new Set();
    private onDeltaBroadcast: ((delta: AuthorityMessage) => void) | null = null;

    // Action types that end a player's turn
    private static readonly TURN_ENDING_ACTIONS = ['move', 'attack'];

    constructor(engine: HostEngine) {
        this.engine = engine;
    }

    /**
     * Set callback for when a batch of actions completes
     */
    setOnDeltaBroadcast(callback: (delta: AuthorityMessage) => void): void {
        this.onDeltaBroadcast = callback;
    }

    /**
     * Register a player ID to track for turn completion
     */
    registerPlayer(playerId: string): void {
        console.log(`[TurnCoordinator] Registered player: ${playerId}`);
        this.playerIds.add(playerId);
    }

    /**
     * Remove a player (disconnected)
     */
    unregisterPlayer(playerId: string): void {
        console.log(`[TurnCoordinator] Unregistered player: ${playerId}`);
        this.playerIds.delete(playerId);
        this.pendingActions.delete(playerId);
    }

    /**
     * Get list of ACTIVE (alive) player peerIds only
     * Dead players become spectators and don't block the game
     */
    private getAlivePlayers(): string[] {
        const state = this.engine.getState();
        const playerMappings = this.engine.getPlayerMappings();

        // Filter registered playerIds - only include those whose entity is alive
        return Array.from(this.playerIds).filter(peerId => {
            // Get the userId (entity ID) for this peerId
            const userId = playerMappings.get(peerId);
            if (!userId) {
                console.log(`[TurnCoordinator] No userId for peerId ${peerId}, assuming alive`);
                return true;
            }

            // Find the entity with this userId
            const entity = state.entities.find(e => e.id === userId);
            if (!entity) {
                console.log(`[TurnCoordinator] No entity for userId ${userId}, assuming alive`);
                return true;
            }

            // Check if entity has HP > 0 (alive)
            const hp = entity.hp ?? 0;
            const isAlive = hp > 0;
            if (!isAlive) {
                console.log(`[TurnCoordinator] Player ${userId} is DEAD (HP=${hp}) - not waiting for them`);
            }
            return isAlive;
        });
    }

    /**
     * Check if an action type ends a turn
     */
    private isTurnEndingAction(action: Action): boolean {
        return TurnCoordinator.TURN_ENDING_ACTIONS.includes(action.type);
    }

    /**
     * Submit an action from a player
     * 
     * - Free actions: execute immediately via engine
     * - Turn-ending actions: queue until all players have acted
     * 
     * Returns:
     * - AuthorityMessage if action was executed (or error)
     * - null if action was queued (waiting for other players)
     */
    submitAction(playerId: string, action: Action): AuthorityMessage | null {
        // Get currently alive players
        const alivePlayers = this.getAlivePlayers();

        console.log(`[TurnCoordinator] submitAction called`);
        console.log(`[TurnCoordinator]   playerId: "${playerId}"`);
        console.log(`[TurnCoordinator]   action.type: "${action.type}"`);
        console.log(`[TurnCoordinator]   alive players: [${alivePlayers.join(', ')}]`);
        console.log(`[TurnCoordinator]   pending actions from: [${Array.from(this.pendingActions.keys()).join(', ')}]`);

        // Free actions bypass the queue entirely
        if (!this.isTurnEndingAction(action)) {
            console.log(`[TurnCoordinator] Free action "${action.type}" - executing immediately`);
            return this.engine.processAction(playerId, action);
        }

        // If only one ALIVE player, execute immediately (solo mode or other player dead)
        if (alivePlayers.length <= 1) {
            console.log(`[TurnCoordinator] Only ${alivePlayers.length} alive player(s) - executing immediately`);
            return this.engine.processAction(playerId, action);
        }

        // Queue this player's turn-ending action
        this.pendingActions.set(playerId, action);
        console.log(`[TurnCoordinator] Queued ${action.type} from "${playerId}" (${this.pendingActions.size}/${alivePlayers.length})`);

        // Check if all ALIVE players have submitted
        const allPlayersActed = alivePlayers.every(id => {
            const has = this.pendingActions.has(id);
            console.log(`[TurnCoordinator]   Checking "${id}": has pending action = ${has}`);
            return has;
        });

        if (allPlayersActed) {
            console.log(`[TurnCoordinator] All players have acted - executing turn!`);
            return this.executeAllActions();
        }

        // Return null - action is queued, waiting for others
        console.log(`[TurnCoordinator] Waiting for more players...`);
        return null;
    }

    /**
     * Execute all queued actions simultaneously
     * 
     * Process each action through the engine, combine events,
     * then clear the queue for the next turn.
     */
    private executeAllActions(): AuthorityMessage {
        const allEvents: any[] = [];
        let finalState: any = null;
        let lastTurn = 0;

        // Track the last action for the delta response
        let lastAction: Action | null = null;

        // Convert to array for indexed access
        const actionsArray = Array.from(this.pendingActions.entries());
        const totalActions = actionsArray.length;

        // Process each queued action through the engine
        for (let i = 0; i < totalActions; i++) {
            const [playerId, action] = actionsArray[i];
            const isLastAction = (i === totalActions - 1);

            console.log(`[TurnCoordinator] Executing ${action.type} from ${playerId} (${i + 1}/${totalActions}, isLast=${isLastAction})`);

            // Skip AI and turn advance for all but the last action
            // This prevents AI from running multiple times
            const result = this.engine.processAction(playerId, action, {
                skipAI: !isLastAction,
                skipTurnAdvance: !isLastAction
            });

            if (result.type === 'delta') {
                // Collect events from this action
                if (result.events) {
                    allEvents.push(...result.events);
                }
                finalState = result.currentState;
                lastTurn = result.turn;
                lastAction = action;
            } else if (result.type === 'error') {
                // Log errors but continue processing others
                console.warn(`[TurnCoordinator] Error processing action from ${playerId}: ${result.message}`);
            }
        }

        // Clear the queue for the next turn
        this.pendingActions.clear();

        // Return combined delta with all events
        return {
            type: 'delta',
            turn: lastTurn,
            events: allEvents,
            action: lastAction || { type: 'wait', actorId: 'system' },
            currentState: finalState
        };
    }

    /**
     * Get current status (for UI display)
     */
    getStatus(): { waitingFor: string[] } {
        const waitingFor = Array.from(this.playerIds).filter(id =>
            !this.pendingActions.has(id)
        );
        return { waitingFor };
    }

    /**
     * Reset (e.g., on game restart)
     */
    reset(): void {
        this.pendingActions.clear();
        this.playerIds.clear();
    }
}
