const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'rosterbate-season.html'),
  'utf8'
);

assert.match(html, /<script src="cpu-sim-lineups\.js"><\/script>/);
assert.match(
  html,
  /function buildCpuManagedStarterIdsForDay\(teamIdx, roster, day\)[\s\S]*?return buildBestLineupIdsForRoster\(roster, day\);/
);
assert.match(
  html,
  /function rebuildLineupsAfterRosterChange\(teamIdx\)\{[\s\S]*?teamDailyLineups\[day\]=buildCpuManagedStarterIdsForDay\(teamIdx, current, day\);/
);
assert.match(
  html,
  /G\.starters=G\.rosters\.map\(\(roster, teamIdx\)=>buildCpuManagedStarterIdsForDay\(teamIdx, roster, G\.day\|\|1\)\);/
);
assert.match(
  html,
  /G\.starters = D\.starters \|\| G\.rosters\.map\(\(roster, teamIdx\)=>buildCpuManagedStarterIdsForDay\(teamIdx, roster, G\.day\|\|1\)\);/
);

console.log('cpu sim lineup wiring test passed');
