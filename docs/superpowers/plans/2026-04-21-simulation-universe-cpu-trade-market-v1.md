# Simulation Universe CPU Trade Market V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a conservative CPU-to-CPU trade market for simulation universes so AI teams can occasionally correct real roster imbalances with direct `1-for-1` trades every `3` sim days.

**Architecture:** Keep the feature inside [C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/rosterbate-season.html) beside the existing simulation-universe CPU maintenance helpers. Reuse the current roster-need vocabulary from waiver logic, add a direct scheduled trade helper layer, and wire it into `maintainCpuLeagueRosters(...)` instead of the user-facing `tradeOffers` inbox flow.

**Tech Stack:** Vanilla HTML/CSS/JS in `rosterbate-season.html`, Node.js `assert/fs/path/vm` regression tests in `tools/`, existing sim-universe CPU maintenance helpers, existing `activityLog` surface

---

### Task 1: Add a focused failing regression for CPU trade-market helpers and cadence wiring

**Files:**
- Create: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-trade-market.js`
- Reference: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`

- [ ] **Step 1: Create the new test file and extract the planned trade-market seam**

Start a new focused regression at `tools/test-cpu-sim-trade-market.js` using the same extraction style as the other CPU sim tests:

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

  for (let index = openBraceIndex; index < source.length; index += 1) {
    const char = source[index];
    const nextChar = source[index + 1];
    if (inLineComment) {
      if (char === '\n') inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }
    if (stringQuote) {
      if (char === '\\') {
        index += 1;
        continue;
      }
      if (char === stringQuote) stringQuote = '';
      continue;
    }
    if (char === '/' && nextChar === '/') {
      inLineComment = true;
      index += 1;
      continue;
    }
    if (char === '/' && nextChar === '*') {
      inBlockComment = true;
      index += 1;
      continue;
    }
    if (char === '\'' || char === '"' || char === '`') {
      stringQuote = char;
      continue;
    }
    if (char === '{') {
      depth += 1;
      continue;
    }
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  throw new Error(`missing closing brace near index ${openBraceIndex}`);
}

function extractFunctionSource(name, { optional = false } = {}) {
  const startPattern = new RegExp(`function\\s+${name}\\b`);
  const startMatch = startPattern.exec(html);
  if (!startMatch) {
    if (optional) return null;
    assert.fail(`missing ${name}`);
  }
  const start = startMatch.index;
  const openBrace = html.indexOf('{', start);
  assert.ok(openBrace >= 0, `missing body for ${name}`);
  const end = findMatchingBrace(html, openBrace);
  return html.slice(start, end + 1);
}

const helperSources = [
  'isCpuTradeSimulationUniverse',
  'shouldRunCpuTradeMarketForDay',
  'getCpuTradeProtectedPlayerIds',
  'getCpuTradeOutgoingCandidates',
  'getCpuTradeIncomingFitScore',
  'buildCpuTradeProposalForPair',
  'executeCpuTradeProposal',
  'runCpuTradeMarketForDay',
  'maintainCpuLeagueRosters'
].map(name => extractFunctionSource(name));
```

- [ ] **Step 2: Build a simulation-only fixture context with controllable needs, protections, and activity logging**

Add a fixture builder that gives the trade helper a realistic CPU-only league and reusable player shapes:

```js
function makePlayer(id, name, pos, fp, extra = {}) {
  return {
    id,
    name,
    pos,
    fp,
    team: extra.team || 'SIM',
    simProfile: extra.simProfile || null,
    ...extra
  };
}

function makeShape({ scoring = 0, playmaking = 0, rebounding = 0, defense = 0 }) {
  return {
    baseline: {
      pts: scoring,
      ast: playmaking,
      reb: rebounding,
      stl: defense / 2,
      blk: defense / 2
    },
    ratings: {
      scoring: scoring * 4,
      playmaking: playmaking * 12,
      rebounding: rebounding * 8,
      defense: defense * 24,
      overall: 70
    }
  };
}

