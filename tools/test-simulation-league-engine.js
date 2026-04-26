const assert = require('node:assert/strict');

global.window = globalThis;

const { getSimulationShell } = require('../simulation-mode-config.js');
const {
  buildSimulationSeasonSchedule,
  simulateSimulationGameDay,
  applySimulationDayResults,
  resolveRenderedGameScores
} = require('../simulation-league-engine.js');

const shell = getSimulationShell();

const schedule = buildSimulationSeasonSchedule(shell);
assert.equal(schedule.byDay[1].length, 15);
assert.equal(schedule.teamGameCounts.LAL, 82);
assert.equal(schedule.teamGameCounts.BOS, 82);

const homeAwayCounts = Object.fromEntries(
  shell.teams.map((team) => [team.abbr, { home: 0, away: 0 }])
);

Object.values(schedule.byDay).forEach((games) => {
  assert.equal(games.length, 15);
  games.forEach((game) => {
    homeAwayCounts[game.homeAbbr].home += 1;
    homeAwayCounts[game.awayAbbr].away += 1;
  });
});

shell.teams.forEach((team) => {
  const split = homeAwayCounts[team.abbr];
  assert.equal(split.home + split.away, 82, `${team.abbr} should play 82 scheduled games`);
  assert.ok(
    Math.abs(split.home - split.away) <= 2,
    `${team.abbr} has an imbalanced home/away split: ${split.home}/${split.away}`
  );
});

const roster = Array.from({ length: 10 }, (_, index) => ({
  id: index + 1,
  name: `Starter ${index + 1}`,
  team: 'SIM',
  pos: index < 2 ? 'G' : index < 4 ? 'F' : 'C',
  designation: index === 0 ? 'OUT' : 'ACTIVE',
  fp: 55 - index,
  mixedEraOverall: 95 - index,
  pts: 30 - index,
  reb: 10 - Math.floor(index / 2),
  ast: 8 - Math.floor(index / 3),
  stl: index < 3 ? 2 : 1,
  blk: index < 4 ? 1 : 0,
  to: 3,
  min: 36 - index,
  fgm: 10 - Math.floor(index / 2),
  fga: 18 - index,
  ftm: 6 - Math.floor(index / 3),
  fta: 7 - Math.floor(index / 3),
  tpm: index < 4 ? 3 : 1
}));

const state = {
  seasonId: 'sim-season-1',
  currentDay: 1,
  currentWeek: 1,
  teams: shell.teams.map((team) => team.name),
  teamMeta: shell.teams,
  allRosters: shell.teams.map(() => roster.map((player, idx) => ({ ...player, id: player.id + idx }))),
  standings: shell.teams.map((team, index) => ({
    teamIdx: index,
    teamAbbr: team.abbr,
    conference: team.conference,
    division: team.division,
    w: 0,
    l: 0,
    pf: 0,
    pa: 0
  }))
};

const dayResult = simulateSimulationGameDay({
  state,
  schedule,
  day: 1,
  lineupIdsByTeam: Object.fromEntries(shell.teams.map((team) => [team.abbr, []]))
});

assert.equal(dayResult.gameLogs.length, 15);
assert.ok(dayResult.gameLogs.every((game) => game.homeScore >= 70 && game.awayScore >= 70));
assert.ok(
  dayResult.gameLogs.some((game) => game.homeScore !== 82 || game.awayScore !== 82),
  'fresh simulation leagues should not devolve into 82-82 ties when lineups are unset'
);
assert.ok(
  Object.values(dayResult.resultsByTeam).every((teamResult) => teamResult.entries.length === 5),
  'engine should auto-select five starters when no lineup state has been saved yet'
);
assert.ok(
  Object.values(dayResult.resultsByTeam).every((teamResult) =>
    teamResult.entries.every((entry) => String(entry?.player?.designation || 'ACTIVE').toUpperCase() !== 'OUT')
  ),
  'engine should not auto-start players marked OUT'
);
assert.ok(
  dayResult.gameLogs.every((game) => game.outcomeSource === 'simulation_engine'),
  'engine game logs should explicitly mark simulation_engine as the only outcome source'
);
assert.ok(
  Object.values(dayResult.resultsByTeam).every((teamResult) =>
    String(teamResult?.statSource || '') === 'simulation_engine_generated' &&
    teamResult.entries.every((entry) => String(entry?.statSource || '') === 'simulation_engine_generated')
  ),
  'engine day results should explicitly mark generated team and player stats instead of relying on historical-source assumptions'
);

