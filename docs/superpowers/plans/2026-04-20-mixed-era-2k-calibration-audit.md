# Mixed-Era 2K Calibration Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an audit-only `2KRatings`-style calibration layer for the flagship `1996-2016-top300` board so the mixed-era audit can compare RosterBate's board against a curated external prior without changing live ranking or sim gameplay.

**Architecture:** Keep the draft board and simulation engine untouched. Add one authored calibration JSON file, attach optional calibration metadata in the mixed-era audit model path, surface mismatch signals in `mixed-era-audit.html`, and verify everything with focused runtime and static-page regressions before using it in future audit notebooks.

**Tech Stack:** Vanilla JavaScript, static HTML, CommonJS Node test scripts, checked-in JSON data, PowerShell localhost verification, Markdown notebook workflow.

---

## File Map

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historical-packs\mixed-era\audit-calibration\1996-2016-top300.2k.json`
  Purpose: store the first curated `2K`-style calibration snapshot for selected `1996-2016-top300` players, including `2kOverall`, optional category buckets, and provenance fields.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\mixed-era-runtime.js`
  Purpose: load and attach optional calibration metadata to the mixed-era audit view model without affecting the live draft context or season runtime.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\mixed-era-audit.html`
  Purpose: render calibration mismatch columns and summary panels on the existing audit page.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-audit-view-model.js`
  Purpose: verify the audit view model attaches calibration entries correctly and computes mismatch status / deltas for calibrated players.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-audit-page-static.js`
  Purpose: verify the audit page contains the new calibration UI sections and labels.

- `C:\Users\jabro\Documents\Vault\wee\wiki\synthesis\rosterbate-mixed-era-normalization-audit-1996-2016-top300-2026-04-20.md`
  Purpose: no immediate code edit planned in this implementation, but this notebook becomes the first consumer of the calibration-assisted audit flow after verification.

### Task 1: Add The Authored Calibration Dataset And View-Model Regression

**Files:**
- Create: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historical-packs\mixed-era\audit-calibration\1996-2016-top300.2k.json`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\mixed-era-runtime.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-audit-view-model.js`

- [ ] **Step 1: Write the failing calibration-aware view-model regression first**

Replace `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-audit-view-model.js` with this exact content:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

global.window = globalThis;
require('../simulation-league-engine.js');
const runtime = require('../mixed-era-runtime.js');

const root = path.resolve(__dirname, '..');

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(root, relPath), 'utf8'));
}

const config = Object.assign(
  { mixedEraConfigId: '1996-2016-top300' },
  readJson('historical-packs/mixed-era/1996-2016-top300.json')
);

const bundles = config.sourcePackIds.map((packId) => ({
  manifest: readJson(`historical-packs/${packId}/manifest.json`),
  season: readJson(`historical-packs/${packId}/season.json`),
  teams: readJson(`historical-packs/${packId}/teams.json`),
  players: readJson(`historical-packs/${packId}/players.json`)
}));

const calibration = readJson('historical-packs/mixed-era/audit-calibration/1996-2016-top300.2k.json');

const context = runtime.buildMixedEraDraftContextFromBundles({
  config,
  bundles,
  requestedSport: config.sport,
  buildPlayerSimulationProfile: globalThis.RosterBateSimulationEngine.buildPlayerSimulationProfile
});

const audit = runtime.buildMixedEraAuditViewModel({
  config,
  playerPool: context.playerPool,
  calibration
});

function mustGetRow(playerName) {
  const row = audit.rows.find((candidate) => candidate.player === playerName);
  assert.ok(row, `expected row for ${playerName} to exist`);
  return row;
}

assert.ok(audit.calibrationSummary, 'expected calibration summary to exist');
assert.ok(Array.isArray(audit.calibrationSummary.topOverRanked), 'expected over-ranked summary list');
assert.ok(Array.isArray(audit.calibrationSummary.topUnderRanked), 'expected under-ranked summary list');
assert.ok(audit.calibrationSummary.counts, 'expected calibration counts');

const jordan = mustGetRow('Michael Jordan');
assert.equal(jordan.calibration?.source, '2kratings');
assert.equal(jordan.calibration?.twoKOverall, 99);
assert.equal(jordan.calibration?.captureDate, '2026-04-20');
assert.ok(
  ['aligned', 'review', 'strong_disagreement'].includes(jordan.calibrationMismatch),
  `expected calibration mismatch label for Jordan, got ${jordan.calibrationMismatch}`
);

const shawnKemp = mustGetRow('Shawn Kemp');
assert.equal(shawnKemp.calibration?.twoKOverall, 88);
assert.ok(
  Number.isFinite(Number(shawnKemp.calibrationRankDelta)),
  'expected Shawn Kemp to expose a numeric calibration rank delta'
);

const steph = mustGetRow('Stephen Curry');
assert.equal(steph.calibration?.twoKOverall, 97);
assert.equal(steph.calibration?.buckets?.outside, 99);

const uncalibrated = audit.rows.find((row) => !row.calibration);
assert.ok(uncalibrated, 'expected at least one uncalibrated row');
assert.equal(uncalibrated.calibrationMismatch, null);
assert.equal(uncalibrated.calibrationRankDelta, null);

console.log('mixed-era audit view-model test passed');
```