function buildContext(options = {}) {
  const activityCalls = [];
  const lineupCalls = [];
  const context = {
    CURRENT_SPORT: 'nba',
    D: {
      myPos: 0,
      multiplayer: false,
      historicalEntryMode: options.entryMode || 'simulation_season',
      teams: ['User Team', 'CPU Team 1', 'CPU Team 2', 'CPU Team 3']
    },
    G: {
      day: options.day || 3,
      rosters: options.rosters.map(team => team.map(player => ({ ...player }))),
      starters: options.starters || [[], [], [], []],
      activityLog: [],
      tradeOffers: []
    },
    console,
    Number,
    Math,
    String,
    Array,
    Object,
    isHistoricalSimulationUniverse(state) {
      return String(state?.historicalEntryMode || '').trim().toLowerCase() === 'simulation_season';
    },
    isCpuManagedTeam(teamIdx) {
      return Number(teamIdx) !== 0;
    },
    weekForDay() {
      return 1;
    },
    teamName(teamIdx) {
      return context.D.teams[teamIdx] || `Team ${teamIdx + 1}`;
    },
    getStarterIdsForTeamDay(teamIdx) {
      return (context.G.starters[teamIdx] || []).slice();
    },
    normalizeCpuTeamLineups(teamIdx) {
      lineupCalls.push(teamIdx);
    },
    logActivity(type, title, text, teamIdx, icon) {
      activityCalls.push({ type, title, text, teamIdx, icon });
      context.G.activityLog.unshift({ type, title, text, teamIdx, icon, ts: Date.now() });
    },
    maintainCpuTeamRoster(teamIdx) {
      return { changed:false, movedToIl:0, activated:0, waiverAdds:0, waiverDrops:0, teamIdx };
    },
    buildCpuWaiverRosterNeedSummary(teamIdx) {
      return options.needSummaryByTeam[teamIdx];
    },
    getCpuWaiverDropProtectionBonus(player) {
      return Number(player.protectionScore || 0);
    },
    getCpuWaiverPlayerSlots(player) {
      const pos = String(player?.pos || '').toUpperCase();
      if (pos === 'PG' || pos === 'SG') return [pos, 'G', 'UTIL'];
      if (pos === 'SF' || pos === 'PF') return [pos, 'F', 'UTIL'];
      if (pos === 'C') return ['C', 'UTIL'];
      return [pos];
    },
    getCpuWaiverRoleShape(player) {
      return player?.simProfile?.baseline
        ? {
            scoring: Number(player.simProfile.baseline.pts || 0),
            playmaking: Number(player.simProfile.baseline.ast || 0),
            rebounding: Number(player.simProfile.baseline.reb || 0),
            defense: Number(player.simProfile.baseline.stl || 0) + Number(player.simProfile.baseline.blk || 0)
          }
        : { scoring:0, playmaking:0, rebounding:0, defense:0 };
    }
  };

  vm.runInNewContext(helperSources.join('\n'), context);
  return { context, activityCalls, lineupCalls };
}
```

- [ ] **Step 3: Add failing assertions for cadence, opposite-need matching, protected-core safety, and one-trade-per-check**

Write concrete expectations that describe the approved `v1` behavior:

```js
const starBig = makePlayer(201, 'Star Big', 'C', 45, {
  protectionScore: 240,
  simProfile: makeShape({ scoring: 22, rebounding: 12, defense: 3 })
});
const benchBig = makePlayer(202, 'Bench Big', 'C', 27, {
  protectionScore: 60,
  simProfile: makeShape({ scoring: 12, rebounding: 10, defense: 2 })
});
const starGuard = makePlayer(301, 'Star Guard', 'PG', 44, {
  protectionScore: 235,
  simProfile: makeShape({ scoring: 23, playmaking: 9, defense: 2 })
});
const benchCreator = makePlayer(302, 'Bench Creator', 'PG', 28, {
  protectionScore: 70,
  simProfile: makeShape({ scoring: 14, playmaking: 8, defense: 1 })
});

const { context, activityCalls, lineupCalls } = buildContext({
  day: 3,
  rosters: [
    [],
    [starBig, benchBig, makePlayer(203, 'Wing Stopper', 'SF', 24, { protectionScore: 120, simProfile: makeShape({ scoring: 10, defense: 3 }) })],
    [starGuard, benchCreator, makePlayer(303, 'Stretch Four', 'PF', 24, { protectionScore: 110, simProfile: makeShape({ scoring: 12, rebounding: 6 }) })],
    [makePlayer(401, 'Quiet Wing', 'SF', 18, { simProfile: makeShape({ scoring: 11, defense: 1 }) })]
  ],
  needSummaryByTeam: {
    1: {
      positionNeed: { G: 2, F: 0, C: 0 },
      roleNeed: { scoring: 0, playmaking: 2, rebounding: 0, defense: 0 }
    },
    2: {
      positionNeed: { G: 0, F: 0, C: 2 },
      roleNeed: { scoring: 0, playmaking: 0, rebounding: 2, defense: 0 }
    },
    3: {
      positionNeed: { G: 0, F: 0, C: 0 },
      roleNeed: { scoring: 0, playmaking: 0, rebounding: 0, defense: 0 }
    }
  }
});

