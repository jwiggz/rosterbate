# Basketball Golf Course System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the standalone Basketball Golf prototype's basketball-court renderer with a data-driven mini-golf course system while preserving the rim/backboard target and bottom timing meter.

**Architecture:** Add a focused course config file that owns hole geometry and mini-golf course pieces. The core normalizes those pieces for tests and gameplay, the renderer draws pieces instead of court paint/lines, and the page continues to orchestrate meter, shot cards, route preview, and hole advancement.

**Tech Stack:** Plain JavaScript, browser globals, Node CommonJS tests, Three.js module renderer, Playwright browser QA.

---

## File Structure

- Create `basketball-golf-courses.js`
  - Owns the default three-hole course.
  - Exports via CommonJS for Node tests and `window.RosterBateBasketballGolfCourses` for the browser.
  - Defines mini-golf course `pieces` such as `lane`, `rail`, `bank-wall`, `ramp`, `bounce-pad`, and `hazard`.
- Modify `basketball-golf-core.js`
  - Reads the course factory from `basketball-golf-courses.js`.
  - Normalizes each hole's `pieces`, `camera`, `theme`, and legacy `obstacles`.
  - Keeps deterministic shot resolution unchanged except for using richer hole data.
- Modify `basketball-golf-renderer.js`
  - Removes court paint, lane rectangle, and arc drawing.
  - Draws course pieces from hole config.
  - Keeps real rim/backboard/stanchion.
  - Uses per-hole camera framing when present.
  - Updates mini-map to show lane geometry instead of a generic court rectangle.
- Modify `basketball-golf.html`
  - Loads `basketball-golf-courses.js` before the core script.
  - Renames court-facing labels/variables to course language where visible/semantic.
- Modify `basketball-golf.js`
  - Keeps meter and shot flow.
  - Updates route shaping to use configured route hints when available.
- Modify `tools/test-basketball-golf-core.js`
  - Adds assertions for course pieces and normalization.
- Modify `tools/test-basketball-golf-playwright.js`
  - Adds browser assertions that court markings are absent and course pieces/rim are present.

No commits during implementation; the user requested local-dev work without token-costly checkpoint commits.

---

### Task 1: Add Data-Driven Course Config

**Files:**
- Create: `basketball-golf-courses.js`
- Modify: `basketball-golf.html`
- Test: `tools/test-basketball-golf-core.js`

- [ ] **Step 1: Write failing core expectations for course pieces**

Add assertions after `const course = core.createDefaultCourse();` in `tools/test-basketball-golf-core.js`:

```js
assert.equal(course.holes[0].theme.surface, 'starter-turf');
assert.ok(course.holes[0].pieces.some((piece) => piece.type === 'lane'), 'hole 1 should define a lane piece');
assert.ok(course.holes[0].pieces.some((piece) => piece.type === 'rail'), 'hole 1 should define side rails');
assert.ok(course.holes[1].pieces.some((piece) => piece.type === 'bank-wall'), 'hole 2 should define a bank wall');
assert.ok(course.holes[2].pieces.some((piece) => piece.type === 'ramp'), 'hole 3 should define a ramp');
assert.ok(course.holes[2].pieces.some((piece) => piece.type === 'bounce-pad'), 'hole 3 should define a bounce pad');
assert.deepEqual(course.holes.map((hole) => hole.camera.mode), ['lane', 'bank', 'ramp']);
```

- [ ] **Step 2: Run the core test and verify it fails**

Run:

```powershell
npm.cmd run test:basketballgolf-core
```

Expected: FAIL because `theme`, `pieces`, and `camera` are not present on the default course yet.

- [ ] **Step 3: Create the course config file**

Create `basketball-golf-courses.js` with this shape:

