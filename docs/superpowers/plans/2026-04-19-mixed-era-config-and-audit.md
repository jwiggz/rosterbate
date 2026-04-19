# Mixed-Era Config And Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded mixed-era prototype with config-driven authored content, improve mixed-era saved-universe details, add a localhost-first audit page, and verify the full mixed-era draft-to-sim loop.

**Architecture:** Extend `historical-pack-loader.js` so it can load a mixed-era discovery index and merge authored mixed-era configs into the historical catalog. Move mixed-era board construction and summary logic into a shared browser/CommonJS helper so `rosterbate-draft.html`, `historic-universe.html`, and `mixed-era-audit.html` all rely on the same source-aware runtime logic.

**Tech Stack:** Static HTML, vanilla browser JavaScript, JSON config assets, CommonJS-friendly helper files, Node 24 regression scripts, PowerShell localhost server.

---

### Task 1: Add Mixed-Era Authored Assets And Loader APIs

**Files:**
- Create: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historical-packs\mixed-era\index.json`
- Create: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historical-packs\mixed-era\1996-2016-top100.json`
- Create: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-loader.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historical-pack-loader.js:6-105`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historical-packs\catalog.json:2-57`

- [ ] **Step 1: Write the failing loader regression script**

```js
const assert = require('node:assert/strict');

const responses = new Map([
  ['historical-packs/catalog.json', [
    { packId: 'nba_1996_full_season_v1', sport: 'nba', seasonLabel: '1995-96 NBA Historic Season' }
  ]],
  ['historical-packs/mixed-era/index.json', {
    entries: [
      { id: '1996-2016-top100', file: '1996-2016-top100.json' }
    ]
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
    draftUrl: 'rosterbate-draft.html?sport=nba&historical=mixed&mixedEraConfigId=1996-2016-top100'
  }]
]);

global.fetch = async function fakeFetch(url) {
  const normalized = String(url).replace(/^.*historical-packs/, 'historical-packs');
  if (!responses.has(normalized)) {
    return { ok: false, status: 404, json: async () => ({}) };
  }
  return {
    ok: true,
    status: 200,
    json: async () => JSON.parse(JSON.stringify(responses.get(normalized)))
  };
};

const loader = require('../historical-pack-loader.js');

(async function run() {
  assert.equal(typeof loader.loadMixedEraIndex, 'function');
  assert.equal(typeof loader.loadMixedEraConfigById, 'function');
  assert.equal(typeof loader.loadMixedEraConfigs, 'function');

  const index = await loader.loadMixedEraIndex();
  assert.equal(index.entries[0].id, '1996-2016-top100');

  const config = await loader.loadMixedEraConfigById('1996-2016-top100');
  assert.equal(config.topPlayersPerPack, 50);
  assert.equal(config.syntheticType, 'mixed_era');

  const catalog = await loader.loadCatalog();
  assert.equal(catalog.some(entry => entry.packId === 'mixed_era_1996_2016_top100_v1'), true);
  assert.equal(catalog.filter(entry => entry.packId === 'mixed_era_1996_2016_top100_v1').length, 1);

  console.log('mixed-era loader smoke test passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 2: Run the loader test to verify it fails**

Run: `node tools/test-mixed-era-loader.js`

Expected: FAIL with an assertion such as `Expected values to be strictly equal: 'undefined' !== 'function'` because the new loader API does not exist yet.

- [ ] **Step 3: Create the mixed-era discovery index and initial config**

`historical-packs/mixed-era/index.json`

```json
{
  "entries": [
    {
      "id": "1996-2016-top100",
      "file": "1996-2016-top100.json"
    }
  ]
}
```

`historical-packs/mixed-era/1996-2016-top100.json`

```json
{
  "packId": "mixed_era_1996_2016_top100_v1",
  "sport": "nba",
  "seasonLabel": "1995-96 + 2015-16 Mixed Era Draft",
  "shortLabel": "95-96 x 15-16",
  "era": "Mixed Era",
  "availability": "playable",
  "statusLabel": "Localhost Lab",
  "significanceLabel": "Time Collision",
  "significanceTone": "spotlight",
  "completenessLabel": "Curated crossover pool",
  "completenessPercent": 74,
  "tagline": "Draft Jordan, Steph, LeBron, Hakeem, Shaq, KD, and Kawhi into one crossover board.",
  "summary": "A curated mixed-era draft pool built from the top players in 1995-96 and 2015-16, ranked with era-normalized mixed-era ratings and designed for custom-team universes first.",
  "whyItMatters": "This is the clearest expression of RosterBate's fantasy promise: not replaying a real roster intact, but drafting across eras to build a universe nobody has seen before.",
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
  "draftUrl": "rosterbate-draft.html?sport=nba&historical=mixed&mixedEraConfigId=1996-2016-top100",
  "syntheticType": "mixed_era",
  "sourcePackIds": [
    "nba_1996_full_season_v1",
    "nba_2016_full_season_v1"
  ],
  "topPlayersPerPack": 50,
  "startingSlotCount": 10,
  "playerCount": 100,
  "auditLabel": "1995-96 vs 2015-16 Top 50 Audit",
  "art": {
    "theme": "spotlight",
    "eyebrow": "Mixed Era Lab",
    "headline": "1995-96 x 2015-16",
    "subline": "A curated time-collision board where two full fantasy eras meet."
  }
}
```

- [ ] **Step 4: Remove the hardcoded mixed-era entry from the base historical catalog**

Update `historical-packs/catalog.json` so the first entry is the real `1995-96` pack instead of the mixed-era prototype.

```json
[
  {
    "packId": "nba_1996_full_season_v1",
    "sport": "nba",
    "seasonLabel": "1995-96 NBA Historic Season",
    "shortLabel": "1995-96"
  }
]
```

The rest of the existing real historical catalog should remain intact.

- [ ] **Step 5: Extend the loader with mixed-era discovery helpers and merged catalog output**

Add these constants near the top of `historical-pack-loader.js`:

```js
const DEFAULT_MIXED_ERA_ROOT = 'historical-packs/mixed-era/';
const DEFAULT_MIXED_ERA_INDEX_PATH = DEFAULT_MIXED_ERA_ROOT + 'index.json';
```

Add these helpers:

```js
function normalizeMixedEraIndex(index) {
  const entries = Array.isArray(index?.entries) ? index.entries : [];
  return {
    entries: entries
      .map(function(entry) {
        const id = String(entry?.id || '').trim();
        const file = String(entry?.file || '').trim();
        if (!id || !file) return null;
        return { id, file };
      })
      .filter(Boolean)
  };
}

