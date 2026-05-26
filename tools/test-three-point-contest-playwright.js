const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const PAGE = 'three-point-contest.html';
const DISTANCE_TARGET = 0.925;
const AIM_TARGET = 0.135;
const MAX_ACCEPTABLE_CURSOR_STEP = 0.01;
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
  page.on('pageerror', (error) => {
    errors.push(`${label}: ${String(error?.stack || error?.message || error)}`);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(`${label}: ${message.text()}`);
    }
  });
  return errors;
}

async function openContest(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(
    () => document.querySelector('#three-point-contest-app')?.dataset.contestStatus === 'ready',
    null,
    { timeout: 5000 }
  );
}

async function waitForContestReady(page) {
  await page.waitForFunction(
    () => document.querySelector('#three-point-contest-app')?.dataset.contestStatus === 'ready',
    null,
    { timeout: 5000 }
  );
}

async function assertCanvasNotBlank(page) {
  const proof = await page.evaluate(async () => {
    await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));

    const canvas = document.querySelector('#contest-scene canvas');
    if (!canvas) return { hasCanvas: false };

    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;

    const dataUrl = canvas.toDataURL('image/png');
    const blankDataUrl = blank.toDataURL('image/png');

    const image = new Image();
    const imageLoaded = new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });
    image.src = dataUrl;
    await imageLoaded;

    const probe = document.createElement('canvas');
    probe.width = Math.min(96, Math.max(1, canvas.width));
    probe.height = Math.min(96, Math.max(1, canvas.height));
    const context = probe.getContext('2d', { willReadFrequently: true });
    context.drawImage(image, 0, 0, probe.width, probe.height);

    const pixels = context.getImageData(0, 0, probe.width, probe.height).data;
    const buckets = new Set();
    let opaquePixels = 0;
    let lightPixels = 0;
    let colorPixels = 0;

    for (let index = 0; index < pixels.length; index += 4) {
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const alpha = pixels[index + 3];
      if (alpha > 12) opaquePixels += 1;
      if (alpha > 12 && red + green + blue > 90) lightPixels += 1;
      if (alpha > 12 && Math.max(red, green, blue) - Math.min(red, green, blue) > 15) colorPixels += 1;
      buckets.add(`${red >> 4},${green >> 4},${blue >> 4},${alpha >> 4}`);
    }

    return {
      hasCanvas: true,
      width: canvas.width,
      height: canvas.height,
      dataUrlLength: dataUrl.length,
      blankDataUrlLength: blankDataUrl.length,
      differsFromBlank: dataUrl !== blankDataUrl,
      opaquePixels,
      lightPixels,
      colorPixels,
      colorBuckets: buckets.size
    };
  });

  assert.equal(proof.hasCanvas, true, `canvas should exist for pixel proof: ${JSON.stringify(proof)}`);
  assert.ok(proof.differsFromBlank, `canvas PNG should differ from a blank same-size canvas: ${JSON.stringify(proof)}`);
  assert.ok(proof.opaquePixels > 500, `canvas should contain opaque rendered pixels: ${JSON.stringify(proof)}`);
  assert.ok(proof.lightPixels > 25, `canvas should contain non-dark scene pixels: ${JSON.stringify(proof)}`);
  assert.ok(proof.colorPixels > 25, `canvas should contain colored scene pixels: ${JSON.stringify(proof)}`);
  assert.ok(proof.colorBuckets > 4, `canvas should contain varied scene pixels: ${JSON.stringify(proof)}`);
}

