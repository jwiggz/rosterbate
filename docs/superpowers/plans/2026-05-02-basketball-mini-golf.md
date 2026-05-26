# Basketball Mini Golf Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Do not commit unless the user explicitly asks; use local checkpoints instead.

**Goal:** Build a hidden standalone first playable Basketball Mini Golf slice: three trick-shot holes, full basketball arc shots, shot cards, route aiming, PangYa-style distance/aim meter, stroke scoring, and course-to-course progression.

**Architecture:** Keep game rules, course state, meter mapping, shot-card parameters, and deterministic shot resolution in a pure CommonJS/browser core. Keep Three.js rendering and browser input in thin adapters, following the current 3-point contest split while creating sibling `basketball-golf.*` files instead of mutating the 3-point prototype.

**Tech Stack:** Plain HTML/CSS/JS, CommonJS-compatible UMD core, local Three.js vendor files under `assets/vendor/three/`, Node `assert` tests, Playwright browser smoke tests, PowerShell commands on Windows.

---

## File Structure

- Create `basketball-golf-core.js`
  - Pure data and deterministic rules.
  - Exports browser global `RosterBateBasketballGolfCore` and CommonJS module.
  - Owns course definitions, shot cards, run progression, meter state, trajectory descriptors, shot resolution, stroke cap, and score summaries.

- Create `basketball-golf-renderer.js`
  - Browser-only Three.js adapter.
  - Owns scene boot, course geometry, hoop, ball, ghost route, mini-map canvas/overlay, and shot animation.
  - Exposes `createBasketballGolfRenderer()`.

- Create `basketball-golf.js`
  - Browser controller.
  - Owns DOM state, selected shot card, aim angle, meter cursor, keyboard/click input, renderer calls, and HUD updates.
  - Exposes `window.RosterBateBasketballGolfPage` for browser tests.

- Create `basketball-golf.html`
  - Hidden standalone playable page.
  - First viewport is the actual game, not a landing page.

- Create `tools/test-basketball-golf-core.js`
  - Pure Node tests for course, shot cards, meter, trajectories, deterministic resolution, stroke cap, and three-hole completion.

- Create `tools/test-basketball-golf-shell.js`
  - Static source test for page/module/script wiring and package scripts.

- Create `tools/test-basketball-golf-playwright.js`
  - Browser smoke test for boot, nonblank canvas, shot cards, mini-map, meter geometry, one ideal shot, hole advancement, and controlled three-hole completion.

- Modify `package.json`
  - Add `basketballgolf:dev`
  - Add `test:basketballgolf-core`
  - Add `test:basketballgolf`

---

### Task 1: Pure Basketball Golf Core

**Files:**
- Create: `basketball-golf-core.js`
- Create: `tools/test-basketball-golf-core.js`

- [ ] **Step 1: Write the failing core tests**

Create `tools/test-basketball-golf-core.js`:

```js
const assert = require('node:assert/strict');
const core = require('../basketball-golf-core');

function idealInput(overrides = {}) {
  return Object.assign({
    shotCardId: 'lob',
    aimAngle: 0,
    distance: 0.5,
    aim: 0.5,
    combo: null
  }, overrides);
}

function playIdealHole(run, shotCardId) {
  const hole = core.currentHole(run);
  const shot = core.resolveShot({
    courseRun: run,
    hole,
    input: idealInput({ shotCardId })
  });
  return core.applyShotResult(run, shot);
}

assert.equal(typeof core.createDefaultCourse, 'function');
assert.equal(typeof core.createCourseRun, 'function');
assert.equal(typeof core.resolveShot, 'function');
assert.equal(typeof core.applyShotResult, 'function');

const course = core.createDefaultCourse();
assert.equal(course.id, 'rosterbate-trick-shot-3');
assert.equal(course.holes.length, 3);
assert.deepEqual(course.holes.map((hole) => hole.par), [2, 3, 3]);
assert.deepEqual(course.holes.map((hole) => hole.recommendedShotTypes[0]), ['lob', 'bank', 'bounce']);

const cards = core.createShotCards();
assert.deepEqual(Object.keys(cards), ['lob', 'bounce', 'bank', 'spin']);
assert.equal(cards.lob.trajectory, 'arc');
assert.equal(cards.bounce.trajectory, 'bounce');
assert.equal(cards.bank.trajectory, 'bank');
assert.equal(cards.spin.trajectory, 'spin');

let meter = core.createMeterState({ holeId: 'starter-arc', shotNumber: 1 });
meter = core.pressMeter(meter, 0.02);
assert.equal(meter.phase, 'distance');
meter = core.pressMeter(meter, 0.925);
assert.equal(meter.phase, 'aim');
meter = core.pressMeter(meter, 0.135);
assert.equal(meter.phase, 'released');
assert.deepEqual(meter.input, { start: 0.02, distance: 0.5, aim: 0.5 });

let run = core.createCourseRun({ course, seed: 42 });
assert.equal(run.currentHoleIndex, 0);
assert.equal(run.totalStrokes, 0);
assert.equal(core.currentHole(run).id, 'starter-arc');

const lobShot = core.resolveShot({
  courseRun: run,
  hole: core.currentHole(run),
  input: idealInput({ shotCardId: 'lob' })
});
assert.equal(lobShot.made, true);
assert.equal(lobShot.grade, 'swish');
assert.equal(lobShot.trajectory.kind, 'arc');
assert.equal(lobShot.feedback, 'Swish');

const repeatedLob = core.resolveShot({
  courseRun: run,
  hole: core.currentHole(run),
  input: idealInput({ shotCardId: 'lob' })
});
assert.deepEqual(repeatedLob, lobShot);

run = core.applyShotResult(run, lobShot);
assert.equal(run.holeRuns[0].completed, true);
assert.equal(run.holeRuns[0].strokes, 1);
assert.equal(run.currentHoleIndex, 1);
assert.equal(core.currentHole(run).id, 'bank-lane');

const poorBank = core.resolveShot({
  courseRun: run,
  hole: core.currentHole(run),
  input: idealInput({ shotCardId: 'bank', distance: 0.95, aim: 0.1 })
});
assert.equal(poorBank.made, false);
assert.match(poorBank.feedback, /long|left|angle|speed/i);

run = playIdealHole(run, 'bank');
assert.equal(run.currentHoleIndex, 2);
assert.equal(core.currentHole(run).id, 'bounce-spin-lane');
run = playIdealHole(run, 'bounce');
assert.equal(run.completed, true);
assert.equal(run.totalStrokes, 3);
assert.equal(core.courseScore(run), -5);

let cappedRun = core.createCourseRun({ course, seed: 1 });
for (let index = 0; index < 8; index++) {
  const miss = core.resolveShot({
    courseRun: cappedRun,
    hole: core.currentHole(cappedRun),
    input: idealInput({ shotCardId: 'lob', distance: 1, aim: 1 })
  });
  cappedRun = core.applyShotResult(cappedRun, miss);
}
assert.equal(cappedRun.holeRuns[0].completed, true);
assert.equal(cappedRun.holeRuns[0].strokes, 8);
assert.equal(cappedRun.currentHoleIndex, 1);

console.log('test-basketball-golf-core passed');
```

- [ ] **Step 2: Run the core test and verify it fails**

Run:

```powershell
node .\tools\test-basketball-golf-core.js
```

Expected:

```text
Error: Cannot find module '../basketball-golf-core'
```

- [ ] **Step 3: Implement the pure core**

Create `basketball-golf-core.js`:

