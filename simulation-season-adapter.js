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
  const BASE_NAV_ITEMS = Object.freeze([
    { id: 'hub', label: 'Hub' },
    { id: 'roster', label: 'Roster' },
    { id: 'matchup', label: 'Schedule' },
    { id: 'waiver', label: 'Waivers' },
    { id: 'trades', label: 'Trades' },
    { id: 'standings', label: 'Stand.' }
  ]);
  const PLAYOFFS_NAV_ITEM = Object.freeze({ id: 'playoffs', label: 'Playoffs' });

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

  function shouldExposePlayoffsTab(state){
    return String(state?.postseasonState?.phase || 'regular_season').trim().toLowerCase() !== 'regular_season';
  }

  function buildSeriesState(id, conference, round, higherSeed, lowerSeed, targetWins){
    return {
      id,
      conference,
      round,
      higherSeed: higherSeed ? clone(higherSeed) : null,
      lowerSeed: lowerSeed ? clone(lowerSeed) : null,
      targetWins: Number(targetWins || 1),
      higherSeedWins: 0,
      lowerSeedWins: 0,
      winnerTeamAbbr: null,
      games: 0
    };
  }

  function buildPlayoffSeriesForRound(round, conference, teams){
    const orderedTeams = (Array.isArray(teams) ? teams : [])
      .filter(Boolean)
      .slice()
      .sort((a, b) => Number(a?.seed || 99) - Number(b?.seed || 99));
    const pairingsByRound = {
      playoffs_round_1: [[0, 7], [1, 6], [2, 5], [3, 4]],
      playoffs_round_2: [[0, 3], [1, 2]],
      conference_finals: [[0, 1]]
    };
    return (pairingsByRound[round] || [])
      .map((pairing, index) => {
        const higherSeed = orderedTeams[pairing[0]] || null;
        const lowerSeed = orderedTeams[pairing[1]] || null;
        if (!(higherSeed && lowerSeed)) return null;
        return buildSeriesState(
          `${conference}-${round}-${index + 1}`,
          conference,
          round,
          higherSeed,
          lowerSeed,
          4
        );
      })
      .filter(Boolean);
  }

  function buildSimulationExecutionContext(state, shell){
    const teamMeta = clone(shell?.teams || []);
    const teamNames = teamMeta.map((team) => team.name);
    const allRosters = teamMeta.map((team) => clone(state?.draftState?.rostersByTeam?.[team.abbr] || []));
    const currentSeasonState = clone(state?.seasonState || {});
    return {
      teamMeta,
      teamNames,
      allRosters,
      currentSeasonState,
      engineSeasonState: {
        ...currentSeasonState,
        standings: normalizeSimulationStandingsRows(state, teamMeta)
      }
    };
  }

  function simulateEngineDay(state, shell, dayScheduleByDay, day){
    const simulationContext = buildSimulationExecutionContext(state, shell);
    return {
      ...simulationContext,
      dayResult: engineApi.simulateSimulationGameDay({
        state: {
          ...simulationContext.engineSeasonState,
          seasonId: state?.seasonId || state?.historicalUniverseSlotId || null,
          teamMeta: simulationContext.teamMeta,
          teams: simulationContext.teamNames,
          allRosters: simulationContext.allRosters
        },
        schedule: {
          byDay: clone(dayScheduleByDay || {})
        },
        day: Number(day || simulationContext.currentSeasonState.currentDay || 1),
        lineupIdsByTeam: clone(simulationContext.currentSeasonState.lineupIdsByTeam || {})
      })
    };
  }

  function getSeriesTeam(series, teamAbbr){
    const targetAbbr = String(teamAbbr || '').trim().toUpperCase();
    if (String(series?.higherSeed?.teamAbbr || '').trim().toUpperCase() === targetAbbr) {
      return clone(series.higherSeed);
    }
    if (String(series?.lowerSeed?.teamAbbr || '').trim().toUpperCase() === targetAbbr) {
      return clone(series.lowerSeed);
    }
    return null;
  }

  function getSeriesLoser(series){
    if (!series?.winnerTeamAbbr) return null;
    if (String(series?.higherSeed?.teamAbbr || '').trim().toUpperCase() === String(series.winnerTeamAbbr || '').trim().toUpperCase()) {
      return clone(series?.lowerSeed || null);
    }
    return clone(series?.higherSeed || null);
  }

  function listRoundSeries(seriesById, round){
    return Object.values(seriesById || {})
      .filter((series) => String(series?.round || '') === String(round || ''))
      .sort((a, b) => String(a?.id || '').localeCompare(String(b?.id || '')));
  }

  function getSeriesHostTeamAbbr(series){
    const higherSeedAbbr = series?.higherSeed?.teamAbbr || null;
    const lowerSeedAbbr = series?.lowerSeed?.teamAbbr || null;
    const totalGamesPlayed = Number(series?.higherSeedWins || 0) + Number(series?.lowerSeedWins || 0);
    const homePattern = [higherSeedAbbr, higherSeedAbbr, lowerSeedAbbr, lowerSeedAbbr, higherSeedAbbr, lowerSeedAbbr, higherSeedAbbr];
    return homePattern[totalGamesPlayed] || higherSeedAbbr || lowerSeedAbbr;
  }

  function buildSeriesGame(series, day){
    const homeAbbr = getSeriesHostTeamAbbr(series);
    const higherSeedAbbr = series?.higherSeed?.teamAbbr || null;
    const awayAbbr = homeAbbr === higherSeedAbbr
      ? series?.lowerSeed?.teamAbbr || null
      : higherSeedAbbr;
    if (!(homeAbbr && awayAbbr)) return null;
    const totalGamesPlayed = Number(series?.higherSeedWins || 0) + Number(series?.lowerSeedWins || 0);
    return {
      day: Number(day || 1),
      gameId: `${series.id}-game-${totalGamesPlayed + 1}`,
      seriesId: series.id,
      conference: series.conference,
      round: series.round,
      homeAbbr,
      awayAbbr
    };
  }

  function buildSeededPostseasonState(nextState){
    const existingState = clone(nextState?.postseasonState || {});
    if (existingState.playIn && existingState.seriesById && existingState.phase && existingState.phase !== 'regular_season') {
      return {
        ...existingState,
        currentDay: Number(nextState?.seasonState?.currentDay || existingState.currentDay || 1),
        currentDaySchedule: clone(existingState.currentDaySchedule || [])
      };
    }
    const eastRows = buildConferenceSnapshotRows(nextState, 'East');
    const westRows = buildConferenceSnapshotRows(nextState, 'West');
    const playIn = {
      east: typeof engineApi.buildSimulationPlayIn === 'function'
        ? engineApi.buildSimulationPlayIn(eastRows)
        : { topSix: eastRows.slice(0, 6), sevenEight: eastRows.slice(6, 8), nineTen: eastRows.slice(8, 10) },
      west: typeof engineApi.buildSimulationPlayIn === 'function'
        ? engineApi.buildSimulationPlayIn(westRows)
        : { topSix: westRows.slice(0, 6), sevenEight: westRows.slice(6, 8), nineTen: westRows.slice(8, 10) }
    };
    const bracket = typeof engineApi.buildSimulationPlayoffBracket === 'function'
      ? engineApi.buildSimulationPlayoffBracket({
        east: eastRows.slice(0, 8),
        west: westRows.slice(0, 8)
      })
      : { east: { firstRound: [] }, west: { firstRound: [] }, finals: null };
    const seriesById = {
      'east-play-in-7-8': buildSeriesState('east-play-in-7-8', 'east', 'play_in', playIn.east.sevenEight[0], playIn.east.sevenEight[1], 1),
      'east-play-in-9-10': buildSeriesState('east-play-in-9-10', 'east', 'play_in', playIn.east.nineTen[0], playIn.east.nineTen[1], 1),
      'west-play-in-7-8': buildSeriesState('west-play-in-7-8', 'west', 'play_in', playIn.west.sevenEight[0], playIn.west.sevenEight[1], 1),
      'west-play-in-9-10': buildSeriesState('west-play-in-9-10', 'west', 'play_in', playIn.west.nineTen[0], playIn.west.nineTen[1], 1)
    };
    return {
      phase: 'postseason_ready',
      currentRound: 'play_in',
      currentDay: Number(nextState?.seasonState?.currentDay || 1),
      playIn,
      bracket,
      seriesById,
      currentDaySchedule: [],
      champion: null,
      runnerUp: null,
      completedAt: null
    };
  }

  function buildPlayInResultsForConference(seriesById, conference){
    return {
      sevenEightWinner: seriesById?.[`${conference}-play-in-7-8`]?.winnerTeamAbbr || null,
      nineTenWinner: seriesById?.[`${conference}-play-in-9-10`]?.winnerTeamAbbr || null,
      finalWinner: seriesById?.[`${conference}-play-in-final`]?.winnerTeamAbbr || null
    };
  }

  function resolvePlayoffFieldForConference(postseasonState, seriesById, conference){
    if (typeof engineApi.resolveSimulationPlayIn !== 'function') {
      return [];
    }
    return engineApi.resolveSimulationPlayIn(
      postseasonState?.playIn?.[conference] || {},
      buildPlayInResultsForConference(seriesById, conference)
    );
  }

  function seedConferenceRoundSeries(seriesById, round, conference, teams){
    buildPlayoffSeriesForRound(round, conference, teams).forEach((series) => {
      seriesById[series.id] = series;
    });
  }

  function seedPlayoffRoundFromFields(postseasonState, seriesById, round, eastField, westField){
    const nextBracket = round === 'playoffs_round_1' && typeof engineApi.buildSimulationPlayoffBracket === 'function'
      ? engineApi.buildSimulationPlayoffBracket({ east: eastField, west: westField })
      : clone(postseasonState?.bracket || {});
    seedConferenceRoundSeries(seriesById, round, 'east', eastField);
    seedConferenceRoundSeries(seriesById, round, 'west', westField);
    return nextBracket;
  }

  function buildFinalsSeriesFromConferenceWinners(seriesById, winners){
    const finalists = (Array.isArray(winners) ? winners : [])
      .filter(Boolean)
      .sort((a, b) => {
        const seedDiff = Number(a?.seed || 99) - Number(b?.seed || 99);
        if (seedDiff) return seedDiff;
        return String(a?.teamAbbr || '').localeCompare(String(b?.teamAbbr || ''));
      });
    return seriesById.finals || buildSeriesState(
      'finals',
      'finals',
      'finals',
      finalists[0] || null,
      finalists[1] || null,
      4
    );
  }

  function getRoundWinnersForConference(roundSeries, conference){
    return (Array.isArray(roundSeries) ? roundSeries : [])
      .filter((series) => series.conference === conference)
      .map((series) => getSeriesTeam(series, series.winnerTeamAbbr))
      .filter(Boolean)
      .sort((a, b) => Number(a?.seed || 99) - Number(b?.seed || 99));
  }

  function buildCurrentDayPostseasonSchedule(nextState){
    const postseasonState = nextState?.postseasonState || {};
    const phase = String(postseasonState?.phase || '').trim();
    const currentDay = Number(nextState?.seasonState?.currentDay || postseasonState?.currentDay || 1);
    const seriesById = postseasonState?.seriesById || {};
    const persistedCurrentDaySchedule = (Array.isArray(postseasonState?.currentDaySchedule) ? postseasonState.currentDaySchedule : [])
      .filter((game) => Number(game?.day || currentDay) === currentDay)
      .map((game) => clone(game));
    if (phase === 'completed') return [];
    if (persistedCurrentDaySchedule.length) return persistedCurrentDaySchedule;
    if (phase === 'postseason_ready' || phase === 'play_in') {
      const initialPlayInGames = [
        seriesById['east-play-in-7-8'],
        seriesById['east-play-in-9-10'],
        seriesById['west-play-in-7-8'],
        seriesById['west-play-in-9-10']
      ]
        .filter((series) => series && !series.winnerTeamAbbr)
        .map((series) => buildSeriesGame(series, currentDay))
        .filter(Boolean);
      if (initialPlayInGames.length) return initialPlayInGames;
      return [
        seriesById['east-play-in-final'],
        seriesById['west-play-in-final']
      ]
        .filter((series) => series && !series.winnerTeamAbbr)
        .map((series) => buildSeriesGame(series, currentDay))
        .filter(Boolean);
    }
    const currentRound = phase === 'finals'
      ? 'finals'
      : String(postseasonState?.currentRound || phase || '').trim();
    return listRoundSeries(seriesById, currentRound)
      .filter((series) => !series.winnerTeamAbbr)
      .map((series) => buildSeriesGame(series, currentDay))
      .filter(Boolean);
  }

  function finalizePostseasonRound(nextState, postseasonState){
    const resolvedState = clone(postseasonState || {});
    const seriesById = clone(resolvedState.seriesById || {});

    if (resolvedState.phase === 'postseason_ready' || resolvedState.phase === 'play_in') {
      ['east', 'west'].forEach((conference) => {
        const sevenEightId = `${conference}-play-in-7-8`;
        const nineTenId = `${conference}-play-in-9-10`;
        const finalId = `${conference}-play-in-final`;
        const sevenEightSeries = seriesById[sevenEightId];
        const nineTenSeries = seriesById[nineTenId];
        if (
          sevenEightSeries?.winnerTeamAbbr &&
          nineTenSeries?.winnerTeamAbbr &&
          !seriesById[finalId]
        ) {
          const higherSeed = getSeriesLoser(sevenEightSeries);
          const lowerSeed = getSeriesTeam(nineTenSeries, nineTenSeries.winnerTeamAbbr);
          if (higherSeed && lowerSeed) {
            seriesById[finalId] = buildSeriesState(finalId, conference, 'play_in', higherSeed, lowerSeed, 1);
          }
        }
      });

      if (seriesById['east-play-in-final']?.winnerTeamAbbr && seriesById['west-play-in-final']?.winnerTeamAbbr) {
        const eastField = resolvePlayoffFieldForConference(resolvedState, seriesById, 'east');
        const westField = resolvePlayoffFieldForConference(resolvedState, seriesById, 'west');
        const bracket = seedPlayoffRoundFromFields(
          resolvedState,
          seriesById,
          'playoffs_round_1',
          eastField,
          westField
        );
        return {
          ...resolvedState,
          phase: 'playoffs_round_1',
          currentRound: 'playoffs_round_1',
          bracket,
          seriesById
        };
      }

      return {
        ...resolvedState,
        phase: 'play_in',
        currentRound: 'play_in',
        seriesById
      };
    }

    const currentRound = String(resolvedState.currentRound || resolvedState.phase || '').trim();
    if (currentRound === 'finals' && seriesById.finals?.winnerTeamAbbr) {
      const finals = clone(seriesById.finals);
      const summary = typeof engineApi.finalizeSimulationChampion === 'function'
        ? engineApi.finalizeSimulationChampion({ finals })
        : {
          championTeamAbbr: finals.winnerTeamAbbr,
          runnerUpTeamAbbr: getSeriesLoser(finals)?.teamAbbr || null,
          finalsGames: Number(finals.games || 0)
        };
      const winnerWins = String(finals.winnerTeamAbbr || '').trim().toUpperCase() === String(finals.higherSeed?.teamAbbr || '').trim().toUpperCase()
        ? Number(finals.higherSeedWins || 0)
        : Number(finals.lowerSeedWins || 0);
      const loserWins = Math.min(Number(finals.higherSeedWins || 0), Number(finals.lowerSeedWins || 0));
      return {
        ...resolvedState,
        phase: 'completed',
        currentRound: 'completed',
        bracket: {
          ...(resolvedState.bracket || {}),
          finals
        },
        seriesById,
        champion: {
          teamAbbr: summary?.championTeamAbbr || null,
          seriesResult: `${winnerWins}-${loserWins}`
        },
        runnerUp: {
          teamAbbr: summary?.runnerUpTeamAbbr || null
        },
        completedAt: resolvedState.completedAt || new Date().toISOString()
      };
    }

    const currentRoundSeries = listRoundSeries(seriesById, currentRound);
    if (!currentRoundSeries.length || currentRoundSeries.some((series) => !series.winnerTeamAbbr)) {
      return {
        ...resolvedState,
        seriesById
      };
    }

    if (currentRound === 'conference_finals') {
      const finalsSeries = buildFinalsSeriesFromConferenceWinners(seriesById, [
        ...getRoundWinnersForConference(currentRoundSeries, 'east'),
        ...getRoundWinnersForConference(currentRoundSeries, 'west')
      ]);
      seriesById.finals = finalsSeries;
      return {
        ...resolvedState,
        phase: 'finals',
        currentRound: 'finals',
        bracket: {
          ...(resolvedState.bracket || {}),
          finals: {
            higherSeed: clone(finalsSeries.higherSeed || null),
            lowerSeed: clone(finalsSeries.lowerSeed || null)
          }
        },
        seriesById
      };
    }

    const nextRoundByCurrentRound = {
      playoffs_round_1: 'playoffs_round_2',
      playoffs_round_2: 'conference_finals'
    };
    const nextRound = nextRoundByCurrentRound[currentRound] || null;
    if (!nextRound) {
      return {
        ...resolvedState,
        seriesById
      };
    }

    ['east', 'west'].forEach((conference) => {
      seedConferenceRoundSeries(seriesById, nextRound, conference, getRoundWinnersForConference(currentRoundSeries, conference));
    });

    return {
      ...resolvedState,
      phase: nextRound,
      currentRound: nextRound,
      seriesById
    };
  }

  function advancePostseasonStateFromResults(previousState, nextSeasonState, todayGames, dayResult){
    const basePostseasonState = clone(previousState?.postseasonState || {});
    const seriesById = clone(basePostseasonState.seriesById || {});
    (Array.isArray(todayGames) ? todayGames : []).forEach((game, index) => {
      const seriesId = String(game?.seriesId || '').trim();
      const currentSeries = seriesById[seriesId];
      const gameLog = dayResult?.gameLogs?.[index];
      if (!(seriesId && currentSeries && gameLog)) return;
      const nextSeries = {
        ...clone(currentSeries),
        higherSeedWins: Number(currentSeries?.higherSeedWins || 0),
        lowerSeedWins: Number(currentSeries?.lowerSeedWins || 0)
      };
      const winnerTeamAbbr = Number(gameLog?.homeScore || 0) >= Number(gameLog?.awayScore || 0)
        ? game?.homeAbbr
        : game?.awayAbbr;
      if (String(nextSeries?.higherSeed?.teamAbbr || '').trim().toUpperCase() === String(winnerTeamAbbr || '').trim().toUpperCase()) {
        nextSeries.higherSeedWins += 1;
      } else if (String(nextSeries?.lowerSeed?.teamAbbr || '').trim().toUpperCase() === String(winnerTeamAbbr || '').trim().toUpperCase()) {
        nextSeries.lowerSeedWins += 1;
      }
      const winsNeeded = Number(nextSeries.targetWins || 1);
      const totalGamesPlayed = Number(nextSeries.higherSeedWins || 0) + Number(nextSeries.lowerSeedWins || 0);
      if (nextSeries.higherSeedWins >= winsNeeded || nextSeries.lowerSeedWins >= winsNeeded) {
        const advancedSeries = typeof engineApi.advanceSimulationSeries === 'function'
          ? engineApi.advanceSimulationSeries(nextSeries, {
            winner: winnerTeamAbbr,
            games: totalGamesPlayed
          })
          : {
            ...nextSeries,
            winnerTeamAbbr,
            games: totalGamesPlayed
          };
        seriesById[seriesId] = {
          ...nextSeries,
          ...advancedSeries,
          winnerTeamAbbr
        };
      } else {
        seriesById[seriesId] = {
          ...nextSeries,
          games: totalGamesPlayed
        };
      }
    });
    const stagedPostseasonState = {
      ...basePostseasonState,
      phase: basePostseasonState.phase === 'postseason_ready'
        ? 'play_in'
        : basePostseasonState.phase,
      currentRound: basePostseasonState.currentRound || (
        basePostseasonState.phase === 'finals' ? 'finals' : 'play_in'
      ),
      currentDay: Number(nextSeasonState?.currentDay || previousState?.seasonState?.currentDay || 1),
      seriesById
    };
    const finalizedPostseasonState = finalizePostseasonRound({
      ...clone(previousState),
      seasonState: clone(nextSeasonState),
      postseasonState: stagedPostseasonState
    }, stagedPostseasonState);
    const nextState = {
      ...clone(previousState),
      seasonState: clone(nextSeasonState),
      postseasonState: finalizedPostseasonState
    };
    return {
      ...finalizedPostseasonState,
      currentDay: Number(nextSeasonState?.currentDay || finalizedPostseasonState.currentDay || 1),
      currentDaySchedule: buildCurrentDayPostseasonSchedule(nextState)
    };
  }

  function applyPostseasonDayResults(currentSeasonState, dayResult){
    const nextSeasonState = clone(currentSeasonState || {});
    nextSeasonState.completedGameLogs = (nextSeasonState.completedGameLogs || []).concat(dayResult?.gameLogs || []);
    nextSeasonState.currentDay = Number(nextSeasonState.currentDay || 1) + 1;
    nextSeasonState.currentWeek = Math.max(1, Math.ceil(Number(nextSeasonState.currentDay || 1) / 7));
    return nextSeasonState;
  }

  function simulatePostseasonDay(nextState, shell){
    const workingState = clone(nextState || {});
    const postseasonState = clone(workingState?.postseasonState || {});
    if (postseasonState.phase === 'completed') {
      return workingState;
    }
    if (postseasonState.phase === 'postseason_ready') {
      postseasonState.phase = 'play_in';
      postseasonState.currentRound = 'play_in';
    }
    workingState.postseasonState = postseasonState;
    const currentDay = Number(workingState?.seasonState?.currentDay || postseasonState?.currentDay || 1);
    const todayGames = buildCurrentDayPostseasonSchedule(workingState);
    workingState.postseasonState.currentDay = currentDay;
    workingState.postseasonState.currentDaySchedule = clone(todayGames);
    if (!todayGames.length) {
      return workingState;
    }
    const { currentSeasonState, dayResult } = simulateEngineDay(
      workingState,
      shell,
      { [currentDay]: clone(todayGames) },
      currentDay
    );
    const nextSeasonState = applyPostseasonDayResults(currentSeasonState, dayResult);
    const nextPostseasonState = advancePostseasonStateFromResults(workingState, nextSeasonState, todayGames, dayResult);
    return {
      ...clone(workingState),
      currentDay: Number(nextSeasonState.currentDay || currentDay),
      currentWeek: Number(nextSeasonState.currentWeek || currentSeasonState.currentWeek || 1),
      seasonState: {
        ...nextSeasonState,
        scheduleByDay: clone(currentSeasonState.scheduleByDay || {})
      },
      postseasonState: nextPostseasonState
    };
  }

  function ensurePostseasonSnapshot(nextState, totalDays){
    if (!nextState || !totalDays || Number(nextState?.seasonState?.currentDay || 1) <= totalDays) {
      return nextState;
    }
    return {
      ...clone(nextState),
      postseasonState: buildSeededPostseasonState(nextState)
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
        const navItems = clone(BASE_NAV_ITEMS);
        if (shouldExposePlayoffsTab(state)) {
          navItems.push(clone(PLAYOFFS_NAV_ITEM));
        }
        return navItems;
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
      getPlayoffsViewModel(){
        return {
          phase: state?.postseasonState?.phase || 'regular_season',
          currentRound: state?.postseasonState?.currentRound || null,
          currentDay: Number(state?.postseasonState?.currentDay || state?.seasonState?.currentDay || 1),
          playIn: clone(state?.postseasonState?.playIn || null),
          bracket: clone(state?.postseasonState?.bracket || null),
          seriesById: clone(state?.postseasonState?.seriesById || {}),
          currentDaySchedule: clone(state?.postseasonState?.currentDaySchedule || []),
          champion: clone(state?.postseasonState?.champion || null),
          runnerUp: clone(state?.postseasonState?.runnerUp || null),
          completedAt: state?.postseasonState?.completedAt || null
        };
      },
      simulateNextDay(){
        const shell = clone(state?.leagueShell || {});
        const scheduleByDay = getCanonicalScheduleByDay(state, shell);
        const totalDays = getScheduleDayCount(scheduleByDay);
        if (state?.postseasonState?.phase === 'completed') {
          return this.getState();
        }
        if (totalDays > 0 && Number(state?.seasonState?.currentDay || 1) > totalDays) {
          state = simulatePostseasonDay(ensurePostseasonSnapshot(state, totalDays), shell);
          return this.getState();
        }
        const { currentSeasonState, engineSeasonState, dayResult } = simulateEngineDay(
          state,
          shell,
          scheduleByDay,
          Number(state?.seasonState?.currentDay || 1)
        );
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
