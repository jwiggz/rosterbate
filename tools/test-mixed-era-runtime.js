const assert = require('assert');

const { buildMixedEraDraftContextFromBundles } = require('../mixed-era-runtime.js');

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
    manifest: { packId: 'nba_1996_full_season_v1' },
    season: { seasonLabel: '1995-96 NBA' },
    players: [
      {
        name: 'Michael Jordan',
        fp: 48.1,
        gp: 82,
        simProfile: {
          mixedEraRatings: { overall: 99.5 },
          mixedEraContext: { sourcePackId: 'nba_1996_full_season_v1' }
        }
      },
      {
        name: 'Scottie Pippen',
        fp: 39.4,
        gp: 77,
        simProfile: {
          mixedEraRatings: { overall: 92.1 },
          mixedEraContext: { sourcePackId: 'nba_1996_full_season_v1' }
        }
      },
      {
        name: 'Dennis Rodman',
        fp: 30.2,
        gp: 64,
        simProfile: {
          mixedEraRatings: { overall: 88.4 },
          mixedEraContext: { sourcePackId: 'nba_1996_full_season_v1' }
        }
      }
    ]
  },
  {
    manifest: { packId: 'nba_2016_full_season_v1' },
    season: { seasonLabel: '2015-16 NBA' },
    players: [
      {
        name: 'Stephen Curry',
        fp: 47.9,
        gp: 79,
        simProfile: {
          mixedEraRatings: { overall: 98.7 },
          mixedEraContext: { sourcePackId: 'nba_2016_full_season_v1' }
        }
      },
      {
        name: 'LeBron James',
        fp: 44.1,
        gp: 76,
        simProfile: {
          mixedEraRatings: { overall: 96.8 },
          mixedEraContext: { sourcePackId: 'nba_2016_full_season_v1' }
        }
      },
      {
        name: 'Draymond Green',
        fp: 36.2,
        gp: 81,
        simProfile: {
          mixedEraRatings: { overall: 89.3 },
          mixedEraContext: { sourcePackId: 'nba_2016_full_season_v1' }
        }
      }
    ]
  }
];

const context = buildMixedEraDraftContextFromBundles({
  config,
  bundles,
  requestedSport: 'nba'
});

assert.strictEqual(context.mixedEraConfigId, '1996-2016-top100');
assert.strictEqual(context.playerPool.length, 4);
assert.deepStrictEqual(context.sourcePackIds, ['nba_1996_full_season_v1', 'nba_2016_full_season_v1']);
assert.strictEqual(context.playerPool[0].name, 'Michael Jordan');
assert.strictEqual(context.playerPool[1].name, 'Stephen Curry');
assert.ok(context.playerPool.every(player => Array.isArray(player.historicalSourcePackIds)));

console.log('mixed-era runtime test passed');
