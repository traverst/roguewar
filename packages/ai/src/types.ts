import { GameState } from '@roguewar/rules';

/**
 * Filtered view of an entity for AI perception.
 * Prevents AI from accessing internal state directly.
 */
export interface ActorView {
    id: string;
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    isAlly: boolean;
}

/**
 * AI Perception - what the AI can "see" about the game state.
 * This is the ONLY interface AI uses to understand the world.
 */
export interface AIPerception {
    self: ActorView;
    visibleEnemies: ActorView[];
    visibleAllies: ActorView[];
    turn: number;
}

/**
 * AI Player interface.
 * All AI must implement this and output standard Actions.
 */
export interface AIPlayer {
    readonly id: string;
    decide(perception: AIPerception): Action;
}

/**
 * AI Behavior States for debugging/visualization
 */
export enum AIBehaviorState {
    WAIT = 'WAIT',
    CHASE = 'CHASE',
    ATTACK = 'ATTACK',
    FLEE = 'FLEE'
}

/**
 * Action types that AI can perform.
 * Must match the core Action interface.
 */
export type Action =
    | { type: 'move'; actorId: string; payload: { dx: number; dy: number }; debugBehavior?: AIBehaviorState }
    | { type: 'wait'; actorId: string; debugBehavior?: AIBehaviorState };
