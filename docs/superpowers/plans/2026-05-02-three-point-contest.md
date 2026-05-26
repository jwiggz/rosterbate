# Three-Point Contest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a hidden standalone first playable RosterBate 3-point contest vertical slice: one shooter, one rack, 3D court/hoop/ball/rack, sweeping three-press meter, shot result math, and score feedback.

**Architecture:** Keep game rules and shot math in a pure testable core module. Keep browser rendering and DOM input in thin adapters so the same core can later launch from a season player card or All-Star event. The first playable version should complete one rack cleanly, while the data model already supports full modern contest racks and bracket expansion.

**Tech Stack:** Static HTML/CSS/JS, local Three.js vendor asset for the 3D scene, Playwright for browser QA, Node `assert` tests for pure game logic. Do not commit by default; the user prefers local checkpoints unless they explicitly ask for a commit.

---

## File Structure

- Create `three-point-contest-core.js`: pure contest data, meter state, shot grading, make resolution, rack scoring, and run progression. Exposes a CommonJS/browser UMD-style global named `RosterBateThreePointCore`.
- Create `three-point-contest-renderer.js`: browser-only 3D scene adapter. Owns Three.js scene setup, court/hoop/rack/ball objects, ball-flight animation, and nonblank scene readiness flags.
- Create `three-point-contest.js`: browser controller. Connects DOM, input events, core state, renderer calls, HUD updates, curated shooter selection, and one-rack vertical slice flow.
- Create `three-point-contest.html`: hidden standalone page with the actual playable experience as the first viewport.
- Create `tools/test-three-point-contest-core.js`: pure Node tests for contest rules, shot grading, scoring, and progression.
- Create `tools/test-three-point-contest-shell.js`: static source test for page/module/script wiring.
- Create `tools/test-three-point-contest-playwright.js`: browser smoke test for page boot, nonblank 3D canvas, space/click input, one-shot resolution, and one-rack completion.
- Modify `package.json`: add `threepoint:dev`, `test:threepoint-core`, and `test:threepoint` scripts.
- Add `assets/vendor/three/three.module.js`: local vendored Three.js module copied from the installed `three` package so the static site does not depend on CDN availability.

## Task 1: Pure Core Rules And Shot Math

**Files:**
- Create: `three-point-contest-core.js`
- Create: `tools/test-three-point-contest-core.js`

- [ ] **Step 1: Write the failing core test**

Create `tools/test-three-point-contest-core.js` with:

```js
const assert = require('node:assert/strict');
const core = require('../three-point-contest-core');

const shooter = core.createShooterProfile({
  id: 'maxey',
  name: 'Tyrese Maxey',
  team: 'PHI',
  threePointRating: 88,
  clutchRating: 84
});

const config = core.createContestConfig({
  mode: 'vertical_slice',
  timerSeconds: 70,
  racks: [
    {
      id: 'corner-left',
      label: 'Corner',
      spot: 'corner-left',
      distanceFeet: 22,
      balls: ['standard', 'standard', 'standard', 'standard', 'money']
    }
  ]
});

const run = core.createContestRun({ shooter, config, seed: 17 });
assert.equal(run.score, 0);
assert.equal(run.currentRackIndex, 0);
assert.equal(run.currentBallIndex, 0);
assert.equal(run.racks[0].balls.length, 5);

let meter = core.createMeterState({ shotNumber: 1, rackSpot: 'corner-left' });
assert.equal(meter.phase, 'idle');
meter = core.pressMeter(meter, 0.02);
assert.equal(meter.phase, 'distance');
meter = core.pressMeter(meter, 0.48);
assert.equal(meter.phase, 'aim');
meter = core.pressMeter(meter, 0.51);
assert.equal(meter.phase, 'released');

const green = core.gradeShotInput({
  shooter,
  rackSpot: 'corner-left',
  ballType: 'standard',
  input: meter.input
});
assert.equal(green.grade, 'green');
assert.equal(green.made, true);
assert.equal(green.points, 1);

let advanced = core.applyShotResult(run, green);
assert.equal(advanced.score, 1);
assert.equal(advanced.currentBallIndex, 1);
assert.equal(advanced.shots.length, 1);

const money = core.gradeShotInput({
  shooter,
  rackSpot: 'corner-left',
  ballType: 'money',
  input: { start: 0.02, distance: 0.49, aim: 0.52 }
});
assert.equal(money.points, 2);

const poor = core.gradeShotInput({
  shooter,
  rackSpot: 'corner-left',
  ballType: 'standard',
  input: { start: 0.02, distance: 0.12, aim: 0.88 }
});
assert.equal(poor.made, false);
assert.match(poor.feedback, /short|long|left|right/i);

const weakShooter = core.createShooterProfile({
  name: 'Weak Shooter',
  team: 'TST',
  threePointRating: 62
});
const eliteWindow = core.getShotWindows(shooter, 'corner-left');
const weakWindow = core.getShotWindows(weakShooter, 'corner-left');
assert.equal(eliteWindow.green > weakWindow.green, true);
assert.equal(eliteWindow.good > weakWindow.good, true);

let fullRun = run;
for (let index = 0; index < 5; index++) {
  const ballType = fullRun.racks[0].balls[fullRun.currentBallIndex].type;
  const result = core.gradeShotInput({
    shooter,
    rackSpot: 'corner-left',
    ballType,
    input: { start: 0.02, distance: 0.5, aim: 0.5 }
  });
  fullRun = core.applyShotResult(fullRun, result);
}
assert.equal(fullRun.completed, true);
assert.equal(fullRun.score, 6);

console.log('test-three-point-contest-core passed');
```

