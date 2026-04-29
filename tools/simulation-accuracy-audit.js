const fs = require('node:fs');
const path = require('node:path');

global.window = globalThis;

const { getSimulationShell } = require('../simulation-mode-config.js');
const {
  buildCompletedSimulationAutoDraftState,
  getSimulationStarterSlots
} = require('../simulation-mode-runtime.js');
const {
  buildSimulationSeasonSchedule,
  simulateSimulationGameDay,
  applySimulationDayResults,
  computeFantasyPoints
} = require('../simulation-league-engine.js');

const ROOT_DIR = path.join(__dirname, '..');
const PACKS_DIR = path.join(ROOT_DIR, 'historical-packs');

const AUDIT_CONFIG = Object.freeze({
  nba: {
    sport: 'nba',
    controlledTeamAbbr: 'LAL',
    trialCount: 3,
    seasonTrialCount: 2,
    maxDays: 14,
    sourcePackIds: [
      'nba_1987_full_season_v1',
      'nba_1993_full_season_v1',
      'nba_1996_full_season_v1',
      'nba_2001_full_season_v1',
      'nba_2016_full_season_v1'
    ],
    sourceSeasonLabels: ['1986-87', '1992-93', '1995-96', '2000-01', '2015-16'],
    teamTotalRange: [145, 235],
    renderedScoreRange: [100, 125],
    strengthWinRateFloor: 0.62,
    renderedTieRateCeiling: 0.05,
    zeroTeamTotalRateCeiling: 0.01,
    topStarShareMeanFloor: 0.26,
    seasonRealism: {
      playoffFieldStrengthEdgeFloor: 0.1,
      eliteMedianWinPctGapFloor: 0.08,
      bottomCollapseRateRange: [0.05, 0.55],
      standingsDeterminismRateCeiling: 0.92
    },
    nbaRoleShape: {
      topScorerPointShareMeanFloor: 0.27,
      assistLeaderAssistShareMeanFloor: 0.35,
      reboundLeaderReboundShareMeanFloor: 0.34,
      wingThreeMeanFloor: 0.7,
      defensiveAnchorEventMeanFloor: 3.1
    }
  },
  nfl: {
    sport: 'nfl',
    controlledTeamAbbr: 'DAL',
    trialCount: 4,
    seasonTrialCount: 2,
    maxDays: 10,
    sourcePackIds: ['nfl_2014_full_season_v1'],
    sourceSeasonLabels: ['2014'],
    teamTotalRange: [85, 165],
    renderedScoreRange: [18, 34],
    strengthWinRateFloor: 0.51,
    renderedTieRateCeiling: 0.02,
    zeroTeamTotalRateCeiling: 0.01,
    qbShareMeanCeiling: 0.24,
    seasonRealism: {
      playoffFieldStrengthEdgeFloor: 0.1,
      eliteMedianWinPctGapFloor: 0.08,
      bottomCollapseRateRange: [0, 0.4],
      standingsDeterminismRateCeiling: 0.92
    },
    nflPositionShape: {
      qbMeanCeiling: 30,
      rbShareMeanFloor: 0.1,
      rbFloorRateFloor: 0.9,
      wrStdevShouldExceedRb: true,
      qbPassingYardsRange: [210, 310],
      rbTouchMeanFloor: 13,
      wrYardsPerTouchShouldExceedRb: true
    }
  }
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function readPackPlayers(packId) {
  return JSON.parse(
    fs.readFileSync(path.join(PACKS_DIR, packId, 'players.json'), 'utf8')
  );
}

function buildNumericAuditId(packId, rawPlayer, index) {
  const directId = Number(rawPlayer?.id ?? rawPlayer?.playerId);
  if (Number.isFinite(directId) && directId > 0) {
    return directId;
  }
  const packSeed = Array.from(String(packId || '')).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return (packSeed * 100000) + index + 1;
}

function normalizeAuditPlayer(packId, rawPlayer, index) {
  if (Number.isFinite(Number(rawPlayer?.id)) && Number.isFinite(Number(rawPlayer?.fp))) {
    return {
      ...rawPlayer,
      id: Number(rawPlayer.id),
      fp: Number(rawPlayer.fp),
      mixedEraOverall: Number(rawPlayer?.mixedEraOverall || rawPlayer?.simulationProfile?.mixedEraRatings?.overall || rawPlayer.fp),
      designation: String(rawPlayer?.designation || rawPlayer?.status || 'ACTIVE').trim().toUpperCase()
    };
  }

  const perGame = rawPlayer?.seasonStats?.perGame || {};
  const fantasyPerGame = computeFantasyPoints({
    pts: Number(perGame?.pts || 0),
    reb: Number(perGame?.reb || 0),
    ast: Number(perGame?.ast || 0),
    stl: Number(perGame?.stl || 0),
    blk: Number(perGame?.blk || 0),
    to: Number(perGame?.to || 0),
    threes: Number(perGame?.threes || 0)
  });
  const mixedEraOverall = Math.max(40, Math.min(99, Math.round(fantasyPerGame * 2)));

  return {
    ...rawPlayer,
    id: buildNumericAuditId(packId, rawPlayer, index),
    playerId: String(rawPlayer?.playerId || buildNumericAuditId(packId, rawPlayer, index)),
    historicalPackId: String(rawPlayer?.historicalPackId || packId),
    name: String(rawPlayer?.name || rawPlayer?.displayName || '').trim(),
    displayName: String(rawPlayer?.displayName || rawPlayer?.name || '').trim(),
    team: String(rawPlayer?.team || rawPlayer?.seasonStats?.sourceTeamCode || '').trim().toUpperCase(),
    pos: String(rawPlayer?.pos || rawPlayer?.primaryPosition || 'UTIL').trim().toUpperCase(),
    primaryPosition: String(rawPlayer?.primaryPosition || rawPlayer?.pos || 'UTIL').trim().toUpperCase(),
    gp: Number(rawPlayer?.gp || rawPlayer?.seasonStats?.games || 0),
    fp: fantasyPerGame,
    mixedEraOverall,
    designation: String(rawPlayer?.designation || rawPlayer?.status || 'ACTIVE').trim().toUpperCase()
  };
}

function buildMixedEraContext(config) {
  return {
    mixedEraConfigId: `${config.sport}-accuracy-audit`,
    sourcePackIds: config.sourcePackIds.slice(),
    sourceSeasonLabels: config.sourceSeasonLabels.slice(),
    playerPool: config.sourcePackIds.flatMap((packId) => (
      readPackPlayers(packId).map((player, index) => normalizeAuditPlayer(packId, player, index))
    ))
  };
}

function getPackSport(packId) {
  return String(packId || '').trim().toLowerCase().startsWith('nfl_') ? 'nfl' : 'nba';
}

function getAllowedPositionsForSport(sport) {
  return sport === 'nfl'
    ? new Set(['QB', 'RB', 'WR', 'TE', 'K', 'DST', 'DEF', 'EDGE', 'LB', 'CB', 'S'])
    : new Set(['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL']);
}

function buildPackSanityFailure(packId, message, details) {
  return {
    packId,
    message,
    details: details || {}
  };
}

function getAuditSports(sport) {
  const normalizedSport = String(sport || 'all').trim().toLowerCase();
  if (!normalizedSport || normalizedSport === 'all') {
    return Object.keys(AUDIT_CONFIG);
  }
  if (!AUDIT_CONFIG[normalizedSport]) {
    throw new Error(`Unsupported audit sport: ${normalizedSport}`);
  }
  return [normalizedSport];
}

function runHistoricalPackSanityCheck(options = {}) {
  const sportFilter = String(options.sport || 'all').trim().toLowerCase();
  const allowedSports = new Set(getAuditSports(sportFilter));
  const packIds = Array.from(new Set(
    Object.values(AUDIT_CONFIG).flatMap((config) => config.sourcePackIds || [])
  )).filter((packId) => allowedSports.has(getPackSport(packId)));
  const failures = [];

  packIds.forEach((packId) => {
    const sport = getPackSport(packId);
    const allowedPositions = getAllowedPositionsForSport(sport);
    const rawPlayers = readPackPlayers(packId);
    if (!Array.isArray(rawPlayers) || rawPlayers.length < 50) {
      failures.push(buildPackSanityFailure(packId, 'pack should contain a usable player pool', {
        count: Array.isArray(rawPlayers) ? rawPlayers.length : 0
      }));
      return;
    }

    const normalizedPlayers = rawPlayers.map((player, index) => normalizeAuditPlayer(packId, player, index));
    const missingNames = normalizedPlayers.filter((player) => !String(player?.name || player?.displayName || '').trim()).length;
    const badPositions = normalizedPlayers.filter((player) => !allowedPositions.has(String(player?.pos || '').trim().toUpperCase())).length;
    const badFantasy = normalizedPlayers.filter((player) => !Number.isFinite(Number(player?.fp)) || Number(player?.fp) <= 0).length;
    const activePlayers = normalizedPlayers.filter((player) => String(player?.designation || 'ACTIVE').trim().toUpperCase() !== 'OUT');
    const activeFantasyValues = activePlayers.map((player) => Number(player?.fp || 0)).filter((value) => Number.isFinite(value) && value > 0);
    const fantasyStats = buildStats(activeFantasyValues);
    const zeroFantasyRate = normalizedPlayers.length > 0 ? badFantasy / normalizedPlayers.length : 1;

    if (missingNames > 0) {
      failures.push(buildPackSanityFailure(packId, 'players should have displayable names', { missingNames }));
    }
    if (badPositions > 0) {
      failures.push(buildPackSanityFailure(packId, 'players should use known fantasy positions', { badPositions, sport }));
    }
    if (zeroFantasyRate > 0.25 || activeFantasyValues.length < 50) {
      failures.push(buildPackSanityFailure(packId, 'players should have non-zero fantasy baselines', {
        badFantasy,
        total: normalizedPlayers.length,
        nonZeroFantasy: activeFantasyValues.length,
        zeroFantasyRate: roundStat(zeroFantasyRate)
      }));
    }
    if (fantasyStats.mean <= 5 || fantasyStats.mean > (sport === 'nfl' ? 35 : 55)) {
      failures.push(buildPackSanityFailure(packId, 'pack fantasy baseline mean should stay in a plausible range', {
        mean: fantasyStats.mean,
        sport
      }));
    }
  });

  return {
    packsChecked: packIds.length,
    failures,
    failedPacks: Array.from(new Set(failures.map((failure) => failure.packId)))
  };
}

function getAuditPackIdsForSport(sport) {
  const sportFilter = String(sport || 'all').trim().toLowerCase();
  const allowedSports = new Set(getAuditSports(sportFilter));
  return Array.from(new Set(
    Object.values(AUDIT_CONFIG).flatMap((config) => config.sourcePackIds || [])
  )).filter((packId) => allowedSports.has(getPackSport(packId)));
}

function countBy(values) {
  return values.reduce((counts, value) => {
    const key = String(value || '').trim().toUpperCase() || 'UNKNOWN';
    counts[key] = Number(counts[key] || 0) + 1;
    return counts;
  }, {});
}

function buildPositionMix(players) {
  const total = Math.max(1, players.length);
  return Object.fromEntries(
    Object.entries(countBy(players.map((player) => player?.pos || player?.primaryPosition || 'UNKNOWN')))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([position, count]) => [position, {
        count,
        share: roundStat(count / total)
      }])
  );
}

function getDominantPosition(positionMix) {
  return Object.entries(positionMix || {})
    .sort(([, left], [, right]) => Number(right?.share || 0) - Number(left?.share || 0))[0] || ['UNKNOWN', { share: 0 }];
}

function buildTopConcentration(players, count) {
  const values = players
    .map((player) => Number(player?.fp || 0))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a);
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!(total > 0)) return 0;
  return roundStat(values.slice(0, count).reduce((sum, value) => sum + value, 0) / total);
}

