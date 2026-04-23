const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'historic-universe.html'), 'utf8');

function extractFunctionSource(signature) {
  const start = html.indexOf(`function ${signature}`);
  assert.ok(start >= 0, `missing ${signature}`);

  const openBrace = html.indexOf('{', start);
  assert.ok(openBrace >= 0, `missing body for ${signature}`);

  let depth = 0;
  let mode = 'code';

  for (let index = openBrace; index < html.length; index += 1) {
    const char = html[index];
    const next = html[index + 1];
    const prev = html[index - 1];

    if (mode === 'lineComment') {
      if (char === '\n') mode = 'code';
      continue;
    }
    if (mode === 'blockComment') {
      if (prev === '*' && char === '/') mode = 'code';
      continue;
    }
    if (mode === 'singleQuote') {
      if (char === '\'' && prev !== '\\') mode = 'code';
      continue;
    }
    if (mode === 'doubleQuote') {
      if (char === '"' && prev !== '\\') mode = 'code';
      continue;
    }
    if (mode === 'template') {
      if (char === '`' && prev !== '\\') mode = 'code';
      continue;
    }

    if (char === '/' && next === '/') {
      mode = 'lineComment';
      index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      mode = 'blockComment';
      index += 1;
      continue;
    }
    if (char === '\'') {
      mode = 'singleQuote';
      continue;
    }
    if (char === '"') {
      mode = 'doubleQuote';
      continue;
    }
    if (char === '`') {
      mode = 'template';
      continue;
    }

    if (char === '{') {
      depth += 1;
      continue;
    }
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return html.slice(start, index + 1);
      }
    }
  }

  assert.fail(`unterminated ${signature}`);
}

const script = [
  extractFunctionSource('isSimulationModeUniverse(slot, state)'),
  extractFunctionSource('buildSimulationModeSummary(slot, state)'),
  extractFunctionSource('buildSimulationPlayoffSummary(slot, state)')
].join('\n\n');

const context = { console };
vm.createContext(context);
vm.runInContext(script, context, { filename: 'historic-universe-simulation-helpers.js' });

assert.equal(
  context.isSimulationModeUniverse({ simulationMode: 'nba_mixed_era_single_player_v1' }, {}),
  true,
  'simulation universes should be detected from the slot payload'
);
assert.equal(
  context.isSimulationModeUniverse({}, { simulationMode: 'nba_mixed_era_single_player_v1' }),
  true,
  'simulation universes should also be detected from the saved state'
);
assert.equal(
  context.isSimulationModeUniverse({}, {}),
  false,
  'non-simulation universes should not be flagged'
);

function buildState(overrides = {}) {
  return {
    leagueShell: { anchorSeasonLabel: '1985-86 NBA' },
    sourceSeasons: { sourceSeasonLabels: ['1996-97', '2003-04'] },
    draftState: { controlledTeamAbbr: 'CHI' },
    seasonState: {
      standings: [
        { teamAbbr: 'CHI', w: 53, l: 29 },
        { teamAbbr: 'LAL', w: 61, l: 21 }
      ]
    },
    postseasonState: {
      phase: 'regular_season',
      currentRound: null,
      champion: null,
      runnerUp: null,
      seriesById: {},
      completedAt: null
    },
    ...overrides
  };
}

const universeLabel = '1985-86 NBA shell \u00b7 1996-97 + 2003-04 player universe';

const playInState = buildState({
  postseasonState: {
    phase: 'play_in',
    currentRound: 'play_in',
    champion: null,
    runnerUp: null,
    playIn: {
      east: {
        sevenEight: [{ teamAbbr: 'IND' }, { teamAbbr: 'PHI' }],
        nineTen: [{ teamAbbr: 'ATL' }, { teamAbbr: 'CHI' }]
      },
      west: {
        sevenEight: [{ teamAbbr: 'DAL' }, { teamAbbr: 'MIN' }],
        nineTen: [{ teamAbbr: 'GSW' }, { teamAbbr: 'SAC' }]
      }
    },
    seriesById: {},
    completedAt: null
  }
});

assert.deepStrictEqual(
  JSON.parse(JSON.stringify(context.buildSimulationModeSummary({}, playInState))),
  {
    title: 'Simulation play-in push',
    body: universeLabel + '. The play-in tournament is deciding the final playoff field.',
    meta: ['Record 53-29', 'Play-In tournament live']
  },
  'play-in universes should get play-in aware archive copy while preserving shell context'
);

assert.deepStrictEqual(
  JSON.parse(JSON.stringify(context.buildSimulationPlayoffSummary({}, playInState))),
  {
    title: 'Play-In tournament live',
    body: 'Win-and-in games are underway to lock the final East and West playoff seeds.',
    meta: ['Phase: Play-In', 'Bracket race active']
  },
  'play-in universes should describe the active play-in bracket'
);

