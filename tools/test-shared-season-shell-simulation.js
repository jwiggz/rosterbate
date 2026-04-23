const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-season.html'), 'utf8');
const adapterSource = fs.readFileSync(path.join(__dirname, '..', 'simulation-season-adapter.js'), 'utf8');

function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function extractBetween(startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  assert.notEqual(start, -1, `expected to find start marker: ${startMarker}`);
  const end = html.indexOf(endMarker, start);
  assert.notEqual(end, -1, `expected to find end marker: ${endMarker}`);
  return html.slice(start, end);
}

const harnessSource = `
${extractBetween('const DEFAULT_PAGES=', 'let CURRENT_SPORT =')}
${extractBetween('function getRequestedSimulationMode(', 'function loadHistoricalUniverseSlotState(')}
${extractBetween('function loadHistoricalUniverseSlotState(', 'function shouldBootHistoricalDevSeason(')}
${extractBetween('function isHistoricalSimulationUniverse(', 'function isHistoricalDraftUniverse(')}
${extractBetween('function setSeasonSidePanelVisible(', 'function buildPowerupCardsHtml(')}
${extractBetween('function setHubSummaryStatLabels(', 'function persistSimulationSeasonState(')}
${extractBetween('function persistSimulationSeasonState(', 'function buildPowerupCardsHtml(')}
${extractBetween('function renderSimulationHubInSharedShell(', 'function renderSimulationWaiverInSharedShell(')}
${extractBetween('function renderSimulationWaiverInSharedShell(', 'function claimSimulationFreeAgentFromShell(')}
${extractBetween('function claimSimulationFreeAgentFromShell(', 'function renderSimulationTradesInSharedShell(')}
${extractBetween('function renderSimulationTradesInSharedShell(', 'function applySimulationTradeFromShell(')}
${extractBetween('function applySimulationTradeFromShell(', 'function renderSimulationStandingsInSharedShell(')}
${extractBetween('function renderSimulationStandingsInSharedShell(', 'function renderSimulationRosterInSharedShell(')}
${extractBetween('function applySimulationSuggestedLineupFromShell(', 'function renderSimulationRosterInSharedShell(')}
${extractBetween('function renderSimulationRosterInSharedShell(', 'function renderSimulationScheduleInSharedShell(')}
${extractBetween('function renderSimulationScheduleInSharedShell(', 'function renderActiveSeasonScreen(')}
${extractBetween('async function loadDemo(', 'function isDemoSeasonData(')}

function bootSeasonShellForTest(search){
  applySportContext(CURRENT_SPORT);
  const urlParams = new URLSearchParams(search || '');
  const leagueId = urlParams.get('league');
  const requestedSport = normalizeRosterbateSport(urlParams.get('sport') || CURRENT_SPORT);
  const requestedHistoricalUniverse = getRequestedHistoricalUniverseSlotId(urlParams);
  const completedSimulationDraftBoot = resolveCompletedSimulationDraftSeasonBoot(urlParams, requestedSport);
  ACTIVE_SEASON_MODE = 'fantasy';
  SEASON_MODE_ADAPTER = null;
  if (leagueId && leagueId !== 'demo') hideSeasonEmptyState();
  else setSeasonEmptyState('idle');

  if (completedSimulationDraftBoot?.redirected && completedSimulationDraftBoot.redirectUrl) {
    return {
      redirected: true,
      activeSeasonMode: ACTIVE_SEASON_MODE,
      hasAdapter: !!SEASON_MODE_ADAPTER,
      emptyState: getSeasonEmptyStateForTest()
    };
  }

  if (completedSimulationDraftBoot?.state && completedSimulationDraftBoot.rawState) {
    ACTIVE_SEASON_MODE = 'simulation';
    SEASON_MODE_ADAPTER = buildSimulationSeasonAdapterFromState(
      completedSimulationDraftBoot.slotId,
      completedSimulationDraftBoot.rawState
    );
    return {
      redirected: false,
      activeSeasonMode: ACTIVE_SEASON_MODE,
      hasAdapter: !!SEASON_MODE_ADAPTER,
      emptyState: getSeasonEmptyStateForTest()
    };
  }

  if (requestedHistoricalUniverse) {
    const slotState = loadHistoricalUniverseSlotState(requestedHistoricalUniverse, requestedSport);
    if (slotState) {
      const sharedSimulationSeason = isSharedSimulationSeason(urlParams, slotState);
      ACTIVE_SEASON_MODE = sharedSimulationSeason ? 'simulation' : 'fantasy';
      SEASON_MODE_ADAPTER = sharedSimulationSeason
        ? buildSimulationSeasonAdapterFromState(requestedHistoricalUniverse, slotState)
        : null;
      return {
        redirected: false,
        activeSeasonMode: ACTIVE_SEASON_MODE,
        hasAdapter: !!SEASON_MODE_ADAPTER,
        emptyState: getSeasonEmptyStateForTest()
      };
    }
  }

  let raw = null;
  try{ raw = localStorage.getItem('rosterbateDraft'); }catch(e){}
  if(raw){
    try{
      const parsed = JSON.parse(raw);
      const localAutoLoad = resolveLocalSavedSeasonAutoLoad(parsed, requestedSport);
      if(localAutoLoad){
        ACTIVE_SEASON_MODE = localAutoLoad.activeSeasonMode;
        SEASON_MODE_ADAPTER = localAutoLoad.adapter;
      }
    }catch(e){}
  }

  return {
    redirected: false,
    activeSeasonMode: ACTIVE_SEASON_MODE,
    hasAdapter: !!SEASON_MODE_ADAPTER,
    emptyState: getSeasonEmptyStateForTest()
  };
}

module.exports = {
  getRequestedSimulationMode,
  getRequestedHistoricalUniverseSlotId,
  readCompletedSimulationDraftState,
  resolveCompletedSimulationDraftSeasonBoot,
  consumeCompletedSimulationDraftFallbackBoot,
  isSharedSimulationSeason,
  shouldPersistSharedSimulationState,
  getActiveSeasonPages,
  getActiveSeasonLabels,
  loadHistoricalUniverseSlotState,
  normalizeSharedSimulationSeasonBootState,
  buildSharedSimulationPersistenceState,
  persistHistoricalUniverseSlotSnapshot,
  persistSimulationSeasonState,
  renderSimulationHubInSharedShell,
  renderSimulationRosterInSharedShell,
  renderSimulationScheduleInSharedShell,
  renderSimulationWaiverInSharedShell,
  renderSimulationTradesInSharedShell,
  renderSimulationStandingsInSharedShell,
  claimSimulationFreeAgentFromShell,
  applySimulationTradeFromShell,
  applySimulationSuggestedLineupFromShell,
  resolveLocalSavedSeasonAutoLoad,
  bootSeasonShellForTest,
  loadDemo,
  setActiveSeasonMode(value){ ACTIVE_SEASON_MODE = value; },
  getActiveSeasonMode(){ return ACTIVE_SEASON_MODE; },
  setSeasonModeAdapter(value){ SEASON_MODE_ADAPTER = value; },
  getSeasonModeAdapter(){ return SEASON_MODE_ADAPTER; },
  setData(value){ D = value; },
  getData(){ return D; },
  setGame(value){ G = value; },
  getGame(){ return G; }
};
`;

