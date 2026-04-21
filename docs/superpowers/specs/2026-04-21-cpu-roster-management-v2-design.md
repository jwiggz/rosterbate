# CPU Roster-Management V2 Design

Date: 2026-04-21
Owner: Codex
Status: Draft for review

## Goal
Improve simulation-universe CPU roster-management so waiver adds and cleanup drops reflect broader roster need, not just day-of legality, while keeping churn conservative.

## Why now
Recent shipped work already covers:
- CPU sim lineups with a core-plus-flex policy
- lineup-only CPU personalities
- simulation-universe IL / activation handling
- conservative dead-spot cleanup
- latest sim-day visibility in Universe Details

The next trust gap is roster quality over time. CPU teams can now keep legal rosters, but they still decide too many waiver moves from a narrow day-of view. V2 should make them look more like believable fantasy managers without turning them into streamers.

## Scope
This pass is limited to simulation-universe CPU waiver / cleanup behavior.

In scope:
- smarter waiver add scoring for starter-emergency fills
- broader season-usefulness scoring for conservative cleanup moves
- modest versatility bonus in close add decisions
- drop-side protection for valuable bench assets
- drop-side protection for scarce position and role coverage

Out of scope:
- human teams
- non-simulation leagues
- trades
- FAAB / commissioner settings
- personality-led roster management
- proactive daily streaming of healthy bench players
- long-horizon stash logic

## Recommended approach
Use layered conservative scoring inside the existing CPU roster-maintenance seam.

Why this approach:
- preserves the shipped two-phase flow
- keeps emergency starter legality as the first priority
- improves cleanup quality without expanding into hyperactive churn
- is easier to reason about than a single unified waiver formula

Rejected alternatives:
- one unified waiver score for all cases: simpler, but blurs emergency and season-shape intent
- personality-forward waiver logic: too early; personality should remain a tie-breaker later, not the main engine now

## Design

### 1. Keep the current maintenance flow
Inside `maintainCpuTeamRoster(...)` in `rosterbate-season.html`, preserve the current high-level order:
1. IL / activation maintenance
2. lineup normalization
3. starter-needs waiver fill
4. dead-spot cleanup waiver pass
5. final lineup normalization

V2 changes the waiver scoring logic inside steps 3 and 4, not the top-level orchestration.

### 2. Introduce a light roster-need summary
Add a small helper near the waiver seam that summarizes the CPU team roster shape for the current day.

The summary should capture:
- position coverage need
  - whether the roster is thin at `G`, `F`, or `C`
  - whether the current active/starter shape is overexposed at one position while thin elsewhere
- role-shape need
  - light signals only:
    - scoring
    - playmaking
    - rebounding
    - defense
- versatility context
  - whether a candidate can cover multiple roster slots or broad team needs

This helper should stay intentionally simple and readable. It is not a second ranking engine.

### 3. Upgrade starter-fill add scoring
Keep starter-fill moves focused on "who helps today," but add a small broader-usefulness layer.

Starter-fill scoring should still strongly value:
- availability today
- position fit for the missing starter slot
- present-day usefulness

V2 adds smaller bumps for:
- thin-position help
- light role-shape need
- modest versatility

Intended behavior:
- emergencies still feel practical and day-aware
- but CPUs stop choosing obviously worse emergency pieces when two candidates are close and one is clearly more useful to the roster beyond today

### 4. Upgrade cleanup add scoring toward season usefulness
Cleanup moves should stay conservative and only happen after lineup legality is restored.

Cleanup add scoring should primarily value:
- healthy / available status
- broader usefulness to current roster shape
- thin-position coverage
- light role-shape need coverage
- modest versatility

Cleanup should not become a "best raw player on waivers" pass. It remains a constrained replacement path for obvious dead spots.

### 5. Add real drop-side protection
Cleanup drop scoring should protect two kinds of bench assets:
- clearly valuable bench players
- scarce roster coverage, even when raw value is only moderate

Protection inputs:
- player current value
- position scarcity on this roster
- role-shape scarcity on this roster
- modest versatility support

Intended behavior:
- CPU teams stop dropping useful or scarce bench coverage just because a decent waiver add exists
- but clearly dead or replaceable bench spots can still be cleaned up

### 6. Keep churn conservative
V2 must preserve the existing conservative roster-management posture.

Rules:
- no proactive churn when the roster is already healthy and coherent
- no daily streaming of healthy bench players for marginal gains
- cleanup moves still require a clear upgrade margin
- lineup legality remains more important than cleanup quality

### 7. Personality stays out of scope for now
This pass should not make personality a first-class roster-management engine.

Reason:
- the base roster logic still has more leverage than flavor tie-breakers
- keeping personality out of the first v2 pass keeps the behavior easier to reason about

A later v2.5/v3 can use `star_loyalist`, `steady_floor`, `bigs_bias`, and `guards_bias` as tie-breakers after the core heuristics are stable.

## Files likely touched
- `rosterbate-season.html`
- `tools/test-cpu-sim-waiver-maintenance.js`

## Verification

### Focused regression
Extend `tools/test-cpu-sim-waiver-maintenance.js` to prove:
- emergency starter fills still prioritize usable-today players
- cleanup moves can favor broader season usefulness when no emergency exists
- a versatile candidate can win a close cleanup add decision
- scarce position coverage on the bench protects a drop candidate
- scarce role-shape coverage on the bench protects a drop candidate
- a clearly more valuable bench player is not dropped for a merely decent waiver add

### Scope regression
Confirm the behavior remains:
- simulation-universe only
- CPU-team only
- non-simulation leagues unchanged
- human teams unchanged

### Manual sanity
Short simulation-universe inspection should show:
- better-fit waiver adds when a roster is thin
- fewer weird bench drops
- no hyperactive streaming behavior

## Success criteria
This pass is successful if:
- CPU teams make waiver choices that better match roster need
- useful or scarce bench assets are dropped less often
- cleanup remains conservative
- no scope or legality regressions are introduced

## Risks
Main risks:
- overcomplicating the heuristic until it becomes opaque
- accidentally shifting cleanup into proactive optimization
- making drop protection so strong that dead-spot cleanup stops working

Mitigations:
- keep role-shape signals light
- keep upgrade thresholds meaningful
- keep all changes inside the existing maintenance seam

## Follow-up after this pass
If this works, the next likely CPU roster-management step should be one of:
- personality-based tie-breakers for waiver decisions
- deeper asset-protection logic for OUT-but-valuable bench pieces
- richer simulation activity/history surfaces to explain why CPU teams made certain moves
