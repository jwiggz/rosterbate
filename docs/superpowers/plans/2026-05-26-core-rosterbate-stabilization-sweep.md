# Core Rosterbate Stabilization Sweep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify and stabilize the core Rosterbate player-detail, trade, waiver, and season-resume flows without expanding feature scope.

**Architecture:** Use the existing static HTML app and Node/Playwright smoke tests as the verification spine. Keep fixes narrow inside the current core files, especially `rosterbate-season.html` and the focused test scripts, and avoid restructuring the large season shell unless a reproduced blocker requires it.

**Tech Stack:** Static HTML/JavaScript, Node.js CommonJS test scripts, Playwright, local static server at `http://127.0.0.1:8080/`, Git.

---

## File Structure

- Modify if a reproduced player-detail bug appears: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
  - Player-detail rendering, ownership/action modeling, waiver/trade shell wiring, and season shell click paths.
- Modify if player-detail coverage needs a narrow regression: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-player-detail-history.js`
  - Pure function coverage for player id matching, detail button markup, transaction history, and action model behavior.
- Modify if browser click coverage needs a narrow regression: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-player-detail-click-paths-playwright.js`
  - Browser smoke coverage for My Team, Waivers, and opponent viewer click-to-detail paths.
- Modify if post-action player detail coverage needs a narrow regression: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-player-detail-post-action-flow-playwright.js`
  - Browser coverage for player details after trades and waivers.
- Modify if shared season shell assertions need a narrow regression: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js`
  - Node-based shell coverage for simulation roster, waiver, trade, and resume behavior.
- Modify if trade persistence coverage needs a narrow regression: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-trade-application-playwright.js`
  - Browser coverage for direct-applied trade persistence and timeline effects.
- Create: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\docs\core-stabilization-report-2026-05-26.md`
  - Final stabilization evidence, fixed issues, remaining risks, and commit boundary notes.

---

### Task 1: Inventory The Current Core Slice

**Files:**
- Read: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\docs\superpowers\specs\2026-05-26-core-rosterbate-stabilization-sweep-design.md`
- Read: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\package.json`
- Read: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
- Read: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-player-detail-history.js`
- Read: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-player-detail-click-paths-playwright.js`
- Read: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-player-detail-post-action-flow-playwright.js`
- Read: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js`
- Read: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-trade-application-playwright.js`

- [ ] **Step 1: Confirm branch and dirty tree**

Run:

```powershell
git status --short --branch
```

Expected: output shows `main...origin/main` and existing dirty files. Do not revert unrelated dirty files.

- [ ] **Step 2: Map tracked modified files**

Run:

```powershell
git diff --name-only
```

Expected: output includes core files such as `rosterbate-season.html`, `simulation-season-adapter.js`, `tools/test-shared-season-shell-simulation.js`, and `tools/test-trade-application-playwright.js`, plus unrelated portrait files.

- [ ] **Step 3: Map untracked files by lane**

Run:

```powershell
git status --short | Select-String -Pattern '^\?\?'
```

Expected: output includes untracked player-detail tests, Hoop Links files, portrait tooling, and docs. Treat Hoop Links and portrait files as out of scope for this stabilization pass unless a core test explicitly depends on them.

- [ ] **Step 4: Confirm local dev server**

Run:

```powershell
try {
  $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8080/rosterbate-season.html' -UseBasicParsing -TimeoutSec 3
  "8080 $($r.StatusCode) $($r.Headers['Content-Type'])"
} catch {
  "8080 DOWN: $($_.Exception.Message)"
}
```

Expected: `8080 200 text/html; charset=utf-8`. If it is down, start it:

```powershell
Start-Process -FilePath node -ArgumentList @('tools/open-static-page.js','index.html','--no-open','--port=8080') -WorkingDirectory 'C:\Users\jabro\Desktop\Fantasy Project\rosterbate' -WindowStyle Hidden
```

- [ ] **Step 5: Record initial inventory in working notes**

Create a scratch note outside Git-tracked docs only if needed:

```powershell
New-Item -ItemType Directory -Force -Path 'C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tmp' | Out-Null
git status --short --branch | Set-Content -Path 'C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tmp\core-stabilization-initial-status.txt'
```

Expected: `tmp/core-stabilization-initial-status.txt` exists and is already ignored/untracked with the rest of `tmp/`.

---

### Task 2: Stabilize Player Detail Click Paths

**Files:**
- Modify if needed: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
- Modify if needed: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-player-detail-history.js`
- Modify if needed: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-player-detail-click-paths-playwright.js`
- Modify if needed: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-player-detail-post-action-flow-playwright.js`

