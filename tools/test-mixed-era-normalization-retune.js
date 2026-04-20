const assert = require('node:assert/strict');

global.window = globalThis;
require('../simulation-league-engine.js');

const engine = globalThis.RosterBateSimulationEngine;

function makeTotals(perGame, games) {
  return {
    pts: Math.round(perGame.pts * games * 10) / 10,
    reb: Math.round(perGame.reb * games * 10) / 10,
    ast: Math.round(perGame.ast * games * 10) / 10,
    stl: Math.round(perGame.stl * games * 10) / 10,
    blk: Math.round(perGame.blk * games * 10) / 10,
    to: Math.round(perGame.to * games * 10) / 10,
    threes: Math.round(perGame.threes * games * 10) / 10
  };
}

const perGame = {
  min: 37.0,
  pts: 24.2,
  reb: 10.1,
  ast: 4.4,
  stl: 1.6,
  blk: 1.8,
  to: 2.7,
  fgm: 9.1,
  fga: 18.7,
  ftm: 5.0,
  fta: 6.6,
  threes: 0.3
};

const fullSeasonPlayer = {
  name: 'Durable Prototype',
  historicalPackId: 'nba_1996_full_season_v1',
  seasonStats: {
    games: 82,
    perGame,
    totals: makeTotals(perGame, 82)
  }
};

const shortSeasonPlayer = {
  name: 'Short Sample Prototype',
  historicalPackId: 'nba_1996_full_season_v1',
  seasonStats: {
    games: 15,
    perGame,
    totals: makeTotals(perGame, 15)
  }
};

const durableProfile = engine.buildPlayerSimulationProfile(fullSeasonPlayer, {
  packId: 'nba_1996_full_season_v1'
});
const shortProfile = engine.buildPlayerSimulationProfile(shortSeasonPlayer, {
  packId: 'nba_1996_full_season_v1'
});

assert.equal(durableProfile.mixedEraContext.lowGamesConfidence, 1);
assert.equal(shortProfile.mixedEraContext.lowGamesConfidence, 0.89);
assert.ok(
  shortProfile.mixedEraRatings.overall <= durableProfile.mixedEraRatings.overall - 8,
  `expected low-games profile to trail durable profile by at least 8 points, got durable=${durableProfile.mixedEraRatings.overall} short=${shortProfile.mixedEraRatings.overall}`
);
assert.ok(
  shortProfile.mixedEraRatings.overall < durableProfile.mixedEraRatings.overall,
  'expected low-games profile to have a lower mixedEraOverall'
);

console.log('mixed-era normalization retune test passed');