function createElement(id) {
  const shell = { style: {} };
  return {
    id,
    textContent: '',
    innerHTML: '',
    style: {},
    value: '',
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
      this[name] = value;
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    closest(selector) {
      return selector === '.season-screen-shell' ? shell : null;
    },
    _shell: shell
  };
}

const elements = Object.fromEntries([
  'hubLeagueName',
  'hubName',
  'hubRec',
  'hubCycleMeta',
  'hubFormat',
  'hubScoringType',
  'hubTeamCount',
  'hubOpp',
  'hubProj',
  'hubOppProj',
  'hubStreak',
  'hubOppLabel',
  'hubProjLabel',
  'hubOppProjLabel',
  'hubStreakLabel',
  'hubSettingsLink',
  'hubSettingsDivider',
  'hubLeagueTeamsButton',
  'hubMatchupsTitle',
  'hubMatchupActionTitle',
  'hubMatchupActionSub',
  'rosterScheduleChip',
  'matchupTitle',
  'matchupNote',
  'advBtn',
  'hubMatchups',
  'rWk',
  'rosterContent',
  'rosterPowerups',
  'mWk',
  'matchupContent',
  'matchupPowerups',
  'waiverContent',
  'waiverPowerups',
  'tradesContent',
  'tradesPowerups',
  'standingsContent',
  'standingsPowerups'
].map((id) => [id, createElement(id)]));

const sandboxConsole = {
  ...console,
  warn() {}
};

let persistedReason = null;
let completedDraftState = null;
let completedDraftClearCount = 0;
let completedDraftUpsertInput = null;
let completedDraftUpsertOptions = null;
let completedDraftUpsertError = null;
let createdSimulationAdapters = [];
let historicalSlotUpsertCalls = [];
let demoInitCalls = 0;
let demoViewCalls = 0;
let demoToasts = [];
let lastEmptyState = null;
const simulationAdapterStub = {
  getState() {
    return {
      simulationMode: 'nba_mixed_era_single_player_v1',
      historicalUniverseSlotId: 'sim-slot-1',
      leagueShell: { teams: [{ abbr: 'LAL' }, { abbr: 'BOS' }, { abbr: 'CHI' }] },
      draftState: {
        controlledTeamAbbr: 'LAL',
        rostersByTeam: {
          LAL: [
            { id: 34, name: 'Hakeem Olajuwon', team: 'HOU', pos: 'C' },
            { id: 23, name: 'Michael Jordan', team: 'CHI', pos: 'SG' }
          ],
          BOS: [
            { id: 30, name: 'Stephen Curry', team: 'GSW', pos: 'PG' }
          ],
          CHI: []
        },
        freeAgents: [
          { id: 33, name: 'Scottie Pippen', team: 'CHI', pos: 'SF' }
        ]
      },
      seasonState: {
        currentDay: 12,
        currentWeek: 2,
        standings: [
          { teamIdx: 0, teamAbbr: 'LAL', conference: 'West', division: 'Pacific', w: 9, l: 3, pf: 1360, pa: 1288 },
          { teamIdx: 1, teamAbbr: 'BOS', conference: 'East', division: 'Atlantic', w: 7, l: 5, pf: 1299, pa: 1274 },
          { teamIdx: 2, teamAbbr: 'CHI', conference: 'East', division: 'Central', w: 5, l: 7, pf: 1180, pa: 1210 }
        ],
        lineupIdsByTeam: {
          LAL: [23],
          BOS: [30],
          CHI: []
        }
      }
    };
  },
  getHubViewModel() {
    return {
      leagueLabel: '2025-26 NBA Simulation',
      shellLabel: '1995-96 + 2015-16 Mixed Era Shell',
      controlledTeam: { abbr: 'LAL', name: 'Los Angeles Lakers' },
      userRow: { w: 9, l: 3, streak: 'W3' },
      recordLabel: '9-3',
      primaryAction: { label: 'Sim Day' },
      sourceSeasonLabels: ['1986-87', '1995-96', '2015-16']
    };
  },
  getScheduleViewModel() {
    return {
      title: 'Schedule / Results',
      cycleLabel: 'Day 12 - Week 2',
      recentResults: [
        { awayAbbr: 'BOS', awayScore: 108, homeAbbr: 'LAL', homeScore: 112 }
      ]
    };
  },
  getRosterViewModel() {
    return {
      roster: [
        { id: 34, name: 'Hakeem Olajuwon', team: 'HOU', pos: 'C' },
        { id: 23, name: 'Michael Jordan', team: 'CHI', pos: 'SG' }
      ],
      lineup: [
        { id: 23, name: 'Michael Jordan', team: 'CHI', pos: 'SG' }
      ],
      bench: [
        { id: 34, name: 'Hakeem Olajuwon', team: 'HOU', pos: 'C' }
      ]
    };
  },
  getWaiverViewModel() {
    return {
      availablePlayers: [
        { id: 33, name: 'Scottie Pippen', team: 'CHI', pos: 'SF' }
      ]
    };
  },
  getTradeViewModel() {
    return {
      tradePartners: [
        { abbr: 'BOS', name: 'Boston Celtics' }
      ],
      outgoingRoster: [
        { id: 34, name: 'Hakeem Olajuwon' }
      ],
      incomingRostersByTeam: {
        BOS: [
          { id: 30, name: 'Stephen Curry' }
        ]
      }
    };
  },
  getStandingsViewModel() {
    return {
      rows: [
        { teamAbbr: 'LAL', w: 9, l: 3 },
        { teamAbbr: 'BOS', w: 7, l: 5 }
      ]
    };
  },
  claimFreeAgent(move) {
    this.lastClaim = move;
    return {};
  },
  applyTrade(trade) {
    this.lastTrade = trade;
    return {};
  },
  setLineup(lineupIds) {
    this.lastLineupIds = lineupIds;
    return this.getState();
  }
};

