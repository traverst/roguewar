import { AIPlayer, AIPerception, ActorView, Action, AIBehaviorState } from '../types';

/**
 * Reactive Bot - Level 1 AI
 * 
 * Simple greedy decision-making:
 * 1. If enemy adjacent → Attack (move into them)
 * 2. If HP < 30% → Flee (move away from nearest enemy)
 * 3. Otherwise → Chase (move toward nearest enemy)
 * 
 * No planning, no memory, purely reactive.
 */
export class ReactiveBot implements AIPlayer {
    constructor(public readonly id: string) { }

    decide(perception: AIPerception): Action {
        const { self, visibleEnemies } = perception;

        // No enemies? Wait.
        if (visibleEnemies.length === 0) {
            return { type: 'wait', actorId: this.id, debugBehavior: AIBehaviorState.WAIT };
        }

        // Find nearest enemy
        const nearest = this.findNearest(self, visibleEnemies);
        const distance = this.manhattanDistance(self, nearest);

        // Adjacent? Attack by moving into them!
        if (distance === 1) {
            const dx = nearest.x - self.x;
            const dy = nearest.y - self.y;
            return {
                type: 'move',
                actorId: this.id,
                payload: { dx, dy },
                debugBehavior: AIBehaviorState.ATTACK
            };
        }

        // Low HP? Flee!
        if (self.hp < self.maxHp * 0.3) {
            const fleeDir = this.getFleeDirection(self, nearest);
            return {
                type: 'move',
                actorId: this.id,
                payload: fleeDir,
                debugBehavior: AIBehaviorState.FLEE
            };
        }

        // Otherwise, chase!
        const chaseDir = this.getChaseDirection(self, nearest);
        return {
            type: 'move',
            actorId: this.id,
            payload: chaseDir,
            debugBehavior: AIBehaviorState.CHASE
        };
    }

    private findNearest(self: ActorView, enemies: ActorView[]): ActorView {
        return enemies.reduce((nearest, enemy) => {
            const dSelf = this.manhattanDistance(self, enemy);
            const dNearest = this.manhattanDistance(self, nearest);
            return dSelf < dNearest ? enemy : nearest;
        });
    }

    private manhattanDistance(a: ActorView, b: ActorView): number {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    private getChaseDirection(self: ActorView, target: ActorView) {
        const dx = Math.sign(target.x - self.x);
        const dy = Math.sign(target.y - self.y);

        // Prefer horizontal or vertical movement (simpler pathing)
        if (Math.abs(target.x - self.x) > Math.abs(target.y - self.y)) {
            return { dx, dy: 0 };
        } else {
            return { dx: 0, dy };
        }
    }

    private getFleeDirection(self: ActorView, threat: ActorView) {
        // Move away from threat
        const dx = -Math.sign(threat.x - self.x);
        const dy = -Math.sign(threat.y - self.y);

        // Prefer horizontal or vertical
        if (Math.abs(threat.x - self.x) > Math.abs(threat.y - self.y)) {
            return { dx, dy: 0 };
        } else {
            return { dx: 0, dy };
        }
    }
}
