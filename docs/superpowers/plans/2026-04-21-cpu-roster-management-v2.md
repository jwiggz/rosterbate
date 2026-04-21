# CPU Roster-Management V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make simulation-universe CPU waiver decisions more roster-need-aware by improving add scoring and conservative drop protection without turning the system into a proactive streamer.

**Architecture:** Keep the work inside the existing CPU roster-maintenance seam in `rosterbate-season.html`. Extend the shipped starter-fill and dead-spot cleanup helpers with a light roster-need summary, season-usefulness add scoring, a modest versatility bonus, and drop-side protection for valuable or scarce bench assets.

**Tech Stack:** Plain browser JavaScript in `rosterbate-season.html`, Node-based regression tests using `node:assert`, `fs`, and `vm`

---

## File Map

- **Modify:** `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
  - keep `maintainCpuTeamRoster(...)` as the top-level seam
  - extend the CPU waiver helper cluster around:
    - `getCpuWaiverStarterFillScore(...)`
    - `getCpuWaiverCleanupAddScore(...)`
    - `getCpuWaiverCleanupDropScore(...)`
    - `getBestCpuWaiverCandidateForSlot(...)`
    - `fillCpuTeamStarterNeedsFromWaivers(...)`
    - `cleanupCpuDeadRosterSpotsFromWaivers(...)`
  - add a light roster-need summary and small shared scoring helpers

- **Modify:** `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-waiver-maintenance.js`
  - extend the dedicated simulation-universe waiver regression to cover roster-need-aware adds, versatility, and scarce-asset drop protection

- **Regression suite reused without modification:**
  - `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-il-maintenance.js`
  - `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-lineups.js`
  - `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-lineup-wiring.js`
  - `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-drafted-universe-snapshot.js`
  - `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-universe-slot-storage.js`

---

### Task 1: Extend the Waiver Regression for Roster-Need V2

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-waiver-maintenance.js`

- [ ] **Step 1: Add helper extraction for the new roster-need seam**

Patch the top of `tools/test-cpu-sim-waiver-maintenance.js` so the harness extracts the new shared helpers before evaluating the season-page source:

```js
const getCpuWaiverPlayerSlotsSource = extractFunctionSource('getCpuWaiverPlayerSlots');
const getCpuWaiverRoleShapeSource = extractFunctionSource('getCpuWaiverRoleShape');
const buildCpuWaiverRosterNeedSummarySource = extractFunctionSource('buildCpuWaiverRosterNeedSummary');
const getCpuWaiverVersatilityBonusSource = extractFunctionSource('getCpuWaiverVersatilityBonus');
const getCpuWaiverRoleNeedBonusSource = extractFunctionSource('getCpuWaiverRoleNeedBonus');
const getCpuWaiverPositionNeedBonusSource = extractFunctionSource('getCpuWaiverPositionNeedBonus');
const getCpuWaiverDropProtectionBonusSource = extractFunctionSource('getCpuWaiverDropProtectionBonus');
```

And inject them into the `vm.runInNewContext(...)` source list ahead of the existing scoring helpers:

```js
  vm.runInNewContext(
    [
      getMissingStarterSlotsForTeamSource,
      getCpuWaiverPlayerSlotsSource,
      getCpuWaiverRoleShapeSource,
      buildCpuWaiverRosterNeedSummarySource,
      getCpuWaiverVersatilityBonusSource,
      getCpuWaiverRoleNeedBonusSource,
      getCpuWaiverPositionNeedBonusSource,
      getCpuWaiverDropProtectionBonusSource,
      getCpuWaiverStarterFillScoreSource,
      getCpuWaiverCleanupAddScoreSource,
      getCpuWaiverCleanupDropScoreSource,
      isCpuDeadRosterSpotCandidateSource,
      getBestCpuWaiverCandidateForSlotSource,
      getCpuWaiverDropCandidateSource,
      fillCpuTeamStarterNeedsFromWaiversSource,
      cleanupCpuDeadRosterSpotsFromWaiversSource
    ].filter(Boolean).join('\\n'),
    context
  );
```

- [ ] **Step 2: Add the new failing behavioral cases**

Append these focused scenarios after the existing cleanup tests:

```js
{
  const { context, claimCalls } = buildContext({
    starterIds: [401, null, 403, 404, 405],
    roster: [
      makePlayer(401, 'Starter PG', 'PG', 52, { ast: 8, pts: 16 }),
      makePlayer(403, 'Starter SF', 'SF', 49, { pts: 17, reb: 5 }),
      makePlayer(404, 'Starter PF', 'PF', 48, { reb: 8, blk: 1 }),
      makePlayer(405, 'Starter C', 'C', 50, { reb: 10, blk: 2 }),
      makePlayer(406, 'Bench Wing', 'SF', 18, { pts: 11, reb: 4 })
    ],
    waiver: [
      makePlayer(240, 'Scoring SG', 'SG', 30, { pts: 22, ast: 2 }),
      makePlayer(241, 'Playmaking Combo Guard', 'SG', 28, { pts: 15, ast: 7 })
    ],
    gamesToday: [240, 241]
  });
  context.fillCpuTeamStarterNeedsFromWaivers(1, { day: 3 });
  assert.equal(claimCalls[0].addId, 241);
}

{
  const { context, claimCalls } = buildContext({
    roster: [
      makePlayer(501, 'Starter PG', 'PG', 52, { ast: 8, pts: 15 }),
      makePlayer(502, 'Starter SG', 'SG', 50, { ast: 5, pts: 18 }),
      makePlayer(503, 'Starter SF', 'SF', 47, { pts: 17, reb: 4 }),
      makePlayer(504, 'Starter PF', 'PF', 45, { reb: 6, blk: 1 }),
      makePlayer(505, 'Starter C', 'C', 42, { reb: 8, blk: 1 }),
      makePlayer(506, 'Dead Bench OUT', 'PF', 9, { reb: 4 })
    ],
    waiver: [
      makePlayer(250, 'Versatile Big', 'PF/C', 24, { reb: 9, blk: 1 }),
      makePlayer(251, 'Narrow Wing', 'SF', 25, { pts: 18, reb: 3 })
    ],
    injuries: [[506, { label: 'OUT' }]],
    gamesToday: [250, 251],
    totalRosterLimit: 6,
    starterIds: [501, 502, 503, 504, 505]
  });
  const result = context.cleanupCpuDeadRosterSpotsFromWaivers(1, { day: 3 });
  assert.equal(result.adds, 1);
  assert.equal(claimCalls[0].addId, 250);
}

{
  const { context, claimCalls } = buildContext({
    roster: [
      makePlayer(601, 'Starter PG', 'PG', 52, { ast: 8, pts: 15 }),
      makePlayer(602, 'Starter SG', 'SG', 50, { ast: 5, pts: 18 }),
      makePlayer(603, 'Starter SF', 'SF', 48, { pts: 17, reb: 5 }),
      makePlayer(604, 'Starter PF', 'PF', 47, { reb: 7, blk: 1 }),
      makePlayer(605, 'Starter C', 'C', 51, { reb: 9, blk: 2 }),
      makePlayer(606, 'Bench Center Cover', 'C', 18, { reb: 8, blk: 1 }),
      makePlayer(607, 'Dead Bench OUT', 'SG', 8, { pts: 7 })
    ],
    waiver: [makePlayer(260, 'Decent Wing Add', 'SF', 24, { pts: 16, reb: 4 })],
    injuries: [[607, { label: 'OUT' }]],
    gamesToday: [260],
    totalRosterLimit: 7,
    starterIds: [601, 602, 603, 604, 605]
  });
  const dropCandidate = context.getCpuWaiverDropCandidate(1, 3, 'SF');
  assert.equal(Number(dropCandidate.id), 607);
  const result = context.cleanupCpuDeadRosterSpotsFromWaivers(1, { day: 3 });
  assert.equal(result.drops, 1);
  assert.equal(claimCalls[0].dropId, 607);
}

{
  const { context } = buildContext({
    roster: [
      makePlayer(701, 'Starter PG', 'PG', 51, { ast: 9, pts: 14 }),
      makePlayer(702, 'Starter SG', 'SG', 49, { ast: 3, pts: 18 }),
      makePlayer(703, 'Starter SF', 'SF', 48, { pts: 17, reb: 5 }),
      makePlayer(704, 'Starter PF', 'PF', 47, { reb: 8, blk: 1 }),
      makePlayer(705, 'Starter C', 'C', 52, { reb: 10, blk: 2 }),
      makePlayer(706, 'Bench Playmaker', 'PG', 20, { ast: 7, pts: 10 }),
      makePlayer(707, 'Dead Bench OUT', 'SF', 7, { pts: 6 })
    ],
    waiver: [makePlayer(270, 'Okay Forward', 'SF', 22, { pts: 15, reb: 4 })],
    injuries: [[707, { label: 'OUT' }]],
    gamesToday: [270],
    totalRosterLimit: 7,
    starterIds: [701, 702, 703, 704, 705]
  });
  const rosterNeed = context.buildCpuWaiverRosterNeedSummary(1, 3);
  const protectedScore = context.getCpuWaiverCleanupDropScore(
    context.G.rosters[1].find(player => Number(player.id) === 706),
    3,
    rosterNeed
  );
  const deadScore = context.getCpuWaiverCleanupDropScore(
    context.G.rosters[1].find(player => Number(player.id) === 707),
    3,
    rosterNeed
  );
  assert.ok(protectedScore > deadScore);
}
```

