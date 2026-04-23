const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-simulation-season.html'), 'utf8');

assert.match(html, /id="simulationSeasonDate"/, 'season page needs a season-date label');
assert.match(html, /id="simulationStandingsTable"/, 'season page needs a standings table');
assert.match(html, /id="simulationGameResults"/, 'season page needs a daily results panel');
assert.match(html, /id="simulationPlayoffBracket"/, 'season page needs a playoff bracket panel');
assert.match(html, /id="simulationChampionBanner"/, 'season page needs a champion banner');
assert.match(html, /function bootSimulationSeason\(\)/, 'season page needs a boot function');
assert.match(html, /function simulateNextSimulationDay\(\)/, 'season page needs a next-day action');
assert.match(html, /function renderSimulationDashboard\(/, 'season page needs a render function');

console.log('simulation season page test passed');