```js
(function(root, factory){
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RosterBateBasketballGolfCourses = factory();
  }
})(typeof self !== 'undefined' ? self : this, function(){
  'use strict';

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  const DEFAULT_COURSE = Object.freeze({
    id: 'rosterbate-hoop-links-3',
    title: 'RosterBate Hoop Links',
    strokeCap: 8,
    holes: [
      {
        id: 'starter-lane',
        number: 1,
        label: 'Starter Lane',
        par: 2,
        theme: { surface: 'starter-turf', accent: '#f3b35a' },
        camera: { mode: 'lane', position: { x: 0.1, y: 4.1, z: 10.6 }, target: { x: 0.15, y: 1.2, z: -2.4 } },
        tee: { x: -3.8, y: 0, z: 4.6 },
        hoop: { x: 3.4, y: 3.05, z: -5.1 },
        pieces: [
          { id: 'starter-lane-main', type: 'lane', x: 0, z: -0.4, width: 7.8, length: 14.6, color: '#2f8d52' },
          { id: 'starter-left-rail', type: 'rail', x: -4.1, z: -0.4, width: 0.28, length: 14.9, height: 0.42 },
          { id: 'starter-right-rail', type: 'rail', x: 4.1, z: -0.4, width: 0.28, length: 14.9, height: 0.42 }
        ],
        recommendedShotTypes: ['lob']
      },
      {
        id: 'bank-lane',
        number: 2,
        label: 'Bank Lane',
        par: 3,
        theme: { surface: 'night-turf', accent: '#60a5fa' },
        camera: { mode: 'bank', position: { x: -0.4, y: 4.4, z: 11.2 }, target: { x: 0.4, y: 1.15, z: -2.2 } },
        tee: { x: -4.6, y: 0, z: 4.7 },
        hoop: { x: 4.1, y: 3.05, z: -5.0 },
        pieces: [
          { id: 'bank-lane-main', type: 'lane', x: -0.2, z: -0.3, width: 8.2, length: 14.8, color: '#234f3d' },
          { id: 'bank-left-rail', type: 'rail', x: -4.4, z: -0.3, width: 0.3, length: 14.9, height: 0.46 },
          { id: 'bank-right-rail', type: 'rail', x: 4.35, z: -0.3, width: 0.3, length: 14.9, height: 0.46 },
          { id: 'bank-wall', type: 'bank-wall', x: 1.4, z: -1.7, width: 3.3, height: 0.78, angle: -28 }
        ],
        recommendedShotTypes: ['bank', 'lob']
      },
      {
        id: 'ramp-bounce-lane',
        number: 3,
        label: 'Ramp And Bounce',
        par: 3,
        theme: { surface: 'sunset-turf', accent: '#38bdf8' },
        camera: { mode: 'ramp', position: { x: -0.2, y: 4.7, z: 11.8 }, target: { x: 0.2, y: 1.2, z: -2.0 } },
        tee: { x: -4.2, y: 0, z: 4.5 },
        hoop: { x: 3.8, y: 3.05, z: -5.2 },
        pieces: [
          { id: 'ramp-lane-main', type: 'lane', x: -0.1, z: -0.2, width: 7.9, length: 14.7, color: '#386641' },
          { id: 'ramp-left-rail', type: 'rail', x: -4.25, z: -0.2, width: 0.3, length: 14.8, height: 0.42 },
          { id: 'ramp-right-rail', type: 'rail', x: 4.05, z: -0.2, width: 0.3, length: 14.8, height: 0.42 },
          { id: 'center-ramp', type: 'ramp', x: -0.5, z: -1.35, width: 2.8, length: 3.2, height: 0.42, angle: 0 },
          { id: 'bounce-pad', type: 'bounce-pad', x: 1.1, z: -2.75, radius: 0.95 },
          { id: 'right-gap', type: 'hazard', x: 2.9, z: 0.7, width: 1.05, length: 2.2 }
        ],
        recommendedShotTypes: ['bounce', 'spin', 'lob']
      }
    ]
  });

  function createDefaultCourse(){
    return clone(DEFAULT_COURSE);
  }

  return { createDefaultCourse };
});
```

- [ ] **Step 4: Load the config before the core**

In `basketball-golf.html`, add:

```html
<script src="basketball-golf-courses.js" defer></script>
<script src="basketball-golf-core.js" defer></script>
```

Expected: `basketball-golf-courses.js` appears before `basketball-golf-core.js`.

- [ ] **Step 5: Wire the core to the config**

In `basketball-golf-core.js`, add an internal course catalog lookup:

```js
  function getCourseCatalog(){
    if (typeof module === 'object' && module.exports && typeof require === 'function') {
      try {
        return require('./basketball-golf-courses');
      } catch (_error) {
        return null;
      }
    }
    return (typeof globalThis !== 'undefined' && globalThis.RosterBateBasketballGolfCourses) || null;
  }
```

Then change `createDefaultCourse()` to prefer the external config:

```js
  function createDefaultCourse(){
    const catalog = getCourseCatalog();
    if (catalog?.createDefaultCourse) return catalog.createDefaultCourse();
    return fallbackCourseObject;
  }
```

Use the current inline course as `fallbackCourseObject` so the core still works if the config is not loaded.

- [ ] **Step 6: Run the core test and verify it passes**

Run:

```powershell
npm.cmd run test:basketballgolf-core
```

Expected: PASS.

---

### Task 2: Normalize Course Geometry In Core

**Files:**
- Modify: `basketball-golf-core.js`
- Test: `tools/test-basketball-golf-core.js`

- [ ] **Step 1: Write failing normalization assertions**

Add a custom course assertion in `tools/test-basketball-golf-core.js`:

```js
const customRun = core.createCourseRun({
  course: {
    id: 'custom-course',
    holes: [{
      id: 'custom-hole',
      pieces: [{ type: 'lane', width: '5', length: '9' }],
      camera: { mode: 'custom', position: { x: '1', y: '2', z: '3' } }
    }]
  }
});
const customHole = core.currentHole(customRun);
assert.equal(customHole.pieces[0].type, 'lane');
assert.equal(customHole.pieces[0].width, 5);
assert.equal(customHole.pieces[0].length, 9);
assert.equal(customHole.camera.mode, 'custom');
assert.equal(customHole.camera.position.x, 1);
assert.equal(customHole.theme.surface, 'turf');
```

- [ ] **Step 2: Run the core test and verify it fails**

Run:

```powershell
npm.cmd run test:basketballgolf-core
```

Expected: FAIL because `normalizeCourse()` does not normalize `pieces`, `camera`, or `theme`.

- [ ] **Step 3: Add focused normalizers**

Add helpers in `basketball-golf-core.js`:

```js
  function normalizePoint(point, fallback){
    const source = point || {};
    const base = fallback || {};
    return {
      x: Number.isFinite(Number(source.x)) ? Number(source.x) : Number(base.x || 0),
      y: Number.isFinite(Number(source.y)) ? Number(source.y) : Number(base.y || 0),
      z: Number.isFinite(Number(source.z)) ? Number(source.z) : Number(base.z || 0)
    };
  }

  function normalizePiece(piece, index){
    const source = piece && typeof piece === 'object' ? piece : {};
    return Object.assign({}, source, {
      id: String(source.id || `piece-${index + 1}`),
      type: String(source.type || 'lane'),
      x: Number.isFinite(Number(source.x)) ? Number(source.x) : 0,
      z: Number.isFinite(Number(source.z)) ? Number(source.z) : 0,
      width: Number.isFinite(Number(source.width)) ? Number(source.width) : 1,
      length: Number.isFinite(Number(source.length)) ? Number(source.length) : 1,
      height: Number.isFinite(Number(source.height)) ? Number(source.height) : 0.2,
      angle: Number.isFinite(Number(source.angle)) ? Number(source.angle) : 0,
      radius: Number.isFinite(Number(source.radius)) ? Number(source.radius) : undefined
    });
  }

  function normalizeCamera(camera){
    const source = camera && typeof camera === 'object' ? camera : {};
    return {
      mode: String(source.mode || 'lane'),
      position: normalizePoint(source.position, { x: 0.4, y: 4.35, z: 10.2 }),
      target: normalizePoint(source.target, { x: 0.2, y: 1.25, z: -2.4 })
    };
  }
```

Update `normalizeCourse()` so each hole includes:

```js
theme: Object.assign({ surface: 'turf', accent: '#f3b35a' }, hole.theme || {}),
camera: normalizeCamera(hole.camera),
pieces: Array.isArray(hole.pieces) ? hole.pieces.map(normalizePiece) : [],
```

- [ ] **Step 4: Run the core test and verify it passes**

Run:

```powershell
npm.cmd run test:basketballgolf-core
```

Expected: PASS.

---

### Task 3: Render Mini-Golf Course Pieces

**Files:**
- Modify: `basketball-golf-renderer.js`
- Test: `tools/test-basketball-golf-playwright.js`

- [ ] **Step 1: Write failing browser assertions for course rendering**

Add to `assertBootLayout(page)` after the meter assertions:

