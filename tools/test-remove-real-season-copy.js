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
  historicalCatalog: read('historical-packs/catalog.json'),
  myLeagues: read('my-leagues.html'),
  historicUniverse: read('historic-universe.html'),
  rosterbateSeason: read('rosterbate-season.html'),
  simulationLeagueEngine: read('simulation-league-engine.js')
};

for (const [name, text] of Object.entries(files)) {
  assert.doesNotMatch(text, /Play The Real Season/, `${name} should not market real-season replay`);
  assert.doesNotMatch(text, /relive the real season/i, `${name} should not invite users to relive the real season`);
  assert.doesNotMatch(text, /the historical league intact/i, `${name} should not promise the historical league intact`);
  assert.doesNotMatch(text, /replaying one roster intact/i, `${name} should not market preserved-roster replay`);
}

assert.doesNotMatch(
  files.historicalCatalog,
  /preserved roster replay/i,
  'historical-packs/catalog.json should not market preserved-roster replay in loader-backed catalog copy'
);
assert.doesNotMatch(
  files.historicalCatalog,
  /real-season boot/i,
  'historical-packs/catalog.json should not market real-season boot in loader-backed catalog copy'
);
assert.doesNotMatch(
  files.historicalCatalog,
  /real season data/i,
  'historical-packs/catalog.json should not market real-season data in loader-backed catalog copy'
);
assert.doesNotMatch(
  files.simulationLeagueEngine,
  /real_season_stats_plus_light_authored_tuning/,
  'simulation-league-engine.js should not persist removed real_season wording in sim profile metadata'
);
assert.doesNotMatch(
  files.historicSeasons,
  /Replay Era Rosters/i,
  'historic-seasons.html should not expose a replay lane in the archive browser'
);
assert.doesNotMatch(
  files.historicSeasons,
  /Real Season/i,
  'historic-seasons.html should not advertise a removed real-season mode'
);
assert.doesNotMatch(
  files.historicSeasons,
  /playRealSeasonBtn/i,
  'historic-seasons.html should not keep the replay button id around'
);
assert.doesNotMatch(
  files.historicSeasons,
  /seasonUrl:\s*'rosterbate-season\.html\?sport=nba&historical=dev/i,
  'historic-seasons.html should not route the season launch through the removed dev historical mode'
);
assert.doesNotMatch(
  files.historicSeasons,
  /plannedModes:\s*\[[^\]]*Replay Era Rosters[^\]]*\]/i,
  'historic-seasons.html should not keep replay-era planned mode copy'
);
assert.doesNotMatch(
  files.myLeagues,
  /continue your saved historical run/i,
  'my-leagues.html should keep generic shared-season fallback copy'
);
assert.match(
  files.myLeagues,
  /Open the shared season manager and continue your shared season\./,
  'my-leagues.html should keep a neutral shared-season fallback line'
);

assert.match(
  files.historicSeasons,
  /Historical season stats/,
  'historic-seasons.html should label coverage as Historical season stats'
);
assert.match(
  files.historicalCatalog,
  /Historical season stats/,
  'historical-packs/catalog.json should carry Historical season stats copy for loader-backed runtime'
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
