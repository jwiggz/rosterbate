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
  let decoded;
  try {
    decoded = decodeURIComponent((urlPath || '/').split('?')[0]);
  } catch (_error) {
    return null;
  }
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

  const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
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

function attachErrorCapture(page, label) {
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

async function waitForGolfReady(page) {
  await page.waitForFunction(
    () => document.querySelector('#basketball-golf-app')?.dataset.golfStatus === 'ready',
    null,
    { timeout: 5000 }
  );
}

async function setCursorPosition(page, value) {
  await page.evaluate((position) => {
    window.RosterBateBasketballGolfPage.setCursorPosition(position);
  }, value);
}

async function shootIdeal(page, shotCardId) {
  await page.evaluate((id) => {
    window.RosterBateBasketballGolfPage.selectShotCard(id);
    window.RosterBateBasketballGolfPage.setAimAngle(0);
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
  await page.waitForFunction(
    () => window.RosterBateBasketballGolfPage?.run?.totalStrokes >= 1,
    null,
    { timeout: 5000 }
  );

  const state = await page.evaluate(() => {
    const app = document.querySelector('#basketball-golf-app');
    return {
      status: app?.dataset.golfStatus || '',
      totalStrokes: window.RosterBateBasketballGolfPage.run.totalStrokes,
      currentHoleIndex: window.RosterBateBasketballGolfPage.run.currentHoleIndex,
      selectedShotCardId: window.RosterBateBasketballGolfPage.selectedShotCardId,
      feedback: document.querySelector('#golf-feedback')?.textContent || ''
    };
  });

  assert.equal(state.status, 'ready', `app should remain ready after one shot: ${JSON.stringify(state)}`);
  assert.equal(state.totalStrokes, 1, `one ideal shot should count one stroke: ${JSON.stringify(state)}`);
  assert.equal(state.currentHoleIndex, 1, `ideal Lob should advance to hole 2: ${JSON.stringify(state)}`);
  assert.equal(state.selectedShotCardId, 'bank', `hole 2 should recommend Bank: ${JSON.stringify(state)}`);
  assert.match(state.feedback, /Swish|Made|Hole/i, `feedback should explain the made shot: ${JSON.stringify(state)}`);
}

async function assertThreeHoleRunCompletion(page) {
  await shootIdeal(page, 'bank');
  await page.waitForFunction(
    () => window.RosterBateBasketballGolfPage?.run?.currentHoleIndex >= 2,
    null,
    { timeout: 5000 }
  );

  await shootIdeal(page, 'bounce');
  await page.waitForFunction(
    () => window.RosterBateBasketballGolfPage?.run?.completed === true,
    null,
    { timeout: 5000 }
  );

  const state = await page.evaluate(() => {
    const app = document.querySelector('#basketball-golf-app');
    return {
      status: app?.dataset.golfStatus || '',
      completed: window.RosterBateBasketballGolfPage.run.completed,
      totalStrokes: window.RosterBateBasketballGolfPage.run.totalStrokes,
      phase: document.querySelector('#golf-phase')?.textContent || '',
      holeRuns: window.RosterBateBasketballGolfPage.run.holeRuns.map((holeRun) => ({
        strokes: holeRun.strokes,
        completed: holeRun.completed
      })),
      feedback: document.querySelector('#golf-feedback')?.textContent || ''
    };
  });

  assert.equal(state.status, 'complete', `app should report course complete: ${JSON.stringify(state)}`);
  assert.equal(state.completed, true, `run should be complete: ${JSON.stringify(state)}`);
  assert.equal(state.totalStrokes, 3, `three ideal holes should take three strokes: ${JSON.stringify(state)}`);
  assert.match(state.phase, /course complete/i, `phase should mention course complete: ${JSON.stringify(state)}`);
  assert.deepEqual(state.holeRuns, [
    { strokes: 1, completed: true },
    { strokes: 1, completed: true },
    { strokes: 1, completed: true }
  ], `each hole should complete in one stroke: ${JSON.stringify(state)}`);
  assert.match(state.feedback, /course complete/i, `feedback should mention course complete: ${JSON.stringify(state)}`);
}

async function assertPlayerFacingMeterMoves(page) {
  await page.keyboard.press('Space');
  const movement = await page.waitForFunction(
    () => {
      const meter = window.RosterBateBasketballGolfPage?.meter;
      if (meter?.phase !== 'distance' || meter.cursorPosition <= 0.08) return false;
      return {
        phase: meter.phase,
        cursorPosition: meter.cursorPosition,
        cursorDirection: meter.cursorDirection
      };
    },
    null,
    { timeout: 1500 }
  ).then((handle) => handle.jsonValue());

  assert.equal(movement.phase, 'distance', `meter should enter distance phase: ${JSON.stringify(movement)}`);
  assert.ok(movement.cursorPosition > 0.08, `visible meter cursor should advance on its own: ${JSON.stringify(movement)}`);
  assert.equal(movement.cursorDirection, 1, `distance meter should move left-to-right: ${JSON.stringify(movement)}`);
}

async function assertFocusedButtonSpaceAdvancesOnePhase(page) {
  await page.evaluate(() => {
    document.querySelector('#golf-action')?.focus();
  });
  await page.keyboard.press('Space');
  await page.evaluate(() => {
    document.querySelector('#golf-action')?.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      detail: 0
    }));
  });
  await new Promise((resolve) => setTimeout(resolve, 200));
  const state = await page.evaluate(() => ({
    phase: window.RosterBateBasketballGolfPage?.meter?.phase,
    totalStrokes: window.RosterBateBasketballGolfPage?.run?.totalStrokes,
    activeElementId: document.activeElement?.id || ''
  }));

  assert.equal(state.activeElementId, 'golf-action', `action button should be focused for this regression: ${JSON.stringify(state)}`);
  assert.equal(state.phase, 'distance', `focused Space should advance only one meter phase: ${JSON.stringify(state)}`);
  assert.equal(state.totalStrokes, 0, `focused Space should not resolve a shot: ${JSON.stringify(state)}`);
}

