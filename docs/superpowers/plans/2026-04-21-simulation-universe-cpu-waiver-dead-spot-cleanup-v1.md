# Simulation-Universe CPU Waiver Dead-Spot Cleanup V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add conservative, simulation-universe-only CPU waiver cleanup so AI teams still fill missing starters first and then replace only obvious dead bench spots when a waiver option is clearly better.

**Architecture:** Keep the work inside the existing CPU roster-maintenance seam in `rosterbate-season.html`. Extend the current legality-first waiver path with a second cleanup helper plus small scoring helpers, and guard the behavior with a dedicated runtime regression modeled after `test-cpu-sim-il-maintenance.js`.

**Tech Stack:** Plain browser JavaScript in `rosterbate-season.html`, Node-based regression tests using `node:assert`, `fs`, and `vm`

---

## File Map

- **Modify:** `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
  - keep `maintainCpuTeamRoster(...)` as the top-level seam
  - refine starter-fill scoring
  - add conservative dead-spot cleanup helper(s)
  - keep simulation-universe-only scope explicit

- **Create:** `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-waiver-maintenance.js`
  - dedicated regression for starter-fill plus dead-spot cleanup behavior

- **Regression suite reused without modification:**
  - `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-il-maintenance.js`
  - `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-lineups.js`
  - `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-lineup-wiring.js`
  - `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-drafted-universe-snapshot.js`
  - `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-universe-slot-storage.js`

---

### Task 1: Add the Dedicated CPU Waiver-Maintenance Regression

**Files:**
- Create: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-waiver-maintenance.js`
- Reference: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-il-maintenance.js`

- [ ] **Step 1: Write the failing regression file**

Create `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-waiver-maintenance.js` with this harness and these assertions:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'rosterbate-season.html'),
  'utf8'
);

function findMatchingBrace(source, openBraceIndex) {
  let depth = 0;
  let stringQuote = '';
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = openBraceIndex; index < source.length; index++) {
    const char = source[index];
    const nextChar = source[index + 1];

    if (inLineComment) {
      if (char === '\n') inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        inBlockComment = false;
        index++;
      }
      continue;
    }

    if (stringQuote) {
      if (char === '\\') {
        index++;
        continue;
      }
      if (char === stringQuote) {
        stringQuote = '';
      }
      continue;
    }

    if (char === '/' && nextChar === '/') {
      inLineComment = true;
      index++;
      continue;
    }

    if (char === '/' && nextChar === '*') {
      inBlockComment = true;
      index++;
      continue;
    }

    if (char === '\'' || char === '"' || char === '`') {
      stringQuote = char;
      continue;
    }

    if (char === '{') {
      depth++;
      continue;
    }

    if (char === '}') {
      depth--;
      if (depth === 0) return index;
    }
  }

  throw new Error(`missing closing brace near index ${openBraceIndex}`);
}

function extractFunctionSource(name) {
  const start = html.indexOf(`function ${name}`);
  assert.ok(start >= 0, `missing ${name}`);
  const openBrace = html.indexOf('{', start);
  assert.ok(openBrace >= 0, `missing body for ${name}`);
  const end = findMatchingBrace(html, openBrace);
  return html.slice(start, end + 1);
}

const getMissingStarterSlotsForTeamSource = extractFunctionSource(
  'getMissingStarterSlotsForTeam(teamIdx, day)'
);
const getBestCpuWaiverCandidateForSlotSource = extractFunctionSource(
  'getBestCpuWaiverCandidateForSlot(slot, day)'
);
const getCpuWaiverDropCandidateSource = extractFunctionSource(
  'getCpuWaiverDropCandidate(teamIdx, day, targetSlot)'
);
const fillCpuTeamStarterNeedsFromWaiversSource = extractFunctionSource(
  'fillCpuTeamStarterNeedsFromWaivers(teamIdx, options)'
);
const cleanupCpuDeadRosterSpotsFromWaiversSource = extractFunctionSource(
  'cleanupCpuDeadRosterSpotsFromWaivers(teamIdx, options)'
);
const maintainCpuTeamRosterSource = extractFunctionSource(
  'maintainCpuTeamRoster(teamIdx, options)'
);

function makePlayer(id, name, pos, fp, extra = {}) {
  return {
    id,
    name,
    pos,
    fp,
    team: extra.team || 'SIM',
    ...extra
  };
}

