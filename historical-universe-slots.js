(function(global){
  'use strict';

  const INDEX_KEY = 'rbHistoricalUniverseSlots';
  const STATE_PREFIX = 'rbHistoricalUniverseState:';

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
    const sport = normalizeSport(state?.sport);
    const packId = String(state?.historicalPackId || 'historic_pack').trim().toLowerCase();
    const entryMode = String(state?.historicalEntryMode || 'real_season').trim().toLowerCase();
    const stamp = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 8);
    return [sport, packId, entryMode, stamp, rand].join('_');
  }

  function getModeLabel(entryMode){
    switch(String(entryMode || '').trim().toLowerCase()){
      case 'historical_draft':
        return 'Drafted Universe';
      case 'reimagined_season':
        return 'Reimagined Season';
      case 'real_season':
      default:
        return 'Real Season';
    }
  }

  function getModeTone(entryMode){
    switch(String(entryMode || '').trim().toLowerCase()){
      case 'historical_draft':
        return 'draft';
      case 'reimagined_season':
        return 'reimagined';
      case 'real_season':
      default:
        return 'real';
    }
  }

  function getSeasonLabel(state){
    return String(
      state?.historicalPresentation?.seasonLabel ||
      state?.leagueName ||
      state?.historicalSeasonId ||
      state?.historicalPackId ||
      'Historic Season'
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
    const base = teamName || 'Historical universe';
    return base + ' • Wk ' + week + ' • Day ' + day;
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
    return 'Week ' + week + ' • Day ' + day;
  }

  function summarizeState(state, slotId, existingMeta){
    const title = getSeasonLabel(state) + ' • ' + getModeLabel(state?.historicalEntryMode);
    const createdAt = Number(existingMeta?.createdAt || state?.historicalUniverseCreatedAt || state?.createdAt || state?.savedAt || Date.now());
    const updatedAt = Date.now();
    const standing = getUserStandingSummary(state);
    return {
      slotId,
      title,
      subtitle: getSubtitle(state),
      sport: normalizeSport(state?.sport),
      historicalPackId: String(state?.historicalPackId || '').trim() || null,
      historicalSeasonId: String(state?.historicalSeasonId || '').trim() || null,
      historicalEntryMode: String(state?.historicalEntryMode || 'real_season').trim().toLowerCase(),
      historicalSelectedTeamId: String(state?.historicalSelectedTeamId || '').trim() || null,
      seasonId: String(state?.seasonId || '').trim() || null,
      leagueName: String(state?.leagueName || '').trim() || null,
      teamName: String(state?.teamName || '').trim() || null,
      currentWeek: Number(state?.currentWeek || state?.week || 1) || 1,
      currentDay: Number(state?.currentDay || state?.day || 1) || 1,
      leagueSize: Number(state?.leagueSize || (Array.isArray(state?.teams) ? state.teams.length : 0) || 0),
      playerPoolCount: Array.isArray(state?.historicalPlayerPool) ? state.historicalPlayerPool.length : 0,
      modeTone: getModeTone(state?.historicalEntryMode),
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

  function sortIndex(index){
    return index.slice().sort(function(a, b){
      return Number(b?.updatedAt || 0) - Number(a?.updatedAt || 0);
    });
  }

  function upsertFromState(state, options){
    if(!storageAvailable() || !state || typeof state !== 'object') return null;
    if(!state.historicalPackId) return null;
    const opts = options && typeof options === 'object' ? options : {};
    const index = readIndex();
    const slotId = String(opts.slotId || state.historicalUniverseSlotId || '').trim() || createSlotId(state);
    const existingMeta = index.find(function(entry){ return entry && entry.slotId === slotId; }) || null;
    const payload = safeClone(state);
    if(!payload) return null;
    payload.historicalUniverseSlotId = slotId;
    if(!payload.historicalUniverseCreatedAt) payload.historicalUniverseCreatedAt = Number(existingMeta?.createdAt || Date.now());
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

  function buildSeasonUrl(slot, sport){
    const targetSport = normalizeSport(sport || slot?.sport || 'nba');
    const id = String(slot?.slotId || '').trim();
    return 'rosterbate-season.html?sport=' + encodeURIComponent(targetSport) + '&historicalUniverse=' + encodeURIComponent(id);
  }

  global.RosterBateHistoricalUniverseSlots = {
    indexKey: INDEX_KEY,
    statePrefix: STATE_PREFIX,
    getModeLabel,
    getModeTone,
    getSeasonLabel,
    buildSeasonUrl,
    listSlots,
    getSlot,
    getState,
    upsertFromState,
    deleteSlot,
    clearSlots
  };
})(window);
