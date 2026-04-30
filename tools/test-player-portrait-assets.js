const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

(async function main() {
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
assert.equal(typeof portraits.applyManifest, 'function', 'portrait API should expose manifest registration');
assert.equal(typeof portraits.loadManifest, 'function', 'portrait API should expose async manifest loading');

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
portraits.register({ 'Shai Gilgeous Alexander': 'assets/player-portraits/shai-gilgeous-alexander-1628983.jpg' });
assert.equal(
  portraits.getPortraitUrl({ name: 'Shai Gilgeous-Alexander', team: 'OKC' }),
  'assets/player-portraits/shai-gilgeous-alexander-1628983.jpg',
  'registered portrait lookup should tolerate filename-derived punctuation differences'
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

portraits.applyManifest({
  players: [
    { name: 'Victor Wembanyama', team: 'SAS', url: 'assets/player-portraits/victor-wembanyama.png' },
    { name: 'Luka Doncic', team: 'LAL', url: 'assets/player-portraits/luka-doncic__LAL.webp' }
  ]
});
assert.equal(
  portraits.getPortraitUrl({ name: 'Victor Wembanyama', team: 'SAS' }),
  'assets/player-portraits/victor-wembanyama.png',
  'array-based portrait manifests should register player image URLs'
);
assert.equal(
  portraits.getPortraitUrl({ name: 'Luka Doncic', team: 'LAL' }),
  'assets/player-portraits/luka-doncic__LAL.webp',
  'manifest portraits should support team-specific illustrated player assets'
);

const markup = portraits.renderPortraitMarkup(
  { name: 'Hakeem Olajuwon', team: 'HOU' },
  { size: 64, className: 'player-portrait', state: 'takeover', status: 'OUT', hasGame: false }
);
assert.match(markup, /class="[^"]*player-portrait/, 'rendered markup should keep requested wrapper class');
assert.match(markup, /player-portrait-img/, 'rendered markup should include an image element');
assert.match(markup, /alt="Hakeem Olajuwon portrait"/, 'rendered markup should include accessible alt text');
assert.match(markup, /portrait-state-takeover/, 'rendered markup should include takeover animation state');
assert.match(markup, /portrait-state-injured/, 'rendered markup should include injured animation state');
assert.match(markup, /portrait-state-offday/, 'rendered markup should include off-day animation state');

const fetchContext = {
  console,
  globalThis: {},
  window: {
    fetch: async (url) => ({
      ok: url === 'assets/player-portraits/manifest.json',
      status: url === 'assets/player-portraits/manifest.json' ? 200 : 404,
      json: async () => ({ players: { 'Stephen Curry|GSW': 'assets/player-portraits/stephen-curry.png' } })
    })
  }
};
fetchContext.globalThis = fetchContext.window;
vm.createContext(fetchContext);
vm.runInContext(source, fetchContext, { filename: 'player-portrait-assets.js' });
await fetchContext.window.RosterBatePlayerPortraits.loadManifest();
assert.equal(
  fetchContext.window.RosterBatePlayerPortraits.getPortraitUrl({ name: 'Stephen Curry', team: 'GSW' }),
  'assets/player-portraits/stephen-curry.png',
  'loadManifest should fetch and register manifest image URLs'
);

console.log('test-player-portrait-assets passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
