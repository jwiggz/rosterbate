const assert = require('node:assert/strict');

const { getSimulationShell } = require('../simulation-mode-config.js');
const {
  buildSimulationPlayerPool,
  buildSimulationUniverseBootstrap,
  buildCompletedSimulationAutoDraftState,
  writeCompletedSimulationState
} = require('../simulation-mode-runtime.js');

const shell = getSimulationShell();
const nflShell = getSimulationShell({ sport: 'nfl' });

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

const nflRosterTemplate = ['QB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'OL', 'DL', 'LB', 'CB', 'S', 'K', 'DST'];
const nflPlayerPool = Array.from({ length: 480 }, (_, index) => {
  const position = nflRosterTemplate[index % nflRosterTemplate.length];
  return {
    id: 5000 + index + 1,
    name: `NFL Player ${String(index + 1).padStart(3, '0')}`,
    team: 'HIS',
    pos: position,
    fp: 120 - (index % nflRosterTemplate.length),
    mixedEraOverall: 99 - Math.floor(index / nflRosterTemplate.length),
    historicalPackId: index < 160 ? 'nfl_1998_full_season_v1' : index < 320 ? 'nfl_2007_full_season_v1' : 'nfl_2014_full_season_v1'
  };
});

const nflMixedEraContext = {
  mixedEraConfigId: '1998-2007-2014-nfl',
  sourcePackIds: [
    'nfl_1998_full_season_v1',
    'nfl_2007_full_season_v1',
    'nfl_2014_full_season_v1'
  ],
  sourceSeasonLabels: ['1998', '2007', '2014'],
  playerPool: nflPlayerPool
};

function buildSkewedNflPlayers(position, count, startId, baseOverall, baseFp) {
  return Array.from({ length: count }, (_, index) => ({
    id: startId + index,
    name: `${position} Skew ${String(index + 1).padStart(3, '0')}`,
    team: 'HIS',
    pos: position,
    fp: baseFp - (index % 7),
    mixedEraOverall: baseOverall - Math.floor(index / 32),
    historicalPackId: index < Math.ceil(count / 2) ? 'nfl_2007_full_season_v1' : 'nfl_2014_full_season_v1'
  }));
}

const skewedNflPlayerPool = [
  ...buildSkewedNflPlayers('WR', 96, 9000, 99, 140),
  ...buildSkewedNflPlayers('RB', 32, 10000, 98, 132),
  ...buildSkewedNflPlayers('TE', 32, 11000, 97, 126),
  ...buildSkewedNflPlayers('QB', 32, 12000, 92, 90),
  ...buildSkewedNflPlayers('OL', 32, 13000, 60, 30),
  ...buildSkewedNflPlayers('DL', 48, 14000, 96, 85),
  ...buildSkewedNflPlayers('LB', 64, 15000, 95, 82),
  ...buildSkewedNflPlayers('S', 128, 15500, 39, 9),
  ...buildSkewedNflPlayers('K', 32, 16000, 58, 22),
  ...buildSkewedNflPlayers('DST', 32, 17000, 57, 20),
  ...buildSkewedNflPlayers('CB', 128, 18000, 40, 10)
];

const skewedNflMixedEraContext = {
  mixedEraConfigId: '2007-2014-nfl-skewed',
  sourcePackIds: [
    'nfl_2007_full_season_v1',
    'nfl_2014_full_season_v1'
  ],
  sourceSeasonLabels: ['2007', '2014'],
  playerPool: skewedNflPlayerPool
};

function countRosterPlayersByPosition(roster, position) {
  return roster.filter((player) => player.pos === position).length;
}

function assertNflRosterCoverage(roster, label) {
  assert.ok(countRosterPlayersByPosition(roster, 'QB') >= 1, `${label} should include at least one QB`);
  assert.ok(countRosterPlayersByPosition(roster, 'RB') >= 1, `${label} should include at least one RB`);
  assert.ok(countRosterPlayersByPosition(roster, 'TE') >= 1, `${label} should include at least one TE`);
  assert.ok(countRosterPlayersByPosition(roster, 'K') >= 1, `${label} should include at least one K`);
  assert.ok(countRosterPlayersByPosition(roster, 'DST') >= 1, `${label} should include at least one DST`);
  assert.ok(countRosterPlayersByPosition(roster, 'OL') >= 1, `${label} should include at least one OL`);
  assert.ok(countRosterPlayersByPosition(roster, 'DL') >= 1, `${label} should include at least one DL`);
  assert.ok(countRosterPlayersByPosition(roster, 'LB') >= 1, `${label} should include at least one LB`);
  assert.ok(countRosterPlayersByPosition(roster, 'CB') >= 1, `${label} should include at least one CB`);
  assert.ok(countRosterPlayersByPosition(roster, 'S') >= 1, `${label} should include at least one S`);
  assert.ok(countRosterPlayersByPosition(roster, 'WR') >= 2, `${label} should include at least two WRs`);
  assert.ok(
    roster.filter((player) => ['RB', 'WR', 'TE'].includes(player.pos)).length >= 5,
    `${label} should include enough RB/WR/TE coverage to satisfy the flex concept`
  );
}

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

const partialShellBootstrap = buildSimulationUniverseBootstrap({
  shell: { rosterSize: 10 },
  mixedEraContext,
  controlledTeamAbbr: 'LAL',
  draftSlot: 4
});

assert.equal(partialShellBootstrap.leagueShell.teams.length, 0);
assert.deepStrictEqual(partialShellBootstrap.draftState.rostersByTeam, {});
assert.deepStrictEqual(partialShellBootstrap.seasonState.standings, []);

const nflBootstrap = buildSimulationUniverseBootstrap({
  shell: nflShell,
  mixedEraContext: nflMixedEraContext,
  controlledTeamAbbr: 'GB',
  draftSlot: 12
});

assert.equal(nflBootstrap.simulationMode, 'nfl_mixed_era_single_player_v1');
assert.equal(nflBootstrap.leagueShell.sport, 'nfl');
assert.equal(nflBootstrap.draftState.teamCount, 32);
assert.equal(nflBootstrap.draftState.rosterSize, 13);
assert.equal(nflBootstrap.seasonState.currentWeek, 1);
assert.equal(nflBootstrap.draftState.controlledTeamAbbr, 'GB');

const skewedNflPool = buildSimulationPlayerPool({
  shell: nflShell,
  mixedEraContext: skewedNflMixedEraContext
});

assert.equal(skewedNflPool.draftPool.length, 416);
assert.ok(countRosterPlayersByPosition(skewedNflPool.draftPool, 'QB') >= 32, 'skewed NFL draft pool should reserve 32 QBs');
assert.ok(countRosterPlayersByPosition(skewedNflPool.draftPool, 'RB') >= 32, 'skewed NFL draft pool should reserve 32 RBs');
assert.ok(countRosterPlayersByPosition(skewedNflPool.draftPool, 'WR') >= 64, 'skewed NFL draft pool should reserve 64 WRs');
assert.ok(countRosterPlayersByPosition(skewedNflPool.draftPool, 'TE') >= 32, 'skewed NFL draft pool should reserve 32 TEs');
assert.ok(countRosterPlayersByPosition(skewedNflPool.draftPool, 'OL') >= 32, 'skewed NFL draft pool should reserve 32 OLs');
assert.ok(countRosterPlayersByPosition(skewedNflPool.draftPool, 'DL') >= 32, 'skewed NFL draft pool should reserve 32 DLs');
assert.ok(countRosterPlayersByPosition(skewedNflPool.draftPool, 'LB') >= 32, 'skewed NFL draft pool should reserve 32 LBs');
assert.ok(countRosterPlayersByPosition(skewedNflPool.draftPool, 'CB') >= 32, 'skewed NFL draft pool should reserve 32 CBs');
assert.ok(countRosterPlayersByPosition(skewedNflPool.draftPool, 'S') >= 32, 'skewed NFL draft pool should reserve 32 Ss');
assert.ok(countRosterPlayersByPosition(skewedNflPool.draftPool, 'K') >= 32, 'skewed NFL draft pool should reserve 32 Ks');
assert.ok(countRosterPlayersByPosition(skewedNflPool.draftPool, 'DST') >= 32, 'skewed NFL draft pool should reserve 32 DST units');
assert.ok(
  skewedNflPool.draftPool.filter((player) => ['RB', 'WR', 'TE', 'FLEX'].includes(player.pos)).length >= 160,
  'skewed NFL draft pool should reserve enough RB/WR/TE/FLEX players to satisfy flex slots'
);

const autoDraftState = buildCompletedSimulationAutoDraftState({
  shell,
  mixedEraContext,
  controlledTeamAbbr: 'LAL'
});

assert.equal(autoDraftState.simulationMode, 'nba_mixed_era_single_player_v1');
assert.equal(autoDraftState.draftState.controlledTeamAbbr, 'LAL');
assert.equal(Object.keys(autoDraftState.draftState.rostersByTeam).length, 30);
assert.ok(
  Object.values(autoDraftState.draftState.rostersByTeam).every((roster) => Array.isArray(roster) && roster.length === 10),
  'every team roster should contain 10 drafted players'
);
assert.equal(
  new Set(Object.values(autoDraftState.draftState.rostersByTeam).flat().map((player) => player.id)).size,
  300
);
assert.equal(autoDraftState.draftState.freeAgents.length, 60);
assert.deepStrictEqual(
  autoDraftState.draftState.freeAgents.map((player) => player.name),
  expectedRankedNames.slice(300, 360)
);
assert.equal(autoDraftState.seasonState.currentDay, 1);
assert.equal(autoDraftState.postseasonState.phase, 'regular_season');

const nflAutoDraftState = buildCompletedSimulationAutoDraftState({
  shell: nflShell,
  mixedEraContext: nflMixedEraContext,
  controlledTeamAbbr: 'GB'
});

const gbRoster = nflAutoDraftState.draftState.rostersByTeam.GB || [];

assert.equal(gbRoster.length, 13);
assert.ok(gbRoster.some((player) => player.pos === 'QB'), 'GB roster should include a QB');
assert.ok(gbRoster.some((player) => player.pos === 'OL'), 'GB roster should include an OL');
assert.ok(gbRoster.some((player) => player.pos === 'DST'), 'GB roster should include a DST');
assert.ok(
  Object.values(nflAutoDraftState.draftState.rostersByTeam).every((roster) => Array.isArray(roster) && roster.length === 13),
  'every NFL team roster should contain 13 drafted players'
);

const skewedNflAutoDraftState = buildCompletedSimulationAutoDraftState({
  shell: nflShell,
  mixedEraContext: skewedNflMixedEraContext,
  controlledTeamAbbr: 'GB'
});

assert.equal(Object.keys(skewedNflAutoDraftState.draftState.rostersByTeam).length, 32);
Object.entries(skewedNflAutoDraftState.draftState.rostersByTeam).forEach(([teamAbbr, roster]) => {
  assert.equal(roster.length, 13, `${teamAbbr} should finish the skewed NFL autodraft with 13 players`);
  assertNflRosterCoverage(roster, `${teamAbbr} skewed NFL roster`);
});

assert.throws(() => buildCompletedSimulationAutoDraftState({
  shell,
  mixedEraContext: {
    ...mixedEraContext,
    playerPool: playerPool.slice(0, 299)
  },
  controlledTeamAbbr: 'LAL'
}), /Unable to auto-draft simulation league/i);

const originalLocalStorage = global.localStorage;
global.localStorage = {
  setItem(){
    throw new Error('quota exceeded');
  }
};
assert.throws(() => writeCompletedSimulationState({ ok: true }), /quota exceeded/i);
global.localStorage = originalLocalStorage;

console.log('simulation mode runtime test passed');
