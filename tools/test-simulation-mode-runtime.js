const assert = require('node:assert/strict');

const { getSimulationShell } = require('../simulation-mode-config.js');
const {
  buildSimulationPlayerPool,
  buildSimulationUniverseBootstrap
} = require('../simulation-mode-runtime.js');

const shell = getSimulationShell();

const mixedEraContext = {
  mixedEraConfigId: '1987-1993-1996-2016',
  sourcePackIds: [
    'nba_1987_full_season_v1',
    'nba_1993_full_season_v1',
    'nba_1996_full_season_v1',
    'nba_2016_full_season_v1'
  ],
  sourceSeasonLabels: ['1986-87', '1992-93', '1995-96', '2015-16'],
  playerPool: Array.from({ length: 420 }, (_, index) => ({
    id: index + 1,
    name: `Player ${String(index + 1).padStart(3, '0')}`,
    team: 'HIS',
    pos: index % 5 === 0 ? 'PG' : index % 5 === 1 ? 'SG' : index % 5 === 2 ? 'SF' : index % 5 === 3 ? 'PF' : 'C',
    fp: 99 - (index * 0.15),
    mixedEraOverall: 99 - (index * 0.12),
    historicalPackId: index < 105 ? 'nba_1987_full_season_v1' : index < 210 ? 'nba_1993_full_season_v1' : index < 315 ? 'nba_1996_full_season_v1' : 'nba_2016_full_season_v1'
  }))
};

const pool = buildSimulationPlayerPool({ mixedEraContext, shell });

assert.equal(pool.draftPool.length, 300);
assert.equal(pool.freeAgents.length, 60);
assert.equal(pool.poolMeta.rosterSize, 10);
assert.equal(pool.poolMeta.teamCount, 30);
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

console.log('simulation mode runtime test passed');
