const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const helperPath = path.join(root, 'portrait-manifest-dev.html');
const packagePath = path.join(root, 'package.json');

assert.equal(fs.existsSync(helperPath), true, 'portrait manifest dev helper page should exist');

const html = fs.readFileSync(helperPath, 'utf8');
assert.match(html, /<script src="player-portrait-assets\.js"><\/script>/, 'helper should use the shared portrait asset pipeline');
assert.match(html, /rbPlayerPortraitOverrides/, 'helper should edit the same localStorage override registry used by runtime portraits');
assert.match(html, /assets\/player-portraits\/manifest\.json/, 'helper should load the canonical portrait manifest');
assert.match(html, /id="portrait-player-name"/, 'helper should expose a player-name lookup field');
assert.match(html, /id="portrait-team"/, 'helper should expose a team-code lookup field');
assert.match(html, /id="portrait-url"/, 'helper should expose a portrait URL override field');
assert.match(html, /id="manifest-grid"/, 'helper should render a manifest preview grid');
assert.match(html, /_keyCandidates/, 'helper should display runtime lookup candidates');
assert.match(html, /getPortraitUrl/, 'helper should preview the resolved portrait image');

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
assert.equal(
  pkg.scripts['portraits:dev'],
  'node tools/open-static-page.js portrait-manifest-dev.html',
  'package.json should expose a local helper launcher'
);

console.log('test-player-portrait-dev-helper passed');
