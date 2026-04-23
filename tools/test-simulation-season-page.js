const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-simulation-season.html'), 'utf8');

assert.match(html, /function resolveLegacySimulationTarget\(\)/, 'legacy simulation page should compute a shared-shell redirect target');
assert.match(html, /function redirectToSharedSeasonShell\(\)/, 'legacy simulation page should redirect into the shared season shell');
assert.match(html, /rosterbate-season\.html/, 'legacy simulation page should point at the regular season shell');
assert.match(html, /simulation=nba_mixed_era/, 'legacy simulation page should preserve the simulation mode query param');
assert.match(html, /historicalUniverse/, 'legacy simulation page should forward historical universe slot ids');
assert.doesNotMatch(html, /function renderSimulationDashboard\(/, 'legacy simulation page should no longer own the main simulation dashboard');

console.log('simulation season page test passed');
