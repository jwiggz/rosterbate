const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'rosterbate-season.html'),
  'utf8'
);

assert.match(
  html,
  /<script src="cpu-sim-personalities\.js"><\/script>\s*<script src="cpu-sim-lineups\.js"><\/script>/,
  'expected cpu-sim-personalities.js to load before cpu-sim-lineups.js'
);

function extractFunctionSource(name, nextName) {
  const start = html.indexOf(`function ${name}`);
  assert.ok(start >= 0, `missing ${name}`);
  const end = html.indexOf(`\nfunction ${nextName}`, start);
  assert.ok(end >= 0, `missing ${nextName}`);
  return html.slice(start, end);
}

const normalizeCpuSimPersonalityValueSource = extractFunctionSource(
  'normalizeCpuSimPersonalityValue(value)',
  'getCpuSimPersonalityApi()'
);
const getCpuSimPersonalityApiSource = extractFunctionSource(
  'getCpuSimPersonalityApi()',
  'getCpuSimTeamCount(state)'
);
const getCpuSimTeamCountSource = extractFunctionSource(
  'getCpuSimTeamCount(state)',
  'buildDeterministicCpuTeamPersonalitiesByTeam(state)'
);
const buildDeterministicCpuTeamPersonalitiesByTeamSource = extractFunctionSource(
  'buildDeterministicCpuTeamPersonalitiesByTeam(state)',
  'ensureCpuTeamPersonalitiesByTeam(state, options)'
);
const ensureCpuTeamPersonalitiesByTeamSource = extractFunctionSource(
  'ensureCpuTeamPersonalitiesByTeam(state, options)',
  'getCpuTeamSimPersonality(teamIdx, state)'
);
const getCpuTeamSimPersonalitySource = extractFunctionSource(
  'getCpuTeamSimPersonality(teamIdx, state)',
  'buildCpuManagedStarterIdsForDay(teamIdx, roster, day)'
);
const normalizeLocalLeagueDraftSnapshotSource = extractFunctionSource(
  'normalizeLocalLeagueDraftSnapshot(state)',
  'writeLocalDraftSnapshot(state)'
);
const writeLocalDraftSnapshotSource = extractFunctionSource(
  'writeLocalDraftSnapshot(state)',
  'buildSharedSimulationPersistenceState(rawState, shellState, gameState)'
);
const startHistoricalDraftSimSeasonSource = extractFunctionSource(
  'startHistoricalDraftSimSeason()',
  'getSimulationStarterIdsForTeamDay(teamIdx, day)'
);
const buildCpuManagedStarterIdsForDaySource = extractFunctionSource(
  'buildCpuManagedStarterIdsForDay(teamIdx, roster, day)',
  'normalizeCpuTeamLineups(teamIdx)'
);
const rebuildLineupsAfterRosterChangeSource = extractFunctionSource(
  'rebuildLineupsAfterRosterChange(teamIdx)',
  'getCurrentRosterSlot(pid,day)'
);

