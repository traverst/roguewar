import './style.css'
import { CanvasRenderer } from './game/render/CanvasRenderer';
import { InputManager } from './game/input/InputManager';
import { ClientGameManager } from './game/managers/ClientGameManager';
import { HostTransport } from './game/net/HostTransport';
import { PeerTransport } from './game/net/PeerTransport';
import { Transport } from './game/net/Transport';
import { GameStorage } from './storage/GameStorage';
import { ReplayEngine } from './replay/ReplayEngine';
import { HostEngine } from '@roguewar/authority';

// DOM Elements
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = ''; // Clear default

const USER_ID_KEY = 'roguewar_user_id';
function getPersistentUserId(): string {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = `player-${Math.random().toString(36).substr(2, 6)}`;
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

function storeUserId(id: string) {
  localStorage.setItem(USER_ID_KEY, id);
}

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

        <div style="border: 1px solid #444; padding: 20px; border-radius: 8px; background: #111; margin-top: 20px; max-width: 600px; margin-left: auto; margin-right: auto;">
            <h3 style="color: #fff; margin-top: 0; font-size: 14px;">PLAYER IDENTITY</h3>
            <div style="display: flex; gap: 10px; justify-content: center;">
              <input type="text" id="inputUserId" placeholder="Your Player Name" style="padding: 8px; font-size: 14px; background: #222; color: #ffd700; border: 1px solid #555; width: 250px;" />
              <div id="idStatus" style="font-size: 11px; color: #666; align-self: center;">Stable across sessions</div>
            </div>
        </div>
        
        <div style="border: 1px solid #444; padding: 30px; border-radius: 8px; background: #111; margin-top: 20px; max-width: 600px; margin-left: auto; margin-right: auto;">
            <h2 style="color: #fff;">SAVED GAMES</h2>
            <div id="savedGamesList" style="margin-top: 10px; max-height: 200px; overflow-y: auto; text-align: left;">
                <p style="color: #666; text-align: center;">Loading saved games...</p>
            </div>
            <div style="margin-top: 15px; border-top: 1px solid #333; padding-top: 15px;">
                <button id="btnImport" style="padding: 5px 10px; font-size: 12px; cursor: pointer; background: #222; color: #aaa; border: 1px solid #444;">Import from JSON</button>
            </div>
        </div>

        <div id="status" style="margin-top: 30px; color: #aaa; font-family: monospace;"></div>
    </div>

    <!-- Character Selection Modal -->
    <div id="charModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 1000; justify-content: center; align-items: center;">
        <div style="background: #111; border: 1px solid #ffd700; padding: 30px; border-radius: 8px; max-width: 400px; width: 100%; box-sizing: border-box; text-align: center;">
            <h2 style="color: #ffd700; margin-top: 0;">RECLAIM IDENTITY</h2>
            <p style="color: #888; font-size: 14px; margin-bottom: 20px;">Choose a character to control from this save:</p>
            <div id="charList" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px; max-height: 300px; overflow-y: auto;">
                <!-- Characters populated here -->
            </div>
            <button id="btnCancelLoad" style="padding: 10px 20px; font-size: 14px; cursor: pointer; background: #222; color: #888; border: 1px solid #444;">Cancel</button>
        </div>
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
    <div id="aiLegend" style="color: #888; font-family: monospace; font-size: 11px; margin-top: 5px; padding: 5px; background: #111; border: 1px solid #333;">
      <strong style="color: #ffd700;">AI Behaviors:</strong> 
      <span style="color: #00ffff;">🔵 CHASE</span> | 
      <span style="color: #ff00ff;">🟣 ATTACK</span> | 
      <span style="color: #ffff00;">🟡 FLEE</span> | 
      <span style="color: #ffffff;">⚪ WAIT</span>
    </div>
    <div style="margin-top: 5px; display: flex; gap: 10px; align-items: center;">
      <button id="btnSpawnAI" style="padding: 5px 10px; font-size: 12px; cursor: pointer; background: #333; color: white; border: 1px solid #555;">Spawn AI Bot</button>
      <button id="btnSave" style="padding: 5px 10px; font-size: 12px; cursor: pointer; background: #1a4a1a; color: white; border: 1px solid #2a5a2a;">Save Game</button>
      <button id="btnExport" style="padding: 5px 10px; font-size: 12px; cursor: pointer; background: #333; color: #aaa; border: 1px solid #444;">Export JSON</button>
      <button id="btnExit" style="padding: 5px 10px; font-size: 12px; cursor: pointer; background: #4a1a1a; color: white; border: 1px solid #5a2a2a;">Lobby</button>
    </div>
    <div id="log" style="height: 100px; overflow-y: scroll; border: 1px solid #333; margin-top: 10px; font-family: monospace; font-size: 12px; text-align: left; padding: 5px; background: #000; color: #888;"></div>
`;

app.appendChild(lobbyDiv);
app.appendChild(gameDiv);

// State
let gameManager: ClientGameManager | null = null;
let input: InputManager | null = null;
const storage = new GameStorage();

const PEER_ID_KEY = 'roguewar_peer_id';
function getPersistentPeerId(): string | undefined {
  return localStorage.getItem(PEER_ID_KEY) || undefined;
}
function storePeerId(id: string) {
  localStorage.setItem(PEER_ID_KEY, id);
}

async function initStorage() {
  try {
    await storage.init();
    refreshSavedGames();
  } catch (e) {
    log(`Storage Error: ${e}`);
  }
}
initStorage();

function startGame(transport: Transport) {
  lobbyDiv.style.display = 'none';
  gameDiv.style.display = 'block';

  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  const renderer = new CanvasRenderer(canvas);
  input = new InputManager(); // Enable input

  gameManager = new ClientGameManager(renderer, input, transport);

  // Setup Spawn AI button (only for Host)
  const spawnBtn = document.getElementById('btnSpawnAI') as HTMLButtonElement | null;
  if (spawnBtn && transport instanceof HostTransport) {
    spawnBtn.onclick = () => {
      log('Spawning AI...');

      try {
        const aiId = transport.spawnAI();
        log(`✅ AI Bot spawned: ${aiId}`);
      } catch (error) {
        log(`❌ Spawn failed: ${error}`);
        console.error('AI Spawn Error:', error);
      }
    };
    log('Spawn AI button enabled (Host mode)');
  } else if (spawnBtn) {
    // Hide button for non-hosts
    spawnBtn.style.display = 'none';
    log('Spawn AI button hidden (Peer mode)');
  }

  // Setup Save button (only for Host)
  const saveBtn = document.getElementById('btnSave') as HTMLButtonElement | null;
  if (saveBtn && transport instanceof HostTransport) {
    saveBtn.onclick = async () => {
      log('Saving game...');
      try {
        const logData = transport.engine.getGameLog();
        // Generate a unique save ID for every discrete save point
        logData.meta.saveId = `${logData.meta.gameId}-${Date.now()}`;
        await storage.saveGame(logData);
        log(`✅ GAME SAVED SUCCESS (Turn ${logData.turns.length})`);
        refreshSavedGames();
      } catch (error) {
        log(`❌ Save failed: ${error}`);
      }
    };
  } else if (saveBtn) {
    saveBtn.style.display = 'none';
  }

  // Setup Export button (only for Host)
  const exportBtn = document.getElementById('btnExport') as HTMLButtonElement | null;
  if (exportBtn && transport instanceof HostTransport) {
    exportBtn.onclick = () => {
      const logData = transport.engine.getGameLog();
      const json = storage.exportToJSON(logData);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `roguewar-${logData.meta.gameId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      log('✅ Game exported to JSON');
    };
  } else if (exportBtn) {
    exportBtn.style.display = 'none';
  }

  // Exit button
  const exitBtn = document.getElementById('btnExit') as HTMLButtonElement | null;
  if (exitBtn) {
    exitBtn.onclick = () => {
      if (confirm("Exit to lobby? Unsaved progress will be lost.")) {
        location.reload(); // Simple way to reset state
      }
    };
  }

  requestAnimationFrame(gameLoop);
}

