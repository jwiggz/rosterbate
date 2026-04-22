const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const validator = require('../historical-pack-validator.js');

const repoRoot = path.join(__dirname, '..');
const packId = 'nba_1993_full_season_v1';
const packRoot = path.join(repoRoot, 'historical-packs', packId);

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function extractEntryRegion(source, marker) {
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `missing entry marker: ${marker}`);
  const end = source.indexOf('\n    },', start);
  assert.ok(end >= 0, `missing entry terminator for: ${marker}`);
  return source.slice(start, end);
}

const catalog = readJson('historical-packs/catalog.json');
const entry = catalog.find(item => item.packId === packId);
assert.ok(entry, 'catalog is missing the 1992-93 pack entry');
assert.equal(entry.availability, 'playable', '1992-93 catalog entry should be playable');
assert.equal(entry.statusLabel, 'Playable Now');
const expectedCatalogUrls = {
  seasonUrl: 'rosterbate-season.html?sport=nba&historical=dev&historicalPackId=nba_1993_full_season_v1',
  simUrl: 'rosterbate-season.html?sport=nba&historical=sim&historicalPackId=nba_1993_full_season_v1',
  draftUrl: 'rosterbate-draft.html?sport=nba&historical=dev&historicalPackId=nba_1993_full_season_v1',
  reimaginedUrl: 'rosterbate-season.html?sport=nba&historical=reimagined&historicalPackId=nba_1993_full_season_v1'
};
for (const [key, expectedUrl] of Object.entries(expectedCatalogUrls)) {
  assert.equal(entry[key], expectedUrl, `${key} should target the exact 1992-93 playable route`);
}

const expectedPlayableUrls = Object.values(expectedCatalogUrls);
const historicSeasonsSource = readText('historic-seasons.html');
const historicSeasonsEntry = extractEntryRegion(historicSeasonsSource, "packId: 'nba_1993_full_season_v1'");
assert.match(
  historicSeasonsEntry,
  /packId:\s*'nba_1993_full_season_v1'[\s\S]*?availability:\s*'playable'[\s\S]*?statusLabel:\s*'Playable Now'[\s\S]*?seasonUrl:\s*'rosterbate-season\.html\?sport=nba&historical=dev&historicalPackId=nba_1993_full_season_v1'[\s\S]*?simUrl:\s*'rosterbate-season\.html\?sport=nba&historical=sim&historicalPackId=nba_1993_full_season_v1'[\s\S]*?draftUrl:\s*'rosterbate-draft\.html\?sport=nba&historical=dev&historicalPackId=nba_1993_full_season_v1'[\s\S]*?reimaginedUrl:\s*'rosterbate-season\.html\?sport=nba&historical=reimagined&historicalPackId=nba_1993_full_season_v1'/,
  'historic-seasons fallback should include a single coherent playable 1992-93 entry'
);

const historicUniverseSource = readText('historic-universe.html');
const historicUniverseEntry = extractEntryRegion(historicUniverseSource, "packId: 'nba_1993_full_season_v1'");
assert.match(
  historicUniverseEntry,
  /packId:\s*'nba_1993_full_season_v1'[\s\S]*?availability:\s*'playable'[\s\S]*?shortLabel:\s*'1992-93'/,
  'historic-universe fallback catalog should include a single coherent playable 1992-93 entry'
);

const rosterbateSeasonSource = readText('rosterbate-season.html');
assert.match(
  rosterbateSeasonSource,
  /nba_1993_full_season_v1\s*:\s*'1992-93'/,
  'season page short-label mapping should include 1992-93'
);

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
assert.equal(validation.status, 'validation_passed_clean', '1992-93 bundle should validate cleanly');
assert.equal(validation.summary.seasonId, 'nba_1993_historic');
assert.equal(validation.summary.teamCount, 27);
assert.ok(validation.summary.playerCount > 300, '1992-93 should ship a full-league player pool');

assert.ok(bundle.summaries, 'bundle should include summaries loaded through manifest contentFiles');
assert.match(
  JSON.stringify(bundle.summaries),
  /inferred[\s\S]{0,40}player-game coverage/i,
  '1992-93 summaries should disclose inferred player-game coverage'
);

console.log('historical 1992-93 preset test passed');
