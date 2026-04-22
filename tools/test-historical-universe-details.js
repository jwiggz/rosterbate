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

function expectNoMatch(pattern, message) {
  assert.doesNotMatch(html, pattern, message);
}

function extractFunctionSource(signature) {
  const start = html.indexOf(`function ${signature}`);
  assert.ok(start >= 0, `missing ${signature}`);
  return extractFunctionSourceAt(start, signature);
}

function extractFunctionSourceAt(start, signature) {
  assert.ok(start >= 0, `missing ${signature}`);

  const openBrace = html.indexOf('{', start);
  assert.ok(openBrace >= 0, `missing body for ${signature}`);

  let functionDepth = 0;
  let templateExprDepth = 0;
  let mode = 'code';
  const stack = [];

  for (let index = openBrace; index < html.length; index += 1) {
    const char = html[index];
    const next = html[index + 1];

    if (mode === 'lineComment') {
      if (char === '\n') {
        mode = stack.pop() || 'code';
      }
      continue;
    }

    if (mode === 'blockComment') {
      if (char === '*' && next === '/') {
        mode = stack.pop() || 'code';
        index += 1;
      }
      continue;
    }

    if (mode === 'singleQuote') {
      if (char === '\\') {
        index += 1;
        continue;
      }
      if (char === '\'') {
        mode = stack.pop() || 'code';
      }
      continue;
    }

    if (mode === 'doubleQuote') {
      if (char === '\\') {
        index += 1;
        continue;
      }
      if (char === '"') {
        mode = stack.pop() || 'code';
      }
      continue;
    }

    if (mode === 'template') {
      if (char === '\\') {
        index += 1;
        continue;
      }
      if (char === '`') {
        mode = stack.pop() || 'code';
        continue;
      }
      if (char === '$' && next === '{') {
        mode = 'templateCode';
        templateExprDepth = 1;
        functionDepth += 1;
        index += 1;
      }
      continue;
    }

    if (mode === 'templateCode') {
      if (char === '/' && next === '/') {
        stack.push(mode);
        mode = 'lineComment';
        index += 1;
        continue;
      }
      if (char === '/' && next === '*') {
        stack.push(mode);
        mode = 'blockComment';
        index += 1;
        continue;
      }
      if (char === '\'') {
        stack.push(mode);
        mode = 'singleQuote';
        continue;
      }
      if (char === '"') {
        stack.push(mode);
        mode = 'doubleQuote';
        continue;
      }
      if (char === '`') {
        stack.push(mode);
        mode = 'template';
        continue;
      }
      if (char === '{') {
        functionDepth += 1;
        templateExprDepth += 1;
        continue;
      }
      if (char === '}') {
        functionDepth -= 1;
        templateExprDepth -= 1;
        if (functionDepth === 0) {
          return html.slice(start, index + 1);
        }
        if (templateExprDepth === 0) {
          mode = 'template';
        }
        continue;
      }
      continue;
    }

    if (char === '/' && next === '/') {
      stack.push(mode);
      mode = 'lineComment';
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      stack.push(mode);
      mode = 'blockComment';
      index += 1;
      continue;
    }
    if (char === '\'') {
      stack.push(mode);
      mode = 'singleQuote';
      continue;
    }
    if (char === '"') {
      stack.push(mode);
      mode = 'doubleQuote';
      continue;
    }
    if (char === '`') {
      stack.push(mode);
      mode = 'template';
      continue;
    }
    if (char === '{') {
      functionDepth += 1;
      continue;
    }
    if (char === '}') {
      functionDepth -= 1;
      if (functionDepth === 0) {
        return html.slice(start, index + 1);
      }
    }
  }

  assert.fail(`unterminated ${signature}`);
}

function extractFunctionSpan(startSignature, endSignature) {
  const start = html.indexOf(`function ${startSignature}`);
  assert.ok(start >= 0, `missing ${startSignature}`);

  const endStart = html.indexOf(`function ${endSignature}`, start);
  assert.ok(endStart >= 0, `missing ${endSignature}`);

  const endSource = extractFunctionSourceAt(endStart, endSignature);
  return html.slice(start, endStart) + endSource;
}

const script = [
  [
    'function escapeHtml(value){',
    "  return String(value == null ? '' : value)",
    "    .replace(/&/g,'&amp;')",
    "    .replace(/</g,'&lt;')",
    "    .replace(/>/g,'&gt;')",
    "    .replace(/\"/g,'&quot;')",
    "    .replace(/'/g,'&#39;');",
    '}'
  ].join('\n'),
  extractFunctionSource('getLatestRevealReport(state)'),
  extractFunctionSource('getRecentRevealReports(state, limit)'),
  extractFunctionSource('getTeamRoster(state)'),
  extractFunctionSource('buildRosterCore(state)'),
  extractFunctionSource('buildRecentSimulationSummary(slot, state)'),
  extractFunctionSource('renderRecentSimulationCards(items)'),
  extractFunctionSpan('sortStandingsEntries(standings)', 'buildUniverseDetailsViewModel(slot, state, config)')
].join('\n\n');
const renderUniverseSource = extractFunctionSource('renderUniverse(slot, state, config)');

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

