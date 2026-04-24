# Remove Real Season Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `real_season` as a playable product mode, strip all user-facing `Play The Real Season` references, and preserve historical packs as draft/simulation source material.

**Architecture:** Remove the mode at the source of truth first, then update runtime copy and legacy labels so the app no longer presents full-roster season replay as a supported lane. Use focused Node audits plus existing historical/simulation regressions to lock the removal in without touching the underlying historical player and stats data.

**Tech Stack:** Static HTML, vanilla JavaScript, Node-based test harnesses in `tools/`, JSON historical pack metadata, Python historical pack builders

---

## File Structure

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\tools\test-remove-real-season-copy.js`
  - New focused audit for user-facing copy and CTA removal.
- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\tools\test-remove-real-season-runtime.js`
  - New focused audit for runtime metadata, validator rules, and neutral legacy labels.
- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\tools\test-remove-real-season-pack-metadata.js`
  - New focused audit for checked-in manifests, optional metadata, and builder scripts.
- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\index.html`
  - Homepage historical lane CTAs and product framing.
- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\historic-seasons.html`
  - Historical browser copy, stat terminology, and archive-facing labels.
- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\my-leagues.html`
  - Saved-league launch copy for supported historical actions.
- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\historic-universe.html`
  - Historical universe detail wording and neutral archive summaries.
- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\rosterbate-season.html`
  - Shared shell copy for historical ratings sources.
- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\simulation-league-engine.js`
  - Simulation ratings-source copy for historical baselines.
- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\historical-pack-validator.js`
  - Allowed pack mode schema for runtime metadata.
- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\historical-pack-fixtures.js`
  - Local dev fixture source-of-truth bundle.
- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\historical-pack-dev-runner.js`
  - Localhost helper behavior and entry-mode persistence.
- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\historical-universe-slots.js`
  - Neutral labels/tones and slot metadata normalization for legacy entries.
- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\build-historical-pack-1987.py`
- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\build-historical-pack-1993.py`
- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\build-historical-pack-2001.py`
- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\build-historical-pack-2016.py`
  - Builder-source definitions that currently regenerate `real_season` metadata.
- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\historical-packs\**\manifest.json`
- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\historical-packs\**\optional\pack_challenges.json`
- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\historical-packs\**\optional\presentation.json`
- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\historical-packs\**\optional\summaries.json`
  - Checked-in historical pack metadata that must stop advertising `real_season`.

### Task 1: Remove User-Facing Real Season Copy

**Files:**
- Create: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\tools\test-remove-real-season-copy.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\index.html`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\historic-seasons.html`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\my-leagues.html`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\historic-universe.html`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\rosterbate-season.html`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\simulation-league-engine.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\tools\test-historic-seasons-archive-browser.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\tools\test-historical-universe-details.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\tools\test-simulation-season-page.js`

- [ ] **Step 1: Write the failing copy-audit test**

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const banned = [
  /Play The Real Season/i,
  /relive the real season/i,
  /the historical league intact/i
];

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

[
  'index.html',
  'historic-seasons.html',
  'my-leagues.html',
  'historic-universe.html'
].forEach((file) => {
  const text = read(file);
  banned.forEach((pattern) => {
    assert.doesNotMatch(text, pattern, `${file} still contains ${pattern}`);
  });
});

assert.match(
  read('historic-seasons.html'),
  /Historical season stats/,
  'historic-seasons should rename the stats baseline copy'
);

assert.match(
  read('rosterbate-season.html'),
  /Historical season stats \+ light authored tuning/,
  'season shell should expose the neutral ratings-source label'
);

assert.match(
  read('simulation-league-engine.js'),
  /Historical season stats \+ light authored tuning/,
  'simulation engine summary copy should use the neutral ratings-source label'
);
```

- [ ] **Step 2: Run the new test and verify it fails**

```bash
node tools/test-remove-real-season-copy.js
```

