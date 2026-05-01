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

function buildSeedState(slotId = SLOT_ID, options = {}) {
  const scheduleByDay = options.singleGameDay
    ? {
      1: [{ homeAbbr: 'LAL', awayAbbr: 'BOS' }],
      2: [{ homeAbbr: 'BOS', awayAbbr: 'LAL' }]
    }
    : {
      1: [
        { homeAbbr: 'LAL', awayAbbr: 'BOS' },
        { homeAbbr: 'ATL', awayAbbr: 'MIA' }
      ],
      2: [
        { homeAbbr: 'BOS', awayAbbr: 'LAL' },
        { homeAbbr: 'MIA', awayAbbr: 'ATL' }
      ]
    };
  const pendingWaiverClaim = options.pendingWaiverClaim
    ? {
      claimId: 'single-game-live-waiver',
      teamAbbr: 'LAL',
      addPlayerId: 99,
      dropPlayerId: 5,
      status: 'pending',
      processOnAdvance: 'day',
      submittedAt: 1
    }
    : null;
  const completedSingleGameLog = options.completedSingleGameDay
    ? {
      day: 1,
      homeAbbr: 'LAL',
      awayAbbr: 'BOS',
      homeName: 'Los Angeles Lakers',
      awayName: 'Boston Celtics',
      homeScore: 243,
      awayScore: 225,
      homeTotal: 243,
      awayTotal: 225,
      winner: 'home',
      homeEntries: [
        { player: makePlayer(1, 'Magic Johnson', 'LAL', 'PG', 52), finalScore: 52 },
        { player: makePlayer(2, 'Kobe Bryant', 'LAL', 'SG', 49), finalScore: 49 },
        { player: makePlayer(3, 'LeBron James', 'LAL', 'SF', 50), finalScore: 50 },
        { player: makePlayer(4, 'Pau Gasol', 'LAL', 'PF', 36), finalScore: 36 },
        { player: makePlayer(5, 'Shaquille ONeal', 'LAL', 'C', 56), finalScore: 56 }
      ],
      awayEntries: [
        { player: makePlayer(11, 'Larry Bird', 'BOS', 'SF', 51), finalScore: 51 },
        { player: makePlayer(12, 'Paul Pierce', 'BOS', 'SG', 39), finalScore: 39 },
        { player: makePlayer(13, 'Kevin McHale', 'BOS', 'PF', 38), finalScore: 38 },
        { player: makePlayer(14, 'Bill Russell', 'BOS', 'C', 43), finalScore: 43 },
        { player: makePlayer(15, 'Bob Cousy', 'BOS', 'PG', 35), finalScore: 35 }
      ]
    }
    : null;
  return {
    sport: 'nba',
    simulationMode: 'nba_mixed_era_single_player_v1',
    historicalEntryMode: 'simulation_season',
    activeSeasonBackend: 'simulation',
    historicalUniverseSlotId: slotId,
    sharedSimulationSlotId: slotId,
    leagueName: 'Playwright Live League',
    leagueShell: {
      sport: 'nba',
      anchorSeasonLabel: 'Smoke NBA',
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
        ],
        ATL: [
          makePlayer(21, 'Dominique Wilkins', 'ATL', 'SF', 47),
          makePlayer(22, 'Joe Johnson', 'ATL', 'SG', 39),
          makePlayer(23, 'Dikembe Mutombo', 'ATL', 'C', 41),
          makePlayer(24, 'Al Horford', 'ATL', 'PF', 34),
          makePlayer(25, 'Mookie Blaylock', 'ATL', 'PG', 36)
        ],
        MIA: [
          makePlayer(31, 'Dwyane Wade', 'MIA', 'SG', 48),
          makePlayer(32, 'Jimmy Butler', 'MIA', 'SF', 42),
          makePlayer(33, 'Bam Adebayo', 'MIA', 'C', 38),
          makePlayer(34, 'Chris Bosh', 'MIA', 'PF', 37),
          makePlayer(35, 'Tim Hardaway', 'MIA', 'PG', 35)
        ]
      },
      freeAgents: pendingWaiverClaim
        ? [makePlayer(99, 'James Worthy', 'LAL', 'SF', 37)]
        : []
    },
    seasonState: {
      currentDay: 1,
      currentWeek: 1,
      lineupIdsByTeam: {
        LAL: [1, 2, 3, 4, 5],
        BOS: [11, 12, 13, 14, 15],
        ATL: [21, 22, 23, 24, 25],
        MIA: [31, 32, 33, 34, 35]
      },
      standings: [
        { teamIdx: 0, teamAbbr: 'LAL', conference: 'West', division: 'Pacific', w: 0, l: 0, pf: 0, pa: 0 },
        { teamIdx: 1, teamAbbr: 'BOS', conference: 'East', division: 'Atlantic', w: 0, l: 0, pf: 0, pa: 0 },
        { teamIdx: 2, teamAbbr: 'ATL', conference: 'East', division: 'Southeast', w: 0, l: 0, pf: 0, pa: 0 },
        { teamIdx: 3, teamAbbr: 'MIA', conference: 'East', division: 'Southeast', w: 0, l: 0, pf: 0, pa: 0 }
      ],
      completedGameLogs: completedSingleGameLog ? [completedSingleGameLog] : [],
      scheduleByDay,
      pendingWaiverClaims: pendingWaiverClaim ? [pendingWaiverClaim] : [],
      recentWaiverResults: [],
      activityLog: []
    },
    postseasonState: { phase: 'regular_season' }
  };
}

