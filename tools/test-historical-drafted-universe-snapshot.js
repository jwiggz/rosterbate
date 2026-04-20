const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function readSeasonSource() {
  return fs.readFileSync(path.join(__dirname, '..', 'rosterbate-season.html'), 'utf8');
}

function extractFunction(source, name) {
  const match = source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`, 'm'));
  if (!match) {
    throw new Error(`Could not find function ${name}`);
  }
  return match[0];
}

function maybeExtractFunction(source, name) {
  const match = source.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`, 'm'));
  return match ? match[0] : '';
}

function createPlayer(index) {
  const seasonLabel = index < 150 ? '1995-96 NBA Historic Season' : '2015-16 NBA Historic Season';
  const packId = index < 150 ? 'nba_1996_full_season_v1' : 'nba_2016_full_season_v1';
  return {
    id: index + 1,
    historicalPlayerId: `hist-${index + 1}`,
    historicalPackId: packId,
    historicalSourcePackIds: [packId],
    name: `Player ${String(index + 1).padStart(3, '0')}`,
    fp: 60 - (index * 0.1),
    mixedEraOverall: 100 - (index * 0.2)
  };
}

function buildCompactedState() {
  const players = Array.from({ length: 300 }, (_, index) => createPlayer(index));
  const myRoster = players.slice(0, 16).map(player => ({ ...player }));
  const allRosters = Array.from({ length: 9 }, (_, teamIndex) =>
    players.slice(16 + (teamIndex * 16), 16 + ((teamIndex + 1) * 16)).map(player => ({ ...player }))
  );
  const ilRosters = Array.from({ length: 10 }, () => []);
  ilRosters[0] = players.slice(160, 162).map(player => ({ ...player }));
  const waiver = players.slice(162).map(player => ({ ...player }));

  return {
    historicalEntryMode: 'historical_draft',
    historicalPackId: 'mixed_era_1996_2016_top300_v1',
    historicalSourcePackIds: ['nba_1996_full_season_v1', 'nba_2016_full_season_v1'],
    mixedEraConfigId: '1996-2016-top300',
    leagueName: 'Top300 Regression League',
    teams: ['Audit Agents'].concat(Array.from({ length: 9 }, (_, index) => `CPU Team ${index + 1}`)),
    myRoster,
    allRosters,
    ilRosters,
    waiver
  };
}

const source = readSeasonSource();
const script = [
  extractFunction(source, 'isHistoricalDraftUniverse'),
  extractFunction(source, 'getHistoricalUniverseSourcePackIds'),
  maybeExtractFunction(source, 'getHistoricalUniversePlayerIdentityKey'),
  maybeExtractFunction(source, 'buildHistoricalUniversePlayerPoolFromState'),
  extractFunction(source, 'formatHistoricalPackShortLabel'),
  extractFunction(source, 'buildDraftedUniverseSimulationBootSnapshot')
].filter(Boolean).join('\n\n');

const sandbox = {
  D: buildCompactedState(),
  G: { day: 1, week: 1 }
};

vm.createContext(sandbox);
vm.runInContext(script, sandbox, { filename: 'rosterbate-season-snapshot.js' });

const snapshot = sandbox.buildDraftedUniverseSimulationBootSnapshot();

assert.ok(snapshot, 'expected drafted-universe simulation snapshot');
assert.equal(snapshot.playerCount, 300, 'expected compact resumed top300 universe to still report 300 players');
assert.equal(snapshot.isMixedEra, true);
assert.equal(snapshot.sourcePackLabel, '1995-96 + 2015-16');
assert.equal(Array.isArray(snapshot.topTargets), true);
assert.ok(snapshot.topTargets.length > 0, 'expected compact resumed top300 universe to keep top-target summary');

console.log('historical drafted-universe snapshot test passed');