const updated = applySimulationDayResults(state, dayResult);
assert.equal(updated.currentDay, 2);
assert.equal(updated.completedGameLogs.length, 15);
assert.ok(
  updated.completedGameLogs.every((game) => game.outcomeSource === 'simulation_engine'),
  'applied day results should preserve the engine outcome-source marker on persisted logs'
);
assert.equal(
  updated.standings.reduce((sum, row) => sum + Number(row.w || 0) + Number(row.l || 0), 0),
  30
);

const nflShell = getSimulationShell({ sport: 'nfl', anchorSeasonId: 'nfl_2014' });
const nflRoster = Array.from({ length: 13 }, (_, index) => ({
  id: index + 1,
  name: `NFL Starter ${index + 1}`,
  team: 'DAL',
  pos: ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'DST', 'K', 'LB', 'CB', 'S', 'EDGE'][index] || 'FLEX',
  designation: 'ACTIVE',
  fp: 28 - index,
  mixedEraOverall: 94 - index,
  pts: 20 - Math.floor(index / 2),
  reb: 6 - Math.floor(index / 4),
  ast: 5 - Math.floor(index / 5),
  stl: index < 6 ? 2 : 1,
  blk: index < 4 ? 1 : 0,
  to: 2,
  min: 34 - index,
  fgm: 8 - Math.floor(index / 2),
  fga: 14 - index,
  ftm: 4 - Math.floor(index / 4),
  fta: 5 - Math.floor(index / 4),
  tpm: index < 5 ? 2 : 0
}));

const nflState = {
  sport: 'nfl',
  seasonId: 'nfl-sim-season-1',
  currentDay: 1,
  currentWeek: 1,
  teams: nflShell.teams.map((team) => team.name),
  teamMeta: nflShell.teams,
  allRosters: nflShell.teams.map((team, teamIdx) => nflRoster.map((player) => ({
    ...player,
    id: teamIdx * 100 + player.id,
    team: team.abbr
  }))),
  standings: nflShell.teams.map((team, index) => ({
    teamIdx: index,
    teamAbbr: team.abbr,
    conference: team.conference,
    division: team.division,
    w: 0,
    l: 0,
    pf: 0,
    pa: 0
  }))
};

const nflLineups = Object.fromEntries(nflShell.teams.map((team, teamIdx) => [
  team.abbr,
  nflState.allRosters[teamIdx].slice(0, 9).map((player) => player.id)
]));

const nflDayResult = simulateSimulationGameDay({
  state: nflState,
  schedule: { byDay: { 1: [{ homeAbbr: 'DAL', awayAbbr: 'PHI' }] } },
  day: 1,
  lineupIdsByTeam: nflLineups
});

assert.equal(nflDayResult.gameLogs.length, 1);
assert.ok(
  Object.values(nflDayResult.resultsByTeam).every((teamResult) => teamResult.entries.length === 9),
  'nfl simulation should use all nine starter slots instead of hard-capping at five players'
);
assert.ok(
  nflDayResult.gameLogs.every((game) => game.homeScore < 70 && game.awayScore < 70),
  'nfl simulation should render football-sized scores instead of nba-style triple-digit totals'
);
assert.ok(
  nflDayResult.gameLogs.every((game) => game.outcomeSource === 'simulation_engine'),
  'nfl simulation should tag weekly outcomes as engine-generated instead of replayed historical results'
);

const nflPartialLineupDayResult = simulateSimulationGameDay({
  state: nflState,
  schedule: { byDay: { 1: [{ homeAbbr: 'DAL', awayAbbr: 'PHI' }] } },
  day: 1,
  lineupIdsByTeam: {
    DAL: nflState.allRosters[0].slice(0, 3).map((player) => player.id),
    PHI: nflState.allRosters[1].slice(0, 4).map((player) => player.id)
  }
});

assert.ok(
  Object.values(nflPartialLineupDayResult.resultsByTeam).every((teamResult) => teamResult.entries.length === 9),
  'partial nfl requested lineups should still backfill to the full nine starter slots'
);

