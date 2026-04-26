const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const validator = require('../historical-pack-validator.js');

const repoRoot = path.join(__dirname, '..');
const packId = 'nba_1987_full_season_v1';
const packRoot = path.join(repoRoot, 'historical-packs', packId);
const expectedSeasonUrl = 'rosterbate-season.html?sport=nba&historical=sim&historicalPackId=nba_1987_full_season_v1';
const expectedSimUrl = 'rosterbate-season.html?sport=nba&historical=sim&historicalPackId=nba_1987_full_season_v1';
const expectedDraftUrl = 'rosterbate-draft.html?sport=nba&historical=dev&historicalPackId=nba_1987_full_season_v1';
const expectedReimaginedUrl = 'rosterbate-season.html?sport=nba&historical=reimagined&historicalPackId=nba_1987_full_season_v1';

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractObjectLiteralFromIndex(source, start, label) {
  let index = source.indexOf('{', start);
  assert.ok(index >= 0, `${label} is malformed`);

  const objectStart = index;

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
        return source.slice(objectStart, index + 1);
      }
    }
  }

  throw new Error(`${label} could not be fully extracted`);
}

function extractObjectLiteralBlock(source, targetPackId, label) {
  const marker = new RegExp(`\\bpackId\\s*:\\s*['"]${escapeRegExp(targetPackId)}['"]`);
  for (let start = source.indexOf('{'); start >= 0; start = source.indexOf('{', start + 1)) {
    const candidate = extractObjectLiteralFromIndex(source, start, `${label} candidate`);
    if (marker.test(candidate)) {
      return candidate;
    }
  }

  throw new Error(`${label} is missing the ${targetPackId} fallback entry`);
}

function extractObjectLiteralFromMarker(source, marker, label) {
  const match = marker.exec(source);
  assert.ok(match, `${label} is missing`);
  return extractObjectLiteralFromIndex(source, match.index, label);
}

const catalog = readJson('historical-packs/catalog.json');
const entry = catalog.find(item => item.packId === packId);
assert.ok(entry, 'catalog is missing the 1986-87 pack entry');
assert.equal(entry.availability, 'playable', '1986-87 catalog entry should be playable');
assert.equal(entry.statusLabel, 'Playable Now');
assert.equal(entry.seasonUrl, expectedSeasonUrl, 'seasonUrl should target the 1986-87 pack exactly');
assert.equal(entry.simUrl, expectedSimUrl, 'simUrl should target the 1986-87 pack exactly');
assert.equal(entry.draftUrl, expectedDraftUrl, 'draftUrl should target the 1986-87 pack exactly');
assert.equal(entry.reimaginedUrl, expectedReimaginedUrl, 'reimaginedUrl should target the 1986-87 pack exactly');

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
assert.equal(validation.status, 'validation_passed_clean', '1986-87 bundle should pass historical-pack validation cleanly');
assert.equal(validation.summary.errorCount, 0, '1986-87 bundle should not report validation errors');
assert.equal(validation.summary.warningCount, 0, '1986-87 bundle should not report validation warnings');
assert.equal(validation.summary.seasonId, 'nba_1987_historic');
assert.equal(validation.summary.teamCount, 23);
assert.ok(validation.summary.playerCount > 250, '1986-87 should ship a full-league player pool');

const summaries = readJson(`historical-packs/${packId}/optional/summaries.json`);
assert.ok(Array.isArray(summaries.auditNotes), '1986-87 summaries should expose auditNotes for trust disclosures');
assert.ok(
  summaries.auditNotes.some(note => /inferred|estimated/i.test(String(note)) && /player|game|coverage|minute/i.test(String(note))),
  '1986-87 auditNotes should disclose inferred player-game coverage'
);

const historicSeasonsSource = readText('historic-seasons.html');
const historicSeasonsFallbackEntry = extractObjectLiteralBlock(historicSeasonsSource, packId, 'historic-seasons fallback catalog');
assert.match(historicSeasonsFallbackEntry, /availability:\s*'playable'/, 'historic-seasons fallback catalog should promote 1986-87 to playable');
assert.match(historicSeasonsFallbackEntry, /statusLabel:\s*'Playable Now'/, 'historic-seasons fallback catalog should label 1986-87 as playable now');
assert.match(historicSeasonsFallbackEntry, new RegExp(`seasonUrl:\\s*'${escapeRegExp(expectedSeasonUrl)}'`), 'historic-seasons fallback catalog should link the exact season URL');
assert.match(historicSeasonsFallbackEntry, new RegExp(`simUrl:\\s*'${escapeRegExp(expectedSimUrl)}'`), 'historic-seasons fallback catalog should link the exact sim URL');
assert.match(historicSeasonsFallbackEntry, new RegExp(`draftUrl:\\s*'${escapeRegExp(expectedDraftUrl)}'`), 'historic-seasons fallback catalog should link the exact draft URL');
assert.match(historicSeasonsFallbackEntry, new RegExp(`reimaginedUrl:\\s*'${escapeRegExp(expectedReimaginedUrl)}'`), 'historic-seasons fallback catalog should link the exact reimagined URL');

const historicUniverseSource = readText('historic-universe.html');
const historicUniverseFallbackEntry = extractObjectLiteralBlock(historicUniverseSource, packId, 'historic-universe fallback catalog');
assert.match(historicUniverseFallbackEntry, /seasonLabel:\s*'1986-87 NBA Simulation Archive'/, 'historic-universe fallback catalog should know about 1986-87');
assert.match(historicUniverseFallbackEntry, /shortLabel:\s*'1986-87'/, 'historic-universe fallback catalog should preserve the 1986-87 short label');
assert.match(historicUniverseFallbackEntry, /focusTeamName:\s*'Los Angeles Lakers'/, 'historic-universe fallback catalog should preserve the Lakers spotlight');

const rosterbateSeasonSource = readText('rosterbate-season.html');
const shortLabelMapBlock = extractObjectLiteralFromMarker(
  rosterbateSeasonSource,
  /const\s+known\s*=\s*\{/,
  'season page short-label map'
);
assert.match(
  shortLabelMapBlock,
  /nba_1987_full_season_v1\s*:\s*['"]1986-87['"]/,
  'season page short-label mapping should include 1986-87'
);

console.log('historical 1986-87 preset test passed');
