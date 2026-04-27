const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

assert.match(
  html,
  /function openHomepageSoloLeague\(seasonId\)\{/,
  'homepage should expose the local league reopen helper'
);
assert.match(
  html,
  /const targetSeasonId=String\(seasonId \|\| ''\)\.trim\(\);/,
  'homepage local league reopen should normalize the selected season id before routing'
);
assert.match(
  html,
  /if\(targetSeasonId && targetSeasonId!=='local'\) params\.set\('league', targetSeasonId\);/,
  'homepage local league reopen should skip the synthetic local league query id'
);
assert.match(
  html,
  /window\.location\.href='rosterbate-season\.html\?'\+params\.toString\(\);/,
  'homepage local league reopen should route through the generic local season boot path'
);

console.log('homepage local league open test passed');
