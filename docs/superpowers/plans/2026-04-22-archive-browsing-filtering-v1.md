# Archive Browsing / Filtering V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add URL-persisted pack filtering and sorting to the historical archive shelf in `historic-seasons.html` without changing the page into a search-heavy admin catalog.

**Architecture:** Keep the entire first pass inside [C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historic-seasons.html](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/historic-seasons.html) by introducing a small local browse-state helper layer, a horizontal filter/sort control bar, and a filtered visible-catalog flow that wraps the existing `renderShelf`, `renderPack`, `setActivePack`, and `boot` path. Add one focused Node regression harness that extracts the new helpers and verifies URL hydration, filtering, sorting, selection fallback, and empty-state wiring without needing a browser runner.

**Tech Stack:** Vanilla HTML/CSS/JS, `URLSearchParams` and `history.replaceState`, Node.js `assert/fs/path/vm`, existing historical pack catalog/fallback metadata

---

## File Structure

- **Modify:** `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historic-seasons.html`
  - Add the filter bar UI, local browse-state helpers, URL persistence, filtered/sorted shelf rendering, and empty-state handling.
- **Create:** `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historic-seasons-archive-browser.js`
  - Focused regression harness for browse-state helpers and archive-browser markup hooks.

### Task 1: Add a failing archive-browsing regression harness

**Files:**
- Create: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historic-seasons-archive-browser.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historic-seasons-archive-browser.js`

- [ ] **Step 1: Write the failing regression harness**

Create `tools/test-historic-seasons-archive-browser.js` with a focused harness that checks for the new control markup and evaluates the future helper layer in isolation:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'historic-seasons.html'),
  'utf8'
);

function expectMatch(pattern, message) {
  assert.match(html, pattern, message);
}

function extractFunctionSource(signature) {
  const start = html.indexOf(`function ${signature}`);
  assert.ok(start >= 0, `missing ${signature}`);

  const openBrace = html.indexOf('{', start);
  assert.ok(openBrace >= 0, `missing body for ${signature}`);

  let depth = 0;
  let mode = 'code';
  const stack = [];

  for (let index = openBrace; index < html.length; index += 1) {
    const char = html[index];
    const next = html[index + 1];

    if (mode === 'lineComment') {
      if (char === '\n') mode = stack.pop() || 'code';
      continue;
    }
    if (mode === 'blockComment') {
      if (char === '*' && next === '/') {
        mode = stack.pop() || 'code';
        index += 1;
      }
      continue;
    }
    if (mode === 'singleQuote') {
      if (char === '\\') {
        index += 1;
        continue;
      }
      if (char === '\'') mode = stack.pop() || 'code';
      continue;
    }
    if (mode === 'doubleQuote') {
      if (char === '\\') {
        index += 1;
        continue;
      }
      if (char === '"') mode = stack.pop() || 'code';
      continue;
    }
    if (mode === 'template') {
      if (char === '\\') {
        index += 1;
        continue;
      }
      if (char === '`') {
        mode = stack.pop() || 'code';
        continue;
      }
    }

    if (mode === 'code') {
      if (char === '/' && next === '/') {
        stack.push(mode);
        mode = 'lineComment';
        index += 1;
        continue;
      }
      if (char === '/' && next === '*') {
        stack.push(mode);
        mode = 'blockComment';
        index += 1;
        continue;
      }
      if (char === '\'') {
        stack.push(mode);
        mode = 'singleQuote';
        continue;
      }
      if (char === '"') {
        stack.push(mode);
        mode = 'doubleQuote';
        continue;
      }
      if (char === '`') {
        stack.push(mode);
        mode = 'template';
        continue;
      }
      if (char === '{') {
        depth += 1;
        continue;
      }
      if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          return html.slice(start, index + 1);
        }
      }
    }
  }

  assert.fail(`unterminated ${signature}`);
}

expectMatch(/id="archiveFilterBar"/, 'archive filter bar hook is missing');
expectMatch(/id="archiveSortControl"/, 'archive sort control hook is missing');
expectMatch(/id="archiveEmptyState"/, 'archive empty state hook is missing');
expectMatch(/function getDefaultArchiveBrowseState\(\)/, 'missing default browse-state helper');
expectMatch(/function readArchiveBrowseStateFromUrl\(\)/, 'missing URL-read helper');
expectMatch(/function writeArchiveBrowseStateToUrl\(state\)/, 'missing URL-write helper');
expectMatch(/function applyArchiveBrowseFilters\(catalog, state\)/, 'missing filter helper');
expectMatch(/function applyArchiveBrowseSort\(catalog, state\)/, 'missing sort helper');
expectMatch(/function resolveVisibleActivePackId\(catalog, preferredPackId\)/, 'missing active-pack resolver');