async function assertDesktopScene(page) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
  await waitForContestReady(page);

  await page.locator('.contest-hud').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('#contest-action').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('#contest-meter').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('#contest-scene canvas').waitFor({ state: 'visible', timeout: 5000 });

  const layout = await page.evaluate(() => {
    const app = document.querySelector('#three-point-contest-app');
    const canvas = document.querySelector('#contest-scene canvas');
    const hud = document.querySelector('.contest-hud')?.getBoundingClientRect();
    const action = document.querySelector('#contest-action')?.getBoundingClientRect();
    const meter = document.querySelector('#contest-meter')?.getBoundingClientRect();
    const canvasRect = canvas?.getBoundingClientRect();
    return {
      status: app?.dataset.contestStatus || '',
      sceneReady: app?.dataset.sceneReady || '',
      scoreText: document.querySelector('#contest-score')?.textContent?.trim() || '',
      feedbackText: document.querySelector('#contest-feedback')?.textContent?.trim() || '',
      canvasCssWidth: canvasRect?.width || 0,
      canvasCssHeight: canvasRect?.height || 0,
      canvasBufferWidth: canvas?.width || 0,
      canvasBufferHeight: canvas?.height || 0,
      hudWidth: hud?.width || 0,
      hudHeight: hud?.height || 0,
      actionWidth: action?.width || 0,
      actionHeight: action?.height || 0,
      meterWidth: meter?.width || 0,
      meterHeight: meter?.height || 0
    };
  });
  assert.equal(layout.status, 'ready', `app should report ready: ${JSON.stringify(layout)}`);
  assert.equal(layout.sceneReady, 'true', `sceneReady should be true: ${JSON.stringify(layout)}`);
  assert.equal(layout.scoreText, '0', `score should remain zero: ${JSON.stringify(layout)}`);
  assert.match(layout.feedbackText, /Press Space/i, `feedback should prompt Space: ${JSON.stringify(layout)}`);
  assert.ok(layout.canvasCssWidth > 600, `desktop canvas should be wide: ${JSON.stringify(layout)}`);
  assert.ok(layout.canvasCssHeight > 400, `desktop canvas should be tall: ${JSON.stringify(layout)}`);
  assert.ok(layout.canvasBufferWidth > 600, `desktop canvas buffer should be wide: ${JSON.stringify(layout)}`);
  assert.ok(layout.canvasBufferHeight > 400, `desktop canvas buffer should be tall: ${JSON.stringify(layout)}`);
  assert.ok(layout.hudWidth > 0 && layout.hudHeight > 0, `HUD should have visible dimensions: ${JSON.stringify(layout)}`);
  assert.ok(layout.actionWidth > 0 && layout.actionHeight > 0, `action should have visible dimensions: ${JSON.stringify(layout)}`);
  assert.ok(layout.meterWidth > 0 && layout.meterHeight > 0, `meter should have visible dimensions: ${JSON.stringify(layout)}`);

  await assertCanvasNotBlank(page);
}

async function assertPangyaStyleMeter(page) {
  const layout = await page.evaluate(() => {
    const meter = document.querySelector('#contest-meter')?.getBoundingClientRect();
    const dial = document.querySelector('.contest-aim-dial')?.getBoundingClientRect();
    const aim = document.querySelector('.contest-zone.aim')?.getBoundingClientRect();
    const distance = document.querySelector('.contest-zone.distance')?.getBoundingClientRect();
    const cursor = document.querySelector('#contest-cursor')?.getBoundingClientRect();
    const fill = document.querySelector('#contest-fill')?.getBoundingClientRect();
    const aimBars = {
      left: document.querySelectorAll('.contest-zone.aim .contest-aim-bar.left').length,
      center: document.querySelectorAll('.contest-zone.aim .contest-aim-center').length,
      right: document.querySelectorAll('.contest-zone.aim .contest-aim-bar.right').length
    };
    const labels = Array.from(document.querySelectorAll('.contest-meter-labels span')).map((item) => item.textContent?.trim() || '');
    if (!meter || !dial || !aim || !distance || !cursor || !fill) return null;
    return {
      labels,
      aimBars,
      dialLeft: dial.left,
      meterLeft: meter.left,
      cursorLeft: (cursor.left - meter.left) / meter.width,
      aimLeft: (aim.left - meter.left) / meter.width,
      aimRight: (aim.right - meter.left) / meter.width,
      distanceLeft: (distance.left - meter.left) / meter.width,
      distanceRight: (distance.right - meter.left) / meter.width,
      fillHeight: fill.height,
      meterHeight: meter.height
    };
  });

  assert.ok(layout, 'Pangya-style meter parts should be present');
  assert.deepStrictEqual(layout.labels, ['Aim', 'Distance'], `meter labels should put aim left and distance right: ${JSON.stringify(layout)}`);
  assert.ok(layout.dialLeft < layout.meterLeft, `aim dial should sit to the left of the bar: ${JSON.stringify(layout)}`);
  assert.ok(layout.cursorLeft < 0.04, `idle cursor should wait at the left edge until Space starts the sweep: ${JSON.stringify(layout)}`);
  assert.ok(layout.aimLeft < 0.16, `aim window should live near the left side: ${JSON.stringify(layout)}`);
  assert.ok(layout.aimRight < 0.25, `aim window should end before the first quarter: ${JSON.stringify(layout)}`);
  assert.deepStrictEqual(layout.aimBars, { left: 1, center: 1, right: 1 }, `aim window should have left/right miss bars with a center-perfect mark: ${JSON.stringify(layout)}`);
  assert.ok(layout.distanceLeft > 0.82, `distance window should live near the end: ${JSON.stringify(layout)}`);
  assert.ok(layout.distanceRight > 0.92, `distance window should reach the end area: ${JSON.stringify(layout)}`);
  assert.ok(layout.aimRight < layout.distanceLeft, `aim and distance windows should be visually separated: ${JSON.stringify(layout)}`);
  assert.ok(layout.fillHeight > 0 && layout.fillHeight < layout.meterHeight, `fill should be inset inside the meter: ${JSON.stringify(layout)}`);
}

