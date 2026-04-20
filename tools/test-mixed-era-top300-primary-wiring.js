const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const authoredTop300 = JSON.parse(read('historical-packs/mixed-era/1996-2016-top300.json'));

const historicSeasons = read('historic-seasons.html');
assert.match(
  historicSeasons,
  new RegExp(
    [
      String.raw`const FALLBACK_CATALOG = \[\s*{\s*`,
      `packId: '${escapeRegExp(authoredTop300.packId)}'`,
      String.raw`[\s\S]*?draftUrl: '${escapeRegExp(authoredTop300.draftUrl)}'`,
      String.raw`[\s\S]*?playerCount: ${authoredTop300.playerCount}`
    ].join('')
  )
);

const draft = read('rosterbate-draft.html');
const requestedConfigSnippet = draft.match(
  /const requestedConfigId=String\([\s\S]*?if\(!requestedConfigId\) return null;/
);
assert.ok(requestedConfigSnippet);
assert.match(
  requestedConfigSnippet[0],
  /getRequestedMixedEraConfigId\(\)[\s\S]*localState\?\.mixedEraConfigId[\s\S]*\|\| '1996-2016-top300'/
);
assert.doesNotMatch(requestedConfigSnippet[0], /\|\| '1996-2016-top100'/);

const historicUniverse = read('historic-universe.html');
assert.match(
  historicUniverse,
  new RegExp(
    [
      String.raw`const FALLBACK_CATALOG = \[\s*{\s*`,
      `packId: '${escapeRegExp(authoredTop300.packId)}'`,
      String.raw`[\s\S]*?draftUrl: '${escapeRegExp(authoredTop300.draftUrl)}'`
    ].join('')
  )
);

const season = read('rosterbate-season.html');
assert.match(season, /mixed_era_1996_2016_top300_v1\s*:\s*'95-96 x 15-16'/);
assert.match(season, /mixed_era_1996_2016_top100_v1\s*:\s*'95-96 x 15-16'/);

console.log('mixed-era top300 primary wiring test passed');
