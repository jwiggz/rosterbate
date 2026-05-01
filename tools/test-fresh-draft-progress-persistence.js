const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const seasonHtml = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-season.html'), 'utf8');

function extractBetween(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  assert.notEqual(start, -1, `expected to find start marker: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(end, -1, `expected to find end marker: ${endMarker}`);
  return source.slice(start, end);
}

function extractFunction(source, functionName) {
  const marker = `function ${functionName}(`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, `expected to find function ${functionName}`);
  let depth = 0;
  let started = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') {
      depth += 1;
      started = true;
    } else if (char === '}') {
      depth -= 1;
      if (started && depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`could not extract function ${functionName}`);
}

const runtimeSource = `
let D = {
  seasonId: 'season_60',
  leagueId: 'season_60',
  sport: 'nba',
  leagueSize: 2,
  teams: ['Team A', 'Team B'],
  allRosters: [[{ id: 1, name: 'A', pos: 'PG' }], [{ id: 2, name: 'B', pos: 'SG' }]],
  standings: [{ teamIdx: 0, w: 0, l: 0, pf: 0, pa: 0 }, { teamIdx: 1, w: 0, l: 0, pf: 0, pa: 0 }],
  currentWeek: 1,
  currentDay: 1,
  lastRevealedDay: 0,
  isFreshDraftLaunch: true,
  multiplayer: false
};
let G = {
  week: 1,
  day: 2,
  standings: [{ teamIdx: 0, w: 1, l: 0, pf: 120, pa: 110 }, { teamIdx: 1, w: 0, l: 1, pf: 110, pa: 120 }],
  rosters: [[{ id: 1, name: 'A', pos: 'PG' }], [{ id: 2, name: 'B', pos: 'SG' }]],
  isSeasonComplete: false,
  dayResults: { 1: { 0: { total: 120 }, 1: { total: 110 } } },
  revealedDays: { 1: true },
  settledWeeks: {},
  processed: new Set(),
  tradeOffers: [],
  activityLog: [],
  dailyRevealReports: { 1: { day: 1 } },
  recentDrops: [],
  moneyBallLocks: {},
  cpuTradeMarketDaysProcessed: {},
  waiverPriority: {},
  waiver: []
};
const writes = [];
const localStorage = {
  setItem(key, value) {
    writes.push({ key, value });
  }
};
const console = { log() {}, warn() {}, error() {} };
let sharedSeasonHydrating = false;
let sharedSeasonSaveTimer = null;
function getActiveSeasonBackend() { return 'fantasy'; }
function normalizeLocalLeagueDraftSnapshot(state) { return state; }
function buildLocalSimulationResumePointer() { return null; }
function compactSimulationSeasonStorageState(state) { return state; }
function persistHistoricalUniverseSlotSnapshot() {}
async function saveSeasonToFirebase() { return false; }
${extractFunction(seasonHtml, 'writeLocalDraftSnapshot')}
${extractFunction(seasonHtml, 'syncGameStateToD')}
${extractFunction(seasonHtml, 'queueSharedSeasonSave')}
queueSharedSeasonSave('advance_day');
module.exports = {
  saved: JSON.parse(writes.find((entry) => entry.key === 'rosterbateDraft').value)
};
`;

const sandbox = { module: { exports: {} }, exports: {}, setTimeout, clearTimeout };
vm.createContext(sandbox);
vm.runInContext(runtimeSource, sandbox);

const saved = sandbox.module.exports.saved;
assert.equal(saved.currentDay, 2, 'advanced local season saves should persist the next day');
assert.equal(saved.lastRevealedDay, 1, 'advanced local season saves should keep the reveal cursor');
assert.equal(saved.isFreshDraftLaunch, false, 'advanced local season saves must stop booting as a fresh draft');

console.log('fresh draft progress persistence test passed');
