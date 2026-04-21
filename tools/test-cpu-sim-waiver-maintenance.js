const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'rosterbate-season.html'),
  'utf8'
);

function findMatchingBrace(source, openBraceIndex) {
  let depth = 0;
  let stringQuote = '';
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = openBraceIndex; index < source.length; index++) {
    const char = source[index];
    const nextChar = source[index + 1];

    if (inLineComment) {
      if (char === '\n') inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && nextChar === '/') {
        inBlockComment = false;
        index++;
      }
      continue;
    }

    if (stringQuote) {
      if (char === '\\') {
        index++;
        continue;
      }
      if (char === stringQuote) {
        stringQuote = '';
      }
      continue;
    }

    if (char === '/' && nextChar === '/') {
      inLineComment = true;
      index++;
      continue;
    }

    if (char === '/' && nextChar === '*') {
      inBlockComment = true;
      index++;
      continue;
    }

    if (char === '\'' || char === '"' || char === '`') {
      stringQuote = char;
      continue;
    }

    if (char === '{') {
      depth++;
      continue;
    }

    if (char === '}') {
      depth--;
      if (depth === 0) return index;
    }
  }

  throw new Error(`missing closing brace near index ${openBraceIndex}`);
}

function extractFunctionSource(name, { optional = false } = {}) {
  const startPattern = new RegExp(`function\\s+${name}\\b`);
  const startMatch = startPattern.exec(html);
  if (!startMatch) {
    if (optional) return null;
    assert.fail(`missing ${name}`);
  }
  const start = startMatch.index;
  const openBrace = html.indexOf('{', start);
  assert.ok(openBrace >= 0, `missing body for ${name}`);
  const end = findMatchingBrace(html, openBrace);
  return html.slice(start, end + 1);
}

function tryExtractFunctionSource(name) {
  try {
    return extractFunctionSource(name);
  } catch (error) {
    if (String(error?.message || '').includes(`missing ${name}`)) return null;
    throw error;
  }
}

const getMissingStarterSlotsForTeamSource = extractFunctionSource('getMissingStarterSlotsForTeam');
const canPlayerFillSlotSource = extractFunctionSource('canPlayerFillSlot');
const getCpuWaiverPlayerSlotsSource = tryExtractFunctionSource('getCpuWaiverPlayerSlots');
const getCpuWaiverRoleShapeSource = tryExtractFunctionSource('getCpuWaiverRoleShape');
const buildCpuWaiverRosterNeedSummarySource = tryExtractFunctionSource('buildCpuWaiverRosterNeedSummary');
const getCpuWaiverVersatilityBonusSource = tryExtractFunctionSource('getCpuWaiverVersatilityBonus');
const getCpuWaiverRoleNeedBonusSource = tryExtractFunctionSource('getCpuWaiverRoleNeedBonus');
const getCpuWaiverPositionNeedBonusSource = tryExtractFunctionSource('getCpuWaiverPositionNeedBonus');
const getCpuWaiverDropProtectionBonusSource = tryExtractFunctionSource('getCpuWaiverDropProtectionBonus');
const getCpuWaiverStarterFillScoreSource = extractFunctionSource('getCpuWaiverStarterFillScore');
const getCpuWaiverCleanupAddScoreSource = extractFunctionSource('getCpuWaiverCleanupAddScore');
const getCpuWaiverCleanupDropScoreSource = extractFunctionSource('getCpuWaiverCleanupDropScore');
const isCpuDeadRosterSpotCandidateSource = extractFunctionSource('isCpuDeadRosterSpotCandidate');
const getBestCpuWaiverCandidateForSlotSource = extractFunctionSource('getBestCpuWaiverCandidateForSlot');
const getCpuWaiverDropCandidateSource = extractFunctionSource('getCpuWaiverDropCandidate');
const fillCpuTeamStarterNeedsFromWaiversSource = extractFunctionSource('fillCpuTeamStarterNeedsFromWaivers');
const cleanupCpuDeadRosterSpotsFromWaiversSource = extractFunctionSource(
  'cleanupCpuDeadRosterSpotsFromWaivers',
  { optional: true }
);

function makePlayer(id, name, pos, fp, extra = {}) {
  return {
    id,
    name,
    pos,
    fp,
    team: extra.team || 'SIM',
    ...extra
  };
}