Expected: FAIL with at least one message like `index.html still contains /Play The Real Season/i`.

- [ ] **Step 3: Update the user-facing copy and CTA surfaces**

```html
<!-- index.html -->
<span class="cta-pane-sub">Draft The Era - Start Simulation League</span>
<div class="historical-desc" id="historicalEntryDesc">
  Load the full historical player pool, draft the era, or use classic seasons as source material for mixed-era simulation with Jordan, Hakeem, Shaq, Malone, Ewing, Robinson, and the rest of the league in one alternate-history sandbox.
</div>
<div class="historical-footnote" id="historicalEntryNote">
  Historic mode now centers on player-pool drafts, simulation universes, and archive browsing built from classic seasons.
</div>
<div class="historical-action-row">
  <a id="historicalBrowseLink" class="historical-btn tertiary" href="historic-seasons.html?sport=nba">Browse Historic Seasons</a>
  <a id="historicalDraftLink" class="historical-btn primary" href="rosterbate-draft.html?sport=nba&historical=dev">Draft The Era</a>
  <a class="historical-btn secondary hero-cta" href="rosterbate-simulation-setup.html?sport=nba">Start Simulation League</a>
</div>
```

```js
// rosterbate-season.html + simulation-league-engine.js
ratingsSource: 'Historical season stats + light authored tuning'
```

```js
// historic-seasons.html copy targets
realStatCoverage: 'Historical season stats'
summary: 'Historic player baselines and draft-ready pools from the full season.'
```

Also update `my-leagues.html` and `historic-universe.html` so saved historical runs are described as drafted, simulated, or historical universes rather than `Real Season` runs.

- [ ] **Step 4: Run the copy audit and the affected regression tests**

```bash
node tools/test-remove-real-season-copy.js
node tools/test-historic-seasons-archive-browser.js
node tools/test-historical-universe-details.js
node tools/test-simulation-season-page.js
```

Expected: PASS for all four commands.

- [ ] **Step 5: Commit the copy cleanup**

```bash
git add tools/test-remove-real-season-copy.js index.html historic-seasons.html my-leagues.html historic-universe.html rosterbate-season.html simulation-league-engine.js
git commit -m "refactor: remove real season user-facing copy"
```

### Task 2: Remove Runtime Real Season Mode Declarations

**Files:**
- Create: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\tools\test-remove-real-season-runtime.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\historical-pack-validator.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\historical-pack-fixtures.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\historical-pack-dev-runner.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\historical-universe-slots.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\tools\test-historical-universe-slot-storage.js`

- [ ] **Step 1: Write the failing runtime audit**

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const fixtures = require('../historical-pack-fixtures.js');

const validatorSource = fs.readFileSync(path.join(__dirname, '..', 'historical-pack-validator.js'), 'utf8');
assert.doesNotMatch(
  validatorSource,
  /ALLOWED_SUPPORTED_MODES=\[[^\]]*real_season/,
  'validator should no longer allow real_season packs'
);

const bundle = fixtures.getSample1995_96Bundle();
assert.deepStrictEqual(
  bundle.manifest.supportedModes,
  ['historical_draft', 'single_player_season'],
  'fixture manifest should only expose supported historical lanes'
);
assert.equal(bundle.manifest.defaultEntryMode, 'historical_draft');

assert.equal(bundle.packChallenges.challengeGroups[0].mode, 'historical_draft');
assert.equal(bundle.presentation.entryModes[0].mode, 'historical_draft');
assert.equal(bundle.summaries.modeSummaries[0].mode, 'historical_draft');

const slotsSource = fs.readFileSync(path.join(__dirname, '..', 'historical-universe-slots.js'), 'utf8');
assert.match(slotsSource, /return 'Historic Season';/, 'legacy real_season labels should degrade into Historic Season');
assert.match(slotsSource, /return 'historical';/, 'legacy real_season tones should degrade into historical');

const devRunnerSource = fs.readFileSync(path.join(__dirname, '..', 'historical-pack-dev-runner.js'), 'utf8');
assert.doesNotMatch(devRunnerSource, /entryMode \|\| 'real_season'/, 'dev runner should no longer default to real_season');
```