function hasPositiveFantasyBaseline(player) {
  return Number.isFinite(Number(player?.fp)) && Number(player?.fp) > 0;
}

function getPlayerGameCount(player) {
  return Number(player?.gp ?? player?.seasonStats?.games ?? 0);
}

function buildPackQualityFlags(pack) {
  const flags = [];
  if (pack.zeroDraftEligibleRate >= 0.05) {
    flags.push('draft_eligible_zero_tail');
  }
  if (pack.zeroGameRate >= 0.05) {
    flags.push('zero_game_tail');
  }
  if (
    Number.isFinite(pack.dominantPositionShare) &&
    Number.isFinite(pack.productiveDominantPositionShare) &&
    pack.dominantPositionShare - pack.productiveDominantPositionShare >= 0.08
  ) {
    flags.push('position_concentration_inflated_by_zero_tail');
  }
  return flags;
}

function buildPackQualityEntry(packId) {
  const sport = getPackSport(packId);
  const rawPlayers = readPackPlayers(packId);
  const normalizedPlayers = Array.isArray(rawPlayers)
    ? rawPlayers.map((player, index) => normalizeAuditPlayer(packId, player, index))
    : [];
  const activePlayers = normalizedPlayers.filter((player) => String(player?.designation || 'ACTIVE').trim().toUpperCase() !== 'OUT');
  const productivePlayers = activePlayers.filter(hasPositiveFantasyBaseline);
  const activeFantasyValues = productivePlayers.map((player) => Number(player?.fp || 0)).filter((value) => Number.isFinite(value) && value > 0);
  const zeroFantasyPlayers = normalizedPlayers.filter((player) => !hasPositiveFantasyBaseline(player));
  const zeroFantasyCount = zeroFantasyPlayers.length;
  const zeroFantasyActiveCount = activePlayers.filter((player) => !hasPositiveFantasyBaseline(player)).length;
  const zeroFantasyDraftEligibleCount = normalizedPlayers.filter((player) => !hasPositiveFantasyBaseline(player) && player?.draftEligible !== false).length;
  const zeroGameCount = normalizedPlayers.filter((player) => getPlayerGameCount(player) <= 0).length;
  const zeroGameDraftEligibleCount = normalizedPlayers.filter((player) => getPlayerGameCount(player) <= 0 && player?.draftEligible !== false).length;
  const positionMix = buildPositionMix(normalizedPlayers);
  const [dominantPosition, dominantPositionStats] = getDominantPosition(positionMix);
  const productivePositionMix = buildPositionMix(productivePlayers);
  const [productiveDominantPosition, productiveDominantPositionStats] = getDominantPosition(productivePositionMix);
  const entry = {
    packId,
    sport,
    playerCount: normalizedPlayers.length,
    activePlayerCount: activePlayers.length,
    productivePlayerCount: productivePlayers.length,
    zeroFantasyCount,
    zeroFantasyActiveCount,
    zeroFantasyDraftEligibleCount,
    zeroGameCount,
    zeroGameDraftEligibleCount,
    zeroFantasyRate: roundStat(normalizedPlayers.length > 0 ? zeroFantasyCount / normalizedPlayers.length : 1),
    activeZeroFantasyRate: roundStat(activePlayers.length > 0 ? zeroFantasyActiveCount / activePlayers.length : 1),
    zeroDraftEligibleRate: roundStat(normalizedPlayers.length > 0 ? zeroFantasyDraftEligibleCount / normalizedPlayers.length : 1),
    zeroGameRate: roundStat(normalizedPlayers.length > 0 ? zeroGameCount / normalizedPlayers.length : 1),
    zeroGameDraftEligibleRate: roundStat(normalizedPlayers.length > 0 ? zeroGameDraftEligibleCount / normalizedPlayers.length : 1),
    positionMix,
    dominantPosition,
    dominantPositionShare: roundStat(Number(dominantPositionStats?.share || 0)),
    productivePositionMix,
    productiveDominantPosition,
    productiveDominantPositionShare: roundStat(Number(productiveDominantPositionStats?.share || 0)),
    fantasyStats: buildStats(activeFantasyValues),
    topPlayerConcentration: buildTopConcentration(productivePlayers, 1),
    topFiveConcentration: buildTopConcentration(productivePlayers, 5),
    topTenConcentration: buildTopConcentration(productivePlayers, 10)
  };
  return {
    ...entry,
    flags: buildPackQualityFlags(entry)
  };
}

function pickPackQualityFields(pack) {
  return {
    packId: pack.packId,
    sport: pack.sport,
    playerCount: pack.playerCount,
    zeroFantasyRate: pack.zeroFantasyRate,
    zeroDraftEligibleRate: pack.zeroDraftEligibleRate,
    zeroGameRate: pack.zeroGameRate,
    fantasyMean: pack.fantasyStats.mean,
    fantasyStdev: pack.fantasyStats.stdev,
    dominantPosition: pack.dominantPosition,
    dominantPositionShare: pack.dominantPositionShare,
    productiveDominantPosition: pack.productiveDominantPosition,
    productiveDominantPositionShare: pack.productiveDominantPositionShare,
    topPlayerConcentration: pack.topPlayerConcentration,
    topFiveConcentration: pack.topFiveConcentration,
    topTenConcentration: pack.topTenConcentration,
    flags: pack.flags
  };
}

