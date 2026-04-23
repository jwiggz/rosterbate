const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-season.html'), 'utf8');

assert.match(html, /simulation-season-adapter\.js/, 'season shell should load the simulation adapter');
assert.match(html, /function getRequestedSimulationMode\(/, 'season shell needs a simulation query-param helper');
assert.match(html, /function getRequestedHistoricalUniverseSlotId\(/, 'season shell should normalize historical slot lookup');
assert.match(html, /function isSharedSimulationSeason\(/, 'season shell should detect shared-shell simulation mode');
assert.match(html, /function getActiveSeasonPages\(/, 'season shell should build dynamic page lists');
assert.match(html, /matchup:\s*'Schedule'/, 'simulation page labels should rename matchup to schedule');
assert.match(html, /simulation=nba_mixed_era/, 'season shell should understand the simulation mode query param');

console.log('shared season shell simulation test passed');
