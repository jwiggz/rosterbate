const assert = require('node:assert/strict');

const { getSimulationShell } = require('../simulation-mode-config.js');
const {
  buildSimulationPlayerPool,
  buildSimulationUniverseBootstrap
} = require('../simulation-mode-runtime.js');

const shell = getSimulationShell();

function rankPlayers(players) {
  return players.slice().sort((a, b) => {
    const overallDiff = Number(b.mixedEraOverall || 0) - Number(a.mixedEraOverall || 0);
    if (overallDiff) return overallDiff;
    const fpDiff = Number(b.fp || 0) - Number(a.fp || 0);
    if (fpDiff) return fpDiff;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
}

const playerPool = [
  { id: 1, name: 'Overall First', team: 'HIS', pos: 'PG', fp: 1, mixedEraOverall: 100, historicalPackId: 'nba_1987_full_season_v1' },
  { id: 2, name: 'Fp Higher', team: 'HIS', pos: 'SG', fp: 20, mixedEraOverall: 99, historicalPackId: 'nba_1987_full_season_v1' },
  { id: 3, name: 'Fp Lower', team: 'HIS', pos: 'SF', fp: 19, mixedEraOverall: 99, historicalPackId: 'nba_1993_full_season_v1' },
  { id: 4, name: 'Alpha', team: 'HIS', pos: 'PF', fp: 50, mixedEraOverall: 98, historicalPackId: 'nba_1993_full_season_v1' },
  { id: 5, name: 'Zulu', team: 'HIS', pos: 'C', fp: 50, mixedEraOverall: 98, historicalPackId: 'nba_1996_full_season_v1' },
  ...Array.from({ length: 355 }, (_, index) => ({
    id: index + 6,
    name: `Filler ${String(index + 1).padStart(3, '0')}`,
    team: 'HIS',
    pos: index % 5 === 0 ? 'PG' : index % 5 === 1 ? 'SG' : index % 5 === 2 ? 'SF' : index % 5 === 3 ? 'PF' : 'C',
    fp: 40 - (index % 5),
    mixedEraOverall: 97 - Math.floor(index / 5),
    historicalPackId: index < 89 ? 'nba_1987_full_season_v1' : index < 178 ? 'nba_1993_full_season_v1' : index < 266 ? 'nba_1996_full_season_v1' : 'nba_2016_full_season_v1'
  }))
];

const mixedEraContext = {
  mixedEraConfigId: '1987-1993-1996-2016',
  sourcePackIds: [
    'nba_1987_full_season_v1',
    'nba_1993_full_season_v1',
    'nba_1996_full_season_v1',
    'nba_2016_full_season_v1'
  ],
  sourceSeasonLabels: ['1986-87', '1992-93', '1995-96', '2015-16'],
  playerPool
};

const expectedRankedNames = rankPlayers(playerPool).map((player) => player.name);

const pool = buildSimulationPlayerPool({ mixedEraContext, shell });

assert.equal(pool.draftPool.length, 300);
assert.equal(pool.freeAgents.length, 60);
assert.equal(pool.poolMeta.rosterSize, 10);
assert.equal(pool.poolMeta.teamCount, 30);
assert.deepStrictEqual(
  pool.draftPool.slice(0, 5).map((player) => player.name),
  ['Overall First', 'Fp Higher', 'Fp Lower', 'Alpha', 'Zulu']
);
assert.deepStrictEqual(
  pool.draftPool.slice(0, 5).map((player) => player.name),
  expectedRankedNames.slice(0, 5)
);
assert.deepStrictEqual(
  pool.draftPool.slice(295, 300).map((player) => player.name),
  expectedRankedNames.slice(295, 300)
);
assert.deepStrictEqual(
  pool.freeAgents.slice(0, 5).map((player) => player.name),
  expectedRankedNames.slice(300, 305)
);
assert.ok(pool.draftPool.slice(0, 30).every((player) => player.simulationTier === 'franchise'));

const bootstrap = buildSimulationUniverseBootstrap({
  shell,
  mixedEraContext,
  controlledTeamAbbr: 'LAL',
  draftSlot: 4
});

assert.equal(bootstrap.simulationMode, 'nba_mixed_era_single_player_v1');
assert.equal(bootstrap.leagueShell.teams.length, 30);
assert.equal(bootstrap.sourceSeasons.sourcePackIds.length, 4);
assert.equal(bootstrap.draftState.controlledTeamAbbr, 'LAL');
assert.equal(bootstrap.draftState.draftSlot, 4);
assert.equal(bootstrap.draftState.draftPool.length, 300);
assert.equal(bootstrap.draftState.freeAgents.length, 60);
assert.equal(bootstrap.seasonState.currentDay, 1);
assert.equal(bootstrap.postseasonState.phase, 'regular_season');

bootstrap.leagueShell.teams[0].conference = 'Mutated';
bootstrap.draftState.draftPool[0].name = 'Changed';
bootstrap.sourceSeasons.sourcePackIds.push('extra_pack');
bootstrap.seasonState.standings[0].w = 99;
bootstrap.postseasonState.phase = 'mutated_phase';

const freshBootstrap = buildSimulationUniverseBootstrap({
  shell,
  mixedEraContext,
  controlledTeamAbbr: 'LAL',
  draftSlot: 4
});

assert.equal(freshBootstrap.leagueShell.teams[0].conference, 'East');
assert.equal(freshBootstrap.draftState.draftPool[0].name, 'Overall First');
assert.equal(freshBootstrap.sourceSeasons.sourcePackIds.length, 4);
assert.equal(freshBootstrap.seasonState.standings[0].w, 0);
assert.equal(freshBootstrap.postseasonState.phase, 'regular_season');

console.log('simulation mode runtime test passed');