function runHistoricalPackQualityReport(options = {}) {
  const packs = getAuditPackIdsForSport(options.sport).map(buildPackQualityEntry);
  return {
    packs,
    rankings: {
      zeroFantasyTail: packs.slice()
        .sort((a, b) => b.zeroFantasyRate - a.zeroFantasyRate || a.packId.localeCompare(b.packId))
        .map(pickPackQualityFields),
      draftEligibleZeroTail: packs.slice()
        .sort((a, b) => b.zeroDraftEligibleRate - a.zeroDraftEligibleRate || a.packId.localeCompare(b.packId))
        .map(pickPackQualityFields),
      zeroGameTail: packs.slice()
        .sort((a, b) => b.zeroGameRate - a.zeroGameRate || a.packId.localeCompare(b.packId))
        .map(pickPackQualityFields),
      fantasyMean: packs.slice()
        .sort((a, b) => b.fantasyStats.mean - a.fantasyStats.mean || a.packId.localeCompare(b.packId))
        .map(pickPackQualityFields),
      fantasyStdev: packs.slice()
        .sort((a, b) => b.fantasyStats.stdev - a.fantasyStats.stdev || a.packId.localeCompare(b.packId))
        .map(pickPackQualityFields),
      positionConcentration: packs.slice()
        .sort((a, b) => b.dominantPositionShare - a.dominantPositionShare || a.packId.localeCompare(b.packId))
        .map(pickPackQualityFields),
      productivePositionConcentration: packs.slice()
        .sort((a, b) => b.productiveDominantPositionShare - a.productiveDominantPositionShare || a.packId.localeCompare(b.packId))
        .map(pickPackQualityFields),
      topPlayerConcentration: packs.slice()
        .sort((a, b) => b.topPlayerConcentration - a.topPlayerConcentration || a.packId.localeCompare(b.packId))
        .map(pickPackQualityFields)
    }
  };
}

function roundStat(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
}

