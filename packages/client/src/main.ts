import './style.css'
import { CanvasRenderer } from './game/render/CanvasRenderer';
import { InputManager } from './game/input/InputManager';
import { ClientGameManager } from './game/managers/ClientGameManager';
import { HostTransport } from './game/net/HostTransport';
import { PeerTransport } from './game/net/PeerTransport';
import { Transport } from './game/net/Transport';

// DOM Elements
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = ''; // Clear default

const lobbyDiv = document.createElement('div');
lobbyDiv.id = 'lobby';
lobbyDiv.innerHTML = `
    <div style="text-align: center; margin-top: 50px;">
        <h1 style="font-family: monospace; color: #ffd700;">ROGUEWAR P2P</h1>
        <div style="display: flex; gap: 40px; justify-content: center; margin-top: 40px;">
            <div style="border: 1px solid #444; padding: 30px; border-radius: 8px; background: #111;">
                <h2 style="color: #fff;">HOST GAME</h2>
                <p style="color: #888; font-size: 14px; margin-bottom: 20px;">Start a new world and invite peers.</p>
                <button id="btnHost" style="padding: 10px 20px; font-size: 16px; cursor: pointer; background: #333; color: white; border: 1px solid #555;">Start Hosting</button>
            </div>
            
            <div style="border: 1px solid #444; padding: 30px; border-radius: 8px; background: #111;">
                <h2 style="color: #fff;">JOIN GAME</h2>
                <p style="color: #888; font-size: 14px; margin-bottom: 20px;">Connect to an existing host.</p>
                <input type="text" id="inputHostId" placeholder="Enter Host ID" style="padding: 10px; font-size: 16px; background: #222; color: white; border: 1px solid #555; display: block; margin-bottom: 10px; width: 100%; box-sizing: border-box;" />
                <button id="btnJoin" style="padding: 10px 20px; font-size: 16px; cursor: pointer; background: #333; color: white; border: 1px solid #555; width: 100%;">Join</button>
            </div>
        </div>
        <div id="status" style="margin-top: 30px; color: #aaa; font-family: monospace;"></div>
    </div>
`;

const gameDiv = document.createElement('div');
gameDiv.id = 'game';
gameDiv.style.display = 'none';
gameDiv.innerHTML = `
    <h1 style="font-family: monospace; font-size: 16px; margin: 5px 0; color: #666;">ROGUEWAR <span id="gameInfo" style="color: #ffd700;"></span></h1>
    <canvas id="gameCanvas" width="800" height="600" style="border: 1px solid #333;"></canvas>
    <div id="instructions" style="color: #888; font-family: monospace; font-size: 12px; margin-top: 5px;">
      <span>[WASD/Arrows]: Move/Attack</span> | <span>[Space]: Wait</span>
    </div>
    <div id="log" style="height: 100px; overflow-y: scroll; border: 1px solid #333; margin-top: 10px; font-family: monospace; font-size: 12px; text-align: left; padding: 5px; background: #000; color: #888;"></div>
`;

app.appendChild(lobbyDiv);
app.appendChild(gameDiv);

// State
let gameManager: ClientGameManager | null = null;
let input: InputManager | null = null;

function startGame(transport: Transport) {
  lobbyDiv.style.display = 'none';
  gameDiv.style.display = 'block';

  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  const renderer = new CanvasRenderer(canvas);
  input = new InputManager(); // Enable input

  gameManager = new ClientGameManager(renderer, input, transport);

  requestAnimationFrame(gameLoop);
}

// Helper to log to UI
function log(msg: string) {
  const logDiv = document.getElementById('log');
  if (logDiv) {
    const line = document.createElement('div');
    line.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
    logDiv.prepend(line);
  }
  console.log(msg);
}

// Event Listeners
document.getElementById('btnHost')?.addEventListener('click', async () => {
  const status = document.getElementById('status')!;
  status.innerText = "Initializing Host...";
  log("Initializing Host Transport...");

  // Disable buttons
  (document.getElementById('btnHost') as HTMLButtonElement).disabled = true;
  (document.getElementById('btnJoin') as HTMLButtonElement).disabled = true;

  try {
    const transport = new HostTransport(log);
    log("Requesting Peer ID...");
    const hostId = await transport.connect();

    status.innerText = `Hosting! ID: ${hostId}`;
    log(`Host ID acquired: ${hostId}`);

    const info = document.getElementById('gameInfo')!;
    info.innerText = `| HOST: ${hostId}`;

    startGame(transport);
  } catch (e) {
    status.innerText = "Error hosting: " + e;
    log(`Error hosting: ${e}`);
    (document.getElementById('btnHost') as HTMLButtonElement).disabled = false;
    (document.getElementById('btnJoin') as HTMLButtonElement).disabled = false;
  }
});

document.getElementById('btnJoin')?.addEventListener('click', async () => {
  const status = document.getElementById('status')!;
  const hostId = (document.getElementById('inputHostId') as HTMLInputElement).value.trim();

  if (!hostId) {
    status.innerText = "Please enter Host ID";
    return;
  }

  status.innerText = "Connecting to " + hostId + "...";
  (document.getElementById('btnHost') as HTMLButtonElement).disabled = true;
  (document.getElementById('btnJoin') as HTMLButtonElement).disabled = true;

  try {
    const transport = new PeerTransport(log);
    const myId = await transport.connect(hostId);

    status.innerText = "Connected!";
    log(`Connected! My ID: ${myId}`);

    const info = document.getElementById('gameInfo')!;
    info.innerText = `| CONNECTED TO: ${hostId} (ME: ${myId})`;

    startGame(transport);
  } catch (e) {
    status.innerText = "Error connecting: " + e;
    log(`Error connecting: ${e}`);
    (document.getElementById('btnHost') as HTMLButtonElement).disabled = false;
    (document.getElementById('btnJoin') as HTMLButtonElement).disabled = false;
  }
});

// Global Error Handler
window.onerror = function (msg, source, lineno, colno, error) {
  log(`CRITICAL ERROR: ${msg} (${source}:${lineno})`);
  if (error) console.error(error);
  return false;
};

window.addEventListener('unhandledrejection', function (event) {
  log(`UNHANDLED PROMISE: ${event.reason}`);
  console.error(event.reason);
});

// Game Loop
function gameLoop() {
  try {
    if (gameManager) {
      gameManager.update();
    }
    requestAnimationFrame(gameLoop);
  } catch (e) {
    log(`GAME LOOP CRASH: ${e}`);
    console.error(e);
  }
}