const calls = [];
const fallbackCalls = [];
const personalityBuilds = [];
const context = {
  window: {
    RosterBateCpuSimPersonalities: {
      buildCpuSimPersonalitiesByTeam(options) {
        personalityBuilds.push(options.rosters);
        return Array.from({ length: options.teamCount }, (_, teamIdx) => {
          if (teamIdx === 0) return 'balanced';
          if (teamIdx === 1) return 'guards_bias';
          return 'bigs_bias';
        });
      }
    },
    RosterBateCpuSimLineups: {
      buildCpuSimLineupIds(options) {
        calls.push(options);
        return ['cpu'];
      }
    },
    RosterBateSimulationSeasonAdapter: {
      createSimulationSeasonAdapter() {
        return {
          getState() {
            return {};
          }
        };
      }
    }
  },
  D: { multiplayer: false, historicalEntryMode: 'simulation_season' },
  G: {
    day: 3,
    rosters: [
      [
        { id: 1, name: 'Starter' },
        { id: 2, name: 'Bench A' },
        { id: 3, name: 'Bench B' }
      ]
    ],
    starters: [[]],
    dailyLineupsByTeam: {
      0: { 4: [1] }
    }
  },
  SLOT_LABELS: ['PG', 'SG', 'SF', 'PF', 'C'],
  STARTERS: 5,
  isCpuManagedTeam(teamIdx) {
    return teamIdx === 0;
  },
  isHistoricalSimulationUniverse(state) {
    return String(state?.historicalEntryMode || '').trim().toLowerCase() === 'simulation_season';
  },
  isSimulationBackedSeasonState(state) {
    const explicitBackend = String(
      state?.activeSeasonBackend
      || state?.seasonBackend
      || state?.backend
      || ''
    ).trim().toLowerCase();
    if (explicitBackend === 'simulation') return true;
    if (explicitBackend === 'fantasy') return false;
    return context.isHistoricalSimulationUniverse(state);
  },
  getActiveSeasonBackend() {
    const explicitBackend = String(context.D?.activeSeasonBackend || '').trim().toLowerCase();
    if (explicitBackend === 'simulation') return 'simulation';
    return context.isHistoricalSimulationUniverse(context.D) ? 'simulation' : 'fantasy';
  },
  buildBestLineupIdsForRoster(roster) {
    fallbackCalls.push(roster);
    return ['fallback'];
  },
  canPlayerFillSlot() {
    return true;
  },
  getGameInfo() {
    return { opponent: 'SIM' };
  },
  getInjuryStatus() {
    return null;
  },
  weekForDay() {
    return 1;
  },
  getDailyLineupStore(teamIdx) {
    return context.G.dailyLineupsByTeam[teamIdx];
  },
  getHistoricalUniverseSourcePackIds() {
    return ['source-pack'];
  },
  persistHistoricalUniverseSlotSnapshot() {
    return { slotId: 'slot-1' };
  },
  localStorage: {
    setItem() {}
  },
  toast() {},
  ACTIVE_SEASON_MODE: 'fantasy',
  SEASON_MODE_ADAPTER: null,
  renderHub() {},
  initSeasonCalls: 0,
  applyRequestedSeasonViewCalls: 0,
  initSeason() {
    context.initSeasonCalls += 1;
  },
  applyRequestedSeasonView() {
    context.applyRequestedSeasonViewCalls += 1;
  },
  scheduleRosterRender() {},
  buildUnifiedSimulationBootState(state, slotId, sport) {
    return {
      ...state,
      sport,
      historicalUniverseSlotId: slotId,
      draftState: { controlledTeamAbbr: 'USER' },
      seasonState: { currentDay: 1, currentWeek: 1, standings: [] },
      postseasonState: { phase: 'regular_season' }
    };
  },
  cloneSharedSimulationBootValue(value) {
    return JSON.parse(JSON.stringify(value));
  },
  buildSimulationSeasonAdapterFromState(slotId, state) {
    return {
      slotId,
      getState() {
        return state;
      }
    };
  },
  normalizeSharedSimulationSeasonBootState(state, slotId) {
    return {
      ...state,
      historicalUniverseSlotId: slotId,
      normalizedByTest: true
    };
  },
  document: {
    getElementById() {
      return { classList: { contains() { return false; } } };
    }
  },
  console
};

vm.runInNewContext(
  [
    normalizeCpuSimPersonalityValueSource,
    getCpuSimPersonalityApiSource,
    getCpuSimTeamCountSource,
    buildDeterministicCpuTeamPersonalitiesByTeamSource,
    ensureCpuTeamPersonalitiesByTeamSource,
    getCpuTeamSimPersonalitySource,
    normalizeLocalLeagueDraftSnapshotSource,
    writeLocalDraftSnapshotSource,
    startHistoricalDraftSimSeasonSource,
    buildCpuManagedStarterIdsForDaySource,
    rebuildLineupsAfterRosterChangeSource
  ].join('\n'),
  context
);

