import './style.css'
import { CanvasRenderer } from './game/render/CanvasRenderer';
import { InputManager } from './game/input/InputManager';
import { ClientGameManager } from './game/managers/ClientGameManager';

// DOM Setup
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <h1>RogueWar Phase 4: Multiplayer</h1>
    <canvas id="gameCanvas" width="800" height="600"></canvas>
    <div id="instructions">
      <p>Arrow Keys or WASD to Move/Attack</p>
      <p>Space to Wait</p>
    </div>
    <div id="log" style="height: 100px; overflow-y: scroll; border: 1px solid #333; margin-top: 10px; font-family: monospace; font-size: 12px; text-align: left; padding: 5px;"></div>
  </div>
`;

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const renderer = new CanvasRenderer(canvas);
const input = new InputManager();

// Create Game Manager (handles Net, Prediction, State)
const gameManager = new ClientGameManager(renderer, input);

// Game Loop
function gameLoop() {
  gameManager.update();
  requestAnimationFrame(gameLoop);
}

// Start
requestAnimationFrame(gameLoop);
