const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  buildCoverageReport,
  hasPortrait,
  parseCsvLine,
  readRankedPlayers
} = require('./report-player-portrait-coverage');

assert.deepEqual(parseCsvLine('1,"Gilgeous-Alexander, Shai",OKC'), ['1', 'Gilgeous-Alexander, Shai', 'OKC']);
assert.equal(hasPortrait({ 'Luka Doncic|LAL': 'luka.webp' }, { name: 'Luka Doncic', team: 'LAL' }), true);
assert.equal(hasPortrait({ 'Luka Doncic': 'luka.webp' }, { name: 'Luka Doncic', team: 'DAL' }), true);
assert.equal(hasPortrait({ 'Luka Doncic|LAL': 'luka.webp' }, { name: 'Luka Doncic', team: 'DAL' }), false);

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rb-portrait-coverage-'));
const source = path.join(dir, 'players.csv');
const manifest = path.join(dir, 'manifest.json');

fs.writeFileSync(source, [
  'RANK,PLAYER,TEAM',
  '1,Nikola Jokic,DEN',
  '2,Luka Doncic,LAL',
  '3,Anthony Edwards,MIN'
].join('\n'));
fs.writeFileSync(manifest, JSON.stringify({
  '$schema': 'rosterbate-player-portrait-manifest-v1',
  players: {
    'Luka Doncic|LAL': 'assets/player-portraits/luka-doncic__LAL.webp'
  }
}, null, 2));

const players = readRankedPlayers(source);
assert.equal(players.length, 3);
assert.deepEqual(players[0], { rank: 1, name: 'Nikola Jokic', team: 'DEN' });

const report = buildCoverageReport({ source, manifest, limit: 3 });
assert.equal(report.covered, 1);
assert.equal(report.missing, 2);
assert.equal(report.coveragePct, 33.3);
assert.equal(report.rows[1].covered, true);
assert.equal(report.rows[0].covered, false);

console.log('test-player-portrait-coverage passed');
