(function(global){
  'use strict';

  const ENGINE_VERSION='2026-04-19-sim-mvp-v3';
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
    if(baseline.reb >= 9.5 && baseline.ast >= 4.5) return 'point_forward';
    if(baseline.pts >= 24) return 'primary_scorer';
    if(baseline.reb >= 10) return 'glass_cleaner';
    if(baseline.stl + baseline.blk >= 3.2) return 'defensive_event_creator';
    return 'balanced_rotation';
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
    adjusted.overall=roundStat(adjustedOverall * lowGamesConfidence);
    return {
      ratings:adjusted,
      context:{
        eraLabel:eraContext.eraLabel,
        fantasyBaseline:roundStat(eraContext.fantasyBaseline),
        fantasyPerGame:roundStat(fantasyPerGame),
        fantasyInflation:roundStat(eraContext.fantasyInflation),
        dominance:roundStat(dominance),
        lowGamesConfidence:lowGamesConfidence,
        normalizationModel:'season_context_plus_light_authored_tuning'
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
      source:'real_season_stats_plus_light_authored_tuning',
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
      ratingsSource:'real season stats + light authored tuning',
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

  function getPlayerById(roster, playerId){
    return Array.isArray(roster)
      ? roster.find(function(player){ return Number(player?.id) === Number(playerId); }) || null
      : null;
  }

  function buildTeamProfile(roster, lineupIds, packId){
    const starters=(Array.isArray(lineupIds) ? lineupIds : [])
      .map(function(playerId){ return getPlayerById(roster, playerId); })
      .filter(Boolean);
    const tuning=getPackTuning(packId);
    const avg=function(selector, fallback){
      if(!starters.length) return fallback;
      return starters.reduce(function(sum, player){
        return sum + Number(selector(player) || 0);
      }, 0) / starters.length;
    };
    return {
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
    const starters=teamProfile.starters;
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
      const minuteLoad=clamp(
        (baseline.min || 28) * (0.94 + Number(ratings.stamina || 50) / 220 + normalish(rng) * 0.04),
        14,
        42
      );
      const pts=roundStat(Math.max(0, baseline.pts * gameContext.sharedPace * offenseBoost * (0.78 + usageWeight * 1.65) * randomSwing));
      const reb=roundStat(Math.max(0, baseline.reb * gameContext.sharedPace * (0.84 + reboundWeight * 1.2 + reboundShift)));
      const ast=roundStat(Math.max(0, baseline.ast * gameContext.sharedPace * (0.82 + playWeight * 1.45) * (0.94 + teamProfile.tuning.assistBoost * 0.08)));
      const stl=roundStat(Math.max(0, baseline.stl * clamp(0.9 + (Number(ratings.defense || 50) - Number(opponentProfile.playmaking || 50)) / 300, 0.62, 1.34) * (0.88 + rng() * 0.28)));
      const blk=roundStat(Math.max(0, baseline.blk * clamp(0.92 + (Number(ratings.defense || 50) - Number(opponentProfile.offense || 50)) / 320, 0.6, 1.38) * (0.88 + rng() * 0.26)));
      const turnovers=roundStat(Math.max(0, baseline.to * (0.86 + usageWeight * 0.9) * (0.88 + rng() * 0.22)));
      const threes=roundStat(Math.max(0, baseline.threes * gameContext.sharedPace * (0.82 + usageWeight * 1.28) * teamProfile.tuning.threeBoost * (0.9 + rng() * 0.22)));
      const fga=roundStat(Math.max(threes + 2, baseline.fga * gameContext.sharedPace * (0.8 + usageWeight * 1.6) * offenseBoost));
      const fgm=roundStat(Math.min(fga, Math.max(0, baseline.fgm * gameContext.sharedPace * offenseBoost * efficiencyBoost * (0.88 + rng() * 0.18))));
      const fta=roundStat(Math.max(0, baseline.fta * (0.82 + usageWeight * 1.15) * offenseBoost * (0.88 + rng() * 0.16)));
      const ftm=roundStat(Math.min(fta, Math.max(0, baseline.ftm * (0.9 + rng() * 0.14))));
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

  function simulateLeagueDay(options){
    const opts=options && typeof options==='object' ? options : {};
    const state=opts.state || {};
    const packId=String(opts.packId || state.historicalPackId || '').trim();
    const matchups=Array.isArray(opts.matchups) ? opts.matchups : [];
    const lineupIdsByTeam=Array.isArray(opts.lineupIdsByTeam) ? opts.lineupIdsByTeam : [];
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
      const homeProfile=buildTeamProfile(homeRoster, lineupIdsByTeam[homeIdx], packId);
      const awayProfile=buildTeamProfile(awayRoster, lineupIdsByTeam[awayIdx], packId);
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
        sharedPace:roundStat(gameContext.sharedPace),
        engineVersion:ENGINE_VERSION
      });
    });

    for(let teamIdx=0; teamIdx<teamCount; teamIdx+=1){
      if(resultsByTeam[teamIdx]) continue;
      resultsByTeam[teamIdx]={
        total:0,
        entries:[],
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

  global.RosterBateSimulationEngine={
    ENGINE_VERSION:ENGINE_VERSION,
    buildPlayerSimulationProfile:buildPlayerSimulationProfile,
    buildMixedEraRatings:buildMixedEraRatings,
    enrichLeagueState:enrichLeagueState,
    simulateLeagueDay:simulateLeagueDay,
    computeFantasyPoints:computeFantasyPoints
  };
})(window);
