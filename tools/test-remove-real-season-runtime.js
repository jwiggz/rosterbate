const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const baseDir = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(baseDir, relativePath), 'utf8');
}

function loadModule(relativePath, globalName) {
  const source = read(relativePath);
  const sandbox = {
    console,
    module: { exports: {} },
    exports: {},
    globalThis: {}
  };
  sandbox.window = sandbox.globalThis;
  sandbox.global = sandbox.globalThis;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: relativePath });
  return sandbox.module.exports || sandbox.globalThis[globalName];
}

const validator = loadModule('historical-pack-validator.js', 'RosterBateHistoricalPackValidator');
const fixtures = loadModule('historical-pack-fixtures.js', 'RosterBateHistoricalPackFixtures');
const slotsSource = read('historical-universe-slots.js');
const devRunnerSource = read('historical-pack-dev-runner.js');
const rosterbateSeasonSource = read('rosterbate-season.html');
const historicSeasonsSource = read('historic-seasons.html');

function createLocalStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(String(key)) ? store.get(String(key)) : null;
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    removeItem(key) {
      store.delete(String(key));
    }
  };
}

function loadSlotsApi(localStorage) {
  const slotsSandbox = {
    console,
    window: { localStorage }
  };
  slotsSandbox.window.window = slotsSandbox.window;
  vm.createContext(slotsSandbox);
  vm.runInContext(slotsSource, slotsSandbox, { filename: 'historical-universe-slots.js' });
  return slotsSandbox.window.RosterBateHistoricalUniverseSlots;
}

function sliceSourceBetweenSentinels(source, startSentinel, endSentinel) {
  const start = source.indexOf(startSentinel);
  assert.notEqual(start, -1, `Could not find start sentinel: ${startSentinel}`);
  const end = source.indexOf(endSentinel, start);
  assert.notEqual(end, -1, `Could not find end sentinel: ${endSentinel}`);
  return source.slice(start, end).trim();
}

function loadHistoricalSeasonLaunchBuilder() {
  const functionSource = sliceSourceBetweenSentinels(
    rosterbateSeasonSource,
    'function buildHistoricalSeasonLaunchData(',
    'function isHistoricalSimulationUniverse('
  );
  const sandbox = {
    console,
    CURRENT_SPORT: 'nba',
    Date,
    window: {
      RosterBateSimulationEngine: null
    },
    normalizeRosterbateSport(value) {
      return String(value || 'nba').trim().toLowerCase() || 'nba';
    },
    isLikelyGeneratedHistoricalRow() {
      return false;
    },
    accumulateHistoricalAggregate(target, row) {
      target.count += 1;
      target.pts += Number(row?.points || 0);
      target.reb += Number(row?.rebounds || 0);
      target.ast += Number(row?.assists || 0);
      target.stl += Number(row?.steals || 0);
      target.blk += Number(row?.blocks || 0);
      target.to += Number(row?.turnovers || 0);
      target.min += Number(row?.minutes || 0);
      target.fgm += Number(row?.fgm || 0);
      target.fga += Number(row?.fga || 0);
      target.ftm += Number(row?.ftm || 0);
      target.fta += Number(row?.fta || 0);
      target.threes += Number(row?.threePointersMade || 0);
    },
    getHistoricalSeasonStatProfile() {
      return null;
    },
    averageHistoricalAggregate(aggregate) {
      const count = Math.max(1, Number(aggregate?.count || 0));
      return {
        pts: Number(aggregate?.pts || 0) / count,
        reb: Number(aggregate?.reb || 0) / count,
        ast: Number(aggregate?.ast || 0) / count,
        stl: Number(aggregate?.stl || 0) / count,
        blk: Number(aggregate?.blk || 0) / count,
        to: Number(aggregate?.to || 0) / count,
        min: Number(aggregate?.min || 0) / count,
        fgm: Number(aggregate?.fgm || 0) / count,
        fga: Number(aggregate?.fga || 0) / count,
        ftm: Number(aggregate?.ftm || 0) / count,
        fta: Number(aggregate?.fta || 0) / count,
        threes: Number(aggregate?.threes || 0) / count
      };
    },
    applyHistoricalSeasonAvailabilityAdjustment(value) {
      return Number(value || 0);
    },
    computeHistoricalFantasyPoints(stats) {
      return Number(stats?.pts || 0)
        + (Number(stats?.reb || 0) * 1.2)
        + (Number(stats?.ast || 0) * 1.5)
        + (Number(stats?.stl || 0) * 3)
        + (Number(stats?.blk || 0) * 3)
        - Number(stats?.to || 0);
    },
    cloneJsonSafe(value) {
      try {
        return JSON.parse(JSON.stringify(value));
      } catch (error) {
        return null;
      }
    },
    buildHistoricalSnakeDistributedRosters(playerPool, teamCount) {
      const rosters = Array.from({ length: Number(teamCount || 0) }, () => []);
      playerPool.forEach((player, index) => {
        if (!rosters.length) return;
        rosters[index % rosters.length].push({ ...player });
      });
      return rosters;
    },
    ensureCpuTeamPersonalitiesByTeam() {}
  };
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  vm.runInContext(
    `${functionSource}\nthis.buildHistoricalSeasonLaunchData = buildHistoricalSeasonLaunchData;`,
    sandbox,
    { filename: 'rosterbate-season.html#buildHistoricalSeasonLaunchData' }
  );
  return sandbox.buildHistoricalSeasonLaunchData;
}

