const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const validator = require('../historical-pack-validator.js');

const repoRoot = path.join(__dirname, '..');
const packId = 'nba_2001_full_season_v1';
const packRoot = path.join(repoRoot, 'historical-packs', packId);
const expectedSeasonUrl = 'rosterbate-season.html?sport=nba&historical=sim&historicalPackId=nba_2001_full_season_v1';
const expectedSimUrl = 'rosterbate-season.html?sport=nba&historical=sim&historicalPackId=nba_2001_full_season_v1';
const expectedDraftUrl = 'rosterbate-draft.html?sport=nba&historical=dev&historicalPackId=nba_2001_full_season_v1';
const expectedReimaginedUrl = 'rosterbate-season.html?sport=nba&historical=reimagined&historicalPackId=nba_2001_full_season_v1';

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractObjectLiteralBlock(source, targetPackId, label) {
  const marker = new RegExp(`\\{\\s*packId:\\s*'${escapeRegExp(targetPackId)}'`);
  const start = source.search(marker);
  assert.ok(start >= 0, `${label} is missing the ${targetPackId} fallback entry`);

  let index = source.indexOf('{', start);
  assert.ok(index >= 0, `${label} fallback entry is malformed`);

  let depth = 0;
  let inString = false;
  let stringQuote = '';
  let escaped = false;

  for (; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === stringQuote) {
        inString = false;
        stringQuote = '';
      }
      continue;
    }

    if (char === '\'' || char === '"' || char === '`') {
      inString = true;
      stringQuote = char;
      continue;
    }

    if (char === '{') {
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(source.indexOf('{', start), index + 1);
      }
    }
  }

  throw new Error(`${label} fallback entry could not be fully extracted`);
}

const catalog = readJson('historical-packs/catalog.json');
const entry = catalog.find(item => item.packId === packId);
assert.ok(entry, 'catalog is missing the 2000-01 pack entry');
assert.equal(entry.availability, 'playable', '2000-01 catalog entry should be playable');
assert.equal(entry.statusLabel, 'Playable Now');
assert.equal(entry.seasonUrl, expectedSeasonUrl, 'seasonUrl should target the 2000-01 pack exactly');
assert.equal(entry.simUrl, expectedSimUrl, 'simUrl should target the 2000-01 pack exactly');
assert.equal(entry.draftUrl, expectedDraftUrl, 'draftUrl should target the 2000-01 pack exactly');
assert.equal(entry.reimaginedUrl, expectedReimaginedUrl, 'reimaginedUrl should target the 2000-01 pack exactly');

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
assert.equal(validation.status, 'validation_passed_clean', '2000-01 bundle should pass historical-pack validation cleanly');
assert.equal(validation.summary.errorCount, 0, '2000-01 bundle should not report validation errors');
assert.equal(validation.summary.warningCount, 0, '2000-01 bundle should not report validation warnings');
assert.equal(validation.summary.seasonId, 'nba_2001_historic');
assert.equal(validation.summary.teamCount, 29);
assert.ok(validation.summary.playerCount > 300, '2000-01 should ship a full-league player pool');

const playerGameStatsByPlayer = new Map();
bundle.playerGameStats.forEach(row => {
  const list = playerGameStatsByPlayer.get(row.playerId) || [];
  list.push(row);
  playerGameStatsByPlayer.set(row.playerId, list);
});

[
  'nba_2001_shaquille_o_neal_406',
  'nba_2001_kobe_bryant_977',
  'nba_2001_allen_iverson_947'
].forEach(playerId => {
  const rows = playerGameStatsByPlayer.get(playerId) || [];
  assert.ok(rows.length >= 20, `${playerId} should have a meaningful game-log sample`);
  const distinctMinutes = new Set(rows.map(row => Number(row.minutes || 0)));
  assert.ok(
    distinctMinutes.size > 1,
    `${playerId} should not repeat the exact same inferred minutes across every logged game`
  );
});

const historicSeasonsSource = readText('historic-seasons.html');
const historicSeasonsFallbackEntry = extractObjectLiteralBlock(historicSeasonsSource, packId, 'historic-seasons fallback catalog');
assert.match(historicSeasonsFallbackEntry, /availability:\s*'playable'/, 'historic-seasons fallback catalog should promote 2000-01 to playable');
assert.match(historicSeasonsFallbackEntry, new RegExp(`statusLabel:\\s*'Playable Now'`), 'historic-seasons fallback catalog should label 2000-01 as playable now');
assert.match(historicSeasonsFallbackEntry, new RegExp(`seasonUrl:\\s*'${escapeRegExp(expectedSeasonUrl)}'`), 'historic-seasons fallback catalog should link the exact season URL');
assert.match(historicSeasonsFallbackEntry, new RegExp(`simUrl:\\s*'${escapeRegExp(expectedSimUrl)}'`), 'historic-seasons fallback catalog should link the exact sim URL');
assert.match(historicSeasonsFallbackEntry, new RegExp(`draftUrl:\\s*'${escapeRegExp(expectedDraftUrl)}'`), 'historic-seasons fallback catalog should link the exact draft URL');
assert.match(historicSeasonsFallbackEntry, new RegExp(`reimaginedUrl:\\s*'${escapeRegExp(expectedReimaginedUrl)}'`), 'historic-seasons fallback catalog should link the exact reimagined URL');

const historicUniverseSource = readText('historic-universe.html');
const historicUniverseFallbackEntry = extractObjectLiteralBlock(historicUniverseSource, packId, 'historic-universe fallback catalog');
assert.match(historicUniverseFallbackEntry, /seasonLabel:\s*'2000-01 NBA Historic Season'/, 'historic-universe fallback catalog should know about 2000-01');
assert.match(historicUniverseFallbackEntry, /shortLabel:\s*'2000-01'/, 'historic-universe fallback catalog should preserve the 2000-01 short label');
assert.match(historicUniverseFallbackEntry, /focusTeamName:\s*'Los Angeles Lakers'/, 'historic-universe fallback catalog should preserve the Lakers spotlight');

const rosterbateSeasonSource = readText('rosterbate-season.html');
assert.match(
  rosterbateSeasonSource,
  /nba_2001_full_season_v1:'2000-01'/,
  'season page short-label mapping should include 2000-01'
);

console.log('historical 2000-01 preset test passed');