const context = { console };
vm.createContext(context);
vm.runInContext(script, context, { filename: 'historic-universe-details.js' });

const viewModel = JSON.parse(JSON.stringify(
  context.buildUniverseDetailsViewModel(slot, state, {})
));

assert.deepStrictEqual(viewModel.latestSimDay, {
  copy: 'Week 3, Day 10 is the latest completed archive beat for Audit Agents.',
  headline: 'Audit Agents beat CPU Team 2',
  narrative: 'Jordan led the latest sim-day swing and kept the team in second.',
  pills: ['Week 3 Day 10', '162.8 - 148.9', 'Rank #2']
});

const reverseMatchupViewModel = JSON.parse(JSON.stringify(
  context.buildUniverseDetailsViewModel(
    slot,
    Object.assign({}, state, {
      dailyRevealReports: {
        '11': {
          day: 11,
          week: 3,
          story: {
            headline: 'CPU Team 1 held off Audit Agents',
            subheadline: 'The comeback ran out late.'
          },
          matchups: [
            { teamIdx: 1, opponentIdx: 0, teamName: 'CPU Team 1', opponentName: 'Audit Agents', teamScore: 151.3, opponentScore: 146.8 }
          ]
        }
      }
    }),
    {}
  )
));

assert.deepStrictEqual(reverseMatchupViewModel.latestSimDay, {
  copy: 'Week 3, Day 11 is the latest completed archive beat for Audit Agents.',
  headline: 'Audit Agents fell to CPU Team 1',
  narrative: 'The comeback ran out late.',
  pills: ['Week 3 Day 11', '146.8 - 151.3', 'Rank #2']
});

const tiedMatchupViewModel = JSON.parse(JSON.stringify(
  context.buildUniverseDetailsViewModel(
    slot,
    Object.assign({}, state, {
      dailyRevealReports: {
        '11': {
          day: 11,
          week: 3,
          story: {
            headline: 'Audit Agents and CPU Team 2 traded blows on Day 11',
            subheadline: 'Both sides finished level after the final sim-day swing.'
          },
          matchups: [
            { teamIdx: 0, opponentIdx: 2, teamName: 'Audit Agents', opponentName: 'CPU Team 2', teamScore: 150.0, opponentScore: 150.0 }
          ]
        }
      }
    }),
    {}
  )
));

assert.deepStrictEqual(tiedMatchupViewModel.latestSimDay, {
  copy: 'Week 3, Day 11 is the latest completed archive beat for Audit Agents.',
  headline: 'Audit Agents tied CPU Team 2',
  narrative: 'Both sides finished level after the final sim-day swing.',
  pills: ['Week 3 Day 11', '150.0 - 150.0', 'Rank #2']
});
assert.match(tiedMatchupViewModel.recentSimDays[0].teamResult.headline, /Audit Agents tied CPU Team 2/i);
assert.match(
  context.renderRecentSimulationCards(tiedMatchupViewModel.recentSimDays),
  /Audit Agents tied CPU Team 2/i
);

assert.equal(viewModel.recentSimDays.length, 3);
assert.deepStrictEqual(
  viewModel.recentSimDays.map(item => item.day),
  [10, 9, 8]
);
assert.deepStrictEqual(
  viewModel.recentSimDays.map(item => item.week),
  [3, 3, 3]
);
assert.deepStrictEqual(
  viewModel.recentSimDays.map(item => item.story),
  [
    {
      headline: 'Audit Agents close strong on Day 10',
      body: 'Jordan led the latest sim-day swing and kept the team in second.'
    },
    {
      headline: 'CPU Team 1 clipped Audit Agents on Day 9',
      body: 'The offense cooled off late.'
    },
    {
      headline: 'Audit Agents survived a grinder on Day 8',
      body: 'The defense carried a close finish.'
    }
  ]
);
assert.match(viewModel.recentSimDays[0].teamResult.headline, /Audit Agents beat CPU Team 2/i);
assert.equal(viewModel.recentSimDays[0].teamActivity.length, 2);
assert.match(viewModel.recentSimDays[0].teamActivity[0].title, /Audit Agents/i);
assert.match(viewModel.recentSimDays[0].leagueNote.title, /CPU Team 1/i);
assert.match(viewModel.recentSimDays[1].teamResult.headline, /Audit Agents fell to CPU Team 1/i);
assert.equal(viewModel.recentSimDays[1].teamActivity.length, 1);
assert.match(viewModel.recentSimDays[1].teamActivity[0].title, /Audit Agents added Buck Williams/i);
assert.match(viewModel.recentSimDays[1].leagueNote.title, /CPU Team 3 activated Kevin Johnson/i);
assert.match(viewModel.recentSimDays[1].leagueNote.body, /Healthy guard returned from IL\./i);
assert.equal(viewModel.recentSimDays[2].teamActivity.length, 0);
assert.match(viewModel.recentSimDays[2].teamResult.headline, /Audit Agents beat CPU Team 3/i);
assert.match(viewModel.recentSimDays[2].leagueNote.title, /CPU Team 2 added Danny Manning/i);
assert.match(viewModel.recentSimDays[2].leagueNote.body, /Added another forward before Day 8\./i);

