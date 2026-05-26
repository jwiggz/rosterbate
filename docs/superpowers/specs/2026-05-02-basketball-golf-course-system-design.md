# Basketball Golf Course System Design

Date: 2026-05-02
Status: Direction approved, local note only

## Goal

Pivot the Basketball Golf prototype away from a basketball half-court and toward a mini-golf course game with basketball finishing. The bottom timing bar and real rim/backboard stay. The court paint, three-point arc, and standard basketball floor markings should disappear.

The next slice should make the game feel like: "mini golf lanes, ramps, rails, and obstacles, ending in a basketball hoop."

## Reference Takeaways

The Golf With Your Friends reference points to a course-first experience:

- Each hole is readable from behind the ball.
- Course geometry communicates the puzzle before the player shoots.
- Rails, ramps, walls, gaps, and themed surfaces create variety.
- The player learns where to aim and how hard to hit, then tries to beat par.

The implementation workflow reference points to a small, controlled build:

- Plan the slice before changing behavior.
- Keep feature data in clear config boundaries.
- Implement a complete small slice instead of a sprawling system.
- Use browser QA and tests to catch game-feel regressions quickly.

## Approved Approach

Use a course-system slice.

Create a data-driven course layer in `basketball-golf-courses.js`, where each hole defines:

- tee position
- hoop and backboard position
- camera framing
- terrain/lane pieces
- rails and walls
- ramps
- bounce pads
- hazards or gaps
- recommended shot cards
- par and label text

The renderer should stop drawing a generic basketball court. Instead, it should loop over the active hole's course pieces and draw the playable mini-golf layout. The hoop remains a basketball rim with a backboard, placed as the finish target for the hole.

## First Course Slice

Build or refactor toward three mini-golf-style holes:

1. Starter Lane
   - Straight turf/checker lane.
   - Low side rails.
   - Rim/backboard visible at the far end.
   - Teaches power and aim with a forgiving path.

2. Bank Lane
   - Angled wall or rail structure.
   - Direct shot is not ideal.
   - Bank shot card should feel useful.

3. Ramp And Bounce Lane
   - Elevated or sloped ramp surface.
   - Bounce pad or ground-skip cue.
   - Bounce/lob shot cards become meaningful.

## Shot Feel

Keep the current three-press meter:

1. Press to start.
2. Press near the right end for distance.
3. Press on the left return window for aim.

For now, keep shot outcomes deterministic and testable rather than introducing a full physics engine. The ball can still animate with arcs, banks, bounces, and spin, but the core should resolve shots from known inputs and hole data.

## Visual Direction

The page should read as a stylized mini-golf course:

- turf/checker textures or colored course panels
- raised rails
- ramps and walls
- clean target flags or hoop markers
- course map instead of court map
- no paint, no three-point line, no lane rectangle

Basketball identity should come from the ball, rim, backboard, shot types, and fantasy sports styling, not from a standard court.

## Implementation Boundaries

Keep the work scoped to the standalone Basketball Golf files:

- `basketball-golf.html`
- `basketball-golf.js`
- `basketball-golf-core.js`
- `basketball-golf-renderer.js`
- `basketball-golf-courses.js`
- Basketball Golf tests under `tools/`

Avoid touching roster, trade, season, portrait, or live simulation code.

## Verification

Run focused local checks:

- Core tests for course config and shot resolution.
- Shell/browser tests that the standalone page loads.
- Playwright QA that confirms:
  - no court paint or three-point/paint lines are visible
  - rim and backboard are visible
  - bottom meter still advances through distance and aim
  - a shot animates and advances hole state
  - mini-map does not overlap controls

Then do a local browser pass for feel: the first screen should look like a mini-golf hole with a basketball hoop, not like a basketball court.
