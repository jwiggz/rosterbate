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
assert.match(html, /function getRequestedHistoricalUniverseSlotId\(\)/, 'season page should read historical universe slot ids from the URL');
assert.match(html, /function loadHistoricalUniverseSlotState\(/, 'season page should be able to load simulation saves from slot storage');
assert.match(html, /RosterBateHistoricalUniverseSlots/, 'season page should use historical universe slot storage when loading archive saves');

console.log('simulation season page test passed');
