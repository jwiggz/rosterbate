# Mixed-Era Top300 Primary Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote a new `1996-2016-top300` mixed-era board to the main crossover lane so the standard `10-team` NBA draft lobby is immediately playable while preserving the older `top100` board as a separate authored checkpoint.

**Architecture:** Keep the mixed-era runtime untouched unless a regression proves otherwise. The work is mainly authored-content plus primary-launch wiring: add a new `top300` config, make discovery order prefer it, update embedded fallback metadata and direct-draft fallbacks to point at it, then rerun the mixed-era regression suite and the browser loop.

**Tech Stack:** Static HTML, vanilla browser JavaScript, JSON config assets, CommonJS Node regression scripts, PowerShell localhost server.

---

## File Map

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\mixed-era-config-audit\historical-packs\mixed-era\index.json`
  Purpose: discovery order for authored mixed-era entries. `top300` should be first so selector-based surfaces default to it.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\mixed-era-config-audit\historical-packs\mixed-era\1996-2016-top300.json`
  Purpose: new primary `300`-player mixed-era config (`150` players per source season).

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\mixed-era-config-audit\tools\test-mixed-era-loader.js`
  Purpose: loader/index regression. Expand it so it proves both authored configs exist and that discovery order keeps `top300` ahead of `top100`.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\mixed-era-config-audit\tools\test-mixed-era-top300-primary-wiring.js`
  Purpose: new static regression that catches stale `top100` primary references in the archive fallback card, draft fallback id, universe fallback metadata, and season short-label mapping.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\mixed-era-config-audit\historic-seasons.html`
  Purpose: embedded fallback catalog for historical archive when loader discovery fails. Its lone mixed-era fallback card should point at `top300`.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\mixed-era-config-audit\rosterbate-draft.html`
  Purpose: no-query fallback mixed-era config id. Should prefer `1996-2016-top300` instead of `top100`.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\mixed-era-config-audit\historic-universe.html`
  Purpose: embedded fallback mixed-era metadata for saved-universe detail screens. Should point at the `top300` identity for the primary board.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\mixed-era-config-audit\rosterbate-season.html`
  Purpose: short-label mapping for saved historical packs. Should recognize both `top300` and `top100`.

No `mixed-era-runtime.js` changes are planned up front. If authored `top300` plus wiring updates do not produce a valid `300`-player board, stop and debug before widening scope.

### Task 1: Add The New Top300 Authored Config And Discovery Order

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\mixed-era-config-audit\tools\test-mixed-era-loader.js:1-90`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\mixed-era-config-audit\historical-packs\mixed-era\index.json:1-8`
- Create: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\mixed-era-config-audit\historical-packs\mixed-era\1996-2016-top300.json`

- [ ] **Step 1: Rewrite the loader regression so it expects two authored mixed-era configs and `top300` first**

Replace the response fixtures and assertions in `tools/test-mixed-era-loader.js` with this shape:

```js
const responses = new Map([
  ['historical-packs/catalog.json', [
    { packId: 'nba_1996_full_season_v1', sport: 'nba', seasonLabel: '1995-96 NBA Historic Season' }
  ]],
  ['historical-packs/mixed-era/index.json', {
    entries: [
      { id: '1996-2016-top300', file: '1996-2016-top300.json' },
      { id: '1996-2016-top100', file: '1996-2016-top100.json' }
    ]
  }],
  ['historical-packs/mixed-era/1996-2016-top300.json', {
    packId: 'mixed_era_1996_2016_top300_v1',
    sport: 'nba',
    seasonLabel: '1995-96 + 2015-16 Mixed Era Draft',
    shortLabel: '95-96 x 15-16',
    era: 'Mixed Era',
    syntheticType: 'mixed_era',
    sourcePackIds: ['nba_1996_full_season_v1', 'nba_2016_full_season_v1'],
    topPlayersPerPack: 150,
    playerCount: 300,
    draftUrl: 'rosterbate-draft.html?sport=nba&historical=mixed&mixedEraConfigId=1996-2016-top300'
  }],
  ['historical-packs/mixed-era/1996-2016-top100.json', {
    packId: 'mixed_era_1996_2016_top100_v1',
    sport: 'nba',
    seasonLabel: '1995-96 + 2015-16 Mixed Era Draft',
    shortLabel: '95-96 x 15-16',
    era: 'Mixed Era',
    syntheticType: 'mixed_era',
    sourcePackIds: ['nba_1996_full_season_v1', 'nba_2016_full_season_v1'],
    topPlayersPerPack: 50,
    playerCount: 100,
    draftUrl: 'rosterbate-draft.html?sport=nba&historical=mixed&mixedEraConfigId=1996-2016-top100'
  }]
]);

