const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-draft.html'), 'utf8');
const seasonSource = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-season.html'), 'utf8');

function extractFunction(sourceText, functionName) {
  const startToken = `function ${functionName}(`;
  const startIndex = sourceText.indexOf(startToken);
  assert.notEqual(startIndex, -1, `could not find function ${functionName}`);
  let braceIndex = sourceText.indexOf('{', startIndex);
  assert.notEqual(braceIndex, -1, `could not find opening brace for ${functionName}`);
  let depth = 0;
  for (let index = braceIndex; index < sourceText.length; index += 1) {
    const char = sourceText[index];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return sourceText.slice(startIndex, index + 1);
      }
    }
  }
  throw new Error(`could not extract function ${functionName}`);
}

function loadSeasonRedirectHarness(overrides = {}) {
  const runtimeState = overrides.runtimeState || null;
  const helperUrl = overrides.helperUrl || '';
  let helperCalls = 0;
  const context = {
    URLSearchParams,
    encodeURIComponent,
    console: { warn() {}, log() {}, error() {} },
    CURRENT_SPORT: 'nba',
    shouldPersistSharedSimulationState: (state) => !!state,
    normalizeRosterbateSport: (value) => String(value || 'nba').trim().toLowerCase() || 'nba',
    normalizeSharedSimulationSeasonBootState: (state, slotId) => ({ state, slotId }),
    window: {
      RosterBateSimulationModeRuntime: {
        readCompletedSimulationState: () => runtimeState,
        clearCompletedSimulationState: () => true
      },
      RosterBateHistoricalUniverseSlots: {
        upsertFromState: (state) => ({
          slotId: 'slot-nfl-001',
          state
        }),
        buildSeasonUrl: (...args) => {
          helperCalls += 1;
          if (typeof overrides.onBuildSeasonUrl === 'function') {
            return overrides.onBuildSeasonUrl(...args);
          }
          return helperUrl;
        }
      }
    }
  };
  vm.createContext(context);
  [
    'getRequestedSimulationMode',
    'getSharedSimulationRouteMode',
    'isRequestedSharedSimulationMode',
    'getRequestedHistoricalUniverseSlotId',
    'readCompletedSimulationDraftState',
    'resolveCompletedSimulationDraftSeasonBoot'
  ].forEach((name) => {
    vm.runInContext(extractFunction(seasonSource, name), context, { filename: `season:${name}` });
  });
  return {
    resolveCompletedSimulationDraftSeasonBoot: context.resolveCompletedSimulationDraftSeasonBoot,
    getHelperCalls: () => helperCalls
  };
}

assert.match(source, /RB_SIMULATION_MODE_LOCAL_STATE_KEY/, 'draft page should define a simulation setup storage key');
assert.match(source, /function shouldBootSimulationModeDraft\(\)/, 'draft page needs a simulation boot predicate');
assert.match(source, /function buildSimulationDraftContextFromState\(/, 'draft page needs a simulation context builder');
assert.match(source, /function getSimulationLeagueSize\(simulationContext\)/, 'draft page should define a simulation league-size helper');
assert.match(source, /function getSimulationRosterSize\(simulationContext\)/, 'draft page should define a simulation roster-size helper');
assert.match(source, /function getSimulationSeasonRedirect\(simulationMode\)/, 'draft page should define a simulation season redirect helper');
assert.match(
  source,
  /const\s+simulationSport\s*=\s*normalizeRosterbateSport\(setupState\?\.sport\s*\|\|\s*SPORT\s*\|\|\s*['"]nba['"]\)\s*;[\s\S]*getSimulationShell\(\{\s*sport:\s*simulationSport\s*\}\)/,
  'draft page should look up the simulation shell using the setup-state sport so NFL draft boot uses the NFL shell'
);
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

{
  const harness = loadSeasonRedirectHarness({
    runtimeState: {
      sport: 'nfl',
      simulationMode: 'nfl_mixed_era_single_player_v1',
      leagueShell: { sport: 'nfl' }
    },
    helperUrl: 'rosterbate-season.html?sport=nfl&simulation=nba_mixed_era&historicalUniverse=slot-nfl-001'
  });
  const result = harness.resolveCompletedSimulationDraftSeasonBoot(
    new URLSearchParams('sport=nfl&simulation=nfl_mixed_era'),
    'nfl'
  );
  assert.equal(result.redirected, true, 'NFL completed simulation drafts should still redirect into a historical slot');
  assert.equal(
    result.redirectUrl,
    'rosterbate-season.html?sport=nfl&simulation=nfl_mixed_era&historicalUniverse=slot-nfl-001',
    'NFL completed simulation drafts should preserve the NFL route even if slot helpers return an NBA simulation mode'
  );
}

{
  const harness = loadSeasonRedirectHarness({
    runtimeState: {
      sport: 'nba',
      simulationMode: 'nba_mixed_era_single_player_v1',
      leagueShell: { sport: 'nba' }
    },
    helperUrl: 'rosterbate-season.html?sport=nba&simulation=nba_mixed_era&historicalUniverse=slot-nfl-001'
  });
  const result = harness.resolveCompletedSimulationDraftSeasonBoot(
    new URLSearchParams('sport=nba&simulation=nba_mixed_era'),
    'nba'
  );
  assert.equal(
    result.redirectUrl,
    'rosterbate-season.html?sport=nba&simulation=nba_mixed_era&historicalUniverse=slot-nfl-001',
    'NBA completed simulation drafts should keep using the helper-backed redirect path'
  );
  assert.equal(harness.getHelperCalls(), 1, 'NBA helper-backed redirects should still call buildSeasonUrl');
}

console.log('simulation draft boot test passed');