async function loadMixedEraIndex() {
  const index = await fetchJson(resolveUrl(DEFAULT_MIXED_ERA_INDEX_PATH));
  return normalizeMixedEraIndex(index);
}

async function loadMixedEraConfigFile(fileName) {
  return fetchJson(resolveUrl(DEFAULT_MIXED_ERA_ROOT + String(fileName || '').trim()));
}

async function loadMixedEraConfigById(id) {
  const normalizedId = String(id || '').trim();
  if (!normalizedId) throw new Error('mixed_era_config_id_required');
  const index = await loadMixedEraIndex();
  const match = index.entries.find(function(entry) { return entry.id === normalizedId; });
  if (!match) throw new Error('mixed_era_config_not_found:' + normalizedId);
  const config = await loadMixedEraConfigFile(match.file);
  return Object.assign({ mixedEraConfigId: match.id }, deepClone(config));
}

async function loadMixedEraConfigs() {
  const index = await loadMixedEraIndex();
  return Promise.all(index.entries.map(async function(entry) {
    const config = await loadMixedEraConfigFile(entry.file);
    return Object.assign({ mixedEraConfigId: entry.id }, deepClone(config));
  }));
}
```

Replace `loadCatalog()` with a merged, de-duplicated version:

```js
async function loadCatalog() {
  const baseCatalog = await fetchJson(resolveUrl(DEFAULT_CATALOG_PATH));
  if (!Array.isArray(baseCatalog)) {
    throw new Error('historical_catalog_invalid');
  }

  let mixedEraCatalog = [];
  try {
    mixedEraCatalog = await loadMixedEraConfigs();
  } catch (error) {
    console.warn('[Historical Pack Loader] Could not load mixed-era configs', error);
  }

  const merged = baseCatalog.concat(mixedEraCatalog);
  const deduped = [];
  const seen = new Set();

  merged.forEach(function(entry) {
    const packId = String(entry?.packId || '').trim();
    if (!packId || seen.has(packId)) return;
    seen.add(packId);
    deduped.push(entry);
  });

  return deepClone(deduped);
}
```

Export the new helpers in `api`:

```js
mixedEraRoot: DEFAULT_MIXED_ERA_ROOT,
mixedEraIndexPath: DEFAULT_MIXED_ERA_INDEX_PATH,
loadMixedEraIndex: loadMixedEraIndex,
loadMixedEraConfigById: loadMixedEraConfigById,
loadMixedEraConfigs: loadMixedEraConfigs,
```

- [ ] **Step 6: Run the loader regression test again**

Run: `node tools/test-mixed-era-loader.js`

Expected: PASS with `mixed-era loader smoke test passed`

- [ ] **Step 7: Commit the loader and asset work**

```bash
git add historical-pack-loader.js historical-packs/catalog.json historical-packs/mixed-era/index.json historical-packs/mixed-era/1996-2016-top100.json tools/test-mixed-era-loader.js
git commit -m "feat: add mixed-era config loader"
```

### Task 2: Extract Shared Mixed-Era Runtime And Switch Draft Boot To Config IDs

**Files:**
- Create: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\mixed-era-runtime.js`
- Create: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-runtime.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-draft.html:11-20`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-draft.html:3552-3588`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-draft.html:3818-3965`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-draft.html:4137-4155`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historic-seasons.html:720-745`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historic-universe.html:337-347`

