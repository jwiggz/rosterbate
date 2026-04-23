const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-draft.html'), 'utf8');

assert.match(source, /RB_SIMULATION_MODE_LOCAL_STATE_KEY/, 'draft page should define a simulation setup storage key');
assert.match(source, /function shouldBootSimulationModeDraft\(\)/, 'draft page needs a simulation boot predicate');
assert.match(source, /function buildSimulationDraftContextFromState\(/, 'draft page needs a simulation context builder');
assert.match(
  source,
  /if\s*\(!setupState\s*\|\|\s*!Array\.isArray\(setupState\.sourcePackIds\)\s*\|\|\s*!setupState\.sourcePackIds\.length\s*\|\|\s*!String\(setupState\.controlledTeamAbbr\s*\|\|\s*''\)\.trim\(\)\s*\|\|\s*!\w+\.isFinite\(Number\(setupState\.draftSlot\)\)\s*\)\s*\{/,
  'draft page should guard against a missing or invalid simulation setup payload'
);
assert.match(
  source,
  /if\s*\(simulationContext\s*&&\s*ls\s*!==\s*simulationLeagueSize\)\s*\{/,
  'simulation drafts should enforce the exact shell team count before starting'
);
assert.match(
  source,
  /if\s*\(!simulationContext\s*&&\s*\(isNaN\(ls\)\|\|ls<\(allowSoloTest\?1:2\)\|\|ls>20\)\)\s*\{/,
  'generic league-size validation should not block the locked 30-team simulation draft'
);
assert.match(source, /simulationMode===['"]nba_mixed_era_single_player_v1['"]/, 'draft page should stamp simulation mode onto the finished save');
assert.match(source, /rosterbate-simulation-season\.html/, 'draft completion should route to the dedicated simulation season page');

console.log('simulation draft boot test passed');
