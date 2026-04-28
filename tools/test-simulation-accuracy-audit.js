const assert = require('node:assert/strict');

const {
  runHistoricalPackSanityCheck,
  runAccuracyAudit,
  runAccuracyAuditSuite
} = require('./simulation-accuracy-audit.js');

const nbaAudit = runAccuracyAudit({ sport: 'nba' });
assert.equal(nbaAudit.sport, 'nba');
assert.ok(nbaAudit.metrics.teamTotals.samples > 0, 'nba audit should record team total samples');
assert.ok(
  Number.isFinite(nbaAudit.metrics.teamTotals.mean),
  'nba audit should compute a finite team total mean'
);
assert.ok(Array.isArray(nbaAudit.failedGuardrails), 'nba audit should report guardrail failures as an array');
assert.equal(
  Object.prototype.hasOwnProperty.call(nbaAudit.metrics, 'nflPositionShape'),
  false,
  'nba audit output should not include zero-filled nfl position shape metrics'
);
assert.ok(
  Number.isFinite(nbaAudit.metrics.zeroTeamTotalRate),
  'nba audit should compute a finite zero-team-total rate'
);
assert.ok(
  Number.isFinite(nbaAudit.metrics.topStarShareMean),
  'nba audit should compute a finite top-star share metric'
);
assert.ok(
  nbaAudit.metrics.topStarShareMean >= 0.26,
  `nba elite top-star share should feel more takeover-prone without drifting too low: ${nbaAudit.metrics.topStarShareMean}`
);
assert.ok(
  nbaAudit.metrics.teamTotals.stdev <= 12.5,
  `nba takeover tuning should keep team-total variance near the low-variance baseline: ${nbaAudit.metrics.teamTotals.stdev}`
);
assert.ok(
  Number.isFinite(nbaAudit.metrics.nbaRoleShape.topScorerPointShareMean),
  'nba audit should compute top-scorer point share'
);
assert.ok(
  nbaAudit.metrics.nbaRoleShape.topScorerPointShareMean >= 0.27,
  `nba top scorers should own a distinct share of team points: ${nbaAudit.metrics.nbaRoleShape.topScorerPointShareMean}`
);
assert.ok(
  nbaAudit.metrics.nbaRoleShape.assistLeaderAssistShareMean >= 0.35,
  `nba heliocentric playmakers should separate in assist creation: ${nbaAudit.metrics.nbaRoleShape.assistLeaderAssistShareMean}`
);
assert.ok(
  nbaAudit.metrics.nbaRoleShape.reboundLeaderReboundShareMean >= 0.34,
  `nba interior rebounders should separate on the glass: ${nbaAudit.metrics.nbaRoleShape.reboundLeaderReboundShareMean}`
);
assert.ok(
  nbaAudit.metrics.nbaRoleShape.centerReboundMean > nbaAudit.metrics.nbaRoleShape.guardReboundMean,
  `nba centers should rebound more than guards: C ${nbaAudit.metrics.nbaRoleShape.centerReboundMean}, G ${nbaAudit.metrics.nbaRoleShape.guardReboundMean}`
);
assert.ok(
  nbaAudit.metrics.nbaRoleShape.guardAssistMean > nbaAudit.metrics.nbaRoleShape.centerAssistMean,
  `nba guards should assist more than centers: G ${nbaAudit.metrics.nbaRoleShape.guardAssistMean}, C ${nbaAudit.metrics.nbaRoleShape.centerAssistMean}`
);
assert.ok(
  nbaAudit.metrics.nbaRoleShape.wingThreeMean >= 0.7,
  `nba wings should retain visible spacing/3-and-D personality: ${nbaAudit.metrics.nbaRoleShape.wingThreeMean}`
);
assert.ok(
  nbaAudit.metrics.nbaRoleShape.defensiveAnchorEventMean >= 3.1,
  `nba defensive anchors should create distinct stocks: ${nbaAudit.metrics.nbaRoleShape.defensiveAnchorEventMean}`
);
assert.equal(
  nbaAudit.failedGuardrails.length,
  0,
  `nba audit guardrails failed: ${nbaAudit.failedGuardrails.join('; ')}`
);

