const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const simulationSeasonAdapterApi = require('../simulation-season-adapter.js');
const {
  createSimulationSeasonAdapter,
  isSupportedSimulationSeasonState
} = simulationSeasonAdapterApi;
const adapterSource = fs.readFileSync(path.join(__dirname, '..', 'simulation-season-adapter.js'), 'utf8');

const slotState = {
  simulationMode: 'nba_mixed_era_single_player_v1',
  leagueShell: {
    anchorSeasonLabel: '2025-26 NBA',
    rosterSize: 2,
    teams: [
      { abbr: 'LAL', name: 'Los Angeles Lakers', conference: 'West', division: 'Pacific' },
      { abbr: 'BOS', name: 'Boston Celtics', conference: 'East', division: 'Atlantic' }
    ]
  },
  sourceSeasons: {
    sourceSeasonLabels: ['1986-87', '1995-96', '2015-16']
  },
  draftState: {
    controlledTeamAbbr: 'lal',
    rostersByTeam: {
      LAL: [
        { id: 23, name: 'Michael Jordan', pos: 'SG', team: 'CHI', fp: 60.2 },
        { id: 34, name: 'Hakeem Olajuwon', pos: 'C', team: 'HOU', fp: 61.8 }
      ],
      BOS: [
        { id: 30, name: 'Stephen Curry', pos: 'PG', team: 'GSW', fp: 57.1 }
      ]
    },
    freeAgents: [
      { id: 50, name: 'Scottie Pippen', pos: 'SF', team: 'CHI', fp: 46.4 }
    ]
  },
  seasonState: {
    currentDay: 12,
    currentWeek: 2,
    lineupIdsByTeam: { LAL: [23, 34] },
    pendingWaiverClaims: [
      {
        claimId: 'claim-1',
        teamAbbr: 'LAL',
        addPlayerId: 50,
        dropPlayerId: 23,
        status: 'pending',
        processOnAdvance: 'day'
      }
    ],
    recentWaiverResults: [
      {
        claimId: 'claim-0',
        teamAbbr: 'LAL',
        addPlayerId: 50,
        dropPlayerId: 34,
        status: 'approved',
        resolutionNote: 'Claim processed successfully.'
      }
    ],
    standings: [
      { teamAbbr: 'LAL', conference: 'West', division: 'Pacific', w: 9, l: 3, pf: 1360, pa: 1288, streak: 'W3' },
      { teamAbbr: 'BOS', conference: 'East', division: 'Atlantic', w: 7, l: 5, pf: 1299, pa: 1274, streak: 'L1' }
    ],
    completedGameLogs: [
      { day: 11, awayAbbr: 'BOS', awayName: 'Boston Celtics', awayScore: 108, homeAbbr: 'LAL', homeName: 'Los Angeles Lakers', homeScore: 112 }
    ],
    upcomingGamesByTeam: {
      LAL: [{ day: 12, opponentAbbr: 'BOS', opponentName: 'Boston Celtics', home: true }]
    },
    activityLog: [
      { type: 'trade', text: 'Lakers acquired Hakeem Olajuwon', day: 9 }
    ]
  },
  postseasonState: {
    phase: 'regular_season',
    champion: null
  }
};

assert.equal(simulationSeasonAdapterApi.MODE_ID, 'nba_mixed_era_single_player_v1');
assert.equal(typeof simulationSeasonAdapterApi.clone, 'function');
assert.equal(typeof simulationSeasonAdapterApi.getControlledTeam, 'function');
assert.equal(typeof simulationSeasonAdapterApi.getControlledRoster, 'function');
assert.equal(isSupportedSimulationSeasonState(slotState), true);
assert.equal(simulationSeasonAdapterApi.getControlledTeam(slotState).abbr, 'LAL');
assert.deepStrictEqual(
  simulationSeasonAdapterApi.getControlledRoster(slotState).map((player) => player.id),
  [23, 34]
);

const adapter = createSimulationSeasonAdapter({
  slotId: 'sim-slot-1',
  state: slotState
});

function assertSinglePlayerParityRosterVm(rosterVm, label) {
assert.equal(rosterVm.layoutMode, 'local-league-parity', `${label} roster vm should opt into the shared local-league parity layout`);
  assert.ok(Array.isArray(rosterVm.summaryCards), `${label} roster vm should expose shared summary cards`);
  assert.ok(Array.isArray(rosterVm.actionCards), `${label} roster vm should expose shared action cards`);
  assert.ok(Array.isArray(rosterVm.operations?.actions), `${label} roster vm should expose shared roster operations actions`);
  assert.ok(Array.isArray(rosterVm.tabs), `${label} roster vm should expose shared roster mini-tabs`);
  assert.ok(Array.isArray(rosterVm.sections?.starters?.rows), `${label} roster vm should expose starter rows through shared sections`);
  assert.ok(Array.isArray(rosterVm.sections?.bench?.rows), `${label} roster vm should expose bench rows through shared sections`);
  assert.equal(Object.prototype.hasOwnProperty.call(rosterVm, 'slotKeys'), false, `${label} roster vm should not expose overlapping slot collections`);
}

assert.equal(adapter.getModeId(), simulationSeasonAdapterApi.MODE_ID);
const stateSnapshot = adapter.getState();
stateSnapshot.draftState.controlledTeamAbbr = 'BOS';
stateSnapshot.leagueShell.teams[0].name = 'Mutated Lakers';
assert.equal(adapter.getState().draftState.controlledTeamAbbr, 'lal');
assert.equal(adapter.getState().leagueShell.teams[0].name, 'Los Angeles Lakers');

