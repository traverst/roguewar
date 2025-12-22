import { GameState } from '@roguewar/rules';
import { AIPerception, ActorView } from './types';

/**
 * Creates a filtered perception of the game state for an AI player.
 * 
 * This ensures AI cannot access raw internal structures and must
 * use the same information a human player would have.
 * 
 * @param state Current game state
 * @param playerId ID of the AI player
 * @returns Filtered perception for decision-making
 */
export function createPerception(
    state: GameState,
    playerId: string
): AIPerception {
    const self = state.entities.find(e => e.id === playerId);
    if (!self) {
        throw new Error(`AI player ${playerId} not found in game state`);
    }

    // For now, all entities are visible (simple implementation)
    // Later: Add FOV/LOS if needed
    const visibleEnemies: ActorView[] = state.entities
        .filter(e => e.id !== playerId && e.hp > 0 && e.type !== self.type)
        .map(e => ({
            id: e.id,
            x: e.pos.x,
            y: e.pos.y,
            hp: e.hp,
            maxHp: e.maxHp,
            isAlly: false
        }));

    const visibleAllies: ActorView[] = state.entities
        .filter(e => e.id !== playerId && e.hp > 0 && e.type === self.type)
        .map(e => ({
            id: e.id,
            x: e.pos.x,
            y: e.pos.y,
            hp: e.hp,
            maxHp: e.maxHp,
            isAlly: true
        }));

    return {
        self: {
            id: self.id,
            x: self.pos.x,
            y: self.pos.y,
            hp: self.hp,
            maxHp: self.maxHp,
            isAlly: false
        },
        visibleEnemies,
        visibleAllies,
        turn: state.turn
    };
}
