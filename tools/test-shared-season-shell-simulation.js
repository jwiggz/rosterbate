const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-season.html'), 'utf8');

function extractBetween(startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  assert.notEqual(start, -1, `expected to find start marker: ${startMarker}`);
  const end = html.indexOf(endMarker, start);
  assert.notEqual(end, -1, `expected to find end marker: ${endMarker}`);
  return html.slice(start, end);
}

function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

assert.match(html, /<script src="simulation-mode-runtime\.js"><\/script>/, 'season shell should load the simulation runtime before booting completed drafts');
assert.match(html, /function getRequestedSimulationMode\(/, 'season shell should expose a simulation query helper');
assert.match(html, /function normalizeSharedSimulationSeasonBootState\(/, 'season shell should normalize shared simulation seasons into the legacy shell shape');
assert.match(html, /function bootstrapCompletedSimulationDraftHandoff\(/, 'season shell should expose a completed-draft handoff helper');
assert.match(html, /completed_simulation_handoff/, 'season shell should persist completed simulation drafts into slot storage before booting');
assert.match(html, /historicalUniverse=/, 'season shell should route completed simulation drafts onto a slot-backed URL');

const harnessSource = `
const RB_SHARED_SIMULATION_MODE_ID = 'nba_mixed_era_single_player_v1';
${extractBetween('function getRequestedSimulationMode(', 'function loadHistoricalUniverseSlotState(')}

module.exports = {
  getRequestedSimulationMode,
  shouldPersistSharedSimulationState,
  normalizeSharedSimulationSeasonBootState,
  buildSharedSimulationPersistenceState,
  readCompletedSimulationDraftState,
  persistCompletedSimulationDraftSlot,
  buildSharedSimulationSeasonUrl,
  bootstrapCompletedSimulationDraftHandoff
};
`;

const fixture = {
  simulationMode: 'nba_mixed_era_single_player_v1',
  leagueShell: {
    sport: 'nba',
    anchorSeasonLabel: '2025-26 NBA',
    teams: [
      { abbr: 'LAL', name: 'Los Angeles Lakers', conference: 'West', division: 'Pacific' },
      { abbr: 'BOS', name: 'Boston Celtics', conference: 'East', division: 'Atlantic' }
    ]
  },
  sourceSeasons: {
    mixedEraConfigId: '1987-1996-2016',
    sourcePackIds: ['nba_1987_full_season_v1', 'nba_1996_full_season_v1', 'nba_2016_full_season_v1'],
    sourceSeasonLabels: ['1986-87', '1995-96', '2015-16']
  },
  draftState: {
    controlledTeamAbbr: 'LAL',
    rostersByTeam: {
      LAL: [
        { id: 23, name: 'Michael Jordan', pos: 'SG', team: 'CHI', historicalPackId: 'nba_1996_full_season_v1' },
        { id: 34, name: 'Hakeem Olajuwon', pos: 'C', team: 'HOU', historicalPackId: 'nba_1996_full_season_v1' }
      ],
      BOS: [
        { id: 30, name: 'Stephen Curry', pos: 'PG', team: 'GSW', historicalPackId: 'nba_2016_full_season_v1' }
      ]
    },
    freeAgents: [
      { id: 50, name: 'Scottie Pippen', pos: 'SF', team: 'CHI', historicalPackId: 'nba_1996_full_season_v1' }
    ]
  },
  seasonState: {
    currentDay: 12,
    currentWeek: 2,
    lineupIdsByTeam: {
      LAL: [23, 34],
      BOS: [30]
    },
    standings: [
      { teamIdx: 0, teamAbbr: 'LAL', conference: 'West', division: 'Pacific', w: 9, l: 3, pf: 1360, pa: 1288 },
      { teamIdx: 1, teamAbbr: 'BOS', conference: 'East', division: 'Atlantic', w: 7, l: 5, pf: 1299, pa: 1274 }
    ],
    activityLog: [
      { type: 'trade', title: 'LAL traded for Hakeem Olajuwon', ts: 12345 }
    ]
  },
  postseasonState: {
    phase: 'regular_season',
    champion: null
  }
};

let persistedArgs = null;
let replacedUrl = null;
const sandbox = {
  module: { exports: {} },
  exports: {},
  console,
  URLSearchParams,
  JSON,
  Number,
  String,
  Array,
  Object,
  Math,
  normalizeRosterbateSport(value) {
    return String(value || 'nba').trim().toLowerCase() || 'nba';
  },
  localStorage: {
    getItem() {
      return null;
    }
  },
  window: {
    location: {
      href: 'rosterbate-season.html?sport=nba&simulation=nba_mixed_era',
      replace(url) {
        replacedUrl = url;
        this.href = url;
      }
    },
    RosterBateSimulationModeRuntime: {
      readCompletedSimulationState() {
        return fixture;
      }
    },
    RosterBateHistoricalUniverseSlots: {
      upsertFromState(state, options) {
        persistedArgs = {
          state: toPlain(state),
          options: toPlain(options)
        };
        return {
          slotId: 'sim-slot-1'
        };
      }
    }
  }
};

vm.createContext(sandbox);
vm.runInContext(harnessSource, sandbox, { filename: 'shared-season-shell-simulation.vm.js' });

const api = sandbox.module.exports;

assert.equal(api.getRequestedSimulationMode(new URLSearchParams('?simulation=NBA_Mixed_Era')), 'nba_mixed_era');
assert.equal(api.shouldPersistSharedSimulationState(fixture), true, 'shared-shell handoff should recognize raw simulation universes');

const normalized = toPlain(api.normalizeSharedSimulationSeasonBootState(fixture, 'sim-slot-1'));
assert.equal(normalized.historicalUniverseSlotId, 'sim-slot-1', 'boot normalization should preserve the slot id');
assert.equal(normalized.seasonId, 'simulation:sim-slot-1', 'boot normalization should produce a stable season id');
assert.equal(normalized.leagueSize, 2, 'boot normalization should derive league size from the simulation shell');
assert.deepEqual(normalized.teams, ['Los Angeles Lakers', 'Boston Celtics'], 'boot normalization should expose legacy team-name arrays');
assert.equal(normalized.allRosters[0][0].name, 'Michael Jordan', 'boot normalization should map team rosters into the shared shell');
assert.equal(normalized.freeAgents[0].name, 'Scottie Pippen', 'boot normalization should preserve free agents for the shared shell');
assert.deepEqual(normalized.starters, [[23, 34], [30]], 'boot normalization should map lineup ids into legacy starter arrays');
assert.equal(normalized.historicalPlayerPool.length, 4, 'boot normalization should expose a full mixed-era player pool for waiver reconstruction');

const handoff = toPlain(api.bootstrapCompletedSimulationDraftHandoff(
  new URLSearchParams('?sport=nba&simulation=nba_mixed_era'),
  'nba'
));

assert.deepEqual(
  handoff,
  {
    redirected: true,
    slotId: 'sim-slot-1',
    url: 'rosterbate-season.html?sport=nba&simulation=nba_mixed_era&historicalUniverse=sim-slot-1'
  },
  'completed simulation drafts should redirect onto a canonical slot-backed shared-season URL'
);
assert.equal(
  replacedUrl,
  'rosterbate-season.html?sport=nba&simulation=nba_mixed_era&historicalUniverse=sim-slot-1',
  'completed simulation handoff should update window.location to the canonical slot-backed route'
);
assert.equal(persistedArgs.options.reason, 'completed_simulation_handoff', 'completed simulation handoff should use a dedicated persistence reason');
assert.equal(
  persistedArgs.state.simulationMode,
  'nba_mixed_era_single_player_v1',
  'completed simulation handoff should persist the raw simulation state shape into slot storage'
);

const fallbackSandbox = {
  module: { exports: {} },
  exports: {},
  console,
  URLSearchParams,
  JSON,
  Number,
  String,
  Array,
  Object,
  Math,
  normalizeRosterbateSport(value) {
    return String(value || 'nba').trim().toLowerCase() || 'nba';
  },
  localStorage: {
    getItem() {
      return null;
    }
  },
  window: {
    location: {
      href: 'rosterbate-season.html?sport=nba&simulation=nba_mixed_era'
    },
    RosterBateSimulationModeRuntime: {
      readCompletedSimulationState() {
        return fixture;
      }
    },
    RosterBateHistoricalUniverseSlots: {
      upsertFromState() {
        return null;
      }
    }
  }
};

vm.createContext(fallbackSandbox);
vm.runInContext(harnessSource, fallbackSandbox, { filename: 'shared-season-shell-simulation-fallback.vm.js' });

const fallback = fallbackSandbox.module.exports.bootstrapCompletedSimulationDraftHandoff(
  new URLSearchParams('?sport=nba&simulation=nba_mixed_era'),
  'nba'
);

assert.equal(fallback.redirected, false, 'shared-shell handoff should still return a bootable state when slot persistence is unavailable');
assert.equal(fallback.state.seasonId, 'simulation:shared-season', 'shared-shell fallback boot should still normalize the simulation state');
assert.equal(fallback.state.allRosters[1][0].name, 'Stephen Curry', 'shared-shell fallback boot should still map simulation rosters');

console.log('shared season shell simulation test passed');