- [ ] **Step 2: Run the runtime audit and verify it fails**

```bash
node tools/test-remove-real-season-runtime.js
```

Expected: FAIL on the validator, fixture, or dev-runner assertions.

- [ ] **Step 3: Remove the runtime mode and normalize legacy labels**

```js
// historical-pack-validator.js
const ALLOWED_SUPPORTED_MODES = ['historical_draft', 'single_player_season', 'reimagined_season'];
```

```js
// historical-pack-fixtures.js
supportedModes: ['historical_draft', 'single_player_season'],
defaultEntryMode: 'historical_draft',
subtitle: 'Draft the era or use this season as source material for simulation.',
challengeGroups: [
  { groupId: 'draft_the_era_paths', label: 'Draft The Era', mode: 'historical_draft' },
  { groupId: 'simulation_paths', label: 'Sim Season', mode: 'single_player_season' }
],
entryModes: [
  { mode: 'historical_draft', label: 'Draft The Era', description: 'Redraft the included player pool and build an alternate-history league.' },
  { mode: 'single_player_season', label: 'Sim Season', description: 'Use the historical player pool as source material for a simulated season.' }
]
```

```js
// historical-pack-dev-runner.js
const entryMode = String(options && options.entryMode || 'historical_draft').trim() || 'historical_draft';
...
entryMode: mode === 'reimagined'
  ? 'reimagined_season'
  : (mode === 'sim' || mode === 'simulation' ? 'simulation_season' : 'historical_draft')
```

```js
// historical-universe-slots.js
function normalizeHistoricalEntryMode(entryMode) {
  const normalized = String(entryMode || '').trim().toLowerCase();
  if (normalized === 'real_season') return 'historical_season';
  return normalized || 'historical_draft';
}

function getModeLabel(entryMode) {
  switch (normalizeHistoricalEntryMode(entryMode)) {
    case 'historical_season':
      return 'Historic Season';
    case 'historical_draft':
      return 'Drafted Universe';
    ...
  }
}

function getModeTone(entryMode) {
  switch (normalizeHistoricalEntryMode(entryMode)) {
    case 'historical_season':
      return 'historical';
    case 'historical_draft':
      return 'draft';
    ...
  }
}
```

- [ ] **Step 4: Run the runtime audit and the slot-storage regression**

```bash
node tools/test-remove-real-season-runtime.js
node tools/test-historical-universe-slot-storage.js
```

Expected: PASS for both commands.

- [ ] **Step 5: Commit the runtime mode removal**

```bash
git add tools/test-remove-real-season-runtime.js historical-pack-validator.js historical-pack-fixtures.js historical-pack-dev-runner.js historical-universe-slots.js
git commit -m "refactor: remove real season runtime mode"
```

### Task 3: Strip Real Season Metadata From Historical Packs And Builders

