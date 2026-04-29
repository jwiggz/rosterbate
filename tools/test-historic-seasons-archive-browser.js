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
expectMatch(/function getArchiveSeasonRecencyValue\(config\)/, 'missing season recency helper');
expectMatch(/activePackRenderToken/, 'missing active-pack render token guard');
expectMatch(/No Packs Match These Filters/, 'missing zero-results title copy');
expectMatch(/Adjust the filters to bring archive packs back onto the shelf\./, 'missing zero-results hero summary copy');
expectMatch(/Simulation archive browser loaded with archive filters active\. Pick a slot and launch directly into a drafted universe or simulation league\./, 'missing playable shelf-aware status copy');
expectMatch(/Archive shelf loaded with preview packs filtered into view\./, 'missing preview shelf-aware status copy');

const script = [
  extractFunctionSource('getDefaultArchiveBrowseState()'),
  extractFunctionSource('normalizeArchiveBrowseState(input)'),
  extractFunctionSource('readArchiveBrowseStateFromUrl()'),
  extractFunctionSource('writeArchiveBrowseStateToUrl(state)'),
  extractFunctionSource('matchesArchiveBrowseFilters(config, state)'),
  extractFunctionSource('applyArchiveBrowseFilters(catalog, state)'),
  extractFunctionSource('compareArchiveCatalogOrder(a, b)'),
  extractFunctionSource('getArchiveSeasonRecencyValue(config)'),
  extractFunctionSource('applyArchiveBrowseSort(catalog, state)'),
  extractFunctionSource('resolveVisibleActivePackId(catalog, preferredPackId)')
].join('\n\n');

const sampleCatalog = [
  { packId: 'nba_2016_full_season_v1', era: '2010s', availability: 'playable', significanceTone: 'modern', __catalogIndex: 0 },
  { packId: 'nba_1987_full_season_v1', era: '1980s', availability: 'playable', significanceTone: 'heritage', __catalogIndex: 1 },
  { packId: 'nba_preview_future', era: '2000s', availability: 'preview', significanceTone: 'spotlight', __catalogIndex: 2 },
  { packId: 'nba_2001_full_season_v1', era: '2000s', availability: 'playable', significanceTone: 'dynasty', __catalogIndex: 3 },
  { packId: 'nba_1993_full_season_v1', era: '1990s', availability: 'playable', significanceTone: 'dynasty', __catalogIndex: 4 },
  { packId: 'nba_1996_full_season_v1', era: '1990s', availability: 'playable', significanceTone: 'dynasty', __catalogIndex: 5 }
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
    'nba_preview_future',
    'nba_2001_full_season_v1',
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
  newestPlayable.map(item => item.packId),
  [
    'nba_2016_full_season_v1',
    'nba_2001_full_season_v1',
    'nba_1996_full_season_v1',
    'nba_1993_full_season_v1',
    'nba_1987_full_season_v1',
    'nba_preview_future'
  ]
);

assert.equal(
  context.resolveVisibleActivePackId(filtered, 'nba_2001_full_season_v1'),
  'nba_1993_full_season_v1'
);
assert.equal(
  context.resolveVisibleActivePackId([
    { packId: 'nba_preview_filtered_in', availability: 'preview' },
    { packId: 'nba_2001_full_season_v1', availability: 'playable' },
    { packId: 'nba_1996_full_season_v1', availability: 'playable' }
  ], 'nba_2016_full_season_v1'),
  'nba_2001_full_season_v1'
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
