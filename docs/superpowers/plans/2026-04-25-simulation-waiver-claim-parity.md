# Simulation Waiver Claim Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace instant simulation add/drop behavior with a real pending-claim waiver flow that shows roster consequences clearly and resolves claims on simulation advance.

**Architecture:** Keep the shared waiver page in `rosterbate-season.html`, but move claim submission and resolution into the simulation backend boundary. `simulation-mode-runtime.js` will own pending-claim state and advance-time resolution, `simulation-season-adapter.js` will expose the richer waiver-desk view model, and the shared shell will render a single-player-style pending-claim desk and call explicit shell actions.

**Tech Stack:** Plain HTML/CSS/JavaScript in `rosterbate-season.html`, browser-side simulation adapter/runtime modules, Node-based regression tests in `tools/*.js`, local verification on `http://localhost:8080`.

---

## File Map

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-mode-runtime.js`
  - Add pending-claim submission, cancellation, and resolution helpers for simulation state.
  - Resolve pending claims on the correct advance boundary for NBA and NFL.

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-season-adapter.js`
  - Expand the waiver view model with pending claims, recent results, roster consequence summaries, and shell action metadata.

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
  - Replace the thin simulation waiver renderer with a richer pending-claim desk.
  - Route shell actions through pending-claim helpers instead of instant pickups.

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-mode-runtime.js`
  - Add runtime tests for submission, required drop selection, cancellation, and resolution timing.

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js`
  - Add adapter tests for the richer waiver-desk contract.

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js`
  - Add shared-shell tests for pending-claim rendering and post-resolution updates.

- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-nfl-shared-season-shell-weekly-sim.js`
  - Protect NFL weekly cadence while waiver claims become pending and resolve on weekly advance.

## Task 1: Lock Pending-Claim Behavior In Tests

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-mode-runtime.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-nfl-shared-season-shell-weekly-sim.js`

- [ ] **Step 1: Write the failing runtime test for pending-claim submission with explicit drop consequences**

```js
const submitted = runtime.submitSimulationWaiverClaim(state, {
  teamAbbr: 'LAL',
  addPlayerId: 33,
  dropPlayerId: 34
});
assert.equal(submitted.seasonState.pendingWaiverClaims.length, 1);
assert.deepEqual(submitted.seasonState.pendingWaiverClaims[0], {
  claimId: 'claim-1',
  teamAbbr: 'LAL',
  addPlayerId: 33,
  dropPlayerId: 34,
  status: 'pending',
  processOnAdvance: 'day'
});
```

- [ ] **Step 2: Run the runtime test to verify it fails**

Run: `node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-mode-runtime.js`
Expected: FAIL on missing `submitSimulationWaiverClaim` or missing `pendingWaiverClaims` support.

- [ ] **Step 3: Write the failing adapter test for richer waiver-desk state**

```js
const waiverVm = adapter.getWaiverViewModel();
assert.equal(waiverVm.layoutMode, 'single-player-parity');
assert.ok(Array.isArray(waiverVm.pendingClaims));
assert.ok(Array.isArray(waiverVm.recentClaimResults));
assert.ok(Array.isArray(waiverVm.sections?.available?.rows));
assert.ok(Array.isArray(waiverVm.sections?.pending?.rows));
assert.match(waiverVm.claimTimingLabel, /next sim day|next sim week/i);
```

- [ ] **Step 4: Run the adapter test to verify it fails**

Run: `node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js`
Expected: FAIL on missing pending-claim fields in `getWaiverViewModel()`.

- [ ] **Step 5: Write the failing shared-shell test for pending claims and delayed processing**

```js
api.renderSimulationWaiverInSharedShell();
assert.match(elements.waiverContent.innerHTML, /Pending Claims/i);
assert.match(elements.waiverContent.innerHTML, /Processing next sim day|Processing next sim week/i);
assert.match(elements.waiverContent.innerHTML, /Submit Claim/i);
assert.doesNotMatch(elements.waiverContent.innerHTML, /claim resolves immediately/i);
```

- [ ] **Step 6: Run the shared-shell and NFL cadence tests to verify they fail for the new contract**

Run:
```bash
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-nfl-shared-season-shell-weekly-sim.js
```
Expected: FAIL on missing pending-claim desk content or wrong NFL resolution timing.

- [ ] **Step 7: Save the red-test checkpoint locally**

Run:
```bash
git -C "C:\Users\jabro\Desktop\Fantasy Project\rosterbate" status --short
```
Expected: modified test files only for this task, with no commit required.

## Task 2: Add Pending-Claim Runtime State And Resolution

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-mode-runtime.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-mode-runtime.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-nfl-shared-season-shell-weekly-sim.js`

