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
  Date,
  localStorage,
  promptValue: 'Renamed Universe',
  confirmValue: true,
  prompt(message, currentValue) {
    context.lastPrompt = { message, currentValue };
    return context.promptValue;
  },
  confirm(message) {
    context.lastConfirm = message;
    return context.confirmValue;
  },
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
const storageSummary = context.RosterBateSavedLeagues.getSavedSimulationStorageSummary({ sport: 'nba' });
assert.equal(storageSummary.count, 1, 'storage summary should count saved simulation slots');
assert.ok(storageSummary.bytes > 0, 'storage summary should measure saved slot state');
assert.match(storageSummary.label, /B|KB|MB/, 'storage summary should expose a readable size label');

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
assert.match(elements.savedLeaguesList.innerHTML, /local/, 'renderer should show the local storage footprint');
assert.match(elements.savedLeaguesList.innerHTML, /Continue Season/, 'renderer should expose the continue action');
assert.match(elements.savedLeaguesList.innerHTML, /Rename/, 'renderer should expose rename management');
assert.match(elements.savedLeaguesList.innerHTML, /Delete/, 'renderer should expose delete management');
assert.match(
  elements.savedLeaguesList.innerHTML,
  /rosterbate-season\.html\?sport=nba&amp;simulation=nba_mixed_era&amp;historicalUniverse=slot_nba_continue_regression/,
  'continue action should route to the canonical season URL'
);
assert.doesNotMatch(elements.savedLeaguesList.innerHTML, /Draft Archive/, 'renderer should not list historical draft slots');

const renamed = context.RosterBateSavedLeagues.renameSavedLeague('slot_nba_continue_regression', 'savedLeaguesList');
assert.equal(renamed, true, 'rename action should persist an updated slot');
assert.equal(context.lastPrompt.currentValue, '2025-26 NBA', 'rename prompt should default to current league name');
assert.match(elements.savedLeaguesList.innerHTML, /Renamed Universe/, 'renderer should update after rename');
assert.equal(
  api.getState('slot_nba_continue_regression').leagueShell.anchorSeasonLabel,
  'Renamed Universe',
  'rename should update the canonical simulation league label'
);

localStorage.setItem('rosterbateDraft', JSON.stringify({
  localResumePointer: true,
  resumeHistoricalUniverseSlotId: 'slot_nba_continue_regression'
}));
const deleted = context.RosterBateSavedLeagues.deleteSavedLeague('slot_nba_continue_regression', 'savedLeaguesList');
assert.equal(deleted, true, 'delete action should remove the saved slot');
assert.match(context.lastConfirm, /Renamed Universe/, 'delete confirmation should name the target league');
assert.equal(api.getSlot('slot_nba_continue_regression'), null, 'deleted slot should leave the slot index');
assert.equal(api.getState('slot_nba_continue_regression'), null, 'deleted slot should remove saved state');
assert.equal(localStorage.getItem('rosterbateDraft'), null, 'delete should clear a local resume pointer targeting the removed slot');
assert.match(elements.savedLeaguesList.innerHTML, /No Saved Leagues Yet/, 'renderer should update to empty state after delete');

const RealDate = Date;
context.nowValue = 100000;
context.Date = class TestDate extends RealDate {
  constructor(...args) {
    super(...args);
  }
  static now() {
    return context.nowValue;
  }
};
function seedSimulationSlot(slotId, label, day, nowValue) {
  context.nowValue = nowValue;
  return api.upsertFromState({
    simulationMode: 'nba_mixed_era_single_player_v1',
    sport: 'nba',
    leagueShell: {
      sport: 'nba',
      anchorSeasonLabel: label,
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
      currentWeek: 1,
      currentDay: day,
      standings: [
        { teamAbbr: 'LAL', w: day, l: 0, pf: 100 + day, pa: 90 },
        { teamAbbr: 'BOS', w: 0, l: day, pf: 90, pa: 100 + day }
      ]
    },
    postseasonState: { phase: 'regular_season' }
  }, { slotId });
}

seedSimulationSlot('slot_nba_oldest_save', 'Oldest Universe', 1, 110000);
seedSimulationSlot('slot_nba_newest_save', 'Newest Universe', 2, 120000);
context.RosterBateSavedLeagues.renderSavedSimulationLeagues('savedLeaguesList', {
  sport: 'nba',
  maxCards: 8,
  heading: 'Saved Leagues',
  recoveryMode: true
});
assert.match(elements.savedLeaguesList.innerHTML, /Storage Recovery/, 'recovery mode should show storage cleanup copy');
assert.match(elements.savedLeaguesList.innerHTML, /Delete Oldest Save/, 'recovery mode should expose one-click oldest-save cleanup');

const deletedOldest = context.RosterBateSavedLeagues.deleteOldestSavedLeague('savedLeaguesList');
assert.equal(deletedOldest, true, 'recovery cleanup should delete the oldest simulation save');
assert.equal(api.getSlot('slot_nba_oldest_save'), null, 'oldest simulation save should be deleted');
assert.ok(api.getSlot('slot_nba_newest_save'), 'newer simulation save should remain');
assert.match(context.lastConfirm, /Oldest Universe/, 'oldest-save cleanup should confirm the target league name');
assert.doesNotMatch(elements.savedLeaguesList.innerHTML, /Oldest Universe/, 'renderer should remove the deleted oldest save');
assert.match(elements.savedLeaguesList.innerHTML, /Newest Universe/, 'renderer should keep the newer save visible');

console.log('continue universe test passed');
