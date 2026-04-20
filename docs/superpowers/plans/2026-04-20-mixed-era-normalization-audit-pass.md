# Mixed-Era Normalization Audit Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn mixed-era audit from a simple top-board inspection into a repeatable internal normalization review workflow with explicit composition verdicts, reusable notebook guidance, and first-run compatibility for the flagship `1996-2016-top300` board.

**Architecture:** Keep the mixed-era draft builder unchanged and extend only the audit layer. Add richer composition and tier-band metadata to `buildMixedEraAuditViewModel`, upgrade `mixed-era-audit.html` to render the new slices and human-review prompts, and save a vault-side notebook format note so future mixed-era boards can be audited without inventing a new method each time.

**Tech Stack:** Static HTML, vanilla browser JavaScript, CommonJS Node regression scripts, Markdown vault notes, PowerShell localhost server.

---

## File Map

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\mixed-era-runtime.js`
  Purpose: extend the audit view model with richer composition checks, top50/top100 slices, tier-band summaries, and audit-ready warning text while preserving the existing draft-context pipeline.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-audit-view-model.js`
  Purpose: verify the runtime audit model exposes the expected composition checks, verdict thresholds, tier bands, and warning behavior.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\mixed-era-audit.html`
  Purpose: render the richer audit workflow for localhost review, including five composition slices, tier integrity summaries, and human-review prompts for star fairness, raw-vs-normalized sanity, and draft feel.

- `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-audit-page-static.js`
  Purpose: catch accidental regressions in the audit page structure and required copy without needing a browser harness.

- `C:\Users\jabro\Documents\Vault\wee\wiki\synthesis\rosterbate-mixed-era-normalization-audit-notebook-format.md`
  Purpose: define the durable mixed-era audit notebook format that mirrors the new pass and tells future reviews what to record.

No changes are planned for mixed-era ranking math, source-pack loading, or simulation logic in this plan. If the audit pass surfaces a real normalization issue during verification, stop and treat that as a new follow-up task rather than widening this scope in place.

### Task 1: Extend The Runtime Audit Model

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-audit-view-model.js:1-999`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\mixed-era-runtime.js:300-430`

- [ ] **Step 1: Rewrite the runtime regression so it expects explicit composition checks and tier bands**

Replace `tools/test-mixed-era-audit-view-model.js` with this focused coverage:

```js
const assert = require('assert');
const runtime = require('../mixed-era-runtime.js');

function makePlayer(name, historicalPackId, mixedEraOverall, projection, totalFantasyPoints, gp) {
  return {
    name,
    historicalPackId,
    mixedEraOverall,
    mixedEraProjection: projection,
    fp: projection,
    totalFantasyPoints,
    gp
  };
}

const balancedViewModel = runtime.buildMixedEraAuditViewModel({
  config: {
    id: '1996-2016-top300',
    seasonLabel: '1995-96 + 2015-16 Mixed Era Draft',
    sourcePackIds: ['nba_1996_full_season_v1', 'nba_2016_full_season_v1'],
    topPlayersPerPack: 2
  },
  playerPool: [
    makePlayer('Michael Jordan', 'nba_1996_full_season_v1', 99.8, 74.2, 6171.5, 82),
    makePlayer('Stephen Curry', 'nba_2016_full_season_v1', 98.7, 72.4, 5742.1, 79),
    makePlayer('Scottie Pippen', 'nba_1996_full_season_v1', 94.1, 61.8, 5033.7, 77),
    makePlayer('LeBron James', 'nba_2016_full_season_v1', 93.9, 61.4, 4970.2, 76)
  ]
});

assert.deepStrictEqual(
  balancedViewModel.compositionChecks.map(check => [check.id, check.verdict]),
  [
    ['top10', 'pass'],
    ['top25', 'pass'],
    ['top50', 'pass'],
    ['top100', 'pass'],
    ['fullPool', 'pass']
  ]
);
assert.strictEqual(balancedViewModel.top10Composition['nba_1996_full_season_v1'], 2);
assert.strictEqual(balancedViewModel.top25Composition['nba_2016_full_season_v1'], 2);
assert.strictEqual(balancedViewModel.top50Composition['nba_1996_full_season_v1'], 2);
assert.strictEqual(balancedViewModel.top100Composition['nba_2016_full_season_v1'], 2);
assert.strictEqual(balancedViewModel.fullPoolComposition['nba_1996_full_season_v1'], 2);
assert.strictEqual(balancedViewModel.tierBands[0].label, '1-10');
assert.strictEqual(balancedViewModel.tierBands[4].label, '101-150');
assert.strictEqual(Array.isArray(balancedViewModel.rows), true);
assert.strictEqual(balancedViewModel.rows[0].rank, 1);
assert.strictEqual(balancedViewModel.rows[0].rawFp, 75.3);
assert.strictEqual(balancedViewModel.warning, '');