- [ ] **Step 1: Write the failing shared-runtime regression script**

```js
const assert = require('node:assert/strict');
const runtime = require('../mixed-era-runtime.js');

const config = {
  mixedEraConfigId: '1996-2016-top100',
  packId: 'mixed_era_1996_2016_top100_v1',
  sport: 'nba',
  seasonLabel: '1995-96 + 2015-16 Mixed Era Draft',
  shortLabel: '95-96 x 15-16',
  syntheticType: 'mixed_era',
  sourcePackIds: ['nba_1996_full_season_v1', 'nba_2016_full_season_v1'],
  topPlayersPerPack: 2,
  summary: 'Test config'
};

const bundles = [
  {
    manifest: { packId: 'nba_1996_full_season_v1', seasonLabel: '1995-96 NBA Historic Season' },
    season: { sport: 'nba', seasonLabel: '1995-96 NBA Historic Season' },
    players: [
      { id: 1, name: 'Michael Jordan', team: 'CHI', pos: 'SG', pts: 30.4, gp: 82, fp: 62, simProfile: { mixedEraRatings: { overall: 99 }, mixedEraContext: { sourcePackId: 'nba_1996_full_season_v1' } } },
      { id: 2, name: 'Scottie Pippen', team: 'CHI', pos: 'SF', pts: 19.4, gp: 77, fp: 54, simProfile: { mixedEraRatings: { overall: 92 }, mixedEraContext: { sourcePackId: 'nba_1996_full_season_v1' } } },
      { id: 3, name: 'Toni Kukoc', team: 'CHI', pos: 'SF', pts: 13.1, gp: 80, fp: 41, simProfile: { mixedEraRatings: { overall: 79 }, mixedEraContext: { sourcePackId: 'nba_1996_full_season_v1' } } }
    ]
  },
  {
    manifest: { packId: 'nba_2016_full_season_v1', seasonLabel: '2015-16 NBA Historic Season' },
    season: { sport: 'nba', seasonLabel: '2015-16 NBA Historic Season' },
    players: [
      { id: 11, name: 'Stephen Curry', team: 'GSW', pos: 'PG', pts: 30.1, gp: 79, fp: 61, simProfile: { mixedEraRatings: { overall: 98 }, mixedEraContext: { sourcePackId: 'nba_2016_full_season_v1' } } },
      { id: 12, name: 'LeBron James', team: 'CLE', pos: 'SF', pts: 25.3, gp: 76, fp: 58, simProfile: { mixedEraRatings: { overall: 96 }, mixedEraContext: { sourcePackId: 'nba_2016_full_season_v1' } } },
      { id: 13, name: 'Kyrie Irving', team: 'CLE', pos: 'PG', pts: 19.6, gp: 53, fp: 45, simProfile: { mixedEraRatings: { overall: 83 }, mixedEraContext: { sourcePackId: 'nba_2016_full_season_v1' } } }
    ]
  }
];

const context = runtime.buildMixedEraDraftContextFromBundles({
  config,
  bundles,
  requestedSport: 'nba'
});

assert.equal(context.mixedEraConfigId, '1996-2016-top100');
assert.equal(context.playerPool.length, 4);
assert.deepEqual(context.sourcePackIds, ['nba_1996_full_season_v1', 'nba_2016_full_season_v1']);
assert.equal(context.playerPool[0].name, 'Michael Jordan');
assert.equal(context.playerPool[1].name, 'Stephen Curry');
assert.equal(context.playerPool.every(player => Array.isArray(player.historicalSourcePackIds)), true);

console.log('mixed-era runtime test passed');
```

- [ ] **Step 2: Run the runtime test to verify it fails**

Run: `node tools/test-mixed-era-runtime.js`

Expected: FAIL with `Cannot find module '../mixed-era-runtime.js'`

- [ ] **Step 3: Create the shared mixed-era runtime helper**

Create `mixed-era-runtime.js` as an IIFE that works in both browser and Node:

```js
(function(global){
  'use strict';

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  function roundStat(value){
    const num = Number(value || 0);
    return Number.isFinite(num) ? Math.round(num * 10) / 10 : 0;
  }

  function applyAvailabilityAdjustment(fp, gp){
    const baseFp = Number(fp || 0);
    const games = Math.max(0, Number(gp || 0));
    if(!Number.isFinite(baseFp) || baseFp <= 0 || !games) return 0;
    const factor = Math.max(0.35, Math.min(1, 0.35 + (0.65 * (games / 82))));
    return roundStat(baseFp * factor);
  }

  function getMixedEraOverall(simProfile){
    return roundStat(simProfile?.mixedEraRatings?.overall || 0);
  }

  function buildProjection(simProfile, gp, fallbackFp){
    const overall = getMixedEraOverall(simProfile);
    if(overall > 0) return applyAvailabilityAdjustment(roundStat(overall * 0.75), gp);
    return applyAvailabilityAdjustment(Number(fallbackFp || 0), gp);
  }

  function buildMixedEraDraftContextFromBundles(options){
    const config = clone(options?.config || {});
    const bundles = Array.isArray(options?.bundles) ? options.bundles : [];
    const requestedSport = String(options?.requestedSport || config.sport || 'nba').trim().toLowerCase();
    const topPlayersPerPack = Math.max(1, Number(config.topPlayersPerPack || 50) || 50);

    const sourceContexts = bundles
      .map(function(bundle){
        const packId = String(bundle?.manifest?.packId || '').trim();
        const seasonLabel = String(bundle?.season?.seasonLabel || bundle?.manifest?.seasonLabel || packId).trim();
        const players = Array.isArray(bundle?.players) ? bundle.players : [];
        if(!packId || !players.length) return null;
        return { packId, seasonLabel, players };
      })
      .filter(Boolean);

    const curatedPlayers = sourceContexts.flatMap(function(context){
      return context.players
        .map(function(player){
          const simProfile = player?.simProfile ? clone(player.simProfile) : null;
          const mixedEraOverall = getMixedEraOverall(simProfile);
          const mixedEraProjection = buildProjection(simProfile, player?.gp, player?.fp);
          return {
            ...clone(player),
            historicalPackId: context.packId,
            historicalSourcePackIds: [context.packId],
            historicalPackLabel: context.seasonLabel,
            mixedEraOverall: mixedEraOverall,
            mixedEraProjection: mixedEraProjection,
            mixedEraContext: clone(simProfile?.mixedEraContext || null),
            fp: mixedEraProjection
          };
        })
        .sort(function(a, b){
          return (Number(b?.mixedEraOverall || 0) - Number(a?.mixedEraOverall || 0))
            || (Number(b?.fp || 0) - Number(a?.fp || 0))
            || String(a?.name || '').localeCompare(String(b?.name || ''));
        })
        .slice(0, topPlayersPerPack);
    });

    const playerPool = curatedPlayers
      .slice()
      .sort(function(a, b){
        return (Number(b?.mixedEraOverall || 0) - Number(a?.mixedEraOverall || 0))
          || (Number(b?.fp || 0) - Number(a?.fp || 0))
          || String(a?.name || '').localeCompare(String(b?.name || ''));
      })
      .map(function(player, index){
        return { ...player, id: 970001 + index, adp: index + 1 };
      });

    return {
      sport: requestedSport,
      packId: String(config.packId || '').trim(),
      seasonId: String(config.packId || '').trim(),
      seasonLabel: String(config.seasonLabel || '').trim(),
      mixedEraConfigId: String(config.mixedEraConfigId || '').trim() || null,
      sourcePackIds: sourceContexts.map(function(context){ return context.packId; }),
      sourceSeasonLabels: sourceContexts.map(function(context){ return context.seasonLabel; }),
      mixedEraTopPlayersPerPack: topPlayersPerPack,
      playerPool: playerPool,
      historicalPlayerPool: playerPool.map(clone),
      draftTitleKicker: 'Mixed Era Draft',
      syntheticType: 'mixed_era',
      isHistoricalPack: true,
      isHistoricalPackDev: true,
      isMixedEraDraft: true,
      devLocalOnly: true,
      mixedEraConfig: clone(config)
    };
  }

  const api = {
    buildMixedEraDraftContextFromBundles: buildMixedEraDraftContextFromBundles
  };

  global.RosterBateMixedEraRuntime = api;
  if(typeof module !== 'undefined' && module.exports){
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
```

- [ ] **Step 4: Load the shared runtime in the draft page and switch mixed-era draft boot to config ids**

Add the new script include in `rosterbate-draft.html`:

```html
<script src="historical-pack-loader.js"></script>
<script src="simulation-league-engine.js"></script>
<script src="mixed-era-runtime.js"></script>
```

Add a config-id query helper near the existing historical query helpers:

```js
function getRequestedMixedEraConfigId(){
  try{
    const params = new URLSearchParams(window.location.search || '');
    return String(params.get('mixedEraConfigId') || '').trim();
  }catch(e){
    return '';
  }
}
```

