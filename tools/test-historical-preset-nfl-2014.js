const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.join(__dirname, '..');
const packRoot = path.join(repoRoot, 'historical-packs', 'nfl_2014_full_season_v1');
const catalog = JSON.parse(fs.readFileSync(path.join(repoRoot, 'historical-packs', 'catalog.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(packRoot, 'manifest.json'), 'utf8'));
const season = JSON.parse(fs.readFileSync(path.join(packRoot, 'season.json'), 'utf8'));
const teams = JSON.parse(fs.readFileSync(path.join(packRoot, 'teams.json'), 'utf8'));
const players = JSON.parse(fs.readFileSync(path.join(packRoot, 'players.json'), 'utf8'));

const catalogEntry = catalog.find((entry) => entry.packId === 'nfl_2014_full_season_v1');

assert.ok(catalogEntry, 'catalog should advertise the 2014 NFL pack');
assert.equal(catalogEntry.sport, 'nfl');
assert.equal(catalogEntry.shortLabel, '2014');
assert.match(catalogEntry.seasonLabel, /2014 NFL Historic Season/i);
assert.deepStrictEqual(catalogEntry.plannedModes, ['Draft The Era', 'Sim Season']);

assert.equal(manifest.packId, 'nfl_2014_full_season_v1');
assert.equal(manifest.sport, 'nfl');
assert.equal(manifest.league, 'nfl');
assert.deepStrictEqual(manifest.supportedModes, ['historical_draft', 'single_player_season']);
assert.equal(manifest.defaultEntryMode, 'single_player_season');

assert.equal(season.sport, 'nfl');
assert.equal(season.seasonLabel, '2014 NFL Historic Season');
assert.equal(teams.length, 32);
assert.ok(players.length >= 416, 'pack needs enough players to fill a 32-team x 13-slot sim draft');
assert.ok(players.some((player) => player.pos === 'QB' && /Tom Brady/i.test(player.name)));
assert.ok(players.some((player) => player.pos === 'RB' && /Le'Veon Bell/i.test(player.name)));
assert.ok(players.some((player) => player.pos === 'WR' && /Antonio Brown/i.test(player.name)));
assert.ok(players.some((player) => player.pos === 'DST'));

console.log('historical preset nfl 2014 test passed');
