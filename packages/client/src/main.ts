import './style.css'
import { CanvasRenderer } from './game/render/CanvasRenderer';
import { InputManager } from './game/input/InputManager';
import { ClientGameManager } from './game/managers/ClientGameManager';
import { HostTransport } from './game/net/HostTransport';
import { PeerTransport } from './game/net/PeerTransport';
import { Transport } from './game/net/Transport';
import { GameStorage } from './storage/GameStorage';
import { ReplayEngine } from './replay/ReplayEngine';
import { ReplayControls } from './replay/ReplayControls';
import { HostEngine } from '@roguewar/authority';
import { CORE_CONTENT, GameLog, GameState, EntityType } from '@roguewar/rules';
import { ModLoader } from './mods/ModLoader';
import { MetaGameContext } from './meta/MetaGameContext';
import { campaignManager } from './meta';
import { ProfileUI } from './ui/ProfileUI';
import { CampaignMapUI } from './ui/CampaignMapUI';
import { UnlockNotification } from './ui/UnlockNotification';
import { processRunCompletion } from './meta/runCompletion';

declare global {
  interface Window { isJoinRequested: boolean; triggerJoinUI: () => void; }
}

console.log("!!! [Main] ROGUEWAR BOOTING !!!");

const app = document.querySelector<HTMLDivElement>('#app')!;

