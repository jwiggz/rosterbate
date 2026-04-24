const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const baseDir = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(baseDir, relativePath), 'utf8');
}

const files = {
  index: read('index.html'),
  historicSeasons: read('historic-seasons.html'),
  myLeagues: read('my-leagues.html'),
  historicUniverse: read('historic-universe.html'),
  rosterbateSeason: read('rosterbate-season.html'),
  simulationLeagueEngine: read('simulation-league-engine.js')
};

for (const [name, text] of Object.entries(files)) {
  assert.doesNotMatch(text, /Play The Real Season/, `${name} should not market real-season replay`);
  assert.doesNotMatch(text, /relive the real season/i, `${name} should not invite users to relive the real season`);
  assert.doesNotMatch(text, /the historical league intact/i, `${name} should not promise the historical league intact`);
}

assert.match(
  files.historicSeasons,
  /Historical season stats/,
  'historic-seasons.html should label coverage as Historical season stats'
);
assert.match(
  files.rosterbateSeason,
  /Historical season stats \+ light authored tuning/,
  'rosterbate-season.html should describe simulation ratings as Historical season stats plus light authored tuning'
);
assert.match(
  files.simulationLeagueEngine,
  /Historical season stats \+ light authored tuning/,
  'simulation-league-engine.js should persist simulation ratings as Historical season stats plus light authored tuning'
);

console.log('remove real season copy audit test passed');
