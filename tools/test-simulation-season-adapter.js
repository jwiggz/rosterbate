const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const simulationSeasonAdapterApi = require('../simulation-season-adapter.js');
const {
  createSimulationSeasonAdapter,
  isSupportedSimulationSeasonState
} = simulationSeasonAdapterApi;
const adapterSource = fs.readFileSync(path.join(__dirname, '..', 'simulation-season-adapter.js'), 'utf8');

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
assert.equal(typeof adapter.setLineup, 'function');
assert.equal(typeof adapter.claimFreeAgent, 'function');
assert.equal(typeof adapter.applyTrade, 'function');
assert.equal(typeof adapter.simulateNextDay, 'function');
assert.match(adapterSource, /runtimeApi\.setSimulationLineup\(/, 'adapter lineup mutation should stay runtime-backed');
assert.match(adapterSource, /runtimeApi\.claimSimulationFreeAgent\(/, 'adapter waiver mutation should stay runtime-backed');
assert.match(adapterSource, /runtimeApi\.applySimulationTrade\(/, 'adapter trade mutation should stay runtime-backed');

const hub = adapter.getHubViewModel();
assert.equal(hub.leagueLabel, '2025-26 NBA Simulation');
assert.equal(hub.controlledTeam.abbr, 'LAL');
assert.equal(hub.primaryAction.label, 'Sim Day');
assert.deepStrictEqual(hub.sourceSeasonLabels, ['1986-87', '1995-96', '2015-16']);
hub.controlledTeam.name = 'Mutated Lakers';
hub.userRow.w = 999;
hub.sourceSeasonLabels.push('2020-21');
assert.equal(adapter.getState().leagueShell.teams[0].name, 'Los Angeles Lakers');
assert.equal(adapter.getState().seasonState.standings[0].w, 9);
assert.equal(adapter.getState().sourceSeasons.sourceSeasonLabels.length, 3);

const roster = adapter.getRosterViewModel();
assert.equal(roster.lineup.length, 2);
assert.equal(roster.bench.length, 0);
roster.roster[0].name = 'Mutated Player';
assert.equal(adapter.getState().draftState.rostersByTeam.LAL[0].name, 'Michael Jordan');

const schedule = adapter.getScheduleViewModel();
assert.equal(schedule.recentResults.length, 1);
assert.equal(schedule.recentResults[0].homeAbbr, 'LAL');
assert.equal(schedule.nextGame.opponentAbbr, 'BOS');
assert.equal(schedule.nextGame.day, 12);
schedule.nextGame.opponentName = 'Mutated Opponent';
assert.equal(adapter.getScheduleViewModel().nextGame.opponentName, 'Boston Celtics');

const waivers = adapter.getWaiverViewModel();
assert.equal(waivers.availablePlayers.length, 1);
assert.equal(waivers.availablePlayers[0].name, 'Scottie Pippen');

const trades = adapter.getTradeViewModel();
assert.equal(trades.tradePartners.length, 1);
assert.equal(trades.tradePartners[0].abbr, 'BOS');
assert.equal(trades.outgoingRoster.length, 2);
assert.equal(trades.incomingRostersByTeam.BOS.length, 1);

const standings = adapter.getStandingsViewModel();
assert.equal(standings.userRow.teamAbbr, 'LAL');
assert.equal(standings.rows.length, 2);

const lineupState = adapter.setLineup([34, 23]);
assert.deepStrictEqual(lineupState.seasonState.lineupIdsByTeam.LAL, [34, 23]);
assert.deepStrictEqual(adapter.getRosterViewModel().lineup.map((player) => player.id), [23, 34]);

const claimState = adapter.claimFreeAgent({
  teamAbbr: 'LAL',
  addPlayerId: 50,
  dropPlayerId: 23
});
assert.ok(claimState.draftState.rostersByTeam.LAL.some((player) => player.id === 50));
assert.ok(claimState.draftState.freeAgents.some((player) => player.id === 23));

const tradedState = adapter.applyTrade({
  fromTeamAbbr: 'LAL',
  toTeamAbbr: 'BOS',
  outgoingPlayerIds: [34],
  incomingPlayerIds: [30]
});
assert.ok(tradedState.draftState.rostersByTeam.LAL.some((player) => player.id === 30));
assert.ok(tradedState.draftState.rostersByTeam.BOS.some((player) => player.id === 34));

const postSimState = adapter.simulateNextDay();
assert.equal(postSimState.currentDay, 13);
assert.equal(postSimState.currentWeek, 2);
assert.equal(postSimState.seasonState.currentDay, 13);
assert.equal(postSimState.seasonState.currentWeek, 2);
assert.equal(postSimState.seasonState.completedGameLogs.length, 2);
assert.ok(postSimState.seasonState.scheduleByDay, 'simulateNextDay should persist canonical scheduleByDay');
assert.ok(
  postSimState.seasonState.standings.some((row) => row.teamAbbr === 'LAL' && (Number(row.w) + Number(row.l)) === 13),
  'simulateNextDay should advance standings totals for the controlled team'
);
const postSimSchedule = adapter.getScheduleViewModel();
assert.equal(postSimSchedule.nextGame.day, 13);
assert.equal(postSimSchedule.nextGame.opponentAbbr, 'BOS');

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
    scheduleByDay: {
      13: [{ homeAbbr: 'LAL', awayAbbr: 'BOS' }],
      14: [{ homeAbbr: 'BOS', awayAbbr: 'LAL' }]
    },
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
assert.equal(adapter.getScheduleViewModel().nextGame.day, 13);
assert.equal(adapter.getScheduleViewModel().nextGame.opponentAbbr, 'LAL');

const postseasonTransitionAdapter = createSimulationSeasonAdapter({
  slotId: 'sim-slot-postseason-transition',
  state: {
    simulationMode: 'nba_mixed_era_single_player_v1',
    leagueShell: {
      anchorSeasonLabel: '2025-26 NBA',
      teams: [
        { abbr: 'ATL', name: 'Atlanta Hawks', conference: 'East', division: 'Southeast' },
        { abbr: 'BOS', name: 'Boston Celtics', conference: 'East', division: 'Atlantic' },
        { abbr: 'CHI', name: 'Chicago Bulls', conference: 'East', division: 'Central' },
        { abbr: 'CLE', name: 'Cleveland Cavaliers', conference: 'East', division: 'Central' },
        { abbr: 'DET', name: 'Detroit Pistons', conference: 'East', division: 'Central' },
        { abbr: 'IND', name: 'Indiana Pacers', conference: 'East', division: 'Central' },
        { abbr: 'MIA', name: 'Miami Heat', conference: 'East', division: 'Southeast' },
        { abbr: 'MIL', name: 'Milwaukee Bucks', conference: 'East', division: 'Central' },
        { abbr: 'NYK', name: 'New York Knicks', conference: 'East', division: 'Atlantic' },
        { abbr: 'ORL', name: 'Orlando Magic', conference: 'East', division: 'Southeast' },
        { abbr: 'DAL', name: 'Dallas Mavericks', conference: 'West', division: 'Southwest' },
        { abbr: 'DEN', name: 'Denver Nuggets', conference: 'West', division: 'Northwest' },
        { abbr: 'GSW', name: 'Golden State Warriors', conference: 'West', division: 'Pacific' },
        { abbr: 'HOU', name: 'Houston Rockets', conference: 'West', division: 'Southwest' },
        { abbr: 'LAC', name: 'LA Clippers', conference: 'West', division: 'Pacific' },
        { abbr: 'LAL', name: 'Los Angeles Lakers', conference: 'West', division: 'Pacific' },
        { abbr: 'MEM', name: 'Memphis Grizzlies', conference: 'West', division: 'Southwest' },
        { abbr: 'MIN', name: 'Minnesota Timberwolves', conference: 'West', division: 'Northwest' },
        { abbr: 'OKC', name: 'Oklahoma City Thunder', conference: 'West', division: 'Northwest' },
        { abbr: 'PHX', name: 'Phoenix Suns', conference: 'West', division: 'Pacific' }
      ]
    },
    draftState: {
      controlledTeamAbbr: 'BOS',
      rostersByTeam: {
        ATL: [],
        BOS: [{ id: 1, name: 'Player 1', pos: 'PG', team: 'BOS', fp: 50 }],
        CHI: [],
        CLE: [],
        DET: [],
        IND: [],
        MIA: [],
        MIL: [],
        NYK: [],
        ORL: [],
        DAL: [],
        DEN: [],
        GSW: [],
        HOU: [],
        LAC: [],
        LAL: [],
        MEM: [],
        MIN: [],
        OKC: [],
        PHX: []
      },
      freeAgents: []
    },
    seasonState: {
      currentDay: 2,
      currentWeek: 1,
      lineupIdsByTeam: { BOS: [1] },
      standings: [
        { teamIdx: 0, teamAbbr: 'ATL', conference: 'East', division: 'Southeast', w: 60, l: 22, pf: 9200, pa: 8800 },
        { teamIdx: 1, teamAbbr: 'BOS', conference: 'East', division: 'Atlantic', w: 58, l: 24, pf: 9180, pa: 8820 },
        { teamIdx: 2, teamAbbr: 'CHI', conference: 'East', division: 'Central', w: 56, l: 26, pf: 9100, pa: 8850 },
        { teamIdx: 3, teamAbbr: 'CLE', conference: 'East', division: 'Central', w: 54, l: 28, pf: 9050, pa: 8900 },
        { teamIdx: 4, teamAbbr: 'DET', conference: 'East', division: 'Central', w: 52, l: 30, pf: 9000, pa: 8925 },
        { teamIdx: 5, teamAbbr: 'IND', conference: 'East', division: 'Central', w: 50, l: 32, pf: 8960, pa: 8940 },
        { teamIdx: 6, teamAbbr: 'MIA', conference: 'East', division: 'Southeast', w: 48, l: 34, pf: 8920, pa: 8960 },
        { teamIdx: 7, teamAbbr: 'MIL', conference: 'East', division: 'Central', w: 46, l: 36, pf: 8880, pa: 8990 },
        { teamIdx: 8, teamAbbr: 'NYK', conference: 'East', division: 'Atlantic', w: 44, l: 38, pf: 8840, pa: 9020 },
        { teamIdx: 9, teamAbbr: 'ORL', conference: 'East', division: 'Southeast', w: 42, l: 40, pf: 8800, pa: 9050 },
        { teamIdx: 10, teamAbbr: 'DAL', conference: 'West', division: 'Southwest', w: 61, l: 21, pf: 9250, pa: 8780 },
        { teamIdx: 11, teamAbbr: 'DEN', conference: 'West', division: 'Northwest', w: 59, l: 23, pf: 9210, pa: 8810 },
        { teamIdx: 12, teamAbbr: 'GSW', conference: 'West', division: 'Pacific', w: 57, l: 25, pf: 9160, pa: 8840 },
        { teamIdx: 13, teamAbbr: 'HOU', conference: 'West', division: 'Southwest', w: 55, l: 27, pf: 9110, pa: 8880 },
        { teamIdx: 14, teamAbbr: 'LAC', conference: 'West', division: 'Pacific', w: 53, l: 29, pf: 9070, pa: 8910 },
        { teamIdx: 15, teamAbbr: 'LAL', conference: 'West', division: 'Pacific', w: 51, l: 31, pf: 9030, pa: 8940 },
        { teamIdx: 16, teamAbbr: 'MEM', conference: 'West', division: 'Southwest', w: 49, l: 33, pf: 8990, pa: 8970 },
        { teamIdx: 17, teamAbbr: 'MIN', conference: 'West', division: 'Northwest', w: 47, l: 35, pf: 8950, pa: 9000 },
        { teamIdx: 18, teamAbbr: 'OKC', conference: 'West', division: 'Northwest', w: 45, l: 37, pf: 8910, pa: 9030 },
        { teamIdx: 19, teamAbbr: 'PHX', conference: 'West', division: 'Pacific', w: 43, l: 39, pf: 8870, pa: 9060 }
      ],
      completedGameLogs: [],
      scheduleByDay: {
        2: [{ homeAbbr: 'ATL', awayAbbr: 'BOS' }]
      },
      activityLog: []
    },
    postseasonState: {
      phase: 'regular_season',
      champion: null
    }
  }
});

const postseasonReadyState = postseasonTransitionAdapter.simulateNextDay();
assert.equal(
  postseasonReadyState.seasonState.currentDay,
  3,
  'simulateNextDay should still advance through the final scheduled day before entering postseason-ready state'
);
assert.equal(
  postseasonReadyState.postseasonState.phase,
  'postseason_ready',
  'simulateNextDay should transition the shared shell into postseason-ready state after the final scheduled day'
);
assert.ok(postseasonReadyState.postseasonState.playIn?.east, 'simulateNextDay should seed the East play-in snapshot when the regular season ends');
assert.ok(postseasonReadyState.postseasonState.playIn?.west, 'simulateNextDay should seed the West play-in snapshot when the regular season ends');
assert.ok(postseasonReadyState.postseasonState.bracket?.east, 'simulateNextDay should seed the East playoff bracket when the regular season ends');
assert.ok(postseasonReadyState.postseasonState.bracket?.west, 'simulateNextDay should seed the West playoff bracket when the regular season ends');

const postseasonDayCount = postseasonReadyState.seasonState.currentDay;
const postseasonLogCount = postseasonReadyState.seasonState.completedGameLogs.length;
const postseasonAlreadyOverState = postseasonTransitionAdapter.simulateNextDay();
assert.equal(
  postseasonAlreadyOverState.seasonState.currentDay,
  postseasonDayCount,
  'simulateNextDay should stop advancing empty days once the regular season schedule is exhausted'
);
assert.equal(
  postseasonAlreadyOverState.seasonState.completedGameLogs.length,
  postseasonLogCount,
  'simulateNextDay should not add empty regular-season logs once postseason seeding is ready'
);
assert.equal(
  postseasonAlreadyOverState.postseasonState.phase,
  'postseason_ready',
  'simulateNextDay should keep postseason-ready state when called after the regular season is already over'
);

console.log('simulation season adapter test passed');