- [ ] **Step 2: Run the core test and verify it fails**

Run:

```powershell
node .\tools\test-three-point-contest-core.js
```

Expected: fails with `Cannot find module '../three-point-contest-core'`.

- [ ] **Step 3: Implement the minimal core module**

Create `three-point-contest-core.js` with these exported functions and behavior:

```js
(function initThreePointCore(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RosterBateThreePointCore = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function createThreePointCore() {
  'use strict';

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function createShooterProfile(input = {}) {
    return {
      id: String(input.id || input.name || 'shooter').trim(),
      name: String(input.name || 'Shooter').trim(),
      team: String(input.team || '').trim().toUpperCase(),
      portraitUrl: String(input.portraitUrl || '').trim(),
      threePointRating: clamp(input.threePointRating == null ? 80 : input.threePointRating, 25, 99),
      clutchRating: clamp(input.clutchRating == null ? input.threePointRating || 80 : input.clutchRating, 25, 99)
    };
  }

  function normalizeBall(ballType, index) {
    const type = String(ballType || 'standard').trim().toLowerCase();
    return {
      index,
      type: type === 'money' || type === 'deep' ? type : 'standard',
      value: type === 'deep' ? 3 : (type === 'money' ? 2 : 1),
      made: null
    };
  }

  function createContestConfig(input = {}) {
    const racks = (input.racks || []).map((rack, rackIndex) => ({
      id: String(rack.id || `rack-${rackIndex + 1}`),
      label: String(rack.label || `Rack ${rackIndex + 1}`),
      spot: String(rack.spot || 'top'),
      distanceFeet: Number(rack.distanceFeet || 23.75),
      balls: (rack.balls || ['standard', 'standard', 'standard', 'standard', 'money']).map(normalizeBall)
    }));
    return {
      mode: String(input.mode || 'vertical_slice'),
      timerSeconds: Number(input.timerSeconds || 70),
      racks: racks.length ? racks : [{
        id: 'corner-left',
        label: 'Corner',
        spot: 'corner-left',
        distanceFeet: 22,
        balls: ['standard', 'standard', 'standard', 'standard', 'money'].map(normalizeBall)
      }]
    };
  }

  function createContestRun({ shooter, config, seed } = {}) {
    const normalizedConfig = createContestConfig(config || {});
    return {
      id: `run-${Date.now()}-${Math.floor(Number(seed || 0))}`,
      shooter: createShooterProfile(shooter || {}),
      config: normalizedConfig,
      racks: normalizedConfig.racks.map((rack) => ({ ...rack, balls: rack.balls.map((ball) => ({ ...ball })) })),
      currentRackIndex: 0,
      currentBallIndex: 0,
      score: 0,
      shots: [],
      completed: false,
      seed: Number(seed || 1)
    };
  }

  function createMeterState({ shotNumber, rackSpot } = {}) {
    return {
      phase: 'idle',
      shotNumber: Number(shotNumber || 1),
      rackSpot: String(rackSpot || 'top'),
      input: {}
    };
  }

  function pressMeter(state, cursorPosition) {
    const next = { ...state, input: { ...(state.input || {}) } };
    const value = clamp(cursorPosition, 0, 1);
    if (next.phase === 'idle') {
      next.input.start = value;
      next.phase = 'distance';
    } else if (next.phase === 'distance') {
      next.input.distance = value;
      next.phase = 'aim';
    } else if (next.phase === 'aim') {
      next.input.aim = value;
      next.phase = 'released';
    }
    return next;
  }

  function getShotWindows(shooter, rackSpot) {
    const profile = createShooterProfile(shooter || {});
    const ratingLift = (profile.threePointRating - 75) / 1000;
    const cornerLift = String(rackSpot || '').includes('corner') ? 0.008 : 0;
    return {
      green: clamp(0.045 + ratingLift + cornerLift, 0.025, 0.085),
      good: clamp(0.13 + ratingLift * 2 + cornerLift, 0.09, 0.19)
    };
  }

  function deterministicVariance(input, shooter) {
    const source = `${shooter.id}|${input.start}|${input.distance}|${input.aim}`;
    let hash = 0;
    for (let index = 0; index < source.length; index++) hash = ((hash << 5) - hash) + source.charCodeAt(index);
    return (Math.abs(hash) % 1000) / 1000;
  }

  function gradeShotInput({ shooter, rackSpot, ballType, input } = {}) {
    const profile = createShooterProfile(shooter || {});
    const windows = getShotWindows(profile, rackSpot);
    const shotInput = input || {};
    const distanceError = Math.abs(Number(shotInput.distance || 0) - 0.5);
    const aimError = Math.abs(Number(shotInput.aim || 0) - 0.5);
    const worstError = Math.max(distanceError, aimError);
    const ball = normalizeBall(ballType, 0);
    const offAxis = distanceError >= aimError
      ? (Number(shotInput.distance || 0) < 0.5 ? 'short' : 'long')
      : (Number(shotInput.aim || 0) < 0.5 ? 'left' : 'right');
    if (worstError <= windows.green) {
      return { grade: 'green', made: true, points: ball.value, feedback: 'Green release', input: shotInput };
    }
    if (worstError <= windows.good) {
      const makeThreshold = clamp(0.62 + ((profile.threePointRating - 75) / 120), 0.45, 0.88);
      const made = deterministicVariance(shotInput, profile) <= makeThreshold;
      return { grade: 'good', made, points: made ? ball.value : 0, feedback: made ? 'Good release' : offAxis, input: shotInput };
    }
    return { grade: offAxis, made: false, points: 0, feedback: offAxis, input: shotInput };
  }

  function applyShotResult(run, result) {
    const next = {
      ...run,
      racks: run.racks.map((rack) => ({ ...rack, balls: rack.balls.map((ball) => ({ ...ball })) })),
      shots: run.shots.concat(result),
      score: run.score + Number(result.points || 0)
    };
    const rack = next.racks[next.currentRackIndex];
    if (rack && rack.balls[next.currentBallIndex]) rack.balls[next.currentBallIndex].made = !!result.made;
    next.currentBallIndex += 1;
    if (!rack || next.currentBallIndex >= rack.balls.length) {
      next.currentRackIndex += 1;
      next.currentBallIndex = 0;
    }
    next.completed = next.currentRackIndex >= next.racks.length;
    return next;
  }

  return {
    applyShotResult,
    createContestConfig,
    createContestRun,
    createMeterState,
    createShooterProfile,
    getShotWindows,
    gradeShotInput,
    pressMeter
  };
});
```