function buildContext(options = {}) {
  const claimCalls = [];
  const injuries = new Map(options.injuries || []);
  const gamesToday = new Set(options.gamesToday || []);
  const starterIds = options.starterIds || [];
  const context = {
    STARTERS: 5,
    SLOT_LABELS: ['PG', 'SG', 'SF', 'PF', 'C'],
    CURRENT_SPORT: options.currentSport || 'nba',
    D: {
      myPos: 0,
      multiplayer: false,
      historicalEntryMode: options.entryMode || 'simulation_season'
    },
    G: {
      day: options.day || 3,
      rosters: [
        [],
        (options.roster || []).map(player => ({ ...player }))
      ],
      waiver: (options.waiver || []).map(player => ({ ...player })),
      ilByTeam: [[], []]
    },
    Number,
    Math,
    String,
    Array,
    Object,
    console,
    isCpuManagedTeam(teamIdx) {
      if (typeof options.cpuManagedTeam === 'number') return teamIdx === options.cpuManagedTeam;
      return teamIdx === 1;
    },
    isHistoricalSimulationUniverse(state) {
      return String(state?.historicalEntryMode || '').trim().toLowerCase() === 'simulation_season';
    },
    weekForDay() {
      return 1;
    },
    getIlSlotCount() {
      return 1;
    },
    getIlRoster(teamIdx) {
      return context.G.ilByTeam[teamIdx] || [];
    },
    getActiveRosterCapacity() {
      return options.activeCapacity ?? 8;
    },
    hasOpenTotalRosterSlot(teamIdx) {
      const limit = options.totalRosterLimit ?? 8;
      return (context.G.rosters[teamIdx] || []).length < limit;
    },
    getStarterIdsForTeamDay() {
      return starterIds.slice();
    },
    normalizeCpuTeamLineups(teamIdx) {
      void teamIdx;
    },
    claimWaiverPlayerForTeam(teamIdx, playerToAdd, droppedPlayer) {
      claimCalls.push({
        teamIdx,
        addId: Number(playerToAdd?.id),
        dropId: droppedPlayer ? Number(droppedPlayer.id) : null
      });
      const roster = context.G.rosters[teamIdx] || [];
      if (droppedPlayer) {
        const dropIndex = roster.findIndex(player => Number(player?.id) === Number(droppedPlayer?.id));
        if (dropIndex >= 0) roster.splice(dropIndex, 1);
      }
      roster.push({ ...playerToAdd });
      context.G.waiver = context.G.waiver.filter(player => Number(player.id) !== Number(playerToAdd.id));
      return true;
    },
    getInjuryStatus(player) {
      return injuries.get(Number(player?.id)) || null;
    },
    isUnavailableInjury(injury) {
      return ['OUT', 'IR', 'IL', 'SUSP'].includes(String(injury?.label || '').toUpperCase());
    },
    getGameInfo(player) {
      return gamesToday.has(Number(player?.id)) ? { opponent: 'SIM' } : null;
    },
    slotPriority(slot) {
      return ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL'].indexOf(String(slot || '').toUpperCase());
    },
    getCpuIlMaintenanceValue(player) {
      return Number(player?.fp || 0);
    }
  };

  vm.runInNewContext(
    [
      getMissingStarterSlotsForTeamSource,
      canPlayerFillSlotSource,
      getCpuWaiverPlayerSlotsSource,
      getCpuWaiverRoleShapeSource,
      buildCpuWaiverRosterNeedSummarySource,
      getCpuWaiverVersatilityBonusSource,
      getCpuWaiverRoleNeedBonusSource,
      getCpuWaiverPositionNeedBonusSource,
      getCpuWaiverDropProtectionBonusSource,
      getCpuWaiverStarterFillScoreSource,
      getCpuWaiverCleanupAddScoreSource,
      getCpuWaiverCleanupDropScoreSource,
      isCpuDeadRosterSpotCandidateSource,
      getBestCpuWaiverCandidateForSlotSource,
      getCpuWaiverDropCandidateSource,
      fillCpuTeamStarterNeedsFromWaiversSource,
      cleanupCpuDeadRosterSpotsFromWaiversSource
    ].filter(Boolean).join('\n'),
    context
  );

  return { context, claimCalls };
}

