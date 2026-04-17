(function(global){
  'use strict';

  const HISTORICAL_PACK_SCHEMA_VERSION=1;
  const ALLOWED_SPORTS=['nba'];
  const ALLOWED_LEAGUES=['nba'];
  const ALLOWED_SEASON_TYPES=['historical_pack'];
  const ALLOWED_STATUS=['concept','draft','review','ready','deprecated'];
  const ALLOWED_SOURCE_PROFILES=['historical_curated','historical_internal','historical_partnered'];
  const ALLOWED_SUPPORTED_MODES=['real_season','historical_draft','single_player_season'];
  const ALLOWED_DRAFT_MODES=['snake','auction'];
  const REQUIRED_CONTENT_FILE_KEYS=['season','teams','players','rosterSnapshots','schedule','games','playerGameStats'];
  const OPTIONAL_CONTENT_FILE_KEYS=['packChallenges','presentation','summaries'];
  const REQUIRED_PLAYER_GAME_STAT_FIELDS=[
    'minutes','points','rebounds','assists','steals','blocks','turnovers',
    'threePointersMade','fgm','fga','ftm','fta'
  ];

  function isPlainObject(value){
    return !!value && Object.prototype.toString.call(value)==='[object Object]';
  }

  function isNonEmptyString(value){
    return typeof value==='string' && value.trim().length>0;
  }

  function isArrayOfStrings(value){
    return Array.isArray(value) && value.every(isNonEmptyString);
  }

  function isBoolean(value){
    return typeof value==='boolean';
  }

  function isInteger(value){
    return Number.isInteger(value);
  }

  function isIsoDate(value){
    return isNonEmptyString(value) && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value+'T00:00:00Z'));
  }

  function isIsoDateTime(value){
    return isNonEmptyString(value) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) && !Number.isNaN(Date.parse(value));
  }

  function asArray(value){
    return Array.isArray(value) ? value : [];
  }

  function createReport(packId){
    return {
      status: 'validation_passed_clean',
      errors: [],
      warnings: [],
      summary: {
        packId: packId || '',
        schemaVersion: null,
        seasonId: '',
        teamCount: 0,
        playerCount: 0,
        gameCount: 0,
        playerGameStatCount: 0,
        warningCount: 0,
        errorCount: 0
      }
    };
  }

  function addError(report, code, message, path){
    report.errors.push({code: code, message: message, path: path || ''});
    report.status='validation_failed';
    report.summary.errorCount=report.errors.length;
  }

  function addWarning(report, code, message, path){
    report.warnings.push({code: code, message: message, path: path || ''});
    if(report.status!=='validation_failed') report.status='validation_passed_with_warnings';
    report.summary.warningCount=report.warnings.length;
  }

  function ensureRequiredString(report, obj, key, path){
    if(!isPlainObject(obj) || !isNonEmptyString(obj[key])){
      addError(report, 'missing_required_string', 'Missing required string field `'+key+'`.', path ? path+'.'+key : key);
      return false;
    }
    return true;
  }

  function ensureRequiredInteger(report, obj, key, path){
    if(!isPlainObject(obj) || !isInteger(obj[key])){
      addError(report, 'missing_required_integer', 'Missing required integer field `'+key+'`.', path ? path+'.'+key : key);
      return false;
    }
    return true;
  }

  function collectIdSet(rows, idKey){
    const set=new Set();
    asArray(rows).forEach(function(row){
      if(isPlainObject(row) && isNonEmptyString(row[idKey])) set.add(row[idKey]);
    });
    return set;
  }

  function validateManifest(manifest, report){
    if(!isPlainObject(manifest)){
      addError(report, 'invalid_manifest', 'Manifest must be a plain object.', 'manifest');
      return false;
    }

    report.summary.packId=isNonEmptyString(manifest.packId) ? manifest.packId : '';

    [
      'packId','sport','league','seasonId','seasonLabel','seasonType','era',
      'status','sourceProfile','defaultEntryMode','createdAt','updatedAt'
    ].forEach(function(key){
      ensureRequiredString(report, manifest, key, 'manifest');
    });

    ['schemaVersion','canonicalModelVersion','version'].forEach(function(key){
      ensureRequiredInteger(report, manifest, key, 'manifest');
    });

    if(!isBoolean(manifest.isHistorical)){
      addError(report, 'invalid_isHistorical', '`isHistorical` must be a boolean.', 'manifest.isHistorical');
    }else if(manifest.isHistorical!==true){
      addError(report, 'non_historical_pack', 'Historical pack manifest must have `isHistorical === true`.', 'manifest.isHistorical');
    }

    if(!ALLOWED_SPORTS.includes(manifest.sport)){
      addError(report, 'unsupported_sport', 'Unsupported sport `'+String(manifest.sport || '')+'`.', 'manifest.sport');
    }
    if(!ALLOWED_LEAGUES.includes(manifest.league)){
      addError(report, 'unsupported_league', 'Unsupported league `'+String(manifest.league || '')+'`.', 'manifest.league');
    }
    if(!ALLOWED_SEASON_TYPES.includes(manifest.seasonType)){
      addError(report, 'invalid_season_type', '`seasonType` must be `historical_pack`.', 'manifest.seasonType');
    }
    if(!ALLOWED_STATUS.includes(manifest.status)){
      addError(report, 'invalid_status', 'Unsupported manifest status `'+String(manifest.status || '')+'`.', 'manifest.status');
    }
    if(!ALLOWED_SOURCE_PROFILES.includes(manifest.sourceProfile)){
      addError(report, 'invalid_source_profile', 'Unsupported source profile `'+String(manifest.sourceProfile || '')+'`.', 'manifest.sourceProfile');
    }

    if(!Array.isArray(manifest.supportedModes) || manifest.supportedModes.length===0){
      addError(report, 'missing_supported_modes', '`supportedModes` must be a non-empty array.', 'manifest.supportedModes');
    }else{
      manifest.supportedModes.forEach(function(mode, index){
        if(!ALLOWED_SUPPORTED_MODES.includes(mode)){
          addError(report, 'invalid_supported_mode', 'Unsupported mode `'+String(mode || '')+'`.', 'manifest.supportedModes['+index+']');
        }
      });
      if(!manifest.supportedModes.includes(manifest.defaultEntryMode)){
        addError(report, 'default_mode_not_supported', '`defaultEntryMode` must appear in `supportedModes`.', 'manifest.defaultEntryMode');
      }
    }

    if(manifest.draftModes != null){
      if(!Array.isArray(manifest.draftModes)){
        addWarning(report, 'invalid_draft_modes_shape', '`draftModes` should be an array.', 'manifest.draftModes');
      }else{
        manifest.draftModes.forEach(function(mode, index){
          if(!ALLOWED_DRAFT_MODES.includes(mode)){
            addWarning(report, 'unsupported_draft_mode', 'Draft mode `'+String(mode || '')+'` is not currently recognized.', 'manifest.draftModes['+index+']');
          }
        });
      }
    }

    if(!isIsoDateTime(manifest.createdAt)){
      addError(report, 'invalid_createdAt', '`createdAt` must be a valid ISO datetime.', 'manifest.createdAt');
    }
    if(!isIsoDateTime(manifest.updatedAt)){
      addError(report, 'invalid_updatedAt', '`updatedAt` must be a valid ISO datetime.', 'manifest.updatedAt');
    }

    if(!isPlainObject(manifest.contentFiles)){
      addError(report, 'missing_content_files', '`contentFiles` must be a plain object.', 'manifest.contentFiles');
    }else{
      REQUIRED_CONTENT_FILE_KEYS.forEach(function(key){
        if(!isNonEmptyString(manifest.contentFiles[key])){
          addError(report, 'missing_required_content_file', 'Missing required content file pointer `'+key+'`.', 'manifest.contentFiles.'+key);
        }
      });
      OPTIONAL_CONTENT_FILE_KEYS.forEach(function(key){
        if(!isNonEmptyString(manifest.contentFiles[key])){
          addWarning(report, 'missing_optional_content_file', 'Optional content file pointer `'+key+'` is missing.', 'manifest.contentFiles.'+key);
        }
      });
    }

    if(!isNonEmptyString(manifest.focusTeamId)){
      addWarning(report, 'missing_focus_team', 'Manifest does not declare a `focusTeamId`.', 'manifest.focusTeamId');
    }
    if(!isNonEmptyString(manifest.subtitle)){
      addWarning(report, 'missing_subtitle', 'Manifest is missing a `subtitle`.', 'manifest.subtitle');
    }
    if(!isNonEmptyString(manifest.tagline)){
      addWarning(report, 'missing_tagline', 'Manifest is missing a `tagline`.', 'manifest.tagline');
    }

    report.summary.schemaVersion=isInteger(manifest.schemaVersion) ? manifest.schemaVersion : null;
    report.summary.seasonId=isNonEmptyString(manifest.seasonId) ? manifest.seasonId : '';

    if(report.summary.schemaVersion!==HISTORICAL_PACK_SCHEMA_VERSION){
      addError(report, 'unsupported_schema_version', 'Unsupported historical pack schema version `'+String(manifest.schemaVersion)+'`.', 'manifest.schemaVersion');
    }

    return report.errors.length===0;
  }

  function validateSeasonFile(season, manifest, report){
    if(!isPlainObject(season)){
      addError(report, 'invalid_season_file', '`season` must be a plain object.', 'season');
      return;
    }
    ['seasonId','sport','league','label','seasonType'].forEach(function(key){
      ensureRequiredString(report, season, key, 'season');
    });
    if(!isBoolean(season.isHistorical)){
      addError(report, 'invalid_season_isHistorical', '`season.isHistorical` must be a boolean.', 'season.isHistorical');
    }else if(season.isHistorical!==true){
      addError(report, 'season_not_historical', '`season.isHistorical` must be true.', 'season.isHistorical');
    }
    if(!isIsoDate(season.startDate)) addError(report, 'invalid_season_start', '`season.startDate` must be YYYY-MM-DD.', 'season.startDate');
    if(!isIsoDate(season.endDate)) addError(report, 'invalid_season_end', '`season.endDate` must be YYYY-MM-DD.', 'season.endDate');
    if(season.seasonId!==manifest.seasonId) addError(report, 'season_id_mismatch', '`season.seasonId` must match manifest `seasonId`.', 'season.seasonId');
    if(season.sport!==manifest.sport) addError(report, 'season_sport_mismatch', '`season.sport` must match manifest `sport`.', 'season.sport');
    if(season.league!==manifest.league) addError(report, 'season_league_mismatch', '`season.league` must match manifest `league`.', 'season.league');
    if(season.seasonType!=='historical_pack') addError(report, 'season_type_mismatch', '`season.seasonType` must be `historical_pack`.', 'season.seasonType');
  }

  function validateTeamsFile(teams, manifest, report){
    if(!Array.isArray(teams) || teams.length===0){
      addError(report, 'invalid_teams_file', '`teams` must be a non-empty array.', 'teams');
      return;
    }
    const seen=new Set();
    teams.forEach(function(team, index){
      const path='teams['+index+']';
      if(!isPlainObject(team)){
        addError(report, 'invalid_team_record', 'Team record must be a plain object.', path);
        return;
      }
      ['teamId','seasonId','city','name','displayName','abbreviation'].forEach(function(key){
        ensureRequiredString(report, team, key, path);
      });
      if(team.seasonId!==manifest.seasonId) addError(report, 'team_season_mismatch', 'Team seasonId must match manifest seasonId.', path+'.seasonId');
      if(isNonEmptyString(team.teamId)){
        if(seen.has(team.teamId)){
          addError(report, 'duplicate_team_id', 'Duplicate teamId `'+team.teamId+'`.', path+'.teamId');
        }
        seen.add(team.teamId);
      }
    });
    report.summary.teamCount=teams.length;
  }

  function validatePlayersFile(players, manifest, report){
    if(!Array.isArray(players) || players.length===0){
      addError(report, 'invalid_players_file', '`players` must be a non-empty array.', 'players');
      return;
    }
    const seen=new Set();
    players.forEach(function(player, index){
      const path='players['+index+']';
      if(!isPlainObject(player)){
        addError(report, 'invalid_player_record', 'Player record must be a plain object.', path);
        return;
      }
      ['playerId','seasonId','displayName','firstName','lastName','teamId','primaryPosition','status'].forEach(function(key){
        ensureRequiredString(report, player, key, path);
      });
      if(player.seasonId!==manifest.seasonId) addError(report, 'player_season_mismatch', 'Player seasonId must match manifest seasonId.', path+'.seasonId');
      if(isNonEmptyString(player.playerId)){
        if(seen.has(player.playerId)){
          addError(report, 'duplicate_player_id', 'Duplicate playerId `'+player.playerId+'`.', path+'.playerId');
        }
        seen.add(player.playerId);
      }
    });
    report.summary.playerCount=players.length;
  }

  function validateRosterSnapshotsFile(rosterSnapshots, manifest, report){
    if(!Array.isArray(rosterSnapshots) || rosterSnapshots.length===0){
      addError(report, 'invalid_roster_snapshots_file', '`rosterSnapshots` must be a non-empty array.', 'rosterSnapshots');
      return;
    }
    rosterSnapshots.forEach(function(row, index){
      const path='rosterSnapshots['+index+']';
      if(!isPlainObject(row)){
        addError(report, 'invalid_roster_snapshot_record', 'Roster snapshot record must be a plain object.', path);
        return;
      }
      ['seasonId','teamId','playerId'].forEach(function(key){
        ensureRequiredString(report, row, key, path);
      });
      if(row.seasonId!==manifest.seasonId) addError(report, 'roster_snapshot_season_mismatch', 'Roster snapshot seasonId must match manifest seasonId.', path+'.seasonId');
      if(row.startDate != null && !isIsoDate(row.startDate)) addError(report, 'invalid_roster_snapshot_start', '`startDate` must be YYYY-MM-DD when present.', path+'.startDate');
      if(row.endDate != null && !isIsoDate(row.endDate)) addError(report, 'invalid_roster_snapshot_end', '`endDate` must be YYYY-MM-DD when present.', path+'.endDate');
    });
  }

  function validateScheduleFile(schedule, manifest, report){
    if(!Array.isArray(schedule) || schedule.length===0){
      addError(report, 'invalid_schedule_file', '`schedule` must be a non-empty array.', 'schedule');
      return;
    }
    const seen=new Set();
    schedule.forEach(function(game, index){
      const path='schedule['+index+']';
      if(!isPlainObject(game)){
        addError(report, 'invalid_schedule_record', 'Schedule record must be a plain object.', path);
        return;
      }
      ['gameId','seasonId','gameDate','homeTeamId','awayTeamId'].forEach(function(key){
        ensureRequiredString(report, game, key, path);
      });
      if(game.seasonId!==manifest.seasonId) addError(report, 'schedule_season_mismatch', 'Schedule seasonId must match manifest seasonId.', path+'.seasonId');
      if(!isIsoDate(game.gameDate)) addError(report, 'invalid_schedule_date', '`gameDate` must be YYYY-MM-DD.', path+'.gameDate');
      if(game.homeTeamId===game.awayTeamId) addError(report, 'duplicate_schedule_teams', 'Home and away team cannot be the same.', path);
      if(isNonEmptyString(game.gameId)){
        if(seen.has(game.gameId)) addError(report, 'duplicate_game_id', 'Duplicate gameId `'+game.gameId+'`.', path+'.gameId');
        seen.add(game.gameId);
      }
    });
    report.summary.gameCount=schedule.length;
  }

  function validateGamesFile(games, manifest, report){
    if(!Array.isArray(games) || games.length===0){
      addError(report, 'invalid_games_file', '`games` must be a non-empty array.', 'games');
      return;
    }
    games.forEach(function(game, index){
      const path='games['+index+']';
      if(!isPlainObject(game)){
        addError(report, 'invalid_game_record', 'Game result record must be a plain object.', path);
        return;
      }
      ['gameId','seasonId','status'].forEach(function(key){
        ensureRequiredString(report, game, key, path);
      });
      if(game.seasonId!==manifest.seasonId) addError(report, 'games_season_mismatch', 'Game seasonId must match manifest seasonId.', path+'.seasonId');
      if(game.status!=='final') addError(report, 'non_final_game_status', 'Historical game result records must currently be final.', path+'.status');
      if(typeof game.homeScore!=='number') addError(report, 'missing_home_score', '`homeScore` must be a number.', path+'.homeScore');
      if(typeof game.awayScore!=='number') addError(report, 'missing_away_score', '`awayScore` must be a number.', path+'.awayScore');
    });
  }

  function validatePlayerGameStatsFile(playerGameStats, manifest, report){
    if(!Array.isArray(playerGameStats) || playerGameStats.length===0){
      addError(report, 'invalid_player_game_stats_file', '`playerGameStats` must be a non-empty array.', 'playerGameStats');
      return;
    }
    playerGameStats.forEach(function(row, index){
      const path='playerGameStats['+index+']';
      if(!isPlainObject(row)){
        addError(report, 'invalid_player_game_stat_record', 'Player game stat record must be a plain object.', path);
        return;
      }
      ['playerId','gameId','seasonId','teamId','opponentTeamId'].forEach(function(key){
        ensureRequiredString(report, row, key, path);
      });
      if(row.seasonId!==manifest.seasonId) addError(report, 'player_game_stat_season_mismatch', 'Player game stat seasonId must match manifest seasonId.', path+'.seasonId');
      REQUIRED_PLAYER_GAME_STAT_FIELDS.forEach(function(key){
        if(typeof row[key]!=='number') addError(report, 'missing_required_stat', 'Missing required numeric stat `'+key+'`.', path+'.'+key);
      });
    });
    report.summary.playerGameStatCount=playerGameStats.length;
  }

  function validateCrossFileRelationships(bundle, report){
    const manifest=bundle.manifest || {};
    const teams=asArray(bundle.teams);
    const players=asArray(bundle.players);
    const rosterSnapshots=asArray(bundle.rosterSnapshots);
    const schedule=asArray(bundle.schedule);
    const games=asArray(bundle.games);
    const playerGameStats=asArray(bundle.playerGameStats);
    const teamIds=collectIdSet(teams, 'teamId');
    const playerIds=collectIdSet(players, 'playerId');
    const gameIds=collectIdSet(schedule, 'gameId');

    players.forEach(function(player, index){
      if(isPlainObject(player) && isNonEmptyString(player.teamId) && !teamIds.has(player.teamId)){
        addError(report, 'player_team_missing', 'Player references unknown teamId `'+player.teamId+'`.', 'players['+index+'].teamId');
      }
    });

    rosterSnapshots.forEach(function(row, index){
      if(isPlainObject(row)){
        if(isNonEmptyString(row.teamId) && !teamIds.has(row.teamId)) addError(report, 'roster_snapshot_team_missing', 'Roster snapshot references unknown teamId `'+row.teamId+'`.', 'rosterSnapshots['+index+'].teamId');
        if(isNonEmptyString(row.playerId) && !playerIds.has(row.playerId)) addError(report, 'roster_snapshot_player_missing', 'Roster snapshot references unknown playerId `'+row.playerId+'`.', 'rosterSnapshots['+index+'].playerId');
      }
    });

    schedule.forEach(function(row, index){
      if(isPlainObject(row)){
        if(isNonEmptyString(row.homeTeamId) && !teamIds.has(row.homeTeamId)) addError(report, 'schedule_home_team_missing', 'Schedule references unknown homeTeamId `'+row.homeTeamId+'`.', 'schedule['+index+'].homeTeamId');
        if(isNonEmptyString(row.awayTeamId) && !teamIds.has(row.awayTeamId)) addError(report, 'schedule_away_team_missing', 'Schedule references unknown awayTeamId `'+row.awayTeamId+'`.', 'schedule['+index+'].awayTeamId');
      }
    });

    games.forEach(function(row, index){
      if(isPlainObject(row) && isNonEmptyString(row.gameId) && !gameIds.has(row.gameId)){
        addError(report, 'game_without_schedule', 'Game result references unknown gameId `'+row.gameId+'`.', 'games['+index+'].gameId');
      }
    });

    playerGameStats.forEach(function(row, index){
      if(isPlainObject(row)){
        if(isNonEmptyString(row.playerId) && !playerIds.has(row.playerId)) addError(report, 'player_game_stat_player_missing', 'Player game stat references unknown playerId `'+row.playerId+'`.', 'playerGameStats['+index+'].playerId');
        if(isNonEmptyString(row.gameId) && !gameIds.has(row.gameId)) addError(report, 'player_game_stat_game_missing', 'Player game stat references unknown gameId `'+row.gameId+'`.', 'playerGameStats['+index+'].gameId');
        if(isNonEmptyString(row.teamId) && !teamIds.has(row.teamId)) addError(report, 'player_game_stat_team_missing', 'Player game stat references unknown teamId `'+row.teamId+'`.', 'playerGameStats['+index+'].teamId');
        if(isNonEmptyString(row.opponentTeamId) && !teamIds.has(row.opponentTeamId)) addError(report, 'player_game_stat_opponent_missing', 'Player game stat references unknown opponentTeamId `'+row.opponentTeamId+'`.', 'playerGameStats['+index+'].opponentTeamId');
      }
    });

    if(isNonEmptyString(manifest.focusTeamId) && !teamIds.has(manifest.focusTeamId)){
      addError(report, 'focus_team_missing', 'Manifest focusTeamId does not exist in teams file.', 'manifest.focusTeamId');
    }

    if(Array.isArray(manifest.supportedModes) && manifest.supportedModes.includes('historical_draft') && playerIds.size<20){
      addWarning(report, 'suspicious_historical_draft_pool', 'Pack claims to support historical draft, but the player pool is unusually small.', 'manifest.supportedModes');
    }
  }

  function validatePackChallengesFile(packChallenges, bundle, report){
    if(packChallenges == null){
      addWarning(report, 'missing_pack_challenges', 'Optional `packChallenges` file is missing.', 'packChallenges');
      return;
    }
    if(!isPlainObject(packChallenges)){
      addError(report, 'invalid_pack_challenges_file', '`packChallenges` must be a plain object.', 'packChallenges');
      return;
    }
    if(packChallenges.packId!==bundle.manifest.packId){
      addError(report, 'pack_challenges_packId_mismatch', '`packChallenges.packId` must match manifest packId.', 'packChallenges.packId');
    }
    if(!Array.isArray(packChallenges.challengeGroups)) addError(report, 'invalid_pack_challenge_groups', '`challengeGroups` must be an array.', 'packChallenges.challengeGroups');
    if(!Array.isArray(packChallenges.challenges)) addError(report, 'invalid_pack_challenges', '`challenges` must be an array.', 'packChallenges.challenges');
  }

  function validatePresentationFile(presentation, bundle, report){
    if(presentation == null){
      addWarning(report, 'missing_presentation_file', 'Optional `presentation` file is missing.', 'presentation');
      return;
    }
    if(!isPlainObject(presentation)){
      addError(report, 'invalid_presentation_file', '`presentation` must be a plain object.', 'presentation');
      return;
    }
    const teamIds=collectIdSet(bundle.teams, 'teamId');
    const playerIds=collectIdSet(bundle.players, 'playerId');
    if(isNonEmptyString(presentation.featuredTeamId) && !teamIds.has(presentation.featuredTeamId)){
      addError(report, 'presentation_featured_team_missing', 'Presentation references unknown featuredTeamId.', 'presentation.featuredTeamId');
    }
    asArray(presentation.featuredStars).forEach(function(playerId, index){
      if(isNonEmptyString(playerId) && !playerIds.has(playerId)){
        addError(report, 'presentation_featured_star_missing', 'Presentation references unknown featured star `'+playerId+'`.', 'presentation.featuredStars['+index+']');
      }
    });
  }

  function validateSummariesFile(summaries, bundle, report){
    if(summaries == null){
      addWarning(report, 'missing_summaries_file', 'Optional `summaries` file is missing.', 'summaries');
      return;
    }
    if(!isPlainObject(summaries)){
      addError(report, 'invalid_summaries_file', '`summaries` must be a plain object.', 'summaries');
      return;
    }
    const teamIds=collectIdSet(bundle.teams, 'teamId');
    asArray(summaries.teamSpotlights).forEach(function(item, index){
      if(isPlainObject(item) && isNonEmptyString(item.teamId) && !teamIds.has(item.teamId)){
        addError(report, 'summary_team_missing', 'Summary references unknown teamId `'+item.teamId+'`.', 'summaries.teamSpotlights['+index+'].teamId');
      }
    });
  }

  function validateHistoricalPackBundle(bundle){
    const report=createReport(bundle && bundle.manifest && bundle.manifest.packId);
    if(!isPlainObject(bundle)){
      addError(report, 'invalid_bundle', 'Historical pack bundle must be a plain object.', 'bundle');
      return report;
    }

    const manifest=bundle.manifest;
    if(!validateManifest(manifest, report)){
      return report;
    }

    validateSeasonFile(bundle.season, manifest, report);
    validateTeamsFile(bundle.teams, manifest, report);
    validatePlayersFile(bundle.players, manifest, report);
    validateRosterSnapshotsFile(bundle.rosterSnapshots, manifest, report);
    validateScheduleFile(bundle.schedule, manifest, report);
    validateGamesFile(bundle.games, manifest, report);
    validatePlayerGameStatsFile(bundle.playerGameStats, manifest, report);

    if(report.status!=='validation_failed'){
      validateCrossFileRelationships(bundle, report);
    }

    validatePackChallengesFile(bundle.packChallenges, bundle, report);
    validatePresentationFile(bundle.presentation, bundle, report);
    validateSummariesFile(bundle.summaries, bundle, report);

    report.summary.warningCount=report.warnings.length;
    report.summary.errorCount=report.errors.length;
    return report;
  }

  const api={
    HISTORICAL_PACK_SCHEMA_VERSION: HISTORICAL_PACK_SCHEMA_VERSION,
    validateHistoricalPackManifest: function(manifest){
      const report=createReport(manifest && manifest.packId);
      validateManifest(manifest, report);
      report.summary.warningCount=report.warnings.length;
      report.summary.errorCount=report.errors.length;
      return report;
    },
    validateHistoricalPackBundle: validateHistoricalPackBundle,
    constants: {
      REQUIRED_CONTENT_FILE_KEYS: REQUIRED_CONTENT_FILE_KEYS.slice(),
      OPTIONAL_CONTENT_FILE_KEYS: OPTIONAL_CONTENT_FILE_KEYS.slice(),
      REQUIRED_PLAYER_GAME_STAT_FIELDS: REQUIRED_PLAYER_GAME_STAT_FIELDS.slice(),
      ALLOWED_SUPPORTED_MODES: ALLOWED_SUPPORTED_MODES.slice(),
      ALLOWED_DRAFT_MODES: ALLOWED_DRAFT_MODES.slice()
    }
  };

  global.RosterBateHistoricalPackValidator=api;

  if(typeof module!=='undefined' && module.exports){
    module.exports=api;
  }
})(typeof window!=='undefined' ? window : globalThis);
