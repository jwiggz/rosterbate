const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'mixed-era-audit.html'), 'utf8');

function expectMatch(pattern, message) {
  assert.match(html, pattern, message);
}

expectMatch(/Top 10 Composition/i, 'Top 10 Composition panel is missing');
expectMatch(/Top 25 Composition/i, 'Top 25 Composition panel is missing');
expectMatch(/Top 50 Composition/i, 'Top 50 Composition panel is missing');
expectMatch(/Top 100 Composition/i, 'Top 100 Composition panel is missing');
expectMatch(/Full Pool Composition/i, 'Full Pool Composition panel is missing');
expectMatch(/Tier Integrity Bands/i, 'Tier Integrity Bands panel is missing');
expectMatch(/Star Fairness Check/i, 'Star Fairness Check panel is missing');
expectMatch(/Raw vs Normalized Sanity Check/i, 'Raw vs Normalized Sanity Check panel is missing');
expectMatch(/Draft-Feel Check/i, 'Draft-Feel Check panel is missing');
expectMatch(/compositionChecks/i, 'compositionChecks hook is missing');
expectMatch(/tierBands/i, 'tierBands hook is missing');
expectMatch(/multiple headline stars are clearly misplaced by tier/i, 'Star Fairness threshold copy is missing');
expectMatch(/a human reviewer would hesitate to draft/i, 'Draft-Feel threshold copy is missing');

console.log('mixed-era audit page static test passed');