function buildStats(values) {
  const samples = values.length;
  if (!samples) {
    return { samples: 0, mean: 0, min: 0, max: 0, stdev: 0 };
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / samples;
  const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / samples;
  return {
    samples,
    mean: roundStat(mean),
    min: roundStat(Math.min(...values)),
    max: roundStat(Math.max(...values)),
    stdev: roundStat(Math.sqrt(variance))
  };
}

function getPositionBucket(entry) {
  const pos = String(entry?.player?.pos || entry?.player?.primaryPosition || '').trim().toUpperCase();
  if (pos === 'PG' || pos === 'SG' || pos === 'G') return 'guard';
  if (pos === 'SF' || pos === 'PF' || pos === 'F') return 'wing';
  if (pos === 'C') return 'center';
  return '';
}

function buildMean(values) {
  return roundStat(
    values.length > 0
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : 0
  );
}

function buildNbaRoleShapeMetrics(roleShape) {
  return {
    topScorerPointShareMean: buildMean(roleShape.topScorerPointShares),
    assistLeaderAssistShareMean: buildMean(roleShape.assistLeaderAssistShares),
    reboundLeaderReboundShareMean: buildMean(roleShape.reboundLeaderReboundShares),
    guardAssistMean: buildMean(roleShape.guardAssists),
    wingThreeMean: buildMean(roleShape.wingThrees),
    centerReboundMean: buildMean(roleShape.centerRebounds),
    centerAssistMean: buildMean(roleShape.centerAssists),
    guardReboundMean: buildMean(roleShape.guardRebounds),
    defensiveAnchorEventMean: buildMean(roleShape.defensiveAnchorEvents)
  };
}

function buildNflPositionShapeMetrics(positionShape) {
  const qbStats = buildStats(positionShape.qbScores);
  const rbStats = buildStats(positionShape.rbScores);
  const wrStats = buildStats(positionShape.wrScores);
  const teStats = buildStats(positionShape.teScores);
  return {
    qbMean: qbStats.mean,
    rbMean: rbStats.mean,
    wrMean: wrStats.mean,
    teMean: teStats.mean,
    qbStdev: qbStats.stdev,
    rbStdev: rbStats.stdev,
    wrStdev: wrStats.stdev,
    teStdev: teStats.stdev,
    rbFloorRate: roundStat(
      positionShape.rbScores.length > 0
        ? positionShape.rbScores.filter((score) => score >= 10).length / positionShape.rbScores.length
        : 0
    ),
    wrFloorRate: roundStat(
      positionShape.wrScores.length > 0
        ? positionShape.wrScores.filter((score) => score >= 10).length / positionShape.wrScores.length
        : 0
    ),
    qbShareMean: buildMean(positionShape.qbShares),
    rbShareMean: buildMean(positionShape.rbShares),
    wrShareMean: buildMean(positionShape.wrShares),
    teShareMean: buildMean(positionShape.teShares),
    qbPassingYardsMean: buildMean(positionShape.qbPassingYards),
    qbPassingTdMean: buildMean(positionShape.qbPassingTd),
    rbTouchMean: buildMean(positionShape.rbTouches),
    rbRushingAttemptsMean: buildMean(positionShape.rbRushingAttempts),
    wrReceptionMean: buildMean(positionShape.wrReceptions),
    teReceptionMean: buildMean(positionShape.teReceptions),
    rbYardsPerTouchMean: buildMean(positionShape.rbYardsPerTouch),
    wrYardsPerTouchMean: buildMean(positionShape.wrYardsPerTouch),
    teYardsPerTouchMean: buildMean(positionShape.teYardsPerTouch)
  };
}

function getSimStat(stats, keys) {
  const source = stats && typeof stats === 'object' ? stats : {};
  for (const key of keys) {
    const value = Number(source[key]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function recordNbaRoleShape(entries, roleShape) {
  const teamPoints = entries.reduce((sum, entry) => sum + Number(entry?.simulatedStats?.pts || 0), 0);
  const teamAssists = entries.reduce((sum, entry) => sum + Number(entry?.simulatedStats?.ast || 0), 0);
  const teamRebounds = entries.reduce((sum, entry) => sum + Number(entry?.simulatedStats?.reb || 0), 0);
  const topPoints = Math.max(...entries.map((entry) => Number(entry?.simulatedStats?.pts || 0)));
  const topAssists = Math.max(...entries.map((entry) => Number(entry?.simulatedStats?.ast || 0)));
  const topRebounds = Math.max(...entries.map((entry) => Number(entry?.simulatedStats?.reb || 0)));
  if (teamPoints > 0 && Number.isFinite(topPoints)) roleShape.topScorerPointShares.push(topPoints / teamPoints);
  if (teamAssists > 0 && Number.isFinite(topAssists)) roleShape.assistLeaderAssistShares.push(topAssists / teamAssists);
  if (teamRebounds > 0 && Number.isFinite(topRebounds)) roleShape.reboundLeaderReboundShares.push(topRebounds / teamRebounds);

  entries.forEach((entry) => {
    const stats = entry?.simulatedStats || {};
    const bucket = getPositionBucket(entry);
    if (bucket === 'guard') {
      roleShape.guardAssists.push(Number(stats.ast || 0));
      roleShape.guardRebounds.push(Number(stats.reb || 0));
    } else if (bucket === 'wing') {
      roleShape.wingThrees.push(Number(stats.threes || 0));
    } else if (bucket === 'center') {
      roleShape.centerRebounds.push(Number(stats.reb || 0));
      roleShape.centerAssists.push(Number(stats.ast || 0));
    }
    const archetype = String(entry?.player?.simProfile?.archetype || '').trim().toLowerCase();
    if (archetype === 'rim_anchor' || archetype === 'defensive_event_creator') {
      roleShape.defensiveAnchorEvents.push(Number(stats.stl || 0) + Number(stats.blk || 0));
    }
  });
}

function recordNflPositionShape(entries, total, positionShape) {
  entries.forEach((entry) => {
    const position = String(entry?.player?.pos || entry?.simulatedStats?.position || '').trim().toUpperCase();
    const stats = entry?.simulatedStats || {};
    const score = Number(entry?.finalScore || 0);
    const share = total > 0 ? score / total : 0;
    if (position === 'QB') {
      positionShape.qbScores.push(score);
      positionShape.qbShares.push(share);
      positionShape.qbPassingYards.push(getSimStat(stats, ['passingYards', 'passYds']));
      positionShape.qbPassingTd.push(getSimStat(stats, ['passingTd', 'passTd']));
    } else if (position === 'RB') {
      const rushAtt = getSimStat(stats, ['rushingAttempts', 'rushAtt']);
      const rec = getSimStat(stats, ['receptions', 'rec']);
      const rushYds = getSimStat(stats, ['rushingYards', 'rushYds']);
      const recYds = getSimStat(stats, ['receivingYards', 'recYds']);
      const touches = getSimStat(stats, ['touches']) || rushAtt + rec;
      positionShape.rbScores.push(score);
      positionShape.rbShares.push(share);
      positionShape.rbTouches.push(touches);
      positionShape.rbRushingAttempts.push(rushAtt);
      if (touches > 0) positionShape.rbYardsPerTouch.push((rushYds + recYds) / touches);
    } else if (position === 'WR') {
      const rec = getSimStat(stats, ['receptions', 'rec']);
      const recYds = getSimStat(stats, ['receivingYards', 'recYds']);
      positionShape.wrScores.push(score);
      positionShape.wrShares.push(share);
      positionShape.wrReceptions.push(rec);
      if (rec > 0) positionShape.wrYardsPerTouch.push(recYds / rec);
    } else if (position === 'TE') {
      const rec = getSimStat(stats, ['receptions', 'rec']);
      const recYds = getSimStat(stats, ['receivingYards', 'recYds']);
      positionShape.teScores.push(score);
      positionShape.teShares.push(share);
      positionShape.teReceptions.push(rec);
      if (rec > 0) positionShape.teYardsPerTouch.push(recYds / rec);
    }
  });
}

function getTeamAbbrs(state) {
  return Array.isArray(state?.leagueShell?.teams)
    ? state.leagueShell.teams.map((team) => String(team?.abbr || '').trim().toUpperCase()).filter(Boolean)
    : [];
}

function getRosterForTeam(state, teamAbbr) {
  return Array.isArray(state?.draftState?.rostersByTeam?.[teamAbbr])
    ? state.draftState.rostersByTeam[teamAbbr]
    : [];
}

function getStarterIdsForTeam(state, teamAbbr) {
  const isNfl = String(state?.leagueShell?.sport || '').trim().toLowerCase() === 'nfl';
  if (isNfl) {
    const slots = state?.seasonState?.lineupSlotsByTeam?.[teamAbbr];
    if (slots && typeof slots === 'object' && !Array.isArray(slots)) {
      return Object.values(slots).map((value) => Number(value)).filter(Number.isFinite);
    }
  }
  return Array.isArray(state?.seasonState?.lineupIdsByTeam?.[teamAbbr])
    ? state.seasonState.lineupIdsByTeam[teamAbbr].map((value) => Number(value)).filter(Number.isFinite)
    : [];
}

function buildStarterStrengthMap(state) {
  const starterCount = Math.max(5, getSimulationStarterSlots(state?.leagueShell || {}).length || 5);
  return Object.fromEntries(
    getTeamAbbrs(state).map((teamAbbr) => {
      const rosterById = new Map(getRosterForTeam(state, teamAbbr).map((player) => [Number(player?.id), player]));
      const starters = getStarterIdsForTeam(state, teamAbbr)
        .map((playerId) => rosterById.get(playerId))
        .filter(Boolean);
      const source = starters.length ? starters : getRosterForTeam(state, teamAbbr).slice(0, starterCount);
      const fantasyValues = source
        .map((player) => Number(player?.fp || player?.mixedEraOverall || 0))
        .filter((value) => Number.isFinite(value) && value > 0)
        .sort((a, b) => b - a);
      const weightedAverage = fantasyValues.length
        ? fantasyValues.reduce((sum, value, index) => {
          const weight = 1 + Math.max(0, (fantasyValues.length - index) / fantasyValues.length) * 0.35;
          return sum + value * weight;
        }, 0) / fantasyValues.reduce((sum, value, index) => (
          sum + 1 + Math.max(0, (fantasyValues.length - index) / fantasyValues.length) * 0.35
        ), 0)
        : 0;
      return [teamAbbr, roundStat(weightedAverage)];
    })
  );
}

function getDayKeys(schedule, maxDays) {
  return Object.keys(schedule?.byDay || {})
    .map((value) => Number(value))
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
    .slice(0, maxDays);
}

function buildSeedState(config, trialIndex) {
  const shell = getSimulationShell({ sport: config.sport });
  const mixedEraContext = buildMixedEraContext(config);
  const state = buildCompletedSimulationAutoDraftState({
    shell,
    mixedEraContext,
    controlledTeamAbbr: config.controlledTeamAbbr
  });
  state.seasonId = `accuracy-audit-${config.sport}-${trialIndex + 1}`;
  state.activeSeasonBackend = 'simulation';
  state.legacyHistoricalStatMode = false;
  return state;
}

function buildEngineState(state) {
  const teamMeta = Array.isArray(state?.leagueShell?.teams) ? clone(state.leagueShell.teams) : [];
  return {
    ...clone(state),
    sport: String(state?.leagueShell?.sport || '').trim().toLowerCase(),
    seasonId: String(state?.seasonId || ''),
    teams: teamMeta.map((team) => team.name),
    teamMeta,
    allRosters: teamMeta.map((team) => clone(state?.draftState?.rostersByTeam?.[team.abbr] || [])),
    standings: clone(state?.seasonState?.standings || []),
    currentDay: Number(state?.seasonState?.currentDay || 1),
    currentWeek: Number(state?.seasonState?.currentWeek || 1),
    completedGameLogs: clone(state?.seasonState?.completedGameLogs || [])
  };
}

function applyEngineResultsToState(state, nextEngineState) {
  const nextState = clone(state);
  nextState.seasonState = nextState.seasonState || {};
  nextState.seasonState.currentDay = Number(nextEngineState?.currentDay || nextState.seasonState.currentDay || 1);
  nextState.seasonState.currentWeek = Number(nextEngineState?.currentWeek || nextState.seasonState.currentWeek || 1);
  nextState.seasonState.standings = clone(nextEngineState?.standings || nextState.seasonState.standings || []);
  nextState.seasonState.completedGameLogs = clone(nextEngineState?.completedGameLogs || nextState.seasonState.completedGameLogs || []);
  return nextState;
}

function runTrial(config, trialIndex) {
  let state = buildSeedState(config, trialIndex);
  const schedule = buildSimulationSeasonSchedule(state.leagueShell);
  const dayKeys = getDayKeys(schedule, config.maxDays);
  const teamTotals = [];
  const renderedScores = [];
  const topStarShares = [];
  const qbShares = [];
  const nbaRoleShape = {
    topScorerPointShares: [],
    assistLeaderAssistShares: [],
    reboundLeaderReboundShares: [],
    guardAssists: [],
    wingThrees: [],
    centerRebounds: [],
    centerAssists: [],
    guardRebounds: [],
    defensiveAnchorEvents: []
  };
  const nflPositionShape = {
    qbScores: [],
    rbScores: [],
    wrScores: [],
    teScores: [],
    qbShares: [],
    rbShares: [],
    wrShares: [],
    teShares: [],
    qbPassingYards: [],
    qbPassingTd: [],
    rbTouches: [],
    rbRushingAttempts: [],
    wrReceptions: [],
    teReceptions: [],
    rbYardsPerTouch: [],
    wrYardsPerTouch: [],
    teYardsPerTouch: []
  };
  let strongerTeamGames = 0;
  let strongerTeamWins = 0;
  let renderedTies = 0;
  let totalGames = 0;

  dayKeys.forEach((day) => {
    const strengthMap = buildStarterStrengthMap(state);
    const engineState = buildEngineState(state);
    const result = simulateSimulationGameDay({
      state: engineState,
      schedule,
      day
    });
    Object.values(result.resultsByTeam || {}).forEach((teamResult) => {
      teamTotals.push(Number(teamResult?.total || 0));
      const entries = Array.isArray(teamResult?.entries) ? teamResult.entries : [];
      const total = Number(teamResult?.total || 0);
      if (total > 0 && entries.length) {
        const finalScores = entries.map((entry) => Number(entry?.finalScore || 0));
        const topScore = Math.max(...finalScores);
        if (Number.isFinite(topScore)) {
          topStarShares.push(topScore / total);
        }
        if (config.sport === 'nba') {
          recordNbaRoleShape(entries, nbaRoleShape);
        } else if (config.sport === 'nfl') {
          recordNflPositionShape(entries, total, nflPositionShape);
        }
        const qbEntry = entries.find((entry) => String(entry?.player?.pos || '').trim().toUpperCase() === 'QB');
        if (qbEntry) {
          qbShares.push(Number(qbEntry?.finalScore || 0) / total);
        }
      }
    });
    (result.gameLogs || []).forEach((game) => {
      totalGames += 1;
      renderedScores.push(Number(game?.homeScore || 0));
      renderedScores.push(Number(game?.awayScore || 0));
      if (Number(game?.homeScore || 0) === Number(game?.awayScore || 0)) {
        renderedTies += 1;
      }
      const homeAbbr = String(engineState?.teamMeta?.[Number(game?.home)]?.abbr || '').trim().toUpperCase();
      const awayAbbr = String(engineState?.teamMeta?.[Number(game?.away)]?.abbr || '').trim().toUpperCase();
      const homeStrength = Number(strengthMap[homeAbbr] || 0);
      const awayStrength = Number(strengthMap[awayAbbr] || 0);
      if (homeStrength === awayStrength) {
        return;
      }
      strongerTeamGames += 1;
      const strongerSide = homeStrength > awayStrength ? 'home' : 'away';
      const winner = String(game?.winner || '').trim().toLowerCase();
      if (winner === strongerSide) {
        strongerTeamWins += 1;
      }
    });
    state = applyEngineResultsToState(state, applySimulationDayResults(engineState, result));
  });

  return {
    teamTotals,
    renderedScores,
    topStarShares,
    qbShares,
    strongerTeamGames,
    strongerTeamWins,
    renderedTies,
    totalGames,
    nbaRoleShape,
    nflPositionShape
  };
}

function average(values) {
  return values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function median(values) {
  const sorted = (Array.isArray(values) ? values : [])
    .map((value) => Number(value))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function pearsonCorrelation(leftValues, rightValues) {
  const pairs = (Array.isArray(leftValues) ? leftValues : [])
    .map((left, index) => [Number(left), Number(rightValues?.[index])])
    .filter(([left, right]) => Number.isFinite(left) && Number.isFinite(right));
  if (pairs.length < 2) return 0;
  const leftMean = average(pairs.map(([left]) => left));
  const rightMean = average(pairs.map(([, right]) => right));
  let numerator = 0;
  let leftDenominator = 0;
  let rightDenominator = 0;
  pairs.forEach(([left, right]) => {
    const leftDelta = left - leftMean;
    const rightDelta = right - rightMean;
    numerator += leftDelta * rightDelta;
    leftDenominator += leftDelta * leftDelta;
    rightDenominator += rightDelta * rightDelta;
  });
  const denominator = Math.sqrt(leftDenominator * rightDenominator);
  return denominator > 0 ? numerator / denominator : 0;
}

function buildSeasonStandingsRows(state, strengthMap) {
  const teamMeta = Array.isArray(state?.leagueShell?.teams) ? state.leagueShell.teams : [];
  return (state?.seasonState?.standings || []).map((row) => {
    const teamIdx = Number(row?.teamIdx);
    const teamAbbr = String(row?.teamAbbr || teamMeta[teamIdx]?.abbr || '').trim().toUpperCase();
    const wins = Number(row?.w || 0);
    const losses = Number(row?.l || 0);
    const games = wins + losses;
    return {
      teamAbbr,
      wins,
      losses,
      games,
      winPct: games > 0 ? wins / games : 0,
      strength: Number(strengthMap?.[teamAbbr] || 0)
    };
  }).filter((row) => row.teamAbbr);
}

function buildSeasonGroupMetrics(rows, config) {
  const orderedByStrength = rows.slice().sort((a, b) => b.strength - a.strength);
  const groupSize = Math.max(1, Math.floor(rows.length / 4));
  const eliteGroupSize = Math.max(1, Math.ceil(rows.length * 0.1));
  const topGroup = orderedByStrength.slice(0, groupSize);
  const bottomGroup = orderedByStrength.slice(-groupSize);
  const eliteGroup = orderedByStrength.slice(0, eliteGroupSize);
  const orderedByRecord = rows.slice().sort((a, b) => b.winPct - a.winPct);
  const playoffSlots = config.sport === 'nfl' ? 14 : 16;
  const playoffTeams = orderedByRecord.slice(0, Math.min(playoffSlots, orderedByRecord.length));
  const playoffSet = new Set(playoffTeams.map((row) => row.teamAbbr));
  const topPlayoffRate = average(topGroup.map((row) => playoffSet.has(row.teamAbbr) ? 1 : 0));
  const bottomPlayoffRate = average(bottomGroup.map((row) => playoffSet.has(row.teamAbbr) ? 1 : 0));
  const winPcts = rows.map((row) => row.winPct);
  const strengths = rows.map((row) => row.strength);
  const bottomCollapseThreshold = config.sport === 'nfl' ? 0.24 : 0.26;
  const medianWinPct = median(winPcts);
  const standingsDeterminismRate = Math.max(0, pearsonCorrelation(strengths, winPcts));
  return {
    gamesPerTeamMean: roundStat(average(rows.map((row) => row.games))),
    winPctSpread: roundStat(Math.max(...winPcts) - Math.min(...winPcts)),
    winPctStdev: buildStats(winPcts).stdev,
    leagueStrengthMean: roundStat(average(strengths)),
    playoffFieldStrengthMean: roundStat(average(playoffTeams.map((row) => row.strength))),
    playoffFieldStrengthEdge: roundStat(average(playoffTeams.map((row) => row.strength)) - average(strengths)),
    topRosterWinPct: roundStat(average(topGroup.map((row) => row.winPct))),
    bottomRosterWinPct: roundStat(average(bottomGroup.map((row) => row.winPct))),
    topBottomWinPctGap: roundStat(average(topGroup.map((row) => row.winPct)) - average(bottomGroup.map((row) => row.winPct))),
    eliteRosterWinPct: roundStat(average(eliteGroup.map((row) => row.winPct))),
    eliteMedianWinPctGap: roundStat(average(eliteGroup.map((row) => row.winPct)) - medianWinPct),
    bottomCollapseRate: roundStat(average(bottomGroup.map((row) => row.winPct <= bottomCollapseThreshold ? 1 : 0))),
    topRosterPlayoffRate: roundStat(topPlayoffRate),
    bottomRosterPlayoffRate: roundStat(bottomPlayoffRate),
    playoffRateGap: roundStat(topPlayoffRate - bottomPlayoffRate),
    standingsDeterminismRate: roundStat(standingsDeterminismRate)
  };
}

function runSeasonTrial(config, trialIndex) {
  let state = buildSeedState(config, trialIndex + 1000);
  const schedule = buildSimulationSeasonSchedule(state.leagueShell);
  const dayKeys = getDayKeys(schedule, Number.MAX_SAFE_INTEGER);
  const strengthMap = buildStarterStrengthMap(state);

  dayKeys.forEach((day) => {
    const engineState = buildEngineState(state);
    const result = simulateSimulationGameDay({
      state: engineState,
      schedule,
      day
    });
    state = applyEngineResultsToState(state, applySimulationDayResults(engineState, result));
  });

  return buildSeasonGroupMetrics(buildSeasonStandingsRows(state, strengthMap), config);
}

function evaluateSeasonRealismGuardrails(config, metrics) {
  const failures = [];
  const minGap = config.sport === 'nfl' ? 0.03 : 0.08;
  const minSpread = config.sport === 'nfl' ? 0.22 : 0.28;
  const maxSpread = config.sport === 'nfl' ? 0.82 : 0.84;
  const seasonConfig = config.seasonRealism || {};
  if (metrics.topBottomWinPctGap < minGap) {
    failures.push(`top-bottom win pct gap ${metrics.topBottomWinPctGap} below ${minGap}`);
  }
  if (metrics.winPctSpread < minSpread || metrics.winPctSpread > maxSpread) {
    failures.push(`win pct spread ${metrics.winPctSpread} outside ${minSpread}-${maxSpread}`);
  }
  if (metrics.topRosterPlayoffRate < metrics.bottomRosterPlayoffRate) {
    failures.push(
      `top roster playoff rate ${metrics.topRosterPlayoffRate} below bottom roster playoff rate ${metrics.bottomRosterPlayoffRate}`
    );
  }
  if (metrics.playoffFieldStrengthMean <= metrics.leagueStrengthMean) {
    failures.push(
      `playoff field strength ${metrics.playoffFieldStrengthMean} should exceed league strength ${metrics.leagueStrengthMean}`
    );
  }
  if (
    Number.isFinite(seasonConfig.playoffFieldStrengthEdgeFloor) &&
    metrics.playoffFieldStrengthEdge < seasonConfig.playoffFieldStrengthEdgeFloor
  ) {
    failures.push(
      `playoff field strength edge ${metrics.playoffFieldStrengthEdge} below ${seasonConfig.playoffFieldStrengthEdgeFloor}`
    );
  }
  if (
    Number.isFinite(seasonConfig.eliteMedianWinPctGapFloor) &&
    metrics.eliteMedianWinPctGap < seasonConfig.eliteMedianWinPctGapFloor
  ) {
    failures.push(`elite-median win pct gap ${metrics.eliteMedianWinPctGap} below ${seasonConfig.eliteMedianWinPctGapFloor}`);
  }
  const bottomCollapseRange = Array.isArray(seasonConfig.bottomCollapseRateRange)
    ? seasonConfig.bottomCollapseRateRange
    : [];
  if (
    Number.isFinite(bottomCollapseRange[0]) &&
    Number.isFinite(bottomCollapseRange[1]) &&
    (metrics.bottomCollapseRate < bottomCollapseRange[0] || metrics.bottomCollapseRate > bottomCollapseRange[1])
  ) {
    failures.push(
      `bottom collapse rate ${metrics.bottomCollapseRate} outside ${bottomCollapseRange[0]}-${bottomCollapseRange[1]}`
    );
  }
  const determinismCeiling = Number.isFinite(seasonConfig.standingsDeterminismRateCeiling)
    ? seasonConfig.standingsDeterminismRateCeiling
    : 0.92;
  if (metrics.standingsDeterminismRate >= determinismCeiling) {
    failures.push(`standings determinism ${metrics.standingsDeterminismRate} above ${determinismCeiling}`);
  }
  return failures;
}

function runSeasonRealismAudit(options = {}) {
  const sport = String(options.sport || 'nba').trim().toLowerCase();
  const config = AUDIT_CONFIG[sport];
  if (!config) {
    throw new Error(`Unsupported season audit sport: ${sport}`);
  }
  const trialCount = Number(options.trialCount || config.seasonTrialCount || 1);
  const trials = [];
  for (let trialIndex = 0; trialIndex < trialCount; trialIndex += 1) {
    trials.push(runSeasonTrial(config, trialIndex));
  }
  const metrics = {
    gamesPerTeamMean: roundStat(average(trials.map((trial) => trial.gamesPerTeamMean))),
    winPctSpread: roundStat(average(trials.map((trial) => trial.winPctSpread))),
    winPctStdev: roundStat(average(trials.map((trial) => trial.winPctStdev))),
    leagueStrengthMean: roundStat(average(trials.map((trial) => trial.leagueStrengthMean))),
    playoffFieldStrengthMean: roundStat(average(trials.map((trial) => trial.playoffFieldStrengthMean))),
    playoffFieldStrengthEdge: roundStat(average(trials.map((trial) => trial.playoffFieldStrengthEdge))),
    topRosterWinPct: roundStat(average(trials.map((trial) => trial.topRosterWinPct))),
    bottomRosterWinPct: roundStat(average(trials.map((trial) => trial.bottomRosterWinPct))),
    topBottomWinPctGap: roundStat(average(trials.map((trial) => trial.topBottomWinPctGap))),
    eliteRosterWinPct: roundStat(average(trials.map((trial) => trial.eliteRosterWinPct))),
    eliteMedianWinPctGap: roundStat(average(trials.map((trial) => trial.eliteMedianWinPctGap))),
    bottomCollapseRate: roundStat(average(trials.map((trial) => trial.bottomCollapseRate))),
    topRosterPlayoffRate: roundStat(average(trials.map((trial) => trial.topRosterPlayoffRate))),
    bottomRosterPlayoffRate: roundStat(average(trials.map((trial) => trial.bottomRosterPlayoffRate))),
    playoffRateGap: roundStat(average(trials.map((trial) => trial.playoffRateGap))),
    standingsDeterminismRate: roundStat(average(trials.map((trial) => trial.standingsDeterminismRate))),
    trials: trialCount
  };
  return {
    sport,
    metrics,
    failedGuardrails: evaluateSeasonRealismGuardrails(config, metrics)
  };
}

function evaluateGuardrails(config, metrics) {
  const failures = [];
  if (
    metrics.teamTotals.mean < config.teamTotalRange[0] ||
    metrics.teamTotals.mean > config.teamTotalRange[1]
  ) {
    failures.push(
      `team total mean ${metrics.teamTotals.mean} outside ${config.teamTotalRange[0]}-${config.teamTotalRange[1]}`
    );
  }
  if (
    Array.isArray(config.renderedScoreRange) &&
    (metrics.renderedScores.mean < config.renderedScoreRange[0] ||
      metrics.renderedScores.mean > config.renderedScoreRange[1])
  ) {
    failures.push(
      `rendered score mean ${metrics.renderedScores.mean} outside ${config.renderedScoreRange[0]}-${config.renderedScoreRange[1]}`
    );
  }
  if (metrics.strengthWinRate < config.strengthWinRateFloor) {
    failures.push(
      `strength win rate ${metrics.strengthWinRate} below ${config.strengthWinRateFloor}`
    );
  }
  if (metrics.zeroTeamTotalRate > config.zeroTeamTotalRateCeiling) {
    failures.push(
      `zero team total rate ${metrics.zeroTeamTotalRate} above ${config.zeroTeamTotalRateCeiling}`
    );
  }
  if (Number.isFinite(config.topStarShareMeanFloor) && metrics.topStarShareMean < config.topStarShareMeanFloor) {
    failures.push(
      `top star share mean ${metrics.topStarShareMean} below ${config.topStarShareMeanFloor}`
    );
  }
  if (Number.isFinite(config.qbShareMeanCeiling) && metrics.qbShareMean > config.qbShareMeanCeiling) {
    failures.push(
      `qb share mean ${metrics.qbShareMean} above ${config.qbShareMeanCeiling}`
    );
  }
  if (
    Number.isFinite(config.nbaRoleShape?.topScorerPointShareMeanFloor) &&
    metrics.nbaRoleShape.topScorerPointShareMean < config.nbaRoleShape.topScorerPointShareMeanFloor
  ) {
    failures.push(
      `nba top scorer point share ${metrics.nbaRoleShape.topScorerPointShareMean} below ${config.nbaRoleShape.topScorerPointShareMeanFloor}`
    );
  }
  if (
    Number.isFinite(config.nbaRoleShape?.assistLeaderAssistShareMeanFloor) &&
    metrics.nbaRoleShape.assistLeaderAssistShareMean < config.nbaRoleShape.assistLeaderAssistShareMeanFloor
  ) {
    failures.push(
      `nba assist leader share ${metrics.nbaRoleShape.assistLeaderAssistShareMean} below ${config.nbaRoleShape.assistLeaderAssistShareMeanFloor}`
    );
  }
  if (
    Number.isFinite(config.nbaRoleShape?.reboundLeaderReboundShareMeanFloor) &&
    metrics.nbaRoleShape.reboundLeaderReboundShareMean < config.nbaRoleShape.reboundLeaderReboundShareMeanFloor
  ) {
    failures.push(
      `nba rebound leader share ${metrics.nbaRoleShape.reboundLeaderReboundShareMean} below ${config.nbaRoleShape.reboundLeaderReboundShareMeanFloor}`
    );
  }
  if (
    Number.isFinite(config.nbaRoleShape?.wingThreeMeanFloor) &&
    metrics.nbaRoleShape.wingThreeMean < config.nbaRoleShape.wingThreeMeanFloor
  ) {
    failures.push(
      `nba wing three mean ${metrics.nbaRoleShape.wingThreeMean} below ${config.nbaRoleShape.wingThreeMeanFloor}`
    );
  }
  if (
    Number.isFinite(config.nbaRoleShape?.defensiveAnchorEventMeanFloor) &&
    metrics.nbaRoleShape.defensiveAnchorEventMean < config.nbaRoleShape.defensiveAnchorEventMeanFloor
  ) {
    failures.push(
      `nba defensive anchor event mean ${metrics.nbaRoleShape.defensiveAnchorEventMean} below ${config.nbaRoleShape.defensiveAnchorEventMeanFloor}`
    );
  }
  if (
    Number.isFinite(config.nflPositionShape?.qbMeanCeiling) &&
    metrics.nflPositionShape.qbMean > config.nflPositionShape.qbMeanCeiling
  ) {
    failures.push(
      `nfl qb mean ${metrics.nflPositionShape.qbMean} above ${config.nflPositionShape.qbMeanCeiling}`
    );
  }
  if (
    Number.isFinite(config.nflPositionShape?.rbShareMeanFloor) &&
    metrics.nflPositionShape.rbShareMean < config.nflPositionShape.rbShareMeanFloor
  ) {
    failures.push(
      `nfl rb share mean ${metrics.nflPositionShape.rbShareMean} below ${config.nflPositionShape.rbShareMeanFloor}`
    );
  }
  if (
    config.nflPositionShape?.wrStdevShouldExceedRb &&
    Number.isFinite(metrics.nflPositionShape?.wrStdev) &&
    Number.isFinite(metrics.nflPositionShape?.rbStdev) &&
    metrics.nflPositionShape.wrStdev <= metrics.nflPositionShape.rbStdev
  ) {
    failures.push(
      `nfl wr stdev ${metrics.nflPositionShape.wrStdev} should exceed rb stdev ${metrics.nflPositionShape.rbStdev}`
    );
  }
  if (
    Number.isFinite(config.nflPositionShape?.rbFloorRateFloor) &&
    metrics.nflPositionShape.rbFloorRate < config.nflPositionShape.rbFloorRateFloor
  ) {
    failures.push(
      `nfl rb floor rate ${metrics.nflPositionShape.rbFloorRate} below ${config.nflPositionShape.rbFloorRateFloor}`
    );
  }
  const qbPassingYardsRange = config.nflPositionShape?.qbPassingYardsRange;
  if (
    Array.isArray(qbPassingYardsRange) &&
    qbPassingYardsRange.length === 2 &&
    (metrics.nflPositionShape.qbPassingYardsMean < qbPassingYardsRange[0] ||
      metrics.nflPositionShape.qbPassingYardsMean > qbPassingYardsRange[1])
  ) {
    failures.push(
      `nfl qb passing yards mean ${metrics.nflPositionShape.qbPassingYardsMean} outside ${qbPassingYardsRange[0]}-${qbPassingYardsRange[1]}`
    );
  }
  if (
    Number.isFinite(config.nflPositionShape?.rbTouchMeanFloor) &&
    metrics.nflPositionShape.rbTouchMean < config.nflPositionShape.rbTouchMeanFloor
  ) {
    failures.push(
      `nfl rb touch mean ${metrics.nflPositionShape.rbTouchMean} below ${config.nflPositionShape.rbTouchMeanFloor}`
    );
  }
  if (
    config.nflPositionShape?.wrYardsPerTouchShouldExceedRb &&
    Number.isFinite(metrics.nflPositionShape?.wrYardsPerTouchMean) &&
    Number.isFinite(metrics.nflPositionShape?.rbYardsPerTouchMean) &&
    metrics.nflPositionShape.wrYardsPerTouchMean <= metrics.nflPositionShape.rbYardsPerTouchMean
  ) {
    failures.push(
      `nfl wr yards per touch ${metrics.nflPositionShape.wrYardsPerTouchMean} should exceed rb yards per touch ${metrics.nflPositionShape.rbYardsPerTouchMean}`
    );
  }
  if (metrics.renderedTieRate > config.renderedTieRateCeiling) {
    failures.push(
      `rendered tie rate ${metrics.renderedTieRate} above ${config.renderedTieRateCeiling}`
    );
  }
  return failures;
}

function runAccuracyAudit(options = {}) {
  const sport = String(options.sport || 'nba').trim().toLowerCase();
  const config = AUDIT_CONFIG[sport];
  if (!config) {
    throw new Error(`Unsupported audit sport: ${sport}`);
  }

  const allTeamTotals = [];
  const allRenderedScores = [];
  const allTopStarShares = [];
  const allQbShares = [];
  const allNbaRoleShape = {
    topScorerPointShares: [],
    assistLeaderAssistShares: [],
    reboundLeaderReboundShares: [],
    guardAssists: [],
    wingThrees: [],
    centerRebounds: [],
    centerAssists: [],
    guardRebounds: [],
    defensiveAnchorEvents: []
  };
  const allNflPositionShape = {
    qbScores: [],
    rbScores: [],
    wrScores: [],
    teScores: [],
    qbShares: [],
    rbShares: [],
    wrShares: [],
    teShares: [],
    qbPassingYards: [],
    qbPassingTd: [],
    rbTouches: [],
    rbRushingAttempts: [],
    wrReceptions: [],
    teReceptions: [],
    rbYardsPerTouch: [],
    wrYardsPerTouch: [],
    teYardsPerTouch: []
  };
  let strongerTeamGames = 0;
  let strongerTeamWins = 0;
  let renderedTies = 0;
  let totalGames = 0;

  for (let trialIndex = 0; trialIndex < config.trialCount; trialIndex += 1) {
    const trial = runTrial(config, trialIndex);
    allTeamTotals.push(...trial.teamTotals);
    allRenderedScores.push(...trial.renderedScores);
    allTopStarShares.push(...trial.topStarShares);
    allQbShares.push(...trial.qbShares);
    Object.keys(allNbaRoleShape).forEach((key) => {
      allNbaRoleShape[key].push(...(trial.nbaRoleShape?.[key] || []));
    });
    Object.keys(allNflPositionShape).forEach((key) => {
      allNflPositionShape[key].push(...(trial.nflPositionShape?.[key] || []));
    });
    strongerTeamGames += trial.strongerTeamGames;
    strongerTeamWins += trial.strongerTeamWins;
    renderedTies += trial.renderedTies;
    totalGames += trial.totalGames;
  }

  const metrics = {
    teamTotals: buildStats(allTeamTotals),
    renderedScores: buildStats(allRenderedScores),
    strengthWinRate: roundStat(
      strongerTeamGames > 0 ? strongerTeamWins / strongerTeamGames : 0
    ),
    topStarShareMean: roundStat(
      allTopStarShares.length > 0
        ? allTopStarShares.reduce((sum, value) => sum + value, 0) / allTopStarShares.length
        : 0
    ),
    qbShareMean: roundStat(
      allQbShares.length > 0
        ? allQbShares.reduce((sum, value) => sum + value, 0) / allQbShares.length
        : 0
    ),
    zeroTeamTotalRate: roundStat(
      allTeamTotals.length > 0
        ? allTeamTotals.filter((value) => Number(value || 0) === 0).length / allTeamTotals.length
        : 0
    ),
    renderedTieRate: roundStat(
      totalGames > 0 ? renderedTies / totalGames : 0
    ),
    gamesAudited: totalGames,
    trials: config.trialCount
  };
  if (sport === 'nba') {
    metrics.nbaRoleShape = buildNbaRoleShapeMetrics(allNbaRoleShape);
  } else if (sport === 'nfl') {
    metrics.nflPositionShape = buildNflPositionShapeMetrics(allNflPositionShape);
  }

  return {
    sport,
    metrics,
    failedGuardrails: evaluateGuardrails(config, metrics)
  };
}

function runAccuracyAuditSuite(options = {}) {
  const audits = getAuditSports(options.sport).map((sport) => runAccuracyAudit({ sport }));
  return {
    audits,
    failedSports: audits.filter((audit) => audit.failedGuardrails.length).map((audit) => audit.sport)
  };
}

function runSeasonRealismAuditSuite(options = {}) {
  const audits = getAuditSports(options.sport).map((sport) => runSeasonRealismAudit({ sport }));
  return {
    audits,
    failedSports: audits.filter((audit) => audit.failedGuardrails.length).map((audit) => audit.sport)
  };
}

function parseSimulationAccuracyAuditArgs(argv = []) {
  const parsed = {
    sport: 'all',
    includeSeason: false,
    includePacks: false,
    outputMode: 'json',
    help: false
  };
  const args = Array.isArray(argv) ? argv.slice() : [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = String(args[index] || '').trim();
    if (!arg) continue;
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg === '--season') {
      parsed.includeSeason = true;
    } else if (arg === '--packs') {
      parsed.includePacks = true;
    } else if (arg === '--summary') {
      parsed.outputMode = 'summary';
    } else if (arg === '--json') {
      parsed.outputMode = 'json';
    } else if (arg === '--sport') {
      index += 1;
      parsed.sport = String(args[index] || '').trim().toLowerCase() || 'all';
    } else if (arg.startsWith('--sport=')) {
      parsed.sport = arg.slice('--sport='.length).trim().toLowerCase() || 'all';
    } else {
      throw new Error(`Unknown simulation accuracy audit flag: ${arg}`);
    }
  }
  getAuditSports(parsed.sport);
  return parsed;
}

function buildSimulationAccuracyAuditPayload(options = {}) {
  const sport = String(options.sport || 'all').trim().toLowerCase() || 'all';
  const payload = runAccuracyAuditSuite({ sport });
  if (options.includeSeason) {
    payload.seasonRealism = runSeasonRealismAuditSuite({ sport });
  }
  if (options.includePacks) {
    payload.packSanity = runHistoricalPackSanityCheck({ sport });
    payload.packQuality = runHistoricalPackQualityReport({ sport });
  }
  return payload;
}

function formatAuditStatus(failures) {
  return Array.isArray(failures) && failures.length ? 'FAIL' : 'PASS';
}

function formatAccuracyAuditLine(audit) {
  const metrics = audit?.metrics || {};
  const parts = [
    `${String(audit?.sport || '').toUpperCase()} ${formatAuditStatus(audit?.failedGuardrails)}`,
    `team mean ${metrics.teamTotals?.mean}`,
    `score mean ${metrics.renderedScores?.mean}`,
    `strength wins ${metrics.strengthWinRate}`,
    `${metrics.gamesAudited} games`
  ];
  if (metrics.nflPositionShape) {
    parts.push(
      `qb pass ${metrics.nflPositionShape.qbPassingYardsMean}`,
      `rb touches ${metrics.nflPositionShape.rbTouchMean}`,
      `wr rec ${metrics.nflPositionShape.wrReceptionMean}`,
      `wr y/t ${metrics.nflPositionShape.wrYardsPerTouchMean}`
    );
  }
  return parts.join(' | ');
}

function formatSeasonAuditLine(audit) {
  const metrics = audit?.metrics || {};
  return [
    `${String(audit?.sport || '').toUpperCase()} ${formatAuditStatus(audit?.failedGuardrails)}`,
    `spread ${metrics.winPctSpread}`,
    `top-bottom gap ${metrics.topBottomWinPctGap}`,
    `playoff strength +${metrics.playoffFieldStrengthEdge}`,
    `elite gap ${metrics.eliteMedianWinPctGap}`,
    `bottom collapse ${metrics.bottomCollapseRate}`,
    `determinism ${metrics.standingsDeterminismRate}`,
    `playoff gap ${metrics.playoffRateGap}`,
    `${metrics.trials} trials`
  ].join(' | ');
}

function formatPackSanityLine(packSanity) {
  const failures = Array.isArray(packSanity?.failures) ? packSanity.failures : [];
  const status = failures.length ? 'FAIL' : 'PASS';
  return `Pack Sanity ${status} | ${Number(packSanity?.packsChecked || 0)} packs checked`;
}

function formatPackQualityRanking(label, packs, valueKey) {
  const topPacks = Array.isArray(packs) ? packs.slice(0, 3) : [];
  if (!topPacks.length) return `- ${label}: no packs`;
  return `- ${label}: ${topPacks.map((pack) => {
    const flags = Array.isArray(pack.flags) && pack.flags.length ? ` [${pack.flags.join('|')}]` : '';
    return `${pack.packId} ${pack[valueKey]}${flags}`;
  }).join(', ')}`;
}

function formatSimulationAccuracySummary(payload) {
  const lines = ['Simulation Accuracy Audit', ''];
  lines.push('Accuracy');
  (payload?.audits || []).forEach((audit) => {
    lines.push(`- ${formatAccuracyAuditLine(audit)}`);
    if (audit.failedGuardrails?.length) {
      audit.failedGuardrails.forEach((failure) => lines.push(`  - ${failure}`));
    }
  });
  if (payload?.seasonRealism) {
    lines.push('', 'Season Realism');
    (payload.seasonRealism.audits || []).forEach((audit) => {
      lines.push(`- ${formatSeasonAuditLine(audit)}`);
      if (audit.failedGuardrails?.length) {
        audit.failedGuardrails.forEach((failure) => lines.push(`  - ${failure}`));
      }
    });
  }
  if (payload?.packSanity) {
    lines.push('', formatPackSanityLine(payload.packSanity));
    (payload.packSanity.failures || []).forEach((failure) => {
      lines.push(`- ${failure.packId}: ${failure.message}`);
    });
  }
  if (payload?.packQuality) {
    lines.push('', 'Pack Quality');
    lines.push(formatPackQualityRanking('zero tail', payload.packQuality.rankings?.zeroFantasyTail, 'zeroFantasyRate'));
    lines.push(formatPackQualityRanking('draft-eligible zero tail', payload.packQuality.rankings?.draftEligibleZeroTail, 'zeroDraftEligibleRate'));
    lines.push(formatPackQualityRanking('zero-game tail', payload.packQuality.rankings?.zeroGameTail, 'zeroGameRate'));
    lines.push(formatPackQualityRanking('fantasy mean', payload.packQuality.rankings?.fantasyMean, 'fantasyMean'));
    lines.push(formatPackQualityRanking('fantasy stdev', payload.packQuality.rankings?.fantasyStdev, 'fantasyStdev'));
    lines.push(formatPackQualityRanking('position concentration', payload.packQuality.rankings?.positionConcentration, 'dominantPositionShare'));
    lines.push(formatPackQualityRanking('productive position concentration', payload.packQuality.rankings?.productivePositionConcentration, 'productiveDominantPositionShare'));
    lines.push(formatPackQualityRanking('top concentration', payload.packQuality.rankings?.topPlayerConcentration, 'topPlayerConcentration'));
  }
  return `${lines.join('\n')}\n`;
}

function hasSimulationAccuracyFailures(payload) {
  return Boolean(
    payload?.failedSports?.length ||
    payload?.seasonRealism?.failedSports?.length ||
    payload?.packSanity?.failedPacks?.length
  );
}

function getSimulationAccuracyAuditHelp() {
  return [
    'Usage: node tools/simulation-accuracy-audit.js [--sport nba|nfl|all] [--season] [--packs] [--json|--summary]',
    '',
    'Default: run NBA and NFL accuracy audits and print JSON.',
    '--sport    Limit audits to one sport.',
    '--season   Include season-long realism metrics.',
    '--packs    Include historical pack sanity checks and quality rankings.',
    '--summary  Print a compact human-readable report.',
    '--json     Print machine-readable JSON.'
  ].join('\n');
}

function runSimulationAccuracyAuditCli(argv = []) {
  const options = parseSimulationAccuracyAuditArgs(argv);
  if (options.help) {
    return {
      payload: null,
      output: `${getSimulationAccuracyAuditHelp()}\n`,
      exitCode: 0
    };
  }
  const payload = buildSimulationAccuracyAuditPayload(options);
  const output = options.outputMode === 'summary'
    ? formatSimulationAccuracySummary(payload)
    : `${JSON.stringify(payload, null, 2)}\n`;
  return {
    payload,
    output,
    exitCode: hasSimulationAccuracyFailures(payload) ? 1 : 0
  };
}

if (require.main === module) {
  try {
    const result = runSimulationAccuracyAuditCli(process.argv.slice(2));
    process.stdout.write(result.output);
    process.exitCode = result.exitCode;
  } catch (error) {
    process.stderr.write(`${error?.message || error}\n`);
    process.stderr.write(`${getSimulationAccuracyAuditHelp()}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  parseSimulationAccuracyAuditArgs,
  runHistoricalPackSanityCheck,
  runHistoricalPackQualityReport,
  runAccuracyAudit,
  runAccuracyAuditSuite,
  runSeasonRealismAudit,
  runSeasonRealismAuditSuite,
  runSimulationAccuracyAuditCli
};