assert.equal(context.shouldRunCpuTradeMarketForDay(2), false);
assert.equal(context.shouldRunCpuTradeMarketForDay(3), true);

const tradeResult = context.runCpuTradeMarketForDay(3);
assert.equal(tradeResult.tradesCompleted, 1);
assert.ok(context.G.rosters[1].some(player => player.name === 'Bench Creator'));
assert.ok(context.G.rosters[2].some(player => player.name === 'Bench Big'));
assert.ok(context.G.rosters[1].some(player => player.name === 'Star Big'));
assert.ok(context.G.rosters[2].some(player => player.name === 'Star Guard'));
assert.equal(activityCalls.filter(entry => entry.type === 'trade').length, 1);
assert.ok(lineupCalls.includes(1) && lineupCalls.includes(2));
```

Then add a rejection case:

```js
const offCadence = buildContext({
  day: 2,
  rosters: [[], [starBig, benchBig], [starGuard, benchCreator], []],
  needSummaryByTeam: {
    1: { positionNeed:{ G:2, F:0, C:0 }, roleNeed:{ scoring:0, playmaking:2, rebounding:0, defense:0 } },
    2: { positionNeed:{ G:0, F:0, C:2 }, roleNeed:{ scoring:0, playmaking:0, rebounding:2, defense:0 } },
    3: { positionNeed:{ G:0, F:0, C:0 }, roleNeed:{ scoring:0, playmaking:0, rebounding:0, defense:0 } }
  }
});
assert.equal(offCadence.context.runCpuTradeMarketForDay(2).tradesCompleted, 0);
```

And a maintainer wiring expectation:

```js
const maintenanceResult = context.maintainCpuLeagueRosters({ day: 3 });
assert.equal(maintenanceResult.tradesCompleted, 1);
assert.match(activityCalls[0].title, /CPU trade completed/i);
```

- [ ] **Step 4: Run the new focused test and verify it fails on the missing trade-market seam**

Run:

```bash
node .\tools\test-cpu-sim-trade-market.js
```

Expected:

- `FAIL`
- missing `isCpuTradeSimulationUniverse`, `runCpuTradeMarketForDay`, or the new trade-related wiring inside `maintainCpuLeagueRosters`

- [ ] **Step 5: Commit the failing regression**

```bash
git add tools/test-cpu-sim-trade-market.js
git commit -m "test: add cpu sim trade market regression"
```

### Task 2: Implement the direct CPU trade-market helper layer

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-trade-market.js`

- [ ] **Step 1: Add cadence and universe-gating helpers beside the existing CPU maintenance helpers**

Insert these constants and the initial helper seam near the waiver-maintenance functions:

```js
const CPU_TRADE_MARKET_CADENCE_DAYS = 3;
const CPU_TRADE_FAIRNESS_DELTA = 18;
const CPU_TRADE_PROTECTED_CORE_COUNT = 2;

function isCpuTradeSimulationUniverse(){
  return CURRENT_SPORT === 'nba' && isHistoricalSimulationUniverse(D);
}

function shouldRunCpuTradeMarketForDay(day){
  const numericDay = Number(day || 0);
  return isCpuTradeSimulationUniverse()
    && numericDay > 1
    && numericDay % CPU_TRADE_MARKET_CADENCE_DAYS === 0;
}
```

- [ ] **Step 2: Add protected-core and outgoing-candidate helpers that prefer under-trading**

Implement a deterministic protected-core rule that keeps stars and thin-position anchors off the table:

```js
function getCpuTradeProtectedPlayerIds(teamIdx, day, rosterNeed){
  const roster = G.rosters[teamIdx] || [];
  const protectedIds = new Set();
  const topByValue = [...roster]
    .sort((a, b) => Number(b?.fp || 0) - Number(a?.fp || 0))
    .slice(0, CPU_TRADE_PROTECTED_CORE_COUNT);
  topByValue.forEach(player => protectedIds.add(Number(player?.id)));

  roster.forEach(player => {
    const protection = getCpuWaiverDropProtectionBonus(player, rosterNeed);
    if (protection >= 170) protectedIds.add(Number(player?.id));
  });

  return protectedIds;
}

function getCpuTradeOutgoingCandidates(teamIdx, day, rosterNeed, protectedIds){
  const roster = G.rosters[teamIdx] || [];
  const starterSet = new Set(getStarterIdsForTeamDay(teamIdx, day).filter(Boolean).map(Number));
  return roster
    .filter(player => !protectedIds.has(Number(player?.id)))
    .map(player => {
      const slots = getCpuWaiverPlayerSlots(player);
      const shape = getCpuWaiverRoleShape(player);
      const benchBonus = starterSet.has(Number(player?.id)) ? 0 : 24;
      const surplusBonus =
        (slots.includes('G') ? Math.max(0, 2 - Number(rosterNeed?.positionNeed?.G || 0)) * 8 : 0) +
        (slots.includes('F') ? Math.max(0, 2 - Number(rosterNeed?.positionNeed?.F || 0)) * 8 : 0) +
        (slots.includes('C') ? Math.max(0, 2 - Number(rosterNeed?.positionNeed?.C || 0)) * 10 : 0) +
        (shape.playmaking >= 5 ? Math.max(0, 2 - Number(rosterNeed?.roleNeed?.playmaking || 0)) * 6 : 0) +
        (shape.rebounding >= 7 ? Math.max(0, 2 - Number(rosterNeed?.roleNeed?.rebounding || 0)) * 6 : 0);
      return {
        player,
        score: benchBonus + surplusBonus - getCpuWaiverDropProtectionBonus(player, rosterNeed)
      };
    })
    .sort((a, b) => b.score - a.score);
}
```

- [ ] **Step 3: Add fit scoring, pair proposal, and direct execution helpers**

Keep the matching logic conservative and pairwise:

```js
function getCpuTradeIncomingFitScore(teamIdx, player, day, rosterNeed){
  const slots = getCpuWaiverPlayerSlots(player);
  const shape = getCpuWaiverRoleShape(player);
  return Number(player?.fp || 0)
    + (slots.includes('G') ? Number(rosterNeed?.positionNeed?.G || 0) * 12 : 0)
    + (slots.includes('F') ? Number(rosterNeed?.positionNeed?.F || 0) * 10 : 0)
    + (slots.includes('C') ? Number(rosterNeed?.positionNeed?.C || 0) * 14 : 0)
    + (shape.scoring >= 16 ? Number(rosterNeed?.roleNeed?.scoring || 0) * 4 : 0)
    + (shape.playmaking >= 5 ? Number(rosterNeed?.roleNeed?.playmaking || 0) * 8 : 0)
    + (shape.rebounding >= 7 ? Number(rosterNeed?.roleNeed?.rebounding || 0) * 6 : 0)
    + (shape.defense >= 1.8 ? Number(rosterNeed?.roleNeed?.defense || 0) * 4 : 0)
    + getCpuWaiverVersatilityBonus(player);
}

function buildCpuTradeProposalForPair(fromTeamIdx, toTeamIdx, day){
  const fromNeed = buildCpuWaiverRosterNeedSummary(fromTeamIdx, day);
  const toNeed = buildCpuWaiverRosterNeedSummary(toTeamIdx, day);
  const fromProtected = getCpuTradeProtectedPlayerIds(fromTeamIdx, day, fromNeed);
  const toProtected = getCpuTradeProtectedPlayerIds(toTeamIdx, day, toNeed);
  const fromOutgoing = getCpuTradeOutgoingCandidates(fromTeamIdx, day, fromNeed, fromProtected);
  const toOutgoing = getCpuTradeOutgoingCandidates(toTeamIdx, day, toNeed, toProtected);

  let best = null;
  fromOutgoing.forEach(outgoingEntry => {
    toOutgoing.forEach(incomingEntry => {
      const outgoingPlayer = outgoingEntry.player;
      const incomingPlayer = incomingEntry.player;
      const fromIncomingFit = getCpuTradeIncomingFitScore(fromTeamIdx, incomingPlayer, day, fromNeed);
      const toIncomingFit = getCpuTradeIncomingFitScore(toTeamIdx, outgoingPlayer, day, toNeed);
      const fromLoss = getCpuWaiverDropProtectionBonus(outgoingPlayer, fromNeed);
      const toLoss = getCpuWaiverDropProtectionBonus(incomingPlayer, toNeed);
      const fairnessGap = Math.abs(Number(outgoingPlayer?.fp || 0) - Number(incomingPlayer?.fp || 0));
      if (fairnessGap > CPU_TRADE_FAIRNESS_DELTA) return;
      if (fromIncomingFit <= fromLoss || toIncomingFit <= toLoss) return;

      const score = (fromIncomingFit - fromLoss) + (toIncomingFit - toLoss) - fairnessGap;
      if (!best || score > best.score){
        best = {
          score,
          fromTeamIdx,
          toTeamIdx,
          outgoingPlayer,
          incomingPlayer
        };
      }
    });
  });
  return best;
}

function executeCpuTradeProposal(proposal, options){
  if (!proposal) return false;
  const opts = options || {};
  const fromRoster = G.rosters[proposal.fromTeamIdx] || [];
  const toRoster = G.rosters[proposal.toTeamIdx] || [];
  const fromIndex = fromRoster.findIndex(player => Number(player?.id) === Number(proposal.outgoingPlayer?.id));
  const toIndex = toRoster.findIndex(player => Number(player?.id) === Number(proposal.incomingPlayer?.id));
  if (fromIndex < 0 || toIndex < 0) return false;

  const [sentPlayer] = fromRoster.splice(fromIndex, 1);
  const [receivedPlayer] = toRoster.splice(toIndex, 1);
  fromRoster.push(receivedPlayer);
  toRoster.push(sentPlayer);
  normalizeCpuTeamLineups(proposal.fromTeamIdx);
  normalizeCpuTeamLineups(proposal.toTeamIdx);
  logActivity(
    'trade',
    opts.activityTitle || 'CPU trade completed',
    `${teamName(proposal.fromTeamIdx)} traded ${sentPlayer.name} to ${teamName(proposal.toTeamIdx)} for ${receivedPlayer.name}.`,
    D.myPos,
    '🤝'
  );
  return true;
}
```

- [ ] **Step 4: Implement the market runner and verify the new focused test passes at the helper layer**

Add the direct market runner:

```js
function runCpuTradeMarketForDay(day, options){
  const numericDay = Number(day || G.day || 1);
  if (!shouldRunCpuTradeMarketForDay(numericDay)) return { changed:false, tradesCompleted:0 };

  const cpuTeams = Array.from({ length: G.rosters.length }, (_, teamIdx) => teamIdx)
    .filter(teamIdx => isCpuManagedTeam(teamIdx));
  let completed = 0;

  for (let index = 0; index < cpuTeams.length && completed < 1; index += 1){
    const fromTeamIdx = cpuTeams[index];
    for (let inner = index + 1; inner < cpuTeams.length && completed < 1; inner += 1){
      const toTeamIdx = cpuTeams[inner];
      const proposal = buildCpuTradeProposalForPair(fromTeamIdx, toTeamIdx, numericDay);
      if (!proposal) continue;
      if (executeCpuTradeProposal(proposal, options)){
        completed += 1;
      }
    }
  }

  return { changed: completed > 0, tradesCompleted: completed };
}
```

Run:

```bash
node .\tools\test-cpu-sim-trade-market.js
```

Expected:

- helper-level assertions pass
- maintainer-wiring assertion still fails until `maintainCpuLeagueRosters(...)` is updated in Task 3

- [ ] **Step 5: Commit the helper layer**

```bash
git add rosterbate-season.html
git commit -m "feat: add cpu sim trade market helpers"
```

### Task 3: Wire the trade market into the CPU maintenance flow and finalize automated verification

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-trade-market.js`
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-waiver-maintenance.js`
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-il-maintenance.js`
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-cpu-sim-lineups.js`
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-drafted-universe-snapshot.js`
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-universe-slot-storage.js`

- [ ] **Step 1: Thread trade execution into `maintainCpuLeagueRosters(...)` after per-team maintenance**

