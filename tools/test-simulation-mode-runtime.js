const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');

const { getSimulationShell } = require('../simulation-mode-config.js');
const {
  getSimulationRosterNeeds,
  getSimulationStarterSlots,
  getSimulationRequiredStarterCount,
  getSimulationLineupSlotTemplate,
  getNflSlotEligibilityMap,
  normalizeSimulationLineupSlots,
  validateSimulationLineup,
  buildSuggestedSimulationLineup,
  buildSimulationPlayerPool,
  buildSimulationUniverseBootstrap,
  buildCompletedSimulationAutoDraftState,
  setSimulationLineup,
  pruneLineupState,
  claimSimulationFreeAgent,
  applySimulationTrade,
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

const realNflPlayerPool = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'historical-packs', 'nfl_2014_full_season_v1', 'players.json'), 'utf8')
);

const realNflMixedEraContext = {
  mixedEraConfigId: '2014-nfl',
  sourcePackIds: ['nfl_2014_full_season_v1'],
  sourceSeasonLabels: ['2014'],
  playerPool: realNflPlayerPool
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
  ...buildSkewedNflPlayers('RB', 64, 10000, 98, 132),
  ...buildSkewedNflPlayers('TE', 32, 11000, 97, 126),
  ...buildSkewedNflPlayers('QB', 32, 12000, 92, 90),
  ...buildSkewedNflPlayers('EDGE', 32, 13000, 96, 85),
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
  assert.ok(countRosterPlayersByPosition(roster, 'RB') >= 2, `${label} should include at least two RBs`);
  assert.ok(countRosterPlayersByPosition(roster, 'TE') >= 1, `${label} should include at least one TE`);
  assert.ok(countRosterPlayersByPosition(roster, 'K') >= 1, `${label} should include at least one K`);
  assert.ok(countRosterPlayersByPosition(roster, 'DST') >= 1, `${label} should include at least one DST`);
  assert.ok(countRosterPlayersByPosition(roster, 'EDGE') >= 1, `${label} should include at least one EDGE`);
  assert.ok(countRosterPlayersByPosition(roster, 'LB') >= 1, `${label} should include at least one LB`);
  assert.ok(countRosterPlayersByPosition(roster, 'CB') >= 1, `${label} should include at least one CB`);
  assert.ok(countRosterPlayersByPosition(roster, 'S') >= 1, `${label} should include at least one S`);
  assert.ok(countRosterPlayersByPosition(roster, 'WR') >= 2, `${label} should include at least two WRs`);
  assert.ok(
    roster.filter((player) => ['RB', 'WR', 'TE'].includes(player.pos)).length >= 6,
    `${label} should include enough RB/WR/TE coverage to satisfy the flex concept`
  );
}

assert.deepStrictEqual(
  getSimulationRosterNeeds(nflShell),
  ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'EDGE', 'LB', 'CB', 'S', 'K', 'DST'],
  'nfl simulation runtime should use the phase-1 roster template that matches the shipped 2014 pack'
);

assert.deepStrictEqual(
  getSimulationStarterSlots(nflShell),
  ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE', 'FLEX', 'K', 'DST'],
  'nfl simulation runtime should expose football starter slots'
);

assert.deepStrictEqual(
  getSimulationStarterSlots(shell),
  ['PG', 'SG', 'SF', 'PF', 'C'],
  'nba simulation runtime should keep the basketball starter slots'
);

assert.equal(getSimulationRequiredStarterCount(nflShell), 9);
assert.equal(getSimulationRequiredStarterCount(shell), 5);

assert.deepStrictEqual(
  getSimulationLineupSlotTemplate(nflShell),
  ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE', 'FLEX', 'K', 'DST']
);

assert.deepStrictEqual(
  getNflSlotEligibilityMap(),
  {
    QB: ['QB'],
    RB1: ['RB'],
    RB2: ['RB'],
    WR1: ['WR'],
    WR2: ['WR'],
    TE: ['TE'],
    FLEX: ['RB', 'WR', 'TE'],
    K: ['K'],
    DST: ['DST']
  }
);

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