- [ ] **Step 4: Run the core test and verify it passes**

Run:

```powershell
node .\tools\test-three-point-contest-core.js
```

Expected: `test-three-point-contest-core passed`.

- [ ] **Step 5: Local checkpoint**

Run:

```powershell
git diff -- three-point-contest-core.js tools/test-three-point-contest-core.js
```

Expected: diff only includes the new core and test. Do not commit unless the user explicitly asks.

## Task 2: Static Page Shell And Local Three.js Vendor

**Files:**
- Create: `three-point-contest.html`
- Create: `tools/test-three-point-contest-shell.js`
- Add: `assets/vendor/three/three.module.js`
- Modify: `package.json`

- [ ] **Step 1: Write the failing shell test**

Create `tools/test-three-point-contest-shell.js` with:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const htmlPath = path.join(root, 'three-point-contest.html');
const corePath = path.join(root, 'three-point-contest-core.js');
const rendererPath = path.join(root, 'three-point-contest-renderer.js');
const controllerPath = path.join(root, 'three-point-contest.js');
const threePath = path.join(root, 'assets', 'vendor', 'three', 'three.module.js');
const packagePath = path.join(root, 'package.json');

assert.equal(fs.existsSync(htmlPath), true, 'three-point contest page should exist');
assert.equal(fs.existsSync(corePath), true, 'core module should exist');
assert.equal(fs.existsSync(rendererPath), true, 'renderer module should exist');
assert.equal(fs.existsSync(controllerPath), true, 'browser controller should exist');
assert.equal(fs.existsSync(threePath), true, 'local Three.js module should exist');

const html = fs.readFileSync(htmlPath, 'utf8');
assert.match(html, /id="three-point-contest-app"/, 'page should mount the game app');
assert.match(html, /three-point-contest-core\.js/, 'page should load core module');
assert.match(html, /three-point-contest-renderer\.js/, 'page should load renderer module');
assert.match(html, /three-point-contest\.js/, 'page should load controller module');
assert.match(html, /assets\/vendor\/three\/three\.module\.js/, 'page should import local Three.js');
assert.match(html, /Press Space/, 'page should expose concise input affordance');
assert.doesNotMatch(html, /landing|hero/i, 'page should be the playable experience, not a marketing page');

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
assert.equal(pkg.scripts['threepoint:dev'], 'node tools/open-static-page.js three-point-contest.html');
assert.equal(pkg.scripts['test:threepoint-core'], 'node tools/test-three-point-contest-core.js');
assert.equal(pkg.scripts['test:threepoint'], 'node tools/test-three-point-contest-core.js && node tools/test-three-point-contest-shell.js && node tools/test-three-point-contest-playwright.js');

