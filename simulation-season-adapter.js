(function(root){
  'use strict';

  const MODE_ID = 'nba_mixed_era_single_player_v1';
  const runtimeApi = (typeof module !== 'undefined' && module.exports)
    ? require('./simulation-mode-runtime.js')
    : root.RosterBateSimulationModeRuntime;
  const engineApi = (typeof module !== 'undefined' && module.exports)
    ? require('./simulation-league-engine.js')
    : root.RosterBateSimulationEngine;
  const NAV_ITEMS = Object.freeze([
    { id: 'hub', label: 'Hub' },
    { id: 'roster', label: 'Roster' },
    { id: 'matchup', label: 'Schedule' },
    { id: 'waiver', label: 'Waivers' },
    { id: 'trades', label: 'Trades' },
    { id: 'standings', label: 'Stand.' }
  ]);

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  function isSupportedSimulationSeasonState(state){
    return String(state?.simulationMode || '').trim().toLowerCase() === MODE_ID;
  }

  function getControlledTeam(state){
    const abbr = String(state?.draftState?.controlledTeamAbbr || '').trim().toUpperCase();
    return (state?.leagueShell?.teams || []).find((team) => team.abbr === abbr) || null;
  }

  function getControlledRoster(state){
    const team = getControlledTeam(state);
    if (!team) return [];
    return Array.isArray(state?.draftState?.rostersByTeam?.[team.abbr])
      ? state.draftState.rostersByTeam[team.abbr].slice()
      : [];
  }

  function createSimulationSeasonAdapter(options){
    const slotId = String(options?.slotId || '').trim();
    let state = clone(options?.state || {});

    return {
      getModeId(){
        return MODE_ID;
      },
      getNavItems(){
        return clone(NAV_ITEMS);
      },
      getState(){
        return clone(state);
      },
      replaceState(nextState){
        state = clone(nextState || {});
        return this.getState();
      },
      getHubViewModel(){
        const team = getControlledTeam(state);
        const standings = Array.isArray(state?.seasonState?.standings) ? state.seasonState.standings : [];
        const userRow = standings.find((row) => row.teamAbbr === team?.abbr) || null;
        return {
          slotId,
          leagueLabel: `${state?.leagueShell?.anchorSeasonLabel || 'NBA'} Simulation`,
          controlledTeam: team,
          userRow,
          primaryAction: { id: 'sim-day', label: 'Sim Day' },
          sourceSeasonLabels: clone(state?.sourceSeasons?.sourceSeasonLabels || []),
          recentActivity: clone(state?.seasonState?.activityLog || []).slice(-5).reverse()
        };
      },
      getRosterViewModel(){
        const roster = getControlledRoster(state);
        const lineupIds = new Set(state?.seasonState?.lineupIdsByTeam?.[state?.draftState?.controlledTeamAbbr] || []);
        return {
          roster,
          lineup: roster.filter((player) => lineupIds.has(player.id)),
          bench: roster.filter((player) => !lineupIds.has(player.id))
        };
      },
      getScheduleViewModel(){
        const teamAbbr = String(state?.draftState?.controlledTeamAbbr || '').trim().toUpperCase();
        const nextGame = (state?.seasonState?.upcomingGamesByTeam?.[teamAbbr] || [])[0] || null;
        return {
          recentResults: clone(state?.seasonState?.completedGameLogs || []).slice(-10).reverse(),
          nextGame
        };
      },
      getWaiverViewModel(){
        return {
          availablePlayers: clone(state?.draftState?.freeAgents || [])
        };
      },
      getTradeViewModel(){
        const controlled = String(state?.draftState?.controlledTeamAbbr || '').trim().toUpperCase();
        return {
          tradePartners: clone(state?.leagueShell?.teams || []).filter((team) => team.abbr !== controlled),
          tradeHistory: clone(state?.seasonState?.activityLog || []).filter((entry) => entry.type === 'trade')
        };
      },
      getStandingsViewModel(){
        const standings = clone(state?.seasonState?.standings || []);
        return {
          rows: standings,
          userRow: standings.find((row) => row.teamAbbr === state?.draftState?.controlledTeamAbbr) || null
        };
      }
    };
  }

  const api = {
    MODE_ID,
    isSupportedSimulationSeasonState,
    createSimulationSeasonAdapter
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.RosterBateSimulationSeasonAdapter = api;
})(typeof window !== 'undefined' ? window : globalThis);