**Files:**
- Create: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\tools\test-remove-real-season-pack-metadata.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\build-historical-pack-1987.py`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\build-historical-pack-1993.py`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\build-historical-pack-2001.py`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\build-historical-pack-2016.py`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\historical-packs\nba_1993_full_season_v1\manifest.json`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\historical-packs\nba_1993_full_season_v1\optional\pack_challenges.json`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\historical-packs\nba_1993_full_season_v1\optional\summaries.json`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\historical-packs\nba_1996_full_season_v1\manifest.json`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\historical-packs\nba_1996_full_season_v1\optional\pack_challenges.json`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\historical-packs\nba_1996_full_season_v1\optional\presentation.json`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\historical-packs\nba_1996_full_season_v1\optional\summaries.json`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\historical-packs\nba_2001_full_season_v1\manifest.json`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\historical-packs\nba_2001_full_season_v1\optional\pack_challenges.json`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\historical-packs\nba_2001_full_season_v1\optional\presentation.json`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\historical-packs\nba_2001_full_season_v1\optional\summaries.json`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\historical-packs\nba_2016_full_season_v1\manifest.json`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\historical-packs\nba_2016_full_season_v1\optional\pack_challenges.json`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\historical-packs\nba_2016_full_season_v1\optional\presentation.json`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\historical-packs\nba_2016_full_season_v1\optional\summaries.json`

- [ ] **Step 1: Write the failing metadata audit**

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const files = [
  'build-historical-pack-1987.py',
  'build-historical-pack-1993.py',
  'build-historical-pack-2001.py',
  'build-historical-pack-2016.py',
  'historical-packs/nba_1993_full_season_v1/manifest.json',
  'historical-packs/nba_1993_full_season_v1/optional/pack_challenges.json',
  'historical-packs/nba_1996_full_season_v1/manifest.json',
  'historical-packs/nba_1996_full_season_v1/optional/presentation.json',
  'historical-packs/nba_2001_full_season_v1/optional/summaries.json',
  'historical-packs/nba_2016_full_season_v1/optional/pack_challenges.json'
];

files.forEach((relativePath) => {
  const raw = fs.readFileSync(path.join(root, relativePath), 'utf8');
  assert.doesNotMatch(raw, /"real_season"/, `${relativePath} still declares real_season`);
  assert.doesNotMatch(raw, /Play The Real Season/, `${relativePath} still markets Play The Real Season`);
});

assert.match(
  fs.readFileSync(path.join(root, 'historical-packs/nba_2001_full_season_v1/optional/summaries.json'), 'utf8'),
  /Historical season stats/,
  'historical stat copy should use the neutral terminology'
);
```

- [ ] **Step 2: Run the metadata audit and verify it fails**

```bash
node tools/test-remove-real-season-pack-metadata.js
```

Expected: FAIL in one or more manifests, optional metadata files, or builder scripts.

- [ ] **Step 3: Patch the pack generators and the checked-in metadata**

```python
# build-historical-pack-2001.py
"supportedModes": ["historical_draft", "single_player_season", "reimagined_season"],
"defaultEntryMode": "historical_draft",
"subtitle": "Draft the era or use this season as source material for simulation.",
"heroSubtitle": "Draft the era or use this season as source material for simulation.",
"entryModes": [
    {"mode": "historical_draft", "label": "Draft The Era", "description": "Redraft the full player pool and build an alternate-history league."},
    {"mode": "single_player_season", "label": "Sim Season", "description": "Use the historical player pool as source material for simulation."}
]
```

```json
// historical-packs/nba_1996_full_season_v1/manifest.json
{
  "supportedModes": ["historical_draft", "single_player_season"],
  "defaultEntryMode": "historical_draft",
  "subtitle": "Draft the era or use this season as source material for simulation."
}
```

```json
// historical-packs/nba_2016_full_season_v1/optional/summaries.json
{
  "modeSummaries": [
    { "mode": "historical_draft", "summary": "Remix the included player pool and build a fresh alternate-history season." },
    { "mode": "single_player_season", "summary": "Use the historical player pool as source material for simulation." }
  ],
  "ratingsSourceLabel": "Historical season stats"
}
```

Do **not** rewrite `players.json` bios or raw stat rows in this task. The goal here is product metadata removal, not deleting historical data.

- [ ] **Step 4: Run the metadata audit**

```bash
node tools/test-remove-real-season-pack-metadata.js
```

Expected: PASS with no remaining `real_season` declarations in the audited files.

- [ ] **Step 5: Commit the metadata cleanup**