async function seedLiveMatchupSeason(page, slotId, options = {}) {
  const seedState = buildSeedState(slotId, options);
  await page.goto(`${BASE_URL}/historic-universe.html?seed=${Date.now()}`, {
    waitUntil: 'domcontentloaded',
    timeout: 20000
  });
  const seeded = await page.evaluate(({ slotId, state }) => {
    if (!window.RosterBateHistoricalUniverseSlots?.upsertFromState) return null;
    localStorage.setItem('rosterbateDraft', JSON.stringify(state));
    return window.RosterBateHistoricalUniverseSlots.upsertFromState(state, { slotId });
  }, { slotId, state: seedState });
  assert.equal(seeded?.slotId, slotId, 'test seed should persist through the real slot storage API');
}

async function attachErrorCapture(page, label) {
  const errors = [];
  page.on('pageerror', (error) => {
    errors.push(`${label}: ${String(error?.stack || error?.message || error)}`);
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
  await seedLiveMatchupSeason(page, SLOT_ID);

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

  const revealPlan = await page.evaluate(() => {
    const playerTotals = new Map();
    for (const event of liveRevealEvents || []) {
      const player = event?.player;
      if (!player) continue;
      playerTotals.set(player._id, {
        name: player.name,
        target: Number(player._targetFp || 0),
        planned: Number(playerTotals.get(player._id)?.planned || 0) + Number(event.fpGain || 0)
      });
    }
    return {
      playerTotals: Array.from(playerTotals.values()),
      firstHalfCount: Array.isArray(liveRevealFirstHalfEvents) ? liveRevealFirstHalfEvents.length : 0,
      secondHalfCount: Array.isArray(liveRevealSecondHalfEvents) ? liveRevealSecondHalfEvents.length : 0,
      zeroEvents: (liveRevealEvents || []).filter((event) => Number(event?.fpGain || 0) < 0.1).length
    };
  });
  assert.equal(
    revealPlan.playerTotals.filter((entry) => entry.planned > entry.target + 0.05).length,
    0,
    'live reveal event plan should not temporarily assign a player more fantasy points than their final line'
  );
  assert.ok(revealPlan.firstHalfCount > 0, 'live reveal should allocate first-half scoring events');
  assert.ok(revealPlan.secondHalfCount > 0, 'live reveal should reserve scoring events for the second half');
  assert.equal(revealPlan.zeroEvents, 0, 'live reveal event plan should not include rounded zero-value events');

  assert.equal(await page.locator('#team-a-name').textContent(), 'Los Angeles Lakers');
  assert.equal(await page.locator('#team-b-name').textContent(), 'Boston Celtics');
  assert.ok(
    await page.locator('.live-player-portrait').count() >= 10,
    'live matchup roster rows should render player portraits'
  );
  assert.ok(
    await page.locator('.live-player-portrait img.player-portrait-img').count() >= 10,
    'live matchup roster rows should use image-backed generated portrait assets'
  );
  assert.ok(
    await page.locator('.player-showcase-card').count() >= 10,
    'live matchup roster rows should render compact player showcase cards'
  );
  assert.ok(
    await page.locator('#speed-3x').evaluate((node) => node.classList.contains('active')),
    'live matchup should default to 3x speed'
  );

  await page.locator('#speed-5x').click();
  await page.waitForFunction(
    () => (
      !document.querySelector('#overlay')?.classList.contains('hidden') &&
      document.querySelector('#overlay-title')?.textContent === 'HALFTIME'
    ),
    null,
    { timeout: 9000 }
  );
  assert.match(
    await page.locator('#overlay-sub').textContent(),
    /official result is locked/i,
    'live matchup halftime should remind users the official result is already locked'
  );
  assert.equal(
    await page.locator('#overlay-btn').textContent(),
    'Reveal 2nd Half',
    'live matchup halftime should use theatrical reveal copy'
  );
  const halftimeScores = await page.locator('.overlay-score').evaluateAll((nodes) => (
    nodes.map((node) => Number(node.textContent || 0))
  ));
  await page.locator('#overlay-btn').click();
  await page.waitForFunction(
    () => (
      !document.querySelector('#overlay')?.classList.contains('hidden') &&
      document.querySelector('#overlay-title')?.textContent === 'FINAL'
    ),
    null,
    { timeout: 12000 }
  );
  assert.equal(await page.locator('#overlay-btn').textContent(), 'Return to Season');
  assert.equal(
    await page.locator('#btn-reveal-final').evaluate((node) => getComputedStyle(node).display),
    'none',
    'Reveal Final should hide once the final result is already on screen'
  );
  const finalScores = await page.locator('.overlay-score').evaluateAll((nodes) => (
    nodes.map((node) => Number(node.textContent || 0))
  ));
  assert.ok(
    finalScores.every((score, index) => score > halftimeScores[index] + 0.05),
    `live reveal should save meaningful scoring for both teams after halftime: half=${halftimeScores.join(',')} final=${finalScores.join(',')}`
  );
  const finalPbpText = await page.locator('#pbp-body').innerText();
  assert.doesNotMatch(finalPbpText, /\+0\.0/, 'live reveal play-by-play should not include zero-value fantasy events');

  const persisted = await page.evaluate((slotId) => (
    JSON.parse(localStorage.getItem(`rbHistoricalUniverseState:${slotId}`))
  ), SLOT_ID);
  const completedGames = persisted?.seasonState?.completedGameLogs || [];
  assert.equal(completedGames.length, 1, 'live matchup should commit exactly one completed game');
  assert.deepStrictEqual(
    completedGames.map((game) => [game.homeAbbr, game.awayAbbr]),
    [['LAL', 'BOS']],
    'live matchup should commit only the selected matchup from a multi-game day'
  );
  assert.equal(
    persisted?.seasonState?.scheduleByDay?.[1]?.length,
    2,
    'test seed should keep a multi-game day after live writeback'
  );
  assert.equal(Number(persisted?.seasonState?.currentDay), 1, 'live matchup should not advance current day');
  assert.equal(
    persisted.seasonState.standings.reduce((sum, row) => sum + Number(row.w || 0) + Number(row.l || 0), 0),
    2,
    'live matchup should update standings for only the two selected teams even when the day has other games'
  );

  await page.locator('#overlay-btn').click();
  await page.waitForURL(/rosterbate-season\.html/, { timeout: 10000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.goPage && window.goPage('hub'));
  await page.waitForTimeout(750);
  const partialHubText = await page.evaluate(() => document.body.innerText);
  assert.match(
    partialHubText,
    /1 of 2 Day 1 matchups final/i,
    'hub should explain partial live day progress after selected-matchup writeback'
  );
  assert.match(
    partialHubText,
    /Finish Day/i,
    'hub should offer Finish Day after selected-matchup writeback leaves the day partially complete'
  );
  assert.doesNotMatch(
    partialHubText,
    /Reveal Day 1 Results/i,
    'hub should not keep offering Reveal Day Results once a selected live matchup is already final'
  );

  await page.evaluate(() => window.goPage && window.goPage('matchup'));
  await page.waitForTimeout(500);
  const returnedText = await page.evaluate(() => document.body.innerText);
  assert.match(returnedText, /LATEST FINAL[\s\S]*BOS \d+ at LAL \d+/);
  assert.match(returnedText, /Day 1[\s\S]{0,40}final/i);
  assert.match(
    returnedText,
    /1 of 2 Day 1 matchups final/i,
    'season matchup UI should clarify that one live result is final while the rest of a multi-game day is still open'
  );
  assert.equal(
    await page.locator('button').filter({ hasText: 'Watch Live' }).count(),
    0,
    'returning from a completed live matchup should not offer Watch Live for the same game again'
  );
  assert.match(
    returnedText,
    /Finish Day/i,
    'partial live matchup state should offer a direct finish-day action from the matchup page'
  );

  await page.locator('button:visible').filter({ hasText: 'Finish Day' }).click({ timeout: 8000 });
  await page.waitForTimeout(1500);
  const fullyPersisted = await page.evaluate((slotId) => (
    JSON.parse(localStorage.getItem(`rbHistoricalUniverseState:${slotId}`))
  ), SLOT_ID);
  const fullyCompletedGames = fullyPersisted?.seasonState?.completedGameLogs || [];
  const dayOneLogs = fullyCompletedGames.filter((game) => Number(game?.day || 0) === 1);
  assert.equal(Number(fullyPersisted?.seasonState?.currentDay), 2, 'finishing the rest of a partial live day should advance to Day 2');
  assert.equal(dayOneLogs.length, 2, 'finishing the rest of a partial live day should leave two completed Day 1 games');
  assert.equal(
    dayOneLogs.filter((game) => String(game?.homeAbbr || '').toUpperCase() === 'LAL' && String(game?.awayAbbr || '').toUpperCase() === 'BOS').length,
    1,
    'finishing the day should not duplicate the selected live matchup'
  );
  assert.equal(
    dayOneLogs.filter((game) => Number(game?.home) === 2 && Number(game?.away) === 3).length,
    1,
    'finishing the day should simulate the other scheduled matchup'
  );
  await page.evaluate(() => window.goPage && window.goPage('hub'));
  await page.waitForTimeout(750);
  const hubAfterFinishText = await page.evaluate(() => document.body.innerText);
  assert.match(hubAfterFinishText, /Open Report|Open Full Report|Latest League Report/i, 'hub should offer the latest league report after finishing a partial live day');
  await page.locator('button').filter({ hasText: /Open Report|Open Full Report|Latest League Report/i }).first().click({ timeout: 8000 });
  await page.waitForFunction(
    () => document.querySelector('#revealReportModal')?.classList.contains('open'),
    null,
    { timeout: 8000 }
  );
  const reportText = await page.locator('#revealReportModal').innerText();
  assert.match(reportText, /Day 1/i, 'latest league report should reference the finished day');
  assert.match(reportText, /2 game|2 matchup|2 archived simulation matchups/i, 'latest league report should reflect the full finished slate');
  assert.match(reportText, /Top Performers/i, 'latest league report should include top performer context');
  assert.match(reportText, /Matchup Board/i, 'latest league report should include matchup board context');
  assert.doesNotMatch(
    reportText,
    /flipped this matchup from/i,
    'latest league report should describe board movement without implying the selected matchup changed opponents'
  );
  assert.match(
    reportText,
    /matchup board lead shifted|moved in front on the matchup board|No board movement registered|lead .* to/i,
    'latest league report should frame matchup movement without selected-matchup opponent confusion'
  );
  await page.locator('#revealReportModal button').filter({ hasText: 'Close' }).first().click({ timeout: 5000 });

  await page.goto(`${BASE_URL}/historic-seasons.html?sport=nba`, {
    waitUntil: 'domcontentloaded',
    timeout: 20000
  });
  await page.waitForSelector('#savedUniversesList', { timeout: 8000 });
  await page.waitForSelector('.saved-universe-card', { timeout: 8000 });
  const archiveSlot = await page.evaluate((slotId) => window.RosterBateHistoricalUniverseSlots?.getSlot(slotId), SLOT_ID);
  assert.equal(archiveSlot?.slotId, SLOT_ID, 'live-written season should appear in the archive slot index');
  assert.equal(archiveSlot?.currentDay, 2, 'archive slot should advance after finishing the rest of a partial live day');
  assert.equal(archiveSlot?.teamName, 'Los Angeles Lakers', 'archive slot should retain the controlled team name');
  const archiveText = await page.evaluate(() => document.body.innerText);
  assert.match(archiveText, /Saved Universes/i);
  assert.match(archiveText, /Los Angeles Lakers/);
  assert.match(archiveText, /Day 2|Wk 1|Week 1/);

  await page.goto(`${BASE_URL}/historic-universe.html?sport=nba&historicalUniverse=${SLOT_ID}`, {
    waitUntil: 'domcontentloaded',
    timeout: 20000
  });
  await page.waitForSelector('#detailsShell', { timeout: 8000 });
  await page.waitForFunction(() => {
    const shell = document.querySelector('#detailsShell');
    return shell && getComputedStyle(shell).display !== 'none';
  }, null, { timeout: 8000 });
  const detailText = await page.evaluate(() => document.body.innerText);
  assert.match(detailText, /Continue Universe/i);
  assert.match(detailText, /Open Season/i);
  assert.match(detailText, /Record/i);
  assert.match(detailText, /Recent Simulation|Latest Archive Beat/i);
  assert.match(detailText, /Top lines:/i);
  assert.match(detailText, /Day 1 finished with 2 archived simulation matchups/i);

  assert.deepStrictEqual(errors, []);
  await page.close();
}

async function smokeLiveMatchupInstantReveal(browser) {
  const slotId = `${SLOT_ID}-instant`;
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = await attachErrorCapture(page, 'instant-reveal');
  await seedLiveMatchupSeason(page, slotId);

  await page.goto(
    `${BASE_URL}/rosterbate-season.html?sport=nba&simulation=nba_mixed_era&historicalUniverse=${slotId}`,
    { waitUntil: 'domcontentloaded', timeout: 20000 }
  );
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.goPage && window.goPage('matchup'));
  await page.waitForTimeout(1000);
  await page.locator('button').filter({ hasText: 'Watch Live' }).first().click({ timeout: 8000 });
  await page.waitForURL(/sim-matchup\.html/, { timeout: 10000 });

  await page.locator('#btn-reveal-final').click({ timeout: 5000 });
  await page.waitForFunction(
    () => (
      !document.querySelector('#overlay')?.classList.contains('hidden') &&
      document.querySelector('#overlay-title')?.textContent === 'FINAL'
    ),
    null,
    { timeout: 5000 }
  );
  assert.equal(await page.locator('#overlay-btn').textContent(), 'Return to Season');
  assert.equal(
    await page.locator('#btn-reveal-final').evaluate((node) => getComputedStyle(node).display),
    'none',
    'instant reveal should hide Reveal Final once the final result is already on screen'
  );
  assert.match(
    await page.locator('#overlay-sub').textContent(),
    /win!$/,
    'final overlay should use team-friendly grammar'
  );
  const finalPlayerPoints = await page.locator('.player-fp-val').evaluateAll((nodes) => (
    nodes.map((node) => Number(node.textContent || 0))
  ));
  assert.ok(
    finalPlayerPoints.some((points) => points > 0),
    'live reveal should leave visible player fantasy points on the final screen'
  );
  const finalPbpText = await page.locator('#pbp-body').innerText();
  assert.match(
    finalPbpText,
    /takes the lead|answers back|puts .* ahead|closes the gap|top line/i,
    'live reveal play-by-play should include game-state aware moments'
  );
  assert.doesNotMatch(
    finalPbpText,
    /\+0\.0/,
    'live reveal play-by-play should not include zero-value filler events'
  );
  await page.locator('#overlay-btn').click();
  await page.waitForURL(/rosterbate-season\.html/, { timeout: 10000 });
  await page.waitForTimeout(1500);

  const persisted = await page.evaluate((targetSlotId) => (
    JSON.parse(localStorage.getItem(`rbHistoricalUniverseState:${targetSlotId}`))
  ), slotId);
  assert.equal(persisted?.seasonState?.completedGameLogs?.length, 1);
  assert.equal(Number(persisted?.seasonState?.currentDay), 1);
  assert.deepStrictEqual(errors, []);
  await page.close();
}

async function smokeLiveMatchupMobileControls(browser) {
  const slotId = `${SLOT_ID}-mobile`;
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = await attachErrorCapture(page, 'mobile-controls');
  await seedLiveMatchupSeason(page, slotId);

  await page.goto(
    `${BASE_URL}/rosterbate-season.html?sport=nba&simulation=nba_mixed_era&historicalUniverse=${slotId}`,
    { waitUntil: 'domcontentloaded', timeout: 20000 }
  );
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.goPage && window.goPage('matchup'));
  await page.waitForTimeout(1000);
  await page.locator('button').filter({ hasText: 'Watch Live' }).first().click({ timeout: 8000 });
  await page.waitForURL(/sim-matchup\.html/, { timeout: 10000 });
  await page.waitForSelector('#btn-reveal-final', { timeout: 5000 });

  const layout = await page.evaluate(() => {
    const controls = document.querySelector('#controls');
    const header = document.querySelector('#header');
    const reveal = document.querySelector('#btn-reveal-final');
    const viewportWidth = document.documentElement.clientWidth;
    const controlsRect = controls?.getBoundingClientRect();
    const headerRect = header?.getBoundingClientRect();
    const revealRect = reveal?.getBoundingClientRect();
    return {
      bodyOverflow: document.documentElement.scrollWidth - viewportWidth,
      controlsOverflow: controls ? controls.scrollWidth - controls.clientWidth : 0,
      controlsRight: controlsRect?.right || 0,
      headerBottom: headerRect?.bottom || 0,
      revealWidth: revealRect?.width || 0,
      viewportWidth
    };
  });
  assert.ok(layout.bodyOverflow <= 2, `mobile live sim should not create horizontal body overflow: ${JSON.stringify(layout)}`);
  assert.ok(layout.controlsRight <= layout.viewportWidth + 2, `mobile controls should stay inside the viewport: ${JSON.stringify(layout)}`);
  assert.ok(layout.revealWidth > 0, 'Reveal Final should remain accessible on mobile');
  assert.deepStrictEqual(errors, []);
  await page.close();
}

async function smokeSeasonMatchupMobilePartialDay(browser) {
  const slotId = `${SLOT_ID}-season-mobile`;
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = await attachErrorCapture(page, 'season-mobile-partial');
  await seedLiveMatchupSeason(page, slotId);

  await page.goto(
    `${BASE_URL}/rosterbate-season.html?sport=nba&simulation=nba_mixed_era&historicalUniverse=${slotId}`,
    { waitUntil: 'domcontentloaded', timeout: 20000 }
  );
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.goPage && window.goPage('matchup'));
  await page.waitForTimeout(1000);
  await page.locator('button').filter({ hasText: 'Watch Live' }).first().click({ timeout: 8000 });
  await page.waitForURL(/sim-matchup\.html/, { timeout: 10000 });
  await page.locator('#btn-reveal-final').click({ timeout: 5000 });
  await page.waitForFunction(
    () => (
      !document.querySelector('#overlay')?.classList.contains('hidden') &&
      document.querySelector('#overlay-title')?.textContent === 'FINAL'
    ),
    null,
    { timeout: 5000 }
  );
  await page.locator('#overlay-btn').click();
  await page.waitForURL(/rosterbate-season\.html/, { timeout: 10000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.goPage && window.goPage('matchup'));
  await page.waitForTimeout(750);

  const mobileText = await page.evaluate(() => document.body.innerText);
  assert.match(mobileText, /1 of 2 Day 1 matchups final/i, 'mobile matchup page should show partial-day final copy');
  assert.match(mobileText, /Finish Day/i, 'mobile matchup page should expose Finish Day');
  const finishButtonCount = await page.locator('button:visible').filter({ hasText: 'Finish Day' }).count();
  assert.ok(finishButtonCount >= 1, 'Finish Day should be a tappable button on mobile');
  const layout = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const finish = Array.from(document.querySelectorAll('button')).find((button) => {
      if (!/Finish Day/i.test(button.textContent || '')) return false;
      const rect = button.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
    const finishRect = finish?.getBoundingClientRect();
    const matchupContent = document.querySelector('#matchupContent');
    const matchupRect = matchupContent?.getBoundingClientRect();
    return {
      bodyOverflow: document.documentElement.scrollWidth - viewportWidth,
      matchupOverflow: matchupContent ? matchupContent.scrollWidth - matchupContent.clientWidth : 0,
      finishWidth: finishRect?.width || 0,
      finishRight: finishRect?.right || 0,
      matchupRight: matchupRect?.right || 0,
      viewportWidth
    };
  });
  assert.ok(layout.bodyOverflow <= 2, `mobile matchup page should not create horizontal body overflow: ${JSON.stringify(layout)}`);
  assert.ok(layout.matchupOverflow <= 2, `mobile matchup content should not overflow its container: ${JSON.stringify(layout)}`);
  assert.ok(layout.finishWidth > 0, 'Finish Day button should have visible width on mobile');
  assert.ok(layout.finishRight <= layout.viewportWidth + 2, `Finish Day button should stay inside viewport: ${JSON.stringify(layout)}`);
  assert.ok(layout.matchupRight <= layout.viewportWidth + 2, `matchup content should stay inside viewport: ${JSON.stringify(layout)}`);
  assert.deepStrictEqual(errors, []);
  await page.close();
}

async function smokeSeasonHardRefreshPersistence(browser) {
  const slotId = `${SLOT_ID}-hard-refresh`;
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = await attachErrorCapture(page, 'season-hard-refresh');
  await seedLiveMatchupSeason(page, slotId);

  await page.goto(
    `${BASE_URL}/rosterbate-season.html?sport=nba&simulation=nba_mixed_era&historicalUniverse=${slotId}`,
    { waitUntil: 'domcontentloaded', timeout: 20000 }
  );
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.advanceWeek && window.advanceWeek());
  await page.waitForTimeout(1250);

  const persistedBeforeReload = await page.evaluate((targetSlotId) => {
    const slotRaw = localStorage.getItem(`rbHistoricalUniverseState:${targetSlotId}`);
    const draftRaw = localStorage.getItem('rosterbateDraft');
    const saveStatus = document.querySelector('#seasonSaveStatus');
    return {
      slot: slotRaw ? JSON.parse(slotRaw) : null,
      draft: draftRaw ? JSON.parse(draftRaw) : null,
      slotBytes: slotRaw ? slotRaw.length : 0,
      draftBytes: draftRaw ? draftRaw.length : 0,
      saveStatusText: saveStatus?.textContent || '',
      saveStatusClass: saveStatus?.className || ''
    };
  }, slotId);
  assert.equal(Number(persistedBeforeReload.slot?.seasonState?.currentDay), 2, 'simulated day should persist to the universe slot before reload');
  assert.equal(persistedBeforeReload.draft?.localResumePointer, true, 'simulation local resume should be a small slot pointer');
  assert.equal(persistedBeforeReload.draft?.resumeHistoricalUniverseSlotId, slotId, 'local resume pointer should target the current universe slot');
  assert.equal(Object.prototype.hasOwnProperty.call(persistedBeforeReload.slot || {}, 'allRosters'), false, 'persisted simulation slot should omit duplicate shell roster mirrors');
  assert.equal(Array.isArray(persistedBeforeReload.slot?.draftState?.draftPool) ? persistedBeforeReload.slot.draftState.draftPool.length : 0, 0, 'persisted simulation slot should not keep draft-pool bulk after draft');
  assert.ok(persistedBeforeReload.draftBytes < 1500, `local resume pointer should stay tiny: ${persistedBeforeReload.draftBytes} bytes`);
  assert.match(persistedBeforeReload.saveStatusText, /Saved just now/i, 'season shell should show a saved status after local persistence');
  assert.match(persistedBeforeReload.saveStatusClass, /saved/, 'season save status should use saved styling after local persistence');

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(2500);
  const reloaded = await page.evaluate(() => ({
    day: Number(SEASON_MODE_ADAPTER?.getState?.()?.seasonState?.currentDay || 0),
    completedGames: Number(SEASON_MODE_ADAPTER?.getState?.()?.seasonState?.completedGameLogs?.length || 0),
    text: document.body.innerText
  }));
  assert.equal(reloaded.day, 2, 'hard refresh should reopen the current persisted day');
  assert.equal(reloaded.completedGames, 2, 'hard refresh should retain completed game logs');
  assert.match(reloaded.text, /Reveal Day 2|Day 2/i, 'hard refreshed season page should render Day 2 copy');
  assert.deepStrictEqual(errors, []);
  await page.close();
}