async function refreshSavedGames() {
  const listDiv = document.getElementById('savedGamesList');
  if (!listDiv) return;

  try {
    const games = await storage.listGames();
    if (games.length === 0) {
      listDiv.innerHTML = '<p style="color: #666; text-align: center;">No saved games found.</p>';
      return;
    }

    // Sort by last saved
    games.sort((a, b) => b.meta.lastSaved - a.meta.lastSaved);

    listDiv.innerHTML = games.map(game => `
      <div class="saved-game-item" style="border: 1px solid #333; padding: 10px; margin-bottom: 5px; background: #000; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="color: #fff; font-size: 14px; font-family: monospace;">${game.meta.gameId}</div>
          <div style="color: #666; font-size: 11px;">Turns: ${game.turns.length} | ${new Date(game.meta.lastSaved).toLocaleString()}</div>
        </div>
        <div>
          <button class="btn-load-game" data-id="${game.meta.saveId || game.meta.gameId}" style="padding: 5px 10px; cursor: pointer; background: #1a4a1a; color: white; border: none; border-radius: 3px;">Load</button>
          <button class="btn-verify-game" data-id="${game.meta.saveId || game.meta.gameId}" style="padding: 5px 10px; cursor: pointer; background: #333; color: #aaa; border: none; border-radius: 3px; margin-left: 5px;">Verify</button>
          <button class="btn-delete-game" data-id="${game.meta.saveId || game.meta.gameId}" style="padding: 5px 10px; cursor: pointer; background: #4a1a1a; color: white; border: none; border-radius: 3px; margin-left: 5px;">Delete</button>
        </div>
      </div>
    `).join('');

    // Add click listeners
    listDiv.querySelectorAll('.btn-load-game').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const gameId = (e.target as HTMLButtonElement).dataset.id!;
        await loadAndStartGame(gameId);
      });
    });

    listDiv.querySelectorAll('.btn-verify-game').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const gameId = (e.target as HTMLButtonElement).dataset.id!;
        await verifyGame(gameId);
      });
    });

    listDiv.querySelectorAll('.btn-delete-game').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const gameId = (e.target as HTMLButtonElement).dataset.id!;
        if (confirm(`Delete game ${gameId}?`)) {
          await storage.deleteGame(gameId);
          refreshSavedGames();
        }
      });
    });

  } catch (e) {
    listDiv.innerHTML = `<p style="color: #ff4444; text-align: center;">Error loading games: ${e}</p>`;
  }
}

