const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'historic-universe.html'), 'utf8');

assert.match(html, /function isSimulationModeUniverse\(/, 'details page needs a simulation-mode detector');
assert.match(html, /function buildSimulationModeSummary\(/, 'details page needs a simulation summary builder');
assert.match(html, /function buildSimulationPlayoffSummary\(/, 'details page needs a playoff summary builder');
assert.match(html, /simulation champion/i, 'details page should render champion wording for simulation universes');
assert.match(html, /play-in/i, 'details page should mention play-in context for simulation universes');

console.log('simulation universe details test passed');
