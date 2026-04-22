# Waiver Radar + Watchlist MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing waiver lane in `rosterbate-season.html` into a real decision surface by making `Waiver Radar` rank free agents by roster fit first, adding one short reason line per radar result, and preserving a lightweight per-league watchlist flow with star / unstar plus filtered browsing.

**Architecture:** Keep the first pass entirely inside [C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/rosterbate-season.html). Strengthen the existing waiver helper layer (`getWaiverRadarCandidates`, `getWatchedWaiverTargets`, `getRecentDroppedWaiverTargets`, `getWaiverRowSignals`) with a compact roster-fit/trend scoring model, then upgrade `renderWaiver()` so the radar tiles explain themselves with one short reason line. Add one focused Node regression harness that extracts the helper layer and verifies ranking, watchlist behavior, recent-drop/watch boosts, reason generation, and waiver-page render hooks without needing a browser runner.

**Tech Stack:** Vanilla HTML/CSS/JS, existing season-page state in `rosterbate-season.html`, Node.js `assert/fs/path/vm`, existing watchlist / recent-drop / waiver helper seams

---

## File Structure

- **Modify:** `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
  - Add radar scoring helpers, reason-line generation, and upgraded waiver-page rendering.
- **Create:** `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-waiver-radar-watchlist.js`
  - Focused regression harness for waiver-radar scoring, watchlist state, recent-drop surfacing, reason generation, and render-hook presence.

### Task 1: Add a failing waiver radar + watchlist regression harness

**Files:**
- Create: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-waiver-radar-watchlist.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-waiver-radar-watchlist.js`

- [ ] **Step 1: Write the failing regression harness**

Create `tools/test-waiver-radar-watchlist.js` with a focused harness that:
- reads `rosterbate-season.html`
- asserts the new helper signatures and radar reason hook exist
- extracts the waiver helper functions into a Node `vm` sandbox
- builds a small fake roster / waiver pool / recent-drop / watchlist state
- proves the radar prefers roster fit over raw best-available-alone
- proves recent trend can break close cases without dominating
- proves watchlisted players and recent drops still surface strongly
- proves each radar result resolves to exactly one short reason line
- proves the waiver page still exposes the upgraded radar section, watchlist snapshot, recent drops, and the `All Players / Watch List` browsing hook

Use a harness shape like:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'rosterbate-season.html'),
  'utf8'
);

function expectMatch(pattern, message) {
  assert.match(html, pattern, message);
}

function extractFunctionSource(signature) {
  // same balanced-brace extractor pattern used by other focused harnesses
}

expectMatch(/function getWaiverRadarCandidates\(limit=4\)/, 'missing radar helper');
expectMatch(/function getWatchedWaiverTargets\(limit=4\)/, 'missing watched helper');
expectMatch(/function getRecentDroppedWaiverTargets\(limit=4\)/, 'missing recent-drop helper');
expectMatch(/function getWaiverRowSignals\(player\)/, 'missing row signal helper');
expectMatch(/waiver-radar-reason/, 'missing radar reason hook');
expectMatch(/Watch List Snapshot/, 'missing watch list snapshot section');
expectMatch(/Recent Drops/, 'missing recent drops section');

const script = [
  extractFunctionSource('getWatchListIds()'),
  extractFunctionSource('isWatchListed(pid)'),
  extractFunctionSource('toggleWatchList(pid)'),
  extractFunctionSource('getWaiverRadarCandidates(limit=4)'),
  extractFunctionSource('getWatchedWaiverTargets(limit=4)'),
  extractFunctionSource('getRecentDroppedWaiverTargets(limit=4)'),
  extractFunctionSource('getWaiverRowSignals(player)')
].join('\\n\\n');

// fake roster, free-agent pool, recent-drops, and local watchlist state
// then assert ranking, boosting, and single-reason behavior
```

The initial expectations should assume the new reason hook and upgraded ranking behavior are not present yet, so the harness fails before implementation.

- [ ] **Step 2: Run the new harness to verify it fails**

Run:

```powershell
node .\tools\test-waiver-radar-watchlist.js
```

Expected:

```text
AssertionError [ERR_ASSERTION]: missing radar reason hook
```

- [ ] **Step 3: Commit the failing harness**

Run:

```powershell
git add .\tools\test-waiver-radar-watchlist.js
git commit -m "test: add waiver radar watchlist regression"
```

Expected:

```text
The commit succeeds with subject line: test: add waiver radar watchlist regression
```

### Task 2: Add roster-fit-first radar scoring and single-reason generation

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-waiver-radar-watchlist.js`