```js
const courseProof = await page.evaluate(() => {
  const debug = window.RosterBateBasketballGolfPage?.renderer?.debugState?.();
  return {
    coursePieceCount: debug?.coursePieceCount || 0,
    courtLineCount: debug?.courtLineCount || 0,
    hasRim: !!debug?.hasRim,
    hasBackboard: !!debug?.hasBackboard
  };
});
assert.ok(courseProof.coursePieceCount >= 3, `course pieces should render: ${JSON.stringify(courseProof)}`);
assert.equal(courseProof.courtLineCount, 0, `court markings should not render: ${JSON.stringify(courseProof)}`);
assert.equal(courseProof.hasRim, true, `rim should still render: ${JSON.stringify(courseProof)}`);
assert.equal(courseProof.hasBackboard, true, `backboard should still render: ${JSON.stringify(courseProof)}`);
```

- [ ] **Step 2: Run the Playwright test and verify it fails**

Run:

```powershell
npm.cmd run test:basketballgolf
```

Expected: FAIL because `debugState()` and course piece rendering are not implemented.

- [ ] **Step 3: Remove court-specific drawing**

In `basketball-golf-renderer.js`:

- Delete `addCourtLines()`.
- Delete the `paint` mesh in `setHole()`.
- Do not add lane rectangle or arc lines.

Expected: no call to `addCourtLines()` remains.

- [ ] **Step 4: Add course piece rendering**

Add `coursePieceCount`, `courtLineCount`, `hasRim`, and `hasBackboard` variables near renderer state:

```js
    let coursePieceCount = 0;
    let courtLineCount = 0;
    let hasRim = false;
    let hasBackboard = false;
```

Add helpers:

```js
    function addBoxPiece(piece, color, options = {}){
      const mesh = add(new THREE.Mesh(
        new THREE.BoxGeometry(Number(piece.width) || 1, Number(piece.height) || 0.18, Number(piece.length) || 1),
        material(color, options)
      ));
      mesh.position.set(Number(piece.x) || 0, Number(piece.height || 0.18) / 2, Number(piece.z) || 0);
      mesh.rotation.y = THREE.MathUtils.degToRad(Number(piece.angle) || 0);
      coursePieceCount += 1;
      return mesh;
    }

    function addCoursePiece(piece){
      if (!piece || !piece.type) return;
      if (piece.type === 'lane') {
        addBoxPiece(piece, Number.parseInt(String(piece.color || '#2f8d52').replace('#', ''), 16) || 0x2f8d52, { roughness: 0.88 });
        return;
      }
      if (piece.type === 'rail') {
        addBoxPiece(piece, 0xf3b35a, { roughness: 0.48, emissive: 0x1a0d02 });
        return;
      }
      if (piece.type === 'bank-wall') {
        addObstacle(piece);
        coursePieceCount += 1;
        return;
      }
      if (piece.type === 'ramp') {
        const ramp = addBoxPiece(piece, 0x8bbf5a, { roughness: 0.72 });
        ramp.rotation.x = THREE.MathUtils.degToRad(-10);
        return;
      }
      if (piece.type === 'bounce-pad') {
        addObstacle(piece);
        coursePieceCount += 1;
        return;
      }
      if (piece.type === 'hazard') {
        addBoxPiece(piece, 0x0b1020, { roughness: 0.9, emissive: 0x020512 });
      }
    }
```

Update `setHole()`:

```js
      coursePieceCount = 0;
      courtLineCount = 0;
      hasRim = false;
      hasBackboard = false;
      applyCamera(currentHole.camera);
      (currentHole.pieces || []).forEach(addCoursePiece);
      addHoop(currentHole.hoop);
```

- [ ] **Step 5: Track rim/backboard and expose debug state**

Inside `addHoop()`, set:

```js
      hasBackboard = true;
      ...
      hasRim = true;
```

Add to the returned renderer object:

```js
debugState(){
  return { coursePieceCount, courtLineCount, hasRim, hasBackboard };
}
```

- [ ] **Step 6: Run Playwright and verify it passes**

Run:

```powershell
npm.cmd run test:basketballgolf
```

Expected: PASS.

---

### Task 4: Update Camera, Route, And Mini-Map For Course Feel

**Files:**
- Modify: `basketball-golf-renderer.js`
- Modify: `basketball-golf.js`
- Test: `tools/test-basketball-golf-playwright.js`

- [ ] **Step 1: Write failing mini-map/course route assertions**

Add to the Playwright state in `assertBootLayout(page)`:

```js
const routeProof = await page.evaluate(() => {
  const route = window.RosterBateBasketballGolfPage?.currentRoute?.();
  const hole = window.RosterBateBasketballGolfPage?.run?.course?.holes?.[0];
  return {
    routePoints: route?.points?.length || 0,
    holeCameraMode: hole?.camera?.mode || '',
    miniMapLabel: document.querySelector('#golf-mini-map')?.getAttribute('aria-label') || ''
  };
});
assert.ok(routeProof.routePoints >= 3, `route should expose a preview path: ${JSON.stringify(routeProof)}`);
assert.equal(routeProof.holeCameraMode, 'lane', `hole camera mode should be configured: ${JSON.stringify(routeProof)}`);
assert.match(routeProof.miniMapLabel, /course/i, `mini-map should use course language: ${JSON.stringify(routeProof)}`);
```

- [ ] **Step 2: Run Playwright and verify it fails**

Run:

```powershell
npm.cmd run test:basketballgolf
```

Expected: FAIL because `currentRoute()` is not exposed and the mini-map label still says "Hole mini map".

- [ ] **Step 3: Add per-hole camera application**

In `basketball-golf-renderer.js`, add:

```js
    function applyCamera(cameraConfig){
      if (!camera || !cameraConfig) return;
      const position = toVector3(cameraConfig.position, { x: 0.4, y: 4.35, z: 10.2 });
      const target = toVector3(cameraConfig.target, { x: 0.2, y: 1.25, z: -2.4 });
      camera.position.copy(position);
      camera.lookAt(target);
      camera.updateProjectionMatrix();
    }
```

Call `applyCamera(currentHole.camera);` in `setHole()` before drawing pieces.

- [ ] **Step 4: Update route API and page exposure**

In `basketball-golf.js`, track last route:

```js
  let lastRoute = { points: [] };
```

Update `renderRoute()`:

```js
    lastRoute = route;
    renderer.setGhostRoute(route);
    renderer.renderMiniMap(miniMap, hole, route);
```

Expose it:

```js
currentRoute(){
  return lastRoute;
}
```

- [ ] **Step 5: Update mini-map language**

In `basketball-golf.html`, change:

```html
<canvas id="golf-mini-map" class="golf-mini-map" width="340" height="232" aria-label="Course mini map"></canvas>
```

- [ ] **Step 6: Run Playwright and verify it passes**

Run:

```powershell
npm.cmd run test:basketballgolf
```

Expected: PASS.

---

### Task 5: Final Local QA And Cleanup

**Files:**
- All Basketball Golf files touched above

- [ ] **Step 1: Run full focused test suite**

Run:

```powershell
npm.cmd run test:basketballgolf
```

Expected: PASS.

- [ ] **Step 2: Run whitespace check**

Run:

```powershell
git diff --check -- basketball-golf.html basketball-golf.js basketball-golf-core.js basketball-golf-renderer.js basketball-golf-courses.js tools/test-basketball-golf-core.js tools/test-basketball-golf-playwright.js docs/superpowers/specs/2026-05-02-basketball-golf-course-system-design.md docs/superpowers/plans/2026-05-02-basketball-golf-course-system.md
```

Expected: no output.

- [ ] **Step 3: Local browser QA**

Open or reload:

```text
http://127.0.0.1:8080/basketball-golf.html
```

Expected visual result:

- first screen reads as a mini-golf lane
- no paint rectangle
- no three-point arc
- no basketball lane lines
- real rim and backboard remain visible
- bottom meter still works
- ideal shot advances to hole 2
- course map does not overlap controls

- [ ] **Step 4: Summarize local-only changes**

Report:

- files changed
- tests run
- browser QA result
- no commit made

---

## Self-Review

Spec coverage:

- Rim/backboard preserved: Task 3.
- Court paint and markings removed: Task 3.
- Data-driven course layer: Task 1 and Task 2.
- Three mini-golf holes: Task 1.
- Bottom meter preserved: Task 3 and existing Playwright checks.
- Browser QA: Task 5.

Placeholder scan:

- No TODO/TBD placeholders.
- No vague implementation steps.
- Each implementation step names exact files, commands, and expected results.

Type consistency:

- `pieces`, `camera`, `theme`, `debugState()`, and `currentRoute()` are introduced before tests depend on them.
- Course IDs intentionally change to `starter-lane`, `bank-lane`, and `ramp-bounce-lane`; tests should be updated where old IDs were asserted.