const sandbox = {
  module: { exports: {} },
  exports: {},
  console: sandboxConsole,
  CURRENT_SPORT: 'nba',
  URLSearchParams,
  normalizeRosterbateSport(value) {
    return String(value || 'nba').trim().toLowerCase() || 'nba';
  },
  applySportContext() {},
  hideSeasonEmptyState() {
    lastEmptyState = 'hidden';
  },
  setSeasonEmptyState(value) {
    lastEmptyState = String(value || '');
  },
  getSeasonEmptyStateForTest() {
    return lastEmptyState;
  },
  persistHistoricalUniverseSlotSnapshot(reason) {
    persistedReason = reason;
  },
  localStorage: {
    setItem() {},
    getItem() { return null; }
  },
  getRosterbateDemoData() {
    return {
      sport: 'nba',
      leagueName: 'Demo League',
      leagueSize: 2,
      myPos: 0,
      teams: ['Demo A', 'Demo B'],
      allRosters: [
        [{ id: 1, name: 'Demo Player 1', team: 'AAA', pos: 'PG' }],
        [{ id: 2, name: 'Demo Player 2', team: 'BBB', pos: 'SG' }]
      ],
      ilRosters: [[], []],
      freeAgents: [],
      waiver: [],
      standings: [
        { teamIdx: 0, teamAbbr: 'AAA', w: 0, l: 0, pf: 0, pa: 0 },
        { teamIdx: 1, teamAbbr: 'BBB', w: 0, l: 0, pf: 0, pa: 0 }
      ]
    };
  },
  initSeason() {
    demoInitCalls += 1;
    if (sandbox.module.exports.getActiveSeasonMode() === 'simulation' && !sandbox.module.exports.getSeasonModeAdapter()) {
      throw new Error('simulation adapter missing');
    }
  },
  applyRequestedSeasonView() {
    demoViewCalls += 1;
  },
  toast(message) {
    demoToasts.push(String(message || ''));
  },
  document: {
    getElementById(id) {
      if (!elements[id]) {
        elements[id] = createElement(id);
      }
      return elements[id];
    }
  },
  window: {
    RosterBateHistoricalUniverseSlots: {
      upsertFromState(state, options) {
        historicalSlotUpsertCalls.push({
          state: toPlain(state),
          options: toPlain(options)
        });
        completedDraftUpsertInput = toPlain(state);
        completedDraftUpsertOptions = toPlain(options);
        if (completedDraftUpsertError) {
          throw completedDraftUpsertError;
        }
        return {
          slotId: 'sim-slot-from-completed-draft',
          state: {
            ...toPlain(state),
            historicalUniverseSlotId: 'sim-slot-from-completed-draft'
          }
        };
      },
      buildSeasonUrl(slot, sport) {
        return `rosterbate-season.html?sport=${encodeURIComponent(String(sport || 'nba'))}&simulation=nba_mixed_era&historicalUniverse=${encodeURIComponent(String(slot?.slotId || ''))}`;
      }
    },
    RosterBateSimulationModeRuntime: {
      readCompletedSimulationState() {
        return completedDraftState ? toPlain(completedDraftState) : null;
      },
      clearCompletedSimulationState() {
        completedDraftClearCount += 1;
        completedDraftState = null;
        return true;
      }
    },
    RosterBateSimulationSeasonAdapter: {
      isSupportedSimulationSeasonState(state) {
        return String(state?.simulationMode || '').trim().toLowerCase() === 'nba_mixed_era_single_player_v1';
      },
      createSimulationSeasonAdapter(options) {
        createdSimulationAdapters.push(toPlain(options));
        return simulationAdapterStub;
      }
    }
  }
};

vm.createContext(sandbox);
vm.runInContext(harnessSource, sandbox, { filename: 'season-shared-simulation-helpers.vm.js' });

const api = sandbox.module.exports;