- [ ] **Step 1: Add compact waiver-radar scoring helpers near the existing waiver helper seam**

Insert a local helper layer near the current waiver helpers around:
- `getWaiverRadarCandidates(limit=4)`
- `getWatchedWaiverTargets(limit=4)`
- `getRecentDroppedWaiverTargets(limit=4)`
- `getWaiverRowSignals(player)`

Recommended shape:

```js
function getWaiverTrendScore(player){
  // light recent-production signal from already-exposed season-page data
}

function buildWaiverRosterNeedProfile(){
  // derive thin-position and weak-bench signals from the current roster
}

function getWaiverRosterFitScore(player, needProfile){
  // reward thin-position coverage and penalize overfilled positions
}

function getWaiverRecentDropBoost(player){
  // strong surfacing boost, not the core engine
}

function getWaiverWatchListBoost(player){
  // strong visibility boost, not the core engine
}

function getWaiverRadarReason(player, context){
  // exactly one short reason string
}

function getWaiverRadarCandidateScore(player, needProfile){
  // base value + roster fit + light trend + watch/recent-drop boosts
}
```

Implementation rules:
- use current player value / fantasy-output language already trusted in the waiver page as the base signal
- keep `roster fit` as the strongest modifier
- keep `recent trend` strictly lighter than roster fit
- treat `watchlist` and `recent drop` as strong surfacing boosts, not the main engine
- keep the feature sport-agnostic by using only simple position/value/recent-production signals already on the season page

- [ ] **Step 2: Upgrade `getWaiverRadarCandidates(limit=4)` to rank by fit first**

Make `getWaiverRadarCandidates(limit=4)`:
- build the roster-need profile once
- score available players with the new helper layer
- sort primarily by the new composite score
- attach the single strongest reason to each returned candidate
- keep the result list capped at the existing `limit`

The intended order of importance is:
1. current usefulness for this roster
2. light recent-trend help
3. watchlist / recent-drop visibility boosts

Do not let a watched player or recent drop automatically outrank an obviously better-fit add in every case.

- [ ] **Step 3: Keep the watchlist and recent-drop helper outputs compatible**

Preserve the current behavior of:
- `getWatchListIds()`
- `toggleWatchList(pid)`
- `getWatchedWaiverTargets(limit=4)`
- `getRecentDroppedWaiverTargets(limit=4)`

But update them as needed so the returned targets can participate cleanly in the richer row-signal / reason-line model without changing the underlying storage shape.

- [ ] **Step 4: Extend `getWaiverRowSignals(player)` so the UI can render one reason line cleanly**

Make the row signal object explicitly carry:
- `watchListed`
- `recentDrop`
- `trendUp`
- `fitReason`
- `radarReason`

Keep the output lightweight and display-ready.

- [ ] **Step 5: Run the focused regression and verify the helper layer passes**

Run:

```powershell
node .\tools\test-waiver-radar-watchlist.js
```

Expected:

```text
waiver radar watchlist test passed
```

- [ ] **Step 6: Commit the scoring helper layer**

Run:

```powershell
git add .\rosterbate-season.html .\tools\test-waiver-radar-watchlist.js
git commit -m "feat: add roster-fit waiver radar scoring"
```

Expected:

```text
The commit succeeds with subject line: feat: add roster-fit waiver radar scoring
```