const nflAudit = runAccuracyAudit({ sport: 'nfl' });
assert.equal(nflAudit.sport, 'nfl');
assert.ok(nflAudit.metrics.teamTotals.samples > 0, 'nfl audit should record team total samples');
assert.ok(
  Number.isFinite(nflAudit.metrics.strengthWinRate),
  'nfl audit should compute a finite strength win rate'
);
assert.ok(
  Number.isFinite(nflAudit.metrics.qbShareMean),
  'nfl audit should compute a finite qb-share metric'
);
assert.ok(
  Number.isFinite(nflAudit.metrics.nflPositionShape.qbMean),
  'nfl audit should compute position-level fantasy means'
);
assert.ok(
  nflAudit.metrics.nflPositionShape.qbMean <= 30,
  `nfl qb output should stay useful without overwhelming team totals: ${nflAudit.metrics.nflPositionShape.qbMean}`
);
assert.ok(
  nflAudit.metrics.nflPositionShape.rbMean > nflAudit.metrics.nflPositionShape.teMean,
  `nfl rb output should separate from te output: RB ${nflAudit.metrics.nflPositionShape.rbMean}, TE ${nflAudit.metrics.nflPositionShape.teMean}`
);
assert.ok(
  nflAudit.metrics.nflPositionShape.wrMean > nflAudit.metrics.nflPositionShape.teMean,
  `nfl wr output should separate from te output: WR ${nflAudit.metrics.nflPositionShape.wrMean}, TE ${nflAudit.metrics.nflPositionShape.teMean}`
);
assert.ok(
  nflAudit.metrics.nflPositionShape.rbShareMean >= 0.1,
  `nfl starting rb share should remain fantasy-relevant: ${nflAudit.metrics.nflPositionShape.rbShareMean}`
);
assert.ok(
  Number.isFinite(nflAudit.metrics.nflPositionShape.wrStdev),
  'nfl audit should compute position-level volatility'
);
assert.ok(
  nflAudit.metrics.nflPositionShape.wrStdev > nflAudit.metrics.nflPositionShape.rbStdev,
  `nfl wr output should be more volatile than rb output: WR ${nflAudit.metrics.nflPositionShape.wrStdev}, RB ${nflAudit.metrics.nflPositionShape.rbStdev}`
);
assert.ok(
  nflAudit.metrics.nflPositionShape.rbFloorRate >= nflAudit.metrics.nflPositionShape.wrFloorRate,
  `nfl rb output should carry a steadier floor than wr output: RB ${nflAudit.metrics.nflPositionShape.rbFloorRate}, WR ${nflAudit.metrics.nflPositionShape.wrFloorRate}`
);
assert.ok(Array.isArray(nflAudit.failedGuardrails), 'nfl audit should report guardrail failures as an array');
assert.equal(
  Object.prototype.hasOwnProperty.call(nflAudit.metrics, 'nbaRoleShape'),
  false,
  'nfl audit output should not include zero-filled nba role shape metrics'
);
assert.equal(
  nflAudit.failedGuardrails.length,
  0,
  `nfl audit guardrails failed: ${nflAudit.failedGuardrails.join('; ')}`
);

const suite = runAccuracyAuditSuite();
assert.ok(Array.isArray(suite.audits) && suite.audits.length >= 2, 'suite should include at least nba and nfl audits');
assert.deepStrictEqual(
  suite.failedSports,
  [],
  `suite should not report failing sports: ${suite.failedSports.join(', ')}`
);

const packSanity = runHistoricalPackSanityCheck();
assert.deepStrictEqual(
  packSanity.failedPacks,
  [],
  `historical pack sanity check failed: ${packSanity.failures.map((failure) => `${failure.packId}: ${failure.message}`).join('; ')}`
);
