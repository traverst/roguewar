You are implementing **Phase 1** of a browser-based roguelike called **Roguewar**.

This phase is **local single-player only**.  
There is **no networking**, **no server**, and **no multiplayer logic** in this phase.

The goal is to produce a clean, deterministic, extensible foundation that will later be reused for multiplayer.

---

## 1. Hard Constraints (Do Not Violate)

- Language: **TypeScript**
- Runtime: **Browser**
- Rendering: **HTML5 Canvas (2D)**
- Architecture must cleanly separate:
  - Game state
  - Game rules
  - Rendering
  - Input
- All gameplay logic must be **deterministic**
- No external game engines
- No DOM-based rendering (Canvas only)
- No async game loops beyond requestAnimationFrame
- No global mutable state except the top-level game state object

If a design choice conflicts with determinism or future multiplayer, reject it.

---

## 2. Scope of This Phase

Implement the following **only**:

### A. Canvas Renderer
- Tile-based 2D renderer
- Fixed tile size
- Camera centered on player
- Multiple layers:
  1. Floor
  2. Walls
  3. Entities
- No visual effects beyond simple sprites or colored rectangles

### B. Dungeon Generation
- Grid-based dungeon
- Deterministic generation using a numeric seed
- Rooms + corridors OR simple cellular automata
- Solid walls, walkable floors
- Player spawn point
- At least one enemy spawn

### C. Turn Engine
- Turn-based system
- One player action per turn
- Enemies act after player
- Turn order is deterministic
- No real-time combat

### D. Combat Rules
- Grid-based adjacency combat
- Deterministic damage calculation
- No randomness unless explicitly seeded
- Health, attack, defense
- Enemy AI: minimal (move toward player, attack if adjacent)

---

## 3. Explicit Non-Goals (Do NOT Implement)

- Multiplayer
- Networking
- Persistence
- Save/load
- Fog of war
- Items or inventory
- Animations beyond instant state changes
- UI frameworks
- Sound

---

## 4. Required Architecture

Organize the code into clear modules:

### Game State
- Dungeon grid
- Entity list
- Turn counter

### Rules / Logic
- Movement validation
- Combat resolution
- Enemy AI decisions

### Rendering
- Purely reads game state
- No game logic
- No state mutation

### Input
- Keyboard input
- Translates input into game actions

---

## 5. Determinism Requirements

- All randomness must come from a seeded PRNG
- Given the same seed and inputs, the game must behave identically
- Do not use Math.random directly

---

## 6. Output Expectations

Produce:
- Well-structured TypeScript code
- Clear file/module boundaries
- Minimal but complete implementation
- Inline comments explaining design decisions
- No placeholder stubs unless explicitly marked

The result should be something that can be opened in a browser and played as a basic roguelike.

---

## 7. Design Philosophy

This is **not a prototype throwaway**.

Code as if:
- Multiplayer will be added later
- Logic will be reused on a server
- Rendering will be swapped out

If in doubt:
- Prefer simplicity
- Prefer determinism
- Prefer explicitness over cleverness

Begin with a brief explanation of the architecture, then provide the implementation.