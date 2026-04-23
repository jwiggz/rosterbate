const assert = require('node:assert/strict');

const simulationSeasonAdapterApi = require('../simulation-season-adapter.js');
const {
  createSimulationSeasonAdapter,
  isSupportedSimulationSeasonState
} = simulationSeasonAdapterApi;

const slotState = {
  simulationMode: 'nba_mixed_era_single_player_v1',
  leagueShell: {
    anchorSeasonLabel: '2025-26 NBA',
    teams: [
      { abbr: 'LAL', name: 'Los Angeles Lakers', conference: 'West', division: 'Pacific' },
      { abbr: 'BOS', name: 'Boston Celtics', conference: 'East', division: 'Atlantic' }
    ]
  },
  sourceSeasons: {
    sourceSeasonLabels: ['1986-87', '1995-96', '2015-16']
  },
  draftState: {
    controlledTeamAbbr: 'lal',
    rostersByTeam: {
      LAL: [
        { id: 23, name: 'Michael Jordan', pos: 'SG', team: 'CHI', fp: 60.2 },
        { id: 34, name: 'Hakeem Olajuwon', pos: 'C', team: 'HOU', fp: 61.8 }
      ],
      BOS: [
        { id: 30, name: 'Stephen Curry', pos: 'PG', team: 'GSW', fp: 57.1 }
      ]
    },
    freeAgents: [
      { id: 50, name: 'Scottie Pippen', pos: 'SF', team: 'CHI', fp: 46.4 }
    ]
  },
  seasonState: {
    currentDay: 12,
    currentWeek: 2,
    lineupIdsByTeam: { LAL: [23, 34] },
    standings: [
      { teamAbbr: 'LAL', conference: 'West', division: 'Pacific', w: 9, l: 3, pf: 1360, pa: 1288, streak: 'W3' },
      { teamAbbr: 'BOS', conference: 'East', division: 'Atlantic', w: 7, l: 5, pf: 1299, pa: 1274, streak: 'L1' }
    ],
    completedGameLogs: [
      { day: 11, awayAbbr: 'BOS', awayName: 'Boston Celtics', awayScore: 108, homeAbbr: 'LAL', homeName: 'Los Angeles Lakers', homeScore: 112 }
    ],
    upcomingGamesByTeam: {
      LAL: [{ day: 12, opponentAbbr: 'BOS', opponentName: 'Boston Celtics', home: true }]
    },
    activityLog: [
      { type: 'trade', text: 'Lakers acquired Hakeem Olajuwon', day: 9 }
    ]
  },
  postseasonState: {
    phase: 'regular_season',
    champion: null
  }
};

assert.equal(simulationSeasonAdapterApi.MODE_ID, 'nba_mixed_era_single_player_v1');
assert.equal(typeof simulationSeasonAdapterApi.clone, 'function');
assert.equal(typeof simulationSeasonAdapterApi.getControlledTeam, 'function');
assert.equal(typeof simulationSeasonAdapterApi.getControlledRoster, 'function');
assert.equal(isSupportedSimulationSeasonState(slotState), true);
assert.equal(simulationSeasonAdapterApi.getControlledTeam(slotState).abbr, 'LAL');
assert.deepStrictEqual(
  simulationSeasonAdapterApi.getControlledRoster(slotState).map((player) => player.id),
  [23, 34]
);

const adapter = createSimulationSeasonAdapter({
  slotId: 'sim-slot-1',
  state: slotState
});

assert.equal(adapter.getModeId(), simulationSeasonAdapterApi.MODE_ID);
const stateSnapshot = adapter.getState();
stateSnapshot.draftState.controlledTeamAbbr = 'BOS';
stateSnapshot.leagueShell.teams[0].name = 'Mutated Lakers';
assert.equal(adapter.getState().draftState.controlledTeamAbbr, 'lal');
assert.equal(adapter.getState().leagueShell.teams[0].name, 'Los Angeles Lakers');

assert.deepStrictEqual(
  adapter.getNavItems().map((item) => item.id),
  ['hub', 'roster', 'matchup', 'waiver', 'trades', 'standings']
);
assert.equal(adapter.getNavItems().find((item) => item.id === 'matchup').label, 'Schedule');

const hub = adapter.getHubViewModel();
assert.equal(hub.leagueLabel, '2025-26 NBA Simulation');
assert.equal(hub.controlledTeam.abbr, 'LAL');
assert.equal(hub.primaryAction.label, 'Sim Day');
assert.equal(hub.sourceSeasonLabels.join(', '), '1986-87,1995-96,2015-16');
hub.controlledTeam.name = 'Mutated Lakers';
hub.userRow.w = 999;
assert.equal(adapter.getState().leagueShell.teams[0].name, 'Los Angeles Lakers');
assert.equal(adapter.getState().seasonState.standings[0].w, 9);

const roster = adapter.getRosterViewModel();
assert.equal(roster.lineup.length, 2);
assert.equal(roster.bench.length, 0);
roster.roster[0].name = 'Mutated Player';
assert.equal(adapter.getState().draftState.rostersByTeam.LAL[0].name, 'Michael Jordan');

const schedule = adapter.getScheduleViewModel();
assert.equal(schedule.recentResults.length, 1);
assert.equal(schedule.recentResults[0].homeAbbr, 'LAL');
assert.equal(schedule.nextGame.opponentAbbr, 'BOS');
schedule.nextGame.opponentName = 'Mutated Opponent';
assert.equal(adapter.getState().seasonState.upcomingGamesByTeam.LAL[0].opponentName, 'Boston Celtics');

const waivers = adapter.getWaiverViewModel();
assert.equal(waivers.availablePlayers.length, 1);

const trades = adapter.getTradeViewModel();
assert.equal(trades.tradePartners.length, 1);

const standings = adapter.getStandingsViewModel();
assert.equal(standings.userRow.teamAbbr, 'LAL');

const nextState = {
  simulationMode: 'nba_mixed_era_single_player_v1',
  leagueShell: {
    anchorSeasonLabel: '2025-26 NBA',
    teams: [
      { abbr: 'LAL', name: 'Los Angeles Lakers', conference: 'West', division: 'Pacific' },
      { abbr: 'BOS', name: 'Boston Celtics', conference: 'East', division: 'Atlantic' }
    ]
  },
  sourceSeasons: {
    sourceSeasonLabels: ['1986-87']
  },
  draftState: {
    controlledTeamAbbr: 'BOS',
    rostersByTeam: {
      LAL: [],
      BOS: [
        { id: 30, name: 'Stephen Curry', pos: 'PG', team: 'GSW', fp: 57.1 }
      ]
    },
    freeAgents: []
  },
  seasonState: {
    currentDay: 13,
    currentWeek: 3,
    lineupIdsByTeam: { BOS: [30] },
    standings: [
      { teamAbbr: 'LAL', conference: 'West', division: 'Pacific', w: 9, l: 3, pf: 1360, pa: 1288, streak: 'W3' },
      { teamAbbr: 'BOS', conference: 'East', division: 'Atlantic', w: 8, l: 5, pf: 1301, pa: 1276, streak: 'W1' }
    ],
    completedGameLogs: [],
    upcomingGamesByTeam: {},
    activityLog: []
  },
  postseasonState: {
    phase: 'regular_season',
    champion: null
  }
};

const replacedState = adapter.replaceState(nextState);
assert.equal(replacedState.draftState.controlledTeamAbbr, 'BOS');
assert.equal(adapter.getHubViewModel().controlledTeam.abbr, 'BOS');
assert.equal(adapter.getRosterViewModel().lineup.length, 1);

console.log('simulation season adapter test passed');
