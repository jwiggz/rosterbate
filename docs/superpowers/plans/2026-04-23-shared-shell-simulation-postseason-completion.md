# Shared Shell Simulation Postseason Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend mixed-era NBA simulation leagues from `postseason_ready` to a full day-by-day modern NBA play-in, playoff, Finals, and champion flow inside the shared season shell.

**Architecture:** Keep [`simulation-season-adapter.js`](simulation-season-adapter.js) as the postseason state machine and daily scheduler, then add a thin `Playoffs` rendering lane in [`rosterbate-season.html`](rosterbate-season.html) that only consumes adapter view models. Persist the richer `postseasonState` through the existing historical-universe slot path so saved universes can reopen mid-playoffs or after the championship without any special-case boot flow.

**Tech Stack:** Vanilla JavaScript, existing browser HTML shell, Node-based regression tests in `tools/`, PowerShell, git

---

## File Map

- Modify: `simulation-season-adapter.js`
  - Extend nav items so `playoffs` appears once the season leaves `regular_season`
  - Seed play-in state from final standings
  - Simulate postseason game days one calendar day at a time
  - Advance best-of-7 series and Finals completion
  - Expose a new `getPlayoffsViewModel()` for the shared shell

- Modify: `rosterbate-season.html`
  - Add a `Playoffs` screen and nav wiring for simulation mode
  - Render phase-aware play-in / bracket / trophy UI from adapter data
  - Rebuild nav after `Sim Day` so the new tab appears exactly at `postseason_ready`

- Modify: `historic-universe.html`
  - Upgrade simulation universe summaries so in-progress playoffs and completed championships show the right phase, Finals result, and trophy copy

- Test: `tools/test-simulation-season-adapter.js`
  - Cover `postseason_ready`, `play_in`, round advancement, Finals closeout, and frozen completed seasons

- Test: `tools/test-shared-season-shell-simulation.js`
  - Cover `Playoffs` nav visibility, screen rendering, day-advance rerendering, and persisted postseason state

- Test: `tools/test-simulation-universe-details.js`
  - Replace string-only assertions with helper-level behavior checks for in-progress and completed postseason summaries

## Task 1: Add Adapter Regressions For Postseason Lifecycle

**Files:**
- Modify: `tools/test-simulation-season-adapter.js`
- Test: `tools/test-simulation-season-adapter.js`

- [ ] **Step 1: Write the failing postseason lifecycle assertions**

Add these assertions after the existing `postseasonTransitionAdapter` checks so the test locks the new state machine before any production code changes:

```js
assert.deepStrictEqual(
  postseasonReadyState.postseasonState.playIn.east.sevenEight.map((entry) => entry.teamAbbr),
  ['MIA', 'MIL'],
  'postseason_ready should seed the East 7/8 play-in matchup from the final standings'
);
assert.deepStrictEqual(
  postseasonReadyState.postseasonState.playIn.west.nineTen.map((entry) => entry.teamAbbr),
  ['OKC', 'PHX'],
  'postseason_ready should seed the West 9/10 play-in matchup from the final standings'
);
assert.deepStrictEqual(
  postseasonTransitionAdapter.getNavItems().map((item) => item.id),
  ['hub', 'roster', 'matchup', 'waiver', 'trades', 'standings', 'playoffs'],
  'the adapter should expose a playoffs tab once the regular season is over'
);
assert.equal(
  postseasonTransitionAdapter.getNavItems().find((item) => item.id === 'playoffs').label,
  'Playoffs',
  'the postseason nav item should use a stable Playoffs label'
);

const playInDayState = postseasonTransitionAdapter.simulateNextDay();
assert.equal(
  playInDayState.postseasonState.phase,
  'play_in',
  'the first postseason sim day should enter the play-in phase'
);
assert.equal(
  playInDayState.seasonState.currentDay,
  4,
  'the postseason should keep advancing the shared simulation calendar one day at a time'
);
assert.ok(
  Array.isArray(playInDayState.postseasonState.currentDaySchedule) &&
    playInDayState.postseasonState.currentDaySchedule.length > 0,
  'the adapter should track the current postseason game slate for the shared shell'
);
assert.equal(
  typeof postseasonTransitionAdapter.getPlayoffsViewModel,
  'function',
  'the adapter should expose a playoff-specific view model'
);
assert.equal(
  postseasonTransitionAdapter.getPlayoffsViewModel().phase,
  'play_in',
  'the playoffs view model should reflect the current postseason phase'
);

const finalsCloseoutAdapter = createSimulationSeasonAdapter({
  slotId: 'sim-slot-finals-closeout',
  state: {
    ...playInDayState,
    seasonState: {
      ...playInDayState.seasonState,
      currentDay: 30
    },
    postseasonState: {
      ...playInDayState.postseasonState,
      phase: 'finals',
      currentRound: 'finals',
      currentDaySchedule: [
        { day: 30, stage: 'finals', seriesId: 'finals', gameNumber: 4, homeAbbr: 'DAL', awayAbbr: 'BOS' }
      ],
      bracket: {
        ...playInDayState.postseasonState.bracket,
        finals: {
          id: 'finals',
          conference: 'finals',
          round: 'finals',
          higherSeed: { seed: 1, teamAbbr: 'BOS' },
          lowerSeed: { seed: 1, teamAbbr: 'DAL' }
        }
      },
      seriesById: {
        finals: {
          id: 'finals',
          conference: 'finals',
          round: 'finals',
          higherSeed: { seed: 1, teamAbbr: 'BOS' },
          lowerSeed: { seed: 1, teamAbbr: 'DAL' },
          higherSeedWins: 3,
          lowerSeedWins: 0,
          targetWins: 4,
          nextGameNumber: 4,
          playedGames: []
        }
      },
      champion: null,
      runnerUp: null,
      completedAt: null
    }
  }
});

const completedSeasonState = finalsCloseoutAdapter.simulateNextDay();
assert.equal(
  completedSeasonState.postseasonState.phase,
  'completed',
  'the Finals closeout day should finish the season'
);
assert.equal(
  completedSeasonState.postseasonState.champion?.championTeamAbbr,
  'BOS',
  'the champion payload should name the Finals winner'
);
assert.equal(
  completedSeasonState.postseasonState.runnerUp?.teamAbbr,
  'DAL',
  'the runner-up payload should name the Finals loser'
);
assert.match(
  String(completedSeasonState.postseasonState.completedAt || ''),
  /^\d{4}-\d{2}-\d{2}T/,
  'completed seasons should capture an ISO completion timestamp'
);

const frozenCompletedState = finalsCloseoutAdapter.simulateNextDay();
assert.equal(
  frozenCompletedState.seasonState.currentDay,
  completedSeasonState.seasonState.currentDay,
  'completed seasons should stop advancing days'
);
assert.deepStrictEqual(
  frozenCompletedState.postseasonState.champion,
  completedSeasonState.postseasonState.champion,
  'completed seasons should stop mutating champion state'
);
```

