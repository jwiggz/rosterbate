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
assert.match(adapterSource, /gameLog\?\.winner/, 'postseason advancement should prefer the authoritative game winner over rounded display scores');

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
assert.deepStrictEqual(adapter.getRosterViewModel().lineup.map((player) => player.id), [34, 23]);

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
assert.deepStrictEqual(
  postseasonReadyState.postseasonState.playIn.east.sevenEight.map((entry) => entry.teamAbbr),
  ['MIA', 'MIL'],
  'postseason-ready state should preserve the East 7/8 play-in pairing'
);
assert.deepStrictEqual(
  postseasonReadyState.postseasonState.playIn.west.nineTen.map((entry) => entry.teamAbbr),
  ['OKC', 'PHX'],
  'postseason-ready state should preserve the West 9/10 play-in pairing'
);
assert.deepStrictEqual(
  postseasonTransitionAdapter.getNavItems().map((item) => item.id),
  ['hub', 'roster', 'matchup', 'waiver', 'trades', 'standings', 'playoffs'],
  'postseason-ready state should expose a playoffs navigation tab'
);
assert.equal(
  postseasonTransitionAdapter.getNavItems().find((item) => item.id === 'playoffs')?.label,
  'Playoffs',
  'postseason navigation should label the new postseason tab clearly'
);

const playInState = postseasonTransitionAdapter.simulateNextDay();
assert.equal(
  playInState.postseasonState.phase,
  'play_in',
  'simulateNextDay should advance postseason-ready state into the play-in day-by-day flow'
);
assert.equal(
  playInState.seasonState.currentDay,
  4,
  'simulateNextDay should advance the simulation day after resolving the first play-in slate'
);
assert.ok(
  playInState.postseasonState.currentDaySchedule.length > 0,
  'simulateNextDay should seed the next postseason game day after the opening play-in slate'
);
assert.equal(typeof postseasonTransitionAdapter.getPlayoffsViewModel, 'function');
assert.equal(
  postseasonTransitionAdapter.getPlayoffsViewModel().phase,
  'play_in',
  'adapter should expose a playoffs view model once postseason play begins'
);
assert.deepStrictEqual(
  playInState.seasonState.standings.map((row) => ({ teamAbbr: row.teamAbbr, w: row.w, l: row.l })),
  postseasonReadyState.seasonState.standings.map((row) => ({ teamAbbr: row.teamAbbr, w: row.w, l: row.l })),
  'simulateNextDay should keep regular-season standings frozen once postseason play begins'
);

let roundOneState = playInState;
for (let index = 0; index < 2; index += 1) {
  roundOneState = postseasonTransitionAdapter.simulateNextDay();
}
assert.equal(
  roundOneState.postseasonState.phase,
  'playoffs_round_1',
  'simulateNextDay should be able to advance from play-in results into the first playoff round'
);
assert.ok(
  Object.values(roundOneState.postseasonState.seriesById || {}).some((series) => series.round === 'playoffs_round_1'),
  'advancing out of the play-in should seed first-round playoff series'
);

const roundTwoSeedState = JSON.parse(JSON.stringify(roundOneState));
roundTwoSeedState.seasonState.currentDay = 20;
roundTwoSeedState.seasonState.currentWeek = 3;
roundTwoSeedState.postseasonState.phase = 'playoffs_round_1';
roundTwoSeedState.postseasonState.currentRound = 'playoffs_round_1';
roundTwoSeedState.postseasonState.currentDaySchedule = [];
const roundOneSeries = Object.values(roundTwoSeedState.postseasonState.seriesById)
  .filter((series) => series.round === 'playoffs_round_1')
  .sort((a, b) => String(a.id).localeCompare(String(b.id)));
roundOneSeries.forEach((series) => {
  series.winnerTeamAbbr = series.higherSeed.teamAbbr;
  series.higherSeedWins = 4;
  series.lowerSeedWins = 0;
  series.games = 4;
});

const roundTwoAdapter = createSimulationSeasonAdapter({
  slotId: 'sim-slot-round-two-transition',
  state: roundTwoSeedState
});
const roundTwoState = roundTwoAdapter.simulateNextDay();
assert.equal(
  roundTwoState.postseasonState.phase,
  'playoffs_round_2',
  'simulateNextDay should advance a completed first round into the second round'
);
assert.ok(
  roundTwoState.postseasonState.bracket?.east?.secondRound?.length > 0,
  'advancing into the second round should update the East bracket snapshot beyond Round 1'
);
assert.ok(
  roundTwoState.postseasonState.bracket?.west?.secondRound?.length > 0,
  'advancing into the second round should update the West bracket snapshot beyond Round 1'
);

