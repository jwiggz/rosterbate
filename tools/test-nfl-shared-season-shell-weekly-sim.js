const assert = require('node:assert/strict');

const { createSimulationSeasonAdapter } = require('../simulation-season-adapter.js');

const adapter = createSimulationSeasonAdapter({
  slotId: 'nfl-weekly-flow',
  state: {
    simulationMode: 'nfl_mixed_era_single_player_v1',
    leagueShell: {
      anchorSeasonId: 'nfl_2014',
      anchorSeasonLabel: '2014 NFL',
      sport: 'nfl',
      rosterSize: 13,
      teams: [
        { abbr: 'DAL', name: 'Dallas Cowboys', conference: 'NFC', division: 'East' },
        { abbr: 'SF', name: 'San Francisco 49ers', conference: 'NFC', division: 'West' }
      ]
    },
    draftState: {
      controlledTeamAbbr: 'DAL',
      rostersByTeam: {
        DAL: [{ id: 9, name: 'Tony Romo', pos: 'QB', team: 'DAL', fp: 30 }],
        SF: [{ id: 7, name: 'Colin Kaepernick', pos: 'QB', team: 'SF', fp: 26 }]
      },
      freeAgents: []
    },
    seasonState: {
      currentDay: 1,
      currentWeek: 1,
      scheduleByDay: {
        1: [{ homeAbbr: 'DAL', awayAbbr: 'SF' }]
      },
      standings: [
        { teamAbbr: 'DAL', conference: 'NFC', division: 'East', w: 0, l: 0, pf: 0, pa: 0 },
        { teamAbbr: 'SF', conference: 'NFC', division: 'West', w: 0, l: 0, pf: 0, pa: 0 }
      ],
      lineupIdsByTeam: { DAL: [9], SF: [7] },
      completedGameLogs: [],
      activityLog: []
    },
    postseasonState: { phase: 'regular_season' }
  }
});

const nextState = adapter.simulateNextDay();

assert.equal(nextState.seasonState.currentWeek, 2);
assert.equal(nextState.seasonState.currentDay, 2);
assert.equal(nextState.seasonState.completedGameLogs.length, 1);

const lateSeasonAdapter = createSimulationSeasonAdapter({
  slotId: 'nfl-weekly-flow-late',
  state: {
    simulationMode: 'nfl_mixed_era_single_player_v1',
    leagueShell: {
      anchorSeasonId: 'nfl_2014',
      anchorSeasonLabel: '2014 NFL',
      sport: 'nfl',
      rosterSize: 13,
      teams: [
        { abbr: 'DAL', name: 'Dallas Cowboys', conference: 'NFC', division: 'East' },
        { abbr: 'PHI', name: 'Philadelphia Eagles', conference: 'NFC', division: 'East' }
      ]
    },
    draftState: {
      controlledTeamAbbr: 'DAL',
      rostersByTeam: {
        DAL: [{ id: 9, name: 'Tony Romo', pos: 'QB', team: 'DAL', fp: 30 }],
        PHI: [{ id: 10, name: 'Nick Foles', pos: 'QB', team: 'PHI', fp: 24 }]
      },
      freeAgents: []
    },
    seasonState: {
      currentDay: 10,
      currentWeek: 10,
      scheduleByDay: {
        10: [{ homeAbbr: 'DAL', awayAbbr: 'PHI' }]
      },
      standings: [
        { teamAbbr: 'DAL', conference: 'NFC', division: 'East', w: 7, l: 2, pf: 0, pa: 0 },
        { teamAbbr: 'PHI', conference: 'NFC', division: 'East', w: 6, l: 3, pf: 0, pa: 0 }
      ],
      lineupIdsByTeam: { DAL: [9], PHI: [10] },
      completedGameLogs: [],
      activityLog: []
    },
    postseasonState: { phase: 'regular_season' }
  }
});

const lateSeasonState = lateSeasonAdapter.simulateNextDay();
assert.equal(lateSeasonState.seasonState.currentWeek, 11);
assert.equal(lateSeasonState.seasonState.currentDay, 11);

console.log('nfl shared season shell weekly sim test passed');
