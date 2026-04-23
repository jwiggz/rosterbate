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

  function buildSimulationPlayerPool({ mixedEraContext, shell }){
    const leagueShell = normalizeShell(shell);
    const rosterSize = Number(leagueShell.rosterSize || 10);
    const teamCount = Array.isArray(leagueShell.teams) ? leagueShell.teams.length : 30;
    const draftTarget = rosterSize * teamCount;
    const freeAgentTarget = 60;
    const ranked = decorateSimulationTier(sortPlayers(mixedEraContext?.playerPool || []));
    return {
      draftPool: ranked.slice(0, draftTarget),
      freeAgents: ranked.slice(draftTarget, draftTarget + freeAgentTarget),
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
      simulationMode: 'nba_mixed_era_single_player_v1',
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

  function getSimulationPlayerPosition(player){
    return String(player?.pos || player?.primaryPosition || 'UTIL').trim().toUpperCase();
  }

  function getSimulationAutoDraftScore(player, roster){
    const nextRoster = Array.isArray(roster) ? roster : [];
    const position = getSimulationPlayerPosition(player);
    const samePositionCount = nextRoster.reduce((count, entry) => (
      getSimulationPlayerPosition(entry) === position ? count + 1 : count
    ), 0);
    const baseScore = (Number(player?.mixedEraOverall || 0) * 100) + Number(player?.fp || 0);
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
          const score = getSimulationAutoDraftScore(draftablePlayers[index], roster);
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
    return next;
  }

  function setSimulationLineup(state, teamAbbr, lineupIds){
    const next = clone(state);
    const key = normalizeTeamAbbr(teamAbbr);
    next.seasonState = next.seasonState || {};
    next.seasonState.lineupIdsByTeam = next.seasonState.lineupIdsByTeam || {};
    next.seasonState.activityLog = Array.isArray(next.seasonState.activityLog) ? next.seasonState.activityLog : [];
    next.seasonState.lineupIdsByTeam[key] = (Array.isArray(lineupIds) ? lineupIds : []).map((id) => Number(id));
    next.seasonState.activityLog.unshift({
      type: 'lineup',
      teamAbbr: key,
      title: `${key} updated its lineup`,
      ts: Date.now()
    });
    return next;
  }

  function pruneLineupIds(next, teamAbbr, removedPlayerIds){
    const seasonState = next.seasonState || {};
    const lineupIdsByTeam = seasonState.lineupIdsByTeam || {};
    const currentLineup = Array.isArray(lineupIdsByTeam[teamAbbr]) ? lineupIdsByTeam[teamAbbr] : [];
    const removedIds = new Set((Array.isArray(removedPlayerIds) ? removedPlayerIds : []).map(Number));
    lineupIdsByTeam[teamAbbr] = currentLineup.filter((id) => !removedIds.has(Number(id)));
    seasonState.lineupIdsByTeam = lineupIdsByTeam;
    next.seasonState = seasonState;
  }

  function claimSimulationFreeAgent(state, move){
    const teamAbbr = normalizeTeamAbbr(move?.teamAbbr);
    const addId = Number(move?.addPlayerId);
    const dropId = Number(move?.dropPlayerId);

    const draftState = state?.draftState || {};
    const roster = Array.isArray(draftState.rostersByTeam?.[teamAbbr]) ? draftState.rostersByTeam[teamAbbr] : [];
    const freeAgents = Array.isArray(draftState.freeAgents) ? draftState.freeAgents : [];
    const addPlayer = freeAgents.find((player) => Number(player.id) === addId);
    const droppedPlayer = roster.find((player) => Number(player.id) === dropId);

    if (!addPlayer || !droppedPlayer) {
      return clone(state);
    }

    const next = clone(state);
    next.draftState = next.draftState || {};
    next.draftState.rostersByTeam = next.draftState.rostersByTeam || {};
    next.draftState.freeAgents = Array.isArray(next.draftState.freeAgents) ? next.draftState.freeAgents : [];
    next.seasonState = next.seasonState || {};
    next.seasonState.activityLog = Array.isArray(next.seasonState.activityLog) ? next.seasonState.activityLog : [];

    const nextRoster = Array.isArray(next.draftState.rostersByTeam[teamAbbr]) ? next.draftState.rostersByTeam[teamAbbr] : [];
    next.draftState.rostersByTeam[teamAbbr] = nextRoster.filter((player) => Number(player.id) !== dropId).concat(addPlayer);
    next.draftState.freeAgents = next.draftState.freeAgents.filter((player) => Number(player.id) !== addId).concat(droppedPlayer);
    pruneLineupIds(next, teamAbbr, [dropId]);
    next.seasonState.activityLog.unshift({
      type: 'waiver',
      teamAbbr,
      title: `${teamAbbr} added ${addPlayer?.name || 'player'}`,
      ts: Date.now()
    });
    return next;
  }

  function applySimulationTrade(state, trade){
    const fromTeamAbbr = normalizeTeamAbbr(trade?.fromTeamAbbr);
    const toTeamAbbr = normalizeTeamAbbr(trade?.toTeamAbbr);
    if (fromTeamAbbr && fromTeamAbbr === toTeamAbbr) {
      return clone(state);
    }
    const outgoingIds = new Set((Array.isArray(trade?.outgoingPlayerIds) ? trade.outgoingPlayerIds : []).map(Number));
    const incomingIds = new Set((Array.isArray(trade?.incomingPlayerIds) ? trade.incomingPlayerIds : []).map(Number));

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

    next.draftState.rostersByTeam[fromTeamAbbr] = nextFromRoster.filter((player) => !outgoingIds.has(Number(player.id))).concat(incoming);
    next.draftState.rostersByTeam[toTeamAbbr] = nextToRoster.filter((player) => !incomingIds.has(Number(player.id))).concat(outgoing);
    pruneLineupIds(next, fromTeamAbbr, Array.from(outgoingIds));
    pruneLineupIds(next, toTeamAbbr, Array.from(incomingIds));
    next.seasonState.activityLog.unshift({
      type: 'trade',
      title: `${fromTeamAbbr} traded with ${toTeamAbbr}`,
      ts: Date.now()
    });
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
    return readJsonStorage(COMPLETED_DRAFT_KEY);
  }

  function writeCompletedSimulationState(state){
    return writeJsonStorage(COMPLETED_DRAFT_KEY, state);
  }

  const api = {
    STORAGE_KEY,
    COMPLETED_DRAFT_KEY,
    readCompletedSimulationState,
    writeCompletedSimulationState,
    buildSimulationPlayerPool,
    buildSimulationUniverseBootstrap,
    buildCompletedSimulationAutoDraftState,
    setSimulationLineup,
    claimSimulationFreeAgent,
    applySimulationTrade,
    applySimulationInjuryDesignations
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.RosterBateSimulationModeRuntime = api;
})(typeof window !== 'undefined' ? window : globalThis);
