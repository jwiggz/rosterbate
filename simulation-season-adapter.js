(function(root){
  'use strict';

  const MODE_ID = 'nba_mixed_era_single_player_v1';
  const browserEngineApi = root?.RosterBateSimulationEngine || null;
  const runtimeApi = (typeof module !== 'undefined' && module.exports)
    ? require('./simulation-mode-runtime.js')
    : {
      setSimulationLineup(...args){
        return root.RosterBateSimulationModeRuntime.setSimulationLineup(...args);
      },
      claimSimulationFreeAgent(...args){
        return root.RosterBateSimulationModeRuntime.claimSimulationFreeAgent(...args);
      },
      applySimulationTrade(...args){
        return root.RosterBateSimulationModeRuntime.applySimulationTrade(...args);
      }
    };
  const engineApi = (typeof module !== 'undefined' && module.exports)
    ? require('./simulation-league-engine.js')
    : browserEngineApi;
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

  function sortStandingsRows(rows){
    return (Array.isArray(rows) ? rows.slice() : []).sort((a, b) => {
      const winDiff = Number(b?.w || 0) - Number(a?.w || 0);
      if (winDiff) return winDiff;
      const lossDiff = Number(a?.l || 0) - Number(b?.l || 0);
      if (lossDiff) return lossDiff;
      const pdDiff = (Number(b?.pf || 0) - Number(b?.pa || 0)) - (Number(a?.pf || 0) - Number(a?.pa || 0));
      if (pdDiff) return pdDiff;
      return String(a?.teamAbbr || '').localeCompare(String(b?.teamAbbr || ''));
    });
  }

  function buildConferenceSnapshotRows(state, conference){
    return sortStandingsRows((state?.seasonState?.standings || []).filter((row) => (
      String(row?.conference || '').toLowerCase() === String(conference || '').toLowerCase()
    ))).map((row, index) => ({
      ...clone(row),
      seed: index + 1
    }));
  }

  function getScheduleDayCount(scheduleByDay){
    return Object.keys(scheduleByDay || {})
      .map((day) => Number(day))
      .filter((day) => Number.isFinite(day) && day > 0)
      .reduce((maxDay, day) => Math.max(maxDay, day), 0);
  }

  function ensurePostseasonSnapshot(nextState, totalDays){
    if (!nextState || !totalDays || Number(nextState?.seasonState?.currentDay || 1) <= totalDays) {
      return nextState;
    }
    const postseasonState = {
      ...(nextState?.postseasonState || {})
    };
    postseasonState.phase = postseasonState.phase && postseasonState.phase !== 'regular_season'
      ? postseasonState.phase
      : 'postseason_ready';
    if (!postseasonState.playIn && typeof engineApi.buildSimulationPlayIn === 'function') {
      postseasonState.playIn = {
        east: engineApi.buildSimulationPlayIn(buildConferenceSnapshotRows(nextState, 'East')),
        west: engineApi.buildSimulationPlayIn(buildConferenceSnapshotRows(nextState, 'West'))
      };
    }
    if (!postseasonState.bracket && typeof engineApi.buildSimulationPlayoffBracket === 'function') {
      postseasonState.bracket = engineApi.buildSimulationPlayoffBracket({
        east: buildConferenceSnapshotRows(nextState, 'East').slice(0, 8),
        west: buildConferenceSnapshotRows(nextState, 'West').slice(0, 8)
      });
    }
    return {
      ...clone(nextState),
      postseasonState
    };
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
      setLineup(lineupIds){
        const nextState = runtimeApi.setSimulationLineup(
          clone(state),
          state?.draftState?.controlledTeamAbbr,
          lineupIds
        );
        state = clone(nextState || {});
        return this.getState();
      },
      claimFreeAgent(move){
        const nextState = runtimeApi.claimSimulationFreeAgent(clone(state), move);
        state = clone(nextState || {});
        return this.getState();
      },
      applyTrade(trade){
        const nextState = runtimeApi.applySimulationTrade(clone(state), trade);
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
        const roster = getControlledRoster(state);
        return {
          roster,
          availablePlayers: clone(state?.draftState?.freeAgents || []).slice(0, 40)
        };
      },
      getTradeViewModel(){
        const controlled = getControlledTeamAbbr(state);
        return {
          userTeamAbbr: controlled,
          tradePartners: clone(state?.leagueShell?.teams || []).filter((team) => team.abbr !== controlled),
          outgoingRoster: getControlledRoster(state),
          incomingRostersByTeam: clone(state?.draftState?.rostersByTeam || {})
        };
      },
      getStandingsViewModel(){
        const standings = clone(state?.seasonState?.standings || []).sort((a, b) => Number(b.w || 0) - Number(a.w || 0));
        const controlled = getControlledTeamAbbr(state);
        return {
          rows: standings,
          userRow: standings.find((row) => String(row?.teamAbbr || '').trim().toUpperCase() === controlled) || null,
          postseasonPhase: state?.postseasonState?.phase || 'regular_season'
        };
      },
      simulateNextDay(){
        const shell = clone(state?.leagueShell || {});
        const scheduleByDay = getCanonicalScheduleByDay(state, shell);
        const totalDays = getScheduleDayCount(scheduleByDay);
        if (totalDays > 0 && Number(state?.seasonState?.currentDay || 1) > totalDays) {
          state = ensurePostseasonSnapshot(state, totalDays);
          return this.getState();
        }
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
        state = ensurePostseasonSnapshot({
          ...clone(state),
          currentDay: Number(nextSeasonState.currentDay || currentSeasonState.currentDay || 1),
          currentWeek: Number(nextSeasonState.currentWeek || currentSeasonState.currentWeek || 1),
          seasonState: {
            ...nextSeasonState,
            scheduleByDay: clone(scheduleByDay)
          }
        }, totalDays);
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