const renderedRecentSimCard = context.renderRecentSimulationCards([viewModel.recentSimDays[0]]);
assert.match(renderedRecentSimCard, /Audit Agents beat CPU Team 2/);
assert.match(renderedRecentSimCard, /Jordan led the latest sim-day swing and kept the team in second\./);
assert.match(renderedRecentSimCard, /Team activity: Audit Agents added Brent Barry/);
assert.match(renderedRecentSimCard, /League note: CPU Team 1 added Dell Curry - Found a hot hand before the next lock\./);
assert.ok(
  renderedRecentSimCard.indexOf('Audit Agents beat CPU Team 2') <
  renderedRecentSimCard.indexOf('Jordan led the latest sim-day swing and kept the team in second.'),
  'recent simulation cards should render the story after the team result'
);
assert.ok(
  renderedRecentSimCard.indexOf('Jordan led the latest sim-day swing and kept the team in second.') <
  renderedRecentSimCard.indexOf('Team activity: Audit Agents added Brent Barry'),
  'recent simulation cards should render team activity after the story'
);
assert.ok(
  renderedRecentSimCard.indexOf('Team activity: Audit Agents added Brent Barry') <
  renderedRecentSimCard.indexOf('League note: CPU Team 1 added Dell Curry - Found a hot hand before the next lock.'),
  'recent simulation cards should render the league note after team activity'
);

const ascendingActivityWindow = JSON.parse(JSON.stringify(
  context.buildUniverseDetailsViewModel(
    slot,
    {
      myPos: 0,
      teams: ['Audit Agents', 'CPU Team 1'],
      rosters: [[]],
      standings: [],
      dailyRevealReports: {
        '10': {
          day: 10,
          week: 3,
          generatedAt: 10000,
          story: {
            headline: 'Transaction window',
            subheadline: 'Newest activity should win even when the feed arrives oldest-first.'
          },
          matchups: [],
          totalTransactions: 3
        }
      },
      activityLog: [
        { id: 'a1', type: 'waiver', title: 'Audit Agents added Brent Barry', text: 'Dropped an inactive bench wing for a live scorer.', teamIdx: 0, ts: 9800 },
        { id: 'a2', type: 'activation', title: 'Audit Agents activated Kevin Johnson', text: 'Healthy guard returned from IL.', teamIdx: 0, ts: 9900 },
        { id: 'a3', type: 'trade', title: 'Audit Agents traded for Cliff Robinson', text: 'Added a frontcourt rotation piece.', teamIdx: 0, ts: 10000 }
      ]
    },
    {}
  )
));
assert.deepStrictEqual(ascendingActivityWindow.recentSimDays[0].teamActivity, [
  {
    title: 'Audit Agents traded for Cliff Robinson',
    body: 'Added a frontcourt rotation piece.'
  },
  {
    title: 'Audit Agents activated Kevin Johnson',
    body: 'Healthy guard returned from IL.'
  }
]);
assert.doesNotMatch(
  context.renderRecentSimulationCards(ascendingActivityWindow.recentSimDays),
  /Audit Agents added Brent Barry/,
  'oldest-first activity logs should not surface the oldest team activity on the compact card'
);

