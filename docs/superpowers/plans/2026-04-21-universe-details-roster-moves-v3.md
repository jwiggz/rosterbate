# Universe Details Roster Moves V3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a compact, team-first `Recent Roster Moves` section to `Universe Details` that shows the latest `5` grouped roster-changing moves for the controlled team.

**Architecture:** Keep the work inside [C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historic-universe.html](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/historic-universe.html) by extending the existing universe-details view model with a new `recentRosterMoves` slice derived from `activityLog`. Reuse [C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-universe-details.js](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/tools/test-historical-universe-details.js) as the primary regression seam so we validate both grouped-move derivation and page rendering without adding persistence or new modules.

**Tech Stack:** Vanilla HTML/CSS/JS, Node.js `assert/fs/path/vm`, existing saved historical universe state (`activityLog`, slot/team identity, reveal metadata)

---

### Task 1: Extend the Universe Details regression for grouped roster moves

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-universe-details.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-universe-details.js`

- [ ] **Step 1: Extend the extraction seam and DOM expectations for roster moves**

Add the new helper expectations beside the existing recent-simulation hooks so the regression fails before implementation:

```js
expectMatch(/id="recentRosterMovesList"/, 'recent roster moves list node is missing');
expectMatch(/function isRosterChangingActivityEntry\(entry\)/, 'roster-changing activity helper is missing');
expectMatch(/function buildRecentRosterMovesSummary\(slot, state\)/, 'recent roster moves summary helper is missing');
assert.match(renderUniverseSource, /recentRosterMovesList/, 'renderUniverse should render the recent roster moves section');
```

- [ ] **Step 2: Add a grouped-roster-move fixture to the existing state**

Extend the current test `state.activityLog` so it contains:

- obvious add/drop pair for the controlled team
- obvious activate/IL pair for the controlled team
- one single restore event
- lineup-only noise that must be excluded
- other-team roster moves that must be excluded
- more than `5` total candidate groups so the summary has to trim

Use a newest-first mix of timestamps like this:

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
    { id: 'rm1', type: 'waiver', title: 'Audit Agents added Brent Barry', text: 'Added wing depth before the next lock.', teamIdx: 0, ts: 10040 },
    { id: 'rm2', type: 'waiver', title: 'Audit Agents dropped Dell Curry', text: 'Opened the bench spot for the new claim.', teamIdx: 0, ts: 10035 },
    { id: 'rm3', type: 'activation', title: 'Audit Agents activated Kevin Johnson', text: 'Healthy guard returned from IL.', teamIdx: 0, ts: 9995 },
    { id: 'rm4', type: 'il', title: 'Audit Agents moved Mookie Blaylock to IL', text: 'Cleared active space after the injury update.', teamIdx: 0, ts: 9990 },
    { id: 'rm5', type: 'waiver', title: 'Audit Agents added Buck Williams', text: 'Needed another rebounder before Day 9.', teamIdx: 0, ts: 8920 },
    { id: 'rm6', type: 'commissioner', title: 'Commissioner restored Alonzo Mourning', text: 'Restored to Audit Agents after a mistaken drop.', teamIdx: 0, ts: 8910 },
    { id: 'rm7', type: 'lineup', title: 'Audit Agents started Ron Harper', text: 'Lineup shuffle only.', teamIdx: 0, ts: 8905 },
    { id: 'rm8', type: 'waiver', title: 'CPU Team 1 added Dell Curry', text: 'Found a hot hand before the next lock.', teamIdx: 1, ts: 9950 },
    { id: 'rm9', type: 'waiver', title: 'Audit Agents added Rick Fox', text: 'Needed another wing before Day 8.', teamIdx: 0, ts: 7920 },
    { id: 'rm10', type: 'waiver', title: 'Audit Agents dropped Tony Delk', text: 'Made room at the back of the bench.', teamIdx: 0, ts: 7915 },
    { id: 'rm11', type: 'activation', title: 'Audit Agents activated Muggsy Bogues', text: 'Healthy guard returned to the bench mix.', teamIdx: 0, ts: 7905 }
  ]
};
```

- [ ] **Step 3: Add the new failing roster-move assertions**

Append these assertions after the existing `recentSimDays` checks:

```js
assert.equal(viewModel.recentRosterMoves.length, 5);
assert.deepStrictEqual(
  viewModel.recentRosterMoves.map(item => item.title),
  [
    'Added Brent Barry, dropped Dell Curry',
    'Activated Kevin Johnson, moved Mookie Blaylock to IL',
    'Added Buck Williams',
    'Commissioner restored Alonzo Mourning',
    'Added Rick Fox, dropped Tony Delk'
  ]
);
assert.ok(
  viewModel.recentRosterMoves.every(item => !/lineup/i.test(item.title + ' ' + item.body)),
  'lineup-only activity should not appear in recent roster moves'
);
assert.ok(
  viewModel.recentRosterMoves.every(item => !/CPU Team 1/i.test(item.title + ' ' + item.body)),
  'other-team roster activity should not appear in recent roster moves'
);
```

- [ ] **Step 4: Add a stale-slot-name fallback case and empty-state case**

Add a second derived fixture proving that team identity still resolves from `state.teams[myPos]` when `slot.teamName` is blank:

```js
const blankSlotNameMoves = JSON.parse(JSON.stringify(
  context.buildUniverseDetailsViewModel(
    { ...slot, teamName: '' },
    state,
    {}
  )
));
assert.match(blankSlotNameMoves.recentRosterMoves[0].title, /Brent Barry/i);
```

Then add an empty-state fixture:

```js
const noRosterMoveHistory = JSON.parse(JSON.stringify(
  context.buildUniverseDetailsViewModel(
    slot,
    {
      myPos: 0,
      teams: ['Audit Agents'],
      rosters: [[]],
      standings: [],
      dailyRevealReports: {},
      activityLog: [
        { id: 'quiet1', type: 'lineup', title: 'Audit Agents started Ron Harper', text: 'Lineup shuffle only.', teamIdx: 0, ts: 1000 }
      ]
    },
    {}
  )
));
assert.deepStrictEqual(noRosterMoveHistory.recentRosterMoves, []);
```

- [ ] **Step 5: Run the focused regression to verify it fails**

Run:

```bash
node .\tools\test-historical-universe-details.js
```

Expected:

- `FAIL`
- missing `recentRosterMovesList`, missing roster-move helpers, or missing `recentRosterMoves` in the view model

---

### Task 2: Build the grouped roster-move helper layer in `historic-universe.html`

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historic-universe.html`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-universe-details.js`

- [ ] **Step 1: Add roster-move constants and helper functions below the recent-simulation helpers**

Insert this helper layer near the other detail-section builders:

```js
  const RECENT_ROSTER_MOVES_LIMIT = 5;

  function getControlledTeamName(slot, state){
    const myPos = Number(state?.myPos);
    const teams = Array.isArray(state?.teams) ? state.teams : [];
    return String(slot?.teamName || teams[myPos] || 'Your Team').trim();
  }

  function isRosterChangingActivityEntry(entry){
    const type = String(entry?.type || '').trim().toLowerCase();
    const title = String(entry?.title || '').trim().toLowerCase();
    if(type === 'waiver' || type === 'activation' || type === 'il') return true;
    if(type === 'commissioner' && (title.includes('restored') || title.includes('reversed'))) return true;
    return false;
  }

  function isControlledTeamActivity(slot, state, entry){
    const myPos = Number(state?.myPos);
    if(Number(entry?.teamIdx) === myPos) return true;
    const teamName = getControlledTeamName(slot, state).toLowerCase();
    const haystack = (String(entry?.title || '') + ' ' + String(entry?.text || '')).toLowerCase();
    return !!teamName && haystack.includes(teamName);
  }

  function getRosterMoveVerb(entry){
    const title = String(entry?.title || '').trim();
    const lower = title.toLowerCase();
    if(lower.includes('added ')) return 'add';
    if(lower.includes('dropped ')) return 'drop';
    if(lower.includes('activated ')) return 'activate';
    if(lower.includes('moved ') && lower.includes(' to il')) return 'il';
    if(lower.includes('restored ')) return 'restore';
    return 'other';
  }

  function getRosterMovePlayerName(entry){
    const title = String(entry?.title || '').trim();
    const patterns = [
      /^.*added\s+(.+)$/i,
      /^.*dropped\s+(.+)$/i,
      /^.*activated\s+(.+)$/i,
      /^.*moved\s+(.+?)\s+to il$/i,
      /^.*restored\s+(.+)$/i
    ];
    for(const pattern of patterns){
      const match = title.match(pattern);
      if(match && match[1]) return String(match[1]).trim();
    }
    return title;
  }

  function canGroupRosterMoveEntries(current, next){
    if(!current || !next) return false;
    const currentTs = Number(current?.ts || 0);
    const nextTs = Number(next?.ts || 0);
    if(Math.abs(currentTs - nextTs) > 120) return false;
    const pair = [getRosterMoveVerb(current), getRosterMoveVerb(next)].join(':');
    return pair === 'add:drop' || pair === 'activate:il';
  }

  function buildGroupedRosterMoveEntry(entries){
    const items = Array.isArray(entries) ? entries : [];
    const primary = items[0] || null;
    if(!primary){
      return null;
    }
    if(items.length === 2){
      const firstVerb = getRosterMoveVerb(items[0]);
      const secondVerb = getRosterMoveVerb(items[1]);
      if(firstVerb === 'add' && secondVerb === 'drop'){
        return {
          title: 'Added ' + getRosterMovePlayerName(items[0]) + ', dropped ' + getRosterMovePlayerName(items[1]),
          body: String(items[0]?.text || items[1]?.text || 'Roster move recorded.').trim(),
          meta: ['WAIVER']
        };
      }
      if(firstVerb === 'activate' && secondVerb === 'il'){
        return {
          title: 'Activated ' + getRosterMovePlayerName(items[0]) + ', moved ' + getRosterMovePlayerName(items[1]) + ' to IL',
          body: String(items[0]?.text || items[1]?.text || 'Roster move recorded.').trim(),
          meta: ['ROSTER']
        };
      }
    }
    const verb = getRosterMoveVerb(primary);
    if(verb === 'add'){
      return {
        title: 'Added ' + getRosterMovePlayerName(primary),
        body: String(primary?.text || 'Roster move recorded.').trim(),
        meta: ['WAIVER']
      };
    }
    if(verb === 'drop'){
      return {
        title: 'Dropped ' + getRosterMovePlayerName(primary),
        body: String(primary?.text || 'Roster move recorded.').trim(),
        meta: ['WAIVER']
      };
    }
    if(verb === 'activate'){
      return {
        title: 'Activated ' + getRosterMovePlayerName(primary),
        body: String(primary?.text || 'Roster move recorded.').trim(),
        meta: ['ROSTER']
      };
    }
    if(verb === 'il'){
      return {
        title: 'Moved ' + getRosterMovePlayerName(primary) + ' to IL',
        body: String(primary?.text || 'Roster move recorded.').trim(),
        meta: ['ROSTER']
      };
    }
    if(verb === 'restore'){
      return {
        title: 'Commissioner restored ' + getRosterMovePlayerName(primary),
        body: String(primary?.text || 'Roster move recorded.').trim(),
        meta: ['COMMISSIONER']
      };
    }
    return {
      title: String(primary?.title || 'Roster move').trim(),
      body: String(primary?.text || 'Roster move recorded.').trim(),
      meta: [String(primary?.type || 'activity').trim().toUpperCase()]
    };
  }

  function buildRecentRosterMovesSummary(slot, state){
    const entries = (Array.isArray(state?.activityLog) ? state.activityLog : [])
      .filter(function(entry){
        return isControlledTeamActivity(slot, state, entry) && isRosterChangingActivityEntry(entry);
      })
      .slice()
      .sort(function(a, b){
        return Number(b?.ts || 0) - Number(a?.ts || 0);
      });

    const grouped = [];
    for(let index = 0; index < entries.length && grouped.length < RECENT_ROSTER_MOVES_LIMIT; index += 1){
      const current = entries[index];
      const next = entries[index + 1];
      if(canGroupRosterMoveEntries(current, next)){
        grouped.push(buildGroupedRosterMoveEntry([current, next]));
        index += 1;
        continue;
      }
      grouped.push(buildGroupedRosterMoveEntry([current]));
    }
    return grouped.filter(Boolean);
  }
```

- [ ] **Step 2: Thread `recentRosterMoves` into the view model**

Update the existing builder:

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
      recentRosterMoves: buildRecentRosterMovesSummary(slot, state),
      currentTeamState: buildCurrentTeamStateSummary(slot, state, rosterCore)
    };
  }
