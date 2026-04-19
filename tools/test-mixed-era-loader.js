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
    mixedEraConfigId: 'override-me',
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
  assert.equal(config.mixedEraConfigId, '1996-2016-top100');

  const catalog = await loader.loadCatalog();
  assert.equal(catalog.some(entry => entry.packId === 'mixed_era_1996_2016_top100_v1'), true);
  assert.equal(catalog.filter(entry => entry.packId === 'mixed_era_1996_2016_top100_v1').length, 1);
  assert.equal(catalog.find(entry => entry.packId === 'mixed_era_1996_2016_top100_v1').mixedEraConfigId, '1996-2016-top100');

  const originalFetch = global.fetch;
  const originalWarn = console.warn;
  const warnings = [];

  console.warn = function captureWarn() {
    warnings.push(Array.from(arguments));
  };
  global.fetch = async function failingFetch(url) {
    const normalized = String(url).replace(/^.*historical-packs/, 'historical-packs');
    if (normalized === 'historical-packs/catalog.json') {
      return {
        ok: true,
        status: 200,
        json: async () => JSON.parse(JSON.stringify(responses.get('historical-packs/catalog.json')))
      };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  };

  try {
    await assert.rejects(
      loader.loadCatalog(),
      error => String(error && error.message || error).startsWith('fetch_failed:404:')
    );
    assert.equal(warnings.some(args => String(args[0]).includes('Could not load mixed-era configs')), true);
  } finally {
    console.warn = originalWarn;
    global.fetch = originalFetch;
  }

  console.log('mixed-era loader smoke test passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});
