const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'rosterbate-season.html'),
  'utf8'
);

function expectSourceMatch(pattern, message) {
  assert.match(html, pattern, message);
}

function findFunctionBodyOpenBrace(source, signature) {
  const start = source.indexOf(`function ${signature}`);
  assert.ok(start >= 0, `missing ${signature}`);

  const regexStartKeywords = new Set([
    'case',
    'delete',
    'do',
    'else',
    'in',
    'instanceof',
    'new',
    'return',
    'throw',
    'typeof',
    'void',
    'while',
    'with',
    'yield',
    'await'
  ]);

  const isIdentifierStart = char => /[A-Za-z_$]/.test(char || '');
  const isIdentifierPart = char => /[A-Za-z0-9_$]/.test(char || '');
  const isDecimalDigit = char => /[0-9]/.test(char || '');

  const stack = [{
    type: 'code',
    canStartRegex: true
  }];

  const pushState = state => stack.push(state);
  const popState = () => stack.pop();
  const currentState = () => stack[stack.length - 1];
  let parenDepth = 0;
  let sawParamsStart = false;
  let inParams = false;
  let openBrace = -1;

  for (let index = start; index < source.length; index += 1) {
    const state = currentState();
    const char = source[index];
    const next = source[index + 1];

    if (state.type === 'lineComment') {
      if (char === '\n' || char === '\r') popState();
      continue;
    }

    if (state.type === 'blockComment') {
      if (char === '*' && next === '/') {
        popState();
        index += 1;
      }
      continue;
    }

    if (state.type === 'singleQuote' || state.type === 'doubleQuote') {
      if (char === '\\') {
        index += 1;
        continue;
      }
      if (char === state.quote) popState();
      continue;
    }

    if (state.type === 'regex') {
      if (char === '\\') {
        index += 1;
        continue;
      }
      if (char === '[') {
        state.inClass = true;
        continue;
      }
      if (char === ']' && state.inClass) {
        state.inClass = false;
        continue;
      }
      if (char === '/' && !state.inClass) {
        popState();
        currentState().canStartRegex = false;
      }
      continue;
    }

    if (state.type === 'template') {
      if (char === '\\') {
        index += 1;
        continue;
      }
      if (char === '`') {
        popState();
        continue;
      }
      if (char === '$' && next === '{') {
        pushState({
          type: 'templateExpr',
          braceDepth: 1,
          canStartRegex: true
        });
        index += 1;
      }
      continue;
    }

    if (!inParams) {
      if (char === '(') {
        sawParamsStart = true;
        inParams = true;
        parenDepth = 1;
        continue;
      }

      if (!sawParamsStart) continue;
    }

    if (char === '/' && next === '/') {
      pushState({ type: 'lineComment' });
      index += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      pushState({ type: 'blockComment' });
      index += 1;
      continue;
    }

    if (char === '\'') {
      pushState({ type: 'singleQuote', quote: '\'' });
      continue;
    }

    if (char === '"') {
      pushState({ type: 'doubleQuote', quote: '"' });
      continue;
    }

    if (char === '`') {
      pushState({ type: 'template' });
      continue;
    }

    if (inParams && char === '(') {
      parenDepth += 1;
      continue;
    }

    if (inParams && char === ')') {
      parenDepth -= 1;
      if (parenDepth === 0) {
        inParams = false;
      }
      continue;
    }

    if (inParams) {
      continue;
    }

    if (char === '/' && state.canStartRegex) {
      pushState({ type: 'regex', inClass: false });
      continue;
    }

    if (isIdentifierStart(char)) {
      let end = index + 1;
      while (end < source.length && isIdentifierPart(source[end])) end += 1;
      const token = source.slice(index, end);
      state.canStartRegex = regexStartKeywords.has(token);
      index = end - 1;
      continue;
    }

    if (isDecimalDigit(char)) {
      let end = index + 1;
      while (end < source.length && /[0-9_.eExXobOBA-Fa-f]/.test(source[end] || '')) end += 1;
      state.canStartRegex = false;
      index = end - 1;
      continue;
    }

    if (char === '(' || char === '[' || char === ',' || char === ';' || char === ':' || char === '?' || char === '=' || char === '!' || char === '~' || char === '+' || char === '-' || char === '*' || char === '%' || char === '&' || char === '|' || char === '^' || char === '<' || char === '>') {
      state.canStartRegex = true;
      continue;
    }

    if (char === '.') {
      state.canStartRegex = false;
      continue;
    }

    if (!/\s/.test(char)) {
      state.canStartRegex = false;
    }

    if (char === '{') {
      openBrace = index;
      break;
    }
  }

  assert.ok(openBrace >= 0, `missing body for ${signature}`);
  return openBrace;
}

