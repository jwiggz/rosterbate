const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(
  path.join(__dirname, '..', 'rosterbate-season.html'),
  'utf8'
);

function extractFunctionSource(name, nextName) {
  const start = html.indexOf(`function ${name}`);
  assert.ok(start >= 0, `missing ${name}`);
  const end = html.indexOf(`\nfunction ${nextName}`, start);
  assert.ok(end >= 0, `missing ${nextName}`);
  return html.slice(start, end);
}

function extractOptionalFunctionSource(name, nextName) {
  const start = html.indexOf(`function ${name}`);
  if (start < 0) return '';
  const end = html.indexOf(`\nfunction ${nextName}`, start);
  assert.ok(end >= 0, `missing ${nextName}`);
  return html.slice(start, end);
}

const getIlRosterSource = extractFunctionSource(
  'getIlRoster(teamIdx)',
  'isIlEligiblePlayer(player, injury)'
);
const isIlEligiblePlayerSource = extractFunctionSource(
  'isIlEligiblePlayer(player, injury)',
  'rebuildLineupsAfterRosterChange(teamIdx)'
);
const getCpuIlMaintenanceValueSource = extractOptionalFunctionSource(
  'getCpuIlMaintenanceValue(player)',
  'isHealthyCpuIlActivationCandidate(player, week)'
);
const isHealthyCpuIlActivationCandidateSource = extractOptionalFunctionSource(
  'isHealthyCpuIlActivationCandidate(player, week)',
  'getHealthyCpuIlActivationCandidates(ilRoster, week)'
);
const getHealthyCpuIlActivationCandidatesSource = extractOptionalFunctionSource(
  'getHealthyCpuIlActivationCandidates(ilRoster, week)',
  'getActiveCpuIlSwapCandidates(roster, week)'
);
const getActiveCpuIlSwapCandidatesSource = extractOptionalFunctionSource(
  'getActiveCpuIlSwapCandidates(roster, week)',
  'maintainCpuTeamRoster(teamIdx, options)'
);
const maintainCpuTeamRosterSource = extractFunctionSource(
  'maintainCpuTeamRoster(teamIdx, options)',
  'maintainCpuLeagueRosters(options)'
);

function makePlayer(id, name, fp) {
  return {
    id,
    name,
    fp,
    pos: 'UTIL'
  };
}

function buildContext(options = {}) {
  const normalizeCalls = [];
  const waiverCalls = [];
  const injuries = new Map(options.injuries || []);
  const context = {
    CURRENT_SPORT: 'nba',
    D: {
      leagueSize: 2,
      teams: ['User', 'CPU'],
      myPos: 0,
      multiplayer: false,
      historicalEntryMode: options.entryMode || 'simulation_season'
    },
    G: {
      day: options.day || 3,
      rosters: [
        [makePlayer(900, 'User Player', 10)],
        (options.roster || []).map(player => ({ ...player }))
      ],
      ilByTeam: [
        [],
        (options.ilRoster || []).map(player => ({ ...player }))
      ]
    },
    isCpuManagedTeam(teamIdx) {
      if (typeof options.cpuManagedTeam === 'number') return teamIdx === options.cpuManagedTeam;
      return teamIdx === 1;
    },
    isHistoricalSimulationUniverse(state) {
      return String(state?.historicalEntryMode || '').trim().toLowerCase() === 'simulation_season';
    },
    weekForDay() {
      return 1;
    },
    getIlSlotCount() {
      return options.ilSlots ?? 1;
    },
    getActiveRosterCapacity() {
      return options.activeCapacity ?? 2;
    },
    getInjuryStatus(player) {
      return injuries.get(Number(player?.id)) || null;
    },
    Number,
    Math,
    String,
    Array,
    console
  };

  vm.runInNewContext(
    [
      getIlRosterSource,
      isIlEligiblePlayerSource,
      getCpuIlMaintenanceValueSource,
      isHealthyCpuIlActivationCandidateSource,
      getHealthyCpuIlActivationCandidatesSource,
      getActiveCpuIlSwapCandidatesSource,
      maintainCpuTeamRosterSource
    ].filter(Boolean).join('\n'),
    context
  );

  context.normalizeCpuTeamLineups = function normalizeCpuTeamLineups(teamIdx) {
    normalizeCalls.push(teamIdx);
  };
  context.fillCpuTeamStarterNeedsFromWaivers = function fillCpuTeamStarterNeedsFromWaivers(teamIdx, requestOptions) {
    waiverCalls.push({ teamIdx, requestOptions });
    return { changed: false, adds: 0, drops: 0 };
  };

  return { context, normalizeCalls, waiverCalls };
}

