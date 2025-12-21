import './style.css'
import { CanvasRenderer } from './game/render/CanvasRenderer';
import { InputManager } from './game/input/InputManager';
import {
  resolveTurn,
  GameState,
  DungeonGenerator,
  mulberry32,
  EntityType,
  GameEvent,
  Position
} from '@roguewar/rules';

// Re-implement initGame locally using Rules primitives
function createInitialState(seed: number): GameState {
  const rng = mulberry32(seed);
  const gen = new DungeonGenerator(50, 50, rng);
  const { tiles, spawn, enemies } = gen.generate();

  const player = {
    id: 'player',
    type: EntityType.Player,
    pos: spawn,
    hp: 100,
    maxHp: 100,
    attack: 10
  };

  const entityList = [player];
  enemies.forEach((pos: Position, idx: number) => {
    entityList.push({
      id: `enemy_${idx}`,
      type: EntityType.Enemy,
      pos: pos,
      hp: 30,
      maxHp: 30,
      attack: 5
    });
  });

  return {
    dungeon: tiles,
    entities: entityList,
    turn: 1,
    seed: Math.floor(rng() * 4294967296)
  };
}

// State
let currentState: GameState = createInitialState(12345);

// DOM Setup
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <h1>RogueWar Phase 2</h1>
    <canvas id="gameCanvas" width="800" height="600"></canvas>
    <div id="instructions">
      <p>Arrow Keys or WASD to Move/Attack</p>
      <p>Space to Wait</p>
    </div>
    <div id="log" style="height: 100px; overflow-y: scroll; border: 1px solid #333; margin-top: 10px; font-family: monospace; font-size: 12px; text-align: left; padding: 5px;"></div>
  </div>
`;

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const logEl = document.getElementById('log') as HTMLDivElement;
const renderer = new CanvasRenderer(canvas);
const input = new InputManager();

function log(msg: string) {
  const div = document.createElement('div');
  div.textContent = msg;
  logEl.prepend(div);
}

// Game Loop
let lastTime = 0;
function gameLoop(timestamp: number) {
  const dt = timestamp - lastTime;
  lastTime = timestamp;

  // Process Input
  const action = input.getAndClearAction();
  if (action) {
    // THE CORE CHANGE: Delegate to pure rules function
    const { nextState, events } = resolveTurn(currentState, action);

    // Apply new state
    currentState = nextState;

    // Log events
    events.forEach((e: GameEvent) => {
      if (e.type === 'attacked') {
        log(`${e.attackerId} attacked ${e.targetId} for ${e.damage}`);
      } else if (e.type === 'killed') {
        log(`${e.entityId} died`);
      }
    });
  }

  // Render
  renderer.render(currentState);

  requestAnimationFrame(gameLoop);
}

// Start
requestAnimationFrame(gameLoop);