const teamOnlyTransactionWindow = JSON.parse(JSON.stringify(
  context.buildUniverseDetailsViewModel(
    slot,
    {
      myPos: 0,
      teams: ['Audit Agents', 'CPU Team 1'],
      rosters: [[]],
      standings: [],
      dailyRevealReports: {
        '10': {
          day: 10,
          week: 3,
          generatedAt: 10000,
          story: {
            headline: 'Transaction window',
            subheadline: 'Detailed activity feed was unavailable.'
          },
          matchups: [],
          totalTransactions: 1
        }
      },
      activityLog: [
        { id: 't1', type: 'waiver', title: 'Audit Agents added Brent Barry', text: 'Dropped an inactive bench wing for a live scorer.', teamIdx: 0, ts: 9900 }
      ]
    },
    {}
  )
));
assert.deepStrictEqual(teamOnlyTransactionWindow.recentSimDays[0].teamActivity, [
  {
    title: 'Audit Agents added Brent Barry',
    body: 'Dropped an inactive bench wing for a live scorer.'
  }
]);
assert.equal(teamOnlyTransactionWindow.recentSimDays[0].leagueNote, null);
assert.doesNotMatch(
  context.renderRecentSimulationCards(teamOnlyTransactionWindow.recentSimDays),
  /League note:/,
  'team-only transaction windows should not render a generic league note'
);

const staleSlotActivityWindow = JSON.parse(JSON.stringify(
  context.buildUniverseDetailsViewModel(
    Object.assign({}, slot, { teamName: 'Stale Slot Name' }),
    {
      myPos: 0,
      teams: ['Audit Agents', 'CPU Team 1'],
      rosters: [[]],
      standings: [],
      dailyRevealReports: {
        '10': {
          day: 10,
          week: 3,
          generatedAt: 10000,
          story: {
            headline: 'Transaction window',
            subheadline: 'Saved slot metadata was stale, but the live state still knows the team.'
          },
          matchups: [],
          totalTransactions: 1
        }
      },
      activityLog: [
        { id: 's1', type: 'waiver', title: 'Audit Agents added Brent Barry', text: 'Dropped an inactive bench wing for a live scorer.', ts: 9900 }
      ]
    },
    {}
  )
));
assert.deepStrictEqual(staleSlotActivityWindow.recentSimDays[0].teamActivity, [
  {
    title: 'Audit Agents added Brent Barry',
    body: 'Dropped an inactive bench wing for a live scorer.'
  }
]);
assert.equal(staleSlotActivityWindow.recentSimDays[0].leagueNote, null);
assert.match(
  context.renderRecentSimulationCards(staleSlotActivityWindow.recentSimDays),
  /Team activity: Audit Agents added Brent Barry/
);
assert.doesNotMatch(
  context.renderRecentSimulationCards(staleSlotActivityWindow.recentSimDays),
  /League note:/,
  'live team names from state should keep user activity out of the league-note bucket'
);

const partialCoverageTransactionWindow = JSON.parse(JSON.stringify(
  context.buildUniverseDetailsViewModel(
    slot,
    {
      myPos: 0,
      teams: ['Audit Agents', 'CPU Team 1'],
      rosters: [[]],
      standings: [],
      dailyRevealReports: {
        '10': {
          day: 10,
          week: 3,
          generatedAt: 10000,
          story: {
            headline: 'Transaction window',
            subheadline: 'Detailed activity feed was unavailable.'
          },
          matchups: [],
          totalTransactions: 2
        }
      },
      activityLog: [
        { id: 't1', type: 'waiver', title: 'Audit Agents added Brent Barry', text: 'Dropped an inactive bench wing for a live scorer.', teamIdx: 0, ts: 9900 }
      ]
    },
    {}
  )
));
assert.deepStrictEqual(partialCoverageTransactionWindow.recentSimDays[0].teamActivity, [
  {
    title: 'Audit Agents added Brent Barry',
    body: 'Dropped an inactive bench wing for a live scorer.'
  }
]);
assert.deepStrictEqual(partialCoverageTransactionWindow.recentSimDays[0].leagueNote, {
  title: 'League activity recorded during the reveal window',
  body: 'Transactions were logged during this reveal window, but the compact card only shows a partial activity sample.'
});
assert.match(
  context.renderRecentSimulationCards(partialCoverageTransactionWindow.recentSimDays),
  /League note: League activity recorded during the reveal window - Transactions were logged during this reveal window, but the compact card only shows a partial activity sample\./
);