- [ ] **Step 2: Run the adapter test to verify it fails**

Run:

```powershell
node tools/test-simulation-season-adapter.js
```

Expected: FAIL with a missing `getPlayoffsViewModel`, missing `playoffs` nav item, or mismatched postseason phase assertions.

- [ ] **Step 3: Commit the failing-test checkpoint**

```bash
git add tools/test-simulation-season-adapter.js
git commit -m "test: lock shared-shell simulation postseason lifecycle"
```

## Task 2: Implement Adapter Postseason State Machine And View Model

**Files:**
- Modify: `simulation-season-adapter.js`
- Modify: `tools/test-simulation-season-adapter.js`
- Test: `tools/test-simulation-season-adapter.js`

- [ ] **Step 1: Add the postseason helpers and dynamic nav item**

Insert the postseason helpers near the existing `NAV_ITEMS`, `buildConferenceSnapshotRows`, and `ensurePostseasonSnapshot` helpers. Keep the names consistent because later tasks use them directly:

```js
  const BASE_NAV_ITEMS = Object.freeze([
    { id: 'hub', label: 'Hub' },
    { id: 'roster', label: 'Roster' },
    { id: 'matchup', label: 'Schedule' },
    { id: 'waiver', label: 'Waivers' },
    { id: 'trades', label: 'Trades' },
    { id: 'standings', label: 'Stand.' }
  ]);
  const PLAYOFFS_NAV_ITEM = Object.freeze({ id: 'playoffs', label: 'Playoffs' });

  function shouldExposePlayoffsTab(state){
    return String(state?.postseasonState?.phase || 'regular_season') !== 'regular_season';
  }

  function buildSeriesState(id, conference, round, higherSeed, lowerSeed, targetWins){
    return {
      id,
      conference,
      round,
      higherSeed: clone(higherSeed || {}),
      lowerSeed: clone(lowerSeed || {}),
      higherSeedWins: 0,
      lowerSeedWins: 0,
      targetWins: Number(targetWins || 1),
      nextGameNumber: 1,
      playedGames: []
    };
  }

  function buildSeededPostseasonState(nextState){
    const eastRows = buildConferenceSnapshotRows(nextState, 'East');
    const westRows = buildConferenceSnapshotRows(nextState, 'West');
    const eastPlayIn = engineApi.buildSimulationPlayIn(eastRows);
    const westPlayIn = engineApi.buildSimulationPlayIn(westRows);
    return {
      phase: 'postseason_ready',
      currentRound: 'play_in',
      playIn: {
        east: { ...clone(eastPlayIn), results: { completedGames: [], sevenSeed: null, eightSeed: null } },
        west: { ...clone(westPlayIn), results: { completedGames: [], sevenSeed: null, eightSeed: null } }
      },
      bracket: {
        east: { firstRound: [], semifinals: [], conferenceFinals: [] },
        west: { firstRound: [], semifinals: [], conferenceFinals: [] },
        finals: null
      },
      seriesById: {
        'east-play-in-7-8': buildSeriesState('east-play-in-7-8', 'east', 'play_in', eastPlayIn.sevenEight[0], eastPlayIn.sevenEight[1], 1),
        'east-play-in-9-10': buildSeriesState('east-play-in-9-10', 'east', 'play_in', eastPlayIn.nineTen[0], eastPlayIn.nineTen[1], 1),
        'west-play-in-7-8': buildSeriesState('west-play-in-7-8', 'west', 'play_in', westPlayIn.sevenEight[0], westPlayIn.sevenEight[1], 1),
        'west-play-in-9-10': buildSeriesState('west-play-in-9-10', 'west', 'play_in', westPlayIn.nineTen[0], westPlayIn.nineTen[1], 1)
      },
      currentDaySchedule: [],
      champion: null,
      runnerUp: null,
      completedAt: null
    };
  }
```

- [ ] **Step 2: Replace the static nav and add `getPlayoffsViewModel()`**

Update `ensurePostseasonSnapshot`, `getNavItems`, and add a new adapter view-model method:

```js
  function ensurePostseasonSnapshot(nextState, totalDays){
    if (!nextState || !totalDays || Number(nextState?.seasonState?.currentDay || 1) <= totalDays) {
      return nextState;
    }
    if (String(nextState?.postseasonState?.phase || '') && nextState.postseasonState.phase !== 'regular_season') {
      return clone(nextState);
    }
    return {
      ...clone(nextState),
      postseasonState: buildSeededPostseasonState(nextState)
    };
  }

      getNavItems(){
        const items = clone(BASE_NAV_ITEMS);
        if (shouldExposePlayoffsTab(state)) items.push(clone(PLAYOFFS_NAV_ITEM));
        return items;
      },
      getPlayoffsViewModel(){
        const postseasonState = clone(state?.postseasonState || {});
        return {
          phase: postseasonState.phase || 'regular_season',
          currentRound: postseasonState.currentRound || null,
          currentDay: Number(state?.seasonState?.currentDay || 1),
          playIn: postseasonState.playIn || { east: null, west: null },
          bracket: postseasonState.bracket || { east: null, west: null, finals: null },
          seriesById: postseasonState.seriesById || {},
          currentDaySchedule: clone(postseasonState.currentDaySchedule || []),
          champion: postseasonState.champion ? clone(postseasonState.champion) : null,
          runnerUp: postseasonState.runnerUp ? clone(postseasonState.runnerUp) : null,
          completedAt: postseasonState.completedAt || null
        };
      },
```

- [ ] **Step 3: Teach `simulateNextDay()` to run postseason days and freeze completed seasons**

Add the postseason progression helpers above `createSimulationSeasonAdapter`, then branch into them from `simulateNextDay()` instead of returning early forever at `postseason_ready`:

