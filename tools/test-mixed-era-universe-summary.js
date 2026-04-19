const assert = require('assert');
const runtime = require('../mixed-era-runtime.js');

const summary = runtime.buildMixedEraUniverseSummary({
  mixedEraConfig: {
    seasonLabel: '1995-96 + 2015-16 Mixed Era Draft',
    topPlayersPerPack: 50,
    sourcePackIds: ['nba_1996_full_season_v1', 'nba_2016_full_season_v1']
  },
  mixedEraSourceSeasonLabels: [
    '1995-96 NBA Historic Season',
    '2015-16 NBA Historic Season'
  ]
});

assert.strictEqual(
  summary.explainer,
  'Curated crossover universe built from 1995-96 NBA Historic Season and 2015-16 NBA Historic Season.'
);
assert.strictEqual(summary.poolRuleLabel, 'Top 50 players from each era');
assert.strictEqual(summary.sourceEraLabels.length, 2);
assert.match(summary.trustNote, /era-normalized crossover board/i);

console.log('mixed-era universe summary test passed');
