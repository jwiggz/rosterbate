const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const draftHtml = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-draft.html'), 'utf8');

assert.match(
  draftHtml,
  /const RB_PENDING_SEASON_KEY = 'rbPendingSeasonLaunch';/,
  'draft page should define the shared pending season handoff key'
);

assert.match(
  draftHtml,
  /function persistPendingSeasonLaunch\(draftData\)\{[\s\S]*sessionStorage\.setItem\(RB_PENDING_SEASON_KEY, JSON\.stringify\(payload\)\);[\s\S]*\}/,
  'draft-to-season handoff should stage the pending season payload in session storage so storage-full browsers can still boot the season page'
);

assert.match(
  draftHtml,
  /localStorage\.setItem\('rosterbateDraft', JSON\.stringify\(draftData\)\);[\s\S]*persistPendingSeasonLaunch\(draftData\);/s,
  'draft completion should keep the best-effort localStorage snapshot while also staging the safer pending handoff'
);

console.log('draft season storage fallback test passed');
