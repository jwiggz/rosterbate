const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'rosterbate-season.html'),
  'utf8'
);

function expectMatch(pattern, message) {
  assert.match(html, pattern, message);
}

function extractFunctionSource(signature) {
  const start = html.indexOf(`function ${signature}`);
  assert.ok(start >= 0, `missing ${signature}`);

  const openBrace = html.indexOf('{', start);
  assert.ok(openBrace >= 0, `missing body for ${signature}`);

  let depth = 0;
  let mode = 'code';
  const stack = [];

  for (let index = openBrace; index < html.length; index += 1) {
    const char = html[index];
    const next = html[index + 1];

    if (mode === 'lineComment') {
      if (char === '\n') mode = stack.pop() || 'code';
      continue;
    }

    if (mode === 'blockComment') {
      if (char === '*' && next === '/') {
        mode = stack.pop() || 'code';
        index += 1;
      }
      continue;
    }

    if (mode === 'singleQuote') {
      if (char === '\\') {
        index += 1;
        continue;
      }
      if (char === '\'') mode = stack.pop() || 'code';
      continue;
    }

    if (mode === 'doubleQuote') {
      if (char === '\\') {
        index += 1;
        continue;
      }
      if (char === '"') mode = stack.pop() || 'code';
      continue;
    }

    if (mode === 'template') {
      if (char === '\\') {
        index += 1;
        continue;
      }
      if (char === '`') {
        mode = stack.pop() || 'code';
        continue;
      }
    }

    if (mode === 'code') {
      if (char === '/' && next === '/') {
        stack.push(mode);
        mode = 'lineComment';
        index += 1;
        continue;
      }

      if (char === '/' && next === '*') {
        stack.push(mode);
        mode = 'blockComment';
        index += 1;
        continue;
      }

      if (char === '\'') {
        stack.push(mode);
        mode = 'singleQuote';
        continue;
      }

      if (char === '"') {
        stack.push(mode);
        mode = 'doubleQuote';
        continue;
      }

      if (char === '`') {
        stack.push(mode);
        mode = 'template';
        continue;
      }

      if (char === '{') {
        depth += 1;
        continue;
      }

      if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          return html.slice(start, index + 1);
        }
      }
    }
  }

  assert.fail(`unterminated ${signature}`);
}

expectMatch(/trade-fairness-card/, 'trade fairness card hook is missing');
expectMatch(/function evaluateOneForOneTradeFairness\(offer\)/, 'missing fairness evaluator');
expectMatch(/function getTradeFairnessBadgeMeta\(rating\)/, 'missing fairness badge metadata helper');
expectMatch(/function buildTradeFairnessReasons\(result\)/, 'missing fairness reason builder');
expectMatch(/function getTradeFairnessViewModel\(offer\)/, 'missing fairness view-model helper');
expectMatch(/Fairness insights are available for 1-for-1 deals first\./, 'missing unsupported-state copy');

const script = [
  extractFunctionSource('evaluateOneForOneTradeFairness(offer)'),
  extractFunctionSource('getTradeFairnessBadgeMeta(rating)'),
  extractFunctionSource('buildTradeFairnessReasons(result)'),
  extractFunctionSource('getTradeFairnessViewModel(offer)')
].join('\n\n');

const players = {
  11: { id: 11, name: 'Balanced Guard', fp: 34, pos: 'PG', g: 1, fg: 1, util: 1 },
  12: { id: 12, name: 'Balanced Wing', fp: 33, pos: 'SF', f: 1, sf: 1, util: 1 },
  21: { id: 21, name: 'Star Guard', fp: 45, pos: 'PG', g: 1, pg: 1, util: 1 },
  22: { id: 22, name: 'Bench Big', fp: 20, pos: 'C', c: 1, util: 1 },
  31: { id: 31, name: 'Need Big', fp: 31, pos: 'C', c: 1, util: 1 },
  32: { id: 32, name: 'Extra Guard', fp: 30, pos: 'SG', g: 1, sg: 1, util: 1 }
};

const rosters = {
  0: [11, 12, 32],
  1: [21, 22, 31]
};

const context = {
  console,
  G: { rosters },
  P(id) {
    return players[id];
  }
};

vm.createContext(context);
vm.runInContext(script, context);

const fair = context.evaluateOneForOneTradeFairness({
  fromTeam: 0,
  toTeam: 1,
  give: [11],
  get: [12]
});
assert.equal(fair.rating, 'fair');

const highRisk = context.evaluateOneForOneTradeFairness({
  fromTeam: 0,
  toTeam: 1,
  give: [22],
  get: [21]
});
assert.equal(highRisk.rating, 'high_risk');

const contextSoftened = context.evaluateOneForOneTradeFairness({
  fromTeam: 0,
  toTeam: 1,
  give: [32],
  get: [31]
});
assert.ok(['fair', 'slight_lean'].includes(contextSoftened.rating));

const vmResult = context.getTradeFairnessViewModel({
  fromTeam: 0,
  toTeam: 1,
  give: [11],
  get: [12]
});
assert.equal(typeof vmResult.badgeLabel, 'string');
assert.ok(Array.isArray(vmResult.reasons));
assert.ok(vmResult.reasons.length >= 2);
assert.ok(vmResult.reasons.length <= 4);

const unsupported = context.getTradeFairnessViewModel({
  fromTeam: 0,
  toTeam: 1,
  give: [11, 12],
  get: [21]
});
assert.equal(unsupported.supported, false);
assert.match(unsupported.message, /1-for-1 deals first/i);

console.log('trade fairness evaluator test passed');
