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

function mustGetCheck(id) {
  const check = getCheck(id);
  assert.ok(check, `expected composition check ${id} to exist`);
  return check;
}

function assertNotFailWithMaxDominantShare(id, maxDominantShare) {
  const check = mustGetCheck(id);
  assert.notEqual(check.verdict, 'fail', `expected ${id} composition to stay out of fail range`);
  assert.ok(
    check.dominantShare <= maxDominantShare,
    `expected ${id} dominant share <= ${maxDominantShare}, got ${check.dominantShare}`
  );
}

assert.throws(
  () => mustGetCheck('missing-check'),
  /expected composition check missing-check to exist/
);

assert.equal(mustGetCheck('top10').verdict, 'pass');
assertNotFailWithMaxDominantShare('top25', 60);
assertNotFailWithMaxDominantShare('top50', 58);
assertNotFailWithMaxDominantShare('top100', 60);
assert.equal(mustGetCheck('fullPool').verdict, 'pass');
assert.deepStrictEqual(
  audit.rows.filter((row) => row.rank <= 25 && row.gamesPlayed < 25),
  []
);
assert.deepStrictEqual(
  audit.rows.filter((row) => row.rank <= 50 && row.gamesPlayed < 25),
  []
);

console.log('mixed-era top300 balance test passed');
