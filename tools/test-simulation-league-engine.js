const assert = require('node:assert/strict');

global.window = globalThis;

const { getSimulationShell } = require('../simulation-mode-config.js');
const {
  buildSimulationSeasonSchedule,
  simulateSimulationGameDay,
  applySimulationDayResults
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

const updated = applySimulationDayResults(state, dayResult);
assert.equal(updated.currentDay, 2);
assert.equal(updated.completedGameLogs.length, 15);
assert.equal(
  updated.standings.reduce((sum, row) => sum + Number(row.w || 0) + Number(row.l || 0), 0),
  30
);

console.log('simulation league engine test passed');
