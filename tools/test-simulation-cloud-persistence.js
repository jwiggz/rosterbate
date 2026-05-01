const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-season.html'), 'utf8');

function findMatchingBrace(text, openBraceIndex) {
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = openBraceIndex; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = '';
      }
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error('Could not find matching brace');
}

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `could not find function ${name}`);
  const openBrace = source.indexOf('{', start);
  const end = findMatchingBrace(source, openBrace);
  return source.slice(start, end + 1);
}

function installIfPresent(context, name) {
  if (!source.includes(`function ${name}(`)) return;
  vm.runInContext(extractFunction(name), context, { filename: `season:${name}` });
}

function buildContext(options = {}) {
  const firebaseSaves = [];
  const localPersists = [];
  const adapterState = {
    activeSeasonBackend: 'simulation',
    seasonId: options.seasonId || 'season_60',
    leagueId: options.seasonId || 'season_60',
    multiplayer: !!options.multiplayer,
    seasonState: {
      currentDay: 2,
      currentWeek: 1,
      standings: []
    }
  };
  const context = {
    console,
    D: {
      activeSeasonBackend: 'simulation',
      seasonId: options.seasonId || 'season_60',
      leagueId: options.seasonId || 'season_60',
      multiplayer: !!options.multiplayer,
      seasonState: {
        currentDay: 1,
        currentWeek: 1,
        standings: []
      }
    },
    G: {
      day: 1,
      week: 1,
      leagueMemory: null
    },
    ACTIVE_SEASON_MODE: 'fantasy',
    SEASON_MODE_ADAPTER: {
      getState() {
        return adapterState;
      }
    },
    getActiveSeasonBackend() {
      return 'simulation';
    },
    getRequestedLeagueId() {
      return options.requestedLeagueId || '';
    },
    getSimulationLeagueMemoryApi() {
      return null;
    },
    rehydrateFantasyShellFromSimulationState(state) {
      context.D = {
        ...context.D,
        ...JSON.parse(JSON.stringify(state)),
        activeSeasonBackend: 'simulation'
      };
    },
    persistHistoricalUniverseSlotSnapshot(reason) {
      localPersists.push(reason);
      return { slotId: 'slot-from-test' };
    },
    saveSeasonToFirebase() {
      firebaseSaves.push({
        seasonId: context.D?.seasonId,
        currentDay: context.D?.seasonState?.currentDay
      });
      return Promise.resolve(true);
    },
    __getFirebaseSaves() {
      return firebaseSaves.slice();
    },
    __getLocalPersists() {
      return localPersists.slice();
    }
  };
  vm.createContext(context);
  installIfPresent(context, 'shouldPersistSimulationSeasonToFirebase');
  installIfPresent(context, 'persistSimulationSeasonFirebaseSnapshot');
  vm.runInContext(extractFunction('persistSimulationSeasonState'), context, { filename: 'season:persistSimulationSeasonState' });
  return context;
}

{
  const context = buildContext();
  context.persistSimulationSeasonState('simulation_live_reveal_finish_day');
  assert.deepStrictEqual(
    context.__getLocalPersists(),
    ['simulation_live_reveal_finish_day'],
    'simulation persistence should still write the local universe slot'
  );
  assert.deepStrictEqual(
    context.__getFirebaseSaves(),
    [{ seasonId: 'season_60', currentDay: 2 }],
    'simulation persistence for a cloud-backed league should queue a Firebase save with the advanced day'
  );
}

{
  const context = buildContext({ multiplayer: true });
  context.persistSimulationSeasonState('simulation_live_reveal_finish_day');
  assert.deepStrictEqual(
    context.__getFirebaseSaves(),
    [],
    'multiplayer simulation persistence should not use the solo Firebase save path'
  );
}

console.log('simulation cloud persistence test passed');