- [ ] **Step 3: Run the focused regression to verify it fails**

Run:

```powershell
node .\tools\test-cpu-sim-waiver-maintenance.js
```

Expected:
- FAIL because the new helper functions do not exist yet and/or the new assertions still reflect pre-v2 scoring.

---

### Task 2: Implement the Roster-Need V2 Scoring Helpers

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`

- [ ] **Step 1: Add light shared helpers above the existing waiver scoring functions**

Insert a compact helper cluster above `getCpuWaiverStarterFillScore(...)`:

```js
function getCpuWaiverPlayerSlots(player){
  const raw=String(player?.pos||'').toUpperCase();
  const parts=raw.split('/').map(part=>part.trim()).filter(Boolean);
  const slots=new Set(['UTIL']);
  parts.forEach(part=>{
    if(part==='PG' || part==='SG'){
      slots.add(part);
      slots.add('G');
    }else if(part==='SF' || part==='PF'){
      slots.add(part);
      slots.add('F');
    }else if(part==='C'){
      slots.add('C');
    }
  });
  return [...slots];
}

function getCpuWaiverRoleShape(player){
  const simRatings=player?.simProfile?.ratings||{};
  return {
    scoring:Number(player?.pts ?? player?.ppg ?? simRatings.scoring ?? player?.fp ?? 0),
    playmaking:Number(player?.ast ?? player?.apg ?? simRatings.playmaking ?? 0),
    rebounding:Number(player?.reb ?? player?.rpg ?? simRatings.rebounding ?? 0),
    defense:Number(player?.stl ?? 0) + Number(player?.blk ?? 0) + Number(simRatings.defense ?? 0)
  };
}

function getCpuWaiverVersatilityBonus(player){
  return Math.max(0, getCpuWaiverPlayerSlots(player).length - 2) * 12;
}
```

- [ ] **Step 2: Add the roster-need summary and targeted bonuses**

Continue the helper cluster with the team summary and small need/protection bonuses:

```js
function buildCpuWaiverRosterNeedSummary(teamIdx, day){
  const roster=G.rosters[teamIdx]||[];
  const starterSet=new Set(getStarterIdsForTeamDay(teamIdx, day).filter(Boolean).map(Number));
  const counts={G:0,F:0,C:0};
  const roleTotals={scoring:0,playmaking:0,rebounding:0,defense:0};

  roster.forEach(player=>{
    const slots=getCpuWaiverPlayerSlots(player);
    if(slots.includes('G')) counts.G++;
    if(slots.includes('F')) counts.F++;
    if(slots.includes('C')) counts.C++;
    const shape=getCpuWaiverRoleShape(player);
    roleTotals.scoring+=shape.scoring;
    roleTotals.playmaking+=shape.playmaking;
    roleTotals.rebounding+=shape.rebounding;
    roleTotals.defense+=shape.defense;
  });

  const needs={
    G: counts.G <= 2 ? 2 : counts.G <= 3 ? 1 : 0,
    F: counts.F <= 2 ? 2 : counts.F <= 3 ? 1 : 0,
    C: counts.C === 0 ? 3 : counts.C === 1 ? 2 : 0
  };

  const roleNeeds={
    scoring: roleTotals.scoring < 70 ? 2 : roleTotals.scoring < 90 ? 1 : 0,
    playmaking: roleTotals.playmaking < 24 ? 2 : roleTotals.playmaking < 34 ? 1 : 0,
    rebounding: roleTotals.rebounding < 32 ? 2 : roleTotals.rebounding < 42 ? 1 : 0,
    defense: roleTotals.defense < 10 ? 2 : roleTotals.defense < 15 ? 1 : 0
  };

  return {starterSet, positionNeeds:needs, roleNeeds};
}