const finalsCloseoutSeedState = JSON.parse(JSON.stringify(playInState));
finalsCloseoutSeedState.seasonState.currentDay = 30;
finalsCloseoutSeedState.seasonState.currentWeek = 5;
finalsCloseoutSeedState.draftState.rostersByTeam.BOS = [
  { id: 1, name: 'Player 1', pos: 'PG', team: 'BOS', fp: 50 },
  { id: 2, name: 'Player 2', pos: 'SG', team: 'BOS', fp: 49 },
  { id: 3, name: 'Player 3', pos: 'SF', team: 'BOS', fp: 48 },
  { id: 4, name: 'Player 4', pos: 'PF', team: 'BOS', fp: 47 },
  { id: 5, name: 'Player 5', pos: 'C', team: 'BOS', fp: 46 }
];
finalsCloseoutSeedState.seasonState.lineupIdsByTeam.BOS = [1, 2, 3, 4, 5];
finalsCloseoutSeedState.postseasonState = {
  ...finalsCloseoutSeedState.postseasonState,
  phase: 'finals',
  currentRound: 'finals',
  currentDaySchedule: [
    {
      day: 30,
      gameId: 'finals-game-4',
      seriesId: 'finals',
      homeAbbr: 'BOS',
      awayAbbr: 'DAL'
    }
  ],
  bracket: {
    east: finalsCloseoutSeedState.postseasonState.bracket?.east || null,
    west: finalsCloseoutSeedState.postseasonState.bracket?.west || null,
    finals: {
      higherSeed: { teamAbbr: 'BOS', seed: 1, conference: 'East' },
      lowerSeed: { teamAbbr: 'DAL', seed: 1, conference: 'West' }
    }
  },
  seriesById: {
    ...(finalsCloseoutSeedState.postseasonState.seriesById || {}),
    finals: {
      id: 'finals',
      conference: 'finals',
      round: 'finals',
      higherSeed: { teamAbbr: 'BOS', seed: 1, conference: 'East' },
      lowerSeed: { teamAbbr: 'DAL', seed: 1, conference: 'West' },
      targetWins: 4,
      higherSeedWins: 3,
      lowerSeedWins: 0
    }
  }
};

const finalsCloseoutAdapter = createSimulationSeasonAdapter({
  slotId: 'sim-slot-finals-closeout',
  state: finalsCloseoutSeedState
});

const completedFinalsState = finalsCloseoutAdapter.simulateNextDay();
assert.equal(
  completedFinalsState.postseasonState.phase,
  'completed',
  'simulateNextDay should finalize the postseason once the Finals close out'
);
assert.equal(
  completedFinalsState.postseasonState.champion?.teamAbbr,
  'BOS',
  'simulateNextDay should crown the winning Finals team as champion'
);
assert.equal(
  completedFinalsState.postseasonState.champion?.teamName,
  'Boston Celtics',
  'completed postseason state should include champion team naming metadata for renderers'
);
assert.equal(
  completedFinalsState.postseasonState.champion?.finalsGames,
  4,
  'completed postseason state should include Finals length metadata for renderers'
);
assert.equal(
  completedFinalsState.postseasonState.runnerUp?.teamAbbr,
  'DAL',
  'simulateNextDay should preserve the Finals loser as runner-up'
);
assert.equal(
  completedFinalsState.postseasonState.runnerUp?.teamName,
  'Dallas Mavericks',
  'completed postseason state should include runner-up team naming metadata for renderers'
);
assert.match(
  String(completedFinalsState.postseasonState.completedAt || ''),
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
  'completed postseason state should include an ISO-like completion timestamp'
);

