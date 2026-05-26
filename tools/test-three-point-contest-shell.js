const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const htmlPath = path.join(root, 'three-point-contest.html');
const corePath = path.join(root, 'three-point-contest-core.js');
const rendererPath = path.join(root, 'three-point-contest-renderer.js');
const controllerPath = path.join(root, 'three-point-contest.js');
const playwrightPath = path.join(root, 'tools', 'test-three-point-contest-playwright.js');
const threePath = path.join(root, 'assets', 'vendor', 'three', 'three.module.js');
const threeCorePath = path.join(root, 'assets', 'vendor', 'three', 'three.core.js');
const packagePath = path.join(root, 'package.json');

assert.equal(fs.existsSync(htmlPath), true, 'three-point contest page should exist');
assert.equal(fs.existsSync(corePath), true, 'core module should exist');
assert.equal(fs.existsSync(rendererPath), true, 'renderer module should exist');
assert.equal(fs.existsSync(controllerPath), true, 'browser controller should exist');
assert.equal(fs.existsSync(playwrightPath), true, 'three-point Playwright smoke test should exist');
assert.equal(fs.existsSync(threePath), true, 'local Three.js module should exist');

const threeModule = fs.readFileSync(threePath, 'utf8');
if (/from\s+['"]\.\/three\.core\.js['"]/.test(threeModule)) {
  assert.equal(fs.existsSync(threeCorePath), true, 'local Three.js core dependency should exist');
}

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