Replace the `queryMode==='mixed'` branch in `resolveHistoricalDraftContext()` with config-driven loading:

```js
if(queryMode === 'mixed'){
  const loader = window.RosterBateHistoricalPackLoader;
  const runtime = window.RosterBateMixedEraRuntime;
  if(!(loader && runtime && typeof loader.loadMixedEraConfigById === 'function' && typeof runtime.buildMixedEraDraftContextFromBundles === 'function')) return null;

  const requestedConfigId = String(getRequestedMixedEraConfigId() || localState?.mixedEraConfigId || '1996-2016-top100').trim();
  const config = await loader.loadMixedEraConfigById(requestedConfigId);
  const bundles = await Promise.all(config.sourcePackIds.map(function(packId){
    return loader.loadPackById(packId);
  }));

  return runtime.buildMixedEraDraftContextFromBundles({
    config,
    bundles,
    requestedSport: requestedSportKey
  });
}
```

- [ ] **Step 5: Update fallback mixed-era cards to use `mixedEraConfigId` instead of raw `historicalPackIds`**

In both `historic-seasons.html` and `historic-universe.html`, change the fallback `draftUrl` to:

```js
draftUrl: 'rosterbate-draft.html?sport=nba&historical=mixed&mixedEraConfigId=1996-2016-top100',
```

- [ ] **Step 6: Run the runtime regression test again**

Run: `node tools/test-mixed-era-runtime.js`

Expected: PASS with `mixed-era runtime test passed`

- [ ] **Step 7: Commit the shared runtime and draft-boot changes**

```bash
git add mixed-era-runtime.js rosterbate-draft.html historic-seasons.html historic-universe.html tools/test-mixed-era-runtime.js
git commit -m "feat: switch mixed-era draft boot to config runtime"
```

### Task 3: Persist Mixed-Era Snapshot Data And Upgrade Universe Details

**Files:**
- Create: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-universe-summary.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\mixed-era-runtime.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-draft.html:8249-8326`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historical-universe-slots.js:147-181`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historic-universe.html:11-14`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historic-universe.html:541-586`

- [ ] **Step 1: Write the failing universe-summary regression script**

```js
const assert = require('node:assert/strict');
const runtime = require('../mixed-era-runtime.js');

const summary = runtime.buildMixedEraUniverseSummary({
  mixedEraConfig: {
    seasonLabel: '1995-96 + 2015-16 Mixed Era Draft',
    topPlayersPerPack: 50,
    sourcePackIds: ['nba_1996_full_season_v1', 'nba_2016_full_season_v1']
  },
  mixedEraSourceSeasonLabels: ['1995-96 NBA Historic Season', '2015-16 NBA Historic Season']
});

assert.equal(summary.explainer, 'Curated crossover universe built from 1995-96 NBA Historic Season and 2015-16 NBA Historic Season.');
assert.equal(summary.poolRuleLabel, 'Top 50 players from each era');
assert.equal(summary.sourceEraLabels.length, 2);
assert.match(summary.trustNote, /Era-normalized crossover board/);

console.log('mixed-era universe summary test passed');
```

- [ ] **Step 2: Run the universe-summary test to verify it fails**

Run: `node tools/test-mixed-era-universe-summary.js`

Expected: FAIL with `TypeError: runtime.buildMixedEraUniverseSummary is not a function`

- [ ] **Step 3: Add config snapshot and universe-summary helpers to `mixed-era-runtime.js`**

Append these helpers and export them:

```js
function buildMixedEraConfigSnapshot(context){
  const config = clone(context?.mixedEraConfig || {});
  return {
    packId: String(config.packId || '').trim() || null,
    seasonLabel: String(config.seasonLabel || '').trim() || null,
    shortLabel: String(config.shortLabel || '').trim() || null,
    sourcePackIds: Array.isArray(context?.sourcePackIds) ? clone(context.sourcePackIds) : [],
    topPlayersPerPack: Number(context?.mixedEraTopPlayersPerPack || config.topPlayersPerPack || 0) || null,
    summary: String(config.summary || '').trim() || '',
    whyItMatters: String(config.whyItMatters || '').trim() || ''
  };
}

function buildMixedEraUniverseSummary(options){
  const snapshot = options?.mixedEraConfig || {};
  const sourceEraLabels = (Array.isArray(options?.mixedEraSourceSeasonLabels) ? options.mixedEraSourceSeasonLabels : [])
    .map(function(label){ return String(label || '').trim(); })
    .filter(Boolean);
  const explainer = sourceEraLabels.length >= 2
    ? ('Curated crossover universe built from ' + sourceEraLabels.join(' and ') + '.')
    : 'Curated crossover universe built from real historical source packs.';
  const topPlayersPerPack = Number(snapshot?.topPlayersPerPack || 0) || null;
  return {
    sourceEraLabels: sourceEraLabels,
    explainer: explainer,
    poolRuleLabel: topPlayersPerPack ? ('Top ' + topPlayersPerPack + ' players from each era') : 'Curated crossover player pool',
    trustNote: 'Era-normalized crossover board built from real historical source packs for draft and sim continuity.'
  };
}

api.buildMixedEraConfigSnapshot = buildMixedEraConfigSnapshot;
api.buildMixedEraUniverseSummary = buildMixedEraUniverseSummary;
```

