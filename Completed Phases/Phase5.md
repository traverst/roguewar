Roguewar — Phase 5

AI Players, Bots, and Simulation Layer

Purpose

Introduce AI-controlled players and entities into Roguewar using the existing deterministic rules engine and host-authoritative model.

AI players must be first-class citizens:
	•	They use the same action model as humans
	•	They obey the same rules
	•	They are resolved by the same authority

This phase enables:
	•	Solo play without other humans
	•	Drop-in co-op with AI teammates
	•	PvE-focused dungeon runs
	•	Load testing and simulation

⸻

Core Principles
	•	❌ No special AI-only rules
	•	❌ No direct state mutation by AI
	•	✔ AI submits ActionIntent exactly like a human
	•	✔ AI runs entirely client-side (host-controlled)
	•	✔ Determinism is preserved

Rule: If an AI cannot play the game through the public action API, the design is wrong.

⸻

Architectural Placement

AI logic lives outside the rules engine.

/shared
  rules/
  types/

/authority
  hostEngine.ts

/ai
  perception.ts   ← state interpretation
  policy.ts       ← decision logic
  planner.ts      ← optional multi-step planning

/client
  renderer/
  input/

The host invokes AI decision-making only when resolving turns.

⸻

AI Turn Integration

Turn Flow (Extended)
	1.	Collect human ActionIntents
	2.	Query AI agents for their ActionIntents
	3.	Validate all intents
	4.	Resolve turn
	5.	Emit TurnDelta

AI does not run asynchronously or continuously.

⸻

AI Levels (Progressive)

Level 1 — Reactive Bot
	•	Greedy, local decisions
	•	Examples:
	•	Move toward nearest enemy
	•	Attack if in range
	•	Flee if HP < threshold

No planning, no memory.

⸻

Level 2 — Utility-Based Agent
	•	Assign scores to actions
	•	Choose highest-utility action

Example factors:
	•	Damage dealt
	•	Damage received
	•	Distance to goal
	•	Ally proximity

⸻

Level 3 — Turn Planner (Optional)
	•	Shallow lookahead (1–3 turns)
	•	Deterministic rollouts
	•	Uses cloned game state

Must:
	•	Use same rules engine
	•	Use deterministic RNG fork

⸻

AI Perception Model

AI must not read raw internal structures.

Create a filtered view:

interface AIPerception {
  self: ActorView
  visibleEnemies: ActorView[]
  visibleAllies: ActorView[]
  terrain: TileView[]
  turn: number
}

Perception rules must match player visibility rules.

⸻

Action Generation

AI outputs:

ActionIntent

No shortcuts, no hidden actions.

⸻

Difficulty Scaling

Difficulty is adjusted by:
	•	Policy complexity
	•	Reaction constraints
	•	Information limits

❌ Not by cheating or rule-breaking.

⸻

Determinism Rules
	•	AI decisions must be deterministic given:
	•	GameState
	•	RNG seed
	•	Any randomness must come from the authority RNG

This enables:
	•	Replay
	•	Debugging
	•	AI-vs-AI simulation

⸻

AI as Network Peers (Optional)

Optionally model AI as pseudo-peers:
	•	Assigned a playerId
	•	Treated identically in turn resolution

This simplifies multiplayer logic.

⸻

Simulation & Testing Mode

Add a headless mode:
	•	No rendering
	•	AI vs AI
	•	Fast-forward turns

Used for:
	•	Balance testing
	•	Regression testing
	•	Performance profiling

⸻

Required Deliverables
	•	AI perception layer
	•	At least one working bot type
	•	Deterministic AI decisions
	•	AI integrated into turn resolution
	•	Simulation mode

⸻

Explicit Non-Goals
	•	Machine learning
	•	Online training
	•	Adaptive cheating AI
	•	Real-time AI

⸻

Acceptance Criteria

✔ Single-player game playable end-to-end
✔ AI uses same actions as humans
✔ AI decisions are reproducible
✔ Removing AI does not affect core logic

⸻

Guiding Principle

AI is a player, not a system.

If AI logic feels like it belongs inside the engine, it is in the wrong place.

Phase 5 is now fully defined as a standalone Markdown prompt in the canvas.

This phase is deliberately framed to:
	•	Treat AI as players, not engine hacks
	•	Preserve determinism and replayability
	•	Fit your github.io / host-authoritative model cleanly
	•	Support AI-vs-AI simulation for balance and testing

Why this phase matters architecturally

If Phase 5 is done correctly:
	•	Your rules engine is proven clean
	•	Authority boundaries are stress-tested
	•	Multiplayer, single-player, and simulation all converge on one model

Many games fail here by letting AI “reach inside” the engine. This prompt explicitly forbids that.

Strong correctness signals

You’ll know Phase 5 is right if:
	•	You can replace a human with an AI by swapping input only
	•	You can run 1,000 turns headless and replay them exactly
	•	AI bugs never require touching /shared/rules