const overflowTransactionWindow = JSON.parse(JSON.stringify(
  context.buildUniverseDetailsViewModel(
    slot,
    {
      myPos: 0,
      teams: ['Audit Agents', 'CPU Team 1'],
      rosters: [[]],
      standings: [],
      dailyRevealReports: {
        '11': {
          day: 11,
          week: 3,
          generatedAt: 11000,
          story: {
            headline: 'Transaction overflow',
            subheadline: 'Only the latest two team moves fit on the card.'
          },
          matchups: [],
          totalTransactions: 3
        }
      },
      activityLog: [
        { id: 'o1', type: 'waiver', title: 'Audit Agents added Brent Barry', text: 'Dropped an inactive bench wing for a live scorer.', teamIdx: 0, ts: 10900 },
        { id: 'o2', type: 'activation', title: 'Audit Agents activated Kevin Johnson', text: 'Healthy guard returned from IL.', teamIdx: 0, ts: 10800 },
        { id: 'o3', type: 'trade', title: 'Audit Agents traded for Cliff Robinson', text: 'Added a frontcourt rotation piece.', teamIdx: 0, ts: 10700 }
      ]
    },
    {}
  )
));
assert.equal(overflowTransactionWindow.recentSimDays[0].teamActivity.length, 2);
assert.deepStrictEqual(overflowTransactionWindow.recentSimDays[0].teamActivity, [
  {
    title: 'Audit Agents added Brent Barry',
    body: 'Dropped an inactive bench wing for a live scorer.'
  },
  {
    title: 'Audit Agents activated Kevin Johnson',
    body: 'Healthy guard returned from IL.'
  }
]);
assert.deepStrictEqual(overflowTransactionWindow.recentSimDays[0].leagueNote, {
  title: 'League activity recorded during the reveal window',
  body: 'Transactions were logged during this reveal window, but the compact card only shows a partial activity sample.'
});
const overflowTransactionRendered = context.renderRecentSimulationCards(overflowTransactionWindow.recentSimDays);
assert.equal((overflowTransactionRendered.match(/Team activity:/g) || []).length, 2);
assert.match(overflowTransactionRendered, /Team activity: Audit Agents added Brent Barry/);
assert.match(overflowTransactionRendered, /Team activity: Audit Agents activated Kevin Johnson/);
assert.doesNotMatch(overflowTransactionRendered, /Audit Agents traded for Cliff Robinson/);
assert.match(
  overflowTransactionRendered,
  /League note: League activity recorded during the reveal window - Transactions were logged during this reveal window, but the compact card only shows a partial activity sample\./
);

const activationHeavyOverflowWindow = JSON.parse(JSON.stringify(
  context.buildUniverseDetailsViewModel(
    slot,
    {
      myPos: 0,
      teams: ['Audit Agents', 'CPU Team 1'],
      rosters: [[]],
      standings: [],
      dailyRevealReports: {
        '13': {
          day: 13,
          week: 3,
          generatedAt: 13000,
          story: {
            headline: 'Activation-heavy overflow',
            subheadline: 'The visible card only shows roster returns.'
          },
          matchups: [],
          totalTransactions: 1
        }
      },
      activityLog: [
        { id: 'ah1', type: 'activation', title: 'Audit Agents activated Kevin Johnson', text: 'Healthy guard returned from IL.', teamIdx: 0, ts: 12900 },
        { id: 'ah2', type: 'activation', title: 'Audit Agents activated Joe Smith', text: 'Another healthy body came back.', teamIdx: 0, ts: 12800 },
        { id: 'ah3', type: 'waiver', title: 'Audit Agents added Brent Barry', text: 'The hidden move was the actual reveal transaction.', teamIdx: 0, ts: 12700 }
      ]
    },
    {}
  )
));
assert.equal(activationHeavyOverflowWindow.recentSimDays[0].teamActivity.length, 2);
assert.deepStrictEqual(activationHeavyOverflowWindow.recentSimDays[0].teamActivity, [
  {
    title: 'Audit Agents activated Kevin Johnson',
    body: 'Healthy guard returned from IL.'
  },
  {
    title: 'Audit Agents activated Joe Smith',
    body: 'Another healthy body came back.'
  }
]);
assert.deepStrictEqual(activationHeavyOverflowWindow.recentSimDays[0].leagueNote, {
  title: 'League activity recorded during the reveal window',
  body: 'Transactions were logged during this reveal window, but the compact card only shows a partial activity sample.'
});
const activationHeavyOverflowRendered = context.renderRecentSimulationCards(activationHeavyOverflowWindow.recentSimDays);
assert.match(activationHeavyOverflowRendered, /Team activity: Audit Agents activated Kevin Johnson/);
assert.match(activationHeavyOverflowRendered, /Team activity: Audit Agents activated Joe Smith/);
assert.doesNotMatch(activationHeavyOverflowRendered, /Audit Agents added Brent Barry/);
assert.match(
  activationHeavyOverflowRendered,
  /League note: League activity recorded during the reveal window - Transactions were logged during this reveal window, but the compact card only shows a partial activity sample\./
);