- [ ] **Step 4: Persist the mixed-era snapshot into the draft handoff payload**

In `rosterbate-draft.html`, add these fields to `draftData`:

```js
mixedEraConfigId: isHistoricalDraft ? HISTORICAL_DRAFT_CONTEXT?.mixedEraConfigId || null : null,
mixedEraTopPlayersPerPack: isHistoricalDraft ? Number(HISTORICAL_DRAFT_CONTEXT?.mixedEraTopPlayersPerPack || 0) || null : null,
mixedEraSourceSeasonLabels: isHistoricalDraft && Array.isArray(HISTORICAL_DRAFT_CONTEXT?.sourceSeasonLabels)
  ? cloneDraftJsonSafe(HISTORICAL_DRAFT_CONTEXT.sourceSeasonLabels)
  : null,
mixedEraConfig: isHistoricalDraft && window.RosterBateMixedEraRuntime && typeof window.RosterBateMixedEraRuntime.buildMixedEraConfigSnapshot === 'function'
  ? window.RosterBateMixedEraRuntime.buildMixedEraConfigSnapshot(HISTORICAL_DRAFT_CONTEXT)
  : null,
```

- [ ] **Step 5: Preserve the mixed-era metadata in slot summaries and render it in Universe Details**

In `historical-universe-slots.js`, extend `summarizeState()`:

```js
mixedEraConfigId: String(state?.mixedEraConfigId || '').trim() || null,
mixedEraTopPlayersPerPack: Number(state?.mixedEraTopPlayersPerPack || state?.mixedEraConfig?.topPlayersPerPack || 0) || null,
mixedEraSourceSeasonLabels: Array.isArray(state?.mixedEraSourceSeasonLabels)
  ? state.mixedEraSourceSeasonLabels.map(function(label){ return String(label || '').trim(); }).filter(Boolean)
  : null,
```

Load the shared runtime in `historic-universe.html`:

```html
<script src="historical-pack-loader.js"></script>
<script src="mixed-era-runtime.js"></script>
<script src="historical-universe-slots.js"></script>
```

Then replace the pack-context block with mixed-era-aware rendering:

```js
const mixedEraSummary = window.RosterBateMixedEraRuntime && typeof window.RosterBateMixedEraRuntime.buildMixedEraUniverseSummary === 'function'
  ? window.RosterBateMixedEraRuntime.buildMixedEraUniverseSummary({
      mixedEraConfig: state?.mixedEraConfig || null,
      mixedEraSourceSeasonLabels: state?.mixedEraSourceSeasonLabels || slot?.mixedEraSourceSeasonLabels || []
    })
  : null;

document.getElementById('packContextCopy').textContent = mixedEraSummary?.explainer || config?.summary || 'This saved universe is attached to a historical pack in your archive.';
document.getElementById('packContextList').innerHTML = [
  '<div class="info-item"><strong>Why this season matters</strong><span>' + escapeHtml(config?.whyItMatters || 'This universe keeps a historical season pack alive as a replayable archive branch.') + '</span></div>',
  mixedEraSummary
    ? '<div class="info-item"><strong>Source eras</strong><span>' + escapeHtml(mixedEraSummary.explainer) + '</span><div class="info-item-meta">' + mixedEraSummary.sourceEraLabels.map(function(label){ return '<span class="pill">' + escapeHtml(label) + '</span>'; }).join('') + '<span class="pill">' + escapeHtml(mixedEraSummary.poolRuleLabel) + '</span></div></div>'
    : '<div class="info-item"><strong>Current team focus</strong><span>' + escapeHtml(heroTeam) + '</span><div class="info-item-meta"><span class="pill">' + escapeHtml(config?.focusTeamName || heroTeam) + '</span><span class="pill">' + escapeHtml(config?.significanceLabel || 'Historic Run') + '</span></div></div>',
  mixedEraSummary
    ? '<div class="info-item"><strong>Trust note</strong><span>' + escapeHtml(mixedEraSummary.trustNote) + '</span></div>'
    : '<div class="info-item"><strong>Standing context</strong><span>' + escapeHtml(standing.rank ? ('Currently ' + standing.rank + ' in the league with ' + recordText + '.') : 'Standing summary is not available yet.') + '</span></div>'
].join('');
```

