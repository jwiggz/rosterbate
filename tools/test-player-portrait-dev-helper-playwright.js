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

    await page.goto(`http://127.0.0.1:${port}/portrait-manifest-dev.html`, {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });
    await page.waitForFunction(() => document.querySelector('#status')?.textContent.includes('Loaded'), null, { timeout: 5000 });

    assert.equal(await page.locator('#manifest-count').innerText(), '18');
    assert.equal(await page.locator('#override-count').innerText(), '0');
    assert.equal(await page.locator('#portrait-preview img').isVisible(), true);

    await page.locator('#portrait-player-name').fill('Anthony Edwards');
    await page.locator('#portrait-team').fill('MIN');
    await page.locator('#portrait-url').fill('assets/player-portraits/anthony-edwards-dev-override.png');
    await page.locator('#add-override').click();
    await page.waitForFunction(() => document.querySelector('#override-count')?.textContent === '1', null, { timeout: 5000 });

    const overrideState = await page.evaluate(() => ({
      overrides: JSON.parse(localStorage.getItem('rbPlayerPortraitOverrides') || '{}'),
      resolved: document.querySelector('#resolved-url')?.textContent || '',
      status: document.querySelector('#status')?.textContent || ''
    }));

    assert.equal(
      overrideState.overrides['anthony edwards|min'],
      'assets/player-portraits/anthony-edwards-dev-override.png',
      'dev helper should save the selected runtime lookup key into localStorage'
    );
    assert.equal(
      overrideState.resolved,
      'assets/player-portraits/anthony-edwards-dev-override.png',
      'saved helper overrides should immediately replace an existing manifest portrait preview'
    );
    assert.match(overrideState.status, /Saved 1 override/);
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