- [ ] **Step 2: Run the calibration-aware view-model regression and verify it fails first**

Run:

```powershell
node .\tools\test-mixed-era-audit-view-model.js
```

Expected: FAIL because the calibration JSON does not exist yet and the view model does not attach calibration metadata.

- [ ] **Step 3: Add the first authored calibration dataset**

Create `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historical-packs\mixed-era\audit-calibration\1996-2016-top300.2k.json` with this exact starter content:

```json
{
  "mixedEraConfigId": "1996-2016-top300",
  "source": "2kratings",
  "captureDate": "2026-04-20",
  "notes": "Audit-only calibration snapshot curated from 2KRatings classic-team/player pages. Diagnostic only; does not drive live ranking.",
  "players": [
    {
      "name": "Michael Jordan",
      "historicalPackId": "nba_1996_full_season_v1",
      "twoKOverall": 99,
      "buckets": {
        "inside": 93,
        "outside": 83,
        "athleticism": 91,
        "playmaking": 84,
        "defense": 92,
        "rebounding": 58
      },
      "sourceNote": "1995-96 Chicago Bulls NBA 2K26 roster"
    },
    {
      "name": "Scottie Pippen",
      "historicalPackId": "nba_1996_full_season_v1",
      "twoKOverall": 96,
      "buckets": {
        "inside": 81,
        "outside": 78,
        "athleticism": 86,
        "playmaking": 84,
        "defense": 91,
        "rebounding": 66
      },
      "sourceNote": "1995-96 Chicago Bulls NBA 2K26 roster"
    },
    {
      "name": "Dennis Rodman",
      "historicalPackId": "nba_1996_full_season_v1",
      "twoKOverall": 87,
      "buckets": {
        "inside": 67,
        "outside": 48,
        "athleticism": 78,
        "playmaking": 59,
        "defense": 94,
        "rebounding": 96
      },
      "sourceNote": "1995-96 Chicago Bulls NBA 2K26 roster"
    },
    {
      "name": "Shawn Kemp",
      "historicalPackId": "nba_1996_full_season_v1",
      "twoKOverall": 88,
      "buckets": {
        "inside": 86,
        "outside": 53,
        "athleticism": 88,
        "playmaking": 60,
        "defense": 76,
        "rebounding": 84
      },
      "sourceNote": "1995-96 Seattle SuperSonics NBA 2K26 roster"
    },
    {
      "name": "Gary Payton",
      "historicalPackId": "nba_1996_full_season_v1",
      "twoKOverall": 92,
      "buckets": {
        "inside": 74,
        "outside": 74,
        "athleticism": 88,
        "playmaking": 85,
        "defense": 96,
        "rebounding": 58
      },
      "sourceNote": "1995-96 Seattle SuperSonics NBA 2K26 roster"
    },
    {
      "name": "Hakeem Olajuwon",
      "historicalPackId": "nba_1996_full_season_v1",
      "twoKOverall": 97,
      "buckets": {
        "inside": 95,
        "outside": 63,
        "athleticism": 84,
        "playmaking": 70,
        "defense": 95,
        "rebounding": 86
      },
      "sourceNote": "Classic frontcourt list / classic-team pages"
    },
    {
      "name": "Stephen Curry",
      "historicalPackId": "nba_2016_full_season_v1",
      "twoKOverall": 97,
      "buckets": {
        "inside": 79,
        "outside": 99,
        "athleticism": 84,
        "playmaking": 92,
        "defense": 66,
        "rebounding": 54
      },
      "sourceNote": "2015-16 Golden State Warriors NBA 2K26 roster"
    },
    {
      "name": "Klay Thompson",
      "historicalPackId": "nba_2016_full_season_v1",
      "twoKOverall": 91,
      "buckets": {
        "inside": 71,
        "outside": 92,
        "athleticism": 79,
        "playmaking": 69,
        "defense": 84,
        "rebounding": 60
      },
      "sourceNote": "2015-16 Golden State Warriors NBA 2K26 roster"
    },
    {
      "name": "Draymond Green",
      "historicalPackId": "nba_2016_full_season_v1",
      "twoKOverall": 89,
      "buckets": {
        "inside": 76,
        "outside": 74,
        "athleticism": 79,
        "playmaking": 83,
        "defense": 90,
        "rebounding": 80
      },
      "sourceNote": "2015-16 Golden State Warriors NBA 2K26 roster"
    },
    {
      "name": "LeBron James",
      "historicalPackId": "nba_2016_full_season_v1",
      "twoKOverall": 99,
      "buckets": {
        "inside": 94,
        "outside": 76,
        "athleticism": 90,
        "playmaking": 91,
        "defense": 80,
        "rebounding": 69
      },
      "sourceNote": "'16 CLE classic frontcourt listing"
    },
    {
      "name": "Kawhi Leonard",
      "historicalPackId": "nba_2016_full_season_v1",
      "twoKOverall": 94,
      "buckets": {
        "inside": 81,
        "outside": 86,
        "athleticism": 84,
        "playmaking": 75,
        "defense": 95,
        "rebounding": 68
      },
      "sourceNote": "Curated classic-era 2K reference snapshot"
    }
  ]
}
```

