const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  buildManifest,
  entryFromFilename,
  formatManifestChange,
  parseManifestMapping,
  titleFromSlug
} = require('./build-player-portrait-manifest');

assert.equal(titleFromSlug('michael-jordan'), 'Michael Jordan');
assert.equal(titleFromSlug('lebron-james'), 'LeBron James');
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
assert.equal(
  formatManifestChange({
    action: 'set',
    key: 'Manual Player|MAN',
    url: 'assets/player-portraits/manual-player-new.png',
    existingUrl: 'assets/player-portraits/manual-player.png'
  }),
  'SET     Manual Player|MAN -> assets/player-portraits/manual-player-new.png (updates assets/player-portraits/manual-player.png)'
);
assert.deepEqual(
  parseManifestMapping('Anthony Edwards|MIN=assets/player-portraits/anthony-edwards-alt.png'),
  { key: 'Anthony Edwards|MIN', url: 'assets/player-portraits/anthony-edwards-alt.png' },
  'explicit manifest mappings should parse key=url pairs'
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

const manual = buildManifest({
  dir,
  manifest: manifestPath,
  mappings: [
    { key: 'Shai Gilgeous-Alexander|OKC', url: 'assets/player-portraits/custom-shai.png' },
    parseManifestMapping('Manual Player|MAN=assets/player-portraits/manual-player-new.png')
  ]
});
assert.equal(
  manual.manifest.players['Shai Gilgeous-Alexander|OKC'],
  'assets/player-portraits/custom-shai.png',
  'manifest builder should add explicit player mappings without requiring filename convention changes'
);
assert.equal(
  manual.manifest.players['Manual Player|MAN'],
  'assets/player-portraits/manual-player-new.png',
  'manifest builder should let explicit mappings update existing entries'
);
assert.deepEqual(
  manual.changes.filter((change) => change.action === 'set').map(({ action, key, url, existingUrl }) => ({ action, key, url, existingUrl })),
  [
    {
      action: 'set',
      key: 'Manual Player|MAN',
      url: 'assets/player-portraits/manual-player-new.png',
      existingUrl: 'assets/player-portraits/manual-player.png'
    },
    {
      action: 'set',
      key: 'Shai Gilgeous-Alexander|OKC',
      url: 'assets/player-portraits/custom-shai.png',
      existingUrl: undefined
    }
  ],
  'manifest builder should expose explicit mapping changes in the review plan'
);

console.log('test-player-portrait-manifest passed');
