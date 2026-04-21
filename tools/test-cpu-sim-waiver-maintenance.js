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

const getMissingStarterSlotsForTeamSource = extractFunctionSource('getMissingStarterSlotsForTeam');
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
    CURRENT_SPORT: 'nba',
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
    canPlayerFillSlot(player, slot) {
      const pos = String(player?.pos || '').toUpperCase();
      const target = String(slot || '').toUpperCase();
      if (pos === target) return true;
      if (target === 'G') return pos === 'PG' || pos === 'SG';
      if (target === 'F') return pos === 'SF' || pos === 'PF';
      if (target === 'UTIL') return ['PG', 'SG', 'SF', 'PF', 'C'].includes(pos);
      return false;
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

{
  const { context, claimCalls } = buildContext({
    starterIds: [1, null, 3, 4, 5],
    roster: [
      makePlayer(1, 'Starter PG', 'PG', 50),
      makePlayer(3, 'Starter SF', 'SF', 48),
      makePlayer(4, 'Starter PF', 'PF', 47),
      makePlayer(5, 'Starter C', 'C', 52)
    ],
    waiver: [
      makePlayer(200, 'Playable SG', 'SG', 35),
      makePlayer(201, 'No-Game SG', 'SG', 44)
    ],
    gamesToday: [200]
  });
  context.fillCpuTeamStarterNeedsFromWaivers(1, { day: 3 });
  assert.equal(claimCalls[0].addId, 200);
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