const mixedOverflowTransactionWindow = JSON.parse(JSON.stringify(
  context.buildUniverseDetailsViewModel(
    slot,
    {
      myPos: 0,
      teams: ['Audit Agents', 'CPU Team 1'],
      rosters: [[]],
      standings: [],
      dailyRevealReports: {
        '12': {
          day: 12,
          week: 3,
          generatedAt: 12000,
          story: {
            headline: 'Mixed overflow',
            subheadline: 'The note slot should keep the concrete league entry visible.'
          },
          matchups: [],
          totalTransactions: 4
        }
      },
      activityLog: [
        { id: 'm1', type: 'waiver', title: 'Audit Agents added Brent Barry', text: 'Dropped an inactive bench wing for a live scorer.', teamIdx: 0, ts: 11900 },
        { id: 'm2', type: 'activation', title: 'Audit Agents activated Kevin Johnson', text: 'Healthy guard returned from IL.', teamIdx: 0, ts: 11800 },
        { id: 'm3', type: 'trade', title: 'CPU Team 1 traded for Marcus Camby', text: 'A separate roster move landed in the same window.', teamIdx: 1, ts: 11700 }
      ]
    },
    {}
  )
));
assert.equal(mixedOverflowTransactionWindow.recentSimDays[0].teamActivity.length, 2);
assert.deepStrictEqual(mixedOverflowTransactionWindow.recentSimDays[0].leagueNote, {
  title: 'CPU Team 1 traded for Marcus Camby',
  body: 'A separate roster move landed in the same window. Additional transactions were also logged during this reveal window.'
});
const mixedOverflowTransactionRendered = context.renderRecentSimulationCards(mixedOverflowTransactionWindow.recentSimDays);
assert.match(mixedOverflowTransactionRendered, /Team activity: Audit Agents added Brent Barry/);
assert.match(mixedOverflowTransactionRendered, /Team activity: Audit Agents activated Kevin Johnson/);
assert.match(mixedOverflowTransactionRendered, /League note: CPU Team 1 traded for Marcus Camby - A separate roster move landed in the same window\. Additional transactions were also logged during this reveal window\./);
assert.doesNotMatch(mixedOverflowTransactionRendered, /League activity recorded during the reveal window/);

const transactionOnlyViewModel = JSON.parse(JSON.stringify(
  context.buildUniverseDetailsViewModel(
    slot,
    {
      myPos: 0,
      teams: ['Audit Agents', 'CPU Team 1'],
      rosters: [[]],
      standings: [],
      dailyRevealReports: {
        '10': {
          day: 10,
          week: 3,
          generatedAt: 10000,
          story: {
            headline: 'Transaction window',
            subheadline: 'Detailed activity feed was unavailable.'
          },
          matchups: [],
          totalTransactions: 2
        }
      },
      activityLog: []
    },
    {}
  )
));
assert.deepStrictEqual(transactionOnlyViewModel.recentSimDays[0].leagueNote, {
  title: 'League activity recorded during the reveal window',
  body: 'Transactions were logged during this reveal window, but the compact card only shows a partial activity sample.'
});
const transactionOnlyRendered = context.renderRecentSimulationCards(transactionOnlyViewModel.recentSimDays);
assert.match(transactionOnlyRendered, /League note: League activity recorded during the reveal window - Transactions were logged during this reveal window, but the compact card only shows a partial activity sample\./);

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
assert.deepStrictEqual(oneDayOnly.recentSimDays[0].story, {
  headline: 'Single day available',
  body: 'Only one reveal has been saved.'
});
assert.equal(oneDayOnly.recentSimDays[0].teamResult, null);
assert.deepStrictEqual(oneDayOnly.recentSimDays[0].teamActivity, []);
assert.equal(oneDayOnly.recentSimDays[0].leagueNote, null);
assert.notEqual(oneDayOnly.recentSimDays[0].story.headline, 'Simulation day completed.');
assert.notEqual(oneDayOnly.recentSimDays[0].story.body, 'Simulation day completed.');
assert.doesNotMatch(
  context.renderRecentSimulationCards(oneDayOnly.recentSimDays),
  /Simulation day completed\./,
  'null-result days should not render a fabricated completion line'
);
assert.doesNotMatch(
  context.renderRecentSimulationCards(oneDayOnly.recentSimDays),
  /<strong>Simulation day completed\.<\/strong>/,
  'null-result days should not render a result block'
);
assert.match(
  context.renderRecentSimulationCards(oneDayOnly.recentSimDays),
  /Single day available/
);

assert.deepStrictEqual(viewModel.leagueSnapshot.currentStanding, {
  title: '#2 Audit Agents',
  body: 'Your current standing window.',
  meta: ['5-2', 'PF 923.4'],
  isCurrentTeam: true
});
assert.deepStrictEqual(viewModel.leagueSnapshot.items, [
  {
    title: '#1 CPU Team 1',
    body: 'Closest league pressure point.',
    meta: ['6-1', 'PF 940.2'],
    isCurrentTeam: false
  },
  {
    title: '#2 Audit Agents',
    body: 'Your current standing window.',
    meta: ['5-2', 'PF 923.4'],
    isCurrentTeam: true
  },
  {
    title: '#3 CPU Team 2',
    body: 'Closest league pressure point.',
    meta: ['5-2', 'PF 912.7'],
    isCurrentTeam: false
  }
]);

