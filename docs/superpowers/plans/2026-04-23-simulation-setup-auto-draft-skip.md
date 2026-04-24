# Simulation Setup Auto-Draft Skip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a setup-page `Sim Draft and Start Season` path that auto-generates the full mixed-era simulation league and sends the user straight into the shared season shell without opening the draft room.

**Architecture:** Keep the existing manual setup-to-draft flow intact, but add a second launch path on `rosterbate-simulation-setup.html` that reuses mixed-era pool validation, calls a new simulation runtime helper to auto-draft all teams into a normal completed simulation universe, writes that completed state to the existing completed-draft storage, and then redirects into the shared season shell. The finished state must match the same `nba_mixed_era_single_player_v1` lane already used by manual draft completion so season boot, archive routing, and universe details continue to work unchanged.

**Tech Stack:** Vanilla HTML/CSS/JS, inline setup-page script, shared browser/Node runtime module, localStorage-backed simulation handoff, Node `assert/fs/path/vm`, existing historical pack loader and mixed-era runtime.

---

## File Structure

- **Modify:** `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-mode-runtime.js`
  - Add one focused helper that turns a validated mixed-era simulation bootstrap into a completed auto-drafted simulation universe.
- **Modify:** `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-simulation-setup.html`
  - Add the second CTA, busy-state/status handling, and the setup-page fast path that writes the completed simulation state and redirects into the shared season shell.
- **Modify:** `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-mode-runtime.js`
  - Lock the runtime helper behavior: league-wide rosters fill correctly, the controlled franchise is preserved, and the leftover pool becomes free agents.
- **Modify:** `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-setup-page.js`
  - Lock the setup-page fast path, including button presence, status/busy behavior, completed-state writing, and the redirect into the shared season shell.

This feature should not require changes to:

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historical-universe-slots.js`
- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-draft.html`

Those surfaces should continue working because the auto path writes the same completed simulation universe shape the season shell already knows how to boot.

### Task 1: Add failing regressions for the auto-draft fast path

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-mode-runtime.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-setup-page.js`

- [ ] **Step 1: Extend the runtime test with the new auto-draft contract**

Add the new runtime import and assertions to `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-mode-runtime.js`:

```js
const {
  buildSimulationPlayerPool,
  buildSimulationUniverseBootstrap,
  buildCompletedSimulationAutoDraftState
} = require('../simulation-mode-runtime.js');

const autoDrafted = buildCompletedSimulationAutoDraftState({
  shell,
  mixedEraContext,
  controlledTeamAbbr: 'LAL'
});

assert.equal(autoDrafted.simulationMode, 'nba_mixed_era_single_player_v1');
assert.equal(autoDrafted.draftState.controlledTeamAbbr, 'LAL');
assert.equal(Object.keys(autoDrafted.draftState.rostersByTeam).length, 30);
assert.ok(
  Object.values(autoDrafted.draftState.rostersByTeam).every((roster) => Array.isArray(roster) && roster.length === 10),
  'auto draft should fill every team to the shell roster size'
);
assert.equal(
  new Set(Object.values(autoDrafted.draftState.rostersByTeam).flat().map((player) => Number(player.id))).size,
  300,
  'auto draft should use each drafted player exactly once'
);
assert.equal(autoDrafted.draftState.freeAgents.length, 60);
assert.equal(autoDrafted.seasonState.currentDay, 1);
assert.equal(autoDrafted.postseasonState.phase, 'regular_season');
```

- [ ] **Step 2: Extend the setup-page test with the fast-path assertions**

Update `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-setup-page.js` so it expects the second CTA and exercises the auto path:

```js
assert.match(setupHtml, /id="simulationAutoDraftBtn"/, 'setup page needs an auto-draft CTA');
assert.match(inlineScript, /function simDraftAndStartSeason\(\)/, 'setup page needs a setup-page auto-draft handler');
assert.match(inlineScript, /buildCompletedSimulationAutoDraftState/, 'setup page auto path should build a completed simulation universe directly');
assert.match(inlineScript, /writeCompletedSimulationState/, 'setup page auto path should write the completed simulation state');

