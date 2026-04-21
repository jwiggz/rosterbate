# Universe Details Sim-State V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-only `Universe Details` refresh that leads with the latest sim-day story, then shows light league context, recent universe activity, and current team state for saved historical simulation universes.

**Architecture:** Keep the work inside [C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historic-universe.html](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/historic-universe.html) by adding a small derived-state layer over existing saved slot/state fields and rendering that view model into a new team-first panel hierarchy. Guard the page with one focused Node regression that extracts the new helper functions from the page script, checks the new DOM hooks, and exercises both full-data and degraded-data paths.

**Tech Stack:** Vanilla HTML/CSS/JS, Node.js `assert/fs/path/vm`, existing saved historical universe state

---

### Task 1: Add a focused Universe Details sim-state regression

**Files:**
- Create: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-universe-details.js`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-universe-details.js`

- [ ] **Step 1: Write the failing regression file**

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'historic-universe.html'),
  'utf8'
);

function expectMatch(pattern, message) {
  assert.match(html, pattern, message);
}

function extractFunctionSource(name, nextName) {
  const start = html.indexOf(`function ${name}`);
  assert.ok(start >= 0, `missing ${name}`);
  const end = html.indexOf(`\n  function ${nextName}`, start);
  assert.ok(end >= 0, `missing ${nextName}`);
  return html.slice(start, end);
}

expectMatch(/id="latestSimDayHeadline"/, 'latest sim-day headline node is missing');
expectMatch(/id="leagueSnapshotList"/, 'league snapshot list node is missing');
expectMatch(/id="recentActivityList"/, 'recent activity list node is missing');
expectMatch(/id="currentTeamStateList"/, 'current team state list node is missing');
expectMatch(/function buildUniverseDetailsViewModel\(slot, state, config\)/, 'view-model builder is missing');

const script = [
  extractFunctionSource('getLatestRevealReport(state)', 'buildRosterCore(state)'),
  extractFunctionSource('buildRosterCore(state)', 'getStandingContext(state)'),
  extractFunctionSource('getStandingContext(state)', 'buildLatestSimDaySummary(slot, state, reveal, standing)'),
  extractFunctionSource('buildLatestSimDaySummary(slot, state, reveal, standing)', 'buildLeagueSnapshotSummary(slot, state, standing)'),
  extractFunctionSource('buildLeagueSnapshotSummary(slot, state, standing)', 'buildRecentUniverseActivitySummary(state, reveal)'),
  extractFunctionSource('buildRecentUniverseActivitySummary(state, reveal)', 'buildCurrentTeamStateSummary(slot, state, rosterCore)'),
  extractFunctionSource('buildCurrentTeamStateSummary(slot, state, rosterCore)', 'buildUniverseDetailsViewModel(slot, state, config)'),
  extractFunctionSource('buildUniverseDetailsViewModel(slot, state, config)', 'renderUniverse(slot, state, config)')
].join('\n');

const slot = {
  title: 'Top300 Regression League',
  teamName: 'Audit Agents',
  currentWeek: 3,
  currentDay: 4,
  wins: 5,
  losses: 2,
  pf: 923.4,
  leagueSize: 10,
  playerPoolCount: 300
};