- [ ] **Step 1: Run the focused player-detail suite**

Run:

```powershell
npm.cmd run test:player-detail
```

Expected output contains:

```text
player detail history test passed
player detail click-path Playwright smoke passed
player detail post-action browser QA passed
```

- [ ] **Step 2: If the suite fails, read the first failure completely**

Run:

```powershell
npm.cmd run test:player-detail 2>&1 | Tee-Object -FilePath 'C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tmp\player-detail-failure.txt'
```

Expected when failing: `tmp/player-detail-failure.txt` contains the first assertion or Playwright timeout. Fix only the first reproduced failure before rerunning the full suite.

- [ ] **Step 3: Add a narrow failing test for any missing id variant**

If a click path is broken because a player row has an alternate id field, add the exact row shape to `tools/test-player-detail-history.js` near the existing `playerDetailNameButton` assertions:

```javascript
{
  const keyOnlyMarkup = context.playerDetailNameButton({ key: 'detail-key-1', name: 'Key Field Guard' });
  assert.match(keyOnlyMarkup, /class="player-name-link"/);
  assert.match(keyOnlyMarkup, /openPlayerDetailModal\('detail-key-1','Key Field Guard',''\)/);
}
```

Then run:

```powershell
node tools/test-player-detail-history.js
```

Expected before the fix: the new assertion fails because the rendered markup is plain text or has the wrong id argument.

- [ ] **Step 4: Implement the minimal player-detail id fix**

If Step 3 fails, update `playerDetailNameButton` in `rosterbate-season.html` so it uses the same id normalization as the rest of the player-detail helpers:

```javascript
function playerDetailNameButton(player,label,source=''){
  const p=player || {};
  const idKey=normalizePlayerHistoryId(p.id ?? p.playerId ?? p.pid ?? p.key);
  const safeName=escapeHtml(label || p.name || 'Player');
  if(!idKey) return safeName;
  const safeIdArg=playerDetailJsStringArg(idKey);
  const safeNameArg=playerDetailJsStringArg(label || p.name || '');
  const safeSourceArg=playerDetailJsStringArg(source);
  return `<button type="button" class="player-name-link" onclick="openPlayerDetailModal('${safeIdArg}','${safeNameArg}','${safeSourceArg}');event.stopPropagation();">${safeName}</button>`;
}
```

- [ ] **Step 5: Verify player-detail green**

Run:

```powershell
npm.cmd run test:player-detail
```

Expected: all three player-detail scripts pass.

- [ ] **Step 6: Commit player-detail-only fixes if new code changed**

If this task changed code or tests, stage only the related files:

```powershell
git add -- rosterbate-season.html tools/test-player-detail-history.js tools/test-player-detail-click-paths-playwright.js tools/test-player-detail-post-action-flow-playwright.js
git commit -m "Stabilize player detail click paths"
```

Expected: commit succeeds. If unrelated pre-existing changes are mixed inside `rosterbate-season.html`, review `git diff --staged` before committing and only proceed if the staged diff belongs to the core stabilization slice.

---

### Task 3: Stabilize Trades And Player Timelines

**Files:**
- Modify if needed: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
- Modify if needed: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-trade-application-playwright.js`
- Modify if needed: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js`

- [ ] **Step 1: Run the trade browser smoke**

Run:

```powershell
npm.cmd run test:trade-application
```

Expected output contains:

```text
trade application Playwright smoke passed
```

- [ ] **Step 2: Run shared shell trade assertions**

Run:

```powershell
node tools/test-shared-season-shell-simulation.js
```

Expected output contains:

```text
shared season shell simulation test passed
```

- [ ] **Step 3: If completed trades disappear, add a failing assertion**

If the trade desk fails to show completed direct-applied trades, add this assertion to `tools/test-shared-season-shell-simulation.js` after the trade desk render that uses an activity log trade:

```javascript
assert.match(
  elements.tradesContent.innerHTML,
  /Completed Trades[\s\S]*Completed instantly[\s\S]*Trade applied: Hakeem Olajuwon for Stephen Curry\./,
  'simulation trade desk should make direct-applied trades visible as completed trades'
);
```

Run:

```powershell
node tools/test-shared-season-shell-simulation.js
```

Expected before the fix: the assertion fails because the completed-trades lane is absent or does not include the direct-applied trade.

- [ ] **Step 4: If player timelines miss trade movement, add a failing browser assertion**

If acquired players do not show trade history after reload, add this helper to `tools/test-trade-application-playwright.js`:

