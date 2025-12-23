Roguewar — Phase 8

Spectators, Replays, and Asynchronous Viewing

Purpose

Enable read-only participation in Roguewar through:
	•	Live spectators (when possible)
	•	Asynchronous replay viewing
	•	Turn-by-turn inspection and sharing

This phase builds on Phase 6 (deterministic history) and Phase 7 (mods) to allow games to be observed without influencing outcomes.

⸻

Non-Negotiable Constraints
	•	❌ No backend services
	•	❌ No authoritative input from spectators
	•	❌ No modification of game state
	•	✔ Static hosting compatible (github.io)
	•	✔ Deterministic replay preserved
	•	✔ TypeScript only

Spectators are never players.

⸻

Core Principle

Spectators see truth, never create it.

All spectator views are derived from existing authoritative history.

⸻

Spectator Modes

1. Asynchronous Replay Viewer (Primary)
	•	Load a saved GameLog
	•	Reconstruct the game deterministically
	•	Navigate freely:
	•	Play
	•	Pause
	•	Step
	•	Fast-forward
	•	Jump to turn

This mode requires no live connection.

⸻

2. Live Spectator (Optional, Best-Effort)
	•	Spectator connects to the host
	•	Receives TurnDeltas only
	•	No action submission channel

Failure or disconnect does not affect the game.

⸻

Replay Viewer Architecture

/replay
  loader.ts        ← load GameLog
  engine.ts        ← deterministic replayer
  controls.ts      ← timeline controls
  renderer/        ← reuse client renderer

Replay engine must reuse:
	•	Rules engine
	•	Mod loader
	•	RNG logic

⸻

Timeline Model

Replay timeline is:
	•	Discrete (turn-based)
	•	Indexed by turn number

Provide:
	•	Absolute seek
	•	Relative step
	•	Speed multiplier

No interpolation required.

⸻

Data Sources

Replay viewer must support:
	•	Local file upload (JSON)
	•	IndexedDB save selection
	•	URL-encoded logs (optional, size-limited)

No cloud hosting required.

⸻

Integrity & Verification
	•	Verify:
	•	Rules version
	•	Mod hashes
	•	Content versions

Mismatch results in:
	•	Warning banner
	•	Read-only degraded mode

⸻

Privacy Model
	•	Replays contain:
	•	Actions
	•	Outcomes

They must not contain:
	•	Personal identifiers
	•	Network metadata

⸻

UI Requirements
	•	Timeline scrubber
	•	Turn list
	•	Entity inspection
	•	Optional fog-of-war toggle (if allowed by rules)

Spectator UI must not expose hidden information unless explicitly configured.

⸻

Multiplayer Considerations
	•	Spectators do not count as peers
	•	Host may limit spectator count
	•	Spectators receive only committed turns

No rollback or prediction.

⸻

Explicit Non-Goals
	•	Chat moderation
	•	Live commentary tools
	•	Streaming integration
	•	Monetization

⸻

Required Deliverables
	•	Replay viewer UI
	•	Deterministic replay engine
	•	Log validation
	•	Spectator-safe renderer mode

⸻

Acceptance Criteria

✔ Replays load and play correctly
✔ Replay outcome matches original
✔ Spectators cannot influence state
✔ Viewer works entirely offline
✔ Mods and rules are respected

⸻

Guiding Principle

If a game can be replayed, it can be understood.

Phase 8 turns Roguewar from something you play into something you can study.

Phase 8 is now fully defined and available as a Markdown prompt in the canvas.

Why Phase 8 matters more than it looks

This phase quietly completes the triangle:
	•	Phase 6 → the game is recordable
	•	Phase 7 → the game is extensible
	•	Phase 8 → the game is observable

Once you can watch a game without touching it, you’ve:
	•	Proven determinism end-to-end
	•	Separated presentation from authority
	•	Made balance, AI, and design review practical

This is also the phase that makes Roguewar feel serious rather than experimental.

Strong signals Phase 8 is correct

You should be able to:
	•	Email someone a replay file and they can watch it offline
	•	Step through a turn and explain exactly why it resolved that way
	•	Replay an old game even after adding new mods (with warnings)
	•	Observe a live game without affecting it