```js
  function buildPlayoffSeriesForRound(round, conference, teams){
    const ordered = (Array.isArray(teams) ? teams : []).slice();
    if (round === 'playoffs_round_1') {
      return [
        buildSeriesState(`${conference}-round-1-1v8`, conference, round, ordered[0], ordered[7], 4),
        buildSeriesState(`${conference}-round-1-2v7`, conference, round, ordered[1], ordered[6], 4),
        buildSeriesState(`${conference}-round-1-3v6`, conference, round, ordered[2], ordered[5], 4),
        buildSeriesState(`${conference}-round-1-4v5`, conference, round, ordered[3], ordered[4], 4)
      ];
    }
    if (round === 'playoffs_round_2') {
      return [
        buildSeriesState(`${conference}-round-2-a`, conference, round, ordered[0], ordered[1], 4),
        buildSeriesState(`${conference}-round-2-b`, conference, round, ordered[2], ordered[3], 4)
      ];
    }
    if (round === 'conference_finals') {
      return [buildSeriesState(`${conference}-conference-finals`, conference, round, ordered[0], ordered[1], 4)];
    }
    if (round === 'finals') {
      return [buildSeriesState('finals', 'finals', round, ordered[0], ordered[1], 4)];
    }
    return [];
  }

  function buildCurrentDayPostseasonSchedule(nextState){
    const day = Number(nextState?.seasonState?.currentDay || 1);
    const postseasonState = clone(nextState?.postseasonState || {});
    if (Array.isArray(postseasonState.currentDaySchedule) && postseasonState.currentDaySchedule.length) {
      return postseasonState.currentDaySchedule.filter((game) => Number(game?.day || 0) === day);
    }
    const unresolvedSeries = Object.values(postseasonState.seriesById || {})
      .filter((series) => series && !series.winnerTeamAbbr)
      .sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')));
    return unresolvedSeries.slice(0, 2).map((series, index) => {
      const gameNumber = Number(series.nextGameNumber || 1);
      const higherSeedHome = gameNumber === 1 || gameNumber === 2 || gameNumber === 5 || gameNumber === 7;
      return {
        day,
        slot: index,
        stage: series.round,
        seriesId: series.id,
        gameNumber,
        conference: series.conference,
        homeAbbr: higherSeedHome ? series.higherSeed.teamAbbr : series.lowerSeed.teamAbbr,
        awayAbbr: higherSeedHome ? series.lowerSeed.teamAbbr : series.higherSeed.teamAbbr
      };
    });
  }

  function finalizePostseasonRound(nextState, postseasonState){
    const seriesById = clone(postseasonState?.seriesById || {});
    const currentRound = String(postseasonState?.currentRound || 'play_in');
    const unresolvedCurrentRound = Object.values(seriesById).filter((series) => (
      String(series?.round || '') === currentRound && !series?.winnerTeamAbbr
    ));
    if (unresolvedCurrentRound.length) return postseasonState;

    if (currentRound === 'play_in') {
      const eastSevenEight = seriesById['east-play-in-7-8'];
      const eastNineTen = seriesById['east-play-in-9-10'];
      const westSevenEight = seriesById['west-play-in-7-8'];
      const westNineTen = seriesById['west-play-in-9-10'];
      if (!seriesById['east-play-in-final'] || !seriesById['west-play-in-final']) {
        const nextPlayInSeries = clone(seriesById);
        if (!nextPlayInSeries['east-play-in-final'] && eastSevenEight?.winnerTeamAbbr && eastNineTen?.winnerTeamAbbr) {
          const eastSevenEightLoser = String(eastSevenEight.winnerTeamAbbr || '') === String(eastSevenEight.higherSeed?.teamAbbr || '')
            ? eastSevenEight.lowerSeed
            : eastSevenEight.higherSeed;
          const eastNineTenWinner = String(eastNineTen.winnerTeamAbbr || '') === String(eastNineTen.higherSeed?.teamAbbr || '')
            ? eastNineTen.higherSeed
            : eastNineTen.lowerSeed;
          nextPlayInSeries['east-play-in-final'] = buildSeriesState('east-play-in-final', 'east', 'play_in', eastSevenEightLoser, eastNineTenWinner, 1);
        }
        if (!nextPlayInSeries['west-play-in-final'] && westSevenEight?.winnerTeamAbbr && westNineTen?.winnerTeamAbbr) {
          const westSevenEightLoser = String(westSevenEight.winnerTeamAbbr || '') === String(westSevenEight.higherSeed?.teamAbbr || '')
            ? westSevenEight.lowerSeed
            : westSevenEight.higherSeed;
          const westNineTenWinner = String(westNineTen.winnerTeamAbbr || '') === String(westNineTen.higherSeed?.teamAbbr || '')
            ? westNineTen.higherSeed
            : westNineTen.lowerSeed;
          nextPlayInSeries['west-play-in-final'] = buildSeriesState('west-play-in-final', 'west', 'play_in', westSevenEightLoser, westNineTenWinner, 1);
        }
        if (nextPlayInSeries['east-play-in-final'] || nextPlayInSeries['west-play-in-final']) {
          return {
            ...postseasonState,
            phase: 'play_in',
            currentRound: 'play_in',
            seriesById: nextPlayInSeries,
            currentDaySchedule: []
          };
        }
      }

      const eastField = engineApi.resolveSimulationPlayIn(postseasonState.playIn.east, {
        sevenEightWinner: seriesById['east-play-in-7-8'].winnerTeamAbbr,
        nineTenWinner: seriesById['east-play-in-9-10'].winnerTeamAbbr,
        finalWinner: seriesById['east-play-in-final'].winnerTeamAbbr
      });
      const westField = engineApi.resolveSimulationPlayIn(postseasonState.playIn.west, {
        sevenEightWinner: seriesById['west-play-in-7-8'].winnerTeamAbbr,
        nineTenWinner: seriesById['west-play-in-9-10'].winnerTeamAbbr,
        finalWinner: seriesById['west-play-in-final'].winnerTeamAbbr
      });
      const bracket = engineApi.buildSimulationPlayoffBracket({ east: eastField, west: westField });
      const firstRoundSeries = {};
      buildPlayoffSeriesForRound('playoffs_round_1', 'east', eastField).forEach((series) => { firstRoundSeries[series.id] = series; });
      buildPlayoffSeriesForRound('playoffs_round_1', 'west', westField).forEach((series) => { firstRoundSeries[series.id] = series; });
      return {
        ...postseasonState,
        phase: 'playoffs_round_1',
        currentRound: 'playoffs_round_1',
        bracket: {
          ...clone(bracket),
          east: { ...clone(bracket.east), semifinals: [], conferenceFinals: [] },
          west: { ...clone(bracket.west), semifinals: [], conferenceFinals: [] }
        },
        seriesById: firstRoundSeries,
        currentDaySchedule: []
      };
    }

    const currentRoundSeries = Object.values(seriesById).filter((series) => String(series?.round || '') === currentRound);
    if (currentRound === 'playoffs_round_1' || currentRound === 'playoffs_round_2') {
      const nextRound = currentRound === 'playoffs_round_1' ? 'playoffs_round_2' : 'conference_finals';
      const nextSeriesById = {};
      ['east', 'west'].forEach((conference) => {
        const winners = currentRoundSeries
          .filter((series) => String(series?.conference || '') === conference)
          .map((series) => (
            String(series.winnerTeamAbbr || '') === String(series.higherSeed?.teamAbbr || '')
              ? series.higherSeed
              : series.lowerSeed
          ))
          .sort((a, b) => Number(a?.seed || 99) - Number(b?.seed || 99));
        buildPlayoffSeriesForRound(nextRound, conference, winners).forEach((series) => {
          nextSeriesById[series.id] = series;
        });
      });
      return {
        ...postseasonState,
        phase: nextRound,
        currentRound: nextRound,
        seriesById: nextSeriesById,
        currentDaySchedule: []
      };
    }

    if (currentRound === 'conference_finals') {
      const finalsTeams = ['east', 'west'].map((conference) => {
        const winnerSeries = currentRoundSeries.find((series) => String(series?.conference || '') === conference);
        return String(winnerSeries?.winnerTeamAbbr || '') === String(winnerSeries?.higherSeed?.teamAbbr || '')
          ? winnerSeries.higherSeed
          : winnerSeries.lowerSeed;
      }).sort((a, b) => Number(a?.seed || 99) - Number(b?.seed || 99));
      const finalsSeries = buildPlayoffSeriesForRound('finals', 'finals', finalsTeams)[0];
      return {
        ...postseasonState,
        phase: 'finals',
        currentRound: 'finals',
        bracket: {
          ...clone(postseasonState.bracket || {}),
          finals: clone(finalsSeries)
        },
        seriesById: { finals: finalsSeries },
        currentDaySchedule: []
      };
    }

    if (currentRound === 'finals') {
      const finalsSeries = seriesById.finals;
      const finalsLoser = String(finalsSeries.winnerTeamAbbr || '') === String(finalsSeries.higherSeed?.teamAbbr || '')
        ? finalsSeries.lowerSeed
        : finalsSeries.higherSeed;
      const completedAt = new Date().toISOString();
      return {
        ...postseasonState,
        phase: 'completed',
        currentRound: 'completed',
        champion: {
          ...engineApi.finalizeSimulationChampion({ finals: finalsSeries }),
          seriesResult: `${Math.max(finalsSeries.higherSeedWins, finalsSeries.lowerSeedWins)}-${Math.min(finalsSeries.higherSeedWins, finalsSeries.lowerSeedWins)}`,
          completedAt
        },
        runnerUp: { teamAbbr: finalsLoser.teamAbbr },
        completedAt,
        currentDaySchedule: []
      };
    }

    return postseasonState;
  }

  function advancePostseasonStateFromResults(previousState, nextSeasonState, todayGames, dayResult){
    const nextState = {
      ...clone(previousState),
      seasonState: {
        ...clone(nextSeasonState),
        scheduleByDay: clone(previousState?.seasonState?.scheduleByDay || {})
      }
    };
    const postseasonState = clone(previousState?.postseasonState || {});
    const completedGames = clone(dayResult?.completedGames || []);
    postseasonState.seriesById = clone(postseasonState.seriesById || {});
    todayGames.forEach((scheduledGame) => {
      const series = clone(postseasonState.seriesById?.[scheduledGame.seriesId] || {});
      const result = completedGames.find((game) => (
        String(game?.homeAbbr || '') === String(scheduledGame.homeAbbr || '') &&
        String(game?.awayAbbr || '') === String(scheduledGame.awayAbbr || '')
      )) || {};
      const winnerTeamAbbr = Number(result?.homeScore || 0) >= Number(result?.awayScore || 0)
        ? scheduledGame.homeAbbr
        : scheduledGame.awayAbbr;
      if (winnerTeamAbbr === series.higherSeed?.teamAbbr) series.higherSeedWins = Number(series.higherSeedWins || 0) + 1;
      else series.lowerSeedWins = Number(series.lowerSeedWins || 0) + 1;
      series.playedGames = [].concat(series.playedGames || [], [{
        day: scheduledGame.day,
        gameNumber: scheduledGame.gameNumber,
        homeAbbr: scheduledGame.homeAbbr,
        awayAbbr: scheduledGame.awayAbbr,
        winnerTeamAbbr,
        homeScore: Number(result?.homeScore || 0),
        awayScore: Number(result?.awayScore || 0)
      }]);
      series.nextGameNumber = Number(series.nextGameNumber || 1) + 1;
      if (Number(series.higherSeedWins || 0) >= Number(series.targetWins || 1) || Number(series.lowerSeedWins || 0) >= Number(series.targetWins || 1)) {
        series.winnerTeamAbbr = Number(series.higherSeedWins || 0) >= Number(series.targetWins || 1)
          ? series.higherSeed.teamAbbr
          : series.lowerSeed.teamAbbr;
      }
      postseasonState.seriesById[series.id] = series;
    });
    postseasonState.currentDaySchedule = [];
    nextState.postseasonState = finalizePostseasonRound(nextState, postseasonState);
    return nextState;
  }

  function simulatePostseasonDay(nextState, shell){
    const day = Number(nextState?.seasonState?.currentDay || 1);
    const todayGames = buildCurrentDayPostseasonSchedule(nextState);
    if (!todayGames.length) return clone(nextState);

    const teamMeta = clone(shell?.teams || []);
    const teamNames = teamMeta.map((team) => team.name);
    const allRosters = teamMeta.map((team) => clone(nextState?.draftState?.rostersByTeam?.[team.abbr] || []));
    const engineSeasonState = {
      ...clone(nextState?.seasonState || {}),
      standings: normalizeSimulationStandingsRows(nextState, teamMeta)
    };
    const dayResult = engineApi.simulateSimulationGameDay({
      state: {
        ...engineSeasonState,
        seasonId: nextState?.seasonId || nextState?.historicalUniverseSlotId || null,
        teamMeta,
        teams: teamNames,
        allRosters
      },
      schedule: { byDay: { [day]: todayGames } },
      day,
      lineupIdsByTeam: clone(engineSeasonState.lineupIdsByTeam || {})
    });
    const nextSeasonState = engineApi.applySimulationDayResults(engineSeasonState, dayResult);
    return advancePostseasonStateFromResults(nextState, nextSeasonState, todayGames, dayResult);
  }

      simulateNextDay(){
        const shell = clone(state?.leagueShell || {});
        const scheduleByDay = getCanonicalScheduleByDay(state, shell);
        const totalDays = getScheduleDayCount(scheduleByDay);
        const postseasonPhase = String(state?.postseasonState?.phase || 'regular_season');

        if (postseasonPhase === 'completed') {
          return this.getState();
        }

        if (totalDays > 0 && Number(state?.seasonState?.currentDay || 1) <= totalDays) {
          const schedule = { byDay: clone(scheduleByDay) };
          const teamMeta = clone(shell.teams || []);
          const teamNames = teamMeta.map((team) => team.name);
          const allRosters = teamMeta.map((team) => clone(state?.draftState?.rostersByTeam?.[team.abbr] || []));
          const currentSeasonState = clone(state?.seasonState || {});
          const engineSeasonState = {
            ...currentSeasonState,
            standings: normalizeSimulationStandingsRows(state, teamMeta)
          };
          const dayResult = engineApi.simulateSimulationGameDay({
            state: {
              ...engineSeasonState,
              seasonId: state?.seasonId || state?.historicalUniverseSlotId || null,
              teamMeta,
              teams: teamNames,
              allRosters
            },
            schedule,
            day: Number(currentSeasonState.currentDay || 1),
            lineupIdsByTeam: clone(currentSeasonState.lineupIdsByTeam || {})
          });
          const nextSeasonState = engineApi.applySimulationDayResults(engineSeasonState, dayResult);
          state = ensurePostseasonSnapshot({
            ...clone(state),
            currentDay: Number(nextSeasonState.currentDay || currentSeasonState.currentDay || 1),
            currentWeek: Number(nextSeasonState.currentWeek || currentSeasonState.currentWeek || 1),
            seasonState: {
              ...nextSeasonState,
              scheduleByDay: clone(scheduleByDay)
            }
          }, totalDays);
          return this.getState();
        }

        state = ensurePostseasonSnapshot(state, totalDays);
        if (String(state?.postseasonState?.phase || '') !== 'regular_season') {
          state = simulatePostseasonDay(state, shell);
        }
        return this.getState();
      }
```