```js
(function(root, factory){
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RosterBateBasketballGolfCore = factory();
  }
})(typeof self !== 'undefined' ? self : this, function(){
  'use strict';

  const VISUAL_TARGETS = Object.freeze({ distance: 0.925, aim: 0.135 });
  const VISUAL_TO_CORE_SCALE = 2;
  const STROKE_CAP = 8;

  function clamp(value, min, max){
    const num = Number(value);
    if (!Number.isFinite(num)) return min;
    return Math.min(max, Math.max(min, num));
  }

  function clampUnit(value){
    return clamp(value, 0, 1);
  }

  function round(value, places){
    const scale = Math.pow(10, places || 3);
    return Math.round(Number(value || 0) * scale) / scale;
  }

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  function hashString(value){
    const text = String(value || '');
    let hash = 2166136261;
    for (let index = 0; index < text.length; index++) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function deterministicUnit(value){
    return hashString(value) / 4294967295;
  }

  function createShotCards(){
    return {
      lob: {
        id: 'lob',
        label: 'Lob',
        trajectory: 'arc',
        powerMultiplier: 1,
        spinProfile: 'soft-drop',
        bounceProfile: 'none',
        bankProfile: 'none'
      },
      bounce: {
        id: 'bounce',
        label: 'Bounce',
        trajectory: 'bounce',
        powerMultiplier: 0.94,
        spinProfile: 'forward',
        bounceProfile: 'floor-rise',
        bankProfile: 'none'
      },
      bank: {
        id: 'bank',
        label: 'Bank',
        trajectory: 'bank',
        powerMultiplier: 1.04,
        spinProfile: 'neutral',
        bounceProfile: 'none',
        bankProfile: 'angled-glass'
      },
      spin: {
        id: 'spin',
        label: 'Spin',
        trajectory: 'spin',
        powerMultiplier: 0.98,
        spinProfile: 'side-curve',
        bounceProfile: 'soft-skip',
        bankProfile: 'soft-angle'
      }
    };
  }

  function createDefaultCourse(){
    return {
      id: 'rosterbate-trick-shot-3',
      title: 'RosterBate Trick Shot 3',
      strokeCap: STROKE_CAP,
      holes: [
        {
          id: 'starter-arc',
          number: 1,
          label: 'Starter Arc',
          par: 2,
          tee: { x: -4, y: 0, z: 4 },
          hoop: { x: 3.5, y: 3.05, z: -5 },
          obstacles: [],
          recommendedShotTypes: ['lob']
        },
        {
          id: 'bank-lane',
          number: 2,
          label: 'Bank Lane',
          par: 3,
          tee: { x: -4.5, y: 0, z: 4.5 },
          hoop: { x: 4.2, y: 3.05, z: -4.8 },
          obstacles: [{ id: 'bank-wall', type: 'bank-wall', x: 1.5, z: -1.6, angle: -28 }],
          recommendedShotTypes: ['bank', 'lob']
        },
        {
          id: 'bounce-spin-lane',
          number: 3,
          label: 'Bounce And Spin',
          par: 3,
          tee: { x: -4.2, y: 0, z: 4.4 },
          hoop: { x: 3.8, y: 3.05, z: -5.2 },
          obstacles: [{ id: 'bounce-pad', type: 'bounce-pad', x: 0.6, z: -1.2, radius: 1.1 }],
          recommendedShotTypes: ['bounce', 'spin']
        }
      ]
    };
  }

  function normalizeCourse(course){
    const source = course && typeof course === 'object' ? course : createDefaultCourse();
    return {
      id: String(source.id || 'course'),
      title: String(source.title || 'Basketball Golf Course'),
      strokeCap: Number.isFinite(Number(source.strokeCap)) ? Number(source.strokeCap) : STROKE_CAP,
      holes: Array.isArray(source.holes) ? source.holes.map((hole, index) => ({
        id: String(hole.id || `hole-${index + 1}`),
        number: Number(hole.number || index + 1),
        label: String(hole.label || `Hole ${index + 1}`),
        par: Number.isFinite(Number(hole.par)) ? Number(hole.par) : 3,
        tee: Object.assign({ x: -4, y: 0, z: 4 }, hole.tee || {}),
        hoop: Object.assign({ x: 4, y: 3.05, z: -5 }, hole.hoop || {}),
        obstacles: Array.isArray(hole.obstacles) ? clone(hole.obstacles) : [],
        recommendedShotTypes: Array.isArray(hole.recommendedShotTypes) && hole.recommendedShotTypes.length
          ? hole.recommendedShotTypes.map(String)
          : ['lob']
      })) : []
    };
  }

  function emptyHoleRun(hole){
    return {
      holeId: hole.id,
      strokes: 0,
      shots: [],
      completed: false
    };
  }

  function createCourseRun(options){
    const source = options && typeof options === 'object' ? options : {};
    const course = normalizeCourse(source.course || createDefaultCourse());
    return {
      id: `basketball-golf-run-${Number(source.seed) || 0}`,
      seed: Number(source.seed) || 0,
      course,
      currentHoleIndex: 0,
      holeRuns: course.holes.map(emptyHoleRun),
      totalStrokes: 0,
      completed: false
    };
  }

  function currentHole(run){
    const source = run && typeof run === 'object' ? run : {};
    const course = source.course || createDefaultCourse();
    return course.holes ? course.holes[source.currentHoleIndex || 0] || null : null;
  }

  function createMeterState(options){
    const source = options && typeof options === 'object' ? options : {};
    return {
      phase: 'idle',
      holeId: source.holeId,
      shotNumber: source.shotNumber,
      input: {}
    };
  }

  function visualCursorForCore(phase, position){
    if (phase !== 'distance' && phase !== 'aim') return clampUnit(position);
    const target = VISUAL_TARGETS[phase];
    return clampUnit(0.5 + (clampUnit(position) - target) * VISUAL_TO_CORE_SCALE);
  }

  function pressMeter(state, cursorPosition){
    const source = state && typeof state === 'object' ? state : createMeterState({});
    const next = {
      phase: source.phase || 'idle',
      holeId: source.holeId,
      shotNumber: source.shotNumber,
      input: Object.assign({}, source.input)
    };
    if (source.phase === 'released') return next;
    if (source.phase === 'aim') {
      next.phase = 'released';
      next.input.aim = visualCursorForCore('aim', cursorPosition);
      return next;
    }
    if (source.phase === 'distance') {
      next.phase = 'aim';
      next.input.distance = visualCursorForCore('distance', cursorPosition);
      return next;
    }
    next.phase = 'distance';
    next.input.start = clampUnit(cursorPosition);
    return next;
  }

  function normalizeShotInput(input){
    const source = input && typeof input === 'object' ? input : {};
    return {
      shotCardId: String(source.shotCardId || 'lob'),
      aimAngle: round(clamp(source.aimAngle, -45, 45), 3),
      distance: clampUnit(source.distance),
      aim: clampUnit(source.aim),
      combo: source.combo == null ? null : String(source.combo)
    };
  }

  function trajectoryFor(card, hole, input){
    const base = {
      kind: card.trajectory,
      peak: round(card.trajectory === 'arc' ? 1.15 : card.trajectory === 'bounce' ? 0.62 : 0.84, 3),
      bounceCount: card.trajectory === 'bounce' ? 1 : 0,
      bankCount: card.trajectory === 'bank' ? 1 : 0,
      curve: card.trajectory === 'spin' ? round(input.aimAngle / 45, 3) : 0,
      recommended: hole.recommendedShotTypes.indexOf(card.id) !== -1
    };
    return base;
  }

  function missReason(input){
    const distanceError = Math.abs(input.distance - 0.5);
    const aimError = Math.abs(input.aim - 0.5);
    if (distanceError >= aimError) return input.distance < 0.5 ? 'short' : 'long';
    return input.aim < 0.5 ? 'left' : 'right';
  }

  function resolveShot(options){
    const source = options && typeof options === 'object' ? options : {};
    const run = source.courseRun || createCourseRun({});
    const hole = source.hole || currentHole(run);
    const input = normalizeShotInput(source.input);
    const cards = createShotCards();
    const card = cards[input.shotCardId] || cards.lob;
    const trajectory = trajectoryFor(card, hole, input);
    const distanceError = Math.abs(input.distance - 0.5);
    const aimError = Math.abs(input.aim - 0.5);
    const angleError = Math.abs(input.aimAngle) / 120;
    const wrongCardPenalty = trajectory.recommended ? 0 : 0.11;
    const error = Math.max(distanceError, aimError) + angleError + wrongCardPenalty;
    const deterministicRoll = deterministicUnit([
      run.seed,
      hole.id,
      run.holeRuns[run.currentHoleIndex]?.strokes || 0,
      card.id,
      input.aimAngle,
      input.distance.toFixed(3),
      input.aim.toFixed(3)
    ].join('|'));
    const made = error <= 0.08 || (error <= 0.16 && deterministicRoll < 0.35);
    const grade = made && error <= 0.04 ? 'swish' : made ? 'made' : missReason(input);
    return {
      holeId: hole.id,
      shotCardId: card.id,
      made,
      grade,
      feedback: made ? (grade === 'swish' ? 'Swish' : 'Made it') : `Missed ${grade}`,
      input,
      trajectory,
      error: round(error, 4)
    };
  }

  function advancePastCompletedHoles(next){
    while (next.currentHoleIndex < next.holeRuns.length && next.holeRuns[next.currentHoleIndex].completed) {
      next.currentHoleIndex += 1;
    }
    next.completed = next.currentHoleIndex >= next.holeRuns.length;
    if (next.completed) next.currentHoleIndex = next.holeRuns.length - 1;
    return next;
  }

  function applyShotResult(run, result){
    const next = clone(run);
    if (next.completed) return next;
    const holeIndex = next.currentHoleIndex;
    const hole = next.course.holes[holeIndex];
    const holeRun = next.holeRuns[holeIndex];
    holeRun.strokes += 1;
    holeRun.shots.push(clone(result));
    next.totalStrokes += 1;
    if (result.made || holeRun.strokes >= Number(next.course.strokeCap || STROKE_CAP)) {
      holeRun.completed = true;
      if (!result.made && holeRun.strokes >= Number(next.course.strokeCap || STROKE_CAP)) {
        holeRun.capScore = hole.par + 5;
      }
    }
    return advancePastCompletedHoles(next);
  }

  function courseScore(run){
    return (run.holeRuns || []).reduce((score, holeRun, index) => {
      const hole = run.course.holes[index];
      const strokes = holeRun.capScore || holeRun.strokes || 0;
      return score + strokes - hole.par;
    }, 0);
  }

  return {
    VISUAL_TARGETS,
    STROKE_CAP,
    createShotCards,
    createDefaultCourse,
    createCourseRun,
    currentHole,
    createMeterState,
    pressMeter,
    normalizeShotInput,
    resolveShot,
    applyShotResult,
    courseScore
  };
});
```