const imbalancedTopBoard = runtime.buildMixedEraAuditViewModel({
  config: {
    id: '1996-2016-top300',
    seasonLabel: '1995-96 + 2015-16 Mixed Era Draft',
    sourcePackIds: ['nba_1996_full_season_v1', 'nba_2016_full_season_v1'],
    topPlayersPerPack: 5
  },
  playerPool: [
    makePlayer('Michael Jordan', 'nba_1996_full_season_v1', 99.8, 74.2, 6171.5, 82),
    makePlayer('Scottie Pippen', 'nba_1996_full_season_v1', 97.2, 68.1, 5243.7, 77),
    makePlayer('David Robinson', 'nba_1996_full_season_v1', 96.7, 66.4, 5312.0, 82),
    makePlayer('Hakeem Olajuwon', 'nba_1996_full_season_v1', 96.1, 64.9, 4867.5, 75),
    makePlayer("Shaquille O'Neal", 'nba_1996_full_season_v1', 95.8, 64.2, 4634.2, 73),
    makePlayer('Karl Malone', 'nba_1996_full_season_v1', 95.4, 63.5, 5130.0, 81),
    makePlayer('Anfernee Hardaway', 'nba_1996_full_season_v1', 94.9, 61.2, 4528.8, 74),
    makePlayer('Stephen Curry', 'nba_2016_full_season_v1', 94.4, 60.8, 4803.2, 79),
    makePlayer('LeBron James', 'nba_2016_full_season_v1', 94.2, 60.4, 4590.4, 76),
    makePlayer('Kevin Durant', 'nba_2016_full_season_v1', 93.8, 59.6, 4169.0, 72)
  ]
});

const top10Check = imbalancedTopBoard.compositionChecks.find(check => check.id === 'top10');
assert.strictEqual(top10Check.verdict, 'fail');
assert.match(top10Check.detail, /lead by 4\+/);
assert.match(imbalancedTopBoard.warning, /Top 10 composition check failed/i);

console.log('mixed-era audit view-model test passed');
```

- [ ] **Step 2: Run the runtime audit regression and verify it fails before implementation**

Run:

```powershell
node .\tools\test-mixed-era-audit-view-model.js
```

Expected: FAIL because `compositionChecks`, `top50Composition`, `top100Composition`, `tierBands`, and the richer warning text do not exist yet.

- [ ] **Step 3: Extend `buildMixedEraAuditViewModel` with composition-check and tier-band helpers**

In `mixed-era-runtime.js`, add these helpers just above `buildMixedEraAuditViewModel`:

```js
function getDominantCompositionShare(composition){
  var counts = Object.keys(composition || {}).map(function(key){
    return Number(composition[key] || 0);
  }).filter(function(value){
    return Number.isFinite(value) && value > 0;
  });
  if(!counts.length) return 0;
  var total = counts.reduce(function(sum, value){ return sum + value; }, 0);
  if(!total) return 0;
  return roundStat((Math.max.apply(Math, counts) / total) * 100);
}

function buildCompositionCheck(id, label, players, limit, sourcePackIds, options){
  var composition = buildSourceComposition(players, limit, sourcePackIds);
  var spread = getCompositionSpread(composition);
  var dominantShare = getDominantCompositionShare(composition);
  var verdict = 'pass';
  var detail = 'Composition is within the expected mixed-era balance window.';

  if(options && options.mode === 'spread'){
    if(spread >= Number(options.failAt || 0)){
      verdict = 'fail';
      detail = label + ' composition fails because one era can lead by 4+ slots.';
    }else if(spread >= Number(options.tuneAt || 0)){
      verdict = 'tune';
      detail = label + ' composition needs tuning because one era leads by 3 slots.';
    }
  }else if(options && options.mode === 'share'){
    if(dominantShare >= Number(options.failAt || 0)){
      verdict = 'fail';
      detail = label + ' composition fails because one era owns too much of this slice.';
    }else if(dominantShare >= Number(options.tuneAt || 0)){
      verdict = 'tune';
      detail = label + ' composition is leaning heavily toward one era.';
    }
  }else if(options && options.mode === 'expected_equal'){
    var expectedPerSource = Math.max(0, Number(options.expectedPerSource || 0));
    var matchesTarget = Object.keys(composition).every(function(key){
      return Number(composition[key] || 0) === expectedPerSource;
    });
    verdict = matchesTarget ? 'pass' : 'fail';
    detail = matchesTarget
      ? 'Full pool matches the authored top-N-per-pack composition.'
      : 'Full pool no longer matches the authored top-N-per-pack composition.';
  }

  return {
    id: id,
    label: label,
    limit: limit,
    composition: composition,
    spread: spread,
    dominantShare: dominantShare,
    verdict: verdict,
    detail: detail
  };
}

