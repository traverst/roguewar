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
import { CORE_CONTENT, ModRegistry } from '@roguewar/rules';
import { ModLoader } from './mods/ModLoader';

console.log("!!! [Main] ROGUEWAR BOOTING !!!");

// DOM Elements
const app = document.querySelector<HTMLDivElement>('#app')!;

async function init() {
  console.log("[Main] Initializing app...");

  const storage = new GameStorage();
  await storage.init();

  const registry = await ModLoader.loadPacks([CORE_CONTENT]);
  const savedLog = await storage.getLatestGame();

  if (savedLog && savedLog.turns.length > 0) {
    showLobby();
  } else {
    showLobby();
  }

  function showLobby() {
    app.innerHTML = `
            <div id="lobby-ui" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; font-family: 'Inter', sans-serif; background: #1a1a1a; color: #eee;">
                <h1>ROGUEWAR P2P</h1>
                <button id="btn-host" style="padding: 1rem 2rem; cursor: pointer;">HOST GAME</button>
            </div>
        `;
    document.querySelector<HTMLButtonElement>('#btn-host')!.onclick = () => startGame(true);
  }

  async function startGame(isHost: boolean) {
    console.log("[Main] startGame called, isHost:", isHost);
    app.innerHTML = '<div id="status">Initializing...</div>';

    let transport: Transport;
    if (isHost) {
      console.log("[Main] Creating HostTransport...");
      transport = new HostTransport(console.log, undefined, undefined);

      console.log("[Main] Calling transport.connect()...");
      await (transport as HostTransport).connect();
    } else {
      transport = new PeerTransport(console.log);
    }

    document.getElementById('status')!.innerText = "Transport Ready. Starting Engine...";

    const canvas = document.createElement('canvas');
    canvas.id = 'game-canvas';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    app.innerHTML = '';
    app.appendChild(canvas);

    console.log("[Main] Creating managers...");
    const renderer = new CanvasRenderer(canvas);
    const input = new InputManager();
    // Correct Constructor: (renderer, input, transport, registry)
    const manager = new ClientGameManager(renderer, input, transport, registry);

    console.log("[Main] Starting Loop...");
    function loop() {
      manager.update();
      requestAnimationFrame(loop);
    }
    loop();

    if (isHost) {
      console.log("[Main] Sending host join action...");
      transport.send({ type: 'identity', userId: 'player-1' });
    }

    console.log("[Main] Game Manager ready.");
  }
}

init().catch(e => {
  console.error("[Main] Init Error:", e);
});