const completedFreezeDay = completedFinalsState.seasonState.currentDay;
const completedFreezeChampion = JSON.parse(JSON.stringify(completedFinalsState.postseasonState.champion));
const completedFreezeRunnerUp = JSON.parse(JSON.stringify(completedFinalsState.postseasonState.runnerUp));
const completedFreezeState = finalsCloseoutAdapter.simulateNextDay();
assert.equal(
  completedFreezeState.seasonState.currentDay,
  completedFreezeDay,
  'completed postseason state should not advance the simulation day on later simulateNextDay calls'
);
assert.deepStrictEqual(
  completedFreezeState.postseasonState.champion,
  completedFreezeChampion,
  'completed postseason state should keep champion details frozen on later simulateNextDay calls'
);
assert.deepStrictEqual(
  completedFreezeState.postseasonState.runnerUp,
  completedFreezeRunnerUp,
  'completed postseason state should keep runner-up details frozen on later simulateNextDay calls'
);

const postseasonDayCount = roundOneState.seasonState.currentDay;
const postseasonLogCount = roundOneState.seasonState.completedGameLogs.length;
const postseasonAlreadyOverState = postseasonTransitionAdapter.simulateNextDay();
assert.equal(
  postseasonAlreadyOverState.seasonState.currentDay,
  postseasonDayCount + 1,
  'simulateNextDay should keep advancing one postseason day at a time after play-in begins'
);
assert.equal(
  postseasonAlreadyOverState.seasonState.completedGameLogs.length > postseasonLogCount,
  true,
  'simulateNextDay should append postseason game logs once the postseason schedule is active'
);
assert.notEqual(
  postseasonAlreadyOverState.postseasonState.phase,
  'postseason_ready',
  'simulateNextDay should keep postseason progress moving after play-in starts'
);

const nflState = {
  simulationMode: 'nfl_mixed_era_single_player_v1',
  leagueShell: {
    anchorSeasonId: 'nfl_2014',
    anchorSeasonLabel: '2014 NFL',
    sport: 'nfl',
    rosterSize: 13,
    teams: [
      { abbr: 'DAL', name: 'Dallas Cowboys', conference: 'NFC', division: 'East' },
      { abbr: 'PHI', name: 'Philadelphia Eagles', conference: 'NFC', division: 'East' },
      { abbr: 'NE', name: 'New England Patriots', conference: 'AFC', division: 'East' },
      { abbr: 'SEA', name: 'Seattle Seahawks', conference: 'NFC', division: 'West' },
      { abbr: 'GB', name: 'Green Bay Packers', conference: 'NFC', division: 'North' },
      { abbr: 'TEN', name: 'Tennessee Titans', conference: 'AFC', division: 'South' }
    ]
  },
  sourceSeasons: {
    sourceSeasonLabels: ['2014']
  },
  draftState: {
    controlledTeamAbbr: 'DAL',
    rostersByTeam: {
      DAL: [
        { id: 9, name: 'Tony Romo', pos: 'QB', team: 'DAL', fp: 30 },
        { id: 29, name: 'DeMarco Murray', pos: 'RB', team: 'DAL', fp: 24 },
        { id: 88, name: 'Dez Bryant', pos: 'WR', team: 'DAL', fp: 21 },
        { id: 82, name: 'Jason Witten', pos: 'TE', team: 'DAL', fp: 14 },
        { id: 9001, name: 'Dallas DST', pos: 'DST', team: 'DAL', fp: 11 },
        { id: 5, name: 'Dan Bailey', pos: 'K', team: 'DAL', fp: 9 }
      ],
      PHI: [],
      NE: [],
      SEA: [],
      GB: [],
      TEN: []
    },
    freeAgents: []
  },
  seasonState: {
    currentDay: 1,
    currentWeek: 1,
    lineupIdsByTeam: {
      DAL: [9, 29, 88, 82, 9001, 5]
    },
    scheduleByDay: {
      1: [
        { homeAbbr: 'SEA', awayAbbr: 'GB' },
        { homeAbbr: 'DAL', awayAbbr: 'SF' }
      ],
      2: [
        { homeAbbr: 'TEN', awayAbbr: 'DAL' }
      ]
    },
    standings: [
      { teamAbbr: 'DAL', conference: 'NFC', division: 'East', w: 0, l: 0, pf: 0, pa: 0 },
      { teamAbbr: 'PHI', conference: 'NFC', division: 'East', w: 0, l: 0, pf: 0, pa: 0 },
      { teamAbbr: 'NE', conference: 'AFC', division: 'East', w: 0, l: 0, pf: 0, pa: 0 },
      { teamAbbr: 'SEA', conference: 'NFC', division: 'West', w: 0, l: 0, pf: 0, pa: 0 },
      { teamAbbr: 'GB', conference: 'NFC', division: 'North', w: 0, l: 0, pf: 0, pa: 0 },
      { teamAbbr: 'TEN', conference: 'AFC', division: 'South', w: 0, l: 0, pf: 0, pa: 0 }
    ],
    completedGameLogs: [],
    activityLog: []
  },
  postseasonState: {
    phase: 'regular_season'
  }
};

