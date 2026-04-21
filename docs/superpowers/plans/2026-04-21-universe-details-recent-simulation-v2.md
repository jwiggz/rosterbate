# Universe Details Recent Simulation V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `Universe Details` with a compact, team-first `Recent Simulation` section that shows the last 3 sim days using existing reveal/activity state.

**Architecture:** Keep the work inside [C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historic-universe.html](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/historic-universe.html) by adding a small recent-history helper layer to the current view-model builder and rendering one new section into the existing left-column stack. Reuse [C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-universe-details.js](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/tools/test-historical-universe-details.js) as the main regression seam so we verify both the view model and the page markup without adding new persistence.

**Tech Stack:** Vanilla HTML/CSS/JS, Node.js `assert/fs/path/vm`, existing saved historical universe state (`dailyRevealReports`, `activityLog`, standings, roster data)

---

### Task 1: Extend the Universe Details regression for recent simulation history

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-universe-details.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-universe-details.js`

- [ ] **Step 1: Extend the extraction seam and DOM expectations**

Patch the existing harness so it extracts the new helper layer and the new section hook instead of creating a second test file:

```js
const script = [
  extractFunctionSource('getLatestRevealReport(state)'),
  extractFunctionSource('getTeamRoster(state)'),
  extractFunctionSource('buildRosterCore(state)'),
  extractFunctionSpan('sortStandingsEntries(standings)', 'buildUniverseDetailsViewModel(slot, state, config)')
].join('\n\n');
const renderUniverseSource = extractFunctionSource('renderUniverse(slot, state, config)');