- [ ] **Step 4: Run the core test and verify it passes**

Run:

```powershell
node .\tools\test-basketball-golf-core.js
```

Expected:

```text
test-basketball-golf-core passed
```

- [ ] **Step 5: Local checkpoint**

Run:

```powershell
git status --short -- basketball-golf-core.js tools/test-basketball-golf-core.js
```

Expected: both files appear as untracked or modified local work. Do not commit.

---

### Task 2: Static Page Shell And Package Scripts

**Files:**
- Create: `basketball-golf.html`
- Create: `tools/test-basketball-golf-shell.js`
- Modify: `package.json`

- [ ] **Step 1: Write the failing shell test**

Create `tools/test-basketball-golf-shell.js`:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const htmlPath = path.join(root, 'basketball-golf.html');
const corePath = path.join(root, 'basketball-golf-core.js');
const rendererPath = path.join(root, 'basketball-golf-renderer.js');
const controllerPath = path.join(root, 'basketball-golf.js');
const playwrightPath = path.join(root, 'tools', 'test-basketball-golf-playwright.js');
const threePath = path.join(root, 'assets', 'vendor', 'three', 'three.module.js');
const packagePath = path.join(root, 'package.json');

assert.equal(fs.existsSync(htmlPath), true, 'basketball golf page should exist');
assert.equal(fs.existsSync(corePath), true, 'basketball golf core should exist');
assert.equal(fs.existsSync(rendererPath), true, 'basketball golf renderer should exist');
assert.equal(fs.existsSync(controllerPath), true, 'basketball golf controller should exist');
assert.equal(fs.existsSync(playwrightPath), true, 'basketball golf Playwright smoke test should exist');
assert.equal(fs.existsSync(threePath), true, 'local Three.js module should exist');

const html = fs.readFileSync(htmlPath, 'utf8');
assert.match(html, /id="basketball-golf-app"/, 'page should mount the game app');
assert.match(html, /id="golf-shot-cards"/, 'page should expose shot cards');
assert.match(html, /id="golf-mini-map"/, 'page should expose mini-map');
assert.match(html, /id="golf-meter"/, 'page should expose timing meter');
assert.match(html, /basketball-golf-core\.js/, 'page should load core module');
assert.match(html, /basketball-golf-renderer\.js/, 'page should load renderer module');
assert.match(html, /basketball-golf\.js/, 'page should load controller module');
assert.match(html, /assets\/vendor\/three\/three\.module\.js/, 'page should preload local Three.js');
assert.doesNotMatch(html, /landing|hero/i, 'page should be playable, not marketing');

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
assert.equal(pkg.scripts['basketballgolf:dev'], 'node tools/open-static-page.js basketball-golf.html');
assert.equal(pkg.scripts['test:basketballgolf-core'], 'node tools/test-basketball-golf-core.js');
assert.equal(pkg.scripts['test:basketballgolf'], 'node tools/test-basketball-golf-core.js && node tools/test-basketball-golf-shell.js && node tools/test-basketball-golf-playwright.js');

console.log('test-basketball-golf-shell passed');
```

- [ ] **Step 2: Create a temporary smoke Playwright test so the shell test can check the path**

Create `tools/test-basketball-golf-playwright.js`:

```js
const assert = require('node:assert/strict');