```

- [ ] **Step 3: Run the regression again to verify the helper layer is still red on missing UI**

Run:

```bash
node .\tools\test-historical-universe-details.js
```

Expected:

- `FAIL`
- missing `recentRosterMovesList` hook or missing render wiring for the new section

---

### Task 3: Render the `Recent Roster Moves` section and finish verification

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historic-universe.html`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-universe-details.js`
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-drafted-universe-snapshot.js`
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-universe-slot-storage.js`

- [ ] **Step 1: Add the new section under `Recent Simulation`**

Insert this panel directly below the existing `Recent Simulation` article:

```html
          <article class="panel card-pad">
            <div class="section-kicker">Recent Roster Moves</div>
            <div class="section-title">How Your Roster Changed</div>
            <div class="section-copy">The latest team-first roster moves, grouped into compact archive notes instead of full transaction history.</div>
            <div class="detail-list" id="recentRosterMovesList">
              <div class="detail-item">
                <strong>Loading recent roster moves</strong>
                <span>Preparing the latest roster changes.</span>
              </div>
            </div>
          </article>
```

- [ ] **Step 2: Wire `recentRosterMoves` into `renderUniverse()`**

Read the new view-model field and render it with the existing detail-card language:

```js
    const recentRosterMoves = Array.isArray(detailsViewModel.recentRosterMoves)
      ? detailsViewModel.recentRosterMoves
      : [];

    document.getElementById('recentRosterMovesList').innerHTML = renderDetailList(
      recentRosterMoves,
      'detail-item',
      {
        title: 'No recent roster moves',
        body: 'This universe has not logged recent team roster changes yet.'
      }
    );
```

- [ ] **Step 3: Add render assertions for the new section**

Extend the test with these render-level checks:

```js
const renderedRosterMoves = context.renderDetailList(
  viewModel.recentRosterMoves,
  'detail-item',
  {
    title: 'No recent roster moves',
    body: 'This universe has not logged recent team roster changes yet.'
  }
);
assert.match(renderedRosterMoves, /Added Brent Barry, dropped Dell Curry/);
assert.match(renderedRosterMoves, /Activated Kevin Johnson, moved Mookie Blaylock to IL/);
assert.doesNotMatch(renderedRosterMoves, /CPU Team 1 added Dell Curry/);
assert.doesNotMatch(renderedRosterMoves, /started Ron Harper/i);
assert.match(html, /id="recentRosterMovesList"/);

const emptyRosterMoves = context.renderDetailList(
  noRosterMoveHistory.recentRosterMoves,
  'detail-item',
  {
    title: 'No recent roster moves',
    body: 'This universe has not logged recent team roster changes yet.'
  }
);
assert.match(emptyRosterMoves, /No recent roster moves/);
```

- [ ] **Step 4: Run the focused regression and verify it passes**

Run:

```bash
node .\tools\test-historical-universe-details.js
```

Expected:

- `PASS`
- `historical universe details test passed`

- [ ] **Step 5: Run the supporting historical-universe regressions**

Run:

```bash
node .\tools\test-historical-drafted-universe-snapshot.js
node .\tools\test-historical-universe-slot-storage.js
```

Expected:

- both commands `PASS`

- [ ] **Step 6: Commit the finished `v3` implementation**

```bash
git add historic-universe.html tools/test-historical-universe-details.js
git commit -m "feat: add universe details roster move history"
```

### Task 4: Manual browser QA of roster-move readability

**Files:**
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historic-universe.html`

- [ ] **Step 1: Open a saved simulation universe and inspect the new section**

Manual QA checklist:

- `Recent Roster Moves` appears directly under `Recent Simulation`
- the section shows at most `5` grouped items
- add/drop and activate/IL pairs read like one move
- the section feels team-first and compact
- the empty state reads cleanly when a universe has no roster-change history

- [ ] **Step 2: Confirm the page still reads like `Universe Details`, not a transaction ledger**

Verify:

- `Recent Roster Moves` complements `Recent Simulation` instead of duplicating it
- `Current Team State` still reads like the “where the roster stands now” snapshot
- the page remains scannable on desktop and mobile widths

- [ ] **Step 3: Commit any QA-only copy or spacing touch-ups if needed**

If browser QA requires a final small polish:

```bash
git add historic-universe.html tools/test-historical-universe-details.js
git commit -m "fix: polish universe details roster move history"
```