function extractFunctionSourceFrom(source, signature) {
  const start = source.indexOf(`function ${signature}`);
  assert.ok(start >= 0, `missing ${signature}`);

  const openBrace = findFunctionBodyOpenBrace(source, signature);

  let depth = 0;
  let mode = 'code';
  const stack = [];

  for (let index = openBrace; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (mode === 'lineComment') {
      if (char === '\n' || char === '\r') mode = stack.pop() || 'code';
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
          return source.slice(start, index + 1);
        }
      }
    }
  }

  assert.fail(`unterminated ${signature}`);
}

function extractFunctionSource(signature) {
  return extractFunctionSourceFrom(html, signature);
}

const parserFixture = [
  'function sampleTradeHelper(value) {',
  '  const regex = /foo{2,3}\\/bar(?:baz)?/gi;',
  '  const message = `outer ${value ? `inner ${value}` : `fallback ${String(value)}`}`;',
  '  if (regex.test(message)) {',
  '    return { ok: true, note: `matched ${message}` };',
  '  }',
  '  return { ok: false, note: `missed ${message}` };',
  '}'
].join('\n');

const parsedFixture = extractFunctionSourceFrom(parserFixture, 'sampleTradeHelper(value)');
assert.match(parsedFixture, /regex/);
assert.match(parsedFixture, /inner \$\{value\}/);
assert.match(parsedFixture, /matched/);