assert.equal(true, true);
console.log('test-basketball-golf-playwright smoke scaffold passed');
```

- [ ] **Step 3: Run the shell test and verify it fails**

Run:

```powershell
node .\tools\test-basketball-golf-shell.js
```

Expected:

```text
AssertionError: basketball golf page should exist
```

- [ ] **Step 4: Create the playable page shell**

Create `basketball-golf.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RosterBate Basketball Golf</title>
  <link rel="modulepreload" href="assets/vendor/three/three.module.js">
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
      --magenta: #d946ef;
      --meter-blue: #0f6f95;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; background: var(--bg); color: var(--text); font-family: Arial, sans-serif; }
    body { overflow: hidden; }
    #basketball-golf-app { position: fixed; inset: 0; display: grid; background: radial-gradient(circle at 50% 20%, rgba(56,189,248,.16), transparent 30%), #050914; }
    .golf-scene { position: absolute; inset: 0; }
    .golf-scene canvas { width: 100%; height: 100%; display: block; }
    .golf-hud { position: absolute; inset: 0; pointer-events: none; display: grid; grid-template-rows: auto 1fr auto; padding: 18px; gap: 14px; }
    .golf-topbar, .golf-controls { pointer-events: auto; border: 1px solid var(--line); background: var(--panel); backdrop-filter: blur(14px); border-radius: 8px; }
    .golf-topbar { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; }
    .golf-title { display: grid; gap: 2px; }
    .golf-title strong { font-size: 22px; line-height: 1; }
    .golf-title span { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: .12em; }
    .golf-score { display: flex; gap: 14px; align-items: center; font-weight: 800; }
    .golf-score b { color: var(--orange); font-size: 28px; }
    .golf-feedback { align-self: start; justify-self: center; margin-top: 72px; padding: 10px 14px; border-radius: 999px; background: rgba(8,17,31,.78); border: 1px solid var(--line); font-weight: 900; text-transform: uppercase; letter-spacing: .12em; }
    .golf-mini-map { position: absolute; right: 18px; bottom: 142px; width: 148px; height: 96px; border-radius: 10px; border: 1px solid var(--line); background: rgba(2,6,23,.76); pointer-events: none; }
    .golf-controls { display: grid; gap: 10px; padding: 14px; }
    .golf-shot-cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
    .golf-shot-card { border: 1px solid rgba(148,163,184,.28); background: rgba(15,23,42,.76); color: var(--text); border-radius: 7px; padding: 9px 10px; font-weight: 900; cursor: pointer; }
    .golf-shot-card.active { border-color: rgba(246,163,68,.7); color: #ffe0b0; box-shadow: 0 0 18px rgba(246,163,68,.22); }
    .golf-shot-card.recommended::after { content: " REC"; color: var(--green); font-size: 10px; }
    .golf-meter-labels { display: flex; justify-content: space-between; color: var(--muted); font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: .1em; }
    .golf-meter-row { display: grid; grid-template-columns: 58px minmax(0, 1fr); gap: 10px; align-items: center; }
    .golf-aim-dial { position: relative; aspect-ratio: 1; border-radius: 50%; border: 3px solid rgba(226,232,240,.9); background: radial-gradient(circle at 50% 50%, #111827 0 16%, #dbeafe 18% 32%, #f8fafc 34% 100%); box-shadow: inset 0 0 0 5px rgba(15,23,42,.42), 0 0 16px rgba(56,189,248,.28); overflow: hidden; }
    .golf-aim-dial::before { content: ""; position: absolute; left: 8px; right: 8px; top: 50%; height: 3px; transform: translateY(-50%); background: var(--green); box-shadow: 0 0 10px rgba(34,197,94,.8); }
    .golf-aim-dial::after { content: ""; position: absolute; width: 12px; height: 12px; left: 50%; top: 50%; border-radius: 50%; transform: translate(-50%, -50%); background: var(--cyan); border: 2px solid #082f49; box-shadow: 0 0 10px rgba(56,189,248,.8); }
    .golf-meter { position: relative; height: 38px; border-radius: 6px; overflow: hidden; background: linear-gradient(180deg, #f8fafc 0%, #dbeafe 50%, #f8fafc 100%); border: 2px solid rgba(248,250,252,.92); box-shadow: inset 0 0 0 1px rgba(15,23,42,.32), 0 0 18px rgba(56,189,248,.18); }
    .golf-meter::before { content: ""; position: absolute; inset: 6px 8px; border-radius: 3px; background: linear-gradient(180deg, rgba(8,47,73,.92), rgba(14,116,144,.92)); }
    .golf-meter-fill { position: absolute; z-index: 1; left: 8px; top: 6px; bottom: 6px; width: 0; border-radius: 3px; background: linear-gradient(90deg, #06b6d4, var(--meter-blue)); }
    .golf-zone { position: absolute; z-index: 3; top: 6px; bottom: 6px; border-radius: 3px; }
    .golf-zone.distance { left: 88%; width: 9%; background: linear-gradient(90deg, rgba(34,197,94,.9), rgba(246,163,68,.96)); box-shadow: 0 0 16px rgba(246,163,68,.45); }
    .golf-zone.aim { left: 8%; width: 11%; display: grid; grid-template-columns: 1fr 4px 1fr; gap: 5px; align-items: stretch; background: transparent; box-shadow: 0 0 16px rgba(217,70,239,.5); }
    .golf-aim-bar { border-radius: 2px; background: linear-gradient(180deg, #f0abfc, var(--magenta)); }
    .golf-aim-center { border-radius: 999px; background: #f8fafc; box-shadow: 0 0 10px #fff, 0 0 14px rgba(34,197,94,.75); }
    .golf-cursor { position: absolute; z-index: 5; top: 2px; width: 5px; height: calc(100% - 4px); background: #fff; border: 1px solid rgba(15,23,42,.82); box-shadow: 0 0 12px #fff, 0 0 20px rgba(56,189,248,.72); transform: translateX(-2px); }
    .golf-actions { display: flex; gap: 10px; align-items: center; justify-content: space-between; color: var(--muted); font-size: 12px; }
    .golf-actions button { pointer-events: auto; border: 1px solid rgba(246,163,68,.55); background: rgba(246,163,68,.13); color: #ffe0b0; border-radius: 6px; padding: 9px 12px; font-weight: 900; cursor: pointer; }
  </style>
</head>
<body>
  <main id="basketball-golf-app" data-golf-status="booting">
    <section class="golf-scene" id="golf-scene" aria-label="Basketball mini golf course"></section>
    <section class="golf-hud" aria-label="Basketball mini golf controls">
      <div class="golf-topbar">
        <div class="golf-title"><strong>Basketball Golf</strong><span id="golf-hole-title">Hole 1 - Starter Arc</span></div>
        <div class="golf-score"><span>Strokes <b id="golf-strokes">0</b></span><span id="golf-par">Par 2</span><span id="golf-course-progress">1 / 3</span></div>
      </div>
      <div class="golf-feedback" id="golf-feedback">Choose Shot</div>
      <canvas id="golf-mini-map" class="golf-mini-map" width="296" height="192" aria-label="Course mini-map"></canvas>
      <div class="golf-controls">
        <div class="golf-shot-cards" id="golf-shot-cards"></div>
        <div class="golf-meter-labels"><span>Aim</span><span>Distance</span></div>
        <div class="golf-meter-row">
          <div class="golf-aim-dial" aria-hidden="true"></div>
          <div class="golf-meter" id="golf-meter"><span class="golf-meter-fill" id="golf-meter-fill"></span><span class="golf-zone aim"><span class="golf-aim-bar left"></span><span class="golf-aim-center"></span><span class="golf-aim-bar right"></span></span><span class="golf-zone distance"></span><span class="golf-cursor" id="golf-cursor"></span></div>
        </div>
        <div class="golf-actions"><span id="golf-phase">Ready</span><button id="golf-action" type="button">Press Space / Click</button></div>
      </div>
    </section>
  </main>
  <script src="basketball-golf-core.js"></script>
  <script type="module" src="basketball-golf-renderer.js"></script>
  <script type="module" src="basketball-golf.js"></script>
</body>
</html>
```

- [ ] **Step 5: Add package scripts**

Modify `package.json` scripts:

```json
"basketballgolf:dev": "node tools/open-static-page.js basketball-golf.html",
"test:basketballgolf-core": "node tools/test-basketball-golf-core.js",
"test:basketballgolf": "node tools/test-basketball-golf-core.js && node tools/test-basketball-golf-shell.js && node tools/test-basketball-golf-playwright.js"
```

Keep existing scripts unchanged.

- [ ] **Step 6: Create minimal renderer and controller scaffolds**

Create `basketball-golf-renderer.js`:

```js
import * as THREE from './assets/vendor/three/three.module.js';

(function initBasketballGolfRenderer(){
  function createBasketballGolfRenderer(){
    return {
      mount(target){
        if (!target) return null;
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        target.appendChild(canvas);
        return canvas;
      },
      setHole(){},
      setGhostRoute(){},
      renderShot(){
        return Promise.resolve();
      },
      dispose(){}
    };
  }

  window.RosterBateBasketballGolfRenderer = { createBasketballGolfRenderer, THREE };
})();
```

Create `basketball-golf.js`:

```js
(function initBasketballGolfPage(){
  const app = document.getElementById('basketball-golf-app');
  const sceneMount = document.getElementById('golf-scene');
  const core = window.RosterBateBasketballGolfCore;
  const rendererApi = window.RosterBateBasketballGolfRenderer;
  if (!app || !sceneMount || !core || !rendererApi) return;

  const renderer = rendererApi.createBasketballGolfRenderer();
  renderer.mount(sceneMount);
  app.dataset.golfStatus = 'ready';
  app.dataset.sceneReady = 'true';

  window.RosterBateBasketballGolfPage = { renderer };
})();
```

- [ ] **Step 7: Run shell test and verify it passes**

Run:

```powershell
node .\tools\test-basketball-golf-shell.js
```

Expected:

```text
test-basketball-golf-shell passed
```

- [ ] **Step 8: Local checkpoint**

Run:

```powershell
git status --short -- basketball-golf.html basketball-golf-renderer.js basketball-golf.js tools/test-basketball-golf-shell.js tools/test-basketball-golf-playwright.js package.json
```

Expected: local file changes only. Do not commit.

---

### Task 3: Real Renderer Scene, Mini-Map, And Ghost Route

**Files:**
- Modify: `basketball-golf-renderer.js`
- Replace temporary smoke file: `tools/test-basketball-golf-playwright.js`

- [ ] **Step 1: Replace the temporary Playwright smoke file with boot/render tests**

Replace `tools/test-basketball-golf-playwright.js` with a test adapted from the existing 3-point Playwright harness:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const PAGE = 'basketball-golf.html';
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

function isInsideRoot(target) {
  const relative = path.relative(ROOT, target);
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function safePath(urlPath) {
  const decoded = decodeURIComponent((urlPath || '/').split('?')[0]);
  const clean = decoded === '/' ? `/${PAGE}` : decoded;
  const target = path.resolve(ROOT, `.${clean}`);
  return isInsideRoot(target) ? target : null;
}

function serve(req, res) {
  const filePath = safePath(req.url);
  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
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

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function attachErrorCapture(page, label) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(`${label}: ${String(error?.stack || error?.message || error)}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${label}: ${message.text()}`);
  });
  return errors;
}

async function waitForGolfReady(page) {
  await page.waitForFunction(
    () => document.querySelector('#basketball-golf-app')?.dataset.golfStatus === 'ready',
    null,
    { timeout: 5000 }
  );
}

async function assertCanvasNotBlank(page) {
  const proof = await page.evaluate(() => {
    const canvas = document.querySelector('#golf-scene canvas');
    if (!canvas) return { hasCanvas: false };
    const sample = document.createElement('canvas');
    sample.width = Math.min(320, canvas.width);
    sample.height = Math.min(180, canvas.height);
    const ctx = sample.getContext('2d');
    ctx.drawImage(canvas, 0, 0, sample.width, sample.height);
    const data = ctx.getImageData(0, 0, sample.width, sample.height).data;
    let opaquePixels = 0;
    let colorPixels = 0;
    for (let index = 0; index < data.length; index += 4) {
      const alpha = data[index + 3];
      if (alpha > 20) opaquePixels += 1;
      if (Math.max(data[index], data[index + 1], data[index + 2]) - Math.min(data[index], data[index + 1], data[index + 2]) > 20) {
        colorPixels += 1;
      }
    }
    return { hasCanvas: true, width: canvas.width, height: canvas.height, opaquePixels, colorPixels };
  });
  assert.equal(proof.hasCanvas, true, `canvas should exist: ${JSON.stringify(proof)}`);
  assert.ok(proof.width > 600, `canvas should have a useful buffer width: ${JSON.stringify(proof)}`);
  assert.ok(proof.height > 350, `canvas should have a useful buffer height: ${JSON.stringify(proof)}`);
  assert.ok(proof.opaquePixels > 500, `canvas should contain rendered pixels: ${JSON.stringify(proof)}`);
  assert.ok(proof.colorPixels > 50, `canvas should contain colored scene pixels: ${JSON.stringify(proof)}`);
}

async function assertBootLayout(page) {
  await waitForGolfReady(page);
  const layout = await page.evaluate(() => {
    const app = document.querySelector('#basketball-golf-app');
    const miniMap = document.querySelector('#golf-mini-map');
    const cards = Array.from(document.querySelectorAll('#golf-shot-cards .golf-shot-card'));
    const meter = document.querySelector('#golf-meter')?.getBoundingClientRect();
    const aim = document.querySelector('.golf-zone.aim')?.getBoundingClientRect();
    const distance = document.querySelector('.golf-zone.distance')?.getBoundingClientRect();
    return {
      status: app?.dataset.golfStatus,
      sceneReady: app?.dataset.sceneReady,
      miniMapWidth: miniMap?.width || 0,
      miniMapHeight: miniMap?.height || 0,
      cardLabels: cards.map((card) => card.textContent.trim().replace(/\s+/g, ' ')),
      meterWidth: meter?.width || 0,
      aimLeft: meter && aim ? (aim.left - meter.left) / meter.width : -1,
      distanceLeft: meter && distance ? (distance.left - meter.left) / meter.width : -1
    };
  });
  assert.equal(layout.status, 'ready', `app should report ready: ${JSON.stringify(layout)}`);
  assert.equal(layout.sceneReady, 'true', `scene should report ready: ${JSON.stringify(layout)}`);
  assert.ok(layout.miniMapWidth >= 296, `mini-map should have backing resolution: ${JSON.stringify(layout)}`);
  assert.deepEqual(layout.cardLabels, ['Lob REC', 'Bounce', 'Bank', 'Spin'], `shot cards should render: ${JSON.stringify(layout)}`);
  assert.ok(layout.meterWidth > 400, `meter should be visible: ${JSON.stringify(layout)}`);
  assert.ok(layout.aimLeft < 0.18, `aim zone should be left: ${JSON.stringify(layout)}`);
  assert.ok(layout.distanceLeft > 0.82, `distance zone should be right: ${JSON.stringify(layout)}`);
  await assertCanvasNotBlank(page);
}

async function main() {
  const server = http.createServer(serve);
  const port = await listen(server);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = await attachErrorCapture(page, 'basketball-golf');
    await page.goto(`http://127.0.0.1:${port}/${PAGE}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await assertBootLayout(page);
    assert.deepEqual(errors, []);
    await page.close();
  } finally {
    await browser.close();
    await closeServer(server);
  }
}

main().then(() => {
  console.log('test-basketball-golf-playwright passed');
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
```

- [ ] **Step 2: Run Playwright test and verify it fails**

Run:

```powershell
node .\tools\test-basketball-golf-playwright.js
```

Expected: fails because shot cards are not populated or the scaffold canvas is blank/too small.

- [ ] **Step 3: Implement real renderer scene**

Replace `basketball-golf-renderer.js` with a focused Three.js renderer:

```js
import * as THREE from './assets/vendor/three/three.module.js';

(function initBasketballGolfRenderer(){
  function createMaterial(color, options = {}){
    return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.72, metalness: 0.05 }, options));
  }

  function createBasketballGolfRenderer(){
    let scene;
    let camera;
    let renderer;
    let mountEl;
    let frameId = 0;
    let ball;
    let ghostRoute;
    let activeShotPromise = null;

    const objects = {
      course: [],
      hoop: null,
      miniMapContext: null
    };

    function clearCourseObjects(){
      objects.course.forEach((object) => scene.remove(object));
      objects.course = [];
      if (ghostRoute) {
        scene.remove(ghostRoute);
        ghostRoute.geometry.dispose();
        ghostRoute.material.dispose();
        ghostRoute = null;
      }
    }

    function addCourseObject(object){
      objects.course.push(object);
      scene.add(object);
      return object;
    }

    function mount(target){
      if (renderer?.domElement && target?.contains(renderer.domElement)) return renderer.domElement;
      mountEl = target;
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x050914);
      camera = new THREE.PerspectiveCamera(58, 1, 0.1, 100);
      camera.position.set(0, 4.1, 9.8);
      camera.lookAt(0, 1.8, -2.4);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(target.clientWidth || 1280, target.clientHeight || 720, false);
      target.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0xdbeafe, 0x152033, 1.7));
      const key = new THREE.DirectionalLight(0xffffff, 2.4);
      key.position.set(-4, 8, 6);
      scene.add(key);

      const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 24), createMaterial(0xc99a4a));
      floor.rotation.x = -Math.PI / 2;
      floor.position.z = -1;
      scene.add(floor);

      ball = new THREE.Mesh(new THREE.SphereGeometry(0.34, 32, 18), createMaterial(0xd97724));
      scene.add(ball);

      function animate(){
        frameId = window.requestAnimationFrame(animate);
        if (renderer && scene && camera) renderer.render(scene, camera);
      }
      animate();
      return renderer.domElement;
    }

    function setHole(hole){
      if (!scene || !hole) return;
      clearCourseObjects();
      const lane = addCourseObject(new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.08, 14), createMaterial(0x15845e)));
      lane.position.set(0, 0.02, -1.2);
      const tee = hole.tee || { x: -4, y: 0, z: 4 };
      const hoop = hole.hoop || { x: 4, y: 3.05, z: -5 };
      ball.position.set(tee.x, 0.38, tee.z);

      const rim = addCourseObject(new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.045, 12, 48), createMaterial(0xf8fafc)));
      rim.position.set(hoop.x, hoop.y, hoop.z);
      rim.rotation.x = Math.PI / 2;
      objects.hoop = rim;

      const backboard = addCourseObject(new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.1, 0.08), createMaterial(0xdbeafe, { transparent: true, opacity: 0.72 })));
      backboard.position.set(hoop.x, hoop.y + 0.42, hoop.z - 0.42);

      (hole.obstacles || []).forEach((obstacle) => {
        if (obstacle.type === 'bank-wall') {
          const wall = addCourseObject(new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.36, 0.22), createMaterial(0xf8fafc)));
          wall.position.set(obstacle.x || 0, 0.3, obstacle.z || 0);
          wall.rotation.y = THREE.MathUtils.degToRad(obstacle.angle || 0);
        } else if (obstacle.type === 'bounce-pad') {
          const pad = addCourseObject(new THREE.Mesh(new THREE.CylinderGeometry(obstacle.radius || 1, obstacle.radius || 1, 0.08, 32), createMaterial(0x38bdf8)));
          pad.position.set(obstacle.x || 0, 0.09, obstacle.z || 0);
        }
      });
    }

    function setGhostRoute(route){
      if (!scene || !route) return;
      if (ghostRoute) scene.remove(ghostRoute);
      const points = route.points.map((point) => new THREE.Vector3(point.x, point.y, point.z));
      const curve = new THREE.CatmullRomCurve3(points);
      ghostRoute = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(40)),
        new THREE.LineBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.82 })
      );
      scene.add(ghostRoute);
    }

    function renderMiniMap(canvas, hole, route){
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#1b9a70';
      ctx.lineWidth = 8;
      ctx.strokeRect(24, 18, canvas.width - 48, canvas.height - 36);
      ctx.strokeStyle = '#f8fafc';
      ctx.setLineDash([10, 8]);
      ctx.beginPath();
      ctx.moveTo(58, canvas.height - 42);
      ctx.quadraticCurveTo(canvas.width * 0.52, 35, canvas.width - 58, 44);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#d97724';
      ctx.beginPath();
      ctx.arc(58, canvas.height - 42, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f8fafc';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(canvas.width - 58, 44, 13, 0, Math.PI * 2);
      ctx.stroke();
    }

    function renderShot(result){
      if (activeShotPromise) return activeShotPromise;
      activeShotPromise = new Promise((resolve) => {
        const start = performance.now();
        const startPosition = ball.position.clone();
        const end = objects.hoop ? objects.hoop.position.clone() : new THREE.Vector3(3.5, 3.05, -5);
        const duration = 720;
        function tick(now){
          const progress = Math.min(1, (now - start) / duration);
          const arc = Math.sin(progress * Math.PI) * (result?.trajectory?.peak || 1);
          ball.position.lerpVectors(startPosition, end, progress);
          ball.position.y = 0.38 + arc + progress * 1.4;
          if (progress < 1) {
            window.requestAnimationFrame(tick);
          } else {
            activeShotPromise = null;
            resolve();
          }
        }
        window.requestAnimationFrame(tick);
      });
      return activeShotPromise;
    }

    function dispose(){
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      if (renderer?.domElement?.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      renderer?.dispose?.();
      renderer = null;
      scene = null;
      camera = null;
    }

    return { mount, setHole, setGhostRoute, renderMiniMap, renderShot, dispose };
  }

  window.RosterBateBasketballGolfRenderer = { createBasketballGolfRenderer };
})();
```

- [ ] **Step 4: Run Playwright and verify remaining failures**

Run:

```powershell
node .\tools\test-basketball-golf-playwright.js
```

Expected: may still fail on shot cards until Task 4 populates them. The canvas should no longer be blank.

- [ ] **Step 5: Local checkpoint**

Run:

```powershell
git status --short -- basketball-golf-renderer.js tools/test-basketball-golf-playwright.js
```

Expected: local file changes only. Do not commit.

---

### Task 4: Browser Controller With Shot Cards, Aiming, Meter, And One Shot

**Files:**
- Modify: `basketball-golf.js`
- Modify: `tools/test-basketball-golf-playwright.js`

- [ ] **Step 1: Extend Playwright for shot-card interaction and one ideal shot**

Add this helper after `assertBootLayout(page)` in `tools/test-basketball-golf-playwright.js`:

```js
async function setCursorPosition(page, value) {
  await page.evaluate((position) => {
    window.RosterBateBasketballGolfPage?.setCursorPosition?.(position);
  }, value);
}

