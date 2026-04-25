const assert = require('node:assert/strict');

const { createSimulationSeasonAdapter } = require('../simulation-season-adapter.js');

function buildNflWeeklyRoster(team, startId, qbName) {
  return [
    { id: startId + 0, name: qbName, pos: 'QB', team, fp: 30 },
    { id: startId + 1, name: `${team} RB1`, pos: 'RB', team, fp: 19 },
    { id: startId + 2, name: `${team} RB2`, pos: 'RB', team, fp: 17 },
    { id: startId + 3, name: `${team} WR1`, pos: 'WR', team, fp: 18 },
    { id: startId + 4, name: `${team} WR2`, pos: 'WR', team, fp: 16 },
    { id: startId + 5, name: `${team} TE1`, pos: 'TE', team, fp: 14 },
    { id: startId + 6, name: `${team} Flex`, pos: 'WR', team, fp: 13 },
    { id: startId + 7, name: `${team} K`, pos: 'K', team, fp: 10 },
    { id: startId + 8, name: `${team} DST`, pos: 'DST', team, fp: 9 }
  ];
}

function buildNflWeeklyLineup(startId) {
  return {
    QB: startId + 0,
    RB1: startId + 1,
    RB2: startId + 2,
    WR1: startId + 3,
    WR2: startId + 4,
    TE: startId + 5,
    FLEX: startId + 6,
    K: startId + 7,
    DST: startId + 8
  };
}

const dalRoster = buildNflWeeklyRoster('DAL', 100, 'Tony Romo');
const sfRoster = buildNflWeeklyRoster('SF', 200, 'Colin Kaepernick');

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
        DAL: dalRoster,
        SF: sfRoster
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
      lineupIdsByTeam: {
        DAL: Object.values(buildNflWeeklyLineup(100)),
        SF: Object.values(buildNflWeeklyLineup(200))
      },
      lineupSlotsByTeam: {
        DAL: buildNflWeeklyLineup(100),
        SF: buildNflWeeklyLineup(200)
      },
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

const phiRoster = buildNflWeeklyRoster('PHI', 300, 'Nick Foles');

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
        DAL: dalRoster,
        PHI: phiRoster
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
      lineupIdsByTeam: {
        DAL: Object.values(buildNflWeeklyLineup(100)),
        PHI: Object.values(buildNflWeeklyLineup(300))
      },
      lineupSlotsByTeam: {
        DAL: buildNflWeeklyLineup(100),
        PHI: buildNflWeeklyLineup(300)
      },
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
