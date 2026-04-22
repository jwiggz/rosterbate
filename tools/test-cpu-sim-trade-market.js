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

const isCpuTradeSimulationUniverseSource = extractFunctionSource('isCpuTradeSimulationUniverse');
const shouldRunCpuTradeMarketForDaySource = extractFunctionSource('shouldRunCpuTradeMarketForDay');
const getCpuTradeProtectedPlayerIdsSource = extractFunctionSource('getCpuTradeProtectedPlayerIds');
const getCpuTradeOutgoingCandidatesSource = extractFunctionSource('getCpuTradeOutgoingCandidates');
const getCpuTradeIncomingFitScoreSource = extractFunctionSource('getCpuTradeIncomingFitScore');
const buildCpuTradeProposalForPairSource = extractFunctionSource('buildCpuTradeProposalForPair');
const executeCpuTradeProposalSource = extractFunctionSource('executeCpuTradeProposal');
const runCpuTradeMarketForDaySource = extractFunctionSource('runCpuTradeMarketForDay');
const maintainCpuLeagueRostersSource = extractFunctionSource('maintainCpuLeagueRosters');

function makePlayer(id, name, pos, fp, extra = {}) {
  return {
    id,
    name,
    pos,
    fp,
    team: extra.team || 'SIM',
    simProfile: extra.simProfile || null,
    ...extra
  };
}

function makeShape({ scoring = 0, playmaking = 0, rebounding = 0, defense = 0 }) {
  return {
    baseline: {
      pts: scoring,
      ast: playmaking,
      reb: rebounding,
      stl: defense / 2,
      blk: defense / 2
    },
    ratings: {
      scoring: scoring * 4,
      playmaking: playmaking * 12,
      rebounding: rebounding * 8,
      defense: defense * 24,
      overall: 70
    }
  };
}

