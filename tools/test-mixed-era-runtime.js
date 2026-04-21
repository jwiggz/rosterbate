const assert = require('assert');

const {
  buildMixedEraDraftContextFromBundles,
  normalizeMixedEraIdentityText,
  buildMixedEraIdentityKey,
  dedupeMixedEraPlayers
} = require('../mixed-era-runtime.js');

assert.strictEqual(typeof buildMixedEraDraftContextFromBundles, 'function');
assert.strictEqual(typeof normalizeMixedEraIdentityText, 'function');
assert.strictEqual(typeof buildMixedEraIdentityKey, 'function');
assert.strictEqual(typeof dedupeMixedEraPlayers, 'function');

const config = {
  mixedEraConfigId: '1996-2016-top100',
  packId: 'mixed_era_1996_2016_top100_v1',
  sport: 'nba',
  seasonLabel: '1995-96 + 2015-16 Mixed Era Draft',
  shortLabel: '95-96 x 15-16',
  syntheticType: 'mixed_era',
  sourcePackIds: ['nba_1996_full_season_v1', 'nba_2016_full_season_v1'],
  topPlayersPerPack: 2,
  summary: 'Test mixed era config'
};

const bundles = [
  {
    manifest: { packId: 'nba_1996_full_season_v1', seasonLabel: '1995-96 NBA' },
    season: { seasonId: 'nba_1996_historic', seasonLabel: '1995-96 NBA', sport: 'nba' },
    teams: [
      { teamId: 'nba_1996_chi', abbreviation: 'CHI', displayName: 'Chicago Bulls' },
      { teamId: 'nba_1996_sea', abbreviation: 'SEA', displayName: 'Seattle SuperSonics' }
    ],
    players: [
      {
        playerId: 'nba_1996_mj',
        displayName: 'Michael Jordan',
        firstName: 'Michael',
        lastName: 'Jordan',
        teamId: 'nba_1996_chi',
        primaryPosition: 'SG',
        draftEligible: true,
        seasonStats: {
          games: 82,
          perGame: { min: 37.7, pts: 30.4, reb: 6.6, ast: 4.3, stl: 2.2, blk: 0.5, to: 2.4, fgm: 11.2, fga: 22.6, ftm: 6.9, fta: 8, threes: 1.4 },
          totals: { pts: 2495, reb: 543, ast: 352, stl: 180, blk: 42, to: 197, threes: 111 }
        }
      },
      {
        playerId: 'nba_1996_payton',
        displayName: 'Gary Payton',
        firstName: 'Gary',
        lastName: 'Payton',
        teamId: 'nba_1996_sea',
        primaryPosition: 'PG',
        draftEligible: true,
        seasonStats: {
          games: 81,
          perGame: { min: 39.1, pts: 19.3, reb: 4.2, ast: 7.5, stl: 2.9, blk: 0.2, to: 2.4, fgm: 7.3, fga: 15.8, ftm: 3.2, fta: 4.5, threes: 1.4 },
          totals: { pts: 1563, reb: 340, ast: 607, stl: 231, blk: 17, to: 196, threes: 113 }
        }
      },
      {
        playerId: 'nba_1996_blaylock',
        displayName: 'Mookie Blaylock',
        firstName: 'Mookie',
        lastName: 'Blaylock',
        teamId: 'nba_1996_sea',
        primaryPosition: 'PG',
        draftEligible: true,
        seasonStats: {
          games: 81,
          perGame: { min: 35.7, pts: 15.7, reb: 4.1, ast: 5.9, stl: 2.6, blk: 0.2, to: 2.3, fgm: 5.6, fga: 13.9, ftm: 1.6, fta: 2.1, threes: 2.9 },
          totals: { pts: 1274, reb: 332, ast: 478, stl: 209, blk: 16, to: 186, threes: 235 }
        }
      },
      {
        playerId: 'nba_1996_muresan_ascii',
        displayName: 'Gheorghe Muresan',
        firstName: 'Gheorghe',
        lastName: 'Muresan',
        teamId: 'nba_1996_sea',
        primaryPosition: 'C',
        draftEligible: true,
        seasonStats: {
          games: 76,
          perGame: { min: 28.4, pts: 14.5, reb: 9.6, ast: 1.2, stl: 0.5, blk: 2.3, to: 2.1, fgm: 5.7, fga: 10.1, ftm: 3.1, fta: 4.2, threes: 0.0 },
          totals: { pts: 1102, reb: 730, ast: 91, stl: 36, blk: 174, to: 160, threes: 0 }
        }
      },
      {
        playerId: 'nba_1996_muresan_accented',
        displayName: 'Gheorghe Mureșan',
        firstName: 'Gheorghe',
        lastName: 'Mureșan',
        teamId: 'nba_1996_sea',
        primaryPosition: 'C',
        draftEligible: true,
        seasonStats: {
          games: 76,
          perGame: { min: 28.4, pts: 14.5, reb: 9.6, ast: 1.2, stl: 0.5, blk: 2.3, to: 2.1, fgm: 5.7, fga: 10.1, ftm: 3.1, fta: 4.2, threes: 0.0 },
          totals: { pts: 1102, reb: 730, ast: 91, stl: 36, blk: 174, to: 160, threes: 0 }
        }
      }
    ]
  },
  {
    manifest: { packId: 'nba_2016_full_season_v1', seasonLabel: '2015-16 NBA' },
    season: { seasonId: 'nba_2016_historic', seasonLabel: '2015-16 NBA', sport: 'nba' },
    teams: [
      { teamId: 'nba_2016_gsw', abbreviation: 'GSW', displayName: 'Golden State Warriors' },
      { teamId: 'nba_2016_cle', abbreviation: 'CLE', displayName: 'Cleveland Cavaliers' }
    ],
    players: [
      {
        playerId: 'nba_2016_curry',
        displayName: 'Stephen Curry',
        firstName: 'Stephen',
        lastName: 'Curry',
        teamId: 'nba_2016_gsw',
        primaryPosition: 'PG',
        draftEligible: true,
        seasonStats: {
          games: 79,
          perGame: { min: 34.2, pts: 30.1, reb: 5.4, ast: 6.7, stl: 2.1, blk: 0.2, to: 3.3, fgm: 10.2, fga: 20.2, ftm: 5.1, fta: 5.8, threes: 5.1 },
          totals: { pts: 2375, reb: 430, ast: 527, stl: 169, blk: 15, to: 262, threes: 402 }
        }
      },
      {
        playerId: 'nba_2016_lebron',
        displayName: 'LeBron James',
        firstName: 'LeBron',
        lastName: 'James',
        teamId: 'nba_2016_cle',
        primaryPosition: 'SF',
        draftEligible: true,
        seasonStats: {
          games: 76,
          perGame: { min: 35.6, pts: 25.3, reb: 7.4, ast: 6.8, stl: 1.4, blk: 0.6, to: 3.3, fgm: 9.7, fga: 18.6, ftm: 4.7, fta: 6.5, threes: 1.1 },
          totals: { pts: 1920, reb: 565, ast: 514, stl: 104, blk: 49, to: 249, threes: 87 }
        }
      },
      {
        playerId: 'nba_2016_draymond',
        displayName: 'Draymond Green',
        firstName: 'Draymond',
        lastName: 'Green',
        teamId: 'nba_2016_gsw',
        primaryPosition: 'PF',
        draftEligible: true,
        seasonStats: {
          games: 81,
          perGame: { min: 34.7, pts: 14.0, reb: 9.5, ast: 7.4, stl: 1.5, blk: 1.4, to: 3.2, fgm: 4.9, fga: 10.1, ftm: 2.1, fta: 3.2, threes: 1.2 },
          totals: { pts: 1131, reb: 776, ast: 603, stl: 123, blk: 113, to: 259, threes: 100 }
        }
      },
      {
        playerId: 'nba_2016_muresan_modern_name_collision',
        displayName: 'Gheorghe Muresan',
        firstName: 'Gheorghe',
        lastName: 'Muresan',
        teamId: 'nba_2016_cle',
        primaryPosition: 'C',
        draftEligible: true,
        seasonStats: {
          games: 18,
          perGame: { min: 6.0, pts: 1.2, reb: 1.8, ast: 0.2, stl: 0.1, blk: 0.4, to: 0.4, fgm: 0.5, fga: 1.1, ftm: 0.2, fta: 0.3, threes: 0.0 },
          totals: { pts: 22, reb: 32, ast: 4, stl: 2, blk: 7, to: 7, threes: 0 }
        }
      }
    ]
  }
];