async function smokeSingleGameLiveMatchupAdvancesDay(browser) {
  const slotId = `${SLOT_ID}-single-game-day`;
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = await attachErrorCapture(page, 'single-game-live-advance');
  await seedLiveMatchupSeason(page, slotId, { singleGameDay: true, pendingWaiverClaim: true });

  await page.goto(
    `${BASE_URL}/rosterbate-season.html?sport=nba&simulation=nba_mixed_era&historicalUniverse=${slotId}`,
    { waitUntil: 'domcontentloaded', timeout: 20000 }
  );
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.goPage && window.goPage('matchup'));
  await page.waitForTimeout(1000);
  await page.locator('button').filter({ hasText: 'Watch Live' }).first().click({ timeout: 8000 });
  await page.waitForURL(/sim-matchup\.html/, { timeout: 10000 });
  await page.locator('#btn-reveal-final').click({ timeout: 5000 });
  await page.waitForFunction(
    () => (
      !document.querySelector('#overlay')?.classList.contains('hidden') &&
      document.querySelector('#overlay-title')?.textContent === 'FINAL'
    ),
    null,
    { timeout: 5000 }
  );
  await page.locator('#overlay-btn').click();
  await page.waitForURL(/rosterbate-season\.html/, { timeout: 10000 });
  await page.waitForTimeout(1500);

  const persisted = await page.evaluate((targetSlotId) => {
    const slotRaw = localStorage.getItem(`rbHistoricalUniverseState:${targetSlotId}`);
    const slot = slotRaw ? JSON.parse(slotRaw) : null;
    return {
      day: Number(SEASON_MODE_ADAPTER?.getState?.()?.seasonState?.currentDay || 0),
      completedGames: Number(SEASON_MODE_ADAPTER?.getState?.()?.seasonState?.completedGameLogs?.length || 0),
      persistedDay: Number(slot?.seasonState?.currentDay || 0),
      pendingWaivers: Number(slot?.seasonState?.pendingWaiverClaims?.length || 0),
      rosterIds: (slot?.draftState?.rostersByTeam?.LAL || []).map((player) => Number(player?.id || 0)),
      freeAgentIds: (slot?.draftState?.freeAgents || []).map((player) => Number(player?.id || 0)),
      text: document.body.innerText
    };
  }, slotId);
  assert.equal(persisted.day, 2, 'single-game live reveal should advance the in-memory season to Day 2');
  assert.equal(persisted.persistedDay, 2, 'single-game live reveal should persist Day 2 to the universe slot');
  assert.equal(persisted.completedGames, 1, 'single-game live reveal should persist the completed Day 1 matchup once');
  assert.equal(persisted.pendingWaivers, 0, 'single-game live reveal should process day waivers through the browser runtime');
  assert.ok(persisted.rosterIds.includes(99), 'single-game live reveal should persist the awarded waiver player');
  assert.ok(persisted.freeAgentIds.includes(5), 'single-game live reveal should persist the dropped waiver player as a free agent');
  assert.match(persisted.text, /Reveal Day 2|Day 2/i, 'returning from a single-game live reveal should render Day 2 copy');
  assert.doesNotMatch(persisted.text, /1 of 1 Day 1 matchups final/i, 'single-game live reveal should not leave the shell in a partial-day state');
  assert.deepStrictEqual(errors, []);
  await page.close();
}