expectSourceMatch(/function evaluateOneForOneTradeFairness\(offer\)/, 'missing fairness evaluator');
expectSourceMatch(/function getTradeFairnessBadgeMeta\(rating\)/, 'missing fairness badge metadata helper');
expectSourceMatch(/function buildTradeFairnessReasons\(result\)/, 'missing fairness reason builder');
expectSourceMatch(/function getTradeFairnessViewModel\(offer\)/, 'missing fairness view-model helper');
expectSourceMatch(/function renderTradeFairnessCard\(offer,\s*options=\{\}\)/, 'missing fairness card renderer');
expectSourceMatch(/function getTradeFairnessPlayerValue\(player\)/, 'missing fairness player value helper');
expectSourceMatch(/function getTradeFairnessReplacementRead\(offer\)/, 'missing trade replacement read helper');
expectSourceMatch(/function getTradeFairnessPositionKey\(player\)/, 'missing fairness position key helper');
expectSourceMatch(/function getTradeFairnessRosterProfile\(teamIdx, outgoingPid, incomingPid\)/, 'missing fairness roster profile helper');
expectSourceMatch(/renderTradeFairnessCard\(\{\s*fromTeam:D\.myPos,\s*toTeam:trP\.ti,\s*give:trP\.give,\s*get:trP\.get\s*\}/, 'inline trade builder should render fairness card');
expectSourceMatch(/renderTradeFairnessCard\(o,\s*\{\s*variant:'incoming'/, 'incoming offers should render fairness card');
expectSourceMatch(/renderTradeFairnessCard\(o,\s*\{\s*variant:'sent'/, 'sent offers should render fairness card');
expectSourceMatch(/renderTradeFairnessCard\(o,\s*\{\s*variant:'commissioner'/, 'commissioner review should render fairness card');
expectSourceMatch(/Fairness insights are available for 1-for-1 deals first/i, 'unsupported fairness copy should remain wired');

const script = [
  extractFunctionSource('getTradeFairnessPlayerValue(player)'),
  extractFunctionSource('getTradeFairnessReplacementRead(offer)'),
  extractFunctionSource('getTradeFairnessPositionKey(player)'),
  extractFunctionSource('getTradeFairnessRosterProfile(teamIdx, outgoingPid, incomingPid)'),
  extractFunctionSource('evaluateOneForOneTradeFairness(offer)'),
  extractFunctionSource('getTradeFairnessBadgeMeta(rating)'),
  extractFunctionSource('buildTradeFairnessReasons(result)'),
  extractFunctionSource('getTradeFairnessViewModel(offer)'),
  extractFunctionSource('renderTradeFairnessCard(offer, options={})')
].join('\n\n');

const players = {
  11: { id: 11, name: 'Balanced Guard', fp: 34, pos: 'PG', g: 1, fg: 1, util: 1 },
  12: { id: 12, name: 'Balanced Wing', fp: 33, pos: 'SF', f: 1, sf: 1, util: 1 },
  21: { id: 21, name: 'Star Guard', fp: 45, pos: 'PG', g: 1, pg: 1, util: 1 },
  22: { id: 22, name: 'Bench Big', fp: 20, pos: 'C', c: 1, util: 1 },
  31: { id: 31, name: 'Need Big', fp: 31, pos: 'C', c: 1, util: 1 },
  32: { id: 32, name: 'Extra Guard', fp: 30, pos: 'SG', g: 1, sg: 1, util: 1 },
  41: { id: 41, name: 'Waiver Starter', team: 'CHI', fp: 28, pos: 'SF', f: 1, sf: 1, util: 1 }
};

const rosters = {
  0: [11, 12, 32],
  1: [21, 22, 31]
};

const context = {
  console,
  STARTERS: 2,
  G: { rosters, waiver: [players[41]] },
  P(id) {
    return players[id];
  }
};

vm.createContext(context);
vm.runInContext(script, context);

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

const fair = context.evaluateOneForOneTradeFairness({
  fromTeam: 0,
  toTeam: 1,
  give: [11],
  get: [12]
});
assert.equal(fair.rating, 'fair');

const fallbackProfile = context.getTradeFairnessRosterProfile(0, 12, 31);
assert.equal(fallbackProfile.starterContextAvailable, true);
assert.equal(fallbackProfile.outgoingWasStarter, true);
assert.equal(fallbackProfile.incomingProjectsStarter, true);

assert.deepEqual(plain(context.getTradeFairnessBadgeMeta('fair')), {
  label: 'Fair',
  tone: 'fair'
});
assert.deepEqual(plain(context.getTradeFairnessBadgeMeta('slight_lean')), {
  label: 'Slight Lean',
  tone: 'lean'
});
assert.deepEqual(plain(context.getTradeFairnessBadgeMeta('uneven')), {
  label: 'Uneven',
  tone: 'uneven'
});
assert.deepEqual(plain(context.getTradeFairnessBadgeMeta('high_risk')), {
  label: 'High Risk',
  tone: 'risk'
});

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

const originalRosterProfile = context.getTradeFairnessRosterProfile;
try {
  context.getTradeFairnessRosterProfile = teamIdx => ({
    teamIdx,
    incomingValue: teamIdx === 0 ? 30 : 10,
    outgoingValue: teamIdx === 0 ? 22 : 18,
    contextBoost: teamIdx === 0 ? -3 : 4
  });
  const penaltyAware = context.evaluateOneForOneTradeFairness({
    fromTeam: 0,
    toTeam: 1,
    give: [11],
    get: [12]
  });
  assert.equal(penaltyAware.contextOffset, 1);
  assert.equal(penaltyAware.adjustedGap, 7);
  assert.equal(penaltyAware.rating, 'slight_lean');
} finally {
  context.getTradeFairnessRosterProfile = originalRosterProfile;
}

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
assert.ok(vmResult.reasons.every(reason => typeof reason === 'string' && reason.trim().length > 0));
assert.ok(vmResult.reasons.some(reason => /value|producer|lean/i.test(reason)));
assert.ok(vmResult.reasons.some(reason => /starter|depth|need|slot|context/i.test(reason)));

const unsupported = context.getTradeFairnessViewModel({
  fromTeam: 0,
  toTeam: 1,
  give: [11, 12],
  get: [21]
});
assert.equal(unsupported.supported, true);
assert.equal(unsupported.replacement.player.name, 'Waiver Starter');
assert.match(unsupported.message, /Waiver Starter/i);
assert.match(unsupported.message, /28\.0 FP/i);
assert.ok(Array.isArray(unsupported.reasons));
assert.ok(unsupported.reasons.some(reason => /waiver replacement/i.test(reason)));

const supportedCard = context.renderTradeFairnessCard({
  fromTeam: 0,
  toTeam: 1,
  give: [11],
  get: [12]
});
assert.match(supportedCard, /Fair/i);
assert.match(supportedCard, /Advisory only/i);

const unsupportedCard = context.renderTradeFairnessCard({
  fromTeam: 0,
  toTeam: 1,
  give: [11, 12],
  get: [21]
});
assert.match(unsupportedCard, /Waiver Fill-In/i);
assert.match(unsupportedCard, /Waiver Starter/i);
assert.match(unsupportedCard, /CHI/i);
assert.match(unsupportedCard, /SF/i);
assert.match(unsupportedCard, /28\.0 FP/i);

console.log('trade fairness evaluator test passed');