function buildContext(options = {}) {
  const normalizeCalls = [];
  const claimCalls = [];
  const injuries = new Map(options.injuries || []);
  const gamesToday = new Set(options.gamesToday || []);
  const starterIds = options.starterIds || [];
  const context = {
    STARTERS: 5,
    SLOT_LABELS: ['PG', 'SG', 'SF', 'PF', 'C'],
    CURRENT_SPORT: 'nba',
    D: {
      myPos: 0,
      multiplayer: false,
      historicalEntryMode: options.entryMode || 'simulation_season'
    },
    G: {
      day: options.day || 3,
      rosters: [
        [],
        (options.roster || []).map(player => ({ ...player }))
      ],
      waiver: (options.waiver || []).map(player => ({ ...player })),
      ilByTeam: [[], []]
    },
    Number,
    Math,
    String,
    Array,
    Object,
    console,
    isCpuManagedTeam(teamIdx) {
      if (typeof options.cpuManagedTeam === 'number') return teamIdx === options.cpuManagedTeam;
      return teamIdx === 1;
    },
    isHistoricalSimulationUniverse(state) {
      return String(state?.historicalEntryMode || '').trim().toLowerCase() === 'simulation_season';
    },
    weekForDay() {
      return 1;
    },
    getIlSlotCount() {
      return 1;
    },
    getIlRoster(teamIdx) {
      return context.G.ilByTeam[teamIdx] || [];
    },
    getActiveRosterCapacity() {
      return options.activeCapacity ?? 8;
    },
    hasOpenTotalRosterSlot(teamIdx) {
      const limit = options.totalRosterLimit ?? 8;
      return (context.G.rosters[teamIdx] || []).length < limit;
    },
    getStarterIdsForTeamDay() {
      return starterIds.slice();
    },
    normalizeCpuTeamLineups(teamIdx) {
      normalizeCalls.push(teamIdx);
    },
    claimWaiverPlayerForTeam(teamIdx, playerToAdd, droppedPlayer) {
      claimCalls.push({
        teamIdx,
        addId: Number(playerToAdd?.id),
        dropId: droppedPlayer ? Number(droppedPlayer.id) : null
      });
      const roster = context.G.rosters[teamIdx] || [];
      if (droppedPlayer) {
        const dropIndex = roster.findIndex(player => Number(player?.id) === Number(droppedPlayer?.id));
        if (dropIndex >= 0) roster.splice(dropIndex, 1);
      }
      roster.push({ ...playerToAdd });
      context.G.waiver = context.G.waiver.filter(player => Number(player.id) !== Number(playerToAdd.id));
      return true;
    },
    getInjuryStatus(player) {
      return injuries.get(Number(player?.id)) || null;
    },
    isUnavailableInjury(injury) {
      return ['OUT', 'IR', 'IL', 'SUSP'].includes(String(injury?.label || '').toUpperCase());
    },
    getGameInfo(player) {
      return gamesToday.has(Number(player?.id)) ? { opponent: 'SIM' } : null;
    },
    canPlayerFillSlot(player, slot) {
      const pos = String(player?.pos || '').toUpperCase();
      const target = String(slot || '').toUpperCase();
      if (pos === target) return true;
      if (target === 'G') return pos === 'PG' || pos === 'SG';
      if (target === 'F') return pos === 'SF' || pos === 'PF';
      if (target === 'UTIL') return ['PG', 'SG', 'SF', 'PF', 'C'].includes(pos);
      return false;
    },
    slotPriority(slot) {
      return ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL'].indexOf(String(slot || '').toUpperCase());
    },
    getCpuIlMaintenanceValue(player) {
      return Number(player?.fp || 0);
    }
  };

  vm.runInNewContext(
    [
      getMissingStarterSlotsForTeamSource,
      getBestCpuWaiverCandidateForSlotSource,
      getCpuWaiverDropCandidateSource,
      fillCpuTeamStarterNeedsFromWaiversSource,
      cleanupCpuDeadRosterSpotsFromWaiversSource,
      maintainCpuTeamRosterSource
    ].join('\n'),
    context
  );

  return { context, normalizeCalls, claimCalls };
}

{
  const { context, claimCalls } = buildContext({
    starterIds: [1, null, 3, 4, 5],
    roster: [
      makePlayer(1, 'Starter PG', 'PG', 50),
      makePlayer(3, 'Starter SF', 'SF', 48),
      makePlayer(4, 'Starter PF', 'PF', 47),
      makePlayer(5, 'Starter C', 'C', 52)
    ],
    waiver: [
      makePlayer(200, 'Playable SG', 'SG', 35),
      makePlayer(201, 'No-Game SG', 'SG', 44)
    ],
    gamesToday: [200]
  });
  const result = context.fillCpuTeamStarterNeedsFromWaivers(1, { day: 3 });
  assert.equal(result.adds, 1);
  assert.equal(claimCalls[0].addId, 200);
}

