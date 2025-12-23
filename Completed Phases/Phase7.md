Roguewar — Phase 7

Mods, Content Packs, and Extensibility

Purpose

Enable safe, deterministic extensibility of Roguewar via mods and content packs without breaking replayability, determinism, or static-hosting constraints.

Phase 7 allows players and creators to add:
	•	New dungeon themes
	•	Enemies and items
	•	Skills and abilities
	•	Rule-adjacent content (not rule-breaking)

All while preserving the core engine.

⸻

Non-Negotiable Constraints
	•	❌ No backend services
	•	❌ No dynamic code execution at runtime
	•	❌ No mutation of core rules engine
	•	✔ Static hosting compatible
	•	✔ Deterministic replay preserved
	•	✔ TypeScript build-time safety

⸻

Core Principle

Mods add data, not authority.

Mods may describe content, but may not change how the game works.

⸻

Mod Types

1. Content Packs (Primary)

Pure data-driven extensions:
	•	Tilesets
	•	Monsters
	•	Items
	•	Skills
	•	Status effects

Delivered as JSON / TS-typed data.

⸻

2. Behavior Scripts (Restricted)

Optional, tightly constrained:
	•	Finite-state behaviors
	•	Parameterized effects

No arbitrary JS execution.

⸻

Mod Loading Model
	•	Mods are loaded at game start only
	•	Mods are immutable during a run
	•	Mods are identified by:
	•	Name
	•	Version
	•	Content hash

These identifiers are recorded in the game log (Phase 6).

⸻

Directory Structure Example

/mods
  /core
    monsters.json
    items.json
  /crypt-ruins
    mod.json
    monsters.json
    tiles.json


⸻

Mod Manifest

interface ModManifest {
  id: string
  version: string
  description: string
  dependencies?: string[]
}


⸻

Determinism Guarantees
	•	Mods must be:
	•	Pure data
	•	Order-independent
	•	Hashable
	•	Mod load order must be:
	•	Sorted
	•	Deterministic
	•	Mod hashes are included in:
	•	GameLog metadata

⸻

Rules Engine Boundary

The rules engine:
	•	Exposes extension points
	•	Consumes mod data
	•	Never executes mod logic

Example extension points:
	•	Damage types
	•	Status effect definitions
	•	Loot tables

⸻

Validation Layer

At load time:
	•	Validate schema
	•	Validate references
	•	Reject invalid mods

Invalid mods abort game creation.

⸻

Multiplayer Compatibility
	•	All players must load identical mod sets
	•	Host advertises required mods
	•	Peers verify hashes before joining

Mismatch → join rejected.

⸻

Tooling Requirements
	•	Mod schema definitions
	•	Mod validator
	•	Mod hash generator
	•	Developer mod loader UI

⸻

Security Model
	•	Mods cannot:
	•	Access network
	•	Access storage
	•	Access DOM

They are inert data.

⸻

Explicit Non-Goals
	•	Live mod hot-loading
	•	Scriptable AI via mods
	•	User-written JavaScript
	•	Monetized mod marketplace

⸻

Required Deliverables
	•	Mod data schema
	•	Loader & validator
	•	Hashing & versioning
	•	Multiplayer compatibility checks

⸻

Acceptance Criteria

✔ Mods load deterministically
✔ Mods appear in replays
✔ Invalid mods fail fast
✔ Multiplayer rejects mismatches
✔ Core rules untouched

⸻

Guiding Principle

Extensibility without erosion.

If a mod can change the outcome of a past replay, the design is wrong.

Phase 7 is now defined and locked in as a Markdown prompt in the canvas.

Why Phase 7 is the real “point of no return”

If this phase is done correctly:
	•	Your core engine becomes stable
	•	Content can evolve without fear
	•	Replays from months ago still work
	•	AI, multiplayer, and persistence all stay intact

Most games collapse here because they let mods leak logic. This prompt explicitly forbids that and forces data-only extensibility.

Strong signals Phase 7 is correct

You should be able to:
	•	Add a new dungeon theme without touching rules
	•	Reject a mod before the game even starts
	•	Replay a game and prove which mods influenced it
	•	Join multiplayer only when hashes match