const blankLineupState = setSimulationLineup(
  {
    seasonState: {
      lineupIdsByTeam: {
        GB: [201, 202]
      },
      activityLog: []
    }
  },
  '   ',
  [301, 302]
);

assert.deepStrictEqual(
  blankLineupState.seasonState.lineupIdsByTeam,
  { GB: [201, 202] },
  'blank team abbreviations should not write a lineup under an empty key'
);
assert.equal(
  blankLineupState.seasonState.activityLog.length,
  0,
  'blank team abbreviations should not add a lineup activity log entry'
);

const nbaNullLineupState = setSimulationLineup(
  {
    leagueShell: shell,
    seasonState: {
      lineupIdsByTeam: {},
      lineupSlotsByTeam: {
        GB: {
          QB: 1,
          RB1: 2,
          RB2: 3,
          WR1: 4,
          WR2: 5,
          TE: 6,
          FLEX: 7,
          K: 8,
          DST: 9
        }
      },
      activityLog: []
    }
  },
  'gb',
  null
);

assert.deepStrictEqual(
  nbaNullLineupState.seasonState.lineupIdsByTeam.GB,
  [],
  'nba null lineup input should normalize to an empty starter array'
);
assert.deepStrictEqual(
  nbaNullLineupState.seasonState.lineupSlotsByTeam,
  {
    GB: {
      QB: 1,
      RB1: 2,
      RB2: 3,
      WR1: 4,
      WR2: 5,
      TE: 6,
      FLEX: 7,
      K: 8,
      DST: 9
    }
  },
  'nba null lineup input should not create or alter slot state'
);

const nbaLineupState = setSimulationLineup(
  {
    leagueShell: shell,
    seasonState: {
      lineupIdsByTeam: {
        GB: [9, 8, 7, 6, 5]
      },
      lineupSlotsByTeam: {
        GB: {
          QB: 1,
          RB1: 2,
          RB2: 3,
          WR1: 4,
          WR2: 5,
          TE: 6,
          FLEX: 7,
          K: 8,
          DST: 9
        }
      },
      activityLog: []
    }
  },
  'gb',
  [401, 402, 403, 404, 405]
);

assert.deepStrictEqual(
  nbaLineupState.seasonState.lineupIdsByTeam.GB,
  [401, 402, 403, 404, 405],
  'nba lineup ids should remain a direct ordered array'
);
assert.deepStrictEqual(
  nbaLineupState.seasonState.lineupSlotsByTeam,
  {
    GB: {
      QB: 1,
      RB1: 2,
      RB2: 3,
      WR1: 4,
      WR2: 5,
      TE: 6,
      FLEX: 7,
      K: 8,
      DST: 9
    }
  },
  'nba lineup updates should not write or alter slot state'
);

const nflLineupState = setSimulationLineup(
  {
    leagueShell: nflShell,
    seasonState: {
      lineupIdsByTeam: {
        GB: [101, 102, 103, 104, 105, 106, 107, 108, 109]
      },
      activityLog: []
    }
  },
  'gb',
  {
    QB: 2014287,
    RB1: 2014288,
    RB2: 2014289,
    WR1: 2014290,
    WR2: 2014291,
    TE: 2014293,
    FLEX: 2014292,
    K: 2014294,
    DST: 2014295
  }
);

assert.deepStrictEqual(
  nflLineupState.seasonState.lineupSlotsByTeam.GB,
  {
    QB: 2014287,
    RB1: 2014288,
    RB2: 2014289,
    WR1: 2014290,
    WR2: 2014291,
    TE: 2014293,
    FLEX: 2014292,
    K: 2014294,
    DST: 2014295
  },
  'nfl lineup slots should persist as a normalized slot map'
);

assert.deepStrictEqual(
  nflLineupState.seasonState.lineupIdsByTeam.GB,
  [2014287, 2014288, 2014289, 2014290, 2014291, 2014293, 2014292, 2014294, 2014295],
  'nfl lineup ids should be derived in slot order for compatibility'
);