{
  const { context, normalizeCalls, waiverCalls } = buildContext({
    roster: [makePlayer(1, 'Starter', 42)],
    ilRoster: [makePlayer(2, 'Healthy Return', 88)]
  });
  const result = context.maintainCpuTeamRoster(1, { day: 3 });
  assert.equal(result.activated, 1, 'expected a healthy IL player to activate into open active space');
  assert.deepStrictEqual(
    context.G.rosters[1].map(player => Number(player.id)),
    [1, 2]
  );
  assert.deepStrictEqual(context.G.ilByTeam[1], []);
  assert.deepStrictEqual(normalizeCalls, [1]);
  assert.equal(waiverCalls.length, 1, 'expected existing waiver maintenance to still run after IL moves');
}

{
  const { context } = buildContext({
    roster: [makePlayer(1, 'Starter', 42)],
    ilRoster: [makePlayer(2, 'Game Time Decision', 88)],
    injuries: [[2, { label: 'GTD' }]]
  });
  const result = context.maintainCpuTeamRoster(1, { day: 3 });
  assert.equal(result.activated, 0, 'expected GTD players to stay on IL under the conservative activation rule');
  assert.deepStrictEqual(
    context.G.ilByTeam[1].map(player => Number(player.id)),
    [2]
  );
  assert.deepStrictEqual(
    context.G.rosters[1].map(player => Number(player.id)),
    [1]
  );
}

{
  const { context } = buildContext({
    roster: [
      makePlayer(1, 'Healthy Starter', 55),
      makePlayer(2, 'Out Starter', 20)
    ],
    ilRoster: [makePlayer(3, 'Healthy Return', 90)],
    injuries: [[2, { label: 'OUT' }]],
    activeCapacity: 2,
    ilSlots: 1
  });
  const result = context.maintainCpuTeamRoster(1, { day: 3 });
  assert.equal(result.activated, 1, 'expected a healthy IL player to activate through a legal swap');
  assert.equal(result.movedToIl, 1, 'expected the active IL-eligible player to move back to IL during the swap');
  assert.deepStrictEqual(
    context.G.rosters[1].map(player => Number(player.id)).sort((a, b) => a - b),
    [1, 3]
  );
  assert.deepStrictEqual(
    context.G.ilByTeam[1].map(player => Number(player.id)),
    [2]
  );
}

{
  const { context } = buildContext({
    roster: [
      makePlayer(1, 'Healthy Starter', 55),
      makePlayer(2, 'Healthy Bench', 20)
    ],
    ilRoster: [makePlayer(3, 'Healthy Return', 90)],
    activeCapacity: 2,
    ilSlots: 1
  });
  const result = context.maintainCpuTeamRoster(1, { day: 3 });
  assert.equal(result.activated, 0, 'expected no activation when the active roster is full and no swap partner is IL eligible');
  assert.deepStrictEqual(
    context.G.rosters[1].map(player => Number(player.id)).sort((a, b) => a - b),
    [1, 2]
  );
  assert.deepStrictEqual(
    context.G.ilByTeam[1].map(player => Number(player.id)),
    [3]
  );
}

{
  const { context, normalizeCalls, waiverCalls } = buildContext({
    entryMode: 'historical_reimagined',
    roster: [makePlayer(1, 'Starter', 42)],
    ilRoster: [makePlayer(2, 'Healthy Return', 88)]
  });
  const result = context.maintainCpuTeamRoster(1, { day: 3 });
  assert.deepStrictEqual(
    result,
    { changed: false, movedToIl: 0, activated: 0, waiverAdds: 0, waiverDrops: 0 },
    'expected non-simulation universes to bypass the upgraded CPU IL logic'
  );
  assert.deepStrictEqual(context.G.rosters[1].map(player => Number(player.id)), [1]);
  assert.deepStrictEqual(context.G.ilByTeam[1].map(player => Number(player.id)), [2]);
  assert.deepStrictEqual(normalizeCalls, []);
  assert.deepStrictEqual(waiverCalls, []);
}

{
  const { context, normalizeCalls, waiverCalls } = buildContext({
    cpuManagedTeam: 99,
    roster: [makePlayer(1, 'Starter', 42)],
    ilRoster: [makePlayer(2, 'Healthy Return', 88)]
  });
  const result = context.maintainCpuTeamRoster(1, { day: 3 });
  assert.deepStrictEqual(
    result,
    { changed: false, movedToIl: 0, activated: 0, waiverAdds: 0, waiverDrops: 0 },
    'expected human teams to bypass CPU IL maintenance'
  );
  assert.deepStrictEqual(normalizeCalls, []);
  assert.deepStrictEqual(waiverCalls, []);
}

console.log('cpu sim il maintenance test passed');
