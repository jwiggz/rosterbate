const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const setupHtml = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-simulation-setup.html'), 'utf8');

assert.match(indexHtml, /Start Simulation League/, 'index should link to the simulation setup flow');
assert.match(setupHtml, /id="simulationSourceSeasonList"/, 'setup page needs a season multi-select list');
assert.match(setupHtml, /id="simulationFranchiseSelect"/, 'setup page needs a franchise selector');
assert.match(setupHtml, /id="simulationDraftSlotSelect"/, 'setup page needs a draft-slot selector');
assert.match(setupHtml, /function enterSimulationDraft\(\)/, 'setup page needs a draft handoff function');
assert.match(setupHtml, /rbSimulationModeLocalState/, 'setup page should save a simulation setup payload');

console.log('simulation setup page test passed');