function buildSeamContext(options = {}) {
  assert.ok(getCpuWaiverPlayerSlotsSource, 'missing getCpuWaiverPlayerSlots');
  assert.ok(getCpuWaiverRoleShapeSource, 'missing getCpuWaiverRoleShape');
  assert.ok(buildCpuWaiverRosterNeedSummarySource, 'missing buildCpuWaiverRosterNeedSummary');
  assert.ok(getCpuWaiverVersatilityBonusSource, 'missing getCpuWaiverVersatilityBonus');
  assert.ok(getCpuWaiverRoleNeedBonusSource, 'missing getCpuWaiverRoleNeedBonus');
  assert.ok(getCpuWaiverPositionNeedBonusSource, 'missing getCpuWaiverPositionNeedBonus');
  assert.ok(getCpuWaiverDropProtectionBonusSource, 'missing getCpuWaiverDropProtectionBonus');
  return buildContext(options);
}

{
  const { context } = buildSeamContext();
  const versatileBig = makePlayer(999, 'Versatile Big', 'PF/C', 24);
  assert.equal(context.canPlayerFillSlot(versatileBig, 'PF'), true);
  assert.equal(context.canPlayerFillSlot(versatileBig, 'C'), true);
  assert.equal(context.canPlayerFillSlot(versatileBig, 'F'), true);
  assert.equal(context.canPlayerFillSlot(versatileBig, 'UTIL'), true);
}

{
  const { context, claimCalls } = buildContext({
    entryMode: 'historical_reimagined',
    starterIds: [1, null, 3, 4, 5],
    roster: [
      makePlayer(1, 'Starter PG', 'PG', 50, { ast: 2 }),
      makePlayer(3, 'Starter SF', 'SF', 48, { pts: 16 }),
      makePlayer(4, 'Starter PF', 'PF', 47, { reb: 8 }),
      makePlayer(5, 'Starter C', 'C', 52, { reb: 10 })
    ],
    waiver: [
      makePlayer(200, 'Scoring SG', 'SG', 26, { pts: 24 }),
      makePlayer(201, 'Playmaking SG', 'SG', 20, { ast: 7 })
    ],
    gamesToday: [200, 201]
  });
  context.fillCpuTeamStarterNeedsFromWaivers(1, { day: 3 });
  assert.equal(claimCalls[0].addId, 200);
}

{
  const { context, claimCalls } = buildContext({
    entryMode: 'simulation_season',
    starterIds: [1, null, 3, 4, 5],
    roster: [
      makePlayer(1, 'Starter PG', 'PG', 50, { ast: 2 }),
      makePlayer(3, 'Starter SF', 'SF', 48, { pts: 16 }),
      makePlayer(4, 'Starter PF', 'PF', 47, { reb: 8 }),
      makePlayer(5, 'Starter C', 'C', 52, { reb: 10 })
    ],
    waiver: [
      makePlayer(200, 'Scoring SG', 'SG', 26, { pts: 24 }),
      makePlayer(201, 'Playmaking SG', 'SG', 20, { ast: 7 })
    ],
    gamesToday: [200, 201]
  });
  context.fillCpuTeamStarterNeedsFromWaivers(1, { day: 3 });
  assert.equal(claimCalls[0].addId, 201);
}

{
  const { context, claimCalls } = buildContext({
    roster: [
      makePlayer(101, 'Starter PG', 'PG', 52),
      makePlayer(102, 'Starter SG', 'SG', 50),
      makePlayer(103, 'Starter SF', 'SF', 48),
      makePlayer(104, 'Starter PF', 'PF', 47),
      makePlayer(105, 'Starter C', 'C', 51),
      makePlayer(106, 'Dead Bench OUT', 'SG', 8)
    ],
    waiver: [
      makePlayer(210, 'Live Upgrade', 'SG', 28),
      makePlayer(211, 'Low Waiver', 'SG', 9)
    ],
    injuries: [[106, { label: 'OUT' }]],
    gamesToday: [210],
    totalRosterLimit: 6,
    starterIds: [101, 102, 103, 104, 105]
  });
  const result = context.cleanupCpuDeadRosterSpotsFromWaivers(1, { day: 3 });
  assert.equal(result.adds, 1);
  assert.equal(result.drops, 1);
  assert.deepStrictEqual(claimCalls[0], { teamIdx: 1, addId: 210, dropId: 106 });
}

