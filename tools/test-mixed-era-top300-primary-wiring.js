const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

const historicSeasons = read('historic-seasons.html');
assert.match(historicSeasons, /mixed_era_1996_2016_top300_v1/);
assert.match(historicSeasons, /mixedEraConfigId=1996-2016-top300/);
assert.match(historicSeasons, /playerCount:\s*300/);

const draft = read('rosterbate-draft.html');
assert.match(draft, /'1996-2016-top300'/);
assert.doesNotMatch(draft, /\|\| '1996-2016-top100'/);

const historicUniverse = read('historic-universe.html');
assert.match(historicUniverse, /mixed_era_1996_2016_top300_v1/);
assert.match(historicUniverse, /mixedEraConfigId=1996-2016-top300/);

const season = read('rosterbate-season.html');
assert.match(season, /mixed_era_1996_2016_top300_v1:'95-96 x 15-16'/);
assert.match(season, /mixed_era_1996_2016_top100_v1:'95-96 x 15-16'/);

console.log('mixed-era top300 primary wiring test passed');
