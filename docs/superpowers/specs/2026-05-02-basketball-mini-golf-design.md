# Basketball Mini Golf Design

Date: 2026-05-02
Status: Draft approved visually, pending written-spec review

## Goal

Turn the current 3-point contest prototype into a new RosterBate mini-game direction: a basketball mini-golf trick-shot course.

The game should feel like mini golf in structure, but basketball in execution. The player moves course to course, aims a shot route, uses a PangYa-style timing meter, and watches the ball fly, bounce, bank, spin, and drop into a real hoop.

## Chosen Direction

- Mode: Mini Golf Hoops
- Camera: hybrid behind-the-ball shot lane with a mini-map
- Shot behavior: full basketball arc shots, not a rolling ground-cup finish
- First milestone: three-hole mini course
- Control loop: aim route first, then use the timing meter
- Special shots: selectable shot cards first, combo/elite versions later

## Core Fantasy

Each hole is a basketball trick-shot puzzle.

The player stands behind the ball and sees the hoop, course obstacles, and a projected ghost route. The player chooses a shot type, aims the path, then uses the existing meter concept:

1. Press to start the meter.
2. Press near the right end for distance/power.
3. Press on the left-side return window for aim/accuracy.
4. Watch the ball resolve through arc, spin, bounce, bank, and rim physics.

The hole ends when the shot goes through the hoop. Score is based on strokes against par, like mini golf.

## First Playable Slice

Build a hidden standalone local page beside the current 3-point page:

- `basketball-golf.html`
- `basketball-golf-core.js`
- `basketball-golf-renderer.js`
- `basketball-golf.js`

The first playable slice should include three holes:

### Hole 1: Starter Arc

Purpose: teach aim route, distance timing, aim timing, and swish feedback.

- Simple clear lane
- One visible hoop
- One default Lob shot
- Forgiving par

### Hole 2: Bank Lane

Purpose: introduce angled geometry and route choice.

- Hoop is not best approached directly
- One angled bank wall/backboard surface
- Bank shot card becomes valuable

### Hole 3: Bounce And Spin Lane

Purpose: prove the game can be more than a simple arc shooter.

- Bounce or low arc route
- One floor bounce target or obstacle
- Bounce and Spin cards become valuable

## Controls

Keyboard and click/tap should both work.

Baseline loop:

1. Select shot card: Lob, Bounce, Bank, or Spin.
2. Aim route: left/right or pointer drag adjusts route angle.
3. Start shot meter.
4. Lock distance near the right-end target.
5. Lock aim on the left-side return target.
6. Resolve shot.

The current meter direction remains:

- Distance target lives near the far right end.
- Aim target lives near the left return window.
- The center of the left aim window is perfect.
- Left/right bars in that aim window indicate miss direction.

## Shot Cards

First version shot cards should be explicit and readable:

- Lob: high arc, best for clearing hazards and dropping into the hoop.
- Bounce: lower arc, can hit the floor and rise toward the hoop.
- Bank: prioritizes rebound off wall/backboard-like surfaces.
- Spin: adds side or backspin influence to curve/drop after bounce or rim contact.

Each shot card should affect the projected ghost route and the final physics result. The player should understand why a shot missed: too long, too short, left, right, bad angle, too much speed, or wrong shot type.

## Special Shot Progression

The PangYa special-shot idea should inspire a later layer, not block the first playable slice.

Phase 1:

- Shot cards are selected directly.
- The meter determines quality.
- Great timing improves trajectory consistency.

Phase 2:

- Add combo or elite versions of shot cards.
- Examples:
  - Perfect Lob: extra-high drop arc.
  - Power Bounce: stronger floor bounce with less speed loss.
  - Snap Bank: sharper wall angle.
  - Backspin Drop: lands soft after rim/backboard contact.
  - Sidespin Curve: curves around an obstacle.

Phase 3:

- Optional PangYa-style directional combos during the meter return.
- These should be secrets/mastery tools, not required for early holes.