- [ ] **Step 4: Run the adapter test to verify it passes**

Run:

```powershell
node tools/test-simulation-season-adapter.js
```

Expected: PASS with `simulation season adapter test passed`.

- [ ] **Step 5: Commit the adapter implementation**

```bash
git add simulation-season-adapter.js tools/test-simulation-season-adapter.js
git commit -m "feat: complete simulation adapter postseason flow"
```

## Task 3: Add Shared-Shell Regressions For The New Playoffs Tab

**Files:**
- Modify: `tools/test-shared-season-shell-simulation.js`
- Test: `tools/test-shared-season-shell-simulation.js`

- [ ] **Step 1: Extend the shell harness to expect a playoffs screen and nav refresh**

Update the harness extraction, fake DOM, and assertions so the test fails until the new shell UI exists:

```js
const harnessSource = `
${extractBetween('function renderSimulationRosterInSharedShell(', 'function renderSimulationScheduleInSharedShell(')}
${extractBetween('function renderSimulationScheduleInSharedShell(', 'function renderSimulationPlayoffsInSharedShell(')}
${extractBetween('function renderSimulationPlayoffsInSharedShell(', 'function renderActiveSeasonScreen(')}
${extractFrom('function goPage(', 'function clearAllData(')}
${extractBetween('async function loadDemo(', 'function isDemoSeasonData(')}
${extractFrom('window.onload=async function(){', 'function clearAllData(')}

