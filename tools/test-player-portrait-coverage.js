const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  buildCoverageReport,
  buildPortraitPrompt,
  formatPortraitPromptLine,
  hasPortrait,
  normalizeCoverageKey,
  parseCsvLine,
  readRankedPlayers,
  slugifyName,
  suggestedFilename
} = require('./report-player-portrait-coverage');

assert.deepEqual(parseCsvLine('1,"Gilgeous-Alexander, Shai",OKC'), ['1', 'Gilgeous-Alexander, Shai', 'OKC']);
assert.equal(hasPortrait({ 'Luka Doncic|LAL': 'luka.webp' }, { name: 'Luka Doncic', team: 'LAL' }), true);
assert.equal(hasPortrait({ 'Luka Doncic': 'luka.webp' }, { name: 'Luka Doncic', team: 'DAL' }), true);
assert.equal(hasPortrait({ 'Luka Doncic|LAL': 'luka.webp' }, { name: 'Luka Doncic', team: 'DAL' }), false);
assert.equal(hasPortrait({ 'Shai Gilgeous Alexander': 'shai.jpg' }, { name: 'Shai Gilgeous-Alexander', team: 'OKC' }), true);
assert.equal(normalizeCoverageKey('Shai Gilgeous-Alexander|OKC'), 'shai gilgeous alexander|okc');
assert.equal(slugifyName('Shai Gilgeous-Alexander'), 'shai-gilgeous-alexander');
assert.equal(suggestedFilename({ name: 'Karl-Anthony Towns', team: 'NYK' }), 'karl-anthony-towns__NYK.webp');
const devinBookerPrompt = buildPortraitPrompt({ name: 'Devin Booker', team: 'PHX' });
assert.match(devinBookerPrompt, /square illustrated bust portrait/, 'portrait prompt helper should describe the framing');
assert.match(devinBookerPrompt, /Devin Booker/, 'portrait prompt helper should name the player');
assert.match(devinBookerPrompt, /PHX team colors/, 'portrait prompt helper should describe the team-color jersey');
assert.equal(
  formatPortraitPromptLine({
    rank: 6,
    name: 'Devin Booker',
    team: 'PHX',
    suggestedFilename: 'devin-booker__PHX.webp'
  }),
  'PROMPT #  6 Devin Booker (PHX) -> devin-booker__PHX.webp\nCreate a 512x512 square illustrated bust portrait of Devin Booker wearing a basketball jersey in PHX team colors. Use a clean light or white background, chest-and-head framing with the face near the upper center, polished sports-card lighting, and no text or logos.',
  'portrait prompt lines should include the target filename and copyable image prompt'
);

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
assert.equal(report.rows[0].suggestedFilename, 'nikola-jokic__DEN.webp');
assert.equal(report.rows[0].suggestedPath, 'assets/player-portraits/nikola-jokic__DEN.webp');

console.log('test-player-portrait-coverage passed');
