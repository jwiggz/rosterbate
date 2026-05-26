const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const BASE_URL = process.env.RB_BASE_URL || 'http://127.0.0.1:8080';
const SLOT_ID = `player-detail-post-action-${Date.now()}`;
const SCREENSHOT_DIR = path.join(__dirname, '..', 'tmp');

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
    mixedEraOverall: Math.round(65 + Number(fp || 0) / 2),
    pts: Math.max(6, Math.round(Number(fp || 0) * 0.45)),
    reb: ['C', 'PF'].includes(pos) ? 8 : 4,
    ast: pos === 'PG' ? 8 : 4,
    stl: 1,
    blk: pos === 'C' ? 1.2 : 0.4,
    to: 2,
    min: 30,
    fgm: 6,
    fga: 13,
    ftm: 3,
    fta: 4,
    tpm: pos === 'C' ? 0.3 : 1.8
  };
}

function buildRoster(team, startId, names) {
  const positions = ['PG', 'SG', 'SF', 'PF', 'C', 'PG', 'SG', 'SF', 'PF', 'C', 'PG', 'SG', 'SF', 'PF', 'C'];
  return names.map((name, index) => makePlayer(startId + index, name, team, positions[index % positions.length], 48 - index * 1.8));
}

function buildSeedState(slotId) {
  const lakers = buildRoster('LAL', 100, [
    'Magic Johnson',
    'Kobe Bryant',
    'LeBron James',
    'Pau Gasol',
    'Shaquille ONeal',
    'James Worthy',
    'Anthony Davis',
    'Jerry West',
    'Elgin Baylor',
    'Gail Goodrich',
    'Byron Scott',
    'Derek Fisher',
    'Lamar Odom',
    'Robert Horry',
    'Wilt Chamberlain'
  ]);
  const celtics = buildRoster('BOS', 200, [
    'Larry Bird',
    'Jayson Tatum',
    'Paul Pierce',
    'Kevin McHale',
    'Bill Russell',
    'Bob Cousy',
    'Jaylen Brown',
    'Sam Jones',
    'Robert Parish',
    'Dave Cowens',
    'Jo Jo White',
    'Marcus Smart',
    'Al Horford',
    'Tom Heinsohn',
    'Dennis Johnson'
  ]);
  const hawks = buildRoster('ATL', 300, [
    'Dominique Wilkins',
    'Trae Young',
    'Joe Johnson',
    'Dikembe Mutombo',
    'Al Horford',
    'Mookie Blaylock',
    'Paul Millsap',
    'Lou Hudson',
    'Cliff Hagan',
    'Doc Rivers',
    'Josh Smith',
    'Steve Smith',
    'Kyle Korver',
    'Spud Webb',
    'Kevin Willis'
  ]);
  const heat = buildRoster('MIA', 400, [
    'Dwyane Wade',
    'Jimmy Butler',
    'Bam Adebayo',
    'Chris Bosh',
    'Tim Hardaway',
    'Alonzo Mourning',
    'Glen Rice',
    'Tyler Herro',
    'Goran Dragic',
    'Udonis Haslem',
    'Shaun Livingston',
    'Eddie Jones',
    'Mario Chalmers',
    'Shane Battier',
    'P.J. Brown'
  ]);
  return {
    sport: 'nba',
    simulationMode: 'nba_mixed_era_single_player_v1',
    historicalEntryMode: 'simulation_season',
    activeSeasonBackend: 'simulation',
    historicalUniverseSlotId: slotId,
    sharedSimulationSlotId: slotId,
    leagueName: 'Player Detail Post Action QA',
    leagueShell: {
      sport: 'nba',
      anchorSeasonLabel: 'Post Action QA NBA',
      teams: [
        { abbr: 'LAL', name: 'Los Angeles Lakers', conference: 'West', division: 'Pacific' },
        { abbr: 'BOS', name: 'Boston Celtics', conference: 'East', division: 'Atlantic' },
        { abbr: 'ATL', name: 'Atlanta Hawks', conference: 'East', division: 'Southeast' },
        { abbr: 'MIA', name: 'Miami Heat', conference: 'East', division: 'Southeast' }
      ]
    },
    draftState: {
      controlledTeamAbbr: 'LAL',
      rostersByTeam: {
        LAL: lakers,
        BOS: celtics,
        ATL: hawks,
        MIA: heat
      },
      freeAgents: [
        makePlayer(500, 'Free Agent Ace', 'FA', 'SG', 39),
        makePlayer(501, 'Waiver Wing', 'FA', 'SF', 34),
        makePlayer(502, 'Depth Big', 'FA', 'C', 28)
      ]
    },
    seasonState: {
      currentDay: 1,
      currentWeek: 1,
      lineupIdsByTeam: {
        LAL: lakers.slice(0, 10).map((player) => player.id),
        BOS: celtics.slice(0, 10).map((player) => player.id),
        ATL: hawks.slice(0, 10).map((player) => player.id),
        MIA: heat.slice(0, 10).map((player) => player.id)
      },
      standings: [
        { teamIdx: 0, teamAbbr: 'LAL', conference: 'West', division: 'Pacific', w: 0, l: 0, pf: 0, pa: 0 },
        { teamIdx: 1, teamAbbr: 'BOS', conference: 'East', division: 'Atlantic', w: 0, l: 0, pf: 0, pa: 0 },
        { teamIdx: 2, teamAbbr: 'ATL', conference: 'East', division: 'Southeast', w: 0, l: 0, pf: 0, pa: 0 },
        { teamIdx: 3, teamAbbr: 'MIA', conference: 'East', division: 'Southeast', w: 0, l: 0, pf: 0, pa: 0 }
      ],
      completedGameLogs: [],
      scheduleByDay: {
        1: [
          { homeAbbr: 'LAL', awayAbbr: 'BOS' },
          { homeAbbr: 'ATL', awayAbbr: 'MIA' }
        ]
      },
      activityLog: [],
      pendingWaiverClaims: [],
      recentWaiverResults: []
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
  await page.goto(`${BASE_URL}/rosterbate-season.html?sport=nba&simulation=nba_mixed_era&historicalUniverse=${slotId}&qa=${Date.now()}`, {
    waitUntil: 'domcontentloaded',
    timeout: 20000
  });
  await page.waitForFunction(
    () => typeof SEASON_MODE_ADAPTER !== 'undefined' && Boolean(SEASON_MODE_ADAPTER?.getState?.()),
    null,
    { timeout: 10000 }
  );
}

async function applyTradeForLarryBird(page) {
  await page.evaluate(() => window.goPage && window.goPage('trades'));
  await page.waitForSelector('#tradesContent', { timeout: 8000 });
  await page.locator('#tradesContent button').filter({ hasText: 'Build Trade' }).first().click({ timeout: 8000 });
  await page.waitForSelector('#simulationTradeBuilderModal', { timeout: 5000 });
  await page.getByRole('checkbox', { name: 'LeBron James' }).check({ timeout: 5000 });
  await page.getByRole('checkbox', { name: 'Larry Bird' }).check({ timeout: 5000 });
  await page.locator('#simulationTradeBuilderModal button').filter({ hasText: 'Apply Trade' }).click({ timeout: 5000 });
  await page.waitForFunction(
    () => document.body.innerText.includes('Trade applied: LeBron James for Larry Bird.'),
    null,
    { timeout: 8000 }
  );
}

async function submitAndProcessWaiverAdd(page) {
  await page.evaluate(() => window.goPage && window.goPage('waiver'));
  await page.waitForSelector('#waiverContent', { timeout: 8000 });
  await page.waitForSelector('#simulation-waiver-drop-select-500', { timeout: 8000 });
  const dropValue = await page.locator('#simulation-waiver-drop-select-500 option').evaluateAll((options) => {
    const option = options.find((candidate) => /Robert Horry/i.test(candidate.textContent || ''));
    return option ? option.value : '';
  });
  assert.ok(dropValue, 'waiver claim should offer Robert Horry as a drop option');
  for (const selector of ['#simulation-waiver-drop-select-500', '#simulation-waiver-radar-drop-select-500']) {
    if (await page.locator(selector).count()) {
      await page.locator(selector).selectOption(dropValue);
    }
  }
  const claimButton = page.locator('button[onclick*="submitSimulationWaiverClaimFromShell(500"]');
  assert.ok(await claimButton.count(), 'waiver page should render a submit button for Free Agent Ace');
  await claimButton.first().click({ timeout: 8000 });
  await page.waitForFunction(
    () => SEASON_MODE_ADAPTER?.getState?.()?.seasonState?.pendingWaiverClaims?.length === 1,
    null,
    { timeout: 8000 }
  );
  await page.evaluate(() => {
    SEASON_MODE_ADAPTER.simulateNextDay();
    if (typeof persistSimulationSeasonState === 'function') persistSimulationSeasonState('qa_process_waiver_claim');
    if (typeof renderSimulationWaiverInSharedShell === 'function') renderSimulationWaiverInSharedShell();
    if (typeof renderSimulationRosterInSharedShell === 'function') renderSimulationRosterInSharedShell();
    if (typeof renderSimulationHubInSharedShell === 'function') renderSimulationHubInSharedShell();
  });
  await page.waitForFunction(
    () => {
      const state = SEASON_MODE_ADAPTER?.getState?.();
      const roster = state?.draftState?.rostersByTeam?.LAL || [];
      const freeAgents = state?.draftState?.freeAgents || [];
      return roster.some((player) => player.name === 'Free Agent Ace')
        && freeAgents.some((player) => player.name === 'Robert Horry')
        && state?.seasonState?.recentWaiverResults?.[0]?.status === 'approved';
    },
    null,
    { timeout: 8000 }
  );
}

async function openRosterDossier(page, playerName) {
  await page.evaluate(() => window.goPage && window.goPage('roster'));
  await page.waitForSelector('#rosterContent .player-name-link', { timeout: 8000 });
  await page.locator('#rosterContent .player-name-link').filter({ hasText: playerName }).click({ timeout: 8000 });
  await page.waitForSelector('#playerDetailModal.open', { timeout: 5000 });
  return page.locator('#playerDetailModal').innerText();
}

async function openWaiverDossier(page, playerName) {
  await page.evaluate(() => window.goPage && window.goPage('waiver'));
  await page.waitForSelector('#waiverContent .player-name-link', { timeout: 8000 });
  await page.locator('#waiverContent .player-name-link').filter({ hasText: playerName }).click({ timeout: 8000 });
  await page.waitForSelector('#playerDetailModal.open', { timeout: 5000 });
  return page.locator('#playerDetailModal').innerText();
}

async function closeDossier(page) {
  await page.evaluate(() => window.closePlayerDetailModal && window.closePlayerDetailModal());
}

async function main() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const errors = await attachErrorCapture(page);
  try {
    await seedSeason(page, SLOT_ID);
    await openSeason(page, SLOT_ID);
    await applyTradeForLarryBird(page);

    const tradeDossier = await openRosterDossier(page, 'Larry Bird');
    assert.match(tradeDossier, /Drop Player/i, 'acquired player should now act like a rostered player');
    assert.match(tradeDossier, /Player Timeline/i, 'acquired player should show a timeline');
    assert.match(tradeDossier, /Traded with Boston Celtics/i, 'acquired player should show trade partner');
    assert.match(tradeDossier, /Larry Bird was traded from Boston Celtics to Los Angeles Lakers\./i);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'player-detail-post-trade-dossier.png'), fullPage: false });
    await closeDossier(page);

    await submitAndProcessWaiverAdd(page);

    const waiverAddDossier = await openRosterDossier(page, 'Free Agent Ace');
    assert.match(waiverAddDossier, /Drop Player/i, 'waiver add should now act like a rostered player');
    assert.match(waiverAddDossier, /Added by Los Angeles Lakers/i);
    assert.match(waiverAddDossier, /Free Agent Ace was added from waivers\. Robert Horry was dropped\./i);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'player-detail-post-waiver-add-dossier.png'), fullPage: false });
    await closeDossier(page);

    const droppedDossier = await openWaiverDossier(page, 'Robert Horry');
    assert.match(droppedDossier, /Add Player/i, 'dropped player should now act like an available waiver player');
    assert.match(droppedDossier, /Manager\s+Free Agent/i, 'dropped player should no longer show stale roster ownership');
    assert.match(droppedDossier, /Slot\s+--/i, 'dropped player should not show a stale roster slot');
    assert.match(droppedDossier, /Dropped by Los Angeles Lakers/i);
    assert.match(droppedDossier, /Robert Horry was dropped to make room for Free Agent Ace\./i);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'player-detail-post-waiver-drop-dossier.png'), fullPage: false });
    await closeDossier(page);

    assert.deepStrictEqual(errors, []);
  } finally {
    await browser.close();
  }
  console.log('player detail post-action browser QA passed');
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
