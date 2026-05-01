const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const seasonHtml = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-season.html'), 'utf8');
const homepageHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const myLeaguesHtml = fs.readFileSync(path.join(__dirname, '..', 'my-leagues.html'), 'utf8');

function extractBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `expected to find start marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `expected to find end marker: ${endMarker}`);
  return source.slice(start, end);
}

assert.match(
  homepageHtml,
  /function persistHomepagePendingSeasonLaunch\(payload\)\{[\s\S]*sessionStorage\.setItem\(RB_PENDING_SEASON_KEY, JSON\.stringify\(pendingPayload\)\);[\s\S]*\}/,
  'homepage local league reopen should stage a session-backed pending launch payload before navigation'
);

assert.match(
  homepageHtml,
  /const launchPayload=normalizeHomepageLaunchPayload\(row\.data\);[\s\S]*persistHomepagePendingSeasonLaunch\(launchPayload\);[\s\S]*localStorage\.setItem\('rosterbateDraft', JSON\.stringify\(launchPayload\)\);/s,
  'homepage local league reopen should keep a pending handoff alongside the best-effort localStorage snapshot'
);

assert.match(
  myLeaguesHtml,
  /function persistMyLeaguesPendingSeasonLaunch\(payload\)\{[\s\S]*sessionStorage\.setItem\(RB_PENDING_SEASON_KEY, JSON\.stringify\(pendingPayload\)\);[\s\S]*\}/,
  'My Leagues local reopen should stage a session-backed pending launch payload before navigation'
);

assert.match(
  myLeaguesHtml,
  /const launchPayload=normalizeLocalLaunchPayload\(payload\);[\s\S]*persistMyLeaguesPendingSeasonLaunch\(launchPayload\);[\s\S]*localStorage\.setItem\('rosterbateDraft', JSON\.stringify\(launchPayload\)\);/s,
  'My Leagues local reopen should keep a pending handoff alongside the best-effort localStorage snapshot'
);

assert.match(
  seasonHtml,
  /if \(leagueId && leagueId !== 'demo'\) setSeasonEmptyState\('loading'\);/,
  'requested league routes should show a loading state instead of a blank shell while booting'
);

assert.match(
  seasonHtml,
  /function persistPendingSeasonLaunchToFirebase\(leagueId, pendingSeasonLaunch\)\{/,
  'pending local league handoff should save to Firebase through an async helper'
);

const pendingSeasonBranch = extractBetween(
  seasonHtml,
  "if (pendingSeasonLaunch?.data) {",
  "    // Wait for auth to be ready"
);
assert.ok(
  pendingSeasonBranch.indexOf('initSeason();') >= 0,
  'pending local league handoff should initialize the season before falling through to cloud restore'
);
assert.ok(
  pendingSeasonBranch.indexOf('persistPendingSeasonLaunchToFirebase(leagueId, pendingSeasonLaunch)') > pendingSeasonBranch.indexOf('applyRequestedSeasonView();'),
  'pending local league handoff should queue Firebase refresh after first render'
);

const pendingLaunchSource = `
${extractBetween(seasonHtml, "const RB_PENDING_SEASON_KEY = 'rbPendingSeasonLaunch';", 'function getMatchingLocalLeagueData(')}
module.exports = {
  getPendingSeasonLaunch,
  clearPendingSeasonLaunch,
  persistPendingSeasonLaunchToFirebase
};
`;

function createStorage(initialState = {}) {
  const backing = new Map(Object.entries(initialState));
  return {
    getItem(key) {
      return backing.has(key) ? backing.get(key) : null;
    },
    setItem(key, value) {
      backing.set(key, String(value));
    },
    removeItem(key) {
      backing.delete(key);
    },
    has(key) {
      return backing.has(key);
    }
  };
}

const localStorage = createStorage({
  rbPendingSeasonLaunch: JSON.stringify({
    seasonId: 'league-123',
    savedAt: 10,
    data: { seasonId: 'league-123', source: 'local' }
  })
});
const sessionStorage = createStorage({
  rbPendingSeasonLaunch: JSON.stringify({
    seasonId: 'league-123',
    savedAt: 20,
    data: { seasonId: 'league-123', source: 'session' }
  })
});

const sandbox = {
  module: { exports: {} },
  exports: {},
  localStorage,
  sessionStorage,
  console
};

vm.createContext(sandbox);
vm.runInContext(pendingLaunchSource, sandbox);

const api = sandbox.module.exports;
const pending = JSON.parse(JSON.stringify(api.getPendingSeasonLaunch('league-123')));
assert.equal(pending.data.source, 'session', 'pending season launch should prefer session storage when both storages have the same league handoff');

api.clearPendingSeasonLaunch('league-123');
assert.equal(sessionStorage.has('rbPendingSeasonLaunch'), false, 'clearing a pending handoff should remove the matching session-backed payload');
assert.equal(localStorage.has('rbPendingSeasonLaunch'), false, 'clearing a pending handoff should remove the matching localStorage payload too');

const resumeResolutionSource = `
${extractBetween(seasonHtml, 'function resolveLocalSavedSeasonAutoLoad(', 'function resolveSeasonManagerLeagueDataLoad(')}
module.exports = { resolveLocalSavedSeasonAutoLoad };
`;

const localLeaguePreferenceSource = `
${extractBetween(seasonHtml, 'function getLeagueTeamCount(data){', 'function getSharedSeasonActorId()')}
module.exports = {
  shouldPreferLocalLeagueData
};
`;

const advancedSlotState = {
  sport: 'nba',
  simulationMode: 'nba_mixed_era_single_player_v1',
  activeSeasonBackend: 'simulation',
  historicalUniverseSlotId: 'slot-advanced',
  sharedSimulationSlotId: 'slot-advanced',
  seasonId: 'season_60',
  leagueId: 'season_60',
  seasonState: {
    currentDay: 2,
    currentWeek: 1,
    completedGameLogs: [{ day: 1, homeAbbr: 'LAL', awayAbbr: 'BOS' }]
  }
};
const stalePendingState = {
  ...advancedSlotState,
  seasonState: {
    currentDay: 1,
    currentWeek: 1,
    completedGameLogs: []
  }
};
const slotLookups = [];
const resumeSandbox = {
  module: { exports: {} },
  exports: {},
  console,
  CURRENT_SPORT: 'nba',
  normalizeRosterbateSport(value) {
    return String(value || 'nba').trim().toLowerCase() || 'nba';
  },
  isSimulationBackedSeasonState(state) {
    return String(state?.activeSeasonBackend || '').trim().toLowerCase() === 'simulation';
  },
  loadHistoricalUniverseSlotState(slotId) {
    slotLookups.push(String(slotId || ''));
    return slotId === 'slot-advanced' ? JSON.parse(JSON.stringify(advancedSlotState)) : null;
  },
  getResolvedSeasonBackend() {
    return {
      backend: 'simulation',
      activeSeasonMode: 'fantasy',
      sharedSimulationSeason: true,
      useSimulationAdapter: false
    };
  },
  cloneSharedSimulationBootValue(value) {
    return JSON.parse(JSON.stringify(value));
  },
  buildUnifiedSimulationBootState() {
    throw new Error('shared simulation test state should not need legacy boot conversion');
  },
  buildSimulationSeasonAdapterFromState() {
    throw new Error('test backend disables adapter construction');
  },
  normalizeSharedSimulationSeasonBootState(state, slotId) {
    return {
      ...JSON.parse(JSON.stringify(state)),
      historicalUniverseSlotId: slotId
    };
  }
};
vm.createContext(resumeSandbox);
vm.runInContext(resumeResolutionSource, resumeSandbox);
const resolvedResume = resumeSandbox.module.exports.resolveLocalSavedSeasonAutoLoad(stalePendingState, 'nba');
assert.equal(resolvedResume.state.seasonState.currentDay, 2, 'simulation pending handoffs should prefer a newer local universe slot over stale Day 1 launch data');
assert.deepEqual(slotLookups, ['slot-advanced'], 'simulation pending handoffs should inspect their historical universe slot before booting');

const preferenceSandbox = {
  module: { exports: {} },
  exports: {}
};
vm.createContext(preferenceSandbox);
vm.runInContext(localLeaguePreferenceSource, preferenceSandbox);
const localPreferenceApi = preferenceSandbox.module.exports;
const richerStaleLocalLeague = {
  seasonId: 'season_60',
  sport: 'nba',
  activeSeasonBackend: 'simulation',
  currentDay: 1,
  currentWeek: 1,
  updatedAt: 999999,
  teams: Array.from({ length: 10 }, (_, index) => `Team ${index + 1}`),
  allRosters: Array.from({ length: 10 }, (_, teamIdx) =>
    Array.from({ length: 14 }, (_, playerIdx) => ({ id: `${teamIdx}-${playerIdx}` }))
  ),
  seasonState: {
    currentDay: 1,
    currentWeek: 1,
    completedGameLogs: [],
    standings: []
  }
};
const advancedCloudLeague = {
  seasonId: 'season_60',
  sport: 'nba',
  activeSeasonBackend: 'simulation',
  currentDay: 2,
  currentWeek: 1,
  updatedAt: 1000,
  leagueShell: {
    teams: Array.from({ length: 10 }, (_, index) => ({ abbr: `T${index + 1}` }))
  },
  draftState: {
    rostersByTeam: Object.fromEntries(
      Array.from({ length: 10 }, (_, teamIdx) => [
        `T${teamIdx + 1}`,
        Array.from({ length: 5 }, (_, playerIdx) => ({ id: `cloud-${teamIdx}-${playerIdx}` }))
      ])
    )
  },
  seasonState: {
    currentDay: 2,
    currentWeek: 1,
    completedGameLogs: [{ day: 1, homeAbbr: 'SH', awayAbbr: 'P' }],
    standings: [{ teamAbbr: 'P', w: 1, l: 0 }, { teamAbbr: 'SH', w: 0, l: 1 }]
  }
};
assert.equal(
  localPreferenceApi.shouldPreferLocalLeagueData(richerStaleLocalLeague, advancedCloudLeague, 'season_60'),
  false,
  'a stale Day 1 browser draft must not overwrite a cloud season that has advanced to Day 2'
);

const richerEqualProgressLocalLeague = {
  ...richerStaleLocalLeague,
  currentDay: 2,
  currentWeek: 1,
  updatedAt: 999999,
  seasonState: {
    currentDay: 2,
    currentWeek: 1,
    completedGameLogs: [{ day: 1, homeAbbr: 'SH', awayAbbr: 'P' }],
    standings: [{ teamAbbr: 'P', w: 1, l: 0 }, { teamAbbr: 'SH', w: 0, l: 1 }]
  }
};
assert.equal(
  localPreferenceApi.shouldPreferLocalLeagueData(richerEqualProgressLocalLeague, advancedCloudLeague, 'season_60'),
  false,
  'a richer browser draft must not overwrite a cloud simulation season at the same progressed day'
);

async function runAsyncAssertions() {
  const firebaseWrites = [];
  Object.assign(sandbox, {
    authReady: Promise.resolve(),
    currentRbUser: { uid: 'user-123', email: 'coach@example.com' },
    isSimulationBackedSeasonState(state) {
      return String(state?.activeSeasonBackend || '').trim().toLowerCase() === 'simulation';
    },
    normalizeLocalLeagueDraftSnapshot(value) {
      return value;
    },
    removeUndefined(value) {
      return JSON.parse(JSON.stringify(value));
    },
    getLeagueTeamCount() {
      return 2;
    },
    db: {
      ref(refPath) {
        return {
          set(value) {
            firebaseWrites.push({ path: refPath, value });
            return Promise.resolve();
          }
        };
      }
    }
  });

  const persisted = await api.persistPendingSeasonLaunchToFirebase('season_60', {
    seasonId: 'season_60',
    savedAt: 1000,
    data: {
      seasonId: 'season_60',
      activeSeasonBackend: 'simulation',
      seasonState: { currentDay: 1, completedGameLogs: [] }
    }
  });

  assert.equal(persisted, false, 'simulation pending launches should not perform stale Firebase refresh writes');
  assert.deepEqual(firebaseWrites, [], 'simulation pending launches should not write Day 1 handoff data over newer persisted progress');
}

runAsyncAssertions()
  .then(() => {
    console.log('local league storage fallback test passed');
  })
  .catch(err => {
    console.error(err);
    process.exitCode = 1;
  });
