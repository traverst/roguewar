
# RogueWar – Experience & Leveling System + Editor

## Objective

Implement a **fully data-driven, deterministic experience and leveling system** for RogueWar, including:
1. Core XP + leveling logic in `@roguewar/rules`
2. Reward application logic
3. A **content editor** that allows game designers to define and tune the entire progression system without code changes

This system must be:
- Classless
- Deterministic
- Editor-configurable
- Replay-safe
- Multiplayer-safe

---

## Design Principles (MANDATORY)

1. **No hardcoded progression logic**
   - Levels, XP curves, rewards, caps, and growth rules must be defined via data.

2. **One-way data flow**
   - XP → Level → Rewards → Attributes/Skills → Derived Stats

3. **Attributes are base values**
   - Equipment and buffs apply modifiers, never mutate base stats.

4. **Level-ups grant rewards, not stats directly**
   - Rewards are consumed/applied via explicit player actions.

5. **All choices must be logged**
   - Level-up reward allocation is an action, not an implicit side-effect.

---

## Core Concepts

### Attributes (baseline)
All players start with:

STR, DEX, CON, INT, WIS, CHA = 10

### Skills
- Independent from attributes
- Improved via reward points or XP-based rules
- Used for gating abilities and scaling effects

### Experience (XP)
- XP is earned via explicit XP events (kills, exploration, objectives, etc.)
- XP events are deterministic and logged

---

## Data Models (Rules Package)

### XP Event
```ts
XPEvent {
  id: string
  amount: number
  source?: string
}

Level Definition

LevelDefinition {
  level: number
  xpRequired: number
  rewards: Reward[]
}

Reward Types

Reward =
  | { type: "AttributePoints", amount: number }
  | { type: "SkillPoints", amount: number }
  | { type: "MaxHP", amount: number }
  | { type: "AbilityUnlock", abilityId: string }
  | { type: "PassiveModifier", modifierId: string }

Progression Config

ProgressionConfig {
  levels: LevelDefinition[]
  attributeCaps?: {
    baseCap: number
    perLevelIncrease?: number
  }
  skillCaps?: Record<string, number>
}


⸻

Runtime Logic Requirements

XP Handling
	•	XP is accumulated per entity
	•	XP gain does NOT auto-level
	•	On crossing a level threshold:
	•	Entity enters a “pending level-up” state
	•	Rewards are queued, not applied

Level-Up Action

Level-up reward allocation must be an explicit action:

LevelUpAction {
  allocations: {
    attributes?: Record<Attribute, number>
    skills?: Record<Skill, number>
  }
}

Invalid allocations must be rejected deterministically.

⸻

Determinism Rules
	•	No floating point randomness
	•	Reward choices must be part of the action log
	•	Random rewards (if any) must use seeded RNG
	•	Replays must reconstruct identical progression

⸻

Editor Requirements (Client Package)

Experience / Progression Editor

The editor must allow designers to configure:

1. XP Curve
	•	XP required per level
	•	Unlimited levels
	•	Nonlinear progression allowed

2. Level Rewards
	•	Rewards per level
	•	Multiple reward types per level
	•	Fixed rewards only (no logic in editor)

3. Attribute Rules
	•	Starting values
	•	Caps
	•	Per-level increases

4. Skill Rules
	•	Available skills
	•	Caps
	•	Optional XP-per-use flags (future-proofing)

⸻

Editor UX Requirements
	•	Table-based level editor
	•	Inline reward editing
	•	Validation (no negative XP, no invalid rewards)
	•	JSON preview of final config
	•	Save to Mod / Content Registry

⸻

Integration Points
	•	@roguewar/rules
	•	XP accumulation
	•	Level detection
	•	Reward validation
	•	Deterministic application
	•	@roguewar/authority
	•	Enforce level-up actions
	•	Reject invalid reward allocations
	•	@roguewar/client
	•	Editor UI
	•	Level-up allocation UI
	•	Visual feedback on progression

⸻

Non-Goals (DO NOT IMPLEMENT)
	•	No traditional classes
	•	No implicit stat increases
	•	No hardcoded XP formulas
	•	No UI styling polish beyond functional UI

⸻

Acceptance Criteria
	•	A designer can fully redefine progression without touching code
	•	Two identical games with the same actions produce identical progression
	•	Players can build radically different characters without class selection
	•	Replays and multiplayer remain perfectly deterministic

⸻

Deliverables
	1.	Type definitions in @roguewar/rules
	2.	XP + level-up engine logic
	3.	Reward allocation validation
	4.	Progression editor UI
	5.	Example progression config (Level 1–10)