- [ ] **Step 4: Attach calibration data in the audit view model**

In `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\mixed-era-runtime.js`, add these helpers after `comparePlayers`:

```js
  function buildCalibrationKey(name, packId){
    return String(name || '').trim().toLowerCase() + '::' + String(packId || '').trim().toLowerCase();
  }

  function normalizeCalibration(input){
    var rawPlayers = Array.isArray(input && input.players) ? input.players : [];
    var byKey = {};
    rawPlayers.forEach(function(entry){
      var key = buildCalibrationKey(entry && entry.name, entry && entry.historicalPackId);
      if(!key || key === '::') return;
      byKey[key] = {
        source: String(input && input.source || 'external').trim() || 'external',
        captureDate: String(input && input.captureDate || '').trim() || null,
        twoKOverall: Number.isFinite(Number(entry && entry.twoKOverall)) ? Number(entry.twoKOverall) : null,
        buckets: entry && entry.buckets && typeof entry.buckets === 'object' ? clone(entry.buckets) : null,
        sourceNote: String(entry && entry.sourceNote || '').trim() || null
      };
    });
    return {
      mixedEraConfigId: String(input && input.mixedEraConfigId || '').trim() || null,
      byKey: byKey
    };
  }

  function getCalibrationMismatchLabel(rankDelta){
    var delta=Math.abs(Number(rankDelta || 0));
    if(delta >= 12) return 'strong_disagreement';
    if(delta >= 6) return 'review';
    return 'aligned';
  }
```

Then, inside `buildMixedEraAuditViewModel`, normalize optional `input.calibration`, attach `calibration`, `calibrationRank`, `calibrationRankDelta`, and `calibrationMismatch` to rows, and add a `calibrationSummary` object with:

- `counts`
- `topOverRanked`
- `topUnderRanked`

Use this exact row-attach shape when mapping rows:

```js
      var calibrationEntry = calibration.byKey[buildCalibrationKey(player && player.name, player && player.historicalPackId)] || null;
      var calibrationRank = calibrationEntry && Number.isFinite(Number(calibrationRanks[buildCalibrationKey(player && player.name, player && player.historicalPackId)]))
        ? Number(calibrationRanks[buildCalibrationKey(player && player.name, player && player.historicalPackId)])
        : null;
      var calibrationRankDelta = calibrationRank ? calibrationRank - rank : null;
      var calibrationMismatch = calibrationRankDelta === null ? null : getCalibrationMismatchLabel(calibrationRankDelta);
```

And use this exact summary shape:

```js
    calibrationSummary: {
      counts: calibrationCounts,
      topOverRanked: overRanked.slice(0, 5),
      topUnderRanked: underRanked.slice(0, 5)
    }
```

Implementation details:

- calibrated subset rank is computed only among calibrated rows
- “over-ranked” means RosterBate rank is much better than calibration subset rank
- “under-ranked” means RosterBate rank is much worse than calibration subset rank
- missing calibration leaves all calibration fields `null`

- [ ] **Step 5: Run the view-model regression again and commit**

Run:

```powershell
node .\tools\test-mixed-era-audit-view-model.js
git add historical-packs/mixed-era/audit-calibration/1996-2016-top300.2k.json mixed-era-runtime.js tools/test-mixed-era-audit-view-model.js
git commit -m "feat: attach 2k calibration data to mixed-era audit model"
```

Expected:

```text
mixed-era audit view-model test passed
```

### Task 2: Render Calibration Signals On The Audit Page

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\mixed-era-audit.html`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-audit-page-static.js`

- [ ] **Step 1: Write the failing static-page regression first**

