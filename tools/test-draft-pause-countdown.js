const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'rosterbate-draft.html'), 'utf8');

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

function makeClassList() {
  const set = new Set();
  return {
    add(...tokens) {
      tokens.forEach((token) => set.add(String(token)));
    },
    remove(...tokens) {
      tokens.forEach((token) => set.delete(String(token)));
    },
    contains(token) {
      return set.has(String(token));
    },
    toString() {
      return Array.from(set).join(' ');
    }
  };
}

function makeElement() {
  const classList = makeClassList();
  return {
    textContent: '',
    innerHTML: '',
    disabled: false,
    className: '',
    style: {},
    classList
  };
}

const elements = {
  pdcBar: makeElement(),
  pdcStrip: makeElement(),
  pdcTime: makeElement(),
  pdcFill: makeElement(),
  pauseReason: makeElement(),
  pauseOverlay: makeElement(),
  pauseResumeBtn: makeElement(),
  pauseElapsed: makeElement(),
  voteBar: makeElement()
};
const startBtn = makeElement();
const countdownText = makeElement();

let now = 1_700_000_000_000;
let nextIntervalId = 1;
const activeIntervals = new Map();
const clearedIntervals = [];
let advanceCalls = 0;
let resetTimerCalls = 0;

const script = [
  'var cdInt = null;',
  'var CD_DURATION = 120;',
  'var draftCountdownState = { mode: "countdown", remaining: CD_DURATION, duration: CD_DURATION };',
  'var S = { started: false, fmt: "snake", cur: 0, total: 10, order: [1, 0], myPos: 0, tmax: 30, timerInt: null };',
  'var PS = { isAdmin: true, isPaused: false, pausedAt: null, pauseElapsedInt: null, totalPausedMs: 0, pauseReason: "", voteActive: false };',
  extractFunctionSource('startCountdown()'),
  extractFunctionSource('launchDraft()'),
  extractFunctionSource('triggerPause(reason, isAdmin=false)'),
  extractFunctionSource('updatePauseClock()'),
  extractFunctionSource('resumeDraft()')
].join('\n\n');

const context = {
  console,
  Date: { now: () => now },
  document: {
    getElementById(id) {
      const node = elements[id];
      if (!node) throw new Error(`Unknown element requested: ${id}`);
      return node;
    },
    querySelector(selector) {
      if (selector === '#pdcBar .pdc-start') return startBtn;
      if (selector === '#pdcBar .pdc-text') return countdownText;
      throw new Error(`Unknown selector requested: ${selector}`);
    }
  },
  setInterval(fn) {
    const id = nextIntervalId++;
    activeIntervals.set(id, fn);
    return id;
  },
  clearInterval(id) {
    clearedIntervals.push(id);
    activeIntervals.delete(id);
  },
  getScheduledDraftStartAt() {
    return 0;
  },
  setDraftCountdownMode() {},
  setDraftLobbyPill() {},
  buildDraftLobbyPillText() { return 'pill'; },
  getDraftLobbyTone() { return 'ready'; },
  showToast() {},
  clearCpuPickSequence() {},
  clearAuctionCpuAction() {},
  showBanner() {},
  isRealtimeMultiplayerDraft() { return false; },
  publishRealtimeDraftState() {},
  refreshPauseBtn() {},
  requiresPauseVote() { return false; },
  resetTimer() { resetTimerCalls += 1; },
  advance() { advanceCalls += 1; }
};

vm.createContext(context);
vm.runInContext(script, context, { filename: 'draft-pause-countdown.js' });

context.startCountdown();
assert.equal(elements.pdcTime.textContent, '2:00', 'countdown should begin at two minutes');
assert.equal(startBtn.textContent, 'Start', 'countdown should expose a start button before the draft goes live');
assert.equal(activeIntervals.size, 1, 'countdown should schedule one ticking interval');

const firstCountdownId = context.cdInt;
activeIntervals.get(firstCountdownId)();
assert.equal(elements.pdcTime.textContent, '1:59', 'countdown should tick down while the room is live');

context.triggerPause('Commissioner paused the draft.', true);
assert.ok(
  clearedIntervals.includes(firstCountdownId),
  'pausing during the pre-draft countdown should stop the active countdown interval'
);
assert.equal(activeIntervals.has(firstCountdownId), false, 'the paused room should not keep the old countdown interval alive');

now += 5_000;
context.resumeDraft();
assert.equal(activeIntervals.has(context.cdInt), true, 'resuming a paused pre-draft room should restart the countdown');
assert.notEqual(elements.pdcTime.textContent, '2:00', 'resumed countdown should continue from the paused time, not reset to full');

context.PS.isPaused = true;
context.PS.pausedAt = now - 3_000;
context.S.started = true;
context.S.cur = 0;
context.S.order = [1, 0];
context.S.myPos = 0;
advanceCalls = 0;
resetTimerCalls = 0;
context.resumeDraft();

assert.equal(advanceCalls, 1, 'resuming an already-started paused draft should restart draft flow');
assert.equal(resetTimerCalls, 0, 'resume should advance CPU flow when it is not the user turn');

console.log('draft pause countdown test passed');