assert.deepStrictEqual(viewModel.recentActivity, {
  items: [
    {
      title: 'Audit Agents added Brent Barry',
      body: 'Dropped an inactive bench wing for a live scorer.',
      meta: ['WAIVER']
    },
    {
      title: 'Audit Agents activated Kevin Johnson',
      body: 'Healthy guard returned from IL.',
      meta: ['ACTIVATION']
    },
    {
      title: 'CPU Team 1 added Dell Curry',
      body: 'Found a hot hand before the next lock.',
      meta: ['WAIVER']
    }
  ]
});

assert.deepStrictEqual(viewModel.currentTeamState.summary, {
  title: 'Roster availability',
  body: '2 available, 1 unavailable',
  meta: ['Week 3', 'Day 4']
});
assert.deepStrictEqual(viewModel.currentTeamState.players, [
  {
    title: 'Michael Jordan',
    body: 'CHI - SG',
    meta: ['FP 52.4', 'TFP 314.7']
  },
  {
    title: 'Scottie Pippen',
    body: 'CHI - SF',
    meta: ['FP 44.1', 'TFP 276.2']
  },
  {
    title: 'Alonzo Mourning',
    body: 'MIA - C',
    meta: ['FP 40.9', 'TFP 255.4']
  }
]);
assert.deepStrictEqual(viewModel.currentTeamState.items, [
  {
    title: 'Roster availability',
    body: '2 available, 1 unavailable',
    meta: ['Week 3', 'Day 4']
  },
  {
    title: 'Michael Jordan',
    body: 'CHI - SG',
    meta: ['FP 52.4', 'TFP 314.7']
  },
  {
    title: 'Scottie Pippen',
    body: 'CHI - SF',
    meta: ['FP 44.1', 'TFP 276.2']
  },
  {
    title: 'Alonzo Mourning',
    body: 'MIA - C',
    meta: ['FP 40.9', 'TFP 255.4']
  }
]);

const allRostersOnly = JSON.parse(JSON.stringify(
  context.buildUniverseDetailsViewModel(
    slot,
    {
      myPos: 0,
      teams: ['Audit Agents', 'CPU Team 1'],
      allRosters: [[
        { id: 11, name: 'Karl Malone', team: 'UTA', pos: 'PF', fp: 41.6, totalFantasyPoints: 288.2, injuryStatus: null },
        { id: 12, name: 'John Stockton', team: 'UTA', pos: 'PG', fp: 34.9, totalFantasyPoints: 243.1, injuryStatus: 'OUT' },
        { id: 13, name: 'Jeff Hornacek', team: 'UTA', pos: 'SG', fp: 26.2, totalFantasyPoints: 181.4, availability: 'ACTIVE' }
      ]],
      starters: [[
        { id: 11, name: 'Karl Malone', team: 'UTA', pos: 'PF', fp: 41.6, totalFantasyPoints: 288.2 },
        { id: 12, name: 'John Stockton', team: 'UTA', pos: 'PG', fp: 34.9, totalFantasyPoints: 243.1 },
        { id: 13, name: 'Jeff Hornacek', team: 'UTA', pos: 'SG', fp: 26.2, totalFantasyPoints: 181.4 }
      ]],
      standings: []
    },
    {}
  )
));

assert.deepStrictEqual(allRostersOnly.currentTeamState, {
  summary: {
    title: 'Roster availability',
    body: '2 available, 1 unavailable',
    meta: ['Week 3', 'Day 4']
  },
  players: [
    {
      title: 'Karl Malone',
      body: 'UTA - PF',
      meta: ['FP 41.6', 'TFP 288.2']
    },
    {
      title: 'John Stockton',
      body: 'UTA - PG',
      meta: ['FP 34.9', 'TFP 243.1']
    },
    {
      title: 'Jeff Hornacek',
      body: 'UTA - SG',
      meta: ['FP 26.2', 'TFP 181.4']
    }
  ],
  items: [
    {
      title: 'Roster availability',
      body: '2 available, 1 unavailable',
      meta: ['Week 3', 'Day 4']
    },
    {
      title: 'Karl Malone',
      body: 'UTA - PF',
      meta: ['FP 41.6', 'TFP 288.2']
    },
    {
      title: 'John Stockton',
      body: 'UTA - PG',
      meta: ['FP 34.9', 'TFP 243.1']
    },
    {
      title: 'Jeff Hornacek',
      body: 'UTA - SG',
      meta: ['FP 26.2', 'TFP 181.4']
    }
  ]
});