function buildTierBand(label, players, startRank, endRank, sourcePackIds){
  var slice = (Array.isArray(players) ? players : []).slice(Math.max(0, startRank - 1), endRank);
  var composition = buildSourceComposition(slice, 0, sourcePackIds);
  return {
    label: label,
    startRank: startRank,
    endRank: endRank,
    playerCount: slice.length,
    composition: composition,
    dominantShare: getDominantCompositionShare(composition)
  };
}
```

Then replace the current audit-model body with this structure:

```js
function buildMixedEraAuditViewModel(options){
  var input = options && typeof options === 'object' ? options : {};
  var config = input.config && typeof input.config === 'object' ? input.config : {};
  var playerPool = (Array.isArray(input.playerPool) ? input.playerPool : []).slice().sort(comparePlayers);
  var sourcePackIds = collectAuditSourcePackIds(config, playerPool);
  var topPlayersPerPack = Math.max(1, Math.round(Number(config.topPlayersPerPack || 0))) || null;

  var compositionChecks = [
    buildCompositionCheck('top10', 'Top 10', playerPool, 10, sourcePackIds, { mode: 'spread', tuneAt: 3, failAt: 4 }),
    buildCompositionCheck('top25', 'Top 25', playerPool, 25, sourcePackIds, { mode: 'share', tuneAt: 64, failAt: 70 }),
    buildCompositionCheck('top50', 'Top 50', playerPool, 50, sourcePackIds, { mode: 'share', tuneAt: 60, failAt: 66 }),
    buildCompositionCheck('top100', 'Top 100', playerPool, 100, sourcePackIds, { mode: 'share', tuneAt: 58, failAt: 62 }),
    buildCompositionCheck('fullPool', 'Full Pool', playerPool, 0, sourcePackIds, { mode: 'expected_equal', expectedPerSource: topPlayersPerPack || 0 })
  ];

  var checksById = compositionChecks.reduce(function(map, check){
    map[check.id] = check;
    return map;
  }, {});
  var failingCheck = compositionChecks.find(function(check){ return check.verdict === 'fail'; }) || null;
  var tuningCheck = compositionChecks.find(function(check){ return check.verdict === 'tune'; }) || null;
  var warning = failingCheck
    ? failingCheck.label + ' composition check failed. ' + failingCheck.detail
    : tuningCheck
      ? tuningCheck.label + ' composition check needs tuning. ' + tuningCheck.detail
      : '';

  return {
    seasonLabel: String(config.seasonLabel || 'Mixed Era Draft').trim() || 'Mixed Era Draft',
    topPlayersPerPack: topPlayersPerPack,
    compositionChecks: compositionChecks,
    top10Composition: checksById.top10.composition,
    top25Composition: checksById.top25.composition,
    top50Composition: checksById.top50.composition,
    top100Composition: checksById.top100.composition,
    fullPoolComposition: checksById.fullPool.composition,
    tierBands: [
      buildTierBand('1-10', playerPool, 1, 10, sourcePackIds),
      buildTierBand('11-25', playerPool, 11, 25, sourcePackIds),
      buildTierBand('26-50', playerPool, 26, 50, sourcePackIds),
      buildTierBand('51-100', playerPool, 51, 100, sourcePackIds),
      buildTierBand('101-150', playerPool, 101, 150, sourcePackIds)
    ],
    warning: warning,
    rows: playerPool.map(function(player, index){
      return {
        rank: index + 1,
        player: String(player && player.name || '').trim(),
        sourceEra: String(player && player.historicalPackId || '').trim(),
        mixedEraOverall: roundStat(player && player.mixedEraOverall || 0),
        projectedFp: roundStat(player && (player.mixedEraProjection || player.fp) || 0),
        rawFp: getRawFantasyPointsPerGame(player),
        gamesPlayed: Math.max(0, Number(player && player.gp || player && player.statValues && player.statValues.GP || 0))
      };
    })
  };
}
```

- [ ] **Step 4: Run the runtime audit regression again and verify it passes**

Run:

```powershell
node .\tools\test-mixed-era-audit-view-model.js
```

Expected: PASS with `mixed-era audit view-model test passed`

- [ ] **Step 5: Commit the runtime audit-model change**

Run:

```powershell
git add mixed-era-runtime.js tools/test-mixed-era-audit-view-model.js
git commit -m "feat: expand mixed-era audit view model"
```

Expected: one commit containing the new audit model helpers and runtime regression coverage.

### Task 2: Upgrade The Audit Page For The Full Pass

**Files:**
- Create: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-mixed-era-audit-page-static.js`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\mixed-era-audit.html:1-999`

- [ ] **Step 1: Add a static regression that captures the required audit surface**

Create `tools/test-mixed-era-audit-page-static.js`:

```js
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const auditHtml = fs.readFileSync(
  path.join(__dirname, '..', 'mixed-era-audit.html'),
  'utf8'
);

