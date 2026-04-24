const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-draft.html'), 'utf8');
const seasonSource = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-season.html'), 'utf8');

assert.match(source, /RB_SIMULATION_MODE_LOCAL_STATE_KEY/, 'draft page should define a simulation setup storage key');
assert.match(source, /function shouldBootSimulationModeDraft\(\)/, 'draft page needs a simulation boot predicate');
assert.match(source, /function buildSimulationDraftContextFromState\(/, 'draft page needs a simulation context builder');
assert.match(source, /function getSimulationLeagueSize\(simulationContext\)/, 'draft page should define a simulation league-size helper');
assert.match(source, /function getSimulationRosterSize\(simulationContext\)/, 'draft page should define a simulation roster-size helper');
assert.match(source, /function getSimulationSeasonRedirect\(simulationMode\)/, 'draft page should define a simulation season redirect helper');
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
  /if\s*\(simulationContext\s*&&\s*rd\s*!==\s*simulationRosterSize\)\s*\{/,
  'simulation drafts should enforce the exact shell roster size before starting'
);
assert.match(
  source,
  /if\s*\(!simulationContext\s*&&\s*\(isNaN\(ls\)\|\|ls<\(allowSoloTest\?1:2\)\|\|ls>20\)\)\s*\{/,
  'generic league-size validation should not block the locked 30-team simulation draft'
);
assert.match(
  source,
  /if\s*\(simulationContext\s*&&\s*need>PLAYERS\.length\)\s*\{[\s\S]*selected eras[\s\S]*players/i,
  'simulation drafts should explain that underfilled pools require adding more eras, not changing locked team or round counts'
);
assert.match(source, /simulationMode===['"]nba_mixed_era_single_player_v1['"]/, 'draft page should stamp simulation mode onto the finished save');
assert.match(source, /simulationMode===['"]nfl_mixed_era_single_player_v1['"]/, 'draft page should recognize football simulation mode completion');
assert.match(source, /nfl_mixed_era_single_player_v1[\s\S]*return\s+32\b/, 'football simulation drafts should enforce a locked 32-team shell size');
assert.match(source, /nfl_mixed_era_single_player_v1[\s\S]*return\s+13\b/, 'football simulation drafts should enforce a locked 13-slot roster size');
assert.match(source, /rosterbate-season\.html\?sport=nfl&simulation=nfl_mixed_era/, 'completed football simulation drafts should route into the NFL season shell');
assert.match(source, /rosterbate-season\.html\?sport=nba&simulation=nba_mixed_era/, 'completed simulation drafts should route into the shared season shell');
assert.match(seasonSource, /Football simulation season shell is coming next/i, 'season page should include the NFL simulation placeholder copy');

console.log('simulation draft boot test passed');