expectMatch(/id="recentSimulationList"/, 'recent simulation list node is missing');
expectMatch(/function getRecentRevealReports\(state, limit\)/, 'recent reveal helper is missing');
expectMatch(/function buildRecentSimulationSummary\(slot, state\)/, 'recent simulation summary helper is missing');
assert.match(renderUniverseSource, /recentSimulationList/, 'renderUniverse should render the recent simulation section');
```

- [ ] **Step 2: Replace the one-day fixture with a three-day recent-simulation fixture**

Update the existing `state` fixture so the harness has three reveal days with generated timestamps and activity that can be grouped into per-day windows:

```js
const state = {
  myPos: 0,
  teams: ['Audit Agents', 'CPU Team 1', 'CPU Team 2', 'CPU Team 3'],
  rosters: [[
    { id: 1, name: 'Michael Jordan', team: 'CHI', pos: 'SG', fp: 52.4, totalFantasyPoints: 314.7, injuryStatus: null },
    { id: 2, name: 'Scottie Pippen', team: 'CHI', pos: 'SF', fp: 44.1, totalFantasyPoints: 276.2, injuryStatus: 'GTD' },
    { id: 3, name: 'Alonzo Mourning', team: 'MIA', pos: 'C', fp: 40.9, totalFantasyPoints: 255.4, injuryStatus: 'OUT' }
  ]],
  starters: [[
    { id: 1, name: 'Michael Jordan', team: 'CHI', pos: 'SG', fp: 52.4, totalFantasyPoints: 314.7 },
    { id: 2, name: 'Scottie Pippen', team: 'CHI', pos: 'SF', fp: 44.1, totalFantasyPoints: 276.2 },
    { id: 3, name: 'Alonzo Mourning', team: 'MIA', pos: 'C', fp: 40.9, totalFantasyPoints: 255.4 }
  ]],
  standings: [
    { teamIdx: 1, w: 6, l: 1, pf: 940.2 },
    { teamIdx: 0, w: 5, l: 2, pf: 923.4 },
    { teamIdx: 2, w: 5, l: 2, pf: 912.7 },
    { teamIdx: 3, w: 4, l: 3, pf: 904.3 }
  ],
  dailyRevealReports: {
    '8': {
      day: 8,
      week: 3,
      generatedAt: 8000,
      story: {
        headline: 'Audit Agents survived a grinder on Day 8',
        subheadline: 'The defense carried a close finish.'
      },
      matchups: [
        { teamIdx: 0, opponentIdx: 3, teamName: 'Audit Agents', opponentName: 'CPU Team 3', teamScore: 151.2, opponentScore: 149.1 }
      ],
      totalTransactions: 1
    },
    '9': {
      day: 9,
      week: 3,
      generatedAt: 9000,
      story: {
        headline: 'CPU Team 1 clipped Audit Agents on Day 9',
        subheadline: 'The offense cooled off late.'
      },
      matchups: [
        { teamIdx: 1, opponentIdx: 0, teamName: 'CPU Team 1', opponentName: 'Audit Agents', teamScore: 154.6, opponentScore: 148.3 }
      ],
      totalTransactions: 2
    },
    '10': {
      day: 10,
      week: 3,
      generatedAt: 10000,
      story: {
        headline: 'Audit Agents close strong on Day 10',
        subheadline: 'Jordan led the latest sim-day swing and kept the team in second.'
      },
      matchups: [
        { teamIdx: 0, opponentIdx: 2, teamName: 'Audit Agents', opponentName: 'CPU Team 2', teamScore: 162.8, opponentScore: 148.9 }
      ],
      totalTransactions: 2
    }
  },
  activityLog: [
    { id: 'a1', type: 'waiver', title: 'Audit Agents added Brent Barry', text: 'Dropped an inactive bench wing for a live scorer.', teamIdx: 0, ts: 9900 },
    { id: 'a2', type: 'activation', title: 'Audit Agents activated Kevin Johnson', text: 'Healthy guard returned from IL.', teamIdx: 0, ts: 9800 },
    { id: 'a3', type: 'waiver', title: 'CPU Team 1 added Dell Curry', text: 'Found a hot hand before the next lock.', teamIdx: 1, ts: 9950 },
    { id: 'a4', type: 'waiver', title: 'Audit Agents added Buck Williams', text: 'Needed another rebounder before Day 9.', teamIdx: 0, ts: 8900 },
    { id: 'a5', type: 'activation', title: 'CPU Team 3 activated Kevin Johnson', text: 'Healthy guard returned from IL.', teamIdx: 3, ts: 8800 },
    { id: 'a6', type: 'waiver', title: 'CPU Team 2 added Danny Manning', text: 'Added another forward before Day 8.', teamIdx: 2, ts: 7900 }
  ]
};
```

- [ ] **Step 3: Add the new failing recent-simulation assertions**

Append these assertions after the existing `latestSimDay` checks:

```js
assert.equal(viewModel.recentSimDays.length, 3);
assert.deepStrictEqual(
  viewModel.recentSimDays.map(item => item.day),
  [10, 9, 8]
);
assert.deepStrictEqual(
  viewModel.recentSimDays.map(item => item.week),
  [3, 3, 3]
);
assert.match(viewModel.recentSimDays[0].teamResult.headline, /Audit Agents beat CPU Team 2/i);
assert.equal(viewModel.recentSimDays[0].teamActivity.length, 2);
assert.match(viewModel.recentSimDays[0].teamActivity[0].title, /Audit Agents/i);
assert.match(viewModel.recentSimDays[0].leagueNote.title, /CPU Team 1/i);
assert.match(viewModel.recentSimDays[1].teamResult.headline, /Audit Agents fell to CPU Team 1/i);
assert.equal(viewModel.recentSimDays[2].teamActivity.length, 0);

const oneDayOnly = JSON.parse(JSON.stringify(
  context.buildUniverseDetailsViewModel(
    slot,
    {
      myPos: 0,
      teams: ['Audit Agents'],
      rosters: [[]],
      standings: [],
      dailyRevealReports: {
        '10': {
          day: 10,
          week: 3,
          generatedAt: 10000,
          story: { headline: 'Single day available', subheadline: 'Only one reveal has been saved.' },
          matchups: [],
          totalTransactions: 0
        }
      },
      activityLog: []
    },
    {}
  )
));
assert.equal(oneDayOnly.recentSimDays.length, 1);
assert.equal(oneDayOnly.recentSimDays[0].day, 10);

