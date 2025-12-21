Below is a Phase 4 AI prompt that is deliberately UX-focused, client-heavy, and authority-respecting.

Phase 4 is where the game finally feels multiplayer — without breaking any of the invariants you’ve established.

⸻

Phase 4 — Multiplayer Client, Prediction & UX (AI Prompt)

You are implementing **Phase 4** of the game **Roguewar**.

Phase 3 delivered a minimal **serverless authoritative core** that resolves turns and emits deterministic game events.

Your task in Phase 4 is to build the **multiplayer client experience**:
- Connecting to an authoritative instance
- Submitting player actions
- Predicting outcomes locally
- Applying authoritative deltas
- Rendering multiple players coherently

This phase is **client-side heavy** and must not leak authority back to the client.

---

## 1. Primary Goal

Create a multiplayer browser client that:
- Feels responsive
- Remains deterministic
- Obeys server authority
- Gracefully handles latency

---

## 2. Hard Constraints (Do Not Violate)

- Language: **TypeScript**
- Rendering: **HTML5 Canvas**
- All authoritative outcomes come from the server
- The client never resolves combat or RNG
- No game logic duplication beyond prediction
- No full-state trust from the client

---

## 3. Client Responsibilities

### A. Connection Lifecycle
- Connect to a dungeon instance via WebSocket
- Handle join / leave events
- Handle reconnects gracefully
- Maintain a local shadow state

---

### B. Action Submission

When the local player acts:
- Validate input locally (sanity only)
- Submit intent to authority:

```ts
{
  type: "action",
  playerId,
  action
}

	•	Disable further input until resolved

⸻

C. Local Prediction

To maintain responsiveness:
	•	Use the shared rules package to predict outcomes
	•	Mark predicted state as tentative
	•	Render predicted movement immediately

Predicted state:
	•	Must be discardable
	•	Must never permanently mutate canonical state

⸻

D. Authoritative Reconciliation

When a TurnDelta arrives:
	•	Compare with predicted events
	•	If identical: commit silently
	•	If divergent: rollback and reapply authoritative state

Rollback must be:
	•	Deterministic
	•	Invisible to other players
	•	Local only

⸻

4. State Model (Client-Side)

Maintain two layers:

type ClientState = {
  authoritative: GameState;
  predicted?: GameState;
};

Only the authoritative state persists.

⸻

5. Event-Driven Rendering

The renderer must:
	•	React to GameEvents
	•	Animate based on events, not state diffs
	•	Never infer gameplay outcomes

Example:

{ type: "attacked", attackerId, targetId, damage }


⸻

6. Multi-Player Rendering
	•	Render all players and enemies
	•	Distinguish local player visually
	•	Handle concurrent animations cleanly
	•	No camera ownership conflicts

⸻

7. Latency & Failure Handling

The client must handle:
	•	Late deltas
	•	Dropped connections
	•	Reconnect + state resync
	•	Action rejection errors

All failures must fail softly.

⸻

8. Explicit Non-Goals (Do NOT Implement)
	•	Chat
	•	Voice
	•	Matchmaking UI
	•	Accounts
	•	Persistence
	•	PvP rule changes
	•	Anti-cheat logic

⸻

9. Output Expectations

Produce:
	•	Multiplayer-capable client code
	•	Clean separation between:
	•	Networking
	•	Prediction
	•	Rendering
	•	Strong typing for messages
	•	Inline comments explaining reconciliation logic

The result should allow:
	•	Multiple browsers to join the same dungeon
	•	All players to see consistent outcomes
	•	Smooth local interaction despite latency

⸻

10. Design Philosophy

The client is:
	•	Optimistic but humble
	•	Fast but never authoritative
	•	Predictive but rollback-capable

If the client ever “wins an argument” with the server, the design is wrong.

Begin by explaining the client state flow, then provide the implementation.

---

## Why Phase 4 Matters

Phase 4 proves that:
- Your authority design is sound
- Your rules package is truly reusable
- Multiplayer can feel good without real-time simulation

If Phase 4 works cleanly:
- PvP is viable
- Spectators are trivial
- Replays become easy
