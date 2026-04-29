const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'sport-config-live.js'), 'utf8');

const context = {
  location: { search: '' },
  localStorage: { getItem: () => null },
  URLSearchParams
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(source, context, { filename: 'sport-config-live.js' });

const nbaConfig = context.window.getRosterbateSportConfig('nba');
const nbaRules = context.window.getRosterbateLeagueRuleDefaults('nba');

assert.deepStrictEqual(
  Array.from(nbaConfig.starterSlots),
  ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL', 'UTIL', 'UTIL'],
  'nba sport config should use the ESPN-style 10-starter layout'
);
assert.deepStrictEqual(
  Array.from(nbaConfig.myTeamSlots),
  ['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'UTIL', 'UTIL', 'UTIL', 'BN', 'BN', 'BN', 'IR', 'IR'],
  'nba my-team slots should expose three bench rows and two IR rows after the 10 starters'
);
assert.equal(nbaRules.starters, 10, 'nba league rules should count 10 starters');
assert.equal(nbaRules.benchSlots, 3, 'nba league rules should keep 15 roster slots by reducing bench to 3');
assert.equal(nbaRules.irSlots, 2, 'nba league rules should keep two IR slots');
assert.equal(nbaRules.positions.C.starters, 1, 'nba league rules should use one required center starter');
assert.equal(nbaRules.positions.UTIL.starters, 3, 'nba league rules should use three utility starter slots');

console.log('sport config live test passed');