assert.deepStrictEqual(degraded.recentSimDays, []);
```

- [ ] **Step 4: Run the focused regression to verify it fails**

Run:

```bash
node .\tools\test-historical-universe-details.js
```

Expected:

- `FAIL`
- missing `recentSimulationList` hook and/or missing `getRecentRevealReports` / `buildRecentSimulationSummary` helpers

---

### Task 2: Build the recent-simulation helper layer in `historic-universe.html`

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historic-universe.html`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-universe-details.js`

- [ ] **Step 1: Add recent-simulation derivation helpers below `buildRecentUniverseActivitySummary(state, reveal)`**

Insert these helpers ahead of `buildCurrentTeamStateSummary(...)`:

```js
  function getRecentRevealReports(state, limit){
    const reports = state && state.dailyRevealReports && typeof state.dailyRevealReports === 'object'
      ? state.dailyRevealReports
      : {};
    return Object.keys(reports)
      .map(function(key){ return reports[key]; })
      .filter(function(report){ return Number(report?.day || 0) > 0; })
      .sort(function(a, b){ return Number(b?.day || 0) - Number(a?.day || 0); })
      .slice(0, Math.max(0, Number(limit || 0)));
  }

  function getRevealWindowActivitiesForState(state, reveal){
    const currentDay = Number(reveal?.day || 0);
    const maxTs = Number(reveal?.generatedAt || 0);
    if(!currentDay || !maxTs) return [];
    const previousReveal = getRecentRevealReports(state, 20)
      .filter(function(item){ return Number(item?.day || 0) < currentDay; })
      .sort(function(a, b){ return Number(b?.day || 0) - Number(a?.day || 0); })[0] || null;
    const minTs = Number(previousReveal?.generatedAt || 0);
    return (Array.isArray(state?.activityLog) ? state.activityLog : []).filter(function(entry){
      const ts = Number(entry?.ts || 0);
      return ts > minTs && ts <= maxTs;
    });
  }

  function buildRecentSimulationTeamResult(slot, state, reveal){
    const myPos = Number(state?.myPos);
    const teams = Array.isArray(state?.teams) ? state.teams : [];
    const fallbackTeamName = String(slot?.teamName || teams[myPos] || 'Your Team').trim();
    const matchup = Array.isArray(reveal?.matchups)
      ? reveal.matchups.find(function(entry){
          return Number(entry?.teamIdx) === myPos || Number(entry?.opponentIdx) === myPos;
        })
      : null;
    if(!matchup){
      return null;
    }
    const myTeamIsPrimary = Number(matchup?.teamIdx) === myPos;
    const opponentName = String(myTeamIsPrimary ? matchup?.opponentName : matchup?.teamName || 'Unknown Opponent').trim();
    const teamName = String(myTeamIsPrimary ? matchup?.teamName : matchup?.opponentName || fallbackTeamName).trim() || fallbackTeamName;
    const myScore = Number(myTeamIsPrimary ? matchup?.teamScore : matchup?.opponentScore);
    const opponentScore = Number(myTeamIsPrimary ? matchup?.opponentScore : matchup?.teamScore);
    const verb = Number.isFinite(myScore) && Number.isFinite(opponentScore)
      ? (myScore >= opponentScore ? 'beat' : 'fell to')
      : 'faced';
    return {
      headline: teamName + ' ' + verb + ' ' + opponentName,
      subline: Number.isFinite(myScore) && Number.isFinite(opponentScore)
        ? myScore.toFixed(1) + ' - ' + opponentScore.toFixed(1)
        : 'Result still loading'
    };
  }

  function buildRecentSimulationTeamActivity(slot, state, reveal){
    const myPos = Number(state?.myPos);
    const teamName = String(slot?.teamName || '').trim().toLowerCase();
    return getRevealWindowActivitiesForState(state, reveal)
      .filter(function(entry){
        if(Number(entry?.teamIdx) === myPos) return true;
        const haystack = (String(entry?.title || '') + ' ' + String(entry?.text || '')).toLowerCase();
        return !!teamName && haystack.includes(teamName);
      })
      .slice(0, 2)
      .map(function(entry){
        return {
          title: String(entry?.title || 'Team activity').trim(),
          body: String(entry?.text || 'Recent roster activity was logged.').trim()
        };
      });
  }

  function buildRecentSimulationLeagueNote(slot, state, reveal){
    const myPos = Number(state?.myPos);
    const teamName = String(slot?.teamName || '').trim().toLowerCase();
    const nonTeamEntry = getRevealWindowActivitiesForState(state, reveal).find(function(entry){
      if(Number(entry?.teamIdx) === myPos) return false;
      const haystack = (String(entry?.title || '') + ' ' + String(entry?.text || '')).toLowerCase();
      return !(teamName && haystack.includes(teamName));
    });
    if(nonTeamEntry){
      return {
        title: String(nonTeamEntry?.title || 'League note').trim(),
        body: String(nonTeamEntry?.text || 'Another league event landed during this reveal window.').trim()
      };
    }
    if(Number(reveal?.totalTransactions) > 0){
      return {
        title: Number(reveal.totalTransactions) + ' league move(s) logged',
        body: 'This reveal window also included league activity outside your own roster.'
      };
    }
    return null;
  }

  function buildRecentSimulationSummary(slot, state){
    return getRecentRevealReports(state, 3).map(function(reveal){
      const storyHeadline = String(reveal?.story?.headline || '').trim();
      const storySubheadline = String(reveal?.story?.subheadline || '').trim();
      return {
        day: Number(reveal?.day || 0),
        week: Number(reveal?.week || 0),
        teamResult: buildRecentSimulationTeamResult(slot, state, reveal),
        story: {
          headline: storyHeadline || 'Simulation day completed.',
          body: storySubheadline || storyHeadline || 'Simulation day completed.'
        },
        teamActivity: buildRecentSimulationTeamActivity(slot, state, reveal),
        leagueNote: buildRecentSimulationLeagueNote(slot, state, reveal)
      };
    });
  }
