# Simulation Waiver Claim Parity Design

## Goal
Make simulation waivers feel much closer to single-player waivers by replacing instant add/drop behavior with a real pending-claim flow that makes roster consequences clear and resolves claims on simulation advance.

## Architecture
Keep the shared waiver page renderer in `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`, but move claim state and resolution logic behind the simulation backend boundary. `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-season-adapter.js` should expose waiver-desk view data for the shared shell, while `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-mode-runtime.js` should own claim submission, pending-claim persistence, and claim resolution on advance.

The shell should render a single-player-style waiver desk and dispatch explicit actions like submit claim, remove pending claim, and inspect roster consequences, but it should not decide who gets added or dropped. Simulation-specific rules remain below that line: NBA vs NFL timing, roster-limit enforcement, waiver-order updates, and any eventual claim-resolution rules stay in the adapter/runtime layer.

## Data Flow
A simulation waiver claim moves through four states: draft claim, pending, resolved-success, or resolved-failed. On the waiver page, the user selects an add target and, when the roster is full, an explicit drop target before confirming the claim. Runtime stores that pending claim in simulation season state with enough metadata to render later: player to add, player to drop if any, submitting team, created cycle, current status, and a resolution note.

The adapter should expose that stored claim back to the shared waiver renderer through a richer waiver view model so the page can show a real pending-claims section, a recent-resolution section, and clearer roster consequence summaries. Resolution happens on simulation advance, not immediately. NBA resolves on the next sim-day boundary and NFL resolves on the next sim-week boundary, but the model is shared: resolve pending claims, mutate rosters and free agents, update waiver order as needed, and write a short result entry into activity/history.

## Interaction Design
Simulation waivers should stop behaving like an instant free-agent pickup screen once a claim is involved. The user should be able to inspect roster consequences before submission, confirm the claim, see it land in a pending state, and remove or replace it before processing if allowed. The waiver page should make timing explicit with copy like “Processing next sim day” or “Processing next sim week,” and after advance it should clearly show whether the claim succeeded or failed and why.

The page composition should stay aligned with the broader single-player parity work: keep waiver-order context, watch-list visibility, and richer action framing, but make the deeper add/drop flow genuinely functional. Unsupported deeper behavior such as full competing CPU claim resolution should remain out of scope unless the current backend can support it cleanly during implementation.

## Scope
This pass focuses on the user-controlled simulation team for both NBA and NFL. It includes richer waiver-desk rendering, pending-claim storage, explicit add/drop consequence review, and resolution on simulation advance. It does not require a full league-wide multi-claim priority engine, full CPU claim competition, or a broader redesign of unrelated roster-management pages.

## Risks
The main risk is visual parity without true state parity, where the page shows a pending claim but the backend still treats it like an immediate pickup. Another risk is cadence drift between NBA and NFL, especially if weekly NFL claims accidentally resolve on daily boundaries. A third risk is stale roster UI after resolution, so the shared shell must rerender waiver, roster, and hub context cleanly once a claim processes.

## Testing
Testing should cover three areas. First, runtime tests should verify claim submission stores the expected pending metadata, enforces add/drop requirements, and resolves on the correct simulation advance boundary for NBA and NFL. Second, adapter tests should verify the waiver view model exposes pending claims, roster consequence summaries, and recent resolution results in a shell-friendly shape. Third, shared-shell page tests should verify the simulation waiver page shows a pending-claim desk, preserves claim state across rerenders, and updates visible roster/waiver status after resolution.