```bash
git add tools/test-remove-real-season-pack-metadata.js build-historical-pack-1987.py build-historical-pack-1993.py build-historical-pack-2001.py build-historical-pack-2016.py historical-packs/nba_1993_full_season_v1/manifest.json historical-packs/nba_1993_full_season_v1/optional/pack_challenges.json historical-packs/nba_1993_full_season_v1/optional/summaries.json historical-packs/nba_1996_full_season_v1/manifest.json historical-packs/nba_1996_full_season_v1/optional/pack_challenges.json historical-packs/nba_1996_full_season_v1/optional/presentation.json historical-packs/nba_1996_full_season_v1/optional/summaries.json historical-packs/nba_2001_full_season_v1/manifest.json historical-packs/nba_2001_full_season_v1/optional/pack_challenges.json historical-packs/nba_2001_full_season_v1/optional/presentation.json historical-packs/nba_2001_full_season_v1/optional/summaries.json historical-packs/nba_2016_full_season_v1/manifest.json historical-packs/nba_2016_full_season_v1/optional/pack_challenges.json historical-packs/nba_2016_full_season_v1/optional/presentation.json historical-packs/nba_2016_full_season_v1/optional/summaries.json
git commit -m "refactor: strip real season from historical packs"
```

### Task 4: Run The Historical Draft/Sim Regression Sweep

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\tools\test-remove-real-season-copy.js` only if the sweep reveals missing assertions
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\tools\test-remove-real-season-runtime.js` only if the sweep reveals missing assertions
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\tools\test-remove-real-season-pack-metadata.js` only if the sweep reveals missing assertions
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\tools\test-historic-seasons-archive-browser.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\tools\test-historical-universe-slot-storage.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\tools\test-historical-universe-details.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\tools\test-simulation-mode-runtime.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\tools\test-simulation-draft-boot.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\.worktrees\shared-season-shell-simulation-backend\tools\test-simulation-season-page.js`

- [ ] **Step 1: Run the focused removal tests together**

```bash
node tools/test-remove-real-season-copy.js
node tools/test-remove-real-season-runtime.js
node tools/test-remove-real-season-pack-metadata.js
```

Expected: PASS for all three tests.

- [ ] **Step 2: Run the historical and simulation regression sweep**

```bash
node tools/test-historic-seasons-archive-browser.js
node tools/test-historical-universe-slot-storage.js
node tools/test-historical-universe-details.js
node tools/test-simulation-mode-runtime.js
node tools/test-simulation-draft-boot.js
node tools/test-simulation-season-page.js
git diff --check
```

Expected: PASS for each Node test and no output from `git diff --check`.

- [ ] **Step 3: Tighten any missing assertions before the final commit**

```js
// If a regression slips through, add the smallest focused assertion to one of the new tests.
assert.doesNotMatch(read('historical-pack-dev-runner.js'), /real_season/, 'dev runner should stay free of real_season defaults');
assert.doesNotMatch(read('historical-universe-slots.js'), /return 'Real Season';/, 'legacy slot labels should stay neutral');
```

- [ ] **Step 4: Re-run the minimal verification after any assertion edits**

```bash
node tools/test-remove-real-season-copy.js
node tools/test-remove-real-season-runtime.js
node tools/test-remove-real-season-pack-metadata.js
git diff --check
```

Expected: PASS and clean diff formatting.

- [ ] **Step 5: Commit the verified removal sweep**

```bash
git add tools/test-remove-real-season-copy.js tools/test-remove-real-season-runtime.js tools/test-remove-real-season-pack-metadata.js
git commit -m "test: lock real season mode removal"
```

## Self-Review

- Spec coverage check:
  - user-facing CTA/copy removal is covered by Task 1
  - runtime `real_season` mode removal is covered by Task 2
  - checked-in pack metadata and builder cleanup is covered by Task 3
  - regression and graceful legacy behavior verification is covered by Task 4
- Placeholder scan:
  - no placeholder language remains in the tasks or verification steps
- Type consistency:
  - the plan consistently uses `historical_draft`, `single_player_season`, `reimagined_season`, and neutral legacy `historical_season`