const creationState = {
  historicalEntryMode: 'simulation_season',
  leagueSize: 3,
  myPos: 0,
  teams: ['User', 'CPU 1', 'CPU 2'],
  allRosters: [[], [], []]
};
assert.deepStrictEqual(
  context.buildDeterministicCpuTeamPersonalitiesByTeam(creationState),
  ['balanced', 'guards_bias', 'bigs_bias']
);

const legacyState = {
  historicalEntryMode: 'simulation_season',
  leagueSize: 3,
  myPos: 0,
  teams: ['User', 'CPU 1', 'CPU 2'],
  allRosters: [[], [], []]
};
assert.equal(
  JSON.stringify(context.ensureCpuTeamPersonalitiesByTeam(legacyState)),
  JSON.stringify(['balanced', 'guards_bias', 'bigs_bias']),
  'missing saved personalities should regenerate deterministic diversity for simulation saves'
);
assert.equal(
  JSON.stringify(legacyState.cpuTeamPersonalitiesByTeam),
  JSON.stringify(['balanced', 'guards_bias', 'bigs_bias'])
);

const savedState = {
  historicalEntryMode: 'simulation_season',
  leagueSize: 3,
  myPos: 0,
  teams: ['User', 'CPU 1', 'CPU 2'],
  allRosters: [[], [], []],
  cpuTeamPersonalitiesByTeam: ['balanced', 'guards_bias', 'bigs_bias']
};
assert.equal(context.getCpuTeamSimPersonality(1, savedState), 'guards_bias');

const cpuManagedResult = context.buildCpuManagedStarterIdsForDay(0, context.G.rosters[0], 4);
assert.deepStrictEqual(cpuManagedResult, ['cpu']);
assert.equal(calls.length, 1);
assert.strictEqual(calls[0].roster, context.G.rosters[0]);
assert.equal(calls[0].personality, 'balanced');

context.D.cpuTeamPersonalitiesByTeam = ['balanced'];
calls.length = 0;
context.buildCpuManagedStarterIdsForDay(0, context.G.rosters[0], 4);
assert.equal(calls[0].personality, 'balanced');

context.D.cpuTeamPersonalitiesByTeam = ['balanced', 'star_loyalist'];
calls.length = 0;
context.buildCpuManagedStarterIdsForDay(0, context.G.rosters[0], 4);
assert.equal(calls[0].personality, 'balanced');

context.D = {
  activeSeasonBackend: 'simulation',
  historicalEntryMode: 'historical_draft',
  cpuTeamPersonalitiesByTeam: ['balanced']
};
calls.length = 0;
context.buildCpuManagedStarterIdsForDay(0, context.G.rosters[0], 4);
assert.equal(calls.length, 1);
assert.equal(calls[0].personality, 'balanced', 'cpu-managed starter selection should honor unified simulation backends even when legacy historicalEntryMode flags are absent');

personalityBuilds.length = 0;
context.D = {
  historicalEntryMode: 'historical_draft',
  historicalPackId: 'pack-1',
  allRosters: [[{ id: 'pre' }], [{ id: 'pre-cpu' }]],
  leagueSize: 2,
  myPos: 0,
  teams: ['User', 'CPU 1'],
  simulationProfile: null
};
context.isHistoricalDraftUniverse = state =>
  String(state?.historicalEntryMode || '').trim().toLowerCase() === 'historical_draft';
