const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function main(){
  const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const setupHtml = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-simulation-setup.html'), 'utf8');

  assert.match(indexHtml, /Start Simulation League/, 'index should link to the simulation setup flow');
  assert.match(setupHtml, /id="simulationSourceSeasonList"/, 'setup page needs a season multi-select list');
  assert.match(setupHtml, /id="simulationFranchiseSelect"/, 'setup page needs a franchise selector');
  assert.match(setupHtml, /id="simulationDraftSlotSelect"/, 'setup page needs a draft-slot selector');

  const scriptMatches = Array.from(setupHtml.matchAll(/<script>([\s\S]*?)<\/script>/g));
  const inlineScript = scriptMatches.length ? scriptMatches[scriptMatches.length - 1][1] : '';
  assert.match(inlineScript, /function enterSimulationDraft\(\)/, 'setup page needs a draft handoff function');

  const selectedSeasonNodes = [
    { value: 'nba_1987_full_season_v1' },
    { value: 'nba_1996_full_season_v1' }
  ];
  const franchiseSelect = { value: 'LAL', innerHTML: '' };
  const draftSlotSelect = { value: '4', innerHTML: '' };
  const sourceSeasonList = { innerHTML: '' };
  const statusNode = { textContent: '' };
  const elementMap = {
    simulationFranchiseSelect: franchiseSelect,
    simulationDraftSlotSelect: draftSlotSelect,
    simulationSourceSeasonList: sourceSeasonList,
    simulationSetupStatus: statusNode
  };
  const storageWrites = [];
  const locationState = { href: 'rosterbate-simulation-setup.html?sport=nba', search: '?sport=nba' };
  const mockCatalog = [
    { packId: 'nba_1987_full_season_v1', seasonLabel: '1986-87', sport: 'nba' },
    { packId: 'nba_1996_full_season_v1', seasonLabel: '1995-96', sport: 'nba' }
  ];

  const context = {
    console,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    Promise,
    Array,
    Number,
    String,
    Object,
    JSON,
    Math,
    document: {
      getElementById(id){
        const node = elementMap[id];
        if (!node) throw new Error(`Unknown element requested: ${id}`);
        return node;
      },
      querySelectorAll(selector){
        assert.equal(selector, '#simulationSourceSeasonList input:checked', 'setup page should read checked season inputs');
        return selectedSeasonNodes;
      }
    },
    localStorage: {
      setItem(key, value){
        storageWrites.push({ key, value });
      }
    }
  };

  context.window = context;
  context.window.location = locationState;
  context.window.RosterBateSimulationModeRuntime = {
    STORAGE_KEY: 'rbSimulationModeLocalState__fromRuntime'
  };
  context.window.RosterBateSimulationModeConfig = {
    getSimulationShell(){
      return {
        teams: [
          { abbr: 'ATL', name: 'Atlanta Hawks' },
          { abbr: 'LAL', name: 'Los Angeles Lakers' }
        ]
      };
    }
  };
  context.window.RosterBateHistoricalPackLoader = {
    loadCatalog(){
      return Promise.resolve(mockCatalog);
    }
  };

  vm.runInNewContext(inlineScript, context, { filename: 'rosterbate-simulation-setup.inline.js' });
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(typeof context.enterSimulationDraft, 'function', 'setup page should expose the draft handoff function');
  context.enterSimulationDraft();

  assert.equal(storageWrites.length, 1, 'setup page should persist one simulation setup payload');
  assert.equal(storageWrites[0].key, 'rbSimulationModeLocalState__fromRuntime', 'setup page should use the runtime storage key');

  const savedPayload = JSON.parse(storageWrites[0].value);
  assert.deepStrictEqual(savedPayload.sourcePackIds, ['nba_1987_full_season_v1', 'nba_1996_full_season_v1'], 'selected pack ids should be captured');
  assert.equal(savedPayload.mode, 'nba_mixed_era_single_player_v1', 'payload should use the simulation mode id');
  assert.equal(savedPayload.controlledTeamAbbr, 'LAL', 'payload should store the controlled franchise');
  assert.equal(savedPayload.draftSlot, 4, 'payload should store the chosen draft slot');
  assert.equal(locationState.href, 'rosterbate-draft.html?simulation=nba_mixed_era', 'setup page should navigate into the simulation draft flow');

  console.log('simulation setup page test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
