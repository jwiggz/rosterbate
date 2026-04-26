(function(root){
  'use strict';

  const STORAGE_KEY = 'rbSimulationModeLocalState';
  const COMPLETED_DRAFT_KEY = 'rbSimulationModeCompletedDraft';

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  function readJsonStorage(key){
    if (!(root && root.localStorage)) {
      return null;
    }
    try{
      const raw = root.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }catch(error){
      return null;
    }
  }

  function writeJsonStorage(key, value){
    if (!(root && root.localStorage)) {
      return value;
    }
    root.localStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  function clearJsonStorage(key){
    if (!(root && root.localStorage)) {
      return false;
    }
    root.localStorage.removeItem(key);
    return true;
  }

  function readJsonFromStorageArea(storage, key){
    if (!storage) {
      return null;
    }
    try{
      const raw = storage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    }catch(error){
      return null;
    }
  }

  function writeJsonToStorageArea(storage, key, value){
    if (!storage) {
      return false;
    }
    storage.setItem(key, JSON.stringify(value));
    return true;
  }

  function clearJsonFromStorageArea(storage, key){
    if (!storage) {
      return false;
    }
    storage.removeItem(key);
    return true;
  }

  function normalizeTeamAbbr(teamAbbr){
    return String(teamAbbr || '').trim().toUpperCase();
  }

  function normalizeShell(shell){
    if (!shell || typeof shell !== 'object') {
      return { teams: [] };
    }
    return {
      ...shell,
      teams: Array.isArray(shell.teams) ? shell.teams : []
    };
  }

  function getSimulationSport(shell){
    return String(shell?.sport || 'nba').trim().toLowerCase() || 'nba';
  }

  function getSimulationModeId(shell){
    return getSimulationSport(shell) === 'nfl'
      ? 'nfl_mixed_era_single_player_v1'
      : 'nba_mixed_era_single_player_v1';
  }

  function getSimulationRosterNeeds(shell){
    if (getSimulationSport(shell) === 'nfl') {
      return ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'EDGE', 'LB', 'CB', 'S', 'K', 'DST'];
    }
    return ['PG', 'SG', 'SF', 'PF', 'C'];
  }

  function getSimulationStarterSlots(shell){
    if (getSimulationSport(shell) === 'nfl') {
      return ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE', 'FLEX', 'K', 'DST'];
    }
    return ['PG', 'SG', 'SF', 'PF', 'C'];
  }

  function getSimulationLineupSlotTemplate(shell){
    return getSimulationStarterSlots(shell);
  }

  function getNflSlotEligibilityMap(){
    return {
      QB: ['QB'],
      RB1: ['RB'],
      RB2: ['RB'],
      WR1: ['WR'],
      WR2: ['WR'],
      TE: ['TE'],
      FLEX: ['RB', 'WR', 'TE'],
      K: ['K'],
      DST: ['DST']
    };
  }

  function normalizeSimulationLineupSlots(shell, lineupValue){
    const sport = getSimulationSport(shell);
    if (sport !== 'nfl') {
      return (Array.isArray(lineupValue) ? lineupValue : []).map((id) => Number(id));
    }

    const template = getSimulationLineupSlotTemplate(shell);
    const source = Array.isArray(lineupValue)
      ? Object.fromEntries(template.map((slot, index) => [slot, lineupValue[index]]))
      : (lineupValue && typeof lineupValue === 'object' ? lineupValue : {});

    return template.reduce((slots, slot) => {
      const value = source[slot];
      slots[slot] = value == null || value === '' ? null : Number(value);
      return slots;
    }, {});
  }

  function getSimulationLineupIdsFromSlots(shell, lineupSlots){
    return getSimulationLineupSlotTemplate(shell).map((slot) => {
      const value = lineupSlots?.[slot];
      if (value == null || value === '') {
        return null;
      }
      return Number(value);
    });
  }

  function dedupeSimulationRosterPlayers(players){
    const seenIds = new Set();
    return (Array.isArray(players) ? players : []).filter((player) => {
      const playerId = Number(player?.id);
      if (!Number.isFinite(playerId) || playerId <= 0) {
        return true;
      }
      if (seenIds.has(playerId)) {
        return false;
      }
      seenIds.add(playerId);
      return true;
    });
  }

  function getSimulationTeamRoster(state, teamAbbr){
    const key = normalizeTeamAbbr(teamAbbr);
    const roster = state?.draftState?.rostersByTeam?.[key];
    return dedupeSimulationRosterPlayers(roster);
  }

  function getSimulationLineupDetails(state, teamAbbr){
    const key = normalizeTeamAbbr(teamAbbr);
    const seasonState = state?.seasonState || {};
    const lineupSlotsByTeam = seasonState.lineupSlotsByTeam || {};
    const lineupIdsByTeam = seasonState.lineupIdsByTeam || {};
    const lineupSlots = lineupSlotsByTeam[key];
    const lineupIds = lineupIdsByTeam[key];
    const shell = state?.leagueShell || state?.shell || {};
    const isNfl = Boolean(lineupSlots) || getSimulationSport(shell) === 'nfl' || (Array.isArray(lineupIds) && lineupIds.length === getSimulationLineupSlotTemplate({ sport: 'nfl' }).length);

    return {
      key,
      shell,
      isNfl,
      lineupSlots: lineupSlots && typeof lineupSlots === 'object' && !Array.isArray(lineupSlots)
        ? normalizeSimulationLineupSlots({ sport: 'nfl' }, lineupSlots)
        : null,
      lineupIds: Array.isArray(lineupIds) ? lineupIds.slice() : []
    };
  }

  function validateSimulationLineup(state, teamAbbr){
    const details = getSimulationLineupDetails(state, teamAbbr);
    if (!details.key) {
      return { valid: false, issues: [] };
    }
    if (!details.isNfl) {
      const rosterById = new Map(getSimulationTeamRoster(state, details.key).map((player) => [Number(player?.id), player]));
      const starterSlots = getSimulationLineupSlotTemplate(details.shell);
      const eligibilityMap = getNbaSlotEligibilityMap();
      const issues = [];
      const assignedIds = new Set();

      starterSlots.forEach((slot, index) => {
        const rawPlayerId = details.lineupIds[index];
        const playerId = rawPlayerId == null || rawPlayerId === '' ? null : Number(rawPlayerId);
        if (playerId == null || !Number.isFinite(playerId)) {
          issues.push({ slot, code: 'missing_player', message: `${slot} starter is missing.` });
          return;
        }

        const player = rosterById.get(playerId);
        if (!player) {
          issues.push({ slot, code: 'missing_player', message: `${slot} starter is missing.` });
          return;
        }

        if (isSimulationPlayerOut(player)) {
          issues.push({ slot, code: 'player_out', message: `${slot} starter is OUT.` });
        }

        const eligiblePositions = eligibilityMap[slot] || [slot];
        const playerTags = getSimulationBasketballPositionTags(player);
        if (!eligiblePositions.some((position) => playerTags.has(position))) {
          issues.push({
            slot,
            code: 'ineligible_position',
            message: `${String(player?.name || 'Player')} is not eligible for ${slot}.`
          });
        }

        if (assignedIds.has(playerId)) {
          issues.push({
            slot,
            code: 'duplicate_player',
            message: `${String(player?.name || 'Player')} is already assigned to another slot.`
          });
          return;
        }

        assignedIds.add(playerId);
      });

      return {
        valid: issues.length === 0,
        issues
      };
    }

    const rosterById = new Map(getSimulationTeamRoster(state, details.key).map((player) => [Number(player?.id), player]));
    const slots = details.lineupSlots || normalizeSimulationLineupSlots({ sport: 'nfl' }, details.lineupIds);
    const eligibilityMap = getNflSlotEligibilityMap();
    const issues = [];
    const assignedIds = new Set();

    getSimulationLineupSlotTemplate({ sport: 'nfl' }).forEach((slot) => {
      const playerId = slots[slot];
      if (playerId == null) {
        issues.push({ slot, code: 'missing_player', message: `${slot} starter is missing.` });
        return;
      }

      const player = rosterById.get(Number(playerId));
      if (!player) {
        issues.push({ slot, code: 'missing_player', message: `${slot} starter is missing.` });
        return;
      }

      if (String(player?.designation || '').trim().toUpperCase() === 'OUT') {
        issues.push({ slot, code: 'player_out', message: `${slot} starter is OUT.` });
      }

      const eligiblePositions = eligibilityMap[slot] || [slot];
      const playerPosition = getSimulationPlayerPosition(player);
      if (!eligiblePositions.includes(playerPosition)) {
        issues.push({
          slot,
          code: 'ineligible_position',
          message: `${String(player?.name || 'Player')} is not eligible for ${slot}.`
        });
      }

      if (assignedIds.has(Number(playerId))) {
        issues.push({
          slot,
          code: 'duplicate_player',
          message: `${String(player?.name || 'Player')} is already assigned to another slot.`
        });
        return;
      }

      assignedIds.add(Number(playerId));
    });

    return {
      valid: issues.length === 0,
      issues
    };
  }

  function buildSuggestedSimulationLineup(state, teamAbbr){
    const details = getSimulationLineupDetails(state, teamAbbr);
    const roster = sortPlayers(getSimulationTeamRoster(state, details.key));
    if (!details.isNfl) {
      return buildSuggestedNbaLineupIds(roster, details.shell);
    }

    const eligibilityMap = getNflSlotEligibilityMap();
    const usedIds = new Set();

    return getSimulationLineupSlotTemplate({ sport: 'nfl' }).reduce((lineup, slot) => {
      const eligiblePositions = eligibilityMap[slot] || [slot];
      const player = roster.find((entry) => {
        const playerId = Number(entry?.id);
        return !usedIds.has(playerId)
          && eligiblePositions.includes(getSimulationPlayerPosition(entry))
          && String(entry?.designation || '').trim().toUpperCase() !== 'OUT';
      }) || null;
      if (player) {
        usedIds.add(Number(player.id));
        lineup[slot] = Number(player.id);
        return lineup;
      }
      lineup[slot] = null;
      return lineup;
    }, {});
  }

  function getSimulationRequiredStarterCount(shell){
    return getSimulationStarterSlots(shell).length;
  }

  function sortPlayers(players){
    return (Array.isArray(players) ? players.slice() : []).sort((a, b) => {
      const overallDiff = Number(b?.mixedEraOverall || 0) - Number(a?.mixedEraOverall || 0);
      if (overallDiff) return overallDiff;
      const fpDiff = Number(b?.fp || 0) - Number(a?.fp || 0);
      if (fpDiff) return fpDiff;
      return String(a?.name || '').localeCompare(String(b?.name || ''));
    });
  }

  function decorateSimulationTier(players){
    return players.map((player, index) => ({
      ...player,
      simulationTier: index < 30 ? 'franchise' : index < 120 ? 'core' : index < 300 ? 'rotation' : 'reserve'
    }));
  }

  function takeRankedPlayersByPredicate(players, count, predicate, label){
    const picked = [];
    const remaining = [];
    (Array.isArray(players) ? players : []).forEach((player) => {
      if (picked.length < count && predicate(player)) {
        picked.push(player);
        return;
      }
      remaining.push(player);
    });
    if (picked.length < count) {
      throw new Error(`Unable to build NFL simulation draft pool: need ${count} ${label}, found ${picked.length}.`);
    }
    return { picked, remaining };
  }

  function buildFootballDraftPoolRequirements(shell){
    const teamCount = Array.isArray(shell?.teams) ? shell.teams.length : 0;
    const rosterNeeds = getSimulationRosterNeeds(shell);
    const exactCountsByPosition = {};
    let flexSlotsPerTeam = 0;

    rosterNeeds.forEach((slot) => {
      const normalizedSlot = String(slot || '').trim().toUpperCase();
      if (!normalizedSlot) return;
      if (normalizedSlot === 'FLEX') {
        flexSlotsPerTeam += 1;
        return;
      }
      exactCountsByPosition[normalizedSlot] = Number(exactCountsByPosition[normalizedSlot] || 0) + 1;
    });

    return {
      exactCountsByPosition,
      exactDraftCountsByPosition: Object.fromEntries(
        Object.entries(exactCountsByPosition).map(([position, count]) => [position, count * teamCount])
      ),
      flexDraftCount: flexSlotsPerTeam * teamCount
    };
  }

  function buildFootballSimulationPlayerPool({ rankedPlayers, shell, draftTarget, freeAgentTarget }){
    const ranked = Array.isArray(rankedPlayers) ? rankedPlayers : [];
    const requirements = buildFootballDraftPoolRequirements(shell);
    let remaining = ranked.slice();
    const reserved = [];

    Object.entries(requirements.exactDraftCountsByPosition).forEach(([position, count]) => {
      const selection = takeRankedPlayersByPredicate(
        remaining,
        count,
        (player) => getSimulationPlayerPosition(player) === position,
        position
      );
      reserved.push(...selection.picked);
      remaining = selection.remaining;
    });

    if (requirements.flexDraftCount > 0) {
      const flexSelection = takeRankedPlayersByPredicate(
        remaining,
        requirements.flexDraftCount,
        (player) => isFootballFlexEligiblePosition(getSimulationPlayerPosition(player)),
        'FLEX-eligible players'
      );
      reserved.push(...flexSelection.picked);
      remaining = flexSelection.remaining;
    }

    if (reserved.length > draftTarget) {
      throw new Error(`Unable to build NFL simulation draft pool: need ${reserved.length} reserved players, but draft target is ${draftTarget}.`);
    }

    const remainingCapacity = Math.max(0, draftTarget - reserved.length);
    const fillPlayers = remaining.slice(0, remainingCapacity);
    const draftPoolIds = new Set(reserved.concat(fillPlayers).map((player) => Number(player?.id)));
    const draftPool = ranked.filter((player) => draftPoolIds.has(Number(player?.id)));
    const freeAgents = remaining.slice(remainingCapacity, remainingCapacity + freeAgentTarget);

    return {
      draftPool,
      freeAgents
    };
  }

  function buildSimulationPlayerPool({ mixedEraContext, shell }){
    const leagueShell = normalizeShell(shell);
    const rosterSize = Number(leagueShell.rosterSize || 10);
    const teamCount = Array.isArray(leagueShell.teams) ? leagueShell.teams.length : 30;
    const draftTarget = rosterSize * teamCount;
    const freeAgentTarget = 60;
    const ranked = decorateSimulationTier(sortPlayers(mixedEraContext?.playerPool || []));
    const reservedPool = getSimulationSport(leagueShell) === 'nfl'
      ? buildFootballSimulationPlayerPool({
        rankedPlayers: ranked,
        shell: leagueShell,
        draftTarget,
        freeAgentTarget
      })
      : null;
    return {
      draftPool: reservedPool ? reservedPool.draftPool : ranked.slice(0, draftTarget),
      freeAgents: reservedPool ? reservedPool.freeAgents : ranked.slice(draftTarget, draftTarget + freeAgentTarget),
      poolMeta: {
        rosterSize,
        teamCount,
        draftTarget,
        freeAgentTarget
      }
    };
  }

  function buildSimulationUniverseBootstrap({
    shell,
    mixedEraContext,
    controlledTeamAbbr,
    draftSlot
  }){
    const leagueShell = normalizeShell(shell);
    const pool = buildSimulationPlayerPool({ mixedEraContext, shell });
    return {
      activeSeasonBackend: 'simulation',
      historicalEntryMode: 'simulation_season',
      simulationMode: getSimulationModeId(leagueShell),
      leagueShell: clone(leagueShell),
      sourceSeasons: {
        mixedEraConfigId: String(mixedEraContext?.mixedEraConfigId || '').trim(),
        sourcePackIds: clone(mixedEraContext?.sourcePackIds || []),
        sourceSeasonLabels: clone(mixedEraContext?.sourceSeasonLabels || [])
      },
      draftState: {
        controlledTeamAbbr: String(controlledTeamAbbr || '').trim().toUpperCase(),
        draftSlot: Number(draftSlot || 1),
        teamCount: pool.poolMeta.teamCount,
        rosterSize: pool.poolMeta.rosterSize,
        draftPool: clone(pool.draftPool),
        freeAgents: clone(pool.freeAgents),
        rostersByTeam: Object.fromEntries(leagueShell.teams.map((team) => [team.abbr, []]))
      },
      seasonState: {
        currentDay: 1,
        currentWeek: 1,
        scheduleByDay: {},
        completedGameLogs: [],
        pendingWaiverClaims: [],
        recentWaiverResults: [],
        standings: leagueShell.teams.map((team, index) => ({
          teamIdx: index,
          teamAbbr: team.abbr,
          conference: team.conference,
          division: team.division,
          w: 0,
          l: 0,
          pf: 0,
          pa: 0
        })),
        activityLog: []
      },
      postseasonState: {
        phase: 'regular_season',
        playIn: null,
        bracket: null,
        champion: null
      }
    };
  }

  function buildUnifiedSimulationSeasonState(seed){
    const source = seed && typeof seed === 'object' ? clone(seed) : {};
    const sourceTeams = Array.isArray(source?.leagueShell?.teams)
      ? source.leagueShell.teams
      : Array.isArray(source?.teams)
        ? source.teams
        : [];
    const sourceStandings = Array.isArray(source?.seasonState?.standings)
      ? source.seasonState.standings
      : Array.isArray(source?.standings)
        ? source.standings
        : [];
    const sourceRosters = Array.isArray(source?.allRosters)
      ? source.allRosters
      : Array.isArray(source?.rosters)
        ? source.rosters
        : [];
    const teamEntries = sourceTeams.map((team, index) => {
      const standingRow = sourceStandings[index] || {};
      const teamName = typeof team === 'string'
        ? team
        : String(team?.name || team?.displayName || team?.teamName || team?.abbr || '').trim();
      const teamAbbr = normalizeTeamAbbr(
        (typeof team === 'object' ? team?.abbr : '') ||
        teamName.split(/\s+/).map((part) => part.charAt(0)).join('').slice(0, 3) ||
        standingRow?.teamAbbr ||
        `T${index + 1}`
      );
      return {
        abbr: teamAbbr,
        name: teamName || teamAbbr,
        conference: typeof team === 'object' ? team?.conference || standingRow?.conference || '' : standingRow?.conference || '',
        division: typeof team === 'object' ? team?.division || standingRow?.division || '' : standingRow?.division || ''
      };
    });
    const leagueShell = normalizeShell({
      sport: source?.leagueShell?.sport || source?.sport || 'nba',
      anchorSeasonLabel: source?.leagueShell?.anchorSeasonLabel || source?.leagueName || '',
      rosterSize: Number(
        source?.leagueShell?.rosterSize ||
        source?.draftState?.rosterSize ||
        sourceRosters.reduce((maxCount, roster) => Math.max(maxCount, Array.isArray(roster) ? roster.length : 0), 0) ||
        0
      ) || 0,
      teams: teamEntries
    });
    const rostersByTeam = Object.fromEntries(teamEntries.map((team, index) => [
      team.abbr,
      clone(
        Array.isArray(source?.draftState?.rostersByTeam?.[team.abbr])
          ? source.draftState.rostersByTeam[team.abbr]
          : (Array.isArray(sourceRosters[index]) ? sourceRosters[index] : [])
      )
    ]));
    const starterSlots = getSimulationLineupSlotTemplate(leagueShell);
    const sourceSeasonState = source?.seasonState && typeof source.seasonState === 'object'
      ? source.seasonState
      : {};
    const sourceLineupIdsByTeam = (
      sourceSeasonState.lineupIdsByTeam &&
      typeof sourceSeasonState.lineupIdsByTeam === 'object' &&
      !Array.isArray(sourceSeasonState.lineupIdsByTeam)
    ) ? sourceSeasonState.lineupIdsByTeam : {};
    const sourceLineupSlotsByTeam = (
      sourceSeasonState.lineupSlotsByTeam &&
      typeof sourceSeasonState.lineupSlotsByTeam === 'object' &&
      !Array.isArray(sourceSeasonState.lineupSlotsByTeam)
    ) ? sourceSeasonState.lineupSlotsByTeam : {};
    const lineupIdsByTeam = Object.fromEntries(teamEntries.map((team) => {
      const teamAbbr = team.abbr;
      const teamRoster = Array.isArray(rostersByTeam[teamAbbr]) ? rostersByTeam[teamAbbr] : [];
      const existingLineupIds = Array.isArray(sourceLineupIdsByTeam[teamAbbr])
        ? clone(sourceLineupIdsByTeam[teamAbbr])
        : null;
      const existingLineupSlots = sourceLineupSlotsByTeam[teamAbbr];
      if (existingLineupIds) {
        if (getSimulationSport(leagueShell) === 'nfl') {
          const normalizedIds = existingLineupIds
            .slice(0, starterSlots.length)
            .map((id) => (id == null || id === '' ? null : Number(id)));
          while (normalizedIds.length < starterSlots.length) {
            normalizedIds.push(null);
          }
          return [teamAbbr, normalizedIds];
        }
        return [teamAbbr, existingLineupIds.map((id) => Number(id)).filter(Number.isFinite)];
      }
      if (existingLineupSlots && typeof existingLineupSlots === 'object' && !Array.isArray(existingLineupSlots)) {
        return [teamAbbr, getSimulationLineupIdsFromSlots(leagueShell, existingLineupSlots)];
      }
      const fallbackIds = getSimulationSport(leagueShell) === 'nfl'
        ? teamRoster
          .slice(0, starterSlots.length)
          .map((player) => Number(player?.id))
          .filter(Number.isFinite)
        : buildSuggestedNbaLineupIds(teamRoster, leagueShell);
      if (getSimulationSport(leagueShell) === 'nfl') {
        while (fallbackIds.length < starterSlots.length) {
          fallbackIds.push(null);
        }
      }
      return [teamAbbr, fallbackIds];
    }));
    const lineupSlotsByTeam = getSimulationSport(leagueShell) === 'nfl'
      ? Object.fromEntries(teamEntries.map((team) => {
        const teamAbbr = team.abbr;
        const existingLineupSlots = sourceLineupSlotsByTeam[teamAbbr];
        if (existingLineupSlots && typeof existingLineupSlots === 'object' && !Array.isArray(existingLineupSlots)) {
          return [teamAbbr, normalizeSimulationLineupSlots(leagueShell, existingLineupSlots)];
        }
        const normalizedIds = Array.isArray(lineupIdsByTeam[teamAbbr]) ? lineupIdsByTeam[teamAbbr] : [];
        return [teamAbbr, starterSlots.reduce((slots, slot, index) => {
          const value = normalizedIds[index];
          slots[slot] = value == null || value === '' ? null : Number(value);
          return slots;
        }, {})];
      }))
      : undefined;
    const controlledTeamAbbr = normalizeTeamAbbr(
      source?.draftState?.controlledTeamAbbr ||
      source?.controlledTeamAbbr ||
      teamEntries[0]?.abbr ||
      ''
    );
    const standingsByAbbr = new Map(
      sourceStandings
        .filter((row) => normalizeTeamAbbr(row?.teamAbbr))
        .map((row) => [normalizeTeamAbbr(row?.teamAbbr), row])
    );
    const standings = teamEntries.map((team, index) => {
      const matchedStanding = standingsByAbbr.get(team.abbr);
      const fallbackStanding = !matchedStanding && sourceStandings.length === teamEntries.length
        ? sourceStandings[index]
        : null;
      const row = matchedStanding || fallbackStanding || {
        teamIdx: index,
        teamAbbr: team.abbr,
        conference: team.conference,
        division: team.division,
        w: 0,
        l: 0,
        pf: 0,
        pa: 0
      };
      return {
        teamIdx: Number.isFinite(Number(row?.teamIdx)) ? Number(row.teamIdx) : index,
        teamAbbr: normalizeTeamAbbr(row?.teamAbbr || team.abbr || ''),
        conference: row?.conference || team.conference || '',
        division: row?.division || team.division || '',
        w: Number(row?.w || 0),
        l: Number(row?.l || 0),
        pf: Number(row?.pf || 0),
        pa: Number(row?.pa || 0)
      };
    });

    return {
      ...source,
      activeSeasonBackend: 'simulation',
      historicalEntryMode: String(source?.historicalEntryMode || 'simulation_season').trim() || 'simulation_season',
      simulationMode: getSimulationModeId(leagueShell),
      legacyHistoricalStatMode: false,
      leagueShell,
      draftState: {
        ...(source?.draftState && typeof source.draftState === 'object' ? source.draftState : {}),
        controlledTeamAbbr,
        teamCount: teamEntries.length,
        rosterSize: Number(source?.draftState?.rosterSize || leagueShell.rosterSize || 0),
        draftPool: clone(source?.draftState?.draftPool || []),
        freeAgents: clone(source?.draftState?.freeAgents || source?.freeAgents || []),
        rostersByTeam
      },
      seasonState: {
        ...sourceSeasonState,
        currentDay: Number(sourceSeasonState?.currentDay || source?.currentDay || 1),
        currentWeek: Number(sourceSeasonState?.currentWeek || source?.currentWeek || 1),
        lineupIdsByTeam,
        ...(lineupSlotsByTeam ? { lineupSlotsByTeam } : {}),
        scheduleByDay: clone(sourceSeasonState?.scheduleByDay || {}),
        completedGameLogs: clone(sourceSeasonState?.completedGameLogs || source?.completedGameLogs || []),
        pendingWaiverClaims: clone(sourceSeasonState?.pendingWaiverClaims || []),
        recentWaiverResults: clone(sourceSeasonState?.recentWaiverResults || []),
        standings,
        activityLog: clone(sourceSeasonState?.activityLog || source?.activityLog || [])
      },
      postseasonState: {
        ...(source?.postseasonState && typeof source.postseasonState === 'object' ? source.postseasonState : {}),
        phase: source?.postseasonState?.phase || 'regular_season',
        playIn: clone(source?.postseasonState?.playIn || null),
        bracket: clone(source?.postseasonState?.bracket || null),
        champion: clone(source?.postseasonState?.champion || null)
      }
    };
  }

  function getSimulationPlayerPosition(player){
    const normalizedPosition = String(player?.pos || player?.primaryPosition || 'UTIL').trim().toUpperCase();
    if (normalizedPosition === 'DL') {
      return 'EDGE';
    }
    return normalizedPosition;
  }

  function getSimulationBasketballPositionTags(player){
    const rawPosition = String(player?.pos || player?.primaryPosition || '').trim().toUpperCase();
    const matches = rawPosition.match(/\b(PG|SG|SF|PF|C|G|F)\b/g);
    const tags = new Set(matches || []);
    if (tags.has('PG') || tags.has('SG')) {
      tags.add('G');
    }
    if (tags.has('SF') || tags.has('PF')) {
      tags.add('F');
    }
    return tags;
  }

  function getNbaSlotEligibilityMap(){
    return {
      PG: ['PG', 'G'],
      SG: ['SG', 'G'],
      SF: ['SF', 'F'],
      PF: ['PF', 'F'],
      C: ['C']
    };
  }

  function isSimulationPlayerOut(player){
    return String(player?.designation || '').trim().toUpperCase() === 'OUT';
  }

  function getNbaSlotFitScore(slot, player){
    const normalizedSlot = String(slot || '').trim().toUpperCase();
    const tags = getSimulationBasketballPositionTags(player);
    if (!tags.size) {
      return -Infinity;
    }
    if (tags.has(normalizedSlot)) {
      return 2;
    }
    if ((normalizedSlot === 'PG' || normalizedSlot === 'SG') && tags.has('G')) {
      return 1;
    }
    if ((normalizedSlot === 'SF' || normalizedSlot === 'PF') && tags.has('F')) {
      return 1;
    }
    return -Infinity;
  }

  function buildSuggestedNbaLineupIds(roster, shell){
    const sortedRoster = sortPlayers(roster).filter((player) => !isSimulationPlayerOut(player));
    const starterSlots = getSimulationLineupSlotTemplate(shell);
    const slotPriority = { C: 0, PG: 1, SG: 2, SF: 3, PF: 4 };
    const usedIds = new Set();
    const slotAssignments = {};
    const orderedSlots = starterSlots
      .map((slot) => ({
        slot,
        candidates: sortedRoster.filter((player) => Number.isFinite(getNbaSlotFitScore(slot, player)))
      }))
      .sort((a, b) => {
        const candidateDiff = a.candidates.length - b.candidates.length;
        if (candidateDiff) return candidateDiff;
        return Number(slotPriority[a.slot] || 99) - Number(slotPriority[b.slot] || 99);
      });

    orderedSlots.forEach(({ slot }) => {
      const player = sortedRoster.reduce((bestPlayer, entry) => {
        const playerId = Number(entry?.id);
        const fitScore = getNbaSlotFitScore(slot, entry);
        if (!Number.isFinite(playerId) || usedIds.has(playerId) || !Number.isFinite(fitScore)) {
          return bestPlayer;
        }
        if (!bestPlayer) {
          return entry;
        }
        const bestFitScore = getNbaSlotFitScore(slot, bestPlayer);
        return fitScore > bestFitScore ? entry : bestPlayer;
      }, null) || null;
      if (!player) {
        slotAssignments[slot] = null;
        return;
      }
      usedIds.add(Number(player.id));
      slotAssignments[slot] = Number(player.id);
    });

    return starterSlots.map((slot) => (
      slotAssignments[slot] == null || slotAssignments[slot] === ''
        ? null
        : Number(slotAssignments[slot])
    ));
  }

  function isFootballFlexEligiblePosition(position){
    return ['RB', 'WR', 'TE', 'FLEX'].includes(String(position || '').trim().toUpperCase());
  }

  function getFootballRosterCoverageState(roster){
    const nextRoster = Array.isArray(roster) ? roster : [];
    const minimumCounts = {
      QB: 1,
      RB: 2,
      WR: 2,
      TE: 1,
      EDGE: 1,
      LB: 1,
      CB: 1,
      S: 1,
      K: 1,
      DST: 1
    };
    const currentCounts = nextRoster.reduce((counts, entry) => {
      const entryPosition = getSimulationPlayerPosition(entry);
      counts[entryPosition] = Number(counts[entryPosition] || 0) + 1;
      return counts;
    }, {});
    const getCount = (key) => Number(currentCounts[key] || 0);
    return {
      counts: currentCounts,
      minimumCounts,
      getCount,
      flexEligibleCount: getCount('RB') + getCount('WR') + getCount('TE') + getCount('FLEX')
    };
  }

  function getFootballCoverageBonus(position, roster){
    const normalizedPosition = String(position || '').trim().toUpperCase();
    const coverage = getFootballRosterCoverageState(roster);
    let bonus = 0;

    if (coverage.minimumCounts[normalizedPosition]) {
      const requiredCount = Number(coverage.minimumCounts[normalizedPosition] || 0);
      const currentCount = coverage.getCount(normalizedPosition);
      if (currentCount < requiredCount) {
        bonus += 1000000 + ((requiredCount - currentCount) * 10000);
      }
    }

    if (isFootballFlexEligiblePosition(normalizedPosition)) {
      if (coverage.flexEligibleCount < 6) {
        bonus += 1000000 + ((6 - coverage.flexEligibleCount) * 10000);
      }
    }

    return bonus;
  }

  function getSimulationAutoDraftScore(player, roster, shell){
    const nextRoster = Array.isArray(roster) ? roster : [];
    const position = getSimulationPlayerPosition(player);
    const samePositionCount = nextRoster.reduce((count, entry) => (
      getSimulationPlayerPosition(entry) === position ? count + 1 : count
    ), 0);
    const baseScore = (Number(player?.mixedEraOverall || 0) * 100) + Number(player?.fp || 0);
    if (getSimulationSport(shell) === 'nfl') {
      return baseScore + getFootballCoverageBonus(position, nextRoster) - (samePositionCount * 2);
    }
    const coverageBonus = samePositionCount === 0 ? 6 : 0;
    const duplicatePenalty = samePositionCount * 3;
    return baseScore + coverageBonus - duplicatePenalty;
  }

  function buildCompletedSimulationAutoDraftState({
    shell,
    mixedEraContext,
    controlledTeamAbbr
  }){
    const bootstrap = buildSimulationUniverseBootstrap({
      shell,
      mixedEraContext,
      controlledTeamAbbr,
      draftSlot: 1
    });
    const next = clone(bootstrap);
    const draftState = next.draftState || {};
    const rosterSize = Number(draftState.rosterSize || 0);
    const teams = Array.isArray(next.leagueShell?.teams) ? next.leagueShell.teams : [];
    const requiredPlayers = teams.length * rosterSize;
    const draftablePlayers = Array.isArray(draftState.draftPool) ? draftState.draftPool.slice() : [];
    const reserveFreeAgents = Array.isArray(draftState.freeAgents) ? clone(draftState.freeAgents) : [];

    if (draftablePlayers.length < requiredPlayers) {
      throw new Error(`Unable to auto-draft simulation league: need ${requiredPlayers} draftable players, found ${draftablePlayers.length}.`);
    }

    for (let round = 0; round < rosterSize; round += 1) {
      const roundTeams = round % 2 === 0 ? teams : teams.slice().reverse();
      roundTeams.forEach((team) => {
        const teamAbbr = normalizeTeamAbbr(team?.abbr);
        const roster = Array.isArray(draftState.rostersByTeam?.[teamAbbr]) ? draftState.rostersByTeam[teamAbbr] : [];
        if (roster.length >= rosterSize || !draftablePlayers.length) {
          return;
        }
        let bestIndex = 0;
        let bestScore = -Infinity;
        for (let index = 0; index < draftablePlayers.length; index += 1) {
          const score = getSimulationAutoDraftScore(draftablePlayers[index], roster, next.leagueShell);
          if (score > bestScore) {
            bestScore = score;
            bestIndex = index;
          }
        }
        const [selectedPlayer] = draftablePlayers.splice(bestIndex, 1);
        draftState.rostersByTeam[teamAbbr] = roster.concat(selectedPlayer);
      });
    }

    draftState.completedAt = Date.now();
    draftState.completedPicks = [];
    draftState.draftPool = [];
    draftState.freeAgents = reserveFreeAgents;
    next.draftState = draftState;
    next.seasonState = next.seasonState || {};
    next.seasonState.lineupIdsByTeam = Object.fromEntries(teams.map((team) => {
      const teamAbbr = normalizeTeamAbbr(team?.abbr);
      const roster = Array.isArray(draftState.rostersByTeam?.[teamAbbr]) ? draftState.rostersByTeam[teamAbbr] : [];
      if (getSimulationSport(next.leagueShell) === 'nfl') {
        const suggestedSlots = buildSuggestedSimulationLineup({
          leagueShell: next.leagueShell,
          draftState: { rostersByTeam: { [teamAbbr]: roster } },
          seasonState: {}
        }, teamAbbr);
        return [teamAbbr, getSimulationLineupIdsFromSlots({ sport: 'nfl' }, suggestedSlots)];
      }
      return [teamAbbr, buildSuggestedNbaLineupIds(roster, next.leagueShell)];
    }));
    if (getSimulationSport(next.leagueShell) === 'nfl') {
      const starterSlots = getSimulationLineupSlotTemplate(next.leagueShell);
      next.seasonState.lineupSlotsByTeam = Object.fromEntries(teams.map((team) => {
        const teamAbbr = normalizeTeamAbbr(team?.abbr);
        const lineupIds = Array.isArray(next.seasonState.lineupIdsByTeam?.[teamAbbr])
          ? next.seasonState.lineupIdsByTeam[teamAbbr]
          : [];
        return [teamAbbr, starterSlots.reduce((slots, slot, index) => {
          const value = lineupIds[index];
          slots[slot] = value == null || value === '' ? null : Number(value);
          return slots;
        }, {})];
      }));
    }
    return next;
  }

  function setSimulationLineup(state, teamAbbr, lineupIds){
    const next = clone(state);
    const key = normalizeTeamAbbr(teamAbbr);
    if (!key) {
      return next;
    }
    next.seasonState = next.seasonState || {};
    next.seasonState.lineupIdsByTeam = next.seasonState.lineupIdsByTeam || {};
    next.seasonState.activityLog = Array.isArray(next.seasonState.activityLog) ? next.seasonState.activityLog : [];
    const isNflLineup = getSimulationSport(next.leagueShell || {}) === 'nfl';
    if (isNflLineup) {
      next.seasonState.lineupSlotsByTeam = next.seasonState.lineupSlotsByTeam || {};
      const normalizedSlots = normalizeSimulationLineupSlots({ sport: 'nfl' }, lineupIds);
      next.seasonState.lineupSlotsByTeam[key] = normalizedSlots;
      next.seasonState.lineupIdsByTeam[key] = getSimulationLineupIdsFromSlots({ sport: 'nfl' }, normalizedSlots);
    } else {
      next.seasonState.lineupIdsByTeam[key] = (Array.isArray(lineupIds) ? lineupIds : []).map((id) => Number(id));
    }
    next.seasonState.activityLog.unshift({
      type: 'lineup',
      teamAbbr: key,
      title: `${key} updated its lineup`,
      ts: Date.now()
    });
    return next;
  }

  function pruneLineupState(next, teamAbbr, removedPlayerIds){
    const seasonState = next.seasonState || {};
    const lineupIdsByTeam = seasonState.lineupIdsByTeam || {};
    const lineupSlotsByTeam = seasonState.lineupSlotsByTeam || {};
    const removedIds = new Set((Array.isArray(removedPlayerIds) ? removedPlayerIds : []).map(Number));
    const currentSlots = lineupSlotsByTeam[teamAbbr];

    if (currentSlots && typeof currentSlots === 'object' && !Array.isArray(currentSlots)) {
      const normalizedSlots = normalizeSimulationLineupSlots({ sport: 'nfl' }, currentSlots);
      Object.keys(normalizedSlots).forEach((slot) => {
        if (removedIds.has(Number(normalizedSlots[slot]))) {
          normalizedSlots[slot] = null;
        }
      });
      lineupSlotsByTeam[teamAbbr] = normalizedSlots;
      lineupIdsByTeam[teamAbbr] = getSimulationLineupIdsFromSlots({ sport: 'nfl' }, normalizedSlots);
      seasonState.lineupSlotsByTeam = lineupSlotsByTeam;
    } else {
      const currentLineup = Array.isArray(lineupIdsByTeam[teamAbbr]) ? lineupIdsByTeam[teamAbbr] : [];
      if (getSimulationSport(next?.leagueShell || next?.shell || {}) === 'nfl') {
        const slotCount = getSimulationLineupSlotTemplate({ sport: 'nfl' }).length;
        lineupIdsByTeam[teamAbbr] = currentLineup
          .slice(0, slotCount)
          .map((id) => (removedIds.has(Number(id)) ? null : id == null || id === '' ? null : Number(id)));
        while (lineupIdsByTeam[teamAbbr].length < slotCount) {
          lineupIdsByTeam[teamAbbr].push(null);
        }
      } else {
        lineupIdsByTeam[teamAbbr] = currentLineup.filter((id) => !removedIds.has(Number(id)));
      }
    }

    seasonState.lineupIdsByTeam = lineupIdsByTeam;
    next.seasonState = seasonState;
    return next;
  }

  function pruneLineupIds(next, teamAbbr, removedPlayerIds){
    return pruneLineupState(next, teamAbbr, removedPlayerIds);
  }

  function getSimulationWaiverCadence(state){
    return getSimulationSport(state?.leagueShell || state?.shell || state || {}) === 'nfl'
      ? 'week'
      : 'day';
  }

  function getSimulationWaiverOrder(state){
    const explicitOrder = Array.isArray(state?.seasonState?.waiverOrder)
      ? Array.from(new Set(state.seasonState.waiverOrder.map((teamAbbr) => normalizeTeamAbbr(teamAbbr)).filter(Boolean)))
      : [];
    const shellOrder = Array.isArray(state?.leagueShell?.teams)
      ? state.leagueShell.teams.map((team) => normalizeTeamAbbr(team?.abbr)).filter(Boolean)
      : [];
    if (!explicitOrder.length) {
      return shellOrder;
    }
    const combinedOrder = explicitOrder.slice();
    shellOrder.forEach((teamAbbr) => {
      if (teamAbbr && !combinedOrder.includes(teamAbbr)) {
        combinedOrder.push(teamAbbr);
      }
    });
    return combinedOrder;
  }

  function ensureSimulationWaiverState(next){
    next.draftState = next.draftState || {};
    next.draftState.rostersByTeam = next.draftState.rostersByTeam || {};
    next.draftState.freeAgents = Array.isArray(next.draftState.freeAgents) ? next.draftState.freeAgents : [];
    next.seasonState = next.seasonState || {};
    next.seasonState.activityLog = Array.isArray(next.seasonState.activityLog) ? next.seasonState.activityLog : [];
    next.seasonState.pendingWaiverClaims = Array.isArray(next.seasonState.pendingWaiverClaims)
      ? next.seasonState.pendingWaiverClaims
      : [];
    next.seasonState.recentWaiverResults = Array.isArray(next.seasonState.recentWaiverResults)
      ? next.seasonState.recentWaiverResults
      : [];
    return next;
  }

  function applySimulationWaiverMove(next, move){
    const teamAbbr = normalizeTeamAbbr(move?.teamAbbr);
    const addId = Number(move?.addPlayerId);
    const dropId = Number(move?.dropPlayerId);

    const draftState = next?.draftState || {};
    const roster = Array.isArray(draftState.rostersByTeam?.[teamAbbr]) ? draftState.rostersByTeam[teamAbbr] : [];
    const freeAgents = Array.isArray(draftState.freeAgents) ? draftState.freeAgents : [];
    const addPlayer = freeAgents.find((player) => Number(player.id) === addId);
    const droppedPlayer = roster.find((player) => Number(player.id) === dropId);

    if (!addPlayer || !droppedPlayer) {
      return { approved: false, addPlayer: null, droppedPlayer: null };
    }

    next.draftState.rostersByTeam[teamAbbr] = roster
      .filter((player) => Number(player.id) !== dropId)
      .concat(clone(addPlayer));
    next.draftState.freeAgents = freeAgents
      .filter((player) => Number(player.id) !== addId)
      .concat(clone(droppedPlayer));
    pruneLineupState(next, teamAbbr, [dropId]);
    return {
      approved: true,
      addPlayer: clone(addPlayer),
      droppedPlayer: clone(droppedPlayer)
    };
  }

  function buildSimulationWaiverClaim(state, payload){
    const teamAbbr = normalizeTeamAbbr(payload?.teamAbbr);
    const addPlayerId = Number(payload?.addPlayerId);
    const dropPlayerId = Number(payload?.dropPlayerId);
    return {
      claimId: String(payload?.claimId || `waiver_${teamAbbr || 'team'}_${addPlayerId}_${dropPlayerId}_${Date.now()}`),
      teamAbbr,
      addPlayerId,
      dropPlayerId,
      processOnAdvance: getSimulationWaiverCadence(state),
      status: 'pending',
      submittedAt: Date.now()
    };
  }

  function submitSimulationWaiverClaim(state, payload){
    const next = ensureSimulationWaiverState(clone(state));
    const claim = buildSimulationWaiverClaim(state, payload);
    const roster = Array.isArray(next.draftState.rostersByTeam?.[claim.teamAbbr]) ? next.draftState.rostersByTeam[claim.teamAbbr] : [];
    const addPlayer = next.draftState.freeAgents.find((player) => Number(player.id) === claim.addPlayerId);
    const droppedPlayer = roster.find((player) => Number(player.id) === claim.dropPlayerId);

    if (!claim.teamAbbr || !addPlayer || !droppedPlayer) {
      return next;
    }

    next.seasonState.pendingWaiverClaims = next.seasonState.pendingWaiverClaims.concat(claim);
    next.seasonState.activityLog.unshift({
      type: 'waiver_claim_submitted',
      teamAbbr: claim.teamAbbr,
      title: `${claim.teamAbbr} submitted a waiver claim`,
      ts: Date.now()
    });
    return next;
  }

  function cancelSimulationWaiverClaim(state, payload){
    const next = ensureSimulationWaiverState(clone(state));
    const claimId = String(payload?.claimId || '').trim();
    if (!claimId) {
      return next;
    }
    const removedClaim = next.seasonState.pendingWaiverClaims.find((claim) => String(claim?.claimId || '') === claimId);
    next.seasonState.pendingWaiverClaims = next.seasonState.pendingWaiverClaims.filter((claim) => String(claim?.claimId || '') !== claimId);
    if (removedClaim) {
      next.seasonState.activityLog.unshift({
        type: 'waiver_claim_cancelled',
        teamAbbr: removedClaim.teamAbbr,
        title: `${removedClaim.teamAbbr} cancelled a waiver claim`,
        ts: Date.now()
      });
    }
    return next;
  }

  function processSimulationWaiverClaims(state, payload){
    const next = ensureSimulationWaiverState(clone(state));
    const cadence = String(payload?.cadence || '').trim().toLowerCase();
    if (!cadence) {
      return next;
    }

    const waiverOrder = getSimulationWaiverOrder(next);
    const remainingClaims = [];
    const pendingClaims = next.seasonState.pendingWaiverClaims.slice();
    const pickNextClaimIndex = (claims) => {
      let bestIndex = -1;
      let bestPriority = Number.MAX_SAFE_INTEGER;
      let bestSubmittedAt = Number.MAX_SAFE_INTEGER;
      claims.forEach((claim, index) => {
        const teamPriority = waiverOrder.indexOf(normalizeTeamAbbr(claim?.teamAbbr));
        const normalizedPriority = teamPriority >= 0 ? teamPriority : Number.MAX_SAFE_INTEGER;
        const submittedAt = Number(claim?.submittedAt || 0);
        if (
          normalizedPriority < bestPriority ||
          (normalizedPriority === bestPriority && submittedAt < bestSubmittedAt)
        ) {
          bestIndex = index;
          bestPriority = normalizedPriority;
          bestSubmittedAt = submittedAt;
        }
      });
      return bestIndex;
    };

    while (pendingClaims.length) {
      const nextIndex = pickNextClaimIndex(pendingClaims);
      const claim = nextIndex >= 0 ? pendingClaims.splice(nextIndex, 1)[0] : pendingClaims.shift();
      const processOnAdvance = String(claim?.processOnAdvance || '').trim().toLowerCase();
      if (processOnAdvance !== cadence || String(claim?.status || 'pending').trim().toLowerCase() !== 'pending') {
        remainingClaims.push(claim);
        continue;
      }

      const resolution = applySimulationWaiverMove(next, claim);
      const result = {
        ...claim,
        status: resolution.approved ? 'approved' : 'failed',
        processedAt: Date.now()
      };
      next.seasonState.recentWaiverResults.unshift(result);
      if (resolution.approved) {
        const winnerIndex = waiverOrder.indexOf(normalizeTeamAbbr(claim?.teamAbbr));
        if (winnerIndex >= 0) {
          const [winner] = waiverOrder.splice(winnerIndex, 1);
          waiverOrder.push(winner);
        }
        next.seasonState.activityLog.unshift({
          type: 'waiver',
          teamAbbr: claim.teamAbbr,
          title: `${claim.teamAbbr} added ${resolution.addPlayer?.name || 'player'}`,
          ts: Date.now()
        });
      }
    }

    next.seasonState.pendingWaiverClaims = remainingClaims;
    next.seasonState.waiverOrder = waiverOrder;
    return next;
  }

  function claimSimulationFreeAgent(state, move){
    const next = ensureSimulationWaiverState(clone(state));
    const teamAbbr = normalizeTeamAbbr(move?.teamAbbr);
    const resolution = applySimulationWaiverMove(next, move);
    if (!resolution.approved) {
      return next;
    }
    next.seasonState.activityLog.unshift({
      type: 'waiver',
      teamAbbr,
      title: `${teamAbbr} added ${resolution.addPlayer?.name || 'player'}`,
      ts: Date.now()
    });
    return next;
  }

  function applySimulationTrade(state, trade){
    const fromTeamAbbr = normalizeTeamAbbr(trade?.fromTeamAbbr);
    const toTeamAbbr = normalizeTeamAbbr(trade?.toTeamAbbr);
    if (!fromTeamAbbr || !toTeamAbbr || fromTeamAbbr === toTeamAbbr) {
      return clone(state);
    }
    const outgoingIds = new Set((Array.isArray(trade?.outgoingPlayerIds) ? trade.outgoingPlayerIds : []).map(Number));
    const incomingIds = new Set((Array.isArray(trade?.incomingPlayerIds) ? trade.incomingPlayerIds : []).map(Number));
    if (!outgoingIds.size || !incomingIds.size) {
      return clone(state);
    }

    const draftState = state?.draftState || {};
    const fromRoster = Array.isArray(draftState.rostersByTeam?.[fromTeamAbbr]) ? draftState.rostersByTeam[fromTeamAbbr] : [];
    const toRoster = Array.isArray(draftState.rostersByTeam?.[toTeamAbbr]) ? draftState.rostersByTeam[toTeamAbbr] : [];
    const outgoing = fromRoster.filter((player) => outgoingIds.has(Number(player.id)));
    const incoming = toRoster.filter((player) => incomingIds.has(Number(player.id)));

    if (outgoing.length !== outgoingIds.size || incoming.length !== incomingIds.size) {
      return clone(state);
    }

    const next = clone(state);
    next.draftState = next.draftState || {};
    next.draftState.rostersByTeam = next.draftState.rostersByTeam || {};
    next.seasonState = next.seasonState || {};
    next.seasonState.activityLog = Array.isArray(next.seasonState.activityLog) ? next.seasonState.activityLog : [];

    const nextFromRoster = Array.isArray(next.draftState.rostersByTeam[fromTeamAbbr]) ? next.draftState.rostersByTeam[fromTeamAbbr] : [];
    const nextToRoster = Array.isArray(next.draftState.rostersByTeam[toTeamAbbr]) ? next.draftState.rostersByTeam[toTeamAbbr] : [];
    const clonedIncoming = clone(incoming);
    const clonedOutgoing = clone(outgoing);

    next.draftState.rostersByTeam[fromTeamAbbr] = nextFromRoster.filter((player) => !outgoingIds.has(Number(player.id))).concat(clonedIncoming);
    next.draftState.rostersByTeam[toTeamAbbr] = nextToRoster.filter((player) => !incomingIds.has(Number(player.id))).concat(clonedOutgoing);
    pruneLineupState(next, fromTeamAbbr, Array.from(outgoingIds));
    pruneLineupState(next, toTeamAbbr, Array.from(incomingIds));
    next.seasonState.activityLog.unshift({
      type: 'trade',
      title: `${fromTeamAbbr} traded with ${toTeamAbbr}`,
      ts: Date.now()
    });
    return next;
  }

  function activateSimulationPowerup(state, payload){
    const next = clone(state);
    const powerupId = String(payload?.powerupId || '').trim();
    if (!powerupId) {
      return next;
    }
    next.seasonState = next.seasonState || {};
    const currentWeek = Math.max(1, Number(next.seasonState.currentWeek || 1));
    const teamAbbr = normalizeTeamAbbr(payload?.teamAbbr);
    const existingPowerupsByWeek = (
      next.seasonState.powerupsByWeek &&
      typeof next.seasonState.powerupsByWeek === 'object' &&
      !Array.isArray(next.seasonState.powerupsByWeek)
    ) ? next.seasonState.powerupsByWeek : {};
    const currentWeekPowerups = (
      existingPowerupsByWeek[currentWeek] &&
      typeof existingPowerupsByWeek[currentWeek] === 'object' &&
      !Array.isArray(existingPowerupsByWeek[currentWeek])
    ) ? existingPowerupsByWeek[currentWeek] : {};

    next.seasonState.powerupsByWeek = {
      ...existingPowerupsByWeek,
      [currentWeek]: {
        ...currentWeekPowerups,
        [powerupId]: {
          ...(currentWeekPowerups[powerupId] || {}),
          active: true,
          powerupId,
          teamAbbr: teamAbbr || null,
          targetId: payload?.targetId == null || payload?.targetId === ''
            ? null
            : Number(payload.targetId)
        }
      }
    };
    return next;
  }

  function updateSimulationTeamSettings(state, payload){
    const next = clone(state);
    const teamAbbr = normalizeTeamAbbr(payload?.teamAbbr || next?.draftState?.controlledTeamAbbr);
    if (!teamAbbr) {
      return next;
    }
    const nextName = String(payload?.name || '').trim();
    const nextAvatarUrl = String(payload?.avatarUrl || '').trim();
    const teams = Array.isArray(next?.leagueShell?.teams) ? next.leagueShell.teams : [];
    const teamIndex = teams.findIndex((team) => normalizeTeamAbbr(team?.abbr) === teamAbbr);
    if (teamIndex < 0) {
      return next;
    }
    const team = teams[teamIndex] || {};
    if (nextName) {
      next.leagueShell.teams[teamIndex] = {
        ...team,
        name: nextName,
        displayName: nextName
      };
    }
    const avatarStore = (
      next.teamAvatarUrls &&
      typeof next.teamAvatarUrls === 'object'
    ) ? clone(next.teamAvatarUrls) : (Array.isArray(teams) ? Array(teams.length).fill('') : {});
    avatarStore[teamIndex] = nextAvatarUrl;
    next.teamAvatarUrls = avatarStore;
    if (next.draftState && typeof next.draftState === 'object') {
      next.draftState = {
        ...next.draftState,
        controlledTeamName: nextName || next.draftState.controlledTeamName || team.name || team.displayName || teamAbbr
      };
    }
    return next;
  }

  function applySimulationInjuryDesignations(state, injuries){
    const next = clone(state);
    next.draftState = next.draftState || {};
    next.draftState.rostersByTeam = next.draftState.rostersByTeam || {};

    (Array.isArray(injuries) ? injuries : []).forEach((injury) => {
      const teamAbbr = normalizeTeamAbbr(injury?.teamAbbr);
      const roster = Array.isArray(next.draftState.rostersByTeam[teamAbbr]) ? next.draftState.rostersByTeam[teamAbbr] : [];
      const player = roster.find((entry) => Number(entry.id) === Number(injury?.playerId));
      if (player) player.designation = String(injury?.designation || 'ACTIVE').trim().toUpperCase();
    });
    return next;
  }

  function readCompletedSimulationState(){
    return readJsonFromStorageArea(root && root.sessionStorage, COMPLETED_DRAFT_KEY)
      ?? readJsonStorage(COMPLETED_DRAFT_KEY);
  }

  function writeCompletedSimulationState(state){
    const payload = state && typeof state === 'object'
      ? {
          ...state,
          activeSeasonBackend: 'simulation',
          historicalEntryMode: String(state?.historicalEntryMode || 'simulation_season').trim() || 'simulation_season',
          legacyHistoricalStatMode: false
        }
      : state;
    if (writeJsonToStorageArea(root && root.sessionStorage, COMPLETED_DRAFT_KEY, payload)) {
      try{
        clearJsonFromStorageArea(root && root.localStorage, COMPLETED_DRAFT_KEY);
      }catch(error){}
      return payload;
    }
    return writeJsonStorage(COMPLETED_DRAFT_KEY, payload);
  }

  function clearCompletedSimulationState(){
    const clearedSession = clearJsonFromStorageArea(root && root.sessionStorage, COMPLETED_DRAFT_KEY);
    const clearedLocal = clearJsonStorage(COMPLETED_DRAFT_KEY);
    return clearedSession || clearedLocal;
  }

  const api = {
    STORAGE_KEY,
    COMPLETED_DRAFT_KEY,
    readCompletedSimulationState,
    writeCompletedSimulationState,
    clearCompletedSimulationState,
    getSimulationSport,
    getSimulationModeId,
    getSimulationRosterNeeds,
    getSimulationStarterSlots,
    getSimulationRequiredStarterCount,
    getSimulationLineupSlotTemplate,
    getNflSlotEligibilityMap,
    normalizeSimulationLineupSlots,
    validateSimulationLineup,
    buildSuggestedSimulationLineup,
    getFootballCoverageBonus,
    buildSimulationPlayerPool,
    buildSimulationUniverseBootstrap,
    buildUnifiedSimulationSeasonState,
    buildCompletedSimulationAutoDraftState,
    setSimulationLineup,
    pruneLineupState,
    getSimulationWaiverCadence,
    claimSimulationFreeAgent,
    submitSimulationWaiverClaim,
    cancelSimulationWaiverClaim,
    processSimulationWaiverClaims,
    applySimulationTrade,
    activateSimulationPowerup,
    updateSimulationTeamSettings,
    applySimulationInjuryDesignations
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.RosterBateSimulationModeRuntime = api;
})(typeof window !== 'undefined' ? window : globalThis);