const continueBtn = { disabled: false };
const autoDraftBtn = { disabled: false };
elementMap.simulationContinueBtn = continueBtn;
elementMap.simulationAutoDraftBtn = autoDraftBtn;

let completedDraftWrites = [];
context.window.RosterBateSimulationModeRuntime = {
  STORAGE_KEY: 'rbSimulationModeLocalState__fromRuntime',
  writeCompletedSimulationState(state){
    completedDraftWrites.push(state);
    return state;
  },
  buildCompletedSimulationAutoDraftState(input){
    return {
      simulationMode: 'nba_mixed_era_single_player_v1',
      leagueShell: input.shell,
      sourceSeasons: {
        sourcePackIds: input.mixedEraContext.sourcePackIds,
        sourceSeasonLabels: input.mixedEraContext.sourceSeasonLabels
      },
      draftState: {
        controlledTeamAbbr: input.controlledTeamAbbr,
        rostersByTeam: { LAL: [{ id: 23, name: 'Michael Jordan' }] },
        freeAgents: [{ id: 34, name: 'Hakeem Olajuwon' }]
      },
      seasonState: { currentDay: 1, currentWeek: 1, standings: [], activityLog: [] },
      postseasonState: { phase: 'regular_season', champion: null }
    };
  }
};

await context.simDraftAndStartSeason();

assert.equal(completedDraftWrites.length, 1, 'auto path should write one completed simulation universe');
assert.equal(completedDraftWrites[0].draftState.controlledTeamAbbr, 'LAL');
assert.equal(locationState.href, 'rosterbate-season.html?sport=nba&simulation=nba_mixed_era');
```

- [ ] **Step 3: Run the new regressions to verify they fail**

Run:

```powershell
node .\tools\test-simulation-mode-runtime.js
node .\tools\test-simulation-setup-page.js
```

Expected:

```text
AssertionError [ERR_ASSERTION]: setup page needs an auto-draft CTA
```

or:

```text
TypeError: buildCompletedSimulationAutoDraftState is not a function
```

- [ ] **Step 4: Commit the red tests**

```bash
git add .\tools\test-simulation-mode-runtime.js .\tools\test-simulation-setup-page.js
git commit -m "test: cover simulation setup auto-draft fast path"
```

### Task 2: Implement the runtime helper that auto-drafts the full league

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-mode-runtime.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-mode-runtime.js`

- [ ] **Step 1: Add the minimal runtime helper API**

Extend the exported API shape in `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-mode-runtime.js`:

```js
function getSimulationAutoDraftScore(player, roster){
  const pos = String(player?.pos || '').trim().toUpperCase();
  const overall = Number(player?.mixedEraOverall || player?.fp || 0);
  const existing = Array.isArray(roster) ? roster : [];
  const posSet = new Set(existing.map((entry) => String(entry?.pos || '').trim().toUpperCase()));
  const duplicateCount = existing.filter((entry) => String(entry?.pos || '').trim().toUpperCase() === pos).length;
  return overall + (pos && !posSet.has(pos) ? 12 : 0) - duplicateCount * 2;
}

function buildCompletedSimulationAutoDraftState({
  shell,
  mixedEraContext,
  controlledTeamAbbr
}){
  const bootstrap = buildSimulationUniverseBootstrap({
    shell,
    mixedEraContext,
    controlledTeamAbbr,
    draftSlot: 1
  });
  const next = clone(bootstrap);
  const rosterSize = Number(next?.draftState?.rosterSize || 10);
  const teamOrder = Array.isArray(next?.leagueShell?.teams) ? next.leagueShell.teams.map((team) => team.abbr) : [];
  const available = clone(next?.draftState?.draftPool || []);

  for (let round = 0; round < rosterSize; round += 1) {
    const order = round % 2 === 0 ? teamOrder.slice() : teamOrder.slice().reverse();
    order.forEach((teamAbbr) => {
      const roster = Array.isArray(next.draftState.rostersByTeam?.[teamAbbr]) ? next.draftState.rostersByTeam[teamAbbr] : [];
      const ranked = available
        .map((player, index) => ({ player, index, score: getSimulationAutoDraftScore(player, roster) }))
        .sort((a, b) => b.score - a.score || Number(b.player?.mixedEraOverall || 0) - Number(a.player?.mixedEraOverall || 0));
      const pick = ranked[0];
      if (!pick) return;
      roster.push(clone(pick.player));
      next.draftState.rostersByTeam[teamAbbr] = roster;
      available.splice(pick.index, 1);
    });
  }

  next.draftState.completedAt = Date.now();
  next.draftState.completedPicks = [];
  next.draftState.draftPool = [];
  next.draftState.freeAgents = clone(available);
  return next;
}
```