Reference inspiration: StrategyWiki's PangYa special shots page describes named shot types, power-shot layering, spin/curve controls, and combo-style execution. RosterBate should use the structure of that idea, translated into basketball trick-shot language.

## Physics Model

The first version should be deterministic and tunable rather than fully realistic.

Core data should be pure and testable:

- Course definition
- Hole geometry
- Shot card parameters
- Aim angle
- Distance input
- Aim input
- Rating/timing modifiers
- Resolved shot result

Renderer physics can be stylized:

- Arc path interpolation for Lob
- Bounce point interpolation for Bounce
- Bank wall reflection for Bank
- Curve/drop modifier for Spin
- Hoop success zone based on final path, speed, and angle

The important thing is that the result feels readable. The player should be able to see why the ball did what it did.

## UI Layout

The page should remain game-first, not dashboard-like.

Primary view:

- Behind-the-ball 3D shot lane
- Hoop visible ahead
- Ghost route overlay
- Mini-map in a corner
- Shot cards near the bottom
- PangYa-style meter below or above the shot cards
- Hole number, par, strokes, and course progress in a compact HUD

Avoid explanatory panels in the play surface. The course, ghost path, and feedback text should teach through play.

## Data Shapes

Suggested entities:

- `basketballGolfCourse`
  - `id`
  - `title`
  - `holes`

- `basketballGolfHole`
  - `id`
  - `number`
  - `par`
  - `tee`
  - `hoop`
  - `obstacles`
  - `recommendedShotTypes`

- `shotCard`
  - `id`
  - `label`
  - `trajectory`
  - `powerMultiplier`
  - `spinProfile`
  - `bounceProfile`
  - `bankProfile`

- `shotInput`
  - `shotCardId`
  - `aimAngle`
  - `distance`
  - `aim`
  - `combo`

- `holeRun`
  - `holeId`
  - `strokes`
  - `shots`
  - `completed`

- `courseRun`
  - `courseId`
  - `currentHoleIndex`
  - `holeRuns`
  - `totalStrokes`
  - `completed`

## Tests

Add pure core tests first:

- Creates a three-hole course.
- Starts at hole 1 and advances hole to hole.
- Applies a made shot and completes a hole.
- Tracks strokes and total score.
- Grades distance and aim inputs through the meter mapping.
- Shot cards produce distinct trajectory descriptors.
- Bounce, bank, and spin card outputs are deterministic for the same inputs.

Add browser tests after the shell exists:

- Page boots and canvas is nonblank.
- Shot cards render.
- Mini-map renders.
- Meter renders with distance right and aim left.
- One ideal Lob can complete hole 1.
- Advancing from hole 1 to hole 2 updates HUD and scene.
- Three-hole run can complete with controlled ideal inputs.

## Out Of Scope For First Slice

- Full nine-hole course
- Online leaderboard
- Season integration
- Unlock economy
- Player-specific skill trees
- CPU opponents
- Full physics engine replacement
- Hidden combo inputs required for success

## Follow-Up Expansion

After the three-hole slice feels good:

- Add a nine-hole course map.
- Add named themed courses.
- Add elite combo versions of shot cards.
- Tie shot-card strengths to player attributes.
- Add course records and league memories.
- Add All-Star weekend or arcade hub integration.

## Implementation Defaults

Use these defaults for the first implementation plan:

- Route: create `basketball-golf.html` beside `three-point-contest.html`; do not replace the 3-point prototype yet.
- Ratings: ignore player ratings in the first slice except for future-ready fields. The first version should prove game feel before attribute tuning.
- Stroke cap: use an 8-stroke cap per hole, then mark the hole complete at `par + 5`.
- Shot cards: show all four cards from the start, but visually recommend Lob on hole 1, Bank on hole 2, and Bounce/Spin on hole 3.
- Combo specials: do not implement combo inputs in the first slice. Keep the data model compatible with adding them later.
