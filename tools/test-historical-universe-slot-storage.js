const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class LimitedLocalStorage {
  constructor(maxBytes) {
    this.maxBytes = maxBytes;
    this.store = new Map();
  }

  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }

  removeItem(key) {
    this.store.delete(String(key));
  }

  clear() {
    this.store.clear();
  }

  setItem(key, value) {
    const finalKey = String(key);
    const finalValue = String(value);
    const priorValue = this.store.has(finalKey) ? this.store.get(finalKey) : null;
    if (priorValue === finalValue) {
      return;
    }
    this.store.set(finalKey, finalValue);
    if (this.sizeBytes() > this.maxBytes) {
      if (priorValue === null) {
        this.store.delete(finalKey);
      } else {
        this.store.set(finalKey, priorValue);
      }
      const error = new Error(
        `Failed to execute 'setItem' on 'Storage': Setting the value of '${finalKey}' exceeded the quota.`
      );
      error.name = 'QuotaExceededError';
      throw error;
    }
  }

  key(index) {
    return Array.from(this.store.keys())[Number(index)] || null;
  }

  sizeBytes() {
    let total = 0;
    for (const [key, value] of this.store.entries()) {
      total += Buffer.byteLength(key) + Buffer.byteLength(value);
    }
    return total;
  }
}

function readSource(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

function createPlayer(index) {
  const packId = index < 150 ? 'nba_1996_full_season_v1' : 'nba_2016_full_season_v1';
  const seasonLabel = index < 150 ? '1995-96' : '2015-16';
  const teamCode = 'T' + String((index % 30) + 1).padStart(2, '0');
  return {
    id: index + 1,
    historicalPlayerId: `hist-${index + 1}`,
    historicalPackId: packId,
    historicalTeamId: `${packId}-${teamCode}`,
    historicalSeasonId: packId,
    historicalSourcePackIds: [packId],
    name: `Player ${index + 1}`,
    team: teamCode,
    pos: ['PG', 'SG', 'SF', 'PF', 'C'][index % 5],
    fp: 30 + (index % 20),
    gp: 82,
    totalFantasyPoints: 1500 + index,
    statValues: {
      pts: 20 + (index % 10),
      reb: 5 + (index % 7),
      ast: 4 + (index % 6)
    },
    statSummary: `Top mixed-era contributor from ${seasonLabel}`,
    bio: 'resume-player '.repeat(8).trim(),
    seasonStats: {
      gamesPlayed: 82,
      minutesPerGame: 32 + (index % 6),
      fantasyPointsPerGame: 28 + (index % 9)
    },
    simProfile: {
      sourceSeasonLabel: seasonLabel,
      archetype: 'balanced_star',
      stamina: 85 + (index % 10)
    },
    mixedEraOverall: 99 - (index * 0.1),
    mixedEraProjection: 42 - (index * 0.05),
    mixedEraContext: {
      sourceSeasonLabel: seasonLabel,
      normalizedRank: index + 1
    }
  };
}

function buildTop300State() {
  const playerPool = Array.from({ length: 300 }, (_, index) => createPlayer(index));
  const leagueSize = 10;
  const rosterSize = 16;
  const allRosters = Array.from({ length: leagueSize }, (_, teamIndex) =>
    playerPool
      .slice(teamIndex * rosterSize, (teamIndex + 1) * rosterSize)
      .map(player => ({ ...player }))
  );
  const waiver = playerPool.slice(leagueSize * rosterSize).map(player => ({ ...player }));

  return {
    sport: 'nba',
    historicalPackId: 'mixed_era_1996_2016_top300_v1',
    historicalSourcePackIds: ['nba_1996_full_season_v1', 'nba_2016_full_season_v1'],
    historicalSeasonId: 'mixed_era_1996_2016_top300_v1',
    historicalEntryMode: 'simulation_season',
    historicalPresentation: {
      seasonLabel: '1995-96 + 2015-16 Mixed Era Draft',
      shortLabel: '95-96 x 15-16',
      focusTeamName: 'Audit Agents'
    },
    leagueName: 'Top300 Regression League',
    teamName: 'Audit Agents',
    leagueSize,
    teams: ['Audit Agents'].concat(Array.from({ length: leagueSize - 1 }, (_, index) => `CPU Team ${index + 1}`)),
    cpuTeamPersonalitiesByTeam: ['balanced', 'guards_bias', 'bigs_bias', 'steady_floor', 'star_loyalist', 'balanced', 'guards_bias', 'bigs_bias', 'steady_floor', 'star_loyalist'],
    myPos: 0,
    currentWeek: 1,
    currentDay: 1,
    standings: Array.from({ length: leagueSize }, (_, index) => ({
      teamIdx: index,
      w: index === 0 ? 1 : 0,
      l: index === 0 ? 0 : 1,
      pf: 1200 - index,
      pa: 1100 + index
    })),
    allRosters,
    historicalPlayerPool: playerPool.map(player => ({ ...player })),
    freeAgents: waiver.map(player => ({ ...player })),
    waiver: waiver.map(player => ({ ...player })),
    mixedEraConfigId: '1996-2016-top300',
    mixedEraTopPlayersPerPack: 150,
    mixedEraSourceSeasonLabels: ['1995-96', '2015-16'],
    mixedEraConfig: {
      mixedEraConfigId: '1996-2016-top300',
      packId: 'mixed_era_1996_2016_top300_v1',
      seasonLabel: '1995-96 + 2015-16 Mixed Era Draft',
      shortLabel: '95-96 x 15-16',
      summary:
        'A larger mixed-era draft pool built from the top 150 players in 1995-96 and 2015-16, ranked with era-normalized mixed-era ratings and sized for a full standard fantasy room.',
      whyItMatters:
        'This is the healthier full-room version of RosterBate’s crossover promise.'
    },
    dailyRevealReports: {
      '1': {
        day: 1,
        week: 1,
        story: {
          headline: 'Day 1 report is live',
          subheadline: 'The top300 sim lane completed its first daily run.'
        }
      }
    },
    simulationLogsByDay: {
      '1': {
        generatedAt: Date.now(),
        gameCount: 5
      }
    },
    savedAt: Date.now(),
    updatedAt: Date.now()
  };
}

function buildExpectedCompactState(state) {
  const compact = JSON.parse(JSON.stringify(state));
  delete compact.historicalPlayerPool;
  delete compact.freeAgents;
  compact.historicalUniverseSlotId = 'slot_top300_regression';
  compact.historicalUniverseCreatedAt = Number(state.savedAt || Date.now());
  return compact;
}

function loadApiWithStorage(localStorage) {
  const source = readSource('historical-universe-slots.js');
  const sandbox = {
    window: { localStorage },
    console
  };
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'historical-universe-slots.js' });
  return sandbox.window.RosterBateHistoricalUniverseSlots;
}