```

- [ ] **Step 2: Thread `recentSimDays` into the view model**

Update `buildUniverseDetailsViewModel(slot, state, config)` to return the new array:

```js
  function buildUniverseDetailsViewModel(slot, state, config){
    const reveal = getLatestRevealReport(state);
    const standing = getStandingContext(state);
    const rosterCore = buildRosterCore(state);
    return {
      latestSimDay: buildLatestSimDaySummary(slot, state, reveal, standing),
      leagueSnapshot: buildLeagueSnapshotSummary(slot, state, standing),
      recentActivity: buildRecentUniverseActivitySummary(state, reveal),
      recentSimDays: buildRecentSimulationSummary(slot, state),
      currentTeamState: buildCurrentTeamStateSummary(slot, state, rosterCore)
    };
  }
```

- [ ] **Step 3: Add a dedicated renderer for the recent-simulation cards**

Insert this helper near `renderDetailList(...)` so the section stays team-first instead of flattening into generic rows:

```js
  function renderRecentSimulationCards(items){
    const list = Array.isArray(items) ? items : [];
    if(!list.length){
      return [
        '<div class="detail-item sim-day-card">',
        '<div class="sim-day-label">Recent Simulation</div>',
        '<strong>No recent sim days saved yet</strong>',
        '<span>This universe needs at least one completed sim day before recent momentum can be shown here.</span>',
        '</div>'
      ].join('');
    }
    return list.map(function(item){
      const label = 'Week ' + String(item?.week || '--') + ' Day ' + String(item?.day || '--');
      const resultHeadline = item?.teamResult?.headline || item?.story?.headline || 'Simulation day completed.';
      const resultSubline = item?.teamResult?.subline || item?.story?.body || '';
      const activityHtml = Array.isArray(item?.teamActivity) && item.teamActivity.length
        ? item.teamActivity.map(function(entry){
            return '<span class="sim-day-subline">Team activity: ' + escapeHtml(String(entry?.title || '').trim()) + '</span>';
          }).join('')
        : '';
      const leagueNoteHtml = item?.leagueNote
        ? '<span class="sim-day-note">League note: ' + escapeHtml(String(item.leagueNote.title || '').trim()) + ' - ' + escapeHtml(String(item.leagueNote.body || '').trim()) + '</span>'
        : '';
      return [
        '<div class="detail-item sim-day-card">',
        '<div class="sim-day-label">' + escapeHtml(label) + '</div>',
        '<strong>' + escapeHtml(resultHeadline) + '</strong>',
        resultSubline ? '<span>' + escapeHtml(resultSubline) + '</span>' : '',
        activityHtml,
        leagueNoteHtml,
        '</div>'
      ].join('');
    }).join('');
  }
