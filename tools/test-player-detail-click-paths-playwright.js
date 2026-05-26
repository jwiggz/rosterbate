const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const BASE_URL = process.env.RB_BASE_URL || 'http://127.0.0.1:8080';
const SLOT_ID = `player-detail-click-paths-${Date.now()}`;

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function makePlayer(id, name, team, pos, fp) {
  return {
    id,
    name,
    team,
    pos,
    fp,
    designation: 'ACTIVE',
    pts: 18,
    reb: 5,
    ast: 5,
    stl: 1,
    blk: 0.4,
    to: 2,
    min: 31
  };
}

function buildRoster(team, startId, names) {
  const positions = ['PG', 'SG', 'SF', 'PF', 'C', 'PG', 'SG', 'SF', 'PF', 'C', 'PG', 'SG', 'SF', 'PF', 'C'];
  return names.map((name, index) => makePlayer(startId + index, name, team, positions[index % positions.length], 44 - index * 1.5));
}

function buildSeedState(slotId) {
  const lakers = buildRoster('LAL', 100, [
    'Roster Starter',
    'Roster Bench',
    'Roster Guard',
    'Roster Wing',
    'Roster Big',
    'Roster Sixth',
    'Roster Seventh',
    'Roster Eighth',
    'Roster Ninth',
    'Roster Tenth',
    'Roster Eleventh',
    'Roster Twelfth',
    'Roster Thirteenth',
    'Roster Fourteenth',
    'Roster Fifteenth'
  ]);
  const celtics = buildRoster('BOS', 200, [
    'Opponent Starter',
    'Opponent Bench',
    'Opponent Guard',
    'Opponent Wing',
    'Opponent Big',
    'Opponent Sixth',
    'Opponent Seventh',
    'Opponent Eighth',
    'Opponent Ninth',
    'Opponent Tenth',
    'Opponent Eleventh',
    'Opponent Twelfth',
    'Opponent Thirteenth',
    'Opponent Fourteenth',
    'Opponent Fifteenth'
  ]);
  return {
    sport: 'nba',
    simulationMode: 'nba_mixed_era_single_player_v1',
    historicalEntryMode: 'simulation_season',
    activeSeasonBackend: 'simulation',
    historicalUniverseSlotId: slotId,
    sharedSimulationSlotId: slotId,
    leagueName: 'Player Detail Click QA',
    leagueShell: {
      sport: 'nba',
      teams: [
        { abbr: 'LAL', name: 'Los Angeles Lakers' },
        { abbr: 'BOS', name: 'Boston Celtics' }
      ]
    },
    draftState: {
      controlledTeamAbbr: 'LAL',
      rostersByTeam: {
        LAL: lakers,
        BOS: celtics
      },
      freeAgents: [makePlayer(500, 'Waiver Target', 'FA', 'SG', 28)]
    },
    seasonState: {
      currentDay: 1,
      currentWeek: 1,
      lineupIdsByTeam: { LAL: lakers.slice(0, 10).map((player) => player.id), BOS: celtics.slice(0, 10).map((player) => player.id) },
      standings: [
        { teamIdx: 0, teamAbbr: 'LAL', w: 0, l: 0, pf: 0, pa: 0 },
        { teamIdx: 1, teamAbbr: 'BOS', w: 0, l: 0, pf: 0, pa: 0 }
      ],
      scheduleByDay: { 1: [{ homeAbbr: 'LAL', awayAbbr: 'BOS' }] },
      completedGameLogs: [],
      activityLog: []
    },
    postseasonState: { phase: 'regular_season' }
  };
}

async function attachErrorCapture(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error?.stack || error?.message || error)));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

async function seedSeason(page, slotId) {
  const seedState = buildSeedState(slotId);
  await page.goto(`${BASE_URL}/historic-universe.html?seed=${Date.now()}`, {
    waitUntil: 'domcontentloaded',
    timeout: 20000
  });
  const seeded = await page.evaluate(({ targetSlotId, state }) => {
    localStorage.removeItem(`rbHistoricalUniverseState:${targetSlotId}`);
    localStorage.setItem('rosterbateDraft', JSON.stringify(state));
    return window.RosterBateHistoricalUniverseSlots?.upsertFromState?.(state, { slotId: targetSlotId }) || null;
  }, { targetSlotId: slotId, state: seedState });
  assert.equal(seeded?.slotId, slotId, 'seed should persist through historical universe slot storage');
}

async function openSeason(page, slotId) {
  await page.goto(`${BASE_URL}/rosterbate-season.html?sport=nba&simulation=nba_mixed_era&historicalUniverse=${slotId}`, {
    waitUntil: 'domcontentloaded',
    timeout: 20000
  });
  await page.waitForFunction(
    () => typeof SEASON_MODE_ADAPTER !== 'undefined' && Boolean(SEASON_MODE_ADAPTER?.getState?.()),
    null,
    { timeout: 10000 }
  );
}

async function assertClickOpensPlayerDetail(page, rootSelector, name, label, expectedAction) {
  await page.locator(`${rootSelector} .player-name-link`).filter({ hasText: name }).click({ timeout: 8000 });
  await page.waitForSelector('#playerDetailModal.open', { timeout: 5000 });
  const modalText = await page.locator('#playerDetailModal').innerText();
  assert.match(modalText, new RegExp(escapeRegExp(name), 'i'), `${label}: modal should show ${name}`);
  assert.match(modalText, /STATS/i, `${label}: modal should show stats`);
  assert.match(modalText, /PLAYER TIMELINE/i, `${label}: modal should show timeline`);
  assert.match(modalText, new RegExp(escapeRegExp(expectedAction), 'i'), `${label}: modal should expose ${expectedAction}`);
  await page.evaluate(() => window.closePlayerDetailModal && window.closePlayerDetailModal());
}

