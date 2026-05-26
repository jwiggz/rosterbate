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

function serve(req, res) {
  const decoded = decodeURIComponent(String(req.url || '/').split('?')[0]);
  const filePath = path.resolve(ROOT, `.${decoded === '/' ? '/index.html' : decoded}`);
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
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(String(error?.stack || error?.message || error)));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto(`http://127.0.0.1:${port}/portrait-studio.html`, {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });
    await page.waitForFunction(() => window.RosterBatePortraitStudio, null, { timeout: 5000 });

    assert.equal(await page.locator('#offline-portrait-studio canvas').isVisible(), true);
    assert.match(await page.locator('#studio-output-path').inputValue(), /assets\/player-portraits\/generic-prospect__TST\.png/);
    assert.equal(await page.locator('#studio-save-to-site').isVisible(), true);
    assert.deepEqual(await page.locator('#offline-portrait-studio canvas').evaluate((canvas) => ({
      width: canvas.width,
      height: canvas.height
    })), { width: 512, height: 512 });

    await page.locator('#studio-player-name').fill('Unsigned Generic');
    await page.locator('#studio-team').fill('FA');
    await page.locator('#studio-player-id').fill('987002');
    await page.locator('#studio-position').fill('G');
    await page.locator('#studio-hair-style').selectOption('short-curls');
    await page.locator('#studio-facial-hair').selectOption('goatee');
    await page.locator('#studio-reference-opacity').fill('0');
    await page.locator('#studio-build-imagegen-prompt').click();
    const customPrompt = [
      'Vector cartoon portrait illustration of Unsigned Generic, head and upper chest visible.',
      'Clean flat-color cel-shaded style with bold black outlines.',
      'Negative prompt: photorealistic, 3d render, gradients.'
    ].join('\n');
    await page.locator('#studio-imagegen-prompt').fill(customPrompt);
    await page.locator('#studio-render').click();
    await page.waitForFunction(() => document.querySelector('#studio-data-url')?.value.startsWith('data:image/png;base64,'), null, { timeout: 5000 });

    const state = await page.evaluate(() => ({
      rendered: document.querySelector('#offline-portrait-studio canvas')?.dataset.rendered,
      dataPrefix: document.querySelector('#studio-data-url')?.value.slice(0, 22),
      assetPath: document.querySelector('#studio-output-path')?.value,
      manifestEntry: JSON.parse(document.querySelector('#studio-manifest-entry')?.value || '{}'),
      apiText: document.body.textContent,
      imagegenPrompt: document.querySelector('#studio-imagegen-prompt')?.value,
      backgroundPixel: Array.from(document.querySelector('#offline-portrait-studio canvas').getContext('2d').getImageData(8, 8, 1, 1).data),
      centerPixel: Array.from(document.querySelector('#offline-portrait-studio canvas').getContext('2d').getImageData(256, 235, 1, 1).data)
    }));

    assert.equal(state.rendered, 'true');
    assert.equal(state.dataPrefix, 'data:image/png;base64,');
    assert.equal(state.assetPath, 'assets/player-portraits/unsigned-generic__FA.png');
    assert.deepEqual(state.manifestEntry, {
      'Unsigned Generic|FA': 'assets/player-portraits/unsigned-generic__FA.png'
    });
    assert.match(state.apiText, /No API key/);
    assert.match(state.apiText, /Tyrese-style/);
    assert.match(state.apiText, /Codex Imagegen v2/);
    assert.doesNotMatch(state.apiText, /OPENAI_API_KEY/);
    assert.equal(state.imagegenPrompt, customPrompt);
    await page.locator('#studio-build-imagegen-prompt').click();
    const rebuiltPrompt = await page.locator('#studio-imagegen-prompt').inputValue();
    assert.match(rebuiltPrompt, /Vector cartoon portrait illustration of Unsigned Generic/);
    assert.match(rebuiltPrompt, /512 x 512/);
    assert.match(rebuiltPrompt, /Pure white background/);
    assert.match(rebuiltPrompt, /Negative prompt/);
    assert.equal(state.backgroundPixel[0] > 238 && state.backgroundPixel[1] > 238 && state.backgroundPixel[2] > 238, true);
    assert.equal(state.centerPixel[3], 255);

    const statusBeforeSecondRender = await page.locator('#studio-status').textContent();
    await page.locator('#studio-render').click();
    const statusAfterSecondRender = await page.locator('#studio-status').textContent();
    assert.notEqual(statusAfterSecondRender, statusBeforeSecondRender);
    assert.match(statusAfterSecondRender || '', /Rendered draft #/);

    const imageBeforeVariation = await page.locator('#offline-portrait-studio canvas').evaluate((canvas) => canvas.toDataURL('image/png'));
    await page.locator('#studio-new-draft-variation').click();
    const imageAfterVariation = await page.locator('#offline-portrait-studio canvas').evaluate((canvas) => canvas.toDataURL('image/png'));
    assert.notEqual(imageAfterVariation, imageBeforeVariation);
    assert.match(await page.locator('#studio-status').textContent(), /variation/i);

    const durantPrompt = "Vector cartoon portrait illustration of Kevin Durant, head and upper chest visible, three-quarter view facing slightly to the viewer's right. Clean flat-color cel-shaded style with bold black outlines of consistent medium weight. Simplified, friendly facial features with a subtle closed-mouth smile. Skin rendered in two flat tones (base tone plus one slightly darker shadow tone on one side of the face, jaw, and neck) - no gradients, no rendering, no texture. Hair drawn as solid shapes with clean edges and a single shadow tone. Eyes are simplified but expressive with visible irises and small white highlights. Wearing a basketball jersey rendered in flat red with white and black trim around the collar and armholes. Pure white background, no environment, no shadow beneath subject. Negative prompt: photorealistic, 3d render, painterly, gradients, textured background, blurry, sketchy lines, multiple subjects, full body, hands, basketball, court, crowd";
    await page.locator('#studio-imagegen-prompt').fill(durantPrompt);
    await page.locator('#studio-render').click();
    const promptApplied = await page.evaluate(() => ({
      player: document.querySelector('#studio-player-name')?.value,
      id: document.querySelector('#studio-player-id')?.value,
      team: document.querySelector('#studio-team')?.value,
      jersey: document.querySelector('#studio-jersey')?.value,
      assetPath: document.querySelector('#studio-output-path')?.value,
      manifestEntry: JSON.parse(document.querySelector('#studio-manifest-entry')?.value || '{}'),
      status: document.querySelector('#studio-status')?.textContent
    }));
    assert.equal(promptApplied.player, 'Kevin Durant');
    assert.equal(promptApplied.id, '');
    assert.equal(promptApplied.team, '');
    assert.equal(promptApplied.jersey.toLowerCase(), '#dc2626');
    assert.equal(promptApplied.assetPath, 'assets/player-portraits/kevin-durant.png');
    assert.deepEqual(promptApplied.manifestEntry, {
      'Kevin Durant': 'assets/player-portraits/kevin-durant.png'
    });
    assert.match(promptApplied.status || '', /Applied prompt/i);

    await page.locator('#studio-batch-team').selectOption('HOU');
    await page.locator('#studio-batch-players').fill('Amen Thompson\\nAlperen Sengun, C\\nJabari Smith Jr.|F');
    await page.locator('#studio-build-batch').click();
    const batchState = await page.evaluate(() => ({
      count: document.querySelectorAll('[data-batch-index]').length,
      output: document.querySelector('#studio-batch-output')?.value || '',
      firstPrompt: document.querySelector('[data-batch-index="0"] textarea')?.value || '',
      firstAsset: document.querySelector('[data-batch-index="0"] code')?.textContent || ''
    }));
    assert.equal(batchState.count, 3);
    assert.match(batchState.output, /Amen Thompson/);
    assert.match(batchState.output, /Rockets red jersey/);
    assert.match(batchState.output, /assets\/player-portraits\/amen-thompson__HOU\.png/);
    assert.match(batchState.firstPrompt, /Vector cartoon portrait illustration of Amen Thompson/);
    assert.match(batchState.firstPrompt, /Rockets red jersey/);
    assert.equal(batchState.firstAsset, 'assets/player-portraits/amen-thompson__HOU.png');

    await page.locator('#studio-download').click();

    assert.deepEqual(errors, []);
    await page.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
  console.log('test-offline-portrait-studio-playwright passed');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
