const assert = require('node:assert/strict');
const { chromium } = require('playwright');

const BASE_URL = process.env.RB_BASE_URL || 'http://localhost:8080';
const SLOT_ID = 'playwright-trade-application-smoke';

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

function buildFreeAgents() {
  return buildRoster('FA', 500, [
    'Free Agent Ace',
    'Waiver Wing',
    'Bench Streamer',
    'Spot Starter',
    'Depth Big',
    'Utility Guard',
    'Reserve Forward',
    'Practice Center'
  ]);
}

function buildSeedState(slotId = SLOT_ID) {
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
    leagueName: 'Playwright Trade League',
    leagueShell: {
      sport: 'nba',
      anchorSeasonLabel: 'Trade QA NBA',
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
      freeAgents: buildFreeAgents()
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
      activityLog: []
    },
    postseasonState: { phase: 'regular_season' }
  };
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

async function seedTradeSeason(page, slotId) {
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
  assert.equal(seeded?.slotId, slotId, 'trade test seed should persist through the real slot storage API');
}

async function openSeason(page, slotId) {
  await page.goto(
    `${BASE_URL}/rosterbate-season.html?sport=nba&simulation=nba_mixed_era&historicalUniverse=${slotId}`,
    { waitUntil: 'domcontentloaded', timeout: 20000 }
  );
  await page.waitForFunction(
    () => typeof SEASON_MODE_ADAPTER !== 'undefined' && Boolean(SEASON_MODE_ADAPTER?.getState?.()),
    null,
    { timeout: 10000 }
  );
}

async function openTradeBuilderForBoston(page) {
  await page.evaluate(() => window.goPage && window.goPage('trades'));
  await page.waitForSelector('#tradesContent', { timeout: 8000 });
  await page.locator('#tradesContent button').filter({ hasText: 'Build Trade' }).first().click({ timeout: 8000 });
  await page.waitForSelector('#simulationTradeBuilderModal', { timeout: 5000 });
}