async function assertMeterPaceAndReturnDirection(page) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
  await waitForContestReady(page);

  const readyState = await page.evaluate(() => window.RosterBateThreePointPage?.getVisualMeterState?.());
  assert.ok(readyState, 'page should expose visual meter state for browser QA');
  assert.ok(readyState.cursorStep <= MAX_ACCEPTABLE_CURSOR_STEP, `cursor sweep should be slowed down for playable timing: ${JSON.stringify(readyState)}`);
  assert.equal(readyState.phase, 'idle', `fresh meter should start idle: ${JSON.stringify(readyState)}`);
  assert.equal(readyState.direction, 1, `fresh meter should be ready to move right: ${JSON.stringify(readyState)}`);
  assert.ok(readyState.cursorPosition < 0.04, `fresh cursor should wait at the left edge: ${JSON.stringify(readyState)}`);

  await setStartCursor(page);
  await page.keyboard.press('Space');
  const distanceState = await page.evaluate(() => window.RosterBateThreePointPage?.getVisualMeterState?.());
  assert.equal(distanceState.phase, 'distance', `first press should start the distance sweep: ${JSON.stringify(distanceState)}`);
  assert.equal(distanceState.direction, 1, `distance sweep should travel toward the right end: ${JSON.stringify(distanceState)}`);
  assert.ok(distanceState.cursorPosition < 0.04, `distance sweep should begin from the left edge: ${JSON.stringify(distanceState)}`);

  await setDistanceCursor(page);
  await page.keyboard.press('Space');
  const aimState = await page.evaluate(() => window.RosterBateThreePointPage?.getVisualMeterState?.());
  assert.equal(aimState.phase, 'aim', `second press should start the aim return: ${JSON.stringify(aimState)}`);
  assert.equal(aimState.direction, -1, `aim sweep should return from right to left: ${JSON.stringify(aimState)}`);
  assert.ok(aimState.cursorPosition > 0.96, `aim return should begin from the right edge: ${JSON.stringify(aimState)}`);
  assert.equal(aimState.targets.aim, AIM_TARGET, `center-perfect aim target should be in the left-side impact window: ${JSON.stringify(aimState)}`);
  assert.equal(aimState.targets.distance, DISTANCE_TARGET, `distance target should be at the far right: ${JSON.stringify(aimState)}`);
}

