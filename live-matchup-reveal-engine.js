(function(root, factory){
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RosterBateLiveRevealEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function(){
  'use strict';

  function clamp(value, min, max){
    const num = Number(value);
    if (!Number.isFinite(num)) return min;
    return Math.min(max, Math.max(min, num));
  }

  function round(value){
    const num = Number(value || 0);
    return Number.isFinite(num) ? Math.round(num * 100) / 100 : 0;
  }

  function statNumber(stats, keys){
    const source = stats && typeof stats === 'object' ? stats : {};
    for (const key of keys) {
      if (source[key] != null && Number.isFinite(Number(source[key]))) return Number(source[key]);
      const lower = String(key).toLowerCase();
      if (source[lower] != null && Number.isFinite(Number(source[lower]))) return Number(source[lower]);
      const upper = String(key).toUpperCase();
      if (source[upper] != null && Number.isFinite(Number(source[upper]))) return Number(source[upper]);
    }
    return 0;
  }

  function normalizeStats(stats){
    return {
      pts: statNumber(stats, ['pts', 'points', 'PTS']),
      reb: statNumber(stats, ['reb', 'rebounds', 'REB']),
      ast: statNumber(stats, ['ast', 'assists', 'AST']),
      stl: statNumber(stats, ['stl', 'steals', 'STL']),
      blk: statNumber(stats, ['blk', 'blocks', 'BLK']),
      to: statNumber(stats, ['to', 'tov', 'turnovers', 'TO']),
      threes: statNumber(stats, ['threes', '3PM', 'tpm', 'threePointers'])
    };
  }

  function playerName(player){
    return String(player?.name || 'Player');
  }

  function splitValue(total, count, minChunk){
    const target = round(total);
    const cleanCount = Math.max(1, Math.round(Number(count || 1)));
    const chunks = [];
    let remaining = target;
    for (let index = 0; index < cleanCount; index += 1) {
      const slotsLeft = cleanCount - index;
      let chunk = slotsLeft <= 1 ? remaining : remaining / slotsLeft;
      const swing = 0.86 + ((index % 3) * 0.08);
      chunk = round(chunk * swing);
      const floor = Math.min(Math.abs(remaining), Number(minChunk || 0));
      if (target >= 0) chunk = Math.max(floor, chunk);
      chunk = round(Math.min(Math.abs(remaining), Math.abs(chunk)) * (target < 0 ? -1 : 1));
      remaining = round(remaining - chunk);
      if (Math.abs(chunk) >= 0.05) chunks.push(chunk);
    }
    if (Math.abs(remaining) >= 0.05) chunks.push(remaining);
    return chunks;
  }

  function addEvent(events, player, statType, fpGain, text, weight){
    const cleanGain = round(fpGain);
    if (Math.abs(cleanGain) < 0.1) return;
    events.push({
      player,
      statType,
      fpGain: cleanGain,
      text,
      weight: Number(weight || 1) || 1
    });
  }

  function buildFallbackPlayerEvents(player, targetFp){
    const name = playerName(player);
    const count = clamp(Math.round(Number(targetFp || 0) / 4.6), 4, 12);
    return splitValue(targetFp, count, 1).map(function(fpGain, index){
      return {
        player,
        statType: 'fantasy',
        fpGain,
        text: [
          `${name} cashes in`,
          `${name} creates separation`,
          `${name} keeps the box score moving`,
          `${name} adds another fantasy play`
        ][index % 4],
        weight: 1
      };
    });
  }

  function buildPlayerStatEvents(player){
    const targetFp = Math.max(0, Number(player?._targetFp ?? player?.finalScore ?? player?.fp ?? 0) || 0);
    if (targetFp <= 0.05) return [];
    const stats = normalizeStats(player?.statValues || player?.simulatedStats || {});
    const statTotal =
      stats.pts +
      stats.reb * 1.2 +
      stats.ast * 1.5 +
      stats.stl * 3 +
      stats.blk * 3 -
      stats.to;
    if (Math.abs(statTotal) < 0.1) return buildFallbackPlayerEvents(player, targetFp);

    const name = playerName(player);
    const events = [];

    const scoringCount = stats.pts > 0.5 ? clamp(Math.round(stats.pts / 4.1), 2, 8) : 0;
    splitValue(stats.pts, scoringCount, 1.2).forEach(function(fpGain, index){
      const likelyThree = stats.threes > 0.4 && index < Math.round(stats.threes);
      addEvent(
        events,
        player,
        'pts',
        fpGain,
        likelyThree ? `${name} hits from deep` : (index % 3 === 0 ? `${name} gets downhill` : `${name} scores in rhythm`),
        1.2
      );
    });

    const reboundCount = stats.reb > 0.5 ? clamp(Math.round(stats.reb / 2.8), 1, 5) : 0;
    splitValue(stats.reb * 1.2, reboundCount, 0.8).forEach(function(fpGain, index){
      addEvent(events, player, 'reb', fpGain, index % 3 === 0 ? `${name} controls the glass` : `${name} secures the board`, 0.9);
    });

    const assistCount = stats.ast > 0.5 ? clamp(Math.round(stats.ast / 2.4), 1, 5) : 0;
    splitValue(stats.ast * 1.5, assistCount, 1).forEach(function(fpGain, index){
      addEvent(events, player, 'ast', fpGain, index % 2 === 0 ? `${name} sets up a bucket` : `${name} keeps the offense humming`, 1);
    });

    const stealCount = stats.stl > 0.3 ? clamp(Math.round(stats.stl), 1, 4) : 0;
    splitValue(stats.stl * 3, stealCount, 1.5).forEach(function(fpGain){
      addEvent(events, player, 'stl', fpGain, `${name} jumps the passing lane`, 1.1);
    });

    const blockCount = stats.blk > 0.3 ? clamp(Math.round(stats.blk), 1, 4) : 0;
    splitValue(stats.blk * 3, blockCount, 1.5).forEach(function(fpGain){
      addEvent(events, player, 'blk', fpGain, `${name} erases one at the rim`, 1.1);
    });

    const turnoverCount = stats.to > 0.4 ? clamp(Math.round(stats.to / 1.8), 1, 3) : 0;
    splitValue(-stats.to, turnoverCount, 0.5).forEach(function(fpGain){
      addEvent(events, player, 'to', fpGain, `${name} gives it away`, 0.7);
    });

    reconcilePlayerEvents(events, player, targetFp);
    if (!events.length) return buildFallbackPlayerEvents(player, targetFp);
    return events;
  }

  function reconcilePlayerEvents(events, player, targetFp){
    const currentTotal = round(events.reduce(function(sum, event){ return sum + Number(event.fpGain || 0); }, 0));
    let diff = round(Number(targetFp || 0) - currentTotal);
    if (Math.abs(diff) < 0.1) return;
    if (diff < 0) {
      const positive = events
        .filter(function(event){ return Number(event.fpGain || 0) > Math.abs(diff) + 0.2; })
        .sort(function(a, b){ return Number(b.fpGain || 0) - Number(a.fpGain || 0); })[0];
      if (positive) {
        positive.fpGain = round(Number(positive.fpGain || 0) + diff);
        return;
      }
    }
    addEvent(events, player, diff > 0 ? 'bonus' : 'adjustment', diff, `${playerName(player)} adds late box-score value`, 0.6);
  }

  function assignEventSequence(events, playerIndex, playerCount){
    const total = events.length;
    if (!total) return events;
    return events.map(function(event, index){
      const spread = total <= 1 ? 0.5 : index / (total - 1);
      const quarter = clamp(Math.floor(spread * 4) + 1, 1, 4);
      const withinQuarter = spread * 4 - Math.floor(spread * 4);
      const playerOffset = ((playerIndex + 1) / Math.max(1, playerCount + 1)) * 0.18;
      return {
        ...event,
        quarter,
        half: quarter <= 2 ? 'first' : 'second',
        sequence: round((quarter - 1) * 100 + withinQuarter * 100 + playerOffset * 100 + Number(event.weight || 1))
      };
    });
  }

  function reconcileTeamScoreGain(events, scoreTarget){
    const currentScore = round(events.reduce(function(sum, event){ return sum + Number(event.scoreGain || 0); }, 0));
    const diff = round(Number(scoreTarget || 0) - currentScore);
    if (Math.abs(diff) < 0.05 || !events.length) return events;
    const adjustable = events
      .slice()
      .reverse()
      .find(function(event){ return Math.abs(Number(event.scoreGain || 0)) >= 0.1; }) || events[events.length - 1];
    adjustable.scoreGain = round(Number(adjustable.scoreGain || 0) + diff);
    return events;
  }

  function buildLiveRevealEvents(players, side, scoreTarget){
    const safePlayers = Array.isArray(players) ? players : [];
    const totalFp = safePlayers.reduce(function(sum, player){
      return sum + Math.max(0, Number(player?._targetFp ?? player?.finalScore ?? player?.fp ?? 0) || 0);
    }, 0) || 1;
    const events = [];
    safePlayers.forEach(function(player, playerIndex){
      const playerEvents = assignEventSequence(buildPlayerStatEvents(player), playerIndex, safePlayers.length);
      playerEvents.forEach(function(event){
        const scoreGain = Number(scoreTarget || 0) * (Number(event.fpGain || 0) / totalFp);
        events.push({
          ...event,
          side,
          scoreGain: round(scoreGain)
        });
      });
    });
    events.sort(function(a, b){
      return Number(a.sequence || 0) - Number(b.sequence || 0);
    });
    return reconcileTeamScoreGain(events, scoreTarget);
  }

  function splitLiveRevealEventsByHalf(events){
    const cleanEvents = (Array.isArray(events) ? events : []).filter(function(event){
      return Math.abs(Number(event?.fpGain || 0)) >= 0.1;
    });
    if (cleanEvents.length <= 1) return { first: cleanEvents, second: [] };
    const first = cleanEvents.filter(function(event){ return Number(event?.quarter || 0) <= 2; });
    const second = cleanEvents.filter(function(event){ return Number(event?.quarter || 0) > 2; });
    if (first.length && second.length) return { first, second };
    const firstCount = Math.min(cleanEvents.length - 1, Math.max(1, Math.floor(cleanEvents.length * 0.48)));
    return {
      first: cleanEvents.slice(0, firstCount),
      second: cleanEvents.slice(firstCount)
    };
  }

  function interleaveLiveRevealHalfEvents(firstSideEvents, secondSideEvents){
    const a = (Array.isArray(firstSideEvents) ? firstSideEvents : []).slice().sort(function(left, right){
      return Number(left.sequence || 0) - Number(right.sequence || 0);
    });
    const b = (Array.isArray(secondSideEvents) ? secondSideEvents : []).slice().sort(function(left, right){
      return Number(left.sequence || 0) - Number(right.sequence || 0);
    });
    const result = [];
    let ai = 0;
    let bi = 0;
    let lastSide = '';
    let run = 0;
    while (ai < a.length || bi < b.length) {
      const canA = ai < a.length;
      const canB = bi < b.length;
      let chooseA = canA && !canB;
      if (canA && canB) {
        const aProgress = ai / Math.max(1, a.length);
        const bProgress = bi / Math.max(1, b.length);
        chooseA = aProgress <= bProgress;
        if (run >= 3 && lastSide === a[ai].side) chooseA = false;
        if (run >= 3 && lastSide === b[bi].side) chooseA = true;
      }
      const event = chooseA ? a[ai++] : b[bi++];
      if (!event) continue;
      run = event.side === lastSide ? run + 1 : 1;
      lastSide = event.side;
      result.push(event);
    }
    return result;
  }

  return {
    buildLiveRevealEvents,
    splitLiveRevealEventsByHalf,
    interleaveLiveRevealHalfEvents,
    normalizeStats,
    buildPlayerStatEvents
  };
});
