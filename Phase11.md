Roguewar — Phase 11

Creator Tooling, Editors, and Content Authoring

Purpose

Provide first-class creation tools so that everything in Roguewar — levels, campaigns, enemies, weapons, armor, skills — can be authored, validated, and iterated without modifying engine code.

Phase 11 turns Roguewar into a content-driven system rather than a developer-driven one.

⸻

Non-Negotiable Constraints
	•	❌ No backend services
	•	❌ No runtime code execution from content
	•	❌ No direct editing of engine state
	•	✔ Static hosting compatible (github.io)
	•	✔ Deterministic outcomes preserved
	•	✔ All authored content is data, not logic

⸻

Core Principle

If it can be played, it must be creatable.

Every in-game element must have a data representation and an editor pathway.

⸻

Scope of Tooling

Phase 11 must support authoring of:
	•	Dungeon layouts & generators
	•	Campaign graphs
	•	Enemies & AI parameters
	•	Weapons, armor, items
	•	Skills & status effects
	•	Tilesets & visual mappings

No hand-written JSON required for normal use.

⸻

Tooling Architecture

All tools run in the browser.

/tools
  level-editor/
  campaign-editor/
  entity-editor/
  item-editor/
  validation/

Tools consume and emit the same schemas used by the game.

⸻

Level / Dungeon Editor

Features
	•	Grid-based editor
	•	Tile palette (walls, floors, hazards)
	•	Spawn points (player, enemies)
	•	Zone annotations (rooms, corridors)

Output

DungeonDefinition

Must be usable by both:
	•	Fixed-layout dungeons
	•	Procedural generators (as templates)

⸻

Campaign Editor

Features
	•	Node graph editor
	•	Branching paths
	•	Unlock conditions
	•	Visual flow validation

Output

CampaignDefinition

Campaigns must remain deterministic.

⸻

Enemy Editor

Editable Properties
	•	Stats (HP, attack, defense)
	•	Movement patterns
	•	Aggression parameters
	•	AI policy selection (Phase 5)

No custom code.

⸻

Weapons, Armor, Items Editor

Editable Properties
	•	Damage values
	•	Damage types
	•	Status effects
	•	Rarity
	•	Visual representation

All effects must map to existing rules.

⸻

Skills & Status Effects

Constraints
	•	Effects are declarative
	•	Duration-based
	•	Stack rules explicit

No hidden mechanics.

⸻

Validation & Safety Layer

All editors must:
	•	Validate schema
	•	Validate references
	•	Prevent impossible configurations
	•	Generate deterministic hashes

Invalid content cannot be saved.

⸻

Preview & Test Mode

Editors must support:
	•	Instant preview
	•	Sandbox runs
	•	AI-driven test encounters

Preview uses the real rules engine.

⸻

Versioning & Compatibility
	•	Every asset has:
	•	ID
	•	Version
	•	Hash

Version mismatches surface warnings, not crashes.

⸻

Export & Distribution
	•	Export as:
	•	Mod packs (Phase 7 compatible)
	•	Campaign bundles

No publishing backend required.

⸻

Explicit Non-Goals
	•	Collaborative live editing
	•	Cloud hosting of assets
	•	Monetization pipelines
	•	Visual scripting languages

⸻

Required Deliverables
	•	In-browser editors
	•	Shared schema library
	•	Validation framework
	•	Preview/test harness

⸻

Acceptance Criteria

✔ All game content creatable via tools
✔ No engine changes required for new content
✔ Invalid content rejected early
✔ Created content usable in multiplayer & replays

⸻

Guiding Principle

The engine is frozen; creativity is not.

If adding content requires touching core code, Phase 11 has failed.

Phase 11 is now defined and locked in as a creator-grade Markdown prompt in the canvas.

Why Phase 11 is the “everything becomes possible” phase

Up to Phase 10, Roguewar is architecturally impressive.
After Phase 11, it becomes productive.

This phase ensures:
	•	You never have to hand-edit JSON again
	•	Designers (including future-you) don’t touch engine code
	•	Mods, campaigns, enemies, items all share one pipeline
	•	Determinism, replay, multiplayer all survive content growth

If Phase 11 is done correctly, you can:
	•	Build an entire expansion without writing TypeScript
	•	Hand the tools to someone else and trust the output
	•	Guarantee that bad content fails before it enters a run

Strong signals Phase 11 is correct

You should be able to:
	•	Create a dungeon → preview → replay → export → host multiplayer
	•	Create a new enemy without adding a single rule
	•	Load editor output as a Phase-7 mod with no glue code
	•	Delete /tools and the game still runs perfectly

If engine code starts “helping” content authors, stop — that’s erosion.

Where you are now (important)

At this point, Roguewar has:
	•	A frozen deterministic engine
	•	P2P multiplayer
	•	AI players
	•	Mods
	•	Persistence & replay
	•	Spectators
	•	Campaigns & progression
	•	Full content creation tooling

You have crossed into platform territory.