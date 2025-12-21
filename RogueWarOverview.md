Roguewar

A browser-based multiplayer roguelike with co‑op and PvP, built using TypeScript everywhere, a serverless authoritative core, and clients doing all rendering and UX. The system is designed for pay-per-action, zero idle cost, and deterministic gameplay.

This document is written to support AI‑assisted / vibe‑coding development: clear phases, strict boundaries, and repeatable patterns.

⸻

1. Design Principles (Non‑Negotiable)
	1.	Authoritative but minimal backend
The backend validates and resolves. It never renders or simulates visuals.
	2.	Deterministic core
All gameplay logic must be deterministic given the same inputs.
	3.	Intent, not outcome
Clients submit intent. The authority decides outcomes.
	4.	Turn‑based / tick‑based
No real‑time lockstep. This keeps latency, cheating, and cost manageable.
	5.	Shared rules package
Game rules live in a shared TypeScript module used by both client and server.
	6.	Idle = zero cost
No loops, no polling, no always‑on servers.

⸻

2. High‑Level Architecture

Browser Clients (TS)
  ├─ Input
  ├─ Prediction
  ├─ Rendering (Canvas)
  └─ Animation
        │
        ▼
Managed WebSocket / PubSub
        │
        ▼
Serverless Authoritative Core (TS)
  ├─ Validate actions
  ├─ Resolve RNG
  ├─ Apply rules
  └─ Emit state deltas
        │
        ▼
Durable State
  ├─ Dungeon instance
  ├─ Player state
  └─ Match metadata


⸻

3. Technology Choices

Language
	•	TypeScript everywhere

Client
	•	HTML5
	•	Canvas 2D
	•	Vite (build/dev)

Backend (example target)
	•	Cloudflare Workers (TypeScript)
	•	Durable Objects (one per dungeon / match)
	•	WebSockets

(Equivalent AWS or Firebase stacks are acceptable.)

Shared Code
	•	Local monorepo package imported by both client and server

⸻

4. Repository Structure

roguewar/
  packages/
    rules/          # Shared deterministic game logic
    client/         # Browser client
    server/         # Serverless authority
  assets/
    tiles/
    sprites/
  docs/


⸻

5. Core Game Model

Turn Model
	•	Discrete turns (or micro‑turns)
	•	Each player may submit one action per turn
	•	Server resolves turn atomically

Action (Intent)

type Action =
  | { type: "move"; dir: Dir }
  | { type: "attack"; targetId: EntityId }
  | { type: "use"; itemId: ItemId };

Turn Result

type TurnResult = {
  events: GameEvent[];
  nextTurn: number;
};

Clients never send results. Only actions.

⸻

6. Determinism & RNG

Rules
	•	All randomness must come from a seeded PRNG
	•	Seed is owned by the authoritative core

Example

const rng = mulberry32(seed ^ turn ^ actorId);

Clients may predict but never decide.

⸻

7. Graphics & Rendering

Rendering Technology
	•	HTML5 Canvas (2D)

World Model
	•	Tile‑based grid
	•	Multiple layers:
	1.	Floor
	2.	Walls
	3.	Entities
	4.	Effects
	5.	Fog of war

Rendering Loop
	•	Fixed timestep
	•	Draw only visible tiles
	•	Camera follows player

Philosophy
	•	Server sends events
	•	Client animates freely
	•	State updates are applied after animation

⸻

8. Networking Model

Transport
	•	WebSocket per dungeon instance

Flow
	1.	Client submits action intent
	2.	Authority validates legality
	3.	Authority resolves turn
	4.	Authority emits delta
	5.	Clients animate and apply

No polling. No background ticks.

⸻

9. Serverless Authoritative Core

Responsibilities
	•	Validate movement
	•	Enforce cooldowns
	•	Resolve combat
	•	Own RNG
	•	Broadcast deltas

Explicitly NOT Responsible For
	•	Rendering
	•	Animation
	•	Pathfinding visuals
	•	UI

⸻

10. Durable State Model

Dungeon Instance
	•	Dungeon seed
	•	Turn counter
	•	Entity states
	•	Connected players

Player State
	•	Position
	•	Stats
	•	Inventory

State is mutated only by the authority.

⸻

11. Anti‑Cheat Model

Enforced Server‑Side
	•	Movement legality
	•	Damage calculation
	•	RNG outcomes
	•	Action rate limits

Accepted Client Trust
	•	Input timing
	•	Local prediction

PvP always resolves server‑side.

⸻

12. Development Phases (Step‑by‑Step)

Phase 1 — Local Single Player
	•	Canvas renderer
	•	Dungeon generation
	•	Turn engine
	•	Combat rules

Phase 2 — Shared Rules Package
	•	Extract all game logic
	•	Enforce determinism
	•	Unit tests for rules

Phase 3 — Serverless Turn Authority
	•	One dungeon instance
	•	Action validation
	•	Delta emission

Phase 4 — Multiplayer Co‑Op
	•	WebSocket sync
	•	Multiple players
	•	Shared dungeon state

Phase 5 — PvP
	•	Arena instances
	•	Conflict resolution
	•	Replay validation

Phase 6 — Meta Systems
	•	Accounts
	•	Progression
	•	Seasonal resets

⸻

13. AI‑Assisted Coding Guidance

When using AI to implement:
	•	Always specify which layer (client / rules / server)
	•	Enforce deterministic outputs
	•	Never let AI invent hidden state
	•	Prefer small, testable modules

Example prompt style:

“Implement deterministic movement validation for grid‑based roguelike turns in shared TypeScript rules package. No rendering. No randomness.”

⸻

14. Guardrails (Things Not To Do)
	•	No real‑time simulation loops on the server
	•	No client‑decided RNG
	•	No visual logic in shared rules
	•	No background cron jobs

⸻

15. End State Vision

Roguewar is:
	•	Cheap to operate
	•	Deterministic and fair
	•	Easy to extend
	•	Resistant to cheating
	•	Friendly to AI‑assisted development

⸻

This document is the canonical reference.
All new systems must conform to it.