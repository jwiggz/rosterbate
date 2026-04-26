(function(root){
  'use strict';

  const MODE_ID = 'nba_mixed_era_single_player_v1';
  const MODE_IDS = Object.freeze({
    nba: 'nba_mixed_era_single_player_v1',
    nfl: 'nfl_mixed_era_single_player_v1'
  });
  const browserEngineApi = root?.RosterBateSimulationEngine || null;
  const runtimeApi = (typeof module !== 'undefined' && module.exports)
    ? require('./simulation-mode-runtime.js')
    : {
      getSimulationStarterSlots(...args){
        return root.RosterBateSimulationModeRuntime.getSimulationStarterSlots(...args);
      },
      validateSimulationLineup(...args){
        return root.RosterBateSimulationModeRuntime.validateSimulationLineup(...args);
      },
      buildSuggestedSimulationLineup(...args){
        return root.RosterBateSimulationModeRuntime.buildSuggestedSimulationLineup(...args);
      },
      setSimulationLineup(...args){
        return root.RosterBateSimulationModeRuntime.setSimulationLineup(...args);
      },
      claimSimulationFreeAgent(...args){
        return root.RosterBateSimulationModeRuntime.claimSimulationFreeAgent(...args);
      },
      applySimulationTrade(...args){
        return root.RosterBateSimulationModeRuntime.applySimulationTrade(...args);
      },
      activateSimulationPowerup(...args){
        return root.RosterBateSimulationModeRuntime.activateSimulationPowerup(...args);
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
  const NFL_LEGACY_LINEUP_SLOT_ORDER = Object.freeze(['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE', 'FLEX', 'K', 'DST']);
  const SHARED_ROSTER_TABS = Object.freeze([
    { id: 'stats', label: 'Stats', active: true },
    { id: 'schedule', label: 'Schedule', active: false }
  ]);

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  function getSimulationSportForState(state){
    const shellSport = String(state?.leagueShell?.sport || '').trim().toLowerCase();
    if (shellSport) return shellSport;
    return String(state?.simulationMode || '').trim().toLowerCase().startsWith('nfl_') ? 'nfl' : 'nba';
  }

  function getModeIdForState(state){
    return MODE_IDS[getSimulationSportForState(state)] || MODE_ID;
  }

  function isSupportedSimulationSeasonState(state){
    return Object.values(MODE_IDS).includes(String(state?.simulationMode || '').trim().toLowerCase());
  }

  function getControlledTeamAbbr(state){
    return String(state?.draftState?.controlledTeamAbbr || '').trim().toUpperCase();
  }

  function normalizeTeamAbbr(teamAbbr){
    return String(teamAbbr || '').trim().toUpperCase();
  }

  function getControlledTeam(state){
    const abbr = getControlledTeamAbbr(state);
    return (state?.leagueShell?.teams || []).find((team) => team.abbr === abbr) || null;
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

  function getControlledRoster(state){
    const team = getControlledTeam(state);
    if (!team) return [];
    return Array.isArray(state?.draftState?.rostersByTeam?.[team.abbr])
      ? clone(dedupeSimulationRosterPlayers(state.draftState.rostersByTeam[team.abbr]))
      : [];
  }

  function getSimulationStarterDisplaySlot(slot){
    return String(slot || '').trim().toUpperCase().replace(/[0-9]+$/,'');
  }

  function getSharedStarterSlotsForState(state, slotKeys){
    const resolvedSlots = Array.isArray(slotKeys) ? slotKeys : [];
    if (getSimulationSportForState(state) !== 'nfl') {
      return clone(resolvedSlots);
    }
    return resolvedSlots.map((slot) => getSimulationStarterDisplaySlot(slot));
  }

  function buildSimulationRosterValidationIssues(starterSlots, legacyStarterSlots, lineupSlots){
    const displaySlots = Array.isArray(starterSlots) ? starterSlots : [];
    const keySlots = Array.isArray(legacyStarterSlots) ? legacyStarterSlots : displaySlots;
    return keySlots.reduce((issues, slotKey, index) => {
      if (lineupSlots?.[slotKey]?.player) return issues;
      issues.push({
        slot: displaySlots[index] || slotKey,
        code: 'missing_player',
        message: `${String(displaySlots[index] || slotKey || 'Starter')} starter is missing.`
      });
      return issues;
    }, []);
  }

  function buildSimulationRosterSummaryCards(state, rosterState){
    return [
      {
        key: 'last-matchup',
        label: 'Last Matchup',
        value: rosterState.lastMatchupLabel
      },
      {
        key: 'current-matchup',
        label: getSimulationSportForState(state) === 'nfl' ? 'Week Outlook' : 'Next Matchup',
        value: rosterState.currentMatchupLabel
      }
    ];
  }

  function buildSimulationRosterActionCards(state, rosterState){
    return [
      {
        key: 'lineup-status',
        title: 'Lineup Status',
        body: rosterState.recommendationSummary || rosterState.readyLabel,
        tone: rosterState.validation?.valid ? 'live' : 'alert'
      },
      {
        key: 'roster-space',
        title: 'Roster Space',
        body: rosterState.rosterSpaceLabel,
        tone: 'info'
      }
    ];
  }

  function buildSimulationRosterOperations(state, rosterState){
    return {
      description: getSimulationSportForState(state) === 'nfl'
        ? 'Route weekly starters and shared roster actions through the local league team surface.'
        : 'Route simulation roster updates through the shared local league team surface.',
      starterSummary: `${Number(rosterState.filledStarters || 0)}/${(rosterState.starterSlots || []).length} starters set`,
      actions: [
        { id: 'set-lineup', label: 'Set Lineup', enabled: true },
        { id: 'waivers', label: 'Waivers', enabled: true },
        { id: 'trades', label: 'Trades', enabled: true }
      ]
    };
  }

  function buildSimulationRosterTabs(){
    return clone(SHARED_ROSTER_TABS);
  }

  function buildSimulationRosterWarningsBySlot(validation){
    return (Array.isArray(validation?.issues) ? validation.issues : []).reduce((warningsBySlot, issue) => {
      const slotKey = String(issue?.slot || '').trim();
      const message = String(issue?.message || '').trim();
      if (!(slotKey && message)) return warningsBySlot;
      if (!Array.isArray(warningsBySlot[slotKey])) {
        warningsBySlot[slotKey] = [];
      }
      warningsBySlot[slotKey].push(message);
      return warningsBySlot;
    }, {});
  }

  function buildSimulationStarterRows(rosterState){
    const slotKeys = Array.isArray(rosterState?.legacyStarterSlots)
      ? rosterState.legacyStarterSlots
      : (Array.isArray(rosterState?.starterSlots) ? rosterState.starterSlots : []);
    const displaySlots = Array.isArray(rosterState?.starterSlots) ? rosterState.starterSlots : slotKeys;
    const warningsBySlot = buildSimulationRosterWarningsBySlot(rosterState?.validation);
    return slotKeys.map((slotKey, index) => {
      const slotEntry = rosterState?.lineupSlots?.[slotKey] || {};
      const player = slotEntry?.player ?? rosterState?.lineup?.[index] ?? null;
      const playerId = slotEntry?.playerId == null || slotEntry?.playerId === ''
        ? (player?.id == null || player?.id === '' ? null : Number(player.id))
        : Number(slotEntry.playerId);
      const suggestedPlayerId = slotEntry?.suggestedPlayerId == null || slotEntry?.suggestedPlayerId === ''
        ? null
        : Number(slotEntry.suggestedPlayerId);
      return {
        id: `starter-${slotKey}-${index}`,
        slot: displaySlots[index] || slotKey,
        slotKey,
        positionSlot: displaySlots[index] || slotKey,
        lineupSlotKey: slotKey,
        player: player ? clone(player) : null,
        playerId: Number.isFinite(playerId) ? playerId : null,
        playerVariantLabel: rosterState?.playerVariantLabelsById?.[Number(playerId)] || null,
        suggestedPlayerId: Number.isFinite(suggestedPlayerId) ? suggestedPlayerId : null,
        recommendationHint: slotEntry?.recommendationHint || null,
        warning: Array.isArray(warningsBySlot[slotKey]) ? warningsBySlot[slotKey][0] || '' : '',
        warnings: clone(warningsBySlot[slotKey] || []),
        actionLabel: 'Move'
      };
    });
  }

  function buildSimulationBenchRows(rosterState){
    return (Array.isArray(rosterState?.bench) ? rosterState.bench : []).map((player, index) => ({
      id: `bench-${Number(player?.id || index)}`,
      slot: 'BENCH',
      slotKey: 'BENCH',
      positionSlot: String(player?.pos || player?.primaryPosition || 'BENCH').trim().toUpperCase() || 'BENCH',
      lineupSlotKey: null,
      player: clone(player),
      playerId: Number.isFinite(Number(player?.id)) ? Number(player.id) : null,
      playerVariantLabel: rosterState?.playerVariantLabelsById?.[Number(player?.id)] || null,
      suggestedPlayerId: null,
      recommendationHint: null,
      warning: '',
      warnings: [],
      actionLabel: 'Promote'
    }));
  }

  function buildSimulationRosterSections(rosterState){
    const sport = String(rosterState?.sport || '').trim().toLowerCase();
    return {
      starters: {
        title: sport === 'nfl' ? 'Weekly Starters' : 'Starters',
        rows: buildSimulationStarterRows(rosterState)
      },
      bench: {
        title: sport === 'nfl' ? 'Bench / Depth' : 'Bench',
        rows: buildSimulationBenchRows(rosterState)
      },
      il: {
        title: sport === 'nfl' ? 'Injured Reserve' : 'IL',
        rows: []
      }
    };
  }

  function buildSimulationWaiverOrderLabel(state, controlledAbbr, fallbackIndex, teamCount){
    const explicitWaiverOrder = Array.isArray(state?.seasonState?.waiverOrder)
      ? Array.from(new Set(state.seasonState.waiverOrder.map((teamAbbr) => String(teamAbbr || '').trim().toUpperCase()).filter(Boolean)))
      : [];
    const shellTeams = Array.isArray(state?.leagueShell?.teams)
      ? state.leagueShell.teams.map((team) => String(team?.abbr || '').trim().toUpperCase()).filter(Boolean)
      : [];
    const standings = sortStandingsRows(state?.seasonState?.standings || []);
    const fallbackWaiverRows = standings.slice().reverse().map((row) => String(row?.teamAbbr || '').trim().toUpperCase()).filter(Boolean);
    const waiverRows = explicitWaiverOrder.length ? explicitWaiverOrder.slice() : fallbackWaiverRows;
    shellTeams.forEach((teamAbbr) => {
      if (teamAbbr && !waiverRows.includes(teamAbbr)) {
        waiverRows.push(teamAbbr);
      }
    });
    const waiverIndex = waiverRows.findIndex((teamAbbr) => (
      teamAbbr === String(controlledAbbr || '').trim().toUpperCase()
    ));
    const resolvedTeamCount = Math.max(1, Number(teamCount || waiverRows.length || 0));
    const displayIndex = waiverIndex >= 0 ? waiverIndex + 1 : Math.max(1, Number(fallbackIndex || 0) + 1);
    return `Waiver Order (${displayIndex} of ${resolvedTeamCount})`;
  }

  function buildSimulationTeamSummary(state, rosterState){
    const team = rosterState?.controlledTeam || getControlledTeam(state);
    const sport = getSimulationSportForState(state);
    const teams = Array.isArray(state?.leagueShell?.teams) ? state.leagueShell.teams : [];
    const controlledAbbr = String(team?.abbr || getControlledTeamAbbr(state) || '').trim().toUpperCase();
    const controlledTeamIndex = teams.findIndex((entry) => String(entry?.abbr || '').trim().toUpperCase() === controlledAbbr);
    const teamCount = Math.max(1, teams.length || 0);
    const anchorSeasonLabel = String(state?.leagueShell?.anchorSeasonLabel || (sport === 'nfl' ? 'NFL' : 'NBA')).trim() || (sport === 'nfl' ? 'NFL' : 'NBA');
    return {
      name: team?.name || team?.displayName || team?.abbr || '',
      abbr: team?.abbr || getControlledTeamAbbr(state) || '',
      leagueLabel: `${anchorSeasonLabel} Simulation`,
      teamCount,
      watchListEnabled: true,
      watchListLabel: 'Watch List',
      watchListDisabledCopy: '',
      waiverOrderEnabled: true,
      waiverOrderLabel: buildSimulationWaiverOrderLabel(state, controlledAbbr, controlledTeamIndex, teamCount),
      waiverOrderCopy: 'Open waivers to review the current claim order and see which bench player would need to be dropped for an add.',
      settingsEnabled: true,
      settingsLabel: 'Team Settings',
      settingsDisabledCopy: ''
    };
  }

  function buildSimulationRosterSpaceLabel(state, roster){
    const rosterCount = Array.isArray(roster) ? roster.length : 0;
    const rosterSize = Number(state?.leagueShell?.rosterSize || 0);
    if (rosterSize > 0) {
      return `${rosterCount}/${rosterSize} filled`;
    }
    return `${rosterCount} players rostered`;
  }

  function getSimulationRosterIdentityKey(player){
    if (!player || typeof player !== 'object') return '';
    const name = String(player?.name || '').trim().toLowerCase();
    const team = String(player?.team || '').trim().toLowerCase();
    const position = String(player?.pos || player?.primaryPosition || '').trim().toUpperCase();
    return [name, team, position].filter(Boolean).join('|');
  }

  function getSimulationPlayerVariantLabel(player){
    const rawLabel = String(
      player?.historicalPackLabel ||
      player?.mixedEraContext?.seasonLabel ||
      player?.historicalSeasonId ||
      player?.historicalPackId ||
      ''
    ).trim();
    if (!rawLabel) return null;
    const leadingSeason = rawLabel.match(/^\d{4}(?:-\d{2,4})?/);
    if (leadingSeason && leadingSeason[0]) {
      return leadingSeason[0];
    }
    return rawLabel.replace(/\bSimulation Archive\b/i, '').trim() || rawLabel;
  }

  function buildSimulationPlayerVariantLabelsById(roster){
    const identityCounts = (Array.isArray(roster) ? roster : []).reduce((counts, player) => {
      const key = getSimulationRosterIdentityKey(player);
      if (!key) return counts;
      counts[key] = Number(counts[key] || 0) + 1;
      return counts;
    }, {});
    return (Array.isArray(roster) ? roster : []).reduce((labels, player) => {
      const playerId = Number(player?.id);
      const key = getSimulationRosterIdentityKey(player);
      if (!Number.isFinite(playerId) || playerId <= 0 || !key || Number(identityCounts[key] || 0) < 2) {
        return labels;
      }
      const variantLabel = getSimulationPlayerVariantLabel(player);
      if (variantLabel) {
        labels[playerId] = variantLabel;
      }
      return labels;
    }, {});
  }

  function buildSimulationLastMatchupLabel(state){
    const teamAbbr = getControlledTeamAbbr(state);
    const completedGames = Array.isArray(state?.seasonState?.completedGameLogs) ? state.seasonState.completedGameLogs : [];
    for (let index = completedGames.length - 1; index >= 0; index -= 1) {
      const game = completedGames[index];
      const homeAbbr = String(game?.homeAbbr || '').trim().toUpperCase();
      const awayAbbr = String(game?.awayAbbr || '').trim().toUpperCase();
      if (homeAbbr !== teamAbbr && awayAbbr !== teamAbbr) continue;
      const isHome = homeAbbr === teamAbbr;
      const teamScore = Number(isHome ? game?.homeScore : game?.awayScore);
      const opponentScore = Number(isHome ? game?.awayScore : game?.homeScore);
      const opponentName = isHome
        ? game?.awayName || game?.awayAbbr || 'Opponent'
        : game?.homeName || game?.homeAbbr || 'Opponent';
      const prefix = Number.isFinite(teamScore) && Number.isFinite(opponentScore)
        ? `${teamScore}-${opponentScore}`
        : 'Final';
      return `${prefix} vs ${opponentName}`;
    }
    return 'No completed matchup yet';
  }

  function buildSimulationCurrentMatchupLabel(state){
    const scheduleByDay = getCanonicalScheduleByDay(state, state?.leagueShell || {});
    const nextGame = buildSimulationNextGame(state, scheduleByDay);
    if (!nextGame) {
      return 'No upcoming matchup';
    }
    const sport = getSimulationSportForState(state);
    const cycleLabel = sport === 'nfl'
      ? `Week ${Number(nextGame?.day || state?.seasonState?.currentWeek || 1)}`
      : `Day ${Number(nextGame?.day || state?.seasonState?.currentDay || 1)}`;
    return `${cycleLabel} ${nextGame.home ? 'vs' : '@'} ${nextGame.opponentName || nextGame.opponentAbbr || 'Opponent'}`;
  }

  function normalizeSimulationRecentResult(state, game){
    const nextGame = game && typeof game === 'object' ? game : {};
    const teams = Array.isArray(state?.leagueShell?.teams) ? state.leagueShell.teams : [];
    const homeIdx = Number(nextGame?.home);
    const awayIdx = Number(nextGame?.away);
    const homeTeam = Number.isFinite(homeIdx) ? teams[homeIdx] || null : null;
    const awayTeam = Number.isFinite(awayIdx) ? teams[awayIdx] || null : null;
    return {
      ...clone(nextGame),
      homeAbbr: String(nextGame?.homeAbbr || homeTeam?.abbr || '').trim().toUpperCase(),
      awayAbbr: String(nextGame?.awayAbbr || awayTeam?.abbr || '').trim().toUpperCase(),
      homeName: nextGame?.homeName || homeTeam?.name || homeTeam?.displayName || (Number.isFinite(homeIdx) ? `Team ${homeIdx + 1}` : 'Home Team'),
      awayName: nextGame?.awayName || awayTeam?.name || awayTeam?.displayName || (Number.isFinite(awayIdx) ? `Team ${awayIdx + 1}` : 'Away Team')
    };
  }

  function buildSimulationTeamLineupSnapshot(state, teamAbbr){
    const normalizedTeamAbbr = String(teamAbbr || '').trim().toUpperCase();
    if (!normalizedTeamAbbr) {
      return {
        starterSlots: [],
        lineupSlots: {},
        roster: [],
        lineup: [],
        bench: [],
        validation: { valid: true, issues: [] }
      };
    }
    const sport = getSimulationSportForState(state);
    const legacyStarterSlots = getSimulationStarterSlotsForState(state);
    const starterSlots = getSharedStarterSlotsForState(state, legacyStarterSlots);
    const roster = Array.isArray(state?.draftState?.rostersByTeam?.[normalizedTeamAbbr])
      ? clone(state.draftState.rostersByTeam[normalizedTeamAbbr])
      : [];
    const rosterById = new Map(roster.map((player) => [Number(player?.id), player]));

    if (sport === 'nfl') {
      const normalizedState = normalizeLegacyNflLineupSlots(state);
      const explicitSlots = normalizedState?.seasonState?.lineupSlotsByTeam?.[normalizedTeamAbbr];
      const lineupIds = Array.isArray(normalizedState?.seasonState?.lineupIdsByTeam?.[normalizedTeamAbbr])
        ? normalizedState.seasonState.lineupIdsByTeam[normalizedTeamAbbr]
        : [];
      const fallbackSlots = legacyStarterSlots.reduce((slots, slot, index) => {
        slots[slot] = lineupIds[index] == null || lineupIds[index] === ''
          ? null
          : Number(lineupIds[index]);
        return slots;
      }, {});
      const lineupSlotIds = explicitSlots && typeof explicitSlots === 'object' && !Array.isArray(explicitSlots)
        ? explicitSlots
        : fallbackSlots;
      const lineupSlots = {};
      const assignedIds = new Set();
      legacyStarterSlots.forEach((slot) => {
        const rawPlayerId = lineupSlotIds?.[slot];
        const playerId = rawPlayerId == null || rawPlayerId === '' ? null : Number(rawPlayerId);
        if (Number.isFinite(playerId) && playerId > 0) {
          assignedIds.add(playerId);
        }
        lineupSlots[slot] = {
          slot,
          playerId,
          player: playerId == null ? null : clone(rosterById.get(playerId) || null)
        };
      });
      return {
        starterSlots: clone(starterSlots),
        legacyStarterSlots: clone(legacyStarterSlots),
        lineupSlots,
        roster,
        lineup: legacyStarterSlots.map((slot) => {
          const player = lineupSlots[slot]?.player;
          return player ? clone(player) : null;
        }),
        bench: roster.filter((player) => !assignedIds.has(Number(player?.id))).map((player) => clone(player)),
        validation: normalizedTeamAbbr === getControlledTeamAbbr(state) && typeof runtimeApi.validateSimulationLineup === 'function'
          ? runtimeApi.validateSimulationLineup(clone(normalizedState), normalizedTeamAbbr)
          : { valid: true, issues: [] }
      };
    }

    const lineupIdList = Array.isArray(state?.seasonState?.lineupIdsByTeam?.[normalizedTeamAbbr])
      ? state.seasonState.lineupIdsByTeam[normalizedTeamAbbr]
      : [];
    const lineupSlots = {};
    const assignedIds = new Set();
    legacyStarterSlots.forEach((slot, index) => {
      const rawPlayerId = lineupIdList[index];
      const playerId = rawPlayerId == null || rawPlayerId === '' ? null : Number(rawPlayerId);
      if (Number.isFinite(playerId) && playerId > 0) {
        assignedIds.add(playerId);
      }
      lineupSlots[slot] = {
        slot,
        playerId,
        player: playerId == null ? null : clone(rosterById.get(playerId) || null)
      };
    });
    return {
      starterSlots: clone(starterSlots),
      legacyStarterSlots: clone(legacyStarterSlots),
      lineupSlots,
      roster,
      lineup: legacyStarterSlots.map((slot) => {
        const player = lineupSlots[slot]?.player;
        return player ? clone(player) : null;
      }),
      bench: roster.filter((player) => !assignedIds.has(Number(player?.id))).map((player) => clone(player)),
      validation: { valid: true, issues: [] }
    };
  }

  function buildSimulationMatchupContext(state, scheduleByDay, nextGame, recentResults){
    const controlledTeam = getControlledTeam(state);
    const controlledTeamAbbr = getControlledTeamAbbr(state);
    const teamLookup = new Map(
      clone(state?.leagueShell?.teams || []).map((team) => [String(team?.abbr || '').trim().toUpperCase(), team])
    );
    const opponentAbbr = String(nextGame?.opponentAbbr || '').trim().toUpperCase();
    const opponentTeam = teamLookup.get(opponentAbbr) || null;
    const controlledRow = clone((state?.seasonState?.standings || []).find((row) => (
      String(row?.teamAbbr || '').trim().toUpperCase() === controlledTeamAbbr
    )) || null);
    const opponentRow = clone((state?.seasonState?.standings || []).find((row) => (
      String(row?.teamAbbr || '').trim().toUpperCase() === opponentAbbr
    )) || null);
    return {
      sport: getSimulationSportForState(state),
      cycleLabel: formatSimulationCycleLabel(state),
      controlledTeam: controlledTeam ? clone(controlledTeam) : null,
      controlledTeamAbbr,
      opponentTeam: opponentTeam ? clone(opponentTeam) : null,
      opponentAbbr,
      nextGame: nextGame ? clone(nextGame) : null,
      recentResults: clone(recentResults || []),
      previousMatchup: recentResults.length ? clone(recentResults[0]) : null,
      scheduleByDay: clone(scheduleByDay || {}),
      controlledRow,
      opponentRow,
      mineRosterState: buildSimulationTeamLineupSnapshot(state, controlledTeamAbbr),
      opponentRosterState: buildSimulationTeamLineupSnapshot(state, opponentAbbr)
    };
  }

  function buildSimulationMatchupHero(state, matchupContext){
    const sport = getSimulationSportForState(state);
    const controlledTeam = matchupContext?.controlledTeam || null;
    const opponentTeam = matchupContext?.opponentTeam || null;
    const nextGame = matchupContext?.nextGame || null;
    const subtitle = nextGame
      ? `${nextGame.home ? 'vs' : '@'} ${opponentTeam?.name || nextGame.opponentName || nextGame.opponentAbbr || 'Opponent'}`
      : 'No upcoming matchup';
    return {
      title: 'Current Matchup',
      subtitle,
      cycleLabel: matchupContext?.cycleLabel || formatSimulationCycleLabel(state),
      sport,
      controlledTeamAbbr: controlledTeam?.abbr || matchupContext?.controlledTeamAbbr || '',
      controlledTeamName: controlledTeam?.name || controlledTeam?.displayName || controlledTeam?.abbr || 'My Team',
      opponentAbbr: opponentTeam?.abbr || matchupContext?.opponentAbbr || '',
      opponentName: opponentTeam?.name || opponentTeam?.displayName || nextGame?.opponentName || nextGame?.opponentAbbr || 'Opponent'
    };
  }

  function buildSimulationMatchupNavigation(state, matchupContext){
    const sport = getSimulationSportForState(state);
    if (sport === 'nfl') {
      return {
        mode: 'week',
        selectedLabel: matchupContext?.cycleLabel || formatSimulationCycleLabel(state),
        items: [{
          id: `week-${Number(state?.seasonState?.currentWeek || state?.seasonState?.currentDay || 1)}`,
          label: matchupContext?.cycleLabel || formatSimulationCycleLabel(state),
          active: true,
          cycleValue: Number(state?.seasonState?.currentWeek || state?.seasonState?.currentDay || 1)
        }]
      };
    }
    const currentDay = Number(state?.seasonState?.currentDay || 1);
    const availableDays = Object.keys(matchupContext?.scheduleByDay || {})
      .map((day) => Number(day))
      .filter((day) => Number.isFinite(day))
      .sort((a, b) => a - b);
    const dayPool = Array.from(new Set([currentDay - 1, currentDay, currentDay + 1].filter((day) => day >= 1).concat(availableDays.slice(0, 5))));
    const items = dayPool
      .sort((a, b) => a - b)
      .slice(0, 5)
      .map((day) => ({
        id: `day-${day}`,
        label: `Day ${day}`,
        active: day === currentDay,
        cycleValue: day
      }));
    return {
      mode: 'day',
      selectedLabel: `Day ${currentDay}`,
      items
    };
  }

  function buildSimulationMatchupActionCards(state, matchupContext){
    const sport = getSimulationSportForState(state);
    return [
      {
        id: 'open-my-team',
        label: 'Open My Team',
        targetPage: 'roster',
        enabled: true,
        body: sport === 'nfl'
          ? 'Check weekly starters and depth before the next sim.'
          : 'Check starters and bench before the next sim.'
      },
      {
        id: 'open-waivers',
        label: 'Open Waivers',
        targetPage: 'waiver',
        enabled: true,
        body: 'Review the claim pool if this matchup needs a roster move.'
      },
      {
        id: 'review-schedule',
        label: 'Review Schedule',
        targetPage: 'matchup',
        enabled: true,
        body: matchupContext?.nextGame
          ? `Scout ${matchupContext.nextGame.opponentName || matchupContext.nextGame.opponentAbbr || 'the upcoming opponent'}.`
          : 'Review recent matchup history and the next slate.'
      }
    ];
  }

  function buildSimulationMatchupTeamPanels(state, matchupContext){
    const buildPanel = (team, row, rosterState, isMine) => ({
      side: isMine ? 'mine' : 'opponent',
      teamAbbr: String(team?.abbr || row?.teamAbbr || '').trim().toUpperCase(),
      teamName: team?.name || team?.displayName || row?.teamAbbr || (isMine ? 'My Team' : 'Opponent'),
      recordLabel: row ? buildSimulationRecordLabel(row) : '0-0',
      streak: row?.streak || 'EVEN',
      rosterCount: Array.isArray(rosterState?.roster) ? rosterState.roster.length : 0,
      readyLabel: isMine
        ? String(buildSimulationRosterViewModel(state)?.readyLabel || '').trim()
        : ((Array.isArray(rosterState?.bench) ? rosterState.bench.length : 0) ? 'Depth Ready' : 'Starters Set')
    });
    return {
      mine: buildPanel(matchupContext?.controlledTeam, matchupContext?.controlledRow, matchupContext?.mineRosterState, true),
      opponent: buildPanel(matchupContext?.opponentTeam, matchupContext?.opponentRow, matchupContext?.opponentRosterState, false)
    };
  }

  function buildSimulationMatchupLineupSections(state, matchupContext){
    const sport = getSimulationSportForState(state);
    const buildRows = (slots, lineupSlots) => (Array.isArray(slots) ? slots : []).map((slot) => ({
      slot,
      player: lineupSlots?.[slot]?.player ? clone(lineupSlots[slot].player) : null
    }));
    const buildSections = (rosterState) => ([
      {
        title: sport === 'nfl' ? 'Weekly Starters' : 'Starters',
        rows: buildRows(rosterState?.legacyStarterSlots || rosterState?.starterSlots, rosterState?.lineupSlots)
      },
      {
        title: sport === 'nfl' ? 'Bench / Depth' : 'Bench',
        rows: clone(rosterState?.bench || []).map((player) => ({
          slot: 'BENCH',
          player: clone(player)
        }))
      }
    ]);
    return {
      mine: buildSections(matchupContext?.mineRosterState),
      opponent: buildSections(matchupContext?.opponentRosterState)
    };
  }

  function buildSimulationNbaRosterState(state){
    const controlledTeam = getControlledTeam(state);
    const teamAbbr = getControlledTeamAbbr(state);
    const legacyStarterSlots = getSimulationStarterSlotsForState(state);
    const starterSlots = getSharedStarterSlotsForState(state, legacyStarterSlots);
    const roster = getControlledRoster(state);
    const playerVariantLabelsById = buildSimulationPlayerVariantLabelsById(roster);
    const rosterById = new Map(roster.map((player) => [Number(player?.id), player]));
    const validation = (typeof runtimeApi.validateSimulationLineup === 'function')
      ? runtimeApi.validateSimulationLineup(clone(state), teamAbbr)
      : { valid: true, issues: [] };
    const suggestedLineup = (typeof runtimeApi.buildSuggestedSimulationLineup === 'function')
      ? runtimeApi.buildSuggestedSimulationLineup(clone(state), teamAbbr) || []
      : [];
    const lineupIdList = Array.isArray(state?.seasonState?.lineupIdsByTeam?.[teamAbbr])
      ? state.seasonState.lineupIdsByTeam[teamAbbr]
      : [];
    const lineupSlots = Object.fromEntries(legacyStarterSlots.map((slot, index) => {
      const rawPlayerId = lineupIdList[index];
      const playerId = rawPlayerId == null || rawPlayerId === '' ? null : Number(rawPlayerId);
      const player = Number.isFinite(playerId) ? rosterById.get(playerId) || null : null;
      return [slot, {
        slot,
        playerId: Number.isFinite(playerId) ? playerId : null,
        player: player ? clone(player) : null,
        suggestedPlayerId: suggestedLineup[index] == null || suggestedLineup[index] === ''
          ? null
          : Number(suggestedLineup[index]),
        recommendationHint: null
      }];
    }));
    const lineup = lineupIdList.map((playerId) => {
      const normalizedPlayerId = playerId == null || playerId === '' ? null : Number(playerId);
      const player = Number.isFinite(normalizedPlayerId) ? rosterById.get(normalizedPlayerId) || null : null;
      return player ? clone(player) : null;
    });
    const assignedIds = new Set(lineup
      .map((player) => Number(player?.id))
      .filter((playerId) => Number.isFinite(playerId) && playerId > 0));
    const bench = roster
      .filter((player) => !assignedIds.has(Number(player?.id)))
      .map((player) => clone(player));
    const filledStarters = legacyStarterSlots.reduce((count, slot) => count + (lineupSlots[slot]?.player ? 1 : 0), 0);
    return {
      sport: 'nba',
      controlledTeam: controlledTeam ? clone(controlledTeam) : null,
      starterSlots: clone(starterSlots),
      legacyStarterSlots: clone(legacyStarterSlots),
      lineupSlots,
      validation,
      readyLabel: validation.valid ? 'Ready For Tipoff' : `${validation.issues.length} lineup issues to fix`,
      recommendationSummary: validation.valid
        ? 'Starting lineup is ready.'
        : 'Suggested fixes are available below.',
      roster,
      playerVariantLabelsById,
      lineup,
      bench,
      filledStarters,
      rosterSpaceLabel: buildSimulationRosterSpaceLabel(state, roster),
      lastMatchupLabel: buildSimulationLastMatchupLabel(state),
      currentMatchupLabel: buildSimulationCurrentMatchupLabel(state)
    };
  }

  function buildSimulationRosterViewModel(state){
    const sport = getSimulationSportForState(state);
    const rosterState = sport === 'nfl'
      ? getControlledRosterSlots(state)
      : buildSimulationNbaRosterState(state);
    return {
      layoutMode: 'local-league-parity',
      statSourceLabel: 'Simulated',
      sport,
      starterSlots: clone(rosterState?.starterSlots || []),
      legacyStarterSlots: clone(rosterState?.legacyStarterSlots || rosterState?.starterSlots || []),
      summaryCards: buildSimulationRosterSummaryCards(state, rosterState),
      actionCards: buildSimulationRosterActionCards(state, rosterState),
      operations: buildSimulationRosterOperations(state, rosterState),
      tabs: buildSimulationRosterTabs(),
      sections: buildSimulationRosterSections(rosterState),
      teamSummary: buildSimulationTeamSummary(state, rosterState),
      lineupSlots: clone(rosterState?.lineupSlots || {}),
      validation: clone(rosterState?.validation || { valid: true, issues: [] }),
      readyLabel: String(rosterState?.readyLabel || '').trim(),
      recommendationSummary: String(rosterState?.recommendationSummary || '').trim(),
      roster: clone(rosterState?.roster || []),
      lineup: clone(rosterState?.lineup || []),
      bench: clone(rosterState?.bench || [])
    };
  }

  function normalizeLegacyNflLineupSlots(state){
    if (getSimulationSportForState(state) !== 'nfl') {
      return state;
    }
    const seasonState = state?.seasonState || {};
    const lineupSlotsByTeam = seasonState.lineupSlotsByTeam || {};
    const lineupIdsByTeam = seasonState.lineupIdsByTeam || {};
    let needsNormalization = false;
    const normalizedSlotsByTeam = clone(lineupSlotsByTeam);

    Object.keys(lineupIdsByTeam).forEach((teamAbbr) => {
      const key = String(teamAbbr || '').trim().toUpperCase();
      const existingSlots = normalizedSlotsByTeam[key];
      const hasSlotMap = existingSlots && typeof existingSlots === 'object' && !Array.isArray(existingSlots);
      const lineupIds = lineupIdsByTeam[key];
      if (hasSlotMap || !Array.isArray(lineupIds) || !lineupIds.length) {
        return;
      }
      normalizedSlotsByTeam[key] = NFL_LEGACY_LINEUP_SLOT_ORDER.reduce((slots, slot, index) => {
        slots[slot] = lineupIds[index] == null || lineupIds[index] === ''
          ? null
          : Number(lineupIds[index]);
        return slots;
      }, {});
      needsNormalization = true;
    });

    if (!needsNormalization) {
      return state;
    }

    return {
      ...clone(state),
      seasonState: {
        ...clone(seasonState),
        lineupSlotsByTeam: normalizedSlotsByTeam
      }
    };
  }

  function getControlledRosterSlots(state){
    const normalizedState = normalizeLegacyNflLineupSlots(state);
    const teamAbbr = getControlledTeamAbbr(normalizedState);
    const legacyStarterSlots = getSimulationStarterSlotsForState(state);
    const starterSlots = getSharedStarterSlotsForState(state, legacyStarterSlots);
    const roster = getControlledRoster(normalizedState);
    const playerVariantLabelsById = buildSimulationPlayerVariantLabelsById(roster);
    const controlledTeam = getControlledTeam(normalizedState);
    const rosterById = new Map(roster.map((player) => [Number(player?.id), player]));
    const explicitSlots = normalizedState?.seasonState?.lineupSlotsByTeam?.[teamAbbr];
    const lineupIds = Array.isArray(normalizedState?.seasonState?.lineupIdsByTeam?.[teamAbbr])
      ? normalizedState.seasonState.lineupIdsByTeam[teamAbbr]
      : [];
    const validation = (typeof runtimeApi.validateSimulationLineup === 'function')
      ? runtimeApi.validateSimulationLineup(clone(normalizedState), teamAbbr)
      : { valid: true, issues: [] };
    const suggestedLineup = (typeof runtimeApi.buildSuggestedSimulationLineup === 'function')
      ? runtimeApi.buildSuggestedSimulationLineup(clone(normalizedState), teamAbbr) || {}
      : {};
    const fallbackSlots = legacyStarterSlots.reduce((slots, slot, index) => {
      slots[slot] = lineupIds[index] == null || lineupIds[index] === ''
        ? null
        : Number(lineupIds[index]);
      return slots;
    }, {});
    const lineupSlotIds = explicitSlots && typeof explicitSlots === 'object' && !Array.isArray(explicitSlots)
      ? explicitSlots
      : fallbackSlots;
    const assignedIds = new Set();

    const lineupSlots = Object.fromEntries(legacyStarterSlots.map((slot) => {
      const playerId = lineupSlotIds?.[slot];
      const normalizedPlayerId = playerId == null || playerId === ''
        ? null
        : Number(playerId);
      if (Number.isFinite(normalizedPlayerId) && normalizedPlayerId > 0) {
        assignedIds.add(normalizedPlayerId);
      }
      return [slot, {
        slot,
        playerId: normalizedPlayerId,
        player: normalizedPlayerId == null ? null : clone(rosterById.get(normalizedPlayerId) || null),
        suggestedPlayerId: suggestedLineup?.[slot] == null || suggestedLineup?.[slot] === ''
          ? null
          : Number(suggestedLineup[slot])
      }];
    }));

    return {
      sport: getSimulationSportForState(state),
      controlledTeam: controlledTeam ? clone(controlledTeam) : null,
      starterSlots,
      legacyStarterSlots: clone(legacyStarterSlots),
      lineupSlots,
      validation,
      readyLabel: validation.valid ? 'Ready For Week' : `${validation.issues.length} lineup issues to fix`,
      recommendationSummary: validation.valid ? 'Starting lineup is legal.' : 'Suggested fixes are available below.',
      roster,
      filledStarters: legacyStarterSlots.reduce((count, slot) => count + (lineupSlots[slot]?.player ? 1 : 0), 0),
      rosterSpaceLabel: buildSimulationRosterSpaceLabel(normalizedState, roster),
      lastMatchupLabel: buildSimulationLastMatchupLabel(normalizedState),
      currentMatchupLabel: buildSimulationCurrentMatchupLabel(normalizedState),
      playerVariantLabelsById,
      bench: roster.filter((player) => !assignedIds.has(Number(player?.id))).map((player) => clone(player)),
      lineup: legacyStarterSlots
        .map((slot) => lineupSlots[slot]?.player)
        .map((player) => (player ? clone(player) : null))
    };
  }

  function formatSimulationCycleLabel(state){
    if (getSimulationSportForState(state) === 'nfl') {
      const postseasonPhase = String(state?.postseasonState?.phase || 'regular_season').trim().toLowerCase();
      const postseasonLabels = {
        postseason_ready: 'Playoff Picture',
        wild_card: 'Wild Card Weekend',
        divisional: 'Divisional Round',
        conference_championship: 'Conference Championships',
        super_bowl: 'Super Bowl XLIX',
        completed: 'Season Complete'
      };
      if (postseasonPhase && postseasonPhase !== 'regular_season') {
        return postseasonLabels[postseasonPhase] || 'NFL Postseason';
      }
      return `Week ${Number(state?.seasonState?.currentWeek || state?.seasonState?.currentDay || 1)}`;
    }
    return `Day ${Number(state?.seasonState?.currentDay || 1)} - Week ${Number(state?.seasonState?.currentWeek || 1)}`;
  }

  function getSimulationPrimaryAction(state){
    const sport = getSimulationSportForState(state);
    const postseasonPhase = String(state?.postseasonState?.phase || 'regular_season').trim().toLowerCase();
    if (sport !== 'nfl') {
      const currentDay = Number(state?.seasonState?.currentDay || 1);
      return {
        id: 'sim-day',
        label: `Reveal Day ${currentDay} Results`,
        shortLabel: 'Reveal Day',
        cadenceLabel: `Day ${currentDay}`,
        shellTone: 'reveal'
      };
    }
    const normalizedState = normalizeLegacyNflLineupSlots(state);
    const validation = (typeof runtimeApi.validateSimulationLineup === 'function')
      ? runtimeApi.validateSimulationLineup(clone(normalizedState), getControlledTeamAbbr(normalizedState))
      : { valid: true, issues: [] };
    if (!validation.valid) {
      return {
        id: 'fix-lineup',
        label: 'Fix Lineup',
        shortLabel: 'Fix Lineup',
        cadenceLabel: `Week ${Number(state?.seasonState?.currentWeek || state?.seasonState?.currentDay || 1)}`,
        shellTone: 'fix-lineup'
      };
    }
    if (postseasonPhase === 'completed') {
      return {
        id: 'season-complete',
        label: 'Season Complete',
        shortLabel: 'Season Complete',
        cadenceLabel: formatSimulationCycleLabel(state),
        shellTone: 'complete'
      };
    }
    if (postseasonPhase === 'postseason_ready') {
      return {
        id: 'review-playoffs',
        label: 'Review Playoffs',
        shortLabel: 'Review Playoffs',
        cadenceLabel: formatSimulationCycleLabel(state),
        shellTone: 'postseason'
      };
    }
    return {
      id: 'sim-day',
      label: `Sim Week ${Number(state?.seasonState?.currentWeek || state?.seasonState?.currentDay || 1)}`,
      shortLabel: 'Sim Week',
      cadenceLabel: `Week ${Number(state?.seasonState?.currentWeek || state?.seasonState?.currentDay || 1)}`,
      shellTone: 'sim-week'
    };
  }

  function getSimulationStarterSlotsForState(state){
    if (typeof runtimeApi.getSimulationStarterSlots === 'function') {
      return clone(runtimeApi.getSimulationStarterSlots(state?.leagueShell || {}));
    }
    return getSimulationSportForState(state) === 'nfl'
      ? ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'DST', 'K']
      : ['PG', 'SG', 'SF', 'PF', 'C'];
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

  function buildNflStandingsSections(rows){
    const groupedRows = {};
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const conference = String(row?.conference || '').trim().toUpperCase() || 'NFL';
      const division = String(row?.division || '').trim();
      const title = division ? `${conference} ${division}` : conference;
      if (!groupedRows[title]) {
        groupedRows[title] = [];
      }
      groupedRows[title].push(clone(row));
    });
    return Object.keys(groupedRows)
      .sort((a, b) => a.localeCompare(b))
      .map((title) => ({
        title,
        rows: sortStandingsRows(groupedRows[title])
      }));
  }

  function buildSimulationHubSummaryCards(state, team, userRow){
    const sport = getSimulationSportForState(state);
    const sourceSeasonLabels = clone(state?.sourceSeasons?.sourceSeasonLabels || []);
    return [
      {
        key: 'record',
        label: 'Record',
        value: buildSimulationRecordLabel(userRow)
      },
      {
        key: 'cycle',
        label: sport === 'nfl' ? 'Current Week' : 'Current Cycle',
        value: formatSimulationCycleLabel(state)
      },
      {
        key: 'team',
        label: 'Team',
        value: team?.abbr || getControlledTeamAbbr(state) || '--'
      },
      {
        key: 'source-seasons',
        label: 'Source Seasons',
        value: sourceSeasonLabels.length ? sourceSeasonLabels.join(' + ') : 'Simulation Pool'
      }
    ];
  }

  function buildSimulationHubPowerupCards(state){
    const sport = getSimulationSportForState(state);
    const currentWeek = Math.max(1, Number(state?.seasonState?.currentWeek || 1));
    const activePowerups = state?.seasonState?.powerupsByWeek?.[currentWeek] || {};
    const rosterSlots = getControlledRosterSlots(state);
    const starterOptions = (Array.isArray(rosterSlots?.starterSlots) ? rosterSlots.starterSlots : [])
      .map((slotKey) => {
        const slotEntry = rosterSlots?.lineupSlots?.[slotKey];
        const player = slotEntry?.player || null;
        if (!player || !Number.isFinite(Number(player?.id))) {
          return null;
        }
        return {
          value: Number(player.id),
          label: `${player.name || 'Starter'}${player.pos ? ` · ${player.pos}` : ''}${slotKey ? ` · ${slotKey}` : ''}`
        };
      })
      .filter(Boolean);
    const cardTitle = sport === 'nfl' ? 'Weekly Powerups' : 'Weekly Powerups';
    const captainModeState = (
      activePowerups &&
      typeof activePowerups === 'object' &&
      !Array.isArray(activePowerups)
    ) ? activePowerups.captain_mode || null : null;
    const selectedTargetId = captainModeState?.targetId == null || captainModeState?.targetId === ''
      ? (starterOptions[0]?.value ?? null)
      : Number(captainModeState.targetId);
    return [
      {
        key: 'captain-mode',
        powerupId: 'captain_mode',
        title: cardTitle,
        label: 'Captain Mode',
        body: sport === 'nfl'
          ? 'Double one locked-in weekly starter once you pick your impact player.'
          : 'Double one locked-in starter once you pick the featured player.',
        status: captainModeState?.active
          ? 'Active'
          : (starterOptions.length ? 'Ready to activate' : 'Set lineup first'),
        active: Boolean(captainModeState?.active),
        supported: true,
        requiresTarget: true,
        disabled: !starterOptions.length,
        disabledReason: starterOptions.length
          ? ''
          : (sport === 'nfl'
            ? 'Set a valid weekly lineup before choosing your captain.'
            : 'Set a valid lineup before choosing your captain.'),
        actionLabel: captainModeState?.active ? 'Update Captain' : 'Activate Captain',
        targetLabel: sport === 'nfl' ? 'Impact Starter' : 'Featured Starter',
        targetId: selectedTargetId,
        targetOptions: starterOptions
      },
      {
        key: 'white-gloves',
        powerupId: 'white_gloves',
        title: cardTitle,
        label: 'White Gloves',
        body: 'Protect the floor by copying your lowest active starter score onto injured slots once simulation-side injury resolution catches up.',
        status: 'Visible for parity',
        active: false,
        supported: false,
        disabled: true,
        disabledReason: 'White Gloves is shown here for parity, but simulation injury-copy logic is not wired through the shared shell yet.',
        actionLabel: 'Coming Soon'
      },
      {
        key: 'bench-boost',
        powerupId: 'bench_boost',
        title: cardTitle,
        label: 'Bench Boost',
        body: 'Push bench contributions into the weekly result once simulation-side reserve scoring is fully hooked into the shared shell.',
        status: 'Visible for parity',
        active: false,
        supported: false,
        disabled: true,
        disabledReason: 'Bench Boost is shown here for parity, but simulation bench-powerup scoring is not wired through the shared shell yet.',
        actionLabel: 'Coming Soon'
      },
      {
        key: 'sunday-surge',
        powerupId: 'sunday_surge',
        title: cardTitle,
        label: 'Sunday Surge',
        body: 'Amplify end-of-week starter output once simulation cadence-specific boost timing is available in the shared shell.',
        status: 'Visible for parity',
        active: false,
        supported: false,
        disabled: true,
        disabledReason: 'Sunday Surge is shown here for parity, but simulation timing-based scoring boosts are not wired through the shared shell yet.',
        actionLabel: 'Coming Soon'
      }
    ];
  }

  function buildSimulationScheduleDetailCards(state, nextGame, recentResults){
    const sport = getSimulationSportForState(state);
    return [
      {
        key: 'cycle',
        label: sport === 'nfl' ? 'Week Status' : 'Season Cycle',
        value: formatSimulationCycleLabel(state)
      },
      {
        key: 'next-game',
        label: sport === 'nfl' ? 'Current Matchup' : 'Current Matchup',
        value: nextGame
          ? `${nextGame.home ? 'vs' : '@'} ${nextGame.opponentName || nextGame.opponentAbbr || 'Opponent'}`
          : 'No upcoming matchup'
      },
      {
        key: 'recent-results',
        label: 'Recent Results',
        value: Array.isArray(recentResults) && recentResults.length ? `${recentResults.length} logged` : 'No results yet'
      }
    ];
  }

  function buildSimulationWaiverRows(state){
    const roster = getControlledRoster(state);
    const rosterLimit = Number(state?.draftState?.rosterSize || state?.leagueShell?.rosterSize || roster.length || 0);
    const dropRequired = rosterLimit > 0 && roster.length >= rosterLimit;
    const suggestedDropPlayer = dropRequired
      ? roster.slice().sort((left, right) => Number(left?.fp || 0) - Number(right?.fp || 0))[0] || null
      : null;
    const dropOptions = roster.map((player) => ({
      value: Number(player?.id),
      label: `${player?.name || 'Player'} · ${player?.team || ''} · ${player?.pos || player?.primaryPosition || ''}`.trim()
    }));
    return clone(state?.draftState?.freeAgents || []).slice(0, 40).map((player, index) => ({
      id: `waiver-player-${Number(player?.id || index)}`,
      player: clone(player),
      playerId: Number.isFinite(Number(player?.id)) ? Number(player.id) : null,
      teamAbbr: player?.team || '',
      position: String(player?.pos || player?.primaryPosition || '').trim().toUpperCase(),
      actionLabel: 'Submit Claim',
      submitLabel: 'Submit Claim',
      dropNeeded: dropRequired,
      suggestedDropPlayerId: suggestedDropPlayer ? Number(suggestedDropPlayer.id) : null,
      suggestedDropPlayerName: suggestedDropPlayer?.name || '',
      consequenceLabel: dropRequired
        ? (suggestedDropPlayer
          ? `Drop required: ${suggestedDropPlayer.name}`
          : 'Drop required to submit claim')
        : 'Open roster spot available',
      dropOptions: dropRequired ? clone(dropOptions) : []
    }));
  }

  function findSimulationPlayerById(state, playerId){
    const targetId = Number(playerId);
    if (!Number.isFinite(targetId)) {
      return null;
    }
    const rosterPlayers = Object.values(state?.draftState?.rostersByTeam || {}).flatMap((roster) => (
      Array.isArray(roster) ? roster : []
    ));
    const freeAgents = Array.isArray(state?.draftState?.freeAgents) ? state.draftState.freeAgents : [];
    return rosterPlayers.concat(freeAgents).find((player) => Number(player?.id) === targetId) || null;
  }

  function buildSimulationPendingWaiverRows(state){
    return clone(state?.seasonState?.pendingWaiverClaims || []).map((claim, index) => ({
      id: `pending-waiver-${String(claim?.claimId || index)}`,
      claimId: String(claim?.claimId || '').trim(),
      teamAbbr: normalizeTeamAbbr(claim?.teamAbbr),
      addPlayerId: Number(claim?.addPlayerId),
      dropPlayerId: claim?.dropPlayerId == null ? null : Number(claim.dropPlayerId),
      playerName: findSimulationPlayerById(state, claim?.addPlayerId)?.name || '',
      dropPlayerName: findSimulationPlayerById(state, claim?.dropPlayerId)?.name || '',
      status: String(claim?.status || 'pending').trim().toLowerCase(),
      processOnAdvance: String(claim?.processOnAdvance || '').trim().toLowerCase(),
      timingLabel: String(claim?.processOnAdvance || '').trim().toLowerCase() === 'week'
        ? 'Processing next sim week'
        : 'Processing next sim day',
      consequenceLabel: claim?.dropPlayerId == null
        ? 'No drop required'
        : `Dropping ${findSimulationPlayerById(state, claim?.dropPlayerId)?.name || 'current player'}`
    }));
  }

  function buildSimulationWaiverResultRows(state){
    return clone(state?.seasonState?.recentWaiverResults || []).slice(0, 10).map((claim, index) => ({
      id: `waiver-result-${String(claim?.claimId || index)}`,
      claimId: String(claim?.claimId || '').trim(),
      teamAbbr: normalizeTeamAbbr(claim?.teamAbbr),
      addPlayerId: Number(claim?.addPlayerId),
      dropPlayerId: claim?.dropPlayerId == null ? null : Number(claim.dropPlayerId),
      status: String(claim?.status || '').trim().toLowerCase(),
      playerName: findSimulationPlayerById(state, claim?.addPlayerId)?.name || '',
      dropPlayerName: findSimulationPlayerById(state, claim?.dropPlayerId)?.name || '',
      resolutionNote: String(claim?.resolutionNote || '').trim(),
      resolutionLabel: String(claim?.status || '').trim().toLowerCase() === 'approved' || String(claim?.status || '').trim().toLowerCase() === 'resolved-success'
        ? 'Claim processed successfully'
        : 'Claim did not process'
    }));
  }

  function buildSimulationTradePartnerRows(state, tradePartners){
    const incomingRostersByTeam = clone(state?.draftState?.rostersByTeam || {});
    const standings = Array.isArray(state?.seasonState?.standings) ? state.seasonState.standings : [];
    return (Array.isArray(tradePartners) ? tradePartners : []).map((team, index) => ({
      incomingRoster: clone(incomingRostersByTeam[String(team?.abbr || '').trim().toUpperCase()] || []),
      id: `trade-partner-${String(team?.abbr || index).trim() || index}`,
      team: clone(team),
      teamAbbr: String(team?.abbr || '').trim().toUpperCase(),
      title: team?.name || team?.abbr || 'Trade Partner',
      recordLabel: (() => {
        const row = standings.find((entry) => String(entry?.teamAbbr || '').trim().toUpperCase() === String(team?.abbr || '').trim().toUpperCase()) || null;
        return row ? `${Number(row?.w || 0)}-${Number(row?.l || 0)}` : '0-0';
      })(),
      topPlayerName: (() => {
        const roster = Array.isArray(incomingRostersByTeam[String(team?.abbr || '').trim().toUpperCase()])
          ? incomingRostersByTeam[String(team?.abbr || '').trim().toUpperCase()]
          : [];
        const topPlayer = roster.slice().sort((a, b) => Number(b?.fp || 0) - Number(a?.fp || 0))[0] || null;
        return topPlayer?.name || '';
      })(),
      rosterCount: Array.isArray(incomingRostersByTeam[String(team?.abbr || '').trim().toUpperCase()])
        ? incomingRostersByTeam[String(team?.abbr || '').trim().toUpperCase()].length
        : 0
    }));
  }

  function buildSimulationStandingsSections(state, standings){
    const sport = getSimulationSportForState(state);
    if (sport === 'nfl') {
      return buildNflStandingsSections(standings);
    }
    const conferenceGroups = {};
    (Array.isArray(standings) ? standings : []).forEach((row) => {
      const title = String(row?.conference || '').trim() || 'League Standings';
      if (!Array.isArray(conferenceGroups[title])) {
        conferenceGroups[title] = [];
      }
      conferenceGroups[title].push(clone(row));
    });
    const titles = Object.keys(conferenceGroups);
    if (!titles.length) {
      return [{ title: 'League Standings', rows: [] }];
    }
    return titles.sort((a, b) => a.localeCompare(b)).map((title) => ({
      title,
      rows: sortStandingsRows(conferenceGroups[title])
    }));
  }

  function buildNflConferencePlayoffPicture(rows){
    const sortedRows = sortStandingsRows(clone(rows || []));
    const groupedByDivision = {};
    sortedRows.forEach((row) => {
      const key = String(row?.division || 'Conference').trim() || 'Conference';
      if (!groupedByDivision[key]) {
        groupedByDivision[key] = [];
      }
      groupedByDivision[key].push(clone(row));
    });
    const divisionWinners = Object.values(groupedByDivision)
      .map((divisionRows) => {
        const explicitDivisionLeader = divisionRows.find((row) => (
          row?.divisionLeader === true ||
          row?.divisionWinner === true ||
          row?.clinchedDivision === true ||
          Number(row?.divisionRank || 0) === 1
        ));
        return explicitDivisionLeader || sortStandingsRows(divisionRows)[0];
      })
      .filter(Boolean);
    const sortedDivisionWinners = sortStandingsRows(divisionWinners);
    const divisionWinnerAbbrs = new Set(sortedDivisionWinners.map((row) => String(row?.teamAbbr || '').trim().toUpperCase()));
    const wildCards = sortedRows
      .filter((row) => !divisionWinnerAbbrs.has(String(row?.teamAbbr || '').trim().toUpperCase()))
      .slice(0, 2);
    const wildCardAbbrs = new Set(wildCards.map((row) => String(row?.teamAbbr || '').trim().toUpperCase()));
    const bubble = sortedRows.filter((row) => {
      const teamAbbr = String(row?.teamAbbr || '').trim().toUpperCase();
      return !divisionWinnerAbbrs.has(teamAbbr) && !wildCardAbbrs.has(teamAbbr);
    });
    return sortedDivisionWinners.map((row, index) => ({
      ...clone(row),
      seed: index + 1,
      berth: 'division_winner'
    })).concat(wildCards.map((row, index) => ({
      ...clone(row),
      seed: 5 + index,
      berth: 'wild_card'
    }))).concat(bubble.map((row) => ({
      ...clone(row),
      seed: null,
      berth: 'outside'
    })));
  }

  function buildExactNflConferencePlayoffPicture(rows, conference, seedOrder){
    const standingsByTeam = new Map(
      (Array.isArray(rows) ? rows : []).map((row) => [String(row?.teamAbbr || '').trim().toUpperCase(), clone(row)])
    );
    return (Array.isArray(seedOrder) ? seedOrder : []).map((teamAbbr, index) => {
      const normalizedAbbr = String(teamAbbr || '').trim().toUpperCase();
      const row = standingsByTeam.get(normalizedAbbr) || { teamAbbr: normalizedAbbr };
      return {
        ...clone(row),
        teamAbbr: normalizedAbbr,
        conference,
        seed: index + 1,
        berth: index < 4 ? 'division_winner' : 'wild_card',
        bye: index < 2
      };
    });
  }

  function buildExactNfl2014PlayoffPicture(rows){
    return {
      afc: buildExactNflConferencePlayoffPicture(rows, 'AFC', ['NE', 'DEN', 'IND', 'PIT', 'CIN', 'BAL']),
      nfc: buildExactNflConferencePlayoffPicture(rows, 'NFC', ['SEA', 'GB', 'DAL', 'CAR', 'ARI', 'DET'])
    };
  }

  function buildExactNfl2014WildCardSeries(){
    return [
      buildSeriesState('AFC-wild-card-1', 'AFC', 'wild_card', { teamAbbr: 'IND', seed: 3, conference: 'AFC' }, { teamAbbr: 'BAL', seed: 6, conference: 'AFC' }, 1),
      buildSeriesState('AFC-wild-card-2', 'AFC', 'wild_card', { teamAbbr: 'PIT', seed: 4, conference: 'AFC' }, { teamAbbr: 'CIN', seed: 5, conference: 'AFC' }, 1),
      buildSeriesState('NFC-wild-card-1', 'NFC', 'wild_card', { teamAbbr: 'DAL', seed: 3, conference: 'NFC' }, { teamAbbr: 'DET', seed: 6, conference: 'NFC' }, 1),
      buildSeriesState('NFC-wild-card-2', 'NFC', 'wild_card', { teamAbbr: 'CAR', seed: 4, conference: 'NFC' }, { teamAbbr: 'ARI', seed: 5, conference: 'NFC' }, 1)
    ];
  }

  function buildNflScheduleEntries(seriesList, day){
    return (Array.isArray(seriesList) ? seriesList : [])
      .map((series) => ({
        id: series.id,
        seriesId: series.id,
        gameId: series.id,
        day: Number(day || 1),
        round: series.round,
        conference: series.conference,
        homeAbbr: series.higherSeed?.teamAbbr || null,
        awayAbbr: series.lowerSeed?.teamAbbr || null
      }))
      .filter((game) => game.homeAbbr && game.awayAbbr);
  }

  function hasAllTeamAbbrs(rows, teamAbbrs){
    const standingsAbbrs = new Set(
      (Array.isArray(rows) ? rows : []).map((row) => String(row?.teamAbbr || '').trim().toUpperCase())
    );
    return (Array.isArray(teamAbbrs) ? teamAbbrs : []).every((teamAbbr) => standingsAbbrs.has(String(teamAbbr || '').trim().toUpperCase()));
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

  function buildBracketRoundEntries(round, conference, teams){
    return buildPlayoffSeriesForRound(round, conference, teams).map((series) => ({
      higherSeed: clone(series?.higherSeed || null),
      lowerSeed: clone(series?.lowerSeed || null)
    }));
  }

  function getLeagueTeamByAbbr(state, teamAbbr){
    const targetAbbr = String(teamAbbr || '').trim().toUpperCase();
    return (state?.leagueShell?.teams || []).find((team) => (
      String(team?.abbr || '').trim().toUpperCase() === targetAbbr
    )) || null;
  }

  function getCanonicalScheduleTeamAbbr(state, teamAbbr){
    const targetAbbr = String(teamAbbr || '').trim().toUpperCase();
    if (!targetAbbr) return targetAbbr;
    if (getSimulationSportForState(state) !== 'nfl') {
      return targetAbbr;
    }
    const shellAbbrs = new Set((state?.leagueShell?.teams || []).map((team) => (
      String(team?.abbr || '').trim().toUpperCase()
    )));
    if (shellAbbrs.has(targetAbbr)) {
      return targetAbbr;
    }
    if (targetAbbr === 'WSH' && shellAbbrs.has('WAS')) {
      return 'WAS';
    }
    if (targetAbbr === 'WAS' && shellAbbrs.has('WSH')) {
      return 'WSH';
    }
    return targetAbbr;
  }

  function canonicalizeScheduleByDay(state, scheduleByDay){
    const canonicalSchedule = {};
    Object.keys(scheduleByDay || {}).forEach((dayKey) => {
      const games = Array.isArray(scheduleByDay?.[dayKey]) ? scheduleByDay[dayKey] : [];
      canonicalSchedule[dayKey] = games.map((game) => ({
        ...clone(game),
        homeAbbr: getCanonicalScheduleTeamAbbr(state, game?.homeAbbr),
        awayAbbr: getCanonicalScheduleTeamAbbr(state, game?.awayAbbr)
      }));
    });
    return canonicalSchedule;
  }

  function buildPostseasonTeamMetadata(state, teamEntry, extras){
    const entry = teamEntry && typeof teamEntry === 'object'
      ? teamEntry
      : { teamAbbr: teamEntry };
    const teamAbbr = String(entry?.teamAbbr || '').trim().toUpperCase() || null;
    const shellTeam = getLeagueTeamByAbbr(state, teamAbbr);
    const metadata = {
      teamAbbr,
      teamName: shellTeam?.name || shellTeam?.displayName || entry?.teamName || teamAbbr,
      teamDisplayName: shellTeam?.displayName || shellTeam?.name || entry?.teamDisplayName || teamAbbr,
      conference: entry?.conference || shellTeam?.conference || null,
      division: entry?.division || shellTeam?.division || null,
      seed: Number.isFinite(Number(entry?.seed)) ? Number(entry.seed) : null
    };
    return {
      ...metadata,
      ...(extras && typeof extras === 'object' ? clone(extras) : {})
    };
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
          sport: getSimulationSportForState(state),
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
    if (getSimulationSportForState(nextState) === 'nfl') {
      const anchorSeasonId = String(nextState?.leagueShell?.anchorSeasonId || '').trim().toLowerCase();
      const standings = clone(nextState?.seasonState?.standings || []);
      const expectedNfl2014PlayoffTeams = ['NE', 'DEN', 'IND', 'PIT', 'CIN', 'BAL', 'SEA', 'GB', 'DAL', 'CAR', 'ARI', 'DET'];
      if (anchorSeasonId === 'nfl_2014' && hasAllTeamAbbrs(standings, expectedNfl2014PlayoffTeams)) {
        const playoffPicture = buildExactNfl2014PlayoffPicture(standings);
        const wildCardSeries = buildExactNfl2014WildCardSeries();
        const currentDay = Number(nextState?.seasonState?.currentDay || 1);
        const currentWeekSchedule = buildNflScheduleEntries(wildCardSeries, currentDay);
        const seriesById = {};
        wildCardSeries.forEach((series) => {
          seriesById[series.id] = series;
        });
        return {
          phase: 'wild_card',
          currentRound: 'wild_card',
          currentDay,
          playIn: null,
          bracket: null,
          playoffPicture,
          seriesById,
          currentWeekSchedule: clone(currentWeekSchedule),
          currentDaySchedule: clone(currentWeekSchedule),
          champion: null,
          runnerUp: null,
          completedAt: null
        };
      }
      const sortedStandings = sortStandingsRows(standings);
      return {
        phase: 'postseason_ready',
        currentRound: 'playoff_picture',
        currentDay: Number(nextState?.seasonState?.currentDay || 1),
        playIn: null,
        bracket: null,
        playoffPicture: {
          afc: buildNflConferencePlayoffPicture(
            sortedStandings.filter((row) => String(row?.conference || '').trim().toUpperCase() === 'AFC')
          ),
          nfc: buildNflConferencePlayoffPicture(
            sortedStandings.filter((row) => String(row?.conference || '').trim().toUpperCase() === 'NFC')
          )
        },
        seriesById: {},
        currentDaySchedule: [],
        champion: null,
        runnerUp: null,
        completedAt: null
      };
    }
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

  function updateBracketForConferenceRound(bracket, round, conference, teams){
    const nextBracket = clone(bracket || {});
    if (!nextBracket[conference]) {
      nextBracket[conference] = {};
    }
    if (round === 'playoffs_round_2') {
      nextBracket[conference].secondRound = buildBracketRoundEntries(round, conference, teams);
    } else if (round === 'conference_finals') {
      nextBracket[conference].conferenceFinals = buildBracketRoundEntries(round, conference, teams);
    }
    return nextBracket;
  }

  function finalizeResolvedPostseasonState(nextState){
    const finalizedPostseasonState = finalizePostseasonRound(nextState, nextState?.postseasonState || {});
    const resolvedState = {
      ...clone(nextState),
      postseasonState: finalizedPostseasonState
    };
    return {
      ...resolvedState,
      postseasonState: {
        ...finalizedPostseasonState,
        currentDay: Number(resolvedState?.seasonState?.currentDay || finalizedPostseasonState.currentDay || 1),
        currentDaySchedule: buildCurrentDayPostseasonSchedule(resolvedState)
      }
    };
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

  function buildNflDivisionalSeries(postseasonState){
    const afc = clone(postseasonState?.playoffPicture?.afc || []);
    const nfc = clone(postseasonState?.playoffPicture?.nfc || []);
    const afcWinners = getWinningTeamsForRound(postseasonState, 'wild_card', 'AFC')
      .sort((a, b) => Number(a?.seed || 99) - Number(b?.seed || 99));
    const nfcWinners = getWinningTeamsForRound(postseasonState, 'wild_card', 'NFC')
      .sort((a, b) => Number(a?.seed || 99) - Number(b?.seed || 99));
    return [
      buildSeriesState('AFC-divisional-1', 'AFC', 'divisional', afc[0] || null, afcWinners[afcWinners.length - 1] || null, 1),
      buildSeriesState('AFC-divisional-2', 'AFC', 'divisional', afc[1] || null, afcWinners[0] || null, 1),
      buildSeriesState('NFC-divisional-1', 'NFC', 'divisional', nfc[0] || null, nfcWinners[nfcWinners.length - 1] || null, 1),
      buildSeriesState('NFC-divisional-2', 'NFC', 'divisional', nfc[1] || null, nfcWinners[0] || null, 1)
    ].filter((series) => series.higherSeed && series.lowerSeed);
  }

  function buildNflDivisionalSchedule(postseasonState){
    return buildNflScheduleEntries(buildNflDivisionalSeries(postseasonState), postseasonState?.currentDay);
  }

  function buildNflConferenceChampionshipSeries(postseasonState){
    const afc = getWinningTeamsForRound(postseasonState, 'divisional', 'AFC')
      .sort((a, b) => Number(a?.seed || 99) - Number(b?.seed || 99));
    const nfc = getWinningTeamsForRound(postseasonState, 'divisional', 'NFC')
      .sort((a, b) => Number(a?.seed || 99) - Number(b?.seed || 99));
    return [
      buildSeriesState('AFC-conference-championship', 'AFC', 'conference_championship', afc[0] || null, afc[1] || null, 1),
      buildSeriesState('NFC-conference-championship', 'NFC', 'conference_championship', nfc[0] || null, nfc[1] || null, 1)
    ].filter((series) => series.higherSeed && series.lowerSeed);
  }

  function buildNflConferenceChampionshipSchedule(postseasonState){
    return buildNflScheduleEntries(buildNflConferenceChampionshipSeries(postseasonState), postseasonState?.currentDay);
  }

  function buildNflSuperBowlSeries(postseasonState){
    const afcChampion = getWinningTeamsForRound(postseasonState, 'conference_championship', 'AFC')[0] || null;
    const nfcChampion = getWinningTeamsForRound(postseasonState, 'conference_championship', 'NFC')[0] || null;
    return afcChampion && nfcChampion
      ? [buildSeriesState('super-bowl-xlix', 'league', 'super_bowl', afcChampion, nfcChampion, 1)]
      : [];
  }

  function buildNflSuperBowlSchedule(postseasonState){
    return buildNflScheduleEntries(buildNflSuperBowlSeries(postseasonState), postseasonState?.currentDay);
  }

  function getWinningTeamsForRound(postseasonState, round, conference){
    return listRoundSeries(postseasonState?.seriesById || {}, round)
      .filter((series) => String(series?.conference || '') === String(conference || ''))
      .map((series) => getSeriesTeam(series, series.winnerTeamAbbr))
      .filter(Boolean)
      .sort((a, b) => Number(a?.seed || 99) - Number(b?.seed || 99));
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
    if (phase === 'wild_card') {
      return clone(Array.isArray(postseasonState?.currentWeekSchedule)
        ? postseasonState.currentWeekSchedule
        : postseasonState?.currentDaySchedule || []);
    }
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
    const sport = getSimulationSportForState(nextState);

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
          finals: {
            higherSeed: clone(finals?.higherSeed || null),
            lowerSeed: clone(finals?.lowerSeed || null),
            winnerTeamAbbr: finals?.winnerTeamAbbr || null,
            games: Number(finals?.games || 0)
          }
        },
        seriesById,
        champion: buildPostseasonTeamMetadata(
          nextState,
          getSeriesTeam(finals, summary?.championTeamAbbr || null) || summary?.championTeamAbbr || null,
          {
            seriesResult: `${winnerWins}-${loserWins}`,
            finalsGames: Number(summary?.finalsGames || finals?.games || 0)
          }
        ),
        runnerUp: buildPostseasonTeamMetadata(
          nextState,
          getSeriesTeam(finals, summary?.runnerUpTeamAbbr || null) || summary?.runnerUpTeamAbbr || null,
          {
            finalsGames: Number(summary?.finalsGames || finals?.games || 0)
          }
        ),
        completedAt: resolvedState.completedAt || new Date().toISOString()
      };
    }

    if (sport === 'nfl') {
      if (resolvedState.currentRound === 'wild_card') {
        const currentRoundSeries = listRoundSeries(seriesById, 'wild_card');
        if (currentRoundSeries.length && currentRoundSeries.every((series) => series.winnerTeamAbbr)) {
          const divisionalSeries = buildNflDivisionalSeries(resolvedState);
          divisionalSeries.forEach((series) => {
            seriesById[series.id] = series;
          });
          const schedule = buildNflDivisionalSchedule(resolvedState);
          return {
            ...resolvedState,
            phase: 'divisional',
            currentRound: 'divisional',
            currentWeekSchedule: clone(schedule),
            currentDaySchedule: clone(schedule),
            bracket: {
              ...(resolvedState.bracket || {}),
              divisional: clone(schedule)
            },
            seriesById
          };
        }
      }

      if (resolvedState.currentRound === 'divisional') {
        const currentRoundSeries = listRoundSeries(seriesById, 'divisional');
        if (currentRoundSeries.length && currentRoundSeries.every((series) => series.winnerTeamAbbr)) {
          const conferenceSeries = buildNflConferenceChampionshipSeries(resolvedState);
          conferenceSeries.forEach((series) => {
            seriesById[series.id] = series;
          });
          const schedule = buildNflConferenceChampionshipSchedule(resolvedState);
          return {
            ...resolvedState,
            phase: 'conference_championship',
            currentRound: 'conference_championship',
            currentWeekSchedule: clone(schedule),
            currentDaySchedule: clone(schedule),
            bracket: {
              ...(resolvedState.bracket || {}),
              conferenceChampionship: clone(schedule)
            },
            seriesById
          };
        }
      }

      if (resolvedState.currentRound === 'conference_championship') {
        const currentRoundSeries = listRoundSeries(seriesById, 'conference_championship');
        if (currentRoundSeries.length && currentRoundSeries.every((series) => series.winnerTeamAbbr)) {
          const superBowlSeries = buildNflSuperBowlSeries(resolvedState);
          superBowlSeries.forEach((series) => {
            seriesById[series.id] = series;
          });
          const championshipSeries = clone(superBowlSeries[0] || null);
          const schedule = buildNflSuperBowlSchedule(resolvedState);
          return {
            ...resolvedState,
            phase: 'super_bowl',
            currentRound: 'super_bowl',
            currentWeekSchedule: clone(schedule),
            currentDaySchedule: clone(schedule),
            championship: {
              title: 'Super Bowl XLIX',
              matchup: {
                homeAbbr: championshipSeries?.higherSeed?.teamAbbr || null,
                awayAbbr: championshipSeries?.lowerSeed?.teamAbbr || null
              }
            },
            bracket: {
              ...(resolvedState.bracket || {}),
              superBowl: clone(schedule)
            },
            seriesById
          };
        }
      }

      if (resolvedState.currentRound === 'super_bowl' && seriesById['super-bowl-xlix']?.winnerTeamAbbr) {
        const superBowl = clone(seriesById['super-bowl-xlix']);
        const winnerTeamAbbr = superBowl.winnerTeamAbbr || null;
        const runnerUpTeamAbbr = getSeriesLoser(superBowl)?.teamAbbr || null;
        const winnerWins = String(winnerTeamAbbr || '').trim().toUpperCase() === String(superBowl.higherSeed?.teamAbbr || '').trim().toUpperCase()
          ? Number(superBowl.higherSeedWins || 0)
          : Number(superBowl.lowerSeedWins || 0);
        const loserWins = Math.min(Number(superBowl.higherSeedWins || 0), Number(superBowl.lowerSeedWins || 0));
        return {
          ...resolvedState,
          phase: 'completed',
          currentRound: 'completed',
          bracket: {
            ...(resolvedState.bracket || {}),
            superBowl: {
              higherSeed: clone(superBowl?.higherSeed || null),
              lowerSeed: clone(superBowl?.lowerSeed || null),
              winnerTeamAbbr: superBowl?.winnerTeamAbbr || null,
              games: Number(superBowl?.games || 0)
            }
          },
          seriesById,
          championship: {
            title: 'Super Bowl XLIX',
            matchup: {
              homeAbbr: superBowl?.higherSeed?.teamAbbr || null,
              awayAbbr: superBowl?.lowerSeed?.teamAbbr || null
            },
            championTeamAbbr: winnerTeamAbbr,
            runnerUpTeamAbbr: runnerUpTeamAbbr,
            result: winnerTeamAbbr && runnerUpTeamAbbr
              ? `${winnerTeamAbbr} beat ${runnerUpTeamAbbr}`
              : ''
          },
          currentWeekSchedule: [],
          currentDaySchedule: [],
          champion: buildPostseasonTeamMetadata(
            nextState,
            getSeriesTeam(superBowl, winnerTeamAbbr) || winnerTeamAbbr,
            {
              seriesResult: `${winnerWins}-${loserWins}`,
              superBowlGames: Number(superBowl?.games || 0)
            }
          ),
          runnerUp: buildPostseasonTeamMetadata(
            nextState,
            getSeriesTeam(superBowl, runnerUpTeamAbbr) || runnerUpTeamAbbr,
            {
              superBowlGames: Number(superBowl?.games || 0)
            }
          ),
          completedAt: resolvedState.completedAt || new Date().toISOString()
        };
      }
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
      const conferenceWinners = getRoundWinnersForConference(currentRoundSeries, conference);
      seedConferenceRoundSeries(seriesById, nextRound, conference, conferenceWinners);
      resolvedState.bracket = updateBracketForConferenceRound(resolvedState.bracket, nextRound, conference, conferenceWinners);
    });

    return {
      ...resolvedState,
      phase: nextRound,
      currentRound: nextRound,
      bracket: clone(resolvedState.bracket || {}),
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
      const winnerSide = String(gameLog?.winner || '').trim().toLowerCase();
      const winnerTeamAbbr = winnerSide === 'away'
        ? game?.awayAbbr
        : winnerSide === 'home'
          ? game?.homeAbbr
          : Number(gameLog?.homeScore || 0) >= Number(gameLog?.awayScore || 0)
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

  function applyPostseasonDayResults(currentSeasonState, dayResult, state){
    const nextSeasonState = clone(currentSeasonState || {});
    nextSeasonState.completedGameLogs = (nextSeasonState.completedGameLogs || []).concat(dayResult?.gameLogs || []);
    nextSeasonState.currentDay = Number(nextSeasonState.currentDay || 1) + 1;
    if (getSimulationSportForState(state) === 'nfl') {
      nextSeasonState.currentWeek = Math.max(1, Number(currentSeasonState?.currentWeek || currentSeasonState?.currentDay || 1) + 1);
    } else {
      nextSeasonState.currentWeek = Math.max(1, Math.ceil(Number(nextSeasonState.currentDay || 1) / 7));
    }
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
      return finalizeResolvedPostseasonState(workingState);
    }
    const { currentSeasonState, dayResult } = simulateEngineDay(
      workingState,
      shell,
      { [currentDay]: clone(todayGames) },
      currentDay
    );
    const nextSeasonState = applyPostseasonDayResults(currentSeasonState, dayResult, workingState);
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
    const existingPhase = String(nextState?.postseasonState?.phase || 'regular_season').trim().toLowerCase();
    if (existingPhase && existingPhase !== 'regular_season') {
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
      return canonicalizeScheduleByDay(state, persistedSchedule);
    }
    const schedule = engineApi.buildSimulationSeasonSchedule(clone(shell || {}));
    return canonicalizeScheduleByDay(state, schedule?.byDay || {});
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
        return getModeIdForState(state);
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
      submitWaiverClaim(move){
        const nextState = typeof runtimeApi.submitSimulationWaiverClaim === 'function'
          ? runtimeApi.submitSimulationWaiverClaim(clone(state), {
            ...clone(move || {}),
            teamAbbr: move?.teamAbbr || getControlledTeamAbbr(state)
          })
          : clone(state);
        state = clone(nextState || {});
        return this.getState();
      },
      cancelWaiverClaim(payload){
        const nextState = typeof runtimeApi.cancelSimulationWaiverClaim === 'function'
          ? runtimeApi.cancelSimulationWaiverClaim(clone(state), clone(payload || {}))
          : clone(state);
        state = clone(nextState || {});
        return this.getState();
      },
      applyTrade(trade){
        const nextState = runtimeApi.applySimulationTrade(clone(state), trade);
        state = clone(nextState || {});
        return this.getState();
      },
      activateSimulationPowerup(payload){
        const nextState = runtimeApi.activateSimulationPowerup(clone(state), {
          ...clone(payload || {}),
          teamAbbr: payload?.teamAbbr || getControlledTeamAbbr(state)
        });
        state = clone(nextState || {});
        return this.getState();
      },
      updateTeamSettings(payload){
        const nextState = typeof runtimeApi.updateSimulationTeamSettings === 'function'
          ? runtimeApi.updateSimulationTeamSettings(clone(state), {
            ...clone(payload || {}),
            teamAbbr: payload?.teamAbbr || getControlledTeamAbbr(state)
          })
          : clone(state);
        state = clone(nextState || {});
        return this.getState();
      },
      getHubViewModel(){
        const team = getControlledTeam(state);
        const standings = Array.isArray(state?.seasonState?.standings) ? state.seasonState.standings : [];
        const userRow = standings.find((row) => row.teamAbbr === team?.abbr) || null;
        const sport = getSimulationSportForState(state);
        const primaryAction = getSimulationPrimaryAction(state);
        const anchorSeasonLabel = state?.leagueShell?.anchorSeasonLabel || (sport === 'nfl' ? 'NFL' : 'NBA');
        return {
          slotId,
          sport,
          leagueLabel: `${anchorSeasonLabel} Simulation`,
          shellLabel: `${anchorSeasonLabel} Shell`,
          statSourceLabel: 'Simulated',
          controlledTeam: team ? clone(team) : null,
          userRow: userRow ? clone(userRow) : null,
          recordLabel: buildSimulationRecordLabel(userRow),
          summaryCards: buildSimulationHubSummaryCards(state, team, userRow),
          powerupCards: buildSimulationHubPowerupCards(state),
          primaryAction,
          sourceSeasonLabels: clone(state?.sourceSeasons?.sourceSeasonLabels || []),
          recentActivity: clone(state?.seasonState?.activityLog || []).slice(-5).reverse()
        };
      },
      getRosterViewModel(){
        return buildSimulationRosterViewModel(state);
      },
      getScheduleViewModel(){
        const scheduleByDay = getCanonicalScheduleByDay(state, state?.leagueShell || {});
        const nextGame = buildSimulationNextGame(state, scheduleByDay);
        const sport = getSimulationSportForState(state);
        const recentResults = clone(state?.seasonState?.completedGameLogs || [])
          .slice(-10)
          .reverse()
          .map((game) => normalizeSimulationRecentResult(state, game));
        const matchupContext = buildSimulationMatchupContext(state, scheduleByDay, nextGame, recentResults);
        return {
          sport,
          title: sport === 'nfl' ? 'Weekly Schedule / Results' : 'Schedule / Results',
          subtitle: nextGame
            ? `${nextGame.home ? 'vs' : '@'} ${nextGame.opponentName || nextGame.opponentAbbr || 'Opponent'}`
            : 'No upcoming matchup',
          cycleLabel: formatSimulationCycleLabel(state),
          hero: buildSimulationMatchupHero(state, matchupContext),
          navigation: buildSimulationMatchupNavigation(state, matchupContext),
          detailCards: buildSimulationScheduleDetailCards(state, nextGame, recentResults),
          previousMatchup: matchupContext.previousMatchup ? clone(matchupContext.previousMatchup) : null,
          currentMatchup: nextGame ? clone(nextGame) : null,
          recentResults,
          actionCards: buildSimulationMatchupActionCards(state, matchupContext),
          teamPanels: buildSimulationMatchupTeamPanels(state, matchupContext),
          lineupSections: buildSimulationMatchupLineupSections(state, matchupContext),
          scheduleByDay,
          nextGame: nextGame ? clone(nextGame) : null
        };
      },
      getWaiverViewModel(){
        const roster = getControlledRoster(state);
        const availablePlayers = clone(state?.draftState?.freeAgents || []).slice(0, 40);
        const teamSummary = buildSimulationTeamSummary(state, {
          controlledTeam: getControlledTeam(state)
        });
        const availableRows = buildSimulationWaiverRows(state);
        const pendingRows = buildSimulationPendingWaiverRows(state);
        const recentRows = buildSimulationWaiverResultRows(state);
        const cadence = typeof runtimeApi.getSimulationWaiverCadence === 'function'
          ? runtimeApi.getSimulationWaiverCadence(clone(state))
          : (getSimulationSportForState(state) === 'nfl' ? 'week' : 'day');
        return {
          sport: getSimulationSportForState(state),
          layoutMode: 'local-league-parity',
          roster,
          teamSummary,
          availablePlayers,
          claimTimingLabel: cadence === 'week' ? 'Processing next sim week' : 'Processing next sim day',
          pendingClaims: clone(state?.seasonState?.pendingWaiverClaims || []),
          recentClaimResults: clone(state?.seasonState?.recentWaiverResults || []),
          sections: {
            available: {
              title: 'Available Players',
              rows: availableRows
            },
            pending: {
              title: 'Pending Claims',
              rows: pendingRows
            },
            recent: {
              title: 'Recent Waiver Results',
              rows: recentRows
            }
          }
        };
      },
      getTradeViewModel(){
        const controlled = getControlledTeamAbbr(state);
        const tradePartners = clone(state?.leagueShell?.teams || []).filter((team) => team.abbr !== controlled);
        return {
          sport: getSimulationSportForState(state),
          userTeamAbbr: controlled,
          tradePartners,
          outgoingRoster: getControlledRoster(state),
          incomingRostersByTeam: clone(state?.draftState?.rostersByTeam || {}),
          sections: {
            partners: {
              title: 'Trade Partners',
              rows: buildSimulationTradePartnerRows(state, tradePartners)
            }
          }
        };
      },
      getStandingsViewModel(){
        const standings = sortStandingsRows(clone(state?.seasonState?.standings || []));
        const controlled = getControlledTeamAbbr(state);
        const sport = getSimulationSportForState(state);
        return {
          sport,
          rows: standings,
          userRow: standings.find((row) => String(row?.teamAbbr || '').trim().toUpperCase() === controlled) || null,
          postseasonPhase: state?.postseasonState?.phase || 'regular_season',
          sections: buildSimulationStandingsSections(state, standings)
        };
      },
      getPlayoffsViewModel(){
        const sport = getSimulationSportForState(state);
        return {
          sport,
          phase: state?.postseasonState?.phase || 'regular_season',
          currentRound: state?.postseasonState?.currentRound || null,
          currentDay: Number(state?.postseasonState?.currentDay || state?.seasonState?.currentDay || 1),
          playIn: clone(state?.postseasonState?.playIn || null),
          bracket: clone(state?.postseasonState?.bracket || null),
          playoffPicture: clone(state?.postseasonState?.playoffPicture || null),
          seriesById: clone(state?.postseasonState?.seriesById || {}),
          currentWeekSchedule: clone(state?.postseasonState?.currentWeekSchedule || []),
          currentDaySchedule: clone(state?.postseasonState?.currentDaySchedule || []),
          champion: clone(state?.postseasonState?.champion || null),
          runnerUp: clone(state?.postseasonState?.runnerUp || null),
          completedAt: state?.postseasonState?.completedAt || null
        };
      },
      simulateNextDay(){
        const normalizedState = normalizeLegacyNflLineupSlots(state);
        state = clone(normalizedState);
        const shell = clone(state?.leagueShell || {});
        const sport = getSimulationSportForState(state);
        const waiverCadence = typeof runtimeApi.getSimulationWaiverCadence === 'function'
          ? runtimeApi.getSimulationWaiverCadence(clone(state))
          : (sport === 'nfl' ? 'week' : 'day');
        const postseasonPhase = String(state?.postseasonState?.phase || 'regular_season').trim().toLowerCase();
        const scheduleByDay = getCanonicalScheduleByDay(normalizedState, shell);
        const totalDays = getScheduleDayCount(scheduleByDay);
        if (state?.postseasonState?.phase === 'completed') {
          return this.getState();
        }
        if (sport === 'nfl') {
          const teamAbbr = getControlledTeamAbbr(state);
          const validation = (typeof runtimeApi.validateSimulationLineup === 'function')
            ? runtimeApi.validateSimulationLineup(clone(state), teamAbbr)
            : { valid: true, issues: [] };
          if (!validation.valid) {
            const currentWeek = Number(state?.seasonState?.currentWeek || 1);
            const warning = {
              type: 'lineup-warning',
              teamAbbr,
              title: `${teamAbbr} must fix its lineup before simming Week ${currentWeek}.`,
              text: `${teamAbbr} must fix its lineup before simming Week ${currentWeek}.`,
              day: Number(state?.seasonState?.currentDay || 1),
              ts: Date.now()
            };
            state = {
              ...clone(state),
              seasonState: {
                ...clone(state?.seasonState || {}),
                activityLog: [warning].concat(clone(state?.seasonState?.activityLog || []))
              }
            };
            return this.getState();
          }
        }
        if (totalDays > 0 && Number(state?.seasonState?.currentDay || 1) > totalDays) {
          const existingPhase = String(state?.postseasonState?.phase || 'regular_season').trim().toLowerCase();
          const seededState = ensurePostseasonSnapshot(state, totalDays);
          if (!existingPhase || existingPhase === 'regular_season') {
            state = seededState;
            return this.getState();
          }
          state = simulatePostseasonDay(seededState, shell);
          return this.getState();
        }
        const { currentSeasonState, engineSeasonState, dayResult } = simulateEngineDay(
          state,
          shell,
          scheduleByDay,
          Number(state?.seasonState?.currentDay || 1)
        );
        const nextSeasonState = engineApi.applySimulationDayResults(engineSeasonState, dayResult);
        if (sport === 'nfl') {
          nextSeasonState.currentDay = Number(currentSeasonState.currentDay || currentSeasonState.currentWeek || 1) + 1;
          nextSeasonState.currentWeek = Number(currentSeasonState.currentWeek || currentSeasonState.currentDay || 1) + 1;
        }
        const advancedState = {
          ...clone(state),
          currentDay: Number(nextSeasonState.currentDay || currentSeasonState.currentDay || 1),
          currentWeek: Number(nextSeasonState.currentWeek || currentSeasonState.currentWeek || 1),
          seasonState: {
            ...nextSeasonState,
            scheduleByDay: clone(scheduleByDay)
          }
        };
        state = typeof runtimeApi.processSimulationWaiverClaims === 'function'
          ? clone(runtimeApi.processSimulationWaiverClaims(advancedState, {
            cadence: waiverCadence
          }))
          : advancedState;
        state = ensurePostseasonSnapshot(state, totalDays);
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
