const assert = require('node:assert/strict');

const {
  parseSimulationAccuracyAuditArgs,
  runHistoricalPackSanityCheck,
  runAccuracyAudit,
  runAccuracyAuditSuite,
  runSeasonRealismAuditSuite,
  runSimulationAccuracyAuditCli
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

const seasonSuite = runSeasonRealismAuditSuite();
assert.ok(
  Array.isArray(seasonSuite.audits) && seasonSuite.audits.length >= 2,
  'season realism suite should include nba and nfl audits'
);
assert.deepStrictEqual(
  seasonSuite.failedSports,
  [],
  `season realism suite should not report failing sports: ${seasonSuite.failedSports.join(', ')}`
);
seasonSuite.audits.forEach((audit) => {
  assert.ok(
    Number.isFinite(audit.metrics.winPctSpread),
    `${audit.sport} season audit should compute standings spread`
  );
  assert.ok(
    Number.isFinite(audit.metrics.topBottomWinPctGap),
    `${audit.sport} season audit should compute roster-strength separation`
  );
  assert.ok(
    audit.metrics.topRosterWinPct > audit.metrics.bottomRosterWinPct,
    `${audit.sport} stronger roster group should finish above weaker roster group`
  );
});

const nbaSummaryCli = runSimulationAccuracyAuditCli([
  '--sport',
  'nba',
  '--season',
  '--packs',
  '--summary'
]);
assert.equal(nbaSummaryCli.exitCode, 0, 'nba summary cli should pass when guardrails pass');
assert.equal(nbaSummaryCli.payload.audits.length, 1, 'sport-filtered cli should run one accuracy audit');
assert.equal(nbaSummaryCli.payload.audits[0].sport, 'nba', 'sport-filtered cli should run the requested sport');
assert.equal(nbaSummaryCli.payload.seasonRealism.audits.length, 1, 'sport-filtered season audit should run one sport');
assert.equal(nbaSummaryCli.payload.seasonRealism.audits[0].sport, 'nba', 'season audit should honor --sport');
assert.ok(nbaSummaryCli.payload.packSanity.packsChecked > 0, '--packs should include pack sanity results');
assert.match(nbaSummaryCli.output, /Simulation Accuracy Audit/i, 'summary output should include a readable title');
assert.match(nbaSummaryCli.output, /NBA\s+PASS/i, 'summary output should show the selected sport result');
assert.match(nbaSummaryCli.output, /Season Realism/i, 'summary output should include the optional season section');
assert.match(nbaSummaryCli.output, /Pack Sanity/i, 'summary output should include the optional pack section');
assert.doesNotMatch(nbaSummaryCli.output, /"audits"/, 'summary output should not be raw JSON');

const defaultJsonCli = runSimulationAccuracyAuditCli([]);
const defaultPayload = JSON.parse(defaultJsonCli.output);
assert.equal(defaultJsonCli.exitCode, 0, 'default cli should preserve the passing JSON suite behavior');
assert.ok(Array.isArray(defaultPayload.audits) && defaultPayload.audits.length >= 2, 'default cli should include both sports');
assert.equal(
  Object.prototype.hasOwnProperty.call(defaultPayload, 'seasonRealism'),
  false,
  'default cli should not run slower season audits unless requested'
);

const nflJsonCli = runSimulationAccuracyAuditCli(['--sport=nfl', '--json']);
const nflPayload = JSON.parse(nflJsonCli.output);
assert.deepStrictEqual(
  nflPayload.audits.map((audit) => audit.sport),
  ['nfl'],
  '--sport=nfl --json should produce a machine-readable filtered payload'
);

const parsed = parseSimulationAccuracyAuditArgs(['--sport', 'nba', '--season', '--packs', '--summary']);
assert.deepStrictEqual(
  parsed,
  { sport: 'nba', includeSeason: true, includePacks: true, outputMode: 'summary', help: false },
  'cli parser should normalize long-form flags'
);