- [ ] **Step 2: Export the helper**

Update the runtime export list:

```js
const api = {
  STORAGE_KEY,
  COMPLETED_DRAFT_KEY,
  readCompletedSimulationState,
  writeCompletedSimulationState,
  buildSimulationPlayerPool,
  buildSimulationUniverseBootstrap,
  buildCompletedSimulationAutoDraftState,
  setSimulationLineup,
  claimSimulationFreeAgent,
  applySimulationTrade,
  applySimulationInjuryDesignations
};
```

- [ ] **Step 3: Run the runtime test to verify it passes**

Run:

```powershell
node .\tools\test-simulation-mode-runtime.js
```

Expected:

```text
simulation mode runtime test passed
```

- [ ] **Step 4: Commit the runtime helper**

```bash
git add .\simulation-mode-runtime.js .\tools\test-simulation-mode-runtime.js
git commit -m "feat: add simulation auto-draft runtime helper"
```

### Task 3: Add the setup-page fast path and season handoff

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-simulation-setup.html`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-setup-page.js`

- [ ] **Step 1: Add the second CTA and manual-only draft-slot copy**

Update the setup markup in `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-simulation-setup.html`:

```html
<div class="field">
  <label for="simulationDraftSlotSelect">Draft Slot <span class="helper-inline">Manual Draft Only</span></label>
  <select id="simulationDraftSlotSelect"></select>
</div>
<div class="setup-action-row">
  <button id="simulationContinueBtn" onclick="enterSimulationDraft()">Enter Draft</button>
  <button id="simulationAutoDraftBtn" onclick="simDraftAndStartSeason()">Sim Draft and Start Season</button>
</div>
<p class="helper-text">Enter the board manually, or auto-generate the full league and go straight to the season manager.</p>
```

- [ ] **Step 2: Add a small busy-state helper**

Add a focused setup-page UI helper:

```js
function setSimulationSetupBusy(isBusy){
  const disabled = !!isBusy;
  ['simulationContinueBtn', 'simulationAutoDraftBtn', 'simulationFranchiseSelect', 'simulationDraftSlotSelect'].forEach(function(id){
    const node = document.getElementById(id);
    if (node) node.disabled = disabled;
  });
  Array.from(document.querySelectorAll('#simulationSourceSeasonList input')).forEach(function(node){
    node.disabled = disabled;
  });
}

function buildSimulationSetupPayload(selectedPackIds){
  return {
    mode: 'nba_mixed_era_single_player_v1',
    sourcePackIds: selectedPackIds,
    controlledTeamAbbr: document.getElementById('simulationFranchiseSelect').value,
    draftSlot: Number(document.getElementById('simulationDraftSlotSelect').value || 1)
  };
}
```

- [ ] **Step 3: Implement the setup-page auto-draft flow**

Add the new handler and reuse the existing preview validation:

```js
async function simDraftAndStartSeason(){
  const selectedPackIds = getSelectedSimulationSourcePackIds();
  if (!selectedPackIds.length) {
    setSimulationSetupStatus('Select at least one historical season before starting the auto draft.');
    return;
  }

  const shell = getSimulationShell();
  let redirected = false;
  setSimulationSetupBusy(true);
  setSimulationSetupStatus('Building mixed-era player pool...');

  try{
    const preview = await buildSimulationPoolPreview(selectedPackIds, shell);
    if (!preview?.mixedEraContext || preview.playerCount < preview.requiredSlots) {
      setSimulationSetupStatus(
        'Add more source seasons. This setup only yields ' +
        String(preview?.playerCount || 0) +
        ' draftable players, but the 2025-26 NBA shell needs ' +
        String(preview?.requiredSlots || getSimulationRequiredDraftSlots(shell)) +
        '.'
      );
      return;
    }

    const payload = buildSimulationSetupPayload(selectedPackIds);
    setSimulationSetupStatus('Simulating league draft...');
    const finalState = window.RosterBateSimulationModeRuntime.buildCompletedSimulationAutoDraftState({
      shell,
      mixedEraContext: preview.mixedEraContext,
      controlledTeamAbbr: payload.controlledTeamAbbr
    });
    window.RosterBateSimulationModeRuntime.writeCompletedSimulationState(finalState);

    setSimulationSetupStatus('Opening season manager...');
    redirected = true;
    window.location.href = 'rosterbate-season.html?sport=nba&simulation=nba_mixed_era';
  }catch(error){
    console.error('[Simulation Setup] Failed to auto-draft simulation league', error);
    setSimulationSetupStatus('Unable to simulate the league draft right now.');
  }finally{
    if (!redirected) setSimulationSetupBusy(false);
  }
}
```

- [ ] **Step 4: Keep the manual draft path intact**

Refactor `enterSimulationDraft()` to reuse the setup payload helper without changing its destination:

```js
const payload = buildSimulationSetupPayload(selectedPackIds);
localStorage.setItem(SIMULATION_SETUP_STORAGE_KEY, JSON.stringify(payload));
window.location.href = 'rosterbate-draft.html?simulation=nba_mixed_era';
```

- [ ] **Step 5: Run the setup-page regression to verify it passes**

Run:

```powershell
node .\tools\test-simulation-setup-page.js
```

Expected:

```text
simulation setup page test passed
```

- [ ] **Step 6: Commit the setup-page fast path**

```bash
git add .\rosterbate-simulation-setup.html .\tools\test-simulation-setup-page.js
git commit -m "feat: add setup-page simulation auto-draft skip"
```

### Task 4: Run the focused regression suite and finish the feature

**Files:**
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\simulation-mode-runtime.js`
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-simulation-setup.html`
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-mode-runtime.js`
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-simulation-setup-page.js`

- [ ] **Step 1: Run the focused feature regressions**

Run:

```powershell
node .\tools\test-simulation-mode-runtime.js
node .\tools\test-simulation-setup-page.js
node .\tools\test-simulation-season-page.js
node .\tools\test-shared-season-shell-simulation.js
node .\tools\test-simulation-slot-routing.js
node .\tools\test-historical-universe-slot-storage.js
```

Expected:

```text
simulation mode runtime test passed
simulation setup page test passed
simulation season page test passed
shared season shell simulation test passed
simulation slot routing test passed
historical universe slot storage test passed
```

- [ ] **Step 2: Run patch hygiene**

Run:

```powershell
git diff --check
git status --short
```

Expected:

```text
[no output from git diff --check]
```

and `git status --short` should show only the intended modified files before commit.

- [ ] **Step 3: Commit the finished feature**

```bash
git add .\simulation-mode-runtime.js .\rosterbate-simulation-setup.html .\tools\test-simulation-mode-runtime.js .\tools\test-simulation-setup-page.js
git commit -m "feat: add simulation setup auto-draft fast path"
```

## Self-Review

### Spec coverage

- Setup-page second CTA: covered in Task 3
- Franchise still matters: covered in Task 3 payload and Task 1 setup assertions
- Draft slot manual-only: covered in Task 3 markup
- Auto-generated league with no draft-room stop: covered in Task 2 + Task 3
- Completed simulation payload shape reused: covered in Task 2 helper design
- Shared season-shell redirect: covered in Task 3 and Task 4 regressions
- Failure handling and no partial redirect: covered in Task 3

### Placeholder scan

- No `TODO`, `TBD`, or implied “handle later” language remains in task steps.
- Every code-changing step includes concrete code or exact commands.

### Type consistency

- The plan consistently uses:
  - `buildCompletedSimulationAutoDraftState`
  - `simDraftAndStartSeason`
  - `buildSimulationSetupPayload`
  - `writeCompletedSimulationState`
- All referenced functions are defined within the task sequence.
