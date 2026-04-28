(function(global){
  'use strict';

  const ENGINE_VERSION='2026-04-19-sim-mvp-v3';
  const nfl2014ScheduleHelpers=typeof require==='function' && typeof module!=='undefined' && module.exports
    ? require('./simulation-nfl-2014-schedule.js')
    : global.RosterBateNfl2014Schedule || null;
  const simulationRuntimeApi=typeof require==='function' && typeof module!=='undefined' && module.exports
    ? require('./simulation-mode-runtime.js')
    : global.RosterBateSimulationModeRuntime || null;
  const DEFAULT_PACK_TUNING={
    pace:1,
    variance:1,
    threeBoost:1,
    assistBoost:1,
    reboundTilt:1,
    defenseTightness:1
  };
  const PACK_TUNING={
    nba_1996_full_season_v1:{
      pace:0.97,
      variance:0.94,
      threeBoost:0.84,
      assistBoost:0.95,
      reboundTilt:1.05,
      defenseTightness:1.03
    },
    nba_2016_full_season_v1:{
      pace:1.03,
      variance:1.04,
      threeBoost:1.08,
      assistBoost:1.04,
      reboundTilt:0.97,
      defenseTightness:0.98
    }
  };
  const DEFAULT_ERA_CONTEXT={
    eraLabel:'default',
    fantasyBaseline:38,
    fantasyInflation:1,
    scoringInflation:1,
    playmakingInflation:1,
    spacingInflation:1,
    reboundingInflation:1,
    defenseEventInflation:1,
    tempoInflation:1,
    dominanceWeight:0.12
  };
  const PACK_ERA_CONTEXT={
    nba_1996_full_season_v1:{
      eraLabel:'1995-96',
      fantasyBaseline:39.2,
      fantasyInflation:1,
      scoringInflation:1,
      playmakingInflation:1,
      spacingInflation:0.96,
      reboundingInflation:1.01,
      defenseEventInflation:1.02,
      tempoInflation:0.99,
      dominanceWeight:0.07
    },
    nba_2016_full_season_v1:{
      eraLabel:'2015-16',
      fantasyBaseline:38.9,
      fantasyInflation:1.03,
      scoringInflation:1.03,
      playmakingInflation:1.02,
      spacingInflation:1.12,
      reboundingInflation:0.99,
      defenseEventInflation:0.97,
      tempoInflation:1.02,
      dominanceWeight:0.11
    }
  };

  function clamp(value,min,max){
    const num=Number(value);
    if(!Number.isFinite(num)) return min;
    return Math.min(max, Math.max(min, num));
  }

  function roundStat(value){
    const num=Number(value||0);
    return Number.isFinite(num) ? Math.round(num*10)/10 : 0;
  }

  function roundHundredth(value){
    const num=Number(value||0);
    return Number.isFinite(num) ? Math.round(num*100)/100 : 0;
  }

  function roundThousandth(value){
    const num=Number(value||0);
    return Number.isFinite(num) ? Math.round(num*1000)/1000 : 0;
  }

  function safeClone(value){
    try{
      return JSON.parse(JSON.stringify(value));
    }catch(e){
      return null;
    }
  }

  function hashString(input){
    const text=String(input||'');
    let hash=2166136261;
    for(let index=0; index<text.length; index+=1){
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function mulberry32(seed){
    let t=seed >>> 0;
    return function(){
      t += 0x6D2B79F5;
      let r=Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }

  function normalish(rng){
    let total=0;
    for(let index=0; index<6; index+=1) total += rng();
    return (total - 3) / 1.5;
  }

  function getPackTuning(packId){
    return Object.assign({}, DEFAULT_PACK_TUNING, PACK_TUNING[String(packId||'').trim()] || {});
  }

  function getPackEraContext(packId){
    return Object.assign({}, DEFAULT_ERA_CONTEXT, PACK_ERA_CONTEXT[String(packId||'').trim()] || {});
  }

  function getSimulationSport(state){
    const explicitSport=String(state?.sport || state?.leagueShell?.sport || '').trim().toLowerCase();
    if(explicitSport) return explicitSport;
    return String(state?.simulationMode || '').trim().toLowerCase().indexOf('nfl_')===0 ? 'nfl' : 'nba';
  }

  function getSimulationStarterCount(state){
    return getSimulationSport(state)==='nfl' ? 9 : 5;
  }

  function getSimulationStarterSlotsForState(state){
    return getSimulationSport(state)==='nfl'
      ? ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'DST', 'K']
      : ['PG', 'SG', 'SF', 'PF', 'C'];
  }

  function getSimulationPlayerPosition(player){
    const normalizedPosition=String(player?.pos || player?.primaryPosition || '').trim().toUpperCase();
    if(normalizedPosition==='DEF') return 'DST';
    if(normalizedPosition==='PK') return 'K';
    return normalizedPosition;
  }

  function isSimulationPlayerEligibleForSlot(player, slot, state){
    if(getSimulationSport(state)!=='nfl') return true;
    const normalizedSlot=String(slot || '').trim().toUpperCase();
    const position=getSimulationPlayerPosition(player);
    if(simulationRuntimeApi && typeof simulationRuntimeApi.getNflSlotEligibilityMap==='function'){
      const eligibilityMap=simulationRuntimeApi.getNflSlotEligibilityMap();
      if(Array.isArray(eligibilityMap?.[normalizedSlot])){
        return eligibilityMap[normalizedSlot].includes(position);
      }
    }
    if(normalizedSlot==='FLEX'){
      return ['RB', 'WR', 'TE', 'FLEX'].includes(position);
    }
    if(/^RB\d+$/.test(normalizedSlot)) return position==='RB';
    if(/^WR\d+$/.test(normalizedSlot)) return position==='WR';
    return position===normalizedSlot;
  }

  function getControlledSimulationTeamAbbr(state){
    return String(state?.draftState?.controlledTeamAbbr || '').trim().toUpperCase();
  }

  function getNflStarterSlotOrder(){
    if(simulationRuntimeApi && typeof simulationRuntimeApi.getSimulationStarterSlots==='function'){
      return simulationRuntimeApi.getSimulationStarterSlots({ sport:'nfl' });
    }
    return ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE', 'FLEX', 'K', 'DST'];
  }

  function normalizeRequestedNflLineupSlots(lineupSlots){
    if(simulationRuntimeApi && typeof simulationRuntimeApi.normalizeSimulationLineupSlots==='function'){
      return simulationRuntimeApi.normalizeSimulationLineupSlots({ sport:'nfl' }, lineupSlots);
    }
    return getNflStarterSlotOrder().reduce(function(normalized, slot){
      const value=lineupSlots && typeof lineupSlots==='object' ? lineupSlots[slot] : null;
      normalized[slot]=value == null || value === '' ? null : Number(value);
      return normalized;
    }, {});
  }

  function buildExactNflSlotStarters(roster, lineupSlots){
    const availableById=new Map((Array.isArray(roster) ? roster : []).map(function(player){
      return [Number(player?.id), player];
    }));
    const starters=[];
    const usedIds=new Set();
    const normalizedSlots=normalizeRequestedNflLineupSlots(lineupSlots);
    getNflStarterSlotOrder().forEach(function(slot){
      const playerId=Number(normalizedSlots?.[slot]);
      if(!Number.isFinite(playerId) || playerId <= 0 || usedIds.has(playerId)) return;
      const player=availableById.get(playerId);
      if(!player || isUnavailableForSimulation(player)) return;
      if(!isSimulationPlayerEligibleForSlot(player, slot, { sport:'nfl' })) return;
      starters.push(player);
      usedIds.add(playerId);
    });
    return starters;
  }

  function takeFirstEligibleSimulationStarter(players, slot, state){
    const index=(Array.isArray(players) ? players : []).findIndex(function(player){
      return isSimulationPlayerEligibleForSlot(player, slot, state);
    });
    if(index < 0) return null;
    return players.splice(index, 1)[0] || null;
  }

  function getLowGamesMixedEraConfidence(gp){
    const games=clamp(gp, 0, 82);
    if(games >= 25) return 1;
    return roundHundredth(clamp(0.72 + (games / 25) * 0.28, 0.72, 1));
  }

  function getNestedNumber(source, path){
    let current=source;
    for(let index=0; index<path.length; index+=1){
      if(!(current && typeof current==='object')) return null;
      current=current[path[index]];
    }
    const num=Number(current);
    return Number.isFinite(num) ? num : null;
  }

  function getPlayerStat(player, key){
    const directMap={
      pts:['pts'],
      reb:['reb'],
      ast:['ast'],
      stl:['stl'],
      blk:['blk'],
      to:['to'],
      min:['min'],
      fgm:['fgm'],
      fga:['fga'],
      ftm:['ftm'],
      fta:['fta'],
      threes:['tpm']
    };
    const statMap={
      pts:['PTS'],
      reb:['REB'],
      ast:['AST'],
      stl:['STL'],
      blk:['BLK'],
      to:['TO'],
      min:['MIN'],
      fgm:['FGM'],
      fga:['FGA'],
      ftm:['FTM'],
      fta:['FTA'],
      threes:['3PM']
    };
    const directKeys=directMap[key] || [];
    for(let index=0; index<directKeys.length; index+=1){
      const num=Number(player?.[directKeys[index]]);
      if(Number.isFinite(num)) return num;
    }
    const statKeys=statMap[key] || [];
    for(let index=0; index<statKeys.length; index+=1){
      const num=Number(player?.statValues?.[statKeys[index]]);
      if(Number.isFinite(num)) return num;
    }
    const seasonValue=getNestedNumber(player, ['seasonStats','perGame', key]);
    if(Number.isFinite(seasonValue)) return seasonValue;
    return 0;
  }

  function getPlayerGamesPlayed(player){
    const direct=Number(
      player?.gp ??
      player?.statValues?.GP ??
      player?.seasonStats?.games ??
      0
    );
    return Number.isFinite(direct) ? Math.max(0, direct) : 0;
  }

  function getPlayerTotalFantasyPoints(player){
    const explicit=Number(
      player?.totalFantasyPoints ??
      player?.statValues?.TFP ??
      player?.seasonStats?.totals?.tfp ??
      0
    );
    return Number.isFinite(explicit) ? explicit : 0;
  }

  function deriveBaseline(player){
    return {
      pts:roundStat(getPlayerStat(player,'pts')),
      reb:roundStat(getPlayerStat(player,'reb')),
      ast:roundStat(getPlayerStat(player,'ast')),
      stl:roundStat(getPlayerStat(player,'stl')),
      blk:roundStat(getPlayerStat(player,'blk')),
      to:roundStat(getPlayerStat(player,'to')),
      min:roundStat(getPlayerStat(player,'min')),
      fgm:roundStat(getPlayerStat(player,'fgm')),
      fga:roundStat(getPlayerStat(player,'fga')),
      ftm:roundStat(getPlayerStat(player,'ftm')),
      fta:roundStat(getPlayerStat(player,'fta')),
      threes:roundStat(getPlayerStat(player,'threes'))
    };
  }

  function detectArchetype(player, baseline){
    const pos=String(player?.pos || player?.primaryPosition || '').toUpperCase();
    if((baseline.blk >= 2.1 && baseline.reb >= 8) || (pos==='C' && baseline.blk >= 1.6)) return 'rim_anchor';
    if(baseline.ast >= 7.5) return 'engine_guard';
    if(baseline.threes >= 2.6 && baseline.pts >= 18) return 'perimeter_bombardier';
    if((pos==='F' || pos==='SF' || pos==='PF') && baseline.threes >= 1.4 && baseline.stl + baseline.blk >= 1.9) return 'three_and_d_wing';
    if(baseline.reb >= 9.5 && baseline.ast >= 4.5) return 'point_forward';
    if(baseline.pts >= 24) return 'primary_scorer';
    if(baseline.reb >= 10) return 'glass_cleaner';
    if(baseline.stl + baseline.blk >= 3.2) return 'defensive_event_creator';
    return 'balanced_rotation';
  }

  function getOlderEraInteriorScore(baseline){
    var rebounding = clamp((baseline.reb - 8) / 5, 0, 1);
    var rimProtection = clamp((baseline.blk - 1.1) / 1.6, 0, 1);
    var defenseEvents = clamp(((baseline.stl + baseline.blk) - 2.6) / 1.8, 0, 1);
    var interiorScoring = clamp((baseline.pts - baseline.threes * 2.5 - 14) / 12, 0, 1);
    var spacingPenalty = clamp((1.4 - baseline.threes) / 1.4, 0, 1);
    var playmakingOffset = clamp((baseline.ast - 4) / 4, 0, 1) * 0.18;
    return roundHundredth(
      clamp(
        rebounding * 0.28 +
        rimProtection * 0.22 +
        defenseEvents * 0.16 +
        interiorScoring * 0.16 +
        spacingPenalty * 0.18 -
        playmakingOffset,
        0,
        1
      )
    );
  }

  function getModernSpacingHybridScore(baseline){
    var spacing = clamp((baseline.threes - 1.1) / 2.8, 0, 1);
    var playmaking = clamp((baseline.ast - 2.8) / 4.8, 0, 1);
    var scoring = clamp((baseline.pts - 15) / 12, 0, 1);
    var hybridRebounding = clamp((baseline.reb - 5.0) / 4.5, 0, 1);
    var hybridRimValue = clamp((baseline.blk - 0.7) / 1.4, 0, 1);
    return roundHundredth(
      clamp(
        spacing * 0.33 +
        playmaking * 0.25 +
        scoring * 0.18 +
        hybridRebounding * 0.16 +
        hybridRimValue * 0.08,
        0,
        1
      )
    );
  }

  function getPremiumTierGate(overall, floor, ceiling){
    return roundHundredth(
      clamp((overall - floor) / Math.max(1, ceiling - floor), 0, 1)
    );
  }

  function buildMixedEraRatings(rawRatings, baseline, totalFantasyPoints, gp, packId){
    const eraContext=getPackEraContext(packId);
    const fantasyPerGame = gp > 0 && totalFantasyPoints > 0
      ? totalFantasyPoints / gp
      : computeFantasyPoints(baseline);
    const dominance = clamp((fantasyPerGame / Math.max(1, eraContext.fantasyBaseline)) - 1, -0.28, 0.72);
    const dominanceLift = 1 + dominance * Number(eraContext.dominanceWeight || 0.12);
    const lowGamesConfidence=getLowGamesMixedEraConfidence(gp);
    const inverse=function(key, floor, ceiling){
      return clamp(1 / Math.max(0.7, Number(eraContext[key] || 1)), floor, ceiling);
    };
    const shootingContextBoost = clamp(0.88 + inverse('spacingInflation', 0.88, 1.18) * 0.18, 0.92, 1.1);
    const adjusted={
      usage:roundStat(clamp(rawRatings.usage * clamp(inverse('fantasyInflation', 0.94, 1.12) * 0.24 + 0.76, 0.95, 1.08) * dominanceLift, 20, 99)),
      scoring:roundStat(clamp(rawRatings.scoring * inverse('scoringInflation', 0.92, 1.14) * dominanceLift, 20, 99)),
      rebounding:roundStat(clamp(rawRatings.rebounding * inverse('reboundingInflation', 0.94, 1.08) * (1 + dominance * 0.04), 20, 99)),
      playmaking:roundStat(clamp(rawRatings.playmaking * inverse('playmakingInflation', 0.93, 1.12) * (1 + dominance * 0.07), 20, 99)),
      defense:roundStat(clamp(rawRatings.defense * inverse('defenseEventInflation', 0.94, 1.08) * (1 + dominance * 0.05), 20, 99)),
      shooting:roundStat(clamp(rawRatings.shooting * shootingContextBoost * (1 + dominance * 0.05), 20, 99)),
      stamina:roundStat(rawRatings.stamina),
      tempo:roundStat(clamp(rawRatings.tempo * inverse('tempoInflation', 0.94, 1.1), 20, 99)),
      volatility:roundStat(rawRatings.volatility)
    };
    const adjustedOverall=roundStat(
      adjusted.scoring * 0.28 +
      adjusted.rebounding * 0.16 +
      adjusted.playmaking * 0.18 +
      adjusted.defense * 0.15 +
      adjusted.shooting * 0.11 +
      adjusted.stamina * 0.07 +
      adjusted.usage * 0.05
    );
    const olderEraInteriorScore = packId === 'nba_1996_full_season_v1'
      ? getOlderEraInteriorScore(baseline)
      : 0;
    const modernSpacingHybridScore = packId === 'nba_2016_full_season_v1'
      ? getModernSpacingHybridScore(baseline)
      : 0;
    const premiumTierGate = getPremiumTierGate(adjustedOverall, 57, 76);
    const middleTierGate = getPremiumTierGate(adjustedOverall, 54, 76);
    const lowerBandEntryGate = packId === 'nba_2016_full_season_v1'
      ? getPremiumTierGate(adjustedOverall, 54, 58)
      : 0;
    const lowerBandFadeGate = packId === 'nba_2016_full_season_v1'
      ? getPremiumTierGate(adjustedOverall, 61, 70)
      : 0;
    const lowerBandModernLiftGate = packId === 'nba_2016_full_season_v1'
      ? roundHundredth(
          clamp(lowerBandEntryGate * (1 - lowerBandFadeGate), 0, 1)
        )
      : 0;
    const midPremiumEntryGate = packId === 'nba_2016_full_season_v1'
      ? getPremiumTierGate(adjustedOverall, 58, 62)
      : 0;
    const midPremiumFadeGate = packId === 'nba_2016_full_season_v1'
      ? getPremiumTierGate(adjustedOverall, 64, 70)
      : 0;
    const midPremiumModernLiftGate = packId === 'nba_2016_full_season_v1'
      ? roundHundredth(
          clamp(midPremiumEntryGate * (1 - midPremiumFadeGate), 0, 1)
        )
      : 0;
    const olderEraMidPremiumEntryGate = packId === 'nba_1996_full_season_v1'
      ? getPremiumTierGate(adjustedOverall, 58, 62)
      : 0;
    const olderEraMidPremiumFadeGate = packId === 'nba_1996_full_season_v1'
      ? getPremiumTierGate(adjustedOverall, 66, 72)
      : 0;
    const olderEraMidPremiumGate = packId === 'nba_1996_full_season_v1'
      ? roundHundredth(
          clamp(olderEraMidPremiumEntryGate * (1 - olderEraMidPremiumFadeGate), 0, 1)
        )
      : 0;
    const olderEraLowerPremiumEntryGate = packId === 'nba_1996_full_season_v1'
      ? getPremiumTierGate(adjustedOverall, 55, 58)
      : 0;
    const olderEraLowerPremiumFadeGate = packId === 'nba_1996_full_season_v1'
      ? getPremiumTierGate(adjustedOverall, 60, 64)
      : 0;
    const olderEraLowerPremiumGate = packId === 'nba_1996_full_season_v1'
      ? roundHundredth(
          clamp(olderEraLowerPremiumEntryGate * (1 - olderEraLowerPremiumFadeGate), 0, 1)
        )
      : 0;
    const olderEraSharedBandEntryGate = packId === 'nba_1996_full_season_v1'
      ? getPremiumTierGate(adjustedOverall, 60, 63)
      : 0;
    const olderEraSharedBandFadeGate = packId === 'nba_1996_full_season_v1'
      ? getPremiumTierGate(adjustedOverall, 64, 67)
      : 0;
    const olderEraSharedBandGate = packId === 'nba_1996_full_season_v1'
      ? roundHundredth(
          clamp(olderEraSharedBandEntryGate * (1 - olderEraSharedBandFadeGate), 0, 1)
        )
      : 0;
    const olderEraInteriorCompression = packId === 'nba_1996_full_season_v1'
      ? 1 - olderEraInteriorScore * premiumTierGate * 0.035
      : 1;
    const olderEraMidPremiumCompression = packId === 'nba_1996_full_season_v1'
      ? 1 - olderEraInteriorScore * olderEraMidPremiumGate * 0.012
      : 1;
    const olderEraLowerPremiumCompression = packId === 'nba_1996_full_season_v1'
      ? 1 - olderEraInteriorScore * olderEraLowerPremiumGate * 0.008
      : 1;
    const olderEraSharedBandCompression = packId === 'nba_1996_full_season_v1'
      ? 1 - olderEraInteriorScore * olderEraSharedBandGate * 0.006
      : 1;
    const modernSpacingHybridLowerBandLift = packId === 'nba_2016_full_season_v1'
      ? lowerBandModernLiftGate * 0.01
      : 0;
    const modernSpacingHybridMidPremiumLift = packId === 'nba_2016_full_season_v1'
      ? midPremiumModernLiftGate * 0.009
      : 0;
    const modernSpacingHybridLift = packId === 'nba_2016_full_season_v1'
      ? 1 + modernSpacingHybridScore * (
          middleTierGate * 0.015 +
          modernSpacingHybridLowerBandLift +
          modernSpacingHybridMidPremiumLift
        )
      : 1;
    const boardShapeMultiplier =
      olderEraInteriorCompression *
      olderEraMidPremiumCompression *
      olderEraLowerPremiumCompression *
      olderEraSharedBandCompression *
      modernSpacingHybridLift

    adjusted.overall=roundStat(adjustedOverall * boardShapeMultiplier * lowGamesConfidence);
    return {
      ratings:adjusted,
      context:{
        eraLabel:eraContext.eraLabel,
        fantasyBaseline:roundStat(eraContext.fantasyBaseline),
        fantasyPerGame:roundStat(fantasyPerGame),
        fantasyInflation:roundStat(eraContext.fantasyInflation),
        dominance:roundStat(dominance),
        lowGamesConfidence:lowGamesConfidence,
        olderEraInteriorScore:olderEraInteriorScore,
        olderEraInteriorCompression:roundThousandth(olderEraInteriorCompression),
        olderEraMidPremiumGate:olderEraMidPremiumGate,
        olderEraMidPremiumCompression:roundThousandth(olderEraMidPremiumCompression),
        olderEraLowerPremiumGate:olderEraLowerPremiumGate,
        olderEraLowerPremiumCompression:roundThousandth(olderEraLowerPremiumCompression),
        olderEraSharedBandGate:olderEraSharedBandGate,
        olderEraSharedBandCompression:roundThousandth(olderEraSharedBandCompression),
        modernSpacingHybridScore:modernSpacingHybridScore,
        modernSpacingHybridLift:roundThousandth(modernSpacingHybridLift),
        lowerBandModernLiftGate:lowerBandModernLiftGate,
        lowerBandModernLift:roundThousandth(modernSpacingHybridLowerBandLift),
        midPremiumModernLiftGate:midPremiumModernLiftGate,
        midPremiumModernLift:roundThousandth(modernSpacingHybridMidPremiumLift),
        boardShapeMultiplier:roundThousandth(boardShapeMultiplier),
        normalizationModel:'season_context_plus_board_shape_tuning_v1'
      }
    };
  }

  function buildPlayerSimulationProfile(player, options){
    const opts=options && typeof options==='object' ? options : {};
    const packId=String(player?.historicalPackId || opts.packId || '').trim();
    const tuning=getPackTuning(packId);
    const baseline=deriveBaseline(player);
    const gp=getPlayerGamesPlayed(player);
    const totalFantasyPoints=getPlayerTotalFantasyPoints(player);
    const minutes=clamp(baseline.min || 18, 10, 40);
    const usage=clamp(
      34 + baseline.pts * 1.55 + baseline.fga * 0.8 + baseline.fta * 0.45 + baseline.ast * 0.35 - baseline.to * 0.2,
      28,
      99
    );
    const scoring=clamp(32 + baseline.pts * 2.35 + baseline.threes * 1.8, 25, 99);
    const rebounding=clamp(26 + baseline.reb * 4.9 + baseline.blk * 3.5, 20, 99);
    const playmaking=clamp(24 + baseline.ast * 6.2 + baseline.to * 0.4, 20, 99);
    const defense=clamp(28 + baseline.stl * 12 + baseline.blk * 12 + baseline.reb * 0.8, 20, 99);
    const shootingPct=baseline.fga > 0 ? baseline.fgm / baseline.fga : 0.42;
    const shooting=clamp(30 + shootingPct * 70 + baseline.threes * 2.8 + baseline.ftm * 0.8, 20, 99);
    const stamina=clamp(28 + minutes * 1.7 + Math.min(12, gp / 8), 20, 99);
    const tempo=clamp(36 + minutes * 1.2 + baseline.ast * 1.5 + baseline.stl * 2, 20, 99);
    const volatility=clamp(
      34 + (baseline.pts > 20 ? 12 : 0) + (baseline.ast > 6 ? 8 : 0) + (minutes < 24 ? 10 : 0) + (gp < 25 ? 10 : 0),
      24,
      92
    );
    const rawRatings={
      usage:roundStat(usage),
      scoring:roundStat(scoring),
      rebounding:roundStat(rebounding),
      playmaking:roundStat(playmaking),
      defense:roundStat(defense),
      shooting:roundStat(shooting),
      stamina:roundStat(stamina),
      tempo:roundStat(tempo),
      volatility:roundStat(volatility)
    };
    const overall=roundStat(
      scoring * 0.28 +
      rebounding * 0.16 +
      playmaking * 0.18 +
      defense * 0.15 +
      shooting * 0.11 +
      stamina * 0.07 +
      usage * 0.05
    );
    rawRatings.overall=overall;
    const mixedEra=buildMixedEraRatings(rawRatings, baseline, totalFantasyPoints, gp, packId);
    return {
      version:ENGINE_VERSION,
      packId:packId || null,
      source:'historical_season_stats_plus_light_authored_tuning',
      archetype:detectArchetype(player, baseline),
      gamesPlayed:gp,
      totalFantasyPoints:roundStat(totalFantasyPoints),
      baseline:baseline,
      ratings:rawRatings,
      mixedEraRatings:mixedEra.ratings,
      mixedEraContext:mixedEra.context,
      eraTuning:{
        pace:tuning.pace,
        variance:tuning.variance,
        threeBoost:tuning.threeBoost,
        assistBoost:tuning.assistBoost,
        reboundTilt:tuning.reboundTilt,
        defenseTightness:tuning.defenseTightness
      }
    };
  }

  function enrichPlayer(player, options){
    if(!(player && typeof player==='object')) return player;
    player.simProfile=buildPlayerSimulationProfile(player, options);
    return player;
  }

  function enrichRosterCollection(collection, options){
    if(!Array.isArray(collection)) return collection;
    collection.forEach(function(player){
      enrichPlayer(player, options);
    });
    return collection;
  }

  function enrichLeagueState(state, options){
    if(!(state && typeof state==='object')) return state;
    const opts=options && typeof options==='object' ? options : {};
    const packId=String(opts.packId || state.historicalPackId || '').trim();
    if(Array.isArray(state.allRosters)){
      state.allRosters.forEach(function(roster){
        enrichRosterCollection(roster, { packId:packId });
      });
    }
    if(Array.isArray(state.freeAgents)) enrichRosterCollection(state.freeAgents, { packId:packId });
    if(Array.isArray(state.waiver)) enrichRosterCollection(state.waiver, { packId:packId });
    if(Array.isArray(state.historicalPlayerPool)) enrichRosterCollection(state.historicalPlayerPool, { packId:packId });
    state.simulationProfile=Object.assign({}, state.simulationProfile || {}, {
      engineVersion:ENGINE_VERSION,
      ratingsSource:'Ratings-driven simulation + sport-specific tuning',
      mixedEraNormalization:'season_context_plus_light_authored_tuning',
      simulationCadence:'daily_reveal',
      simulationOutput:'box_score'
    });
    return state;
  }

  function computeFantasyPoints(stats){
    return roundStat(
      Number(stats?.pts || 0) +
      Number(stats?.reb || 0) * 1.2 +
      Number(stats?.ast || 0) * 1.5 +
      Number(stats?.stl || 0) * 3 +
      Number(stats?.blk || 0) * 3 -
      Number(stats?.to || 0) +
      Number(stats?.threes || 0) * 0.5
    );
  }

  function getStarterBaseFantasyValue(player, profile){
    const direct=Number(
      player?.fp ??
      player?.fantasyPointsPerGame ??
      profile?.mixedEraContext?.fantasyPerGame ??
      0
    );
    if(Number.isFinite(direct) && direct > 0) return direct;
    const gamesPlayed=Number(profile?.gamesPlayed || player?.gp || 0);
    const totalFantasyPoints=Number(profile?.totalFantasyPoints || player?.totalFantasyPoints || 0);
    if(gamesPlayed > 0 && totalFantasyPoints > 0){
      return totalFantasyPoints / gamesPlayed;
    }
    return 0;
  }

  function getNflFantasyFloorForPosition(position){
    switch(String(position || '').trim().toUpperCase()){
      case 'QB': return 11;
      case 'RB': return 10.5;
      case 'WR': return 5.5;
      case 'TE': return 6;
      case 'K': return 5;
      case 'DST': return 5;
      default: return 6;
    }
  }

  function shapeNflFantasyForPosition(rawFantasy, position){
    const normalized=String(position || '').trim().toUpperCase();
    const fantasy=Number(rawFantasy || 0);
    if(normalized==='RB'){
      return 15 + (fantasy - 15) * 0.72;
    }
    if(normalized==='WR'){
      return 15 + (fantasy - 15) * 1.28;
    }
    if(normalized==='TE'){
      return 11.5 + (fantasy - 11.5) * 0.82;
    }
    if(normalized==='QB'){
      return 26 + (fantasy - 26) * 0.86;
    }
    return fantasy;
  }

  function simulateNflStarterEntries(teamProfile, opponentProfile, teamLabel, opponentLabel, sideKey, rng, gameContext){
    const starters=Array.isArray(teamProfile?.starters) ? teamProfile.starters : [];
    const offenseBoost=sideKey==='home' ? gameContext.homeBoost : gameContext.awayBoost;
    const paceBoost=clamp(0.96 + ((gameContext.sharedPace || 1) - 1) * 0.35, 0.9, 1.05);
    return starters.map(function(player){
      const profile=player?.simProfile || buildPlayerSimulationProfile(player, { packId:player?.historicalPackId || null });
      const ratings=profile?.ratings || {};
      const position=getSimulationPlayerPosition(player) || 'FLEX';
      const baseFantasy=getStarterBaseFantasyValue(player, profile);
      const talent=Number(
        player?.mixedEraOverall ??
        profile?.mixedEraRatings?.overall ??
        profile?.ratings?.overall ??
        70
      ) || 70;
      const volatility=clamp((Number(ratings.volatility || 50) / 100) * gameContext.varianceScale * 0.65, 0.04, 0.18);
      const randomSwing=1 + normalish(rng) * volatility;
      const talentBoost=clamp(0.88 + talent / 190, 0.96, 1.36);
      const matchupBoost=clamp(offenseBoost * paceBoost, 0.88, 1.12);
      const rawFantasy=baseFantasy * talentBoost * matchupBoost * randomSwing;
      const finalFantasy=roundStat(Math.max(
        getNflFantasyFloorForPosition(position),
        shapeNflFantasyForPosition(rawFantasy, position)
      ));
      return {
        player:player,
        baseScore:roundStat(baseFantasy),
        finalScore:finalFantasy,
        statSource:'simulation_engine_generated',
        game:{
          opp:opponentLabel,
          time:'Sim',
          isHome:sideKey==='home',
          simulated:true
        },
        injury:null,
        unavailable:false,
        source:'starter_sim',
        simulatedStats:{
          fantasyPoints:finalFantasy,
          position:position,
          offenseBoost:roundHundredth(matchupBoost),
          talentBoost:roundHundredth(talentBoost)
        },
        simSummary:{
          team:teamLabel,
          opponent:opponentLabel,
          side:sideKey
        }
      };
    });
  }

  function getPlayerById(roster, playerId){
    return Array.isArray(roster)
      ? roster.find(function(player){ return Number(player?.id) === Number(playerId); }) || null
      : null;
  }

  function getPlayerDesignation(player){
    return String(player?.designation || player?.injuryStatus || 'ACTIVE').trim().toUpperCase();
  }

  function isUnavailableForSimulation(player){
    const designation=getPlayerDesignation(player);
    return designation==='OUT' ||
      designation==='INACTIVE' ||
      designation==='DNP' ||
      designation==='DOUBTFUL' ||
      designation==='SUSPENDED' ||
      designation==='IR';
  }

  function getStarterRankScore(player, packId){
    if(!(player && typeof player==='object')) return 0;
    const profile=player?.simProfile || buildPlayerSimulationProfile(player, { packId:player?.historicalPackId || packId || null });
    return Number(
      player?.mixedEraOverall ??
      profile?.mixedEraRatings?.overall ??
      profile?.ratings?.overall ??
      player?.fp ??
      0
    ) || 0;
  }

  function selectSimulationStarters(roster, requestedSelection, packId, state){
    const strictNflSlots=requestedSelection && typeof requestedSelection==='object' && !Array.isArray(requestedSelection)
      ? requestedSelection.strictNflSlots === true
      : false;
    if(getSimulationSport(state)==='nfl' && strictNflSlots){
      return buildExactNflSlotStarters(roster, requestedSelection?.lineupSlots).slice(0, getSimulationStarterCount(state));
    }
    const requestedIds=Array.isArray(requestedSelection)
      ? requestedSelection
      : Array.isArray(requestedSelection?.lineupIds)
        ? requestedSelection.lineupIds
        : [];
    const requestedStarters=Array.isArray(requestedSelection?.requestedStarters)
      ? requestedSelection.requestedStarters.filter(Boolean)
      : requestedIds.map(function(playerId){
          return getPlayerById(roster, playerId);
        }).filter(Boolean);
    const availableRequested=(Array.isArray(requestedStarters) ? requestedStarters : [])
      .filter(function(player){ return player && !isUnavailableForSimulation(player); });
    const requestedIdSet=new Set(availableRequested.map(function(player){ return Number(player?.id); }));
    const starterCount=getSimulationStarterCount(state);
    const starterSlots=getSimulationStarterSlotsForState(state).slice(0, starterCount);
    const availableBench=(Array.isArray(roster) ? roster : [])
      .filter(function(player){
        return player &&
          !isUnavailableForSimulation(player) &&
          !requestedIdSet.has(Number(player?.id));
      })
      .slice()
      .sort(function(a, b){
        const rankDiff=getStarterRankScore(b, packId) - getStarterRankScore(a, packId);
        if(rankDiff) return rankDiff;
        const fpDiff=Number(b?.fp || 0) - Number(a?.fp || 0);
        if(fpDiff) return fpDiff;
        return String(a?.name || '').localeCompare(String(b?.name || ''));
      });
    if(getSimulationSport(state)!=='nfl'){
      return availableRequested.concat(availableBench).slice(0, starterCount);
    }
    const remainingRequested=availableRequested.slice();
    const remainingBench=availableBench.slice();
    const starters=[];
    starterSlots.forEach(function(slot){
      const slottedStarter=takeFirstEligibleSimulationStarter(remainingRequested, slot, state) ||
        takeFirstEligibleSimulationStarter(remainingBench, slot, state);
      if(slottedStarter) starters.push(slottedStarter);
    });
    const remainingFallback=remainingRequested.concat(remainingBench);
    while(starters.length < starterCount && remainingFallback.length){
      starters.push(remainingFallback.shift());
    }
    return starters.slice(0, starterCount);
  }

  function buildTeamProfile(roster, lineupSelection, packId, state){
    const requestedIds=Array.isArray(lineupSelection)
      ? lineupSelection
      : Array.isArray(lineupSelection?.lineupIds)
        ? lineupSelection.lineupIds
        : [];
    const requestedStarters=(Array.isArray(requestedIds) ? requestedIds : [])
      .map(function(playerId){ return getPlayerById(roster, playerId); })
      .filter(Boolean);
    const starters=selectSimulationStarters(
      roster,
      lineupSelection && typeof lineupSelection==='object' && !Array.isArray(lineupSelection)
        ? Object.assign({}, lineupSelection, { lineupIds: requestedIds, requestedStarters: requestedStarters })
        : requestedStarters,
      packId,
      state
    );
    const tuning=getPackTuning(packId);
    const avg=function(selector, fallback){
      if(!starters.length) return fallback;
      return starters.reduce(function(sum, player){
        return sum + Number(selector(player) || 0);
      }, 0) / starters.length;
    };
    return {
      sport:getSimulationSport(state),
      starters:starters,
      offense:avg(function(player){ return player?.simProfile?.ratings?.scoring; }, 55),
      defense:avg(function(player){ return player?.simProfile?.ratings?.defense; }, 55),
      playmaking:avg(function(player){ return player?.simProfile?.ratings?.playmaking; }, 55),
      rebounding:avg(function(player){ return player?.simProfile?.ratings?.rebounding; }, 55),
      tempo:avg(function(player){ return player?.simProfile?.ratings?.tempo; }, 55) * tuning.pace,
      variance:avg(function(player){ return player?.simProfile?.ratings?.volatility; }, 50) * tuning.variance,
      tuning:tuning
    };
  }

  function normalizeWeights(items, selector){
    const raw=items.map(function(item){
      return Math.max(0.01, Number(selector(item) || 0));
    });
    const total=raw.reduce(function(sum, value){ return sum + value; }, 0) || 1;
    return raw.map(function(value){ return value / total; });
  }

  function buildGameContext(homeProfile, awayProfile, rng){
    const sharedPace=clamp(
      ((homeProfile.tempo + awayProfile.tempo) / 110) + normalish(rng) * 0.03,
      0.88,
      1.12
    );
    const offenseGap=(homeProfile.offense + homeProfile.playmaking * 0.35) - (awayProfile.defense * awayProfile.tuning.defenseTightness);
    const reverseGap=(awayProfile.offense + awayProfile.playmaking * 0.35) - (homeProfile.defense * homeProfile.tuning.defenseTightness);
    return {
      sharedPace:sharedPace,
      homeBoost:clamp(1 + offenseGap / 250 + 0.025, 0.84, 1.18),
      awayBoost:clamp(1 + reverseGap / 250 - 0.01, 0.82, 1.16),
      reboundTilt:clamp((homeProfile.rebounding - awayProfile.rebounding) / 220, -0.08, 0.08),
      varianceScale:clamp(((homeProfile.variance + awayProfile.variance) / 140), 0.8, 1.35)
    };
  }

  function simulateStarterEntries(teamProfile, opponentProfile, teamLabel, opponentLabel, sideKey, rng, gameContext){
    if(String(teamProfile?.sport || '').trim().toLowerCase()==='nfl'){
      return simulateNflStarterEntries(teamProfile, opponentProfile, teamLabel, opponentLabel, sideKey, rng, gameContext);
    }
    const starters=teamProfile.starters;
    const nbaProductionScale=0.832;
    const usageWeights=normalizeWeights(starters, function(player){
      const ratings=player?.simProfile?.ratings || {};
      return 0.7 + Number(ratings.usage || 0) / 90 + Number(ratings.scoring || 0) / 180 + Number(ratings.playmaking || 0) / 280;
    });
    const playmakingWeights=normalizeWeights(starters, function(player){
      return 0.4 + Number(player?.simProfile?.ratings?.playmaking || 0) / 100;
    });
    const reboundWeights=normalizeWeights(starters, function(player){
      return 0.35 + Number(player?.simProfile?.ratings?.rebounding || 0) / 110;
    });
    return starters.map(function(player, index){
      const profile=player?.simProfile || buildPlayerSimulationProfile(player, { packId:player?.historicalPackId || null });
      const baseline=profile.baseline || deriveBaseline(player);
      const ratings=profile.ratings || {};
      const usageWeight=usageWeights[index] || (1 / Math.max(1, starters.length));
      const playWeight=playmakingWeights[index] || usageWeight;
      const reboundWeight=reboundWeights[index] || usageWeight;
      const volatility=clamp((Number(ratings.volatility || 50) / 100) * gameContext.varianceScale, 0.08, 0.32);
      const randomSwing=1 + normalish(rng) * volatility;
      const offenseBoost=sideKey==='home' ? gameContext.homeBoost : gameContext.awayBoost;
      const reboundShift=sideKey==='home' ? gameContext.reboundTilt : -gameContext.reboundTilt;
      const efficiencyBoost=clamp(0.92 + Number(ratings.shooting || 50) / 240, 0.78, 1.22);
      const archetype=String(profile?.archetype || '').trim().toLowerCase();
      const position=String(player?.pos || player?.primaryPosition || '').trim().toUpperCase();
      const usageIndex=usageWeight * Math.max(1, starters.length);
      const eliteSignal=(
        clamp((Number(ratings.overall || 70) - 86) / 12, 0, 1) * 0.05 +
        clamp((Number(ratings.usage || 50) - 84) / 15, 0, 1) * 0.035 +
        clamp((Number(ratings.scoring || 50) - 84) / 15, 0, 1) * 0.025
      );
      const takeoverLift=clamp(
        1 + eliteSignal + clamp((usageIndex - 1) * 0.045, -0.025, 0.045),
        0.975,
        1.12
      );
      const supportLift=clamp(1 + clamp((usageIndex - 1) * 0.025, -0.02, 0.025), 0.98, 1.04);
      const scoringRoleLift=clamp(
        1 +
        (archetype==='primary_scorer' || archetype==='perimeter_bombardier' ? 0.035 : 0) +
        (archetype==='engine_guard' || archetype==='point_forward' ? -0.018 : 0),
        0.97,
        1.06
      );
      const playmakingRoleLift=clamp(
        1 +
        (archetype==='engine_guard' ? 0.11 : 0) +
        (archetype==='point_forward' ? 0.08 : 0) +
        (archetype==='rim_anchor' || archetype==='glass_cleaner' ? -0.06 : 0),
        0.92,
        1.15
      );
      const reboundRoleLift=clamp(
        1 +
        (archetype==='rim_anchor' || archetype==='glass_cleaner' ? 0.16 : 0) +
        (archetype==='point_forward' ? 0.06 : 0) +
        (archetype==='engine_guard' || archetype==='perimeter_bombardier' ? -0.045 : 0) +
        clamp((Number(ratings.rebounding || 50) - 72) / 260, -0.04, 0.06),
        0.92,
        1.2
      );
      const spacingRoleLift=clamp(
        1 +
        (archetype==='perimeter_bombardier' ? 0.14 : 0) +
        (archetype==='three_and_d_wing' ? 0.22 : 0) +
        ((position==='F' || position==='SF' || position==='PF') && baseline.threes >= 1 ? 0.08 : 0) +
        (archetype==='rim_anchor' || archetype==='glass_cleaner' ? -0.12 : 0),
        0.88,
        1.24
      );
      const defenseEventLift=clamp(
        1 +
        (archetype==='rim_anchor' || archetype==='defensive_event_creator' ? 0.12 : 0) +
        (archetype==='three_and_d_wing' ? 0.08 : 0),
        0.96,
        1.14
      );
      const minuteLoad=clamp(
        (baseline.min || 28) * (0.94 + Number(ratings.stamina || 50) / 220 + normalish(rng) * 0.04),
        14,
        42
      );
      const pts=roundStat(Math.max(0, baseline.pts * gameContext.sharedPace * offenseBoost * (0.78 + usageWeight * 1.65) * randomSwing * nbaProductionScale * takeoverLift * scoringRoleLift));
      const reb=roundStat(Math.max(0, baseline.reb * gameContext.sharedPace * (0.84 + reboundWeight * 1.2 + reboundShift) * nbaProductionScale * supportLift * reboundRoleLift));
      const ast=roundStat(Math.max(0, baseline.ast * gameContext.sharedPace * (0.82 + playWeight * 1.45) * (0.94 + teamProfile.tuning.assistBoost * 0.08) * nbaProductionScale * takeoverLift * playmakingRoleLift));
      const stl=roundStat(Math.max(0, baseline.stl * clamp(0.9 + (Number(ratings.defense || 50) - Number(opponentProfile.playmaking || 50)) / 300, 0.62, 1.34) * (0.88 + rng() * 0.28) * nbaProductionScale * defenseEventLift));
      const blk=roundStat(Math.max(0, baseline.blk * clamp(0.92 + (Number(ratings.defense || 50) - Number(opponentProfile.offense || 50)) / 320, 0.6, 1.38) * (0.88 + rng() * 0.26) * nbaProductionScale * defenseEventLift));
      const turnovers=roundStat(Math.max(0, baseline.to * (0.86 + usageWeight * 0.9) * (0.88 + rng() * 0.22) * 0.93));
      const threes=roundStat(Math.max(0, baseline.threes * gameContext.sharedPace * (0.82 + usageWeight * 1.28) * teamProfile.tuning.threeBoost * (0.9 + rng() * 0.22) * nbaProductionScale * takeoverLift * spacingRoleLift));
      const fga=roundStat(Math.max(threes + 2, baseline.fga * gameContext.sharedPace * (0.8 + usageWeight * 1.6) * offenseBoost * nbaProductionScale * takeoverLift));
      const fgm=roundStat(Math.min(fga, Math.max(0, baseline.fgm * gameContext.sharedPace * offenseBoost * efficiencyBoost * (0.88 + rng() * 0.18) * nbaProductionScale * takeoverLift)));
      const fta=roundStat(Math.max(0, baseline.fta * (0.82 + usageWeight * 1.15) * offenseBoost * (0.88 + rng() * 0.16) * nbaProductionScale * takeoverLift));
      const ftm=roundStat(Math.min(fta, Math.max(0, baseline.ftm * (0.9 + rng() * 0.14) * nbaProductionScale * takeoverLift)));
      const stats={
        pts:pts,
        reb:reb,
        ast:ast,
        stl:stl,
        blk:blk,
        to:turnovers,
        min:minuteLoad,
        fgm:fgm,
        fga:fga,
        ftm:ftm,
        fta:fta,
        threes:threes
      };
      const fantasyPoints=computeFantasyPoints(stats);
      return {
        player:player,
        baseScore:fantasyPoints,
        finalScore:fantasyPoints,
        statSource:'simulation_engine_generated',
        game:{
          opp:opponentLabel,
          time:'Sim',
          isHome:sideKey==='home',
          simulated:true
        },
        injury:null,
        unavailable:false,
        source:'starter_sim',
        simulatedStats:stats,
        simSummary:{
          team:teamLabel,
          opponent:opponentLabel,
          side:sideKey
        }
      };
    });
  }

  function buildRoundRobinDays(teams){
    const rotation=Array.isArray(teams) ? teams.slice() : [];
    if(rotation.length < 2) return [];
    if(rotation.length % 2) rotation.push(null);
    const rounds=[];
    for(let round=0; round<rotation.length - 1; round+=1){
      const day=[];
      for(let index=0; index<rotation.length / 2; index+=1){
        const left=rotation[index];
        const right=rotation[rotation.length - 1 - index];
        if(!(left && right)) continue;
        day.push({
          teamAAbbr:left.abbr,
          teamBAbbr:right.abbr
        });
      }
      rounds.push(day);
      rotation.splice(1, 0, rotation.pop());
    }
    return rounds;
  }

  function buildSimulationSeasonSchedule(shell){
    const sport=String(shell?.sport || '').trim().toLowerCase();
    const anchorSeasonId=String(shell?.anchorSeasonId || '').trim().toLowerCase();
    if(sport==='nfl' && anchorSeasonId==='nfl_2014'){
      return {
        byDay:nfl2014ScheduleHelpers && typeof nfl2014ScheduleHelpers.buildNfl2014ScheduleByWeek==='function'
          ? nfl2014ScheduleHelpers.buildNfl2014ScheduleByWeek()
          : {}
      };
    }
    const teams=Array.isArray(shell?.teams) ? shell.teams : [];
    const targetGames=Math.max(0, Number(shell?.regularSeasonGamesPerTeam || 82) || 82);
    const byDay={};
    const teamCounts=Object.fromEntries(teams.map(function(team){
      return [team.abbr, {
        total:0,
        home:0,
        away:0
      }];
    }));
    const roundRobinDays=buildRoundRobinDays(teams);
    const teamGameCounts=Object.fromEntries(teams.map(function(team){
      return [team.abbr, 0];
    }));
    if(!roundRobinDays.length || !targetGames) return { byDay:byDay, teamGameCounts:teamGameCounts };

    function addMatchup(day, homeAbbr, awayAbbr){
      if(!byDay[day]) byDay[day]=[];
      byDay[day].push({
        homeAbbr:homeAbbr,
        awayAbbr:awayAbbr
      });
      teamCounts[homeAbbr].total += 1;
      teamCounts[homeAbbr].home += 1;
      teamCounts[awayAbbr].total += 1;
      teamCounts[awayAbbr].away += 1;
      teamGameCounts[homeAbbr] += 1;
      teamGameCounts[awayAbbr] += 1;
    }

    const fullCycleDays=Math.min(targetGames, roundRobinDays.length);
    for(let day=1; day<=fullCycleDays; day+=1){
      roundRobinDays[day - 1].forEach(function(matchup, index){
        const homeFirst=(day + index) % 2 === 0;
        addMatchup(
          day,
          homeFirst ? matchup.teamAAbbr : matchup.teamBAbbr,
          homeFirst ? matchup.teamBAbbr : matchup.teamAAbbr
        );
      });
    }

    const reverseCycleDays=Math.min(Math.max(targetGames - fullCycleDays, 0), roundRobinDays.length);
    for(let offset=0; offset<reverseCycleDays; offset+=1){
      const day=fullCycleDays + offset + 1;
      roundRobinDays[offset].forEach(function(matchup, index){
        const homeFirst=(offset + 1 + index) % 2 === 0;
        addMatchup(
          day,
          homeFirst ? matchup.teamBAbbr : matchup.teamAAbbr,
          homeFirst ? matchup.teamAAbbr : matchup.teamBAbbr
        );
      });
    }

    for(let day=fullCycleDays + reverseCycleDays + 1; day<=targetGames; day+=1){
      const templateDay=roundRobinDays[(day - fullCycleDays - reverseCycleDays - 1) % roundRobinDays.length];
      templateDay.forEach(function(matchup, index){
        const homeStats=teamCounts[matchup.teamAAbbr];
        const awayStats=teamCounts[matchup.teamBAbbr];
        let homeAbbr=matchup.teamAAbbr;
        let awayAbbr=matchup.teamBAbbr;
        if(homeStats.home > awayStats.home){
          homeAbbr=matchup.teamBAbbr;
          awayAbbr=matchup.teamAAbbr;
        }else if(homeStats.home === awayStats.home && ((day + index) % 2 === 1)){
          homeAbbr=matchup.teamBAbbr;
          awayAbbr=matchup.teamAAbbr;
        }
        addMatchup(day, homeAbbr, awayAbbr);
      });
    }

    return { byDay:byDay, teamGameCounts:teamGameCounts };
  }

  function buildSimulationPlayIn(conferenceStandings){
    const ordered=(Array.isArray(conferenceStandings) ? conferenceStandings : [])
      .slice()
      .sort(function(a, b){
        return Number(a?.seed || 99) - Number(b?.seed || 99);
      });
    return {
      topSix:ordered.filter(function(entry){
        const seed=Number(entry?.seed);
        return seed >= 1 && seed <= 6;
      }),
      sevenEight:ordered.filter(function(entry){
        const seed=Number(entry?.seed);
        return seed === 7 || seed === 8;
      }),
      nineTen:ordered.filter(function(entry){
        const seed=Number(entry?.seed);
        return seed === 9 || seed === 10;
      })
    };
  }

  function resolveSimulationPlayIn(playIn, results){
    const topSix=[].concat(playIn?.topSix || []).filter(Boolean);
    const sevenEight=Array.isArray(playIn?.sevenEight) ? playIn.sevenEight : [];
    const nineTen=Array.isArray(playIn?.nineTen) ? playIn.nineTen : [];
    const sevenSeed=sevenEight.find(function(entry){
      return entry?.teamAbbr === results?.sevenEightWinner;
    });
    const nineTenWinner=nineTen.find(function(entry){
      return entry?.teamAbbr === results?.nineTenWinner;
    });
    const sevenEightLoser=sevenEight.find(function(entry){
      return entry?.teamAbbr !== results?.sevenEightWinner;
    });
    const eightSeed=[sevenEightLoser, nineTenWinner].filter(Boolean).find(function(entry){
      return entry?.teamAbbr === results?.finalWinner;
    });
    return topSix.concat([sevenSeed, eightSeed]).filter(Boolean);
  }

  function buildSimulationPlayoffBracket(conferences){
    const east=Array.isArray(conferences?.east) ? conferences.east : [];
    const west=Array.isArray(conferences?.west) ? conferences.west : [];

    function buildConferenceRound(field){
      return [
        { higherSeed:field[0], lowerSeed:field[7] },
        { higherSeed:field[1], lowerSeed:field[6] },
        { higherSeed:field[2], lowerSeed:field[5] },
        { higherSeed:field[3], lowerSeed:field[4] }
      ];
    }

    return {
      east:{ firstRound:buildConferenceRound(east) },
      west:{ firstRound:buildConferenceRound(west) },
      finals:null
    };
  }

  function advanceSimulationSeries(series, outcome){
    return Object.assign({}, series, {
      winnerTeamAbbr:String(outcome?.winner || '').trim(),
      games:Number(outcome?.games || 4)
    });
  }

  function finalizeSimulationChampion(state){
    const finals=state?.finals || null;
    const winnerTeamAbbr=finals?.winnerTeamAbbr || null;
    return {
      championTeamAbbr:winnerTeamAbbr,
      runnerUpTeamAbbr:finals?.higherSeed?.teamAbbr === winnerTeamAbbr
        ? finals?.lowerSeed?.teamAbbr || null
        : finals?.higherSeed?.teamAbbr || null,
      finalsGames:Number(finals?.games || 0)
    };
  }

  function convertFantasyTotalToNbaScore(total){
    return Math.max(88, Math.round(80 + (Number(total || 0) * 0.14)));
  }

  function convertFantasyTotalToNflScore(total){
    return Math.max(7, Math.round(8 + (Number(total || 0) * 0.12)));
  }

  function convertFantasyTotalToRenderedScore(total, state){
    return getSimulationSport(state)==='nfl'
      ? convertFantasyTotalToNflScore(total)
      : convertFantasyTotalToNbaScore(total);
  }

  function resolveRenderedGameScores(game, state){
    const homeScore=convertFantasyTotalToRenderedScore(game?.homeTotal, state);
    const awayScore=convertFantasyTotalToRenderedScore(game?.awayTotal, state);
    if(getSimulationSport(state)!=='nfl'){
      if(homeScore===awayScore){
        const homeTotal=Number(game?.homeTotal || 0);
        const awayTotal=Number(game?.awayTotal || 0);
        if(homeTotal!==awayTotal){
          return homeTotal > awayTotal
            ? { homeScore:homeScore + 1, awayScore:awayScore }
            : { homeScore:homeScore, awayScore:awayScore + 1 };
        }
      }
      return {
        homeScore:homeScore,
        awayScore:awayScore
      };
    }
    const winner=String(game?.winner || '').trim().toLowerCase();
    if(homeScore!==awayScore || (winner!=='home' && winner!=='away')){
      return {
        homeScore:homeScore,
        awayScore:awayScore
      };
    }
    return winner==='home'
      ? { homeScore:homeScore + 1, awayScore:awayScore }
      : { homeScore:homeScore, awayScore:awayScore + 1 };
  }

  function simulateLeagueDay(options){
    const opts=options && typeof options==='object' ? options : {};
    const state=opts.state || {};
    const packId=String(opts.packId || state.historicalPackId || '').trim();
    const matchups=Array.isArray(opts.matchups) ? opts.matchups : [];
    const lineupSelectionsByTeam=Array.isArray(opts.lineupSelectionsByTeam)
      ? opts.lineupSelectionsByTeam
      : Array.isArray(opts.lineupIdsByTeam)
        ? opts.lineupIdsByTeam
        : [];
    const teamNames=Array.isArray(opts.teamNames) ? opts.teamNames : (Array.isArray(state.teams) ? state.teams : []);
    const day=Number(opts.day || state.currentDay || 1) || 1;
    const week=Number(opts.week || state.currentWeek || 1) || 1;
    const resultsByTeam={};
    const gameLogs=[];
    const teamCount=Math.max(Array.isArray(state.allRosters) ? state.allRosters.length : 0, teamNames.length);

    matchups.forEach(function(matchup, matchupIndex){
      const homeIdx=Number(matchup?.home);
      const awayIdx=Number(matchup?.away);
      if(!Number.isFinite(homeIdx) || !Number.isFinite(awayIdx)) return;
      const homeRoster=Array.isArray(state.allRosters?.[homeIdx]) ? state.allRosters[homeIdx] : [];
      const awayRoster=Array.isArray(state.allRosters?.[awayIdx]) ? state.allRosters[awayIdx] : [];
      enrichRosterCollection(homeRoster, { packId:packId });
      enrichRosterCollection(awayRoster, { packId:packId });
      const homeProfile=buildTeamProfile(homeRoster, lineupSelectionsByTeam[homeIdx], packId, state);
      const awayProfile=buildTeamProfile(awayRoster, lineupSelectionsByTeam[awayIdx], packId, state);
      const seedParts=[
        ENGINE_VERSION,
        packId,
        String(state.seasonId || ''),
        'day', day,
        'week', week,
        'matchup', matchupIndex,
        homeIdx,
        awayIdx
      ];
      const rng=mulberry32(hashString(seedParts.join('|')));
      const gameContext=buildGameContext(homeProfile, awayProfile, rng);
      const homeName=String(teamNames[homeIdx] || ('Team ' + (homeIdx + 1)));
      const awayName=String(teamNames[awayIdx] || ('Team ' + (awayIdx + 1)));
      const homeEntries=simulateStarterEntries(homeProfile, awayProfile, homeName, awayName, 'home', rng, gameContext);
      const awayEntries=simulateStarterEntries(awayProfile, homeProfile, awayName, homeName, 'away', rng, gameContext);
      resultsByTeam[homeIdx]={
        total:roundStat(homeEntries.reduce(function(sum, entry){ return sum + Number(entry.finalScore || 0); }, 0)),
        entries:homeEntries,
        statSource:'simulation_engine_generated',
        powerups:null,
        simMeta:{
          opponentTeamIdx:awayIdx,
          opponentTeamName:awayName,
          isHome:true,
          sharedPace:roundStat(gameContext.sharedPace)
        }
      };
      resultsByTeam[awayIdx]={
        total:roundStat(awayEntries.reduce(function(sum, entry){ return sum + Number(entry.finalScore || 0); }, 0)),
        entries:awayEntries,
        statSource:'simulation_engine_generated',
        powerups:null,
        simMeta:{
          opponentTeamIdx:homeIdx,
          opponentTeamName:homeName,
          isHome:false,
          sharedPace:roundStat(gameContext.sharedPace)
        }
      };
      gameLogs.push({
        week:week,
        day:day,
        home:homeIdx,
        away:awayIdx,
        homeName:homeName,
        awayName:awayName,
        homeTotal:resultsByTeam[homeIdx].total,
        awayTotal:resultsByTeam[awayIdx].total,
        outcomeSource:'simulation_engine',
        sharedPace:roundStat(gameContext.sharedPace),
        engineVersion:ENGINE_VERSION
      });
    });

    for(let teamIdx=0; teamIdx<teamCount; teamIdx+=1){
      if(resultsByTeam[teamIdx]) continue;
      resultsByTeam[teamIdx]={
        total:0,
        entries:[],
        statSource:'simulation_engine_generated',
        powerups:null,
        simMeta:{
          opponentTeamIdx:null,
          opponentTeamName:'No Opponent',
          isHome:false,
          sharedPace:0
        }
      };
    }

    return {
      engineVersion:ENGINE_VERSION,
      day:day,
      week:week,
      generatedAt:Date.now(),
      resultsByTeam:resultsByTeam,
      gameLogs:gameLogs
    };
  }

  function simulateSimulationGameDay(options){
    const opts=options && typeof options==='object' ? options : {};
    const state=opts.state || {};
    const teamMeta=Array.isArray(state.teamMeta) ? state.teamMeta : [];
    const sport=getSimulationSport(state);
    const controlledTeamAbbr=getControlledSimulationTeamAbbr(state);
    const lineupMap=opts.lineupIdsByTeam && !Array.isArray(opts.lineupIdsByTeam)
      ? opts.lineupIdsByTeam
      : (state?.seasonState?.lineupIdsByTeam && typeof state.seasonState.lineupIdsByTeam==='object' ? state.seasonState.lineupIdsByTeam : {});
    const lineupSlotsMap=opts.lineupSlotsByTeam && !Array.isArray(opts.lineupSlotsByTeam)
      ? opts.lineupSlotsByTeam
      : (state?.seasonState?.lineupSlotsByTeam && typeof state.seasonState.lineupSlotsByTeam==='object' ? state.seasonState.lineupSlotsByTeam : {});
    const matchups=(opts.schedule?.byDay?.[Number(opts.day)] || []).map(function(matchup){
      return {
        home:teamMeta.findIndex(function(team){ return team.abbr === matchup.homeAbbr; }),
        away:teamMeta.findIndex(function(team){ return team.abbr === matchup.awayAbbr; })
      };
    }).filter(function(matchup){
      return matchup.home >= 0 && matchup.away >= 0;
    });
    const lowLevel=simulateLeagueDay({
      state:state,
      matchups:matchups,
      lineupSelectionsByTeam:teamMeta.map(function(team){
        const teamAbbr=String(team?.abbr || '').trim().toUpperCase();
        const lineupIds=Array.isArray(lineupMap[teamAbbr]) ? lineupMap[teamAbbr] : [];
        const lineupSlots=lineupSlotsMap[teamAbbr] && typeof lineupSlotsMap[teamAbbr]==='object' && !Array.isArray(lineupSlotsMap[teamAbbr])
          ? lineupSlotsMap[teamAbbr]
          : null;
        return {
          teamAbbr:teamAbbr,
          lineupIds:lineupIds,
          lineupSlots:lineupSlots,
          strictNflSlots:sport==='nfl' && !!lineupSlots && teamAbbr===controlledTeamAbbr
        };
      }),
      day:opts.day,
      week:state.currentWeek
    });
    const activeTeamIndexes=new Set();
    matchups.forEach(function(matchup){
      activeTeamIndexes.add(Number(matchup.home));
      activeTeamIndexes.add(Number(matchup.away));
    });
    const filteredResultsByTeam={};
    Object.keys(lowLevel.resultsByTeam || {}).forEach(function(teamIdx){
      const numericTeamIdx=Number(teamIdx);
      if(!activeTeamIndexes.has(numericTeamIdx)) return;
      filteredResultsByTeam[teamIdx]=lowLevel.resultsByTeam[teamIdx];
    });

    return Object.assign({}, lowLevel, {
      resultsByTeam:filteredResultsByTeam,
      gameLogs:lowLevel.gameLogs.map(function(game){
        const renderedScores=resolveRenderedGameScores({
          ...game,
          winner:game.homeTotal >= game.awayTotal ? 'home' : 'away'
        }, state);
        return Object.assign({}, game, {
          homeScore:renderedScores.homeScore,
          awayScore:renderedScores.awayScore,
          outcomeSource:'simulation_engine',
          winner:game.homeTotal >= game.awayTotal ? 'home' : 'away'
        });
      })
    });
  }

  function applySimulationDayResults(state, dayResult){
    const next=safeClone(state) || {};
    next.completedGameLogs=(next.completedGameLogs || []).concat(dayResult?.gameLogs || []);
    (dayResult?.gameLogs || []).forEach(function(game){
      const home=Array.isArray(next.standings)
        ? next.standings.find(function(row){ return Number(row.teamIdx) === Number(game.home); })
        : null;
      const away=Array.isArray(next.standings)
        ? next.standings.find(function(row){ return Number(row.teamIdx) === Number(game.away); })
        : null;
      if(!(home && away)) return;
      home.pf=Number(home.pf || 0) + Number(game.homeScore || 0);
      home.pa=Number(home.pa || 0) + Number(game.awayScore || 0);
      away.pf=Number(away.pf || 0) + Number(game.awayScore || 0);
      away.pa=Number(away.pa || 0) + Number(game.homeScore || 0);
      const authoritativeWinner=String(game?.winner || '').trim().toLowerCase();
      const homeWon=authoritativeWinner==='home'
        ? true
        : authoritativeWinner==='away'
          ? false
          : Number(game.homeScore || 0) >= Number(game.awayScore || 0);
      if(homeWon){
        home.w=Number(home.w || 0) + 1;
        away.l=Number(away.l || 0) + 1;
      }else{
        away.w=Number(away.w || 0) + 1;
        home.l=Number(home.l || 0) + 1;
      }
    });
    next.currentDay=Number(next.currentDay || 1) + 1;
    next.currentWeek=getSimulationSport(state)==='nfl'
      ? next.currentDay
      : Math.max(1, Math.ceil(next.currentDay / 7));
    return next;
  }

  const api={
    ENGINE_VERSION:ENGINE_VERSION,
    buildPlayerSimulationProfile:buildPlayerSimulationProfile,
    buildMixedEraRatings:buildMixedEraRatings,
    enrichLeagueState:enrichLeagueState,
    simulateLeagueDay:simulateLeagueDay,
    buildSimulationSeasonSchedule:buildSimulationSeasonSchedule,
    buildSimulationPlayIn:buildSimulationPlayIn,
    resolveSimulationPlayIn:resolveSimulationPlayIn,
    buildSimulationPlayoffBracket:buildSimulationPlayoffBracket,
    advanceSimulationSeries:advanceSimulationSeries,
    finalizeSimulationChampion:finalizeSimulationChampion,
    simulateSimulationGameDay:simulateSimulationGameDay,
    resolveRenderedGameScores:resolveRenderedGameScores,
    applySimulationDayResults:applySimulationDayResults,
    computeFantasyPoints:computeFantasyPoints
  };
  if(typeof module!=='undefined' && module.exports){
    module.exports=api;
  }
  global.RosterBateSimulationEngine=api;
})(typeof window!=='undefined' ? window : globalThis);