function buildContext(options = {}) {
  const activityCalls = [];
  const lineupCalls = [];
  const rosters = options.rosters || [[], [], [], []];
  const starters = options.starters || [[], [], [], []];
  const tradeNeedByTeam = options.tradeNeedByTeam || {};
  const context = {
    CURRENT_SPORT: options.currentSport || 'nba',
    D: {
      myPos: 0,
      multiplayer: false,
      historicalEntryMode: options.entryMode || 'simulation_season',
      teams: options.teams || ['User Team', 'CPU Team 1', 'CPU Team 2', 'CPU Team 3']
    },
    G: {
      day: options.day || 3,
      rosters: rosters.map(team => team.map(player => ({ ...player }))),
      starters: starters.map(team => team.slice()),
      activityLog: [],
      tradeOffers: []
    },
    Number,
    Math,
    String,
    Array,
    Object,
    Set,
    console,
    isCpuManagedTeam(teamIdx) {
      if (typeof options.cpuManagedTeam === 'number') return teamIdx === options.cpuManagedTeam;
      return teamIdx !== 0;
    },
    isHistoricalSimulationUniverse(state) {
      return String(state?.historicalEntryMode || '').trim().toLowerCase() === 'simulation_season';
    },
    weekForDay() {
      return 1;
    },
    teamName(teamIdx) {
      return context.D.teams[teamIdx] || `Team ${teamIdx + 1}`;
    },
    getStarterIdsForTeamDay(teamIdx) {
      return (context.G.starters[teamIdx] || []).slice();
    },
    normalizeCpuTeamLineups(teamIdx) {
      lineupCalls.push(teamIdx);
    },
    logActivity(type, title, text, teamIdx, icon) {
      activityCalls.push({ type, title, text, teamIdx, icon });
      context.G.activityLog.unshift({ type, title, text, teamIdx, icon, ts: Date.now() });
    },
    maintainCpuTeamRoster() {
      return options.maintainCpuTeamRosterResult || {
        changed: false,
        movedToIl: 0,
        activated: 0,
        waiverAdds: 0,
        waiverDrops: 0
      };
    },
    getCpuWaiverPlayerSlots(player) {
      const pos = String(player?.pos || '').toUpperCase().trim();
      const slots = new Set(pos ? [pos] : []);
      if (context.CURRENT_SPORT === 'nba') {
        if (pos === 'PG' || pos === 'SG') slots.add('G');
        if (pos === 'SF' || pos === 'PF') slots.add('F');
        if (['PG', 'SG', 'SF', 'PF', 'C'].includes(pos)) slots.add('UTIL');
      }
      return [...slots];
    },
    getCpuWaiverRoleShape(player) {
      const baseline = player?.simProfile?.baseline || player || {};
      const ratings = player?.simProfile?.ratings || {};
      const pickNumber = (...values) => {
        for (const value of values) {
          const num = Number(value);
          if (Number.isFinite(num) && num > 0) return num;
        }
        return 0;
      };
      const normalizeRating = (value, maxValue) => {
        const num = Number(value);
        if (!Number.isFinite(num) || num <= 0) return 0;
        const scaleMax = Math.max(1, Number(maxValue) || 1);
        return (num / 100) * scaleMax;
      };
      return {
        scoring: pickNumber(
          baseline?.pts,
          baseline?.points,
          normalizeRating(ratings?.scoring, 26),
          normalizeRating(ratings?.shotCreation, 24),
          normalizeRating(ratings?.shooting, 22),
          normalizeRating(ratings?.offense, 24)
        ),
        playmaking: pickNumber(
          baseline?.ast,
          baseline?.assists,
          normalizeRating(ratings?.playmaking, 9),
          normalizeRating(ratings?.passing, 8),
          normalizeRating(ratings?.ballHandling, 7)
        ),
        rebounding: pickNumber(
          baseline?.reb,
          baseline?.rebounds,
          normalizeRating(ratings?.rebounding, 12)
        ),
        defense: pickNumber(
          Number(baseline?.stl || baseline?.steals || 0) + Number(baseline?.blk || baseline?.blocks || 0),
          normalizeRating(ratings?.defense, 3.2),
          normalizeRating(ratings?.perimeterDefense, 2.4),
          normalizeRating(ratings?.interiorDefense, 2.8)
        )
      };
    },
    buildCpuWaiverRosterNeedSummary(teamIdx) {
      return tradeNeedByTeam[teamIdx] || {
        positionNeed: { G: 0, F: 0, C: 0 },
        roleNeed: { scoring: 0, playmaking: 0, rebounding: 0, defense: 0 }
      };
    },
    getCpuWaiverVersatilityBonus(player) {
      if (context.CURRENT_SPORT !== 'nba') return 0;
      const slotCount = context.getCpuWaiverPlayerSlots(player).length;
      return Math.max(0, slotCount - 1) * 4;
    },
    getCpuWaiverRoleNeedBonus(player, rosterNeed) {
      if (context.CURRENT_SPORT !== 'nba') return 0;
      const roleNeed = rosterNeed?.roleNeed || {};
      const shape = context.getCpuWaiverRoleShape(player);
      let bonus = 0;
      if (shape.scoring >= 16) bonus += Number(roleNeed.scoring || 0) * 4;
      if (shape.playmaking >= 5) bonus += Number(roleNeed.playmaking || 0) * 8;
      if (shape.rebounding >= 7) bonus += Number(roleNeed.rebounding || 0) * 5;
      if (shape.defense >= 1.8) bonus += Number(roleNeed.defense || 0) * 4;
      return bonus;
    },
    getCpuWaiverPositionNeedBonus(player, rosterNeed, targetSlot) {
      if (context.CURRENT_SPORT !== 'nba') return 0;
      const slots = context.getCpuWaiverPlayerSlots(player);
      const target = String(targetSlot || '').toUpperCase();
      const positionNeed = rosterNeed?.positionNeed || {};
      let bonus = 0;
      if (target && slots.includes(target)) bonus += 8;
      if (slots.includes('G')) {
        bonus += Number(positionNeed.G || 0) * (target === 'PG' || target === 'SG' || target === 'G' ? 10 : 7);
      }
      if (slots.includes('F')) {
        bonus += Number(positionNeed.F || 0) * (target === 'SF' || target === 'PF' || target === 'F' ? 10 : 7);
      }
      if (slots.includes('C')) {
        bonus += Number(positionNeed.C || 0) * (target === 'C' ? 12 : 9);
      }
      return bonus;
    },
    getCpuWaiverDropProtectionBonus(player, rosterNeed) {
      if (context.CURRENT_SPORT !== 'nba') return 0;
      const positionProtection = context.getCpuWaiverPositionNeedBonus(player, rosterNeed, null) * 2;
      const roleProtection = context.getCpuWaiverRoleNeedBonus(player, rosterNeed) * 1.5;
      const valueProtection = Number(player?.fp || 0) * 0.9;
      return positionProtection + roleProtection + context.getCpuWaiverVersatilityBonus(player) + valueProtection;
    },
    getCpuTradeProtectedPlayerIds() {
      return new Set();
    }
  };

  vm.runInNewContext(
    [
      isCpuTradeSimulationUniverseSource,
      shouldRunCpuTradeMarketForDaySource,
      getCpuTradeProtectedPlayerIdsSource,
      getCpuTradeOutgoingCandidatesSource,
      getCpuTradeIncomingFitScoreSource,
      buildCpuTradeProposalForPairSource,
      executeCpuTradeProposalSource,
      runCpuTradeMarketForDaySource,
      maintainCpuLeagueRostersSource
    ].join('\n'),
    context
  );

  return { context, activityCalls, lineupCalls };
}