async function shootIdeal(page, shotCardId) {
  await page.evaluate((id) => {
    window.RosterBateBasketballGolfPage?.selectShotCard?.(id);
    window.RosterBateBasketballGolfPage?.setAimAngle?.(0);
  }, shotCardId);
  await setCursorPosition(page, 0.02);
  await page.keyboard.press('Space');
  await setCursorPosition(page, 0.925);
  await page.keyboard.press('Space');
  await setCursorPosition(page, 0.135);
  await page.keyboard.press('Space');
}

async function assertOneIdealShot(page) {
  await shootIdeal(page, 'lob');
  await page.waitForFunction(() => (window.RosterBateBasketballGolfPage?.run?.totalStrokes || 0) >= 1, null, { timeout: 5000 });
  const state = await page.evaluate(() => ({
    status: document.querySelector('#basketball-golf-app')?.dataset.golfStatus,
    strokes: Number(document.querySelector('#golf-strokes')?.textContent || '0'),
    phase: document.querySelector('#golf-phase')?.textContent,
    feedback: document.querySelector('#golf-feedback')?.textContent,
    currentHole: window.RosterBateBasketballGolfPage?.run?.currentHoleIndex,
    totalStrokes: window.RosterBateBasketballGolfPage?.run?.totalStrokes,
    selectedShot: window.RosterBateBasketballGolfPage?.selectedShotCardId
  }));
  assert.equal(state.status, 'ready', `app should remain ready after shot: ${JSON.stringify(state)}`);
  assert.equal(state.totalStrokes, 1, `one shot should resolve: ${JSON.stringify(state)}`);
  assert.equal(state.currentHole, 1, `ideal Lob should complete hole 1 and advance: ${JSON.stringify(state)}`);
  assert.equal(state.selectedShot, 'bank', `hole 2 should recommend/select Bank: ${JSON.stringify(state)}`);
  assert.match(state.feedback || '', /Swish|Made|Hole/i, `feedback should explain made shot: ${JSON.stringify(state)}`);
}
```

Call it in `main()` after `assertBootLayout(page)`:

```js
await assertOneIdealShot(page);
```

- [ ] **Step 2: Run Playwright and verify it fails**

Run:

```powershell
node .\tools\test-basketball-golf-playwright.js
```

Expected: fails because controller does not expose shot-card selection or shot flow yet.

- [ ] **Step 3: Implement browser controller**

Replace `basketball-golf.js` with:

```js
(function initBasketballGolfPage(){
  const app = document.getElementById('basketball-golf-app');
  const sceneMount = document.getElementById('golf-scene');
  const shotCardsEl = document.getElementById('golf-shot-cards');
  const miniMapEl = document.getElementById('golf-mini-map');
  const cursorEl = document.getElementById('golf-cursor');
  const fillEl = document.getElementById('golf-meter-fill');
  const holeTitleEl = document.getElementById('golf-hole-title');
  const strokesEl = document.getElementById('golf-strokes');
  const parEl = document.getElementById('golf-par');
  const progressEl = document.getElementById('golf-course-progress');
  const feedbackEl = document.getElementById('golf-feedback');
  const phaseEl = document.getElementById('golf-phase');
  const actionButton = document.getElementById('golf-action');
  const core = window.RosterBateBasketballGolfCore;
  const rendererApi = window.RosterBateBasketballGolfRenderer;
  if (!app || !sceneMount || !core || !rendererApi) return;

  const course = core.createDefaultCourse();
  const shotCards = core.createShotCards();
  let run = core.createCourseRun({ course, seed: 7 });
  let selectedShotCardId = 'lob';
  let aimAngle = 0;
  let meter = createMeter();
  let cursorPosition = 0;
  let cursorDirection = 1;
  let cursorHoldUntil = 0;
  let shotInFlight = false;
  let spaceKeyDown = false;
  const cursorStep = 0.008;

  const renderer = rendererApi.createBasketballGolfRenderer();
  renderer.mount(sceneMount);
  app.dataset.golfStatus = 'ready';
  app.dataset.sceneReady = 'true';

  function clampUnit(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.min(1, Math.max(0, num));
  }

  function hole() {
    return core.currentHole(run);
  }

  function createMeter() {
    return core.createMeterState({
      holeId: hole()?.id,
      shotNumber: (run.holeRuns?.[run.currentHoleIndex]?.strokes || 0) + 1
    });
  }

  function recommendedShotForHole(currentHole) {
    return currentHole?.recommendedShotTypes?.[0] || 'lob';
  }

  function phaseLabel() {
    if (run.completed) return 'Course complete';
    if (meter.phase === 'distance') return 'Distance';
    if (meter.phase === 'aim') return 'Aim';
    if (meter.phase === 'released') return 'Release';
    return 'Ready';
  }

  function routeForCurrentState() {
    const currentHole = hole();
    if (!currentHole) return { points: [] };
    const tee = currentHole.tee;
    const hoop = currentHole.hoop;
    const lateral = aimAngle / 12;
    const peak = selectedShotCardId === 'bounce' ? 1.1 : selectedShotCardId === 'lob' ? 3.2 : 2.2;
    return {
      points: [
        { x: tee.x, y: 0.45, z: tee.z },
        { x: (tee.x + hoop.x) / 2 + lateral, y: peak, z: (tee.z + hoop.z) / 2 },
        { x: hoop.x, y: hoop.y, z: hoop.z }
      ]
    };
  }

  function renderShotCards() {
    const currentHole = hole();
    const recommended = new Set(currentHole?.recommendedShotTypes || []);
    shotCardsEl.innerHTML = Object.keys(shotCards).map((id) => {
      const card = shotCards[id];
      return `<button class="golf-shot-card ${id === selectedShotCardId ? 'active' : ''} ${recommended.has(id) ? 'recommended' : ''}" type="button" data-shot-card="${id}">${card.label}</button>`;
    }).join('');
    Array.from(shotCardsEl.querySelectorAll('[data-shot-card]')).forEach((button) => {
      button.addEventListener('click', () => {
        selectShotCard(button.dataset.shotCard);
      });
    });
  }

  function syncCursor() {
    if (cursorEl) cursorEl.style.left = `${Math.round(cursorPosition * 1000) / 10}%`;
    if (fillEl) {
      const fillPosition = meter.phase === 'aim' || meter.phase === 'released' ? 1 : cursorPosition;
      fillEl.style.width = `${Math.round(fillPosition * 1000) / 10}%`;
    }
  }

  function setCursorPosition(value) {
    cursorPosition = clampUnit(value);
    cursorHoldUntil = performance.now() + 250;
    syncCursor();
  }

  function setAimAngle(value) {
    const num = Number(value);
    aimAngle = Number.isFinite(num) ? Math.min(45, Math.max(-45, num)) : 0;
    renderer.setGhostRoute(routeForCurrentState());
    renderer.renderMiniMap(miniMapEl, hole(), routeForCurrentState());
  }

  function selectShotCard(id) {
    selectedShotCardId = shotCards[id] ? id : recommendedShotForHole(hole());
    renderShotCards();
    renderer.setGhostRoute(routeForCurrentState());
    renderer.renderMiniMap(miniMapEl, hole(), routeForCurrentState());
  }

  function resetCursorForPhase(phase) {
    if (phase === 'distance') {
      cursorPosition = 0;
      cursorDirection = 1;
    } else if (phase === 'aim') {
      cursorPosition = 1;
      cursorDirection = -1;
    } else {
      cursorPosition = 0;
      cursorDirection = 1;
    }
    cursorHoldUntil = 0;
    syncCursor();
  }

  function updateHud() {
    const currentHole = hole();
    if (currentHole) {
      holeTitleEl.textContent = `Hole ${currentHole.number} - ${currentHole.label}`;
      parEl.textContent = `Par ${currentHole.par}`;
      progressEl.textContent = `${currentHole.number} / ${run.course.holes.length}`;
    }
    strokesEl.textContent = String(run.totalStrokes);
    phaseEl.textContent = phaseLabel();
    app.dataset.meterPhase = meter.phase || 'idle';
    renderShotCards();
    renderer.setHole(currentHole);
    renderer.setGhostRoute(routeForCurrentState());
    renderer.renderMiniMap(miniMapEl, currentHole, routeForCurrentState());
    syncCursor();
  }

  function animateCursor() {
    const activeMeter = meter.phase === 'distance' || meter.phase === 'aim';
    if (activeMeter && !shotInFlight && performance.now() >= cursorHoldUntil) {
      cursorPosition += cursorDirection * cursorStep;
      if (cursorPosition >= 1) {
        cursorPosition = 1;
        cursorDirection = -1;
      } else if (cursorPosition <= 0) {
        cursorPosition = 0;
        cursorDirection = 1;
      }
      syncCursor();
    }
    window.requestAnimationFrame(animateCursor);
  }

  async function resolveShot() {
    const currentHole = hole();
    if (!currentHole) return;
    shotInFlight = true;
    const shot = core.resolveShot({
      courseRun: run,
      hole: currentHole,
      input: Object.assign({}, meter.input, {
        shotCardId: selectedShotCardId,
        aimAngle
      })
    });
    feedbackEl.textContent = shot.feedback;
    await renderer.renderShot(shot);
    run = core.applyShotResult(run, shot);
    meter = createMeter();
    selectedShotCardId = recommendedShotForHole(hole());
    resetCursorForPhase('idle');
    if (run.completed) {
      app.dataset.golfStatus = 'complete';
      feedbackEl.textContent = `Course complete: ${run.totalStrokes}`;
    } else if (shot.made) {
      feedbackEl.textContent = `Hole complete - ${shot.feedback}`;
    }
    shotInFlight = false;
    updateHud();
    app.dataset.golfStatus = run.completed ? 'complete' : 'ready';
  }

  async function handlePress() {
    if (shotInFlight || run.completed) return;
    meter = core.pressMeter(meter, cursorPosition);
    if (meter.phase === 'distance') {
      feedbackEl.textContent = 'Distance';
      resetCursorForPhase('distance');
      updateHud();
      return;
    }
    if (meter.phase === 'aim') {
      feedbackEl.textContent = 'Aim';
      resetCursorForPhase('aim');
      updateHud();
      return;
    }
    if (meter.phase === 'released') await resolveShot();
  }

  window.addEventListener('keydown', (event) => {
    if (event.code === 'ArrowLeft') {
      event.preventDefault();
      setAimAngle(aimAngle - 3);
      return;
    }
    if (event.code === 'ArrowRight') {
      event.preventDefault();
      setAimAngle(aimAngle + 3);
      return;
    }
    if (event.code !== 'Space') return;
    event.preventDefault();
    if (event.repeat || spaceKeyDown) return;
    spaceKeyDown = true;
    handlePress();
  });
  window.addEventListener('keyup', (event) => {
    if (event.code === 'Space') spaceKeyDown = false;
  });
  window.addEventListener('blur', () => {
    spaceKeyDown = false;
  });
  actionButton.addEventListener('click', (event) => {
    if (event.detail === 0) return;
    handlePress();
  });

  updateHud();
  animateCursor();
  window.RosterBateBasketballGolfPage = {
    renderer,
    get run() { return run; },
    get meter() { return meter; },
    get selectedShotCardId() { return selectedShotCardId; },
    get aimAngle() { return aimAngle; },
    selectShotCard,
    setAimAngle,
    setCursorPosition,
    handlePress
  };
})();
```

- [ ] **Step 4: Run Playwright and verify one-shot flow passes**

Run:

```powershell
node .\tools\test-basketball-golf-playwright.js
```

Expected:

```text
test-basketball-golf-playwright passed
```

- [ ] **Step 5: Local checkpoint**

Run:

```powershell
git status --short -- basketball-golf.js tools/test-basketball-golf-playwright.js
```

Expected: local file changes only. Do not commit.

---

### Task 5: Three-Hole Completion And Stroke Cap Browser Coverage

**Files:**
- Modify: `basketball-golf.js`
- Modify: `tools/test-basketball-golf-playwright.js`

- [ ] **Step 1: Extend Playwright for three-hole completion**

Add this after `assertOneIdealShot(page)`:

```js
async function assertThreeHoleRunCompletion(page) {
  await shootIdeal(page, 'bank');
  await page.waitForFunction(() => (window.RosterBateBasketballGolfPage?.run?.currentHoleIndex || 0) >= 2, null, { timeout: 5000 });
  await shootIdeal(page, 'bounce');
  await page.waitForFunction(() => window.RosterBateBasketballGolfPage?.run?.completed === true, null, { timeout: 5000 });
  const state = await page.evaluate(() => ({
    status: document.querySelector('#basketball-golf-app')?.dataset.golfStatus,
    strokes: Number(document.querySelector('#golf-strokes')?.textContent || '0'),
    feedback: document.querySelector('#golf-feedback')?.textContent,
    completed: window.RosterBateBasketballGolfPage?.run?.completed,
    totalStrokes: window.RosterBateBasketballGolfPage?.run?.totalStrokes,
    holeRuns: window.RosterBateBasketballGolfPage?.run?.holeRuns?.map((holeRun) => ({
      strokes: holeRun.strokes,
      completed: holeRun.completed
    }))
  }));
  assert.equal(state.status, 'complete', `course should be complete: ${JSON.stringify(state)}`);
  assert.equal(state.completed, true, `run should be complete: ${JSON.stringify(state)}`);
  assert.equal(state.totalStrokes, 3, `three ideal holes should take three strokes: ${JSON.stringify(state)}`);
  assert.deepEqual(state.holeRuns, [
    { strokes: 1, completed: true },
    { strokes: 1, completed: true },
    { strokes: 1, completed: true }
  ]);
  assert.match(state.feedback || '', /course complete/i, `final feedback should mention course completion: ${JSON.stringify(state)}`);
}
```

Call it in `main()` after `assertOneIdealShot(page)`:

```js
await assertThreeHoleRunCompletion(page);
```

- [ ] **Step 2: Run Playwright and verify completion behavior**

Run:

```powershell
node .\tools\test-basketball-golf-playwright.js
```

Expected: passes only when final status and feedback clearly report course completion.

- [ ] **Step 3: Normalize controller completion feedback**

In `basketball-golf.js`, make the tail of `resolveShot()` set final status after `updateHud()`:

```js
shotInFlight = false;
updateHud();
if (run.completed) {
  app.dataset.golfStatus = 'complete';
  feedbackEl.textContent = `Course complete: ${run.totalStrokes}`;
} else {
  app.dataset.golfStatus = 'ready';
}
```

This keeps HUD updates from accidentally overwriting the final result.

- [ ] **Step 4: Run full basketball golf suite**

Run:

```powershell
npm.cmd run test:basketballgolf
```

Expected:

```text
test-basketball-golf-core passed
test-basketball-golf-shell passed
test-basketball-golf-playwright passed
```

- [ ] **Step 5: Local checkpoint**

Run:

```powershell
git status --short -- basketball-golf.js tools/test-basketball-golf-playwright.js
```

Expected: local file changes only. Do not commit.

---

### Task 6: Local Browser QA And Polish

**Files:**
- Inspect:
  - `basketball-golf.html`
  - `basketball-golf.js`
  - `basketball-golf-renderer.js`
  - `tools/test-basketball-golf-playwright.js`

- [ ] **Step 1: Start the local page**

Run:

```powershell
npm.cmd run basketballgolf:dev
```

Expected: local static page opens or prints a local URL for `basketball-golf.html`.

- [ ] **Step 2: Manual QA checklist**

In the local browser:

- Page loads directly into the game.
- The 3D scene is nonblank and framed behind the ball.
- The mini-map is visible and does not overlap the meter.
- Lob, Bounce, Bank, and Spin cards are visible.
- Recommended shot card is visually obvious per hole.
- Left/right arrow aiming visibly changes the ghost route.
- Space/click flow is understandable:
  - first press starts distance
  - second press locks distance near right end
  - third press locks aim near left window
- A made shot advances to the next hole.
- Completing hole 3 shows course-complete feedback.

- [ ] **Step 3: Apply fixed first-pass polish**

Apply these low-risk polish rules after the first browser pass:

```js
feedbackEl.textContent = `Hole ${currentHole.number} complete - ${shot.feedback}`;
```

```css
.golf-mini-map { right: 18px; bottom: 156px; }
```

```js
phaseEl.textContent = run.completed ? 'Course complete' : phaseLabel();
```

- [ ] **Step 4: Add mini-map overlap regression**

Add this assertion to `tools/test-basketball-golf-playwright.js` inside `assertBootLayout(page)`:

```js
const overlap = await page.evaluate(() => {
  const map = document.querySelector('#golf-mini-map').getBoundingClientRect();
  const controls = document.querySelector('.golf-controls').getBoundingClientRect();
  return map.bottom > controls.top && map.right > controls.left;
});
assert.equal(overlap, false, 'mini-map should not overlap controls');
```

- [ ] **Step 5: Final verification**

Run:

```powershell
npm.cmd run test:basketballgolf
git diff --check -- basketball-golf.html basketball-golf.js basketball-golf-core.js basketball-golf-renderer.js tools/test-basketball-golf-core.js tools/test-basketball-golf-shell.js tools/test-basketball-golf-playwright.js package.json
```

Expected:

```text
test-basketball-golf-core passed
test-basketball-golf-shell passed
test-basketball-golf-playwright passed
```

`git diff --check` should produce no output.

- [ ] **Step 6: Handoff summary**

Report:

- Files created/modified.
- Tests run.
- Local URL.
- Known follow-ups:
  - tune physics feel
  - add elite/combo shot inputs
  - add more holes
  - tie shot cards to player attributes

Do not commit unless the user explicitly asks.

---

## Self-Review

Spec coverage:

- Mini Golf Hoops: covered by new `basketball-golf` route and three-hole course tasks.
- Hybrid camera and mini-map: covered by renderer and browser boot tests.
- Full basketball arcs: covered by shot-card trajectory descriptors and renderer shot animation.
- Three-hole slice: covered by core tests and Playwright completion test.
- Aim route plus meter: covered by controller task and meter geometry tests.
- Shot cards first, combos later: covered by shot-card data model and out-of-scope combo note.
- Stroke cap: covered by pure core test.

No scaffold work remains past Task 3. Commit steps are intentionally replaced with local checkpoints per user preference.