const index = await loader.loadMixedEraIndex();
assert.deepStrictEqual(index.entries.map(entry => entry.id), [
  '1996-2016-top300',
  '1996-2016-top100'
]);

const top300Config = await loader.loadMixedEraConfigById('1996-2016-top300');
assert.equal(top300Config.topPlayersPerPack, 150);
assert.equal(top300Config.playerCount, 300);
assert.equal(top300Config.mixedEraConfigId, '1996-2016-top300');

const top100Config = await loader.loadMixedEraConfigById('1996-2016-top100');
assert.equal(top100Config.topPlayersPerPack, 50);
assert.equal(top100Config.playerCount, 100);

const catalog = await loader.loadCatalog();
assert.deepStrictEqual(
  catalog.filter(entry => entry.syntheticType === 'mixed_era').map(entry => entry.mixedEraConfigId),
  ['1996-2016-top300', '1996-2016-top100']
);
assert.equal(catalog.some(entry => entry.packId === 'mixed_era_1996_2016_top300_v1'), true);
assert.equal(catalog.some(entry => entry.packId === 'mixed_era_1996_2016_top100_v1'), true);
```

- [ ] **Step 2: Run the loader regression and verify it fails before content changes**

Run:

```powershell
node .\tools\test-mixed-era-loader.js
```

Expected: FAIL because `1996-2016-top300` does not exist yet in the real `index.json` / authored config set.

- [ ] **Step 3: Add the new authored config and discovery order**

Write `historical-packs/mixed-era/index.json` with `top300` first:

```json
{
  "entries": [
    {
      "id": "1996-2016-top300",
      "file": "1996-2016-top300.json"
    },
    {
      "id": "1996-2016-top100",
      "file": "1996-2016-top100.json"
    }
  ]
}
```

Create `historical-packs/mixed-era/1996-2016-top300.json` with the full authored definition:

```json
{
  "packId": "mixed_era_1996_2016_top300_v1",
  "sport": "nba",
  "seasonLabel": "1995-96 + 2015-16 Mixed Era Draft",
  "shortLabel": "95-96 x 15-16",
  "era": "Mixed Era",
  "availability": "playable",
  "statusLabel": "Primary Board",
  "significanceLabel": "Time Collision",
  "significanceTone": "spotlight",
  "completenessLabel": "Expanded crossover pool",
  "completenessPercent": 82,
  "tagline": "Draft Jordan, Steph, LeBron, Hakeem, Shaq, KD, and the deeper crossover board behind them.",
  "summary": "A larger mixed-era draft pool built from the top 150 players in 1995-96 and 2015-16, ranked with era-normalized mixed-era ratings and sized for a full standard fantasy room.",
  "whyItMatters": "This is the healthier full-room version of RosterBate's crossover promise: not replaying a real roster intact, but drafting across eras with enough depth to support a normal fantasy league.",
  "focusTeamName": "Draft Slot 1",
  "plannedModes": [
    "Draft The Era",
    "Sim Season (After Draft)",
    "Mixed-Era Universes"
  ],
  "previewStars": [
    "Michael Jordan",
    "Stephen Curry",
    "LeBron James"
  ],
  "draftUrl": "rosterbate-draft.html?sport=nba&historical=mixed&mixedEraConfigId=1996-2016-top300",
  "syntheticType": "mixed_era",
  "sourcePackIds": [
    "nba_1996_full_season_v1",
    "nba_2016_full_season_v1"
  ],
  "topPlayersPerPack": 150,
  "startingSlotCount": 10,
  "playerCount": 300,
  "auditLabel": "1995-96 vs 2015-16 Top 150 Audit",
  "art": {
    "theme": "spotlight",
    "eyebrow": "Mixed Era Prime",
    "headline": "1995-96 x 2015-16",
    "subline": "A full-board crossover draft sized for a real fantasy room."
  }
}
```

- [ ] **Step 4: Run the loader regression again and verify it passes**

Run:

```powershell
node .\tools\test-mixed-era-loader.js
```

Expected: PASS with `mixed-era loader smoke test passed`

- [ ] **Step 5: Commit the authored-content change**

Run:

```powershell
git add historical-packs/mixed-era/index.json historical-packs/mixed-era/1996-2016-top300.json tools/test-mixed-era-loader.js
git commit -m "feat: add top300 mixed-era board config"
```

Expected: one commit containing the new config, index order update, and expanded loader coverage.

### Task 2: Promote Top300 As The Primary Mixed-Era Launch Path

**Files:**
- Create: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\mixed-era-config-audit\tools\test-mixed-era-top300-primary-wiring.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\mixed-era-config-audit\historic-seasons.html:718-746`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\mixed-era-config-audit\rosterbate-draft.html:4007-4013`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\mixed-era-config-audit\historic-universe.html:336-349`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\mixed-era-config-audit\rosterbate-season.html:2780-2786`

- [ ] **Step 1: Add a failing wiring regression that proves the primary path still points at top100**

Create `tools/test-mixed-era-top300-primary-wiring.js`:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

const historicSeasons = read('historic-seasons.html');
assert.match(historicSeasons, /mixed_era_1996_2016_top300_v1/);
assert.match(historicSeasons, /mixedEraConfigId=1996-2016-top300/);
assert.match(historicSeasons, /playerCount:\s*300/);

const draft = read('rosterbate-draft.html');
assert.match(draft, /'1996-2016-top300'/);
assert.doesNotMatch(draft, /\|\| '1996-2016-top100'/);

const historicUniverse = read('historic-universe.html');
assert.match(historicUniverse, /mixed_era_1996_2016_top300_v1/);
assert.match(historicUniverse, /mixedEraConfigId=1996-2016-top300/);

const season = read('rosterbate-season.html');
assert.match(season, /mixed_era_1996_2016_top300_v1:'95-96 x 15-16'/);
assert.match(season, /mixed_era_1996_2016_top100_v1:'95-96 x 15-16'/);

console.log('mixed-era top300 primary wiring test passed');
```

