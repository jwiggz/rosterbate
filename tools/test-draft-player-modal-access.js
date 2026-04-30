const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-draft.html'), 'utf8');

assert.match(
  source,
  /function\s+openPModal\s*\(\s*idx\s*,\s*options\s*=\s*\{\}\s*\)/,
  'draft player modal should accept options so drafted roster rows can open in view-only mode'
);
assert.match(
  source,
  /function\s+openPModalById\s*\(\s*playerId\s*,\s*options\s*=\s*\{\}\s*\)/,
  'draft page should expose a player-id modal opener for My Team and Teams rows'
);
assert.match(
  source,
  /class="rs draft-player-inspect-row"[\s\S]*openPModalById\(\$\{Number\(p\.id\)\},\{viewOnly:true\}\)/,
  'My Team roster rows should open player stats in view-only mode'
);
assert.match(
  source,
  /class="team-menu-player draft-player-inspect-row"[\s\S]*openPModalById\(\$\{Number\(player\.id\)\},\{viewOnly:true\}\)/,
  'Teams tab roster rows should open player stats in view-only mode'
);
assert.match(
  source,
  /\.draft-player-inspect-row:hover/,
  'inspectable draft roster rows should have a visible hover state'
);
assert.match(
  source,
  /bDraft'\)\.disabled\s*=\s*!\(canDraft\|\|canNominate\)/,
  'view-only player modals should disable the draft button instead of leaving a misleading action'
);

console.log('test-draft-player-modal-access passed');
