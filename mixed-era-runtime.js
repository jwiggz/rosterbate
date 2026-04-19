(function(root){
  'use strict';

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  function roundStat(value){
    const num=Number(value || 0);
    return Number.isFinite(num) ? Math.round(num * 10) / 10 : 0;
  }

  function applyAvailabilityAdjustment(fp, gp){
    const baseFp=Number(fp || 0);
    const games=Math.max(0, Number(gp || 0));
    if(!Number.isFinite(baseFp) || baseFp<=0 || !games) return 0;
    const factor=Math.max(0.35, Math.min(1, 0.35 + (0.65 * (games / 82))));
    return roundStat(baseFp * factor);
  }

  function getMixedEraOverall(simProfile){
    return roundStat(simProfile && simProfile.mixedEraRatings ? simProfile.mixedEraRatings.overall : 0);
  }

  function buildProjection(simProfile, gp, fallbackFp){
    const mixedEraOverall=getMixedEraOverall(simProfile);
    const baseProjection=mixedEraOverall>0 ? roundStat(mixedEraOverall * 0.75) : Number(fallbackFp || 0);
    return applyAvailabilityAdjustment(baseProjection, gp);
  }

  function comparePlayers(a, b){
    const overallDelta=Number(b && b.mixedEraOverall || 0) - Number(a && a.mixedEraOverall || 0);
    if(overallDelta) return overallDelta;
    const fpDelta=Number(b && b.fp || 0) - Number(a && a.fp || 0);
    if(fpDelta) return fpDelta;
    return String(a && a.name || '').localeCompare(String(b && b.name || ''));
  }

  function normalizeSourceContexts(bundles){
    return (Array.isArray(bundles) ? bundles : []).map(function(bundle){
      if(!(bundle && typeof bundle==='object')) return null;
      const manifest=bundle.manifest && typeof bundle.manifest==='object' ? bundle.manifest : {};
      const season=bundle.season && typeof bundle.season==='object' ? bundle.season : {};
      const packId=String(manifest.packId || bundle.packId || '').trim();
      const seasonLabel=String(season.seasonLabel || bundle.seasonLabel || manifest.seasonLabel || packId).trim();
      const players=Array.isArray(bundle.players) ? bundle.players : [];
      if(!packId || !players.length) return null;
      return {
        packId: packId,
        seasonLabel: seasonLabel,
        players: players
      };
    }).filter(Boolean);
  }

  function curatePlayersForSource(sourceContext, topPlayersPerPack){
    return sourceContext.players.map(function(player){
      const basePlayer=clone(player);
      const simProfile=basePlayer && basePlayer.simProfile && typeof basePlayer.simProfile==='object'
        ? clone(basePlayer.simProfile)
        : null;
      const mixedEraOverall=getMixedEraOverall(simProfile);
      const mixedEraContext=clone((simProfile && simProfile.mixedEraContext) || {});
      if(!mixedEraContext.sourcePackId) mixedEraContext.sourcePackId=sourceContext.packId;
      const mixedEraProjection=buildProjection(simProfile, basePlayer && basePlayer.gp, basePlayer && basePlayer.fp);
      return Object.assign({}, basePlayer, {
        historicalPackId: sourceContext.packId,
        historicalSourcePackIds: [sourceContext.packId],
        historicalPackLabel: sourceContext.seasonLabel,
        mixedEraOverall: mixedEraOverall,
        mixedEraProjection: mixedEraProjection,
        mixedEraContext: mixedEraContext,
        fp: mixedEraProjection,
        simProfile: simProfile
      });
    }).sort(comparePlayers).slice(0, topPlayersPerPack);
  }

  function buildMixedEraDraftContextFromBundles(options){
    const input=options && typeof options==='object' ? options : {};
    const mixedEraConfig=clone(input.config || {});
    const requestedSport=String(input.requestedSport || mixedEraConfig.sport || 'nba').trim().toLowerCase();
    const sourceContexts=normalizeSourceContexts(input.bundles);
    if(!mixedEraConfig || !mixedEraConfig.mixedEraConfigId) throw new Error('mixed_era_config_required');
    if(!sourceContexts.length) return null;

    const topPlayersPerPack=Math.max(1, Math.round(Number(mixedEraConfig.topPlayersPerPack || 50))) || 50;
    const curatedPlayers=sourceContexts.reduce(function(allPlayers, sourceContext){
      return allPlayers.concat(curatePlayersForSource(sourceContext, topPlayersPerPack));
    }, []);
    const playerPool=curatedPlayers.sort(comparePlayers).map(function(player, index){
      return Object.assign({}, player, {
        id: 970001 + index,
        adp: index + 1
      });
    });
    const sourcePackIds=(Array.isArray(mixedEraConfig.sourcePackIds) ? mixedEraConfig.sourcePackIds : sourceContexts.map(function(sourceContext){
      return sourceContext.packId;
    })).map(function(packId){
      return String(packId || '').trim();
    }).filter(Boolean);
    const sourceSeasonLabels=sourceContexts.map(function(sourceContext){
      return String(sourceContext.seasonLabel || '').trim();
    }).filter(Boolean);

    return {
      sport: requestedSport,
      packId: String(mixedEraConfig.packId || '').trim() || ('mixed_era_' + mixedEraConfig.mixedEraConfigId),
      seasonId: String(mixedEraConfig.packId || '').trim() || ('mixed_era_' + mixedEraConfig.mixedEraConfigId),
      seasonLabel: String(mixedEraConfig.seasonLabel || '').trim() || 'Mixed Era Draft',
      mixedEraConfigId: String(mixedEraConfig.mixedEraConfigId || '').trim(),
      sourcePackIds: sourcePackIds,
      sourceSeasonLabels: sourceSeasonLabels,
      mixedEraTopPlayersPerPack: topPlayersPerPack,
      playerPool: playerPool,
      historicalPlayerPool: clone(playerPool),
      subtitle: String(mixedEraConfig.summary || '').trim(),
      draftTitleKicker: 'Mixed Era Draft',
      lobbySubLabel: (sourceSeasonLabels.join(' + ') || 'Mixed Era') + ' Crossover Board',
      lobbyPillText: 'Mixed Era Draft | ' + sourceContexts.length + ' Eras | ' + playerPool.length + ' Players | Era-Normalized',
      entryButtonLabel: 'Enter Mixed Era Draft',
      leagueNamePlaceholder: 'e.g. 90s vs 2010s Dream Draft',
      teamNamePlaceholder: 'e.g. Timebreakers',
      packSummary: String(mixedEraConfig.summary || '').trim(),
      presentation: null,
      packChallenges: null,
      summaries: null,
      mixedEraPackIds: clone(sourcePackIds),
      preferredDraftSpot: 1,
      suggestedLeagueSize: 10,
      syntheticType: String(mixedEraConfig.syntheticType || 'mixed_era').trim() || 'mixed_era',
      isHistoricalPack: true,
      isHistoricalPackDev: true,
      isMixedEraDraft: true,
      devLocalOnly: true,
      mixedEraConfig: mixedEraConfig
    };
  }

  var api={
    clone: clone,
    roundStat: roundStat,
    applyAvailabilityAdjustment: applyAvailabilityAdjustment,
    getMixedEraOverall: getMixedEraOverall,
    buildProjection: buildProjection,
    buildMixedEraDraftContextFromBundles: buildMixedEraDraftContextFromBundles
  };

  root.RosterBateMixedEraRuntime=api;

  if(typeof module!=='undefined' && module.exports){
    module.exports=api;
  }
})(typeof globalThis!=='undefined' ? globalThis : (typeof window!=='undefined' ? window : this));
