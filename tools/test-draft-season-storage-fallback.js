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
  /function ensureLocalDraftSeasonId\(draftData\)\{[\s\S]*local_draft_[\s\S]*draftData\.seasonId=localSeasonId[\s\S]*return localSeasonId;[\s\S]*\}/,
  'ordinary local draft completion should mint a stable local season id when cloud save does not provide one'
);

assert.match(
  draftHtml,
  /ensureLocalDraftSeasonId\(draftData\);[\s\S]*localStorage\.setItem\('rosterbateDraft', JSON\.stringify\(draftData\)\);[\s\S]*persistPendingSeasonLaunch\(draftData\);/s,
  'draft completion should keep the best-effort localStorage snapshot while also staging the safer pending handoff'
);

assert.match(
  draftHtml,
  /if\(!seasonId && draftData && !draftData\.multiplayer\)\{[\s\S]*seasonId=ensureLocalDraftSeasonId\(draftData\);[\s\S]*persistPendingSeasonLaunch\(draftData\);[\s\S]*\}/,
  'season URL resolution should fall back to the freshly drafted local season id instead of opening a generic season page'
);

console.log('draft season storage fallback test passed');