const slotsApi = loadSlotsApi(createLocalStorage());
const buildHistoricalSeasonLaunchData = loadHistoricalSeasonLaunchBuilder();

const bundle = fixtures.getSample1995_96Bundle();
const manifestModes = Array.from(bundle.manifest.supportedModes || []);
const challengeGroupModes = Array.from((bundle.packChallenges && bundle.packChallenges.challengeGroups || []).map(group => group.mode));
const challengeModes = Array.from((bundle.packChallenges && bundle.packChallenges.challenges || []).map(challenge => challenge.mode));
const presentationModes = Array.from((bundle.presentation && bundle.presentation.entryModes || []).map(entry => entry.mode));
const summaryModes = Array.from((bundle.summaries && bundle.summaries.modeSummaries || []).map(entry => entry.mode));

assert.equal(
  validator.constants.ALLOWED_SUPPORTED_MODES.includes('real_season'),
  false,
  'historical-pack-validator.js should not allow real_season in ALLOWED_SUPPORTED_MODES'
);

const legacyManifest = {
  ...bundle.manifest,
  supportedModes: ['real_season', 'historical_draft'],
  defaultEntryMode: 'real_season'
};
const legacyManifestReport = validator.validateHistoricalPackManifest(legacyManifest);

assert.notEqual(
  legacyManifestReport.status,
  'validation_failed',
  'legacy manifests that still declare real_season should remain runtime-compatible during validation'
);
assert.equal(
  legacyManifestReport.errors.some(error => error.code === 'invalid_supported_mode' || error.code === 'default_mode_not_supported'),
  false,
  'legacy manifests should not fail validation for real_season compatibility fields'
);
assert.equal(
  legacyManifestReport.warnings.some(warning => warning.code === 'legacy_real_season_mode'),
  false,
  'legacy manifests should normalize real_season silently so shipped packs still validate cleanly'
);
assert.equal(
  legacyManifestReport.compatibilityNotes.some(note => note.code === 'legacy_real_season_mode'),
  true,
  'legacy manifests should record a compatibility note when real_season is normalized from supportedModes'
);
assert.equal(
  legacyManifestReport.compatibilityNotes.some(note => note.code === 'legacy_real_season_default_entry_mode'),
  true,
  'legacy manifests should record a compatibility note when real_season is normalized from defaultEntryMode'
);
assert.equal(
  legacyManifestReport.status,
  'validation_passed_clean',
  'legacy manifests should stay validation_passed_clean when compatibility normalization succeeds'
);