const mixedEraOverallByName = {
  'Michael Jordan': 99.5,
  'Gary Payton': 93.2,
  'Mookie Blaylock': 88.4,
  'Gheorghe Muresan': 86.2,
  'Gheorghe Mureșan': 86.5,
  'Stephen Curry': 98.7,
  'LeBron James': 96.8,
  'Draymond Green': 89.3
};

assert.strictEqual(normalizeMixedEraIdentityText('Gheorghe Mureșan'), 'gheorghe muresan');
assert.strictEqual(normalizeMixedEraIdentityText('  Toni   Kukoč  '), 'toni kukoc');

const duplicateSameEraPlayers = [
  { name: 'Gheorghe Muresan', historicalPackId: 'nba_1996_full_season_v1', mixedEraOverall: 72.1 },
  { name: 'Gheorghe Mureșan', historicalPackId: 'nba_1996_full_season_v1', mixedEraOverall: 72.4 },
  { name: 'Gheorghe Muresan', historicalPackId: 'nba_2016_full_season_v1', mixedEraOverall: 65.0 }
];
const dedupedDuplicateSameEraPlayers = dedupeMixedEraPlayers(duplicateSameEraPlayers);

assert.strictEqual(buildMixedEraIdentityKey(duplicateSameEraPlayers[0]), 'nba_1996_full_season_v1|gheorghe muresan');
assert.strictEqual(buildMixedEraIdentityKey(duplicateSameEraPlayers[2]), 'nba_2016_full_season_v1|gheorghe muresan');
assert.strictEqual(dedupedDuplicateSameEraPlayers.length, 2);
assert.deepStrictEqual(
  dedupedDuplicateSameEraPlayers.map((player) => player.historicalPackId).sort(),
  ['nba_1996_full_season_v1', 'nba_2016_full_season_v1']
);
assert.ok(dedupedDuplicateSameEraPlayers.some((player) => player.historicalPackId === 'nba_1996_full_season_v1' && player.mixedEraOverall === 72.4));
assert.ok(dedupedDuplicateSameEraPlayers.some((player) => player.historicalPackId === 'nba_2016_full_season_v1'));

