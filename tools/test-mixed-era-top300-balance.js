const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

global.window = globalThis;
require('../simulation-league-engine.js');
const runtime = require('../mixed-era-runtime.js');

const root = path.resolve(__dirname, '..');

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(root, relPath), 'utf8'));
}

const config = Object.assign(
  { mixedEraConfigId: '1996-2016-top300' },
  readJson('historical-packs/mixed-era/1996-2016-top300.json')
);

const bundles = config.sourcePackIds.map((packId) => ({
  manifest: readJson(`historical-packs/${packId}/manifest.json`),
  season: readJson(`historical-packs/${packId}/season.json`),
  teams: readJson(`historical-packs/${packId}/teams.json`),
  players: readJson(`historical-packs/${packId}/players.json`)
}));

const context = runtime.buildMixedEraDraftContextFromBundles({
  config,
  bundles,
  requestedSport: config.sport,
  buildPlayerSimulationProfile: globalThis.RosterBateSimulationEngine.buildPlayerSimulationProfile
});

const audit = runtime.buildMixedEraAuditViewModel({
  config,
  playerPool: context.playerPool
});

function getCheck(id) {
  return audit.compositionChecks.find((check) => check.id === id);
}

assert.equal(getCheck('top10').verdict, 'pass');
assert.deepStrictEqual(getCheck('top25').composition, {
  nba_1996_full_season_v1: 16,
  nba_2016_full_season_v1: 9
});
assert.equal(getCheck('top25').verdict, 'tune');
assert.deepStrictEqual(getCheck('top50').composition, {
  nba_1996_full_season_v1: 30,
  nba_2016_full_season_v1: 20
});
assert.equal(getCheck('top50').verdict, 'tune');
assert.deepStrictEqual(getCheck('top100').composition, {
  nba_1996_full_season_v1: 60,
  nba_2016_full_season_v1: 40
});
assert.equal(getCheck('top100').verdict, 'tune');
assert.equal(getCheck('fullPool').verdict, 'pass');
assert.deepStrictEqual(
  audit.rows.filter((row) => row.rank <= 25 && row.gamesPlayed < 25),
  []
);

const webber = audit.rows.find((row) => row.player === 'Chris Webber');
assert.ok(webber, 'expected Chris Webber to be present in the mixed-era board');
assert.ok(webber.rank >= 50, `expected Chris Webber to fall out of premium tiers, got rank ${webber.rank}`);

console.log('mixed-era top300 balance test passed');