assert.deepEqual(
  manifestModes,
  ['historical_draft', 'simulation_season'],
  'fixture manifest should only expose supported historical lanes'
);
assert.equal(
  bundle.manifest.defaultEntryMode,
  'simulation_season',
  'fixture manifest should default entry mode to simulation_season'
);

assert.equal(
  challengeGroupModes.includes('real_season'),
  false,
  'fixture challenge groups should not advertise real_season'
);
assert.equal(
  challengeModes.includes('real_season'),
  false,
  'fixture challenges should not use real_season'
);
assert.equal(
  presentationModes.includes('real_season'),
  false,
  'fixture presentation entry modes should not use real_season'
);
assert.equal(
  summaryModes.includes('real_season'),
  false,
  'fixture summary mode summaries should not use real_season'
);

assert.equal(
  slotsApi.getModeLabel('real_season'),
  'Sim Season',
  'historical-universe-slots.js should normalize legacy real_season labels forward to Sim Season'
);
assert.equal(
  slotsApi.getModeTone('real_season'),
  'simulation',
  'historical-universe-slots.js should normalize legacy real_season tone forward to simulation'
);
assert.equal(
  slotsApi.getModeLabel(''),
  'Sim Season',
  'historical-universe-slots.js should treat missing entry modes as simulation-season saves'
);
assert.equal(
  slotsApi.getModeTone('mystery_mode'),
  'simulation',
  'historical-universe-slots.js should treat unknown entry modes as simulation-season saves'
);

assert.doesNotMatch(
  rosterbateSeasonSource,
  /draftFormat:\s*isSimulationSeason\s*\?\s*'historical_simulation'\s*:\s*\(isReimaginedSeason\s*\?\s*'historical_reimagined'\s*:\s*'historical_real_season'\)/,
  'rosterbate-season.html should not persist historical_real_season as the default draft format'
);
assert.doesNotMatch(
  rosterbateSeasonSource,
  /historicalEntryMode:\s*isSimulationSeason\s*\?\s*'simulation_season'\s*:\s*\(isReimaginedSeason\s*\?\s*'reimagined_season'\s*:\s*'real_season'\)/,
  'rosterbate-season.html should not persist real_season as the default historical entry mode'
);
assert.doesNotMatch(
  rosterbateSeasonSource,
  /String\(D\?\.activeSeasonBackend \|\| ''\)\.trim\(\)\.toLowerCase\(\)!=='simulation'\s*&&\s*!isHistoricalSimulationUniverse\(D\)/,
  'rosterbate-season.html should route simulation day-runner gating through the centralized backend resolver instead of manual legacy checks'
);

const fallbackDevState = {
  importPlan: {
    metadata: {
      packId: bundle.manifest.packId,
      seasonId: bundle.season.seasonId
    },
    canonical: {
      seasons: [bundle.season],
      teams: bundle.teams,
      players: bundle.players,
      rosterSnapshots: bundle.rosterSnapshots,
      playerGameStats: bundle.playerGameStats || []
    },
    authored: {
      presentation: bundle.presentation || null,
      packChallenges: bundle.packChallenges || null,
      summaries: bundle.summaries || null
    }
  },
  pendingBoot: {
    entryMode: 'dev',
    selectedTeamId: bundle.presentation?.featuredTeamId || bundle.manifest.focusTeamId || bundle.teams?.[0]?.teamId || null
  }
};

const fallbackLaunchData = buildHistoricalSeasonLaunchData(fallbackDevState, 'nba');

