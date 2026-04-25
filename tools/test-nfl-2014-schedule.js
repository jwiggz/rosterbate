const assert = require('node:assert/strict');

global.window = globalThis;

const { getSimulationShell } = require('../simulation-mode-config.js');
const {
  buildNfl2014ScheduleByWeek,
  flattenNfl2014Schedule
} = require('../simulation-nfl-2014-schedule.js');
const { buildSimulationSeasonSchedule } = require('../simulation-league-engine.js');

const byWeek = buildNfl2014ScheduleByWeek();
const flattened = flattenNfl2014Schedule(byWeek);

assert.equal(Object.keys(byWeek).length, 17, 'NFL 2014 schedule should cover 17 weeks');
assert.equal(flattened.length, 256, 'NFL 2014 schedule should contain 256 games');

assert.deepStrictEqual(byWeek[1][0], {
  homeAbbr: 'SEA',
  awayAbbr: 'GB'
});

assert.ok(
  byWeek[4].some((game) => game.homeAbbr === 'SF' && game.awayAbbr === 'PHI'),
  'Week 4 should include Eagles at 49ers'
);

assert.ok(
  byWeek[17].some((game) => game.homeAbbr === 'GB' && game.awayAbbr === 'DET'),
  'Week 17 should include Lions at Packers'
);

const nflShell = getSimulationShell({ sport: 'nfl', anchorSeasonId: 'nfl_2014' });
const nflSchedule = buildSimulationSeasonSchedule(nflShell);
const nflTeamAbbrs = new Set(nflShell.teams.map((team) => team.abbr));

assert.ok(
  nflTeamAbbrs.has('WAS'),
  'NFL shell should include Washington as WAS'
);
assert.equal(
  nflTeamAbbrs.has('WSH'),
  false,
  'NFL shell should not include WSH'
);

for (const game of flattened) {
  assert.ok(
    nflTeamAbbrs.has(game.homeAbbr),
    `Unknown home team abbreviation: ${game.homeAbbr}`
  );
  assert.ok(
    nflTeamAbbrs.has(game.awayAbbr),
    `Unknown away team abbreviation: ${game.awayAbbr}`
  );
}

assert.equal(
  flattened.some((game) => game.homeAbbr === 'WSH' || game.awayAbbr === 'WSH'),
  false,
  'NFL 2014 schedule should not use WSH'
);
assert.equal(
  flattened.some((game) => game.homeAbbr === 'WAS' || game.awayAbbr === 'WAS'),
  true,
  'NFL 2014 schedule should use WAS for Washington'
);

assert.deepStrictEqual(nflSchedule, { byDay: byWeek });

const nbaShell = getSimulationShell({ sport: 'nba' });
const nbaSchedule = buildSimulationSeasonSchedule(nbaShell);

assert.equal(typeof nbaSchedule.teamGameCounts, 'object');
assert.equal(nbaSchedule.teamGameCounts.LAL, 82);
assert.equal(Object.keys(nbaSchedule.byDay).length, 82);

console.log('nfl 2014 schedule test passed');
