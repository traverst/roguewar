# RogueWar

A browser-based multiplayer roguelike with a serverless authoritative core.

## Project Status

This project is currently in **Phase 3** of development.

- **Phase 1: Local Single Player** - Implemented basic dungeon generation, movement, combat, and rendering.
- **Phase 2: Shared Rules Package** - Refactored game logic into a pure, deterministic `@roguewar/rules` package.
- **Phase 3: Serverless Authoritative Core** - Implemented a Node.js WebSocket server (`@roguewar/server`) that enforces rules and manages state deterministically.

## Monorepo Structure

- **`packages/rules`**: Pure TypeScript game logic (RNG, Dungeon Gen, Turn Resolution). No dependencies on browser or node (except dev/test).
- **`packages/client`**: Vite-based frontend. Renders the game using HTML5 Canvas. Currently runs local single-player using the shared rules directly (will connect to server in Phase 4).
- **`packages/server`**: Node.js WebSocket server. Acts as the authoritative match referee.

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation

Install all dependencies from the root directory:

```bash
npm install
```

### Building

The `rules` package must be built before the server can run (and often helps the client too):

```bash
npm run build -w @roguewar/rules
```

### Running the Project

#### 1. Play the Client (Local Mode)
To play the single-player version in your browser:

```bash
npm run dev:client
```
Then open [http://localhost:5173](http://localhost:5173).

#### 2. Run the Authority Server
To start the authoritative game server (headless):

```bash
npm start -w @roguewar/server
```
It listens on port `3000`.

#### 3. Verify Server Logic
To verify that the server is processing turns correctly, you can run the test script while the server is running:

```bash
npx tsx scripts/test-server.ts
```

## Next Steps
- **Phase 4**: Connect the Client to the Server for real multiplayer gameplay.
