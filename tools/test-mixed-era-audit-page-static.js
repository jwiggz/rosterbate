const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'mixed-era-audit.html'), 'utf8');

function expectMatch(pattern, message) {
  assert.match(html, pattern, message);
}

expectMatch(/<section class="grid">[\s\S]*<article class="panel">[\s\S]*<h2>Top 10 Composition<\/h2>[\s\S]*<span id="top10Verdict" class="badge"/i, 'Top 10 composition panel structure is missing');
expectMatch(/<section class="grid">[\s\S]*<h2>Top 25 Composition<\/h2>[\s\S]*<span id="top25Verdict" class="badge"/i, 'Top 25 composition panel structure is missing');
expectMatch(/<section class="grid">[\s\S]*<h2>Top 50 Composition<\/h2>[\s\S]*<span id="top50Verdict" class="badge"/i, 'Top 50 composition panel structure is missing');
expectMatch(/<section class="grid">[\s\S]*<h2>Top 100 Composition<\/h2>[\s\S]*<span id="top100Verdict" class="badge"/i, 'Top 100 composition panel structure is missing');
expectMatch(/<section class="grid">[\s\S]*<h2>Full Pool Composition<\/h2>[\s\S]*<span id="fullPoolVerdict" class="badge"/i, 'Full pool composition panel structure is missing');
expectMatch(/<section class="audit-grid">[\s\S]*<h2>Tier Integrity Bands<\/h2>[\s\S]*<div id="tierBands" class="metric-list"><\/div>/i, 'Tier bands panel structure is missing');
expectMatch(/<section class="audit-grid">[\s\S]*<h2>Star Fairness Check<\/h2>[\s\S]*<span class="badge badge-review">Review<\/span>/i, 'Star fairness review badge should be neutral');
expectMatch(/<section class="audit-grid">[\s\S]*<h2>Raw vs Normalized Sanity Check<\/h2>[\s\S]*<span class="badge badge-review">Review<\/span>/i, 'Raw vs normalized review badge should be neutral');
expectMatch(/<section class="audit-grid">[\s\S]*<h2>Draft-Feel Check<\/h2>[\s\S]*<span class="badge badge-review">Review<\/span>/i, 'Draft-feel review badge should be neutral');
expectMatch(/compositionChecks/i, 'compositionChecks hook is missing');
expectMatch(/tierBands/i, 'tierBands hook is missing');
expectMatch(/boardSelector/i, 'boardSelector hook is missing');
expectMatch(/reloadButton/i, 'reloadButton hook is missing');
expectMatch(/<tbody id="rows">[\s\S]*No audit board loaded yet\./i, 'table rows node is missing');
expectMatch(/function renderCompositionCheck\(target, check\)/i, 'renderCompositionCheck hook is missing');
expectMatch(/function renderTierBands\(bands\)/i, 'renderTierBands hook is missing');
expectMatch(/var checksById = \(Array\.isArray\(viewModel\.compositionChecks\)/i, 'compositionChecks rendering path is missing');
expectMatch(/multiple headline stars are clearly misplaced by tier/i, 'Star Fairness threshold copy is missing');
expectMatch(/a human reviewer would hesitate to draft/i, 'Draft-Feel threshold copy is missing');
assert.doesNotMatch(html, /badge-pass">Review/i, 'Manual review panels should not use pass styling');

console.log('mixed-era audit page static test passed');
