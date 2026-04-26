(function(global){
  'use strict';

  const INDEX_KEY = 'rbHistoricalUniverseSlots';
  const STATE_PREFIX = 'rbHistoricalUniverseState:';
  const NBA_SIMULATION_MODE = 'nba_mixed_era_single_player_v1';
  const NFL_SIMULATION_MODE = 'nfl_mixed_era_single_player_v1';

  function safeJsonParse(raw){
    try{
      return raw ? JSON.parse(raw) : null;
    }catch(e){
      return null;
    }
  }

  function safeClone(value){
    try{
      return JSON.parse(JSON.stringify(value));
    }catch(e){
      return null;
    }
  }

  function normalizeSport(value){
    return String(value || 'nba').trim().toLowerCase() || 'nba';
  }

  function getSimulationRouteMode(value, sport){
    const mode = String(value || '').trim().toLowerCase();
    if(mode === NFL_SIMULATION_MODE) return 'nfl_mixed_era';
    if(mode === NBA_SIMULATION_MODE) return 'nba_mixed_era';
    return normalizeSport(sport) === 'nfl' ? 'nfl_mixed_era' : 'nba_mixed_era';
  }

  function slugifyKey(value){
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'slot';
  }

  function normalizeHistoricalEntryMode(entryMode, fallback){
    const normalized = String(entryMode || '').trim().toLowerCase();
    switch(normalized){
      case 'simulation_season':
      case 'historical_sim':
      case 'single_player_season':
      case 'real_season':
        return 'simulation_season';
      case 'historical_draft':
        return 'historical_draft';
      case 'reimagined_season':
        return 'reimagined_season';
      default:
        return fallback || 'simulation_season';
    }
  }

  function isSimulationModeState(state){
    const explicitBackend = String(state?.activeSeasonBackend || state?.seasonBackend || state?.backend || '').trim().toLowerCase();
    if(explicitBackend === 'simulation') return true;
    if(explicitBackend === 'fantasy') return false;
    const mode = String(state?.simulationMode || '').trim().toLowerCase();
    if(mode === NBA_SIMULATION_MODE || mode === NFL_SIMULATION_MODE) return true;
    const entryMode = String(state?.historicalEntryMode || '').trim();
    if(entryMode){
      return normalizeHistoricalEntryMode(entryMode, '') === 'simulation_season';
    }
    return false;
  }

  function isSimulationModeUniverse(slot, state){
    return isSimulationModeState(slot) || isSimulationModeState(state);
  }

  function storageAvailable(){
    try{
      return !!global.localStorage;
    }catch(e){
      return false;
    }
  }

  function readIndex(){
    if(!storageAvailable()) return [];
    const parsed = safeJsonParse(global.localStorage.getItem(INDEX_KEY));
    return Array.isArray(parsed) ? parsed : [];
  }

  function writeIndex(index){
    if(!storageAvailable()) return;
    global.localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  }

  function stateKey(slotId){
    return STATE_PREFIX + String(slotId || '').trim();
  }

  function createSlotId(state){
    const sport = normalizeSport(state?.sport || state?.leagueShell?.sport || 'nba');
    const packId = isSimulationModeState(state)
      ? slugifyKey(state?.sourceSeasons?.mixedEraConfigId || state?.leagueShell?.anchorSeasonLabel || 'simulation_universe')
      : slugifyKey(state?.historicalPackId || 'historic_pack');
    const entryMode = isSimulationModeState(state)
      ? 'simulation_universe'
      : slugifyKey(normalizeHistoricalEntryMode(state?.historicalEntryMode, 'simulation_season'));
    const stamp = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 8);
    return [sport, packId, entryMode, stamp, rand].join('_');
  }

  function getModeLabel(entryMode){
    switch(normalizeHistoricalEntryMode(entryMode, 'simulation_season')){
      case 'simulation_season':
        return 'Sim Season';
      case 'historical_draft':
        return 'Drafted Universe';
      case 'reimagined_season':
        return 'Reimagined Season';
      default:
        return 'Sim Season';
    }
  }

  function getModeTone(entryMode){
    switch(normalizeHistoricalEntryMode(entryMode, 'simulation_season')){
      case 'simulation_season':
        return 'simulation';
      case 'historical_draft':
        return 'draft';
      case 'reimagined_season':
        return 'reimagined';
      default:
        return 'simulation';
    }
  }

  function getSeasonLabel(state){
    return String(
      state?.historicalPresentation?.seasonLabel ||
      state?.leagueName ||
      state?.historicalSeasonId ||
      state?.historicalPackId ||
      'Simulation Archive'
    ).trim();
  }

  function getSubtitle(state){
    const teamName = String(
      state?.teamName ||
      state?.historicalPresentation?.focusTeamName ||
      ''
    ).trim();
    const week = Number(state?.currentWeek || state?.week || 1) || 1;
    const day = Number(state?.currentDay || state?.day || 1) || 1;
    const base = teamName || 'Simulation archive';
    return base + ' - Wk ' + week + ' - Day ' + day;
  }

  function getSortedStandings(standings){
    return Array.isArray(standings)
      ? standings.slice().sort(function(a, b){
          const winDiff = Number(b?.w || 0) - Number(a?.w || 0);
          if(winDiff) return winDiff;
          const pfDiff = Number(b?.pf || 0) - Number(a?.pf || 0);
          if(pfDiff) return pfDiff;
          return Number(a?.l || 0) - Number(b?.l || 0);
        })
      : [];
  }

  function getUserStandingSummary(state){
    const myPos = Number(state?.myPos);
    if(!Array.isArray(state?.standings) || !Number.isFinite(myPos)) return null;
    const sorted = getSortedStandings(state.standings);
    const standing = sorted.find(function(entry){ return Number(entry?.teamIdx) === myPos; }) ||
      state.standings.find(function(entry){ return Number(entry?.teamIdx) === myPos; });
    if(!standing) return null;
    const rank = sorted.findIndex(function(entry){ return Number(entry?.teamIdx) === myPos; });
    return {
      wins: Number(standing?.w || 0),
      losses: Number(standing?.l || 0),
      pf: Number(standing?.pf || 0),
      pa: Number(standing?.pa || 0),
      rank: rank >= 0 ? rank + 1 : null
    };
  }

  function getProgressLabel(state){
    const week = Number(state?.currentWeek || state?.week || 1) || 1;
    const day = Number(state?.currentDay || state?.day || 1) || 1;
    if(state?.isSeasonComplete) return 'Season complete';
    return 'Week ' + week + ' - Day ' + day;
  }

  function getPlayerIdentityKey(player){
    const numericId = Number(player?.id);
    if(Number.isFinite(numericId)) return 'id:' + numericId;
    const historicalId = String(player?.historicalPlayerId || '').trim();
    if(historicalId) return 'historical:' + historicalId;
    const name = String(player?.name || '').trim();
    return name ? ('name:' + name) : '';
  }

  function countUniquePlayers(players, seen){
    const targetSeen = seen || new Set();
    (Array.isArray(players) ? players : []).forEach(function(player){
      const key = getPlayerIdentityKey(player);
      if(key) targetSeen.add(key);
    });
    return targetSeen;
  }

  function getPlayerPoolCount(state){
    const explicitPool = Array.isArray(state?.historicalPlayerPool) ? state.historicalPlayerPool : [];
    if(explicitPool.length) return explicitPool.length;
    const seen = new Set();
    countUniquePlayers(state?.myRoster, seen);
    countUniquePlayers((Array.isArray(state?.allRosters) ? state.allRosters : []).flat(), seen);
    countUniquePlayers((Array.isArray(state?.ilByTeam) ? state.ilByTeam : []).flat(), seen);
    countUniquePlayers((Array.isArray(state?.ilRosters) ? state.ilRosters : []).flat(), seen);
    countUniquePlayers(state?.waiver, seen);
    countUniquePlayers(state?.freeAgents, seen);
    return seen.size;
  }

  function getSimulationControlledTeamAbbr(state){
    return String(state?.draftState?.controlledTeamAbbr || '').trim().toUpperCase();
  }

  function getSimulationControlledTeam(state){
    const teamAbbr = getSimulationControlledTeamAbbr(state);
    return (Array.isArray(state?.leagueShell?.teams) ? state.leagueShell.teams : []).find(function(team){
      return String(team?.abbr || '').trim().toUpperCase() === teamAbbr;
    }) || null;
  }

  function getSimulationStandingSummary(state){
    const teamAbbr = getSimulationControlledTeamAbbr(state);
    const standings = Array.isArray(state?.seasonState?.standings) ? state.seasonState.standings : [];
    if(!teamAbbr || !standings.length) return null;
    const sorted = standings.slice().sort(function(a, b){
      const winDiff = Number(b?.w || 0) - Number(a?.w || 0);
      if(winDiff) return winDiff;
      const pfDiff = Number(b?.pf || 0) - Number(a?.pf || 0);
      if(pfDiff) return pfDiff;
      return Number(a?.l || 0) - Number(b?.l || 0);
    });
    const standing = sorted.find(function(entry){
      return String(entry?.teamAbbr || '').trim().toUpperCase() === teamAbbr;
    }) || standings.find(function(entry){
      return String(entry?.teamAbbr || '').trim().toUpperCase() === teamAbbr;
    });
    if(!standing) return null;
    const rank = sorted.findIndex(function(entry){
      return String(entry?.teamAbbr || '').trim().toUpperCase() === teamAbbr;
    });
    return {
      wins: Number(standing?.w || 0),
      losses: Number(standing?.l || 0),
      pf: Number(standing?.pf || 0),
      pa: Number(standing?.pa || 0),
      rank: rank >= 0 ? rank + 1 : null
    };
  }

  function getSimulationPlayerPoolCount(state){
    const seen = new Set();
    Object.keys(state?.draftState?.rostersByTeam || {}).forEach(function(teamAbbr){
      countUniquePlayers(state?.draftState?.rostersByTeam?.[teamAbbr], seen);
    });
    countUniquePlayers(state?.draftState?.draftPool, seen);
    countUniquePlayers(state?.draftState?.freeAgents, seen);
    countUniquePlayers(state?.historicalPlayerPool, seen);
    countUniquePlayers(state?.waiver, seen);
    (Array.isArray(state?.allRosters) ? state.allRosters : []).forEach(function(roster){
      countUniquePlayers(roster, seen);
    });
    return seen.size;
  }

  function getSimulationProgressLabel(state){
    const sport = normalizeSport(state?.sport || state?.leagueShell?.sport || 'nba');
    const postseason = state?.postseasonState && typeof state.postseasonState === 'object'
      ? state.postseasonState
      : {};
    const phase = String(postseason.phase || 'regular_season').trim().toLowerCase();
    const championAbbr = String(postseason?.champion?.teamAbbr || postseason?.champion?.championTeamAbbr || '').trim();
    const currentWeek = Number(state?.seasonState?.currentWeek || 1) || 1;
    const currentDay = Number(state?.seasonState?.currentDay || 1) || 1;
    if(championAbbr || phase === 'completed'){
      return 'Season complete';
    }
    if(sport === 'nfl'){
      const nflPhaseLabels = {
        postseason_ready: 'Playoffs locked',
        wild_card: 'Wild Card round',
        divisional: 'Divisional round',
        conference_championship: 'Conference championships',
        super_bowl: 'Super Bowl'
      };
      if(nflPhaseLabels[phase]){
        return nflPhaseLabels[phase];
      }
      return 'Week ' + currentWeek;
    }
    const nbaPhaseLabels = {
      postseason_ready: 'Bracket locked',
      play_in: 'Play-In tournament',
      playoffs_round_1: 'Round 1',
      playoffs_round_2: 'Round 2',
      conference_semifinals: 'Semifinals',
      conference_finals: 'Conference finals',
      finals: 'Finals'
    };
    if(nbaPhaseLabels[phase]){
      return nbaPhaseLabels[phase];
    }
    return 'Week ' + currentWeek + ' - Day ' + currentDay;
  }

  function getSimulationSubtitle(state){
    const controlledTeam = getSimulationControlledTeam(state);
    const teamLabel = String(controlledTeam?.name || controlledTeam?.abbr || 'Simulation universe').trim();
    return teamLabel + ' - ' + getSimulationProgressLabel(state);
  }

  function buildPersistedState(state, slotId, existingMeta){
    const payload = safeClone(state);
    if(!payload) return null;
    payload.historicalUniverseSlotId = slotId;
    if(!payload.historicalUniverseCreatedAt){
      payload.historicalUniverseCreatedAt = Number(existingMeta?.createdAt || Date.now());
    }
    if(isSimulationModeState(payload)){
      payload.sport = normalizeSport(payload?.sport || payload?.leagueShell?.sport || 'nba');
      payload.historicalEntryMode = 'simulation_season';
      payload.activeSeasonBackend = 'simulation';
      payload.legacyHistoricalStatMode = false;
      if((!Array.isArray(payload.waiver) || !payload.waiver.length) && Array.isArray(payload.freeAgents) && payload.freeAgents.length){
        payload.waiver = safeClone(payload.freeAgents) || [];
      }
      delete payload.historicalPlayerPool;
      delete payload.freeAgents;
      return payload;
    }
    if((!Array.isArray(payload.waiver) || !payload.waiver.length) && Array.isArray(payload.freeAgents) && payload.freeAgents.length){
      payload.waiver = safeClone(payload.freeAgents) || [];
    }
    delete payload.historicalPlayerPool;
    delete payload.freeAgents;
    return payload;
  }

  function summarizeSimulationState(state, slotId, existingMeta){
    const createdAt = Number(existingMeta?.createdAt || state?.historicalUniverseCreatedAt || Date.now());
    const updatedAt = Date.now();
    const controlledTeam = getSimulationControlledTeam(state);
    const standing = getSimulationStandingSummary(state);
    const currentWeek = Number(state?.seasonState?.currentWeek || 1) || 1;
    const currentDay = Number(state?.seasonState?.currentDay || 1) || 1;
    const leagueName = String(state?.leagueShell?.anchorSeasonLabel || 'NBA Simulation').trim();
    const sourcePackIds = Array.isArray(state?.sourceSeasons?.sourcePackIds)
      ? state.sourceSeasons.sourcePackIds.map(function(id){ return String(id || '').trim(); }).filter(Boolean)
      : Array.isArray(state?.historicalSourcePackIds)
      ? state.historicalSourcePackIds.map(function(id){ return String(id || '').trim(); }).filter(Boolean)
      : [];
    const sourceSeasonLabels = Array.isArray(state?.sourceSeasons?.sourceSeasonLabels)
      ? state.sourceSeasons.sourceSeasonLabels.map(function(label){ return String(label || '').trim(); }).filter(Boolean)
      : Array.isArray(state?.mixedEraSourceSeasonLabels)
      ? state.mixedEraSourceSeasonLabels.map(function(label){ return String(label || '').trim(); }).filter(Boolean)
      : [];
    return {
      slotId,
      title: leagueName + ' - Simulation Universe',
      subtitle: getSimulationSubtitle(state),
      sport: normalizeSport(state?.sport || state?.leagueShell?.sport || 'nba'),
      historicalPackId: String(state?.sourceSeasons?.mixedEraConfigId || state?.mixedEraConfigId || state?.historicalPackId || '').trim() || null,
      historicalSourcePackIds: sourcePackIds.length ? sourcePackIds : null,
      historicalSeasonId: String(state?.leagueShell?.anchorSeasonId || '').trim() || null,
      mixedEraConfigId: String(state?.sourceSeasons?.mixedEraConfigId || state?.mixedEraConfigId || '').trim() || null,
      mixedEraTopPlayersPerPack: null,
      mixedEraSourceSeasonLabels: sourceSeasonLabels.length ? sourceSeasonLabels : null,
      historicalEntryMode: 'simulation_season',
      historicalSelectedTeamId: String(controlledTeam?.abbr || '').trim() || null,
      seasonId: String(state?.seasonId || state?.leagueShell?.anchorSeasonId || '').trim() || null,
      leagueName: leagueName,
      teamName: String(controlledTeam?.name || controlledTeam?.abbr || '').trim() || null,
      currentWeek: currentWeek,
      currentDay: currentDay,
      leagueSize: Number(Array.isArray(state?.leagueShell?.teams) ? state.leagueShell.teams.length : 0),
      playerPoolCount: getSimulationPlayerPoolCount(state),
      modeTone: 'simulation',
      progressLabel: getSimulationProgressLabel(state),
      wins: standing?.wins ?? null,
      losses: standing?.losses ?? null,
      pf: standing?.pf ?? null,
      pa: standing?.pa ?? null,
      teamRank: standing?.rank ?? null,
      simulationMode: String(state?.simulationMode || (normalizeSport(state?.sport || state?.leagueShell?.sport || 'nba') === 'nfl' ? NFL_SIMULATION_MODE : NBA_SIMULATION_MODE)).trim() || NBA_SIMULATION_MODE,
      createdAt,
      updatedAt
    };
  }

  function summarizeHistoricalState(state, slotId, existingMeta){
    const historicalEntryMode = normalizeHistoricalEntryMode(state?.historicalEntryMode, 'simulation_season');
    const title = getSeasonLabel(state) + ' - ' + getModeLabel(historicalEntryMode);
    const createdAt = Number(existingMeta?.createdAt || state?.historicalUniverseCreatedAt || state?.createdAt || state?.savedAt || Date.now());
    const updatedAt = Date.now();
    const standing = getUserStandingSummary(state);
    const sourcePackIds=Array.isArray(state?.historicalSourcePackIds)
      ? state.historicalSourcePackIds.map(function(id){ return String(id || '').trim(); }).filter(Boolean)
      : [];
    const mixedEraSourceSeasonLabels=Array.isArray(state?.mixedEraSourceSeasonLabels)
      ? state.mixedEraSourceSeasonLabels.map(function(label){ return String(label || '').trim(); }).filter(Boolean)
      : [];
    return {
      slotId,
      title,
      subtitle: getSubtitle(state),
      sport: normalizeSport(state?.sport),
      historicalPackId: String(state?.historicalPackId || '').trim() || null,
      historicalSourcePackIds: sourcePackIds.length ? sourcePackIds : null,
      historicalSeasonId: String(state?.historicalSeasonId || '').trim() || null,
      mixedEraConfigId: String(state?.mixedEraConfigId || '').trim() || null,
      mixedEraTopPlayersPerPack: Number.isFinite(Number(state?.mixedEraTopPlayersPerPack))
        ? Number(state.mixedEraTopPlayersPerPack)
        : null,
      mixedEraSourceSeasonLabels: mixedEraSourceSeasonLabels.length ? mixedEraSourceSeasonLabels : null,
      historicalEntryMode: historicalEntryMode,
      historicalSelectedTeamId: String(state?.historicalSelectedTeamId || '').trim() || null,
      seasonId: String(state?.seasonId || '').trim() || null,
      leagueName: String(state?.leagueName || '').trim() || null,
      teamName: String(state?.teamName || '').trim() || null,
      currentWeek: Number(state?.currentWeek || state?.week || 1) || 1,
      currentDay: Number(state?.currentDay || state?.day || 1) || 1,
      leagueSize: Number(state?.leagueSize || (Array.isArray(state?.teams) ? state.teams.length : 0) || 0),
      playerPoolCount: getPlayerPoolCount(state),
      modeTone: getModeTone(historicalEntryMode),
      progressLabel: getProgressLabel(state),
      wins: standing?.wins ?? null,
      losses: standing?.losses ?? null,
      pf: standing?.pf ?? null,
      pa: standing?.pa ?? null,
      teamRank: standing?.rank ?? null,
      createdAt,
      updatedAt
    };
  }

  function summarizeState(state, slotId, existingMeta){
    if(isSimulationModeState(state)){
      return summarizeSimulationState(state, slotId, existingMeta);
    }
    return summarizeHistoricalState(state, slotId, existingMeta);
  }

  function sortIndex(index){
    return index.slice().sort(function(a, b){
      return Number(b?.updatedAt || 0) - Number(a?.updatedAt || 0);
    });
  }

  function upsertFromState(state, options){
    if(!storageAvailable() || !state || typeof state !== 'object') return null;
    if(!state.historicalPackId && !isSimulationModeState(state)) return null;
    const opts = options && typeof options === 'object' ? options : {};
    const index = readIndex();
    const slotId = String(opts.slotId || state.historicalUniverseSlotId || '').trim() || createSlotId(state);
    const existingMeta = index.find(function(entry){ return entry && entry.slotId === slotId; }) || null;
    const payload = buildPersistedState(state, slotId, existingMeta);
    if(!payload) return null;
    const metadata = summarizeState(payload, slotId, existingMeta);
    global.localStorage.setItem(stateKey(slotId), JSON.stringify(payload));
    writeIndex(sortIndex([metadata].concat(index.filter(function(entry){ return entry && entry.slotId !== slotId; }))));
    return {
      slotId,
      metadata,
      state: payload
    };
  }

  function getState(slotId){
    if(!storageAvailable()) return null;
    const id = String(slotId || '').trim();
    if(!id) return null;
    const state = safeJsonParse(global.localStorage.getItem(stateKey(id)));
    if(!state || typeof state !== 'object') return null;
    state.historicalUniverseSlotId = id;
    return state;
  }

  function getSlot(slotId){
    const id = String(slotId || '').trim();
    if(!id) return null;
    return readIndex().find(function(entry){ return entry && entry.slotId === id; }) || null;
  }

  function listSlots(options){
    const opts = options && typeof options === 'object' ? options : {};
    const sportFilter = opts.sport ? normalizeSport(opts.sport) : '';
    return sortIndex(readIndex()).filter(function(entry){
      if(!entry || typeof entry !== 'object') return false;
      return !sportFilter || normalizeSport(entry.sport) === sportFilter;
    });
  }

  function deleteSlot(slotId){
    if(!storageAvailable()) return false;
    const id = String(slotId || '').trim();
    if(!id) return false;
    try{
      global.localStorage.removeItem(stateKey(id));
      writeIndex(readIndex().filter(function(entry){ return entry && entry.slotId !== id; }));
      return true;
    }catch(e){
      return false;
    }
  }

  function clearSlots(options){
    const slots = listSlots(options);
    slots.forEach(function(entry){
      deleteSlot(entry.slotId);
    });
    return slots.length;
  }

  function buildSeasonUrl(slot, sport, state){
    const targetSport = normalizeSport(sport || slot?.sport || 'nba');
    const id = String(slot?.slotId || '').trim();
    if(isSimulationModeUniverse(slot, state)){
      const simulationMode = getSimulationRouteMode(
        state?.simulationMode || slot?.simulationMode,
        targetSport
      );
      return 'rosterbate-season.html?sport='
        + encodeURIComponent(targetSport)
        + '&simulation=' + encodeURIComponent(simulationMode) + '&historicalUniverse='
        + encodeURIComponent(id);
    }
    return 'rosterbate-season.html?sport=' + encodeURIComponent(targetSport) + '&historicalUniverse=' + encodeURIComponent(id);
  }

  function buildDetailsUrl(slot, sport){
    const targetSport = normalizeSport(sport || slot?.sport || 'nba');
    const id = String(slot?.slotId || '').trim();
    return 'historic-universe.html?sport=' + encodeURIComponent(targetSport) + '&historicalUniverse=' + encodeURIComponent(id);
  }

  global.RosterBateHistoricalUniverseSlots = {
    indexKey: INDEX_KEY,
    statePrefix: STATE_PREFIX,
    getModeLabel,
    getModeTone,
    getSeasonLabel,
    buildDetailsUrl,
    buildSeasonUrl,
    listSlots,
    getSlot,
    getState,
    upsertFromState,
    deleteSlot,
    clearSlots
  };
})(window);