async function assertRendererLifecycle(page) {
  const lifecycle = await page.evaluate(async () => {
    const renderer = window.RosterBateThreePointPage?.renderer;
    const mount = document.getElementById('contest-scene');
    const bootCanvas = mount?.querySelector('canvas');
    if (!renderer || !mount || !bootCanvas) return { hasRenderer: !!renderer, hasMount: !!mount, hasBootCanvas: !!bootCanvas };

    const firstMountCanvas = renderer.mount(mount);
    const secondMountCanvas = renderer.mount(mount);
    const canvasCountAfterDuplicateMount = mount.querySelectorAll('canvas').length;
    const firstShot = renderer.renderShot({ made: true });
    const secondShot = renderer.renderShot({ made: false });
    const shotResult = await Promise.race([
      Promise.allSettled([firstShot, secondShot]),
      new Promise((resolve) => window.setTimeout(() => resolve('timeout'), 2200))
    ]);
    const inFlightShot = renderer.renderShot({ made: true });
    renderer.dispose();
    const disposeShotResult = await Promise.race([
      inFlightShot.then(() => 'fulfilled', () => 'rejected'),
      new Promise((resolve) => window.setTimeout(() => resolve('timeout'), 500))
    ]);
    const canvasCountAfterDispose = mount.querySelectorAll('canvas').length;
    const remountCanvas = renderer.mount(mount);

    return {
      hasRenderer: true,
      hasMount: true,
      hasBootCanvas: true,
      canvasCount: canvasCountAfterDuplicateMount,
      canvasCountAfterDispose,
      remountCanvasCount: mount.querySelectorAll('canvas').length,
      remountReturnedCanvasInMount: remountCanvas?.parentElement === mount,
      firstMountReturnedBootCanvas: firstMountCanvas === bootCanvas,
      secondMountReturnedBootCanvas: secondMountCanvas === bootCanvas,
      duplicateShotReturnedSamePromise: firstShot === secondShot,
      shotTimedOut: shotResult === 'timeout',
      shotStatuses: Array.isArray(shotResult) ? shotResult.map((result) => result.status) : [],
      disposeShotResult
    };
  });

  assert.equal(lifecycle.hasRenderer, true, `page should expose renderer: ${JSON.stringify(lifecycle)}`);
  assert.equal(lifecycle.hasMount, true, `scene mount should exist: ${JSON.stringify(lifecycle)}`);
  assert.equal(lifecycle.hasBootCanvas, true, `boot canvas should exist: ${JSON.stringify(lifecycle)}`);
  assert.equal(lifecycle.canvasCount, 1, `mounting twice should not append canvases: ${JSON.stringify(lifecycle)}`);
  assert.equal(lifecycle.firstMountReturnedBootCanvas, true, `first duplicate mount should return boot canvas: ${JSON.stringify(lifecycle)}`);
  assert.equal(lifecycle.secondMountReturnedBootCanvas, true, `second duplicate mount should return boot canvas: ${JSON.stringify(lifecycle)}`);
  assert.equal(lifecycle.duplicateShotReturnedSamePromise, true, `duplicate renderShot should reuse the in-flight promise: ${JSON.stringify(lifecycle)}`);
  assert.equal(lifecycle.shotTimedOut, false, `duplicate renderShot calls should resolve: ${JSON.stringify(lifecycle)}`);
  assert.deepStrictEqual(lifecycle.shotStatuses, ['fulfilled', 'fulfilled'], `duplicate renderShot calls should fulfill: ${JSON.stringify(lifecycle)}`);
  assert.equal(lifecycle.disposeShotResult, 'fulfilled', `dispose should settle an in-flight shot: ${JSON.stringify(lifecycle)}`);
  assert.equal(lifecycle.canvasCountAfterDispose, 0, `dispose should remove the mounted canvas: ${JSON.stringify(lifecycle)}`);
  assert.equal(lifecycle.remountCanvasCount, 1, `remount after dispose should append one canvas: ${JSON.stringify(lifecycle)}`);
  assert.equal(lifecycle.remountReturnedCanvasInMount, true, `remount should return a canvas in the scene mount: ${JSON.stringify(lifecycle)}`);
}

async function assertShortLandscapeControls(page) {
  await page.setViewportSize({ width: 568, height: 320 });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
  await waitForContestReady(page);

  const layout = await page.evaluate(() => {
    const app = document.querySelector('#three-point-contest-app');
    const meterWrap = document.querySelector('.contest-meter-wrap')?.getBoundingClientRect();
    const action = document.querySelector('#contest-action')?.getBoundingClientRect();
    const meter = document.querySelector('#contest-meter')?.getBoundingClientRect();
    return {
      status: app?.dataset.contestStatus || '',
      sceneReady: app?.dataset.sceneReady || '',
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
      meterWrapTop: meterWrap?.top || 0,
      meterWrapBottom: meterWrap?.bottom || 0,
      actionBottom: action?.bottom || 0,
      meterBottom: meter?.bottom || 0,
      actionWidth: action?.width || 0,
      meterWidth: meter?.width || 0
    };
  });
  assert.equal(layout.status, 'ready', `short landscape app should report ready: ${JSON.stringify(layout)}`);
  assert.equal(layout.sceneReady, 'true', `short landscape sceneReady should be true: ${JSON.stringify(layout)}`);
  assert.ok(layout.actionWidth > 0, `short landscape action should be visible: ${JSON.stringify(layout)}`);
  assert.ok(layout.meterWidth > 0, `short landscape meter should be visible: ${JSON.stringify(layout)}`);
  assert.ok(layout.meterWrapTop >= -1, `short landscape meter controls should not start above the viewport: ${JSON.stringify(layout)}`);
  assert.ok(layout.meterWrapBottom <= layout.viewportHeight + 1, `short landscape meter controls should not be clipped below the viewport: ${JSON.stringify(layout)}`);
  assert.ok(layout.actionBottom <= layout.viewportHeight + 1, `short landscape action should not be clipped below the viewport: ${JSON.stringify(layout)}`);
  assert.ok(layout.meterBottom <= layout.viewportHeight + 1, `short landscape meter should not be clipped below the viewport: ${JSON.stringify(layout)}`);
}

