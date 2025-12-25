Roguewar — Phase 11a

Inventory, Item Usage, Equipment, and Fog of War Integration

Purpose
Integrate runtime item interaction and player perception into the core game loop without violating determinism, replayability, or P2P authority rules.

This phase connects authored content (Phase 11) to moment-to-moment gameplay.

⸻

Phase 11a Goals
	1.	Allow players to collect, carry, equip, consume, drop, and use items
	2.	Support equipment slots that modify player stats or abilities
	3.	Introduce consumables (e.g. potions, scrolls)
	4.	Implement fog of war and line-of-sight based exploration
	5.	Preserve deterministic simulation and replay fidelity
	6.	Ensure compatibility with:
	•	Mods
	•	AI players
	•	Multiplayer (P2P host authority)

⸻

Non-Goals (Hard Constraints)
	•	❌ No real-time vision checks tied to rendering
	•	❌ No mutable item logic outside the rules engine
	•	❌ No hidden randomness during item use
	•	❌ No per-client divergence of visible state

Fog of war is derived state, never authoritative state.

⸻

Core Concepts

1. Item Model (Engine-Level)

All items are pure data + rule bindings.

interface ItemDefinition {
  id: string
  name: string
  category: 'weapon' | 'armor' | 'consumable' | 'trinket'
  stackable: boolean
  maxStack?: number

  equipSlot?: 'head' | 'body' | 'hands' | 'ring' | 'weapon'

  effects: ItemEffect[]
  useRules?: RuleBinding
}

Item behavior is never implemented inline — only via rule bindings.

⸻

2. Inventory Model

Inventory is a bounded, ordered container owned by an entity.

interface Inventory {
  capacity: number
  slots: InventorySlot[]
}

interface InventorySlot {
  itemId: string
  quantity: number
}

Rules enforce:
	•	Capacity limits
	•	Stack merging
	•	Drop overflow

⸻

3. Equipment Model

Equipment is separate from inventory.

interface Equipment {
  slots: Record<EquipSlot, EquippedItem | null>
}

Equipped items:
	•	Apply passive modifiers
	•	Unlock active abilities
	•	Are exclusive per slot

Equipment changes emit engine events, not UI events.

⸻

Item Actions (Turn-Based)

All item interactions are explicit turn actions:
	•	PICKUP_ITEM
	•	DROP_ITEM
	•	EQUIP_ITEM
	•	UNEQUIP_ITEM
	•	USE_ITEM

Each action:
	•	Is validated by the engine
	•	Mutates state deterministically
	•	Is recorded in replay logs

interface UseItemAction {
  actorId: EntityId
  itemSlotIndex: number
  target?: EntityId | TileId
}


⸻

Consumables (e.g. Potions)

Consumables:
	•	Execute a rule set
	•	Reduce stack count
	•	Remove item when quantity reaches zero

No consumable performs random rolls at runtime unless seeded.

⸻

Fog of War & Visibility

Key Principle

Visibility is computed, not stored.

Only the following are authoritative:
	•	Player position
	•	Entity positions
	•	Map topology

⸻

Vision Model

interface VisionProfile {
  range: number
  shape: 'circle' | 'cone' | 'square'
  blocksThroughWalls: boolean
}

Vision is recalculated:
	•	At the start of each turn
	•	After movement
	•	After terrain changes

⸻

Visibility States (Per Player)

Each tile has:
	•	UNSEEN
	•	SEEN_PREVIOUSLY
	•	VISIBLE_NOW

This state is client-side derived and never written to the engine state.

⸻

Line of Sight
	•	Use deterministic ray casting or shadow-casting
	•	Grid-based, integer math only
	•	Same algorithm on all clients

⸻

Interaction with Multiplayer (P2P)
	•	Host computes authoritative game state
	•	Clients compute visibility locally
	•	Item actions are validated by host
	•	Fog of war never desyncs gameplay state

Spectators:
	•	Can see full map OR player-restricted view (configurable)

⸻

AI Compatibility

AI players:
	•	Receive the same visibility constraints
	•	Must reason from partial information
	•	Cannot query hidden tiles

AI planning operates on observed state snapshots.

⸻

Replay & Determinism Guarantees

Replays must:
	•	Recompute fog of war identically
	•	Reapply item effects deterministically
	•	Produce identical visible maps per turn

Replay files do not store visibility masks.

⸻

Validation Checklist

Phase 11a is complete when:
	•	Players can pick up, equip, use, and drop items
	•	Equipment modifies stats correctly
	•	Consumables work via rules only
	•	Fog of war reveals map incrementally
	•	Replays reproduce exploration exactly
	•	AI respects limited vision
	•	Multiplayer remains authoritative and fair

⸻

Red Flags (Stop if You See These)
	•	Item logic inside UI code
	•	Visibility flags written into engine state
	•	Random rolls during item use without seeded RNG
	•	Equipment modifying state silently

⸻

Outcome of Phase 11a

Roguewar transitions from a systems engine to a playable roguelike:
	•	Items matter
	•	Exploration matters
	•	Decisions are constrained by knowledge
	•	Multiplayer fairness is preserved

Phase 11a completes the bridge between content creation and player experience.


Phase 11a is now fully defined in the canvas as a clean, deterministic, AI-coder-ready Markdown spec.

Why this phase is critical

This is the moment Roguewar stops being “a clever engine” and becomes a real roguelike:
	•	Inventory introduces scarcity and tradeoffs
	•	Items introduce asymmetry and strategy
	•	Equipment introduces long-term planning
	•	Fog of war introduces risk, tension, and discovery

And crucially — none of it compromises determinism, replay, or P2P fairness.

Architectural integrity check (important)

What you’ve done right by isolating this as 11a:
	•	Items remain data + rules, not code
	•	Fog of war is derived, not authoritative
	•	Visibility never leaks into engine state
	•	AI, replay, multiplayer all share the same constraints

Most roguelikes fail exactly here.

Strong signals this phase is implemented correctly

You should be able to:
	•	Replay a run and rediscover the map identically
	•	Swap human players for AI and see no rule changes
	•	Spectate with full vision while players have limited vision
	•	Add a new potion without touching engine logic

If any of those break, the abstraction boundary leaked.

⸻