async function clickWaiverDetailAddUsesSimulationShell(page) {
  await page.evaluate(() => window.closeViewerModal && window.closeViewerModal());
  await page.evaluate(() => window.goPage && window.goPage('waiver'));
  await page.waitForSelector('#waiverContent .player-name-link', { timeout: 8000 });
  await page.locator('#waiverContent .player-name-link').filter({ hasText: 'Waiver Target' }).click({ timeout: 8000 });
  await page.waitForSelector('#playerDetailModal.open', { timeout: 5000 });
  await page.locator('#playerDetailModal button').filter({ hasText: /^Add Player$/ }).click({ timeout: 5000 });
  await page.waitForSelector('#waiver.active #waiverContent', { timeout: 5000 });
  const waiverContent = page.locator('#waiverContent');
  await page.waitForFunction(
    () => {
      const content = document.querySelector('#waiverContent');
      return content?.innerText?.includes('Waiver Target')
        && Boolean(content.querySelector('button[onclick*="submitSimulationWaiverClaimFromShell(500"]'));
    },
    null,
    { timeout: 8000 }
  );
  const text = await waiverContent.innerText();
  assert.match(text, /Waiver Target/i, 'Add Player should keep the target visible on the simulation waiver page');
  assert.match(text, /Submit Claim/i, 'Add Player should expose the simulation submit claim button');
  assert.equal(await page.locator('#wModal.open').count(), 0, 'Add Player should not open the legacy waiver modal');
  assert.equal(await page.locator('#playerDetailModal.open').count(), 0, 'Add Player should close the player detail modal');
}

async function clickOpponentDetailTradeUsesSimulationShell(page) {
  await page.evaluate(() => window.closeViewerModal && window.closeViewerModal());
  await page.evaluate(() => window.openViewer && window.openViewer(1));
  await page.waitForSelector('#viewerModal.open .player-name-link', { timeout: 8000 });
  await page.locator('#viewerModal .player-name-link').filter({ hasText: 'Opponent Starter' }).click({ timeout: 8000 });
  await page.waitForSelector('#playerDetailModal.open', { timeout: 5000 });
  await page.locator('#playerDetailModal button').filter({ hasText: /^Propose Trade$/ }).click({ timeout: 5000 });
  await page.waitForSelector('#trades.active #tradesContent', { timeout: 5000 });
  await page.waitForFunction(
    () => {
      const content = document.querySelector('#tradesContent');
      const text = String(content?.innerText || '').toLowerCase();
      return content?.innerText?.includes('Trade Desk')
        && text.includes('boston celtics')
        && text.includes('build trade');
    },
    null,
    { timeout: 8000 }
  );
  const tradesText = await page.locator('#tradesContent').innerText();
  assert.match(tradesText, /Trade Desk/i, 'Propose Trade should navigate to the simulation trade desk');
  assert.match(tradesText, /Boston Celtics/i, 'Propose Trade should show the opponent partner lane');
  assert.match(tradesText, /Build Trade/i, 'Propose Trade should expose the simulation trade builder flow');
  await page.waitForSelector('#simulationTradeBuilderModal', { timeout: 5000 });
  const builderText = await page.locator('#simulationTradeBuilderModal').innerText();
  assert.match(builderText, /Trade With Boston Celtics/i, 'Propose Trade should open the simulation builder for the opponent partner');
  assert.match(builderText, /Opponent Starter/i, 'Propose Trade should expose the clicked opponent roster in the simulation builder');
  assert.equal(await page.locator('#localTradeBuilderModal').count(), 0, 'Propose Trade should not open the legacy trade modal');
  assert.equal(await page.locator('#playerDetailModal.open').count(), 0, 'Propose Trade should close the player detail modal');
  assert.equal(await page.locator('#viewerModal.open').count(), 0, 'Propose Trade should close the opponent viewer overlay');
  await page.evaluate(() => document.getElementById('simulationTradeBuilderModal')?.remove());
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const errors = await attachErrorCapture(page);
  try {
    await seedSeason(page, SLOT_ID);
    await openSeason(page, SLOT_ID);

    await page.evaluate(() => window.goPage && window.goPage('roster'));
    await page.waitForSelector('#rosterContent .player-name-link', { timeout: 8000 });
    await assertClickOpensPlayerDetail(page, '#rosterContent', 'Roster Starter', 'My Team', 'Drop Player');

    await page.evaluate(() => window.goPage && window.goPage('waiver'));
    await page.waitForSelector('#waiverContent .player-name-link', { timeout: 8000 });
    await assertClickOpensPlayerDetail(page, '#waiverContent', 'Waiver Target', 'Waivers', 'Add Player');

    await page.evaluate(() => window.openViewer && window.openViewer(1));
    await page.waitForSelector('#viewerModal.open .player-name-link', { timeout: 8000 });
    await assertClickOpensPlayerDetail(page, '#viewerModal', 'Opponent Starter', 'Opponent viewer', 'Propose Trade');

    await clickWaiverDetailAddUsesSimulationShell(page);
    await clickOpponentDetailTradeUsesSimulationShell(page);

    assert.deepStrictEqual(errors, []);
  } finally {
    await browser.close();
  }
  console.log('player detail click-path Playwright smoke passed');
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
