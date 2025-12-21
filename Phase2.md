Phase 2 is the most important structural phase — this is where projects either become multiplayer-ready or quietly paint themselves into a corner.

Below is a clean, strict Phase 2 AI prompt, designed to extract, harden, and future-proof what you already built in Phase 1.

⸻

Phase 2 — Shared Rules Package (AI Prompt)

You are implementing **Phase 2** of the game **Roguewar**.

Phase 1 (local single-player) is complete.
Your task is to **extract and formalise the deterministic game rules** into a **shared TypeScript package** that can be reused by both client and server.

This phase introduces **no new gameplay features**.
It is a structural and correctness phase.

---

## 1. Primary Goal

Create a **shared rules package** that contains **all authoritative game logic**, with:

- No rendering
- No input handling
- No networking
- No browser dependencies

This package must be usable:
- In the browser
- In a serverless backend
- In unit tests

---

## 2. Hard Constraints (Do Not Violate)

- Language: **TypeScript**
- No Canvas, DOM, or browser APIs
- No WebSocket, HTTP, or async networking logic
- No timers or animation logic
- No Math.random
- No side effects outside explicit state mutation

All logic must be:
- Deterministic
- Pure or explicitly state-transforming
- Replayable from initial state + action list

---

## 3. Scope of This Phase

### A. Extract Game Rules into a Package

Create a package (e.g. `packages/rules`) containing:

- Movement validation
- Combat resolution
- Turn resolution
- Enemy AI decision logic
- Deterministic RNG utilities
- Dungeon generation (if already deterministic)

---

### B. Define Canonical Data Models

Define and export **explicit types** for:

#### Game State
```ts
type GameState = {
  turn: number;
  dungeon: Dungeon;
  entities: Record<EntityId, Entity>;
};

Entity

type Entity = {
  id: EntityId;
  type: "player" | "enemy";
  pos: Vec2;
  hp: number;
  stats: Stats;
};

Action (Intent)

type Action =
  | { type: "move"; dir: Dir }
  | { type: "attack"; targetId: EntityId }
  | { type: "wait" };

These types are authoritative and must not depend on client concerns.

⸻

C. Turn Resolution API

Expose a single, authoritative turn function:

resolveTurn(
  state: GameState,
  action: Action,
  seed: number
): {
  nextState: GameState;
  events: GameEvent[];
};

Rules:
	•	Input state is never mutated
	•	Output is a new state
	•	Events fully describe what happened

⸻

D. Game Events (Critical)

Define explicit events such as:

type GameEvent =
  | { type: "moved"; entityId; from; to }
  | { type: "attacked"; attackerId; targetId; damage }
  | { type: "killed"; entityId };

Events are:
	•	Used later for animation
	•	Used later for networking
	•	Never inferred by the renderer

⸻

E. Deterministic RNG

Implement a seeded PRNG utility:
	•	Explicit seed in
	•	Explicit values out
	•	No hidden global state

Example:

const rng = createRng(seed, turn, entityId);


⸻

4. What Must Be Removed from the Client

The client must no longer contain:
	•	Combat math
	•	Movement rules
	•	Enemy AI decisions
	•	Dungeon logic

The client may:
	•	Predict outcomes using the shared rules
	•	Apply state returned from rules

⸻

5. Testing Expectations

Add basic unit tests (even minimal) that prove:
	•	Same seed + same actions → same results
	•	Illegal actions are rejected
	•	Combat damage is deterministic
	•	Enemy AI decisions are repeatable

Tests must not rely on rendering or timing.

⸻

6. Explicit Non-Goals (Do NOT Implement)
	•	Multiplayer
	•	Networking
	•	Persistence
	•	UI
	•	Animation
	•	Fog of war
	•	Items or inventory
	•	Balance tuning

⸻

7. Output Expectations

Produce:
	•	A clean rules package
	•	Strongly typed exports
	•	Clear function boundaries
	•	Inline comments explaining invariants
	•	Zero rendering code

The end result should allow:
	•	Replaying an entire game by feeding actions
	•	Dropping this package into a serverless authority unchanged

⸻

8. Design Philosophy

This package is the law of the game.

Future multiplayer, PvP fairness, replay verification, and cheat prevention all depend on it.

If something feels “client-y”, it does not belong here.
If something feels ambiguous, make it explicit.

Begin by explaining the extracted architecture, then provide the implementation.

---

## Why Phase 2 Is the Pivot Point

If Phase 2 is done correctly:

- Phase 3 (serverless authority) becomes mostly wiring
- Cheating becomes tractable
- PvP becomes possible
- Replays become trivial
- AI testing becomes easy

If it’s done *loosely*, everything later becomes brittle.