assert.ok(
  fallbackLaunchData,
  'buildHistoricalSeasonLaunchData should build launch data for a valid historical pack bundle'
);
assert.equal(
  fallbackLaunchData.historicalEntryMode,
  'simulation_season',
  'buildHistoricalSeasonLaunchData should normalize stale dev historical launches to simulation_season at runtime'
);
assert.equal(
  fallbackLaunchData.draftFormat,
  'historical_simulation',
  'buildHistoricalSeasonLaunchData should persist historical_simulation draft metadata for the neutral historical fallback at runtime'
);
assert.equal(
  fallbackLaunchData.simulationMode,
  'nba_mixed_era_single_player_v1',
  'buildHistoricalSeasonLaunchData should stamp the canonical nba simulation mode id for neutral historical fallback launches'
);
assert.equal(
  fallbackLaunchData.activeSeasonBackend,
  'simulation',
  'buildHistoricalSeasonLaunchData should stamp explicit simulation backend metadata for neutral historical fallback launches'
);
assert.equal(
  fallbackLaunchData.legacyHistoricalStatMode,
  false,
  'buildHistoricalSeasonLaunchData should explicitly clear replay-era legacy flags for neutral historical fallback launches'
);

const simulationLaunchData = buildHistoricalSeasonLaunchData(
  {
    ...fallbackDevState,
    pendingBoot: {
      ...fallbackDevState.pendingBoot,
      entryMode: 'simulation_season'
    }
  },
  'nba'
);

assert.equal(
  simulationLaunchData.simulationMode,
  'nba_mixed_era_single_player_v1',
  'buildHistoricalSeasonLaunchData should stamp the canonical nba simulation mode id for new simulation-season launches'
);
assert.equal(
  simulationLaunchData.activeSeasonBackend,
  'simulation',
  'buildHistoricalSeasonLaunchData should stamp explicit simulation backend metadata for new simulation-season launches'
);
assert.equal(
  simulationLaunchData.legacyHistoricalStatMode,
  false,
  'buildHistoricalSeasonLaunchData should clear replay-era legacy flags for new simulation-season launches'
);
assert.notEqual(
  simulationLaunchData.simulationMode,
  'historical_box_score',
  'buildHistoricalSeasonLaunchData should stop minting the legacy historical_box_score mode for new simulation launches'
);

const nflSimulationLaunchData = buildHistoricalSeasonLaunchData(
  {
    ...fallbackDevState,
    importPlan: {
      ...fallbackDevState.importPlan,
      canonical: {
        ...fallbackDevState.importPlan.canonical,
        seasons: fallbackDevState.importPlan.canonical.seasons.map((season, index) => (
          index === 0
            ? { ...season, sport: 'nfl' }
            : season
        ))
      }
    },
    pendingBoot: {
      ...fallbackDevState.pendingBoot,
      entryMode: 'simulation_season'
    }
  },
  'nfl'
);

assert.equal(
  nflSimulationLaunchData.simulationMode,
  'nfl_mixed_era_single_player_v1',
  'buildHistoricalSeasonLaunchData should stamp the canonical nfl simulation mode id for new simulation-season launches'
);
assert.equal(
  nflSimulationLaunchData.activeSeasonBackend,
  'simulation',
  'buildHistoricalSeasonLaunchData should stamp explicit simulation backend metadata for new nfl simulation-season launches'
);
assert.equal(
  nflSimulationLaunchData.legacyHistoricalStatMode,
  false,
  'buildHistoricalSeasonLaunchData should clear replay-era legacy flags for new nfl simulation-season launches'
);
assert.notEqual(
  nflSimulationLaunchData.simulationMode,
  'historical_box_score',
  'buildHistoricalSeasonLaunchData should stop minting the legacy historical_box_score mode for new nfl simulation launches'
);

const legacySlotsStorage = createLocalStorage();
const legacySlotsApi = loadSlotsApi(legacySlotsStorage);
const legacySlotPersist = legacySlotsApi.upsertFromState({
  sport: 'nba',
  historicalPackId: 'nba_1996_full_season_v1',
  historicalSeasonId: 'nba_1996_historic',
  leagueName: '1995-96 NBA Historic Season',
  teamName: 'Chicago Bulls',
  currentWeek: 3,
  currentDay: 2
});

