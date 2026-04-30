const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  collectImageFiles,
  importPortraits,
  isImageFile
} = require('./import-player-portraits');

assert.equal(isImageFile('luka-doncic-1629029.webp'), true);
assert.equal(isImageFile('notes.txt'), false);

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rb-portrait-import-'));
const source = path.join(root, 'source');
const target = path.join(root, 'portraits');
fs.mkdirSync(source);
fs.writeFileSync(path.join(source, 'anthony-edwards-1630162.jpg'), 'fake image bytes');
fs.writeFileSync(path.join(source, 'readme.txt'), 'not an image');

assert.deepEqual(
  collectImageFiles([source]).map((filePath) => path.basename(filePath)),
  ['anthony-edwards-1630162.jpg']
);

const result = importPortraits({
  sources: [source],
  dir: target,
  manifest: path.join(target, 'manifest.json'),
  coverage: 0
});

assert.equal(result.copied.length, 1);
assert.equal(result.skipped.length, 0);
assert.equal(result.manifestWritten, true);
assert.equal(fs.existsSync(path.join(target, 'anthony-edwards-1630162.jpg')), true);

const manifest = JSON.parse(fs.readFileSync(path.join(target, 'manifest.json'), 'utf8'));
assert.equal(
  manifest.players['Anthony Edwards'],
  'assets/player-portraits/anthony-edwards-1630162.jpg'
);

const rerun = importPortraits({
  sources: [source],
  dir: target,
  manifest: path.join(target, 'manifest.json'),
  coverage: 0
});
assert.equal(rerun.copied.length, 0);
assert.equal(rerun.skipped[0].reason, 'exists');

console.log('test-player-portrait-import passed');