- [ ] **Step 6: Run the universe-summary regression test again**

Run: `node tools/test-mixed-era-universe-summary.js`

Expected: PASS with `mixed-era universe summary test passed`

- [ ] **Step 7: Commit the snapshot and universe-details work**

```bash
git add mixed-era-runtime.js rosterbate-draft.html historical-universe-slots.js historic-universe.html tools/test-mixed-era-universe-summary.js
git commit -m "feat: explain mixed-era saved universes"
```

### Task 4: Add The Localhost Mixed-Era Audit Page

**Files:**
- Create: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-audit-view-model.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\mixed-era-runtime.js`
- Create: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\mixed-era-audit.html`

- [ ] **Step 1: Write the failing audit-view-model regression script**

```js
const assert = require('node:assert/strict');
const runtime = require('../mixed-era-runtime.js');

const viewModel = runtime.buildMixedEraAuditViewModel({
  config: { seasonLabel: '1995-96 + 2015-16 Mixed Era Draft', topPlayersPerPack: 2 },
  playerPool: [
    { name: 'Michael Jordan', historicalPackId: 'nba_1996_full_season_v1', mixedEraOverall: 99, fp: 61, totalFantasyPoints: 5000, gp: 82 },
    { name: 'Stephen Curry', historicalPackId: 'nba_2016_full_season_v1', mixedEraOverall: 98, fp: 60, totalFantasyPoints: 4900, gp: 79 },
    { name: 'Scottie Pippen', historicalPackId: 'nba_1996_full_season_v1', mixedEraOverall: 92, fp: 54, totalFantasyPoints: 4300, gp: 77 },
    { name: 'LeBron James', historicalPackId: 'nba_2016_full_season_v1', mixedEraOverall: 96, fp: 58, totalFantasyPoints: 4600, gp: 76 }
  ]
});

assert.equal(viewModel.top10Composition['nba_1996_full_season_v1'], 2);
assert.equal(viewModel.top10Composition['nba_2016_full_season_v1'], 2);
assert.equal(Array.isArray(viewModel.rows), true);
assert.equal(viewModel.rows[0].rank, 1);
assert.equal(viewModel.warning, '');

console.log('mixed-era audit view-model test passed');
```

- [ ] **Step 2: Run the audit-view-model test to verify it fails**

Run: `node tools/test-mixed-era-audit-view-model.js`

Expected: FAIL with `TypeError: runtime.buildMixedEraAuditViewModel is not a function`

- [ ] **Step 3: Add an audit view-model helper to `mixed-era-runtime.js`**

Append this helper and export it:

```js
function buildMixedEraAuditViewModel(options){
  const playerPool = Array.isArray(options?.playerPool) ? options.playerPool.slice() : [];
  const bySource = function(limit){
    return playerPool.slice(0, Math.min(limit, playerPool.length)).reduce(function(acc, player){
      const key = String(player?.historicalPackId || 'unknown').trim() || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  };

  const top10Composition = bySource(10);
  const top25Composition = bySource(25);
  const fullPoolComposition = bySource(playerPool.length);
  const counts = Object.values(top10Composition);
  const max = counts.length ? Math.max.apply(null, counts) : 0;
  const min = counts.length ? Math.min.apply(null, counts) : 0;

  return {
    configLabel: String(options?.config?.seasonLabel || '').trim(),
    top10Composition,
    top25Composition,
    fullPoolComposition,
    warning: (counts.length > 1 && (max - min) >= 4) ? 'Top-10 board heavily favors one source era.' : '',
    rows: playerPool.map(function(player, index){
      return {
        rank: index + 1,
        player: String(player?.name || '').trim(),
        sourceEra: String(player?.historicalPackId || '').trim(),
        mixedEraOverall: Number(player?.mixedEraOverall || 0),
        projectedFp: Number(player?.fp || 0),
        rawFp: Number(player?.totalFantasyPoints || 0),
        gamesPlayed: Number(player?.gp || 0)
      };
    })
  };
}

api.buildMixedEraAuditViewModel = buildMixedEraAuditViewModel;
```

- [ ] **Step 4: Create the localhost audit page**

Create `mixed-era-audit.html` with a compact control bar, summary blocks, and a table:

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>RosterBate Mixed-Era Audit</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <script src="historical-pack-loader.js"></script>
  <script src="mixed-era-runtime.js"></script>