function expectedFantasyPointsFromTotals(totals) {
  return Math.round((
    Number(totals.pts || 0)
    + (Number(totals.reb || 0) * 1.2)
    + (Number(totals.ast || 0) * 1.5)
    + (Number(totals.stl || 0) * 3)
    + (Number(totals.blk || 0) * 3)
    - Number(totals.to || 0)
    + (Number(totals.threes || 0) * 0.5)
  ) * 10) / 10;
}

const context = buildMixedEraDraftContextFromBundles({
  config,
  bundles,
  requestedSport: 'nba',
  buildPlayerSimulationProfile(player, options) {
    return {
      mixedEraRatings: { overall: mixedEraOverallByName[player.name] || 0 },
      mixedEraContext: { sourcePackId: options.packId }
    };
  }
});

assert.strictEqual(context.mixedEraConfigId, '1996-2016-top100');
assert.strictEqual(context.playerPool.length, 4);
assert.deepStrictEqual(context.sourcePackIds, ['nba_1996_full_season_v1', 'nba_2016_full_season_v1']);
assert.strictEqual(context.playerPool[0].name, 'Michael Jordan');
assert.strictEqual(context.playerPool[0].team, 'CHI');
assert.strictEqual(context.playerPool[0].pos, 'SG');
assert.ok(context.playerPool[0].gp > 0);
assert.ok(context.playerPool[0].mixedEraOverall > 0);
assert.ok(context.playerPool[0].fp > 0);
assert.ok(context.playerPool[0].statValues && context.playerPool[0].statValues.PTS > 0);
assert.ok(typeof context.playerPool[0].statSummary === 'string' && context.playerPool[0].statSummary.includes('CHI'));
assert.strictEqual(context.playerPool[1].name, 'Stephen Curry');
const jordanTotals = bundles[0].players[0].seasonStats.totals;
const expectedJordanTotalFantasyPoints = expectedFantasyPointsFromTotals(jordanTotals);
assert.strictEqual(context.playerPool[0].totalFantasyPoints, expectedJordanTotalFantasyPoints);
assert.strictEqual(context.playerPool[0].statValues.TFP, expectedJordanTotalFantasyPoints);
assert.ok(context.playerPool.every(player => Array.isArray(player.historicalSourcePackIds)));
assert.ok(context.playerPool.every(player => player.simProfile && player.simProfile.mixedEraRatings));

const dedupeConfig = {
  ...config,
  mixedEraConfigId: '1996-2016-top100-dedupe-check',
  packId: 'mixed_era_1996_2016_top100_dedupe_check_v1',
  topPlayersPerPack: 5
};

const dedupeContext = buildMixedEraDraftContextFromBundles({
  config: dedupeConfig,
  bundles,
  requestedSport: 'nba',
  buildPlayerSimulationProfile(player, options) {
    return {
      mixedEraRatings: { overall: mixedEraOverallByName[player.name] || 0 },
      mixedEraContext: { sourcePackId: options.packId }
    };
  }
});

const dedupeContextSameEraMuresanRows = dedupeContext.playerPool.filter(
  (player) => player.historicalPackId === 'nba_1996_full_season_v1' && normalizeMixedEraIdentityText(player.name) === 'gheorghe muresan'
);
const dedupeContextModernEraMuresanRows = dedupeContext.playerPool.filter(
  (player) => player.historicalPackId === 'nba_2016_full_season_v1' && normalizeMixedEraIdentityText(player.name) === 'gheorghe muresan'
);

assert.strictEqual(dedupeContextSameEraMuresanRows.length, 1);
assert.strictEqual(dedupeContextModernEraMuresanRows.length, 1);

console.log('mixed-era runtime test passed');