{
  const { context, claimCalls } = buildContext({
    roster: [
      makePlayer(10, 'Locked Starter', 'PG', 52),
      makePlayer(11, 'Dead Bench OUT', 'SG', 8),
      makePlayer(12, 'Usable Bench', 'SF', 26)
    ],
    waiver: [
      makePlayer(210, 'Live Upgrade', 'SG', 28),
      makePlayer(211, 'Low Waiver', 'SG', 9)
    ],
    injuries: [[11, { label: 'OUT' }]],
    gamesToday: [210],
    totalRosterLimit: 3,
    starterIds: [10, 12, null, null, null]
  });
  const result = context.cleanupCpuDeadRosterSpotsFromWaivers(1, { day: 3 });
  assert.equal(result.adds, 1);
  assert.equal(result.drops, 1);
  assert.deepStrictEqual(claimCalls[0], { teamIdx: 1, addId: 210, dropId: 11 });
}

{
  const { context, claimCalls } = buildContext({
    roster: [
      makePlayer(20, 'Starter', 'PG', 50),
      makePlayer(21, 'GTD Bench', 'SG', 12)
    ],
    waiver: [makePlayer(220, 'Healthy SG', 'SG', 24)],
    injuries: [[21, { label: 'GTD' }]],
    gamesToday: [220],
    totalRosterLimit: 2,
    starterIds: [20, null, null, null, null]
  });
  const result = context.cleanupCpuDeadRosterSpotsFromWaivers(1, { day: 3 });
  assert.equal(result.adds, 0);
  assert.equal(claimCalls.length, 0);
}

{
  const { context, claimCalls } = buildContext({
    roster: [
      makePlayer(30, 'Starter', 'PG', 50),
      makePlayer(31, 'Healthy Bench', 'SG', 18)
    ],
    waiver: [makePlayer(230, 'Tiny Upgrade', 'SG', 19)],
    gamesToday: [230],
    totalRosterLimit: 2,
    starterIds: [30, null, null, null, null]
  });
  const result = context.cleanupCpuDeadRosterSpotsFromWaivers(1, { day: 3 });
  assert.equal(result.adds, 0);
  assert.equal(claimCalls.length, 0);
}

{
  const { context, claimCalls } = buildContext({
    entryMode: 'historical_reimagined',
    roster: [
      makePlayer(40, 'Starter', 'PG', 50),
      makePlayer(41, 'Dead Bench OUT', 'SG', 8)
    ],
    waiver: [makePlayer(240, 'Live Upgrade', 'SG', 28)],
    injuries: [[41, { label: 'OUT' }]],
    gamesToday: [240],
    totalRosterLimit: 2,
    starterIds: [40, null, null, null, null]
  });
  const result = context.maintainCpuTeamRoster(1, { day: 3 });
  assert.equal(result.waiverAdds, 0);
  assert.equal(claimCalls.length, 0);
}

{
  const { context, claimCalls } = buildContext({
    cpuManagedTeam: 99,
    roster: [
      makePlayer(50, 'Starter', 'PG', 50),
      makePlayer(51, 'Dead Bench OUT', 'SG', 8)
    ],
    waiver: [makePlayer(250, 'Live Upgrade', 'SG', 28)],
    injuries: [[51, { label: 'OUT' }]],
    gamesToday: [250],
    totalRosterLimit: 2,
    starterIds: [50, null, null, null, null]
  });
  const result = context.maintainCpuTeamRoster(1, { day: 3 });
  assert.equal(result.changed, false);
  assert.equal(claimCalls.length, 0);
}

console.log('cpu sim waiver maintenance test passed');
```

- [ ] **Step 2: Run the new regression to verify it fails**

Run:

```powershell
node .\tools\test-cpu-sim-waiver-maintenance.js
```

Expected: FAIL because `cleanupCpuDeadRosterSpotsFromWaivers(...)` does not exist yet and the current waiver helpers do not satisfy the new cleanup assertions.

- [ ] **Step 3: Commit the failing test**

Run:

```powershell
git add .\tools\test-cpu-sim-waiver-maintenance.js
git commit -m "test: add cpu sim waiver maintenance coverage"
```

Expected: a commit containing only the new failing regression file.

---

### Task 2: Implement Conservative Waiver Cleanup in the Season Maintenance Seam

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-waiver-maintenance.js`

- [ ] **Step 1: Add small scoring helpers near the existing waiver helpers**

In `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`, add these helpers immediately above or beside the current waiver helper cluster:

```js
function getCpuWaiverStarterFillScore(player, slot, day){
  const week=weekForDay(day);
  const injury=getInjuryStatus(player, week);
  const unavailable=isUnavailableInjury(injury);
  const game=getGameInfo(player, day);
  const exactPos=String(player?.pos||'').toUpperCase()===String(slot||'').toUpperCase();
  return Number(player?.fp||0)
    + (game ? 500 : 0)
    + (exactPos ? 24 : 0)
    + (unavailable ? -1000 : injury ? -200 : 0);
}

function getCpuWaiverCleanupAddScore(player, day){
  const week=weekForDay(day);
  const injury=getInjuryStatus(player, week);
  const unavailable=isUnavailableInjury(injury);
  const game=getGameInfo(player, day);
  const broadUtility=['PG','SG','SF','PF','C'].includes(String(player?.pos||'').toUpperCase()) ? 30 : 0;
  return Number(player?.fp||0)
    + (game ? 220 : 0)
    + broadUtility
    + (unavailable ? -1000 : injury ? -180 : 0);
}

function getCpuWaiverCleanupDropScore(player, day){
  const week=weekForDay(day);
  const injury=getInjuryStatus(player, week);
  const unavailable=isUnavailableInjury(injury);
  const game=getGameInfo(player, day);
  return Number(player?.fp||0)
    + (game ? 80 : 0)
    + (unavailable ? -320 : injury ? -40 : 0);
}

function isCpuDeadRosterSpotCandidate(player, day){
  const injury=getInjuryStatus(player, weekForDay(day));
  const unavailable=isUnavailableInjury(injury);
  const game=getGameInfo(player, day);
  const value=Number(player?.fp||0);
  if(unavailable) return true;
  if(injury) return false;
  return !game && value <= 12;
}
```

- [ ] **Step 2: Route the current starter-fill helper through the new scoring function**

Replace the inline score logic in `getBestCpuWaiverCandidateForSlot(slot, day)` with:

```js
function getBestCpuWaiverCandidateForSlot(slot, day){
  const candidates=(G.waiver||[])
    .filter(Boolean)
    .filter(player=>canPlayerFillSlot(player, slot))
    .map(player=>({
      player,
      score:getCpuWaiverStarterFillScore(player, slot, day)
    }))
    .sort((a,b)=>b.score-a.score);
  return candidates[0]?.player || null;
}
```

Keep `getCpuWaiverDropCandidate(teamIdx, day, targetSlot)` unchanged in purpose, but refactor its internal score callback to use the same current semantics after this extraction if that keeps the code clearer.

- [ ] **Step 3: Add the conservative cleanup helper**

Add this helper below `fillCpuTeamStarterNeedsFromWaivers(...)`:

```js
function cleanupCpuDeadRosterSpotsFromWaivers(teamIdx, options){
  if(!isCpuManagedTeam(teamIdx) || !isHistoricalSimulationUniverse(D)){
    return {changed:false,adds:0,drops:0};
  }
  const opts=options||{};
  const day=Number(opts.day || G.day || 1);
  if(hasOpenTotalRosterSlot(teamIdx)) return {changed:false,adds:0,drops:0};
  const roster=G.rosters[teamIdx]||[];
  const starterSet=new Set(getStarterIdsForTeamDay(teamIdx, day).filter(Boolean));
  const deadBenchCandidates=roster
    .filter(player=>!starterSet.has(Number(player?.id)))
    .filter(player=>isCpuDeadRosterSpotCandidate(player, day))
    .map(player=>({
      player,
      score:getCpuWaiverCleanupDropScore(player, day)
    }))
    .sort((a,b)=>a.score-b.score);

  const dropCandidate=deadBenchCandidates[0]?.player || null;
  if(!dropCandidate) return {changed:false,adds:0,drops:0};

  const addCandidate=(G.waiver||[])
    .filter(Boolean)
    .map(player=>({
      player,
      score:getCpuWaiverCleanupAddScore(player, day)
    }))
    .sort((a,b)=>b.score-a.score)[0];

  if(!addCandidate?.player) return {changed:false,adds:0,drops:0};

  const upgradeMargin=addCandidate.score - getCpuWaiverCleanupDropScore(dropCandidate, day);
  if(upgradeMargin < 120) return {changed:false,adds:0,drops:0};

  const claimed=claimWaiverPlayerForTeam(teamIdx, {...addCandidate.player}, {...dropCandidate}, {
    toast:false,
    save:false,
    activityTitle:'CPU waiver cleanup',
    activityIcon:'🤖'
  });
  if(!claimed) return {changed:false,adds:0,drops:0};

  normalizeCpuTeamLineups(teamIdx);
  return {changed:true,adds:1,drops:1};
}
```

- [ ] **Step 4: Wire cleanup into `maintainCpuTeamRoster(...)` after starter legality is restored**

