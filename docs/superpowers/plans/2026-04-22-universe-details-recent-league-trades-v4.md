# Universe Details Recent League Trades V4 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a compact right-column `Recent League Trades` section to Historical Universe details so saved sim universes visibly show the latest completed CPU trades.

**Architecture:** Extend the existing `historic-universe.html` view-model builder with a trade-only summary derived from `activityLog`, then wire that list into a new support-column section rendered with the existing detail-card language. Keep the feature presentation-only: no sim-engine changes, no new persistence, and no broader activity feed expansion.

**Tech Stack:** Static HTML/CSS/JS in `historic-universe.html`, Node-based regression coverage in `tools/test-historical-universe-details.js`, git for small incremental commits.

---

## File Structure

- **Modify:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historic-universe.html`
  - Add the new `Recent League Trades` panel markup in the right-hand support column.
  - Add a trade-only activity helper and a `buildRecentLeagueTradesSummary(slot, state)` view-model function.
  - Extend `buildUniverseDetailsViewModel(slot, state, config)` and `renderUniverse(slot, state, config)` to carry and render the new list.
- **Modify:** `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-universe-details.js`
  - Add failing assertions for the new DOM hook and helper.
  - Add view-model coverage for newest-first trade selection, latest-5 cap, non-trade exclusion, and empty state.
  - Add render assertions for the new section output.

### Task 1: Add Trade-Only View-Model Coverage And Helper

**Files:**
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-universe-details.js`
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historic-universe.html:985-1135`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-universe-details.js`

- [ ] **Step 1: Write the failing test coverage for recent league trades**

Add new expectations near the existing roster-move and recent-simulation assertions so the test suite demands:

- a `recentLeagueTradesList` mount point in the HTML
- a `buildRecentLeagueTradesSummary(slot, state)` helper
- selection of only `type: 'trade'` activity entries
- newest-first ordering
- latest-5 cap
- exclusion of waivers / IL / lineup noise
- empty-state behavior when no trade history exists

Use concrete activity fixtures like:

```js
expectMatch(/id="recentLeagueTradesList"/, 'recent league trades list node is missing');
expectMatch(/function buildRecentLeagueTradesSummary\(slot, state\)/, 'recent league trades summary helper is missing');

const tradeHistoryViewModel = context.buildUniverseDetailsViewModel(
  slot,
  {
    ...state,
    activityLog: [
      { id: 't6', type: 'trade', title: 'CPU Team 3 traded Wing Stopper to CPU Team 1 for Stretch Four', text: 'Completed league trade.', teamIdx: -1, ts: 10600 },
      { id: 'w1', type: 'waiver_add', title: 'CPU Team 2 added Buck Williams', text: 'Waiver move.', teamIdx: 2, ts: 10500 },
      { id: 't5', type: 'trade', title: 'CPU Team 1 traded Bench Big to CPU Team 2 for Bench Creator', text: 'Completed league trade.', teamIdx: -1, ts: 10400 },
      { id: 'i1', type: 'il', title: 'Moved Alonzo Mourning to IL', text: 'IL move.', teamIdx: 0, ts: 10300 },
      { id: 't4', type: 'trade', title: 'CPU Team 4 traded Rim Protector to CPU Team 5 for Lead Guard', text: 'Completed league trade.', teamIdx: -1, ts: 10200 },
      { id: 't3', type: 'trade', title: 'CPU Team 6 traded Scoring Wing to CPU Team 7 for Rebounder', text: 'Completed league trade.', teamIdx: -1, ts: 10100 },
      { id: 't2', type: 'trade', title: 'CPU Team 8 traded Bench Creator to CPU Team 9 for Two-Way Forward', text: 'Completed league trade.', teamIdx: -1, ts: 10000 },
      { id: 't1', type: 'trade', title: 'CPU Team 10 traded Stretch Big to CPU Team 11 for Guard Depth', text: 'Completed league trade.', teamIdx: -1, ts: 9900 }
    ]
  },
  {}
);

assert.equal(tradeHistoryViewModel.recentLeagueTrades.length, 5);
assert.deepStrictEqual(
  tradeHistoryViewModel.recentLeagueTrades.map(item => item.title),
  [
    'CPU Team 3 traded Wing Stopper to CPU Team 1 for Stretch Four',
    'CPU Team 1 traded Bench Big to CPU Team 2 for Bench Creator',
    'CPU Team 4 traded Rim Protector to CPU Team 5 for Lead Guard',
    'CPU Team 6 traded Scoring Wing to CPU Team 7 for Rebounder',
    'CPU Team 8 traded Bench Creator to CPU Team 9 for Two-Way Forward'
  ]
);
assert.equal(
  tradeHistoryViewModel.recentLeagueTrades.every(item => !/Waiver|IL/i.test(item.title + ' ' + item.body)),
  true
);

const noTradeHistoryViewModel = context.buildUniverseDetailsViewModel(
  slot,
  { ...state, activityLog: [] },
  {}
);
assert.deepStrictEqual(noTradeHistoryViewModel.recentLeagueTrades, []);
```