const script = [
  extractFunctionSource('getDefaultArchiveBrowseState()'),
  extractFunctionSource('normalizeArchiveBrowseState(input)'),
  extractFunctionSource('readArchiveBrowseStateFromUrl()'),
  extractFunctionSource('writeArchiveBrowseStateToUrl(state)'),
  extractFunctionSource('matchesArchiveBrowseFilters(config, state)'),
  extractFunctionSource('applyArchiveBrowseFilters(catalog, state)'),
  extractFunctionSource('compareArchiveCatalogOrder(a, b)'),
  extractFunctionSource('applyArchiveBrowseSort(catalog, state)'),
  extractFunctionSource('resolveVisibleActivePackId(catalog, preferredPackId)')
].join('\n\n');

const sampleCatalog = [
  { packId: 'nba_1987_full_season_v1', era: '1980s', availability: 'playable', significanceTone: 'heritage' },
  { packId: 'nba_1993_full_season_v1', era: '1990s', availability: 'playable', significanceTone: 'dynasty' },
  { packId: 'nba_1996_full_season_v1', era: '1990s', availability: 'playable', significanceTone: 'dynasty' },
  { packId: 'nba_2001_full_season_v1', era: '2000s', availability: 'playable', significanceTone: 'dynasty' },
  { packId: 'nba_2016_full_season_v1', era: '2010s', availability: 'playable', significanceTone: 'modern' },
  { packId: 'nba_preview_future', era: '2000s', availability: 'preview', significanceTone: 'spotlight' }
];

const historyCalls = [];
const context = {
  console,
  URLSearchParams,
  window: {
    location: {
      search: '?sport=nba&era=1990s&availability=playable&significance=dynasty&sort=era'
    },
    history: {
      replaceState(_state, _title, url) {
        historyCalls.push(String(url));
      }
    }
  }
};
vm.createContext(context);
vm.runInContext(script, context);

const defaultState = context.getDefaultArchiveBrowseState();
assert.equal(defaultState.era, 'all');
assert.equal(defaultState.availability, 'all');
assert.equal(defaultState.significance, 'all');
assert.equal(defaultState.sort, 'featured');

const hydrated = context.readArchiveBrowseStateFromUrl();
assert.equal(hydrated.era, '1990s');
assert.equal(hydrated.availability, 'playable');
assert.equal(hydrated.significance, 'dynasty');
assert.equal(hydrated.sort, 'era');

const filtered = context.applyArchiveBrowseFilters(sampleCatalog, hydrated);
assert.deepStrictEqual(
  filtered.map(item => item.packId),
  ['nba_1993_full_season_v1', 'nba_1996_full_season_v1']
);

const eraSorted = context.applyArchiveBrowseSort(sampleCatalog, {
  era: 'all',
  availability: 'all',
  significance: 'all',
  sort: 'era'
});
assert.deepStrictEqual(
  eraSorted.map(item => item.packId),
  [
    'nba_1987_full_season_v1',
    'nba_1993_full_season_v1',
    'nba_1996_full_season_v1',
    'nba_2001_full_season_v1',
    'nba_preview_future',
    'nba_2016_full_season_v1'
  ]
);

const newestPlayable = context.applyArchiveBrowseSort(sampleCatalog, {
  era: 'all',
  availability: 'all',
  significance: 'all',
  sort: 'newest_playable'
});
assert.deepStrictEqual(
  newestPlayable.slice(0, 3).map(item => item.packId),
  ['nba_2016_full_season_v1', 'nba_2001_full_season_v1', 'nba_1996_full_season_v1']
);
assert.equal(newestPlayable[newestPlayable.length - 1].packId, 'nba_preview_future');

assert.equal(
  context.resolveVisibleActivePackId(filtered, 'nba_2001_full_season_v1'),
  'nba_1993_full_season_v1'
);
assert.equal(context.resolveVisibleActivePackId([], 'nba_1993_full_season_v1'), '');