```javascript
async function assertPlayerTimelineAfterTrade(page, scenario) {
  const acquiredName = scenario.incomingNames[0];
  await page.locator('#rosterContent .player-name-link').filter({ hasText: acquiredName }).click({ timeout: 8000 });
  await page.waitForSelector('#playerDetailModal.open', { timeout: 5000 });
  const modalText = await page.locator('#playerDetailModal').innerText();
  assert.match(modalText, /PLAYER TIMELINE/i, `${scenario.label}: player detail should show transaction timeline`);
  assert.match(modalText, /Traded with Boston Celtics/i, `${scenario.label}: acquired player should show trade partner`);
  assert.match(
    modalText,
    new RegExp(`${acquiredName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} was traded from Boston Celtics to Los Angeles Lakers\\.`, 'i'),
    `${scenario.label}: acquired player timeline should explain the roster move`
  );
  await page.evaluate(() => window.closePlayerDetailModal && window.closePlayerDetailModal());
}
```

Call it after the reloaded roster assertions:

```javascript
await assertPlayerTimelineAfterTrade(page, scenario);
```

Run:

```powershell
npm.cmd run test:trade-application
```

Expected before the fix: the browser test fails because the modal lacks the trade timeline entry.

- [ ] **Step 5: Implement the minimal trade/timeline fix**

If Step 3 or Step 4 fails, keep the fix inside `renderSimulationTradesInSharedShell`, `buildPlayerTransactionHistory`, or `renderPlayerTransactionTimeline` in `rosterbate-season.html`. The trade activity records should be read from:

```javascript
const tradeActivityLog=Array.isArray(adapterState?.seasonState?.activityLog) ? adapterState.seasonState.activityLog : [];
```

Completed trade rows should be derived from activity entries with `type === 'trade'` and visible feedback text:

```javascript
const completedTradeEntries=tradeActivityLog
  .filter(entry=>{
    if(String(entry?.type || '').trim().toLowerCase()!=='trade') return false;
    const feedback=entry?.tradeDeskFeedback || {};
    const message=String(feedback?.message || entry?.message || entry?.text || '').trim();
    return !!message;
  })
  .slice(0,4);
```

- [ ] **Step 6: Verify trades green**

Run:

```powershell
npm.cmd run test:trade-application
node tools/test-shared-season-shell-simulation.js
```

Expected: both commands pass.

- [ ] **Step 7: Commit trade/timeline fixes if new code changed**

Run:

```powershell
git add -- rosterbate-season.html tools/test-trade-application-playwright.js tools/test-shared-season-shell-simulation.js
git diff --staged
git commit -m "Stabilize simulation trades and timelines"
```

Expected: staged diff contains only core trade/timeline stabilization changes before committing.

---

### Task 4: Stabilize Waivers And Season Resume

