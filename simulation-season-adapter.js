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

  function getControlledTeamAbbr(state){
    return String(state?.draftState?.controlledTeamAbbr || '').trim().toUpperCase();
  }

  function getControlledTeam(state){
    const abbr = getControlledTeamAbbr(state);
    return (state?.leagueShell?.teams || []).find((team) => team.abbr === abbr) || null;
  }

  function getControlledRoster(state){
    const team = getControlledTeam(state);
    if (!team) return [];
    return Array.isArray(state?.draftState?.rostersByTeam?.[team.abbr])
      ? clone(state.draftState.rostersByTeam[team.abbr])
      : [];
  }

  function formatSimulationCycleLabel(state){
    return `Day ${Number(state?.seasonState?.currentDay || 1)} - Week ${Number(state?.seasonState?.currentWeek || 1)}`;
  }

  function buildSimulationRecordLabel(row){
    if (!row) return '0-0';
    return `${Number(row.w || 0)}-${Number(row.l || 0)}`;
  }

  function getCanonicalScheduleByDay(state, shell){
    const persistedSchedule = state?.seasonState?.scheduleByDay;
    if (persistedSchedule && typeof persistedSchedule === 'object' && Object.keys(persistedSchedule).length) {
      return clone(persistedSchedule);
    }
    const schedule = engineApi.buildSimulationSeasonSchedule(clone(shell || {}));
    return clone(schedule?.byDay || {});
  }

  function buildSimulationNextGame(state, scheduleByDay){
    const teamAbbr = getControlledTeamAbbr(state);
    if (!teamAbbr) return null;
    const currentDay = Number(state?.seasonState?.currentDay || 1);
    const teamLookup = new Map(
      clone(state?.leagueShell?.teams || []).map((team) => [String(team?.abbr || '').trim().toUpperCase(), team])
    );
    const orderedDays = Object.keys(scheduleByDay || {})
      .map((day) => Number(day))
      .filter((day) => Number.isFinite(day) && day >= currentDay)
      .sort((a, b) => a - b);

    for (const day of orderedDays) {
      const matchup = (scheduleByDay?.[day] || []).find((game) => (
        String(game?.homeAbbr || '').trim().toUpperCase() === teamAbbr ||
        String(game?.awayAbbr || '').trim().toUpperCase() === teamAbbr
      ));
      if (!matchup) continue;
      const isHome = String(matchup?.homeAbbr || '').trim().toUpperCase() === teamAbbr;
      const opponentAbbr = isHome ? matchup.awayAbbr : matchup.homeAbbr;
      const opponent = teamLookup.get(String(opponentAbbr || '').trim().toUpperCase()) || null;
      return {
        day,
        home: isHome,
        homeAbbr: matchup.homeAbbr,
        awayAbbr: matchup.awayAbbr,
        opponentAbbr,
        opponentName: opponent?.name || opponent?.displayName || opponentAbbr || 'Opponent'
      };
    }
    return null;
  }

  function normalizeSimulationStandingsRows(state, teamMeta){
    const standings = clone(state?.seasonState?.standings || []);
    return teamMeta.map((team, teamIdx) => {
      const abbr = String(team?.abbr || '').trim().toUpperCase();
      const row = standings.find((entry) => String(entry?.teamAbbr || '').trim().toUpperCase() === abbr) || standings[teamIdx] || {};
      return {
        ...row,
        teamIdx,
        teamAbbr: abbr || row.teamAbbr || null,
        conference: row.conference || team?.conference || '',
        division: row.division || team?.division || ''
      };
    });
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
          shellLabel: `${state?.leagueShell?.anchorSeasonLabel || 'NBA'} Shell`,
          controlledTeam: team ? clone(team) : null,
          userRow: userRow ? clone(userRow) : null,
          recordLabel: buildSimulationRecordLabel(userRow),
          primaryAction: { id: 'sim-day', label: 'Sim Day' },
          sourceSeasonLabels: clone(state?.sourceSeasons?.sourceSeasonLabels || []),
          recentActivity: clone(state?.seasonState?.activityLog || []).slice(-5).reverse()
        };
      },
      getRosterViewModel(){
        const roster = getControlledRoster(state);
        const lineupIds = new Set(state?.seasonState?.lineupIdsByTeam?.[getControlledTeamAbbr(state)] || []);
        return {
          roster,
          lineup: roster.filter((player) => lineupIds.has(player.id)).map((player) => clone(player)),
          bench: roster.filter((player) => !lineupIds.has(player.id)).map((player) => clone(player))
        };
      },
      getScheduleViewModel(){
        const scheduleByDay = getCanonicalScheduleByDay(state, state?.leagueShell || {});
        const nextGame = buildSimulationNextGame(state, scheduleByDay);
        return {
          title: 'Schedule / Results',
          cycleLabel: formatSimulationCycleLabel(state),
          recentResults: clone(state?.seasonState?.completedGameLogs || []).slice(-10).reverse(),
          scheduleByDay,
          nextGame: nextGame ? clone(nextGame) : null
        };
      },
      getWaiverViewModel(){
        return {
          availablePlayers: clone(state?.draftState?.freeAgents || [])
        };
      },
      getTradeViewModel(){
        const controlled = getControlledTeamAbbr(state);
        return {
          tradePartners: clone(state?.leagueShell?.teams || []).filter((team) => team.abbr !== controlled),
          tradeHistory: clone(state?.seasonState?.activityLog || []).filter((entry) => entry.type === 'trade')
        };
      },
      getStandingsViewModel(){
        const standings = clone(state?.seasonState?.standings || []);
        const controlled = getControlledTeamAbbr(state);
        return {
          rows: standings,
          userRow: standings.find((row) => row.teamAbbr === controlled) || null
        };
      },
      simulateNextDay(){
        const shell = clone(state?.leagueShell || {});
        const scheduleByDay = getCanonicalScheduleByDay(state, shell);
        const schedule = { byDay: clone(scheduleByDay) };
        const teamMeta = clone(shell.teams || []);
        const teamNames = teamMeta.map((team) => team.name);
        const allRosters = teamMeta.map((team) => clone(state?.draftState?.rostersByTeam?.[team.abbr] || []));
        const currentSeasonState = clone(state?.seasonState || {});
        const engineSeasonState = {
          ...currentSeasonState,
          standings: normalizeSimulationStandingsRows(state, teamMeta)
        };
        const dayResult = engineApi.simulateSimulationGameDay({
          state: {
            ...engineSeasonState,
            seasonId: state?.seasonId || state?.historicalUniverseSlotId || null,
            teamMeta,
            teams: teamNames,
            allRosters
          },
          schedule,
          day: Number(currentSeasonState.currentDay || 1),
          lineupIdsByTeam: clone(currentSeasonState.lineupIdsByTeam || {})
        });
        const nextSeasonState = engineApi.applySimulationDayResults(engineSeasonState, dayResult);
        state = {
          ...clone(state),
          currentDay: Number(nextSeasonState.currentDay || currentSeasonState.currentDay || 1),
          currentWeek: Number(nextSeasonState.currentWeek || currentSeasonState.currentWeek || 1),
          seasonState: {
            ...nextSeasonState,
            scheduleByDay: clone(scheduleByDay)
          }
        };
        return this.getState();
      }
    };
  }

  const api = {
    MODE_ID,
    clone,
    getControlledTeam,
    getControlledRoster,
    isSupportedSimulationSeasonState,
    createSimulationSeasonAdapter
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  root.RosterBateSimulationSeasonAdapter = api;
})(typeof window !== 'undefined' ? window : globalThis);
