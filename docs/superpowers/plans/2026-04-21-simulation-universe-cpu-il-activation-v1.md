# Simulation-Universe CPU IL Activation V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make CPU-managed simulation-universe teams handle IL activations more credibly by using conservative healthy-only activations and safe IL swaps before lineup normalization.

**Architecture:** Keep the feature inside the existing `maintainCpuTeamRoster(...)` seam in `rosterbate-season.html` and add only a few local helper functions for readability. Cover the new behavior with one executable Node regression that extracts the roster-maintenance functions from the season page and one static seam check that verifies the sim-only gate and helper usage remain wired in place.

**Tech Stack:** Vanilla JavaScript inside `rosterbate-season.html`, Node `assert`/`vm` regression scripts, static HTML source inspection, PowerShell verification commands, Git commits on `main`.

---

## File Map

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
  Purpose: hold the existing CPU roster-maintenance seam, add conservative healthy-only activation helpers, add safe IL swap logic, and gate the behavior to simulation universes only.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-il-maintenance.js`
  Purpose: executable regression proving IL-eligible active players get stashed, healthy IL players activate when legal, `GTD` players stay on IL, safe swaps work when active space is full, and non-simulation/human teams remain unaffected.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-lineup-wiring.js`
  Purpose: static seam check proving the season page still routes CPU simulation behavior through explicit helper functions and keeps the new IL logic scoped to simulation universes.

### Task 1: Add A Failing CPU IL Maintenance Regression