module.exports = {
  getRequestedSimulationMode,
  getRequestedHistoricalUniverseSlotId,
  readCompletedSimulationDraftState,
  resolveCompletedSimulationDraftSeasonBoot,
  consumeCompletedSimulationDraftFallbackBoot,
  isSharedSimulationSeason,
  shouldPersistSharedSimulationState,
  getActiveSeasonPages,
  getActiveSeasonLabels,
  loadHistoricalUniverseSlotState,
  normalizeSharedSimulationSeasonBootState,
  buildSharedSimulationPersistenceState,
  persistHistoricalUniverseSlotSnapshot,
  persistSimulationSeasonState,
  renderSimulationHubInSharedShell,
  renderSimulationRosterInSharedShell,
  renderSimulationScheduleInSharedShell,
  renderSimulationPlayoffsInSharedShell,
  renderSimulationWaiverInSharedShell,
  renderSimulationTradesInSharedShell,
  renderSimulationStandingsInSharedShell,
  claimSimulationFreeAgentFromShell,
  applySimulationTradeFromShell,
  applySimulationSuggestedLineupFromShell,
  resolveLocalSavedSeasonAutoLoad,
  loadDemo,
  goPage,
  advanceWeek,
  setActiveSeasonMode(value){ ACTIVE_SEASON_MODE = value; },
  getActiveSeasonMode(){ return ACTIVE_SEASON_MODE; },
  setSeasonModeAdapter(value){ SEASON_MODE_ADAPTER = value; },
  getSeasonModeAdapter(){ return SEASON_MODE_ADAPTER; },
  setData(value){ D = value; },
  getData(){ return D; },
  setGame(value){ G = value; },
  getGame(){ return G; }
};
`;

const elements = Object.fromEntries([
  'hub', 'roster', 'matchup', 'waiver', 'trades', 'standings', 'playoffs',
  'hn', 'rn', 'mn', 'wn', 'tn', 'stn', 'pn',
  'playoffsContent', 'playoffsPowerups',
  'hubLeagueName', 'hubName', 'hubRec', 'hubCycleMeta', 'hubFormat', 'hubScoringType',
  'hubTeamCount', 'hubOpp', 'hubProj', 'hubOppProj', 'hubStreak', 'hubOppLabel',
  'hubProjLabel', 'hubOppProjLabel', 'hubStreakLabel', 'hubSettingsLink', 'hubSettingsDivider',
  'hubLeagueTeamsButton', 'hubMatchupsTitle', 'hubMatchupActionTitle', 'hubMatchupActionSub',
  'rosterScheduleChip', 'matchupTitle', 'matchupNote', 'advBtn', 'hubMatchups', 'rWk',
  'rosterContent', 'rosterPowerups', 'mWk', 'matchupContent', 'matchupPowerups',
  'waiverContent', 'waiverPowerups', 'tradesContent', 'tradesPowerups',
  'standingsContent', 'standingsPowerups'
].map((id) => [id, createElement(id)]));
```

Extend the existing `createElement()` helper and fake `document` so `goPage()` can toggle active screens during the test:

```js
function createElement(id) {
  const shell = { style: {} };
  const classes = new Set();
  return {
    id,
    textContent: '',
    innerHTML: '',
    style: {},
    value: '',
    attributes: {},
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); }
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
      this[name] = value;
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    closest(selector) {
      return selector === '.season-screen-shell' ? shell : null;
    },
    _shell: shell
  };
}

sandbox.document.querySelectorAll = function(selector) {
  if (selector !== '.screen') return [];
  return ['hub', 'roster', 'matchup', 'waiver', 'trades', 'standings', 'playoffs'].map((id) => elements[id]);
};

const simulationAdapterStub = {
  statePhase: 'regular_season',
  getNavItems() {
    const items = [
      { id: 'hub', label: 'Hub' },
      { id: 'roster', label: 'Roster' },
      { id: 'matchup', label: 'Schedule' },
      { id: 'waiver', label: 'Waivers' },
      { id: 'trades', label: 'Trades' },
      { id: 'standings', label: 'Stand.' }
    ];
    if (this.statePhase !== 'regular_season') items.push({ id: 'playoffs', label: 'Playoffs' });
    return items;
  },
  getPlayoffsViewModel() {
    return {
      phase: this.statePhase,
      currentRound: this.statePhase === 'completed' ? 'completed' : 'play_in',
      playIn: {
        east: { sevenEight: [{ seed: 7, teamAbbr: 'MIA' }, { seed: 8, teamAbbr: 'MIL' }], nineTen: [{ seed: 9, teamAbbr: 'NYK' }, { seed: 10, teamAbbr: 'ORL' }] },
        west: { sevenEight: [{ seed: 7, teamAbbr: 'MEM' }, { seed: 8, teamAbbr: 'MIN' }], nineTen: [{ seed: 9, teamAbbr: 'OKC' }, { seed: 10, teamAbbr: 'PHX' }] }
      },
      bracket: { east: { firstRound: [] }, west: { firstRound: [] }, finals: null },
      currentDaySchedule: [{ day: 83, stage: 'play_in', homeAbbr: 'MIL', awayAbbr: 'MIA' }],
      champion: this.statePhase === 'completed' ? { championTeamAbbr: 'LAL', runnerUpTeamAbbr: 'BOS', finalsGames: 6, seriesResult: '4-2' } : null
    };
  },
  simulateNextDay() {
    this.statePhase = 'postseason_ready';
    return this.getState();
  },
  getState() {
    return {
      simulationMode: 'nba_mixed_era_single_player_v1',
      historicalUniverseSlotId: 'sim-slot-1',
      leagueShell: { teams: [{ abbr: 'LAL' }, { abbr: 'BOS' }, { abbr: 'CHI' }] },
      draftState: {
        controlledTeamAbbr: 'LAL',
        rostersByTeam: {
          LAL: [
            { id: 34, name: 'Hakeem Olajuwon', team: 'HOU', pos: 'C' },
            { id: 23, name: 'Michael Jordan', team: 'CHI', pos: 'SG' }
          ],
          BOS: [{ id: 30, name: 'Stephen Curry', team: 'GSW', pos: 'PG' }],
          CHI: []
        },
        freeAgents: [{ id: 33, name: 'Scottie Pippen', team: 'CHI', pos: 'SF' }]
      },
      seasonState: {
        currentDay: 83,
        currentWeek: 12,
        standings: [
          { teamIdx: 0, teamAbbr: 'LAL', conference: 'West', division: 'Pacific', w: 55, l: 27, pf: 9200, pa: 8840 },
          { teamIdx: 1, teamAbbr: 'BOS', conference: 'East', division: 'Atlantic', w: 57, l: 25, pf: 9260, pa: 8795 },
          { teamIdx: 2, teamAbbr: 'CHI', conference: 'East', division: 'Central', w: 42, l: 40, pf: 8844, pa: 8851 }
        ],
        lineupIdsByTeam: { LAL: [23], BOS: [30], CHI: [] }
      },
      postseasonState: {
        phase: this.statePhase,
        currentRound: this.statePhase === 'completed' ? 'completed' : 'play_in'
      }
    };
  },
  getHubViewModel() {
    return {
      leagueLabel: '2025-26 NBA Simulation',
      shellLabel: '1995-96 + 2015-16 Mixed Era Shell',
      controlledTeam: { abbr: 'LAL', name: 'Los Angeles Lakers' },
      userRow: { w: 55, l: 27, streak: 'W2' },
      recordLabel: '55-27',
      primaryAction: { label: 'Sim Day' },
      sourceSeasonLabels: ['1986-87', '1995-96', '2015-16']
    };
  },
  getScheduleViewModel() {
    return {
      title: 'Schedule / Results',
      cycleLabel: 'Day 83 - Week 12',
      recentResults: [{ awayAbbr: 'BOS', awayScore: 108, homeAbbr: 'LAL', homeScore: 112 }]
    };
  },
  getRosterViewModel() {
    return {
      roster: [
        { id: 34, name: 'Hakeem Olajuwon', team: 'HOU', pos: 'C' },
        { id: 23, name: 'Michael Jordan', team: 'CHI', pos: 'SG' }
      ],
      lineup: [{ id: 23, name: 'Michael Jordan', team: 'CHI', pos: 'SG' }],
      bench: [{ id: 34, name: 'Hakeem Olajuwon', team: 'HOU', pos: 'C' }]
    };
  },
  getWaiverViewModel() {
    return { availablePlayers: [{ id: 33, name: 'Scottie Pippen', team: 'CHI', pos: 'SF' }] };
  },
  getTradeViewModel() {
    return {
      tradePartners: [{ abbr: 'BOS', name: 'Boston Celtics' }],
      outgoingRoster: [{ id: 34, name: 'Hakeem Olajuwon' }],
      incomingRostersByTeam: { BOS: [{ id: 30, name: 'Stephen Curry' }] }
    };
  },
  getStandingsViewModel() {
    return {
      rows: [
        { teamAbbr: 'LAL', w: 55, l: 27 },
        { teamAbbr: 'BOS', w: 57, l: 25 }
      ]
    };
  },
  claimFreeAgent(move) {
    this.lastClaim = move;
    return {};
  },
  applyTrade(trade) {
    this.lastTrade = trade;
    return {};
  },
  setLineup(lineupIds) {
    this.lastLineupIds = lineupIds;
    return this.getState();
  }
};

api.setSeasonModeAdapter(simulationAdapterStub);
api.setActiveSeasonMode('simulation');
api.goPage('hub');
assert.doesNotMatch(elements.hn.innerHTML, /Playoffs/, 'regular season nav should hide the playoffs tab');

api.advanceWeek();
assert.match(elements.hn.innerHTML, /Playoffs/, 'postseason-ready day advance should rebuild nav to include the playoffs tab');

api.renderSimulationPlayoffsInSharedShell();
assert.match(elements.playoffsContent.innerHTML, /Play-In/i);
assert.match(elements.playoffsContent.innerHTML, /MIA/);
assert.match(elements.playoffsContent.innerHTML, /MIL/);

simulationAdapterStub.statePhase = 'completed';
api.renderSimulationPlayoffsInSharedShell();
assert.match(elements.playoffsContent.innerHTML, /Champion/i);
assert.match(elements.playoffsContent.innerHTML, /LAL/);

const persistedState = toPlain(api.buildSharedSimulationPersistenceState({
  ...simulationAdapterStub.getState(),
  postseasonState: {
    phase: 'finals',
    currentRound: 'finals',
    seriesById: {
      finals: { higherSeedWins: 3, lowerSeedWins: 2 }
    },
    champion: null
  }
}, api.getData(), api.getGame()));
assert.equal(persistedState.postseasonState.phase, 'finals');
assert.equal(persistedState.postseasonState.seriesById.finals.higherSeedWins, 3);
```

- [ ] **Step 2: Run the shared-shell test to verify it fails**

Run:

```powershell
node tools/test-shared-season-shell-simulation.js
```

Expected: FAIL with a missing `renderSimulationPlayoffsInSharedShell`, missing `playoffs` screen markup, or mismatched nav assertions.

- [ ] **Step 3: Commit the failing shared-shell checkpoint**

```bash
git add tools/test-shared-season-shell-simulation.js
git commit -m "test: lock shared-shell simulation playoffs tab behavior"
```