assert.equal(isSupportedSimulationSeasonState(nflState), true);

const nflAdapter = createSimulationSeasonAdapter({
  slotId: 'nfl-slot-1',
  state: nflState
});

assert.equal(nflAdapter.getModeId(), 'nfl_mixed_era_single_player_v1');
assert.equal(nflAdapter.getHubViewModel().leagueLabel, '2014 NFL Simulation');
assert.equal(nflAdapter.getHubViewModel().primaryAction.label, 'Sim Week');
assert.equal(nflAdapter.getScheduleViewModel().cycleLabel, 'Week 1');
assert.ok(Array.isArray(nflAdapter.getRosterViewModel().starterSlots));
assert.deepStrictEqual(
  nflAdapter.getRosterViewModel().starterSlots,
  ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'DST', 'K']
);
assert.ok(
  nflAdapter.getStandingsViewModel().sections.some((section) => section.title === 'NFC East'),
  'NFL standings view should expose division-grouped sections'
);

const nflLegacyWashingtonState = {
  simulationMode: 'nfl_mixed_era_single_player_v1',
  leagueShell: {
    anchorSeasonId: 'nfl_2014',
    anchorSeasonLabel: '2014 NFL',
    sport: 'nfl',
    rosterSize: 13,
    teams: [
      { abbr: 'WAS', name: 'Washington Redskins', conference: 'NFC', division: 'East' },
      { abbr: 'DAL', name: 'Dallas Cowboys', conference: 'NFC', division: 'East' }
    ]
  },
  sourceSeasons: {
    sourceSeasonLabels: ['2014']
  },
  draftState: {
    controlledTeamAbbr: 'WAS',
    rostersByTeam: {
      WAS: [],
      DAL: []
    },
    freeAgents: []
  },
  seasonState: {
    currentDay: 1,
    currentWeek: 1,
    lineupIdsByTeam: {},
    standings: [
      { teamAbbr: 'WAS', conference: 'NFC', division: 'East', w: 0, l: 0, pf: 0, pa: 0 },
      { teamAbbr: 'DAL', conference: 'NFC', division: 'East', w: 0, l: 0, pf: 0, pa: 0 }
    ],
    completedGameLogs: [],
    scheduleByDay: {
      1: [
        { homeAbbr: 'WSH', awayAbbr: 'DAL' }
      ]
    },
    activityLog: []
  },
  postseasonState: {
    phase: 'regular_season'
  }
};

const nflLegacyWashingtonAdapter = createSimulationSeasonAdapter({
  slotId: 'nfl-slot-legacy-washington',
  state: nflLegacyWashingtonState
});

assert.equal(
  nflLegacyWashingtonAdapter.getScheduleViewModel().nextGame?.opponentAbbr,
  'DAL',
  'NFL schedule view should canonicalize persisted WSH games to WAS'
);
assert.equal(
  nflLegacyWashingtonAdapter.getScheduleViewModel().scheduleByDay[1][0].homeAbbr,
  'WAS',
  'NFL schedule view should heal persisted schedule entries against the current shell'
);

const nflLegacyWashingtonNextState = nflLegacyWashingtonAdapter.simulateNextDay();
assert.equal(
  nflLegacyWashingtonNextState.seasonState.completedGameLogs.length,
  1,
  'simulateNextDay should advance a healed NFL week instead of dropping the game'
);
assert.equal(nflLegacyWashingtonNextState.seasonState.scheduleByDay[1][0].homeAbbr, 'WAS');

const nflPostseasonReadyAdapter = createSimulationSeasonAdapter({
  slotId: 'nfl-slot-postseason-ready',
  state: {
    ...nflState,
    postseasonState: {
      phase: 'postseason_ready'
    }
  }
});

assert.equal(
  nflPostseasonReadyAdapter.getHubViewModel().primaryAction.label,
  'Review Playoffs',
  'NFL hubs should stop advertising Sim Week once the regular season is complete'
);