async function loadAndStartGame(gameId: string) {
  const status = document.getElementById('status')!;
  const modal = document.getElementById('charModal')!;
  const charList = document.getElementById('charList')!;
  status.innerText = `Preparing save: ${gameId}...`;

  log(`Peeking at game: ${gameId}`);

  try {
    const logData = await storage.loadGame(gameId);
    if (!logData) throw new Error("Game not found");

    // Headless Replay to find identities
    const engine = HostEngine.fromLog(logData);
    const identities = engine.getPlayerIdentities();

    if (identities.length === 0) {
      throw new Error("No players found in this save!");
    }

    // If only one player, or user already has matching ID in localStorage, maybe auto-select?
    // But per user request: "select from a set of possible players"

    // Show Selection Modal
    status.innerText = "Awaiting character selection...";
    charList.innerHTML = '';

    return new Promise<void>((resolve) => {
      identities.forEach(ident => {
        const btn = document.createElement('button');
        btn.style.cssText = "padding: 12px; background: #222; border: 1px solid #444; color: #fff; cursor: pointer; text-align: left; transition: all 0.2s;";
        btn.innerHTML = `
                <div style="font-weight: bold; color: #ffd700;">${ident.id}</div>
                <div style="font-size: 11px; color: #666;">Position: ${ident.pos.x}, ${ident.pos.y}</div>
            `;
        btn.onmouseover = () => btn.style.borderColor = '#ffd700';
        btn.onmouseout = () => btn.style.borderColor = '#444';

        btn.onclick = async () => {
          modal.style.display = 'none';
          storeUserId(ident.id);
          // Update the input field in UI
          const inputUserId = document.getElementById('inputUserId') as HTMLInputElement;
          if (inputUserId) inputUserId.value = ident.id;

          await finalizeLoad(gameId, logData, ident.id);
          resolve();
        };
        charList.appendChild(btn);
      });

      const cancelBtn = document.getElementById('btnCancelLoad') as HTMLButtonElement;
      cancelBtn.onclick = () => {
        modal.style.display = 'none';
        status.innerText = "Load cancelled.";
        resolve();
      };

      modal.style.display = 'flex';
    });

  } catch (e) {
    status.innerText = `Error loading: ${e}`;
    log(`Error loading: ${e}`);
  }
}