const nflInvalidRosterTemplate = [
  { id: 1, name: 'QB One', team: 'DAL', pos: 'QB', designation: 'ACTIVE', fp: 32, mixedEraOverall: 98 },
  { id: 2, name: 'QB Two', team: 'DAL', pos: 'QB', designation: 'ACTIVE', fp: 31, mixedEraOverall: 97 },
  { id: 3, name: 'RB One', team: 'DAL', pos: 'RB', designation: 'ACTIVE', fp: 30, mixedEraOverall: 96 },
  { id: 4, name: 'RB Two', team: 'DAL', pos: 'RB', designation: 'ACTIVE', fp: 29, mixedEraOverall: 95 },
  { id: 5, name: 'WR One', team: 'DAL', pos: 'WR', designation: 'ACTIVE', fp: 28, mixedEraOverall: 94 },
  { id: 6, name: 'WR Two', team: 'DAL', pos: 'WR', designation: 'ACTIVE', fp: 27, mixedEraOverall: 93 },
  { id: 7, name: 'TE One', team: 'DAL', pos: 'TE', designation: 'ACTIVE', fp: 26, mixedEraOverall: 92 },
  { id: 8, name: 'WR Three', team: 'DAL', pos: 'WR', designation: 'ACTIVE', fp: 25, mixedEraOverall: 91 },
  { id: 9, name: 'Corner One', team: 'DAL', pos: 'CB', designation: 'ACTIVE', fp: 24, mixedEraOverall: 90 },
  { id: 10, name: 'Dallas DST', team: 'DAL', pos: 'DST', designation: 'ACTIVE', fp: 23, mixedEraOverall: 89 },
  { id: 11, name: 'Kicker One', team: 'DAL', pos: 'K', designation: 'ACTIVE', fp: 22, mixedEraOverall: 88 }
].map((player) => ({
  ...player,
  pts: 12,
  reb: 3,
  ast: 2,
  stl: 1,
  blk: 0,
  to: 1,
  min: 20,
  fgm: 5,
  fga: 9,
  ftm: 2,
  fta: 2,
  tpm: 0
}));

const nflInvalidState = {
  ...nflState,
  allRosters: nflShell.teams.map((team, teamIdx) => nflInvalidRosterTemplate.map((player) => ({
    ...player,
    id: teamIdx * 100 + player.id,
    team: team.abbr
  })))
};

const nflInvalidLineups = Object.fromEntries(nflShell.teams.map((team, teamIdx) => [
  team.abbr,
  nflInvalidState.allRosters[teamIdx].slice(0, 9).map((player) => player.id)
]));

const nflInvalidDayResult = simulateSimulationGameDay({
  state: nflInvalidState,
  schedule: { byDay: { 1: [{ homeAbbr: 'DAL', awayAbbr: 'PHI' }] } },
  day: 1,
  lineupIdsByTeam: nflInvalidLineups
});

const nflSlotValidatedEntries = Object.values(nflInvalidDayResult.resultsByTeam)[0]?.entries || [];
const nflHomePositions = nflSlotValidatedEntries.map((entry) => String(entry?.player?.pos || '').trim().toUpperCase());
assert.equal(
  nflHomePositions.filter((position) => position === 'QB').length,
  1,
  'nfl starter selection should avoid carrying duplicate qbs into the weekly sim when required slots are missing'
);
assert.ok(
  nflHomePositions.includes('DST'),
  'nfl starter selection should backfill the required dst slot from the bench when a requested lineup omits it'
);
assert.ok(
  nflHomePositions.includes('K'),
  'nfl starter selection should backfill the required kicker slot from the bench when a requested lineup omits it'
);

const controlledNflRosterTemplate = [
  { id: 1, name: 'Dak Prescott', team: 'DAL', pos: 'QB', designation: 'ACTIVE', fp: 30, mixedEraOverall: 95 },
  { id: 2, name: 'DeMarco Murray', team: 'DAL', pos: 'RB', designation: 'ACTIVE', fp: 24, mixedEraOverall: 93 },
  { id: 3, name: 'Joseph Randle', team: 'DAL', pos: 'RB', designation: 'ACTIVE', fp: 15, mixedEraOverall: 81 },
  { id: 4, name: 'Dez Bryant', team: 'DAL', pos: 'WR', designation: 'ACTIVE', fp: 26, mixedEraOverall: 97 },
  { id: 5, name: 'Terrance Williams', team: 'DAL', pos: 'WR', designation: 'ACTIVE', fp: 17, mixedEraOverall: 84 },
  { id: 6, name: 'Jason Witten', team: 'DAL', pos: 'TE', designation: 'ACTIVE', fp: 14, mixedEraOverall: 88 },
  { id: 7, name: 'Cole Beasley', team: 'DAL', pos: 'WR', designation: 'ACTIVE', fp: 12, mixedEraOverall: 79 },
  { id: 8, name: 'Dan Bailey', team: 'DAL', pos: 'K', designation: 'ACTIVE', fp: 9, mixedEraOverall: 82 },
  { id: 9, name: 'Cowboys DST', team: 'DAL', pos: 'DST', designation: 'ACTIVE', fp: 10, mixedEraOverall: 83 },
  { id: 10, name: 'Bench RB Star', team: 'DAL', pos: 'RB', designation: 'ACTIVE', fp: 35, mixedEraOverall: 99 }
].map((player) => ({
  ...player,
  pts: 14,
  reb: 4,
  ast: 3,
  stl: 1,
  blk: 0,
  to: 1,
  min: 24,
  fgm: 5,
  fga: 9,
  ftm: 2,
  fta: 2,
  tpm: 0
}));

