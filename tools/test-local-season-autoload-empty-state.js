const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-season.html'), 'utf8');

assert.match(
  html,
  /const localAutoLoad=resolveLocalSavedSeasonAutoLoad\(parsed, requestedSport\);[\s\S]*if\(localAutoLoad\)\{[\s\S]*hideSeasonEmptyState\(\);[\s\S]*console\.log\('\?\? Loading saved season data\.\.\.'\);/s,
  'local season auto-load should hide the empty Season Manager state before restoring a saved local league'
);

console.log('local season autoload empty-state test passed');
