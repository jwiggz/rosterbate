const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-season.html'), 'utf8');

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
${extractBetween('function isHistoricalSimulationUniverse(', 'function isHistoricalDraftUniverse(')}
${extractBetween('function setSeasonSidePanelVisible(', 'function buildPowerupCardsHtml(')}
${extractBetween('function setHubSummaryStatLabels(', 'function renderSimulationHubInSharedShell(')}
${extractBetween('function renderSimulationHubInSharedShell(', 'function renderActiveSeasonScreen(')}

module.exports = {
  getRequestedSimulationMode,
  getRequestedHistoricalUniverseSlotId,
  isSharedSimulationSeason,
  shouldPersistSharedSimulationState,
  getActiveSeasonPages,
  getActiveSeasonLabels,
  normalizeSharedSimulationSeasonBootState,
  buildSharedSimulationPersistenceState,
  renderSimulationHubInSharedShell,
  renderSimulationRosterInSharedShell,
  renderSimulationScheduleInSharedShell,
  setActiveSeasonMode(value){ ACTIVE_SEASON_MODE = value; },
  setSeasonModeAdapter(value){ SEASON_MODE_ADAPTER = value; },
  setData(value){ D = value; }
};
`;

function createElement(id) {
  const shell = { style: {} };
  return {
    id,
    textContent: '',
    innerHTML: '',
    style: {},
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
  'matchupPowerups'
].map((id) => [id, createElement(id)]));

const sandbox = {
  module: { exports: {} },
  exports: {},
  console,
  URLSearchParams,
  document: {
    getElementById(id) {
      return elements[id] || null;
    }
  },
  window: {
    RosterBateSimulationSeasonAdapter: {
      isSupportedSimulationSeasonState(state) {
        return String(state?.simulationMode || '').trim().toLowerCase() === 'nba_mixed_era_single_player_v1';
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
assert.match(html, /function renderActiveSeasonScreen\(/, 'season shell should centralize mode-aware screen rendering');
assert.match(html, /if \(ACTIVE_SEASON_MODE === 'simulation'\) return renderSimulationHubInSharedShell\(\);/, 'renderHub should branch into simulation rendering');
assert.match(html, /if \(ACTIVE_SEASON_MODE === 'simulation'\) return renderSimulationRosterInSharedShell\(\);/, 'renderRoster should branch into simulation rendering');
assert.match(html, /if \(ACTIVE_SEASON_MODE === 'simulation'\) return renderSimulationScheduleInSharedShell\(\);/, 'renderMatchup should branch into simulation rendering');
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

api.setSeasonModeAdapter({
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
        { id: 23, name: 'Michael Jordan', team: 'CHI', pos: 'SG' }
      ]
    };
  }
});
api.setData({
  leagueShell: {
    teams: [{ abbr: 'LAL' }, { abbr: 'BOS' }, { abbr: 'CHI' }]
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
assert.match(elements.rosterContent.innerHTML, /Michael Jordan/);

api.renderSimulationScheduleInSharedShell();
assert.equal(elements.matchupPowerups.style.display, 'none');
assert.equal(elements.matchupPowerups._shell.style.gridTemplateColumns, 'minmax(0,1fr)');
assert.equal(elements.matchupTitle.textContent, 'Schedule');
assert.match(elements.matchupNote.textContent, /results/i);
assert.match(elements.matchupContent.innerHTML, /Schedule \/ Results/);
assert.match(elements.matchupContent.innerHTML, /BOS 108 at LAL 112/);

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

const persistedSimulationState = toPlain(
  api.buildSharedSimulationPersistenceState(fixture, progressedShell, progressedGame)
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

console.log('shared season shell simulation test passed');