const postseasonReadyState = buildState({
  postseasonState: {
    phase: 'postseason_ready',
    currentRound: null,
    champion: null,
    runnerUp: null,
    seriesById: {},
    completedAt: null
  }
});

assert.deepStrictEqual(
  JSON.parse(JSON.stringify(context.buildSimulationModeSummary({}, postseasonReadyState))),
  {
    title: 'Simulation bracket set',
    body: universeLabel + '. The field is locked and the title chase is ready to open.',
    meta: ['Record 53-29', 'Bracket locked']
  },
  'postseason-ready universes should get bracket-set archive copy before the games begin'
);

assert.deepStrictEqual(
  JSON.parse(JSON.stringify(context.buildSimulationPlayoffSummary({}, postseasonReadyState))),
  {
    title: 'Simulation playoff field locked',
    body: 'The regular season is over, the bracket is set, and the postseason is ready to tip.',
    meta: ['Phase: Postseason Ready', 'Bracket locked']
  },
  'postseason-ready universes should describe the bridge between the regular season and the bracket opener'
);

const roundTwoState = buildState({
  postseasonState: {
    phase: 'playoffs_round_2',
    currentRound: 'playoffs_round_2',
    champion: null,
    runnerUp: null,
    seriesById: {},
    completedAt: null
  }
});

assert.deepStrictEqual(
  JSON.parse(JSON.stringify(context.buildSimulationModeSummary({}, roundTwoState))),
  {
    title: 'Simulation Round 2 live',
    body: universeLabel + '. The second round is underway and the conference finalists are coming into focus.',
    meta: ['Record 53-29', 'Round 2 underway']
  },
  'second-round universes should get phase-specific archive copy instead of regular-season language'
);

assert.deepStrictEqual(
  JSON.parse(JSON.stringify(context.buildSimulationPlayoffSummary({}, roundTwoState))),
  {
    title: 'Simulation Round 2 underway',
    body: 'Second-round series are deciding which teams will reach the conference finals.',
    meta: ['Phase: Round 2', 'Conference finals spots at stake']
  },
  'second-round universes should render phase-specific playoff summary copy'
);

const finalsState = buildState({
  postseasonState: {
    phase: 'finals',
    currentRound: 'finals',
    champion: null,
    runnerUp: null,
    bracket: {
      finals: {
        higherSeed: { teamAbbr: 'LAL' },
        lowerSeed: { teamAbbr: 'BOS' }
      }
    },
    seriesById: {
      finals: {
        higherSeedWins: 2,
        lowerSeedWins: 1
      }
    },
    completedAt: null
  }
});

assert.deepStrictEqual(
  JSON.parse(JSON.stringify(context.buildSimulationPlayoffSummary({}, finalsState))),
  {
    title: 'Simulation Finals underway',
    body: 'LAL and BOS are playing for the simulation trophy.',
    meta: ['Phase: Finals', 'Series 2-1']
  },
  'Finals universes should describe the championship matchup and live series score'
);

const completedState = buildState({
  postseasonState: {
    phase: 'completed',
    currentRound: 'completed',
    champion: {
      teamAbbr: 'LAL',
      teamName: 'Los Angeles Lakers',
      finalsGames: 6,
      seriesResult: '4-2'
    },
    runnerUp: {
      teamAbbr: 'BOS',
      teamName: 'Boston Celtics'
    },
    seriesById: {
      finals: {
        higherSeed: { teamAbbr: 'LAL' },
        lowerSeed: { teamAbbr: 'BOS' },
        games: 6
      }
    },
    completedAt: '2026-06-18T00:00:00.000Z'
  }
});

assert.deepStrictEqual(
  JSON.parse(JSON.stringify(context.buildSimulationModeSummary({}, completedState))),
  {
    title: 'Simulation title claimed',
    body: universeLabel + '. LAL finished the run on top and closed out the title chase.',
    meta: ['Record 53-29', 'Champion: LAL']
  },
  'completed universes should get title-complete framing without losing season context'
);

assert.deepStrictEqual(
  JSON.parse(JSON.stringify(context.buildSimulationPlayoffSummary({}, completedState))),
  {
    title: 'LAL won the simulation title',
    body: 'LAL beat BOS 4-2 in the Finals, wrapped the series in 6 games, and lifted the trophy.',
    meta: ['Trophy awarded', 'Completed 2026-06-18']
  },
  'completed universes should surface champion, runner-up, Finals result, and completion timing'
);

console.log('simulation universe details test passed');
