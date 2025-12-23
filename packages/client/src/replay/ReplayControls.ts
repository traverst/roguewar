// import { GameState } from '@roguewar/rules';

export class ReplayControls {
    private container: HTMLDivElement;
    private scrubber: HTMLInputElement;
    private playButton: HTMLButtonElement;
    private turnDisplay: HTMLSpanElement;

    private isPlaying: boolean = false;
    private currentTurn: number = 0;
    private maxTurns: number = 0;

    private onTurnChange: (turn: number) => void;
    private playInterval: any = null;

    constructor(parent: HTMLElement, maxTurns: number, onTurnChange: (turn: number) => void) {
        this.maxTurns = maxTurns;
        this.onTurnChange = onTurnChange;

        this.container = document.createElement('div');
        this.container.style.cssText = `
            position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
            background: rgba(0,0,0,0.8); color: #fff; padding: 15px 25px;
            border-radius: 10px; display: flex; align-items: center; gap: 15px;
            font-family: 'Inter', sans-serif; box-shadow: 0 4px 15px rgba(0,0,0,0.5);
            z-index: 1000; min-width: 400px;
        `;

        this.playButton = document.createElement('button');
        this.playButton.innerText = '▶';
        this.playButton.style.cssText = `
            background: #444; color: #fff; border: none; padding: 5px 15px;
            border-radius: 5px; cursor: pointer; font-size: 1.2rem;
        `;
        this.playButton.onclick = () => this.togglePlay();

        this.scrubber = document.createElement('input');
        this.scrubber.type = 'range';
        this.scrubber.min = '0';
        this.scrubber.max = maxTurns.toString();
        this.scrubber.value = '0';
        this.scrubber.style.cssText = `flex-grow: 1; cursor: pointer;`;
        this.scrubber.oninput = () => {
            this.setTurn(parseInt(this.scrubber.value));
            if (this.isPlaying) this.pause();
        };

        this.turnDisplay = document.createElement('span');
        this.turnDisplay.innerText = `Turn: 0 / ${maxTurns}`;
        this.turnDisplay.style.cssText = `min-width: 100px; text-align: right; font-variant-numeric: tabular-nums;`;

        const closeButton = document.createElement('button');
        closeButton.innerText = '✕';
        closeButton.style.cssText = `
            background: #a22; color: #fff; border: none; width: 25px; height: 25px;
            border-radius: 50%; cursor: pointer; margin-left: 10px;
        `;
        closeButton.onclick = () => window.location.reload();

        this.container.appendChild(this.playButton);
        this.container.appendChild(this.scrubber);
        this.container.appendChild(this.turnDisplay);
        this.container.appendChild(closeButton);
        parent.appendChild(this.container);
    }

    public togglePlay() {
        if (this.isPlaying) this.pause();
        else this.play();
    }

    public play() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        this.playButton.innerText = '⏸';

        this.playInterval = setInterval(() => {
            if (this.currentTurn >= this.maxTurns) {
                this.pause();
                return;
            }
            this.setTurn(this.currentTurn + 1);
        }, 500); // 2 turns per second
    }

    public pause() {
        this.isPlaying = false;
        this.playButton.innerText = '▶';
        if (this.playInterval) {
            clearInterval(this.playInterval);
            this.playInterval = null;
        }
    }

    public setTurn(turn: number) {
        if (turn < 0) turn = 0;
        if (turn > this.maxTurns) turn = this.maxTurns;

        this.currentTurn = turn;
        this.scrubber.value = turn.toString();
        this.turnDisplay.innerText = `Turn: ${turn} / ${this.maxTurns}`;
        this.onTurnChange(turn);
    }

    public destroy() {
        this.pause();
        this.container.remove();
    }
}
