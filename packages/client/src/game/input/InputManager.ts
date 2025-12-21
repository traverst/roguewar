import { Action } from '@roguewar/rules';

export class InputManager {
    nextAction: Action | null = null;
    keys: Set<string> = new Set();

    constructor() {
        window.addEventListener('keydown', (e) => this.onKeyDown(e));
    }

    onKeyDown(e: KeyboardEvent) {
        switch (e.key) {
            case 'ArrowUp':
            case 'w':
                this.nextAction = { type: 'move', actorId: 'player', payload: { dx: 0, dy: -1 } };
                break;
            case 'ArrowDown':
            case 's':
                this.nextAction = { type: 'move', actorId: 'player', payload: { dx: 0, dy: 1 } };
                break;
            case 'ArrowLeft':
            case 'a':
                this.nextAction = { type: 'move', actorId: 'player', payload: { dx: -1, dy: 0 } };
                break;
            case 'ArrowRight':
            case 'd':
                this.nextAction = { type: 'move', actorId: 'player', payload: { dx: 1, dy: 0 } };
                break;
            case ' ':
                this.nextAction = { type: 'wait', actorId: 'player' };
                break;
        }
    }

    getAndClearAction(): Action | null {
        const action = this.nextAction;
        this.nextAction = null;
        return action;
    }
}
