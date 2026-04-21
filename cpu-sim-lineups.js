(function(global){
  'use strict';

  function clamp(value, min, max){
    const num = Number(value);
    if(!Number.isFinite(num)) return min;
    return Math.min(max, Math.max(min, num));
  }

  function roundScore(value){
    const num = Number(value || 0);
    return Number.isFinite(num) ? Math.round(num * 10) / 10 : 0;
  }

  function getRatings(player){
    return player?.simProfile?.ratings || {};
  }

  function getCpuSimCoreScore(player){
    const ratings = getRatings(player);
    return roundScore(
      Number(ratings.overall || 0) * 100 +
      Number(ratings.usage || 0) * 18 +
      Number(ratings.scoring || 0) * 16 +
      Number(ratings.playmaking || 0) * 12 +
      Number(ratings.defense || 0) * 6 +
      Number(ratings.rebounding || 0) * 6
    );
  }

  function resolveCpuSimCoreSize(sortedPlayers, starterCount){
    if(!Array.isArray(sortedPlayers) || !sortedPlayers.length) return 0;
    const limit = Math.min(Number(starterCount || 5), sortedPlayers.length);
    if(limit <= 2) return limit;
    const second = Number(sortedPlayers[1]?.coreScore || 0);
    const third = Number(sortedPlayers[2]?.coreScore || 0);
    const fourth = Number(sortedPlayers[3]?.coreScore || 0);
    if(third > 0 && second > 0 && third < second * 0.88) return Math.min(2, limit);
    if(limit >= 4 && fourth > 0 && third > 0 && fourth >= third * 0.96) return 4;
    return Math.min(3, limit);
  }

  function isUnavailable(status){
    const label = String(status?.label || '').trim().toUpperCase();
    return label === 'OUT' || label === 'IR' || label === 'SUSP';
  }

  function scoreCpuSimLineupCandidate(player, options){
    const opts = options || {};
    const slot = String(opts.slot || 'UTIL').trim().toUpperCase();
    const day = Number(opts.day || 1) || 1;
    const week = typeof opts.weekForDay === 'function' ? opts.weekForDay(day) : 1;
    const injury = typeof opts.getInjuryStatus === 'function' ? opts.getInjuryStatus(player, week) : null;
    const game = typeof opts.getGameInfo === 'function' ? opts.getGameInfo(player, day) : null;
    const exactPos = String(player?.pos || '').trim().toUpperCase() === slot;
    const canFill = typeof opts.canPlayerFillSlot === 'function'
      ? !!opts.canPlayerFillSlot(player, slot)
      : true;
    if(!canFill) return -999999;
    return roundScore(
      getCpuSimCoreScore(player) +
      (game ? 9000 : -9000) +
      (exactPos ? 180 : 60) +
      (isUnavailable(injury) ? -22000 : injury ? -600 : 0)
    );
  }

  function selectCpuSimCoreStarterIds(options){
    const opts = options || {};
    const sorted = (opts.roster || [])
      .filter(Boolean)
      .map(function(player){
        return {
          player: player,
          coreScore: getCpuSimCoreScore(player)
        };
      })
      .sort(function(a, b){
        return b.coreScore - a.coreScore;
      });
    const size = resolveCpuSimCoreSize(sorted, Number(opts.starterCount || 5));
    return sorted.slice(0, size).map(function(entry){
      return Number(entry.player?.id);
    }).filter(Number.isFinite);
  }

  function normalizeStarterIds(lineupIds, starterCount){
    const count = Math.max(0, Number(starterCount || 5));
    return Array.from({ length: count }, function(_, index){
      return Number(lineupIds?.[index] || 0) || null;
    });
  }

  function buildBaseDailyLineup(options){
    const opts = options || {};
    const slots = Array.isArray(opts.slots) ? opts.slots : [];
    const roster = Array.isArray(opts.roster) ? opts.roster.filter(Boolean) : [];
    const starters = new Array(Math.max(0, Number(opts.starterCount || slots.length || 5))).fill(null);
    const used = new Set();
    const fillOrder = slots.map(function(slot, index){
      return { slot: slot, index: index };
    });
    fillOrder.forEach(function(entry){
      const scored = roster
        .filter(function(player){ return !used.has(Number(player?.id)); })
        .map(function(player){
          return {
            player: player,
            score: scoreCpuSimLineupCandidate(player, {
              day: opts.day,
              slot: entry.slot,
              canPlayerFillSlot: opts.canPlayerFillSlot,
              getGameInfo: opts.getGameInfo,
              getInjuryStatus: opts.getInjuryStatus,
              weekForDay: opts.weekForDay
            })
          };
        })
        .sort(function(a, b){ return b.score - a.score; });
      const winner = scored[0];
      if(winner && winner.score > -999999){
        starters[entry.index] = Number(winner.player.id);
        used.add(Number(winner.player.id));
      }
    });
    return starters;
  }

  function getEligibleStarterSlotIndex(lineupIds, slots, player, canPlayerFillSlot){
    const canFillSlot = typeof canPlayerFillSlot === 'function'
      ? canPlayerFillSlot
      : function(){ return true; };
    for(let index = 0; index < lineupIds.length; index += 1){
      if(lineupIds[index]) continue;
      if(canFillSlot(player, slots[index])) return index;
    }
    return -1;
  }

  function buildCpuSimLineupIds(options){
    const opts = options || {};
    const slots = Array.isArray(opts.slots) ? opts.slots : [];
    const roster = Array.isArray(opts.roster) ? opts.roster.filter(Boolean) : [];
    const starterCount = Math.max(0, Number(opts.starterCount || slots.length || 5));
    const stableThreshold = Number(opts.stableThreshold || 160);
    const lineupIds = buildBaseDailyLineup(opts);
    const coreIds = selectCpuSimCoreStarterIds({
      roster: roster,
      starterCount: starterCount
    });

    coreIds.forEach(function(coreId){
      if(lineupIds.includes(coreId)) return;
      const player = roster.find(function(entry){ return Number(entry?.id) === Number(coreId); });
      if(!player) return;
      const injury = typeof opts.getInjuryStatus === 'function'
        ? opts.getInjuryStatus(player, typeof opts.weekForDay === 'function' ? opts.weekForDay(opts.day) : 1)
        : null;
      const game = typeof opts.getGameInfo === 'function' ? opts.getGameInfo(player, opts.day) : null;
      if(!game || isUnavailable(injury)) return;

      let weakestIndex = -1;
      let weakestScore = Number.POSITIVE_INFINITY;
      for(let index = 0; index < lineupIds.length; index += 1){
        const starterId = lineupIds[index];
        const starter = roster.find(function(entry){ return Number(entry?.id) === Number(starterId); });
        if(!starter) continue;
        if(typeof opts.canPlayerFillSlot === 'function' && !opts.canPlayerFillSlot(player, slots[index])) continue;
        const starterScore = scoreCpuSimLineupCandidate(starter, {
          day: opts.day,
          slot: slots[index],
          canPlayerFillSlot: opts.canPlayerFillSlot,
          getGameInfo: opts.getGameInfo,
          getInjuryStatus: opts.getInjuryStatus,
          weekForDay: opts.weekForDay
        });
        if(starterScore < weakestScore){
          weakestScore = starterScore;
          weakestIndex = index;
        }
      }

      if(weakestIndex < 0){
        const emptyIndex = getEligibleStarterSlotIndex(lineupIds, slots, player, opts.canPlayerFillSlot);
        if(emptyIndex >= 0) lineupIds[emptyIndex] = Number(player.id);
        return;
      }

      const coreScore = scoreCpuSimLineupCandidate(player, {
        day: opts.day,
        slot: slots[weakestIndex],
        canPlayerFillSlot: opts.canPlayerFillSlot,
        getGameInfo: opts.getGameInfo,
        getInjuryStatus: opts.getInjuryStatus,
        weekForDay: opts.weekForDay
      });
      if(coreScore + stableThreshold >= weakestScore){
        lineupIds[weakestIndex] = Number(player.id);
      }
    });

    return normalizeStarterIds(lineupIds, starterCount);
  }

  const api = {
    scoreCpuSimLineupCandidate: scoreCpuSimLineupCandidate,
    selectCpuSimCoreStarterIds: selectCpuSimCoreStarterIds,
    buildCpuSimLineupIds: buildCpuSimLineupIds
  };

  global.RosterBateCpuSimLineups = api;
  if(typeof module !== 'undefined' && module.exports){
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
