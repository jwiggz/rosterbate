(function (global) {
  'use strict';

  const PERSONALITIES = ['balanced', 'star_loyalist', 'steady_floor', 'bigs_bias', 'guards_bias'];
  const NON_STAR_PERSONALITIES = ['balanced', 'steady_floor', 'bigs_bias', 'guards_bias'];

  function toNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  }

  function normalizePersonality(value) {
    const personality = String(value || '').trim().toLowerCase();
    return PERSONALITIES.includes(personality) ? personality : 'balanced';
  }

  function getRatings(player) {
    return player?.simProfile?.ratings || {};
  }

  function getPosGroup(player) {
    const pos = String(player?.pos || '').trim().toUpperCase();
    if (pos === 'PG' || pos === 'SG' || pos === 'G') return 'guard';
    if (pos === 'SF' || pos === 'PF' || pos === 'F') return 'frontcourt';
    if (pos === 'C') return 'center';
    return 'other';
  }

  function getStarSignal(player) {
    const ratings = getRatings(player);
    return (
      toNumber(ratings.overall) * 100 +
      toNumber(ratings.usage) * 35 +
      toNumber(ratings.scoring) * 16 +
      toNumber(ratings.playmaking) * 14 +
      toNumber(ratings.defense) * 8 +
      toNumber(ratings.rebounding) * 8
    );
  }

  function getRosterSummary(roster) {
    const players = Array.isArray(roster) ? roster.filter(Boolean) : [];
    return players.reduce(function (summary, player, index) {
      const ratings = getRatings(player);
      const overall = toNumber(ratings.overall);
      const usage = toNumber(ratings.usage);
      const scoring = toNumber(ratings.scoring);
      const playmaking = toNumber(ratings.playmaking);
      const defense = toNumber(ratings.defense);
      const rebounding = toNumber(ratings.rebounding);
      const starSignal = getStarSignal(player);

      summary.playerCount += 1;
      summary.topStarSignal = Math.max(summary.topStarSignal, starSignal);
      summary.topOverall = Math.max(summary.topOverall, overall);
      summary.topUsage = Math.max(summary.topUsage, usage);
      summary.totalOverall += overall;
      summary.totalUsage += usage;
      summary.totalScoring += scoring;
      summary.totalPlaymaking += playmaking;
      summary.totalDefense += defense;
      summary.totalRebounding += rebounding;
      summary.shapeScore += scoring + playmaking + defense + rebounding;

      if (getPosGroup(player) === 'guard') {
        summary.guardLean += usage * 2 + scoring * 3 + playmaking * 4;
      } else if (getPosGroup(player) === 'frontcourt' || getPosGroup(player) === 'center') {
        summary.bigLean += defense * 3 + rebounding * 4 + overall;
      }

      summary.signature = (summary.signature + Math.round(starSignal) + index * 17) % 2147483647;
      return summary;
    }, {
      playerCount: 0,
      topStarSignal: 0,
      topOverall: 0,
      topUsage: 0,
      totalOverall: 0,
      totalUsage: 0,
      totalScoring: 0,
      totalPlaymaking: 0,
      totalDefense: 0,
      totalRebounding: 0,
      shapeScore: 0,
      guardLean: 0,
      bigLean: 0,
      signature: 0
    });
  }

  function hashSeed(value) {
    const text = String(value || '');
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function chooseBaselinePersonality(teamIdx, summary) {
    const seed = [
      teamIdx,
      summary.signature,
      Math.round(summary.topStarSignal / 100),
      Math.round(summary.shapeScore / 10),
      Math.round(summary.guardLean / 10),
      Math.round(summary.bigLean / 10)
    ].join('|');
    const bucket = hashSeed(seed) % NON_STAR_PERSONALITIES.length;
    return NON_STAR_PERSONALITIES[bucket];
  }

  function buildCpuSimPersonalitiesByTeam(options) {
    const opts = options || {};
    const teamCount = Math.max(0, Math.floor(toNumber(opts.teamCount)));
    const myPos = Math.max(0, Math.floor(toNumber(opts.myPos)));
    const rosters = Array.isArray(opts.rosters) ? opts.rosters : [];

    return Array.from({ length: teamCount }, function (_, teamIdx) {
      if (teamIdx === myPos) {
        return 'balanced';
      }

      const summary = getRosterSummary(rosters[teamIdx]);
      if (
        summary.topStarSignal >= 14200 ||
        (summary.topOverall >= 90 && summary.topUsage >= 88)
      ) {
        return 'star_loyalist';
      }

      if (summary.bigLean >= summary.guardLean + 55) {
        return 'bigs_bias';
      }

      if (summary.guardLean >= summary.bigLean + 55) {
        return 'guards_bias';
      }

      const averageShape = summary.playerCount > 0 ? summary.shapeScore / summary.playerCount : 0;
      if (averageShape >= 250 && Math.abs(summary.bigLean - summary.guardLean) <= 80) {
        return 'steady_floor';
      }

      return chooseBaselinePersonality(teamIdx, summary);
    });
  }

  function getCpuSimTeamPersonality(teamIdx, personalitiesByTeam) {
    const index = Math.max(0, Math.floor(toNumber(teamIdx)));
    const value = Array.isArray(personalitiesByTeam) ? personalitiesByTeam[index] : null;
    return normalizePersonality(value);
  }

  function getCpuSimPersonalityBias(player, personality) {
    const ratings = getRatings(player);
    const posGroup = getPosGroup(player);
    const resolved = normalizePersonality(personality);

    if (resolved === 'star_loyalist') {
      return (
        toNumber(ratings.overall) * 18 +
        toNumber(ratings.usage) * 10 +
        toNumber(ratings.scoring) * 6 +
        toNumber(ratings.playmaking) * 4
      );
    }

    if (resolved === 'steady_floor') {
      return (
        toNumber(ratings.defense) * 10 +
        toNumber(ratings.rebounding) * 10 +
        toNumber(ratings.playmaking) * 6 +
        toNumber(ratings.overall) * 4
      );
    }

    if (resolved === 'bigs_bias') {
      return (
        (posGroup === 'frontcourt' || posGroup === 'center' ? 180 : 0) +
        toNumber(ratings.rebounding) * 12 +
        toNumber(ratings.defense) * 8 +
        toNumber(ratings.overall) * 2
      );
    }

    if (resolved === 'guards_bias') {
      return (
        (posGroup === 'guard' ? 180 : 0) +
        toNumber(ratings.scoring) * 10 +
        toNumber(ratings.playmaking) * 12 +
        toNumber(ratings.usage) * 4
      );
    }

    return 0;
  }

  function getCpuSimStableThresholdDelta(player, personality) {
    const ratings = getRatings(player);
    const resolved = normalizePersonality(personality);

    if (resolved === 'star_loyalist') {
      return Math.round(
        Math.max(0, toNumber(ratings.overall) - 78) * 2 +
        Math.max(0, toNumber(ratings.usage) - 72) * 1.5 +
        Math.max(0, toNumber(ratings.scoring) - 72)
      );
    }

    if (resolved === 'steady_floor') {
      const allAround =
        (toNumber(ratings.defense) + toNumber(ratings.rebounding) + toNumber(ratings.playmaking)) / 3;
      return Math.round(Math.max(0, allAround - 70) * 1.5);
    }

    return 0;
  }

  const api = {
    buildCpuSimPersonalitiesByTeam: buildCpuSimPersonalitiesByTeam,
    getCpuSimTeamPersonality: getCpuSimTeamPersonality,
    getCpuSimPersonalityBias: getCpuSimPersonalityBias,
    getCpuSimStableThresholdDelta: getCpuSimStableThresholdDelta
  };

  global.RosterBateCpuSimPersonalities = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
