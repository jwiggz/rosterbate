const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function extractInlineScript(html){
  const matches = Array.from(html.matchAll(/<script>([\s\S]*?)<\/script>/g));
  return matches.length ? matches[matches.length - 1][1] : '';
}

async function main(){
  const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(indexHtml, /id="historicalEntryTitle"/, 'home page should expose the historical hero title node');
  assert.match(indexHtml, /id="historicalBrowseLink"/, 'home page should expose the historical browser link node');
  assert.match(indexHtml, /id="historicalDraftLink"/, 'home page should expose the historical draft link node');
  assert.match(indexHtml, /id="historicalSimLink"/, 'home page should expose the historical simulation link node');
  assert.match(indexHtml, /id="historicalEntrySportPill"/, 'home page should expose the historical sport pill node');
  assert.match(indexHtml, /id="historicalEntryModePill"/, 'home page should expose the historical mode pill node');

  const inlineScript = extractInlineScript(indexHtml);
  const historicalStart = inlineScript.indexOf('const HOME_HISTORICAL_SURFACE');
  const updateHomeSportUiStart = inlineScript.indexOf('function updateHomeSportUI');
  assert.ok(historicalStart >= 0, 'home page should define a historical surface block');
  assert.ok(updateHomeSportUiStart > historicalStart, 'home page should define updateHistoricalEntrySurface after the historical surface block');

  const snippet = inlineScript.slice(historicalStart, updateHomeSportUiStart);
  const elements = {
    historicalEntryTitle: { textContent: '' },
    historicalEntryDesc: { textContent: '' },
    historicalTeamsCount: { textContent: '' },
    historicalPlayersCount: { textContent: '' },
    historicalGamesCount: { textContent: '' },
    historicalEntryStatus: { textContent: '' },
    historicalEntrySportPill: { textContent: '' },
    historicalEntryModePill: { textContent: '' },
    historicalEntryNote: { textContent: '' },
    historicalBrowseLink: {
      textContent: '',
      href: '',
      classList: { remove(){}, toggle(){} },
      removeAttribute(){},
      setAttribute(){}
    },
    historicalDraftLink: {
      textContent: '',
      href: '',
      classList: { remove(){}, toggle(){} },
      removeAttribute(){},
      setAttribute(){}
    },
    historicalSimLink: {
      textContent: '',
      href: '',
      classList: { remove(){}, toggle(){} },
      removeAttribute(){},
      setAttribute(){}
    }
  };

  const context = {
    console,
    selectedHomeSport: 'nfl',
    getSelectedRosterbateSport(){ return 'nfl'; },
    normalizeRosterbateSport(value){ return String(value || 'nba').trim().toLowerCase(); },
    document: {
      getElementById(id){
        const node = elements[id];
        if (!node) {
          throw new Error(`Unknown element requested: ${id}`);
        }
        return node;
      }
    },
    window: {
      location: {
        hostname: 'localhost',
        protocol: 'http:'
      }
    },
    Image: function Image(){},
    requestAnimationFrame(callback){ return callback(); },
    setTimeout(){ return 0; },
    clearTimeout(){},
    Date,
    Math
  };
  context.window.window = context.window;

  vm.runInNewContext(snippet, context, { filename: 'index.historical-surface.inline.js' });

  assert.equal(typeof context.updateHistoricalEntrySurface, 'function', 'home page should expose a historical surface renderer');

  context.updateHistoricalEntrySurface();

  assert.match(elements.historicalEntryTitle.textContent, /2014 NFL/i, 'football selection should swap the historical title to the NFL anchor season');
  assert.match(elements.historicalEntryDesc.textContent, /historical NFL player pool|football/i, 'football selection should swap the historical description');
  assert.equal(elements.historicalTeamsCount.textContent, '32', 'football selection should swap the team count');
  assert.equal(elements.historicalPlayersCount.textContent, '416', 'football selection should swap the player count');
  assert.equal(elements.historicalGamesCount.textContent, '256', 'football selection should swap the game count');
  assert.match(elements.historicalEntrySportPill.textContent, /football first/i, 'football selection should swap the sport pill');
  assert.match(elements.historicalEntryModePill.textContent, /sim season|mixed-era/i, 'football selection should swap the mode pill');
  assert.equal(elements.historicalBrowseLink.href, 'historic-seasons.html?sport=nfl', 'football selection should update the historical browser link');
  assert.equal(elements.historicalDraftLink.href, 'rosterbate-draft.html?sport=nfl&historical=dev', 'football selection should update the historical draft link');
  assert.equal(elements.historicalSimLink.href, 'rosterbate-simulation-setup.html?sport=nfl', 'football selection should update the simulation setup link');

  console.log('home historical sport switch test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
