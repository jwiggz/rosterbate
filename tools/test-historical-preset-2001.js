const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const validator = require('../historical-pack-validator.js');

const repoRoot = path.join(__dirname, '..');
const packId = 'nba_2001_full_season_v1';
const packRoot = path.join(repoRoot, 'historical-packs', packId);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

const catalog = readJson('historical-packs/catalog.json');
const entry = catalog.find(item => item.packId === packId);
assert.ok(entry, 'catalog is missing the 2000-01 pack entry');
assert.equal(entry.availability, 'playable', '2000-01 catalog entry should be playable');
assert.equal(entry.statusLabel, 'Playable Now');
['seasonUrl', 'simUrl', 'draftUrl'].forEach(key => {
  assert.match(String(entry[key] || ''), /historicalPackId=nba_2001_full_season_v1/, `${key} should target the 2000-01 pack`);
});

[
  'manifest.json',
  'season.json',
  'teams.json',
  'players.json',
  'roster_snapshots.json',
  'schedule.json',
  'games.json',
  'player_game_stats.json',
  'optional/presentation.json',
  'optional/summaries.json',
  'optional/pack_challenges.json'
].forEach(file => {
  assert.equal(fs.existsSync(path.join(packRoot, file)), true, `missing ${file}`);
});

const manifest = readJson(`historical-packs/${packId}/manifest.json`);
const contentKeyMap = {
  season: 'season',
  teams: 'teams',
  players: 'players',
  rosterSnapshots: 'rosterSnapshots',
  schedule: 'schedule',
  games: 'games',
  playerGameStats: 'playerGameStats',
  packChallenges: 'packChallenges',
  presentation: 'presentation',
  summaries: 'summaries'
};

const bundle = { manifest };
for (const [fileKey, bundleKey] of Object.entries(contentKeyMap)) {
  const relativePath = manifest.contentFiles[fileKey];
  bundle[bundleKey] = relativePath
    ? readJson(`historical-packs/${packId}/${relativePath}`)
    : null;
}

const validation = validator.validateHistoricalPackBundle(bundle);
assert.notEqual(validation.status, 'validation_failed', '2000-01 bundle should pass historical-pack validation');
assert.equal(validation.summary.seasonId, 'nba_2001_historic');
assert.equal(validation.summary.teamCount, 29);
assert.ok(validation.summary.playerCount > 300, '2000-01 should ship a full-league player pool');

const historicSeasonsSource = readText('historic-seasons.html');
assert.match(
  historicSeasonsSource,
  /packId:\s*'nba_2001_full_season_v1'[\s\S]*?availability:\s*'playable'[\s\S]*?seasonUrl:\s*'rosterbate-season\.html\?sport=nba&historical=dev&historicalPackId=nba_2001_full_season_v1'/,
  'historic-seasons fallback catalog should promote 2000-01 to playable'
);

const historicUniverseSource = readText('historic-universe.html');
assert.match(
  historicUniverseSource,
  /packId:\s*'nba_2001_full_season_v1'/,
  'historic-universe fallback catalog should know about 2000-01'
);

const rosterbateSeasonSource = readText('rosterbate-season.html');
assert.match(
  rosterbateSeasonSource,
  /nba_2001_full_season_v1:'2000-01'/,
  'season page short-label mapping should include 2000-01'
);

console.log('historical 2000-01 preset test passed');