async function assertSceneCanvas(page) {
  const proof = await page.evaluate(async () => {
    await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));

    const canvas = document.querySelector('#golf-scene canvas');
    if (!canvas) return { hasCanvas: false };

    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;

    const blankDataUrl = blank.toDataURL('image/png');
    let dataUrl = canvas.toDataURL('image/png');
    const started = performance.now();
    while (dataUrl === blankDataUrl && performance.now() - started < 2500) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      dataUrl = canvas.toDataURL('image/png');
    }

    const image = new Image();
    const imageLoaded = new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });
    image.src = dataUrl;
    await imageLoaded;

    const probe = document.createElement('canvas');
    probe.width = Math.min(160, Math.max(1, canvas.width));
    probe.height = Math.min(100, Math.max(1, canvas.height));
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
      if (alpha > 12 && red + green + blue > 80) lightPixels += 1;
      if (alpha > 12 && Math.max(red, green, blue) - Math.min(red, green, blue) > 15) colorPixels += 1;
      buckets.add(`${red >> 4},${green >> 4},${blue >> 4},${alpha >> 4}`);
    }

    return {
      hasCanvas: true,
      width: canvas.width,
      height: canvas.height,
      differsFromBlank: dataUrl !== blankDataUrl,
      opaquePixels,
      lightPixels,
      colorPixels,
      colorBuckets: buckets.size
    };
  });

  assert.equal(proof.hasCanvas, true, `scene canvas should exist: ${JSON.stringify(proof)}`);
  assert.ok(proof.differsFromBlank, `scene canvas PNG should differ from a blank canvas: ${JSON.stringify(proof)}`);
  assert.ok(proof.width > 600, `scene canvas should have useful buffer width: ${JSON.stringify(proof)}`);
  assert.ok(proof.height > 350, `scene canvas should have useful buffer height: ${JSON.stringify(proof)}`);
  assert.ok(proof.opaquePixels > 500, `scene canvas should contain rendered pixels: ${JSON.stringify(proof)}`);
  assert.ok(proof.lightPixels > 25, `scene canvas should contain non-dark pixels: ${JSON.stringify(proof)}`);
  assert.ok(proof.colorPixels > 25, `scene canvas should contain colored pixels: ${JSON.stringify(proof)}`);
  assert.ok(proof.colorBuckets > 4, `scene canvas should contain varied pixels: ${JSON.stringify(proof)}`);
}

