const assert = require('assert');
const runtime = require('../mixed-era-runtime.js');

function getCheck(viewModel, id) {
  return (viewModel.compositionChecks || []).find((check) => check && check.id === id);
}

const calibrationFixture = require('../historical-packs/mixed-era/audit-calibration/1996-2016-top300.2k.json');

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

const unexpectedSourceViewModel = runtime.buildMixedEraAuditViewModel({
  config: {
    seasonLabel: 'A + B Authored Mixed Era Draft',
    sourcePackIds: ['A', 'B'],
    topPlayersPerPack: 2
  },
  playerPool: [
    {
      name: 'Player A1',
      historicalPackId: 'A',
      mixedEraOverall: 99.8,
      fp: 74.2,
      totalFantasyPoints: 6171.5,
      gp: 82
    },
    {
      name: 'Player A2',
      historicalPackId: 'A',
      mixedEraOverall: 98.7,
      fp: 72.4,
      totalFantasyPoints: 5742.1,
      gp: 79
    },
    {
      name: 'Player B1',
      historicalPackId: 'B',
      mixedEraOverall: 94.1,
      fp: 61.8,
      totalFantasyPoints: 5033.7,
      gp: 77
    },
    {
      name: 'Player B2',
      historicalPackId: 'B',
      mixedEraOverall: 93.9,
      fp: 61.4,
      totalFantasyPoints: 4970.2,
      gp: 76
    },
    {
      name: 'Player C1',
      historicalPackId: 'C',
      mixedEraOverall: 91.2,
      fp: 58.7,
      totalFantasyPoints: 4696.0,
      gp: 80
    },
    {
      name: 'Player C2',
      historicalPackId: 'C',
      mixedEraOverall: 90.1,
      fp: 57.3,
      totalFantasyPoints: 4526.7,
      gp: 79
    }
  ]
});

assert.strictEqual(getCheck(unexpectedSourceViewModel, 'top10').verdict, 'pass');
assert.deepStrictEqual(unexpectedSourceViewModel.fullPoolComposition, {
  A: 2,
  B: 2,
  C: 2
});
assert.strictEqual(getCheck(unexpectedSourceViewModel, 'fullPool').verdict, 'fail');
assert.match(unexpectedSourceViewModel.warning, /Full Pool composition check failed/i);

const calibratedViewModel = runtime.buildMixedEraAuditViewModel({
  config: {
    packId: calibrationFixture.packId,
    seasonLabel: calibrationFixture.seasonLabel,
    sourcePackIds: calibrationFixture.sourcePackIds
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
      name: 'LeBron James',
      historicalPackId: 'nba_2016_full_season_v1',
      mixedEraOverall: 99.3,
      fp: 73.8,
      totalFantasyPoints: 6062.3,
      gp: 82
    },
    {
      name: 'Stephen Curry',
      historicalPackId: 'nba_2016_full_season_v1',
      mixedEraOverall: 98.8,
      fp: 72.4,
      totalFantasyPoints: 5742.1,
      gp: 79
    },
    {
      name: 'Kawhi Leonard',
      historicalPackId: 'nba_2016_full_season_v1',
      mixedEraOverall: 97.9,
      fp: 69.2,
      totalFantasyPoints: 5608.8,
      gp: 81
    },
    {
      name: 'Scottie Pippen',
      historicalPackId: 'nba_1996_full_season_v1',
      mixedEraOverall: 96.7,
      fp: 65.1,
      totalFantasyPoints: 5302.0,
      gp: 81
    },
    {
      name: 'Hakeem Olajuwon',
      historicalPackId: 'nba_1996_full_season_v1',
      mixedEraOverall: 95.9,
      fp: 64.4,
      totalFantasyPoints: 5280.0,
      gp: 82
    },
    {
      name: 'Gary Payton',
      historicalPackId: 'nba_1996_full_season_v1',
      mixedEraOverall: 95.1,
      fp: 62.7,
      totalFantasyPoints: 5141.4,
      gp: 82
    },
    {
      name: 'Klay Thompson',
      historicalPackId: 'nba_2016_full_season_v1',
      mixedEraOverall: 94.8,
      fp: 61.8,
      totalFantasyPoints: 4838.4,
      gp: 78
    },
    {
      name: 'Dennis Rodman',
      historicalPackId: 'nba_1996_full_season_v1',
      mixedEraOverall: 93.7,
      fp: 61.1,
      totalFantasyPoints: 4990.2,
      gp: 82
    },
    {
      name: 'Shawn Kemp',
      historicalPackId: 'nba_1996_full_season_v1',
      mixedEraOverall: 92.4,
      fp: 60.2,
      totalFantasyPoints: 4936.4,
      gp: 82
    },
    {
      name: 'Draymond Green',
      historicalPackId: 'nba_2016_full_season_v1',
      mixedEraOverall: 91.8,
      fp: 59.5,
      totalFantasyPoints: 4425.0,
      gp: 74
    },
    {
      name: 'Charles Barkley',
      historicalPackId: 'nba_1996_full_season_v1',
      mixedEraOverall: 90.5,
      fp: 58.8,
      totalFantasyPoints: 4811.0,
      gp: 82
    }
  ]
});

const mjRow = calibratedViewModel.rows.find((row) => row.player === 'Michael Jordan');
const pippenRow = calibratedViewModel.rows.find((row) => row.player === 'Scottie Pippen');
const hakeemRow = calibratedViewModel.rows.find((row) => row.player === 'Hakeem Olajuwon');
const barkleyRow = calibratedViewModel.rows.find((row) => row.player === 'Charles Barkley');

assert.ok(mjRow.calibration);
assert.strictEqual(mjRow.calibration.name, 'Michael Jordan');
assert.strictEqual(mjRow.calibration['2kOverall'], 99.5);
assert.strictEqual(mjRow.calibrationRank, 2);
assert.strictEqual(mjRow.calibrationRankDelta, -1);
assert.strictEqual(mjRow.calibrationMismatch, 'aligned');
assert.strictEqual(pippenRow.calibrationMismatch, 'strong_disagreement');
assert.strictEqual(hakeemRow.calibrationMismatch, 'review');
assert.strictEqual(barkleyRow.calibration, null);
assert.strictEqual(barkleyRow.calibrationRank, null);
assert.strictEqual(barkleyRow.calibrationRankDelta, null);
assert.strictEqual(barkleyRow.calibrationMismatch, null);
assert.deepStrictEqual(calibratedViewModel.calibrationSummary.counts, {
  total: 12,
  calibrated: 11,
  uncalibrated: 1,
  aligned: 9,
  review: 1,
  strong_disagreement: 1
});
assert.strictEqual(calibratedViewModel.calibrationSummary.topOverRanked[0].player, 'Scottie Pippen');
assert.strictEqual(calibratedViewModel.calibrationSummary.topOverRanked[0].calibrationRankDelta, -6);
assert.strictEqual(calibratedViewModel.calibrationSummary.topUnderRanked[0].player, 'Hakeem Olajuwon');
assert.strictEqual(calibratedViewModel.calibrationSummary.topUnderRanked[0].calibrationRankDelta, 3);

console.log('mixed-era audit view-model test passed');