- [ ] **Step 1: Implement minimal pending-claim submission and cancellation helpers**

```js
function submitSimulationWaiverClaim(state, payload){
  const nextState = clone(state);
  const claims = Array.isArray(nextState?.seasonState?.pendingWaiverClaims)
    ? nextState.seasonState.pendingWaiverClaims.slice()
    : [];
  claims.push({
    claimId: `claim-${claims.length + 1}`,
    teamAbbr: payload.teamAbbr,
    addPlayerId: Number(payload.addPlayerId),
    dropPlayerId: payload.dropPlayerId == null ? null : Number(payload.dropPlayerId),
    status: 'pending',
    processOnAdvance: getSimulationSport(nextState) === 'nfl' ? 'week' : 'day'
  });
  nextState.seasonState.pendingWaiverClaims = claims;
  return nextState;
}

function cancelSimulationWaiverClaim(state, claimId){
  const nextState = clone(state);
  nextState.seasonState.pendingWaiverClaims = (nextState?.seasonState?.pendingWaiverClaims || [])
    .filter((claim) => String(claim?.claimId || '') !== String(claimId || ''));
  return nextState;
}
```

- [ ] **Step 2: Run the runtime test to verify submission and cancellation now pass**

Run: `node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-mode-runtime.js`
Expected: the new submission/cancellation assertions PASS, with later resolution assertions still failing.

- [ ] **Step 3: Implement pending-claim resolution on advance with roster/free-agent mutation**

```js
function resolveSimulationWaiverClaims(state){
  const nextState = clone(state);
  const claims = Array.isArray(nextState?.seasonState?.pendingWaiverClaims)
    ? nextState.seasonState.pendingWaiverClaims.slice()
    : [];
  const resolved = [];
  claims.forEach((claim) => {
    if (claim.status !== 'pending') return;
    const roster = nextState.draftState.rostersByTeam?.[claim.teamAbbr] || [];
    const freeAgents = nextState.draftState.freeAgents || [];
    const addPlayer = freeAgents.find((player) => Number(player?.id) === Number(claim.addPlayerId));
    if (!addPlayer) {
      resolved.push({ ...claim, status: 'failed', resolutionNote: 'Player no longer available.' });
      return;
    }
    const keptRoster = roster.filter((player) => Number(player?.id) !== Number(claim.dropPlayerId));
    const droppedPlayer = roster.find((player) => Number(player?.id) === Number(claim.dropPlayerId));
    nextState.draftState.rostersByTeam[claim.teamAbbr] = keptRoster.concat([addPlayer]);
    nextState.draftState.freeAgents = freeAgents
      .filter((player) => Number(player?.id) !== Number(claim.addPlayerId))
      .concat(droppedPlayer ? [droppedPlayer] : []);
    resolved.push({ ...claim, status: 'resolved-success', resolutionNote: 'Claim processed successfully.' });
  });
  nextState.seasonState.pendingWaiverClaims = claims.filter((claim) => claim.status !== 'pending');
  nextState.seasonState.recentWaiverResults = resolved;
  return nextState;
}
```

- [ ] **Step 4: Route resolution through the correct advance boundary**

```js
if (sport === 'nfl') {
  state = resolveSimulationWaiverClaims(state);
  // existing weekly sim path continues
} else {
  state = resolveSimulationWaiverClaims(state);
  // existing daily sim path continues
}
```

- [ ] **Step 5: Run runtime and NFL cadence tests to verify they pass**

Run:
```bash
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-mode-runtime.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-nfl-shared-season-shell-weekly-sim.js
```
Expected: PASS, including the pending-claim resolution timing assertions.

- [ ] **Step 6: Save the runtime checkpoint locally**

Run:
```bash
git -C "C:\Users\jabro\Desktop\Fantasy Project\rosterbate" status --short
```
Expected: runtime and test files modified, with no commit required.

