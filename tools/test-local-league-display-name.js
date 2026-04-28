const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function read(file) {
  return fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
}

function extractFunction(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `expected to find start marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `expected to find end marker: ${endMarker}`);
  return source.slice(start, end);
}

function loadHelperApi(file, helperName) {
  const source = read(file);
  const script = `
${extractFunction(source, 'function normalize', `function ${helperName}(`)}
${extractFunction(source, `function ${helperName}(`, "const RB_PENDING_SEASON_KEY='rbPendingSeasonLaunch';")}
module.exports = { ${helperName} };
`;
  const sandbox = { module: { exports: {} }, exports: {} };
  vm.createContext(sandbox);
  vm.runInContext(script, sandbox);
  return sandbox.module.exports;
}

const myLeaguesSource = read('my-leagues.html');
const indexSource = read('index.html');

assert.match(
  myLeaguesSource,
  /name:deriveMyLeaguesLocalLeagueDisplayName\(data\)/,
  'my-leagues local save cards should derive display names from current simulation-local-league naming rules'
);
assert.match(
  indexSource,
  /name:deriveHomepageLocalLeagueDisplayName\(data\)/,
  'homepage local save cards should derive display names from current simulation-local-league naming rules'
);

const { deriveMyLeaguesLocalLeagueDisplayName } = loadHelperApi('my-leagues.html', 'deriveMyLeaguesLocalLeagueDisplayName');
const { deriveHomepageLocalLeagueDisplayName } = loadHelperApi('index.html', 'deriveHomepageLocalLeagueDisplayName');

const mixedEraState = {
  leagueName: '2025-26 NBA',
  sport: 'nba',
  activeSeasonBackend: 'simulation',
  historicalEntryMode: 'simulation_season',
  sourceSeasons: {
    sourceSeasonLabels: ['1995-96', '1992-93', '1989-90']
  },
  leagueShell: {
    anchorSeasonLabel: '2025-26 NBA'
  },
  teams: ['A', 'B'],
  allRosters: [[], []],
  standings: [{}, {}]
};

assert.equal(
  deriveMyLeaguesLocalLeagueDisplayName(mixedEraState),
  'Mixed Era Local League',
  'my-leagues should not surface a stale anchor-season label for a mixed-era local league'
);
assert.equal(
  deriveHomepageLocalLeagueDisplayName(mixedEraState),
  'Mixed Era Local League',
  'homepage should not surface a stale anchor-season label for a mixed-era local league'
);

const namedLeagueState = {
  leagueName: 'Jabro Chaos League',
  sport: 'nba',
  activeSeasonBackend: 'simulation',
  historicalEntryMode: 'simulation_season',
  sourceSeasons: {
    sourceSeasonLabels: ['1995-96', '1992-93']
  },
  leagueShell: {
    anchorSeasonLabel: '2025-26 NBA'
  },
  teams: ['A', 'B'],
  allRosters: [[], []],
  standings: [{}, {}]
};

assert.equal(
  deriveMyLeaguesLocalLeagueDisplayName(namedLeagueState),
  'Jabro Chaos League',
  'my-leagues should preserve explicit local league names'
);
assert.equal(
  deriveHomepageLocalLeagueDisplayName(namedLeagueState),
  'Jabro Chaos League',
  'homepage should preserve explicit local league names'
);

console.log('local league display name test passed');