context.window.RosterBateSimulationEngine = {
  ENGINE_VERSION: 'test-engine',
  enrichLeagueState(state) {
    state.allRosters = [[{ id: 'post' }], [{ id: 'post-cpu' }]];
  }
};
context.D.processed = ['legacy-processed-flag'];
context.D.dayResults = { 3: { stale: true } };
context.D.revealedDays = { 3: true };
context.D.settledWeeks = { 1: true };
context.D.dailyRevealReports = { 3: { headline: 'stale report' } };
context.D.simulationLogsByDay = { 3: { engineVersion: 'legacy-shell' } };
context.D.lastRevealedDay = 3;
assert.equal(context.startHistoricalDraftSimSeason(), true);
assert.equal(context.D.historicalEntryMode, 'simulation_season');
assert.equal(
  context.D.simulationMode,
  'nba_mixed_era_single_player_v1',
  'draft-to-sim conversion should stamp the canonical simulation mode id for new seasons'
);
assert.equal(context.D.activeSeasonBackend, 'simulation', 'draft-to-sim conversion should flip the season onto the simulation backend immediately');
assert.equal(context.D.legacyHistoricalStatMode, false, 'draft-to-sim conversion should clear replay-era legacy flags during same-session simulation handoff');
assert.equal(context.ACTIVE_SEASON_MODE, 'fantasy', 'draft-to-sim conversion should keep the polished fantasy presentation shell');
assert.ok(context.SEASON_MODE_ADAPTER, 'draft-to-sim conversion should attach a simulation adapter in the same session');
assert.equal(context.D.historicalUniverseSlotId, 'slot-1', 'draft-to-sim conversion should retain the assigned slot id when rebuilding simulation state');
assert.equal(JSON.stringify(context.D.processed), JSON.stringify([]), 'draft-to-sim conversion should clear stale processed markers when switching to the unified backend');
assert.equal(JSON.stringify(context.D.dayResults), JSON.stringify({}), 'draft-to-sim conversion should clear stale reveal-day caches when switching to the unified backend');
assert.equal(JSON.stringify(context.D.revealedDays), JSON.stringify({}), 'draft-to-sim conversion should clear stale revealed-day markers when switching to the unified backend');
assert.equal(JSON.stringify(context.D.settledWeeks), JSON.stringify({}), 'draft-to-sim conversion should clear stale settled-week caches when switching to the unified backend');
assert.equal(JSON.stringify(context.D.dailyRevealReports), JSON.stringify({}), 'draft-to-sim conversion should clear stale reveal reports when switching to the unified backend');
assert.equal(JSON.stringify(context.D.simulationLogsByDay), JSON.stringify({}), 'draft-to-sim conversion should clear stale simulation day logs when switching to the unified backend');
assert.equal(context.D.lastRevealedDay, 0, 'draft-to-sim conversion should reset stale last-revealed bookkeeping when switching to the unified backend');
assert.equal(context.initSeasonCalls, 1, 'draft-to-sim conversion should reinitialize the season shell after attaching the simulation backend');
assert.equal(context.applyRequestedSeasonViewCalls, 1, 'draft-to-sim conversion should restore the active season view after the backend swap');
assert.equal(personalityBuilds.length, 1);
assert.equal(
  JSON.stringify(personalityBuilds[0]),
  JSON.stringify([[{ id: 'post' }], [{ id: 'post-cpu' }]]),
  'expected draft-to-sim conversion to assign personalities from enriched rosters'
);
assert.equal(
  JSON.stringify(context.D.cpuTeamPersonalitiesByTeam),
  JSON.stringify(['balanced', 'guards_bias'])
);

context.D.activeSeasonBackend = null;
context.isHistoricalSimulationUniverse = () => false;
const fallbackResult = context.buildCpuManagedStarterIdsForDay(0, context.G.rosters[0], 4);
assert.deepStrictEqual(fallbackResult, ['fallback']);
assert.equal(fallbackCalls.length, 1);

context.isHistoricalSimulationUniverse = () => true;
context.G.dailyLineupsByTeam[0][4] = [1];
context.G.starters[0] = ['old'];
calls.length = 0;
context.rebuildLineupsAfterRosterChange(0);
assert.equal(calls.length, 2);
assert.strictEqual(calls[0].roster, context.G.rosters[0]);
assert.deepStrictEqual(context.G.starters[0], ['cpu']);
assert.deepStrictEqual(context.G.dailyLineupsByTeam[0][4], ['cpu']);
assert.equal(calls[0].roster.length, context.G.rosters[0].length);
assert.notDeepStrictEqual(calls[0].roster, context.G.rosters[0].slice(0, 1), 'expected rebuildLineupsAfterRosterChange to use the full roster');

console.log('cpu sim lineup wiring test passed');