console.log('test-three-point-contest-shell passed');
```

- [ ] **Step 2: Run the shell test and verify it fails**

Run:

```powershell
node .\tools\test-three-point-contest-shell.js
```

Expected: fails because `three-point-contest.html` and renderer/controller files do not exist.

- [ ] **Step 3: Install and vendor Three.js locally**

Run:

```powershell
npm.cmd install three --save-dev
New-Item -ItemType Directory -Force -Path .\assets\vendor\three | Out-Null
Copy-Item -LiteralPath .\node_modules\three\build\three.module.js -Destination .\assets\vendor\three\three.module.js -Force
```

Expected: `assets/vendor/three/three.module.js` exists and `package.json` / `package-lock.json` include `three`.

- [ ] **Step 4: Add the static page shell**

Create `three-point-contest.html` with this structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RosterBate 3-Point Contest</title>
  <style>
    :root {
      --bg: #050914;
      --panel: rgba(8, 17, 31, .86);
      --line: rgba(148, 163, 184, .22);
      --text: #f8fafc;
      --muted: #a9b6c8;
      --orange: #f6a344;
      --cyan: #38bdf8;
      --green: #22c55e;
      --red: #ef4444;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; background: var(--bg); color: var(--text); font-family: Arial, sans-serif; }
    body { overflow: hidden; }
    #three-point-contest-app { position: fixed; inset: 0; display: grid; background: radial-gradient(circle at 50% 20%, rgba(56,189,248,.16), transparent 30%), #050914; }
    .contest-scene { position: absolute; inset: 0; }
    .contest-scene canvas { width: 100%; height: 100%; display: block; }
    .contest-hud { position: absolute; inset: 0; pointer-events: none; display: grid; grid-template-rows: auto 1fr auto; padding: 18px; gap: 14px; }
    .contest-topbar, .contest-meter-wrap { pointer-events: auto; border: 1px solid var(--line); background: var(--panel); backdrop-filter: blur(14px); border-radius: 8px; }
    .contest-topbar { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; }
    .contest-title { display: grid; gap: 2px; }
    .contest-title strong { font-size: 22px; line-height: 1; }
    .contest-title span { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .12em; }
    .contest-score { display: flex; gap: 14px; align-items: center; font-weight: 800; }
    .contest-score b { color: var(--orange); font-size: 28px; }
    .contest-feedback { align-self: start; justify-self: center; margin-top: 72px; padding: 10px 14px; border-radius: 999px; background: rgba(8,17,31,.78); border: 1px solid var(--line); font-weight: 900; text-transform: uppercase; letter-spacing: .12em; }
    .contest-meter-wrap { padding: 14px; display: grid; gap: 10px; }
    .contest-meter-labels { display: flex; justify-content: space-between; color: var(--muted); font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: .1em; }
    .contest-meter { position: relative; height: 34px; border-radius: 999px; overflow: hidden; background: #07111f; border: 2px solid rgba(255,255,255,.14); }
    .contest-zone { position: absolute; top: 7px; height: 16px; border-radius: 999px; }
    .contest-zone.distance { left: 44%; width: 12%; background: var(--green); }
    .contest-zone.aim { left: 64%; width: 10%; background: var(--cyan); }
    .contest-cursor { position: absolute; top: 0; width: 4px; height: 100%; background: #fff; box-shadow: 0 0 14px #fff; transform: translateX(-2px); }
    .contest-actions { display: flex; gap: 10px; align-items: center; justify-content: space-between; color: var(--muted); font-size: 12px; }
    .contest-actions button { pointer-events: auto; border: 1px solid rgba(246,163,68,.55); background: rgba(246,163,68,.13); color: #ffe0b0; border-radius: 6px; padding: 9px 12px; font-weight: 900; cursor: pointer; }
  </style>
</head>
<body>
  <main id="three-point-contest-app" data-contest-status="booting">
    <section class="contest-scene" id="contest-scene" aria-label="3-point contest court"></section>
    <section class="contest-hud" aria-label="3-point contest controls">
      <div class="contest-topbar">
        <div class="contest-title"><strong>3-Point Contest</strong><span id="contest-shooter">Tyrese Maxey - PHI</span></div>
        <div class="contest-score"><span>Score <b id="contest-score">0</b></span><span id="contest-rack">Rack 1 / 1</span><span id="contest-clock">70.0</span></div>
      </div>
      <div class="contest-feedback" id="contest-feedback">Press Space</div>
      <div class="contest-meter-wrap">
        <div class="contest-meter-labels"><span>Start</span><span>Distance</span><span>Aim</span></div>
        <div class="contest-meter" id="contest-meter"><span class="contest-zone distance"></span><span class="contest-zone aim"></span><span class="contest-cursor" id="contest-cursor"></span></div>
        <div class="contest-actions"><span id="contest-phase">Ready</span><button id="contest-action" type="button">Press Space / Click</button></div>
      </div>
    </section>
  </main>
  <script src="three-point-contest-core.js"></script>
  <script type="module" src="three-point-contest-renderer.js"></script>
  <script type="module" src="three-point-contest.js"></script>
</body>
</html>
```