- [ ] **Step 2: Run the universe-details test to verify it fails**

Run:

```powershell
node .\tools\test-historical-universe-details.js
```

Expected:

```text
AssertionError [ERR_ASSERTION]: recent league trades list node is missing
```

- [ ] **Step 3: Add the trade-only summary helper and view-model field**

In `historic-universe.html`, add a small trade filter helper plus a recent-trades summary builder near the existing activity helpers and `buildRecentRosterMovesSummary(slot, state)`.

Use this shape:

```js
function isCompletedTradeActivityEntry(entry){
  return String(entry?.type || '').trim().toLowerCase() === 'trade'
    && String(entry?.title || entry?.text || '').trim().length > 0;
}

function buildRecentLeagueTradesSummary(slot, state){
  return (Array.isArray(state?.activityLog) ? state.activityLog : [])
    .filter(function(entry){
      return isCompletedTradeActivityEntry(entry);
    })
    .slice()
    .sort(function(a, b){
      return Number(b?.ts || 0) - Number(a?.ts || 0);
    })
    .slice(0, 5)
    .map(function(entry){
      const meta = [];
      if(Number.isFinite(Number(entry?.week))) meta.push('Week ' + Number(entry.week));
      if(Number.isFinite(Number(entry?.day))) meta.push('Day ' + Number(entry.day));
      return {
        title: String(entry?.title || 'League trade').trim(),
        body: String(entry?.text || 'Completed league trade.').trim(),
        meta: meta
      };
    });
}
```

Then extend the view model:

```js
function buildUniverseDetailsViewModel(slot, state, config){
  const reveal = getLatestRevealReport(state);
  const standing = getStandingContext(state);
  const rosterCore = buildRosterCore(state);
  return {
    latestSimDay: buildLatestSimDaySummary(slot, state, reveal, standing),
    leagueSnapshot: buildLeagueSnapshotSummary(slot, state, standing),
    recentActivity: buildRecentUniverseActivitySummary(state, reveal),
    recentSimDays: buildRecentSimulationSummary(slot, state),
    recentRosterMoves: buildRecentRosterMovesSummary(slot, state),
    recentLeagueTrades: buildRecentLeagueTradesSummary(slot, state),
    currentTeamState: buildCurrentTeamStateSummary(slot, state, rosterCore)
  };
}
```

- [ ] **Step 4: Run the test again to verify the helper layer passes and the renderer is the next failure**

Run:

```powershell
node .\tools\test-historical-universe-details.js
```

Expected:

```text
AssertionError [ERR_ASSERTION]: renderUniverse should render the recent league trades section
```

- [ ] **Step 5: Commit the view-model layer**

Run:

```powershell
git add historic-universe.html tools/test-historical-universe-details.js
git commit -m "feat: add recent league trades view model"
```

Expected:

```text
[branch ...] feat: add recent league trades view model
```

### Task 2: Render The Recent League Trades Section In Universe Details

**Files:**
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historic-universe.html:320-420`
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historic-universe.html:1144-1245`
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-universe-details.js`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-universe-details.js`

- [ ] **Step 1: Add the failing render assertions for the new right-column section**

Extend the existing render assertions so the suite expects:

- a `Recent League Trades` section in the page markup
- a `recentLeagueTradesList` target
- `renderUniverse(slot, state, config)` to bind the view-model data into that target
- empty-state copy for no trade history

Use assertions like:

```js
assert.match(renderUniverseSource, /recentLeagueTradesList/, 'renderUniverse should render the recent league trades section');
expectMatch(/Recent League Trades/, 'recent league trades heading is missing');

const tradeRendered = context.renderDetailList(
  tradeHistoryViewModel.recentLeagueTrades,
  'detail-item',
  {
    title: 'No recent league trades',
    body: 'This universe has not logged completed league trades yet.'
  }
);
assert.match(tradeRendered, /CPU Team 3 traded Wing Stopper to CPU Team 1 for Stretch Four/);
assert.doesNotMatch(tradeRendered, /CPU Team 2 added Buck Williams/);

const blankTradeRendered = context.renderDetailList(
  noTradeHistoryViewModel.recentLeagueTrades,
  'detail-item',
  {
    title: 'No recent league trades',
    body: 'This universe has not logged completed league trades yet.'
  }
);
assert.match(blankTradeRendered, /No recent league trades/);
```

- [ ] **Step 2: Run the test to verify the render assertions fail**

Run:

```powershell
node .\tools\test-historical-universe-details.js
```

Expected:

```text
AssertionError [ERR_ASSERTION]: recent league trades heading is missing
```

- [ ] **Step 3: Add the section markup and render wiring**

In the right-hand support column of `historic-universe.html`, add a new panel after the existing league-support cards using the current detail-card language:

```html
<article class="panel card-pad">
  <div class="section-kicker">Recent League Trades</div>
  <div class="section-title">What The Market Did</div>
  <div class="section-copy">The latest completed CPU trades across the league, kept compact so the archive still reads team-first.</div>
  <div class="detail-list" id="recentLeagueTradesList">
    <div class="detail-item">
      <strong>Loading recent league trades</strong>
      <span>Preparing the latest league market activity.</span>
    </div>
  </div>
</article>
```

Then wire it in `renderUniverse(slot, state, config)`:

```js
const recentLeagueTrades = Array.isArray(detailsViewModel.recentLeagueTrades)
  ? detailsViewModel.recentLeagueTrades
  : [];

document.getElementById('recentLeagueTradesList').innerHTML = renderDetailList(
  recentLeagueTrades,
  'detail-item',
  {
    title: 'No recent league trades',
    body: 'This universe has not logged completed league trades yet.'
  }
);
```

- [ ] **Step 4: Run the universe-details regression to verify the page passes**

Run:

```powershell
node .\tools\test-historical-universe-details.js
```

Expected:

```text
historical universe details test passed
```

- [ ] **Step 5: Commit the render wiring**

Run:

```powershell
git add historic-universe.html tools/test-historical-universe-details.js
git commit -m "feat: render recent league trades in universe details"
```

Expected:

```text
[current-branch ...] feat: render recent league trades in universe details
```

### Task 3: Verify End-To-End And Finish The Branch Cleanly

**Files:**
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/historic-universe.html` (only if a blocker is found)
- Modify: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-universe-details.js` (only if a blocker is found)
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-universe-details.js`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-drafted-universe-snapshot.js`
- Test: `C:/Users/jabro/Desktop/Fantasy Project/rosterbate/tools/test-historical-universe-slot-storage.js`

- [ ] **Step 1: Run the focused merged regression sweep**

Run:

```powershell
node .\tools\test-historical-universe-details.js
node .\tools\test-historical-drafted-universe-snapshot.js
node .\tools\test-historical-universe-slot-storage.js
```

Expected:

```text
historical universe details test passed
historical drafted-universe snapshot test passed
historical universe slot storage test passed
```

- [ ] **Step 2: Do a manual page sanity check**

Open a saved historical/simulation universe and verify:

- the new `Recent League Trades` section appears in the right column
- only trade entries appear there
- entries are newest first
- the list stays compact and readable
- empty-state copy reads naturally when a universe has no trade history yet

Use:

```text
Open historic-universe.html in the same local workflow used for recent Universe Details checks and inspect a saved simulation universe slot with activity history.
```

Expected:

```text
The section reads as league context, not as a second main story lane.
```

- [ ] **Step 3: Commit the verified finish**

Run:

```powershell
git status --short
```

Expected:

```text
<no output>
```

If additional blocker fixes were required during verification:

```powershell
git add historic-universe.html tools/test-historical-universe-details.js
git commit -m "fix: polish recent league trades universe details"
```

If no additional code changes were required, do not create a no-op commit.

- [ ] **Step 4: Prepare integration summary**

Capture for handoff:

```text
- final commit SHA(s)
- exact verification commands run
- whether manual page sanity found any follow-up issues
- whether the branch is ready to merge as-is
```

This summary should be the only closeout artifact needed before merge or push.
