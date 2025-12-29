/**
 * TurnPhaseUI - Shows who has acted and who is still waiting
 * No timer - turn ends when all players move or attack
 */
export class TurnPhaseUI {
    private container: HTMLDivElement;
    private statusElement: HTMLElement;
    private iconElement: HTMLElement;

    constructor(parent?: HTMLElement) {
        this.container = document.createElement('div');
        this.container.id = 'turn-phase-ui';
        this.container.style.cssText = `
            position: absolute;
            top: 10px;
            right: 260px;
            background: rgba(20, 20, 40, 0.85);
            border: 1px solid #6b5bff;
            border-radius: 8px;
            padding: 6px 10px;
            color: #fff;
            font-family: 'Inter', sans-serif;
            z-index: 100;
            font-size: 11px;
            pointer-events: none;
        `;

        this.container.innerHTML = `
            <div style="display: flex; align-items: center; gap: 6px;">
                <span id="phase-icon" style="font-size: 14px;">⏳</span>
                <div id="phase-status" style="font-size: 10px; color: #aaa; max-width: 120px;">Waiting...</div>
            </div>
        `;

        // Append to parent or body
        (parent || document.body).appendChild(this.container);

        this.statusElement = this.container.querySelector('#phase-status')!;
        this.iconElement = this.container.querySelector('#phase-icon')!;
    }

    /**
     * Set callback (not used in simplified design, kept for compatibility)
     */
    public setOnReady(_callback: () => void): void {
        // Not used - turn ends automatically when all players move/attack
    }

    /**
     * Update the phase display
     */
    public update(phase: string, _timeRemaining: number, pendingPlayers: string[]): void {
        if (phase === 'executing') {
            this.iconElement.textContent = '⚔️';
            this.statusElement.textContent = 'Executing...';
            this.statusElement.style.color = '#ffaa00';
        } else {
            if (pendingPlayers.length === 0) {
                this.iconElement.textContent = '✅';
                this.statusElement.textContent = 'All ready!';
                this.statusElement.style.color = '#4caf50';
            } else {
                this.iconElement.textContent = '⏳';
                this.statusElement.textContent = `Waiting: ${pendingPlayers.join(', ')}`;
                this.statusElement.style.color = '#aaa';
            }
        }
    }

    /**
     * Reset for new planning phase
     */
    public reset(): void {
        this.iconElement.textContent = '⏳';
        this.statusElement.textContent = 'Waiting...';
        this.statusElement.style.color = '#aaa';
        this.container.style.display = 'block';
    }

    /**
     * Hide the phase UI
     */
    public hide(): void {
        this.container.style.display = 'none';
    }

    /**
     * Show the phase UI
     */
    public show(): void {
        this.container.style.display = 'block';
    }

    /**
     * Remove from DOM
     */
    public destroy(): void {
        this.container.remove();
    }
}
