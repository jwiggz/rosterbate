const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  buildManifest,
  entryFromFilename,
  formatManifestChange,
  titleFromSlug
} = require('./build-player-portrait-manifest');

assert.equal(titleFromSlug('michael-jordan'), 'Michael Jordan');
assert.equal(titleFromSlug('nikola_jokic'), 'Nikola Jokic');
assert.equal(titleFromSlug('nikola-jokic-203999'), 'Nikola Jokic');
assert.deepEqual(
  entryFromFilename('michael-jordan__CHI.png', 'assets/player-portraits/michael-jordan__CHI.png'),
  { key: 'Michael Jordan|CHI', url: 'assets/player-portraits/michael-jordan__CHI.png' }
);
assert.deepEqual(
  entryFromFilename('larry-bird.webp', 'assets/player-portraits/larry-bird.webp'),
  { key: 'Larry Bird', url: 'assets/player-portraits/larry-bird.webp' }
);
assert.deepEqual(
  entryFromFilename('anthony edwards.png', 'assets/player-portraits/anthony edwards.png'),
  { key: 'Anthony Edwards', url: 'assets/player-portraits/anthony edwards.png' }
);
assert.deepEqual(
  entryFromFilename('shai-gilgeous-alexander-1628983.jpg', 'assets/player-portraits/shai-gilgeous-alexander-1628983.jpg'),
  { key: 'Shai Gilgeous Alexander', url: 'assets/player-portraits/shai-gilgeous-alexander-1628983.jpg' }
);
assert.equal(entryFromFilename('README.md', 'assets/player-portraits/README.md'), null);
assert.equal(
  formatManifestChange({ action: 'add', key: 'Anthony Edwards', url: 'assets/player-portraits/anthony edwards.png' }),
  'ADD     Anthony Edwards -> assets/player-portraits/anthony edwards.png'
);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rb-portraits-'));
const manifestPath = path.join(dir, 'manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify({
  '$schema': 'rosterbate-player-portrait-manifest-v1',
  players: {
    'Manual Player|MAN': 'assets/player-portraits/manual-player.png',
    'Michael Jordan|CHI': 'assets/player-portraits/manual-jordan.png'
  }
}, null, 2));
fs.writeFileSync(path.join(dir, 'michael-jordan__CHI.png'), '');
fs.writeFileSync(path.join(dir, 'nikola-jokic__DEN.webp'), '');
fs.writeFileSync(path.join(dir, 'not-an-image.txt'), '');

const result = buildManifest({ dir, manifest: manifestPath });
assert.equal(result.changed, true, 'manifest builder should report missing discovered images');
assert.equal(
  result.manifest.players['Michael Jordan|CHI'],
  'assets/player-portraits/manual-jordan.png',
  'manifest builder should preserve manual entries by default'
);
assert.equal(
  result.manifest.players['Nikola Jokic|DEN'],
  'assets/player-portraits/nikola-jokic__DEN.webp',
  'manifest builder should add discovered image entries'
);
assert.equal(
  result.manifest.players['Manual Player|MAN'],
  'assets/player-portraits/manual-player.png',
  'manifest builder should keep unrelated manual entries'
);
assert.deepEqual(
  result.changes.map(({ action, key, url, existingUrl }) => ({ action, key, url, existingUrl })),
  [
    {
      action: 'keep',
      key: 'Michael Jordan|CHI',
      url: 'assets/player-portraits/michael-jordan__CHI.png',
      existingUrl: 'assets/player-portraits/manual-jordan.png'
    },
    {
      action: 'add',
      key: 'Nikola Jokic|DEN',
      url: 'assets/player-portraits/nikola-jokic__DEN.webp',
      existingUrl: undefined
    }
  ],
  'manifest builder should expose a reviewable per-file change plan'
);

const forced = buildManifest({ dir, manifest: manifestPath, force: true });
assert.equal(
  forced.manifest.players['Michael Jordan|CHI'],
  'assets/player-portraits/michael-jordan__CHI.png',
  'manifest builder should replace colliding entries with --force'
);
assert.deepEqual(
  forced.changes.find((change) => change.key === 'Michael Jordan|CHI'),
  {
    action: 'replace',
    key: 'Michael Jordan|CHI',
    url: 'assets/player-portraits/michael-jordan__CHI.png',
    existingUrl: 'assets/player-portraits/manual-jordan.png'
  },
  'manifest builder should mark forced collisions as replacements'
);

console.log('test-player-portrait-manifest passed');
