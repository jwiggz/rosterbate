const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'player-portrait-assets.js'), 'utf8');

const storage = new Map();
const context = {
  console,
  globalThis: {},
  window: {
    localStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key)
    }
  }
};
context.globalThis = context.window;
vm.createContext(context);
vm.runInContext(source, context, { filename: 'player-portrait-assets.js' });

const portraits = context.window.RosterBatePlayerPortraits;
assert.ok(portraits, 'portrait API should attach to window');
assert.equal(typeof portraits.getPortraitUrl, 'function', 'portrait API should expose getPortraitUrl');
assert.equal(typeof portraits.renderPortraitMarkup, 'function', 'portrait API should expose renderPortraitMarkup');

const generatedUrl = portraits.getPortraitUrl({ name: 'Nikola Jokic', team: 'DEN' });
assert.ok(generatedUrl.startsWith('data:image/svg+xml;charset=UTF-8,'), 'fallback portrait should be an SVG data URI');
const svg = decodeURIComponent(generatedUrl.split(',')[1]);
assert.match(svg, /<svg[\s\S]*Nikola Jokic portrait/, 'generated portrait SVG should describe the player');
assert.match(svg, /portrait-card-bg/, 'generated portrait should include a card-style panel');
assert.match(svg, /portrait-ink-outline/, 'generated portrait should include ink outline details');
assert.match(svg, /portrait-head/, 'generated portrait should draw a player head');
assert.match(svg, /portrait-body/, 'generated portrait should draw a team-color jersey body');
assert.match(svg, /data-trait-hair="buzz"/, 'known-player portrait traits should tune recognizable hair styles');
assert.match(svg, /data-trait-facial-hair="trim-beard"/, 'known-player portrait traits should tune recognizable facial hair');

const jordanSvg = portraits.buildGeneratedPortraitSvg({ name: 'Michael Jordan', team: 'CHI' });
assert.match(jordanSvg, /data-trait-hair="bald"/, 'Michael Jordan fallback should use the bald portrait trait');

const sgaSvg = portraits.buildGeneratedPortraitSvg({ name: 'Shai Gilgeous-Alexander', team: 'OKC' });
assert.match(sgaSvg, /data-trait-hair="braids"/, 'SGA fallback should use the braids portrait trait');
assert.match(sgaSvg, /stroke="#f8fafc" stroke-width="9"/, 'SGA fallback should include a headband trait');

portraits.register({ 'Michael Jordan|CHI': 'assets/player-portraits/michael-jordan.png' });
assert.equal(
  portraits.getPortraitUrl({ name: 'Michael Jordan', team: 'CHI' }),
  'assets/player-portraits/michael-jordan.png',
  'registered portrait URLs should win over generated fallbacks'
);

storage.set('rbPlayerPortraitOverrides', JSON.stringify({ 'larry bird|bos': 'assets/player-portraits/larry-bird.png' }));
assert.equal(
  portraits.getPortraitUrl({ name: 'Larry Bird', team: 'BOS' }),
  'assets/player-portraits/larry-bird.png',
  'localStorage portrait overrides should be supported for future asset packs'
);

assert.equal(
  portraits.getPortraitUrl({ name: 'Magic Johnson', team: 'LAL', portraitUrl: 'https://example.test/magic.png' }),
  'https://example.test/magic.png',
  'direct portrait fields should have highest priority'
);

const markup = portraits.renderPortraitMarkup({ name: 'Hakeem Olajuwon', team: 'HOU' }, { size: 64, className: 'player-portrait' });
assert.match(markup, /class="player-portrait"/, 'rendered markup should keep requested wrapper class');
assert.match(markup, /player-portrait-img/, 'rendered markup should include an image element');
assert.match(markup, /alt="Hakeem Olajuwon portrait"/, 'rendered markup should include accessible alt text');

console.log('test-player-portrait-assets passed');