**Files:**
- Modify if needed: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
- Modify if needed: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-season-adapter.js`
- Modify if needed: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js`
- Modify if needed: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-player-detail-post-action-flow-playwright.js`

- [ ] **Step 1: Run shared shell simulation coverage**

Run:

```powershell
node tools/test-shared-season-shell-simulation.js
```

Expected output contains:

```text
shared season shell simulation test passed
```

- [ ] **Step 2: Run post-action detail coverage**

Run:

```powershell
node tools/test-player-detail-post-action-flow-playwright.js
```

Expected output contains:

```text
player detail post-action browser QA passed
```

- [ ] **Step 3: If waiver claims use the wrong id, add a failing assertion**

If a waiver row exposes `row.playerId` but the claim submits `player.id`, add this assertion near the existing waiver claim tests in `tools/test-shared-season-shell-simulation.js`:

```javascript
assert.match(
  elements.waiverContent.innerHTML,
  /submitSimulationWaiverClaimFromShell\(333/,
  'simulation waiver rows should submit the row playerId when it differs from nested player data'
);
```

Run:

```powershell
node tools/test-shared-season-shell-simulation.js
```

Expected before the fix: the assertion fails or the submit helper sends the nested player id instead of the row id.

- [ ] **Step 4: Implement the minimal waiver id fix**

If Step 3 fails, update `submitSimulationWaiverClaimFromShell` in `rosterbate-season.html` so the submitted id resolves from the row first:

```javascript
const resolvedPlayerId=Number(row?.playerId || player?.id || row?.id || playerId);
```

Then submit `resolvedPlayerId` to the adapter:

```javascript
SEASON_MODE_ADAPTER.submitWaiverClaim({
  teamAbbr: D?.draftState?.controlledTeamAbbr,
  addPlayerId: resolvedPlayerId,
  dropPlayerId
});
```

- [ ] **Step 5: Confirm adapter exposes waiver claim methods**

Inspect `simulation-season-adapter.js` and verify it exposes these pass-through methods:

```javascript
submitSimulationWaiverClaim(...args){
  return root.RosterBateSimulationModeRuntime.submitSimulationWaiverClaim(...args);
},
cancelSimulationWaiverClaim(...args){
  return root.RosterBateSimulationModeRuntime.cancelSimulationWaiverClaim(...args);
},
```

If missing, add them next to `claimSimulationFreeAgent`.

- [ ] **Step 6: Verify waivers and season shell green**

Run:

```powershell
node tools/test-shared-season-shell-simulation.js
node tools/test-player-detail-post-action-flow-playwright.js
```

Expected: both commands pass.

- [ ] **Step 7: Commit waiver/resume fixes if new code changed**

Run:

```powershell
git add -- rosterbate-season.html simulation-season-adapter.js tools/test-shared-season-shell-simulation.js tools/test-player-detail-post-action-flow-playwright.js
git diff --staged
git commit -m "Stabilize simulation waivers and season shell"
```

Expected: staged diff contains only core waiver/resume stabilization changes before committing.

---

### Task 5: Produce Stabilization Report And Final Verification

**Files:**
- Create: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\docs\core-stabilization-report-2026-05-26.md`
- Read: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\git status`

- [ ] **Step 1: Run the full stabilization verification set**

Run:

```powershell
npm.cmd run test:player-detail
node tools/test-shared-season-shell-simulation.js
npm.cmd run test:trade-application
git diff --check
```

Expected:

```text
player detail history test passed
player detail click-path Playwright smoke passed
player detail post-action browser QA passed
shared season shell simulation test passed
trade application Playwright smoke passed
```

`git diff --check` should report no whitespace errors. Line-ending warnings are acceptable if there are no whitespace error lines.

- [ ] **Step 2: Perform localhost smoke check**

Run:

```powershell
try {
  $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8080/rosterbate-season.html' -UseBasicParsing -TimeoutSec 3
  "season $($r.StatusCode)"
} catch {
  "season DOWN: $($_.Exception.Message)"
}
try {
  $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8080/historic-universe.html' -UseBasicParsing -TimeoutSec 3
  "historic $($r.StatusCode)"
} catch {
  "historic DOWN: $($_.Exception.Message)"
}
```

Expected:

```text
season 200
historic 200
```

- [ ] **Step 3: Write the stabilization report**

Create `docs/core-stabilization-report-2026-05-26.md` with this structure and replace the example command statuses with the fresh results from Step 1 and Step 2:

```markdown
# Core Stabilization Report - 2026-05-26

## Scope

Verified core Rosterbate player-detail, trade, waiver, and season-resume/shell flows. Portrait studio, Hoop Links, three-point contest, and basketball-golf work stayed out of scope.

## Verification

- `npm.cmd run test:player-detail`: PASS
- `node tools/test-shared-season-shell-simulation.js`: PASS
- `npm.cmd run test:trade-application`: PASS
- `git diff --check`: PASS
- `http://127.0.0.1:8080/rosterbate-season.html`: 200
- `http://127.0.0.1:8080/historic-universe.html`: 200

## Fixes Included

- Player-detail click paths handle alternate player id fields.
- Completed direct-applied trades remain visible in the trade desk.
- Player timelines show trade and waiver context where the stored state provides enough data.
- Simulation waiver submissions resolve the row player id before nested player data.

## Remaining Risks

- `rosterbate-season.html` remains large and tightly coupled.
- The worktree still contains unrelated portrait and Hoop Links changes.
- Browser tests cover representative local simulation states, not every historical pack.

## Commit Boundary Notes

- Core stabilization files: `rosterbate-season.html`, `simulation-season-adapter.js`, focused player-detail/trade/shared-shell tests, and this report.
- Out-of-scope dirty files: portrait studio/tooling, generated portrait assets, Hoop Links, three-point contest, basketball-golf, and unrelated docs.
```

- [ ] **Step 4: Self-review the report**

Run:

```powershell
rg -n "TBD|TODO|placeholder|maybe|probably|FAIL" docs/core-stabilization-report-2026-05-26.md
```

Expected: no output. If there is output, edit the report to be concrete and rerun the command.

- [ ] **Step 5: Commit the report**

Run:

```powershell
git add -- docs/core-stabilization-report-2026-05-26.md
git commit -m "Document core stabilization sweep"
```

Expected: commit succeeds with only the report staged.

- [ ] **Step 6: Final status summary**

Run:

```powershell
git status --short --branch
git log --oneline -5
```

Expected: output shows the new stabilization commits on `main` and still shows unrelated dirty files unless they were already committed as part of the core slice.
