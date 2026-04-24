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
  assert.match(inlineScript, /buildMixedEraDraftContextFromBundles/, 'setup page should preflight the mixed-era pool before entering the draft');
  assert.match(setupHtml, /id="simulationAutoDraftBtn"/, 'setup page should expose an auto-draft CTA');
  assert.match(inlineScript, /simDraftAndStartSeason/, 'setup page needs an auto-draft handoff function');
  assert.match(inlineScript, /buildCompletedSimulationAutoDraftState/, 'setup page should build the completed auto-draft simulation state');
  assert.match(inlineScript, /writeCompletedSimulationState/, 'setup page should persist the completed simulation state');
  assert.match(inlineScript, /function getSimulationSport\(\)/, 'setup page should expose a sport helper');
  assert.match(inlineScript, /getSimulationSport\(\)\s*===\s*'nfl'/, 'setup page should branch on the nfl sport helper');
  assert.match(inlineScript, /function getSimulationTopPlayersPerPack\(shell\)/, 'setup page should define a sport-aware mixed-era pack cap helper');
  assert.match(
    inlineScript,
    /topPlayersPerPack:\s*getSimulationTopPlayersPerPack\(shell\)/,
    'setup page should derive the preview cap from the shell helper instead of a fixed literal'
  );

  let seasonNodes = [
    { value: 'nba_1987_full_season_v1', checked: true, disabled: false },
    { value: 'nba_1993_full_season_v1', checked: true, disabled: false },
    { value: 'nba_1996_full_season_v1', checked: false, disabled: false }
  ];
  const franchiseSelect = { value: 'LAL', innerHTML: '' };
  const draftSlotSelect = { value: '4', innerHTML: '' };
  const continueButton = { disabled: false };
  const autoDraftButton = { disabled: false };
  const sourceSeasonList = { innerHTML: '' };
  const statusNode = { textContent: '' };
  const heroCopyNode = { textContent: '' };
  const sourceCopyNode = { textContent: '' };
  const shellChipNode = { textContent: '' };
  const rosterChipNode = { textContent: '' };
  const teamLabelNode = { textContent: '' };
  const draftSlotLabelNode = { textContent: '' };
  const draftSlotHelperNode = { textContent: '' };
  const elementMap = {
    simulationContinueBtn: continueButton,
    simulationAutoDraftBtn: autoDraftButton,
    simulationFranchiseSelect: franchiseSelect,
    simulationDraftSlotSelect: draftSlotSelect,
    simulationSourceSeasonList: sourceSeasonList,
    simulationSetupStatus: statusNode,
    simulationHeroCopy: heroCopyNode,
    simulationSourceCopy: sourceCopyNode,
    simulationShellChip: shellChipNode,
    simulationRosterChip: rosterChipNode,
    simulationTeamLabel: teamLabelNode,
    simulationDraftSlotLabel: draftSlotLabelNode,
    simulationDraftSlotHelper: draftSlotHelperNode
  };
  const storageWrites = [];
  const mixedEraConfigCalls = [];
  const locationState = { href: 'rosterbate-simulation-setup.html?sport=nba', search: '?sport=nba' };
  const mockCatalog = [
    { packId: 'nba_1987_full_season_v1', seasonLabel: '1986-87', sport: 'nba' },
    { packId: 'nba_1993_full_season_v1', seasonLabel: '1992-93', sport: 'nba' },
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
        if (selector === '#simulationSourceSeasonList input:checked') {
          return seasonNodes.filter((node) => node.checked);
        }
        if (selector === '#simulationSourceSeasonList input') {
          return seasonNodes;
        }
        throw new Error(`Unexpected selector requested: ${selector}`);
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
    STORAGE_KEY: 'rbSimulationModeLocalState__fromRuntime',
    writeCompletedSimulationState(state){
      storageWrites.push({ kind: 'completed', state });
      return state;
    },
    buildCompletedSimulationAutoDraftState(input){
      return {
        simulationMode: 'nba_mixed_era_single_player_v1',
        leagueShell: input.shell,
        sourceSeasons: input.mixedEraContext,
        draftState: {
          controlledTeamAbbr: input.controlledTeamAbbr,
          rostersByTeam: {
            LAL: Array.from({ length: 10 }, (_, index) => ({ id: index + 1 }))
          },
          freeAgents: [],
          draftPool: [],
          teamCount: 1,
          rosterSize: 10
        },
        seasonState: {
          currentDay: 1
        },
        postseasonState: {
          phase: 'regular_season'
        }
      };
    }
  };
  context.window.RosterBateSimulationModeConfig = {
    getSimulationShell(){
      return {
        rosterSize: 10,
        teams: Array.from({ length: 30 }, (_, index) => ({
          abbr: index === 3 ? 'LAL' : `T${String(index + 1).padStart(2, '0')}`,
          name: index === 3 ? 'Los Angeles Lakers' : `Team ${index + 1}`
        }))
      };
    }
  };
  context.window.RosterBateHistoricalPackLoader = {
    loadCatalog(){
      return Promise.resolve(mockCatalog);
    },
    loadPackById(packId){
      return Promise.resolve({
        packId,
        season: {
          seasonLabel: mockCatalog.find((entry) => entry.packId === packId)?.seasonLabel || packId
        },
        players: Array.from({ length: 120 }, (_, index) => ({
          id: `${packId}-${index + 1}`,
          name: `${packId} Player ${index + 1}`
        }))
      });
    }
  };
  context.window.RosterBateMixedEraRuntime = {
    buildMixedEraDraftContextFromBundles(input){
      const bundles = Array.isArray(input?.bundles) ? input.bundles : [];
      const topPlayersPerPack = Number(input?.config?.topPlayersPerPack || 0);
      mixedEraConfigCalls.push(input?.config || null);
      const totalPlayers = bundles.reduce((sum, bundle) => {
        const players = Array.isArray(bundle?.players) ? bundle.players : [];
        const eligiblePlayers = Number.isFinite(topPlayersPerPack) && topPlayersPerPack > 0
          ? players.slice(0, topPlayersPerPack)
          : players;
        return sum + eligiblePlayers.length;
      }, 0);
      return {
        mixedEraConfigId: 'simulation_custom_mix',
        sourcePackIds: bundles.map((bundle) => bundle.packId),
        sourceSeasonLabels: bundles.map((bundle) => bundle?.season?.seasonLabel || bundle.packId),
        playerPool: Array.from({ length: totalPlayers }, (_, index) => ({
          id: index + 1,
          name: `Mixed Era Player ${index + 1}`
        }))
      };
    }
  };

  vm.runInNewContext(inlineScript, context, { filename: 'rosterbate-simulation-setup.inline.js' });
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(typeof context.enterSimulationDraft, 'function', 'setup page should expose the draft handoff function');
  let releaseUnderfilledLoad;
  context.window.RosterBateHistoricalPackLoader.loadPackById = function(packId){
    return new Promise((resolve) => {
      releaseUnderfilledLoad = function(){
        resolve({
          packId,
          season: {
            seasonLabel: mockCatalog.find((entry) => entry.packId === packId)?.seasonLabel || packId
          },
          players: Array.from({ length: 120 }, (_, index) => ({
            id: `${packId}-${index + 1}`,
            name: `${packId} Player ${index + 1}`
          }))
        });
      };
    });
  };
  const underfilledPromise = context.enterSimulationDraft();
  assert.equal(statusNode.textContent, 'Building mixed-era player pool...', 'manual path should announce pool building before validation completes');
  assert.equal(continueButton.disabled, true, 'manual path should disable the manual CTA while work is in flight');
  assert.equal(autoDraftButton.disabled, true, 'manual path should disable the auto CTA while work is in flight');
  assert.equal(franchiseSelect.disabled, true, 'manual path should disable franchise selection while work is in flight');
  assert.equal(draftSlotSelect.disabled, true, 'manual path should disable draft slot selection while work is in flight');
  assert.ok(seasonNodes.every((node) => node.disabled === true), 'manual path should disable all season inputs while work is in flight');
  releaseUnderfilledLoad();
  await underfilledPromise;

  assert.equal(storageWrites.length, 0, 'setup page should block underfilled simulation pools before navigating');
  assert.match(
    statusNode.textContent,
    /only yields 240 draftable players.*needs 300/i,
    'setup page should explain when the selected eras cannot fill a 30-team simulation draft'
  );
  assert.equal(locationState.href, 'rosterbate-simulation-setup.html?sport=nba', 'setup page should stay put when the pool is too small');
  assert.equal(continueButton.disabled, false, 'manual path should re-enable the manual CTA after a non-redirect result');
  assert.equal(autoDraftButton.disabled, false, 'manual path should re-enable the auto CTA after a non-redirect result');
  assert.equal(franchiseSelect.disabled, false, 'manual path should re-enable franchise selection after a non-redirect result');
  assert.equal(draftSlotSelect.disabled, false, 'manual path should re-enable draft slot selection after a non-redirect result');
  assert.ok(seasonNodes.every((node) => node.disabled === false), 'manual path should re-enable all season inputs after a non-redirect result');

  seasonNodes = seasonNodes.map((node) => ({ ...node, checked: true, disabled: false }));
  context.window.RosterBateHistoricalPackLoader.loadPackById = function(packId){
    return Promise.resolve({
      packId,
      season: {
        seasonLabel: mockCatalog.find((entry) => entry.packId === packId)?.seasonLabel || packId
      },
      players: Array.from({ length: 120 }, (_, index) => ({
        id: `${packId}-${index + 1}`,
        name: `${packId} Player ${index + 1}`
      }))
    });
  };
  await context.enterSimulationDraft();

  assert.equal(storageWrites.length, 1, 'setup page should persist one simulation setup payload once the pool is valid');
  assert.equal(storageWrites[0].key, 'rbSimulationModeLocalState__fromRuntime', 'setup page should use the runtime storage key');

  const savedPayload = JSON.parse(storageWrites[0].value);
  assert.deepStrictEqual(savedPayload.sourcePackIds, ['nba_1987_full_season_v1', 'nba_1993_full_season_v1', 'nba_1996_full_season_v1'], 'selected pack ids should be captured');
  assert.equal(savedPayload.mode, 'nba_mixed_era_single_player_v1', 'payload should use the simulation mode id');
  assert.equal(savedPayload.controlledTeamAbbr, 'LAL', 'payload should store the controlled franchise');
  assert.equal(savedPayload.draftSlot, 4, 'payload should store the chosen draft slot');
  assert.ok(mixedEraConfigCalls.every((config) => Number(config?.topPlayersPerPack) === 120), 'nba setup preview should preserve the 120-player pack cap');
  assert.equal(locationState.href, 'rosterbate-draft.html?sport=nba&simulation=nba_mixed_era', 'setup page should navigate into the simulation draft flow');

  const autoDraftStatusNode = { textContent: '' };
  const autoDraftContinueButton = { disabled: false };
  const autoDraftButtonNode = { disabled: false };
  const autoDraftFranchiseSelect = { value: 'LAL', innerHTML: '', disabled: false };
  const autoDraftDraftSlotSelect = { value: '4', innerHTML: '', disabled: false };
  const autoDraftSeasonNodes = [
    { value: 'nba_1987_full_season_v1', checked: true, disabled: false },
    { value: 'nba_1993_full_season_v1', checked: true, disabled: false },
    { value: 'nba_1996_full_season_v1', checked: true, disabled: false }
  ];
  const autoDraftLocationState = {
    href: 'rosterbate-simulation-setup.html?sport=nba',
    search: '?sport=nba'
  };
  const autoDraftWrites = [];
  let autoDraftHelperInput = null;
  let autoDraftHelperResult = null;
  const autoDraftContext = {
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
        if (id === 'simulationSetupStatus') return autoDraftStatusNode;
        if (id === 'simulationContinueBtn') return autoDraftContinueButton;
        if (id === 'simulationAutoDraftBtn') return autoDraftButtonNode;
        if (id === 'simulationFranchiseSelect') return autoDraftFranchiseSelect;
        if (id === 'simulationDraftSlotSelect') return autoDraftDraftSlotSelect;
        if (id === 'simulationSourceSeasonList') return { innerHTML: '' };
        if (id === 'simulationHeroCopy') return { textContent: '' };
        if (id === 'simulationSourceCopy') return { textContent: '' };
        if (id === 'simulationShellChip') return { textContent: '' };
        if (id === 'simulationRosterChip') return { textContent: '' };
        if (id === 'simulationTeamLabel') return { textContent: '' };
        if (id === 'simulationDraftSlotLabel') return { textContent: '' };
        if (id === 'simulationDraftSlotHelper') return { textContent: '' };
        throw new Error(`Unknown element requested: ${id}`);
      },
      querySelectorAll(selector){
        if (selector === '#simulationSourceSeasonList input:checked') {
          return autoDraftSeasonNodes.filter((node) => node.checked);
        }
        if (selector === '#simulationSourceSeasonList input') {
          return autoDraftSeasonNodes;
        }
        throw new Error(`Unexpected selector requested: ${selector}`);
      }
    },
    localStorage: {
      setItem(key, value){
        autoDraftWrites.push({ key, value });
      }
    }
  };

  autoDraftContext.window = autoDraftContext;
  autoDraftContext.window.location = autoDraftLocationState;
  autoDraftContext.window.RosterBateSimulationModeRuntime = {
    STORAGE_KEY: 'rbSimulationModeLocalState__fromRuntime',
    writeCompletedSimulationState(state){
      autoDraftWrites.push({ kind: 'completed', state });
      return state;
    },
    buildCompletedSimulationAutoDraftState(input){
      autoDraftHelperInput = input;
      autoDraftHelperResult = {
        simulationMode: 'nba_mixed_era_single_player_v1',
        leagueShell: input.shell,
        sourceSeasons: input.mixedEraContext,
        draftState: {
          controlledTeamAbbr: input.controlledTeamAbbr,
          rostersByTeam: {
            LAL: Array.from({ length: 10 }, (_, index) => ({ id: index + 1 }))
          },
          freeAgents: [],
          seasonState: {},
          postseasonState: {}
        },
        seasonState: {
          currentDay: 1
        },
        postseasonState: {
          phase: 'regular_season'
        }
      };
      return autoDraftHelperResult;
    }
  };
  autoDraftContext.window.RosterBateSimulationModeConfig = context.window.RosterBateSimulationModeConfig;
  autoDraftContext.window.RosterBateHistoricalPackLoader = context.window.RosterBateHistoricalPackLoader;
  autoDraftContext.window.RosterBateMixedEraRuntime = context.window.RosterBateMixedEraRuntime;

  vm.runInNewContext(inlineScript, autoDraftContext, { filename: 'rosterbate-simulation-setup.inline.js' });
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(typeof autoDraftContext.simDraftAndStartSeason, 'function', 'setup page should expose the auto-draft handoff function');
  let releaseAutoDraftLoad;
  autoDraftContext.window.RosterBateHistoricalPackLoader.loadPackById = function(packId){
    return new Promise((resolve) => {
      releaseAutoDraftLoad = function(){
        resolve({
          packId,
          season: {
            seasonLabel: mockCatalog.find((entry) => entry.packId === packId)?.seasonLabel || packId
          },
          players: Array.from({ length: 120 }, (_, index) => ({
            id: `${packId}-${index + 1}`,
            name: `${packId} Player ${index + 1}`
          }))
        });
      };
    });
  };
  const autoDraftPromise = autoDraftContext.simDraftAndStartSeason();
  assert.equal(autoDraftStatusNode.textContent, 'Building mixed-era player pool...', 'auto path should announce pool building before validation completes');
  assert.equal(autoDraftContinueButton.disabled, true, 'auto path should disable the manual CTA while work is in flight');
  assert.equal(autoDraftButtonNode.disabled, true, 'auto path should disable the auto CTA while work is in flight');
  assert.equal(autoDraftFranchiseSelect.disabled, true, 'auto path should disable franchise selection while work is in flight');
  assert.equal(autoDraftDraftSlotSelect.disabled, true, 'auto path should disable draft slot selection while work is in flight');
  assert.ok(autoDraftSeasonNodes.every((node) => node.disabled === true), 'auto path should disable all season inputs while work is in flight');
  releaseAutoDraftLoad();
  await autoDraftPromise;

  const completedWrites = autoDraftWrites.filter((entry) => entry.kind === 'completed');
  assert.equal(completedWrites.length, 1, 'setup page should write one completed simulation state');
  assert.equal(autoDraftHelperInput.controlledTeamAbbr, 'LAL', 'auto-draft path should forward the selected franchise');
  assert.deepStrictEqual(
    autoDraftHelperInput.mixedEraContext.sourcePackIds,
    ['nba_1987_full_season_v1', 'nba_1993_full_season_v1', 'nba_1996_full_season_v1'],
    'auto-draft path should forward the selected source seasons'
  );
  assert.equal(autoDraftHelperInput.shell.teams.length, 30, 'auto-draft path should forward the configured 30-team shell');
  assert.equal(autoDraftHelperInput.shell.rosterSize, 10, 'auto-draft path should forward the configured roster size');
  assert.strictEqual(completedWrites[0].state, autoDraftHelperResult, 'setup page should write the helper result unchanged');
  assert.equal(completedWrites[0].state.draftState.controlledTeamAbbr, 'LAL', 'auto-draft path should preserve the selected team');
  assert.equal(autoDraftStatusNode.textContent, 'Opening season manager...', 'auto path should announce the season handoff on success');
  assert.equal(autoDraftLocationState.href, 'rosterbate-season.html?sport=nba&simulation=nba_mixed_era', 'auto-draft path should enter the season shell directly');

  const failedAutoDraftStatusNode = { textContent: '' };
  const failedAutoDraftContinueButton = { disabled: false };
  const failedAutoDraftButtonNode = { disabled: false };
  const failedAutoDraftFranchiseSelect = { value: 'LAL', innerHTML: '', disabled: false };
  const failedAutoDraftDraftSlotSelect = { value: '4', innerHTML: '', disabled: false };
  const failedAutoDraftSeasonNodes = [
    { value: 'nba_1987_full_season_v1', checked: true, disabled: false },
    { value: 'nba_1993_full_season_v1', checked: true, disabled: false },
    { value: 'nba_1996_full_season_v1', checked: true, disabled: false }
  ];
  const failedAutoDraftLocationState = {
    href: 'rosterbate-simulation-setup.html?sport=nba',
    search: '?sport=nba'
  };
  let failedAutoDraftHelperInput = null;
  const failedAutoDraftContext = {
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
        if (id === 'simulationSetupStatus') return failedAutoDraftStatusNode;
        if (id === 'simulationContinueBtn') return failedAutoDraftContinueButton;
        if (id === 'simulationAutoDraftBtn') return failedAutoDraftButtonNode;
        if (id === 'simulationFranchiseSelect') return failedAutoDraftFranchiseSelect;
        if (id === 'simulationDraftSlotSelect') return failedAutoDraftDraftSlotSelect;
        if (id === 'simulationSourceSeasonList') return { innerHTML: '' };
        if (id === 'simulationHeroCopy') return { textContent: '' };
        if (id === 'simulationSourceCopy') return { textContent: '' };
        if (id === 'simulationShellChip') return { textContent: '' };
        if (id === 'simulationRosterChip') return { textContent: '' };
        if (id === 'simulationTeamLabel') return { textContent: '' };
        if (id === 'simulationDraftSlotLabel') return { textContent: '' };
        if (id === 'simulationDraftSlotHelper') return { textContent: '' };
        throw new Error(`Unknown element requested: ${id}`);
      },
      querySelectorAll(selector){
        if (selector === '#simulationSourceSeasonList input:checked') {
          return failedAutoDraftSeasonNodes.filter((node) => node.checked);
        }
        if (selector === '#simulationSourceSeasonList input') {
          return failedAutoDraftSeasonNodes;
        }
        throw new Error(`Unexpected selector requested: ${selector}`);
      }
    },
    localStorage: {
      setItem(){
        throw new Error('should not write setup payload during completed-draft failure test');
      }
    }
  };

  failedAutoDraftContext.window = failedAutoDraftContext;
  failedAutoDraftContext.window.location = failedAutoDraftLocationState;
  failedAutoDraftContext.window.RosterBateSimulationModeRuntime = {
    STORAGE_KEY: 'rbSimulationModeLocalState__fromRuntime',
    writeCompletedSimulationState(){
      throw new Error('quota exceeded');
    },
    buildCompletedSimulationAutoDraftState(input){
      failedAutoDraftHelperInput = input;
      return {
        simulationMode: 'nba_mixed_era_single_player_v1',
        leagueShell: input.shell,
        sourceSeasons: input.mixedEraContext,
        draftState: {
          controlledTeamAbbr: input.controlledTeamAbbr,
          rostersByTeam: {
            LAL: Array.from({ length: 10 }, (_, index) => ({ id: index + 1 }))
          },
          freeAgents: [],
          draftPool: [],
          teamCount: 1,
          rosterSize: 10
        },
        seasonState: {
          currentDay: 1
        },
        postseasonState: {
          phase: 'regular_season'
        }
      };
    }
  };
  failedAutoDraftContext.window.RosterBateSimulationModeConfig = context.window.RosterBateSimulationModeConfig;
  failedAutoDraftContext.window.RosterBateHistoricalPackLoader = context.window.RosterBateHistoricalPackLoader;
  failedAutoDraftContext.window.RosterBateMixedEraRuntime = context.window.RosterBateMixedEraRuntime;

  vm.runInNewContext(inlineScript, failedAutoDraftContext, { filename: 'rosterbate-simulation-setup.inline.js' });
  await Promise.resolve();
  await Promise.resolve();

  await failedAutoDraftContext.simDraftAndStartSeason();

  assert.equal(failedAutoDraftHelperInput.controlledTeamAbbr, 'LAL', 'auto-draft failure path should still build the completed simulation state before the write fails');
  assert.equal(failedAutoDraftStatusNode.textContent, 'quota exceeded', 'auto-draft failure path should surface the storage write error');
  assert.equal(failedAutoDraftLocationState.href, 'rosterbate-simulation-setup.html?sport=nba', 'auto-draft failure path should stay on setup when the completed state cannot be written');
  assert.equal(failedAutoDraftContinueButton.disabled, false, 'auto-draft failure path should re-enable the manual CTA');
  assert.equal(failedAutoDraftButtonNode.disabled, false, 'auto-draft failure path should re-enable the auto CTA');
  assert.equal(failedAutoDraftFranchiseSelect.disabled, false, 'auto-draft failure path should re-enable franchise selection');
  assert.equal(failedAutoDraftDraftSlotSelect.disabled, false, 'auto-draft failure path should re-enable draft slot selection');
  assert.ok(failedAutoDraftSeasonNodes.every((node) => node.disabled === false), 'auto-draft failure path should re-enable all season inputs');

  const nflSetupHtml = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-simulation-setup.html'), 'utf8');
  assert.match(nflSetupHtml, /2014 NFL shell/i, 'setup page should include nfl shell copy');

  const nflScriptMatches = Array.from(nflSetupHtml.matchAll(/<script>([\s\S]*?)<\/script>/g));
  const nflInlineScript = nflScriptMatches.length ? nflScriptMatches[nflScriptMatches.length - 1][1] : '';
  let nflSeasonNodes = [
    { value: 'nfl_2014_full_season_v1', checked: true, disabled: false }
  ];
  const nflFranchiseSelect = { value: 'DAL', innerHTML: '', disabled: false };
  const nflDraftSlotSelect = { value: '7', innerHTML: '', disabled: false };
  const nflContinueButton = { disabled: false };
  const nflAutoDraftButton = { disabled: false };
  const nflSourceSeasonList = { innerHTML: '' };
  const nflStatusNode = { textContent: '' };
  const nflHeroCopyNode = { textContent: '' };
  const nflSourceCopyNode = { textContent: '' };
  const nflShellChipNode = { textContent: '' };
  const nflRosterChipNode = { textContent: '' };
  const nflTeamLabelNode = { textContent: '' };
  const nflDraftSlotLabelNode = { textContent: '' };
  const nflDraftSlotHelperNode = { textContent: '' };
  const nflElementMap = {
    simulationContinueBtn: nflContinueButton,
    simulationAutoDraftBtn: nflAutoDraftButton,
    simulationFranchiseSelect: nflFranchiseSelect,
    simulationDraftSlotSelect: nflDraftSlotSelect,
    simulationSourceSeasonList: nflSourceSeasonList,
    simulationSetupStatus: nflStatusNode,
    simulationHeroCopy: nflHeroCopyNode,
    simulationSourceCopy: nflSourceCopyNode,
    simulationShellChip: nflShellChipNode,
    simulationRosterChip: nflRosterChipNode,
    simulationTeamLabel: nflTeamLabelNode,
    simulationDraftSlotLabel: nflDraftSlotLabelNode,
    simulationDraftSlotHelper: nflDraftSlotHelperNode
  };
  const nflStorageWrites = [];
  const nflMixedEraConfigCalls = [];
  const nflLocationState = { href: 'rosterbate-simulation-setup.html?sport=nfl', search: '?sport=nfl' };
  const nflMockCatalog = [
    { packId: 'nfl_2014_full_season_v1', seasonLabel: '2014', sport: 'nfl' },
    { packId: 'nba_1996_full_season_v1', seasonLabel: '1995-96', sport: 'nba' }
  ];
  const nflContext = {
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
        const node = nflElementMap[id];
        if (!node) throw new Error(`Unknown element requested: ${id}`);
        return node;
      },
      querySelectorAll(selector){
        if (selector === '#simulationSourceSeasonList input:checked') {
          return nflSeasonNodes.filter((node) => node.checked);
        }
        if (selector === '#simulationSourceSeasonList input') {
          return nflSeasonNodes;
        }
        throw new Error(`Unexpected selector requested: ${selector}`);
      }
    },
    localStorage: {
      setItem(key, value){
        nflStorageWrites.push({ key, value });
      }
    }
  };

  nflContext.window = nflContext;
  nflContext.window.location = nflLocationState;
  nflContext.window.RosterBateSimulationModeRuntime = {
    STORAGE_KEY: 'rbSimulationModeLocalState__fromRuntime',
    writeCompletedSimulationState(state){
      nflStorageWrites.push({ kind: 'completed', state });
      return state;
    },
    buildCompletedSimulationAutoDraftState(input){
      return {
        simulationMode: 'nfl_mixed_era_single_player_v1',
        leagueShell: input.shell,
        sourceSeasons: input.mixedEraContext,
        draftState: {
          controlledTeamAbbr: input.controlledTeamAbbr,
          rostersByTeam: {
            DAL: Array.from({ length: 13 }, (_, index) => ({ id: index + 1 }))
          },
          freeAgents: [],
          draftPool: [],
          teamCount: 1,
          rosterSize: 13
        },
        seasonState: {
          currentDay: 1
        },
        postseasonState: {
          phase: 'regular_season'
        }
      };
    }
  };
  nflContext.window.RosterBateSimulationModeConfig = {
    getSimulationShell(input){
      assert.equal(input?.sport, 'nfl', 'setup page should request the nfl shell when the sport query is nfl');
      return {
        sport: 'nfl',
        rosterSize: 13,
        teams: Array.from({ length: 32 }, (_, index) => ({
          abbr: index === 0 ? 'DAL' : `F${String(index + 1).padStart(2, '0')}`,
          name: index === 0 ? 'Dallas Cowboys' : `Football Team ${index + 1}`
        }))
      };
    }
  };
  nflContext.window.RosterBateHistoricalPackLoader = {
    loadCatalog(){
      return Promise.resolve(nflMockCatalog);
    },
    loadPackById(packId){
      return Promise.resolve({
        packId,
        season: {
          seasonLabel: nflMockCatalog.find((entry) => entry.packId === packId)?.seasonLabel || packId
        },
        players: Array.from({ length: 420 }, (_, index) => ({
          id: `${packId}-${index + 1}`,
          name: `${packId} Player ${index + 1}`
        }))
      });
    }
  };
  nflContext.window.RosterBateMixedEraRuntime = {
    buildMixedEraDraftContextFromBundles(input){
      const bundles = Array.isArray(input?.bundles) ? input.bundles : [];
      const topPlayersPerPack = Number(input?.config?.topPlayersPerPack || 0);
      nflMixedEraConfigCalls.push(input?.config || null);
      return {
        mixedEraConfigId: 'simulation_custom_mix',
        sourcePackIds: bundles.map((bundle) => bundle.packId),
        sourceSeasonLabels: bundles.map((bundle) => bundle?.season?.seasonLabel || bundle.packId),
        playerPool: bundles.flatMap((bundle) => {
          const players = Array.isArray(bundle?.players) ? bundle.players : [];
          return Number.isFinite(topPlayersPerPack) && topPlayersPerPack > 0
            ? players.slice(0, topPlayersPerPack)
            : players;
        })
      };
    }
  };

  vm.runInNewContext(nflInlineScript, nflContext, { filename: 'rosterbate-simulation-setup.inline.nfl.js' });
  await Promise.resolve();
  await Promise.resolve();

  assert.match(nflSetupHtml, /2014 NFL shell/i, 'setup page hero copy should mention the nfl shell');
  assert.equal(nflSourceSeasonList.innerHTML.includes('nfl_2014_full_season_v1'), true, 'setup page should render nfl catalog entries');
  assert.equal(nflSourceSeasonList.innerHTML.includes('nba_1996_full_season_v1'), false, 'setup page should filter out nba entries when sport is nfl');
  assert.equal(nflFranchiseSelect.innerHTML.includes('Dallas Cowboys'), true, 'setup page should render nfl franchises from the nfl shell');
  assert.equal(nflHeroCopyNode.textContent.includes('historical NFL seasons'), true, 'setup page should render nfl-specific hero copy');
  assert.equal(nflShellChipNode.textContent, '2014 NFL shell', 'setup page should render the nfl shell chip');
  assert.equal(nflRosterChipNode.textContent, '13-slot football roster', 'setup page should render the nfl roster chip');
  assert.equal(nflDraftSlotLabelNode.textContent, 'Manual Draft Slot Only', 'setup page should render the nfl draft slot label');

  await nflContext.enterSimulationDraft();

  assert.equal(nflStorageWrites.length, 1, 'nfl setup page should persist one simulation setup payload');
  const nflSavedPayload = JSON.parse(nflStorageWrites[0].value);
  assert.deepStrictEqual(nflSavedPayload.sourcePackIds, ['nfl_2014_full_season_v1'], 'nfl payload should capture only the nfl source pack');
  assert.equal(nflSavedPayload.mode, 'nfl_mixed_era_single_player_v1', 'nfl payload should use the nfl simulation mode id');
  assert.equal(nflSavedPayload.controlledTeamAbbr, 'DAL', 'nfl payload should store the selected franchise');
  assert.ok(nflMixedEraConfigCalls.every((config) => Number(config?.topPlayersPerPack) === 416), 'nfl setup preview should derive a 416-player pack cap from the football shell requirement');
  assert.equal(nflLocationState.href, 'rosterbate-draft.html?sport=nfl&simulation=nfl_mixed_era', 'nfl setup page should navigate into the nfl simulation draft flow');

  console.log('simulation setup page test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
