const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const baseDir = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(baseDir, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

const builderScripts = [
  'build-historical-pack-1987.py',
  'build-historical-pack-1993.py',
  'build-historical-pack-2001.py',
  'build-historical-pack-2016.py'
];

const manifestExpectations = {
  'historical-packs/nba_1993_full_season_v1/manifest.json': [
    'historical_draft',
    'single_player_season',
    'reimagined_season'
  ],
  'historical-packs/nba_1996_full_season_v1/manifest.json': [
    'historical_draft',
    'single_player_season'
  ],
  'historical-packs/nba_2001_full_season_v1/manifest.json': [
    'historical_draft',
    'single_player_season',
    'reimagined_season'
  ],
  'historical-packs/nba_2016_full_season_v1/manifest.json': [
    'historical_draft',
    'single_player_season',
    'reimagined_season'
  ]
};

const filesRequiringHistoricalStatsLabel = [
  ...builderScripts,
  ...Object.keys(manifestExpectations),
  'historical-packs/nba_1996_full_season_v1/optional/summaries.json',
  'historical-packs/nba_2001_full_season_v1/optional/summaries.json',
  'historical-packs/nba_2016_full_season_v1/optional/summaries.json'
];

const metadataFiles = [
  ...Object.keys(manifestExpectations),
  'historical-packs/nba_1993_full_season_v1/optional/pack_challenges.json',
  'historical-packs/nba_1993_full_season_v1/optional/summaries.json',
  'historical-packs/nba_1996_full_season_v1/optional/pack_challenges.json',
  'historical-packs/nba_1996_full_season_v1/optional/presentation.json',
  'historical-packs/nba_1996_full_season_v1/optional/summaries.json',
  'historical-packs/nba_2001_full_season_v1/optional/pack_challenges.json',
  'historical-packs/nba_2001_full_season_v1/optional/presentation.json',
  'historical-packs/nba_2001_full_season_v1/optional/summaries.json',
  'historical-packs/nba_2016_full_season_v1/optional/pack_challenges.json',
  'historical-packs/nba_2016_full_season_v1/optional/presentation.json',
  'historical-packs/nba_2016_full_season_v1/optional/summaries.json'
];

for (const relativePath of [...builderScripts, ...metadataFiles]) {
  const source = read(relativePath);
  assert.doesNotMatch(source, /real_season/, `${relativePath} should not declare or reference real_season`);
  assert.doesNotMatch(source, /Play The Real Season/, `${relativePath} should not market Play The Real Season`);
}

for (const relativePath of filesRequiringHistoricalStatsLabel) {
  assert.match(
    read(relativePath),
    /Historical season stats/,
    `${relativePath} should label stat coverage as Historical season stats`
  );
  assert.doesNotMatch(
    read(relativePath),
    /Real season stats/,
    `${relativePath} should not label stat coverage as Real season stats`
  );
}

for (const [relativePath, expectedModes] of Object.entries(manifestExpectations)) {
  const manifest = readJson(relativePath);

  assert.deepEqual(
    manifest.supportedModes,
    expectedModes,
    `${relativePath} should only expose the supported historical entry modes`
  );
  assert.equal(
    manifest.defaultEntryMode,
    'single_player_season',
    `${relativePath} should default to single_player_season`
  );
  assert.equal(
    manifest.auditSummary.realStatCoverage.label,
    'Historical season stats',
    `${relativePath} should use Historical season stats in auditSummary.realStatCoverage.label`
  );
}

for (const relativePath of [
  'historical-packs/nba_1993_full_season_v1/optional/pack_challenges.json',
  'historical-packs/nba_1996_full_season_v1/optional/pack_challenges.json',
  'historical-packs/nba_2001_full_season_v1/optional/pack_challenges.json',
  'historical-packs/nba_2016_full_season_v1/optional/pack_challenges.json'
]) {
  const packChallenges = readJson(relativePath);
  const groupModes = (packChallenges.challengeGroups || []).map((group) => group.mode);
  const challengeModes = (packChallenges.challenges || [])
    .map((challenge) => challenge.mode)
    .filter(Boolean);
  const groupIds = (packChallenges.challengeGroups || []).map((group) => group.groupId);
  const challengeGroupIds = (packChallenges.challenges || [])
    .map((challenge) => challenge.groupId)
    .filter(Boolean);

  assert.equal(
    groupModes.includes('real_season'),
    false,
    `${relativePath} should not keep real_season challenge-group modes`
  );
  assert.equal(
    challengeModes.includes('real_season'),
    false,
    `${relativePath} should not keep real_season challenge modes`
  );
  assert.equal(
    groupIds.some((groupId) => /real_season/.test(groupId)),
    false,
    `${relativePath} should not keep real_season challenge-group ids`
  );
  assert.equal(
    challengeGroupIds.some((groupId) => /real_season/.test(groupId)),
    false,
    `${relativePath} should not keep real_season challenge references`
  );
}

for (const relativePath of [
  'historical-packs/nba_1996_full_season_v1/optional/presentation.json',
  'historical-packs/nba_2001_full_season_v1/optional/presentation.json',
  'historical-packs/nba_2016_full_season_v1/optional/presentation.json'
]) {
  const presentation = readJson(relativePath);
  const entryModes = presentation.entryModes || [];

  assert.match(
    presentation.heroSubtitle,
    /historic|historical/i,
    `${relativePath} heroSubtitle should use neutral historical wording`
  );
  assert.equal(
    entryModes.some((entry) => entry.mode === 'single_player_season' && /historic/i.test(entry.label)),
    true,
    `${relativePath} should expose single_player_season with a Historic Season label`
  );
  assert.equal(
    entryModes.some((entry) => entry.mode === 'real_season'),
    false,
    `${relativePath} should not expose real_season entry modes`
  );
}

for (const relativePath of [
  'historical-packs/nba_1996_full_season_v1/optional/summaries.json',
  'historical-packs/nba_2001_full_season_v1/optional/summaries.json',
  'historical-packs/nba_2016_full_season_v1/optional/summaries.json'
]) {
  const summaries = readJson(relativePath);
  const modeSummaries = summaries.modeSummaries || [];

  assert.equal(
    modeSummaries.some((entry) => entry.mode === 'single_player_season'),
    true,
    `${relativePath} should include a single_player_season summary`
  );
  assert.equal(
    modeSummaries.some((entry) => entry.mode === 'real_season'),
    false,
    `${relativePath} should not include a real_season summary`
  );
  assert.equal(
    summaries.auditSummary.realStatCoverage.label,
    'Historical season stats',
    `${relativePath} should rename auditSummary.realStatCoverage.label`
  );
}

console.log('remove real season pack metadata audit test passed');
