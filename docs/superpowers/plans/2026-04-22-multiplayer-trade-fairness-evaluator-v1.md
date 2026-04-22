# Multiplayer Trade Fairness Evaluator V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an advisory-only `1-for-1` trade fairness evaluator to the multiplayer trade flow in `rosterbate-season.html` so managers and commissioners get a single qualitative fairness badge plus `2-4` short reasons before deciding on a trade.

**Architecture:** Keep the first pass local to [C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/rosterbate-season.html) by adding a compact evaluator helper layer, inline fairness-card rendering in the existing Trade Desk builder/review surface, and the same advisory output inside commissioner trade review. Add one focused Node regression harness that extracts the evaluator helpers and verifies ratings, reasons, unsupported-state behavior, and render-hook presence without needing a browser runner.

**Tech Stack:** Vanilla HTML/CSS/JS, existing roster/player/trade state in `rosterbate-season.html`, Node.js `assert/fs/path/vm`, existing multiplayer trade desk and commissioner-review flows

---

## File Structure

- **Modify:** `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
  - Add fairness evaluator helpers, fairness badge/reason rendering, and inline Trade Desk + commissioner review wiring.
- **Create:** `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-trade-fairness-evaluator.js`
  - Focused regression harness for `1-for-1` fairness scoring, reason generation, unsupported-state behavior, and render-hook presence.

### Task 1: Add a failing multiplayer trade fairness regression harness

**Files:**
- Create: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-trade-fairness-evaluator.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-trade-fairness-evaluator.js`

- [ ] **Step 1: Write the failing regression harness**

Create `tools/test-trade-fairness-evaluator.js` with a focused harness that checks for the new fairness helper signatures and then exercises them in isolation with fake team/roster/player data:

```js
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
```

- [ ] **Step 2: Run the new harness to verify it fails**

Run:

```powershell
node .\tools\test-trade-fairness-evaluator.js
```

Expected:

```text
AssertionError [ERR_ASSERTION]: trade fairness card hook is missing
```

- [ ] **Step 3: Commit the failing harness**

Run:

```powershell
git add .\tools\test-trade-fairness-evaluator.js
git commit -m "test: add trade fairness evaluator regression"
```

Expected:

```text
The commit succeeds with subject line: test: add trade fairness evaluator regression
```

### Task 2: Add the fairness evaluator helpers and badge/reason model

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-trade-fairness-evaluator.js`

- [ ] **Step 1: Add local fairness constants and helper functions near the existing trade helpers**

Insert a compact fairness helper layer near the existing trade functions (`submitTrade`, `cpuTrade`, `acceptTrade`, `rejectTrade`) with this shape:

```js
  function getTradeFairnessPlayerValue(player){
    return Number(player?.fp || 0);
  }

  function getTradeFairnessPositionKey(player){
    return String(player?.pos || '').trim().toUpperCase();
  }

  function getTradeFairnessRosterProfile(teamIdx, outgoingPid, incomingPid){
    // derive light position counts and weak-slot signals from the post-trade roster
  }

  function evaluateOneForOneTradeFairness(offer){
    // enforce 1-for-1 only
    // compare current value gap
    // apply light starter/need/depth context
    // return a normalized result object
  }

  function getTradeFairnessBadgeMeta(rating){
    return {
      fair: { label: 'Fair', tone: 'fair' },
      slight_lean: { label: 'Slight Lean', tone: 'lean' },
      uneven: { label: 'Uneven', tone: 'uneven' },
      high_risk: { label: 'High Risk', tone: 'risk' }
    }[rating] || { label: 'Fair', tone: 'fair' };
  }

  function buildTradeFairnessReasons(result){
    // produce 2-4 short reasons from value edge + context edge + depth risk
  }

  function getTradeFairnessViewModel(offer){
    // return unsupported message for non-1-for-1
    // otherwise map evaluator result to badge + reasons
  }