{
  const { context, activityCalls, lineupCalls } = buildContext({
    day: 3,
    rosters: [
      [],
      [
        makePlayer(201, 'Star Big', 'C', 45, {
          protectionScore: 240,
          simProfile: makeShape({ scoring: 22, rebounding: 12, defense: 3 })
        }),
        makePlayer(202, 'Bench Big', 'C', 27, {
          protectionScore: 60,
          simProfile: makeShape({ scoring: 12, rebounding: 10, defense: 2 })
        }),
        makePlayer(203, 'Wing Stopper', 'SF', 24, {
          protectionScore: 120,
          simProfile: makeShape({ scoring: 10, defense: 3 })
        })
      ],
      [
        makePlayer(301, 'Star Guard', 'PG', 44, {
          protectionScore: 235,
          simProfile: makeShape({ scoring: 23, playmaking: 9, defense: 2 })
        }),
        makePlayer(302, 'Bench Creator', 'PG', 28, {
          protectionScore: 70,
          simProfile: makeShape({ scoring: 14, playmaking: 8, defense: 1 })
        }),
        makePlayer(303, 'Stretch Four', 'PF', 24, {
          protectionScore: 110,
          simProfile: makeShape({ scoring: 12, rebounding: 6 })
        })
      ],
      [
        makePlayer(401, 'Quiet Wing', 'SF', 18, {
          simProfile: makeShape({ scoring: 11, defense: 1 })
        })
      ]
    ],
    starters: [
      [],
      [201, 203],
      [301, 303],
      [401]
    ],
    tradeNeedByTeam: {
      1: {
        positionNeed: { G: 2, F: 0, C: 0 },
        roleNeed: { scoring: 0, playmaking: 2, rebounding: 0, defense: 0 }
      },
      2: {
        positionNeed: { G: 0, F: 0, C: 2 },
        roleNeed: { scoring: 0, playmaking: 0, rebounding: 2, defense: 0 }
      },
      3: {
        positionNeed: { G: 0, F: 0, C: 0 },
        roleNeed: { scoring: 0, playmaking: 0, rebounding: 0, defense: 0 }
      }
    }
  });

  assert.equal(context.isCpuTradeSimulationUniverse(), true);
  assert.equal(context.shouldRunCpuTradeMarketForDay(2), false);
  assert.equal(context.shouldRunCpuTradeMarketForDay(3), true);

  const protectedIds = context.getCpuTradeProtectedPlayerIds(1, 3, context.buildCpuWaiverRosterNeedSummary(1, 3));
  assert.equal(typeof protectedIds?.has, 'function');

  const tradeResult = context.runCpuTradeMarketForDay(3);
  assert.equal(tradeResult.tradesCompleted, 1);
  assert.ok(context.G.rosters[1].some(player => Number(player.id) === 302));
  assert.ok(context.G.rosters[2].some(player => Number(player.id) === 202));
  assert.ok(context.G.rosters[1].some(player => Number(player.id) === 201));
  assert.ok(context.G.rosters[2].some(player => Number(player.id) === 301));
  assert.equal(activityCalls.filter(entry => entry.type === 'trade').length, 1);
  assert.ok(lineupCalls.includes(1) && lineupCalls.includes(2));
}