assert.deepStrictEqual(
  adapter.getNavItems().map((item) => item.id),
  ['hub', 'roster', 'matchup', 'waiver', 'trades', 'standings']
);
assert.equal(adapter.getNavItems().find((item) => item.id === 'matchup').label, 'Matchup');
assert.equal(typeof adapter.setLineup, 'function');
assert.equal(typeof adapter.claimFreeAgent, 'function');
assert.equal(typeof adapter.applyTrade, 'function');
assert.equal(typeof adapter.activateSimulationPowerup, 'function');
assert.equal(typeof adapter.simulateNextDay, 'function');
assert.match(adapterSource, /runtimeApi\.setSimulationLineup\(/, 'adapter lineup mutation should stay runtime-backed');
assert.match(adapterSource, /runtimeApi\.claimSimulationFreeAgent\(/, 'adapter waiver mutation should stay runtime-backed');
assert.match(adapterSource, /runtimeApi\.applySimulationTrade\(/, 'adapter trade mutation should stay runtime-backed');
assert.match(adapterSource, /runtimeApi\.activateSimulationPowerup\(/, 'adapter powerup mutation should stay runtime-backed');
assert.match(adapterSource, /gameLog\?\.winner/, 'postseason advancement should prefer the authoritative game winner over rounded display scores');

const hub = adapter.getHubViewModel();
  assert.equal(hub.leagueLabel, 'Mixed Era Local League');
  assert.equal(hub.controlledTeam.abbr, 'LAL');
  assert.equal(hub.primaryAction.label, 'Reveal Day 12 Results');
  assert.equal(hub.primaryAction.shortLabel, 'Reveal Day');
  assert.equal(hub.primaryAction.cadenceLabel, 'Day 12');
  assert.equal(hub.primaryAction.shellTone, 'reveal');
  assert.equal(hub.statSourceLabel, 'Simulated', 'single-player replacement hub vm should label engine-backed output as simulated');
assert.deepStrictEqual(hub.sourceSeasonLabels, ['1986-87', '1995-96', '2015-16']);
assert.ok(Array.isArray(hub.summaryCards), 'hub vm should expose summaryCards for shared-shell parity');
assert.deepStrictEqual(
  hub.summaryCards.map((card) => ({ label: card.label, value: card.value })),
  [
    { label: 'Record', value: '9-3' },
    { label: 'Reveal Window', value: 'Day 12 - Week 2' },
    { label: 'Team', value: 'LAL' },
    { label: 'Era Pool', value: '1986-87 + 2 more' }
  ],
  'hub vm should expose polished summary-pill labels and compact era-pool context'
);
assert.ok(Array.isArray(hub.powerupCards), 'hub vm should expose powerupCards for shared-shell parity');
assert.equal(hub.powerupCards.length, 4, 'hub vm should expose the familiar four-card powerup rail for parity');
assert.equal(hub.powerupCards[0]?.active, false, 'captain-mode hub powerup cards should stay inactive until that specific powerup is active');
assert.equal(hub.powerupCards[0]?.status, 'Ready to activate', 'captain-mode hub powerup cards should expose an actionable ready state when that specific powerup is inactive');
assert.equal(hub.powerupCards[0]?.disabled, false, 'captain-mode hub cards should stay enabled when a valid lineup exists');
assert.equal(hub.powerupCards[0]?.actionLabel, 'Activate Captain', 'captain-mode hub cards should expose an activation label through the adapter vm');
assert.ok(Array.isArray(hub.powerupCards[0]?.targetOptions), 'captain-mode hub cards should expose starter target options');
assert.equal(hub.powerupCards[0]?.targetOptions?.[0]?.value, 23, 'captain-mode hub cards should default to the first starter target');
assert.doesNotMatch(
  hub.powerupCards[0]?.targetOptions?.map((option) => option?.label || '').join(' | '),
  /·\s*([A-Z]+)\s*·\s*\1/i,
  'captain-mode hub cards should not duplicate identical starter position labels in target options'
);
assert.deepStrictEqual(
  hub.powerupCards.map((card) => card.label),
  ['Captain Mode', 'White Gloves', 'Bench Boost', 'Sunday Surge'],
  'hub vm should mirror the familiar single-player powerup rail ordering'
);
assert.equal(hub.powerupCards[1]?.disabled, true, 'non-wired parity powerups should stay visibly disabled until simulation support exists');
assert.equal(hub.powerupCards[1]?.status, 'Future unlock');
assert.match(hub.powerupCards[1]?.body || '', /injury replacements unlock for local leagues/i);
assert.match(hub.powerupCards[2]?.body || '', /reserve scoring unlocks for local leagues/i);
assert.match(hub.powerupCards[3]?.body || '', /cadence-based boosts unlock for local leagues/i);
hub.controlledTeam.name = 'Mutated Lakers';
hub.userRow.w = 999;
hub.sourceSeasonLabels.push('2020-21');
assert.equal(adapter.getState().leagueShell.teams[0].name, 'Los Angeles Lakers');
assert.equal(adapter.getState().seasonState.standings[0].w, 9);
assert.equal(adapter.getState().sourceSeasons.sourceSeasonLabels.length, 3);

const namedLeagueAdapter = createSimulationSeasonAdapter({
  slotId: 'sim-slot-named-league',
  state: {
    ...slotState,
    leagueName: 'Showtime Revival'
  }
});
assert.equal(
  namedLeagueAdapter.getHubViewModel().leagueLabel,
  'Showtime Revival',
  'simulation hub vm should prefer an explicit saved league name over the generic anchor-season label'
);
assert.equal(
  namedLeagueAdapter.getRosterViewModel().teamSummary.leagueLabel,
  'Showtime Revival',
  'simulation roster vm should carry the same explicit league identity into the shared local-league shell'
);

const singleSourceLeagueAdapter = createSimulationSeasonAdapter({
  slotId: 'sim-slot-single-source-league',
  state: {
    ...slotState,
    sourceSeasons: {
      sourceSeasonLabels: ['2014']
    }
  }
});
assert.deepStrictEqual(
  singleSourceLeagueAdapter.getHubViewModel().summaryCards.map((card) => ({ label: card.label, value: card.value })),
  [
    { label: 'Record', value: '9-3' },
    { label: 'Reveal Window', value: 'Day 12 - Week 2' },
    { label: 'Team', value: 'LAL' },
    { label: 'Source Pool', value: '2014' }
  ],
  'single-source simulation hubs should downgrade the era pill to a source-pool pill cleanly'
);
  assert.equal(
    singleSourceLeagueAdapter.getHubViewModel().leagueLabel,
    '2025-26 NBA Local League',
    'single-source unnamed leagues should default to a local-league identity instead of a generic simulation label'
  );

const genericPlaceholderLeagueAdapter = createSimulationSeasonAdapter({
  slotId: 'sim-slot-generic-placeholder-name',
  state: {
    ...slotState,
    leagueName: 'Simulation Archive Lab',
    sourceSeasons: {
      sourceSeasonLabels: ['2025-26 NBA']
    }
  }
});
assert.equal(
  genericPlaceholderLeagueAdapter.getHubViewModel().leagueLabel,
  '2025-26 NBA Local League',
  'generic setup/archive placeholder names should not override the refined local-league fallback label'
);

const anchorPlaceholderLeagueAdapter = createSimulationSeasonAdapter({
  slotId: 'sim-slot-anchor-placeholder-name',
  state: {
    ...slotState,
    leagueName: '2025-26 NBA'
  }
});
assert.equal(
  anchorPlaceholderLeagueAdapter.getHubViewModel().leagueLabel,
  'Mixed Era Local League',
  'mixed-era leagues should not reuse a generic anchor-season title as the active local league name'
);

const cleanedSourceLabelAdapter = createSimulationSeasonAdapter({
  slotId: 'sim-slot-clean-source-labels',
  state: {
    ...slotState,
    sourceSeasons: {
      sourceSeasonLabels: ['1995-96 NBA Simulation Archive', '1986-87 NBA Simulation Archive', '2015-16 NBA Simulation Archive']
    }
  }
});
assert.deepStrictEqual(
  cleanedSourceLabelAdapter.getHubViewModel().summaryCards.map((card) => ({ label: card.label, value: card.value })),
  [
    { label: 'Record', value: '9-3' },
    { label: 'Reveal Window', value: 'Day 12 - Week 2' },
    { label: 'Team', value: 'LAL' },
    { label: 'Era Pool', value: '1995-96 + 2 more' }
  ],
  'simulation hub summary pills should trim archive and sport suffixes from source-season labels'
);

const unrelatedPowerupAdapter = createSimulationSeasonAdapter({
  slotId: 'sim-slot-powerups',
  state: {
    ...slotState,
    seasonState: {
      ...slotState.seasonState,
      powerupsByWeek: {
        2: {
          heat_check: {
            active: true,
            targetId: 23
          }
        }
      }
    }
  }
});

const unrelatedPowerupHub = unrelatedPowerupAdapter.getHubViewModel();
assert.equal(unrelatedPowerupHub.powerupCards[0]?.active, false, 'captain-mode hub cards should remain inactive when a different weekly powerup is active');
assert.equal(unrelatedPowerupHub.powerupCards[0]?.status, 'Ready to activate', 'captain-mode hub cards should stay actionable when only unrelated weekly powerups are active');

const activatedPowerupState = adapter.activateSimulationPowerup({
  powerupId: 'captain_mode',
  targetId: 34
});
assert.equal(
  activatedPowerupState.seasonState.powerupsByWeek[2].captain_mode.active,
  true,
  'adapter powerup actions should store the active weekly powerup state through the runtime contract'
);
assert.equal(
  activatedPowerupState.seasonState.powerupsByWeek[2].captain_mode.targetId,
  34,
  'adapter powerup actions should preserve the selected starter target'
);
assert.equal(
  adapter.getHubViewModel().powerupCards[0]?.actionLabel,
  'Update Captain',
  'adapter powerup cards should relabel the shared-shell action once Captain Mode is active'
);

const roster = adapter.getRosterViewModel();
assertSinglePlayerParityRosterVm(roster, 'nba simulation');
assert.equal(roster.statSourceLabel, 'Simulated', 'single-player replacement roster vm should label generated stats as simulated');
assert.equal(roster.lineup.length, 2);
assert.equal(roster.bench.length, 0);
assert.ok(roster.teamSummary, 'shared simulation roster vm should expose a teamSummary bridge object');
assert.equal(roster.teamSummary.watchListEnabled, true, 'simulation roster vm should expose a live watch-list affordance');
assert.equal(roster.teamSummary.settingsEnabled, true, 'simulation roster vm should expose live team-settings affordance');
roster.roster[0].name = 'Mutated Player';
assert.equal(adapter.getState().draftState.rostersByTeam.LAL[0].name, 'Michael Jordan');

const sparseNbaAdapter = createSimulationSeasonAdapter({
  slotId: 'sim-slot-sparse-nba',
  state: {
    ...slotState,
    draftState: {
      ...slotState.draftState,
      rostersByTeam: {
        ...slotState.draftState.rostersByTeam,
        LAL: [
          { id: 23, name: 'Michael Jordan', pos: 'SG', team: 'CHI', fp: 60.2 },
          { id: 34, name: 'Hakeem Olajuwon', pos: 'C', team: 'HOU', fp: 61.8 },
          { id: 50, name: 'Scottie Pippen', pos: 'SF', team: 'CHI', fp: 46.4 }
        ]
      }
    },
    seasonState: {
      ...slotState.seasonState,
      lineupIdsByTeam: { LAL: [23, 9999, 34] }
    }
  }
});

const sparseNbaRosterVm = sparseNbaAdapter.getRosterViewModel();
assert.deepStrictEqual(
  sparseNbaRosterVm.lineup.map((player) => player?.id ?? null),
  [23, null, 34],
  'nba simulation roster vm should preserve sparse lineup slot alignment instead of compacting unknown starters'
);
assert.equal(sparseNbaRosterVm.sections.starters.rows[0].player?.id, 23);
assert.equal(sparseNbaRosterVm.sections.starters.rows[1].player, null);
assert.equal(sparseNbaRosterVm.sections.starters.rows[2].player?.id, 34);

const positionedNbaAdapter = createSimulationSeasonAdapter({
  slotId: 'sim-slot-positioned-nba',
  state: {
    ...slotState,
    draftState: {
      ...slotState.draftState,
      rostersByTeam: {
        ...slotState.draftState.rostersByTeam,
        LAL: [
          { id: 34, name: 'Hakeem Olajuwon', pos: 'C', team: 'HOU', fp: 61.8 },
          { id: 55, name: 'Larry Nance', pos: 'PF', team: 'CLE', fp: 48.1 },
          { id: 9, name: 'Ron Harper', pos: 'PG', team: 'LAC', fp: 41.2 },
          { id: 13, name: 'Gerald Wilkins', pos: 'SG', team: 'NYK', fp: 39.4 },
          { id: 31, name: 'Sean Elliott', pos: 'SF', team: 'SAS', fp: 44.7 }
        ]
      }
    },
    seasonState: {
      ...slotState.seasonState,
      lineupIdsByTeam: { LAL: [34, 55, 9, 13, 31] }
    }
  }
});

const positionedNbaRosterVm = positionedNbaAdapter.getRosterViewModel();
assert.equal(positionedNbaRosterVm.validation.valid, false, 'nba roster vm should surface invalid starter-slot assignments');
assert.equal(positionedNbaRosterVm.lineupSlots.PG.player?.id, 34, 'nba roster vm should preserve the currently assigned player in each starter slot');
assert.equal(positionedNbaRosterVm.lineupSlots.PG.suggestedPlayerId, 9, 'nba roster vm should expose the slot-aware suggested guard for PG');
assert.equal(positionedNbaRosterVm.lineupSlots.SG.suggestedPlayerId, 13, 'nba roster vm should expose the slot-aware suggested guard for SG');
assert.equal(positionedNbaRosterVm.lineupSlots.SF.suggestedPlayerId, 31, 'nba roster vm should expose the slot-aware suggested wing for SF');
assert.equal(positionedNbaRosterVm.lineupSlots.PF.suggestedPlayerId, 55, 'nba roster vm should expose the slot-aware suggested forward for PF');
assert.equal(positionedNbaRosterVm.lineupSlots.C.suggestedPlayerId, 34, 'nba roster vm should expose the slot-aware suggested center for C');

const duplicateBenchAdapter = createSimulationSeasonAdapter({
  slotId: 'sim-slot-duplicate-bench',
  state: {
    ...slotState,
    draftState: {
      ...slotState.draftState,
      rostersByTeam: {
        ...slotState.draftState.rostersByTeam,
        LAL: [
          { id: 9, name: 'Ron Harper', pos: 'PG', team: 'LAC', fp: 41.2 },
          { id: 13, name: 'Gerald Wilkins', pos: 'SG', team: 'NYK', fp: 39.4 },
          { id: 31, name: 'Sean Elliott', pos: 'SF', team: 'SAS', fp: 44.7 },
          { id: 55, name: 'Larry Nance', pos: 'PF', team: 'CLE', fp: 48.1 },
          { id: 34, name: 'Hakeem Olajuwon', pos: 'C', team: 'HOU', fp: 61.8 },
          { id: 3, name: 'Mahmoud Abdul-Rauf', pos: 'PG', team: 'DEN', fp: 35.2, historicalPackLabel: '1992-93 NBA Simulation Archive' },
          { id: 103, name: 'Mahmoud Abdul-Rauf', pos: 'PG', team: 'DEN', fp: 34.8, historicalPackLabel: '1995-96 NBA Simulation Archive' },
          { id: 22, name: 'Nate McMillan', pos: 'SG', team: 'SEA', fp: 29.3 }
        ]
      }
    },
    seasonState: {
      ...slotState.seasonState,
      lineupIdsByTeam: { LAL: [9, 13, 31, 55, 34] }
    }
  }
});

const duplicateBenchRosterVm = duplicateBenchAdapter.getRosterViewModel();
assert.deepStrictEqual(
  duplicateBenchRosterVm.sections.bench.rows.map((row) => row.player?.id),
  [3, 103, 22],
  'nba simulation roster vm should preserve distinct mixed-era variants instead of collapsing players who share the same visible identity'
);
assert.equal(
  duplicateBenchRosterVm.sections.bench.rows[0]?.playerVariantLabel,
  '1992-93',
  'nba simulation roster vm should expose a compact source-season label for duplicate-name mixed-era variants'
);
assert.equal(
  duplicateBenchRosterVm.sections.bench.rows[1]?.playerVariantLabel,
  '1995-96',
  'nba simulation roster vm should distinguish later mixed-era variants with their own source-season label'
);
assert.equal(
  duplicateBenchRosterVm.sections.bench.rows[2]?.playerVariantLabel,
  null,
  'nba simulation roster vm should avoid adding variant labels when the player identity is unique on the roster'
);

const indexOnlyResultAdapter = createSimulationSeasonAdapter({
  slotId: 'sim-slot-index-only-results',
  state: {
    ...slotState,
    seasonState: {
      ...slotState.seasonState,
      completedGameLogs: [
        { day: 11, home: 0, away: 1, homeName: 'Los Angeles Lakers', awayName: 'Boston Celtics', homeScore: 112, awayScore: 108 }
      ]
    }
  }
});

const indexOnlyScheduleVm = indexOnlyResultAdapter.getScheduleViewModel();
assert.equal(indexOnlyScheduleVm.recentResults[0]?.homeAbbr, 'LAL', 'schedule vm should backfill home abbreviations from team indexes when game logs omit them');
assert.equal(indexOnlyScheduleVm.recentResults[0]?.awayAbbr, 'BOS', 'schedule vm should backfill away abbreviations from team indexes when game logs omit them');

const schedule = adapter.getScheduleViewModel();
assert.equal(schedule.title, 'Matchup / Results', 'nba schedule vm should use matchup-first page framing');
assert.equal(schedule.recentResults.length, 1);
assert.equal(schedule.recentResults[0].homeAbbr, 'LAL');
assert.equal(schedule.nextGame.opponentAbbr, 'BOS');
assert.equal(schedule.nextGame.day, 12);
assert.ok(Array.isArray(schedule.detailCards), 'schedule vm should expose detailCards for shared-shell parity');
assert.equal(schedule.hero?.title, 'Current Matchup', 'schedule vm should expose a matchup-room hero title');
assert.equal(schedule.hero?.controlledTeamAbbr, 'LAL', 'schedule vm hero should identify the controlled team');
assert.equal(schedule.hero?.opponentAbbr, 'BOS', 'schedule vm hero should identify the current opponent');
assert.equal(schedule.navigation?.mode, 'day', 'nba schedule vm should expose day-based matchup navigation');
assert.ok(Array.isArray(schedule.navigation?.items), 'schedule vm should expose concrete matchup navigation items');
assert.deepStrictEqual(
  Array.isArray(schedule.actionCards) ? schedule.actionCards.map((card) => card.label) : [],
  ['Open My Team', 'Open Waivers', 'Review Schedule'],
  'schedule vm should expose the shared matchup action cards needed by the renderer'
);
assert.equal(schedule.teamPanels?.mine?.teamAbbr, 'LAL', 'schedule vm should expose my team matchup panel');
assert.equal(schedule.teamPanels?.opponent?.teamAbbr, 'BOS', 'schedule vm should expose opponent matchup panel');
assert.equal(schedule.lineupSections?.mine?.[0]?.title, 'Starters', 'schedule vm should expose my lineup comparison sections');
assert.equal(schedule.lineupSections?.opponent?.[0]?.title, 'Starters', 'schedule vm should expose opponent lineup comparison sections');
schedule.nextGame.opponentName = 'Mutated Opponent';
assert.equal(adapter.getScheduleViewModel().nextGame.opponentName, 'Boston Celtics');

const waivers = adapter.getWaiverViewModel();
assert.ok(waivers.teamSummary, 'waiver vm should expose a teamSummary bridge object');
assert.equal(waivers.teamSummary.watchListEnabled, true, 'simulation waiver vm should keep watch-list navigation live');
assert.equal(waivers.teamSummary.settingsEnabled, true, 'simulation waiver vm should keep team settings live');
assert.equal(waivers.layoutMode, 'local-league-parity', 'waiver vm should opt into the shared local-league parity layout');
assert.ok(Array.isArray(waivers.pendingClaims), 'waiver vm should expose pending claims for the shared waiver desk');
assert.ok(Array.isArray(waivers.recentClaimResults), 'waiver vm should expose recent claim results for the shared waiver desk');
assert.ok(Array.isArray(waivers.sections?.available?.rows), 'waiver vm should expose available rows through shared-shell sections');
assert.ok(Array.isArray(waivers.sections?.pending?.rows), 'waiver vm should expose pending rows through shared-shell sections');
assert.match(waivers.claimTimingLabel || '', /next sim day|next sim week/i, 'waiver vm should expose when pending claims will process');
assert.equal(waivers.availablePlayers.length, 1);
assert.equal(waivers.availablePlayers[0].name, 'Scottie Pippen');
assert.equal(waivers.claimTimingLabel, 'Processing next sim day', 'nba waiver desks should expose day-based processing copy');
assert.equal(waivers.sections.available.rows[0]?.actionLabel, 'Submit Claim', 'available waiver rows should surface the shared-shell submit action copy');
assert.equal(waivers.sections.available.rows[0]?.dropNeeded, true, 'available waiver rows should flag when a drop is required');
assert.equal(waivers.sections.available.rows[0]?.suggestedDropPlayerId, 23, 'available waiver rows should suggest the likely drop candidate when the roster is full');
assert.match(waivers.sections.available.rows[0]?.consequenceLabel || '', /Drop required: Michael Jordan/, 'available waiver rows should explain the roster consequence with player context');
assert.equal(waivers.sections.pending.rows[0]?.playerName, 'Scottie Pippen', 'pending waiver rows should resolve the add target into player-facing copy');
assert.equal(waivers.sections.pending.rows[0]?.dropPlayerName, 'Michael Jordan', 'pending waiver rows should resolve the drop target into player-facing copy');
assert.match(waivers.sections.pending.rows[0]?.consequenceLabel || '', /Dropping Michael Jordan/, 'pending waiver rows should describe the pending roster consequence');
assert.equal(waivers.sections.recent.rows[0]?.playerName, 'Scottie Pippen', 'recent waiver rows should preserve the added player context');
assert.equal(waivers.sections.recent.rows[0]?.dropPlayerName, 'Hakeem Olajuwon', 'recent waiver rows should preserve the dropped player context');
assert.equal(waivers.sections.recent.rows[0]?.resolutionLabel, 'Claim processed successfully', 'recent waiver rows should expose shared-shell friendly result copy');

const waiverOrderAdapter = createSimulationSeasonAdapter({
  slotId: 'sim-slot-waiver-order',
  state: {
    ...slotState,
    seasonState: {
      ...slotState.seasonState,
      waiverOrder: ['BOS', 'LAL']
    }
  }
});
assert.equal(
  waiverOrderAdapter.getWaiverViewModel().teamSummary?.waiverOrderLabel,
  'Waiver Order (2 of 2)',
  'waiver vm should reflect the runtime-managed waiver order instead of falling back to standings'
);
const partialWaiverOrderAdapter = createSimulationSeasonAdapter({
  slotId: 'sim-slot-partial-waiver-order',
  state: {
    ...slotState,
    leagueShell: {
      ...slotState.leagueShell,
      teams: [
        ...slotState.leagueShell.teams,
        { abbr: 'CHI', name: 'Chicago Bulls', conference: 'East', division: 'Central' }
      ]
    },
    seasonState: {
      ...slotState.seasonState,
      waiverOrder: ['BOS', 'BOS']
    }
  }
});
assert.equal(
  partialWaiverOrderAdapter.getWaiverViewModel().teamSummary?.waiverOrderLabel,
  'Waiver Order (2 of 3)',
  'waiver vm should normalize duplicate and partial saved waiver orders before computing display priority'
);

const trades = adapter.getTradeViewModel();
assert.ok(Array.isArray(trades.sections?.partners?.rows), 'trade vm should expose partner rows through shared-shell sections');
assert.equal(trades.tradePartners.length, 1);
assert.equal(trades.tradePartners[0].abbr, 'BOS');
assert.equal(trades.outgoingRoster.length, 2);
assert.equal(trades.incomingRostersByTeam.BOS.length, 1);

const standings = adapter.getStandingsViewModel();
assert.ok(Array.isArray(standings.sections), 'standings vm should expose shared-shell sections');
assert.equal(standings.userRow.teamAbbr, 'LAL');
assert.equal(standings.rows.length, 2);

const lineupState = adapter.setLineup([34, 23]);
assert.deepStrictEqual(lineupState.seasonState.lineupIdsByTeam.LAL, [34, 23]);
assert.deepStrictEqual(adapter.getRosterViewModel().lineup.map((player) => player.id), [34, 23]);

const claimState = adapter.claimFreeAgent({
  teamAbbr: 'LAL',
  addPlayerId: 50,
  dropPlayerId: 23
});
assert.ok(claimState.draftState.rostersByTeam.LAL.some((player) => player.id === 50));
assert.ok(claimState.draftState.freeAgents.some((player) => player.id === 23));

const tradedState = adapter.applyTrade({
  fromTeamAbbr: 'LAL',
  toTeamAbbr: 'BOS',
  outgoingPlayerIds: [34],
  incomingPlayerIds: [30]
});
assert.ok(tradedState.draftState.rostersByTeam.LAL.some((player) => player.id === 30));
assert.ok(tradedState.draftState.rostersByTeam.BOS.some((player) => player.id === 34));

const postSimState = adapter.simulateNextDay();
assert.equal(postSimState.currentDay, 13);
assert.equal(postSimState.currentWeek, 2);
assert.equal(postSimState.seasonState.currentDay, 13);
assert.equal(postSimState.seasonState.currentWeek, 2);
assert.equal(postSimState.seasonState.completedGameLogs.length, 2);
assert.ok(postSimState.seasonState.scheduleByDay, 'simulateNextDay should persist canonical scheduleByDay');
assert.ok(
  postSimState.seasonState.standings.some((row) => row.teamAbbr === 'LAL' && (Number(row.w) + Number(row.l)) === 13),
  'simulateNextDay should advance standings totals for the controlled team'
);
const postSimSchedule = adapter.getScheduleViewModel();
assert.equal(postSimSchedule.nextGame.day, 13);
assert.equal(postSimSchedule.nextGame.opponentAbbr, 'BOS');

const pendingNbaWaiverAdvanceAdapter = createSimulationSeasonAdapter({
  slotId: 'sim-slot-waiver-advance-nba',
  state: slotState
});
const nbaWaiverAdvanceState = pendingNbaWaiverAdvanceAdapter.simulateNextDay();
assert.equal(
  nbaWaiverAdvanceState.seasonState.pendingWaiverClaims.length,
  0,
  'simulateNextDay should resolve pending NBA waiver claims on the next sim day'
);
assert.ok(
  nbaWaiverAdvanceState.draftState.rostersByTeam.LAL.some((player) => player.id === 50),
  'simulateNextDay should add awarded NBA waiver players to the controlled roster before the day advances'
);
assert.ok(
  nbaWaiverAdvanceState.draftState.freeAgents.some((player) => player.id === 23),
  'simulateNextDay should return the dropped NBA player to free agency when the claim resolves'
);
assert.equal(
  nbaWaiverAdvanceState.seasonState.recentWaiverResults[0]?.status,
  'approved',
  'simulateNextDay should record the resolved NBA waiver result in recent claim history'
);

const nextState = {
  simulationMode: 'nba_mixed_era_single_player_v1',
  leagueShell: {
    anchorSeasonLabel: '2025-26 NBA',
    teams: [
      { abbr: 'LAL', name: 'Los Angeles Lakers', conference: 'West', division: 'Pacific' },
      { abbr: 'BOS', name: 'Boston Celtics', conference: 'East', division: 'Atlantic' }
    ]
  },
  sourceSeasons: {
    sourceSeasonLabels: ['1986-87']
  },
  draftState: {
    controlledTeamAbbr: 'BOS',
    rostersByTeam: {
      LAL: [],
      BOS: [
        { id: 30, name: 'Stephen Curry', pos: 'PG', team: 'GSW', fp: 57.1 }
      ]
    },
    freeAgents: []
  },
  seasonState: {
    currentDay: 13,
    currentWeek: 3,
    lineupIdsByTeam: { BOS: [30] },
    standings: [
      { teamAbbr: 'LAL', conference: 'West', division: 'Pacific', w: 9, l: 3, pf: 1360, pa: 1288, streak: 'W3' },
      { teamAbbr: 'BOS', conference: 'East', division: 'Atlantic', w: 8, l: 5, pf: 1301, pa: 1276, streak: 'W1' }
    ],
    completedGameLogs: [],
    scheduleByDay: {
      13: [{ homeAbbr: 'LAL', awayAbbr: 'BOS' }],
      14: [{ homeAbbr: 'BOS', awayAbbr: 'LAL' }]
    },
    activityLog: []
  },
  postseasonState: {
    phase: 'regular_season',
    champion: null
  }
};

const replacedState = adapter.replaceState(nextState);
assert.equal(replacedState.draftState.controlledTeamAbbr, 'BOS');
assert.equal(adapter.getHubViewModel().controlledTeam.abbr, 'BOS');
assert.equal(adapter.getRosterViewModel().lineup.length, 1);
assert.equal(adapter.getScheduleViewModel().nextGame.day, 13);
assert.equal(adapter.getScheduleViewModel().nextGame.opponentAbbr, 'LAL');

const postseasonTransitionAdapter = createSimulationSeasonAdapter({
  slotId: 'sim-slot-postseason-transition',
  state: {
    simulationMode: 'nba_mixed_era_single_player_v1',
    leagueShell: {
      anchorSeasonLabel: '2025-26 NBA',
      teams: [
        { abbr: 'ATL', name: 'Atlanta Hawks', conference: 'East', division: 'Southeast' },
        { abbr: 'BOS', name: 'Boston Celtics', conference: 'East', division: 'Atlantic' },
        { abbr: 'CHI', name: 'Chicago Bulls', conference: 'East', division: 'Central' },
        { abbr: 'CLE', name: 'Cleveland Cavaliers', conference: 'East', division: 'Central' },
        { abbr: 'DET', name: 'Detroit Pistons', conference: 'East', division: 'Central' },
        { abbr: 'IND', name: 'Indiana Pacers', conference: 'East', division: 'Central' },
        { abbr: 'MIA', name: 'Miami Heat', conference: 'East', division: 'Southeast' },
        { abbr: 'MIL', name: 'Milwaukee Bucks', conference: 'East', division: 'Central' },
        { abbr: 'NYK', name: 'New York Knicks', conference: 'East', division: 'Atlantic' },
        { abbr: 'ORL', name: 'Orlando Magic', conference: 'East', division: 'Southeast' },
        { abbr: 'DAL', name: 'Dallas Mavericks', conference: 'West', division: 'Southwest' },
        { abbr: 'DEN', name: 'Denver Nuggets', conference: 'West', division: 'Northwest' },
        { abbr: 'GSW', name: 'Golden State Warriors', conference: 'West', division: 'Pacific' },
        { abbr: 'HOU', name: 'Houston Rockets', conference: 'West', division: 'Southwest' },
        { abbr: 'LAC', name: 'LA Clippers', conference: 'West', division: 'Pacific' },
        { abbr: 'LAL', name: 'Los Angeles Lakers', conference: 'West', division: 'Pacific' },
        { abbr: 'MEM', name: 'Memphis Grizzlies', conference: 'West', division: 'Southwest' },
        { abbr: 'MIN', name: 'Minnesota Timberwolves', conference: 'West', division: 'Northwest' },
        { abbr: 'OKC', name: 'Oklahoma City Thunder', conference: 'West', division: 'Northwest' },
        { abbr: 'PHX', name: 'Phoenix Suns', conference: 'West', division: 'Pacific' }
      ]
    },
    draftState: {
      controlledTeamAbbr: 'BOS',
      rostersByTeam: {
        ATL: [],
        BOS: [{ id: 1, name: 'Player 1', pos: 'PG', team: 'BOS', fp: 50 }],
        CHI: [],
        CLE: [],
        DET: [],
        IND: [],
        MIA: [],
        MIL: [],
        NYK: [],
        ORL: [],
        DAL: [],
        DEN: [],
        GSW: [],
        HOU: [],
        LAC: [],
        LAL: [],
        MEM: [],
        MIN: [],
        OKC: [],
        PHX: []
      },
      freeAgents: []
    },
    seasonState: {
      currentDay: 2,
      currentWeek: 1,
      lineupIdsByTeam: { BOS: [1] },
      standings: [
        { teamIdx: 0, teamAbbr: 'ATL', conference: 'East', division: 'Southeast', w: 60, l: 22, pf: 9200, pa: 8800 },
        { teamIdx: 1, teamAbbr: 'BOS', conference: 'East', division: 'Atlantic', w: 58, l: 24, pf: 9180, pa: 8820 },
        { teamIdx: 2, teamAbbr: 'CHI', conference: 'East', division: 'Central', w: 56, l: 26, pf: 9100, pa: 8850 },
        { teamIdx: 3, teamAbbr: 'CLE', conference: 'East', division: 'Central', w: 54, l: 28, pf: 9050, pa: 8900 },
        { teamIdx: 4, teamAbbr: 'DET', conference: 'East', division: 'Central', w: 52, l: 30, pf: 9000, pa: 8925 },
        { teamIdx: 5, teamAbbr: 'IND', conference: 'East', division: 'Central', w: 50, l: 32, pf: 8960, pa: 8940 },
        { teamIdx: 6, teamAbbr: 'MIA', conference: 'East', division: 'Southeast', w: 48, l: 34, pf: 8920, pa: 8960 },
        { teamIdx: 7, teamAbbr: 'MIL', conference: 'East', division: 'Central', w: 46, l: 36, pf: 8880, pa: 8990 },
        { teamIdx: 8, teamAbbr: 'NYK', conference: 'East', division: 'Atlantic', w: 44, l: 38, pf: 8840, pa: 9020 },
        { teamIdx: 9, teamAbbr: 'ORL', conference: 'East', division: 'Southeast', w: 42, l: 40, pf: 8800, pa: 9050 },
        { teamIdx: 10, teamAbbr: 'DAL', conference: 'West', division: 'Southwest', w: 61, l: 21, pf: 9250, pa: 8780 },
        { teamIdx: 11, teamAbbr: 'DEN', conference: 'West', division: 'Northwest', w: 59, l: 23, pf: 9210, pa: 8810 },
        { teamIdx: 12, teamAbbr: 'GSW', conference: 'West', division: 'Pacific', w: 57, l: 25, pf: 9160, pa: 8840 },
        { teamIdx: 13, teamAbbr: 'HOU', conference: 'West', division: 'Southwest', w: 55, l: 27, pf: 9110, pa: 8880 },
        { teamIdx: 14, teamAbbr: 'LAC', conference: 'West', division: 'Pacific', w: 53, l: 29, pf: 9070, pa: 8910 },
        { teamIdx: 15, teamAbbr: 'LAL', conference: 'West', division: 'Pacific', w: 51, l: 31, pf: 9030, pa: 8940 },
        { teamIdx: 16, teamAbbr: 'MEM', conference: 'West', division: 'Southwest', w: 49, l: 33, pf: 8990, pa: 8970 },
        { teamIdx: 17, teamAbbr: 'MIN', conference: 'West', division: 'Northwest', w: 47, l: 35, pf: 8950, pa: 9000 },
        { teamIdx: 18, teamAbbr: 'OKC', conference: 'West', division: 'Northwest', w: 45, l: 37, pf: 8910, pa: 9030 },
        { teamIdx: 19, teamAbbr: 'PHX', conference: 'West', division: 'Pacific', w: 43, l: 39, pf: 8870, pa: 9060 }
      ],
      completedGameLogs: [],
      scheduleByDay: {
        2: [{ homeAbbr: 'ATL', awayAbbr: 'BOS' }]
      },
      activityLog: []
    },
    postseasonState: {
      phase: 'regular_season',
      champion: null
    }
  }
});

const postseasonReadyState = postseasonTransitionAdapter.simulateNextDay();
assert.equal(
  postseasonReadyState.seasonState.currentDay,
  3,
  'simulateNextDay should still advance through the final scheduled day before entering postseason-ready state'
);
assert.equal(
  postseasonReadyState.postseasonState.phase,
  'postseason_ready',
  'simulateNextDay should transition the shared shell into postseason-ready state after the final scheduled day'
);
assert.ok(postseasonReadyState.postseasonState.playIn?.east, 'simulateNextDay should seed the East play-in snapshot when the regular season ends');
assert.ok(postseasonReadyState.postseasonState.playIn?.west, 'simulateNextDay should seed the West play-in snapshot when the regular season ends');
assert.ok(postseasonReadyState.postseasonState.bracket?.east, 'simulateNextDay should seed the East playoff bracket when the regular season ends');
assert.ok(postseasonReadyState.postseasonState.bracket?.west, 'simulateNextDay should seed the West playoff bracket when the regular season ends');
assert.deepStrictEqual(
  postseasonReadyState.postseasonState.playIn.east.sevenEight.map((entry) => entry.teamAbbr),
  ['MIA', 'MIL'],
  'postseason-ready state should preserve the East 7/8 play-in pairing'
);
assert.deepStrictEqual(
  postseasonReadyState.postseasonState.playIn.west.nineTen.map((entry) => entry.teamAbbr),
  ['OKC', 'PHX'],
  'postseason-ready state should preserve the West 9/10 play-in pairing'
);
assert.deepStrictEqual(
  postseasonTransitionAdapter.getNavItems().map((item) => item.id),
  ['hub', 'roster', 'matchup', 'waiver', 'trades', 'standings', 'playoffs'],
  'postseason-ready state should expose a playoffs navigation tab'
);
assert.equal(
  postseasonTransitionAdapter.getNavItems().find((item) => item.id === 'playoffs')?.label,
  'Playoffs',
  'postseason navigation should label the new postseason tab clearly'
);

const playInState = postseasonTransitionAdapter.simulateNextDay();
assert.equal(
  playInState.postseasonState.phase,
  'play_in',
  'simulateNextDay should advance postseason-ready state into the play-in day-by-day flow'
);
assert.equal(
  playInState.seasonState.currentDay,
  4,
  'simulateNextDay should advance the simulation day after resolving the first play-in slate'
);
assert.ok(
  playInState.postseasonState.currentDaySchedule.length > 0,
  'simulateNextDay should seed the next postseason game day after the opening play-in slate'
);
assert.equal(typeof postseasonTransitionAdapter.getPlayoffsViewModel, 'function');
assert.equal(
  postseasonTransitionAdapter.getPlayoffsViewModel().phase,
  'play_in',
  'adapter should expose a playoffs view model once postseason play begins'
);
assert.deepStrictEqual(
  playInState.seasonState.standings.map((row) => ({ teamAbbr: row.teamAbbr, w: row.w, l: row.l })),
  postseasonReadyState.seasonState.standings.map((row) => ({ teamAbbr: row.teamAbbr, w: row.w, l: row.l })),
  'simulateNextDay should keep regular-season standings frozen once postseason play begins'
);

let roundOneState = playInState;
for (let index = 0; index < 2; index += 1) {
  roundOneState = postseasonTransitionAdapter.simulateNextDay();
}
assert.equal(
  roundOneState.postseasonState.phase,
  'playoffs_round_1',
  'simulateNextDay should be able to advance from play-in results into the first playoff round'
);
assert.ok(
  Object.values(roundOneState.postseasonState.seriesById || {}).some((series) => series.round === 'playoffs_round_1'),
  'advancing out of the play-in should seed first-round playoff series'
);

const roundTwoSeedState = JSON.parse(JSON.stringify(roundOneState));
roundTwoSeedState.seasonState.currentDay = 20;
roundTwoSeedState.seasonState.currentWeek = 3;
roundTwoSeedState.postseasonState.phase = 'playoffs_round_1';
roundTwoSeedState.postseasonState.currentRound = 'playoffs_round_1';
roundTwoSeedState.postseasonState.currentDaySchedule = [];
const roundOneSeries = Object.values(roundTwoSeedState.postseasonState.seriesById)
  .filter((series) => series.round === 'playoffs_round_1')
  .sort((a, b) => String(a.id).localeCompare(String(b.id)));
roundOneSeries.forEach((series) => {
  series.winnerTeamAbbr = series.higherSeed.teamAbbr;
  series.higherSeedWins = 4;
  series.lowerSeedWins = 0;
  series.games = 4;
});

const roundTwoAdapter = createSimulationSeasonAdapter({
  slotId: 'sim-slot-round-two-transition',
  state: roundTwoSeedState
});
const roundTwoState = roundTwoAdapter.simulateNextDay();
assert.equal(
  roundTwoState.postseasonState.phase,
  'playoffs_round_2',
  'simulateNextDay should advance a completed first round into the second round'
);
assert.ok(
  roundTwoState.postseasonState.bracket?.east?.secondRound?.length > 0,
  'advancing into the second round should update the East bracket snapshot beyond Round 1'
);
assert.ok(
  roundTwoState.postseasonState.bracket?.west?.secondRound?.length > 0,
  'advancing into the second round should update the West bracket snapshot beyond Round 1'
);

const finalsCloseoutSeedState = JSON.parse(JSON.stringify(playInState));
finalsCloseoutSeedState.seasonState.currentDay = 30;
finalsCloseoutSeedState.seasonState.currentWeek = 5;
finalsCloseoutSeedState.draftState.rostersByTeam.BOS = [
  { id: 1, name: 'Player 1', pos: 'PG', team: 'BOS', fp: 50 },
  { id: 2, name: 'Player 2', pos: 'SG', team: 'BOS', fp: 49 },
  { id: 3, name: 'Player 3', pos: 'SF', team: 'BOS', fp: 48 },
  { id: 4, name: 'Player 4', pos: 'PF', team: 'BOS', fp: 47 },
  { id: 5, name: 'Player 5', pos: 'C', team: 'BOS', fp: 46 }
];
finalsCloseoutSeedState.seasonState.lineupIdsByTeam.BOS = [1, 2, 3, 4, 5];
finalsCloseoutSeedState.postseasonState = {
  ...finalsCloseoutSeedState.postseasonState,
  phase: 'finals',
  currentRound: 'finals',
  currentDaySchedule: [
    {
      day: 30,
      gameId: 'finals-game-4',
      seriesId: 'finals',
      homeAbbr: 'BOS',
      awayAbbr: 'DAL'
    }
  ],
  bracket: {
    east: finalsCloseoutSeedState.postseasonState.bracket?.east || null,
    west: finalsCloseoutSeedState.postseasonState.bracket?.west || null,
    finals: {
      higherSeed: { teamAbbr: 'BOS', seed: 1, conference: 'East' },
      lowerSeed: { teamAbbr: 'DAL', seed: 1, conference: 'West' }
    }
  },
  seriesById: {
    ...(finalsCloseoutSeedState.postseasonState.seriesById || {}),
    finals: {
      id: 'finals',
      conference: 'finals',
      round: 'finals',
      higherSeed: { teamAbbr: 'BOS', seed: 1, conference: 'East' },
      lowerSeed: { teamAbbr: 'DAL', seed: 1, conference: 'West' },
      targetWins: 4,
      higherSeedWins: 3,
      lowerSeedWins: 0
    }
  }
};

const finalsCloseoutAdapter = createSimulationSeasonAdapter({
  slotId: 'sim-slot-finals-closeout',
  state: finalsCloseoutSeedState
});

const completedFinalsState = finalsCloseoutAdapter.simulateNextDay();
assert.equal(
  completedFinalsState.postseasonState.phase,
  'completed',
  'simulateNextDay should finalize the postseason once the Finals close out'
);
assert.equal(
  completedFinalsState.postseasonState.champion?.teamAbbr,
  'BOS',
  'simulateNextDay should crown the winning Finals team as champion'
);
assert.equal(
  completedFinalsState.postseasonState.champion?.teamName,
  'Boston Celtics',
  'completed postseason state should include champion team naming metadata for renderers'
);
assert.equal(
  completedFinalsState.postseasonState.champion?.finalsGames,
  4,
  'completed postseason state should include Finals length metadata for renderers'
);
assert.equal(
  completedFinalsState.postseasonState.runnerUp?.teamAbbr,
  'DAL',
  'simulateNextDay should preserve the Finals loser as runner-up'
);
assert.equal(
  completedFinalsState.postseasonState.runnerUp?.teamName,
  'Dallas Mavericks',
  'completed postseason state should include runner-up team naming metadata for renderers'
);
assert.match(
  String(completedFinalsState.postseasonState.completedAt || ''),
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
  'completed postseason state should include an ISO-like completion timestamp'
);

const nfl2014LeagueShell = {
  anchorSeasonId: 'nfl_2014',
  anchorSeasonLabel: '2014 NFL',
  sport: 'nfl',
  teams: [
    { abbr: 'NE', name: 'New England Patriots', conference: 'AFC', division: 'East' },
    { abbr: 'DEN', name: 'Denver Broncos', conference: 'AFC', division: 'West' },
    { abbr: 'IND', name: 'Indianapolis Colts', conference: 'AFC', division: 'South' },
    { abbr: 'PIT', name: 'Pittsburgh Steelers', conference: 'AFC', division: 'North' },
    { abbr: 'CIN', name: 'Cincinnati Bengals', conference: 'AFC', division: 'North' },
    { abbr: 'BAL', name: 'Baltimore Ravens', conference: 'AFC', division: 'North' },
    { abbr: 'SEA', name: 'Seattle Seahawks', conference: 'NFC', division: 'West' },
    { abbr: 'GB', name: 'Green Bay Packers', conference: 'NFC', division: 'North' },
    { abbr: 'DAL', name: 'Dallas Cowboys', conference: 'NFC', division: 'East' },
    { abbr: 'CAR', name: 'Carolina Panthers', conference: 'NFC', division: 'South' },
    { abbr: 'ARI', name: 'Arizona Cardinals', conference: 'NFC', division: 'West' },
    { abbr: 'DET', name: 'Detroit Lions', conference: 'NFC', division: 'North' }
  ]
};

const nfl2014Teams = nfl2014LeagueShell.teams.map((team) => team.abbr);
const nfl2014EmptyRosters = Object.fromEntries(nfl2014Teams.map((teamAbbr) => [teamAbbr, []]));

function buildCompletedNflSeries(id, conference, round, higherSeed, lowerSeed, winnerTeamAbbr){
  return {
    id,
    conference,
    round,
    higherSeed,
    lowerSeed,
    targetWins: 1,
    higherSeedWins: String(winnerTeamAbbr || '').toUpperCase() === String(higherSeed.teamAbbr || '').toUpperCase() ? 1 : 0,
    lowerSeedWins: String(winnerTeamAbbr || '').toUpperCase() === String(lowerSeed.teamAbbr || '').toUpperCase() ? 1 : 0,
    winnerTeamAbbr,
    games: 1
  };
}

const seededNflPostseasonState = {
  simulationMode: 'nfl_mixed_era_single_player_v1',
  leagueShell: nfl2014LeagueShell,
  sourceSeasons: {
    sourceSeasonLabels: ['2014']
  },
  draftState: {
    controlledTeamAbbr: 'NE',
    rostersByTeam: {
      ...nfl2014EmptyRosters,
      NE: [
        { id: 101, name: 'Tom Brady', pos: 'QB', team: 'NE', fp: 33 },
        { id: 102, name: 'LeGarrette Blount', pos: 'RB', team: 'NE', fp: 21 },
        { id: 103, name: 'Jonas Gray', pos: 'RB', team: 'NE', fp: 16 },
        { id: 104, name: 'Julian Edelman', pos: 'WR', team: 'NE', fp: 25 },
        { id: 105, name: 'Brandon LaFell', pos: 'WR', team: 'NE', fp: 19 },
        { id: 106, name: 'Rob Gronkowski', pos: 'TE', team: 'NE', fp: 27 },
        { id: 107, name: 'Danny Amendola', pos: 'WR', team: 'NE', fp: 14 },
        { id: 108, name: 'Stephen Gostkowski', pos: 'K', team: 'NE', fp: 11 },
        { id: 109, name: 'Patriots DST', pos: 'DST', team: 'NE', fp: 13 }
      ]
    },
    freeAgents: []
  },
  seasonState: {
    currentDay: 19,
    currentWeek: 19,
    standings: nfl2014Teams.map((teamAbbr, index) => ({
      teamAbbr,
      conference: ['NE', 'DEN', 'IND', 'PIT', 'CIN', 'BAL'].includes(teamAbbr) ? 'AFC' : 'NFC',
      division: index < 6 ? 'A' : 'N',
      w: 0,
      l: 0,
      pf: 0,
      pa: 0
    })),
    scheduleByDay: {
      1: []
    },
    lineupIdsByTeam: {
      NE: [101, 102, 103, 104, 105, 106, 107, 108, 109]
    },
    lineupSlotsByTeam: {
      NE: {
        QB: 101,
        RB1: 102,
        RB2: 103,
        WR1: 104,
        WR2: 105,
        TE: 106,
        FLEX: 107,
        K: 108,
        DST: 109
      }
    },
    completedGameLogs: []
  },
  postseasonState: {
    phase: 'wild_card',
    currentRound: 'wild_card',
    currentDay: 19,
    playoffPicture: {
      afc: [
        { teamAbbr: 'NE', seed: 1 },
        { teamAbbr: 'DEN', seed: 2 },
        { teamAbbr: 'IND', seed: 3 },
        { teamAbbr: 'PIT', seed: 4 },
        { teamAbbr: 'CIN', seed: 5 },
        { teamAbbr: 'BAL', seed: 6 }
      ],
      nfc: [
        { teamAbbr: 'SEA', seed: 1 },
        { teamAbbr: 'GB', seed: 2 },
        { teamAbbr: 'DAL', seed: 3 },
        { teamAbbr: 'CAR', seed: 4 },
        { teamAbbr: 'ARI', seed: 5 },
        { teamAbbr: 'DET', seed: 6 }
      ]
    },
    currentWeekSchedule: [],
    currentDaySchedule: [],
    seriesById: {
      'AFC-wild-card-1': buildCompletedNflSeries(
        'AFC-wild-card-1',
        'AFC',
        'wild_card',
        { teamAbbr: 'IND', seed: 3, conference: 'AFC' },
        { teamAbbr: 'BAL', seed: 6, conference: 'AFC' },
        'BAL'
      ),
      'AFC-wild-card-2': buildCompletedNflSeries(
        'AFC-wild-card-2',
        'AFC',
        'wild_card',
        { teamAbbr: 'PIT', seed: 4, conference: 'AFC' },
        { teamAbbr: 'CIN', seed: 5, conference: 'AFC' },
        'PIT'
      ),
      'NFC-wild-card-1': buildCompletedNflSeries(
        'NFC-wild-card-1',
        'NFC',
        'wild_card',
        { teamAbbr: 'DAL', seed: 3, conference: 'NFC' },
        { teamAbbr: 'DET', seed: 6, conference: 'NFC' },
        'DAL'
      ),
      'NFC-wild-card-2': buildCompletedNflSeries(
        'NFC-wild-card-2',
        'NFC',
        'wild_card',
        { teamAbbr: 'CAR', seed: 4, conference: 'NFC' },
        { teamAbbr: 'ARI', seed: 5, conference: 'NFC' },
        'CAR'
      )
    }
  }
};

const nflPostseasonAdapter = createSimulationSeasonAdapter({
  slotId: 'sim-slot-nfl-postseason-completion',
  state: seededNflPostseasonState
});

const afterWildCard = nflPostseasonAdapter.simulateNextDay();
assert.equal(afterWildCard.postseasonState.phase, 'divisional');
assert.deepStrictEqual(
  afterWildCard.postseasonState.currentWeekSchedule.map((game) => `${game.homeAbbr}-${game.awayAbbr}`),
  ['NE-BAL', 'DEN-PIT', 'SEA-CAR', 'GB-DAL']
);

const divisionalResultsState = {
  ...afterWildCard,
  postseasonState: {
    ...afterWildCard.postseasonState,
    phase: 'divisional',
    currentRound: 'divisional',
    currentWeekSchedule: [],
    currentDaySchedule: [],
    seriesById: {
      'AFC-divisional-1': buildCompletedNflSeries(
        'AFC-divisional-1',
        'AFC',
        'divisional',
        { teamAbbr: 'NE', seed: 1, conference: 'AFC' },
        { teamAbbr: 'BAL', seed: 6, conference: 'AFC' },
        'NE'
      ),
      'AFC-divisional-2': buildCompletedNflSeries(
        'AFC-divisional-2',
        'AFC',
        'divisional',
        { teamAbbr: 'DEN', seed: 2, conference: 'AFC' },
        { teamAbbr: 'PIT', seed: 4, conference: 'AFC' },
        'DEN'
      ),
      'NFC-divisional-1': buildCompletedNflSeries(
        'NFC-divisional-1',
        'NFC',
        'divisional',
        { teamAbbr: 'SEA', seed: 1, conference: 'NFC' },
        { teamAbbr: 'CAR', seed: 4, conference: 'NFC' },
        'SEA'
      ),
      'NFC-divisional-2': buildCompletedNflSeries(
        'NFC-divisional-2',
        'NFC',
        'divisional',
        { teamAbbr: 'GB', seed: 2, conference: 'NFC' },
        { teamAbbr: 'DAL', seed: 3, conference: 'NFC' },
        'GB'
      )
    }
  }
};

const afterDivisionalRound = createSimulationSeasonAdapter({
  slotId: 'sim-slot-nfl-conference-completion',
  state: divisionalResultsState
}).simulateNextDay();

assert.equal(afterDivisionalRound.postseasonState.phase, 'conference_championship');
assert.deepStrictEqual(
  afterDivisionalRound.postseasonState.currentWeekSchedule.map((game) => `${game.homeAbbr}-${game.awayAbbr}`),
  ['NE-DEN', 'SEA-GB']
);

const conferenceChampionshipResultsState = {
  ...afterDivisionalRound,
  postseasonState: {
    ...afterDivisionalRound.postseasonState,
    phase: 'conference_championship',
    currentRound: 'conference_championship',
    currentWeekSchedule: [],
    currentDaySchedule: [],
    seriesById: {
      ...afterDivisionalRound.postseasonState.seriesById,
      'AFC-conference-championship': buildCompletedNflSeries(
        'AFC-conference-championship',
        'AFC',
        'conference_championship',
        { teamAbbr: 'NE', seed: 1, conference: 'AFC' },
        { teamAbbr: 'DEN', seed: 2, conference: 'AFC' },
        'NE'
      ),
      'NFC-conference-championship': buildCompletedNflSeries(
        'NFC-conference-championship',
        'NFC',
        'conference_championship',
        { teamAbbr: 'SEA', seed: 1, conference: 'NFC' },
        { teamAbbr: 'GB', seed: 2, conference: 'NFC' },
        'SEA'
      )
    }
  }
};

const afterConferenceTitles = createSimulationSeasonAdapter({
  slotId: 'sim-slot-nfl-super-bowl-completion',
  state: conferenceChampionshipResultsState
}).simulateNextDay();

assert.equal(afterConferenceTitles.postseasonState.phase, 'super_bowl');
assert.deepStrictEqual(
  afterConferenceTitles.postseasonState.currentWeekSchedule.map((game) => `${game.homeAbbr}-${game.awayAbbr}`),
  ['NE-SEA']
);

const superBowlResultsState = {
  ...afterConferenceTitles,
  postseasonState: {
    ...afterConferenceTitles.postseasonState,
    phase: 'super_bowl',
    currentRound: 'super_bowl',
    currentWeekSchedule: [],
    currentDaySchedule: [],
    seriesById: {
      ...afterConferenceTitles.postseasonState.seriesById,
      'super-bowl-xlix': buildCompletedNflSeries(
        'super-bowl-xlix',
        'league',
        'super_bowl',
        { teamAbbr: 'NE', seed: 1, conference: 'AFC' },
        { teamAbbr: 'SEA', seed: 1, conference: 'NFC' },
        'NE'
      )
    }
  }
};

const completedNflSeason = createSimulationSeasonAdapter({
  slotId: 'sim-slot-nfl-complete',
  state: superBowlResultsState
}).simulateNextDay();

assert.equal(completedNflSeason.postseasonState.phase, 'completed');
assert.equal(completedNflSeason.postseasonState.champion?.teamAbbr, 'NE');
assert.equal(completedNflSeason.postseasonState.runnerUp?.teamAbbr, 'SEA');

const completedFreezeDay = completedFinalsState.seasonState.currentDay;
const completedFreezeChampion = JSON.parse(JSON.stringify(completedFinalsState.postseasonState.champion));
const completedFreezeRunnerUp = JSON.parse(JSON.stringify(completedFinalsState.postseasonState.runnerUp));
const completedFreezeState = finalsCloseoutAdapter.simulateNextDay();
assert.equal(
  completedFreezeState.seasonState.currentDay,
  completedFreezeDay,
  'completed postseason state should not advance the simulation day on later simulateNextDay calls'
);
assert.deepStrictEqual(
  completedFreezeState.postseasonState.champion,
  completedFreezeChampion,
  'completed postseason state should keep champion details frozen on later simulateNextDay calls'
);
assert.deepStrictEqual(
  completedFreezeState.postseasonState.runnerUp,
  completedFreezeRunnerUp,
  'completed postseason state should keep runner-up details frozen on later simulateNextDay calls'
);

const postseasonDayCount = roundOneState.seasonState.currentDay;
const postseasonLogCount = roundOneState.seasonState.completedGameLogs.length;
const postseasonAlreadyOverState = postseasonTransitionAdapter.simulateNextDay();
assert.equal(
  postseasonAlreadyOverState.seasonState.currentDay,
  postseasonDayCount + 1,
  'simulateNextDay should keep advancing one postseason day at a time after play-in begins'
);
assert.equal(
  postseasonAlreadyOverState.seasonState.completedGameLogs.length > postseasonLogCount,
  true,
  'simulateNextDay should append postseason game logs once the postseason schedule is active'
);
assert.notEqual(
  postseasonAlreadyOverState.postseasonState.phase,
  'postseason_ready',
  'simulateNextDay should keep postseason progress moving after play-in starts'
);

const nflState = {
  simulationMode: 'nfl_mixed_era_single_player_v1',
  leagueShell: {
    anchorSeasonId: 'nfl_2014',
    anchorSeasonLabel: '2014 NFL',
    sport: 'nfl',
    rosterSize: 13,
    teams: [
      { abbr: 'DAL', name: 'Dallas Cowboys', conference: 'NFC', division: 'East' },
      { abbr: 'PHI', name: 'Philadelphia Eagles', conference: 'NFC', division: 'East' },
      { abbr: 'NE', name: 'New England Patriots', conference: 'AFC', division: 'East' },
      { abbr: 'SEA', name: 'Seattle Seahawks', conference: 'NFC', division: 'West' },
      { abbr: 'GB', name: 'Green Bay Packers', conference: 'NFC', division: 'North' },
      { abbr: 'TEN', name: 'Tennessee Titans', conference: 'AFC', division: 'South' }
    ]
  },
  sourceSeasons: {
    sourceSeasonLabels: ['2014']
  },
  draftState: {
    controlledTeamAbbr: 'DAL',
    rostersByTeam: {
      DAL: [
        { id: 9, name: 'Tony Romo', pos: 'QB', team: 'DAL', fp: 30 },
        { id: 29, name: 'DeMarco Murray', pos: 'RB', team: 'DAL', fp: 24 },
        { id: 44, name: 'Joseph Randle', pos: 'RB', team: 'DAL', fp: 16 },
        { id: 88, name: 'Dez Bryant', pos: 'WR', team: 'DAL', fp: 21 },
        { id: 84, name: 'Terrance Williams', pos: 'WR', team: 'DAL', fp: 15 },
        { id: 82, name: 'Jason Witten', pos: 'TE', team: 'DAL', fp: 14 },
        { id: 18, name: 'Cole Beasley', pos: 'WR', team: 'DAL', fp: 11 },
        { id: 5, name: 'Dan Bailey', pos: 'K', team: 'DAL', fp: 9 },
        { id: 9001, name: 'Dallas DST', pos: 'DST', team: 'DAL', fp: 11 },
        { id: 21, name: 'Lance Dunbar', pos: 'RB', team: 'DAL', fp: 10 }
      ],
      PHI: [],
      NE: [],
      SEA: [],
      GB: [],
      TEN: []
    },
    freeAgents: []
  },
  seasonState: {
    currentDay: 1,
    currentWeek: 1,
    lineupIdsByTeam: {
      DAL: [9, 29, 44, 88, 84, 82, 18, 5, 9001]
    },
    lineupSlotsByTeam: {
      DAL: {
        QB: 9,
        RB1: 29,
        RB2: 44,
        WR1: 88,
        WR2: 84,
        TE: 82,
        FLEX: 18,
        K: 5,
        DST: 9001
      }
    },
    scheduleByDay: {
      1: [
        { homeAbbr: 'SEA', awayAbbr: 'GB' },
        { homeAbbr: 'DAL', awayAbbr: 'SF' }
      ],
      2: [
        { homeAbbr: 'TEN', awayAbbr: 'DAL' }
      ]
    },
    standings: [
      { teamAbbr: 'DAL', conference: 'NFC', division: 'East', w: 0, l: 0, pf: 0, pa: 0 },
      { teamAbbr: 'PHI', conference: 'NFC', division: 'East', w: 0, l: 0, pf: 0, pa: 0 },
      { teamAbbr: 'NE', conference: 'AFC', division: 'East', w: 0, l: 0, pf: 0, pa: 0 },
      { teamAbbr: 'SEA', conference: 'NFC', division: 'West', w: 0, l: 0, pf: 0, pa: 0 },
      { teamAbbr: 'GB', conference: 'NFC', division: 'North', w: 0, l: 0, pf: 0, pa: 0 },
      { teamAbbr: 'TEN', conference: 'AFC', division: 'South', w: 0, l: 0, pf: 0, pa: 0 }
    ],
    completedGameLogs: [],
    activityLog: []
  },
  postseasonState: {
    phase: 'regular_season'
  }
};

assert.equal(isSupportedSimulationSeasonState(nflState), true);

const nflAdapter = createSimulationSeasonAdapter({
  slotId: 'nfl-slot-1',
  state: nflState
});

  assert.equal(nflAdapter.getModeId(), 'nfl_mixed_era_single_player_v1');
assert.equal(nflAdapter.getHubViewModel().leagueLabel, '2014 NFL Local League');
  assert.equal(nflAdapter.getHubViewModel().primaryAction.label, 'Sim Week 1');
  assert.equal(nflAdapter.getHubViewModel().primaryAction.shortLabel, 'Sim Week');
  assert.equal(nflAdapter.getScheduleViewModel().title, 'Weekly Matchup / Results', 'nfl schedule vm should use weekly matchup framing');
  assert.equal(nflAdapter.getScheduleViewModel().cycleLabel, 'Week 1');
assert.equal(nflAdapter.getWaiverViewModel().claimTimingLabel, 'Processing next sim week', 'nfl waiver desks should stay week-based');
assert.ok(Array.isArray(nflAdapter.getWaiverViewModel().sections?.recent?.rows), 'nfl waiver desks should keep shared-shell recent-result sections available');
assert.equal(
  nflAdapter.getScheduleViewModel().navigation?.mode,
  'week',
  'nfl schedule vm should stay week-based instead of inheriting nba-style daily navigation'
);
assert.doesNotMatch(
  JSON.stringify(nflAdapter.getScheduleViewModel().navigation || {}),
  /Tue|Wed|Thu/,
  'nfl schedule vm should not expose nba-style daily navigation labels'
);
assert.ok(Array.isArray(nflAdapter.getRosterViewModel().starterSlots));
assert.deepStrictEqual(
  nflAdapter.getRosterViewModel().starterSlots,
  ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DST'],
  'nfl simulation roster vm should expose normalized starter slots for the shared parity layout'
);
assert.deepStrictEqual(
  nflAdapter.getRosterViewModel().legacyStarterSlots,
  ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE', 'FLEX', 'K', 'DST'],
  'nfl simulation roster vm should keep the NFL slot-key order available for later adapter-backed interactions'
);
assert.ok(
  nflAdapter.getStandingsViewModel().sections.some((section) => section.title === 'NFC East'),
  'NFL standings view should expose division-grouped sections'
);

const packersNflState = {
  simulationMode: 'nfl_mixed_era_single_player_v1',
  leagueShell: {
    anchorSeasonId: 'nfl_2014',
    anchorSeasonLabel: '2014 NFL',
    sport: 'nfl',
    rosterSize: 9,
    teams: [
      { abbr: 'GB', name: 'Green Bay Packers', conference: 'NFC', division: 'North' },
      { abbr: 'CHI', name: 'Chicago Bears', conference: 'NFC', division: 'North' }
    ]
  },
  sourceSeasons: {
    sourceSeasonLabels: ['2014']
  },
  draftState: {
    controlledTeamAbbr: 'GB',
    rostersByTeam: {
      GB: [
        { id: 12, name: 'Aaron Rodgers', pos: 'QB', team: 'GB', fp: 31 },
        { id: 27, name: 'Eddie Lacy', pos: 'RB', team: 'GB', fp: 22 },
        { id: 44, name: 'James Starks', pos: 'RB', team: 'GB', fp: 18 },
        { id: 87, name: 'Jordy Nelson', pos: 'WR', team: 'GB', fp: 26 },
        { id: 18, name: 'Randall Cobb', pos: 'WR', team: 'GB', fp: 24 },
        { id: 89, name: 'Andrew Quarless', pos: 'TE', team: 'GB', fp: 13 },
        { id: 84, name: 'Davante Adams', pos: 'WR', team: 'GB', fp: 17 },
        { id: 2, name: 'Mason Crosby', pos: 'K', team: 'GB', fp: 10 },
        { id: 9001, name: 'Packers DST', pos: 'DST', team: 'GB', fp: 12 }
      ],
      CHI: []
    },
    freeAgents: []
  },
  seasonState: {
    currentDay: 1,
    currentWeek: 1,
    lineupIdsByTeam: {
      GB: [12, 27, 44, 87, 18, 89, 84, 2, 9001]
    },
    lineupSlotsByTeam: {
      GB: {
        QB: 12,
        RB1: 27,
        RB2: 44,
        WR1: 87,
        WR2: 18,
        TE: 89,
        FLEX: 84,
        K: 2,
        DST: 9001
      }
    },
    standings: [
      { teamAbbr: 'GB', conference: 'NFC', division: 'North', w: 0, l: 0, pf: 0, pa: 0 },
      { teamAbbr: 'CHI', conference: 'NFC', division: 'North', w: 0, l: 0, pf: 0, pa: 0 }
    ],
    completedGameLogs: [],
    activityLog: []
  },
  postseasonState: {
    phase: 'regular_season'
  }
};

const packersNflAdapter = createSimulationSeasonAdapter({
  slotId: 'nfl-slot-packers',
  state: packersNflState
});

const packersRosterVm = packersNflAdapter.getRosterViewModel();
assertSinglePlayerParityRosterVm(packersRosterVm, 'nfl simulation');
assert.equal(packersRosterVm.sport, 'nfl');
assert.deepStrictEqual(
  packersRosterVm.starterSlots,
  ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'K', 'DST'],
  'nfl simulation roster vm should preserve the shared football starter-slot order'
);
assert.deepStrictEqual(
  Object.keys(packersRosterVm.lineupSlots),
  ['QB', 'RB1', 'RB2', 'WR1', 'WR2', 'TE', 'FLEX', 'K', 'DST']
);
assert.equal(packersRosterVm.validation.valid, true);
assert.equal(packersRosterVm.readyLabel, 'Ready For Week');
assert.equal(packersRosterVm.recommendationSummary, 'Starting lineup is legal.');
assert.equal(packersRosterVm.lineupSlots.QB.player.name, 'Aaron Rodgers');
assert.equal(packersRosterVm.lineupSlots.TE.suggestedPlayerId, 89);
assert.equal(packersRosterVm.sections.starters.rows[1].slot, 'RB');
assert.equal(packersRosterVm.sections.starters.rows[1].slotKey, 'RB1');
assert.equal(packersRosterVm.sections.starters.rows[7].slotKey, 'K');
assert.equal(packersRosterVm.sections.starters.rows[8].slotKey, 'DST');
assert.equal(packersRosterVm.bench.length, 0);
assert.equal(packersRosterVm.sections.starters.title, 'Weekly Starters', 'nfl simulation starters should use football-friendly weekly labeling in the shared roster layout');
assert.equal(packersRosterVm.sections.bench.title, 'Bench / Depth', 'nfl simulation bench rows should render as depth-chart rows in the shared roster layout');
assert.ok(packersRosterVm.teamSummary, 'nfl simulation roster vm should expose a teamSummary bridge object');

const packersWaiverAdvanceAdapter = createSimulationSeasonAdapter({
  slotId: 'nfl-slot-packers-waiver-advance',
  state: {
    ...packersNflState,
    leagueShell: {
      ...packersNflState.leagueShell,
      rosterSize: 10
    },
    draftState: {
      ...packersNflState.draftState,
      rostersByTeam: {
        ...packersNflState.draftState.rostersByTeam,
        GB: packersNflState.draftState.rostersByTeam.GB.concat([
          { id: 33, name: 'John Kuhn', pos: 'RB', team: 'GB', fp: 6 }
        ])
      },
      freeAgents: [
        { id: 81, name: 'Richard Rodgers', pos: 'TE', team: 'GB', fp: 9 }
      ]
    },
    seasonState: {
      ...packersNflState.seasonState,
      scheduleByDay: {
        1: []
      },
      pendingWaiverClaims: [
        {
          claimId: 'nfl-claim-1',
          teamAbbr: 'GB',
          addPlayerId: 81,
          dropPlayerId: 33,
          status: 'pending',
          processOnAdvance: 'week'
        }
      ],
      recentWaiverResults: []
    }
  }
});
const packersWaiverAdvanceState = packersWaiverAdvanceAdapter.simulateNextDay();
assert.equal(
  packersWaiverAdvanceState.seasonState.pendingWaiverClaims.length,
  0,
  'simulateNextDay should resolve pending NFL waiver claims on the next sim week'
);
assert.ok(
  packersWaiverAdvanceState.draftState.rostersByTeam.GB.some((player) => player.id === 81),
  'simulateNextDay should add awarded NFL waiver players to the controlled roster before the week advances'
);
assert.ok(
  packersWaiverAdvanceState.draftState.freeAgents.some((player) => player.id === 33),
  'simulateNextDay should return the dropped NFL depth player to free agency when the claim resolves'
);
assert.equal(
  packersWaiverAdvanceState.seasonState.recentWaiverResults[0]?.status,
  'approved',
  'simulateNextDay should record the resolved NFL waiver result in recent claim history'
);

const legacyPackersLineupState = {
  simulationMode: 'nfl_mixed_era_single_player_v1',
  leagueShell: packersNflState.leagueShell,
  sourceSeasons: packersNflState.sourceSeasons,
  draftState: packersNflState.draftState,
  seasonState: {
    ...packersNflState.seasonState,
    lineupIdsByTeam: {
      GB: [12, 27, 44, 87, 18, 89, 84, 2, 9001]
    },
    lineupSlotsByTeam: undefined
  },
  postseasonState: packersNflState.postseasonState
};

const legacyPackersLineupAdapter = createSimulationSeasonAdapter({
  slotId: 'nfl-slot-legacy-packers',
  state: legacyPackersLineupState
});

const legacyPackersRosterVm = legacyPackersLineupAdapter.getRosterViewModel();
assert.equal(legacyPackersRosterVm.validation.valid, true);
assert.equal(legacyPackersRosterVm.lineupSlots.K.playerId, 2);
assert.equal(legacyPackersRosterVm.lineupSlots.DST.playerId, 9001);
assert.equal(legacyPackersRosterVm.lineupSlots.K.player.name, 'Mason Crosby');
assert.equal(legacyPackersRosterVm.lineupSlots.DST.player.name, 'Packers DST');

const emptyNflLineupState = {
  simulationMode: 'nfl_mixed_era_single_player_v1',
  leagueShell: {
    anchorSeasonId: 'nfl_2014',
    anchorSeasonLabel: '2014 NFL',
    sport: 'nfl',
    rosterSize: 9,
    teams: [
      { abbr: 'GB', name: 'Green Bay Packers', conference: 'NFC', division: 'North' },
      { abbr: 'CHI', name: 'Chicago Bears', conference: 'NFC', division: 'North' }
    ]
  },
  sourceSeasons: {
    sourceSeasonLabels: ['2014']
  },
  draftState: {
    controlledTeamAbbr: 'GB',
    rostersByTeam: {
      GB: [
        { id: 12, name: 'Aaron Rodgers', pos: 'QB', team: 'GB', fp: 31 },
        { id: 27, name: 'Eddie Lacy', pos: 'RB', team: 'GB', fp: 22 },
        { id: 44, name: 'James Starks', pos: 'RB', team: 'GB', fp: 18 },
        { id: 87, name: 'Jordy Nelson', pos: 'WR', team: 'GB', fp: 26 },
        { id: 18, name: 'Randall Cobb', pos: 'WR', team: 'GB', fp: 24 },
        { id: 89, name: 'Andrew Quarless', pos: 'TE', team: 'GB', fp: 13 },
        { id: 84, name: 'Davante Adams', pos: 'WR', team: 'GB', fp: 17 },
        { id: 2, name: 'Mason Crosby', pos: 'K', team: 'GB', fp: 10 },
        { id: 9001, name: 'Packers DST', pos: 'DST', team: 'GB', fp: 12 }
      ],
      CHI: []
    },
    freeAgents: []
  },
  seasonState: {
    currentDay: 1,
    currentWeek: 1,
    lineupIdsByTeam: {},
    standings: [
      { teamAbbr: 'GB', conference: 'NFC', division: 'North', w: 0, l: 0, pf: 0, pa: 0 },
      { teamAbbr: 'CHI', conference: 'NFC', division: 'North', w: 0, l: 0, pf: 0, pa: 0 }
    ],
    completedGameLogs: [],
    activityLog: []
  },
  postseasonState: {
    phase: 'regular_season'
  }
};

const emptyNflLineupAdapter = createSimulationSeasonAdapter({
  slotId: 'nfl-slot-empty-lineup',
  state: emptyNflLineupState
});

  assert.equal(emptyNflLineupAdapter.getHubViewModel().primaryAction.id, 'fix-lineup');
  assert.equal(emptyNflLineupAdapter.getHubViewModel().primaryAction.label, 'Fix Lineup');

const emptyNflPostseasonAdapter = createSimulationSeasonAdapter({
  slotId: 'nfl-slot-empty-postseason',
  state: {
    ...emptyNflLineupState,
    postseasonState: {
      phase: 'wild_card'
    }
  }
});

  assert.equal(emptyNflPostseasonAdapter.getHubViewModel().primaryAction.id, 'fix-lineup');
  assert.equal(emptyNflPostseasonAdapter.getHubViewModel().primaryAction.label, 'Fix Lineup');
const blockedPostseasonState = emptyNflPostseasonAdapter.simulateNextDay();
assert.equal(blockedPostseasonState.postseasonState.phase, 'wild_card');
assert.equal(blockedPostseasonState.seasonState.currentWeek, 1);
assert.equal(blockedPostseasonState.seasonState.currentDay, 1);
assert.equal(blockedPostseasonState.seasonState.activityLog[0].type, 'lineup-warning');
assert.match(blockedPostseasonState.seasonState.activityLog[0].title, /must fix/i);

const invalidPackersNflState = {
  ...packersNflState,
  leagueShell: {
    ...packersNflState.leagueShell,
    rosterSize: 10
  },
  draftState: {
    ...packersNflState.draftState,
    rostersByTeam: {
      ...packersNflState.draftState.rostersByTeam,
      GB: packersNflState.draftState.rostersByTeam.GB.concat([
        { id: 33, name: 'John Kuhn', pos: 'RB', team: 'GB', fp: 6 }
      ])
    },
    freeAgents: [
      { id: 81, name: 'Richard Rodgers', pos: 'TE', team: 'GB', fp: 9 }
    ]
  },
  seasonState: {
    ...packersNflState.seasonState,
    lineupIdsByTeam: {
      GB: [12, 27, 44, 87, 18, 84, 2, 9001]
    },
    lineupSlotsByTeam: {
      GB: {
        QB: 12,
        RB1: 27,
        RB2: 44,
        WR1: 87,
        WR2: 18,
        TE: null,
        FLEX: 84,
        K: 2,
        DST: 9001
      }
    },
    pendingWaiverClaims: [
      {
        claimId: 'nfl-invalid-claim',
        teamAbbr: 'GB',
        addPlayerId: 81,
        dropPlayerId: 33,
        status: 'pending',
        processOnAdvance: 'week'
      }
    ],
    recentWaiverResults: []
  }
};

const invalidPackersNflAdapter = createSimulationSeasonAdapter({
  slotId: 'nfl-slot-packers-invalid',
  state: invalidPackersNflState
});

assert.equal(invalidPackersNflAdapter.getHubViewModel().primaryAction.id, 'fix-lineup');
assert.equal(invalidPackersNflAdapter.getHubViewModel().primaryAction.label, 'Fix Lineup');
const invalidPackersNextState = invalidPackersNflAdapter.simulateNextDay();
assert.equal(invalidPackersNextState.seasonState.currentWeek, 1);
assert.equal(invalidPackersNextState.seasonState.activityLog[0].type, 'lineup-warning');
assert.match(invalidPackersNextState.seasonState.activityLog[0].title, /must fix/i);
assert.equal(
  invalidPackersNextState.seasonState.pendingWaiverClaims.length,
  1,
  'simulateNextDay should leave pending NFL waiver claims untouched when the lineup gate blocks the week'
);
assert.ok(
  !invalidPackersNextState.draftState.rostersByTeam.GB.some((player) => player.id === 81),
  'simulateNextDay should not award NFL waiver claims when the week is blocked by an invalid lineup'
);

const legacyPackersLineupOnlyState = {
  ...packersNflState,
  seasonState: {
    ...packersNflState.seasonState,
    currentDay: 1,
    currentWeek: 1,
    lineupIdsByTeam: {
      GB: [12, 27, 44, 87, 18, 89, 84, 2, 9001]
    },
    completedGameLogs: [],
    activityLog: []
  }
};
delete legacyPackersLineupOnlyState.seasonState.lineupSlotsByTeam;

const legacyPackersLineupOnlyAdapter = createSimulationSeasonAdapter({
  slotId: 'nfl-slot-packers-legacy-lineup-only',
  state: legacyPackersLineupOnlyState
});

const legacyPackersLineupOnlyNextState = legacyPackersLineupOnlyAdapter.simulateNextDay();
assert.deepStrictEqual(
  legacyPackersLineupOnlyNextState.seasonState.lineupSlotsByTeam.GB,
  {
    QB: 12,
    RB1: 27,
    RB2: 44,
    WR1: 87,
    WR2: 18,
    TE: 89,
    FLEX: 84,
    K: 2,
    DST: 9001
  },
  'simulateNextDay should persist a normalized NFL slot map for legacy lineup-id saves before running the week'
);

const nflLegacyWashingtonState = {
  simulationMode: 'nfl_mixed_era_single_player_v1',
  leagueShell: {
    anchorSeasonId: 'nfl_2014',
    anchorSeasonLabel: '2014 NFL',
    sport: 'nfl',
    rosterSize: 13,
    teams: [
      { abbr: 'WAS', name: 'Washington Redskins', conference: 'NFC', division: 'East' },
      { abbr: 'DAL', name: 'Dallas Cowboys', conference: 'NFC', division: 'East' }
    ]
  },
  sourceSeasons: {
    sourceSeasonLabels: ['2014']
  },
  draftState: {
    controlledTeamAbbr: 'WAS',
    rostersByTeam: {
      WAS: [
        { id: 50, name: 'Robert Griffin III', pos: 'QB', team: 'WAS', fp: 24 },
        { id: 51, name: 'Alfred Morris', pos: 'RB', team: 'WAS', fp: 19 },
        { id: 52, name: 'Roy Helu Jr.', pos: 'RB', team: 'WAS', fp: 13 },
        { id: 53, name: 'Pierre Garcon', pos: 'WR', team: 'WAS', fp: 18 },
        { id: 54, name: 'DeSean Jackson', pos: 'WR', team: 'WAS', fp: 21 },
        { id: 55, name: 'Jordan Reed', pos: 'TE', team: 'WAS', fp: 15 },
        { id: 56, name: 'Andre Roberts', pos: 'WR', team: 'WAS', fp: 11 },
        { id: 57, name: 'Kai Forbath', pos: 'K', team: 'WAS', fp: 9 },
        { id: 58, name: 'Washington DST', pos: 'DST', team: 'WAS', fp: 10 }
      ],
      DAL: []
    },
    freeAgents: []
  },
  seasonState: {
    currentDay: 1,
    currentWeek: 1,
    lineupIdsByTeam: {
      WAS: [50, 51, 52, 53, 54, 55, 56, 57, 58]
    },
    lineupSlotsByTeam: {
      WAS: {
        QB: 50,
        RB1: 51,
        RB2: 52,
        WR1: 53,
        WR2: 54,
        TE: 55,
        FLEX: 56,
        K: 57,
        DST: 58
      }
    },
    standings: [
      { teamAbbr: 'WAS', conference: 'NFC', division: 'East', w: 0, l: 0, pf: 0, pa: 0 },
      { teamAbbr: 'DAL', conference: 'NFC', division: 'East', w: 0, l: 0, pf: 0, pa: 0 }
    ],
    completedGameLogs: [],
    scheduleByDay: {
      1: [
        { homeAbbr: 'WSH', awayAbbr: 'DAL' }
      ]
    },
    activityLog: []
  },
  postseasonState: {
    phase: 'regular_season'
  }
};

const nflLegacyWashingtonAdapter = createSimulationSeasonAdapter({
  slotId: 'nfl-slot-legacy-washington',
  state: nflLegacyWashingtonState
});

assert.equal(
  nflLegacyWashingtonAdapter.getScheduleViewModel().nextGame?.opponentAbbr,
  'DAL',
  'NFL schedule view should canonicalize persisted WSH games to WAS'
);
assert.equal(
  nflLegacyWashingtonAdapter.getScheduleViewModel().scheduleByDay[1][0].homeAbbr,
  'WAS',
  'NFL schedule view should heal persisted schedule entries against the current shell'
);

const nflLegacyWashingtonNextState = nflLegacyWashingtonAdapter.simulateNextDay();
assert.equal(
  nflLegacyWashingtonNextState.seasonState.completedGameLogs.length,
  1,
  'simulateNextDay should advance a healed NFL week instead of dropping the game'
);
assert.equal(nflLegacyWashingtonNextState.seasonState.scheduleByDay[1][0].homeAbbr, 'WAS');

const nflPostseasonReadyAdapter = createSimulationSeasonAdapter({
  slotId: 'nfl-slot-postseason-ready',
  state: {
    ...nflState,
    postseasonState: {
      phase: 'postseason_ready'
    }
  }
});

assert.equal(
  nflPostseasonReadyAdapter.getHubViewModel().primaryAction.label,
  'Review Playoffs',
  'NFL hubs should stop advertising Sim Week once the regular season is complete'
);

const nflPlayoffPictureAdapter = createSimulationSeasonAdapter({
  slotId: 'nfl-slot-playoff-picture',
  state: {
    simulationMode: 'nfl_mixed_era_single_player_v1',
    leagueShell: {
      anchorSeasonId: 'nfl_2014',
      anchorSeasonLabel: '2014 NFL',
      sport: 'nfl',
      teams: [
        { abbr: 'BUF', name: 'Buffalo Bills', conference: 'AFC', division: 'East' },
        { abbr: 'NE', name: 'New England Patriots', conference: 'AFC', division: 'East' },
        { abbr: 'IND', name: 'Indianapolis Colts', conference: 'AFC', division: 'South' },
        { abbr: 'PIT', name: 'Pittsburgh Steelers', conference: 'AFC', division: 'North' },
        { abbr: 'BAL', name: 'Baltimore Ravens', conference: 'AFC', division: 'North' },
        { abbr: 'DEN', name: 'Denver Broncos', conference: 'AFC', division: 'West' }
      ]
    },
    sourceSeasons: { sourceSeasonLabels: ['2014'] },
  draftState: {
    controlledTeamAbbr: 'BUF',
    rostersByTeam: {
      BUF: [
        { id: 201, name: 'Tyrod Taylor', pos: 'QB', team: 'BUF', fp: 28 },
        { id: 202, name: 'Fred Jackson', pos: 'RB', team: 'BUF', fp: 20 },
        { id: 203, name: 'C.J. Spiller', pos: 'RB', team: 'BUF', fp: 18 },
        { id: 204, name: 'Sammy Watkins', pos: 'WR', team: 'BUF', fp: 23 },
        { id: 205, name: 'Robert Woods', pos: 'WR', team: 'BUF', fp: 17 },
        { id: 206, name: 'Scott Chandler', pos: 'TE', team: 'BUF', fp: 12 },
        { id: 207, name: 'Chris Hogan', pos: 'WR', team: 'BUF', fp: 11 },
        { id: 208, name: 'Dan Carpenter', pos: 'K', team: 'BUF', fp: 9 },
        { id: 209, name: 'Bills DST', pos: 'DST', team: 'BUF', fp: 10 }
      ],
      NE: [], IND: [], PIT: [], BAL: [], DEN: []
    },
    freeAgents: []
  },
  seasonState: {
      currentDay: 2,
      currentWeek: 2,
      scheduleByDay: { 1: [] },
      lineupIdsByTeam: {
        BUF: [201, 202, 203, 204, 205, 206, 207, 208, 209]
      },
      lineupSlotsByTeam: {
        BUF: {
          QB: 201,
          RB1: 202,
          RB2: 203,
          WR1: 204,
          WR2: 205,
          TE: 206,
          FLEX: 207,
          K: 208,
          DST: 209
        }
      },
      standings: [
        { teamAbbr: 'BUF', conference: 'AFC', division: 'East', w: 12, l: 4, pf: 410, pa: 300 },
        { teamAbbr: 'NE', conference: 'AFC', division: 'East', w: 11, l: 5, pf: 390, pa: 310 },
        { teamAbbr: 'IND', conference: 'AFC', division: 'South', w: 9, l: 7, pf: 355, pa: 330 },
        { teamAbbr: 'PIT', conference: 'AFC', division: 'North', w: 10, l: 6, pf: 370, pa: 320, divisionLeader: true },
        { teamAbbr: 'BAL', conference: 'AFC', division: 'North', w: 11, l: 5, pf: 365, pa: 315, divisionLeader: false },
        { teamAbbr: 'DEN', conference: 'AFC', division: 'West', w: 8, l: 8, pf: 340, pa: 338 }
      ],
      completedGameLogs: [],
      activityLog: []
    },
    postseasonState: { phase: 'regular_season' }
  }
});

const nflPlayoffPictureState = nflPlayoffPictureAdapter.simulateNextDay();
assert.deepStrictEqual(
  nflPlayoffPictureState.postseasonState.playoffPicture.afc.slice(0, 6).map((row) => row.teamAbbr),
  ['BUF', 'PIT', 'IND', 'DEN', 'NE', 'BAL'],
  'nfl playoff picture should seed division winners ahead of wild cards even when a wild card has a better record'
);

const nfl2014PostseasonAdapter = createSimulationSeasonAdapter({
  slotId: 'nfl-slot-2014-postseason',
  state: {
    simulationMode: 'nfl_mixed_era_single_player_v1',
    leagueShell: {
      anchorSeasonId: 'nfl_2014',
      anchorSeasonLabel: '2014 NFL',
      sport: 'nfl',
      teams: [
        { abbr: 'NE', name: 'New England Patriots', conference: 'AFC', division: 'East' },
        { abbr: 'DEN', name: 'Denver Broncos', conference: 'AFC', division: 'West' },
        { abbr: 'IND', name: 'Indianapolis Colts', conference: 'AFC', division: 'South' },
        { abbr: 'PIT', name: 'Pittsburgh Steelers', conference: 'AFC', division: 'North' },
        { abbr: 'CIN', name: 'Cincinnati Bengals', conference: 'AFC', division: 'North' },
        { abbr: 'BAL', name: 'Baltimore Ravens', conference: 'AFC', division: 'North' },
        { abbr: 'SEA', name: 'Seattle Seahawks', conference: 'NFC', division: 'West' },
        { abbr: 'GB', name: 'Green Bay Packers', conference: 'NFC', division: 'North' },
        { abbr: 'DAL', name: 'Dallas Cowboys', conference: 'NFC', division: 'East' },
        { abbr: 'CAR', name: 'Carolina Panthers', conference: 'NFC', division: 'South' },
        { abbr: 'ARI', name: 'Arizona Cardinals', conference: 'NFC', division: 'West' },
        { abbr: 'DET', name: 'Detroit Lions', conference: 'NFC', division: 'North' }
      ]
    },
    sourceSeasons: { sourceSeasonLabels: ['2014'] },
  draftState: {
    controlledTeamAbbr: 'NE',
    rostersByTeam: {
      NE: [
        { id: 301, name: 'Tom Brady', pos: 'QB', team: 'NE', fp: 33 },
        { id: 302, name: 'LeGarrette Blount', pos: 'RB', team: 'NE', fp: 21 },
        { id: 303, name: 'Jonas Gray', pos: 'RB', team: 'NE', fp: 16 },
        { id: 304, name: 'Julian Edelman', pos: 'WR', team: 'NE', fp: 25 },
        { id: 305, name: 'Brandon LaFell', pos: 'WR', team: 'NE', fp: 19 },
        { id: 306, name: 'Rob Gronkowski', pos: 'TE', team: 'NE', fp: 27 },
        { id: 307, name: 'Danny Amendola', pos: 'WR', team: 'NE', fp: 14 },
        { id: 308, name: 'Stephen Gostkowski', pos: 'K', team: 'NE', fp: 11 },
        { id: 309, name: 'Patriots DST', pos: 'DST', team: 'NE', fp: 13 }
      ],
      DEN: [], IND: [], PIT: [], CIN: [], BAL: [],
      SEA: [], GB: [], DAL: [], CAR: [], ARI: [], DET: []
    },
    freeAgents: []
  },
  seasonState: {
      currentDay: 18,
      currentWeek: 18,
      scheduleByDay: { 1: [] },
      lineupIdsByTeam: {
        NE: [301, 302, 303, 304, 305, 306, 307, 308, 309]
      },
      lineupSlotsByTeam: {
        NE: {
          QB: 301,
          RB1: 302,
          RB2: 303,
          WR1: 304,
          WR2: 305,
          TE: 306,
          FLEX: 307,
          K: 308,
          DST: 309
        }
      },
      standings: [
        { teamAbbr: 'NE', conference: 'AFC', division: 'East', w: 12, l: 4, pf: 468, pa: 313 },
        { teamAbbr: 'DEN', conference: 'AFC', division: 'West', w: 12, l: 4, pf: 482, pa: 354 },
        { teamAbbr: 'IND', conference: 'AFC', division: 'South', w: 11, l: 5, pf: 458, pa: 357 },
        { teamAbbr: 'PIT', conference: 'AFC', division: 'North', w: 11, l: 5, pf: 432, pa: 348 },
        { teamAbbr: 'CIN', conference: 'AFC', division: 'North', w: 10, l: 5, pf: 365, pa: 344 },
        { teamAbbr: 'BAL', conference: 'AFC', division: 'North', w: 10, l: 6, pf: 409, pa: 302 },
        { teamAbbr: 'SEA', conference: 'NFC', division: 'West', w: 12, l: 4, pf: 412, pa: 254 },
        { teamAbbr: 'GB', conference: 'NFC', division: 'North', w: 12, l: 4, pf: 486, pa: 301 },
        { teamAbbr: 'DAL', conference: 'NFC', division: 'East', w: 12, l: 4, pf: 467, pa: 352 },
        { teamAbbr: 'CAR', conference: 'NFC', division: 'South', w: 7, l: 8, pf: 339, pa: 376 },
        { teamAbbr: 'ARI', conference: 'NFC', division: 'West', w: 11, l: 5, pf: 358, pa: 313 },
        { teamAbbr: 'DET', conference: 'NFC', division: 'North', w: 11, l: 5, pf: 326, pa: 262 }
      ],
      completedGameLogs: [],
      activityLog: []
    },
    postseasonState: { phase: 'regular_season' }
  }
});

const nfl2014PostseasonState = nfl2014PostseasonAdapter.simulateNextDay();
assert.equal(
  nfl2014PostseasonState.postseasonState.phase,
  'wild_card',
  'nfl postseason seeding should enter the exact 2014 wild-card phase after the regular season ends'
);
const seededNflPostseasonAdapter = createSimulationSeasonAdapter({
  slotId: 'nfl-slot-2014-seeded',
  state: nfl2014PostseasonState
});
assert.equal(
  seededNflPostseasonAdapter.getHubViewModel().primaryAction?.id,
  'sim-day',
  'active NFL postseason phases should keep the shared-shell CTA wired to Sim Week'
);
assert.equal(
  seededNflPostseasonAdapter.getScheduleViewModel().cycleLabel,
  'Wild Card Weekend',
  'active NFL postseason schedule labels should use playoff phase copy instead of regular-season week math'
);
assert.deepStrictEqual(
  nfl2014PostseasonState.postseasonState.playoffPicture.afc.map((row) => row.teamAbbr),
  ['NE', 'DEN', 'IND', 'PIT', 'CIN', 'BAL'],
  'nfl postseason seeding should preserve the exact 2014 AFC field order'
);
assert.deepStrictEqual(
  nfl2014PostseasonState.postseasonState.playoffPicture.nfc.map((row) => row.teamAbbr),
  ['SEA', 'GB', 'DAL', 'CAR', 'ARI', 'DET'],
  'nfl postseason seeding should preserve the exact 2014 NFC field order'
);
assert.deepStrictEqual(
  nfl2014PostseasonState.postseasonState.playoffPicture.afc.slice(0, 2).map((row) => row.bye),
  [true, true],
  'nfl postseason seeding should give the AFC top two seeds a bye'
);
assert.deepStrictEqual(
  nfl2014PostseasonState.postseasonState.playoffPicture.afc.slice(0, 4).map((row) => row.berth),
  ['division_winner', 'division_winner', 'division_winner', 'division_winner'],
  'nfl postseason seeding should mark the top four 2014 AFC seeds as division winners'
);
assert.deepStrictEqual(
  nfl2014PostseasonState.postseasonState.playoffPicture.nfc.slice(0, 2).map((row) => row.bye),
  [true, true],
  'nfl postseason seeding should give the NFC top two seeds a bye'
);
assert.deepStrictEqual(
  nfl2014PostseasonState.postseasonState.playoffPicture.nfc.slice(0, 4).map((row) => row.berth),
  ['division_winner', 'division_winner', 'division_winner', 'division_winner'],
  'nfl postseason seeding should mark the top four 2014 NFC seeds as division winners'
);
assert.deepStrictEqual(
  (nfl2014PostseasonState.postseasonState.currentWeekSchedule || []).map((game) => `${game.homeAbbr}-${game.awayAbbr}`),
  ['IND-BAL', 'PIT-CIN', 'DAL-DET', 'CAR-ARI'],
  'nfl postseason seeding should build the exact 2014 wild-card schedule'
);
assert.ok(
  (nfl2014PostseasonState.postseasonState.currentWeekSchedule || []).every((game) => (
    Number.isFinite(Number(game?.day)) &&
    String(game?.seriesId || '').length > 0
  )),
  'nfl postseason seeding should attach stable day and series identity to each wild-card game'
);

const nfl2014LiveAdvanceState = nfl2014PostseasonAdapter.simulateNextDay();
assert.equal(
  nfl2014LiveAdvanceState.postseasonState.phase,
  'divisional',
  'the live nfl postseason flow should advance out of wild_card after the seeded wild-card slate resolves'
);
assert.equal(
  nfl2014LiveAdvanceState.seasonState.currentWeek,
  19,
  'nfl postseason progression should keep NFL playoff weeks in sequence instead of collapsing back to regular-season math'
);
assert.equal(
  (nfl2014LiveAdvanceState.postseasonState.currentWeekSchedule || []).length,
  4,
  'the live nfl postseason flow should seed four divisional games after wild-card results'
);
assert.ok(
  (nfl2014LiveAdvanceState.postseasonState.currentWeekSchedule || []).every((game) => (
    Number.isFinite(Number(game?.day)) &&
    String(game?.seriesId || '').length > 0
  )),
  'the live nfl postseason flow should keep stable day and series identity on divisional schedules'
);
const divisionalScheduleAdapter = createSimulationSeasonAdapter({
  slotId: 'nfl-slot-2014-divisional-view',
  state: nfl2014LiveAdvanceState
});
assert.equal(
  divisionalScheduleAdapter.getScheduleViewModel().cycleLabel,
  'Divisional Round',
  'reopened NFL postseason states should keep playoff round labels instead of collapsing back to Week N'
);

const nfl2014FallbackAdapter = createSimulationSeasonAdapter({
  slotId: 'nfl-slot-2014-fallback',
  state: {
    simulationMode: 'nfl_mixed_era_single_player_v1',
    leagueShell: {
      anchorSeasonId: 'nfl_2014',
      anchorSeasonLabel: '2014 NFL',
      sport: 'nfl',
      teams: [
        { abbr: 'NE', name: 'New England Patriots', conference: 'AFC', division: 'East' },
        { abbr: 'DEN', name: 'Denver Broncos', conference: 'AFC', division: 'West' },
        { abbr: 'IND', name: 'Indianapolis Colts', conference: 'AFC', division: 'South' },
        { abbr: 'PIT', name: 'Pittsburgh Steelers', conference: 'AFC', division: 'North' },
        { abbr: 'BAL', name: 'Baltimore Ravens', conference: 'AFC', division: 'North' },
        { abbr: 'BUF', name: 'Buffalo Bills', conference: 'AFC', division: 'East' },
        { abbr: 'SEA', name: 'Seattle Seahawks', conference: 'NFC', division: 'West' },
        { abbr: 'GB', name: 'Green Bay Packers', conference: 'NFC', division: 'North' },
        { abbr: 'DAL', name: 'Dallas Cowboys', conference: 'NFC', division: 'East' },
        { abbr: 'CAR', name: 'Carolina Panthers', conference: 'NFC', division: 'South' },
        { abbr: 'ARI', name: 'Arizona Cardinals', conference: 'NFC', division: 'West' },
        { abbr: 'DET', name: 'Detroit Lions', conference: 'NFC', division: 'North' }
      ]
    },
    sourceSeasons: { sourceSeasonLabels: ['2014'] },
    draftState: {
      controlledTeamAbbr: 'NE',
      rostersByTeam: {
        NE: [
          { id: 301, name: 'Tom Brady', pos: 'QB', team: 'NE', fp: 33 },
          { id: 302, name: 'LeGarrette Blount', pos: 'RB', team: 'NE', fp: 21 },
          { id: 303, name: 'Jonas Gray', pos: 'RB', team: 'NE', fp: 16 },
          { id: 304, name: 'Julian Edelman', pos: 'WR', team: 'NE', fp: 25 },
          { id: 305, name: 'Brandon LaFell', pos: 'WR', team: 'NE', fp: 19 },
          { id: 306, name: 'Rob Gronkowski', pos: 'TE', team: 'NE', fp: 27 },
          { id: 307, name: 'Danny Amendola', pos: 'WR', team: 'NE', fp: 14 },
          { id: 308, name: 'Stephen Gostkowski', pos: 'K', team: 'NE', fp: 11 },
          { id: 309, name: 'Patriots DST', pos: 'DST', team: 'NE', fp: 13 }
        ], DEN: [], IND: [], PIT: [], BAL: [], BUF: [],
        SEA: [], GB: [], DAL: [], CAR: [], ARI: [], DET: []
      },
      freeAgents: []
    },
    seasonState: {
      currentDay: 18,
      currentWeek: 18,
      scheduleByDay: { 1: [] },
      lineupIdsByTeam: {
        NE: [301, 302, 303, 304, 305, 306, 307, 308, 309]
      },
      lineupSlotsByTeam: {
        NE: {
          QB: 301,
          RB1: 302,
          RB2: 303,
          WR1: 304,
          WR2: 305,
          TE: 306,
          FLEX: 307,
          K: 308,
          DST: 309
        }
      },
      standings: [
        { teamAbbr: 'NE', conference: 'AFC', division: 'East', w: 12, l: 4, pf: 468, pa: 313 },
        { teamAbbr: 'DEN', conference: 'AFC', division: 'West', w: 12, l: 4, pf: 482, pa: 354 },
        { teamAbbr: 'IND', conference: 'AFC', division: 'South', w: 11, l: 5, pf: 458, pa: 357 },
        { teamAbbr: 'PIT', conference: 'AFC', division: 'North', w: 11, l: 5, pf: 432, pa: 348 },
        { teamAbbr: 'BAL', conference: 'AFC', division: 'North', w: 10, l: 6, pf: 409, pa: 302 },
        { teamAbbr: 'BUF', conference: 'AFC', division: 'East', w: 9, l: 7, pf: 339, pa: 376 },
        { teamAbbr: 'SEA', conference: 'NFC', division: 'West', w: 12, l: 4, pf: 412, pa: 254 },
        { teamAbbr: 'GB', conference: 'NFC', division: 'North', w: 12, l: 4, pf: 486, pa: 301 },
        { teamAbbr: 'DAL', conference: 'NFC', division: 'East', w: 12, l: 4, pf: 467, pa: 352 },
        { teamAbbr: 'CAR', conference: 'NFC', division: 'South', w: 7, l: 8, pf: 339, pa: 376 },
        { teamAbbr: 'ARI', conference: 'NFC', division: 'West', w: 11, l: 5, pf: 358, pa: 313 },
        { teamAbbr: 'DET', conference: 'NFC', division: 'North', w: 11, l: 5, pf: 326, pa: 262 }
      ],
      completedGameLogs: [],
      activityLog: []
    },
    postseasonState: { phase: 'regular_season' }
  }
});

const nfl2014FallbackState = nfl2014FallbackAdapter.simulateNextDay();
assert.equal(
  nfl2014FallbackState.postseasonState.phase,
  'postseason_ready',
  'the exact 2014 shortcut should fall back to the computed playoff picture when an expected playoff team is missing'
);
assert.equal(
  nfl2014FallbackState.postseasonState.playoffPicture.afc.some((row) => row.teamAbbr === 'CIN'),
  false,
  'the fallback computed playoff picture should not fabricate a missing 2014 playoff team'
);
assert.equal(
  nfl2014FallbackState.postseasonState.playoffPicture.afc.some((row) => row.teamAbbr === 'BUF'),
  true,
  'the fallback computed playoff picture should preserve the actual standings team in place of a missing 2014 playoff team'
);

console.log('simulation season adapter test passed');
