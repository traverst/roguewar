Roguewar — Phase 6

Persistence, Replay, and Deterministic History

Purpose

Introduce save/load, replay, and historical inspection without breaking determinism, authority boundaries, or static-hosting constraints.

Phase 6 makes every game:
	•	Serializable
	•	Replayable
	•	Auditable
	•	Debuggable

This phase is foundational for balance, AI iteration, and future multiplayer hardening.

⸻

Non-Negotiable Constraints
	•	❌ No backend services
	•	❌ No databases
	•	❌ No server-side storage
	•	✔ Static hosting compatible (github.io)
	•	✔ Deterministic rules and AI
	•	✔ TypeScript only

Persistence must be client-side only.

⸻

Core Principle

The game is a log, not a snapshot.

Canonical history is the ordered sequence of validated actions and deltas, not mutable state dumps.

⸻

What Must Be Persisted

Required
	1.	Initial game configuration
	•	Dungeon seed
	•	RNG seed
	•	Player roster (human + AI)
	2.	Turn history
	•	Ordered ActionIntents or TurnDeltas
	3.	Version metadata
	•	Rules version
	•	Content version

⸻

What Must NOT Be Persisted
	•	Live mutable GameState
	•	Render state
	•	UI state
	•	Derived caches

All state must be reconstructible by replay.

⸻

Persistence Targets

Local Storage Options
	•	IndexedDB (preferred)
	•	localStorage (small demos only)
	•	Downloadable JSON log file

No cloud sync in this phase.

⸻

Replay Engine

Replay Modes
	•	Full replay — from turn 0
	•	Fast-forward — skip rendering
	•	Step-through — turn-by-turn inspection

Replay must:
	•	Use the same rules engine
	•	Use the same RNG seed
	•	Produce identical outcomes

⸻

History Format

Example:

interface GameLog {
  meta: {
    gameId: string
    createdAt: number
    rulesVersion: string
    contentVersion: string
  }
  initialConfig: GameConfig
  turns: TurnRecord[]
}

Where TurnRecord contains:
	•	Turn number
	•	Player intents
	•	Resulting authoritative delta

⸻

Authority Interaction
	•	Host appends to the log after each resolved turn
	•	Peers may store copies but do not author history
	•	Log is append-only

No retroactive edits.

⸻

Save / Load Flow

Save
	•	Serialize GameLog
	•	Persist to IndexedDB
	•	Optionally export as JSON

Load
	•	Load log
	•	Rebuild initial state
	•	Replay deterministically
	•	Resume from last completed turn

⸻

Debug & Inspection Tools

Add developer tooling:
	•	View turn list
	•	Inspect deltas
	•	Compare state hashes per turn

This tooling is optional for players but mandatory for developers.

⸻

Multiplayer Considerations
	•	Host log is canonical
	•	Peers may verify determinism via state hashes
	•	Desync detection is informational only

No dispute resolution in this phase.

⸻

Failure Model
	•	Corrupt log → replay aborts
	•	Version mismatch → warn, do not auto-upgrade
	•	Partial log → resume only from last valid turn

⸻

Required Deliverables
	•	Game log schema
	•	Deterministic replay engine
	•	Save/load UI
	•	Headless replay mode

⸻

Explicit Non-Goals
	•	Cloud persistence
	•	Cross-device sync
	•	Cheating detection
	•	Spectator streaming

⸻

Acceptance Criteria

✔ Game can be saved mid-run
✔ Game can be fully replayed
✔ Replay outcome matches original
✔ AI behavior is identical on replay
✔ No backend dependencies

⸻

Guiding Principle

If you cannot replay it, you do not understand it.

Phase 6 exists to make the system explain itself.

Phase 6 is now ready and written as a strict, architecture-preserving Markdown prompt in the canvas.

Why Phase 6 is a big deal

This is the phase that:
	•	Proves your determinism is real
	•	Makes AI development sane
	•	Turns debugging from guesswork into science
	•	Quietly future-proofs PvP, analytics, and balance work

If Phase 6 is done correctly, Roguewar becomes:
	•	Explainable
	•	Replayable
	•	Testable
	•	Trustable (within the chosen model)

Strong signals Phase 6 is correct

You should be able to:
	•	Delete all live state and rebuild purely from a log
	•	Run headless replays faster than real time
	•	Diff two replays by comparing turn hashes
	•	Reproduce AI bugs exactly

