const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'rosterbate-season.html'),
  'utf8'
);

assert.match(html, /<script src="cpu-sim-lineups\.js"><\/script>/);

function extractFunctionSource(name, nextName) {
  const start = html.indexOf(`function ${name}`);
  assert.ok(start >= 0, `missing ${name}`);
  const end = html.indexOf(`\nfunction ${nextName}`, start);
  assert.ok(end >= 0, `missing ${nextName}`);
  return html.slice(start, end);
}

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

vm.runInNewContext(`${buildCpuManagedStarterIdsForDaySource}\n${rebuildLineupsAfterRosterChangeSource}`, context);

const cpuManagedResult = context.buildCpuManagedStarterIdsForDay(0, context.G.rosters[0], 4);
assert.deepStrictEqual(cpuManagedResult, ['cpu']);
assert.equal(calls.length, 1);
assert.strictEqual(calls[0].roster, context.G.rosters[0]);

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