```

Implementation rules:
- use current `fp` as the base value input
- keep roster context light and deterministic
- use only current-value and slot-shape inputs already available in the page state
- do not route the CPU trade accept/reject path through this helper in `v1`

- [ ] **Step 2: Use a simple, explainable rating band system**

Make the evaluator return one of:

```js
'fair'
'slight_lean'
'uneven'
'high_risk'
```

Use a small internal numeric delta to map into those bands:

```js
const fairnessDelta = Math.abs(adjustedFromScore - adjustedToScore);
if (fairnessDelta <= 2.5) rating = 'fair';
else if (fairnessDelta <= 6) rating = 'slight_lean';
else if (fairnessDelta <= 11) rating = 'uneven';
else rating = 'high_risk';
```

And separately record which side benefits more, so the reasons can say:
- stronger current producer
- roster context softens the gap
- depth/need still makes the trade risky

- [ ] **Step 3: Add compact CSS for the fairness card**

Add a small style block near the trade-desk styles:

```css
  .trade-fairness-card{
    margin-top:12px;padding:12px 14px;border-radius:16px;border:1px solid rgba(255,255,255,.1);
    background:linear-gradient(180deg,rgba(12,19,31,.9),rgba(8,13,23,.96));
  }
  .trade-fairness-badge{
    display:inline-flex;align-items:center;justify-content:center;padding:6px 10px;border-radius:999px;
    font:700 11px/1 var(--plex);letter-spacing:.1em;text-transform:uppercase;
  }
  .trade-fairness-badge.fair{background:rgba(28,71,44,.72);color:#d9ffe5}
  .trade-fairness-badge.lean{background:rgba(78,59,18,.72);color:#ffe8b8}
  .trade-fairness-badge.uneven{background:rgba(85,52,18,.78);color:#ffd5a8}
  .trade-fairness-badge.risk{background:rgba(96,32,32,.82);color:#ffd4d4}
  .trade-fairness-reasons{margin:10px 0 0;padding-left:18px;color:#d7e4f6;font-size:12px;line-height:1.55}
  .trade-fairness-note{margin-top:8px;color:#9fb4d0;font-size:11px;line-height:1.5}
```

- [ ] **Step 4: Run the fairness regression and verify the helper layer passes**

Run:

```powershell
node .\tools\test-trade-fairness-evaluator.js
```

Expected:

```text
trade fairness evaluator test passed
```

- [ ] **Step 5: Commit the fairness helper layer**

Run:

```powershell
git add .\rosterbate-season.html .\tools\test-trade-fairness-evaluator.js
git commit -m "feat: add trade fairness evaluator helpers"
```

Expected:

```text
The commit succeeds with subject line: feat: add trade fairness evaluator helpers
```

### Task 3: Wire the fairness card into the Trade Desk and commissioner review

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-trade-fairness-evaluator.js`

- [ ] **Step 1: Add the fairness card to the live trade-builder summary**

In the existing trade-builder summary area inside `renderTrades()`, directly below the current `offerReady`/raw-value summary, render a fairness card when the manager has selected a pending `1-for-1` offer shape:

```js
  const fairnessVm = getTradeFairnessViewModel({
    fromTeam: t,
    toTeam: tradeTeam,
    give: Array.from(offerTeam),
    get: Array.from(wantTeam)
  });
```

Render either:
- supported state

```html
<div class="trade-fairness-card">
  <span class="trade-fairness-badge fair">Fair</span>
  <ul class="trade-fairness-reasons">...</ul>
  <div class="trade-fairness-note">Advisory only. Commissioners still decide.</div>
</div>
```

- or unsupported state

```html
<div class="trade-fairness-card">
  <div class="trade-fairness-note">Fairness insights are available for 1-for-1 deals first.</div>
</div>
```

Placement rule:
- keep it inline with the existing offer summary
- do not move it into a separate modal or inspector

- [ ] **Step 2: Add the same fairness output to pending trade cards**

Where pending offers are rendered in `renderTrades()` and/or `commTrades()`, compute:

```js
const fairnessVm = getTradeFairnessViewModel(trade);
```

Then render the same badge + reasons block inside each pending `1-for-1` offer card so:
- managers see the advisory read while reviewing offers
- commissioners see the same read in their moderation lane

Do not create a different commissioner-only score. The output should be identical across both surfaces.

- [ ] **Step 3: Keep the feature explicitly advisory in the copy**

Make sure the visible microcopy stays soft:
- no “reject this trade” language
- no hard warnings that imply auto-enforcement
- no hidden-decimal exposure

Recommended note:

```html
<div class="trade-fairness-note">Advisory only. Use this as context, not an automatic ruling.</div>
```

- [ ] **Step 4: Update the regression harness to check the render hooks**

Extend `tools/test-trade-fairness-evaluator.js` so it also verifies:
- the builder summary now includes `trade-fairness-card`
- commissioner review markup includes the same hook
- unsupported-state copy is present for non-`1-for-1` offers

- [ ] **Step 5: Run the focused fairness regression again**

Run:

```powershell
node .\tools\test-trade-fairness-evaluator.js
```

Expected:

```text
trade fairness evaluator test passed
```

- [ ] **Step 6: Commit the Trade Desk and commissioner wiring**

Run:

```powershell
git add .\rosterbate-season.html .\tools\test-trade-fairness-evaluator.js
git commit -m "feat: surface advisory trade fairness context"
```

Expected:

```text
The commit succeeds with subject line: feat: surface advisory trade fairness context
```

### Task 4: Final verification and handoff

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html`
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-trade-fairness-evaluator.js`

- [ ] **Step 1: Run the full planned verification sweep**

Run:

```powershell
node .\tools\test-trade-fairness-evaluator.js
```

If the trade desk already has any nearby regression harnesses that cover trade rendering, run them too. Otherwise keep the sweep tight and evidence-based.

Expected:

```text
trade fairness evaluator test passed
```

- [ ] **Step 2: Do one manual browser sanity pass**

Open:

```text
C:\Users\jabro\Desktop\Fantasy Project\rosterbate\rosterbate-season.html
```

Manually confirm:
- a `1-for-1` proposed trade shows one fairness badge plus `2-4` reasons
- a lopsided `1-for-1` deal visibly shifts to `Uneven` or `High Risk`
- a non-`1-for-1` deal shows the unsupported message instead of a fake result
- commissioner review shows the same fairness card for pending `1-for-1` deals
- the feature reads as context, not enforcement

Expected:

```text
The trade workflow feels more trustworthy without becoming rigid or noisy.
```

- [ ] **Step 3: Confirm the branch/worktree state is clean**

Run:

```powershell
git status --short
git rev-parse --abbrev-ref HEAD
git rev-parse --short HEAD
```

Expected:

```text
No modified or untracked files remain, and the branch points at the final trade-fairness implementation commit.
```

- [ ] **Step 4: Prepare the finish summary**

Capture these exact delivery points for the finish message:

```text
- advisory 1-for-1 trade fairness evaluator lives in rosterbate-season.html
- trade desk shows a fairness badge plus 2-4 short reasons
- commissioner review shows the same fairness output
- non-1-for-1 deals fall back to an honest unsupported-state message
- focused trade-fairness regression is green
```

- [ ] **Step 5: Commit any final tiny cleanup if needed**

If a last tiny tweak was needed after manual or regression verification, finish with:

```powershell
git add .\rosterbate-season.html .\tools\test-trade-fairness-evaluator.js
git commit -m "chore: finalize trade fairness evaluator v1"
```

Expected:

```text
Only use this step if a final tiny cleanup was needed after the verification sweep.
```