## Task 4: Implement The Playoffs Tab In The Shared Season Shell

**Files:**
- Modify: `rosterbate-season.html`
- Modify: `tools/test-shared-season-shell-simulation.js`
- Test: `tools/test-shared-season-shell-simulation.js`

- [ ] **Step 1: Add the new screen shell and nav mapping**

Update the season screen markup and constants so the page has a real simulation-only `playoffs` mount:

```html
<section id="playoffs" class="screen">
  <div class="season-screen-shell">
    <div id="playoffsContent"></div>
    <aside id="playoffsPowerups"></aside>
  </div>
</section>
```

```js
const DEFAULT_PAGES=['hub','roster','matchup','waiver','trades','standings','commissioner'];
const DEFAULT_LABELS={hub:'Hub',roster:'Roster',matchup:'Matchup',waiver:'Wire',trades:'Trade',standings:'Stand.',playoffs:'Playoffs',commissioner:'Comm.'};
const NAVIDS={hub:'hn',roster:'rn',matchup:'mn',waiver:'wn',trades:'tn',standings:'stn',playoffs:'pn',commissioner:'commNav'};
```

The existing `getActiveSeasonPages()` adapter override will take care of hiding `playoffs` during the regular season. Do not hardcode it into fantasy mode.

- [ ] **Step 2: Add the simulation playoffs renderer**

Insert the renderer beside the other simulation-specific renderers and keep the page thin by consuming `SEASON_MODE_ADAPTER.getPlayoffsViewModel()` directly:

```js
function renderSimulationPlayoffsInSharedShell(){
  const vm = SEASON_MODE_ADAPTER.getPlayoffsViewModel();
  const powerups = document.getElementById('playoffsPowerups');
  const shell = powerups.closest('.season-screen-shell');
  powerups.style.display = 'none';
  shell.style.gridTemplateColumns = 'minmax(0,1fr)';

  const championHtml = vm.champion ? `
    <section class="sim-playoffs-hero">
      <div class="eyebrow">Trophy awarded</div>
      <h2>${vm.champion.championTeamAbbr} wins the title</h2>
      <p>Defeated ${vm.champion.runnerUpTeamAbbr} ${vm.champion.seriesResult || ''} in ${vm.champion.finalsGames} games.</p>
    </section>
  ` : '';

  const playInHtml = ['east', 'west'].map((conferenceKey) => {
    const conference = vm.playIn?.[conferenceKey];
    if (!conference) return '';
    return `
      <section class="sim-playin-card">
        <h3>${conferenceKey.toUpperCase()} Play-In</h3>
        <div>${(conference.sevenEight || []).map((team) => `${team.seed}. ${team.teamAbbr}`).join(' vs ')}</div>
        <div>${(conference.nineTen || []).map((team) => `${team.seed}. ${team.teamAbbr}`).join(' vs ')}</div>
      </section>
    `;
  }).join('');

  document.getElementById('playoffsContent').innerHTML = `
    ${championHtml}
    <section class="sim-playoffs-summary">
      <div class="eyebrow">${String(vm.phase || 'regular_season').replaceAll('_', ' ')}</div>
      <h2>Playoffs</h2>
      <p>Day ${vm.currentDay} • ${vm.currentRound || 'waiting'}</p>
    </section>
    ${playInHtml}
    <section class="sim-playoffs-slate">
      <h3>Today's games</h3>
      ${(vm.currentDaySchedule || []).map((game) => `<div>${game.awayAbbr} at ${game.homeAbbr}</div>`).join('') || '<div>No games scheduled.</div>'}
    </section>
  `;
}
```

- [ ] **Step 3: Wire the new renderer into page routing and day advances**

Update both the screen router and the simulation branch of `advanceWeek()` so the tab appears at `postseason_ready` and rerenders when active:

```js
function renderActiveSeasonScreen(id){
  if (ACTIVE_SEASON_MODE !== 'simulation') {
    return ({ hub: renderHub, roster: renderRoster, matchup: renderMatchup, waiver: renderWaiver, trades: renderTrades, standings: renderStandings, commissioner: renderCommissioner })[id]?.();
  }
  return ({
    hub: renderSimulationHubInSharedShell,
    roster: renderSimulationRosterInSharedShell,
    matchup: renderSimulationScheduleInSharedShell,
    waiver: renderSimulationWaiverInSharedShell,
    trades: renderSimulationTradesInSharedShell,
    standings: renderSimulationStandingsInSharedShell,
    playoffs: renderSimulationPlayoffsInSharedShell
  })[id]?.();
}

function getActiveSeasonPageId(){
  return getActiveSeasonPages().find((pageId) => document.getElementById(pageId)?.classList?.contains('active')) || 'hub';
}

function advanceWeek(){ if(advanceWeek.disabled) return; advanceWeek.disabled=true; setTimeout(()=>advanceWeek.disabled=false,1000);
  if (ACTIVE_SEASON_MODE === 'simulation' && SEASON_MODE_ADAPTER) {
    const activePageId = getActiveSeasonPageId();
    SEASON_MODE_ADAPTER.simulateNextDay();
    persistSimulationSeasonState('simulation_day_advance');
    goPage(getActiveSeasonPages().includes(activePageId) ? activePageId : 'hub');
    return;
  }
  if(G.isSeasonComplete){toast('Season complete!');return;}
  if(isHistoricalDraftUniverse(D)){
    startHistoricalDraftSimSeason();
    advanceWeek.disabled=false;
    return;
  }
}
```

This `goPage(...)` reuse is important. It rebuilds the bottom nav when the adapter first exposes `playoffs`, which is the exact moment the current shell would otherwise drift out of sync.

- [ ] **Step 4: Run the shared-shell test to verify it passes**

Run:

```powershell
node tools/test-shared-season-shell-simulation.js
```

Expected: PASS with `shared season shell simulation test passed`.

- [ ] **Step 5: Commit the shell implementation**

```bash
git add rosterbate-season.html tools/test-shared-season-shell-simulation.js
git commit -m "feat: add playoffs tab to shared simulation shell"
```

## Task 5: Add Behavioral Archive Tests For Postseason Summaries

**Files:**
- Modify: `tools/test-simulation-universe-details.js`
- Test: `tools/test-simulation-universe-details.js`

- [ ] **Step 1: Replace the string-only archive assertions with helper-level behavior checks**

Swap the current source-only test for a lightweight VM harness that actually runs the summary helpers:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'historic-universe.html'), 'utf8');

function extractBetween(startMarker, endMarker) {
  const start = html.indexOf(startMarker);
  assert.notEqual(start, -1, `expected start marker ${startMarker}`);
  const end = html.indexOf(endMarker, start);
  assert.notEqual(end, -1, `expected end marker ${endMarker}`);
  return html.slice(start, end);
}

