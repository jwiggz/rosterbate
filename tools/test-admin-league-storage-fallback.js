const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'admin-leagues.html'), 'utf8');

assert.match(
  html,
  /const RB_PENDING_SEASON_KEY='rbPendingSeasonLaunch';/,
  'admin league opener should define the shared pending season handoff key'
);

assert.match(
  html,
  /function persistAdminPendingSeasonLaunch\(payload\)\{[\s\S]*sessionStorage\.setItem\(RB_PENDING_SEASON_KEY, JSON\.stringify\(pendingPayload\)\);[\s\S]*\}/,
  'admin league opener should stage a session-backed pending handoff before navigation'
);

assert.match(
  html,
  /const launchPayload=normalizeAdminLaunchPayload\(payload\);[\s\S]*persistAdminPendingSeasonLaunch\(launchPayload\);[\s\S]*localStorage\.setItem\("rosterbateDraft",JSON\.stringify\(launchPayload\)\);/s,
  'admin direct-open should keep the same best-effort localStorage snapshot alongside the session-backed handoff'
);

console.log('admin league storage fallback test passed');