**Files:**
- Create: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-il-maintenance.js`

- [ ] **Step 1: Write the failing CPU IL maintenance regression**

Create `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-il-maintenance.js` with this exact content:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'rosterbate-season.html'),
  'utf8'
);

function extractFunctionSource(name, nextName) {
  const start = html.indexOf(`function ${name}`);
  assert.ok(start >= 0, `missing ${name}`);
  const end = html.indexOf(`\nfunction ${nextName}`, start);
  assert.ok(end >= 0, `missing ${nextName}`);
  return html.slice(start, end);
}

function extractOptionalFunctionSource(name, nextName) {
  const start = html.indexOf(`function ${name}`);
  if (start < 0) return '';
  const end = html.indexOf(`\nfunction ${nextName}`, start);
  assert.ok(end >= 0, `missing ${nextName}`);
  return html.slice(start, end);
}

const getIlRosterSource = extractFunctionSource(
  'getIlRoster(teamIdx)',
  'isIlEligiblePlayer(player, injury)'
);
const isIlEligiblePlayerSource = extractFunctionSource(
  'isIlEligiblePlayer(player, injury)',
  'rebuildLineupsAfterRosterChange(teamIdx)'
);
const getCpuIlMaintenanceValueSource = extractOptionalFunctionSource(
  'getCpuIlMaintenanceValue(player)',
  'isHealthyCpuIlActivationCandidate(player, week)'
);
const isHealthyCpuIlActivationCandidateSource = extractOptionalFunctionSource(
  'isHealthyCpuIlActivationCandidate(player, week)',
  'getHealthyCpuIlActivationCandidates(ilRoster, week)'
);
const getHealthyCpuIlActivationCandidatesSource = extractOptionalFunctionSource(
  'getHealthyCpuIlActivationCandidates(ilRoster, week)',
  'getActiveCpuIlSwapCandidates(roster, week)'
);
const getActiveCpuIlSwapCandidatesSource = extractOptionalFunctionSource(
  'getActiveCpuIlSwapCandidates(roster, week)',
  'maintainCpuTeamRoster(teamIdx, options)'
);
const maintainCpuTeamRosterSource = extractFunctionSource(
  'maintainCpuTeamRoster(teamIdx, options)',
  'maintainCpuLeagueRosters(options)'
);

function makePlayer(id, name, fp) {
  return {
    id,
    name,
    fp,
    pos: 'UTIL'
  };
}

function buildContext(options = {}) {
  const normalizeCalls = [];
  const waiverCalls = [];
  const injuries = new Map(options.injuries || []);
  const context = {
    CURRENT_SPORT: 'nba',
    D: {
      leagueSize: 2,
      teams: ['User', 'CPU'],
      myPos: 0,
      multiplayer: false,
      historicalEntryMode: options.entryMode || 'simulation_season'
    },
    G: {
      day: options.day || 3,
      rosters: [
        [makePlayer(900, 'User Player', 10)],
        (options.roster || []).map(player => ({ ...player }))
      ],
      ilByTeam: [
        [],
        (options.ilRoster || []).map(player => ({ ...player }))
      ]
    },
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
      return options.ilSlots ?? 1;
    },
    getActiveRosterCapacity() {
      return options.activeCapacity ?? 2;
    },
    getInjuryStatus(player) {
      return injuries.get(Number(player?.id)) || null;
    },
    normalizeCpuTeamLineups(teamIdx) {
      normalizeCalls.push(teamIdx);
    },
    fillCpuTeamStarterNeedsFromWaivers(teamIdx, requestOptions) {
      waiverCalls.push({ teamIdx, requestOptions });
      return { changed: false, adds: 0, drops: 0 };
    },
    Number,
    Math,
    String,
    Array,
    console
  };

  vm.runInNewContext(
    [
      getIlRosterSource,
      isIlEligiblePlayerSource,
      getCpuIlMaintenanceValueSource,
      isHealthyCpuIlActivationCandidateSource,
      getHealthyCpuIlActivationCandidatesSource,
      getActiveCpuIlSwapCandidatesSource,
      maintainCpuTeamRosterSource
    ].filter(Boolean).join('\n'),
    context
  );

  return { context, normalizeCalls, waiverCalls };
}

{
  const { context, normalizeCalls, waiverCalls } = buildContext({
    roster: [makePlayer(1, 'Starter', 42)],
    ilRoster: [makePlayer(2, 'Healthy Return', 88)]
  });
  const result = context.maintainCpuTeamRoster(1, { day: 3 });
  assert.equal(result.activated, 1, 'expected a healthy IL player to activate into open active space');
  assert.deepStrictEqual(
    context.G.rosters[1].map(player => Number(player.id)),
    [1, 2]
  );
  assert.deepStrictEqual(context.G.ilByTeam[1], []);
  assert.deepStrictEqual(normalizeCalls, [1]);
  assert.equal(waiverCalls.length, 1, 'expected existing waiver maintenance to still run after IL moves');
}

{
  const { context } = buildContext({
    roster: [makePlayer(1, 'Starter', 42)],
    ilRoster: [makePlayer(2, 'Game Time Decision', 88)],
    injuries: [[2, { label: 'GTD' }]]
  });
  const result = context.maintainCpuTeamRoster(1, { day: 3 });
  assert.equal(result.activated, 0, 'expected GTD players to stay on IL under the conservative activation rule');
  assert.deepStrictEqual(
    context.G.ilByTeam[1].map(player => Number(player.id)),
    [2]
  );
  assert.deepStrictEqual(
    context.G.rosters[1].map(player => Number(player.id)),
    [1]
  );
}

{
  const { context } = buildContext({
    roster: [
      makePlayer(1, 'Healthy Starter', 55),
      makePlayer(2, 'Out Starter', 20)
    ],
    ilRoster: [makePlayer(3, 'Healthy Return', 90)],
    injuries: [[2, { label: 'OUT' }]],
    activeCapacity: 2,
    ilSlots: 1
  });
  const result = context.maintainCpuTeamRoster(1, { day: 3 });
  assert.equal(result.activated, 1, 'expected a healthy IL player to activate through a legal swap');
  assert.equal(result.movedToIl, 1, 'expected the active IL-eligible player to move back to IL during the swap');
  assert.deepStrictEqual(
    context.G.rosters[1].map(player => Number(player.id)).sort((a, b) => a - b),
    [1, 3]
  );
  assert.deepStrictEqual(
    context.G.ilByTeam[1].map(player => Number(player.id)),
    [2]
  );
}

{
  const { context } = buildContext({
    roster: [
      makePlayer(1, 'Healthy Starter', 55),
      makePlayer(2, 'Healthy Bench', 20)
    ],
    ilRoster: [makePlayer(3, 'Healthy Return', 90)],
    activeCapacity: 2,
    ilSlots: 1
  });
  const result = context.maintainCpuTeamRoster(1, { day: 3 });
  assert.equal(result.activated, 0, 'expected no activation when the active roster is full and no swap partner is IL eligible');
  assert.deepStrictEqual(
    context.G.rosters[1].map(player => Number(player.id)).sort((a, b) => a - b),
    [1, 2]
  );
  assert.deepStrictEqual(
    context.G.ilByTeam[1].map(player => Number(player.id)),
    [3]
  );
}

{
  const { context, normalizeCalls, waiverCalls } = buildContext({
    entryMode: 'historical_reimagined',
    roster: [makePlayer(1, 'Starter', 42)],
    ilRoster: [makePlayer(2, 'Healthy Return', 88)]
  });
  const result = context.maintainCpuTeamRoster(1, { day: 3 });
  assert.deepStrictEqual(
    result,
    { changed: false, movedToIl: 0, activated: 0, waiverAdds: 0, waiverDrops: 0 },
    'expected non-simulation universes to bypass the upgraded CPU IL logic'
  );
  assert.deepStrictEqual(context.G.rosters[1].map(player => Number(player.id)), [1]);
  assert.deepStrictEqual(context.G.ilByTeam[1].map(player => Number(player.id)), [2]);
  assert.deepStrictEqual(normalizeCalls, []);
  assert.deepStrictEqual(waiverCalls, []);
}

{
  const { context, normalizeCalls, waiverCalls } = buildContext({
    cpuManagedTeam: 99,
    roster: [makePlayer(1, 'Starter', 42)],
    ilRoster: [makePlayer(2, 'Healthy Return', 88)]
  });
  const result = context.maintainCpuTeamRoster(1, { day: 3 });
  assert.deepStrictEqual(
    result,
    { changed: false, movedToIl: 0, activated: 0, waiverAdds: 0, waiverDrops: 0 },
    'expected human teams to bypass CPU IL maintenance'
  );
  assert.deepStrictEqual(normalizeCalls, []);
  assert.deepStrictEqual(waiverCalls, []);
}

console.log('cpu sim il maintenance test passed');
```