async function finalizeLoad(_gameId: string, logData: any, selectedUserId: string) {
  const status = document.getElementById('status')!;
  log(`Initializing world with identity: ${selectedUserId}`);
  status.innerText = `Initializing World...`;

  const engine = HostEngine.fromLog(logData);
  const storedPeerId = getPersistentPeerId();
  const transport = new HostTransport(log, engine, storedPeerId);

  log(`Acquiring Peer ID for resumed game...`);
  const hostPeerId = await transport.connect(undefined, selectedUserId);

  if (storedPeerId && hostPeerId !== storedPeerId) {
    log(`✅ Character Reclaimed: ${selectedUserId}`);
  }

  storePeerId(hostPeerId);

  status.innerText = `Resumed! ID: ${hostPeerId}`;
  const info = document.getElementById('gameInfo')!;
  info.innerText = `| HOST (RESUMED): ${hostPeerId} as ${selectedUserId}`;

  startGame(transport);
}

// Import button
document.getElementById('btnImport')?.addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        const logData = storage.importFromJSON(json);
        await storage.saveGame(logData);
        log(`✅ Game imported: ${logData.meta.gameId}`);
        refreshSavedGames();
      } catch (err) {
        log(`❌ Import failed: ${err}`);
      }
    };
    reader.readAsText(file);
  };
  input.click();
});

async function verifyGame(gameId: string) {
  log(`Verifying determinism for ${gameId}...`);
  try {
    const logData = await storage.loadGame(gameId);
    if (!logData) throw new Error("Game not found");

    const replay = new ReplayEngine(logData);
    const isValid = replay.verifyDeterminism();

    if (isValid) {
      log(`✅ Determinism check PASSED for ${gameId}`);
      alert(`✅ Game ${gameId} is deterministic!\nAll turns replayed identically.`);
    } else {
      log(`❌ Determinism check FAILED for ${gameId}`);
      alert(`❌ Game ${gameId} is NOT deterministic!\nReplay mismatch detected.`);
    }
  } catch (err) {
    log(`❌ Verification Error: ${err}`);
  }
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
    const inputUserId = document.getElementById('inputUserId') as HTMLInputElement;
    const userId = inputUserId?.value.trim() || getPersistentUserId();
    storeUserId(userId);

    const storedPeerId = getPersistentPeerId();
    const transport = new HostTransport(log, undefined, storedPeerId);
    log(`Requesting Peer ID` + (storedPeerId ? ` (requested: ${storedPeerId})` : "") + "...");
    const hostPeerId = await transport.connect(undefined, userId);

    status.innerText = `Hosting! ID: ${hostPeerId}`;
    log(`Host ID acquired: ${hostPeerId}`);
    storePeerId(hostPeerId);

    const info = document.getElementById('gameInfo')!;
    info.innerText = `| HOST: ${hostPeerId} (${userId})`;

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
  const inputUserId = document.getElementById('inputUserId') as HTMLInputElement;
  const userId = inputUserId?.value.trim() || getPersistentUserId();
  storeUserId(userId);

  if (!hostId) {
    status.innerText = "Please enter Host ID";
    return;
  }

  status.innerText = "Connecting to " + hostId + "...";
  (document.getElementById('btnHost') as HTMLButtonElement).disabled = true;
  (document.getElementById('btnJoin') as HTMLButtonElement).disabled = true;

  try {
    const transport = new PeerTransport(log);
    const myId = await transport.connect(hostId, userId);

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
window.onerror = function (msg, source, lineno, _colno, error) {
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
