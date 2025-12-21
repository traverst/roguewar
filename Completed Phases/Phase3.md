Below is a Phase 3 AI prompt that is intentionally authoritative, minimal, and hostile to accidental complexity.

Phase 3 is where most projects accidentally build a “backend game server”.
This prompt is written to prevent that.

⸻

Phase 3 — Serverless Authoritative Core (AI Prompt)

You are implementing **Phase 3** of the game **Roguewar**.

Phase 2 produced a shared, deterministic **rules package** that defines all authoritative gameplay logic.

Your task in Phase 3 is to build the **minimal serverless authoritative core** that:
- Accepts player action *intents*
- Validates and resolves them using the shared rules
- Maintains authoritative game state
- Broadcasts state deltas to connected clients

This is **not** a traditional game server.

---

## 1. Primary Goal

Create a **serverless authority** that enforces the game rules with:
- Zero idle cost
- Pay-per-action execution
- One authoritative instance per dungeon/match
- Deterministic outcomes

---

## 2. Hard Constraints (Do Not Violate)

- Language: **TypeScript**
- Use the **shared rules package verbatim**
- No rendering logic
- No animation logic
- No client-side assumptions
- No real-time simulation loops
- No background jobs
- No polling
- No mutable global state outside the dungeon instance

The authority must act **only in response to player actions**.

---

## 3. Execution Model

Each dungeon/match is represented by **exactly one authoritative instance**.

This instance:
- Owns the canonical game state
- Processes actions sequentially
- Is the sole owner of the RNG seed

Examples of acceptable implementations:
- Cloudflare Durable Object
- Equivalent single-threaded serverless construct

---

## 4. Responsibilities of the Authority

### A. Connection Management
- Accept WebSocket connections
- Track connected players
- Reject connections to non-existent or closed matches

### B. Action Intake
Accept messages of the form:

```ts
type ActionMessage = {
  playerId: PlayerId;
  action: Action;
};

No client may:
	•	Send multiple actions per turn
	•	Act out of turn
	•	Bypass validation

⸻

C. Validation

Before resolving a turn:
	•	Verify the player exists
	•	Verify it is the player’s turn
	•	Verify the action is legal
	•	Reject invalid actions with explicit errors

⸻

D. Turn Resolution

For a valid action:
	•	Call the shared resolveTurn(...)
	•	Advance the turn counter
	•	Update authoritative state
	•	Record emitted events

⸻

E. Broadcasting Deltas

After resolution:
	•	Broadcast to all connected clients:

type TurnDelta = {
  turn: number;
  events: GameEvent[];
};

The authority never sends full state unless explicitly requested.

⸻

5. State Model

The authoritative instance must store:

type AuthoritativeState = {
  seed: number;
  gameState: GameState;
  connectedPlayers: Set<PlayerId>;
};

State must be:
	•	Private to the instance
	•	Never reconstructed from client data

⸻

6. Determinism Guarantees
	•	The authority is the sole source of randomness
	•	Given the same initial seed and action sequence:
	•	The outcome must be identical
	•	Clients may predict but never decide

⸻

7. Error Handling

Invalid actions must:
	•	Be rejected explicitly
	•	Not mutate state
	•	Not advance the turn

Errors must be deterministic and reproducible.

⸻

8. Explicit Non-Goals (Do NOT Implement)
	•	Authentication systems
	•	Matchmaking
	•	Persistence beyond match lifetime
	•	Replays
	•	Anti-DDoS logic
	•	Rate limiting beyond basic sanity checks
	•	Admin tools

⸻

9. Output Expectations

Produce:
	•	A minimal serverless authoritative implementation
	•	Clear separation between networking and game logic
	•	Strong typing for messages and state
	•	Inline comments explaining invariants
	•	No dead code

The result must be deployable and usable by multiple browser clients concurrently.

⸻

10. Design Philosophy

This authority is:
	•	A referee, not a simulator
	•	Deterministic, boring, and strict
	•	Easy to reason about
	•	Cheap to run

If logic does not protect fairness or correctness, it does not belong here.

Begin by explaining the authority lifecycle, then provide the implementation.

---

## Why Phase 3 Is a Line You Do Not Cross

Once Phase 3 exists:
- Cheating becomes bounded
- PvP becomes possible
- State becomes canonical
- Clients become interchangeable

If you add *anything* extra here, you will pay for it later.

---