function getCpuWaiverPositionNeedBonus(player, rosterNeed, targetSlot){
  const slots=getCpuWaiverPlayerSlots(player);
  let bonus=0;
  if(targetSlot && slots.includes(String(targetSlot).toUpperCase())) bonus+=20;
  if(slots.includes('G')) bonus+=Number(rosterNeed?.positionNeeds?.G||0) * 18;
  if(slots.includes('F')) bonus+=Number(rosterNeed?.positionNeeds?.F||0) * 18;
  if(slots.includes('C')) bonus+=Number(rosterNeed?.positionNeeds?.C||0) * 22;
  return bonus;
}

function getCpuWaiverRoleNeedBonus(player, rosterNeed){
  const shape=getCpuWaiverRoleShape(player);
  return (
    (shape.scoring * Number(rosterNeed?.roleNeeds?.scoring||0) * 0.4) +
    (shape.playmaking * Number(rosterNeed?.roleNeeds?.playmaking||0) * 0.7) +
    (shape.rebounding * Number(rosterNeed?.roleNeeds?.rebounding||0) * 0.5) +
    (shape.defense * Number(rosterNeed?.roleNeeds?.defense||0) * 0.9)
  );
}

function getCpuWaiverDropProtectionBonus(player, rosterNeed){
  return (
    Number(player?.fp||0) * 2 +
    getCpuWaiverPositionNeedBonus(player, rosterNeed, null) +
    getCpuWaiverRoleNeedBonus(player, rosterNeed) +
    getCpuWaiverVersatilityBonus(player)
  );
}
```

- [ ] **Step 3: Thread the new bonuses through the existing waiver scores**

Update the existing scoring functions so they accept a `rosterNeed` parameter and incorporate the new bonuses without changing the top-level flow:

```js
function getCpuWaiverStarterFillScore(player, slot, day, rosterNeed){
  const injury=getInjuryStatus(player, weekForDay(day));
  const unavailable=isUnavailableInjury(injury);
  const game=getGameInfo(player, day);
  const exactFit=canPlayerFillSlot(player, slot);
  return Number(player?.fp||0)
    + (game ? 180 : -120)
    + (exactFit ? 140 : 0)
    + getCpuWaiverPositionNeedBonus(player, rosterNeed, slot)
    + (getCpuWaiverRoleNeedBonus(player, rosterNeed) * 0.45)
    + getCpuWaiverVersatilityBonus(player)
    + (unavailable ? -1000 : injury ? -120 : 0);
}

function getCpuWaiverCleanupAddScore(player, day, rosterNeed){
  const injury=getInjuryStatus(player, weekForDay(day));
  const unavailable=isUnavailableInjury(injury);
  const game=getGameInfo(player, day);
  return Number(player?.fp||0)
    + (game ? 40 : -10)
    + getCpuWaiverPositionNeedBonus(player, rosterNeed, null)
    + getCpuWaiverRoleNeedBonus(player, rosterNeed)
    + getCpuWaiverVersatilityBonus(player)
    + (unavailable ? -1000 : injury ? -120 : 0);
}

