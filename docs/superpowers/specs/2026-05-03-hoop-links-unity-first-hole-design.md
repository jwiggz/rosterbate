# Hoop Links Unity First Hole Design

Date: 2026-05-03

## Summary

Build the first standalone Windows Unity prototype slice for Hoop Links: one polished mini-golf-style basketball hole. The hole is a wall-bank puzzle where the player uses a side wall or rail to redirect the ball toward a real rim and backboard target.

The goal is not a full course yet. The goal is to prove the core game feel: aim, power, ball launch, wall banking, rim/backboard scale, scoring, and fast reset.

## Product Direction

Hoop Links is basketball mini golf. It should not feel like a standard court shooting drill. The first hole should communicate the game immediately:

- Mini-golf lane with turf, walls, rails, and a deliberate route.
- Basketball hoop as the destination, not a golf cup.
- Bank-shot route as the intended solution.
- Quick retries so misses feel playful instead of punishing.

## First Hole

The first playable hole is a Wall Bank Puzzle.

The player starts behind a basketball on a tee pad. The hoop sits at the far end. A direct shot is possible but not ideal. The clearer route is to aim into a side wall or rail, bounce the ball back into the lane, and send it toward the hoop.

The lane should include:

- A visible tee pad and ball start point.
- A side bank wall/rail that is obviously useful.
- Raised rails along the lane to read as mini-golf.
- A real hoop assembly with pole, backboard, rim, and open center.
- A reset/fail boundary around or below the lane.

## Controls

First slice controls stay simple:

- Aim rotates a projected arrow or guide from the ball.
- Player launches with a power input.
- The ball is locked while a shot is live.
- Missed or stalled shots can reset to the tee.

The exact input mapping can be simple for the prototype, such as keyboard left/right for aim and space for power. The design should not depend on a final input scheme.

## Core Systems

### HoleDefinition

Stores the data for one hole:

- Hole name.
- Par.
- Tee position.
- Hoop position.
- Camera framing.
- Reset bounds.
- Recommended shot route metadata for future guides.

This can begin as a ScriptableObject or simple serialized scene component. The important part is that hole data stays separate from shot execution.

### ShotController

Owns player shot input:

- Aim direction.
- Power charge or meter state.
- Launch impulse calculation.
- Input lockout while the ball is live.
- Hook points for later special shots.

### BallController

Owns ball state:

- Rigidbody setup.
- Reset to tee.
- Stop/stall detection.
- Out-of-bounds detection.
- Future spin/special-shot modifiers.

### HoopGoal

Detects made baskets:

- Uses a trigger volume inside or just below the rim.
- Counts only believable makes, preferably downward or rim-entry movement.
- Notifies CourseManager when the shot is made.

### CourseManager

Owns the playable loop:

- Loads or initializes the current hole.
- Tracks strokes.
- Starts and ends shots.
- Resets after miss.
- Marks hole complete after a make.

### PrototypeHUD

Minimal UI:

- Hole name.
- Stroke count.
- Power/meter state.
- Result feedback such as "Made it" or "Try again."

## Physics Feel

Physics should be tuned for clarity and fun before strict realism:

- The ball should bank cleanly from the wall without feeling random.
- The rim and backboard should create believable near-misses.
- The ball should not roll forever.
- Reset should happen quickly if the shot stalls, falls out, or leaves bounds.
- Gravity, bounce, drag, and surface materials can be adjusted aggressively to support readable gameplay.

The first slice does not need full special-shot mechanics, but code boundaries should leave space for spin or shot cards later.

## Hoop Visual Requirement

The rim must look like a real open hoop. It should not be a flat disk or vertical circle with a filled center.

Acceptable first-slice approaches:

- A torus-like mesh for the visible rim.
- A ring made from small primitive segments.
- Approximate colliders arranged around the rim.
- A separate trigger volume for scoring.

The visual requirement matters more than perfect collider fidelity in the first pass.

## Camera

The camera starts behind and above the ball, looking down the lane toward the bank wall and hoop.

The player should always understand:

- Where the ball is.
- Where the bank wall is.
- Where the hoop is.
- What direction the shot guide points.

The first version can use a fixed camera. Follow cameras, cinematic replays, and alternate views are future work.

## Testing And QA

Prototype verification:

- Unity compiles with no console errors from project scripts.
- The active scene contains one playable hole.
- The ball launches from the tee.
- The ball can bank off the wall.
- The ball can score through the hoop.
- Misses can reset.
- The rim visually has an open center.
- The camera frames the playable lane.

Optional verification after the loop works:

- Create a local Windows build.
- Run a short play session outside the editor.

## Out Of Scope

The first slice does not include:

- Multiple holes.
- Course select.
- Player avatars.
- Fantasy website integration.
- Leaderboards.
- Unlock economy.
- Full special-shot UI.
- Multiplayer.
- Advanced shot cards.

## Implementation Notes

The Unity project lives at:

`C:\Users\jabro\Desktop\Fantasy Project\HoopLinksUnity`

MCP Unity is installed and verified. Codex can talk to the Unity editor through the `mcp-unity` tools while the Unity project is open and listening on port `8090`.

The first implementation plan should build in this order:

1. Create/save a dedicated first-hole scene.
2. Add basic lane, rails, bank wall, hoop, ball, and camera.
3. Add the core scripts.
4. Tune physics and scoring.
5. Add the minimal HUD.
6. Run editor QA and adjust feel.