Replace `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-audit-page-static.js` with this exact content:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const auditPage = fs.readFileSync(
  path.join(__dirname, '..', 'mixed-era-audit.html'),
  'utf8'
);

assert.match(auditPage, /Calibration Summary/);
assert.match(auditPage, /2K OVR/);
assert.match(auditPage, /Mismatch/);
assert.match(auditPage, /strong_disagreement/);
assert.match(auditPage, /topOverRanked/);
assert.match(auditPage, /topUnderRanked/);

console.log('mixed-era audit page static test passed');
```

- [ ] **Step 2: Run the static-page regression and verify it fails first**

Run:

```powershell
node .\tools\test-mixed-era-audit-page-static.js
```

Expected: FAIL because the current page does not yet mention the calibration UI.

- [ ] **Step 3: Add calibration summary panels and row columns to the audit page**

In `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\mixed-era-audit.html`:

1. Add one new panel in the audit grid titled `Calibration Summary`
2. Add helper renderers for:
- calibration counts
- top over-ranked list
- top under-ranked list
- mismatch badges
3. Extend the board table with these new columns:
- `2K OVR`
- `Delta`
- `Mismatch`

Use these exact header cells in the table:

```html
<th>2K OVR</th>
<th>Delta</th>
<th>Mismatch</th>
```

Use this exact mismatch badge mapping in the page script:

```js
function getCalibrationBadgeClass(value){
  if(value === 'strong_disagreement') return 'badge-fail';
  if(value === 'review') return 'badge-tune';
  if(value === 'aligned') return 'badge-pass';
  return 'badge-review';
}
```

Use this exact row rendering fragment:

```js
  + '<td>' + (row.calibration && row.calibration.twoKOverall != null ? escapeHtml(String(row.calibration.twoKOverall)) : '—') + '</td>'
  + '<td>' + (row.calibrationRankDelta != null ? escapeHtml(String(row.calibrationRankDelta)) : '—') + '</td>'
  + '<td>' + (row.calibrationMismatch ? '<span class=\"badge ' + getCalibrationBadgeClass(row.calibrationMismatch) + '\">' + escapeHtml(row.calibrationMismatch.replace('_', ' ')) + '</span>' : '—') + '</td>'
```

And in the page render path, append a calibration summary panel using `audit.calibrationSummary`.

- [ ] **Step 4: Run the static-page regression again and commit**

Run:

```powershell
node .\tools\test-mixed-era-audit-page-static.js
git add mixed-era-audit.html tools/test-mixed-era-audit-page-static.js
git commit -m "feat: show 2k calibration signals in mixed-era audit"
```

Expected:

```text
mixed-era audit page static test passed
```

### Task 3: Run The Full Audit Verification Sweep

**Files:**
- No required repo code edits planned unless verification exposes a bug

- [ ] **Step 1: Run the mixed-era regression suite**

Run:

```powershell
node .\tools\test-mixed-era-loader.js
node .\tools\test-mixed-era-runtime.js
node .\tools\test-mixed-era-universe-summary.js
node .\tools\test-mixed-era-audit-view-model.js
node .\tools\test-mixed-era-audit-page-static.js
node .\tools\test-mixed-era-top300-primary-wiring.js
```

Expected:

```text
mixed-era loader smoke test passed
mixed-era runtime test passed
mixed-era universe summary test passed
mixed-era audit view-model test passed
mixed-era audit page static test passed
mixed-era top300 primary wiring test passed
```

- [ ] **Step 2: Start the local audit server**

Run:

```powershell
powershell -ExecutionPolicy Bypass -Command "& 'C:\Users\jabro\Desktop\Fantasy Project\tools\serve-local.ps1' -Port 8082 -RootPath 'C:\Users\jabro\Desktop\Fantasy Project\rosterbate'"
```

Expected: the audit page is served locally on port `8082`. If that port is taken, rerun on `8083` and use the substituted port number consistently below.

- [ ] **Step 3: Verify the calibration-assisted audit page manually**

Open:

```text
http://127.0.0.1:8082/mixed-era-audit.html?configId=1996-2016-top300
```

Verify:

- the page still loads the `1996-2016-top300` board
- the new `Calibration Summary` panel renders
- calibrated players show `2K OVR`, `Delta`, and `Mismatch`
- uncalibrated players show `—` in those columns
- the page remains readable on desktop without breaking the existing audit table
- no live board ranking changes are implied or applied by the calibration UI

- [ ] **Step 4: Stop the temporary server and verify repo cleanliness**

Stop the localhost process if it is still running, then run:

```powershell
git status --short
```

Expected:

- no unexpected repo edits beyond the committed calibration work
- the branch is ready for the completion workflow