assert.match(html, /simulation-season-adapter\.js/, 'season shell should load the simulation adapter');
assert.match(html, /function renderSimulationHubInSharedShell\(/, 'season shell should add a simulation hub renderer');
assert.match(html, /function renderSimulationRosterInSharedShell\(/, 'season shell should add a simulation roster renderer');
assert.match(html, /function renderSimulationScheduleInSharedShell\(/, 'season shell should add a simulation schedule renderer');
assert.match(html, /function renderSimulationWaiverInSharedShell\(/, 'season shell should add a simulation waiver renderer');
assert.match(html, /function renderSimulationTradesInSharedShell\(/, 'season shell should add a simulation trade renderer');
assert.match(html, /function renderSimulationStandingsInSharedShell\(/, 'season shell should add a simulation standings renderer');
assert.match(html, /function applySimulationSuggestedLineupFromShell\(/, 'season shell should expose a simulation lineup action helper');
assert.match(html, /SEASON_MODE_ADAPTER\.setLineup\(/, 'simulation lineup action should flow through the adapter');
assert.match(html, /persistSimulationSeasonState\('simulation_lineup'\)/, 'simulation lineup action should persist shared state');
assert.match(adapterSource, /RosterBateSimulationModeRuntime\.claimSimulationFreeAgent/, 'adapter should explicitly bind browser waiver mutations to RosterBateSimulationModeRuntime.claimSimulationFreeAgent');
assert.match(adapterSource, /RosterBateSimulationModeRuntime\.applySimulationTrade/, 'adapter should explicitly bind browser trade mutations to RosterBateSimulationModeRuntime.applySimulationTrade');
assert.match(adapterSource, /RosterBateSimulationModeRuntime\.setSimulationLineup/, 'adapter should explicitly bind browser lineup mutations to RosterBateSimulationModeRuntime.setSimulationLineup');
assert.match(html, /function renderActiveSeasonScreen\(/, 'season shell should centralize mode-aware screen rendering');
assert.match(html, /if \(ACTIVE_SEASON_MODE === 'simulation'\) return renderSimulationHubInSharedShell\(\);/, 'renderHub should branch into simulation rendering');
assert.match(html, /if \(ACTIVE_SEASON_MODE === 'simulation'\) return renderSimulationRosterInSharedShell\(\);/, 'renderRoster should branch into simulation rendering');
assert.match(html, /if \(ACTIVE_SEASON_MODE === 'simulation'\) return renderSimulationScheduleInSharedShell\(\);/, 'renderMatchup should branch into simulation rendering');
assert.match(html, /function renderWaiver\(\)\{\s*if \(ACTIVE_SEASON_MODE === 'simulation'\) return renderSimulationWaiverInSharedShell\(\);/, 'renderWaiver should branch into simulation rendering before fantasy waiver logic');
assert.match(html, /SEASON_MODE_ADAPTER\.simulateNextDay\(\)/, 'Sim Day should flow through the adapter');
assert.match(html, /id="hubOppLabel"/, 'hub markup should expose a label node for the first simulation stat');
assert.match(html, /id="hubProjLabel"/, 'hub markup should expose a label node for the second simulation stat');
assert.match(html, /id="hubOppProjLabel"/, 'hub markup should expose a label node for the third simulation stat');
assert.match(html, /id="hubSettingsLink"/, 'hub markup should expose a settings link node for mode-specific behavior');
assert.match(html, /id="hubLeagueTeamsButton"/, 'hub markup should expose the league teams button for mode-specific behavior');
assert.match(html, /id="hubMatchupsTitle"/, 'hub markup should expose the matchup results card title');
assert.match(html, /id="hubMatchupActionTitle"/, 'hub markup should expose the hub matchup action title');
assert.match(html, /id="rosterScheduleChip"/, 'roster markup should expose the schedule chip for mode-specific copy');
assert.match(html, /id="matchupTitle"/, 'schedule screen title should be targetable for simulation mode');

const params = new URLSearchParams('?simulation=NBA_Mixed_Era&historicalUniverse=sim-slot-1');
assert.equal(api.getRequestedSimulationMode(params), 'nba_mixed_era', 'simulation query param should normalize to lowercase');
assert.equal(
  api.getRequestedHistoricalUniverseSlotId(new URLSearchParams('?slot=legacy-slot')),
  'legacy-slot',
  'historical slot helper should support slot alias fallback'
);
assert.match(html, /function resolveCompletedSimulationDraftSeasonBoot\(/, 'season shell should expose a completed-draft handoff helper');
assert.match(html, /const completedSimulationDraftBoot = resolveCompletedSimulationDraftSeasonBoot\(urlParams, requestedSport\);/, 'season shell should check runtime completed-draft handoffs during boot');
assert.match(html, /function consumeCompletedSimulationDraftFallbackBoot\(/, 'season shell should expose a fallback-handoff consumption helper');

const fixture = {
  simulationMode: 'nba_mixed_era_single_player_v1',
  leagueShell: {
    sport: 'nba',
    anchorSeasonLabel: '2025-26 NBA',
    teams: [
      { abbr: 'LAL', name: 'Los Angeles Lakers', conference: 'West', division: 'Pacific' },
      { abbr: 'BOS', name: 'Boston Celtics', conference: 'East', division: 'Atlantic' }
    ]
  },
  draftState: {
    controlledTeamAbbr: 'LAL',
    rostersByTeam: {
      LAL: [{ id: 23, name: 'Michael Jordan', pos: 'SG' }],
      BOS: [{ id: 30, name: 'Stephen Curry', pos: 'PG' }]
    },
    freeAgents: [{ id: 34, name: 'Hakeem Olajuwon', pos: 'C' }]
  },
  seasonState: {
    currentDay: 12,
    currentWeek: 2,
    standings: [
      { teamIdx: 0, teamAbbr: 'LAL', conference: 'West', division: 'Pacific', w: 9, l: 3, pf: 1360, pa: 1288 },
      { teamIdx: 1, teamAbbr: 'BOS', conference: 'East', division: 'Atlantic', w: 7, l: 5, pf: 1299, pa: 1274 }
    ],
    activityLog: [{ type: 'trade', summary: 'Fixture log entry' }]
  }
};
completedDraftState = fixture;
completedDraftClearCount = 0;
completedDraftUpsertInput = null;
completedDraftUpsertOptions = null;
completedDraftUpsertError = null;

const completedDraftRedirect = toPlain(
  api.resolveCompletedSimulationDraftSeasonBoot(new URLSearchParams('?sport=nba&simulation=nba_mixed_era'), 'nba')
);

assert.equal(completedDraftRedirect.redirected, true, 'completed-draft handoff should prefer a canonical slot-backed redirect');
assert.equal(completedDraftRedirect.slotId, 'sim-slot-from-completed-draft', 'completed-draft handoff should capture the created slot id');
assert.equal(
  completedDraftRedirect.redirectUrl,
  'rosterbate-season.html?sport=nba&simulation=nba_mixed_era&historicalUniverse=sim-slot-from-completed-draft',
  'completed-draft handoff should produce the canonical season-shell URL'
);
assert.equal(completedDraftClearCount, 1, 'completed-draft handoff should clear the one-shot runtime payload after slot persistence succeeds');
assert.equal(completedDraftUpsertOptions.reason, 'simulation_completed_draft_handoff', 'completed-draft handoff should label the slot write reason');
assert.equal(completedDraftUpsertInput.draftState.controlledTeamAbbr, 'LAL', 'completed-draft handoff should persist the completed simulation state');

completedDraftState = {
  simulationMode: 'nba_mixed_era_single_player_v1',
  leagueShell: {
    sport: 'nba',
    teams: [
      { abbr: 'LAL', name: 'Los Angeles Lakers', conference: 'West', division: 'Pacific' },
      { abbr: 'BOS', name: 'Boston Celtics', conference: 'East', division: 'Atlantic' }
    ]
  },
  draftState: {
    controlledTeamAbbr: 'LAL',
    rostersByTeam: {
      LAL: [{ id: 23, name: 'Michael Jordan', pos: 'SG' }],
      BOS: [{ id: 30, name: 'Stephen Curry', pos: 'PG' }]
    },
    freeAgents: [{ id: 34, name: 'Hakeem Olajuwon', pos: 'C' }]
  },
  seasonState: {
    currentDay: 12,
    currentWeek: 2,
    standings: [
      { teamIdx: 0, teamAbbr: 'LAL', conference: 'West', division: 'Pacific', w: 9, l: 3, pf: 1360, pa: 1288 },
      { teamIdx: 1, teamAbbr: 'BOS', conference: 'East', division: 'Atlantic', w: 7, l: 5, pf: 1299, pa: 1274 }
    ]
  }
};
completedDraftClearCount = 0;
completedDraftUpsertInput = null;
completedDraftUpsertOptions = null;
completedDraftUpsertError = new Error('quota exceeded');

const completedDraftFallback = toPlain(
  api.resolveCompletedSimulationDraftSeasonBoot(new URLSearchParams('?sport=nba&simulation=nba_mixed_era'), 'nba')
);

assert.equal(completedDraftFallback.redirected, false, 'completed-draft handoff should fall back to direct boot when slot persistence fails');
assert.equal(completedDraftFallback.redirectUrl, '', 'fallback handoff should skip redirecting when slot persistence fails');
assert.equal(completedDraftFallback.shouldConsumeAfterBoot, true, 'fallback handoff should mark the completed draft payload for one-shot consumption after a successful boot');
assert.equal(completedDraftFallback.slotId, null, 'fallback handoff should boot without a slot when no slot could be created');
assert.equal(completedDraftFallback.state.seasonId, 'simulation:shared-season', 'fallback handoff should normalize the raw simulation state into the shared shell boot shape');
assert.equal(completedDraftFallback.state.allRosters[0][0].name, 'Michael Jordan', 'fallback handoff should preserve completed-draft rosters');
assert.equal(completedDraftClearCount, 0, 'fallback handoff should keep the runtime payload available when slot persistence fails');
assert.equal(
  api.consumeCompletedSimulationDraftFallbackBoot(completedDraftFallback),
  true,
  'fallback handoff should be clearable after the season shell establishes its own resume state'
);
assert.equal(completedDraftClearCount, 1, 'fallback handoff consumption should clear the one-shot runtime payload after a successful boot');
assert.equal(
  api.resolveCompletedSimulationDraftSeasonBoot(new URLSearchParams('?sport=nba&simulation=nba_mixed_era'), 'nba'),
  null,
  'a consumed fallback handoff should not win on a second visit'
);

assert.equal(
  api.resolveCompletedSimulationDraftSeasonBoot(new URLSearchParams('?sport=nba&simulation=nba_mixed_era&historicalUniverse=existing-slot'), 'nba'),
  null,
  'completed-draft handoff should not override an explicit historical universe slot'
);

api.setActiveSeasonMode('fantasy');
api.setSeasonModeAdapter(null);
assert.deepEqual(
  toPlain(api.getActiveSeasonPages()),
  ['hub', 'roster', 'matchup', 'waiver', 'trades', 'standings', 'commissioner'],
  'fantasy mode should keep the legacy season pages'
);
assert.equal(api.getActiveSeasonLabels().matchup, 'Matchup', 'fantasy mode should keep the legacy matchup label');

api.setActiveSeasonMode('simulation');
api.setSeasonModeAdapter(null);
assert.deepEqual(
  toPlain(api.getActiveSeasonPages()),
  ['hub', 'roster', 'matchup', 'waiver', 'trades', 'standings'],
  'simulation mode should hide commissioner by default'
);
assert.equal(api.getActiveSeasonLabels().matchup, 'Schedule', 'simulation mode should rename matchup to schedule');

api.setSeasonModeAdapter({
  getNavItems() {
    return [
      { id: 'hub', label: 'Overview' },
      { id: 'roster', label: 'Lineups' },
      { id: 'matchup', label: 'Schedule' }
    ];
  }
});
assert.deepEqual(
  toPlain(api.getActiveSeasonPages()),
  ['hub', 'roster', 'matchup'],
  'season pages should defer to adapter nav items when available'
);
assert.deepEqual(
  toPlain(api.getActiveSeasonLabels()),
  { hub: 'Overview', roster: 'Lineups', matchup: 'Schedule' },
  'season labels should be derived from adapter nav items when available'
);

api.setSeasonModeAdapter(simulationAdapterStub);
api.setActiveSeasonMode('simulation');
api.setData({
  leagueShell: {
    teams: [{ abbr: 'LAL' }, { abbr: 'BOS' }, { abbr: 'CHI' }]
  },
  draftState: {
    controlledTeamAbbr: 'LAL'
  }
});

api.renderSimulationHubInSharedShell();
assert.equal(elements.hubLeagueName.textContent, '2025-26 NBA Simulation');
assert.equal(elements.hubFormat.textContent, '1995-96 + 2015-16 Mixed Era Shell');
assert.equal(elements.hubScoringType.textContent, 'Simulated NBA Results');
assert.equal(elements.hubTeamCount.textContent, '3');
assert.equal(elements.hubOpp.textContent, '9-3');
assert.equal(elements.hubOppLabel.textContent, 'Record');
assert.equal(elements.hubProj.textContent, 'LAL');
assert.equal(elements.hubProjLabel.textContent, 'Team');
assert.equal(elements.hubOppProj.textContent, '1986-87 + 1995-96 + 2015-16');
assert.equal(elements.hubOppProjLabel.textContent, 'Source Seasons');
assert.equal(elements.hubSettingsLink.textContent, 'Settings');
assert.equal(elements.hubSettingsLink.style.display, 'none');
assert.equal(elements.hubSettingsDivider.style.display, 'none');
assert.equal(elements.hubLeagueTeamsButton.style.display, '');
assert.equal(elements.hubMatchupsTitle.textContent, 'Recent Results');
assert.equal(elements.hubMatchupActionTitle.textContent, 'Schedule');
assert.match(elements.hubMatchupActionSub.textContent, /recent results/i);
assert.match(elements.hubMatchups.innerHTML, /BOS 108 at LAL 112/);

api.renderSimulationRosterInSharedShell();
assert.equal(elements.rosterPowerups.style.display, 'none');
assert.equal(elements.rosterPowerups._shell.style.gridTemplateColumns, 'minmax(0,1fr)');
assert.equal(elements.rosterScheduleChip.textContent, 'Schedule');
assert.match(elements.rosterContent.innerHTML, /Use Suggested Starters/);
assert.match(elements.rosterContent.innerHTML, /Starters/);
assert.match(elements.rosterContent.innerHTML, /Bench/);
assert.match(elements.rosterContent.innerHTML, /Michael Jordan/);
assert.match(elements.rosterContent.innerHTML, /No starters locked in yet|Michael Jordan/);

historicalSlotUpsertCalls = [];
api.applySimulationSuggestedLineupFromShell();
assert.deepStrictEqual(toPlain(simulationAdapterStub.lastLineupIds), [34]);

const freshRosterAdapterStub = {
  ...simulationAdapterStub,
  lastLineupIds: null,
  getRosterViewModel() {
    return {
      roster: [
        { id: 1, name: 'Player 1', team: 'AAA', pos: 'PG' },
        { id: 2, name: 'Player 2', team: 'AAA', pos: 'SG' },
        { id: 3, name: 'Player 3', team: 'AAA', pos: 'SF' },
        { id: 4, name: 'Player 4', team: 'AAA', pos: 'PF' },
        { id: 5, name: 'Player 5', team: 'AAA', pos: 'C' },
        { id: 6, name: 'Player 6', team: 'AAA', pos: 'G' }
      ],
      lineup: [],
      bench: [
        { id: 1, name: 'Player 1', team: 'AAA', pos: 'PG' },
        { id: 2, name: 'Player 2', team: 'AAA', pos: 'SG' },
        { id: 3, name: 'Player 3', team: 'AAA', pos: 'SF' },
        { id: 4, name: 'Player 4', team: 'AAA', pos: 'PF' },
        { id: 5, name: 'Player 5', team: 'AAA', pos: 'C' },
        { id: 6, name: 'Player 6', team: 'AAA', pos: 'G' }
      ]
    };
  },
  setLineup(lineupIds) {
    this.lastLineupIds = lineupIds;
    return this.getState();
  }
};

historicalSlotUpsertCalls = [];
api.setSeasonModeAdapter(freshRosterAdapterStub);
api.applySimulationSuggestedLineupFromShell();
assert.deepStrictEqual(
  toPlain(freshRosterAdapterStub.lastLineupIds),
  [1, 2, 3, 4, 5],
  'fresh shared-shell simulation teams should get a five-player suggested lineup'
);
api.setSeasonModeAdapter(simulationAdapterStub);

api.renderSimulationScheduleInSharedShell();
assert.equal(elements.matchupPowerups.style.display, 'none');
assert.equal(elements.matchupPowerups._shell.style.gridTemplateColumns, 'minmax(0,1fr)');
assert.equal(elements.matchupTitle.textContent, 'Schedule');
assert.match(elements.matchupNote.textContent, /results/i);
assert.match(elements.matchupContent.innerHTML, /Schedule \/ Results/);
assert.match(elements.matchupContent.innerHTML, /BOS 108 at LAL 112/);

api.renderSimulationWaiverInSharedShell();
assert.match(elements.waiverContent.innerHTML, /Scottie Pippen/);
assert.match(elements.waiverContent.innerHTML, /claimSimulationFreeAgentFromShell\(33\)/);
assert.match(elements.waiverContent.innerHTML, /Drop Player/i);

simulationAdapterStub.lastClaim = null;
historicalSlotUpsertCalls = [];
api.claimSimulationFreeAgentFromShell(33);
assert.equal(simulationAdapterStub.lastClaim, null, 'waiver claim should require an explicit drop selection');
assert.equal(historicalSlotUpsertCalls.length, 0, 'waiver claim should not persist until a drop player is chosen');
elements['simulation-waiver-drop-select-33'].value = '34';
api.claimSimulationFreeAgentFromShell(33);
assert.deepStrictEqual(
  toPlain(simulationAdapterStub.lastClaim),
  {
    teamAbbr: 'LAL',
    addPlayerId: 33,
    dropPlayerId: 34
  }
);

api.renderSimulationTradesInSharedShell();
assert.match(elements.tradesContent.innerHTML, /Boston Celtics/);
assert.match(elements.tradesContent.innerHTML, /applySimulationTradeFromShell\('BOS'\)/);
assert.match(elements.tradesContent.innerHTML, /Choose outgoing player/i);
assert.match(elements.tradesContent.innerHTML, /Choose incoming player/i);

simulationAdapterStub.lastTrade = null;
historicalSlotUpsertCalls = [];
api.applySimulationTradeFromShell('BOS');
assert.equal(simulationAdapterStub.lastTrade, null, 'trade helper should require explicit outgoing and incoming selections');
assert.equal(historicalSlotUpsertCalls.length, 0, 'trade helper should not persist until both sides are chosen');
elements['simulation-trade-outgoing-select-BOS'].value = '34';
elements['simulation-trade-incoming-select-BOS'].value = '30';
api.applySimulationTradeFromShell('BOS');
assert.deepStrictEqual(
  toPlain(simulationAdapterStub.lastTrade),
  {
    fromTeamAbbr: 'LAL',
    toTeamAbbr: 'BOS',
    outgoingPlayerIds: [34],
    incomingPlayerIds: [30]
  }
);

api.renderSimulationStandingsInSharedShell();
assert.match(elements.standingsContent.innerHTML, /LAL/);
assert.match(elements.standingsContent.innerHTML, /9-3/);

const normalized = toPlain(api.normalizeSharedSimulationSeasonBootState(fixture, 'sim-slot-1'));

assert.equal(normalized.sport, 'nba', 'boot normalization should preserve sport');
assert.equal(normalized.historicalUniverseSlotId, 'sim-slot-1', 'boot normalization should preserve the slot id');
assert.equal(normalized.seasonId, 'simulation:sim-slot-1', 'boot normalization should create a stable season id');
assert.equal(normalized.leagueSize, 2, 'boot normalization should derive the league size from the simulation teams');
assert.equal(normalized.currentDay, 12, 'boot normalization should copy the current day');
assert.equal(normalized.currentWeek, 2, 'boot normalization should copy the current week');
assert.deepEqual(
  normalized.teams,
  ['Los Angeles Lakers', 'Boston Celtics'],
  'boot normalization should expose team names in the legacy shell format'
);
assert.ok(Array.isArray(normalized.allRosters), 'boot normalization should always define allRosters');
assert.equal(normalized.allRosters.length, 2, 'boot normalization should create one roster per team');
assert.equal(normalized.allRosters[0][0].name, 'Michael Jordan', 'boot normalization should map controlled-team rosters into allRosters');
assert.equal(normalized.allRosters[1][0].name, 'Stephen Curry', 'boot normalization should map opponent rosters into allRosters');
assert.ok(Array.isArray(normalized.freeAgents), 'boot normalization should expose the simulation free agents');
assert.equal(normalized.freeAgents[0].name, 'Hakeem Olajuwon', 'boot normalization should preserve the waiver pool');
assert.ok(Array.isArray(normalized.waiver), 'boot normalization should provide a legacy-safe waiver array');
assert.ok(Array.isArray(normalized.standings), 'boot normalization should provide standings for initSeason');
assert.equal(normalized.standings[0].teamIdx, 0, 'boot normalization should align standings rows to legacy team indexes');

const progressedShell = {
  ...normalized,
  currentDay: 19,
  currentWeek: 3,
  standings: [
    { teamIdx: 0, teamAbbr: 'LAL', conference: 'West', division: 'Pacific', w: 11, l: 4, pf: 1540, pa: 1412 },
    { teamIdx: 1, teamAbbr: 'BOS', conference: 'East', division: 'Atlantic', w: 8, l: 7, pf: 1460, pa: 1494 }
  ],
  freeAgents: [{ id: 99, name: 'Tim Duncan', pos: 'PF' }]
};

const progressedGame = {
  week: 3,
  day: 19,
  rosters: [
    [{ id: 23, name: 'Michael Jordan', pos: 'SG' }, { id: 33, name: 'Scottie Pippen', pos: 'SF' }],
    [{ id: 30, name: 'Stephen Curry', pos: 'PG' }]
  ],
  waiver: [{ id: 99, name: 'Tim Duncan', pos: 'PF' }],
  standings: progressedShell.standings,
  starters: [
    [23, 33],
    [30]
  ]
};

const fallbackSimulationState = {
  simulationMode: fixture.simulationMode,
  historicalUniverseSlotId: 'sim-slot-1',
  leagueShell: fixture.leagueShell,
  draftState: {
    controlledTeamAbbr: 'LAL'
  },
  seasonState: {
    activityLog: [{ type: 'sim_day', summary: 'Fallback fixture log entry' }]
  }
};

const persistedSimulationState = toPlain(
  api.buildSharedSimulationPersistenceState(fallbackSimulationState, progressedShell, progressedGame)
);

assert.equal(
  persistedSimulationState.seasonState.currentDay,
  19,
  'simulation persistence should carry the updated current day into seasonState'
);
assert.equal(
  persistedSimulationState.seasonState.currentWeek,
  3,
  'simulation persistence should carry the updated current week into seasonState'
);
assert.equal(
  persistedSimulationState.seasonState.standings[0].w,
  11,
  'simulation persistence should carry updated standings into seasonState'
);
assert.equal(
  persistedSimulationState.draftState.rostersByTeam.LAL[1].name,
  'Scottie Pippen',
  'simulation persistence should map legacy rosters back into draftState.rostersByTeam'
);
assert.equal(
  persistedSimulationState.draftState.freeAgents[0].name,
  'Tim Duncan',
  'simulation persistence should map the current waiver pool back into draftState.freeAgents'
);
assert.deepEqual(
  persistedSimulationState.seasonState.lineupIdsByTeam,
  {
    LAL: [23, 33],
    BOS: [30]
  },
  'simulation persistence should align starter ids back into seasonState.lineupIdsByTeam by team abbr'
);

const updatedAdapterState = {
  ...fixture,
  draftState: {
    ...fixture.draftState,
    rostersByTeam: {
      LAL: [
        { id: 33, name: 'Scottie Pippen', pos: 'SF' },
        { id: 34, name: 'Hakeem Olajuwon', pos: 'C' }
      ],
      BOS: [{ id: 30, name: 'Stephen Curry', pos: 'PG' }]
    },
    freeAgents: [{ id: 23, name: 'Michael Jordan', pos: 'SG' }]
  },
  seasonState: {
    ...fixture.seasonState,
    currentDay: 21,
    currentWeek: 4,
    standings: [
      { teamIdx: 0, teamAbbr: 'LAL', conference: 'West', division: 'Pacific', w: 12, l: 4, pf: 1601, pa: 1450 },
      { teamIdx: 1, teamAbbr: 'BOS', conference: 'East', division: 'Atlantic', w: 8, l: 8, pf: 1492, pa: 1510 }
    ],
    lineupIdsByTeam: {
      LAL: [33, 34],
      BOS: [30]
    }
  }
};

const staleLegacyShell = {
  ...progressedShell,
  currentDay: 18,
  currentWeek: 3,
  standings: [
    { teamIdx: 0, teamAbbr: 'LAL', conference: 'West', division: 'Pacific', w: 10, l: 4, pf: 1500, pa: 1410 },
    { teamIdx: 1, teamAbbr: 'BOS', conference: 'East', division: 'Atlantic', w: 8, l: 6, pf: 1450, pa: 1480 }
  ],
  freeAgents: [{ id: 99, name: 'Tim Duncan', pos: 'PF' }]
};

const staleLegacyGame = {
  week: 3,
  day: 18,
  rosters: [
    [{ id: 23, name: 'Michael Jordan', pos: 'SG' }],
    [{ id: 30, name: 'Stephen Curry', pos: 'PG' }]
  ],
  waiver: [{ id: 99, name: 'Tim Duncan', pos: 'PF' }],
  standings: staleLegacyShell.standings,
  starters: [
    [23],
    [30]
  ]
};

const rawPreferredPersistenceState = toPlain(
  api.buildSharedSimulationPersistenceState(updatedAdapterState, staleLegacyShell, staleLegacyGame)
);

assert.equal(
  rawPreferredPersistenceState.seasonState.currentDay,
  21,
  'simulation persistence should prefer adapter current day over stale legacy game state'
);
assert.equal(
  rawPreferredPersistenceState.seasonState.currentWeek,
  4,
  'simulation persistence should prefer adapter current week over stale legacy game state'
);
assert.equal(
  rawPreferredPersistenceState.seasonState.standings[0].w,
  12,
  'simulation persistence should prefer adapter standings over stale legacy standings'
);
assert.equal(
  rawPreferredPersistenceState.draftState.rostersByTeam.LAL[0].name,
  'Scottie Pippen',
  'simulation persistence should prefer adapter rosters over stale legacy rosters'
);
assert.equal(
  rawPreferredPersistenceState.draftState.freeAgents[0].name,
  'Michael Jordan',
  'simulation persistence should prefer adapter free agents over stale legacy waiver state'
);
assert.deepEqual(
  rawPreferredPersistenceState.seasonState.lineupIdsByTeam,
  {
    LAL: [33, 34],
    BOS: [30]
  },
  'simulation persistence should prefer adapter lineup ids over stale legacy starters'
);

const legacyHistoricalSimulation = {
  historicalEntryMode: 'simulation_season',
  simulationMode: 'historical_box_score',
  historicalPackId: 'nba_1996_full_season_v1',
  teams: ['Chicago Bulls', 'Seattle SuperSonics'],
  allRosters: [
    [{ id: 23, name: 'Michael Jordan' }],
    [{ id: 20, name: 'Gary Payton' }]
  ],
  standings: [
    { teamIdx: 0, teamAbbr: 'CHI', w: 10, l: 2, pf: 1300, pa: 1180 },
    { teamIdx: 1, teamAbbr: 'SEA', w: 8, l: 4, pf: 1210, pa: 1198 }
  ]
};

assert.equal(
  api.shouldPersistSharedSimulationState(fixture),
  true,
  'shared-shell mixed-era simulation should opt into the shared simulation persistence serializer'
);
assert.equal(
  api.shouldPersistSharedSimulationState(legacyHistoricalSimulation),
  false,
  'legacy historical simulations should not be claimed by the shared simulation persistence serializer'
);

createdSimulationAdapters = [];
const localResume = toPlain(api.resolveLocalSavedSeasonAutoLoad({
  ...fixture,
  historicalUniverseSlotId: 'sim-slot-local'
}, 'nba'));

assert.equal(localResume.activeSeasonMode, 'simulation', 'local auto-load should detect shared simulation seasons from raw persisted state');
assert.equal(localResume.sport, 'nba', 'local auto-load should derive sport from the raw simulation state');
assert.equal(localResume.state.historicalUniverseSlotId, 'sim-slot-local', 'local auto-load should preserve the raw simulation slot id');
assert.equal(localResume.state.seasonId, 'simulation:sim-slot-local', 'local auto-load should normalize raw simulation state before boot');
assert.equal(createdSimulationAdapters.length, 1, 'local auto-load should rebuild the shared simulation adapter from raw state');
assert.equal(createdSimulationAdapters[0].slotId, 'sim-slot-local', 'local auto-load should seed the adapter with the persisted slot id');
assert.equal(
  createdSimulationAdapters[0].state.draftState.controlledTeamAbbr,
  'LAL',
  'local auto-load should rebuild the adapter from the raw simulation payload'
);

historicalSlotUpsertCalls = [];
completedDraftUpsertError = null;
const fallbackBootState = toPlain(api.normalizeSharedSimulationSeasonBootState(fixture, null));
const fallbackBootAdapter = {
  currentState: toPlain(fixture),
  getState() {
    return toPlain(this.currentState);
  },
  replaceState(nextState) {
    this.currentState = toPlain(nextState);
    return this.getState();
  }
};
api.setSeasonModeAdapter(fallbackBootAdapter);
api.setData(fallbackBootState);
api.setGame({
  week: fallbackBootState.currentWeek,
  day: fallbackBootState.currentDay,
  rosters: toPlain(fallbackBootState.allRosters),
  waiver: toPlain(fallbackBootState.waiver),
  standings: toPlain(fallbackBootState.standings),
  starters: [
    [23],
    [30]
  ]
});
api.persistHistoricalUniverseSlotSnapshot('simulation_claim');
api.persistSimulationSeasonState('simulation_lineup');
assert.equal(
  historicalSlotUpsertCalls[1]?.options?.slotId,
  'sim-slot-from-completed-draft',
  'fallback shared-shell saves should adopt the first assigned historical slot id for later adapter-backed saves'
);
assert.equal(
  fallbackBootAdapter.getState().historicalUniverseSlotId,
  'sim-slot-from-completed-draft',
  'fallback shared-shell adapters should retain the assigned slot id after the first successful save'
);

api.setActiveSeasonMode('simulation');
api.setSeasonModeAdapter(null);
demoInitCalls = 0;
demoViewCalls = 0;
demoToasts = [];
const staleSimulationBoot = api.bootSeasonShellForTest('?sport=nba&simulation=nba_mixed_era');
assert.equal(staleSimulationBoot.activeSeasonMode, 'fantasy', 'stale simulation URLs with no recoverable state should boot in fantasy mode');
assert.equal(staleSimulationBoot.hasAdapter, false, 'stale simulation URLs with no recoverable state should not leave a null simulation adapter behind');
assert.equal(staleSimulationBoot.emptyState, 'idle', 'stale simulation URLs with no recoverable state should stay on the idle empty state');
api.loadDemo().then(() => {
  assert.equal(api.getActiveSeasonMode(), 'fantasy', 'demo boot should clear stale simulation mode when no recoverable simulation state exists');
  assert.equal(api.getSeasonModeAdapter(), null, 'demo boot should not leave a missing simulation adapter behind');
  assert.equal(demoInitCalls, 1, 'demo boot should still initialize the season once');
  assert.equal(demoViewCalls, 1, 'demo boot should still apply the requested season view once');
  assert.deepEqual(demoToasts, [], 'demo boot should not surface a simulation adapter error when falling back to fantasy mode');

  console.log('shared season shell simulation test passed');
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