assert.ok(legacySlotPersist, 'legacy historical saves should still persist to a slot');
assert.match(
  legacySlotPersist.slotId,
  /simulation_season|historic/,
  'legacy/missing entry mode saves should normalize into sim-season flavored slot ids'
);
assert.doesNotMatch(
  legacySlotPersist.slotId,
  /historical_draft/,
  'legacy/missing entry mode saves should not generate historical_draft slot ids'
);
assert.equal(
  legacySlotPersist.metadata.historicalEntryMode,
  'simulation_season',
  'legacy/missing entry mode saves should normalize forward to simulation_season'
);
assert.equal(
  legacySlotPersist.metadata.modeTone,
  'simulation',
  'legacy/missing entry mode saves should normalize forward to the simulation tone'
);
assert.match(
  legacySlotPersist.metadata.title,
  /Sim Season$/,
  'legacy/missing entry mode saves should render the normalized Sim Season label'
);
assert.doesNotMatch(
  historicSeasonsSource,
  /slot\.modeTone\s*\|\|\s*api\.getModeTone\(slot\.historicalEntryMode\)\s*\|\|\s*'real'/,
  'historic-seasons.html should not fall back to the legacy real tone for saved simulation archive cards'
);
assert.match(
  rosterbateSeasonSource,
  /if\(D\?\.isHistoricalPack \|\| isSimulationBackedSeasonState\(D\)\)\{\s*return rebuilt;/,
  'rosterbate-season.html should trust simulation-backed local leagues in the high-coverage waiver-pool rebuild path'
);
assert.match(
  rosterbateSeasonSource,
  /const historicalPool = normalizeSeasonPlayerPool\(Array\.isArray\(D\?\.historicalPlayerPool\) \? D\.historicalPlayerPool : \[\], CURRENT_SPORT\);\s*if\(isSimulationBackedSeasonState\(D\)\)\{\s*const rosterMap=/s,
  'rosterbate-season.html should enter the centralized simulation-backed player-pool path before falling back to historical player-pool data'
);
assert.match(
  rosterbateSeasonSource,
  /if\(simulationPool\.length\) return simulationPool;\s*\}\s*if\(historicalPool\.length\) return historicalPool;/s,
  'rosterbate-season.html should prefer living simulation-backed player pools over stale historical player-pool data when both exist'
);
assert.match(
  rosterbateSeasonSource,
  /const shouldPersistSimulationState=isSimulationBackedSeasonState\(SEASON_MODE_ADAPTER\?\.getState\?\.\(\) \|\| D\);/,
  'rosterbate-season.html should decide simulation archive snapshot persistence through the centralized simulation-backed helper'
);
assert.match(
  rosterbateSeasonSource,
  /const preferRawSimulationState=isSimulationBackedSeasonState\(baseStateWithoutLegacyShellCaches\);/,
  'rosterbate-season.html should decide raw simulation persistence preference through the centralized simulation-backed helper'
);
assert.match(
  rosterbateSeasonSource,
  /\.\.\.baseStateWithoutLegacyShellCaches,\s*activeSeasonBackend:\s*'simulation',\s*legacyHistoricalStatMode:\s*false,\s*draftState,/s,
  'rosterbate-season.html should stamp explicit simulation-backend metadata and clear stale replay flags when building raw unified persistence state'
);
assert.match(
  rosterbateSeasonSource,
  /return isSimulationBackedSeasonState\(state\) \? state : null;/,
  'rosterbate-season.html should accept any simulation-backed completed-draft handoff payload instead of requiring the narrower shared-sim mode helper'
);
assert.match(
  rosterbateSeasonSource,
  /legacyHistoricalStatMode:\s*false,/,
  'rosterbate-season.html should explicitly clear stale legacyHistoricalStatMode flags during unified simulation boot normalization'
);
assert.match(
  rosterbateSeasonSource,
  /const preparedState=\{\s*\.\.\.baseState,\s*activeSeasonBackend:'simulation',\s*legacyHistoricalStatMode:false,\s*sport:targetSport,/s,
  'rosterbate-season.html should stamp explicit simulation metadata before delegating unified boot construction to the runtime builder'
);
assert.match(
  rosterbateSeasonSource,
  /if\(D && typeof D==='object'\)\{\s*D\.activeSeasonBackend='simulation';\s*D\.legacyHistoricalStatMode=false;\s*\}/s,
  'rosterbate-season.html should keep legacyHistoricalStatMode cleared when adapter-backed simulation state is persisted into D'
);
assert.match(
  rosterbateSeasonSource,
  /D=\{\s*\.\.\.previousState,\s*\.\.\.normalizedState,\s*activeSeasonBackend:'simulation',\s*legacyHistoricalStatMode:false\s*\};/s,
  'rosterbate-season.html should keep fantasy-shell rehydration explicitly marked as simulation-backed with legacy replay flags cleared'
);
assert.match(
  rosterbateSeasonSource,
  /function isLegacySinglePlayerSeasonState\(state\)\{[\s\S]*?const simulationMode=String\(state\?\.simulationMode \|\| ''\)\.trim\(\)\.toLowerCase\(\);[\s\S]*?const sharedSimulationMode=getSharedSimulationRouteMode\(simulationMode\);[\s\S]*?const explicitSharedSimulation=sharedSimulationMode==='nba_mixed_era' \|\| sharedSimulationMode==='nfl_mixed_era';[\s\S]*?if\(explicitSharedSimulation\) return false;/,
  'rosterbate-season.html should keep shared simulation routes out of the polished local-league shell while still allowing ordinary local leagues to be explicitly simulation-backed'
);
assert.match(
  rosterbateSeasonSource,
  /if\(simulationBackedState\)\{\s*return \{\s*backend:'simulation',\s*activeSeasonMode:'simulation',[\s\S]*?useSimulationAdapter:true/s,
  'rosterbate-season.html should keep generic simulation-backed saves on the unified simulation backend even when they do not hit shared-sim or legacy-local buckets'
);
assert.match(
  rosterbateSeasonSource,
  /const normalizedOfflineLeagueData = \(\s*!leagueData\?\.multiplayer\s*&&\s*\(isSimulationBackedSeasonState\(leagueData\) \|\| isLegacySinglePlayerSeasonState\(leagueData\)\)\s*\)\s*\? \{[\s\S]*?activeSeasonBackend:'simulation',[\s\S]*?historicalEntryMode:String\(leagueData\.historicalEntryMode \|\| 'simulation_season'\)\.trim\(\) \|\| 'simulation_season',[\s\S]*?legacyHistoricalStatMode:false[\s\S]*?\}\s*:\s*leagueData;/s,
  'rosterbate-season.html should normalize fetched local league payloads into explicit simulation-backed state before caching them for offline reopen'
);
assert.match(
  rosterbateSeasonSource,
  /function normalizeLocalLeagueDraftSnapshot\(state\)\{[\s\S]*?if\(state\.multiplayer\) return state;[\s\S]*?if\(!isSimulationBackedSeasonState\(state\) && !isLegacySinglePlayerSeasonState\(state\)\) return state;[\s\S]*?activeSeasonBackend:'simulation',[\s\S]*?historicalEntryMode:String\(state\.historicalEntryMode \|\| 'simulation_season'\)\.trim\(\) \|\| 'simulation_season',[\s\S]*?legacyHistoricalStatMode:false/s,
  'rosterbate-season.html should centralize local league simulation normalization so in-season cache writes keep explicit backend metadata'
);
assert.match(
  rosterbateSeasonSource,
  /const canonicalSeasonState = normalizeLocalLeagueDraftSnapshot\(D\) \|\| D;[\s\S]*?const saveData = \{\s*\.\.\.canonicalSeasonState,/s,
  'rosterbate-season.html should save normalized local league state to Firebase so reopened cloud seasons stay explicit simulation-backed'
);
assert.match(
  rosterbateSeasonSource,
  /await db\.ref\(`allSeasons\/\$\{seasonId\}`\)\.set\(removeUndefined\(adminIndexData\)\);[\s\S]*?sport: canonicalSeasonState\.sport \|\| 'nba'[\s\S]*?leagueName: canonicalSeasonState\.leagueName \|\| 'RosterBate League'[\s\S]*?teamName: canonicalSeasonState\.teamName \|\| 'My Team'/s,
  'rosterbate-season.html should derive admin index saves from the canonical normalized local league state too'
);
assert.match(
  rosterbateSeasonSource,
  /const normalizedLeagueData = normalizeLocalLeagueDraftSnapshot\(leagueData\) \|\| leagueData;[\s\S]*?await db\.ref\(`userSeasons\/\$\{userId\}\/\$\{leagueId\}`\)\.set\(cleanedData\);[\s\S]*?sport: normalizedLeagueData\.sport \|\| 'nba'/s,
  'rosterbate-season.html should normalize fetched or repaired league data before rewriting userSeasons and allSeasons copies'
);
assert.doesNotMatch(
  rosterbateSeasonSource,
  /if\(localAutoLoad\.activeSeasonMode==='simulation' && String\(D\?\.leagueShell\?\.sport \|\| D\?\.sport \|\| ''\)\.trim\(\)\.toLowerCase\(\)==='nfl'\)\{[\s\S]*?renderFootballSimulationPhaseOnePlaceholder\(D\);[\s\S]*?return;\s*\}/,
  'rosterbate-season.html should not divert saved nfl simulation-backed local leagues into the retired football placeholder during local auto-load'
);

assert.doesNotMatch(
  devRunnerSource,
  /entryMode\s*:\s*String\(options && options\.entryMode \|\| 'real_season'\)\.trim\(\) \|\| 'real_season'/,
  'historical-pack-dev-runner.js should not default entryMode to real_season when applying fixtures'
);
assert.doesNotMatch(
  devRunnerSource,
  /Real stat coverage|players with real season lines|real historical packs|Open Real Season/,
  'historical-pack-dev-runner.js should not keep removed real-season phrasing in the dev runner surface'
);
assert.doesNotMatch(
  devRunnerSource,
  /const entryMode=String\(options && options\.entryMode \|\| 'real_season'\)\.trim\(\) \|\| 'real_season';/,
  'historical-pack-dev-runner.js should not default local-state writes to real_season'
);
assert.doesNotMatch(
  devRunnerSource,
  /\(mode==='sim' \|\| mode==='simulation' \? 'simulation_season' : 'real_season'\)/,
  'historical-pack-dev-runner.js should not map the neutral season launch path to real_season'
);
assert.match(
  devRunnerSource,
  /historical_draft/,
  'historical-pack-dev-runner.js should use historical_draft as the neutral default mode'
);
assert.match(
  devRunnerSource,
  /activeSeasonBackend:\s*isSimulationSeason \? 'simulation' : null,/,
  'historical-pack-dev-runner.js should stamp explicit simulation backend metadata onto neutral local sim-season launch payloads'
);
assert.match(
  devRunnerSource,
  /legacyHistoricalStatMode:\s*isSimulationSeason \? false : null,/,
  'historical-pack-dev-runner.js should clear replay-era legacy flags on neutral local sim-season launch payloads'
);
assert.match(
  devRunnerSource,
  /activeSeasonBackend:\s*payload\.activeSeasonBackend,\s*legacyHistoricalStatMode:\s*payload\.legacyHistoricalStatMode,/s,
  'historical-pack-dev-runner.js should carry explicit simulation metadata through pending boot staging'
);

console.log('remove real season runtime audit test passed');
