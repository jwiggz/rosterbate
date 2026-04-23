(function(root){
  'use strict';

  const STORAGE_KEY = 'rbSimulationModeLocalState';
  const COMPLETED_DRAFT_KEY = 'rbSimulationModeCompletedDraft';

  function clone(value){
    return JSON.parse(JSON.stringify(value));
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

  function claimSimulationFreeAgent(state, move){
    const next = clone(state);
    const teamAbbr = normalizeTeamAbbr(move?.teamAbbr);
    const addId = Number(move?.addPlayerId);
    const dropId = Number(move?.dropPlayerId);

    next.draftState = next.draftState || {};
    next.draftState.rostersByTeam = next.draftState.rostersByTeam || {};
    next.draftState.freeAgents = Array.isArray(next.draftState.freeAgents) ? next.draftState.freeAgents : [];
    next.seasonState = next.seasonState || {};
    next.seasonState.activityLog = Array.isArray(next.seasonState.activityLog) ? next.seasonState.activityLog : [];

    const addPlayer = next.draftState.freeAgents.find((player) => Number(player.id) === addId);
    const roster = Array.isArray(next.draftState.rostersByTeam[teamAbbr]) ? next.draftState.rostersByTeam[teamAbbr] : [];
    const droppedPlayer = roster.find((player) => Number(player.id) === dropId);

    next.draftState.rostersByTeam[teamAbbr] = roster.filter((player) => Number(player.id) !== dropId);
    if (addPlayer) next.draftState.rostersByTeam[teamAbbr].push(addPlayer);
    if (droppedPlayer) next.draftState.freeAgents.push(droppedPlayer);
    next.draftState.freeAgents = next.draftState.freeAgents.filter((player) => Number(player.id) !== addId);
    next.seasonState.activityLog.unshift({
      type: 'waiver',
      teamAbbr,
      title: `${teamAbbr} added ${addPlayer?.name || 'player'}`,
      ts: Date.now()
    });
    return next;
  }

  function applySimulationTrade(state, trade){
    const next = clone(state);
    const fromTeamAbbr = normalizeTeamAbbr(trade?.fromTeamAbbr);
    const toTeamAbbr = normalizeTeamAbbr(trade?.toTeamAbbr);
    const outgoingIds = new Set((Array.isArray(trade?.outgoingPlayerIds) ? trade.outgoingPlayerIds : []).map(Number));
    const incomingIds = new Set((Array.isArray(trade?.incomingPlayerIds) ? trade.incomingPlayerIds : []).map(Number));

    next.draftState = next.draftState || {};
    next.draftState.rostersByTeam = next.draftState.rostersByTeam || {};
    next.seasonState = next.seasonState || {};
    next.seasonState.activityLog = Array.isArray(next.seasonState.activityLog) ? next.seasonState.activityLog : [];

    const fromRoster = Array.isArray(next.draftState.rostersByTeam[fromTeamAbbr]) ? next.draftState.rostersByTeam[fromTeamAbbr] : [];
    const toRoster = Array.isArray(next.draftState.rostersByTeam[toTeamAbbr]) ? next.draftState.rostersByTeam[toTeamAbbr] : [];
    const outgoing = fromRoster.filter((player) => outgoingIds.has(Number(player.id)));
    const incoming = toRoster.filter((player) => incomingIds.has(Number(player.id)));

    next.draftState.rostersByTeam[fromTeamAbbr] = fromRoster.filter((player) => !outgoingIds.has(Number(player.id))).concat(incoming);
    next.draftState.rostersByTeam[toTeamAbbr] = toRoster.filter((player) => !incomingIds.has(Number(player.id))).concat(outgoing);
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

  const api = {
    STORAGE_KEY,
    COMPLETED_DRAFT_KEY,
    buildSimulationPlayerPool,
    buildSimulationUniverseBootstrap,
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
