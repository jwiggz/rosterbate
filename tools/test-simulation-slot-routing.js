const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'historical-universe-slots.js'), 'utf8');
const storage = new Map();

const sandbox = {
  window: {
    localStorage: {
      getItem(key) {
        return storage.has(String(key)) ? storage.get(String(key)) : null;
      },
      setItem(key, value) {
        storage.set(String(key), String(value));
      },
      removeItem(key) {
        storage.delete(String(key));
      }
    }
  },
  console
};
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'historical-universe-slots.js' });

const api = sandbox.window.RosterBateHistoricalUniverseSlots;

const persisted = api.upsertFromState({
  simulationMode: 'nba_mixed_era_single_player_v1',
  leagueShell: {
    sport: 'nba',
    anchorSeasonLabel: '2025-26 NBA',
    teams: [
      { abbr: 'LAL', name: 'Los Angeles Lakers', conference: 'West', division: 'Pacific' },
      { abbr: 'BOS', name: 'Boston Celtics', conference: 'East', division: 'Atlantic' }
    ]
  },
  sourceSeasons: {
    mixedEraConfigId: '1987-1996-2016',
    sourcePackIds: ['nba_1987_full_season_v1', 'nba_1996_full_season_v1', 'nba_2016_full_season_v1'],
    sourceSeasonLabels: ['1986-87', '1995-96', '2015-16']
  },
  draftState: {
    controlledTeamAbbr: 'LAL',
    rostersByTeam: {
      LAL: [{ id: 23, name: 'Michael Jordan' }],
      BOS: [{ id: 30, name: 'Stephen Curry' }]
    },
    freeAgents: [{ id: 45, name: 'Hakeem Olajuwon' }]
  },
  seasonState: {
    currentDay: 12,
    currentWeek: 2,
    standings: [
      { teamIdx: 0, teamAbbr: 'LAL', conference: 'West', division: 'Pacific', w: 9, l: 3, pf: 1360, pa: 1288 },
      { teamIdx: 1, teamAbbr: 'BOS', conference: 'East', division: 'Atlantic', w: 7, l: 5, pf: 1299, pa: 1274 }
    ]
  },
  postseasonState: {
    phase: 'regular_season',
    champion: null
  }
}, {
  slotId: 'sim-slot-1'
});

assert.ok(persisted, 'simulation universes should persist into historical slot storage');
assert.equal(persisted.metadata.simulationMode, 'nba_mixed_era_single_player_v1');
assert.equal(persisted.metadata.teamName, 'Los Angeles Lakers');
assert.equal(api.getState('sim-slot-1').simulationMode, 'nba_mixed_era_single_player_v1');

assert.equal(
  api.buildSeasonUrl({
    slotId: 'sim-slot-1',
    sport: 'nba',
    simulationMode: 'nba_mixed_era_single_player_v1'
  }, 'nba'),
  'rosterbate-season.html?sport=nba&simulation=nba_mixed_era&historicalUniverse=sim-slot-1',
  'simulation universes should open in the shared season shell'
);

assert.equal(
  api.buildSeasonUrl({
    slotId: 'historic-slot-1',
    sport: 'nba',
    historicalEntryMode: 'historical_draft'
  }, 'nba'),
  'rosterbate-season.html?sport=nba&historicalUniverse=historic-slot-1',
  'non-simulation universes should keep the classic season route'
);

console.log('simulation slot routing test passed');
