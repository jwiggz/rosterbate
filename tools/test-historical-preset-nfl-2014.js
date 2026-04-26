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
const rosterSnapshots = JSON.parse(fs.readFileSync(path.join(packRoot, 'roster_snapshots.json'), 'utf8'));
const schedule = JSON.parse(fs.readFileSync(path.join(packRoot, 'schedule.json'), 'utf8'));
const games = JSON.parse(fs.readFileSync(path.join(packRoot, 'games.json'), 'utf8'));
const playerGameStats = JSON.parse(fs.readFileSync(path.join(packRoot, 'player_game_stats.json'), 'utf8'));

const catalogEntry = catalog.find((entry) => entry.packId === 'nfl_2014_full_season_v1');

assert.ok(catalogEntry, 'catalog should advertise the 2014 NFL pack');
assert.equal(catalogEntry.sport, 'nfl');
assert.equal(catalogEntry.shortLabel, '2014');
assert.match(catalogEntry.seasonLabel, /2014 NFL Historic Season/i);
assert.equal(catalogEntry.availability, 'preview');
assert.equal(catalogEntry.statusLabel, 'Foundation Preview');
assert.deepStrictEqual(catalogEntry.plannedModes, ['Draft The Era', 'Sim Season']);

assert.equal(manifest.packId, 'nfl_2014_full_season_v1');
assert.equal(manifest.sport, 'nfl');
assert.equal(manifest.league, 'nfl');
assert.equal(manifest.status, 'concept');
assert.deepStrictEqual(manifest.supportedModes, ['historical_draft', 'simulation_season']);
assert.equal(manifest.defaultEntryMode, 'simulation_season');
assert.equal(manifest.contentFiles.playerGameStats, 'player_game_stats.json');
assert.match(manifest.createdAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/);
assert.match(manifest.updatedAt, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/);

assert.equal(season.sport, 'nfl');
assert.equal(season.seasonLabel, '2014 NFL Historic Season');
assert.equal(teams.length, 32);
assert.ok(players.length >= 416, 'pack needs enough players to fill a 32-team x 13-slot sim draft');
assert.ok(Array.isArray(rosterSnapshots), 'roster snapshots should be an array scaffold');
assert.ok(Array.isArray(schedule), 'schedule should be an array scaffold');
assert.ok(Array.isArray(games), 'games should be an array scaffold');
assert.ok(Array.isArray(playerGameStats), 'player game stats should be an array scaffold');
assert.ok(players.some((player) => player.pos === 'QB' && /Tom Brady/i.test(player.name)));
assert.ok(players.some((player) => player.pos === 'RB' && /Le'Veon Bell/i.test(player.name)));
assert.ok(players.some((player) => player.pos === 'WR' && /Antonio Brown/i.test(player.name)));
assert.ok(players.some((player) => player.pos === 'DST'));

console.log('historical preset nfl 2014 test passed');
