Roguewar — Phase 9

Meta-Game, Progression, and Campaign Structure

Purpose

Introduce a meta-game layer that sits above individual dungeon runs, providing:
	•	Player progression
	•	Unlocks
	•	Campaign structure
	•	Long-term goals

This phase must not contaminate the core deterministic game engine.

Runs remain pure. Progression is external.

⸻

Non-Negotiable Constraints
	•	❌ No backend services
	•	❌ No pay-to-win mechanics
	•	❌ No rule changes based on player progression
	•	✔ Static hosting compatible (github.io)
	•	✔ Deterministic runs and replays preserved

Progression may influence what is available, never how rules resolve.

⸻

Core Principle

Runs are sacred. Progression is contextual.

A dungeon run must be fully replayable without any meta-state.

⸻

Meta vs Run Boundary

Run-Level (Already Implemented)
	•	Dungeon generation
	•	Combat
	•	AI behavior
	•	Turn resolution

Meta-Level (This Phase)
	•	Unlocks
	•	Campaign maps
	•	Player profiles
	•	Achievements

No cross-contamination.

⸻

Player Profile

interface PlayerProfile {
  profileId: string
  unlockedContent: string[]
  completedRuns: number
  achievements: string[]
}

Stored client-side only.

⸻

Progression Model

Unlock-Based (Preferred)
	•	New heroes
	•	New starting loadouts
	•	New dungeon themes

Unlocked by:
	•	Completing runs
	•	Achievements
	•	Campaign milestones

⸻

Explicitly Forbidden
	•	Stat scaling across runs
	•	Permanent power creep
	•	Meta bonuses affecting combat math

⸻

Campaign Structure

Campaigns are ordered graphs of runs.

interface CampaignNode {
  id: string
  dungeonConfig: GameConfig
  unlocksOnComplete: string[]
}

Campaigns may branch but must be deterministic.

⸻

Failure & Death Handling
	•	Death ends a run
	•	Campaign progress may:
	•	Unlock narrative
	•	Unlock retries
	•	Unlock alternate paths

Death must never retroactively alter completed runs.

⸻

Persistence
	•	Meta-state stored via:
	•	IndexedDB
	•	localStorage (fallback)
	•	Meta-state is not included in GameLog

⸻

Multiplayer Considerations
	•	Campaigns are optional in multiplayer
	•	In co-op:
	•	Host defines campaign context
	•	Run rules remain identical

Meta progression is local per player.

⸻

UI Requirements
	•	Campaign map screen
	•	Unlock notifications
	•	Profile inspection

Meta UI must be visually and architecturally separate from run UI.

⸻

Explicit Non-Goals
	•	Global leaderboards
	•	Competitive ladders
	•	Monetization
	•	Cross-device sync

⸻

Required Deliverables
	•	Meta-state schema
	•	Campaign definition format
	•	Unlock system
	•	Meta UI layer

⸻

Acceptance Criteria

✔ Runs remain replayable without meta data
✔ Unlocks affect availability only
✔ Campaign progress persists locally
✔ Multiplayer runs unaffected by player meta-state

⸻

Guiding Principle

The engine never knows who you are.

If the rules engine needs player history, the design is wrong.

----

Phase 9 is now complete and captured as a Markdown prompt in the canvas.

Why Phase 9 is subtle but dangerous (if done wrong)

This is the phase where many otherwise-solid games quietly rot:
	•	Meta-progression leaks into combat math
	•	Balance becomes irreproducible
	•	Replays stop meaning what they used to
	•	Multiplayer fairness erodes

This prompt explicitly walls off the meta-game so that runs remain pure artifacts.

Strong signals Phase 9 is correct

You should be able to:
	•	Replay a run without loading any player profile
	•	Hand someone a replay file and have it mean the same thing
	•	Delete all meta-state and still run the core game
	•	Add new campaigns without touching the rules engine

If any rule code starts asking “who is the player?” — stop.

Where this leaves Roguewar

At this point you have:
	•	A deterministic engine
	•	P2P multiplayer
	•	AI players
	•	Mods
	•	Persistence
	•	Spectators
	•	Campaigns and progression

You are no longer building a game, but a game system.

