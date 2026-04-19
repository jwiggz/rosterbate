(function(root){
  'use strict';

  function clone(value){
    if(value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function roundStat(value){
    var num=Number(value || 0);
    return Number.isFinite(num) ? Math.round(num * 10) / 10 : 0;
  }

  function applyAvailabilityAdjustment(fp, gp){
    var baseFp=Number(fp || 0);
    var games=Math.max(0, Number(gp || 0));
    if(!Number.isFinite(baseFp) || baseFp<=0 || !games) return 0;
    var factor=Math.max(0.35, Math.min(1, 0.35 + (0.65 * (games / 82))));
    return roundStat(baseFp * factor);
  }

  function computeFantasyPoints(stats){
    return roundStat(
      Number(stats && stats.pts || 0)
      + (Number(stats && stats.reb || 0) * 1.2)
      + (Number(stats && stats.ast || 0) * 1.5)
      + (Number(stats && stats.stl || 0) * 3)
      + (Number(stats && stats.blk || 0) * 3)
      - Number(stats && stats.to || 0)
      + (Number(stats && stats.threes || 0) * 0.5)
    );
  }

  function getSeasonStatProfile(player){
    var seasonStats=player && player.seasonStats;
    if(!(seasonStats && typeof seasonStats==='object')) return null;
    var perGame=seasonStats.perGame && typeof seasonStats.perGame==='object' ? seasonStats.perGame : {};
    var totals=seasonStats.totals && typeof seasonStats.totals==='object' ? seasonStats.totals : {};
    var gp=Math.max(0, Number(seasonStats.games || player.gp || 0));
    var statLine={
      pts: roundStat(perGame.pts || player.pts || 0),
      reb: roundStat(perGame.reb || player.reb || 0),
      ast: roundStat(perGame.ast || player.ast || 0),
      stl: roundStat(perGame.stl || player.stl || 0),
      blk: roundStat(perGame.blk || player.blk || 0),
      to: roundStat(perGame.to || player.to || 0),
      min: roundStat(perGame.min || player.min || 0),
      fgm: roundStat(perGame.fgm || 0),
      fga: roundStat(perGame.fga || 0),
      ftm: roundStat(perGame.ftm || 0),
      fta: roundStat(perGame.fta || 0),
      threes: roundStat(perGame.threes || player.tpm || 0)
    };
    var totalFantasyPoints=computeFantasyPoints({
      pts: Number.isFinite(Number(totals.pts)) ? Number(totals.pts) : statLine.pts * gp,
      reb: Number.isFinite(Number(totals.reb)) ? Number(totals.reb) : statLine.reb * gp,
      ast: Number.isFinite(Number(totals.ast)) ? Number(totals.ast) : statLine.ast * gp,
      stl: Number.isFinite(Number(totals.stl)) ? Number(totals.stl) : statLine.stl * gp,
      blk: Number.isFinite(Number(totals.blk)) ? Number(totals.blk) : statLine.blk * gp,
      to: Number.isFinite(Number(totals.to)) ? Number(totals.to) : statLine.to * gp,
      threes: Number.isFinite(Number(totals.threes)) ? Number(totals.threes) : statLine.threes * gp
    });
    return {
      gp: gp,
      statLine: statLine,
      totalFantasyPoints: totalFantasyPoints
    };
  }

  function getMixedEraOverall(simProfile){
    return roundStat(simProfile && simProfile.mixedEraRatings ? simProfile.mixedEraRatings.overall : 0);
  }

  function buildProjection(simProfile, gp, fallbackFp){
    var mixedEraOverall=getMixedEraOverall(simProfile);
    var baseProjection=mixedEraOverall>0 ? roundStat(mixedEraOverall * 0.75) : Number(fallbackFp || 0);
    return applyAvailabilityAdjustment(baseProjection, gp);
  }

  function comparePlayers(a, b){
    var overallDelta=Number((b && b.mixedEraOverall) || 0) - Number((a && a.mixedEraOverall) || 0);
    if(overallDelta) return overallDelta;
    var fpDelta=Number((b && b.fp) || 0) - Number((a && a.fp) || 0);
    if(fpDelta) return fpDelta;
    return String(a && a.name || '').localeCompare(String(b && b.name || ''));
  }

  function normalizeSport(sport){
    return String(sport || 'nba').trim().toLowerCase();
  }

  function buildTeamAbbrById(teams){
    var map={};
    (Array.isArray(teams) ? teams : []).forEach(function(team, index){
      var teamId=String(team && team.teamId || '').trim();
      if(!teamId) return;
      var abbr=String(team && (team.abbreviation || team.name) || ('T' + (index + 1))).trim().toUpperCase().slice(0, 4);
      map[teamId]=abbr || ('T' + (index + 1));
    });
    return map;
  }

  function buildDraftReadyPlayer(player, sourceContext, index){
    var seasonProfile=getSeasonStatProfile(player);
    var statLine=seasonProfile ? seasonProfile.statLine : {
      pts: roundStat(player && player.pts || 0),
      reb: roundStat(player && player.reb || 0),
      ast: roundStat(player && player.ast || 0),
      stl: roundStat(player && player.stl || 0),
      blk: roundStat(player && player.blk || 0),
      to: roundStat(player && player.to || 0),
      min: roundStat(player && player.min || 0),
      fgm: roundStat(0),
      fga: roundStat(0),
      ftm: roundStat(0),
      fta: roundStat(0),
      threes: roundStat(player && player.tpm || 0)
    };
    var gp=Math.max(0, Number(player && player.gp || seasonProfile && seasonProfile.gp || 0));
    var totalFantasyPoints=seasonProfile ? seasonProfile.totalFantasyPoints : computeFantasyPoints({
      pts: statLine.pts * gp,
      reb: statLine.reb * gp,
      ast: statLine.ast * gp,
      stl: statLine.stl * gp,
      blk: statLine.blk * gp,
      to: statLine.to * gp,
      threes: statLine.threes * gp
    });
    var team=String(player && player.team || sourceContext.teamAbbrById[String(player && player.teamId || '').trim()] || 'HIS').trim().toUpperCase();
    var pos=String(player && (player.pos || player.primaryPosition) || 'UTIL').trim().toUpperCase();
    var statValues=Object.assign({}, player && player.statValues || {}, {
      PTS: statLine.pts,
      REB: statLine.reb,
      AST: statLine.ast,
      STL: statLine.stl,
      BLK: statLine.blk,
      TO: statLine.to,
      MIN: statLine.min,
      GP: gp,
      TFP: totalFantasyPoints,
      FGM: statLine.fgm,
      FGA: statLine.fga,
      FTM: statLine.ftm,
      FTA: statLine.fta,
      '3PM': statLine.threes
    });
    return Object.assign({}, clone(player), {
      id: Number(player && player.id || 950001 + index),
      historicalPlayerId: String(player && (player.historicalPlayerId || player.playerId) || '').trim() || null,
      historicalPackId: sourceContext.packId,
      historicalTeamId: String(player && player.teamId || '').trim() || null,
      historicalSeasonId: String(sourceContext.seasonId || '').trim() || null,
      name: String(player && (player.name || player.displayName) || [player && player.firstName, player && player.lastName].filter(Boolean).join(' ') || ('Historical Player ' + (index + 1))).trim(),
      firstName: String(player && player.firstName || '').trim(),
      lastName: String(player && player.lastName || '').trim(),
      team: team,
      pos: pos,
      gp: gp,
      totalFantasyPoints: roundStat(totalFantasyPoints),
      pts: statLine.pts,
      reb: statLine.reb,
      ast: statLine.ast,
      stl: statLine.stl,
      blk: statLine.blk,
      to: statLine.to,
      min: statLine.min,
      fgp: statLine.fga ? roundStat((statLine.fgm / statLine.fga) * 100) : roundStat(player && player.fgp || 0),
      ftp: statLine.fta ? roundStat((statLine.ftm / statLine.fta) * 100) : roundStat(player && player.ftp || 0),
      tpm: statLine.threes,
      fp: Number.isFinite(Number(player && player.fp)) ? Number(player.fp) : applyAvailabilityAdjustment(computeFantasyPoints(statLine), gp),
      statValues: statValues,
      statSummary: String(player && player.statSummary || (team + ' ' + pos + ' - ' + statLine.pts.toFixed(1) + ' pts - ' + statLine.reb.toFixed(1) + ' reb - ' + statLine.ast.toFixed(1) + ' ast')),
      designation: String(player && player.designation || 'ACTIVE').trim() || 'ACTIVE',
      draftEligible: player ? player.draftEligible !== false : true,
      seasonStats: clone(player && player.seasonStats || null),
      simProfile: clone(player && player.simProfile || null)
    });
  }

  function normalizeSourceContexts(bundles, requestedSport){
    return (Array.isArray(bundles) ? bundles : []).map(function(bundle){
      if(!(bundle && typeof bundle==='object')) return null;
      var manifest=bundle.manifest && typeof bundle.manifest==='object' ? bundle.manifest : {};
      var season=bundle.season && typeof bundle.season==='object' ? bundle.season : {};
      var packId=String(manifest.packId || bundle.packId || '').trim();
      var seasonSport=normalizeSport(season.sport || requestedSport);
      var players=Array.isArray(bundle.players) ? bundle.players : [];
      if(!packId || !players.length) return null;
      if(requestedSport && season.sport && seasonSport!==normalizeSport(requestedSport)) return null;
      var sourceContext={
        packId: packId,
        seasonId: String(season.seasonId || manifest.seasonId || '').trim(),
        seasonLabel: String(season.seasonLabel || manifest.seasonLabel || bundle.seasonLabel || packId).trim(),
        teamAbbrById: buildTeamAbbrById(bundle.teams),
        players: []
      };
      sourceContext.players=players.map(function(player, index){
        if(player && player.name && player.team && player.pos && player.statValues){
          return Object.assign({}, clone(player), {
            historicalPackId: String(player.historicalPackId || packId).trim() || packId
          });
        }
        return buildDraftReadyPlayer(player, sourceContext, index);
      });
      return sourceContext;
    }).filter(Boolean);
  }

  function resolveSimulationProfileBuilder(input){
    if(input && typeof input.buildPlayerSimulationProfile==='function') return input.buildPlayerSimulationProfile;
    if(root && root.RosterBateSimulationEngine && typeof root.RosterBateSimulationEngine.buildPlayerSimulationProfile==='function'){
      return root.RosterBateSimulationEngine.buildPlayerSimulationProfile.bind(root.RosterBateSimulationEngine);
    }
    return null;
  }

  function curatePlayersForSource(sourceContext, topPlayersPerPack, buildPlayerSimulationProfile){
    return sourceContext.players.map(function(player){
      var basePlayer=clone(player);
      var simProfile=basePlayer && basePlayer.simProfile && typeof basePlayer.simProfile==='object' ? clone(basePlayer.simProfile) : null;
      if((!simProfile || !simProfile.mixedEraRatings || !Number.isFinite(Number(simProfile.mixedEraRatings.overall))) && buildPlayerSimulationProfile){
        var rebuiltProfile=buildPlayerSimulationProfile(basePlayer, { packId: sourceContext.packId });
        simProfile=rebuiltProfile && typeof rebuiltProfile==='object' ? clone(rebuiltProfile) : null;
      }
      var mixedEraOverall=getMixedEraOverall(simProfile);
      var mixedEraContext=clone(simProfile && simProfile.mixedEraContext || {});
      if(!mixedEraContext || typeof mixedEraContext!=='object') mixedEraContext={};
      if(!mixedEraContext.sourcePackId) mixedEraContext.sourcePackId=sourceContext.packId;
      var mixedEraProjection=buildProjection(simProfile, basePlayer && basePlayer.gp, basePlayer && basePlayer.fp);
      var statValues=Object.assign({}, basePlayer && basePlayer.statValues || {}, {
        TFP: Number(basePlayer && (basePlayer.totalFantasyPoints || basePlayer.statValues && basePlayer.statValues.TFP) || 0),
        MXR: mixedEraOverall
      });
      return Object.assign({}, basePlayer, {
        historicalPackId: sourceContext.packId,
        historicalSourcePackIds: [sourceContext.packId],
        historicalPackLabel: sourceContext.seasonLabel,
        mixedEraOverall: mixedEraOverall,
        mixedEraProjection: mixedEraProjection,
        mixedEraContext: mixedEraContext,
        fp: mixedEraProjection,
        statValues: statValues,
        statSummary: String(basePlayer && basePlayer.statSummary || (String(basePlayer && basePlayer.team || 'ERA') + ' ' + String(basePlayer && basePlayer.pos || 'UTIL') + ' - ' + Number(basePlayer && basePlayer.pts || 0).toFixed(1) + ' pts')),
        simProfile: simProfile
      });
    }).sort(comparePlayers).slice(0, topPlayersPerPack);
  }

  function buildMixedEraDraftContextFromBundles(options){
    var input=options && typeof options==='object' ? options : {};
    var mixedEraConfig=clone(input.config || {});
    var requestedSport=normalizeSport(input.requestedSport || mixedEraConfig.sport || 'nba');
    var sourceContexts=normalizeSourceContexts(input.bundles, requestedSport);
    var buildPlayerSimulationProfile=resolveSimulationProfileBuilder(input);
    if(!mixedEraConfig || !mixedEraConfig.mixedEraConfigId) throw new Error('mixed_era_config_required');
    if(!sourceContexts.length) return null;

    var topPlayersPerPack=Math.max(1, Math.round(Number(mixedEraConfig.topPlayersPerPack || 50))) || 50;
    var curatedPlayers=sourceContexts.reduce(function(allPlayers, sourceContext){
      return allPlayers.concat(curatePlayersForSource(sourceContext, topPlayersPerPack, buildPlayerSimulationProfile));
    }, []);
    var playerPool=curatedPlayers.sort(comparePlayers).map(function(player, index){
      return Object.assign({}, player, {
        id: 970001 + index,
        adp: index + 1
      });
    });
    var sourcePackIds=(Array.isArray(mixedEraConfig.sourcePackIds) ? mixedEraConfig.sourcePackIds : sourceContexts.map(function(sourceContext){
      return sourceContext.packId;
    })).map(function(packId){
      return String(packId || '').trim();
    }).filter(Boolean);
    var sourceSeasonLabels=sourceContexts.map(function(sourceContext){
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