const top300State = buildTop300State();
const draftJson = JSON.stringify(top300State);
const pendingJson = JSON.stringify({
  seasonId: 'historical_draft_regression',
  savedAt: Date.now(),
  data: top300State
});
const expectedCompactJson = JSON.stringify(buildExpectedCompactState(top300State));
const quotaBudget =
  Buffer.byteLength(draftJson) +
  Buffer.byteLength(pendingJson) +
  Buffer.byteLength(expectedCompactJson) +
  8192;

const localStorage = new LimitedLocalStorage(quotaBudget);
localStorage.setItem('rosterbateDraft', draftJson);
localStorage.setItem('rbPendingSeasonLaunch', pendingJson);

const api = loadApiWithStorage(localStorage);
const persisted = api.upsertFromState(top300State, {
  slotId: 'slot_top300_regression',
  reason: 'quota_regression'
});

assert.ok(persisted, 'expected top300 slot snapshot to persist');
assert.equal(persisted.slotId, 'slot_top300_regression');
assert.equal(persisted.metadata.mixedEraConfigId, '1996-2016-top300');
assert.equal(persisted.metadata.playerPoolCount, 300);

const savedState = api.getState('slot_top300_regression');
assert.ok(savedState, 'expected saved state to be readable');
assert.equal(savedState.mixedEraConfigId, '1996-2016-top300');
assert.equal(savedState.historicalPlayerPool, undefined, 'saved slot should not duplicate the full historical player pool');
assert.equal(savedState.freeAgents, undefined, 'saved slot should rely on waiver data instead of duplicating free agents');
assert.equal(Array.isArray(savedState.waiver), true);
assert.equal(savedState.waiver.length, 140);
assert.equal(Array.isArray(savedState.allRosters), true);
assert.equal(savedState.allRosters.flat().length, 160);
assert.equal(
  JSON.stringify(savedState.cpuTeamPersonalitiesByTeam),
  JSON.stringify(top300State.cpuTeamPersonalitiesByTeam),
  'compact slot persistence should retain cpu team personalities'
);

console.log('historical universe slot storage test passed');