Update the maintainer so trade checks happen once per cadence window after IL and waiver maintenance:

```js
function maintainCpuLeagueRosters(options){
  if (D?.multiplayer || !Array.isArray(G?.rosters) || G.rosters.length < 2) {
    return { changed:false, movedToIl:0, activated:0, waiverAdds:0, waiverDrops:0, tradesCompleted:0 };
  }
  let changed = false;
  let movedToIl = 0;
  let activated = 0;
  let waiverAdds = 0;
  let waiverDrops = 0;
  for (let teamIdx = 0; teamIdx < G.rosters.length; teamIdx += 1){
    const result = maintainCpuTeamRoster(teamIdx, options);
    if (!result) continue;
    changed = changed || !!result.changed;
    movedToIl += Number(result.movedToIl || 0);
    activated += Number(result.activated || 0);
    waiverAdds += Number(result.waiverAdds || 0);
    waiverDrops += Number(result.waiverDrops || 0);
  }

  const day = Number(options?.day || G.day || 1);
  const tradeResult = runCpuTradeMarketForDay(day);
  const tradesCompleted = Number(tradeResult.tradesCompleted || 0);
  changed = changed || !!tradeResult.changed;
```

- [ ] **Step 2: Fix the maintenance summary so trade-only days do not produce misleading copy**

Continue the same function by updating the summary branch:

```js
  if (changed && (movedToIl || activated || waiverAdds || tradesCompleted)){
    const summaryParts = [];
    if (movedToIl) summaryParts.push(`${movedToIl} ${getIlSlotKey()} move${movedToIl === 1 ? '' : 's'}`);
    if (activated) summaryParts.push(`${activated} activation${activated === 1 ? '' : 's'}`);
    if (waiverAdds) summaryParts.push(`${waiverAdds} waiver add${waiverAdds === 1 ? '' : 's'}`);
    if (tradesCompleted) summaryParts.push(`${tradesCompleted} trade${tradesCompleted === 1 ? '' : 's'}`);
    logActivity(
      'league',
      'CPU roster market activity',
      `AI teams auto-managed ${summaryParts.join(', ')} to keep solo simulation rosters healthy and believable.`,
      D.myPos,
      '🤖'
    );
  }

  return { changed, movedToIl, activated, waiverAdds, waiverDrops, tradesCompleted };
}
```

- [ ] **Step 3: Run the full focused CPU/simulation regression sweep**

Run:

```bash
node .\tools\test-cpu-sim-trade-market.js
node .\tools\test-cpu-sim-waiver-maintenance.js
node .\tools\test-cpu-sim-il-maintenance.js
node .\tools\test-cpu-sim-lineups.js
node .\tools\test-historical-drafted-universe-snapshot.js
node .\tools\test-historical-universe-slot-storage.js
```

Expected:

- all commands `PASS`

- [ ] **Step 4: Commit the finished `v1` trade-market implementation**

```bash
git add rosterbate-season.html tools/test-cpu-sim-trade-market.js
git commit -m "feat: add cpu sim trade market"
```

### Task 4: Manual simulation-universe QA for rarity, readability, and safety

**Files:**
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historic-universe.html`

- [ ] **Step 1: Boot a simulation universe and advance past the first trade cadence**

Use a local sim universe and run enough days to cross at least one `3`-day cadence boundary.

Suggested local workflow:

```bash
python -m http.server 8082 --bind 127.0.0.1
```

Then open a saved simulation universe or boot one through the historical sim lane and advance at least through Day `3` or Day `6`.

- [ ] **Step 2: Verify accepted CPU trades read like conservative roster correction**

Manual checklist:

- no trade appears before the cadence day
- at most one CPU trade appears on a cadence check
- no obvious star is moved
- the logged trade reads understandable and team-need-driven
- roster screens still look legal after the swap

- [ ] **Step 3: Verify the trade shows up as a league event, not a user inbox task**

Confirm:

- no new pending offer appears in the user's `Trade Desk`
- the accepted trade does appear in activity/reveal chatter as a league event
- the league feels more alive without becoming noisy

- [ ] **Step 4: Commit any QA-only copy or safety polish if needed**

If manual QA exposes a final small copy or guardrail fix:

```bash
git add rosterbate-season.html tools/test-cpu-sim-trade-market.js
git commit -m "fix: polish cpu sim trade market"
```