assert.match(auditHtml, /Top 10 Composition/);
assert.match(auditHtml, /Top 25 Composition/);
assert.match(auditHtml, /Top 50 Composition/);
assert.match(auditHtml, /Top 100 Composition/);
assert.match(auditHtml, /Full Pool Composition/);
assert.match(auditHtml, /Tier Integrity Bands/);
assert.match(auditHtml, /Star Fairness Check/);
assert.match(auditHtml, /Raw vs Normalized Sanity Check/);
assert.match(auditHtml, /Draft-Feel Check/);
assert.match(auditHtml, /multiple headline stars are clearly misplaced by tier/i);
assert.match(auditHtml, /a human reviewer would hesitate to draft/i);
assert.match(auditHtml, /compositionChecks/);
assert.match(auditHtml, /tierBands/);

console.log('mixed-era audit page static test passed');
```

- [ ] **Step 2: Run the new static regression and verify it fails before the page changes**

Run:

```powershell
node .\tools\test-mixed-era-audit-page-static.js
```

Expected: FAIL because the current page only exposes top10, top25, and full-pool composition, with no tier-band or manual-prompt sections.

- [ ] **Step 3: Expand the audit page to render five composition slices, tier bands, and manual-review prompts**

In `mixed-era-audit.html`, make these structural changes.

First, widen the grid and add verdict styling:

```css
.grid{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
  gap:16px;
  margin-bottom:16px;
}
.metric-header{
  display:flex;
  justify-content:space-between;
  gap:12px;
  align-items:center;
  margin-bottom:10px;
}
.badge{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-width:64px;
  padding:4px 10px;
  border-radius:999px;
  font-size:.72rem;
  font-weight:700;
  text-transform:uppercase;
  letter-spacing:.08em;
}
.badge-pass{ background:#dcefd8; color:#255f2a; }
.badge-tune{ background:#fff0c7; color:#8a5a00; }
.badge-fail{ background:#fde3de; color:#8b2c20; }
.metric-detail{
  margin-top:10px;
  font-size:.88rem;
  color:var(--muted);
  line-height:1.5;
}
.prompt-list{
  display:grid;
  gap:10px;
  margin:0;
  padding-left:18px;
}
```

Then replace the three-card section with two audit grids:

```html
<section class="grid">
  <article class="panel">
    <div class="metric-header"><h2>Top 10 Composition</h2><span id="top10Verdict" class="badge badge-pass">PASS</span></div>
    <div id="top10Composition" class="metric-list"></div>
    <p id="top10Detail" class="metric-detail"></p>
  </article>
  <article class="panel">
    <div class="metric-header"><h2>Top 25 Composition</h2><span id="top25Verdict" class="badge badge-pass">PASS</span></div>
    <div id="top25Composition" class="metric-list"></div>
    <p id="top25Detail" class="metric-detail"></p>
  </article>
  <article class="panel">
    <div class="metric-header"><h2>Top 50 Composition</h2><span id="top50Verdict" class="badge badge-pass">PASS</span></div>
    <div id="top50Composition" class="metric-list"></div>
    <p id="top50Detail" class="metric-detail"></p>
  </article>
  <article class="panel">
    <div class="metric-header"><h2>Top 100 Composition</h2><span id="top100Verdict" class="badge badge-pass">PASS</span></div>
    <div id="top100Composition" class="metric-list"></div>
    <p id="top100Detail" class="metric-detail"></p>
  </article>
  <article class="panel">
    <div class="metric-header"><h2>Full Pool Composition</h2><span id="fullPoolVerdict" class="badge badge-pass">PASS</span></div>
    <div id="fullPoolComposition" class="metric-list"></div>
    <p id="fullPoolDetail" class="metric-detail"></p>
  </article>
</section>

<section class="grid">
  <article class="panel">
    <h2>Tier Integrity Bands</h2>
    <div id="tierBands" class="metric-list"></div>
    <p class="metric-detail">Pass if each band has believable cross-era representation. Tune if a band leans noticeably one way but still feels plausible. Fail if a whole band is visibly captured by one era without clear reason.</p>
  </article>
  <article class="panel">
    <h2>Star Fairness Check</h2>
    <ul class="prompt-list">
      <li>Does the top-star conversation feel believable, not just numerically tidy?</li>
      <li>Are cross-era headline names landing in defensible tiers?</li>
      <li>Would a human drafter accept the first two rounds without a trust break?</li>
    </ul>
    <p class="metric-detail">Pass if the top-star conversation feels believable overall. Tune if one or two headline comparisons are arguable but still defensible. Fail if multiple headline stars are clearly misplaced by tier.</p>
  </article>
  <article class="panel">
    <h2>Raw vs Normalized Sanity Check</h2>
    <ul class="prompt-list">
      <li>Compare mixed-era overall, projected FP, and raw FP for the same names.</li>
      <li>Look for suspicious over-corrections and under-corrections.</li>
      <li>Flag any places where normalized order feels impossible rather than directional.</li>
    </ul>
    <p class="metric-detail">Pass if normalization shifts feel directional rather than absurd. Tune if there are a handful of suspicious corrections. Fail if normalized order repeatedly contradicts production context in impossible ways.</p>
  </article>
  <article class="panel">
    <h2>Draft-Feel Check</h2>
    <ul class="prompt-list">
      <li>Do the first few rounds still feel exciting and defensible?</li>
      <li>Are older-era stars respected without crowding out every modern player?</li>
      <li>Are there dead zones or inflated names that would make the room feel wrong?</li>
    </ul>
    <p class="metric-detail">Pass if the board feels exciting and credible for a real draft. Tune if it is fun but has a few obvious "why is he here?" names. Fail if a human reviewer would hesitate to draft from it.</p>
  </article>
</section>
```

Finally, update the script so it consumes the richer runtime shape:

```js
var compositionTargets = {
  top10: {
    list: document.getElementById('top10Composition'),
    verdict: document.getElementById('top10Verdict'),
    detail: document.getElementById('top10Detail')
  },
  top25: {
    list: document.getElementById('top25Composition'),
    verdict: document.getElementById('top25Verdict'),
    detail: document.getElementById('top25Detail')
  },
  top50: {
    list: document.getElementById('top50Composition'),
    verdict: document.getElementById('top50Verdict'),
    detail: document.getElementById('top50Detail')
  },
  top100: {
    list: document.getElementById('top100Composition'),
    verdict: document.getElementById('top100Verdict'),
    detail: document.getElementById('top100Detail')
  },
  fullPool: {
    list: document.getElementById('fullPoolComposition'),
    verdict: document.getElementById('fullPoolVerdict'),
    detail: document.getElementById('fullPoolDetail')
  }
};
var tierBandsNode = document.getElementById('tierBands');

function setVerdictBadge(node, verdict){
  var normalized = String(verdict || 'pass').trim().toLowerCase();
  node.className = 'badge badge-' + (normalized || 'pass');
  node.textContent = (normalized || 'pass').toUpperCase();
}

function renderCompositionCheck(target, check){
  var composition = check && check.composition || {};
  var entries = Object.keys(composition).map(function(key){
    return [key, composition[key]];
  }).sort(function(a, b){
    return Number(b[1] || 0) - Number(a[1] || 0) || String(a[0]).localeCompare(String(b[0]));
  });
  if(!entries.length){
    target.list.innerHTML = '<div class="empty">No source-era counts available.</div>';
    setVerdictBadge(target.verdict, 'pass');
    target.detail.textContent = '';
    return;
  }
  target.list.innerHTML = entries.map(function(entry){
    return '<div class="metric-row"><span>' + escapeHtml(entry[0]) + '</span><strong>' + escapeHtml(String(entry[1])) + '</strong></div>';
  }).join('');
  setVerdictBadge(target.verdict, check && check.verdict || 'pass');
  target.detail.textContent = check && check.detail ? check.detail : '';
}

function renderTierBands(bands){
  if(!Array.isArray(bands) || !bands.length){
    tierBandsNode.innerHTML = '<div class="empty">No tier-band slices available.</div>';
    return;
  }
  tierBandsNode.innerHTML = bands.map(function(band){
    var composition = Object.keys(band.composition || {}).map(function(key){
      return key + ': ' + band.composition[key];
    }).join(' | ');
    return '<div class="metric-row"><span>' + escapeHtml(band.label) + '</span><strong>' + escapeHtml(composition || 'No rows') + '</strong></div>';
  }).join('');
}
```

Update `refresh()` so it builds `checksById` and renders all five slices:

```js
var checksById = (Array.isArray(viewModel.compositionChecks) ? viewModel.compositionChecks : []).reduce(function(map, check){
  map[check.id] = check;
  return map;
}, {});

renderCompositionCheck(compositionTargets.top10, checksById.top10);
renderCompositionCheck(compositionTargets.top25, checksById.top25);
renderCompositionCheck(compositionTargets.top50, checksById.top50);
renderCompositionCheck(compositionTargets.top100, checksById.top100);
renderCompositionCheck(compositionTargets.fullPool, checksById.fullPool);
renderTierBands(viewModel.tierBands);
```

When `refresh()` clears the page after an error or empty selection, also clear the new targets:

```js
Object.keys(compositionTargets).forEach(function(key){
  renderCompositionCheck(compositionTargets[key], { composition: {}, verdict: 'pass', detail: '' });
});
renderTierBands([]);
```

- [ ] **Step 4: Run the static page regression and the runtime regression together**

Run:

```powershell
node .\tools\test-mixed-era-audit-view-model.js
node .\tools\test-mixed-era-audit-page-static.js
```

Expected:
- `mixed-era audit view-model test passed`
- `mixed-era audit page static test passed`

- [ ] **Step 5: Commit the audit-page upgrade**

Run:

```powershell
git add mixed-era-audit.html tools/test-mixed-era-audit-page-static.js
git commit -m "feat: upgrade mixed-era audit workflow page"
```

Expected: one commit containing the richer audit surface and static regression coverage.

### Task 3: Add The Notebook Format And Verify The Workflow

**Files:**
- Create: `C:\Users\jabro\Documents\Vault\wee\wiki\synthesis\rosterbate-mixed-era-normalization-audit-notebook-format.md`
- No planned repo-code changes unless manual verification exposes a real bug

- [ ] **Step 1: Write the vault-side notebook format note for mixed-era normalization passes**

Create `C:\Users\jabro\Documents\Vault\wee\wiki\synthesis\rosterbate-mixed-era-normalization-audit-notebook-format.md` with this content:

````md
---
title: "RosterBate Mixed-Era Normalization Audit Notebook Format"
type: synthesis
tags: [rosterbate, mixed-era, audit, normalization, notebook, qa, validation]
created: 2026-04-20
updated: 2026-04-20
---

## Purpose
This note defines the format RosterBate should use for mixed-era normalization audit notebooks.

The goal is to give every authored mixed-era board a durable, comparable, human-readable trust record.

## Core principle
`A mixed-era normalization audit should explain what board was reviewed, how its draft zones were distributed, where trust broke, and what action followed.`

## Required sections
### 1. `Header`
Include:
- audit id
- date
- reviewer
- board id
- review type

### 2. `Board context`
Include:
- season label
- source packs
- top players per pack
- authored composition target

### 3. `Composition results`
Record:
- top 10 result
- top 25 result
- top 50 result
- top 100 result
- full pool result

### 4. `Star fairness notes`
Capture the short headline comparison judgment for the top of the board.

### 5. `Tier integrity notes`
Capture observations for:
- 1-10
- 11-25
- 26-50
- 51-100
- 101-150

### 6. `Raw vs normalized sanity notes`
Capture whether normalized order still feels directionally believable against production context.

### 7. `Draft-feel verdict`
State whether the room still feels exciting, credible, and draftable.

### 8. `Outcome`
Allowed values:
- Pass
- Tune
- Fail

### 9. `Next action`
Allowed values:
- keep as-is
- retune normalization
- adjust authored pool
- demote from primary board

## Threshold guidance
### Composition
- Top 10: fail if one era leads by 4+, tune if one era leads by 3
- Top 25: fail if one era holds 70%+, tune if one era holds 64%+
- Top 50: fail if one era holds 66%+, tune if one era holds 60%+
- Top 100: fail if one era holds 62%+, tune if one era holds 58%+
- Full pool: fail if authored top-N-per-pack composition no longer matches the loaded board

### Star fairness
- Pass if the top-star conversation feels believable overall
- Tune if one or two headline comparisons feel arguable but defensible
- Fail if multiple headline stars are clearly misplaced by tier

### Tier integrity
- Pass if each band has believable cross-era representation
- Tune if a band leans noticeably one way but still feels plausible
- Fail if a whole band is visibly captured by one era without clear reason

### Raw vs normalized sanity
- Pass if normalization shifts feel directional rather than absurd
- Tune if there are a handful of suspicious over-corrections or under-corrections
- Fail if normalized rank repeatedly contradicts production context in impossible ways

### Draft-feel
- Pass if the board feels exciting and credible for a real draft
- Tune if the board is fun but has a few obvious "why is he here?" names
- Fail if a human reviewer would hesitate to draft from the board

## Recommended template
```md
# Mixed-Era Normalization Audit Notebook
- Audit ID:
- Date:
- Reviewer:
- Board ID:
- Review Type: normalization_pass

## Board Context
- Season Label:
- Source Packs:
- Top Players Per Pack:
- Authored Composition Target:

## Composition Results
- Top 10:
- Top 25:
- Top 50:
- Top 100:
- Full Pool:

## Star Fairness Notes
- 

## Tier Integrity Notes
- 1-10:
- 11-25:
- 26-50:
- 51-100:
- 101-150:

## Raw vs Normalized Sanity Notes
- 

## Draft-Feel Verdict
- 

## Outcome
- 

## Next Action
- 
```

## Related notes
- [rosterbate-mixed-era-config-and-audit-checkpoint.md](rosterbate-mixed-era-config-and-audit-checkpoint.md)
- [rosterbate-simulation-audit-notebook-format.md](rosterbate-simulation-audit-notebook-format.md)
````

- [ ] **Step 2: Run the full audit regression sweep before manual browser verification**

Run:

```powershell
node .\tools\test-mixed-era-loader.js
node .\tools\test-mixed-era-runtime.js
node .\tools\test-mixed-era-universe-summary.js
node .\tools\test-mixed-era-audit-view-model.js
node .\tools\test-mixed-era-audit-page-static.js
```

Expected:
- `mixed-era loader smoke test passed`
- `mixed-era runtime test passed`
- `mixed-era universe summary test passed`
- `mixed-era audit view-model test passed`
- `mixed-era audit page static test passed`

- [ ] **Step 3: Start the local server and verify the new audit workflow on the flagship board**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File 'C:\Users\jabro\Desktop\Fantasy Project\tools\serve-local.ps1' -Port 8082 -Root 'C:\Users\jabro\Desktop\Fantasy Project\rosterbate'
```

Open:

```text
http://127.0.0.1:8082/mixed-era-audit.html?configId=1996-2016-top300
```

Verify:
- the selector resolves `1996-2016-top300`
- the page shows composition panels for `top 10`, `top 25`, `top 50`, `top 100`, and `full pool`
- each composition panel shows a verdict badge and guidance text
- the tier-band panel renders `1-10`, `11-25`, `26-50`, `51-100`, and `101-150`
- the manual-prompt panels for star fairness, raw-vs-normalized, and draft feel are visible
- the board table still loads and remains in the current fixed ordering

- [ ] **Step 4: Save the notebook-format note and record any implementation bug separately**

If the audit page and regression suite are clean:
- keep the vault note as the durable workflow definition
- do not create a no-op repo commit

If manual verification exposes a real implementation bug:
- fix the bug in a separate follow-up task
- rerun Task 3 from the top
- use a narrowly-scoped commit message such as:

```powershell
git add <changed files>
git commit -m "fix: stabilize mixed-era audit workflow"
```
