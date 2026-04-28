const assert = require('assert');
const { chromium } = require('playwright');

const BASE_URL = process.env.RB_BASE_URL || 'http://localhost:8080';
const SLOT_ID = 'playwright-live-matchup-smoke';

function makePlayer(id, name, team, pos, fp) {
  return {
    id,
    name,
    team,
    pos,
    fp,
    designation: 'ACTIVE',
    mixedEraOverall: 90,
    pts: 20,
    reb: pos === 'C' || pos === 'PF' ? 9 : 5,
    ast: pos === 'PG' ? 9 : 4,
    stl: 1,
    blk: pos === 'C' ? 1.5 : 0.5,
    to: 2,
    min: 30,
    fgm: 6,
    fga: 13,
    ftm: 3,
    fta: 4,
    tpm: pos === 'C' ? 0.2 : 1.8
  };
}

function buildSeedState() {
  return {
    sport: 'nba',
    simulationMode: 'nba_mixed_era_single_player_v1',
    historicalEntryMode: 'simulation_season',
    activeSeasonBackend: 'simulation',
    historicalUniverseSlotId: SLOT_ID,
    sharedSimulationSlotId: SLOT_ID,
    leagueName: 'Playwright Live League',
    leagueShell: {
      sport: 'nba',
      anchorSeasonLabel: 'Smoke NBA',
      teams: [
        { abbr: 'LAL', name: 'Los Angeles Lakers', conference: 'West', division: 'Pacific' },
        { abbr: 'BOS', name: 'Boston Celtics', conference: 'East', division: 'Atlantic' }
      ]
    },
    draftState: {
      controlledTeamAbbr: 'LAL',
      rostersByTeam: {
        LAL: [
          makePlayer(1, 'Magic Johnson', 'LAL', 'PG', 52),
          makePlayer(2, 'Kobe Bryant', 'LAL', 'SG', 49),
          makePlayer(3, 'LeBron James', 'LAL', 'SF', 50),
          makePlayer(4, 'Pau Gasol', 'LAL', 'PF', 36),
          makePlayer(5, 'Shaquille ONeal', 'LAL', 'C', 56)
        ],
        BOS: [
          makePlayer(11, 'Larry Bird', 'BOS', 'SF', 51),
          makePlayer(12, 'Paul Pierce', 'BOS', 'SG', 39),
          makePlayer(13, 'Kevin McHale', 'BOS', 'PF', 38),
          makePlayer(14, 'Bill Russell', 'BOS', 'C', 43),
          makePlayer(15, 'Bob Cousy', 'BOS', 'PG', 35)
        ]
      },
      freeAgents: []
    },
    seasonState: {
      currentDay: 1,
      currentWeek: 1,
      lineupIdsByTeam: { LAL: [1, 2, 3, 4, 5], BOS: [11, 12, 13, 14, 15] },
      standings: [
        { teamIdx: 0, teamAbbr: 'LAL', conference: 'West', division: 'Pacific', w: 0, l: 0, pf: 0, pa: 0 },
        { teamIdx: 1, teamAbbr: 'BOS', conference: 'East', division: 'Atlantic', w: 0, l: 0, pf: 0, pa: 0 }
      ],
      completedGameLogs: [],
      scheduleByDay: {
        1: [{ homeAbbr: 'LAL', awayAbbr: 'BOS' }],
        2: [{ homeAbbr: 'BOS', awayAbbr: 'LAL' }]
      },
      activityLog: []
    },
    postseasonState: { phase: 'regular_season' }
  };
}

async function attachErrorCapture(page, label) {
  const errors = [];
  page.on('pageerror', (error) => {
    errors.push(`${label}: ${String(error?.message || error)}`);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(`${label}: ${message.text()}`);
    }
  });
  return errors;
}

async function smokeStandaloneFallback(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = await attachErrorCapture(page, 'standalone');
  await page.goto(`${BASE_URL}/sim-matchup.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForSelector('#score-a', { timeout: 5000 });
  assert.equal(await page.title(), 'RosterBate · Live Sim');
  assert.deepStrictEqual(errors, []);
  await page.close();
}

async function smokeLiveMatchupWriteback(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = await attachErrorCapture(page, 'live-matchup');
  const seedState = buildSeedState();
  await page.addInitScript(({ slotId, state }) => {
    localStorage.setItem(`rbHistoricalUniverseState:${slotId}`, JSON.stringify(state));
    localStorage.setItem('rbHistoricalUniverseSlots', JSON.stringify([
      { slotId, sport: 'nba', title: 'Playwright Live League', updatedAt: Date.now() }
    ]));
    localStorage.setItem('rosterbateDraft', JSON.stringify(state));
  }, { slotId: SLOT_ID, state: seedState });

  await page.goto(
    `${BASE_URL}/rosterbate-season.html?sport=nba&simulation=nba_mixed_era&historicalUniverse=${SLOT_ID}`,
    { waitUntil: 'domcontentloaded', timeout: 20000 }
  );
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.goPage && window.goPage('matchup'));
  await page.waitForTimeout(1000);
  await page.locator('button').filter({ hasText: 'Watch Live' }).first().click({ timeout: 8000 });
  await page.waitForURL(/sim-matchup\.html/, { timeout: 10000 });
  await page.waitForSelector('#team-a-name', { timeout: 5000 });

  assert.equal(await page.locator('#team-a-name').textContent(), 'Los Angeles Lakers');
  assert.equal(await page.locator('#team-b-name').textContent(), 'Boston Celtics');

  await page.locator('#speed-5x').click();
  await page.waitForFunction(
    () => document.querySelector('#overlay-title')?.textContent === 'HALFTIME',
    null,
    { timeout: 9000 }
  );
  await page.locator('#overlay-btn').click();
  await page.waitForFunction(
    () => document.querySelector('#overlay-title')?.textContent === 'FINAL',
    null,
    { timeout: 12000 }
  );
  assert.equal(await page.locator('#overlay-btn').textContent(), 'Return to Season');

  const persisted = await page.evaluate((slotId) => (
    JSON.parse(localStorage.getItem(`rbHistoricalUniverseState:${slotId}`))
  ), SLOT_ID);
  const completedGames = persisted?.seasonState?.completedGameLogs || [];
  assert.equal(completedGames.length, 1, 'live matchup should commit exactly one completed game');
  assert.equal(Number(persisted?.seasonState?.currentDay), 1, 'live matchup should not advance current day');
  assert.equal(
    persisted.seasonState.standings.reduce((sum, row) => sum + Number(row.w || 0) + Number(row.l || 0), 0),
    2,
    'live matchup should update standings for only the two selected teams'
  );

  await page.locator('#overlay-btn').click();
  await page.waitForURL(/rosterbate-season\.html/, { timeout: 10000 });
  await page.waitForTimeout(1500);
  const returnedText = await page.evaluate(() => document.body.innerText);
  assert.match(returnedText, /Latest Final|Selected Result|LAL|BOS/);
  assert.deepStrictEqual(errors, []);
  await page.close();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    await smokeStandaloneFallback(browser);
    await smokeLiveMatchupWriteback(browser);
  } finally {
    await browser.close();
  }
  console.log('live matchup Playwright smoke passed');
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
