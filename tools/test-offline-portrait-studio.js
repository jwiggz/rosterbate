const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const widgetPath = path.join(root, 'rosterbate-portrait-studio.js');
const pagePath = path.join(root, 'portrait-studio.html');
const helperPath = path.join(root, 'portrait-manifest-dev.html');
const packagePath = path.join(root, 'package.json');

assert.equal(fs.existsSync(widgetPath), true, 'offline portrait studio widget should exist');
assert.equal(fs.existsSync(pagePath), true, 'offline portrait studio page should exist');

const widget = fs.readFileSync(widgetPath, 'utf8');
assert.match(widget, /RosterBatePortraitStudio/, 'widget should expose a global importable API');
assert.match(widget, /renderPortraitToCanvas/, 'widget should render to a canvas');
assert.match(widget, /renderAvatarToCanvas/, 'widget should render flat avatar portraits');
assert.match(widget, /buildImagegenPrompt/, 'widget should build an Imagegen prompt for Codex asset generation');
assert.match(widget, /teamPortraitPresets/, 'widget should define team portrait presets');
assert.match(widget, /buildBatchPromptQueue/, 'widget should build batch prompt queues');
assert.match(widget, /getTeamPortraitPreset/, 'widget should resolve team presets');
assert.match(widget, /Rockets red jersey/, 'Rockets preset should preserve the approved jersey treatment');
assert.match(widget, /Vector cartoon portrait illustration/, 'Imagegen starter prompt should use the preferred vector cartoon style');
assert.match(widget, /Negative prompt/, 'Imagegen starter prompt should include avoid-list guidance');
assert.match(widget, /createPortraitStudio/, 'widget should expose a mountable UI helper');
assert.match(widget, /buildManifestEntry/, 'widget should build manifest JSON entries');
assert.match(widget, /buildAssetPath/, 'widget should derive asset paths');
assert.match(widget, /toDataURL\('image\/png'\)/, 'widget should export PNG data URLs');
assert.match(widget, /Tyrese-style flat illustrated avatar/, 'widget should target the existing RosterBate avatar style');
assert.match(widget, /studio-reference-opacity/, 'widget should treat uploaded photos as reference guides');
assert.match(widget, /studio-hair-style/, 'widget should expose avatar hair controls');
assert.match(widget, /studio-facial-hair/, 'widget should expose avatar facial hair controls');
assert.match(widget, /studio-imagegen-prompt/, 'widget should expose the Imagegen prompt');
assert.match(widget, /studio-copy-imagegen-prompt/, 'widget should copy the Imagegen prompt');
assert.match(widget, /studio-generated-asset-file/, 'widget should import a finished generated PNG');
assert.match(widget, /studio-new-draft-variation/, 'widget should expose a visible way to create another local draft');
assert.match(widget, /studio-save-to-site/, 'widget should save finished portraits directly into the local site assets');
assert.match(widget, /studio-save-endpoint/, 'widget should expose the local asset save endpoint');
assert.match(widget, /savePortraitToSite/, 'widget should post the rendered PNG to the local save helper');
assert.match(widget, /Rendered draft #/, 'rendering a draft should visibly acknowledge the click');
assert.match(widget, /applyPromptToDraftControls/, 'rendering should apply useful prompt details to draft controls');
assert.match(widget, /parseImagegenPrompt/, 'widget should parse Imagegen prompt details for draft rendering');
assert.match(widget, /studio-batch-team/, 'widget should expose team batch controls');
assert.match(widget, /studio-batch-players/, 'widget should accept batch player input');
assert.match(widget, /studio-build-batch/, 'widget should build a batch queue');
assert.match(widget, /studio-batch-output/, 'widget should render batch prompt output');
assert.doesNotMatch(widget, /id="studio-imagegen-prompt" readonly/, 'Imagegen prompt should be editable before copying');
assert.doesNotMatch(widget, /OPENAI_API_KEY|api\.openai\.com/, 'offline portrait studio should not depend on paid APIs');

const page = fs.readFileSync(pagePath, 'utf8');
assert.match(page, /<script src="rosterbate-portrait-studio\.js"><\/script>/, 'standalone page should import the widget');
assert.match(page, /id="offline-portrait-studio"/, 'standalone page should mount the widget');
assert.match(page, /No API key/, 'standalone page should clearly be API-free');
assert.match(page, /Tyrese-style/, 'standalone page should describe the target avatar style');
assert.match(page, /Codex Imagegen v2/, 'standalone page should describe the Codex Imagegen workflow');

const helper = fs.readFileSync(helperPath, 'utf8');
assert.match(helper, /portrait-studio\.html/, 'manifest helper should link to the offline portrait studio');

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
assert.equal(
  pkg.scripts['portraits:studio'],
  'node tools/open-static-page.js portrait-studio.html',
  'package.json should expose the offline portrait studio launcher'
);
assert.equal(
  pkg.scripts['portraits:helper'],
  'node tools/serve-portrait-generator-function.js',
  'package.json should expose the local portrait asset helper'
);

console.log('test-offline-portrait-studio passed');
