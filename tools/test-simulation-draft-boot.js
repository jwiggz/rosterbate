const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-draft.html'), 'utf8');

assert.match(source, /RB_SIMULATION_MODE_LOCAL_STATE_KEY/, 'draft page should define a simulation setup storage key');
assert.match(source, /function shouldBootSimulationModeDraft\(\)/, 'draft page needs a simulation boot predicate');
assert.match(source, /function buildSimulationDraftContextFromState\(/, 'draft page needs a simulation context builder');
assert.match(source, /simulationMode===['"]nba_mixed_era_single_player_v1['"]/, 'draft page should stamp simulation mode onto the finished save');
assert.match(source, /rosterbate-simulation-season\.html/, 'draft completion should route to the dedicated simulation season page');

console.log('simulation draft boot test passed');
