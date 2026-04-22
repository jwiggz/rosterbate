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
expectMatch(/All Players\s*\/\s*Watch List/, 'missing combined All Players / Watch List browse hook');

const script = [
  extractFunctionSource('getWatchListIds()'),
  extractFunctionSource('isWatchListed(pid)'),
  extractFunctionSource('toggleWatchList(pid)'),
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

assert.deepStrictEqual(context.getWatchListIds(), [202]);
assert.equal(context.isWatchListed(202), true);
assert.equal(context.isWatchListed(203), false);

context.toggleWatchList(203);
assert.deepStrictEqual(context.getWatchListIds(), [202, 203]);

const radar = context.getWaiverRadarCandidates(4);
assert.equal(Array.isArray(radar), true);
assert.equal(radar.length, 4);
assert.equal(Number(radar[0].player.id), 201);
assert.equal(Number(radar[1].player.id), 202);
assert.equal(Number(radar[2].player.id), 203);
assert.equal(Number(radar[3].player.id), 204);

const watchedTargets = context.getWatchedWaiverTargets(4);
assert.deepStrictEqual(watchedTargets.map(player => Number(player.id)), [202, 203]);

const recentDropTargets = context.getRecentDroppedWaiverTargets(4);
assert.deepStrictEqual(recentDropTargets.map(player => Number(player.id)), [203]);

const watchedSignals = context.getWaiverRowSignals(radar[1].player);
assert.equal(watchedSignals.watched, true);
assert.equal(watchedSignals.recentDrop, false);
assert.equal(typeof watchedSignals.radarReason, 'string');
assert.equal(typeof watchedSignals.fitReason, 'string');
assert.equal(watchedSignals.radarReason.split(/\r?\n/).length, 1);
assert.equal(watchedSignals.fitReason.split(/\r?\n/).length, 1);
assert.ok(watchedSignals.radarReason.trim().length > 0);
assert.ok(watchedSignals.fitReason.trim().length > 0);
assert.ok(watchedSignals.radarReason.trim().split(/\s+/).length <= 8);
assert.ok(watchedSignals.fitReason.trim().split(/\s+/).length <= 8);

const recentSignals = context.getWaiverRowSignals(radar[2].player);
assert.equal(recentSignals.recentDrop, true);

console.log('waiver radar watchlist test passed');