- [ ] **Step 5: Add minimal renderer/controller modules to satisfy shell wiring**

Create `three-point-contest-renderer.js`:

```js
import * as THREE from './assets/vendor/three/three.module.js';

window.RosterBateThreePointRenderer = {
  THREE,
  createContestRenderer() {
    return {
      ready: false,
      mount() {},
      renderShot() { return Promise.resolve(); },
      dispose() {}
    };
  }
};
```

Create `three-point-contest.js`:

```js
(function initThreePointContestPage() {
  const app = document.getElementById('three-point-contest-app');
  if (app) app.dataset.contestStatus = 'loaded';
})();
```

- [ ] **Step 6: Add package scripts**

Modify `package.json` scripts:

```json
"threepoint:dev": "node tools/open-static-page.js three-point-contest.html",
"test:threepoint-core": "node tools/test-three-point-contest-core.js",
"test:threepoint": "node tools/test-three-point-contest-core.js && node tools/test-three-point-contest-shell.js && node tools/test-three-point-contest-playwright.js"
```

- [ ] **Step 7: Run shell and core tests**

Run:

```powershell
node .\tools\test-three-point-contest-core.js
node .\tools\test-three-point-contest-shell.js
```

Expected:

```text
test-three-point-contest-core passed
test-three-point-contest-shell passed
```

## Task 3: 3D Scene Vertical Slice

**Files:**
- Modify: `three-point-contest-renderer.js`
- Create: `tools/test-three-point-contest-playwright.js`

- [ ] **Step 1: Write failing Playwright scene boot test**

Create `tools/test-three-point-contest-playwright.js` with:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png'
};

function isInsideRoot(target) {
  const relative = path.relative(ROOT, target);
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function serve(req, res) {
  const decoded = decodeURIComponent(String(req.url || '/').split('?')[0]);
  const filePath = path.resolve(ROOT, `.${decoded === '/' ? '/three-point-contest.html' : decoded}`);
  if (!isInsideRoot(filePath) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve(server.address().port);
    });
  });
}

(async function main() {
  const server = http.createServer(serve);
  const port = await listen(server);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error?.stack || error?.message || error)));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto(`http://127.0.0.1:${port}/three-point-contest.html`, { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForFunction(() => document.querySelector('#three-point-contest-app')?.dataset.contestStatus === 'ready', null, { timeout: 7000 });

    assert.equal(await page.locator('#contest-scene canvas').isVisible(), true, '3D renderer should mount a visible canvas');
    const scene = await page.evaluate(() => {
      const canvas = document.querySelector('#contest-scene canvas');
      const rect = canvas.getBoundingClientRect();
      return {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        sceneReady: document.querySelector('#three-point-contest-app')?.dataset.sceneReady,
        score: document.querySelector('#contest-score')?.textContent,
        feedback: document.querySelector('#contest-feedback')?.textContent
      };
    });
    assert.equal(scene.width > 600, true);
    assert.equal(scene.height > 400, true);
    assert.equal(scene.sceneReady, 'true');
    assert.equal(scene.score, '0');
    assert.match(scene.feedback || '', /Press Space/i);

    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
  console.log('test-three-point-contest-playwright passed');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
```

- [ ] **Step 2: Run Playwright test and verify it fails**

Run:

```powershell
node .\tools\test-three-point-contest-playwright.js
```

Expected: fails because app status never becomes `ready` and no scene canvas is mounted.

- [ ] **Step 3: Implement renderer scene setup**

Replace `three-point-contest-renderer.js` with a real renderer that exports `createContestRenderer`:

```js
import * as THREE from './assets/vendor/three/three.module.js';

function createContestRenderer(options = {}) {
  let renderer;
  let scene;
  let camera;
  let ballMesh;
  let rafId = 0;
  let mounted = false;

  function resize(container) {
    if (!renderer || !camera || !container) return;
    const width = Math.max(1, container.clientWidth || window.innerWidth);
    const height = Math.max(1, container.clientHeight || window.innerHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function addCourt() {
    const court = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 22),
      new THREE.MeshStandardMaterial({ color: 0xd9a95f, roughness: 0.62, metalness: 0.05 })
    );
    court.rotation.x = -Math.PI / 2;
    court.position.z = -3;
    scene.add(court);

    const lane = new THREE.Mesh(
      new THREE.PlaneGeometry(5.2, 7.5),
      new THREE.MeshStandardMaterial({ color: 0x123c72, roughness: 0.7 })
    );
    lane.rotation.x = -Math.PI / 2;
    lane.position.set(0, 0.01, -9.5);
    scene.add(lane);
  }

  function addHoop() {
    const backboard = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 2.1, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xf8fbff, roughness: 0.35 })
    );
    backboard.position.set(0, 3.5, -10.4);
    scene.add(backboard);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.045, 12, 48),
      new THREE.MeshStandardMaterial({ color: 0xff7a2d, roughness: 0.25, metalness: 0.2 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, 2.75, -9.8);
    scene.add(rim);
  }

  function addRack() {
    const rack = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.8, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x173b65, roughness: 0.5 })
    );
    rack.position.set(-4.5, 0.45, -2.3);
    scene.add(rack);

    for (let index = 0; index < 5; index++) {
      const rackBall = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 24, 16),
        new THREE.MeshStandardMaterial({ color: index === 4 ? 0xf8fafc : 0xd98535, roughness: 0.5 })
      );
      rackBall.position.set(-5.05 + index * 0.28, 1.05, -2.35);
      scene.add(rackBall);
    }
  }

  function addLiveBall() {
    ballMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 32, 18),
      new THREE.MeshStandardMaterial({ color: 0xd98535, roughness: 0.48 })
    );
    ballMesh.position.set(0, 1.25, 1.2);
    scene.add(ballMesh);
  }

  function animate() {
    if (!mounted) return;
    renderer.render(scene, camera);
    rafId = window.requestAnimationFrame(animate);
  }

  function mount(container) {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050914);
    camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 100);
    camera.position.set(0, 2.2, 4.9);
    camera.lookAt(0, 2.55, -9.8);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xdff7ff, 0x19110a, 1.7));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(4, 8, 5);
    scene.add(key);
    addCourt();
    addHoop();
    addRack();
    addLiveBall();
    mounted = true;
    resize(container);
    window.addEventListener('resize', () => resize(container));
    animate();
    return renderer.domElement;
  }

  function setBallProgress(progress, made) {
    if (!ballMesh) return;
    const t = Math.max(0, Math.min(1, progress));
    ballMesh.position.x = 0;
    ballMesh.position.y = 1.25 + Math.sin(t * Math.PI) * 2.2 + t * 0.9;
    ballMesh.position.z = 1.2 + (-10.8 * t);
    ballMesh.scale.setScalar(made && t > 0.92 ? 0.7 : 1);
  }

  function renderShot(result) {
    return new Promise((resolve) => {
      const start = performance.now();
      const duration = 900;
      function tick(now) {
        const progress = Math.min(1, (now - start) / duration);
        setBallProgress(progress, !!result.made);
        if (progress < 1) window.requestAnimationFrame(tick);
        else {
          setBallProgress(0, false);
          resolve();
        }
      }
      window.requestAnimationFrame(tick);
    });
  }

  function dispose() {
    mounted = false;
    if (rafId) window.cancelAnimationFrame(rafId);
    if (renderer) renderer.dispose();
  }

  return { mount, renderShot, dispose };
}

