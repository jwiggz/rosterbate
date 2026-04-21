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
const context = {
  window: {
    RosterBateCpuSimPersonalities: {
      buildCpuSimPersonalitiesByTeam(options) {
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
  }
};

vm.runInNewContext(
  [
    normalizeCpuSimPersonalityValueSource,
    getCpuSimPersonalityApiSource,
    getCpuSimTeamCountSource,
    buildDeterministicCpuTeamPersonalitiesByTeamSource,
    ensureCpuTeamPersonalitiesByTeamSource,
    getCpuTeamSimPersonalitySource,
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
  JSON.stringify(['balanced', 'balanced', 'balanced']),
  'missing saved personalities should backfill safely to balanced'
);
assert.equal(
  JSON.stringify(legacyState.cpuTeamPersonalitiesByTeam),
  JSON.stringify(['balanced', 'balanced', 'balanced'])
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
