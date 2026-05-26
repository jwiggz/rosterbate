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
assert.match(
  html,
  /<link[^>]+rel="modulepreload"[^>]+href="assets\/vendor\/three\/three\.module\.js"[^>]*>/,
  'page should preload local Three.js'
);
assert.doesNotMatch(html, /landing|hero/i, 'page should be playable app chrome, not a landing page');

const scripts = Array.from(html.matchAll(/<script[^>]+src="([^"]+)"/g)).map((match) => match[1]);
assert.deepEqual(
  scripts.slice(-3),
  ['basketball-golf-core.js', 'basketball-golf-renderer.js', 'basketball-golf.js'],
  'page should load core, renderer, and controller in order'
);

const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
assert.equal(
  packageJson.scripts['basketballgolf:dev'],
  'node tools/open-static-page.js basketball-golf.html',
  'package should expose basketball golf dev script'
);
assert.equal(
  packageJson.scripts['test:basketballgolf-core'],
  'node tools/test-basketball-golf-core.js',
  'package should expose basketball golf core test script'
);
assert.equal(
  packageJson.scripts['test:basketballgolf'],
  'node tools/test-basketball-golf-core.js && node tools/test-basketball-golf-shell.js && node tools/test-basketball-golf-playwright.js',
  'package should expose basketball golf test suite'
);

console.log('test-basketball-golf-shell passed');