async function selectTradePlayers(page, names) {
  for (const name of names) {
    await page.getByRole('checkbox', { name: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).check({ timeout: 5000 });
  }
}

async function getTradeSmokeSnapshot(page, slotId) {
  return page.evaluate((targetSlotId) => {
    const state = SEASON_MODE_ADAPTER?.getState?.();
    const persisted = JSON.parse(localStorage.getItem(`rbHistoricalUniverseState:${targetSlotId}`) || 'null');
    const activityLog = Array.isArray(persisted?.seasonState?.activityLog) ? persisted.seasonState.activityLog : [];
    const tradeEntry = activityLog.find((entry) => entry?.type === 'trade') || null;
    return {
      lakers: (state?.draftState?.rostersByTeam?.LAL || []).map((player) => player.name),
      celtics: (state?.draftState?.rostersByTeam?.BOS || []).map((player) => player.name),
      freeAgents: (state?.draftState?.freeAgents || []).map((player) => player.name),
      lakersCount: state?.draftState?.rostersByTeam?.LAL?.length,
      celticsCount: state?.draftState?.rostersByTeam?.BOS?.length,
      activityTypes: activityLog.map((entry) => entry?.type).filter(Boolean),
      persistedFeedback: tradeEntry?.tradeDeskFeedback || null
    };
  }, slotId);
}

function assertRosterState(snapshot, scenario, label) {
  assert.equal(snapshot.lakersCount, 15, `${label}: controlled roster should keep 15 players`);
  assert.equal(snapshot.celticsCount, 15, `${label}: partner roster should keep 15 players`);
  scenario.incomingNames.forEach((name) => {
    assert.ok(snapshot.lakers.includes(name), `${label}: controlled roster should receive ${name}`);
    assert.ok(!snapshot.celtics.includes(name), `${label}: partner roster should send ${name}`);
  });
  scenario.outgoingNames.forEach((name) => {
    assert.ok(!snapshot.lakers.includes(name), `${label}: controlled roster should send ${name}`);
    assert.ok(snapshot.celtics.includes(name), `${label}: partner roster should receive ${name}`);
  });
  (scenario.expectedControlledAdds || []).forEach((name) => {
    assert.ok(snapshot.lakers.includes(name), `${label}: controlled roster should add ${name} as replacement depth`);
  });
  assert.equal(snapshot.persistedFeedback?.message, scenario.expectedMessage, `${label}: persisted feedback should describe the applied package`);
}

async function runTradeApplicationScenario(browser, scenario) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = await attachErrorCapture(page, scenario.label);
  await seedTradeSeason(page, scenario.slotId);
  await openSeason(page, scenario.slotId);

  await openTradeBuilderForBoston(page);
  await selectTradePlayers(page, scenario.outgoingNames.concat(scenario.incomingNames));

  const previewText = await page.locator('#simulationTradeBuilderModal').innerText();
  assert.match(previewText, /Looks fair/i, 'trade modal should mark the selected package fair');
  assert.match(previewText, /Fairness check:/i, 'trade modal should explain the fair package totals');
  if (scenario.expectReplacementContext) {
    assert.match(previewText, /Waiver replacement value uses|Replacement context:/i, 'uneven trade modal should explain waiver replacement context');
  }
  await page.locator('#simulationTradeBuilderModal button').filter({ hasText: 'Apply Trade' }).click({ timeout: 5000 });

  await page.waitForFunction(
    (message) => document.body.innerText.includes(message),
    scenario.expectedMessage,
    { timeout: 8000 }
  );
  assertRosterState(await getTradeSmokeSnapshot(page, scenario.slotId), scenario, `${scenario.label} immediate`);

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForFunction(
    () => typeof SEASON_MODE_ADAPTER !== 'undefined' && Boolean(SEASON_MODE_ADAPTER?.getState?.()),
    null,
    { timeout: 10000 }
  );
  await page.evaluate(() => window.goPage && window.goPage('roster'));
  await page.waitForSelector('#rosterContent', { timeout: 8000 });
  const reloadedRosterText = await page.locator('#rosterContent').innerText();
  scenario.incomingNames.forEach((name) => {
    assert.match(reloadedRosterText, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `hard reloaded My Team should show ${name}`);
  });
  scenario.outgoingNames.forEach((name) => {
    assert.doesNotMatch(reloadedRosterText, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `hard reloaded My Team roster rows should omit ${name}`);
  });

  await page.evaluate(() => window.goPage && window.goPage('trades'));
  await page.waitForSelector('#tradesContent', { timeout: 8000 });
  const reloadedTradeText = await page.locator('#tradesContent').innerText();
  assert.match(reloadedTradeText, /Boston Celtics[\s\S]*15 rostered/i);
  assert.match(reloadedTradeText, new RegExp(scenario.expectedMessage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(reloadedTradeText, /Fairness check:/);

  assertRosterState(await getTradeSmokeSnapshot(page, scenario.slotId), scenario, `${scenario.label} reload`);
  assert.deepStrictEqual(errors, []);
  await page.close();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    await runTradeApplicationScenario(browser, {
      label: 'trade-application-1-for-1',
      slotId: `${SLOT_ID}-one-for-one`,
      outgoingNames: ['LeBron James'],
      incomingNames: ['Larry Bird'],
      expectedMessage: 'Trade applied: LeBron James for Larry Bird.'
    });
    await runTradeApplicationScenario(browser, {
      label: 'trade-application-2-for-1',
      slotId: `${SLOT_ID}-two-for-one`,
      outgoingNames: ['Robert Horry', 'Wilt Chamberlain'],
      incomingNames: ['Larry Bird'],
      expectedMessage: 'Trade applied: Robert Horry + Wilt Chamberlain for Larry Bird.',
      expectedControlledAdds: ['Free Agent Ace'],
      expectReplacementContext: true
    });
    await runTradeApplicationScenario(browser, {
      label: 'trade-application-5-for-5',
      slotId: `${SLOT_ID}-five-for-five`,
      outgoingNames: ['Magic Johnson', 'Kobe Bryant', 'LeBron James', 'Pau Gasol', 'Shaquille ONeal'],
      incomingNames: ['Larry Bird', 'Jayson Tatum', 'Paul Pierce', 'Kevin McHale', 'Bill Russell'],
      expectedMessage: 'Trade applied: Magic Johnson + Kobe Bryant + LeBron James + Pau Gasol + Shaquille ONeal for Larry Bird + Jayson Tatum + Paul Pierce + Kevin McHale + Bill Russell.'
    });
  } finally {
    await browser.close();
  }
  console.log('trade application Playwright smoke passed');
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
