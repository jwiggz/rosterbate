# Core Stabilization Report - 2026-05-26

## Scope

Verified core Rosterbate player-detail, trade, waiver, and season-resume/shell flows. Portrait studio, Hoop Links, three-point contest, basketball-golf, and generated portrait asset work stayed out of scope.

The branch keeps one small pre-existing `portrait-state-final` CSS addition in `rosterbate-season.html`, but removes the out-of-scope shared-shell test expectations that required broader live-matchup portrait work. No portrait tooling, generated portrait assets, Hoop Links, three-point contest, or basketball-golf files are included in the stabilization branch status.

## Verification

- `npm.cmd run test:player-detail`: PASS
  - `player detail history test passed`
  - `player detail click-path Playwright smoke passed`
  - `player detail post-action browser QA passed`
  - Run with `RB_BASE_URL=http://127.0.0.1:8095` so browser checks used the isolated stabilization worktree.
- `node tools/test-shared-season-shell-simulation.js`: PASS
  - `shared season shell simulation test passed`
- `npm.cmd run test:trade-application`: PASS
  - `trade application Playwright smoke passed`
  - Run with `RB_BASE_URL=http://127.0.0.1:8095` so browser checks used the isolated stabilization worktree.
- `git diff --check`: PASS
  - No whitespace errors reported.
  - LF-to-CRLF working-copy warnings were reported for `package.json`, `simulation-season-adapter.js`, `tools/test-shared-season-shell-simulation.js`, and `tools/test-trade-application-playwright.js`.
- `http://127.0.0.1:8095/rosterbate-season.html`: 200
- `http://127.0.0.1:8095/historic-universe.html`: 200

## Fixes Included

- Player-detail click paths handle alternate player id fields.
- Completed direct-applied trades remain visible in the trade desk.
- Player timelines show trade and waiver context where the stored state provides enough data.
- Simulation waiver submissions resolve the row player id before nested player data.
- Player-detail Add Player and Propose Trade CTAs route to simulation waiver/trade shell flows instead of legacy local modals.
- Completed trade feedback is filtered to the controlled team, including partner-card feedback.

## Remaining Risks

- `rosterbate-season.html` remains large and tightly coupled.
- A small `portrait-state-final` CSS addition remains inside `rosterbate-season.html` because it was part of the seeded core file, but the branch does not include broader portrait tooling or asset work.
- Browser tests cover representative local simulation states, not every historical pack.

## Commit Boundary Notes

- Core stabilization files: `rosterbate-season.html`, `simulation-season-adapter.js`, focused player-detail/trade/shared-shell tests, and this report.
- Current dirty files are limited to the core stabilization slice plus this report, the stabilization plan, and focused player-detail tests. Out-of-scope portrait tooling/assets, Hoop Links, three-point contest, and basketball-golf files were not brought into this branch.
- No commit was created for this task, and staging is intended to remain empty for handoff.