async function init() {
  console.log("[Main] Init start...");
  const storage = new GameStorage();
  await storage.init();

  const registry = await ModLoader.loadPacks([CORE_CONTENT]);

  // Initialize meta-game system
  const metaGame = new MetaGameContext();
  await metaGame.init();
  console.log('[Main] Meta-game initialized');

  // User Identity Logic
  let playerName = localStorage.getItem('rw_player_name') || `Player-${Math.floor(Math.random() * 1000)}`;

  function deriveHostId(name: string): string {
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    return `roguewar-${slug}-${randomSuffix}`;
  }

  function resolveTargetId(input: string): string {
    // If it looks like a generated slug (starts with roguewar-) OR a UUID, use as is.
    // Otherwise treat as a Game Name and derive.
    if (input.startsWith('roguewar-') || input.match(/^[0-9a-f-]{36}$/)) {
      return input;
    }
    return deriveHostId(input);
  }

  // Get levels from ContentLibrary (shared localStorage with tools)
  // Check both 'level' and 'dungeon' types since levels may be saved as either
  function getContentLibraryLevels(): { id: string; name: string; data: any; type: string }[] {
    try {
      const libraryJson = localStorage.getItem('roguewar_content_library');
      console.log('[Main] Content library raw:', libraryJson ? 'exists' : 'null');
      if (!libraryJson) return [];

      const library = JSON.parse(libraryJson);
      console.log('[Main] Content library items:', library.length, 'types:', library.map((i: any) => i.type).join(', '));

      // Get both levels and dungeons (dungeons from Dungeon Editor may also be playable)
      return library
        .filter((item: any) => item.type === 'level' || item.type === 'dungeon')
        .map((item: any) => ({ id: item.id, name: item.name, data: item.data, type: item.type }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
    } catch (e) {
      console.error('[Main] Error loading content library:', e);
      return [];
    }
  }

  // Populate the Quick Play level and dungeon lists
  function populateQuickPlayLevels() {
    const container = document.getElementById('quick-play-levels');
    if (!container) return;

    const allContent = getContentLibraryLevels();
    const levels = allContent.filter(item => item.type === 'level');
    const dungeons = allContent.filter(item => item.type === 'dungeon');

    console.log('[Main] Quick Play content - Levels:', levels.length, 'Dungeons:', dungeons.length);

    if (levels.length === 0 && dungeons.length === 0) {
      container.innerHTML = '<div style="color: #666; padding: 2rem; text-align: center;">No levels or dungeons found in library</div>';
      return;
    }

    let html = '';

    // Single Levels Section
    if (levels.length > 0) {
      html += '<div style="margin-bottom: 1rem;"><div style="font-size: 0.9rem; color: #a4f; font-weight: bold; margin-bottom: 0.5rem;">Single Levels:</div><div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">';
      html += levels.map(level => `
        <button class="quick-play-btn" data-level-id="${level.id}" data-type="level" style="
          padding: 0.75rem 1rem;
          background: #2a2a3a;
          color: #fff;
          border: 1px solid #a4f;
          cursor: pointer;
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          min-width: 150px;
        ">
          <span style="font-weight: bold;">${level.name}</span>
          <span style="font-size: 0.75rem; color: #888;">${level.data.width || '?'}x${level.data.height || '?'}</span>
        </button>
      `).join('');
      html += '</div></div>';
    }

    // Multi-Level Dungeons Section
    if (dungeons.length > 0) {
      html += '<div><div style="font-size: 0.9rem; color: #4a6; font-weight: bold; margin-bottom: 0.5rem;">🏰 Multi-Level Dungeons:</div><div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">';
      html += dungeons.map(dungeon => `
        <button class="quick-play-btn" data-level-id="${dungeon.id}" data-type="dungeon" style="
          padding: 0.75rem 1rem;
          background: #2a3a2a;
          color: #fff;
          border: 1px solid #4a6;
          cursor: pointer;
          border-radius: 4px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          min-width: 150px;
        ">
          <span style="font-weight: bold;">${dungeon.name}</span>
          <span style="font-size: 0.75rem; color: #888;">${dungeon.data.levels?.length || '?'} levels</span>
        </button>
      `).join('');
      html += '</div></div>';
    }

    container.innerHTML = html;

    // Add click handlers
    container.querySelectorAll('.quick-play-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const levelId = (btn as HTMLElement).dataset.levelId;
        const type = (btn as HTMLElement).dataset.type;
        if (levelId) startQuickPlay(levelId, type as 'level' | 'dungeon');
      });
    });
  }

  // Start a Quick Play game with a specific level or dungeon
  function startQuickPlay(levelId: string, type: 'level' | 'dungeon' = 'level') {
    const allContent = getContentLibraryLevels();
    const content = allContent.find(l => l.id === levelId);

    if (!content) {
      alert('Level or dungeon not found!');
      return;
    }

    console.log(`[Main] Starting Quick Play ${type}:`, content.name, content.data);

    if (type === 'dungeon') {
      // Start multi-level dungeon
      startDungeonQuickPlay(content);
    } else {
      // Start single level
      startLevelQuickPlay(content);
    }
  }

  // Start Quick Play with a single level
  function startLevelQuickPlay(level: { id: string; name: string; data: any }) {
    console.log('[Main] Starting Quick Play with level:', level.name, level.data);

    // Convert level data to a proper dungeon format
    const levelData = level.data;

    // Get spawn point from level data - NEVER do random placement
    // Use level's playerSpawn if defined, otherwise default to (5,5)
    let spawnX = 5, spawnY = 5;

    if (levelData.playerSpawn && typeof levelData.playerSpawn.x === 'number') {
      spawnX = levelData.playerSpawn.x;
      spawnY = levelData.playerSpawn.y;
      console.log(`[Main] Using level playerSpawn: ${spawnX}, ${spawnY}`);
    } else {
      console.log(`[Main] No playerSpawn defined, using default: ${spawnX}, ${spawnY}`);
    }

    // Create engine config from level data
    const config = {
      rngSeed: Date.now(),
      dungeonSeed: Date.now(),
      players: [],
      customLevel: levelData
    };

    // Create engine
    const engine = new HostEngine(config.dungeonSeed, config, registry, `Quick Play: ${level.name}`);

    // Override the dungeon with the level's tiles
    // IMPORTANT: Must access engine's internal state directly - getState() returns a clone!
    try {
      if (levelData.tiles && levelData.tiles.length > 0) {
        const state = (engine as any).state; // Access internal state directly

        // Inject the level's tiles
        state.dungeon = levelData.tiles.map((row: any[]) =>
          row.map(tileType => ({ type: tileType, seen: false }))
        );

        // Load items from level onto ground
        if (levelData.items && levelData.items.length > 0) {
          state.groundItems = levelData.items.map((item: any) => ({
            id: item.id,
            name: item.name,
            icon: item.icon || '🎁',
            x: item.x,
            y: item.y
          }));
          console.log(`[Main] Loaded ${state.groundItems.length} items onto ground`);
        } else {
          state.groundItems = [];
        }

        // Update dimensions
        state.maxLevels = 1;
        state.currentLevel = 0;

        // Clear existing entities - player will spawn when they join
        state.entities = [];

        console.log(`[Main] Level tiles injected into engine, player will spawn at ${spawnX}, ${spawnY}`);
      }
    } catch (e) {
      console.warn('[Main] Could not inject custom level tiles:', e);
    }

    // Store spawn point for use in join action
    (window as any)._quickPlaySpawnHint = { x: spawnX, y: spawnY };

    startGame(true, undefined, playerName, engine, `Quick Play: ${level.name}`);
  }

  //  Start Quick Play with a multi-level dungeon
  function startDungeonQuickPlay(dungeon: { id: string; name: string; data: any }) {
    console.log('[Main] Starting Quick Play with dungeon:', dungeon.name, dungeon.data);

    const dungeonData = dungeon.data;

    // Load all levels from the library
    const allContent = getContentLibraryLevels();
    const dungeonLevels: any[] = [];
    const stairPositions: any = {};

    // Load each level in the dungeon
    if (!dungeonData.levels || dungeonData.levels.length === 0) {
      alert('This dungeon has no levels!');
      return;
    }

    for (let i = 0; i < dungeonData.levels.length; i++) {
      const levelRef = dungeonData.levels[i];
      const levelData = allContent.find(l => l.id === levelRef.levelId);

      if (!levelData) {
        console.warn(`[Main] Level ${levelRef.levelId} not found in library, skipping`);
        continue;
      }

      // Convert level tiles to dungeon format
      const tiles = levelData.data.tiles.map((row: any[]) =>
        row.map((tileType: string) => ({ type: tileType, seen: false }))
      );

      dungeonLevels.push(tiles);

      // CRITICAL: Scan tiles to find stair positions (Level Editor doesn't save these separately)
      let stairsUp: { x: number; y: number } | undefined;
      let stairsDown: { x: number; y: number } | undefined;
      let exit: { x: number; y: number } | undefined;

      for (let y = 0; y < levelData.data.tiles.length; y++) {
        for (let x = 0; x < levelData.data.tiles[y].length; x++) {
          const tileType = levelData.data.tiles[y][x];
          if (tileType === 'stairs_up') stairsUp = { x, y };
          if (tileType === 'stairs_down') stairsDown = { x, y };
          if (tileType === 'exit') exit = { x, y };
        }
      }

      stairPositions[i] = { up: stairsUp, down: stairsDown, exit };

      console.log(`[Main] Loaded level ${i}: ${levelData.name}, stairs:`, stairPositions[i]);
    }

    if (dungeonLevels.length === 0) {
      alert('No valid levels found in this dungeon!');
      return;
    }

    // Get spawn point from first level
    const firstLevelRef = dungeonData.levels[0];
    const firstLevelData = allContent.find(l => l.id === firstLevelRef.levelId);

    let spawnX = 5, spawnY = 5;
    if (firstLevelData?.data?.playerSpawn) {
      spawnX = firstLevelData.data.playerSpawn.x;
      spawnY = firstLevelData.data.playerSpawn.y;
      console.log(`[Main] Using first level's playerSpawn: (${spawnX}, ${spawnY})`);
    } else {
      console.warn(`[Main] No playerSpawn in first level! Using default (${spawnX}, ${spawnY})`);
    }

    // Create engine config
    const config = {
      rngSeed: Date.now(),
      dungeonSeed: Date.now(),
      players: []
    };

    // Create engine
    const engine = new HostEngine(config.dungeonSeed, config, registry, `Quick Play: ${dungeon.name}`);

    // CRITICAL: Access the engine's ACTUAL internal state, not the clone from getState()
    // getState() returns JSON.parse(JSON.stringify(this.state)) which is a CLONE
    const state = (engine as any).state;

    // Determine starting level - Dungeon Editor uses 0-based indexing, so level 0 is first level
    const startLevel = 0;  // Always start at first level for Quick Play
    console.log(`[Main] Starting Quick Play at level ${startLevel} of ${dungeonLevels.length} total levels`);

    // Set up the dungeon at the starting level
    state.dungeon = dungeonLevels[startLevel];
    state.groundItems = state.groundItems || [];
    state.maxLevels = dungeonLevels.length;
    state.currentLevel = startLevel;
    // DON'T clear entities - the engine already spawned monsters in createInitialState()
    // state.entities = [];  // REMOVED - would delete all monsters!

    // CRITICAL: Set the multiLevelDungeon property on the engine so handleStairsAction works
    const multiLevelDungeon = {
      levels: dungeonLevels,
      stairPositions: stairPositions
    };

    // Access the private property via type assertion
    (engine as any).multiLevelDungeon = multiLevelDungeon;

    console.log(`[Main] Dungeon loaded: ${dungeonLevels.length} levels, starting at level ${startLevel}`);
    console.log('[Main] multiLevelDungeon set on engine for stair navigation');
    console.log('[Main] Stair positions:', stairPositions);
    console.log(`[Main] Player will spawn at: (${spawnX}, ${spawnY})`);

    // Store spawn point - will be used to reposition player after join
    (window as any)._quickPlayDungeonSpawn = { x: spawnX, y: spawnY };

    startGame(true, undefined, playerName, engine, `Quick Play: ${dungeon.name}`);
  }

  showLobby();

  async function showLobby() {
    const games = await storage.listGames();
    const profile = metaGame.getProfile();

    app.innerHTML = `
            <!-- TOP-LEVEL NAVIGATION -->
            <nav id="top-nav" style="position: fixed; top: 0; left: 0; right: 0; z-index: 1000; background: #0a0a0a; border-bottom: 2px solid #333; display: flex; align-items: center; padding: 0 1rem; height: 50px;">
                <div style="font-weight: bold; color: #888; margin-right: 2rem;">⚔️ ROGUEWAR</div>
                <button class="top-nav-btn active" data-section="game" style="padding: 0.75rem 1.5rem; background: #2a2a3a; color: #fff; border: none; border-bottom: 3px solid #46a; cursor: pointer; font-weight: bold; margin-right: 0.5rem;">🎮 Game</button>
                <button class="top-nav-btn" data-section="editors" style="padding: 0.75rem 1.5rem; background: #1a1a2a; color: #888; border: none; border-bottom: 3px solid transparent; cursor: pointer; font-weight: bold;">🛠️ Editors</button>
            </nav>
            
            <!-- GAME SECTION -->
            <div id="section-game" class="main-section" style="display: block; margin-top: 50px;">
                <div id="lobby-ui" style="font-family: 'Inter', sans-serif; background: #121212; color: #eee; padding: 2rem; box-sizing: border-box; overflow-y: auto; height: calc(100vh - 50px); max-height: calc(100vh - 50px);">
                <h1 style="font-size: 3rem; margin-bottom: 2rem; text-align: center; background: linear-gradient(135deg, #fff 0%, #888 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">ROGUEWAR P2P</h1>
                
                <!-- TWO COLUMN LAYOUT -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; max-width: 1400px; margin: 0 auto;">
                    
                    <!-- LEFT COLUMN: Profile & Saved Games -->
                    <div style="display: flex; flex-direction: column; gap: 2rem;">
                        
                        <!-- META-GAME HEADER -->
                        <div style="background: #1e1e1e; padding: 1rem; border-radius: 8px; border: 1px solid #46a; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="font-size: 0.9rem; color: #888;">Welcome back,</div>
                                <div style="font-size: 1.3rem; font-weight: bold; color: #46a;">${profile.displayName}</div>
                            </div>
                            <div style="display: flex; gap: 0.5rem;">
                                <button id="btn-view-profile" style="padding: 0.6rem 1rem; background: #2a2a3a; color: #8af; border: 1px solid #46a; cursor: pointer; border-radius: 4px;">📊 Profile</button>
                                <button id="btn-campaigns" style="padding: 0.6rem 1rem; background: #2a3a2a; color: #4f6; border: 1px solid #4a6; cursor: pointer; border-radius: 4px;">🗺️ Campaigns</button>
                            </div>
                        </div>
                        
                        <!-- USER PROFILE -->
                        <div style="background: #1e1e1e; padding: 1.5rem; border-radius: 8px; border: 1px solid #333;">
                            <h3 style="margin-top: 0; color: #aaa;">USER IDENTITY</h3>
                            <div style="display: flex; gap: 1rem;">
                                <input type="text" id="input-player-name" value="${playerName}" placeholder="Enter your name..." style="flex: 1; padding: 0.75rem; background: #2a2a2a; border: 1px solid #444; color: #fff; border-radius: 4px;">
                                <button id="btn-save-name" style="padding: 0.75rem 1.5rem; background: #3a3a3a; color: #fff; border: none; cursor: pointer; border-radius: 4px;">Save Name</button>
                            </div>
                        </div>

                        <!-- SAVED GAMES -->
                        <div style="background: #1e1e1e; padding: 1.5rem; border-radius: 8px; border: 1px solid #333;">
                            <h3 style="margin-top: 0; color: #a64;">SAVED GAMES / REPLAYS</h3>
                            <div id="games-list" style="max-height: 300px; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 1rem;">
                                ${games.length === 0 ? '<div style="color: #666; padding: 2rem; text-align: center;">No saved games found</div>' : ''}
                            </div>
                            <div style="border-top: 1px solid #333; padding-top: 1rem; display: flex; justify-content: space-between; align-items: center;">
                                <button id="btn-upload-trigger" style="padding: 0.5rem 1rem; background: #3a2a2a; color: #fff; border: 1px solid #a64; cursor: pointer; border-radius: 4px;">UPLOAD REPLAY JSON</button>
                                <input type="file" id="file-upload" style="display: none;" accept=".json">
                                <button id="btn-clear-all" style="padding: 0.5rem 1rem; border: none; background: transparent; color: #666; cursor: pointer;">Clear All Data</button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- RIGHT COLUMN: Actions -->
                    <div style="display: flex; flex-direction: column; gap: 2rem;">
                        
                        <!-- HOST -->
                        <div style="background: #1e1e1e; padding: 1.5rem; border-radius: 8px; border: 1px solid #333; display: flex; flex-direction: column; gap: 1rem;">
                            <h3 style="margin-top: 0; color: #4a6;">HOST GAME</h3>
                            <input type="text" id="input-game-name" placeholder="Game Name (Optional)" style="padding: 0.5rem; background: #2a2a2a; border: 1px solid #444; color: #fff;">
                            <button id="btn-host" style="padding: 1rem; background: #2a3a2a; color: #fff; border: 1px solid #4a6; cursor: pointer; border-radius: 4px; font-weight: bold;">START HOSTING</button>
                        </div>

                        <!-- JOIN / SPECTATE -->
                        <div style="background: #1e1e1e; padding: 1.5rem; border-radius: 8px; border: 1px solid #333; display: flex; flex-direction: column; gap: 1rem;">
                            <h3 style="margin-top: 0; color: #46a;">JOIN / SPECTATE</h3>
                            <input type="text" id="input-host-id" placeholder="Game Name / Host ID" style="padding: 0.5rem; background: #2a2a2a; border: 1px solid #444; color: #fff;">
                            <div style="display: flex; gap: 0.5rem;">
                                <button id="btn-join" style="flex: 1; padding: 1rem; background: #2a2a3a; color: #fff; border: 1px solid #46a; cursor: pointer; border-radius: 4px; font-weight: bold;">JOIN</button>
                                <button id="btn-spectate" style="flex: 1; padding: 1rem; background: #1a1a2a; color: #8af; border: 1px solid #346; cursor: pointer; border-radius: 4px; font-weight: bold;">SPECTATE</button>
                            </div>
                        </div>
                        
                        <!-- QUICK PLAY - Test Levels from Editor -->
                        <div style="background: #1e1e1e; padding: 1.5rem; border-radius: 8px; border: 1px solid #a4f;">
                            <h3 style="margin-top: 0; color: #a4f;">⚡ QUICK PLAY - Test Your Levels</h3>
                            <div style="color: #888; font-size: 0.9rem; margin-bottom: 1rem;">Play levels created in the Level Editor</div>
                            <div id="quick-play-levels" style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem;">
                                <div style="color: #666; padding: 1rem; text-align: center; width: 100%;">Loading levels...</div>
                            </div>
                            <div style="font-size: 0.8rem; color: #666; border-top: 1px solid #333; padding-top: 0.5rem;">
                                💡 Create levels in the <a href="/tools/level-editor.html" style="color: #a4f;" target="_blank">Level Editor</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            </div>
            
            <!-- EDITORS SECTION -->
            <div id="section-editors" class="main-section" style="display: none; margin-top: 50px; height: calc(100vh - 50px); overflow-y: auto;">
                <div id="editors-root" style="height: 100%;"></div>
            </div>
        `;

    // TAB SWITCHING LOGIC
    let editorsInitialized = false;
    document.querySelectorAll('.top-nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const section = (e.target as HTMLButtonElement).dataset.section;
        if (!section) return;

        // Update active button state
        document.querySelectorAll('.top-nav-btn').forEach(b => {
          const isActive = b.getAttribute('data-section') === section;
          (b as HTMLElement).style.background = isActive ? '#2a2a3a' : '#1a1a2a';
          (b as HTMLElement).style.color = isActive ? '#fff' : '#888';
          (b as HTMLElement).style.borderBottom = isActive ? '3px solid #46a' : '3px solid transparent';
        });

        // Show/hide sections
        document.getElementById('section-game')!.style.display = section === 'game' ? 'block' : 'none';
        document.getElementById('section-editors')!.style.display = section === 'editors' ? 'block' : 'none';

        // Initialize editors lazily on first switch
        if (section === 'editors' && !editorsInitialized) {
          editorsInitialized = true;
          import('./editors/EditorsApp').then(module => {
            new module.EditorsApp(document.getElementById('editors-root')!);
          });
        }
      });
    });

    // Populate Quick Play levels
    populateQuickPlayLevels();

    // SAVED GAMES POPULATION
    const gamesList = app.querySelector('#games-list')!;
    games.sort((a, b) => (b.meta.lastSaved || 0) - (a.meta.lastSaved || 0)).forEach(log => {
      const div = document.createElement('div');
      div.style.cssText = "display: flex; align-items: center; justify-content: space-between; background: #252525; padding: 1rem; border-radius: 4px; border-left: 4px solid #a64;";

      const date = new Date(log.meta.lastSaved).toLocaleString();
      div.innerHTML = `
                <div style="flex: 1;">
                    <div style="font-weight: bold; color: #fff;">${log.meta.gameName || 'Unnamed Game'}</div>
                    <div style="font-size: 0.8rem; color: #888;">Turns: ${log.turns.length} | Last Saved: ${date}</div>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button class="btn-resume" style="padding: 0.5rem 1rem; background: #2a3a2a; color: #fff; border: none; cursor: pointer; border-radius: 4px;">RESUME</button>
                    <button class="btn-view" style="padding: 0.5rem 1rem; background: #2a2a2a; color: #8af; border: 1px solid #346; cursor: pointer; border-radius: 4px;">REPLAY</button>
                    <button class="btn-export" style="padding: 0.5rem; background: #1e1e1e; border: 1px solid #444; color: #888; cursor: pointer; border-radius: 4px;">⬇️</button>
                    <button class="btn-delete" style="padding: 0.5rem; background: #3a2a2a; border: none; color: #a44; cursor: pointer; border-radius: 4px;">🗑️</button>
                </div>
            `;

      (div.querySelector('.btn-resume') as HTMLElement).onclick = () => showReclaimUI(log);
      (div.querySelector('.btn-view') as HTMLElement).onclick = () => startReplay(log);
      (div.querySelector('.btn-export') as HTMLElement).onclick = () => {
        const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `roguewar_replay_${log.meta.gameName || log.meta.gameId}.json`;
        a.click();
      };
      (div.querySelector('.btn-delete') as HTMLElement).onclick = async () => {
        if (confirm(`Delete ${log.meta.gameName || 'this game'}?`)) {
          await storage.deleteGame(log.meta.gameId);
          showLobby();
        }
      };
      gamesList.appendChild(div);
    });

    // ACTIONS
    (app.querySelector('#btn-save-name') as HTMLElement).onclick = () => {
      const nameInput = app.querySelector<HTMLInputElement>('#input-player-name')!;
      playerName = nameInput.value || playerName;
      localStorage.setItem('rw_player_name', playerName);
      alert("Name saved!");
    };

    // Meta-game buttons
    (app.querySelector('#btn-view-profile') as HTMLElement).onclick = () => {
      ProfileUI.show(profile, app, showLobby);
    };

    (app.querySelector('#btn-campaigns') as HTMLElement).onclick = () => {
      // Load campaigns directly from content library (getContentLibraryLevels only gets levels/dungeons)
      const libraryJson = localStorage.getItem('roguewar_content_library');
      const library = libraryJson ? JSON.parse(libraryJson) : [];
      const campaigns = library
        .filter((item: any) => item.type === 'campaign')
        .map((item: any) => item.data);

      console.log('[Main] Loaded campaigns from library:', campaigns.length, campaigns);

      if (campaigns.length === 0) {
        alert('No campaigns available! Create one in the Campaign Editor.');
        return;
      }

      // Show first campaign (or let user choose if multiple)
      const campaign = campaigns[0];

      // Initialize campaign progress if needed
      if (!profile.campaignProgress[campaign.id]) {
        // Create progress structure directly for library campaigns
        const nodeProgress: any = {};
        if (campaign.nodes) {
          campaign.nodes.forEach((node: any) => {
            nodeProgress[node.id] = { completed: false, unlocked: node.id === campaign.startNodeId };
          });
        }
        profile.campaignProgress[campaign.id] = {
          currentNodeId: campaign.startNodeId || (campaign.nodes?.[0]?.id),
          completedNodes: [],
          unlockedNodes: [campaign.startNodeId || campaign.nodes?.[0]?.id]
        };
        metaGame.saveProfile();
        console.log('[Main] Initialized campaign progress:', profile.campaignProgress[campaign.id]);
      }

      CampaignMapUI.show(campaign, profile, app, (nodeId) => {
        // Get node from the campaign data itself, not from campaignManager
        const node = campaign.nodes?.find((n: any) => n.id === nodeId);
        if (!node) {
          console.error(`[Main] Node ${nodeId} not found in campaign`);
          return;
        }

        console.log('[Main] Starting campaign node:', node);

        // Library campaigns use dungeonId to reference a dungeon in the library
        // Load the dungeon data from the library
        const libraryJson = localStorage.getItem('roguewar_content_library');
        const library = libraryJson ? JSON.parse(libraryJson) : [];
        const dungeonItem = library.find((item: any) => item.id === node.dungeonId);

        if (!dungeonItem) {
          alert(`Dungeon "${node.dungeonId}" not found in library! Create it in the Dungeon Editor first.`);
          return;
        }

        console.log('[Main] Found dungeon for node:', dungeonItem.name, dungeonItem.data);

        // Create a config for the engine - now using dungeon from library
        const config = {
          rngSeed: Date.now(),
          dungeonSeed: Date.now(),
          players: [],
          customDungeon: dungeonItem.data
        };

        // Create a special engine for this campaign node with campaign context
        const campaignContext = {
          campaignId: campaign.id,
          nodeId: nodeId
        };
        const nodeName = node.displayName || node.name || nodeId;
        const engine = new HostEngine(config.dungeonSeed, config, registry, `${campaign.name}: ${nodeName}`, campaignContext);

        // Load dungeon levels into the engine (similar to Quick Play dungeon)
        const dungeonData = dungeonItem.data;
        const allContent = getContentLibraryLevels();

        if (dungeonData.levels && dungeonData.levels.length > 0) {
          const dungeonLevels: any[] = [];
          const stairPositions: any = {};

          for (let i = 0; i < dungeonData.levels.length; i++) {
            const levelRef = dungeonData.levels[i];
            const levelData = allContent.find(l => l.id === levelRef.levelId);

            if (!levelData) {
              console.warn(`[Main] Level ${levelRef.levelId} not found`);
              continue;
            }

            const tiles = levelData.data.tiles.map((row: any[]) =>
              row.map((tileType: string) => ({ type: tileType, seen: false }))
            );
            dungeonLevels.push(tiles);

            // Scan for stair positions
            let stairsUp: any, stairsDown: any, exit: any;
            for (let y = 0; y < levelData.data.tiles.length; y++) {
              for (let x = 0; x < levelData.data.tiles[y].length; x++) {
                const tileType = levelData.data.tiles[y][x];
                if (tileType === 'stairs_up') stairsUp = { x, y };
                if (tileType === 'stairs_down') stairsDown = { x, y };
                if (tileType === 'exit') exit = { x, y };
              }
            }
            stairPositions[i] = { up: stairsUp, down: stairsDown, exit };
          }

          if (dungeonLevels.length > 0) {
            const state = (engine as any).state;
            state.dungeon = dungeonLevels[0];
            state.groundItems = state.groundItems || [];
            state.maxLevels = dungeonLevels.length;
            state.currentLevel = 0;

            (engine as any).multiLevelDungeon = {
              levels: dungeonLevels,
              stairPositions: stairPositions
            };

            // Get spawn from first level
            const firstLevelRef = dungeonData.levels[0];
            const firstLevelData = allContent.find(l => l.id === firstLevelRef.levelId);
            if (firstLevelData?.data?.playerSpawn) {
              (window as any)._quickPlayDungeonSpawn = firstLevelData.data.playerSpawn;
            }
          }
        }

        startGame(true, undefined, playerName, engine, `${campaign.name}: ${nodeName}`);

      }, showLobby);
    };


    (app.querySelector('#btn-host') as HTMLElement).onclick = () => {
      const gameName = app.querySelector<HTMLInputElement>('#input-game-name')!.value;
      // Clear campaign context for freeplay
      (window as any).currentCampaignContext = null;
      startGame(true, undefined, playerName, undefined, gameName);
    };

    (app.querySelector('#btn-join') as HTMLElement).onclick = () => {
      const input = app.querySelector<HTMLInputElement>('#input-host-id')!.value;
      if (input) connectToSession(resolveTargetId(input), 'join');
      else alert("Please enter a Game Name or Host ID");
    };

    (app.querySelector('#btn-spectate') as HTMLElement).onclick = () => {
      const input = app.querySelector<HTMLInputElement>('#input-host-id')!.value;
      if (input) connectToSession(resolveTargetId(input), 'spectate');
      else alert("Please enter a Game Name or Host ID");
    };

    (app.querySelector('#btn-upload-trigger') as HTMLElement).onclick = () => {
      app.querySelector<HTMLInputElement>('#file-upload')!.click();
    };

    app.querySelector<HTMLInputElement>('#file-upload')!.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const log = JSON.parse(ev.target?.result as string) as GameLog;
          if (log.meta && log.turns) startReplay(log);
          else alert("Invalid Replay File");
        } catch (err) {
          alert("Error parsing JSON: " + err);
        }
      };
      reader.readAsText(file);
    };

    (app.querySelector('#btn-clear-all') as HTMLElement).onclick = async () => {
      if (confirm("Clear ALL saved games?")) {
        await storage.clearAll();
        showLobby();
      }
    };
  }

  function showReclaimUI(log: GameLog) {
    const tempEngine = HostEngine.fromLog(log, registry);
    const playerEntities = tempEngine.getPlayerIdentities();
    const gameName = log.meta.gameName || 'Unnamed Game';

    app.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; font-family: 'Inter', sans-serif; background: #1a1a1a; color: #eee; padding: 2rem;">
                <h1>RECLAIM IDENTITY</h1>
                <p style="color: #888; margin-bottom: 2rem;">Select your previous character in <b>${gameName}</b></p>
                <div id="identity-list" style="display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center;"></div>
                <button id="btn-back" style="margin-top: 3rem; padding: 0.75rem 1.5rem; background: #333; border: none; color: #fff; cursor: pointer; border-radius: 4px;">Back to Lobby</button>
            </div>
        `;

    const list = document.querySelector<HTMLDivElement>('#identity-list')!;
    playerEntities.forEach(p => {
      const btn = document.createElement('button');
      btn.innerHTML = `<strong>${p.id}</strong><br><span style="font-size: 0.8rem; color: #888;">Pos: ${p.pos.x}, ${p.pos.y}</span>`;
      btn.style.cssText = "padding: 1.5rem; cursor: pointer; background: #2a2a2a; color: #fff; border: 2px solid #444; border-radius: 8px; min-width: 150px; text-align: center;";
      btn.onclick = () => startGame(true, undefined, p.id, tempEngine, gameName);
      list.appendChild(btn);
    });

    document.querySelector<HTMLButtonElement>('#btn-back')!.onclick = () => showLobby();
  }

  async function startReplay(log: GameLog) {
    app.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.id = 'game-canvas';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    app.appendChild(canvas);

    const renderer = new CanvasRenderer(canvas);
    const engine = new ReplayEngine(log, registry);

    new ReplayControls(app, log.turns.length, (turn) => {
      const state = engine.seekTo(turn);
      renderer.render(state);
    });

    renderer.render(engine.seekTo(0));
  }

  function createCharacterSelectUI(state: GameState, connectedIds: string[], game: ClientGameManager, hostId: string) {
    const existingOverlay = document.getElementById('char-select-overlay');
    if (existingOverlay) existingOverlay.remove();

    const overlay = document.createElement('div');
    overlay.id = 'char-select-overlay';
    overlay.style.cssText = "position: absolute; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center; z-index: 2000; font-family: 'Inter', sans-serif;";

    const panel = document.createElement('div');
    panel.style.cssText = "background: #1e1e1e; padding: 2rem; border-radius: 8px; border: 1px solid #46a; max-width: 600px; width: 100%; color: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.5);";

    panel.innerHTML = `
            <h2 style="margin-top:0; color: #46a;">Choose Your Character</h2>
            <div style="margin-bottom: 1rem; color: #aaa;">Reclaim a disconnected hero or start fresh.</div>
            <div id="char-list" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 300px; overflow-y: auto; margin-bottom: 2rem; padding-right: 5px;"></div>
            <div style="border-top: 1px solid #333; padding-top: 1rem; text-align: right; display: flex; justify-content: flex-end; gap: 1rem;">
                 <button id="btn-cancel-join" style="padding: 0.8rem 1.5rem; background: transparent; color: #888; border: 1px solid #444; cursor: pointer; border-radius: 4px;">Cancel</button>
                 <button id="btn-spawn-new" style="padding: 0.8rem 1.5rem; background: #2a3a2a; color: #4f6; border: 1px solid #4f6; cursor: pointer; border-radius: 4px; font-weight: bold;">SPAWN NEW HERO</button>
            </div>
        `;

    const list = panel.querySelector('#char-list')!;

    // Find all player entities
    const potentialReclaims = state.entities.filter((e: any) => e.type === EntityType.Player);

    if (potentialReclaims.length === 0) {
      list.innerHTML = '<div style="padding: 1rem; color: #666; font-style: italic;">No existing heroes found on this map.</div>';
    }

    potentialReclaims.forEach((entity: any) => {
      const isOnline = connectedIds.includes(entity.id);
      const item = document.createElement('div');
      item.style.cssText = `display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: #252525; border-radius: 4px; border: 1px solid ${isOnline ? '#a33' : '#4a6'}; opacity: ${isOnline ? '0.6' : '1'};`;

      item.innerHTML = `
                <div>
                    <div style="font-weight: bold; color: ${isOnline ? '#a33' : '#4f6'};">${entity.id} ${isOnline ? '(Online)' : '(Offline)'}</div>
                    <div style="font-size: 0.8rem; color: #888;">HP: ${entity.hp}/${entity.maxHp} | Pos: ${entity.pos.x},${entity.pos.y}</div>
                </div>
                ${!isOnline ? `<button class="btn-claim" style="padding: 0.5rem 1rem; background: #2a3a4a; color: #fff; border: 1px solid #46a; cursor: pointer; border-radius: 4px;">RECLAIM</button>` : `<span style="color: #a33; font-size: 0.8rem;">TAKEN</span>`}
            `;

      if (!isOnline) {
        (item.querySelector('.btn-claim') as HTMLElement).onclick = () => {
          game.claimIdentity(entity.id);
          overlay.remove();
          // Update HUD manually or let state update do it? HUD tracks persistentId.
          // We need to re-create HUD because user ID changed.
          const hud = document.getElementById('game-hud');
          if (hud) hud.remove();
          createHUD("Player", hostId, entity.id);
        };
      }
      list.appendChild(item);
    });

    (panel.querySelector('#btn-spawn-new') as HTMLElement).onclick = () => {
      const newId = playerName;
      game.claimIdentity(newId);
      overlay.remove();
      const hud = document.getElementById('game-hud');
      if (hud) hud.remove();
      createHUD("Player", hostId, newId);
    };

    (panel.querySelector('#btn-cancel-join') as HTMLElement).onclick = () => {
      overlay.remove();
      // Stay as spectator
    };

    overlay.appendChild(panel);
    app.appendChild(overlay);
  }

  // Consolidated connection function for Join and Spectate
  async function connectToSession(targetId: string, mode: 'spectate' | 'join') {
    app.innerHTML = '<div id="status">Connecting...</div>';
    const transport = new PeerTransport(console.log);
    try {
      await transport.spectate(targetId);
    } catch (e) {
      alert("Failed to connect: " + e);
      window.location.reload();
      return;
    }

    app.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.id = 'game-canvas';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    app.appendChild(canvas);

    // Initial HUD
    createHUD("Spectator", targetId);

    const renderer = new CanvasRenderer(canvas);
    const input = new InputManager();
    const manager = new ClientGameManager(renderer, input, transport, registry);

    // Expose for debugging
    (window as any).manager = manager;

    // Create spectator controls if in spectator mode
    let updatePlayerList: (() => void) | null = null;

    if (mode === 'spectate') {
      const spectatorPanel = document.createElement('div');
      spectatorPanel.id = 'spectator-panel';
      spectatorPanel.style.cssText = "position: absolute; top: 80px; left: 10px; background: rgba(0,0,0,0.7); color: #fff; padding: 10px; border-radius: 8px; font-family: 'Inter', sans-serif; z-index: 1000; max-width: 200px;";
      spectatorPanel.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 8px; color: #8af;">Spectating</div>
        <div id="player-list" style="display: flex; flex-direction: column; gap: 4px;"></div>
      `;
      app.appendChild(spectatorPanel);

      // Update player list when state changes
      updatePlayerList = () => {
        const playerListDiv = document.getElementById('player-list');
        if (!playerListDiv || !manager.authoritativeState) return;

        const players = manager.authoritativeState.entities.filter((e: any) => e.type === EntityType.Player);
        playerListDiv.innerHTML = players.map((p: any) => {
          const isCurrent = manager.localPlayerId === p.id;
          return `<button class="spectate-player" data-player="${p.id}" style="padding: 4px 8px; background: ${isCurrent ? '#46a' : '#333'}; border: 1px solid ${isCurrent ? '#8af' : '#555'}; color: #fff; cursor: pointer; border-radius: 4px; text-align: left;">${p.id}</button>`;
        }).join('');

        // Add click handlers
        playerListDiv.querySelectorAll('.spectate-player').forEach(btn => {
          btn.addEventListener('click', () => {
            const playerId = (btn as HTMLElement).dataset.player;
            if (playerId) {
              console.log(`[Spectator] Switching view to ${playerId}`);
              // Switch spectator focus by updating localPlayerId
              manager.localPlayerId = playerId;
              updatePlayerList!();
            }
          });
        });
      };
    }

    // Common logic to trigger UI
    const triggerJoinUI = () => {
      if (manager.authoritativeState) {
        const myName = playerName;
        const isTaken = manager.connectedEntityIds.includes(myName);
        const manualRequest = window.isJoinRequested;

        // Reset flag
        window.isJoinRequested = false;

        if (!manualRequest && !isTaken) {
          console.log(`[Main] Auto-Joining as ${myName}`);
          manager.claimIdentity(myName);
          // Update HUD immediately to show intent
          const hud = document.getElementById('game-hud');
          if (hud) hud.remove();
          createHUD("Player", targetId, myName);
        } else {
          createCharacterSelectUI(manager.authoritativeState, manager.connectedEntityIds, manager, targetId);
        }
      }
    };

    // Combined state change handler
    manager.onGameStateChanged = (state, connectedIds) => {
      // Update spectator list if in spectate mode
      if (updatePlayerList) {
        updatePlayerList();
      }

      // Handle join mode logic
      const hud = document.getElementById('game-hud');
      const isSpectator = hud && hud.innerText.includes('Role: Spectator');
      const noOverlay = !document.getElementById('char-select-overlay');

      if ((mode === 'join' || window.isJoinRequested) && isSpectator && noOverlay) {
        triggerJoinUI();
      }
    };

    // Handle race condition: if state arrived before callback set
    if (manager.authoritativeState && mode === 'join') {
      triggerJoinUI();
    }

    function loop() {
      manager.update();
      requestAnimationFrame(loop);
    }
    loop();

    // Share manager globally for HUD button? Or just improve createHUD to take a callback?
    // Let's attach the join trigger to the window or app for the HUD to find, 
    // or better: pass it to createHUD.
    (window as any).triggerJoinUI = () => {
      window.isJoinRequested = true;
      triggerJoinUI();
    };
  }

  // (Removed helper type def that was here)

  async function startGame(isHost: boolean, connectToId?: string, persistentId?: string, resumeEngine?: HostEngine, gameName?: string) {
    app.innerHTML = '<div id="status">Initializing...</div>';

    let transport: Transport;
    let currentHostId = connectToId; // Default to target if joining

    if (isHost) {
      const requestedId = gameName ? deriveHostId(gameName) : undefined;
      transport = new HostTransport(console.log, resumeEngine, requestedId, registry, gameName);
      // AUTO-SAVE LOG FOR HOST
      (transport as HostTransport).setLogUpdateCallback((log) => {
        storage.saveGame(log);
      });

      // For Host, connect returns the Host ID
      try {
        currentHostId = await (transport as HostTransport).connect(undefined, persistentId);
      } catch (e) {
        console.error("Host Connection Failed", e);
        alert("Failed to start host (ID might be taken?): " + e);
        window.location.reload();
        return;
      }
    } else {
      transport = new PeerTransport(console.log);
    }

    app.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.id = 'game-canvas';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    app.appendChild(canvas);

    const renderer = new CanvasRenderer(canvas);
    const input = new InputManager();
    const manager = new ClientGameManager(renderer, input, transport, registry);

    // Expose for debugging
    (window as any).manager = manager;

    // Handle game end (victory/defeat)
    manager.onGameEnd = async (outcome) => {
      console.log(`[Main] Game ended with outcome: ${outcome}`);

      // Get the game log from host
      const gameLog = isHost
        ? (transport as HostTransport).engine.getGameLog()
        : null;

      if (gameLog) {
        // Save the game log
        await storage.saveGame(gameLog);
        console.log('[Main] Game log saved');

        // Extract campaign context from game log meta
        const campaignContext = (gameLog.meta as any).campaignId ? {
          campaignId: (gameLog.meta as any).campaignId,
          nodeId: (gameLog.meta as any).nodeId
        } : undefined;

        // Process run completion for meta-game
        try {
          await processRunCompletion(gameLog, metaGame, campaignContext);
          console.log('[Main] Run completion processed');
        } catch (error) {
          console.error('[Main] Error processing run completion:', error);
        }
      }

      // Show victory/defeat message
      setTimeout(() => {
        if (outcome === 'victory') {
          alert('🎉 VICTORY! You reached the exit and completed the dungeon!\n\nReturning to lobby...');
        } else {
          alert('☠️ DEFEAT! All heroes have fallen.\n\nReturning to lobby...');
        }
        window.location.reload();
      }, 300);
    };

    function loop() {
      manager.update();
      requestAnimationFrame(loop);
    }
    loop();

    if (isHost) {
      // Host already connected via transport.connect() above, no need to send identity again
      createHUD("Host", currentHostId, persistentId || 'player-1');

      // Wire up save button
      const saveBtn = document.getElementById('btn-save-game');
      if (saveBtn) {
        saveBtn.onclick = () => {
          const gameLog = (transport as HostTransport).engine.getGameLog();
          storage.saveGame(gameLog);

          // Visual feedback
          saveBtn.textContent = '✅ Saved!';
          saveBtn.style.background = '#2a4a2a';
          setTimeout(() => {
            saveBtn.textContent = '💾 Save Game';
            saveBtn.style.background = '#2a3a2a';
          }, 2000);
        };
      }
    } else if (connectToId) {
      try {
        const generatedId = await (transport as PeerTransport).connect(connectToId, persistentId || `player-${Math.floor(Math.random() * 1000)}`);
        // Note: generatedId is the PeerID, persistentId is the game identity. Using generatedId as fallback identity display.
        createHUD("Client", connectToId, persistentId || generatedId);
      } catch (e) {
        console.error("Connection Failed", e);
      }
    }
  }

  function createHUD(role: string, hostId?: string, userId?: string) {
    const hud = document.createElement('div');
    hud.id = 'game-hud';
    hud.style.cssText = "position: absolute; top: 10px; left: 10px; background: rgba(0, 0, 0, 0.7); color: #fff; padding: 10px; border-radius: 8px; font-family: 'Inter', sans-serif; pointer-events: auto; z-index: 1000;";

    let content = '<div><strong>Role:</strong> ' + role + '</div>';
    if (userId) content += '<div><strong>Identity:</strong> ' + userId + '</div>';
    if (hostId) {
      content += '<div style="margin-top: 5px;"><strong>Host ID:</strong> <span id="hud-host-id" style="font-family: monospace; background: #333; padding: 2px 5px; border-radius: 4px;">' + hostId + '</span> <button id="btn-copy-host" style="cursor: pointer; font-size: 0.8rem;">📋</button></div>';
    }

    // Level indicator
    content += '<div style="margin-top: 5px;"><strong>Level:</strong> <span id="level-indicator">1/1</span></div>';

    if (role === 'Spectator') {
      content += '<button id="btn-join-game" style="margin-top: 10px; padding: 5px 10px; background: #3a3a4a; border: 1px solid #46a; color: white; border-radius: 4px; cursor: pointer; width: 100%;">Join Game</button>';
    }

    if (role === 'Host') {
      content += '<button id="btn-save-game" style="margin-top: 10px; padding: 5px 10px; background: #2a3a2a; color: #4f6; border: 1px solid #4f6; border-radius: 4px; cursor: pointer; width: 100%;">💾 Save Game</button>';
    }

    content += '<button id="btn-quit" style="margin-top: 10px; padding: 5px 10px; background: #a33; border: none; color: white; border-radius: 4px; cursor: pointer; width: 100%;">Quit to Lobby</button>';
    content += '<div style="margin-top: 10px; font-size: 0.75rem; color: #888; border-top: 1px solid #444; padding-top: 5px;">WASD: Move | Space: Wait<br/>. or &gt;: Stairs | Q: Quit</div>';

    hud.innerHTML = content;
    app.appendChild(hud);

    // Update level indicator
    setInterval(() => {
      const state = (window as any).manager?.state;
      if (state && state.currentLevel !== undefined && state.maxLevels) {
        const levelIndicator = document.getElementById('level-indicator');
        if (levelIndicator) {
          levelIndicator.textContent = (state.currentLevel + 1) + '/' + state.maxLevels;
        }
      }
    }, 100);

    // Events
    if (hostId) {
      const btnCopy = hud.querySelector('#btn-copy-host') as HTMLElement;
      if (btnCopy) {
        btnCopy.onclick = () => {
          navigator.clipboard.writeText(hostId);
          btnCopy.innerText = "✅";
          setTimeout(() => btnCopy.innerText = "📋", 1000);
        };
      }
    }

    const btnJoinGame = hud.querySelector('#btn-join-game') as HTMLElement;
    if (btnJoinGame) {
      btnJoinGame.onclick = () => {
        if (window.triggerJoinUI) window.triggerJoinUI();
        else alert("Cannot join: Game manager not found.");
      };
    }

    (hud.querySelector('#btn-quit') as HTMLElement).onclick = () => {
      window.location.reload();
    };
  }
}

init().catch(e => console.error("[Main] Error:", e));