assert.deepStrictEqual(
  normalizeSimulationLineupSlots(nflShell, [2014287, 2014288, 2014289, 2014290, 2014291, 2014293, 2014292, 2014294, 2014295]),
  {
    QB: 2014287,
    RB1: 2014288,
    RB2: 2014289,
    WR1: 2014290,
    WR2: 2014291,
    TE: 2014293,
    FLEX: 2014292,
    K: 2014294,
    DST: 2014295
  }
);

const waiverSnapshotState = {
  draftState: {
    rostersByTeam: {
      GB: [{ id: 1, name: 'Roster Original', designation: 'ACTIVE' }]
    },
    freeAgents: [{ id: 2, name: 'Free Agent Original', designation: 'ACTIVE' }]
  },
  seasonState: {
    lineupIdsByTeam: {
      GB: [1]
    },
    lineupSlotsByTeam: {
      GB: {
        QB: 1,
        RB1: null,
        RB2: null,
        WR1: null,
        WR2: null,
        TE: null,
        FLEX: null,
        K: null,
        DST: null
      }
    },
    activityLog: []
  }
};

const waivedState = claimSimulationFreeAgent(waiverSnapshotState, {
  teamAbbr: 'GB',
  addPlayerId: 2,
  dropPlayerId: 1
});

waivedState.draftState.rostersByTeam.GB[0].designation = 'OUT';
waivedState.draftState.freeAgents[0].designation = 'BENCH';

assert.equal(
  waiverSnapshotState.draftState.freeAgents[0].designation,
  'ACTIVE',
  'successful waiver claims should not reuse free agent objects from the prior snapshot'
);
assert.equal(
  waiverSnapshotState.draftState.rostersByTeam.GB[0].designation,
  'ACTIVE',
  'successful waiver claims should not reuse dropped roster objects from the prior snapshot'
);
assert.deepStrictEqual(waivedState.seasonState.lineupIdsByTeam.GB, []);
assert.equal(waivedState.seasonState.lineupSlotsByTeam.GB.QB, null);

const tradeSnapshotState = {
  draftState: {
    rostersByTeam: {
      GB: [{ id: 10, name: 'GB Original', designation: 'ACTIVE' }],
      CHI: [{ id: 20, name: 'CHI Original', designation: 'ACTIVE' }]
    }
  },
  seasonState: {
    lineupIdsByTeam: {
      GB: [10],
      CHI: [20]
    },
    lineupSlotsByTeam: {
      GB: {
        QB: 10,
        RB1: null,
        RB2: null,
        WR1: null,
        WR2: null,
        TE: null,
        FLEX: null,
        K: null,
        DST: null
      },
      CHI: {
        QB: 20,
        RB1: null,
        RB2: null,
        WR1: null,
        WR2: null,
        TE: null,
        FLEX: null,
        K: null,
        DST: null
      }
    },
    activityLog: []
  }
};

const tradedState = applySimulationTrade(tradeSnapshotState, {
  fromTeamAbbr: 'GB',
  toTeamAbbr: 'CHI',
  outgoingPlayerIds: [10],
  incomingPlayerIds: [20]
});

tradedState.draftState.rostersByTeam.GB[0].designation = 'QUESTIONABLE';
tradedState.draftState.rostersByTeam.CHI[0].designation = 'IR';

assert.equal(
  tradeSnapshotState.draftState.rostersByTeam.CHI[0].designation,
  'ACTIVE',
  'successful trades should not reuse incoming player objects from the prior snapshot'
);
assert.equal(
  tradeSnapshotState.draftState.rostersByTeam.GB[0].designation,
  'ACTIVE',
  'successful trades should not reuse outgoing player objects from the prior snapshot'
);
assert.deepStrictEqual(tradedState.seasonState.lineupIdsByTeam.GB, []);
assert.equal(tradedState.seasonState.lineupSlotsByTeam.GB.QB, null);
assert.deepStrictEqual(tradedState.seasonState.lineupIdsByTeam.CHI, []);
assert.equal(tradedState.seasonState.lineupSlotsByTeam.CHI.QB, null);

