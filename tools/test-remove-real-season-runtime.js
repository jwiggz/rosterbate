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

const slotsSandbox = {
  console,
  window: {
    localStorage: {
      getItem() { return null; },
      setItem() {},
      removeItem() {}
    }
  }
};
slotsSandbox.window.window = slotsSandbox.window;
vm.createContext(slotsSandbox);
vm.runInContext(slotsSource, slotsSandbox, { filename: 'historical-universe-slots.js' });
const slotsApi = slotsSandbox.window.RosterBateHistoricalUniverseSlots;

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

assert.deepEqual(
  manifestModes,
  ['historical_draft', 'single_player_season'],
  'fixture manifest should only expose supported historical lanes'
);
assert.equal(
  bundle.manifest.defaultEntryMode,
  'historical_draft',
  'fixture manifest should default entry mode to historical_draft'
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
  'Historic Season',
  'historical-universe-slots.js should degrade legacy real_season labels to Historic Season'
);
assert.equal(
  slotsApi.getModeTone('real_season'),
  'historical',
  'historical-universe-slots.js should degrade legacy real_season tone to historical'
);

assert.doesNotMatch(
  devRunnerSource,
  /entryMode\s*:\s*String\(options && options\.entryMode \|\| 'real_season'\)\.trim\(\) \|\| 'real_season'/,
  'historical-pack-dev-runner.js should not default entryMode to real_season when applying fixtures'
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

console.log('remove real season runtime audit test passed');
