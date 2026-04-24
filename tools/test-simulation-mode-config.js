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
assert.equal(defaultShell.sport, 'nba');
assert.equal(nflShell.anchorSeasonId, 'nfl_2014');
assert.equal(nflShell.anchorSeasonLabel, '2014 NFL');
assert.equal(nflShell.sport, 'nfl');
assert.equal(nflShell.teams.length, 32);
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

nflShell.teams[0].conference = 'Mutated';

const freshNflShell = getSimulationShell({ sport: 'nfl' });

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
