const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'rosterbate-season.html'),
  'utf8'
);

function findMatchingBrace(source, openBraceIndex) {
  let depth = 0;
  let stringQuote = '';
  let inLineComment = false;
  let inBlockComment = false;

  for (let index = openBraceIndex; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (inLineComment) {
      if (char === '\n') inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (stringQuote) {
      if (char === '\\') {
        index += 1;
        continue;
      }
      if (char === stringQuote) {
        stringQuote = '';
      }
      continue;
    }

    if (char === '/' && next === '/') {
      inLineComment = true;
      index += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      inBlockComment = true;
      index += 1;
      continue;
    }

    if (char === '\'' || char === '"' || char === '`') {
      stringQuote = char;
      continue;
    }

    if (char === '{') {
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  throw new Error(`missing closing brace near index ${openBraceIndex}`);
}

function extractFunctionSource(name, { optional = false } = {}) {
  const start = html.indexOf(`function ${name}`);
  if (start < 0) {
    if (optional) return null;
    assert.fail(`missing ${name}`);
  }

  const openBrace = html.indexOf('{', start);
  assert.ok(openBrace >= 0, `missing body for ${name}`);
  const end = findMatchingBrace(html, openBrace);
  return html.slice(start, end + 1);
}

function expectMatch(pattern, message) {
  assert.match(html, pattern, message);
}

expectMatch(/function getWaiverRadarCandidates\(limit=4\)/, 'missing radar helper');
expectMatch(/function getWatchedWaiverTargets\(limit=4\)/, 'missing watched helper');
expectMatch(/function getRecentDroppedWaiverTargets\(limit=4\)/, 'missing recent-drop helper');
expectMatch(/function getWaiverRowSignals\(player\)/, 'missing row signal helper');
expectMatch(/Watch List Snapshot/, 'missing watch list snapshot section');
expectMatch(/Recent Drops/, 'missing recent drops section');
expectMatch(/waiver-radar-reason/, 'missing radar reason hook');
expectMatch(
  /onclick="setWaiverListMode\('all'\)"[\s\S]*?>All Players<\/button>[\s\S]*?onclick="setWaiverListMode\('watch'\)"[\s\S]*?>Watch List[\s\S]*?<\/button>/,
  'missing combined All Players / Watch List browse hook'
);

const script = [
  extractFunctionSource('getWatchListIds()'),
  extractFunctionSource('isWatchListed(pid)'),
  extractFunctionSource('toggleWatchList(pid)'),
  extractFunctionSource('getWaiverTrendScore(player)'),
  extractFunctionSource('buildWaiverRosterNeedProfile()'),
  extractFunctionSource('getWaiverRosterFitScore(player, needProfile)'),
  extractFunctionSource('getWaiverRecentDropBoost(player)'),
  extractFunctionSource('getWaiverWatchListBoost(player)'),
  extractFunctionSource('getWaiverRadarReason(player, context)'),
  extractFunctionSource('getWaiverRadarCandidateScore(player, needProfile)'),
  extractFunctionSource('getWaiverRadarCandidates(limit=4)'),
  extractFunctionSource('getWatchedWaiverTargets(limit=4)'),
  extractFunctionSource('getRecentDroppedWaiverTargets(limit=4)'),
  extractFunctionSource('getWaiverRowSignals(player)')
].join('\n\n');

function makePlayer(id, name, fp, extra = {}) {
  return {
    id,
    name,
    fp,
    pos: extra.pos || 'UTIL',
    team: extra.team || 'SIM',
    pts: extra.pts || 0,
    reb: extra.reb || 0,
    ast: extra.ast || 0,
    ...extra
  };
}

function buildContext() {
  const context = {
    console,
    Math,
    Number,
    String,
    Array,
    Object,
    Set,
    JSON,
    D: {
      watchList: [202]
    },
    G: {
      rosters: [
        [makePlayer(101, 'My Starter', 52, { pos: 'PG' })],
        [makePlayer(102, 'Their Starter', 41, { pos: 'C' })]
      ],
      ilByTeam: [[]],
      waiver: [
        makePlayer(201, 'Fit First', 49, { pos: 'PG', pts: 18, ast: 8 }),
        makePlayer(202, 'Watched Wing', 47, { pos: 'SF', pts: 17, reb: 5 }),
        makePlayer(203, 'Recent Drop Guard', 46, { pos: 'PG', pts: 16, ast: 6 }),
        makePlayer(204, 'Raw Total Big', 54, { pos: 'C', reb: 11, pts: 14 })
      ],
      recentDrops: [
        { player: makePlayer(203, 'Recent Drop Guard', 46, { pos: 'PG' }) }
      ],
      tradeOffers: []
    },
    queueSharedSeasonSave() {},
    renderWaiver() {}
  };

  vm.createContext(context);
  vm.runInContext(script, context);
  return context;
}

const context = buildContext();

assert.deepStrictEqual(Array.from(context.getWatchListIds()), [202]);
assert.equal(context.isWatchListed(202), true);
assert.equal(context.isWatchListed(203), false);

const fitFirstWatchList = Array.from(context.getWatchListIds());
const originalWaiverPool = Array.from(context.G.waiver);
context.D.watchList = [402];
context.G.waiver = [
  makePlayer(401, 'Fit Lead', 45, { pos: 'PG' }),
  makePlayer(402, 'Watched Lag', 50, { pos: 'SF' })
];
const fitFirstRadar = context.getWaiverRadarCandidates(2);
assert.equal(Number(fitFirstRadar[0].player.id), 401);
assert.ok(fitFirstRadar[0].fitScore > fitFirstRadar[1].fitScore);
assert.ok(fitFirstRadar[1].score > fitFirstRadar[0].score, 'watch boost should still matter after fit');
context.D.watchList = fitFirstWatchList;
context.G.waiver = originalWaiverPool;

const radar = context.getWaiverRadarCandidates(4);
assert.equal(Array.isArray(radar), true);
assert.equal(radar.length, 4);
assert.equal(Number(radar[0].player.id), 201);
assert.equal(Number(radar[1].player.id), 203);
assert.equal(Number(radar[2].player.id), 202);
assert.equal(Number(radar[3].player.id), 204);
assert.equal(radar[0].fitReason, 'Adds PG depth');
assert.equal(radar[0].radarReason, 'Adds PG depth');
assert.equal(radar[1].radarReason, 'Adds PG depth');
assert.equal(radar[2].radarReason, 'Watch list target');

const needProfile = context.buildWaiverRosterNeedProfile();
const strongerFit = context.getWaiverRadarCandidateScore(
  makePlayer(301, 'Strong Fit', 50, { pos: 'PG' }),
  needProfile
);
const watchedWeakerFit = context.getWaiverRadarCandidateScore(
  makePlayer(302, 'Watched Weak', 50, { pos: 'SF' }),
  needProfile
);
const watchedNeutral = context.getWaiverRadarCandidateScore(
  makePlayer(303, 'Watched Neutral', 50, { pos: ' ' }),
  needProfile
);
const unwatchedWeak = context.getWaiverRadarCandidateScore(
  makePlayer(304, 'Unwatched Weak', 50, { pos: 'SF' }),
  needProfile
);
assert.ok(strongerFit.score > watchedNeutral.score, 'fit should beat watch boost');
const originalWatchList = Array.from(context.getWatchListIds());
context.D.watchList = [302];
const watchedWeakerFitBoosted = context.getWaiverRadarCandidateScore(
  makePlayer(302, 'Watched Weak', 50, { pos: 'SF' }),
  needProfile
);
assert.ok(watchedWeakerFitBoosted.score > unwatchedWeak.score, 'watch should surface weaker-fit players');

const originalRecentDrops = Array.from(context.G.recentDrops);
context.D.watchList = [];
context.G.recentDrops = [];
const plainNeutral = context.getWaiverRadarCandidateScore(
  makePlayer(305, 'Plain Neutral', 50, { pos: 'PF' }),
  needProfile
);
context.G.recentDrops = [{ player: makePlayer(305, 'Recent Boost', 50, { pos: 'PF' }) }];
const recentBoosted = context.getWaiverRadarCandidateScore(
  makePlayer(305, 'Recent Boost', 50, { pos: 'PF' }),
  needProfile
);
assert.ok(recentBoosted.score > plainNeutral.score, 'recent drops should lift players');
assert.ok(strongerFit.score > recentBoosted.score, 'recent drop should not outrank stronger fit');
context.D.watchList = originalWatchList;
context.G.recentDrops = originalRecentDrops;

context.toggleWatchList(203);
assert.deepStrictEqual(Array.from(context.getWatchListIds()), [202, 203]);

const watchedTargets = context.getWatchedWaiverTargets(4);
assert.deepStrictEqual(Array.from(watchedTargets, player => Number(player.id)), [202, 203]);

const recentDropTargets = context.getRecentDroppedWaiverTargets(4);
assert.deepStrictEqual(Array.from(recentDropTargets, player => Number(player.id)), [203]);

const watchedEntry = radar.find(entry => Number(entry.player.id) === 202);
const recentDropEntry = radar.find(entry => Number(entry.player.id) === 203);

const watchedSignals = context.getWaiverRowSignals(watchedEntry.player);
assert.equal(watchedSignals.watched, true);
assert.equal(watchedSignals.watchListed, true);
assert.equal(watchedSignals.recentDrop, false);
assert.equal(watchedSignals.trendUp, false);
assert.equal(typeof watchedSignals.radarReason, 'string');
assert.equal(typeof watchedSignals.fitReason, 'string');
assert.equal(watchedSignals.radarReason.split(/\r?\n/).length, 1);
assert.equal(watchedSignals.fitReason.split(/\r?\n/).length, 1);
assert.ok(watchedSignals.radarReason.trim().length > 0);
assert.ok(watchedSignals.fitReason.trim().length > 0);
assert.ok(watchedSignals.radarReason.trim().split(/\s+/).length <= 8);
assert.ok(watchedSignals.fitReason.trim().split(/\s+/).length <= 8);

const recentSignals = context.getWaiverRowSignals(recentDropEntry.player);
assert.equal(recentSignals.recentDrop, true);
assert.equal(recentSignals.radarReason, 'Adds PG depth');

const trend = context.getWaiverTrendScore(
  makePlayer(205, 'Trend Wing', 40, { pos: 'SF', recentFp: 50 })
);
assert.equal(trend.trendUp, true);
assert.ok(trend.score > 0);

console.log('waiver radar watchlist test passed');