Update the bottom of `maintainCpuTeamRoster(...)` to this shape:

```js
  normalizeCpuTeamLineups(teamIdx);
  const waiverResult=fillCpuTeamStarterNeedsFromWaivers(teamIdx, { day });
  const hasMissingStarters=getMissingStarterSlotsForTeam(teamIdx, day).length>0;
  const cleanupResult=hasMissingStarters
    ? {changed:false,adds:0,drops:0}
    : cleanupCpuDeadRosterSpotsFromWaivers(teamIdx, { day });
  const changed=!!(
    movedToIl ||
    activated ||
    waiverResult.changed ||
    cleanupResult.changed
  );
  return {
    changed,
    movedToIl,
    activated,
    waiverAdds:Number(waiverResult.adds||0) + Number(cleanupResult.adds||0),
    waiverDrops:Number(waiverResult.drops||0) + Number(cleanupResult.drops||0)
  };
```

This preserves the intended order:

1. IL / activation
2. lineup normalization
3. starter-need waiver fill
4. dead-spot cleanup only after starter legality is restored

- [ ] **Step 5: Run the new regression and make it pass**

Run:

```powershell
node .\tools\test-cpu-sim-waiver-maintenance.js
```

Expected: PASS with `cpu sim waiver maintenance test passed`.

- [ ] **Step 6: Run the focused CPU regression suite**

Run:

```powershell
node .\tools\test-cpu-sim-waiver-maintenance.js
node .\tools\test-cpu-sim-il-maintenance.js
node .\tools\test-cpu-sim-lineups.js
node .\tools\test-cpu-sim-lineup-wiring.js
node .\tools\test-historical-drafted-universe-snapshot.js
node .\tools\test-historical-universe-slot-storage.js
```

Expected: all six commands PASS.

- [ ] **Step 7: Commit the implementation**

Run:

```powershell
git add .\rosterbate-season.html .\tools\test-cpu-sim-waiver-maintenance.js
git commit -m "feat: add cpu sim waiver dead-spot cleanup"
```

Expected: one implementation commit containing the season-page waiver logic and the passing focused regression.

---

### Task 3: Manual Simulation-Universe Sanity Check

**Files:**
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`

- [ ] **Step 1: Start a local server for the repo root if one is not already running**

Run this from the repo root:

```powershell
python -m http.server 8080
```

Expected: local server starts and serves the workspace on port `8080`.

- [ ] **Step 2: Open the historical simulation season page**

Open this URL in a browser:

```text
http://127.0.0.1:8080/rosterbate/rosterbate-season.html?historical=sim
```

Expected: the historical simulation season boots normally without JavaScript errors.

- [ ] **Step 3: Inspect a few CPU teams after day advance**

Use the existing simulation-universe flow and confirm all of the following:

```text
- a CPU team with an obvious dead bench OUT player no longer keeps that player indefinitely if a clearly better live waiver exists
- a GTD bench player is not churned immediately
- CPU teams still keep legal starter groups
- waiver activity does not look like daily streaming churn
```

Expected: the behavior is conservative and believable, not hyperactive.

- [ ] **Step 4: Commit only if the manual sanity check supports the automated read**

If the manual check reveals a real behavior bug, stop and open a follow-up spec instead of patching ad hoc.

If the manual check looks good, no additional code change is required for this task.

---

## Spec Coverage Check

- **Starter-legality-first waiver behavior:** covered by Task 1 starter-fill regression and Task 2 starter-fill helper refactor.
- **Conservative dead-spot cleanup:** covered by Task 1 dead-spot, GTD, and tiny-upgrade regressions plus Task 2 cleanup helper.
- **Simulation-universe-only scope:** covered by Task 1 non-simulation and human-team assertions plus Task 2 scope guard in cleanup helper.
- **Manual sim sanity:** covered by Task 3.

## Placeholder Scan

- No `TBD`, `TODO`, or deferred implementation markers remain.
- No task says "handle edge cases" without a concrete assertion or rule.
- The plan chooses one concrete path: dedicated regression plus season-page helper, with no optional wiring-test detour.

## Type / Naming Check

- `cleanupCpuDeadRosterSpotsFromWaivers(...)` is the only new cleanup helper referenced throughout.
- `getCpuWaiverStarterFillScore(...)`, `getCpuWaiverCleanupAddScore(...)`, `getCpuWaiverCleanupDropScore(...)`, and `isCpuDeadRosterSpotCandidate(...)` are named consistently in tests and implementation steps.
- `waiverAdds` / `waiverDrops` aggregation in `maintainCpuTeamRoster(...)` matches current return-shape conventions.