{
  const { context, activityCalls, lineupCalls } = buildContext({
    day: 2,
    rosters: [
      [],
      [
        makePlayer(201, 'Star Big', 'C', 45, {
          protectionScore: 240,
          simProfile: makeShape({ scoring: 22, rebounding: 12, defense: 3 })
        }),
        makePlayer(202, 'Bench Big', 'C', 27, {
          protectionScore: 60,
          simProfile: makeShape({ scoring: 12, rebounding: 10, defense: 2 })
        })
      ],
      [
        makePlayer(301, 'Star Guard', 'PG', 44, {
          protectionScore: 235,
          simProfile: makeShape({ scoring: 23, playmaking: 9, defense: 2 })
        }),
        makePlayer(302, 'Bench Creator', 'PG', 28, {
          protectionScore: 70,
          simProfile: makeShape({ scoring: 14, playmaking: 8, defense: 1 })
        })
      ],
      []
    ],
    starters: [
      [],
      [201],
      [301],
      []
    ],
    tradeNeedByTeam: {
      1: {
        positionNeed: { G: 2, F: 0, C: 0 },
        roleNeed: { scoring: 0, playmaking: 2, rebounding: 0, defense: 0 }
      },
      2: {
        positionNeed: { G: 0, F: 0, C: 2 },
        roleNeed: { scoring: 0, playmaking: 0, rebounding: 2, defense: 0 }
      }
    }
  });

  const offCadenceResult = context.runCpuTradeMarketForDay(2);
  assert.equal(offCadenceResult.changed, false);
  assert.equal(offCadenceResult.tradesCompleted, 0);
  assert.equal(activityCalls.length, 0);
  assert.equal(lineupCalls.length, 0);
}

{
  const { context, activityCalls } = buildContext({
    day: 3,
    rosters: [
      [],
      [
        makePlayer(201, 'Star Big', 'C', 45, {
          protectionScore: 240,
          simProfile: makeShape({ scoring: 22, rebounding: 12, defense: 3 })
        }),
        makePlayer(202, 'Bench Big', 'C', 27, {
          protectionScore: 60,
          simProfile: makeShape({ scoring: 12, rebounding: 10, defense: 2 })
        })
      ],
      [
        makePlayer(301, 'Star Guard', 'PG', 44, {
          protectionScore: 235,
          simProfile: makeShape({ scoring: 23, playmaking: 9, defense: 2 })
        }),
        makePlayer(302, 'Bench Creator', 'PG', 28, {
          protectionScore: 70,
          simProfile: makeShape({ scoring: 14, playmaking: 8, defense: 1 })
        })
      ],
      []
    ],
    starters: [
      [],
      [201],
      [301],
      []
    ],
    tradeNeedByTeam: {
      1: {
        positionNeed: { G: 2, F: 0, C: 0 },
        roleNeed: { scoring: 0, playmaking: 2, rebounding: 0, defense: 0 }
      },
      2: {
        positionNeed: { G: 0, F: 0, C: 2 },
        roleNeed: { scoring: 0, playmaking: 0, rebounding: 2, defense: 0 }
      }
    }
  });

  const maintenanceResult = context.maintainCpuLeagueRosters({ day: 3 });
  assert.equal(maintenanceResult.tradesCompleted, 1);
  assert.match(activityCalls[0].title, /CPU trade completed/i);
}

console.log('cpu sim trade market test passed');
