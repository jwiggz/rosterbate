const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'rosterbate-season.html'),
  'utf8'
);

assert.match(
  html,
  /<script src="cpu-sim-lineups\.js"><\/script>/,
  'expected rosterbate-season.html to load cpu-sim-lineups.js'
);

assert.match(
  html,
  /function buildCpuManagedStarterIdsForDay\(teamIdx, roster, day\)/,
  'expected a dedicated CPU starter builder helper'
);

assert.match(
  html,
  /isHistoricalSimulationUniverse\(D\)/,
  'expected historical simulation universes to route through the CPU sim helper'
);

assert.match(
  html,
  /window\.RosterBateCpuSimLineups\.buildCpuSimLineupIds/,
  'expected CPU lineup normalization to call the helper'
);

console.log('cpu sim lineup wiring test passed');