const state = {
  myPos: 0,
  teams: ['Audit Agents', 'CPU Team 1', 'CPU Team 2', 'CPU Team 3'],
  rosters: [[
    { id: 1, name: 'Michael Jordan', team: 'CHI', pos: 'SG', fp: 52.4, totalFantasyPoints: 314.7, injuryStatus: null },
    { id: 2, name: 'Scottie Pippen', team: 'CHI', pos: 'SF', fp: 44.1, totalFantasyPoints: 276.2, injuryStatus: 'GTD' },
    { id: 3, name: 'Alonzo Mourning', team: 'MIA', pos: 'C', fp: 40.9, totalFantasyPoints: 255.4, injuryStatus: 'OUT' }
  ]],
  starters: [[
    { id: 1, name: 'Michael Jordan', team: 'CHI', pos: 'SG', fp: 52.4, totalFantasyPoints: 314.7 }
  ]],
  standings: [
    { teamIdx: 1, w: 6, l: 1, pf: 940.2 },
    { teamIdx: 0, w: 5, l: 2, pf: 923.4 },
    { teamIdx: 2, w: 5, l: 2, pf: 912.7 },
    { teamIdx: 3, w: 4, l: 3, pf: 904.3 }
  ],
  dailyRevealReports: {
    '10': {
      day: 10,
      week: 3,
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
    { id: 'a1', type: 'waiver', title: 'CPU Team 1 added Brent Barry', text: 'Dropped an inactive bench wing for a live scorer.', ts: 10 },
    { id: 'a2', type: 'activation', title: 'CPU Team 3 activated Kevin Johnson', text: 'Healthy guard returned from IL.', ts: 9 }
  ]
};

const context = { console };
vm.createContext(context);
vm.runInContext(script, context, { filename: 'historic-universe-details.js' });

const viewModel = context.buildUniverseDetailsViewModel(slot, state, {});
assert.match(viewModel.latestSimDay.headline, /Audit Agents/i);
assert.equal(viewModel.leagueSnapshot.length, 3);
assert.equal(viewModel.recentActivity.length, 2);
assert.match(viewModel.currentTeamState[0].title, /Michael Jordan/);

const degraded = context.buildUniverseDetailsViewModel(
  slot,
  { myPos: 0, teams: ['Audit Agents'], rosters: [[]], standings: [], dailyRevealReports: {} },
  {}
);
assert.match(degraded.latestSimDay.headline, /No completed sim day yet/i);
assert.equal(degraded.leagueSnapshot.length, 1);
assert.match(degraded.recentActivity[0].body, /No recent universe activity/i);

console.log('historical universe details test passed');
```

- [ ] **Step 2: Run the regression to verify it fails**

Run: `node .\tools\test-historical-universe-details.js`  
Expected: `FAIL` because the new DOM hooks and helper functions do not exist yet in [C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historic-universe.html](C:/Users/jabro/Desktop/Fantasy%20Project/rosterbate/historic-universe.html)

### Task 2: Build the derived sim-state view model inside `historic-universe.html`

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historic-universe.html`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-universe-details.js`

- [ ] **Step 1: Add the new helper functions below `getStandingContext(state)`**

```js
  function buildLatestSimDaySummary(slot, state, reveal, standing){
    const myPos = Number(state?.myPos);
    const teams = Array.isArray(state?.teams) ? state.teams : [];
    const myTeamName = String(slot?.teamName || teams[myPos] || 'Your Team').trim();
    const matchups = Array.isArray(reveal?.matchups) ? reveal.matchups : [];
    const myMatchup = matchups.find(function(item){
      return Number(item?.teamIdx) === myPos || Number(item?.opponentIdx) === myPos;
    }) || null;

    if(!reveal){
      return {
        headline: 'No completed sim day yet',
        copy: 'This saved universe has not published a latest sim-day recap yet.',
        pills: ['Waiting for reveal data']
      };
    }

    if(!myMatchup){
      return {
        headline: reveal?.story?.headline || 'Latest sim day is ready',
        copy: reveal?.story?.subheadline || 'The latest simulation summary is available, but this save did not include a team-specific matchup line.',
        pills: [
          'Week ' + String(reveal?.week || slot?.currentWeek || '--'),
          'Day ' + String(reveal?.day || slot?.currentDay || '--'),
          standing?.rank ? ('Rank #' + String(standing.rank)) : 'Rank pending'
        ]
      };
    }

    const scored = Number(myMatchup?.teamIdx) === myPos
      ? Number(myMatchup?.teamScore || 0)
      : Number(myMatchup?.opponentScore || 0);
    const allowed = Number(myMatchup?.teamIdx) === myPos
      ? Number(myMatchup?.opponentScore || 0)
      : Number(myMatchup?.teamScore || 0);
    const opponentName = Number(myMatchup?.teamIdx) === myPos
      ? String(myMatchup?.opponentName || 'Unknown Opponent')
      : String(myMatchup?.teamName || 'Unknown Opponent');
    const resultWord = scored >= allowed ? 'beat' : 'fell to';
    const swing = Math.abs(scored - allowed).toFixed(1);

    return {
      headline: myTeamName + ' ' + resultWord + ' ' + opponentName,
      copy: (reveal?.story?.subheadline || '') || ('Final margin: ' + swing + ' fantasy points.'),
      pills: [
        'Week ' + String(reveal?.week || slot?.currentWeek || '--') + ' Day ' + String(reveal?.day || slot?.currentDay || '--'),
        scored.toFixed(1) + ' - ' + allowed.toFixed(1),
        standing?.rank ? ('Rank #' + String(standing.rank)) : 'Rank pending'
      ]
    };
  }

  function buildLeagueSnapshotSummary(slot, state, standing){
    const standings = Array.isArray(state?.standings) ? state.standings.slice() : [];
    const myPos = Number(state?.myPos);
    if(!standings.length){
      return [{
        title: 'Standings not available yet',
        body: 'This universe has not saved a league table yet.',
        meta: ['Record pending']
      }];
    }
    standings.sort(function(a, b){
      const winDiff = Number(b?.w || 0) - Number(a?.w || 0);
      if(winDiff) return winDiff;
      return Number(b?.pf || 0) - Number(a?.pf || 0);
    });
    const rank = standing?.rank ? standing.rank - 1 : Math.max(0, standings.findIndex(function(entry){ return Number(entry?.teamIdx) === myPos; }));
    return standings.slice(Math.max(0, rank - 1), Math.min(standings.length, rank + 2)).map(function(entry, index){
      const teamName = String((state?.teams || [])[Number(entry?.teamIdx)] || ('Team ' + String(Number(entry?.teamIdx) + 1))).trim();
      const absoluteRank = Math.max(1, Math.max(0, rank - 1) + index + 1);
      return {
        title: '#' + String(absoluteRank) + ' ' + teamName,
        body: Number(entry?.teamIdx) === myPos ? 'Your current standing window.' : 'Closest league pressure point.',
        meta: [
          String(Number(entry?.w || 0)) + '-' + String(Number(entry?.l || 0)),
          'PF ' + Number(entry?.pf || 0).toFixed(1)
        ]
      };
    });
  }

  function buildRecentUniverseActivitySummary(state, reveal){
    const items = Array.isArray(state?.activityLog) ? state.activityLog.slice(0, 4) : [];
    if(items.length){
      return items.map(function(item){
        return {
          title: String(item?.title || 'Recent league activity').trim(),
          body: String(item?.text || 'Recent universe activity was logged.').trim(),
          meta: [String(item?.type || 'activity').trim().toUpperCase()]
        };
      });
    }
    if(Number(reveal?.totalTransactions || 0) > 0){
      return [{
        title: 'Recent transaction window',
        body: String(reveal.totalTransactions) + ' move(s) landed before the latest sim-day report locked.',
        meta: ['Reveal summary']
      }];
    }
    return [{
      title: 'No recent universe activity',
      body: 'This saved universe has not recorded recent waiver, IL, or sim maintenance activity yet.',
      meta: ['Quiet now']
    }];
  }

  function buildCurrentTeamStateSummary(slot, state, rosterCore){
    const roster = Array.isArray(state?.rosters) ? state.rosters[Number(state?.myPos)] : [];
    const unavailableCount = Array.isArray(roster)
      ? roster.filter(function(player){ return !!String(player?.injuryStatus || '').trim(); }).length
      : 0;
    const availableCount = Array.isArray(roster) ? Math.max(0, roster.length - unavailableCount) : 0;
    const summaryItems = Array.isArray(rosterCore) ? rosterCore.slice(0, 4).map(function(player){
      return {
        title: player.name,
        body: [player.team, player.pos].filter(Boolean).join(' - ') || 'Current roster anchor',
        meta: ['FP ' + player.fp, 'TFP ' + player.tfp]
      };
    }) : [];

    summaryItems.unshift({
      title: 'Roster availability',
      body: availableCount + ' available, ' + unavailableCount + ' unavailable',
      meta: ['Week ' + String(slot?.currentWeek || state?.currentWeek || '--'), 'Day ' + String(slot?.currentDay || state?.currentDay || '--')]
    });

    return summaryItems;
  }

  function buildUniverseDetailsViewModel(slot, state, config){
    const reveal = getLatestRevealReport(state);
    const standing = getStandingContext(state);
    const rosterCore = buildRosterCore(state);
    return {
      reveal: reveal,
      standing: standing,
      rosterCore: rosterCore,
      latestSimDay: buildLatestSimDaySummary(slot, state, reveal, standing),
      leagueSnapshot: buildLeagueSnapshotSummary(slot, state, standing),
      recentActivity: buildRecentUniverseActivitySummary(state, reveal),
      currentTeamState: buildCurrentTeamStateSummary(slot, state, rosterCore)
    };
  }
```

- [ ] **Step 2: Run the regression again to verify the helper layer is still red**

Run: `node .\tools\test-historical-universe-details.js`  
Expected: `FAIL` on missing DOM hooks because the page shell still renders the old `Universe Snapshot` / `Pack Identity` layout

### Task 3: Render the new team-first panel hierarchy and finish verification

**Files:**
- Modify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\historic-universe.html`
- Test: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-universe-details.js`
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-drafted-universe-snapshot.js`
- Verify: `C:\Users\jabro\Desktop\Fantasy Project\rosterbate\tools\test-historical-universe-slot-storage.js`

- [ ] **Step 1: Replace the old generic cards with the new four-panel hierarchy**

```html
      <section class="grid">
        <div class="stack">
          <article class="panel card-pad">
            <div class="section-kicker">Latest Sim Day</div>
            <div class="section-title">What Just Happened</div>
            <div class="section-copy" id="latestSimDayCopy">Loading latest sim-day summary...</div>
            <div class="reveal-story">
              <div class="reveal-headline" id="latestSimDayHeadline">Loading latest sim day</div>
              <div class="reveal-copy" id="latestSimDayNarrative">Preparing saved sim-day recap.</div>
              <div class="roster-item-meta" id="latestSimDayPills"></div>
            </div>
          </article>

          <article class="panel card-pad">
            <div class="section-kicker">Current Team State</div>
            <div class="section-title">How The Roster Looks Now</div>
            <div class="section-copy">A compact read on the roster spine, availability, and the players currently carrying this universe.</div>
            <div class="roster-list" id="currentTeamStateList">
              <div class="roster-item">
                <strong>Loading team state</strong>
                <span>Preparing saved roster context.</span>
              </div>
            </div>
          </article>
        </div>

        <div class="stack">
          <article class="panel card-pad">
            <div class="section-kicker">League Snapshot</div>
            <div class="section-title">Where You Stand</div>
            <div class="section-copy">A small standings window centered on your team instead of a full league table dump.</div>
            <div class="info-list" id="leagueSnapshotList">
              <div class="info-item">
                <strong>Loading league snapshot</strong>
                <span>Preparing nearby standings context.</span>
              </div>
            </div>
          </article>

          <article class="panel card-pad">
            <div class="section-kicker">Recent Universe Activity</div>
            <div class="section-title">What Changed Recently</div>
            <div class="section-copy">Recent waiver, IL, activation, and sim-maintenance signals pulled from the saved universe state.</div>
            <div class="info-list" id="recentActivityList">
              <div class="info-item">
                <strong>Loading recent activity</strong>
                <span>Preparing the latest universe changes.</span>
              </div>
            </div>
          </article>
        </div>
      </section>
```

- [ ] **Step 2: Update `renderUniverse(slot, state, config)` to render the new view model**

```js
    const viewModel = buildUniverseDetailsViewModel(slot, state, config);

    document.getElementById('latestSimDayHeadline').textContent = viewModel.latestSimDay.headline;
    document.getElementById('latestSimDayCopy').textContent = viewModel.latestSimDay.copy;
    document.getElementById('latestSimDayNarrative').textContent = reveal?.story?.subheadline || viewModel.latestSimDay.copy;
    document.getElementById('latestSimDayPills').innerHTML = viewModel.latestSimDay.pills.map(function(label){
      return '<span class="pill">' + escapeHtml(label) + '</span>';
    }).join('');

    document.getElementById('leagueSnapshotList').innerHTML = viewModel.leagueSnapshot.map(function(item){
      return '<div class="info-item"><strong>' + escapeHtml(item.title) + '</strong><span>' + escapeHtml(item.body) + '</span><div class="info-item-meta">' + item.meta.map(function(meta){ return '<span class="pill">' + escapeHtml(meta) + '</span>'; }).join('') + '</div></div>';
    }).join('');

    document.getElementById('recentActivityList').innerHTML = viewModel.recentActivity.map(function(item){
      return '<div class="info-item"><strong>' + escapeHtml(item.title) + '</strong><span>' + escapeHtml(item.body) + '</span><div class="info-item-meta">' + item.meta.map(function(meta){ return '<span class="pill">' + escapeHtml(meta) + '</span>'; }).join('') + '</div></div>';
    }).join('');

    document.getElementById('currentTeamStateList').innerHTML = viewModel.currentTeamState.map(function(item){
      return '<div class="roster-item"><strong>' + escapeHtml(item.title) + '</strong><span>' + escapeHtml(item.body) + '</span><div class="roster-item-meta">' + item.meta.map(function(meta){ return '<span class="pill">' + escapeHtml(meta) + '</span>'; }).join('') + '</div></div>';
    }).join('');
```

- [ ] **Step 3: Run the focused and adjacent verification suite**

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

- [ ] **Step 4: Run manual browser QA**

Run: `py -m http.server 8080`

Then verify in a browser:

1. Open [http://localhost:8080/historic-seasons.html?sport=nba](http://localhost:8080/historic-seasons.html?sport=nba)
2. Open one saved simulation universe from the archive list
3. Confirm the page clearly answers:
   - what happened last sim day?
   - where am I in the league?
   - what changed recently?
   - what shape is my team in now?
4. Resize to a narrow/mobile width and confirm the four panels remain scannable and still feel like an archive/details page rather than a second season-management screen

- [ ] **Step 5: Commit the completed page refresh**

```bash
git add historic-universe.html tools/test-historical-universe-details.js
git commit -m "feat: add sim-state summaries to universe details"
```
