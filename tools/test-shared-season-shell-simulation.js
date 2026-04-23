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

module.exports = {
  getRequestedSimulationMode,
  getRequestedHistoricalUniverseSlotId,
  isSharedSimulationSeason,
  getActiveSeasonPages,
  getActiveSeasonLabels,
  normalizeSharedSimulationSeasonBootState,
  setActiveSeasonMode(value){ ACTIVE_SEASON_MODE = value; },
  setSeasonModeAdapter(value){ SEASON_MODE_ADAPTER = value; }
};
`;

const sandbox = {
  module: { exports: {} },
  exports: {},
  console,
  URLSearchParams,
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

console.log('shared season shell simulation test passed');
