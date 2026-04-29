const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function readSource(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

class MemoryStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(String(key)) ? this.store.get(String(key)) : null;
  }
  setItem(key, value) {
    this.store.set(String(key), String(value));
  }
  removeItem(key) {
    this.store.delete(String(key));
  }
}

const localStorage = new MemoryStorage();
const elements = {
  savedLeaguesList: { innerHTML: '' }
};
const context = {
  console,
  localStorage,
  document: {
    getElementById(id) {
      return elements[id] || null;
    }
  }
};
context.window = context;
vm.createContext(context);
vm.runInContext(readSource('historical-universe-slots.js'), context, { filename: 'historical-universe-slots.js' });
vm.runInContext(readSource('continue-universe.js'), context, { filename: 'continue-universe.js' });

const api = context.RosterBateHistoricalUniverseSlots;
api.upsertFromState({
  simulationMode: 'nba_mixed_era_single_player_v1',
  sport: 'nba',
  leagueShell: {
    sport: 'nba',
    anchorSeasonLabel: '2025-26 NBA',
    teams: [
      { abbr: 'LAL', name: 'Los Angeles Lakers' },
      { abbr: 'BOS', name: 'Boston Celtics' }
    ]
  },
  draftState: {
    controlledTeamAbbr: 'LAL',
    rostersByTeam: {
      LAL: [{ id: 1, name: 'Magic Johnson' }],
      BOS: [{ id: 2, name: 'Larry Bird' }]
    },
    freeAgents: []
  },
  seasonState: {
    currentWeek: 2,
    currentDay: 9,
    standings: [
      { teamAbbr: 'LAL', w: 6, l: 3, pf: 1024.5, pa: 998.1 },
      { teamAbbr: 'BOS', w: 5, l: 4, pf: 990.2, pa: 991.0 }
    ]
  },
  postseasonState: { phase: 'regular_season' }
}, { slotId: 'slot_nba_continue_regression' });

api.upsertFromState({
  sport: 'nba',
  historicalPackId: 'nba_1996_full_season_v1',
  historicalEntryMode: 'historical_draft',
  leagueName: 'Draft Archive',
  teamName: 'Draft Team',
  currentWeek: 1,
  currentDay: 1,
  standings: []
}, { slotId: 'slot_historical_draft_not_continue' });

const slots = context.RosterBateSavedLeagues.getSavedSimulationSlots({ sport: 'nba' });
assert.equal(slots.length, 1, 'continue list should include simulation slots only');
assert.equal(slots[0].slotId, 'slot_nba_continue_regression');

context.RosterBateSavedLeagues.renderSavedSimulationLeagues('savedLeaguesList', {
  sport: 'nba',
  maxCards: 8,
  heading: 'Saved Leagues'
});

assert.match(elements.savedLeaguesList.innerHTML, /Saved Leagues/, 'renderer should show the heading');
assert.match(elements.savedLeaguesList.innerHTML, /2025-26 NBA/, 'renderer should show the saved league name');
assert.match(elements.savedLeaguesList.innerHTML, /Los Angeles Lakers/, 'renderer should show the controlled team');
assert.match(elements.savedLeaguesList.innerHTML, /Week 2 - Day 9/, 'renderer should show current day progress');
assert.match(elements.savedLeaguesList.innerHTML, /6-3/, 'renderer should show the controlled team record');
assert.match(elements.savedLeaguesList.innerHTML, /Continue Season/, 'renderer should expose the continue action');
assert.match(
  elements.savedLeaguesList.innerHTML,
  /rosterbate-season\.html\?sport=nba&amp;simulation=nba_mixed_era&amp;historicalUniverse=slot_nba_continue_regression/,
  'continue action should route to the canonical season URL'
);
assert.doesNotMatch(elements.savedLeaguesList.innerHTML, /Draft Archive/, 'renderer should not list historical draft slots');

console.log('continue universe test passed');
