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

const pendingLaunchSource = `
${extractBetween(seasonHtml, "const RB_PENDING_SEASON_KEY = 'rbPendingSeasonLaunch';", 'function getMatchingLocalLeagueData(')}
module.exports = {
  getPendingSeasonLaunch,
  clearPendingSeasonLaunch
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

console.log('local league storage fallback test passed');
