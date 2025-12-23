# RogueWar

A browser-based **peer-to-peer multiplayer roguelike** with deterministic gameplay and serverless architecture.

## ✨ Features

- 🎮 **P2P Multiplayer**: Host and join games directly in the browser using PeerJS - no central server required
- 👥 **Spectator Mode**: Watch ongoing games and switch between different player perspectives
- 💾 **Save & Resume**: Games are automatically saved to localStorage and can be resumed anytime
- 🔄 **Replay System**: Review past games turn-by-turn with full replay controls
- 🎯 **Deterministic Game Logic**: Pure, testable game rules shared between all peers
- 📱 **Network Play**: Access games from any device on your local network
- 🎨 **Canvas Renderer**: Smooth HTML5 Canvas-based graphics

## 🏗️ Architecture

### Monorepo Structure

- **`packages/rules`**: Pure TypeScript game logic (RNG, Dungeon Gen, Turn Resolution). No browser/node dependencies.
- **`packages/authority`**: Authoritative game engine (`HostEngine`) that enforces rules and manages state deterministically
- **`packages/ai`**: AI player implementations (ReactiveBot, etc.)
- **`packages/client`**: Vite-based frontend with P2P networking, rendering, and input handling

### P2P Architecture

```
┌─────────────┐           ┌─────────────┐
│   Host      │◄─────────►│   Client    │
│ (Browser)   │  PeerJS   │ (Browser)   │
│             │           │             │
│ HostEngine  │           │ ClientGame  │
│  + Storage  │           │  Manager    │
└─────────────┘           └─────────────┘
       ▲                         ▲
       │                         │
       └─────────────┬───────────┘
                     │
              ┌──────▼───────┐
              │  Spectator   │
              │  (Browser)   │
              └──────────────┘
```

The **Host** runs a full `HostEngine` (authoritative game state) in their browser and acts as the game server. **Clients** connect via PeerJS, send actions, and receive state updates. **Spectators** can watch in real-time and switch between player views.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation

Install all dependencies from the root directory:

```bash
npm install
```

### Running the Game

Start the development server:

```bash
npm run dev:client
```

Then open [http://localhost:5173](http://localhost:5173).

**For network access** (play on other devices on your LAN):
- The server is now configured to expose on your network by default
- Look for the "Network:" URLs in the terminal output
- Use those URLs on other devices (phones, tablets, other computers)

## 🎮 How to Play

### Hosting a Game

1. Click **"START HOSTING"**
2. (Optional) Enter a custom game name
3. Share the **Host ID** with other players
4. Choose your character when prompted
5. Your game auto-saves after every turn!

### Joining a Game

1. Enter the **Host ID** or **Game Name** in the "JOIN / SPECTATE" section
2. Click **"JOIN"**
3. Select an available character or spawn a new one
4. Play!

### Spectating a Game

1. Enter the **Host ID** in the "JOIN / SPECTATE" section
2. Click **"SPECTATE"**
3. Watch the game in real-time
4. Click player names in the left panel to switch camera views
5. Press "Join Game" button to jump in as a player

### Resuming a Saved Game

1. Find your saved game in the **"SAVED GAMES / REPLAYS"** section
2. Click **"RESUME"**
3. Reclaim your previous character
4. Continue where you left off!

### Replaying a Game

1. Click **"REPLAY"** on any saved game
2. Use the timeline controls to scrub through turns
3. Watch the game unfold turn-by-turn

## 🎯 Game Controls

- **Arrow Keys** / **WASD**: Move your character
- **Space**: Skip turn / Wait
- **Q**: Quit to lobby (with confirmation)
- **💾 Save Game** (Host only): Manually save the current game state

## 🔧 Development

### Project Scripts

```bash
# Start client dev server
npm run dev:client

# Build rules package
npm run build -w @roguewar/rules

# Build authority package  
npm run build -w @roguewar/authority

# Build all packages
npm run build
```

### Mod System

The game supports a modular content system via `ModRegistry`. Core content is defined in `@roguewar/rules/src/content/core.ts` and can be extended with custom mods.

## 🗺️ Roadmap

- [x] **Phase 1**: Local Single Player
- [x] **Phase 2**: Shared Rules Package
- [x] **Phase 3**: Deterministic Authority Engine
- [x] **Phase 4**: P2P Multiplayer via PeerJS
- [x] **Phase 5**: Save/Load System & Replays
- [x] **Phase 6**: Spectator Mode
- [ ] **Phase 7**: Advanced AI opponents
- [ ] **Phase 8**: Extended content & balancing
- [ ] **Phase 9**: Polish & UX improvements

## 📝 Technical Notes

### Deterministic Game Logic

All game logic in `@roguewar/rules` is **purely deterministic**. Given the same seed and sequence of actions, the game will always produce identical results. This enables:
- Perfect replay accuracy
- Easy testing and debugging
- Trust-free P2P multiplayer (clients can verify host integrity)

### Network Architecture

- **PeerJS**: WebRTC-based P2P connections via a public STUN server
- **Host ID**: Derived from game name (e.g., "My Game" → `roguewar-my-game`)
- **Message Types**: `identity`, `spectate`, `action`, `welcome`, `delta`, `error`
- **Auto-save**: Host automatically saves after every turn

### Storage

Games are stored in browser `localStorage` using IndexedDB-style key-value storage:
- Key: `gameId` (UUID)
- Value: Full `GameLog` (metadata + all turns + config)

## 🤝 Contributing

This is a personal project, but feedback and suggestions are welcome!

## 📄 License

MIT