const explicitPruneState = pruneLineupState(
  {
    seasonState: {
      lineupIdsByTeam: { GB: [1, 2, 3] },
      lineupSlotsByTeam: {
        GB: {
          QB: 1,
          RB1: 2,
          RB2: 3,
          WR1: null,
          WR2: null,
          TE: null,
          FLEX: null,
          K: null,
          DST: null
        }
      }
    }
  },
  'GB',
  [2]
);

assert.deepStrictEqual(explicitPruneState.seasonState.lineupIdsByTeam.GB, [1, 3]);
assert.equal(explicitPruneState.seasonState.lineupSlotsByTeam.GB.RB1, null);

const malformedTradeState = applySimulationTrade(
  {
    draftState: {
      rostersByTeam: {
        GB: [{ id: 1, name: 'One' }]
      }
    },
    seasonState: {
      activityLog: []
    }
  },
  {
    fromTeamAbbr: '  ',
    toTeamAbbr: 'GB',
    outgoingPlayerIds: [],
    incomingPlayerIds: []
  }
);

assert.deepStrictEqual(
  malformedTradeState.draftState.rostersByTeam,
  { GB: [{ id: 1, name: 'One' }] },
  'blank team abbreviations and empty trade ids should not mutate rosters'
);
assert.equal(
  malformedTradeState.seasonState.activityLog.length,
  0,
  'blank team abbreviations and empty trade ids should not log a trade'
);

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
  mixedEraContext: realNflMixedEraContext,
  controlledTeamAbbr: 'GB',
  draftSlot: 12
});

assert.equal(nflBootstrap.simulationMode, 'nfl_mixed_era_single_player_v1');
assert.equal(nflBootstrap.leagueShell.sport, 'nfl');
assert.equal(nflBootstrap.draftState.teamCount, 32);
assert.equal(nflBootstrap.draftState.rosterSize, 13);
assert.equal(nflBootstrap.seasonState.currentWeek, 1);
assert.equal(nflBootstrap.draftState.controlledTeamAbbr, 'GB');
assert.equal(nflBootstrap.draftState.draftPool.length, 416, 'real 2014 nfl pack should fill the full 32x13 draft pool');
assert.equal(nflBootstrap.draftState.freeAgents.length, 0, 'real 2014 nfl pack should not need extra free agents to satisfy phase-1 shell');

const realNflPositionCounts = realNflPlayerPool.reduce((counts, player) => {
  counts[player.pos] = Number(counts[player.pos] || 0) + 1;
  return counts;
}, {});
assert.deepStrictEqual(realNflPositionCounts, {
  QB: 32,
  RB: 64,
  WR: 96,
  TE: 32,
  EDGE: 32,
  LB: 32,
  CB: 32,
  S: 32,
  K: 32,
  DST: 32
}, 'real nfl 2014 pack position counts should match the phase-1 roster template');

const skewedNflPool = buildSimulationPlayerPool({
  shell: nflShell,
  mixedEraContext: skewedNflMixedEraContext
});

assert.equal(skewedNflPool.draftPool.length, 416);
assert.ok(countRosterPlayersByPosition(skewedNflPool.draftPool, 'QB') >= 32, 'skewed NFL draft pool should reserve 32 QBs');
assert.ok(countRosterPlayersByPosition(skewedNflPool.draftPool, 'RB') >= 64, 'skewed NFL draft pool should reserve 64 RBs');
assert.ok(countRosterPlayersByPosition(skewedNflPool.draftPool, 'WR') >= 64, 'skewed NFL draft pool should reserve 64 WRs');
assert.ok(countRosterPlayersByPosition(skewedNflPool.draftPool, 'TE') >= 32, 'skewed NFL draft pool should reserve 32 TEs');
assert.ok(countRosterPlayersByPosition(skewedNflPool.draftPool, 'EDGE') >= 32, 'skewed NFL draft pool should reserve 32 EDGEs');
assert.ok(countRosterPlayersByPosition(skewedNflPool.draftPool, 'LB') >= 32, 'skewed NFL draft pool should reserve 32 LBs');
assert.ok(countRosterPlayersByPosition(skewedNflPool.draftPool, 'CB') >= 32, 'skewed NFL draft pool should reserve 32 CBs');
assert.ok(countRosterPlayersByPosition(skewedNflPool.draftPool, 'S') >= 32, 'skewed NFL draft pool should reserve 32 Ss');
assert.ok(countRosterPlayersByPosition(skewedNflPool.draftPool, 'K') >= 32, 'skewed NFL draft pool should reserve 32 Ks');
assert.ok(countRosterPlayersByPosition(skewedNflPool.draftPool, 'DST') >= 32, 'skewed NFL draft pool should reserve 32 DST units');
assert.ok(
  skewedNflPool.draftPool.filter((player) => ['RB', 'WR', 'TE', 'FLEX'].includes(player.pos)).length >= 192,
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
  mixedEraContext: realNflMixedEraContext,
  controlledTeamAbbr: 'GB'
});