- [ ] **Step 2: Run the new wiring regression and verify it fails before the HTML/JS wiring changes**

Run:

```powershell
node .\tools\test-mixed-era-top300-primary-wiring.js
```

Expected: FAIL because the embedded fallback cards and draft fallback id still point at `top100`.

- [ ] **Step 3: Update the primary launch and fallback wiring to point at top300**

In `historic-seasons.html`, replace the embedded fallback mixed-era card with the new primary board metadata:

```js
{
  packId: 'mixed_era_1996_2016_top300_v1',
  sport: 'nba',
  seasonLabel: '1995-96 + 2015-16 Mixed Era Draft',
  shortLabel: '95-96 x 15-16',
  era: 'Mixed Era',
  availability: 'playable',
  statusLabel: 'Primary Board',
  significanceLabel: 'Time Collision',
  significanceTone: 'spotlight',
  completenessLabel: 'Expanded crossover pool',
  completenessPercent: 82,
  tagline: 'Draft Jordan, Steph, LeBron, Hakeem, Shaq, KD, and the deeper crossover board behind them.',
  summary: 'A larger mixed-era draft pool built from the top 150 players in 1995-96 and 2015-16, ranked with era-normalized mixedEraRatings and sized for a full standard fantasy room.',
  whyItMatters: 'This is the healthier full-room version of RosterBate\\'s crossover promise: not replaying a real roster intact, but drafting across eras with enough depth to support a normal fantasy league.',
  focusTeamName: 'Draft Slot 1',
  art: {
    theme: 'spotlight',
    eyebrow: 'Mixed Era Prime',
    headline: '1995-96 x 2015-16',
    subline: 'A full-board crossover draft sized for a real fantasy room.'
  },
  plannedModes: ['Draft The Era', 'Sim Season (After Draft)', 'Mixed-Era Universes'],
  previewStars: ['Michael Jordan', 'Stephen Curry', 'LeBron James'],
  draftUrl: 'rosterbate-draft.html?sport=nba&historical=mixed&mixedEraConfigId=1996-2016-top300',
  syntheticType: 'mixed_era',
  sourcePackIds: ['nba_1996_full_season_v1', 'nba_2016_full_season_v1'],
  startingSlotCount: 10,
  playerCount: 300
}
```

In `rosterbate-draft.html`, change the no-query fallback config id:

```js
const requestedConfigId = String(
  getRequestedMixedEraConfigId()
  || localState?.mixedEraConfigId
  || '1996-2016-top300'
).trim();
```

In `historic-universe.html`, update the embedded fallback mixed-era catalog entry:

```js
{
  packId: 'mixed_era_1996_2016_top300_v1',
  seasonLabel: '1995-96 + 2015-16 Mixed Era Draft',
  shortLabel: '95-96 x 15-16',
  era: 'Mixed Era',
  significanceLabel: 'Time Collision',
  significanceTone: 'spotlight',
  focusTeamName: 'Drafted Universe',
  tagline: 'Draft Jordan, Steph, LeBron, Hakeem, Shaq, KD, and the deeper crossover board behind them.',
  summary: 'A larger mixed-era draft pool built from the top 150 players in 1995-96 and 2015-16, meant for custom universes first.',
  whyItMatters: 'This is the most direct version of the archive fantasy: draft across eras, build a custom universe, then sim it one day at a time.',
  draftUrl: 'rosterbate-draft.html?sport=nba&historical=mixed&mixedEraConfigId=1996-2016-top300',
  art: { theme:'spotlight', eyebrow:'Mixed Era Prime', headline:'1995-96 x 2015-16', subline:'A full-board crossover draft sized for a real fantasy room.' }
}
```

In `rosterbate-season.html`, support both saved-universe identities:

```js
const known = {
  nba_1996_full_season_v1: '1995-96',
  nba_2016_full_season_v1: '2015-16',
  mixed_era_1996_2016_top300_v1: '95-96 x 15-16',
  mixed_era_1996_2016_top100_v1: '95-96 x 15-16'
};
```

- [ ] **Step 4: Run the wiring regression again and verify it passes**

Run:

```powershell
node .\tools\test-mixed-era-top300-primary-wiring.js
```

Expected: PASS with `mixed-era top300 primary wiring test passed`

- [ ] **Step 5: Commit the primary-launch wiring change**

Run:

```powershell
git add historic-seasons.html rosterbate-draft.html historic-universe.html rosterbate-season.html tools/test-mixed-era-top300-primary-wiring.js
git commit -m "feat: promote top300 mixed-era board"
```

Expected: one commit containing the new primary top300 wiring and its static regression coverage.

### Task 3: Run The Regression Sweep And Re-Verify The Full Browser Loop

**Files:**
- No planned code changes; verification only unless a regression exposes a real bug

- [ ] **Step 1: Run the full mixed-era regression suite**

Run:

```powershell
node .\tools\test-mixed-era-loader.js
node .\tools\test-mixed-era-runtime.js
node .\tools\test-mixed-era-universe-summary.js
node .\tools\test-mixed-era-audit-view-model.js
node .\tools\test-mixed-era-top300-primary-wiring.js
```

Expected:
- `mixed-era loader smoke test passed`
- `mixed-era runtime test passed`
- `mixed-era universe summary test passed`
- `mixed-era audit view-model test passed`
- `mixed-era top300 primary wiring test passed`

- [ ] **Step 2: Start the worktree-local server**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File 'C:\Users\jabro\Desktop\Fantasy Project\tools\serve-local.ps1' -Port 8082 -Root 'C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\mixed-era-config-audit'
```

Expected: local server listening on `http://127.0.0.1:8082`

- [ ] **Step 3: Verify the archive and audit surfaces now prefer top300**

Open:

```text
http://127.0.0.1:8082/historic-seasons.html?sport=nba
http://127.0.0.1:8082/mixed-era-audit.html
```

Verify:
- the mixed-era archive lane launches `mixedEraConfigId=1996-2016-top300`
- the mixed-era card copy describes the larger `top 150 per era` board
- the audit selector defaults to `1996-2016-top300` because it is first in `index.json`
- the audit table renders `300` rows for the top300 board

- [ ] **Step 4: Verify the draft lobby is valid at the normal NBA default**

Open:

```text
http://127.0.0.1:8082/rosterbate-draft.html?sport=nba&historical=mixed&mixedEraConfigId=1996-2016-top300&mixedStartSlot=1
```

Verify:
- the lobby opens with the normal NBA `10-team` default
- the normal NBA roster depth is unchanged
- no immediate `Need 160 slots but only 100 players` validation error appears
- entering a league name and team name allows the draft to start without first shrinking league size

- [ ] **Step 5: Rerun the full mixed-era draft-to-sim loop**

Verify this end-to-end sequence:

```text
Mixed Era Draft -> Season -> Start Sim Season -> Run Sim Day -> resume universe
```

Expected:
- the draft hands off into `rosterbate-season.html`
- `Start Sim Season` still works
- one sim day still runs and produces a report
- the saved universe reopens through `historic-universe.html`
- the reopened universe reflects the actual config used (`top300` identity if that was the launched board)

- [ ] **Step 6: Only commit again if verification required a code fix**

If verification is clean:
- do not create a no-op commit

If verification uncovered a real bug:
- fix it in a separate task branch step
- rerun Task 3 from the top
- use a narrowly-scoped commit message such as:

```powershell
git add <changed files>
git commit -m "fix: keep top300 mixed-era flow playable"
```