### Task 3: Upgrade the waiver-page UI for radar reasons and watchlist actionability

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-waiver-radar-watchlist.js`

- [ ] **Step 1: Add compact radar-tile styling for the new reason line**

Add small CSS hooks near the existing waiver-page styles for:

```css
.waiver-radar-reason{font-size:11px;line-height:1.5;color:#9fb4d0;margin-top:6px}
.waiver-watch-toggle{...}
.waiver-radar-meta{...}
```

Keep the visual language aligned with the current season-page cards. This pass should feel sharper, not like a brand-new subsystem.

- [ ] **Step 2: Update the `Waiver Radar` section inside `renderWaiver()`**

Upgrade the radar tiles so each result clearly shows:
- player name
- team / position
- key value stats already used by the page
- watch star
- add button
- one short `why this is here` line

Recommended render shape:

```html
<article class="waiver-radar-card">
  <div class="waiver-radar-head">...</div>
  <div class="waiver-radar-meta">...</div>
  <div class="waiver-radar-reason">Fills a thin guard spot</div>
  <div class="waiver-radar-actions">...</div>
</article>
```

The reason line should use the already-selected `radarReason` only. Do not render multiple stacked reasons in `v1`.

- [ ] **Step 3: Preserve and tighten the watchlist browsing loop**

Keep the existing:
- `Watch List Snapshot`
- `All Players / Watch List` filter behavior
- star / unstar interaction

Make sure the upgraded waiver rendering still makes these loops feel connected:
- star a player from radar
- switch to watchlist browsing
- still see the player in watchlist and snapshot surfaces

Do not add notes, tags, or a separate watchlist page.

- [ ] **Step 4: Preserve `Recent Drops` as a strong but secondary signal**

Keep the existing `Recent Drops` section visible in `renderWaiver()`.

Make sure the upgrade does not bury or break it:
- recent-drop players should still be easy to inspect
- but the page should remain roster-fit-first overall

- [ ] **Step 5: Extend the regression harness to verify render hooks**

Update `tools/test-waiver-radar-watchlist.js` so it also verifies:
- `Waiver Radar` cards now include the `waiver-radar-reason` hook
- `Watch List Snapshot` still renders
- `Recent Drops` still renders
- the `All Players / Watch List` browsing copy / hook still exists
- empty-state copy remains available when no watchlisted players or radar candidates exist

- [ ] **Step 6: Run the focused regression again**

Run:

```powershell
node .\tools\test-waiver-radar-watchlist.js
```

Expected:

```text
waiver radar watchlist test passed
```

- [ ] **Step 7: Commit the waiver-page rendering upgrade**

Run:

```powershell
git add .\rosterbate-season.html .\tools\test-waiver-radar-watchlist.js
git commit -m "feat: upgrade waiver radar and watchlist ui"
```

Expected:

```text
The commit succeeds with subject line: feat: upgrade waiver radar and watchlist ui
```

### Task 4: Final verification and handoff

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-waiver-radar-watchlist.js`

- [ ] **Step 1: Run the full planned verification sweep**

Run:

```powershell
node .\tools\test-waiver-radar-watchlist.js
```

And run the nearby trade / season-page regression that is most likely to catch unrelated season-surface regressions:

```powershell
node .\tools\test-trade-fairness-evaluator.js
```

Expected:

```text
waiver radar watchlist test passed
trade fairness evaluator test passed
```

- [ ] **Step 2: Do one manual season-page sanity pass**

Open:

```text
C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html
```

Manually confirm:
- the radar feels like "best adds for my roster," not just "highest totals left"
- each radar result shows exactly one short reason line
- recent trend helps break close cases but does not dominate the page
- starring / unstarring still feels obvious
- switching to the `Watch List` filter still feels fast and coherent
- recent drops are still visible without taking over the radar

Expected:

```text
The waiver page feels more actionable without turning into a research dashboard.
```

- [ ] **Step 3: Confirm the branch/worktree state is clean**

Run:

```powershell
git status --short
git rev-parse --abbrev-ref HEAD
git rev-parse --short HEAD
```

Expected:

```text
No modified or untracked files remain, and the branch points at the final waiver-radar implementation commit.
```

- [ ] **Step 4: Prepare the finish summary**

Capture these exact delivery points for the finish message:

```text
- waiver radar now ranks free agents by roster fit first
- radar tiles show one short why-this-is-here reason
- watchlist remains simple star/unstar plus filtered browsing
- recent drops remain visible and strongly surfaced
- the focused waiver-radar regression is green
```

- [ ] **Step 5: Commit any final tiny cleanup if needed**

If a last tiny tweak was needed after manual or regression verification, finish with:

```powershell
git add .\rosterbate-season.html .\tools\test-waiver-radar-watchlist.js
git commit -m "chore: finalize waiver radar watchlist mvp"
```

Expected:

```text
Only use this step if a final tiny cleanup was needed after the verification sweep.
```