const gbRoster = nflAutoDraftState.draftState.rostersByTeam.GB || [];

assert.equal(gbRoster.length, 13);
assertNflRosterCoverage(gbRoster, 'GB real 2014 NFL roster');
assert.ok(
  Object.values(nflAutoDraftState.draftState.rostersByTeam).every((roster) => Array.isArray(roster) && roster.length === 13),
  'every NFL team roster should contain 13 drafted players'
);
Object.entries(nflAutoDraftState.draftState.rostersByTeam).forEach(([teamAbbr, roster]) => {
  assertNflRosterCoverage(roster, `${teamAbbr} real 2014 NFL roster`);
});
assert.equal(
  new Set(Object.values(nflAutoDraftState.draftState.rostersByTeam).flat().map((player) => player.id)).size,
  416,
  'real 2014 NFL auto-draft should use the full one-pack player pool exactly once'
);
assert.equal(nflAutoDraftState.draftState.freeAgents.length, 0, 'real 2014 NFL auto-draft should leave no free agents when only the exact shell is available');

const suggestedNflLineup = buildSuggestedSimulationLineup(nflAutoDraftState, 'GB');
assert.deepStrictEqual(
  suggestedNflLineup,
  {
    QB: 2014053,
    RB1: 2014314,
    RB2: 2014289,
    WR1: 2014368,
    WR2: 2014226,
    TE: 2014046,
    FLEX: 2014292,
    K: 2014229,
    DST: 2014022
  }
);

const suggestedNflLineupState = setSimulationLineup(nflAutoDraftState, 'GB', suggestedNflLineup);
assert.deepStrictEqual(
  validateSimulationLineup(suggestedNflLineupState, 'GB'),
  { valid: true, issues: [] }
);

const invalidNflLineupState = setSimulationLineup(
  {
    leagueShell: nflShell,
    draftState: {
      rostersByTeam: {
        GB: [
          { id: 1, name: 'Aaron Rodgers', pos: 'QB', designation: 'ACTIVE' },
          { id: 2, name: 'Eddie Lacy', pos: 'RB', designation: 'ACTIVE' },
          { id: 3, name: 'James Starks', pos: 'RB', designation: 'ACTIVE' },
          { id: 4, name: 'Jordy Nelson', pos: 'WR', designation: 'ACTIVE' },
          { id: 5, name: 'Randall Cobb', pos: 'WR', designation: 'ACTIVE' },
          { id: 6, name: 'Andrew Quarless', pos: 'TE', designation: 'OUT' },
          { id: 7, name: 'Mason Crosby', pos: 'K', designation: 'ACTIVE' },
          { id: 8, name: 'Green Bay Packers DST', pos: 'DST', designation: 'ACTIVE' }
        ]
      }
    },
    seasonState: {}
  },
  'GB',
  {
    QB: 1,
    RB1: 2,
    RB2: 3,
    WR1: 4,
    WR2: 5,
    TE: 6,
    FLEX: 5,
    K: 7,
    DST: 8
  }
);

assert.deepStrictEqual(
  validateSimulationLineup(invalidNflLineupState, 'GB'),
  {
    valid: false,
    issues: [
      { slot: 'TE', code: 'player_out', message: 'TE starter is OUT.' },
      { slot: 'FLEX', code: 'duplicate_player', message: 'Randall Cobb is already assigned to another slot.' }
    ]
  }
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