## Task 3: Expand The Adapter To Expose A Real Waiver Desk

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-season-adapter.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js`

- [ ] **Step 1: Add pending-claim and recent-result sections to `getWaiverViewModel()`**

```js
return {
  sport,
  layoutMode: 'single-player-parity',
  teamSummary,
  claimTimingLabel: sport === 'nfl' ? 'Processing next sim week' : 'Processing next sim day',
  pendingClaims,
  recentClaimResults,
  sections: {
    available: { title: 'Available Players', rows: availableRows },
    pending: { title: 'Pending Claims', rows: pendingRows },
    recent: { title: 'Recent Waiver Results', rows: resultRows }
  }
};
```

- [ ] **Step 2: Add roster-consequence summaries to available-player rows**

```js
const availableRows = freeAgents.map((player) => ({
  player,
  playerId: Number(player.id),
  consequenceLabel: roster.length >= rosterLimit ? 'Drop required to submit claim' : 'Open roster spot available',
  submitLabel: 'Submit Claim'
}));
```

- [ ] **Step 3: Run the adapter test to verify the waiver-desk contract passes**

Run: `node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js`
Expected: PASS.

- [ ] **Step 4: Save the adapter checkpoint locally**

Run:
```bash
git -C "C:\Users\jabro\Desktop\Fantasy Project\rosterbate" status --short
```
Expected: adapter and test files modified, with no commit required.

## Task 4: Render The Shared Simulation Waiver Desk And Wire Shell Actions

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js`

- [ ] **Step 1: Replace the reduced simulation waiver markup with a single-player-style waiver desk**

```js
function renderSimulationWaiverInSharedShell(){
  const vm = SEASON_MODE_ADAPTER.getWaiverViewModel();
  document.getElementById('waiverContent').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:18px;">
      <div class="season-hero-card season-card-pad">
        <div style="font-family:var(--fb);font-size:28px;font-weight:800;color:#f8fafc;">Waiver Desk</div>
        <div class="season-subbar-copy">${vm.claimTimingLabel}</div>
      </div>
      <div class="season-split-grid">
        ${renderWaiverSection(vm.sections.pending)}
        ${renderWaiverSection(vm.sections.recent)}
      </div>
      ${renderWaiverSection(vm.sections.available)}
    </div>
  `;
}
```

- [ ] **Step 2: Add shell actions for submit claim and cancel pending claim**

```js
function submitSimulationWaiverClaimFromShell(addPlayerId){
  const vm = SEASON_MODE_ADAPTER.getWaiverViewModel();
  const dropPlayerId = getSelectedSimulationWaiverDropPlayerId();
  SEASON_MODE_ADAPTER.submitWaiverClaim({ addPlayerId, dropPlayerId });
  renderSimulationWaiverInSharedShell();
}

function cancelSimulationWaiverClaimFromShell(claimId){
  SEASON_MODE_ADAPTER.cancelWaiverClaim(claimId);
  renderSimulationWaiverInSharedShell();
}
```

- [ ] **Step 3: Show clearer roster consequences before claim submission**

```js
<div class="season-soft-muted">${row.consequenceLabel}</div>
${row.dropOptions?.length ? renderDropSelector(row.dropOptions) : ''}
<button class="season-outline-btn" onclick="submitSimulationWaiverClaimFromShell(${row.playerId})">Submit Claim</button>
```

- [ ] **Step 4: Run the shared-shell test to verify the waiver desk passes**

Run: `node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js`
Expected: PASS.

- [ ] **Step 5: Save the shell checkpoint locally**

Run:
```bash
git -C "C:\Users\jabro\Desktop\Fantasy Project\rosterbate" status --short
```
Expected: shell and waiver tests modified, with no commit required.

## Task 5: Final Verification And Local QA Sweep

**Files:**
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-mode-runtime.js`
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-season-adapter.js`
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-mode-runtime.js`
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js`
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js`
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-nfl-shared-season-shell-weekly-sim.js`

- [ ] **Step 1: Run the full targeted regression set**

Run:
```bash
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-mode-runtime.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-season-adapter.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-shared-season-shell-simulation.js
node C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-nfl-shared-season-shell-weekly-sim.js
```
Expected: PASS.

- [ ] **Step 2: Check for patch hygiene**

Run:
```bash
git -C "C:\Users\jabro\Desktop\Fantasy Project\rosterbate" diff --check
```
Expected: no diff errors, only acceptable CRLF warnings if the worktree already produces them.

- [ ] **Step 3: Smoke-test locally in the browser**

Open and verify on `http://localhost:8080`:
```text
http://localhost:8080/rosterbate-season.html?sport=nba&simulation=nba_mixed_era
http://localhost:8080/rosterbate-season.html?sport=nfl&simulation=nfl_mixed_era
```
Expected:
- submitting a claim shows it as pending instead of resolving immediately
- full rosters require an explicit drop target
- advancing the sim resolves the claim on the correct NBA/NFL cadence
- roster and waiver screens reflect the resolution cleanly

- [ ] **Step 4: Save the final local state snapshot**

Run:
```bash
git -C "C:\Users\jabro\Desktop\Fantasy Project\rosterbate" status --short
```
Expected: only the intended local modifications are present, with no commit required.