- [ ] **Step 2: Run the new regression and verify it fails first**

Run:

```powershell
node .\tools\test-cpu-sim-il-maintenance.js
```

Expected: FAIL because the current maintainer activates `GTD` players from IL, does not gate itself to simulation universes, and cannot swap a healthy IL player back into a full active roster.

- [ ] **Step 3: Commit the failing test scaffold**

Run:

```powershell
git add .\tools\test-cpu-sim-il-maintenance.js
git commit -m "test: add cpu sim il maintenance coverage"
```

Expected: a commit that only adds the new failing regression.

### Task 2: Implement Conservative Activation And Safe IL Swaps

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-il-maintenance.js`

- [ ] **Step 1: Add small local helper functions above `maintainCpuTeamRoster(...)`**

In `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`, insert these helpers immediately above `function maintainCpuTeamRoster(teamIdx, options){`:

```js
function getCpuIlMaintenanceValue(player){
  return Number(player?.fp || 0);
}

function isHealthyCpuIlActivationCandidate(player, week){
  return getInjuryStatus(player, week) === null;
}

function getHealthyCpuIlActivationCandidates(ilRoster, week){
  return [...ilRoster]
    .filter(player=>isHealthyCpuIlActivationCandidate(player, week))
    .sort((a,b)=>getCpuIlMaintenanceValue(b)-getCpuIlMaintenanceValue(a));
}

function getActiveCpuIlSwapCandidates(roster, week){
  return [...roster]
    .filter(player=>isIlEligiblePlayer(player, getInjuryStatus(player, week)))
    .sort((a,b)=>getCpuIlMaintenanceValue(a)-getCpuIlMaintenanceValue(b));
}
```

- [ ] **Step 2: Upgrade `maintainCpuTeamRoster(...)` with sim-only gating, healthy-only activation, and safe swaps**

Replace the current body of `maintainCpuTeamRoster(...)` in `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html` with this exact implementation:

```js
function maintainCpuTeamRoster(teamIdx, options){
  if(!isCpuManagedTeam(teamIdx) || !isHistoricalSimulationUniverse(D)) return {changed:false,movedToIl:0,activated:0,waiverAdds:0,waiverDrops:0};
  const opts=options||{};
  const day=Number(opts.day || G.day || 1);
  const week=weekForDay(day);
  const roster=G.rosters[teamIdx]||[];
  const ilRoster=getIlRoster(teamIdx);
  const ilSlots=Math.max(0, getIlSlotCount());
  let movedToIl=0;
  let activated=0;

  if(ilSlots>0){
    const ilCandidates=[...roster]
      .filter(player=>isIlEligiblePlayer(player,getInjuryStatus(player,week)))
      .sort((a,b)=>getCpuIlMaintenanceValue(b)-getCpuIlMaintenanceValue(a));
    ilCandidates.forEach(player=>{
      if(ilRoster.length>=ilSlots) return;
      const rosterIndex=roster.findIndex(entry=>Number(entry?.id)===Number(player?.id));
      if(rosterIndex<0) return;
      const [moved]=roster.splice(rosterIndex,1);
      ilRoster.push(moved);
      movedToIl++;
    });

    const activeCapacity=getActiveRosterCapacity();
    const activationCandidates=getHealthyCpuIlActivationCandidates(ilRoster, week);
    activationCandidates.forEach(player=>{
      const ilIndex=ilRoster.findIndex(entry=>Number(entry?.id)===Number(player?.id));
      if(ilIndex<0) return;

      if(roster.length<activeCapacity){
        const [moved]=ilRoster.splice(ilIndex,1);
        roster.push(moved);
        activated++;
        return;
      }

      const swapCandidate=getActiveCpuIlSwapCandidates(roster, week)[0];
      if(!swapCandidate) return;
      const rosterIndex=roster.findIndex(entry=>Number(entry?.id)===Number(swapCandidate?.id));
      if(rosterIndex<0) return;

      const [activatedPlayer]=ilRoster.splice(ilIndex,1);
      const [swappedPlayer]=roster.splice(rosterIndex,1);
      roster.push(activatedPlayer);
      ilRoster.push(swappedPlayer);
      movedToIl++;
      activated++;
    });
  }

  normalizeCpuTeamLineups(teamIdx);
  const waiverResult=fillCpuTeamStarterNeedsFromWaivers(teamIdx, { day });
  const changed=!!(movedToIl || activated || waiverResult.changed);
  return {changed,movedToIl,activated,waiverAdds:Number(waiverResult.adds||0),waiverDrops:Number(waiverResult.drops||0)};
}
```

- [ ] **Step 3: Run the new IL regression and verify it passes**

Run:

```powershell
node .\tools\test-cpu-sim-il-maintenance.js
```

Expected: PASS with `cpu sim il maintenance test passed`.

- [ ] **Step 4: Commit the roster-maintenance implementation**

Run:

```powershell
git add .\rosterbate-season.html .\tools\test-cpu-sim-il-maintenance.js
git commit -m "feat: improve cpu sim il activation logic"
```

Expected: a commit containing only the season-page IL maintenance logic and the new regression.

### Task 3: Lock The Seam And Run The Focused Verification Sweep

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-lineup-wiring.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-lineup-wiring.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-il-maintenance.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-lineups.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-drafted-universe-snapshot.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-universe-slot-storage.js`

- [ ] **Step 1: Extend the wiring regression with a static seam check**

In `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-lineup-wiring.js`, add these assertions immediately after the existing script-load assertion:

```js
assert.match(
  html,
  /function isHealthyCpuIlActivationCandidate\(player, week\)/,
  'expected a helper that keeps CPU IL activations conservative and healthy-only'
);

assert.match(
  html,
  /function getActiveCpuIlSwapCandidates\(roster, week\)/,
  'expected a helper that selects legal IL swap candidates from the active roster'
);

assert.match(
  html,
  /function maintainCpuTeamRoster\(teamIdx, options\)\{[\s\S]*!isCpuManagedTeam\(teamIdx\)\s*\|\|\s*!isHistoricalSimulationUniverse\(D\)[\s\S]*isHealthyCpuIlActivationCandidate[\s\S]*getActiveCpuIlSwapCandidates/,
  'expected CPU IL maintenance to stay simulation-only and use the new conservative activation helpers'
);
```

- [ ] **Step 2: Run the seam check and focused verification sweep**

Run:

```powershell
node .\tools\test-cpu-sim-lineup-wiring.js
node .\tools\test-cpu-sim-il-maintenance.js
node .\tools\test-cpu-sim-lineups.js
node .\tools\test-historical-drafted-universe-snapshot.js
node .\tools\test-historical-universe-slot-storage.js
```

Expected:
- `test-cpu-sim-lineup-wiring.js` passes with no assertion failures
- `test-cpu-sim-il-maintenance.js` passes with `cpu sim il maintenance test passed`
- existing CPU lineup and historical universe snapshot/storage tests stay green

- [ ] **Step 3: Do one quick browser sanity check**

Open `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html?historical=sim` in a browser and confirm:
- the page boots without script errors
- a CPU simulation team with a healthy player on IL no longer leaves that player stranded when an open active slot or legal IL swap exists
- a `GTD` player does not get auto-activated from IL

- [ ] **Step 4: Commit the seam lock and verification update**

Run:

```powershell
git add .\tools\test-cpu-sim-lineup-wiring.js
git commit -m "test: lock cpu sim il maintenance seam"
```

Expected: a final small commit that locks the static seam check after the focused suite is green.