window.RosterBateThreePointRenderer = { THREE, createContestRenderer };
```

- [ ] **Step 4: Wire controller boot to renderer readiness**

Replace `three-point-contest.js` with:

```js
(function initThreePointContestPage() {
  const app = document.getElementById('three-point-contest-app');
  const sceneMount = document.getElementById('contest-scene');
  if (!app || !sceneMount || !window.RosterBateThreePointRenderer) return;
  const renderer = window.RosterBateThreePointRenderer.createContestRenderer();
  renderer.mount(sceneMount);
  app.dataset.sceneReady = 'true';
  app.dataset.contestStatus = 'ready';
  window.RosterBateThreePointPage = { renderer };
})();
```

- [ ] **Step 5: Run the browser boot test**

Run:

```powershell
node .\tools\test-three-point-contest-playwright.js
```

Expected: `test-three-point-contest-playwright passed`.

## Task 4: Meter Input And One-Shot Resolution

**Files:**
- Modify: `three-point-contest.js`
- Modify: `tools/test-three-point-contest-playwright.js`

- [ ] **Step 1: Extend Playwright test for one shot**

Add this after the initial scene assertions in `tools/test-three-point-contest-playwright.js`:

```js
await page.keyboard.press('Space');
await page.waitForFunction(() => document.querySelector('#contest-phase')?.textContent.includes('Distance'), null, { timeout: 3000 });
await page.keyboard.press('Space');
await page.waitForFunction(() => document.querySelector('#contest-phase')?.textContent.includes('Aim'), null, { timeout: 3000 });
await page.keyboard.press('Space');
await page.waitForFunction(() => Number(document.querySelector('#contest-score')?.textContent || '0') >= 1, null, { timeout: 3000 });