</head>
<body>
  <main>
    <h1>Mixed-Era Audit</h1>
    <label for="configSelect">Board</label>
    <select id="configSelect"></select>
    <div id="summary"></div>
    <table id="auditTable">
      <thead>
        <tr>
          <th>Rank</th>
          <th>Player</th>
          <th>Source Era</th>
          <th>Mixed Era OVR</th>
          <th>Proj FP</th>
          <th>Raw FP</th>
          <th>GP</th>
        </tr>
      </thead>
      <tbody></tbody>
    </table>
  </main>
  <script>
    async function renderAudit(configId){
      const loader = window.RosterBateHistoricalPackLoader;
      const runtime = window.RosterBateMixedEraRuntime;
      const config = await loader.loadMixedEraConfigById(configId);
      const bundles = await Promise.all(config.sourcePackIds.map(function(packId){
        return loader.loadPackById(packId);
      }));
      const context = runtime.buildMixedEraDraftContextFromBundles({
        config,
        bundles,
        requestedSport: config.sport
      });
      const viewModel = runtime.buildMixedEraAuditViewModel({
        config,
        playerPool: context.playerPool
      });

      document.getElementById('summary').innerHTML =
        '<p><strong>' + viewModel.configLabel + '</strong></p>' +
        '<p>Top 10: ' + JSON.stringify(viewModel.top10Composition) + '</p>' +
        '<p>Top 25: ' + JSON.stringify(viewModel.top25Composition) + '</p>' +
        '<p>Full Pool: ' + JSON.stringify(viewModel.fullPoolComposition) + '</p>' +
        (viewModel.warning ? '<p>' + viewModel.warning + '</p>' : '');

      document.querySelector('#auditTable tbody').innerHTML = viewModel.rows.map(function(row){
        return '<tr>'
          + '<td>' + row.rank + '</td>'
          + '<td>' + row.player + '</td>'
          + '<td>' + row.sourceEra + '</td>'
          + '<td>' + row.mixedEraOverall.toFixed(1) + '</td>'
          + '<td>' + row.projectedFp.toFixed(1) + '</td>'
          + '<td>' + row.rawFp.toFixed(1) + '</td>'
          + '<td>' + row.gamesPlayed + '</td>'
          + '</tr>';
      }).join('');
    }

    async function boot(){
      const loader = window.RosterBateHistoricalPackLoader;
      const index = await loader.loadMixedEraIndex();
      const select = document.getElementById('configSelect');
      select.innerHTML = index.entries.map(function(entry){
        return '<option value="' + entry.id + '">' + entry.id + '</option>';
      }).join('');
      select.onchange = function(){ renderAudit(select.value); };
      await renderAudit(select.value || index.entries[0].id);
    }

    boot().catch(function(error){
      document.getElementById('summary').textContent = String(error && error.message ? error.message : error);
    });
  </script>
</body>
</html>
```

- [ ] **Step 5: Run the audit-view-model regression test again**

Run: `node tools/test-mixed-era-audit-view-model.js`

Expected: PASS with `mixed-era audit view-model test passed`

- [ ] **Step 6: Commit the audit page**

```bash
git add mixed-era-runtime.js mixed-era-audit.html tools/test-mixed-era-audit-view-model.js
git commit -m "feat: add mixed-era audit page"
```

### Task 5: Run Full Local Verification

**Files:**
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historic-seasons.html`
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-draft.html`
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historic-universe.html`
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\mixed-era-audit.html`

- [ ] **Step 1: Start the local server**

Run:

```powershell
cd "C:\Users\jabro\Desktop\Fantasy Project\rosterbate"
.\Start-Local-Dev.bat
```

Expected: the PowerShell server starts on `http://localhost:8080/`

- [ ] **Step 2: Verify the archive and draft boot flow**

Open:

```text
http://localhost:8080/historic-seasons.html?sport=nba
```

Manual checks:
- the mixed-era card still appears
- it launches using the new config-driven `draftUrl`
- no duplicate mixed-era entry appears in the archive

- [ ] **Step 3: Verify the full mixed-era product loop**

Manual checks:
1. Launch `Draft The Era`
2. Finish the mixed-era draft
3. Confirm the season boots successfully
4. Confirm `Start Sim Season` is available
5. Run one sim day
6. Open the sim report
7. Leave the season
8. Reopen the saved universe from `historic-universe.html`
9. Confirm the universe details page shows source-era pills and the `Top 50 players from each era` rule

- [ ] **Step 4: Verify the audit page uses the same board composition**

Open:

```text
http://localhost:8080/mixed-era-audit.html
```

Manual checks:
- the initial config loads from `historical-packs/mixed-era/index.json`
- the top board ordering matches the real draft board
- top-10 and top-25 source composition render
- no missing-pack error appears for the `1996-2016` config

- [ ] **Step 5: Run all regression scripts one last time**

Run:

```powershell
node tools/test-mixed-era-loader.js
node tools/test-mixed-era-runtime.js
node tools/test-mixed-era-universe-summary.js
node tools/test-mixed-era-audit-view-model.js
```

Expected: all four scripts PASS with their success messages