const nflPlayoffPictureAdapter = createSimulationSeasonAdapter({
  slotId: 'nfl-slot-playoff-picture',
  state: {
    simulationMode: 'nfl_mixed_era_single_player_v1',
    leagueShell: {
      anchorSeasonId: 'nfl_2014',
      anchorSeasonLabel: '2014 NFL',
      sport: 'nfl',
      teams: [
        { abbr: 'BUF', name: 'Buffalo Bills', conference: 'AFC', division: 'East' },
        { abbr: 'NE', name: 'New England Patriots', conference: 'AFC', division: 'East' },
        { abbr: 'IND', name: 'Indianapolis Colts', conference: 'AFC', division: 'South' },
        { abbr: 'PIT', name: 'Pittsburgh Steelers', conference: 'AFC', division: 'North' },
        { abbr: 'BAL', name: 'Baltimore Ravens', conference: 'AFC', division: 'North' },
        { abbr: 'DEN', name: 'Denver Broncos', conference: 'AFC', division: 'West' }
      ]
    },
    sourceSeasons: { sourceSeasonLabels: ['2014'] },
    draftState: {
      controlledTeamAbbr: 'BUF',
      rostersByTeam: { BUF: [], NE: [], IND: [], PIT: [], BAL: [], DEN: [] },
      freeAgents: []
    },
    seasonState: {
      currentDay: 2,
      currentWeek: 2,
      scheduleByDay: { 1: [] },
      lineupIdsByTeam: {},
      standings: [
        { teamAbbr: 'BUF', conference: 'AFC', division: 'East', w: 12, l: 4, pf: 410, pa: 300 },
        { teamAbbr: 'NE', conference: 'AFC', division: 'East', w: 11, l: 5, pf: 390, pa: 310 },
        { teamAbbr: 'IND', conference: 'AFC', division: 'South', w: 9, l: 7, pf: 355, pa: 330 },
        { teamAbbr: 'PIT', conference: 'AFC', division: 'North', w: 10, l: 6, pf: 370, pa: 320, divisionLeader: true },
        { teamAbbr: 'BAL', conference: 'AFC', division: 'North', w: 11, l: 5, pf: 365, pa: 315, divisionLeader: false },
        { teamAbbr: 'DEN', conference: 'AFC', division: 'West', w: 8, l: 8, pf: 340, pa: 338 }
      ],
      completedGameLogs: [],
      activityLog: []
    },
    postseasonState: { phase: 'regular_season' }
  }
});

const nflPlayoffPictureState = nflPlayoffPictureAdapter.simulateNextDay();
assert.deepStrictEqual(
  nflPlayoffPictureState.postseasonState.playoffPicture.afc.slice(0, 6).map((row) => row.teamAbbr),
  ['BUF', 'PIT', 'IND', 'DEN', 'NE', 'BAL'],
  'nfl playoff picture should seed division winners ahead of wild cards even when a wild card has a better record'
);

