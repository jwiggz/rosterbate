const assert = require('node:assert/strict');

global.window = globalThis;
require('../simulation-league-engine.js');

const engine = globalThis.RosterBateSimulationEngine;

function roundStat(value) {
  return Math.round(Number(value) * 10) / 10;
}

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

const zeroGamesPlayer = {
  name: 'Zero Sample Prototype',
  historicalPackId: 'nba_1996_full_season_v1',
  seasonStats: {
    games: 0,
    perGame,
    totals: makeTotals(perGame, 0)
  }
};

const cutoffPlayer = {
  name: 'Cutoff Prototype',
  historicalPackId: 'nba_1996_full_season_v1',
  seasonStats: {
    games: 25,
    perGame,
    totals: makeTotals(perGame, 25)
  }
};

const nearCutoffPlayer = {
  name: 'Near Cutoff Prototype',
  historicalPackId: 'nba_1996_full_season_v1',
  seasonStats: {
    games: 24,
    perGame,
    totals: makeTotals(perGame, 24)
  }
};

const durableProfile = engine.buildPlayerSimulationProfile(fullSeasonPlayer, {
  packId: 'nba_1996_full_season_v1'
});
const shortProfile = engine.buildPlayerSimulationProfile(shortSeasonPlayer, {
  packId: 'nba_1996_full_season_v1'
});
const zeroProfile = engine.buildPlayerSimulationProfile(zeroGamesPlayer, {
  packId: 'nba_1996_full_season_v1'
});
const nearCutoffProfile = engine.buildPlayerSimulationProfile(nearCutoffPlayer, {
  packId: 'nba_1996_full_season_v1'
});
const cutoffProfile = engine.buildPlayerSimulationProfile(cutoffPlayer, {
  packId: 'nba_1996_full_season_v1'
});
const durableFantasyPerGame = durableProfile.totalFantasyPoints / durableProfile.gamesPlayed;
function buildConfidenceAdjustedMixedEra(gp) {
  return engine.buildMixedEraRatings(
    durableProfile.ratings,
    durableProfile.baseline,
    durableFantasyPerGame * gp,
    gp,
    'nba_1996_full_season_v1'
  );
}
const durableMixedEra = buildConfidenceAdjustedMixedEra(82);
const shortMixedEra = buildConfidenceAdjustedMixedEra(15);
const zeroMixedEra = buildConfidenceAdjustedMixedEra(0);
const nearCutoffMixedEra = buildConfidenceAdjustedMixedEra(24);
const cutoffMixedEra = buildConfidenceAdjustedMixedEra(25);

assert.equal(durableProfile.mixedEraContext.lowGamesConfidence, 1);
assert.equal(shortProfile.mixedEraContext.lowGamesConfidence, 0.89);
assert.equal(zeroProfile.mixedEraContext.lowGamesConfidence, 0.72);
assert.equal(nearCutoffProfile.mixedEraContext.lowGamesConfidence, 0.99);
assert.equal(cutoffProfile.mixedEraContext.lowGamesConfidence, 1);
assert.equal(durableMixedEra.context.lowGamesConfidence, 1);
assert.equal(shortMixedEra.context.lowGamesConfidence, 0.89);
assert.equal(zeroMixedEra.context.lowGamesConfidence, 0.72);
assert.equal(nearCutoffMixedEra.context.lowGamesConfidence, 0.99);
assert.equal(cutoffMixedEra.context.lowGamesConfidence, 1);
assert.ok(
  nearCutoffMixedEra.context.lowGamesConfidence < 1,
  'expected 24 GP to keep a low-games confidence penalty'
);
assert.equal(
  nearCutoffMixedEra.ratings.overall,
  roundStat(durableMixedEra.ratings.overall * nearCutoffMixedEra.context.lowGamesConfidence)
);
assert.equal(
  shortMixedEra.ratings.overall,
  roundStat(durableMixedEra.ratings.overall * shortMixedEra.context.lowGamesConfidence)
);
assert.ok(
  shortProfile.mixedEraRatings.overall < durableProfile.mixedEraRatings.overall,
  'expected low-games profile to have a lower mixedEraOverall'
);

console.log('mixed-era normalization retune test passed');
