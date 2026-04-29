const assert = require('node:assert/strict');

const {
  getSimulationShell,
  findSimulationTeamByAbbr,
  listSimulationShells
} = require('../simulation-mode-config.js');

assert.equal(typeof getSimulationShell, 'function');
assert.equal(typeof findSimulationTeamByAbbr, 'function');
assert.equal(typeof listSimulationShells, 'function');

const defaultShell = getSimulationShell();
const nflShell = getSimulationShell({ sport: 'nfl' });
const allShells = listSimulationShells();

assert.equal(defaultShell.anchorSeasonId, 'nba_2025_26');
assert.equal(defaultShell.anchorSeasonLabel, '2025-26 NBA');
assert.equal(defaultShell.sport, 'nba');
assert.equal(defaultShell.teams.length, 30);
assert.equal(defaultShell.regularSeasonGamesPerTeam, 82);
assert.equal(defaultShell.rosterSize, 15);
assert.deepStrictEqual(
  defaultShell.starterSlots,
  ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL', 'UTIL', 'UTIL'],
  'nba shell should use the expanded ESPN-style starter layout'
);
assert.equal(defaultShell.benchSlots, 3);
assert.equal(defaultShell.irSlots, 2);
assert.deepStrictEqual(defaultShell.playInSeeds, [7, 8, 9, 10]);
assert.equal(defaultShell.finalsStartDate, '2026-06-03');
assert.equal(findSimulationTeamByAbbr('LAL').conference, 'West');
assert.equal(findSimulationTeamByAbbr('LAL').division, 'Pacific');
assert.equal(findSimulationTeamByAbbr('ORL').conference, 'East');
assert.equal(findSimulationTeamByAbbr('ORL').division, 'Southeast');
assert.equal(nflShell.anchorSeasonId, 'nfl_2014');
assert.equal(nflShell.anchorSeasonLabel, '2014 NFL');
assert.equal(nflShell.sport, 'nfl');
assert.equal(nflShell.teams.length, 32);
assert.equal(nflShell.regularSeasonGamesPerTeam, 16);
assert.equal(nflShell.rosterSize, 13);
assert.equal(nflShell.regularSeasonWeeks, 17);
assert.equal(nflShell.playoffFieldPerConference, 6);
assert.ok(allShells.some((shell) => shell.anchorSeasonId === 'nfl_2014'));

const patriots = findSimulationTeamByAbbr('NE', { sport: 'nfl' });
const packers = findSimulationTeamByAbbr('GB', { sport: 'nfl' });
const redskins = findSimulationTeamByAbbr('WAS', { sport: 'nfl' });

assert.deepStrictEqual(
  { conference: patriots.conference, division: patriots.division },
  { conference: 'AFC', division: 'East' }
);
assert.deepStrictEqual(
  { conference: packers.conference, division: packers.division },
  { conference: 'NFC', division: 'North' }
);
assert.equal(redskins.name, 'Washington Redskins');

defaultShell.teams[0].conference = 'Mutated';
defaultShell.playInSeeds.push(11);
nflShell.teams[0].conference = 'Mutated';

const freshDefaultShell = getSimulationShell();
const freshNflShell = getSimulationShell({ sport: 'nfl' });

assert.deepStrictEqual(
  {
    conference: freshDefaultShell.teams[0].conference,
    playInSeeds: freshDefaultShell.playInSeeds
  },
  {
    conference: 'East',
    playInSeeds: [7, 8, 9, 10]
  }
);
assert.deepStrictEqual(
  {
    conference: freshNflShell.teams[0].conference
  },
  {
    conference: 'NFC'
  }
);
assert.equal(findSimulationTeamByAbbr('ZZZ', { sport: 'nfl' }), null);

console.log('simulation mode config test passed');