async function setCursorPosition(page, value) {
  await page.evaluate((position) => {
    window.RosterBateThreePointPage?.setCursorPosition?.(position);
  }, value);
}

async function setStartCursor(page) {
  await setCursorPosition(page, 0.02);
}

async function setDistanceCursor(page) {
  await setCursorPosition(page, DISTANCE_TARGET);
}

async function setAimCursor(page) {
  await setCursorPosition(page, AIM_TARGET);
}

async function shootIdealBall(page) {
  await setStartCursor(page);
  await page.keyboard.press('Space');
  await setDistanceCursor(page);
  await page.keyboard.press('Space');
  await setAimCursor(page);
  await page.keyboard.press('Space');
}

async function ballIndicatorState(page) {
  return page.evaluate(() => {
    const balls = Array.from(document.querySelectorAll('#contest-balls .contest-ball-dot'));
    return {
      exists: !!document.querySelector('#contest-balls'),
      count: balls.length,
      resolved: balls.filter((ball) => ball.classList.contains('made') || ball.classList.contains('missed')).length
    };
  });
}

async function assertFocusedActionSpaceSinglePress(page) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
  await waitForContestReady(page);
  await page.locator('#contest-action').focus();

  await shootIdealBall(page);

  await page.waitForFunction(() => (window.RosterBateThreePointPage?.run?.shots?.length || 0) >= 1, null, { timeout: 3000 });
  const state = await page.evaluate(() => ({
    activeElementId: document.activeElement?.id || '',
    status: document.querySelector('#three-point-contest-app')?.dataset.contestStatus,
    shots: window.RosterBateThreePointPage?.run?.shots?.length || 0,
    score: Number(document.querySelector('#contest-score')?.textContent || '0'),
    phase: document.querySelector('#contest-phase')?.textContent,
    balls: Array.from(document.querySelectorAll('#contest-balls .contest-ball-dot'))
      .filter((ball) => ball.classList.contains('made') || ball.classList.contains('missed')).length
  }));

  assert.equal(state.activeElementId, 'contest-action', `action button should be focused for regression: ${JSON.stringify(state)}`);
  assert.equal(state.status, 'ready', `focused Space presses should not complete the rack: ${JSON.stringify(state)}`);
  assert.equal(state.shots, 1, `three focused Space presses should resolve exactly one shot: ${JSON.stringify(state)}`);
  assert.equal(state.score > 0, true, `focused Space shot should score on ideal input: ${JSON.stringify(state)}`);
  assert.match(state.phase || '', /Ball 2|Next/i, `phase should advance to next ball: ${JSON.stringify(state)}`);
  assert.equal(state.balls, 1, `one ball indicator should resolve after focused Space shot: ${JSON.stringify(state)}`);
}

