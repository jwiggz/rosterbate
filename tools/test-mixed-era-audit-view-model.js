const assert = require('assert');
const runtime = require('../mixed-era-runtime.js');

const viewModel = runtime.buildMixedEraAuditViewModel({
  config: {
    seasonLabel: '1995-96 + 2015-16 Mixed Era Draft',
    topPlayersPerPack: 2
  },
  playerPool: [
    {
      name: 'Michael Jordan',
      historicalPackId: 'nba_1996_full_season_v1',
      mixedEraOverall: 99.8,
      fp: 74.2,
      totalFantasyPoints: 6171.5,
      gp: 82
    },
    {
      name: 'Stephen Curry',
      historicalPackId: 'nba_2016_full_season_v1',
      mixedEraOverall: 98.7,
      fp: 72.4,
      totalFantasyPoints: 5742.1,
      gp: 79
    },
    {
      name: 'Scottie Pippen',
      historicalPackId: 'nba_1996_full_season_v1',
      mixedEraOverall: 94.1,
      fp: 61.8,
      totalFantasyPoints: 5033.7,
      gp: 77
    },
    {
      name: 'LeBron James',
      historicalPackId: 'nba_2016_full_season_v1',
      mixedEraOverall: 93.9,
      fp: 61.4,
      totalFantasyPoints: 4970.2,
      gp: 76
    }
  ]
});

assert.strictEqual(viewModel.top10Composition['nba_1996_full_season_v1'], 2);
assert.strictEqual(viewModel.top10Composition['nba_2016_full_season_v1'], 2);
assert.strictEqual(Array.isArray(viewModel.rows), true);
assert.strictEqual(viewModel.rows[0].rank, 1);
assert.strictEqual(viewModel.warning, '');

console.log('mixed-era audit view-model test passed');