function getCpuWaiverCleanupDropScore(player, day, rosterNeed){
  const injury=getInjuryStatus(player, weekForDay(day));
  const unavailable=isUnavailableInjury(injury);
  const game=getGameInfo(player, day);
  return Number(player?.fp||0)
    + (game ? 30 : -40)
    + getCpuWaiverDropProtectionBonus(player, rosterNeed)
    + (unavailable ? -240 : injury ? -20 : 0);
}
```

- [ ] **Step 4: Pass the new summary through the existing add/drop selection seam**

Update the callers instead of creating a parallel code path:

```js
function getBestCpuWaiverCandidateForSlot(slot, day, rosterNeed){
  const candidates=(G.waiver||[])
    .filter(Boolean)
    .filter(player=>canPlayerFillSlot(player, slot))
    .map(player=>({
      player,
      score:getCpuWaiverStarterFillScore(player, slot, day, rosterNeed)
    }))
    .sort((a,b)=>b.score-a.score);
  return candidates[0]?.player || null;
}

function fillCpuTeamStarterNeedsFromWaivers(teamIdx, options){
  if(!isCpuManagedTeam(teamIdx)) return {changed:false,adds:0,drops:0};
  const opts=options||{};
  const day=Number(opts.day || G.day || 1);
  const rosterNeed=buildCpuWaiverRosterNeedSummary(teamIdx, day);
  // keep the rest of the current loop structure intact
  // ...
  const addCandidate=getBestCpuWaiverCandidateForSlot(need.slot, day, rosterNeed);
}

function cleanupCpuDeadRosterSpotsFromWaivers(teamIdx, options){
  if(!isCpuManagedTeam(teamIdx)) return {changed:false,adds:0,drops:0};
  if(!isHistoricalSimulationUniverse(D)) return {changed:false,adds:0,drops:0};
  const opts=options||{};
  const day=Number(opts.day || G.day || 1);
  const rosterNeed=buildCpuWaiverRosterNeedSummary(teamIdx, day);
  // ...
  const dropCandidate=(G.rosters[teamIdx]||[])
    .filter(player=>!starterSet.has(Number(player?.id)))
    .filter(player=>isCpuDeadRosterSpotCandidate(player, day))
    .map(player=>({player,score:getCpuWaiverCleanupDropScore(player, day, rosterNeed)}))
    .sort((a,b)=>a.score-b.score)[0]?.player || null;

  const addEntry=(G.waiver||[])
    .filter(Boolean)
    .filter(player=>getInjuryStatus(player, week) === null)
    .map(player=>({player,score:getCpuWaiverCleanupAddScore(player, day, rosterNeed)}))
    .sort((a,b)=>b.score-a.score)[0] || null;
}
```

- [ ] **Step 5: Run the focused regression to verify it passes**

Run:

```powershell
node .\tools\test-cpu-sim-waiver-maintenance.js
```

Expected:
- PASS with `cpu sim waiver maintenance test passed`

- [ ] **Step 6: Commit the v2 scoring change**

Run:

```powershell
git add .\rosterbate-season.html .\tools\test-cpu-sim-waiver-maintenance.js
git commit -m "feat: add cpu roster-management v2 waiver scoring"
```

Expected:
- one commit capturing the helper additions, score refactor, and new regression coverage

---

### Task 3: Re-verify Scope and Simulation Safety

**Files:**
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-waiver-maintenance.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-il-maintenance.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-lineups.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-lineup-wiring.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-drafted-universe-snapshot.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-universe-slot-storage.js`

- [ ] **Step 1: Run the reused focused suite**

Run:

```powershell
node .\tools\test-cpu-sim-waiver-maintenance.js
node .\tools\test-cpu-sim-il-maintenance.js
node .\tools\test-cpu-sim-lineups.js
node .\tools\test-cpu-sim-lineup-wiring.js
node .\tools\test-historical-drafted-universe-snapshot.js
node .\tools\test-historical-universe-slot-storage.js
```

Expected:
- all commands pass
- no regression to IL maintenance, lineup behavior, or universe storage/snapshot seams

- [ ] **Step 2: Do one short manual simulation sanity pass**

Inspect a short simulation-universe run and confirm these specific outcomes:

```text
1. A missing-starter emergency still fills with a usable-today player.
2. A cleanup move prefers a broader-fit player when the roster is thin.
3. Valuable or scarce bench coverage is not the first thing dropped.
4. CPU teams are not churning healthy bench players daily.
```

Expected:
- the pass is qualitative but should confirm the new behavior still feels conservative

- [ ] **Step 3: Confirm the worktree is clean and ready to finish**

Run:

```powershell
git status --short --branch
```

Expected:
- clean branch state after the implementation commit

