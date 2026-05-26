# RosterBate 3-Point Contest Design

Date: 2026-05-02
Status: Draft for review

## Goal

Build a first-person NBA-style 3-point contest inside RosterBate. The first release should be a hidden standalone/dev page that proves the core game feel before it becomes a league event or player-card launch.

The game should feel like an event, not a dashboard: a stylized RosterBate arcade court, a readable 2D shot meter, fast rack rhythm, satisfying ball flight, and player identity that matters without overpowering user timing.

## Locked Direction

- Shell: hidden standalone page first, with future season/player-card launch hooks.
- Rendering: 3D court, hoop, ball, and racks with a 2D HUD overlay.
- Visual style: RosterBate Arcade, using event lighting, strong contrast, and orange/teal energy.
- Camera: clean first-person shooter reticle first. No visible hands in the first playable version.
- Meter: one sweeping bottom bar with three space/click/tap inputs: start, distance, aim.
- Rules: modern NBA-style 3-point contest with 5 racks, one money rack, two deep bonus balls, and a 70-second clock.
- Player effect: user timing matters most, but shooter ratings slightly widen green/good windows or improve forgiveness.
- Make model: perfect green releases always go in; near-perfect releases use rating/context variance; poor releases miss.
- Mode: solo score attack first, with bracket-ready data structures for future CPU opponents and finals.
- Player picker: curated default shooter list, structured so a season player can be injected later.
- Shot feedback: quick realistic arc, roughly 0.8-1.1 seconds, with immediate make/miss and score tile feedback.

## First Playable Vertical Slice

The first implementation should prove one polished slice before expanding:

- One curated shooter.
- One rack with five balls.
- 3D hoop/court/rack/ball visible from a first-person reticle view.
- One sweeping bottom shot meter.
- Three input phases: start, distance, aim.
- Ball launch and make/miss resolution.
- Score feedback and rack progress.

This slice should use the final architecture shape, even if it only exercises one rack. Once the slice feels good, expand to all racks, money rack selection, deep balls, full timer, and leaderboard.

## Gameplay Model

Each shot has:

- `rackId`
- `rackSpot`: corner, wing, top, wing, corner, or deep bonus
- `ballType`: standard, money, allMoneyRack, deep
- `input`: start timing, distance timing, aim timing
- `releaseGrade`: green, good, late, early, left, right, miss
- `ratingContext`: shooter three-point rating, clutch/focus modifiers, hot streak
- `result`: made/missed, score value, feedback text

Shot quality should be computed deterministically from the three input timings, then passed through a small variance layer only for non-green good releases. Green releases remain guaranteed makes.

## Data Model

The contest should be data-driven:

- `contestConfig`: timer length, racks, score values, meter tuning.
- `shooterProfile`: id, name, team, portrait, ratings, preferred zones.
- `contestRun`: selected shooter, rack states, shots, score, clock, completion state.
- `contestResult`: final score, makes, money balls, deep balls, streaks, grade summary.

This keeps solo score attack compatible with future bracket mode, league All-Star events, and player detail launches.

## UI And HUD

The HUD should prioritize playability:

- Bottom: sweeping shot meter with colored zones and phase labels.
- Left or lower-left: current rack, score, round, and made/missed balls.
- Top/center: compact timing feedback such as Green, Good, Short, Long, Left, Right.
- Right or lower-right: time remaining and balls left.
- In-world: rack, hoop, ball flight, rim/net feedback.

Avoid instructional paragraphs in the game screen. The first view should be playable, not a landing page.

## Input

Desktop keyboard is the premium feel:

- Space press 1: start/gather.
- Space press 2: lock distance.
- Space press 3: lock aim/release.

Click/tap should call the same input handler, so the game remains browser-friendly and can later support touch.

## Future Expansion

After the vertical slice:

- Full modern contest round.
- Money rack selection.
- Two deep bonus shots.
- Curated shooter picker.
- Practice mode.
- CPU opponent simulation.
- Finals/bracket mode.
- Player-card launch.
- Season All-Star event launch.
- League memory entry for contest winner and notable scores.

## Testing Strategy

Start with pure logic tests:

- Meter phase transitions.
- Shot quality and make probability.
- Rack scoring rules.
- Timer and completion state.
- Player rating influence.

Then add browser tests:

- Page boots without console errors.
- Space/click input advances shot phases.
- A complete rack can be played.
- Score and rack UI update.
- Canvas/WebGL scene is nonblank.

## Open Review Points

- Confirm whether deep bonus balls should be included in the first full contest after the one-rack slice.
- Decide the first curated shooter list.
- Decide whether the hidden route should be `three-point-contest.html` or a broader mini-games route.
- Decide whether first implementation can use Three.js from CDN/local vendor or should stay dependency-free until the vertical slice proves itself.