const shotState = await page.evaluate(() => ({
  status: document.querySelector('#three-point-contest-app')?.dataset.contestStatus,
  score: document.querySelector('#contest-score')?.textContent,
  feedback: document.querySelector('#contest-feedback')?.textContent,
  phase: document.querySelector('#contest-phase')?.textContent,
  shots: window.RosterBateThreePointPage?.run?.shots?.length || 0
}));
assert.equal(shotState.status, 'ready');
assert.equal(shotState.shots, 1);
assert.match(shotState.feedback || '', /Green|Good|short|long|left|right/i);
assert.match(shotState.phase || '', /Ball 2|Next/i);
```

- [ ] **Step 2: Run Playwright and verify it fails**

Run:

```powershell
node .\tools\test-three-point-contest-playwright.js
```

Expected: fails because spacebar does not advance meter phases yet.

- [ ] **Step 3: Implement controller state and input**

Replace `three-point-contest.js` with a controller that creates the run, animates a cursor, and resolves one shot:

```js
(function initThreePointContestPage() {
  const core = window.RosterBateThreePointCore;
  const rendererApi = window.RosterBateThreePointRenderer;
  const app = document.getElementById('three-point-contest-app');
  const sceneMount = document.getElementById('contest-scene');
  const cursor = document.getElementById('contest-cursor');
  const scoreEl = document.getElementById('contest-score');
  const rackEl = document.getElementById('contest-rack');
  const feedbackEl = document.getElementById('contest-feedback');
  const phaseEl = document.getElementById('contest-phase');
  const actionButton = document.getElementById('contest-action');
  if (!core || !rendererApi || !app || !sceneMount) return;

  const shooter = core.createShooterProfile({
    id: 'tyrese-maxey',
    name: 'Tyrese Maxey',
    team: 'PHI',
    threePointRating: 88,
    clutchRating: 84
  });
  const config = core.createContestConfig({
    mode: 'vertical_slice',
    timerSeconds: 70,
    racks: [{ id: 'corner-left', label: 'Corner', spot: 'corner-left', distanceFeet: 22, balls: ['standard', 'standard', 'standard', 'standard', 'money'] }]
  });
  let run = core.createContestRun({ shooter, config, seed: 17 });
  let meter = core.createMeterState({ shotNumber: 1, rackSpot: 'corner-left' });
  let cursorPosition = 0;
  let cursorDirection = 1;
  let locked = false;

  const renderer = rendererApi.createContestRenderer();
  renderer.mount(sceneMount);
  app.dataset.sceneReady = 'true';
  app.dataset.contestStatus = 'ready';

  function currentBall() {
    return run.racks[run.currentRackIndex]?.balls[run.currentBallIndex] || null;
  }

  function updateHud() {
    scoreEl.textContent = String(run.score);
    rackEl.textContent = run.completed ? 'Rack Complete' : `Rack ${run.currentRackIndex + 1} / ${run.racks.length}`;
    const ballNumber = run.currentBallIndex + 1;
    phaseEl.textContent = run.completed ? 'Rack complete' : `Ball ${ballNumber} - ${meter.phase === 'idle' ? 'Ready' : meter.phase[0].toUpperCase() + meter.phase.slice(1)}`;
    cursor.style.left = `${Math.round(cursorPosition * 100)}%`;
  }

  function tick() {
    if (!locked) {
      cursorPosition += cursorDirection * 0.018;
      if (cursorPosition >= 1) {
        cursorPosition = 1;
        cursorDirection = -1;
      } else if (cursorPosition <= 0) {
        cursorPosition = 0;
        cursorDirection = 1;
      }
      cursor.style.left = `${Math.round(cursorPosition * 100)}%`;
    }
    window.requestAnimationFrame(tick);
  }

  async function handlePress() {
    if (locked || run.completed) return;
    meter = core.pressMeter(meter, cursorPosition);
    if (meter.phase === 'distance') {
      feedbackEl.textContent = 'Distance';
      updateHud();
      return;
    }
    if (meter.phase === 'aim') {
      feedbackEl.textContent = 'Aim';
      updateHud();
      return;
    }
    if (meter.phase !== 'released') return;
    locked = true;
    const ball = currentBall();
    const result = core.gradeShotInput({
      shooter: run.shooter,
      rackSpot: run.racks[run.currentRackIndex].spot,
      ballType: ball.type,
      input: meter.input
    });
    feedbackEl.textContent = result.feedback;
    await renderer.renderShot(result);
    run = core.applyShotResult(run, result);
    meter = core.createMeterState({ shotNumber: run.shots.length + 1, rackSpot: 'corner-left' });
    locked = false;
    updateHud();
  }

  window.addEventListener('keydown', (event) => {
    if (event.code !== 'Space') return;
    event.preventDefault();
    handlePress();
  });
  actionButton.addEventListener('click', handlePress);

  updateHud();
  tick();
  window.RosterBateThreePointPage = { renderer, get run() { return run; }, handlePress };
})();
```

- [ ] **Step 4: Run Playwright test**

Run:

```powershell
node .\tools\test-three-point-contest-playwright.js
```

Expected: one shot resolves and `shots === 1`.

## Task 5: Complete One-Rack Vertical Slice

**Files:**
- Modify: `three-point-contest.js`
- Modify: `three-point-contest.html`
- Modify: `tools/test-three-point-contest-playwright.js`

- [ ] **Step 1: Extend Playwright for full rack completion**

Add this after one-shot assertions:

```js
for (let shot = 1; shot < 5; shot++) {
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  await page.keyboard.press('Space');
  await page.waitForTimeout(1000);
}