context.writeArchiveBrowseStateToUrl({
  era: '1990s',
  availability: 'playable',
  significance: 'dynasty',
  sort: 'featured'
});
assert.equal(
  historyCalls[0],
  '?sport=nba&era=1990s&availability=playable&significance=dynasty'
);

context.window.location.search = '?sport=nba&era=nope&availability=weird&significance=bad&sort=broken';
const invalid = context.readArchiveBrowseStateFromUrl();
assert.equal(invalid.era, 'all');
assert.equal(invalid.availability, 'all');
assert.equal(invalid.significance, 'all');
assert.equal(invalid.sort, 'featured');

console.log('historic seasons archive browser test passed');
```

- [ ] **Step 2: Run the new harness to verify it fails**

Run:

```powershell
node .\tools\test-historic-seasons-archive-browser.js
```

Expected:

```text
AssertionError [ERR_ASSERTION]: archive filter bar hook is missing
```

- [ ] **Step 3: Commit the failing harness**

Run:

```powershell
git add .\tools\test-historic-seasons-archive-browser.js
git commit -m "test: add archive browsing filter regression"
```

Expected:

```text
The commit succeeds with subject line: test: add archive browsing filter regression
```

### Task 2: Add the archive filter bar, browse-state helpers, and filtered shelf flow

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historic-seasons.html`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historic-seasons-archive-browser.js`

- [ ] **Step 1: Add the filter bar and empty-state markup above the archive browser shell**

Insert this block in `historic-seasons.html` directly between the section copy and the existing `<div class="archive-browser-shell">`:

```html
        <div class="archive-filter-bar" id="archiveFilterBar">
          <div class="archive-filter-groups">
            <div class="archive-filter-group" id="archiveEraFilterGroup" aria-label="Filter by era"></div>
            <div class="archive-filter-group" id="archiveAvailabilityFilterGroup" aria-label="Filter by playability"></div>
            <div class="archive-filter-group" id="archiveSignificanceFilterGroup" aria-label="Filter by significance"></div>
          </div>
          <div class="archive-sort-wrap">
            <label class="archive-sort-label" for="archiveSortControl">Sort</label>
            <select id="archiveSortControl" class="archive-sort-control" aria-label="Sort archive shelf">
              <option value="featured">Featured</option>
              <option value="newest_playable">Newest Playable</option>
              <option value="era">Era</option>
            </select>
          </div>
        </div>

        <div class="archive-empty-state" id="archiveEmptyState" hidden>
          <div class="archive-empty-title">No Packs Match These Filters</div>
          <div class="archive-empty-copy">Try a different era, significance, or playability mix to reopen the shelf.</div>
          <button type="button" class="archive-empty-clear" id="archiveClearFiltersBtn">Clear Filters</button>
        </div>

        <div class="archive-browser-shell">
