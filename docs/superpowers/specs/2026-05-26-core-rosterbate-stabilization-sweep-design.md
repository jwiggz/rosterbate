# Core Rosterbate Stabilization Sweep Design

## Purpose

Stabilize the current core Rosterbate fantasy loop before adding more features. The pass should turn the existing uncommitted player-detail, trade, waiver, and season-shell work into a verified local slice with clear remaining risks.

This is not a redesign and not a broad refactor. The work should fix only reproducible regressions found while exercising the core flows.

## Scope

The stabilization sweep covers four user-facing flows:

1. Player detail
   - Player names should open the detail modal from My Team, Waivers, opponent viewer, and post-action roster states.
   - The detail modal should show usable stats, ownership/action state, and player timeline context.
   - Rows with alternate id fields such as `playerId`, `pid`, or `key` should not silently become non-clickable.

2. Trades
   - Direct-applied simulation trades should update rosters immediately.
   - Trade results should survive reload.
   - Completed trades should appear in the trade desk.
   - Acquired/traded-away players should show relevant timeline entries.

3. Waivers
   - Add/drop or claim flows should use the correct player ids.
   - Roster and free-agent state should update without stale player rows.
   - Player timelines should reflect waiver movement when the underlying state provides enough information.

4. Season resume
   - A local simulation or historical-universe season should reload into the same meaningful state.
   - After reload, the main shell should still expose roster, trade, waiver, and player-detail paths.

## Out Of Scope

- Portrait-generation polish, portrait studio improvements, or large portrait manifest work.
- Hoop Links, three-point contest, or basketball-golf development.
- Large decomposition of `rosterbate-season.html`.
- New fantasy gameplay features beyond fixes needed to make the existing flows reliable.
- Deployment automation or production release work.

## Approach

Use the existing focused tests as the spine of the pass, then add small regression coverage only when a real gap appears.

Primary verification commands:

```powershell
npm.cmd run test:player-detail
node tools/test-shared-season-shell-simulation.js
npm.cmd run test:trade-application
git diff --check
```

Additional tests can be run when touching adjacent behavior, but this sweep should avoid expanding into unrelated test suites unless a core-flow dependency requires it.

Manual localhost smoke testing should use the running static server at `http://127.0.0.1:8080/` when a browser check would reveal issues that script tests may miss.

## Working Rules

- Reproduce before fixing.
- Prefer narrow test additions over broad speculative rewrites.
- Keep fixes close to the broken flow.
- Preserve unrelated dirty work in the repo.
- Record any known risk instead of hiding it behind a partial fix.

## Expected Output

By the end of the sweep:

- The core player-detail, trade, waiver, and season-resume flows have fresh verification evidence.
- Reproducible regressions found in those flows are fixed.
- Any unfixed issues are listed with reproduction notes.
- The current dirty tree is described well enough to separate the core stabilization slice from portrait and Hoop Links work later.

## Success Criteria

The pass is successful when:

- `npm.cmd run test:player-detail` passes.
- `node tools/test-shared-season-shell-simulation.js` passes.
- `npm.cmd run test:trade-application` passes.
- `git diff --check` reports no whitespace errors.
- Localhost smoke testing does not expose a blocker in the core flows.
- Remaining risks are documented plainly.