await page.waitForFunction(() => window.RosterBateThreePointPage?.run?.completed === true, null, { timeout: 8000 });
const finalState = await page.evaluate(() => ({
  completed: window.RosterBateThreePointPage?.run?.completed,
  shots: window.RosterBateThreePointPage?.run?.shots?.length,
  score: Number(document.querySelector('#contest-score')?.textContent || '0'),
  rackText: document.querySelector('#contest-rack')?.textContent,
  feedback: document.querySelector('#contest-feedback')?.textContent
}));
assert.equal(finalState.completed, true);
assert.equal(finalState.shots, 5);
assert.equal(finalState.score > 0, true);
assert.match(finalState.rackText || '', /complete/i);
assert.match(finalState.feedback || '', /complete|final/i);
```

- [ ] **Step 2: Run Playwright and verify it fails if final feedback is missing**

Run:

```powershell
node .\tools\test-three-point-contest-playwright.js
```

Expected: may fail because final feedback text does not clearly say the rack is complete.

- [ ] **Step 3: Add rack-complete feedback and ball indicators**

In `three-point-contest.html`, add this inside `.contest-topbar` after `contest-score`:

```html
<div id="contest-balls" class="contest-balls" aria-label="Rack balls"></div>
```

Add CSS:

```css
.contest-balls { display: flex; gap: 6px; align-items: center; }
.contest-ball-dot { width: 12px; height: 12px; border-radius: 50%; background: rgba(148,163,184,.45); border: 1px solid rgba(255,255,255,.18); }
.contest-ball-dot.money { background: #f8fafc; border-color: #f6a344; }
.contest-ball-dot.made { background: var(--green); }
.contest-ball-dot.missed { background: var(--red); }
```

In `three-point-contest.js`, cache `ballsEl` and extend `updateHud()`:

```js
const ballsEl = document.getElementById('contest-balls');

function renderBallDots() {
  const rack = run.racks[run.currentRackIndex] || run.racks[run.racks.length - 1];
  ballsEl.innerHTML = rack.balls.map((ball) => {
    const state = ball.made === true ? 'made' : (ball.made === false ? 'missed' : '');
    return `<span class="contest-ball-dot ${ball.type === 'money' ? 'money' : ''} ${state}" aria-hidden="true"></span>`;
  }).join('');
}
```

Call `renderBallDots()` inside `updateHud()`. After applying a shot, set final text:

```js
if (run.completed) {
  feedbackEl.textContent = `Rack complete - ${run.score}`;
  app.dataset.contestStatus = 'complete';
}
```

- [ ] **Step 4: Run full rack browser test**

Run:

```powershell
node .\tools\test-three-point-contest-playwright.js
```

Expected: `test-three-point-contest-playwright passed`.

## Task 6: Final Verification And Handoff

**Files:**
- Modify only if tests expose issues in files from earlier tasks.

- [ ] **Step 1: Run the full three-point suite**

Run:

```powershell
npm.cmd run test:threepoint
```

Expected:

```text
test-three-point-contest-core passed
test-three-point-contest-shell passed
test-three-point-contest-playwright passed
```

- [ ] **Step 2: Run surrounding smoke checks**

Run:

```powershell
node .\tools\test-shared-season-shell-simulation.js
node .\tools\test-player-portrait-assets.js
```

Expected: both pass. These catch accidental global/static-page breakage around shared portraits and season shell scripts.

- [ ] **Step 3: Launch local page for manual QA**

Run:

```powershell
npm.cmd run threepoint:dev
```

Expected: local browser opens `http://127.0.0.1:8080/three-point-contest.html` or the next free port.

Manual QA checklist:

- Page opens directly into the playable game, not a landing page.
- 3D scene is nonblank and framed around hoop/rack/court.
- Spacebar advances Start -> Distance -> Aim.
- Click button triggers the same input path as Space.
- Ball arc lasts roughly one second.
- Score changes after made shots.
- Rack completes after five shots.
- HUD text does not overlap at desktop width.

- [ ] **Step 4: Check diff hygiene**

Run:

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors. Existing CRLF warnings may appear; do not churn unrelated files.

- [ ] **Step 5: Handoff without commit**

Do not commit unless the user asks. Summarize changed files, tests run, and the local URL. Mention that the next planned expansion is full 5-rack modern rules with money rack/deep balls.

## Self-Review

- Spec coverage: this plan covers hidden standalone route, 3D + 2D HUD, sweeping three-press meter, modern-rules data model, player-rating assist, green/good make model, curated shooter default, one-rack vertical slice, and browser verification.
- Intentional deferral: full 5-rack contest, deep balls, money rack selector, CPU bracket, season launch, and league memory are listed as follow-up expansion after the vertical slice feels good.
- Type consistency: `shooterProfile`, `contestConfig`, `contestRun`, `meterState`, `gradeShotInput`, and `applyShotResult` names are consistent across tests and implementation snippets.
- User preference: commit steps are replaced by local checkpoints because the user asked to avoid commits unless explicitly requested.