{
  const { context, claimCalls } = buildContext({
    roster: [
      makePlayer(201, 'Starter PG', 'PG', 50),
      makePlayer(202, 'Starter SG', 'SG', 49),
      makePlayer(203, 'Starter SF', 'SF', 48),
      makePlayer(204, 'Starter PF', 'PF', 47),
      makePlayer(205, 'Starter C', 'C', 51),
      makePlayer(206, 'GTD Bench', 'SG', 12)
    ],
    waiver: [makePlayer(220, 'Healthy SG', 'SG', 24)],
    injuries: [[206, { label: 'GTD' }]],
    gamesToday: [220],
    totalRosterLimit: 6,
    starterIds: [201, 202, 203, 204, 205]
  });
  const result = context.cleanupCpuDeadRosterSpotsFromWaivers(1, { day: 3 });
  assert.equal(result.adds, 0);
  assert.equal(claimCalls.length, 0);
}

{
  const { context, claimCalls } = buildContext({
    roster: [
      makePlayer(301, 'Starter PG', 'PG', 50),
      makePlayer(302, 'Starter SG', 'SG', 49),
      makePlayer(303, 'Starter SF', 'SF', 48),
      makePlayer(304, 'Starter PF', 'PF', 47),
      makePlayer(305, 'Starter C', 'C', 51),
      makePlayer(306, 'Healthy Bench', 'SG', 18)
    ],
    waiver: [makePlayer(230, 'Tiny Upgrade', 'SG', 19)],
    gamesToday: [230],
    totalRosterLimit: 6,
    starterIds: [301, 302, 303, 304, 305]
  });
  const result = context.cleanupCpuDeadRosterSpotsFromWaivers(1, { day: 3 });
  assert.equal(result.adds, 0);
  assert.equal(claimCalls.length, 0);
}

{
  const { context, claimCalls } = buildContext({
    roster: [
      makePlayer(351, 'Starter PG', 'PG', 50),
      makePlayer(352, 'Starter SG', 'SG', 49),
      makePlayer(353, 'Starter SF', 'SF', 48),
      makePlayer(354, 'Starter PF', 'PF', 47),
      makePlayer(355, 'Starter C', 'C', 51),
      makePlayer(356, 'Dead Bench OUT', 'SG', 8)
    ],
    waiver: [makePlayer(235, 'Speculative GTD Waiver', 'SG', 35)],
    injuries: [
      [235, { label: 'GTD' }],
      [356, { label: 'OUT' }]
    ],
    gamesToday: [235],
    totalRosterLimit: 6,
    starterIds: [351, 352, 353, 354, 355]
  });
  const result = context.cleanupCpuDeadRosterSpotsFromWaivers(1, { day: 3 });
  assert.equal(result.adds, 0);
  assert.equal(claimCalls.length, 0);
}

{
  const { context, claimCalls } = buildContext({
    roster: [
      makePlayer(361, 'Starter PG', 'PG', 50),
      makePlayer(362, 'Starter SG', 'SG', 49),
      makePlayer(363, 'Starter SF', 'SF', 48),
      makePlayer(364, 'Starter PF', 'PF', 47),
      makePlayer(365, 'Starter C', 'C', 51),
      makePlayer(366, 'Valuable Bench OUT', 'SG', 39)
    ],
    waiver: [makePlayer(236, 'Junk Healthy Waiver', 'SG', 11)],
    injuries: [[366, { label: 'OUT' }]],
    gamesToday: [236],
    totalRosterLimit: 6,
    starterIds: [361, 362, 363, 364, 365]
  });
  const result = context.cleanupCpuDeadRosterSpotsFromWaivers(1, { day: 3 });
  assert.equal(result.adds, 0);
  assert.equal(claimCalls.length, 0);
}

{
  const { context, claimCalls } = buildContext({
    starterIds: [401, null, 403, 404, 405],
    roster: [
      makePlayer(401, 'Starter PG', 'PG', 52, { ast: 8, pts: 16 }),
      makePlayer(403, 'Starter SF', 'SF', 49, { pts: 17, reb: 5 }),
      makePlayer(404, 'Starter PF', 'PF', 48, { reb: 8, blk: 1 }),
      makePlayer(405, 'Starter C', 'C', 50, { reb: 10, blk: 2 }),
      makePlayer(406, 'Bench Wing', 'SF', 18, { pts: 11, reb: 4 })
    ],
    waiver: [
      makePlayer(240, 'Scoring SG', 'SG', 30, { pts: 22, ast: 2 }),
      makePlayer(241, 'Playmaking Combo Guard', 'SG', 28, { pts: 15, ast: 7 })
    ],
    gamesToday: [240, 241]
  });
  context.fillCpuTeamStarterNeedsFromWaivers(1, { day: 3 });
  assert.equal(claimCalls[0].addId, 241);
}