async function smokeCompletedLiveMatchupRepairsStuckSingleGameDay(browser) {
  const slotId = `${SLOT_ID}-stuck-completed-day`;
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = await attachErrorCapture(page, 'stuck-completed-live-advance');
  await seedLiveMatchupSeason(page, slotId, {
    singleGameDay: true,
    pendingWaiverClaim: true,
    completedSingleGameDay: true
  });

  const returnUrl = `/rosterbate-season.html?sport=nba&simulation=nba_mixed_era&historicalUniverse=${encodeURIComponent(slotId)}`;
  await page.goto(
    `${BASE_URL}/sim-matchup.html?sport=nba&historicalUniverse=${encodeURIComponent(slotId)}&day=1&homeAbbr=LAL&awayAbbr=BOS&returnUrl=${encodeURIComponent(returnUrl)}`,
    { waitUntil: 'domcontentloaded', timeout: 20000 }
  );
  await page.waitForFunction(
    () => (
      !document.querySelector('#overlay')?.classList.contains('hidden') &&
      document.querySelector('#overlay-title')?.textContent === 'FINAL'
    ),
    null,
    { timeout: 8000 }
  );
  await page.locator('#overlay-btn').click();
  await page.waitForURL(/rosterbate-season\.html/, { timeout: 10000 });
  await page.waitForTimeout(1500);

  const persisted = await page.evaluate((targetSlotId) => {
    const slotRaw = localStorage.getItem(`rbHistoricalUniverseState:${targetSlotId}`);
    const slot = slotRaw ? JSON.parse(slotRaw) : null;
    return {
      persistedDay: Number(slot?.seasonState?.currentDay || 0),
      completedGames: Number(slot?.seasonState?.completedGameLogs?.length || 0),
      pendingWaivers: Number(slot?.seasonState?.pendingWaiverClaims?.length || 0),
      rosterIds: (slot?.draftState?.rostersByTeam?.LAL || []).map((player) => Number(player?.id || 0)),
      freeAgentIds: (slot?.draftState?.freeAgents || []).map((player) => Number(player?.id || 0)),
      text: document.body.innerText
    };
  }, slotId);
  assert.equal(persisted.persistedDay, 2, 'completed live matchup reload should repair a stuck single-game day to Day 2');
  assert.equal(persisted.completedGames, 1, 'completed live matchup repair should not duplicate the already saved game');
  assert.equal(persisted.pendingWaivers, 0, 'completed live matchup repair should process pending day waivers');
  assert.ok(persisted.rosterIds.includes(99), 'completed live matchup repair should persist the awarded waiver player');
  assert.ok(persisted.freeAgentIds.includes(5), 'completed live matchup repair should persist the dropped waiver player as a free agent');
  assert.match(persisted.text, /Reveal Day 2|Day 2/i, 'completed live matchup repair should return to Day 2 season copy');
  assert.deepStrictEqual(errors, []);
  await page.close();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    await smokeStandaloneFallback(browser);
    await smokeLiveMatchupWriteback(browser);
    await smokeLiveMatchupInstantReveal(browser);
    await smokeLiveMatchupMobileControls(browser);
    await smokeSeasonMatchupMobilePartialDay(browser);
    await smokeSeasonHardRefreshPersistence(browser);
    await smokeSingleGameLiveMatchupAdvancesDay(browser);
    await smokeCompletedLiveMatchupRepairsStuckSingleGameDay(browser);
  } finally {
    await browser.close();
  }
  console.log('live matchup Playwright smoke passed');
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