```

- [ ] **Step 2: Add the minimal CSS for the new controls and empty state**

Add these rules near the existing archive-browser styles:

```css
  .archive-filter-bar{
    display:flex;align-items:flex-start;justify-content:space-between;gap:16px;
    margin-top:18px;padding:14px 16px;border-radius:20px;border:1px solid rgba(255,255,255,.08);
    background:linear-gradient(180deg,rgba(12,19,31,.88),rgba(8,13,23,.96));
  }
  .archive-filter-groups{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start}
  .archive-filter-group{display:flex;flex-wrap:wrap;gap:8px}
  .archive-filter-chip{
    display:inline-flex;align-items:center;justify-content:center;padding:8px 12px;border-radius:999px;
    border:1px solid rgba(255,255,255,.1);background:rgba(8,14,25,.68);color:#dce8fb;
    font:700 10px/1 var(--plex);letter-spacing:.1em;text-transform:uppercase;cursor:pointer;
    transition:border-color .18s ease,transform .18s ease,background .18s ease,color .18s ease;
  }
  .archive-filter-chip:hover{transform:translateY(-1px);border-color:rgba(255,182,109,.22)}
  .archive-filter-chip.active{
    border-color:rgba(255,182,109,.36);
    background:rgba(48,29,12,.72);
    color:#ffe2bb;
    box-shadow:0 0 0 1px rgba(255,182,109,.12);
  }
  .archive-sort-wrap{display:grid;gap:6px;justify-items:end}
  .archive-sort-label{font:700 10px/1 var(--plex);letter-spacing:.14em;text-transform:uppercase;color:#a9bdd8}
  .archive-sort-control{
    min-height:38px;padding:0 12px;border-radius:14px;border:1px solid rgba(255,255,255,.1);
    background:rgba(8,14,25,.78);color:#edf5ff;font:700 12px/1 var(--plex);
  }
  .archive-empty-state{
    margin-top:18px;padding:24px 20px;border-radius:22px;border:1px solid rgba(255,182,109,.16);
    background:linear-gradient(180deg,rgba(15,22,35,.92),rgba(8,13,23,.98));text-align:center;
  }
  .archive-empty-title{font:700 30px/.9 var(--teko);text-transform:uppercase}
  .archive-empty-copy{margin-top:8px;font-size:13px;line-height:1.6;color:#cfdced}
  .archive-empty-clear{
    margin-top:14px;display:inline-flex;align-items:center;justify-content:center;padding:10px 14px;border-radius:999px;
    border:1px solid rgba(255,255,255,.12);background:linear-gradient(180deg,#3f4d64,#202b3f);color:#edf4ff;
    font:700 12px/1 var(--teko);letter-spacing:.06em;text-transform:uppercase;cursor:pointer;
  }
  @media (max-width:1080px){
    .archive-filter-bar{flex-direction:column;align-items:stretch}
    .archive-sort-wrap{justify-items:start}
  }
```

- [ ] **Step 3: Add local browse-state globals and helper functions**

Add these globals near the existing `activeCatalog`, `activePackId`, and `bundleCache` declarations:

```js
  let fullCatalog = [];
  let visibleCatalog = [];
  let activeBrowseState = null;
```

Then insert these helpers below `getConfigById(packId)`:

```js
  function getDefaultArchiveBrowseState(){
    return {
      era: 'all',
      availability: 'all',
      significance: 'all',
      sort: 'featured'
    };
  }

  function normalizeArchiveBrowseState(input){
    const defaults = getDefaultArchiveBrowseState();
    const normalized = Object.assign({}, defaults, input || {});
    const allowedEras = ['all', '1980s', '1990s', '2000s', '2010s'];
    const allowedAvailability = ['all', 'playable', 'preview'];
    const allowedSignificance = ['all', 'dynasty', 'prestige', 'spotlight', 'modern'];
    const allowedSort = ['featured', 'newest_playable', 'era'];

    normalized.era = allowedEras.includes(String(normalized.era || '').trim().toLowerCase())
      ? String(normalized.era).trim().toLowerCase()
      : defaults.era;
    normalized.availability = allowedAvailability.includes(String(normalized.availability || '').trim().toLowerCase())
      ? String(normalized.availability).trim().toLowerCase()
      : defaults.availability;
    normalized.significance = allowedSignificance.includes(String(normalized.significance || '').trim().toLowerCase())
      ? String(normalized.significance).trim().toLowerCase()
      : defaults.significance;
    normalized.sort = allowedSort.includes(String(normalized.sort || '').trim().toLowerCase())
      ? String(normalized.sort).trim().toLowerCase()
      : defaults.sort;
    return normalized;
  }

  function readArchiveBrowseStateFromUrl(){
    try{
      const params = new URLSearchParams(window.location.search);
      return normalizeArchiveBrowseState({
        era: params.get('era') || 'all',
        availability: params.get('availability') || 'all',
        significance: params.get('significance') || 'all',
        sort: params.get('sort') || 'featured'
      });
    }catch(error){
      return getDefaultArchiveBrowseState();
    }
  }

  function writeArchiveBrowseStateToUrl(state){
    const next = normalizeArchiveBrowseState(state);
    const defaults = getDefaultArchiveBrowseState();
    const params = new URLSearchParams(window.location.search);
    params.set('sport', getBrowserSport());
    if(next.era !== defaults.era){ params.set('era', next.era); } else { params.delete('era'); }
    if(next.availability !== defaults.availability){ params.set('availability', next.availability); } else { params.delete('availability'); }
    if(next.significance !== defaults.significance){ params.set('significance', next.significance); } else { params.delete('significance'); }
    if(next.sort !== defaults.sort){ params.set('sort', next.sort); } else { params.delete('sort'); }
    const query = params.toString();
    window.history.replaceState({}, '', query ? ('?' + query) : window.location.pathname);
  }

  function getArchiveSignificanceKey(config){
    const tone = String(config?.significanceTone || '').trim().toLowerCase();
    if(tone === 'heritage'){ return 'prestige'; }
    if(tone === 'dynasty' || tone === 'spotlight' || tone === 'modern'){ return tone; }
    return 'all';
  }

  function matchesArchiveBrowseFilters(config, state){
    const normalized = normalizeArchiveBrowseState(state);
    if(normalized.era !== 'all' && String(config?.era || '').trim().toLowerCase() !== normalized.era){
      return false;
    }
    if(normalized.availability !== 'all' && String(config?.availability || '').trim().toLowerCase() !== normalized.availability){
      return false;
    }
    if(normalized.significance !== 'all' && getArchiveSignificanceKey(config) !== normalized.significance){
      return false;
    }
    return true;
  }

  function applyArchiveBrowseFilters(catalog, state){
    return (Array.isArray(catalog) ? catalog : []).filter(function(config){
      return matchesArchiveBrowseFilters(config, state);
    });
  }

  function compareArchiveCatalogOrder(a, b){
    return Number(a?.__catalogIndex || 0) - Number(b?.__catalogIndex || 0);
  }

  function applyArchiveBrowseSort(catalog, state){
    const normalized = normalizeArchiveBrowseState(state);
    const items = Array.isArray(catalog) ? catalog.slice() : [];
    if(normalized.sort === 'era'){
      const eraOrder = { '1980s': 0, '1990s': 1, '2000s': 2, '2010s': 3 };
      return items.sort(function(a, b){
        const eraDelta = (eraOrder[String(a?.era || '')] ?? 99) - (eraOrder[String(b?.era || '')] ?? 99);
        return eraDelta || compareArchiveCatalogOrder(a, b);
      });
    }
    if(normalized.sort === 'newest_playable'){
      return items.sort(function(a, b){
        const aPlayable = String(a?.availability || '').trim().toLowerCase() === 'playable' ? 1 : 0;
        const bPlayable = String(b?.availability || '').trim().toLowerCase() === 'playable' ? 1 : 0;
        return (bPlayable - aPlayable) || (Number(b?.__catalogIndex || 0) - Number(a?.__catalogIndex || 0));
      });
    }
    return items.sort(function(a, b){
      const aPlayable = String(a?.availability || '').trim().toLowerCase() === 'playable' ? 1 : 0;
      const bPlayable = String(b?.availability || '').trim().toLowerCase() === 'playable' ? 1 : 0;
      return (bPlayable - aPlayable) || compareArchiveCatalogOrder(a, b);
    });
  }

  function resolveVisibleActivePackId(catalog, preferredPackId){
    const items = Array.isArray(catalog) ? catalog : [];
    if(!items.length) return '';
    const preferred = String(preferredPackId || '').trim();
    if(preferred && items.some(function(entry){ return String(entry?.packId || '').trim() === preferred; })){
      return preferred;
    }
    return String(items[0]?.packId || '').trim();
  }
```

- [ ] **Step 4: Add control rendering and state-application helpers**

Insert these helpers above `renderShelf()`:

```js
  function renderArchiveFilterGroup(targetId, label, options, activeValue, onSelect){
    const group = document.getElementById(targetId);
    if(!group) return;
    group.innerHTML = [
      '<span class="archive-sort-label">' + escapeHtml(label) + '</span>',
      options.map(function(option){
        const value = String(option.value);
        const activeClass = value === activeValue ? ' active' : '';
        return '<button type="button" class="archive-filter-chip' + activeClass + '" data-filter-value="' + escapeHtml(value) + '">' + escapeHtml(option.label) + '</button>';
      }).join('')
    ].join('');
    group.querySelectorAll('[data-filter-value]').forEach(function(button){
      button.addEventListener('click', function(){
        onSelect(String(button.getAttribute('data-filter-value') || '').trim());
      });
    });
  }

  function renderArchiveControls(){
    const state = activeBrowseState || getDefaultArchiveBrowseState();
    renderArchiveFilterGroup('archiveEraFilterGroup', 'Era', [
      { value: 'all', label: 'All' },
      { value: '1980s', label: '1980s' },
      { value: '1990s', label: '1990s' },
      { value: '2000s', label: '2000s' },
      { value: '2010s', label: '2010s' }
    ], state.era, function(value){
      updateArchiveBrowseState({ era: value });
    });
    renderArchiveFilterGroup('archiveAvailabilityFilterGroup', 'Playability', [
      { value: 'all', label: 'All' },
      { value: 'playable', label: 'Playable Now' },
      { value: 'preview', label: 'Preview' }
    ], state.availability, function(value){
      updateArchiveBrowseState({ availability: value });
    });
    renderArchiveFilterGroup('archiveSignificanceFilterGroup', 'Significance', [
      { value: 'all', label: 'All' },
      { value: 'dynasty', label: 'Dynasty' },
      { value: 'prestige', label: 'Prestige' },
      { value: 'spotlight', label: 'Spotlight' },
      { value: 'modern', label: 'Modern' }
    ], state.significance, function(value){
      updateArchiveBrowseState({ significance: value });
    });

    const sortControl = document.getElementById('archiveSortControl');
    if(sortControl){
      sortControl.value = state.sort;
      sortControl.onchange = function(){
        updateArchiveBrowseState({ sort: String(sortControl.value || 'featured').trim() });
      };
    }

    const clearButton = document.getElementById('archiveClearFiltersBtn');
    if(clearButton){
      clearButton.onclick = function(){
        updateArchiveBrowseState(getDefaultArchiveBrowseState());
      };
    }
  }

  function computeVisibleCatalog(catalog, state){
    return applyArchiveBrowseSort(applyArchiveBrowseFilters(catalog, state), state);
  }

  function syncArchiveEmptyState(){
    const emptyState = document.getElementById('archiveEmptyState');
    const browserShell = document.querySelector('.archive-browser-shell');
    if(!emptyState || !browserShell) return;
    const hasItems = Array.isArray(visibleCatalog) && visibleCatalog.length > 0;
    emptyState.hidden = hasItems;
    browserShell.hidden = !hasItems;
  }

  async function updateArchiveBrowseState(patch){
    activeBrowseState = normalizeArchiveBrowseState(Object.assign({}, activeBrowseState || getDefaultArchiveBrowseState(), patch || {}));
    writeArchiveBrowseStateToUrl(activeBrowseState);
    visibleCatalog = computeVisibleCatalog(fullCatalog, activeBrowseState);
    renderArchiveControls();
    syncArchiveEmptyState();
    if(!visibleCatalog.length){
      activePackId = '';
      document.getElementById('heroPackCount').textContent = '0';
      setStatus('No historical packs match the current archive filters.', 'warn');
      return;
    }
    const nextPackId = resolveVisibleActivePackId(visibleCatalog, activePackId);
    if(nextPackId === activePackId){
      renderShelf();
      const config = getConfigById(activePackId);
      if(config){
        const bundle = await loadBundleForConfig(config).catch(function(){ return null; });
        renderPack(config, bundle);
      }
      return;
    }
    await setActivePack(nextPackId);
  }
```

- [ ] **Step 5: Rewire `getConfigById`, `renderShelf`, and `boot` to use the visible catalog**

Update these existing functions exactly as follows:

```js
  function getConfigById(packId){
    return (Array.isArray(fullCatalog) ? fullCatalog : []).find(function(entry){
      return String(entry.packId || '') === String(packId || '');
    }) || null;
  }
```

```js
  function renderShelf(){
    const shelf = document.getElementById('archiveShelf');
    const items = Array.isArray(visibleCatalog) ? visibleCatalog : [];
    shelf.innerHTML = items.map(function(config){
      const isActive = String(config.packId) === String(activePackId);
      const previewClass = config.availability === 'playable' ? '' : ' preview';
      const activeClass = isActive ? ' active' : '';
      const stars = Array.isArray(config.previewStars) ? config.previewStars.slice(0, 3) : [];
      const plannedModes = Array.isArray(config.plannedModes) ? config.plannedModes.slice(0, 3) : [];
      const significanceTone = String(config.significanceTone || 'default').trim().toLowerCase() || 'default';
      const significance = config.significanceLabel
        ? '<div class="archive-significance ' + significanceTone + '">' + config.significanceLabel + '</div>'
        : '';
      const completeness = config.completenessLabel
        ? '<span class="archive-meta-pill completeness">' + config.completenessLabel + (config.completenessPercent != null ? ' - ' + config.completenessPercent + '%' : '') + '</span>'
        : '';
      const meta = [
        '<span class="archive-meta-pill">Full-Era Player Pool</span>',
        config.availability === 'playable' ? '<span class="archive-meta-pill">Real Pack</span>' : '<span class="archive-meta-pill">Preview Only</span>',
        completeness
      ].filter(Boolean).join('');
      return [
        '<button class="archive-card' + previewClass + activeClass + '" type="button" data-pack-id="' + config.packId + '">',
        '<div class="archive-card-head">',
        '<div class="archive-card-era">' + (config.era || 'Historic Era') + '</div>',
        '<div class="archive-card-status">' + (config.statusLabel || (config.availability === 'playable' ? 'Playable' : 'Preview')) + '</div>',
        '</div>',
        '<div class="archive-card-title">' + (config.shortLabel || config.seasonLabel || config.packId) + '</div>',
        '<div class="archive-card-tagline">' + (config.tagline || 'Historic season archive.') + '</div>',
        renderCatalogArt(config, 'card'),
        significance,
        '<div class="archive-card-summary">' + (config.summary || 'Historical season preview.') + '</div>',
        config.whyItMatters ? '<div class="archive-card-why"><strong>Why this matters:</strong> ' + config.whyItMatters + '</div>' : '',
        meta ? '<div class="archive-card-meta">' + meta + '</div>' : '',
        plannedModes.length ? '<div class="archive-card-meta">' + plannedModes.map(function(mode){ return '<span class="archive-meta-pill">' + mode + '</span>'; }).join('') + '</div>' : '',
        stars.length ? '<div class="archive-card-meta">' + stars.map(function(name){ return '<span class="archive-meta-pill">' + name + '</span>'; }).join('') + '</div>' : '',
        '</button>'
      ].join('');
    }).join('');

    shelf.querySelectorAll('[data-pack-id]').forEach(function(button){
      button.addEventListener('click', function(){
        const packId = String(button.getAttribute('data-pack-id') || '').trim();
        if(packId) setActivePack(packId);
      });
    });
  }
```

```js
  async function boot(){
    const browserSport = getBrowserSport();
    let catalog = [];
    try{
      if(window.RosterBateHistoricalPackLoader && typeof window.RosterBateHistoricalPackLoader.loadCatalog === 'function'){
        catalog = await window.RosterBateHistoricalPackLoader.loadCatalog();
      }
    }catch(error){
      console.warn('[Historic Seasons] Falling back to embedded catalog', error);
    }
    if(!Array.isArray(catalog) || !catalog.length){
      catalog = buildFallbackCatalog();
    }
    fullCatalog = catalog
      .filter(function(entry){
        return String(entry.sport || browserSport).toLowerCase() === browserSport;
      })
      .map(function(entry, index){
        return Object.assign({ __catalogIndex: index }, entry);
      });
    if(!fullCatalog.length){
      fullCatalog = buildFallbackCatalog()
        .filter(function(entry){
          return String(entry.sport || 'nba').toLowerCase() === browserSport;
        })
        .map(function(entry, index){
          return Object.assign({ __catalogIndex: index }, entry);
        });
    }
    if(!fullCatalog.length){
      setStatus('No historical packs are cataloged for this sport yet.', 'warn');
      renderSavedUniverses();
      return;
    }
    activeBrowseState = readArchiveBrowseStateFromUrl();
    visibleCatalog = computeVisibleCatalog(fullCatalog, activeBrowseState);
    renderArchiveControls();
    syncArchiveEmptyState();
    if(!visibleCatalog.length){
      setStatus('No historical packs match the current archive filters.', 'warn');
      renderSavedUniverses();
      return;
    }
    const firstVisible = resolveVisibleActivePackId(
      visibleCatalog,
      (visibleCatalog.find(function(entry){ return entry.availability === 'playable'; }) || visibleCatalog[0]).packId
    );
    await setActivePack(firstVisible);
  }
```

- [ ] **Step 6: Update `setActivePack` and `renderPack` to respect the filtered shelf**

Patch `setActivePack` and the pack-count line in `renderPack`:

```js
  async function setActivePack(packId){
    const config = getConfigById(packId);
    if(!config) return;
    activePackId = config.packId;
    renderShelf();
    syncArchiveEmptyState();
    try{
      const bundle = await loadBundleForConfig(config);
      renderPack(config, bundle);
    }catch(error){
      console.error('[Historic Seasons] Failed to load active pack', error);
      renderPack(config, null);
      setStatus('Could not load pack "' + config.packId + '": ' + (error && error.message ? error.message : String(error)), 'warn');
    }
  }
```

```js
    document.getElementById('heroPackCount').textContent = String((visibleCatalog && visibleCatalog.length) || 0);
```

- [ ] **Step 7: Run the new archive-browser regression and verify it passes**

Run:

```powershell
node .\tools\test-historic-seasons-archive-browser.js
```

Expected:

```text
historic seasons archive browser test passed
```

- [ ] **Step 8: Commit the browse-state implementation**

Run:

```powershell
git add .\historic-seasons.html .\tools\test-historic-seasons-archive-browser.js
git commit -m "feat: add archive browsing filters"
```

Expected:

```text
The commit succeeds with subject line: feat: add archive browsing filters
```

### Task 3: Finish polish and verify the historical shelf still behaves cleanly

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historic-seasons.html`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historic-seasons-archive-browser.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-preset-1987.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-preset-1993.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-preset-2001.js`

- [ ] **Step 1: Tighten the empty-state and control-state status messaging**

Update the empty-state/status behavior so the page stays readable in edge cases:

```js
    if(!visibleCatalog.length){
      activePackId = '';
      document.getElementById('heroPackTitle').textContent = 'Historic Archive';
      document.getElementById('heroPackSummary').textContent = 'Adjust the filters to bring historical packs back onto the shelf.';
      document.getElementById('heroPackCount').textContent = '0';
      setStatus('No historical packs match the current archive filters.', 'warn');
      return;
    }
```

And after a successful `setActivePack(...)`, keep the success message shelf-aware:

```js
    setStatus(
      (config.availability === 'playable'
        ? 'Historical browser loaded with archive filters active. Pick a slot and launch directly into a drafted or simulated universe.'
        : 'Archive shelf loaded with preview packs filtered into view.'),
      (config.availability === 'playable') ? 'good' : 'warn'
    );
```

- [ ] **Step 2: Run the focused historical shelf regressions**

Run:

```powershell
node .\tools\test-historic-seasons-archive-browser.js
node .\tools\test-historical-preset-1987.js
node .\tools\test-historical-preset-1993.js
node .\tools\test-historical-preset-2001.js
```

Expected:

```text
historic seasons archive browser test passed
historical 1986-87 preset test passed
historical 1992-93 preset test passed
historical 2000-01 preset test passed
```

- [ ] **Step 3: Do one manual browser sanity pass**

Open:

```text
C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historic-seasons.html?sport=nba
```

Manually confirm:
- the horizontal chip bar appears above the archive shelf
- selecting `1990s + Playable Now + Dynasty` narrows the shelf to the two 1990s dynasty packs
- refreshing keeps the active filters
- clearing filters restores the full shelf
- the pack detail panel always follows the selected visible pack

Expected:

```text
The page still reads like a premium archive shelf instead of a dense admin filter panel.
```

- [ ] **Step 4: Commit the final archive-browsing polish**

Run:

```powershell
git add .\historic-seasons.html
git commit -m "fix: polish archive browsing states"
```

Expected:

```text
The commit succeeds with subject line: fix: polish archive browsing states
```

### Task 4: Final verification and branch handoff

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historic-seasons.html`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historic-seasons-archive-browser.js`

- [ ] **Step 1: Run the full planned verification sweep**

Run:

```powershell
node .\tools\test-historic-seasons-archive-browser.js
node .\tools\test-historical-preset-1987.js
node .\tools\test-historical-preset-1993.js
node .\tools\test-historical-preset-2001.js
```

Expected:

```text
All four commands pass with no assertion failures.
```

- [ ] **Step 2: Confirm the branch/worktree state is clean**

Run:

```powershell
git status --short
git rev-parse --abbrev-ref HEAD
git rev-parse --short HEAD
```

Expected:

```text
No modified or untracked files remain, and the branch points at the final archive-browsing commit.
```

- [ ] **Step 3: Prepare the finish summary**

Capture these exact delivery points for the finish message:

```text
- new archive filter/sort shelf controls live in historic-seasons.html
- URL-persisted browse state is active
- one-active-chip-per-category behavior is enforced
- empty-state + clear-filters behavior is shipped
- focused archive browser regression is green
- historical preset shelf regressions remain green
```

- [ ] **Step 4: Commit any final documentation-free cleanup if needed**

If the working tree is not clean because of a last tiny implementation adjustment, finish with:

```powershell
git add .\historic-seasons.html .\tools\test-historic-seasons-archive-browser.js
git commit -m "chore: finalize archive browsing filter pass"
```

Expected:

```text
Only use this step if a final tiny cleanup was needed after the verification sweep.
```