{
  const { context, claimCalls } = buildContext({
    roster: [
      makePlayer(501, 'Starter PG', 'PG', 52, { ast: 8, pts: 15 }),
      makePlayer(502, 'Starter SG', 'SG', 50, { ast: 5, pts: 18 }),
      makePlayer(503, 'Starter SF', 'SF', 47, { pts: 17, reb: 4 }),
      makePlayer(504, 'Starter PF', 'PF', 45, { reb: 6, blk: 1 }),
      makePlayer(505, 'Starter C', 'C', 42, { reb: 8, blk: 1 }),
      makePlayer(506, 'Dead Bench OUT', 'PF', 9, { reb: 4 })
    ],
    waiver: [
      makePlayer(250, 'Versatile Big', 'PF/C', 24, { reb: 9, blk: 1 }),
      makePlayer(251, 'Narrow Wing', 'SF', 25, { pts: 18, reb: 3 })
    ],
    injuries: [[506, { label: 'OUT' }]],
    gamesToday: [250, 251],
    totalRosterLimit: 6,
    starterIds: [501, 502, 503, 504, 505]
  });
  const result = context.cleanupCpuDeadRosterSpotsFromWaivers(1, { day: 3 });
  assert.equal(result.adds, 1);
  assert.equal(claimCalls[0].addId, 250);
}

{
  const { context, claimCalls } = buildSeamContext({
    roster: [
      makePlayer(601, 'Starter PG', 'PG', 52, { ast: 8, pts: 15 }),
      makePlayer(602, 'Starter SG', 'SG', 50, { ast: 5, pts: 18 }),
      makePlayer(603, 'Starter SF', 'SF', 48, { pts: 17, reb: 5 }),
      makePlayer(604, 'Starter PF', 'PF', 47, { reb: 7, blk: 1 }),
      makePlayer(605, 'Starter C', 'C', 51, { reb: 9, blk: 2 }),
      makePlayer(606, 'Bench Center Cover', 'C', 18, { reb: 8, blk: 1 }),
      makePlayer(607, 'Dead Bench OUT', 'SG', 8, { pts: 7 })
    ],
    waiver: [makePlayer(260, 'Decent Wing Add', 'SF', 24, { pts: 16, reb: 4 })],
    injuries: [[607, { label: 'OUT' }]],
    gamesToday: [260],
    totalRosterLimit: 7,
    starterIds: [601, 602, 603, 604, 605]
  });
  const dropCandidate = context.getCpuWaiverDropCandidate(1, 3, 'SF');
  assert.equal(Number(dropCandidate.id), 607);
  const result = context.cleanupCpuDeadRosterSpotsFromWaivers(1, { day: 3 });
  assert.equal(result.drops, 1);
  assert.equal(claimCalls[0].dropId, 607);
}

{
  const { context } = buildSeamContext({
    roster: [
      makePlayer(701, 'Starter PG', 'PG', 51, { ast: 9, pts: 14 }),
      makePlayer(702, 'Starter SG', 'SG', 49, { ast: 3, pts: 18 }),
      makePlayer(703, 'Starter SF', 'SF', 48, { pts: 17, reb: 5 }),
      makePlayer(704, 'Starter PF', 'PF', 47, { reb: 8, blk: 1 }),
      makePlayer(705, 'Starter C', 'C', 52, { reb: 10, blk: 2 }),
      makePlayer(706, 'Bench Playmaker', 'PG', 20, { ast: 7, pts: 10 }),
      makePlayer(707, 'Dead Bench OUT', 'SF', 7, { pts: 6 })
    ],
    waiver: [makePlayer(270, 'Okay Forward', 'SF', 22, { pts: 15, reb: 4 })],
    injuries: [[707, { label: 'OUT' }]],
    gamesToday: [270],
    totalRosterLimit: 7,
    starterIds: [701, 702, 703, 704, 705]
  });
  const rosterNeed = context.buildCpuWaiverRosterNeedSummary(1, 3);
  const protectedScore = context.getCpuWaiverCleanupDropScore(
    context.G.rosters[1].find(player => Number(player.id) === 706),
    3,
    rosterNeed
  );
  const deadScore = context.getCpuWaiverCleanupDropScore(
    context.G.rosters[1].find(player => Number(player.id) === 707),
    3,
    rosterNeed
  );
  assert.ok(protectedScore > deadScore);
}

