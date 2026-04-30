const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-draft.html'), 'utf8');

assert.match(
  source,
  /function\s+canUseDraftSimulator\(\)[\s\S]*return\s+isLocalDraftTesting\(\)\s*\|\|\s*isSoloTestDraft\(\)/,
  'local draft rooms should expose the Sim Draft control without requiring a lobby query'
);
assert.match(
  source,
  /function\s+simulateDraftToFinish\(\)[\s\S]*showToast\('Local draft rooms only'\)/,
  'Sim Draft should explain that it is local-only when unavailable'
);
assert.match(
  source,
  /btn\.classList\.toggle\('show',\s*canUseDraftSimulator\(\)\s*&&\s*S\.cur\s*<\s*S\.total\)/,
  'Sim Draft button should show while the local draft has picks remaining'
);

console.log('test-draft-sim-button-local passed');