const revealOnlyActivity = JSON.parse(JSON.stringify(
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
          totalTransactions: 2
        }
      },
      activityLog: []
    },
    {}
  )
));

assert.deepStrictEqual(revealOnlyActivity.latestSimDay, {
  copy: 'Week 3, Day 4 is the current archive checkpoint for Audit Agents.',
  headline: 'No completed sim day yet',
  narrative: 'This saved universe has not published a latest sim-day recap yet.',
  pills: ['Waiting for reveal data']
});
assert.deepStrictEqual(revealOnlyActivity.recentActivity, {
  items: [
    {
      title: '2 league transactions in the latest sim',
      body: 'The latest completed sim day logged league activity, even though the detailed activity feed is still unavailable.',
      meta: ['REVEAL SUMMARY']
    }
  ]
});

const degraded = JSON.parse(JSON.stringify(
  context.buildUniverseDetailsViewModel(
    slot,
    { myPos: 0, teams: ['Audit Agents'], rosters: [[]], standings: [], dailyRevealReports: {} },
    {}
  )
));

assert.match(degraded.latestSimDay.headline, /No completed sim day yet/i);
assert.deepStrictEqual(degraded.latestSimDay, {
  copy: 'Week 3, Day 4 is the current archive checkpoint for Audit Agents.',
  headline: 'No completed sim day yet',
  narrative: 'This saved universe has not published a latest sim-day recap yet.',
  pills: ['Waiting for reveal data']
});
assert.deepStrictEqual(degraded.leagueSnapshot, {
  currentStanding: null,
  items: [
    {
      title: 'Standings not available yet',
      body: 'This universe has not saved a league table yet.',
      meta: ['Record pending']
    }
  ]
});
assert.deepStrictEqual(degraded.recentActivity, {
  items: [
    {
      title: 'No recent universe activity',
      body: 'This saved universe has not recorded recent waiver, IL, or sim maintenance activity yet.',
      meta: ['Quiet now']
    }
  ]
});
assert.deepStrictEqual(degraded.recentSimDays, []);
assert.deepStrictEqual(degraded.currentTeamState, {
  summary: {
    title: 'Roster availability',
    body: '0 available, 0 unavailable',
    meta: ['Week 3', 'Day 4']
  },
  players: [],
  items: [
    {
      title: 'Roster availability',
      body: '0 available, 0 unavailable',
      meta: ['Week 3', 'Day 4']
    }
  ]
});

assert.match(renderUniverseSource, /currentTeamState\.items/, 'renderUniverse should render current team state from explicit view-model items');
assert.match(renderUniverseSource, /leagueSnapshot\.items/, 'renderUniverse should render league snapshot from explicit view-model items');
assert.match(renderUniverseSource, /recentActivity\.items/, 'renderUniverse should render recent activity from explicit view-model items');
assert.match(renderUniverseSource, /recentSimulationList/, 'renderUniverse should render the recent simulation section');
assert.doesNotMatch(renderUniverseSource, /\.slice\(1\)/, 'renderUniverse should not infer team-state semantics from item ordering');
assert.doesNotMatch(renderUniverseSource, /Your current standing window\./, 'renderUniverse should not infer league semantics from presentation copy');

expectMatch(/id="latestSimDayCopy"/, 'latest sim-day copy node is missing');
expectMatch(/id="latestSimDayHeadline"/, 'latest sim-day headline node is missing');
expectMatch(/id="latestSimDayNarrative"/, 'latest sim-day narrative node is missing');
expectMatch(/id="latestSimDayPills"/, 'latest sim-day pills node is missing');
expectMatch(/id="leagueSnapshotList"/, 'league snapshot list node is missing');
expectMatch(/id="recentActivityList"/, 'recent activity list node is missing');
expectMatch(/id="recentSimulationList"/, 'recent simulation list node is missing');
expectMatch(/id="currentTeamStateList"/, 'current team state list node is missing');
expectMatch(/function getRecentRevealReports\(state, limit\)/, 'recent reveal helper is missing');
expectMatch(/function buildRecentSimulationSummary\(slot, state\)/, 'recent simulation summary helper is missing');
expectMatch(/function buildUniverseDetailsViewModel\(slot, state, config\)/, 'view-model builder is missing');
expectMatch(/function renderUniverse\(slot, state, config\)/, 'renderUniverse is missing');
expectNoMatch(/id="rosterCoreList"/, 'legacy roster core list should be removed');
expectNoMatch(/id="packContextList"/, 'legacy pack context list should be removed');
expectNoMatch(/id="timelineList"/, 'legacy timeline list should be removed');
console.log('historical universe details test passed');