const nfl2014PostseasonAdapter = createSimulationSeasonAdapter({
  slotId: 'nfl-slot-2014-postseason',
  state: {
    simulationMode: 'nfl_mixed_era_single_player_v1',
    leagueShell: {
      anchorSeasonId: 'nfl_2014',
      anchorSeasonLabel: '2014 NFL',
      sport: 'nfl',
      teams: [
        { abbr: 'NE', name: 'New England Patriots', conference: 'AFC', division: 'East' },
        { abbr: 'DEN', name: 'Denver Broncos', conference: 'AFC', division: 'West' },
        { abbr: 'IND', name: 'Indianapolis Colts', conference: 'AFC', division: 'South' },
        { abbr: 'PIT', name: 'Pittsburgh Steelers', conference: 'AFC', division: 'North' },
        { abbr: 'CIN', name: 'Cincinnati Bengals', conference: 'AFC', division: 'North' },
        { abbr: 'BAL', name: 'Baltimore Ravens', conference: 'AFC', division: 'North' },
        { abbr: 'SEA', name: 'Seattle Seahawks', conference: 'NFC', division: 'West' },
        { abbr: 'GB', name: 'Green Bay Packers', conference: 'NFC', division: 'North' },
        { abbr: 'DAL', name: 'Dallas Cowboys', conference: 'NFC', division: 'East' },
        { abbr: 'CAR', name: 'Carolina Panthers', conference: 'NFC', division: 'South' },
        { abbr: 'ARI', name: 'Arizona Cardinals', conference: 'NFC', division: 'West' },
        { abbr: 'DET', name: 'Detroit Lions', conference: 'NFC', division: 'North' }
      ]
    },
    sourceSeasons: { sourceSeasonLabels: ['2014'] },
    draftState: {
      controlledTeamAbbr: 'NE',
      rostersByTeam: {
        NE: [], DEN: [], IND: [], PIT: [], CIN: [], BAL: [],
        SEA: [], GB: [], DAL: [], CAR: [], ARI: [], DET: []
      },
      freeAgents: []
    },
    seasonState: {
      currentDay: 18,
      currentWeek: 18,
      scheduleByDay: { 1: [] },
      lineupIdsByTeam: {},
      standings: [
        { teamAbbr: 'NE', conference: 'AFC', division: 'East', w: 12, l: 4, pf: 468, pa: 313 },
        { teamAbbr: 'DEN', conference: 'AFC', division: 'West', w: 12, l: 4, pf: 482, pa: 354 },
        { teamAbbr: 'IND', conference: 'AFC', division: 'South', w: 11, l: 5, pf: 458, pa: 357 },
        { teamAbbr: 'PIT', conference: 'AFC', division: 'North', w: 11, l: 5, pf: 432, pa: 348 },
        { teamAbbr: 'CIN', conference: 'AFC', division: 'North', w: 10, l: 5, pf: 365, pa: 344 },
        { teamAbbr: 'BAL', conference: 'AFC', division: 'North', w: 10, l: 6, pf: 409, pa: 302 },
        { teamAbbr: 'SEA', conference: 'NFC', division: 'West', w: 12, l: 4, pf: 412, pa: 254 },
        { teamAbbr: 'GB', conference: 'NFC', division: 'North', w: 12, l: 4, pf: 486, pa: 301 },
        { teamAbbr: 'DAL', conference: 'NFC', division: 'East', w: 12, l: 4, pf: 467, pa: 352 },
        { teamAbbr: 'CAR', conference: 'NFC', division: 'South', w: 7, l: 8, pf: 339, pa: 376 },
        { teamAbbr: 'ARI', conference: 'NFC', division: 'West', w: 11, l: 5, pf: 358, pa: 313 },
        { teamAbbr: 'DET', conference: 'NFC', division: 'North', w: 11, l: 5, pf: 326, pa: 262 }
      ],
      completedGameLogs: [],
      activityLog: []
    },
    postseasonState: { phase: 'regular_season' }
  }
});

const nfl2014PostseasonState = nfl2014PostseasonAdapter.simulateNextDay();
assert.equal(
  nfl2014PostseasonState.postseasonState.phase,
  'wild_card',
  'nfl postseason seeding should enter the exact 2014 wild-card phase after the regular season ends'
);
assert.deepStrictEqual(
  nfl2014PostseasonState.postseasonState.playoffPicture.afc.map((row) => row.teamAbbr),
  ['NE', 'DEN', 'IND', 'PIT', 'CIN', 'BAL'],
  'nfl postseason seeding should preserve the exact 2014 AFC field order'
);
assert.deepStrictEqual(
  nfl2014PostseasonState.postseasonState.playoffPicture.nfc.map((row) => row.teamAbbr),
  ['SEA', 'GB', 'DAL', 'CAR', 'ARI', 'DET'],
  'nfl postseason seeding should preserve the exact 2014 NFC field order'
);
assert.deepStrictEqual(
  nfl2014PostseasonState.postseasonState.playoffPicture.afc.slice(0, 2).map((row) => row.bye),
  [true, true],
  'nfl postseason seeding should give the AFC top two seeds a bye'
);
assert.deepStrictEqual(
  nfl2014PostseasonState.postseasonState.playoffPicture.nfc.slice(0, 2).map((row) => row.bye),
  [true, true],
  'nfl postseason seeding should give the NFC top two seeds a bye'
);
assert.deepStrictEqual(
  (nfl2014PostseasonState.postseasonState.currentWeekSchedule || []).map((game) => `${game.homeAbbr}-${game.awayAbbr}`),
  ['IND-BAL', 'PIT-CIN', 'DAL-DET', 'CAR-ARI'],
  'nfl postseason seeding should build the exact 2014 wild-card schedule'
);

console.log('simulation season adapter test passed');
