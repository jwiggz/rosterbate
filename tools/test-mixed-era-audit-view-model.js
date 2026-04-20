const assert = require('assert');
const runtime = require('../mixed-era-runtime.js');

function getCheck(viewModel, id) {
  return (viewModel.compositionChecks || []).find((check) => check && check.id === id);
}

const balancedViewModel = runtime.buildMixedEraAuditViewModel({
  config: {
    seasonLabel: '1995-96 + 2015-16 Mixed Era Draft',
    sourcePackIds: ['nba_1996_full_season_v1', 'nba_2016_full_season_v1'],
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

assert.ok(Array.isArray(balancedViewModel.compositionChecks));
assert.strictEqual(getCheck(balancedViewModel, 'top10').verdict, 'pass');
assert.strictEqual(getCheck(balancedViewModel, 'top25').verdict, 'pass');
assert.strictEqual(getCheck(balancedViewModel, 'top50').verdict, 'pass');
assert.strictEqual(getCheck(balancedViewModel, 'top100').verdict, 'pass');
assert.strictEqual(getCheck(balancedViewModel, 'fullPool').verdict, 'pass');

assert.deepStrictEqual(balancedViewModel.top10Composition, {
  nba_1996_full_season_v1: 2,
  nba_2016_full_season_v1: 2
});
assert.deepStrictEqual(balancedViewModel.top25Composition, {
  nba_1996_full_season_v1: 2,
  nba_2016_full_season_v1: 2
});
assert.deepStrictEqual(balancedViewModel.top50Composition, {
  nba_1996_full_season_v1: 2,
  nba_2016_full_season_v1: 2
});
assert.deepStrictEqual(balancedViewModel.top100Composition, {
  nba_1996_full_season_v1: 2,
  nba_2016_full_season_v1: 2
});
assert.deepStrictEqual(balancedViewModel.fullPoolComposition, {
  nba_1996_full_season_v1: 2,
  nba_2016_full_season_v1: 2
});

assert.strictEqual(balancedViewModel.tierBands[0].label, '1-10');
assert.strictEqual(balancedViewModel.tierBands[4].label, '101-150');
assert.strictEqual(balancedViewModel.rows[0].rank, 1);
assert.strictEqual(balancedViewModel.rows[0].rawFp, 75.3);
assert.strictEqual(balancedViewModel.warning, '');

const imbalancedViewModel = runtime.buildMixedEraAuditViewModel({
  config: {
    seasonLabel: '1995-96 Mixed Era Draft',
    sourcePackIds: ['nba_1996_full_season_v1', 'nba_2016_full_season_v1']
  },
  playerPool: [
    {
      name: 'Shaquille O\'Neal',
      historicalPackId: 'nba_1996_full_season_v1',
      mixedEraOverall: 99.5,
      fp: 74.1,
      totalFantasyPoints: 6072.8,
      gp: 82
    },
    {
      name: 'Karl Malone',
      historicalPackId: 'nba_1996_full_season_v1',
      mixedEraOverall: 98.8,
      fp: 72.2,
      totalFantasyPoints: 5920.6,
      gp: 82
    },
    {
      name: 'Anfernee Hardaway',
      historicalPackId: 'nba_1996_full_season_v1',
      mixedEraOverall: 97.6,
      fp: 68.4,
      totalFantasyPoints: 5444.3,
      gp: 78
    },
    {
      name: 'Scottie Pippen',
      historicalPackId: 'nba_1996_full_season_v1',
      mixedEraOverall: 95.2,
      fp: 63.5,
      totalFantasyPoints: 5153.9,
      gp: 81
    }
  ]
});

assert.strictEqual(getCheck(imbalancedViewModel, 'top10').verdict, 'fail');
assert.match(imbalancedViewModel.warning, /Top 10 composition check failed/i);

const unconfiguredViewModel = runtime.buildMixedEraAuditViewModel({
  config: {
    seasonLabel: '1995-96 + 2015-16 Mixed Era Draft',
    sourcePackIds: ['nba_1996_full_season_v1', 'nba_2016_full_season_v1']
  },
  playerPool: balancedViewModel.rows.map((row, index) => ({
    name: index === 0 ? 'Michael Jordan' : index === 1 ? 'Stephen Curry' : index === 2 ? 'Scottie Pippen' : 'LeBron James',
    historicalPackId: index % 2 === 0 ? 'nba_1996_full_season_v1' : 'nba_2016_full_season_v1',
    mixedEraOverall: 99 - index,
    fp: 70 - index,
    totalFantasyPoints: 6000 - index * 100,
    gp: 80 - index
  }))
});

assert.strictEqual(unconfiguredViewModel.topPlayersPerPack, null);
assert.strictEqual(getCheck(unconfiguredViewModel, 'fullPool').verdict, 'pass');
assert.strictEqual(unconfiguredViewModel.warning, '');

console.log('mixed-era audit view-model test passed');