{
  const { context } = buildSeamContext({
    currentSport: 'mlb',
    roster: [
      makePlayer(801, 'Starter Catcher', 'C', 20, { reb: 11, blk: 2 }),
      makePlayer(802, 'Bench Catcher', 'C', 12, { reb: 8, blk: 1 })
    ],
    starterIds: [801]
  });
  const rosterNeed = context.buildCpuWaiverRosterNeedSummary(1, 3);
  const catcher = context.G.rosters[1].find(player => Number(player.id) === 802);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(rosterNeed.positionNeed)), { G: 0, F: 0, C: 0 });
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(rosterNeed.roleNeed)),
    { scoring: 0, playmaking: 0, rebounding: 0, defense: 0 }
  );
  assert.equal(context.getCpuWaiverPositionNeedBonus(catcher, rosterNeed, 'C'), 0);
  assert.equal(context.getCpuWaiverRoleNeedBonus(catcher, rosterNeed), 0);
  assert.equal(context.getCpuWaiverVersatilityBonus(catcher), 0);
  assert.equal(context.getCpuWaiverDropProtectionBonus(catcher, rosterNeed), 0);
  assert.equal(context.getCpuWaiverCleanupDropScore(catcher, 3, rosterNeed), Number(catcher.fp || 0) - 40);
}

{
  const { context } = buildSeamContext({
    roster: [
      makePlayer(901, 'Starter PF/C', 'PF/C', 24),
      makePlayer(902, 'Bench SG', 'SG', 20)
    ],
    starterIds: [901, null, null, null, null]
  });
  const pfc = context.G.rosters[1].find(player => Number(player.id) === 901);
  const pfScore = context.getCpuWaiverStarterFillScore(pfc, 'PF', 3, null);
  const fScore = context.getCpuWaiverStarterFillScore(pfc, 'F', 3, null);
  const cScore = context.getCpuWaiverStarterFillScore(pfc, 'C', 3, null);
  assert.equal(pfScore - fScore, 24);
  assert.equal(cScore - fScore, 24);
}

{
  const { context, claimCalls } = buildContext({
    entryMode: 'historical_reimagined',
    roster: [
      makePlayer(401, 'Starter PG', 'PG', 50),
      makePlayer(402, 'Starter SG', 'SG', 49),
      makePlayer(403, 'Starter SF', 'SF', 48),
      makePlayer(404, 'Starter PF', 'PF', 47),
      makePlayer(405, 'Starter C', 'C', 51),
      makePlayer(406, 'Dead Bench OUT', 'SG', 8)
    ],
    waiver: [makePlayer(240, 'Live Upgrade', 'SG', 28)],
    injuries: [[406, { label: 'OUT' }]],
    gamesToday: [240],
    totalRosterLimit: 6,
    starterIds: [401, 402, 403, 404, 405]
  });
  const result = context.cleanupCpuDeadRosterSpotsFromWaivers(1, { day: 3 });
  assert.equal(result.adds, 0);
  assert.equal(claimCalls.length, 0);
}

{
  const { context, claimCalls } = buildContext({
    cpuManagedTeam: 99,
    roster: [
      makePlayer(501, 'Starter PG', 'PG', 50),
      makePlayer(502, 'Starter SG', 'SG', 49),
      makePlayer(503, 'Starter SF', 'SF', 48),
      makePlayer(504, 'Starter PF', 'PF', 47),
      makePlayer(505, 'Starter C', 'C', 51),
      makePlayer(506, 'Dead Bench OUT', 'SG', 8)
    ],
    waiver: [makePlayer(250, 'Live Upgrade', 'SG', 28)],
    injuries: [[506, { label: 'OUT' }]],
    gamesToday: [250],
    totalRosterLimit: 6,
    starterIds: [501, 502, 503, 504, 505]
  });
  const result = context.cleanupCpuDeadRosterSpotsFromWaivers(1, { day: 3 });
  assert.equal(result.adds, 0);
  assert.equal(claimCalls.length, 0);
}

console.log('cpu sim waiver maintenance test passed');
