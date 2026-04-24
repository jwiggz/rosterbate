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

const ownedCatalogPackIds = [
  'nba_1987_full_season_v1',
  'nba_1993_full_season_v1',
  'nba_2001_full_season_v1',
  'nba_2016_full_season_v1'
];

const prohibitedHistoricalMarketingPatterns = [
  /\breal historic season\b/i,
  /\breal regular-season\b/i,
  /\breal full-season\b/i,
  /\breal data\b/i,
  /\bbuilt from real\b/i,
  /\breal (?:season|player season) totals\b/i,
  /\breal historical game records\b/i,
  /\breal game details?\b/i,
  /\breal game-detail rows\b/i,
  /\breal event box scores?\b/i,
  /\bgame result(?:s)? (?:is|are) real\b/i,
  /\bthe schedule is real\b/i,
  /\bthe same real\b/i,
  /\breal \d{4}(?:-\d{2})? season\b/i
];

const manifestExpectations = {
  'historical-packs/nba_1987_full_season_v1/manifest.json': [
    'historical_draft',
    'single_player_season',
    'reimagined_season'
  ],
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

const manifestStatusExpectations = {
  'historical-packs/nba_1987_full_season_v1/manifest.json': 'ready',
  'historical-packs/nba_1993_full_season_v1/manifest.json': 'ready',
  'historical-packs/nba_1996_full_season_v1/manifest.json': 'concept',
  'historical-packs/nba_2001_full_season_v1/manifest.json': 'ready',
  'historical-packs/nba_2016_full_season_v1/manifest.json': 'ready'
};

const expandedCatalogContractPackIds = [
  'nba_1987_full_season_v1',
  'nba_1993_full_season_v1',
  'nba_2001_full_season_v1',
  'nba_2016_full_season_v1'
];

const expandedOptionalContractPackIds = [
  'nba_1987_full_season_v1',
  'nba_1993_full_season_v1',
  'nba_2001_full_season_v1',
  'nba_2016_full_season_v1'
];

const filesRequiringHistoricalStatsLabel = [
  ...builderScripts,
  ...Object.keys(manifestExpectations),
  'historical-packs/nba_1987_full_season_v1/optional/summaries.json',
  'historical-packs/nba_1996_full_season_v1/optional/summaries.json',
  'historical-packs/nba_2001_full_season_v1/optional/summaries.json',
  'historical-packs/nba_2016_full_season_v1/optional/summaries.json'
];

const metadataFiles = [
  ...Object.keys(manifestExpectations),
  'historical-packs/nba_1987_full_season_v1/optional/pack_challenges.json',
  'historical-packs/nba_1987_full_season_v1/optional/presentation.json',
  'historical-packs/nba_1987_full_season_v1/optional/summaries.json',
  'historical-packs/nba_1993_full_season_v1/optional/pack_challenges.json',
  'historical-packs/nba_1993_full_season_v1/optional/presentation.json',
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

const prohibitedCopyAuditFiles = [
  'historical-packs/catalog.json',
  'historical-packs/nba_1987_full_season_v1/manifest.json',
  'historical-packs/nba_1987_full_season_v1/optional/pack_challenges.json',
  'historical-packs/nba_1987_full_season_v1/optional/presentation.json',
  'historical-packs/nba_1987_full_season_v1/optional/summaries.json',
  'historical-packs/nba_1993_full_season_v1/manifest.json',
  'historical-packs/nba_1993_full_season_v1/optional/pack_challenges.json',
  'historical-packs/nba_1993_full_season_v1/optional/presentation.json',
  'historical-packs/nba_1993_full_season_v1/optional/summaries.json',
  'historical-packs/nba_2001_full_season_v1/manifest.json',
  'historical-packs/nba_2001_full_season_v1/season.json',
  'historical-packs/nba_2001_full_season_v1/optional/pack_challenges.json',
  'historical-packs/nba_2001_full_season_v1/optional/presentation.json',
  'historical-packs/nba_2001_full_season_v1/optional/summaries.json',
  'historical-packs/nba_2016_full_season_v1/manifest.json',
  'historical-packs/nba_2016_full_season_v1/season.json',
  'historical-packs/nba_2016_full_season_v1/optional/pack_challenges.json',
  'historical-packs/nba_2016_full_season_v1/optional/presentation.json',
  'historical-packs/nba_2016_full_season_v1/optional/summaries.json',
  ...builderScripts
];

for (const relativePath of [...builderScripts, ...metadataFiles]) {
  const source = read(relativePath);
  assert.doesNotMatch(source, /real_season/, `${relativePath} should not declare or reference real_season`);
  assert.doesNotMatch(source, /Play The Real Season/, `${relativePath} should not market Play The Real Season`);
  assert.doesNotMatch(source, /realSeasonStats/, `${relativePath} should not emit deprecated realSeasonStats fields`);
}

for (const relativePath of prohibitedCopyAuditFiles) {
  const source = read(relativePath);
  for (const pattern of prohibitedHistoricalMarketingPatterns) {
    assert.doesNotMatch(
      source,
      pattern,
      `${relativePath} should not contain real-season marketing copy matching ${pattern}`
    );
  }
}

const catalog = readJson('historical-packs/catalog.json');
for (const packId of ownedCatalogPackIds) {
  const entry = catalog.find((item) => item.packId === packId);
  assert.ok(entry, `catalog entry for ${packId} should exist`);
  assert.equal(
    (entry.plannedModes || []).includes('Replay Era Rosters'),
    false,
    `catalog entry for ${packId} should not expose Replay Era Rosters`
  );
  assert.equal(
    /replay|replayable/i.test(JSON.stringify(entry)),
    false,
    `catalog entry for ${packId} should not contain replay-era copy in any casing`
  );
}

for (const packId of expandedCatalogContractPackIds) {
  const entry = catalog.find((item) => item.packId === packId);
  assert.deepEqual(
    entry.plannedModes,
    ['Draft The Era', 'Sim Season', 'Reimagined Season'],
    `catalog entry for ${packId} should advertise the supported draft/sim/reimagined lanes`
  );
  assert.equal(
    typeof entry.art?.headline,
    'string',
    `catalog entry for ${packId} should expose art metadata`
  );
  assert.equal(
    Array.isArray(entry.previewStars) && entry.previewStars.length >= 3,
    true,
    `catalog entry for ${packId} should expose previewStars`
  );
}

for (const relativePath of [
  'historical-packs/nba_1987_full_season_v1/manifest.json',
  'historical-packs/nba_1993_full_season_v1/manifest.json',
  'historical-packs/nba_2001_full_season_v1/season.json',
  'historical-packs/nba_2016_full_season_v1/season.json'
]) {
  const source = read(relativePath);
  assert.equal(
    /Replay|replayable|real-season boots/i.test(source),
    false,
    `${relativePath} should not contain replay-style or real-season copy`
  );
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
  assert.equal(
    manifest.status,
    manifestStatusExpectations[relativePath],
    `${relativePath} should keep its expected manifest status`
  );
}

for (const packId of expandedOptionalContractPackIds) {
  const presentationPath = `historical-packs/${packId}/optional/presentation.json`;
  const presentation = readJson(presentationPath);
  assert.equal(
    typeof presentation.heroTitle,
    'string',
    `${presentationPath} should expose heroTitle`
  );
  assert.equal(
    typeof presentation.heroSubtitle,
    'string',
    `${presentationPath} should expose heroSubtitle`
  );
  assert.equal(
    typeof presentation.featuredTeamId,
    'string',
    `${presentationPath} should expose featuredTeamId`
  );
  assert.equal(
    Array.isArray(presentation.featuredStars),
    true,
    `${presentationPath} should expose featuredStars`
  );
  assert.deepEqual(
    (presentation.entryModes || []).map((entry) => entry.mode),
    ['single_player_season', 'historical_draft', 'reimagined_season'],
    `${presentationPath} should expose the current entry mode contract`
  );

  const summariesPath = `historical-packs/${packId}/optional/summaries.json`;
  const summaries = readJson(summariesPath);
  assert.equal(
    Array.isArray(summaries.featuredStorylines),
    true,
    `${summariesPath} should expose featuredStorylines`
  );
  assert.equal(
    (summaries.teamSpotlights || []).every(
      (entry) => typeof entry.teamId === 'string' && typeof entry.summary === 'string'
    ),
    true,
    `${summariesPath} should expose object teamSpotlights`
  );
  assert.deepEqual(
    (summaries.modeSummaries || []).map((entry) => entry.mode),
    ['single_player_season', 'historical_draft', 'reimagined_season'],
    `${summariesPath} should expose modeSummaries for each supported mode`
  );
  assert.equal(
    summaries.auditSummary?.realStatCoverage?.label,
    'Historical season stats',
    `${summariesPath} should expose auditSummary.realStatCoverage.label`
  );

  const packChallengesPath = `historical-packs/${packId}/optional/pack_challenges.json`;
  const packChallenges = readJson(packChallengesPath);
  assert.equal(
    (packChallenges.challenges || []).every(
      (challenge) =>
        typeof challenge.mode === 'string' &&
        typeof challenge.path === 'string' &&
        typeof challenge.title === 'string' &&
        typeof challenge.description === 'string' &&
        typeof challenge.type === 'string' &&
        challenge.target !== undefined &&
        typeof challenge.evaluation === 'string' &&
        typeof challenge.reward === 'string' &&
        typeof challenge.required === 'boolean' &&
        typeof challenge.featured === 'boolean'
    ),
    true,
    `${packChallengesPath} should expose the current challenge contract`
  );
}

for (const relativePath of [
  'historical-packs/nba_1987_full_season_v1/optional/pack_challenges.json',
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
  'historical-packs/nba_1987_full_season_v1/optional/presentation.json',
  'historical-packs/nba_1993_full_season_v1/optional/presentation.json',
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
  'historical-packs/nba_1987_full_season_v1/optional/summaries.json',
  'historical-packs/nba_1993_full_season_v1/optional/summaries.json',
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