const controlledNflState = {
  sport: 'nfl',
  seasonId: 'nfl-controlled-lineup-1',
  currentDay: 1,
  currentWeek: 1,
  teamMeta: [
    { abbr: 'DAL', name: 'Dallas Cowboys', conference: 'NFC', division: 'East' },
    { abbr: 'PHI', name: 'Philadelphia Eagles', conference: 'NFC', division: 'East' }
  ],
  teams: ['Dallas Cowboys', 'Philadelphia Eagles'],
  draftState: {
    controlledTeamAbbr: 'DAL'
  },
  seasonState: {
    lineupSlotsByTeam: {
      DAL: {
        QB: 1,
        RB1: 2,
        RB2: 3,
        WR1: 4,
        WR2: 5,
        TE: 6,
        FLEX: 7,
        K: 8,
        DST: 9
      }
    }
  },
  allRosters: [
    controlledNflRosterTemplate.map((player) => ({ ...player })),
    controlledNflRosterTemplate.map((player) => ({
      ...player,
      id: player.id + 100,
      team: 'PHI',
      name: player.name.replace('Cowboys', 'Eagles')
    }))
  ],
  standings: [
    { teamIdx: 0, teamAbbr: 'DAL', conference: 'NFC', division: 'East', w: 0, l: 0, pf: 0, pa: 0 },
    { teamIdx: 1, teamAbbr: 'PHI', conference: 'NFC', division: 'East', w: 0, l: 0, pf: 0, pa: 0 }
  ]
};

const controlledNflDayResult = simulateSimulationGameDay({
  state: controlledNflState,
  schedule: { byDay: { 1: [{ homeAbbr: 'DAL', awayAbbr: 'PHI' }] } },
  day: 1,
  lineupIdsByTeam: {
    DAL: [1, 2, 10, 4, 5, 6, 7, 8, 9]
  }
});

const controlledHomeEntries = controlledNflDayResult.resultsByTeam[0]?.entries || [];
const controlledHomeIds = controlledHomeEntries.map((entry) => Number(entry?.player?.id));
const controlledAwayEntries = controlledNflDayResult.resultsByTeam[1]?.entries || [];
const controlledAwayPositions = controlledAwayEntries.map((entry) => String(entry?.player?.pos || '').trim().toUpperCase());

assert.ok(
  controlledHomeIds.includes(3),
  'controlled nfl teams should honor the saved slot-based lineup for RB2 instead of dropping to bench best-available starters'
);
assert.ok(
  !controlledHomeIds.includes(10),
  'controlled nfl teams should not let a benched player silently count as a starter when a slot lineup is already assigned'
);
assert.equal(
  controlledAwayEntries.length,
  9,
  'cpu nfl teams should still auto-build a full legal fantasy lineup when no slot lineup is assigned'
);
assert.ok(
  controlledAwayPositions.includes('K') && controlledAwayPositions.includes('DST'),
  'cpu nfl auto-lineups should still cover the required kicker and dst slots'
);

const roundedTieState = {
  sport: 'nfl',
  currentDay: 1,
  currentWeek: 1,
  standings: [
    { teamIdx: 0, teamAbbr: 'DAL', w: 0, l: 0, pf: 0, pa: 0 },
    { teamIdx: 1, teamAbbr: 'PHI', w: 0, l: 0, pf: 0, pa: 0 }
  ]
};

const roundedTieUpdated = applySimulationDayResults(roundedTieState, {
  gameLogs: [
    {
      home: 0,
      away: 1,
      homeScore: 14,
      awayScore: 14,
      winner: 'away'
    }
  ]
});

assert.equal(
  roundedTieUpdated.standings.find((row) => row.teamIdx === 1)?.w,
  1,
  'standings should respect the authoritative winner even when rounded rendered scores tie'
);
assert.equal(
  roundedTieUpdated.standings.find((row) => row.teamIdx === 0)?.l,
  1,
  'authoritative winner handling should prevent the rounded-score tie from crediting the wrong home team'
);
assert.equal(
  roundedTieUpdated.currentWeek,
  2,
  'direct nfl engine callers should advance the simulation week one-for-one with each completed week'
);

const renderedNflTieBreakResult = resolveRenderedGameScores({
  homeTotal: 0.2,
  awayTotal: 0.4,
  winner: 'away'
}, {
  sport: 'nfl'
});

assert.equal(
  renderedNflTieBreakResult.homeScore,
  8,
  'nfl rendered score tie-breaks should keep the loser on the rounded baseline when totals collapse'
);
assert.equal(
  renderedNflTieBreakResult.awayScore,
  9,
  'nfl rendered score tie-breaks should bump the displayed winner by one point when rounded totals would otherwise tie'
);

console.log('simulation league engine test passed');