async function assertBootLayout(page) {
  await waitForGolfReady(page);
  await page.locator('#golf-scene canvas').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('#golf-mini-map').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('#golf-meter').waitFor({ state: 'visible', timeout: 5000 });

  const layout = await page.evaluate(() => {
    const app = document.querySelector('#basketball-golf-app');
    const miniMap = document.querySelector('#golf-mini-map');
    const miniMapRect = miniMap?.getBoundingClientRect();
    const controls = document.querySelector('.golf-controls')?.getBoundingClientRect();
    const meter = document.querySelector('#golf-meter')?.getBoundingClientRect();
    const aim = document.querySelector('.golf-zone.aim')?.getBoundingClientRect();
    const distance = document.querySelector('.golf-zone.distance')?.getBoundingClientRect();
    const mapContext = miniMap?.getContext('2d', { willReadFrequently: true });
    const mapPixels = mapContext && miniMap.width && miniMap.height
      ? mapContext.getImageData(0, 0, miniMap.width, miniMap.height).data
      : null;
    let miniMapColoredPixels = 0;

    if (mapPixels) {
      for (let index = 0; index < mapPixels.length; index += 4) {
        const spread = Math.max(mapPixels[index], mapPixels[index + 1], mapPixels[index + 2])
          - Math.min(mapPixels[index], mapPixels[index + 1], mapPixels[index + 2]);
        if (mapPixels[index + 3] > 12 && spread > 18) miniMapColoredPixels += 1;
      }
    }

    return {
      status: app?.dataset.golfStatus || '',
      sceneReady: app?.dataset.sceneReady || '',
      miniMapWidth: miniMap?.width || 0,
      miniMapHeight: miniMap?.height || 0,
      miniMapColoredPixels,
      miniMapOverlapsControls: !!(miniMapRect && controls && miniMapRect.bottom > controls.top && miniMapRect.right > controls.left),
      meterWidth: meter?.width || 0,
      meterHeight: meter?.height || 0,
      hasZones: !!(meter && aim && distance),
      aimLeft: meter && aim ? (aim.left - meter.left) / meter.width : null,
      distanceLeft: meter && distance ? (distance.left - meter.left) / meter.width : null
    };
  });

  assert.equal(layout.status, 'ready', `app should report ready: ${JSON.stringify(layout)}`);
  assert.equal(layout.sceneReady, 'true', `scene should report ready: ${JSON.stringify(layout)}`);
  assert.ok(layout.miniMapWidth >= 296, `mini-map should have useful backing width: ${JSON.stringify(layout)}`);
  assert.ok(layout.miniMapHeight >= 180, `mini-map should have useful backing height: ${JSON.stringify(layout)}`);
  assert.ok(layout.miniMapColoredPixels > 100, `mini-map should be drawn, not blank: ${JSON.stringify(layout)}`);
  assert.equal(layout.miniMapOverlapsControls, false, `mini-map should not overlap controls: ${JSON.stringify(layout)}`);
  assert.ok(layout.meterWidth > 400, `meter should be visible and wide: ${JSON.stringify(layout)}`);
  assert.ok(layout.meterHeight > 20, `meter should be visible and tall enough: ${JSON.stringify(layout)}`);

  if (layout.hasZones) {
    assert.ok(layout.aimLeft < 0.25, `aim zone should be on the left: ${JSON.stringify(layout)}`);
    assert.ok(layout.distanceLeft > 0.65, `distance zone should be on the right: ${JSON.stringify(layout)}`);
  }

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

  await assertSceneCanvas(page);
}

async function main() {
  const server = http.createServer(serve);
  const port = await listen(server);
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = attachErrorCapture(page, 'basketball-golf');

    await page.goto(`http://127.0.0.1:${port}/${PAGE}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await assertBootLayout(page);
    await assertFocusedButtonSpaceAdvancesOnePhase(page);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
    await assertBootLayout(page);
    await assertPlayerFacingMeterMoves(page);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
    await assertBootLayout(page);
    await assertOneIdealShot(page);
    await assertThreeHoleRunCompletion(page);

    assert.deepEqual(errors, [], `page should not log console/page errors: ${JSON.stringify(errors)}`);
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
