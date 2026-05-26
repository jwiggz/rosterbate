const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const PORTRAIT_MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets', 'player-portraits', 'manifest.json'), 'utf8'));
const EXPECTED_MANIFEST_COUNT = String(Object.keys(PORTRAIT_MANIFEST.players || {}).length);
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
    await page.addInitScript(() => {
      localStorage.setItem('rosterbateDraft', JSON.stringify({
        seasonId: 'season_portrait_test',
        leagueName: 'Portrait Test League',
        allRosters: [
          [
            { id: 1, name: 'Anthony Edwards', team: 'MIN', pos: 'SG' },
            { id: 987001, name: 'Generic Prospect', team: 'TST', pos: 'SF' }
          ]
        ],
        waiver: [
          { id: 987002, name: 'Unsigned Generic', team: 'FA', pos: 'PG' }
        ]
      }));
    });

    await page.goto(`http://127.0.0.1:${port}/portrait-manifest-dev.html`, {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });
    await page.waitForFunction(() => document.querySelector('#status')?.textContent.includes('Loaded'), null, { timeout: 5000 });

    assert.equal(await page.locator('#manifest-count').innerText(), EXPECTED_MANIFEST_COUNT);
    assert.equal(await page.locator('#override-count').innerText(), '0');
    assert.equal(await page.locator('#portrait-preview img').isVisible(), true);
    assert.equal(await page.locator('#photo-lab-canvas').isVisible(), true);
    await page.waitForFunction(() => document.querySelector('#league-player-count')?.textContent === '2', null, { timeout: 5000 });
    const leaguePlayers = await page.evaluate(() => Array.from(document.querySelectorAll('#league-player-grid [data-player-name]')).map((node) => ({
      name: node.getAttribute('data-player-name'),
      team: node.getAttribute('data-player-team'),
      text: node.textContent
    })));
    assert.deepEqual(
      leaguePlayers.map((player) => player.name),
      ['Generic Prospect', 'Unsigned Generic'],
      'league picker should show saved players that still use generated avatars'
    );
    assert.equal(
      leaguePlayers.some((player) => player.name === 'Anthony Edwards'),
      false,
      'league picker should not ask for players already covered by manifest assets'
    );

    await page.locator('[data-player-name="Generic Prospect"]').click();
    assert.equal(await page.locator('#portrait-player-name').inputValue(), 'Generic Prospect');
    assert.equal(await page.locator('#portrait-team').inputValue(), 'TST');
    assert.equal(await page.locator('#portrait-id').inputValue(), '987001');
    assert.equal(await page.locator('#photo-lab-export-path').inputValue(), 'assets/player-portraits/generic-prospect.png');
    assert.match(
      await page.locator('#ai-portrait-prompt').inputValue(),
      /Generic Prospect/,
      'selecting a generic player should rebuild the AI portrait prompt for that player'
    );

    let aiRequestBody = null;
    await page.route('**/.netlify/functions/generate-player-portrait', async (route) => {
      aiRequestBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          assetPath: 'assets/player-portraits/generic-prospect.png',
          imageDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/ax8Hf4AAAAASUVORK5CYII=',
          manifestEntry: {
            'id:987001': 'assets/player-portraits/generic-prospect.png'
          }
        })
      });
    });
    await page.locator('#ai-portrait-endpoint').fill('/.netlify/functions/generate-player-portrait');
    await page.locator('#generate-ai-portrait').click();
    await page.waitForFunction(() => document.querySelector('#ai-portrait-status')?.textContent.includes('Generated'), null, { timeout: 5000 });
    assert.equal(aiRequestBody.player.name, 'Generic Prospect');
    assert.equal(aiRequestBody.assetPath, 'assets/player-portraits/generic-prospect.png');
    assert.match(aiRequestBody.prompt, /Generic Prospect/);
    assert.equal(await page.locator('#ai-portrait-output').isVisible(), true);
    assert.match(await page.locator('#ai-portrait-entry').inputValue(), /id:987001/);
    await page.locator('#use-ai-portrait').click();
    assert.match(
      await page.locator('#portrait-url').inputValue(),
      /^data:image\/png;base64,/,
      'generated AI portraits should feed back into the override URL field for immediate preview'
    );

    await page.locator('#portrait-player-name').fill('Anthony Edwards');
    await page.locator('#portrait-team').fill('MIN');
    await page.locator('#portrait-url').fill('assets/player-portraits/anthony-edwards__MIN.png');
    await page.locator('#portrait-state').selectOption('final');
    await page.locator('#add-override').click();
    await page.waitForFunction(() => document.querySelector('#override-count')?.textContent === '1', null, { timeout: 5000 });

    const overrideState = await page.evaluate(() => ({
      overrides: JSON.parse(localStorage.getItem('rbPlayerPortraitOverrides') || '{}'),
      resolved: document.querySelector('#resolved-url')?.textContent || '',
      previewClass: document.querySelector('#portrait-preview .helper-player-portrait')?.className || '',
      status: document.querySelector('#status')?.textContent || ''
    }));

    assert.equal(
      overrideState.overrides['anthony edwards|min'],
      'assets/player-portraits/anthony-edwards__MIN.png',
      'dev helper should save the selected runtime lookup key into localStorage'
    );
    assert.equal(
      overrideState.resolved,
      'assets/player-portraits/anthony-edwards__MIN.png',
      'saved helper overrides should immediately replace an existing manifest portrait preview'
    );
    assert.match(overrideState.status, /Saved 1 override/);
    assert.match(
      overrideState.previewClass,
      /portrait-state-final/,
      'dev helper should preview selected portrait states through shared markup'
    );

    const sourcePhotoPath = path.join(os.tmpdir(), `rosterbate-portrait-lab-${Date.now()}.svg`);
    fs.writeFileSync(
      sourcePhotoPath,
      '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="400" viewBox="0 0 320 400"><rect width="320" height="400" fill="#1d2638"/><circle cx="160" cy="122" r="58" fill="#b97950"/><rect x="92" y="188" width="136" height="162" rx="36" fill="#f97316"/><rect x="112" y="214" width="96" height="92" rx="18" fill="#ffffff" opacity=".88"/></svg>'
    );
    await page.locator('#photo-lab-file').setInputFiles(sourcePhotoPath);
    await page.waitForFunction(() => document.querySelector('#photo-lab-status')?.textContent.includes('Loaded'), null, { timeout: 5000 });
    await page.locator('#photo-lab-render').click();

    const photoLabState = await page.evaluate(() => ({
      exportPath: document.querySelector('#photo-lab-export-path')?.value || '',
      canvasWidth: document.querySelector('#photo-lab-canvas')?.width || 0,
      canvasHeight: document.querySelector('#photo-lab-canvas')?.height || 0,
      dataUrlPrefix: window.rbPortraitManifestDev?.getPhotoLabDataUrl?.().slice(0, 22) || '',
      rendered: document.querySelector('#photo-lab-canvas')?.dataset.rendered || ''
    }));
    assert.equal(photoLabState.exportPath, 'assets/player-portraits/anthony-edwards.png');
    assert.equal(photoLabState.canvasWidth, 512);
    assert.equal(photoLabState.canvasHeight, 640);
    assert.equal(photoLabState.dataUrlPrefix, 'data:image/png;base64,');
    assert.equal(photoLabState.rendered, 'true');

    await page.locator('#photo-lab-use-path').click();
    assert.equal(
      await page.locator('#portrait-url').inputValue(),
      'assets/player-portraits/anthony-edwards.png',
      'photo lab should feed the suggested asset path into the override URL field'
    );

    assert.deepEqual(errors, []);
    await page.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
  console.log('test-player-portrait-dev-helper-playwright passed');
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