```

- [ ] **Step 4: Run the regression again to verify it is still red on missing markup**

Run:

```bash
node .\tools\test-historical-universe-details.js
```

Expected:

- `FAIL`
- the helper layer now exists, but the page still lacks the `recentSimulationList` section and renderer wiring

---

### Task 3: Render the new `Recent Simulation` section and finish verification

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historic-universe.html`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-universe-details.js`
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-drafted-universe-snapshot.js`
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-universe-slot-storage.js`

- [ ] **Step 1: Insert the new section into the left-column stack under `Latest Sim Day`**

Add this block between the existing `Latest Sim Day` article and `Current Team State` article:

```html
          <article class="panel card-pad">
            <div class="section-kicker">Recent Simulation</div>
            <div class="section-title">How The Last Three Days Landed</div>
            <div class="section-copy">A team-first read on the last three sim days, with your result first and one light league note when it matters.</div>
            <div class="detail-list" id="recentSimulationList">
              <div class="detail-item sim-day-card">
                <div class="sim-day-label">Recent Simulation</div>
                <strong>Loading recent sim days</strong>
                <span>Preparing the latest stretch of universe momentum.</span>
              </div>
            </div>
          </article>
```

- [ ] **Step 2: Add the small presentation styles for the new cards**

Place this CSS near the existing `.detail-item` / `.info-item` rules:

```css
  .sim-day-card{display:grid;gap:8px}
  .sim-day-label{
    font:700 10px/1 var(--plex);
    letter-spacing:.14em;
    text-transform:uppercase;
    color:#9ec8ff;
  }
  .sim-day-subline,
  .sim-day-note{
    display:block;
    font-size:12px;
    line-height:1.55;
    color:#b8cae3;
  }
```

- [ ] **Step 3: Wire `recentSimDays` into `renderUniverse(slot, state, config)`**

Update the render function to read and paint the new section:

```js
    const recentSimDays = Array.isArray(detailsViewModel.recentSimDays)
      ? detailsViewModel.recentSimDays
      : [];

    document.getElementById('recentSimulationList').innerHTML = renderRecentSimulationCards(recentSimDays);
```

Keep the existing latest-story, league-snapshot, recent-activity, and team-state rendering intact.

- [ ] **Step 4: Run the focused and adjacent verification suite**

Run:

```bash
node .\tools\test-historical-universe-details.js
node .\tools\test-historical-drafted-universe-snapshot.js
node .\tools\test-historical-universe-slot-storage.js
```

Expected:

- `historical universe details test passed`
- `historical drafted-universe snapshot test passed`
- `historical universe slot storage test passed`

- [ ] **Step 5: Run manual browser QA**

Run:

```bash
py -m http.server 8080
```

Then verify:

1. Open [http://localhost:8080/historic-seasons.html?sport=nba](http://localhost:8080/historic-seasons.html?sport=nba)
2. Open one saved simulation universe from the archive list
3. Confirm the new `Recent Simulation` section shows at most 3 cards, newest first
4. Confirm each card reads in this order:
   - team result
   - story / subline
   - team activity if present
   - one league note if present
5. Confirm a universe with only one saved reveal day shows one card without fake placeholders
6. Resize to a narrow/mobile width and confirm the section stays compact and still reads like `Universe Details`

- [ ] **Step 6: Commit the completed page refresh**

```bash
git add historic-universe.html tools/test-historical-universe-details.js
git commit -m "feat: add recent simulation history to universe details"
```