const helperSource = `
${extractBetween('function isSimulationModeUniverse(', 'function buildRecentUniverseActivitySummary(')}
module.exports = { isSimulationModeUniverse, buildSimulationModeSummary, buildSimulationPlayoffSummary };
`;

const sandbox = { module: { exports: {} }, exports: {} };
vm.createContext(sandbox);
vm.runInContext(helperSource, sandbox, { filename: 'historic-universe-simulation-helpers.vm.js' });
const api = sandbox.module.exports;

const inProgressSummary = api.buildSimulationPlayoffSummary({}, {
  postseasonState: {
    phase: 'play_in',
    champion: null
  }
});
assert.match(inProgressSummary.title, /Play-In/i);
assert.match(inProgressSummary.meta.join(' '), /play_in|play-in/i);

const completedSummary = api.buildSimulationPlayoffSummary({}, {
  postseasonState: {
    phase: 'completed',
    champion: {
      championTeamAbbr: 'LAL',
      runnerUpTeamAbbr: 'BOS',
      finalsGames: 6,
      seriesResult: '4-2'
    },
    completedAt: '2026-04-23T22:15:00.000Z'
  },
  sourceSeasons: {
    sourceSeasonLabels: ['1986-87', '1995-96', '2015-16']
  }
});
assert.equal(completedSummary.title, 'Simulation champion: LAL');
assert.match(completedSummary.body, /BOS/);
assert.match(completedSummary.body, /4-2|6 games/i);
assert.match(completedSummary.meta.join(' '), /Trophy awarded/i);
```

- [ ] **Step 2: Run the archive-details test to verify it fails**

Run:

```powershell
node tools/test-simulation-universe-details.js
```

Expected: FAIL because the extracted helpers do not yet return the richer play-in and champion summaries.

- [ ] **Step 3: Commit the failing archive test**

```bash
git add tools/test-simulation-universe-details.js
git commit -m "test: lock simulation archive postseason summaries"
```

## Task 6: Implement Archive Summaries, Run The Full Regression Sweep, And Commit

**Files:**
- Modify: `historic-universe.html`
- Modify: `tools/test-simulation-universe-details.js`
- Test: `tools/test-simulation-season-adapter.js`
- Test: `tools/test-shared-season-shell-simulation.js`
- Test: `tools/test-simulation-universe-details.js`

- [ ] **Step 1: Upgrade the simulation archive summary helpers**

Update the two summary helpers so they describe the active postseason phase and finished title run:

```js
function buildSimulationModeSummary(slot, state){
  const standing = (state?.seasonState?.standings || []).find(function(row){
    return String(row?.teamAbbr || '') === String(state?.draftState?.controlledTeamAbbr || '');
  });
  const phase = String(state?.postseasonState?.phase || 'regular_season');
  return {
    title: phase === 'completed' ? 'Simulation title secured' : 'Simulation champion chase',
    body: String((state?.leagueShell?.anchorSeasonLabel || 'NBA')) + ' shell · ' + String((state?.sourceSeasons?.sourceSeasonLabels || []).join(' + ') || 'Mixed era') + ' player universe',
    meta: [
      standing ? 'Record ' + standing.w + '-' + standing.l : 'Record pending',
      phase === 'regular_season' ? 'Play-In race active' : 'Phase: ' + phase.replaceAll('_', ' ')
    ]
  };
}

function buildSimulationPlayoffSummary(slot, state){
  const phase = String(state?.postseasonState?.phase || 'regular_season');
  const champion = state?.postseasonState?.champion || null;
  if(champion){
    return {
      title: 'Simulation champion: ' + String(champion.championTeamAbbr || ''),
      body: 'Defeated ' + String(champion.runnerUpTeamAbbr || '') + ' ' + String(champion.seriesResult || '') + ' in ' + String(champion.finalsGames || '--') + ' games.',
      meta: ['Trophy awarded', 'Completed ' + String(state?.postseasonState?.completedAt || '').slice(0, 10)]
    };
  }
  if(phase === 'play_in'){
    return {
      title: 'Play-In underway',
      body: 'The final East and West seeds are being decided one game at a time.',
      meta: ['Phase: play_in']
    };
  }
  if(phase === 'finals'){
    return {
      title: 'Finals live',
      body: 'The championship series is active and the trophy is still on the table.',
      meta: ['Phase: finals']
    };
  }
  return {
    title: 'Play-In and playoff path pending',
    body: 'The regular season is still shaping the final conference seeds.',
    meta: ['Play-In race active']
  };
}
```

- [ ] **Step 2: Run the focused tests to verify they pass**

Run:

```powershell
node tools/test-simulation-season-adapter.js
node tools/test-shared-season-shell-simulation.js
node tools/test-simulation-universe-details.js
```

Expected: all PASS.

- [ ] **Step 3: Run the broader regression suite and diff check**

Run:

```powershell
node tools/test-simulation-postseason.js
node tools/test-simulation-season-page.js
node tools/test-simulation-slot-routing.js
node tools/test-historical-universe-details.js
git diff --check
```

Expected:

- the four tests PASS
- `git diff --check` prints no output

- [ ] **Step 4: Manual browser smoke the full postseason loop**

Use the current branch build and verify this exact flow in the browser:

```text
1. Start a mixed-era simulation league from setup.
2. Auto-draft or finish a manual draft.
3. Sim to the last regular-season day and confirm the Playoffs tab appears.
4. Advance one day and confirm the Play-In slate appears in both Schedule and Playoffs.
5. Keep waivers, trades, and lineup changes available during the postseason.
6. Sim through the Finals and confirm champion + trophy copy appears in the Playoffs tab.
7. Reopen the saved universe and confirm the champion summary still appears in the archive/details view.
```

- [ ] **Step 5: Commit the completed postseason feature**

```bash
git add simulation-season-adapter.js rosterbate-season.html historic-universe.html tools/test-simulation-season-adapter.js tools/test-shared-season-shell-simulation.js tools/test-simulation-universe-details.js
git commit -m "feat: complete shared-shell simulation postseason flow"
```

## Self-Review

- Spec coverage:
  - exact modern play-in format: Task 1 + Task 2
  - day-by-day postseason sim: Task 1 + Task 2
  - dedicated `Playoffs` tab: Task 3 + Task 4
  - roster moves stay open: Task 1 nav assertions + Task 4 keeps existing shell screens intact
  - champion/trophy persistence and archive details: Task 5 + Task 6
  - saved universes reopening mid-playoffs or completed: Task 3 persistence assertions + Task 6 browser smoke

- Placeholder scan:
  - no `TBD`, `TODO`, or “implement later” placeholders remain
  - every code-changing step includes concrete code or commands

- Type consistency:
  - `postseasonState.phase`, `currentRound`, `seriesById`, `currentDaySchedule`, `champion`, `runnerUp`, and `completedAt` are named consistently across adapter, shell, and archive tasks
  - `getPlayoffsViewModel()` is the only new shell-facing adapter method
