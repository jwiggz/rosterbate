(function(root){
  'use strict';

  const STORAGE_KEY = 'rbSimulationModeLocalState';
  const COMPLETED_DRAFT_KEY = 'rbSimulationModeCompletedDraft';

  function clone(value){
    return JSON.parse(JSON.stringify(value));
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
    const rosterSize = Number(shell?.rosterSize || 10);
    const teamCount = Array.isArray(shell?.teams) ? shell.teams.length : 30;
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
    const pool = buildSimulationPlayerPool({ mixedEraContext, shell });
    return {
      simulationMode: 'nba_mixed_era_single_player_v1',
      leagueShell: clone(shell),
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
        rostersByTeam: Object.fromEntries(shell.teams.map((team) => [team.abbr, []]))
      },
      seasonState: {
        currentDay: 1,
        currentWeek: 1,
        scheduleByDay: {},
        completedGameLogs: [],
        standings: shell.teams.map((team, index) => ({
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

  const api = {
    STORAGE_KEY,
    COMPLETED_DRAFT_KEY,
    buildSimulationPlayerPool,
    buildSimulationUniverseBootstrap
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.RosterBateSimulationModeRuntime = api;
})(typeof window !== 'undefined' ? window : globalThis);