async function assertHeldSpaceDoesNotRepeat(page) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
  await waitForContestReady(page);
  await setStartCursor(page);

  await page.evaluate(() => {
    for (let index = 0; index < 8; index++) {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true }));
    }
  });

  const heldState = await page.evaluate(() => ({
    status: document.querySelector('#three-point-contest-app')?.dataset.contestStatus,
    shots: window.RosterBateThreePointPage?.run?.shots?.length || 0,
    phase: document.querySelector('#contest-phase')?.textContent,
    feedback: document.querySelector('#contest-feedback')?.textContent,
    balls: Array.from(document.querySelectorAll('#contest-balls .contest-ball-dot'))
      .filter((ball) => ball.classList.contains('made') || ball.classList.contains('missed')).length
  }));

  assert.equal(heldState.status, 'ready', `held Space should not complete the rack: ${JSON.stringify(heldState)}`);
  assert.equal(heldState.shots, 0, `held Space should count as one press, not release a shot: ${JSON.stringify(heldState)}`);
  assert.match(heldState.phase || '', /Distance/i, `held Space should stop after the first phase: ${JSON.stringify(heldState)}`);
  assert.match(heldState.feedback || '', /Distance/i, `held Space should show distance feedback: ${JSON.stringify(heldState)}`);
  assert.equal(heldState.balls, 0, `held Space should not resolve any ball: ${JSON.stringify(heldState)}`);

  await page.evaluate(() => {
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', key: ' ', bubbles: true }));
  });
}

async function assertOneShotInputFlow(page) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
  await waitForContestReady(page);

  const initialBalls = await ballIndicatorState(page);
  assert.equal(initialBalls.exists, true, `ball indicators should exist: ${JSON.stringify(initialBalls)}`);
  assert.equal(initialBalls.count, 5, `rack should render five ball indicators: ${JSON.stringify(initialBalls)}`);
  assert.equal(initialBalls.resolved, 0, `fresh rack should not mark any ball results: ${JSON.stringify(initialBalls)}`);

  await setStartCursor(page);
  await page.keyboard.press('Space');
  await page.waitForFunction(
    () => document.querySelector('#contest-phase')?.textContent.includes('Distance'),
    null,
    { timeout: 3000 }
  );

  await setDistanceCursor(page);
  await page.keyboard.press('Space');
  await page.waitForFunction(
    () => document.querySelector('#contest-phase')?.textContent.includes('Aim'),
    null,
    { timeout: 3000 }
  );

  await setAimCursor(page);
  await page.keyboard.press('Space');
  await page.waitForFunction(
    () => Number(document.querySelector('#contest-score')?.textContent || '0') >= 1,
    null,
    { timeout: 3000 }
  );

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

  const oneShotBalls = await ballIndicatorState(page);
  assert.equal(oneShotBalls.count, 5, `rack should still render five ball indicators after one shot: ${JSON.stringify(oneShotBalls)}`);
  assert.equal(oneShotBalls.resolved, 1, `one ball indicator should show a result after one shot: ${JSON.stringify(oneShotBalls)}`);

  for (let shot = 1; shot < 5; shot++) {
    const expectedShots = shot + 1;
    await shootIdealBall(page);
    await page.waitForFunction(
      (shots) => (window.RosterBateThreePointPage?.run?.shots?.length || 0) >= shots,
      expectedShots,
      { timeout: 3000 }
    );
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

  const finalBalls = await ballIndicatorState(page);
  assert.equal(finalBalls.count, 5, `completed rack should still render five ball indicators: ${JSON.stringify(finalBalls)}`);
  assert.equal(finalBalls.resolved, 5, `all ball indicators should show results after rack completion: ${JSON.stringify(finalBalls)}`);

  await shootIdealBall(page);
  await page.waitForTimeout(250);

  const lockedState = await page.evaluate(() => ({
    status: document.querySelector('#three-point-contest-app')?.dataset.contestStatus,
    shots: window.RosterBateThreePointPage?.run?.shots?.length,
    score: Number(document.querySelector('#contest-score')?.textContent || '0')
  }));
  assert.equal(lockedState.status, 'complete');
  assert.equal(lockedState.shots, finalState.shots);
  assert.equal(lockedState.score, finalState.score);
}

async function main() {
  const server = http.createServer(serve);
  const port = await listen(server);
  const url = `http://127.0.0.1:${port}/${PAGE}`;
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = await attachErrorCapture(page, 'three-point-contest');
    await openContest(page, url);
    await assertDesktopScene(page);
    await assertPangyaStyleMeter(page);
    await assertMeterPaceAndReturnDirection(page);
    await assertRendererLifecycle(page);
    await assertFocusedActionSpaceSinglePress(page);
    await assertHeldSpaceDoesNotRepeat(page);
    await assertOneShotInputFlow(page);
    await assertShortLandscapeControls(page);
    assert.deepStrictEqual(errors, []);
    await page.close();
  } finally {
    await browser.close();
    await closeServer(server);
  }
  console.log('three-point contest Playwright smoke passed');
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
