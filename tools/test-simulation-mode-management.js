const assert = require('node:assert/strict');

const {
  setSimulationLineup,
  claimSimulationFreeAgent,
  applySimulationTrade,
  applySimulationInjuryDesignations
} = require('../simulation-mode-runtime.js');

const baseState = {
  draftState: {
    rostersByTeam: {
      LAL: [
        { id: 1, name: 'Michael Jordan', pos: 'SG' },
        { id: 2, name: 'Stephen Curry', pos: 'PG' },
        { id: 3, name: 'Kevin Garnett', pos: 'PF' }
      ],
      BOS: [
        { id: 4, name: 'Larry Bird', pos: 'SF' },
        { id: 5, name: 'Kevin McHale', pos: 'PF' }
      ],
      FA: []
    },
    freeAgents: [
      { id: 99, name: 'Ray Allen', pos: 'SG' }
    ]
  },
  seasonState: {
    lineupIdsByTeam: { LAL: [1, 2, 3], BOS: [4, 5] },
    activityLog: []
  }
};

const lineupState = setSimulationLineup(baseState, 'LAL', [2, 1, 3]);
assert.deepStrictEqual(lineupState.seasonState.lineupIdsByTeam.LAL, [2, 1, 3]);

const waiverState = claimSimulationFreeAgent(baseState, {
  teamAbbr: 'LAL',
  addPlayerId: 99,
  dropPlayerId: 3
});
assert.ok(waiverState.draftState.rostersByTeam.LAL.some((player) => player.id === 99));
assert.ok(waiverState.draftState.freeAgents.some((player) => player.id === 3));

const tradeState = applySimulationTrade(baseState, {
  fromTeamAbbr: 'LAL',
  toTeamAbbr: 'BOS',
  outgoingPlayerIds: [1],
  incomingPlayerIds: [4]
});
assert.ok(tradeState.draftState.rostersByTeam.LAL.some((player) => player.id === 4));
assert.ok(tradeState.draftState.rostersByTeam.BOS.some((player) => player.id === 1));

const injuryState = applySimulationInjuryDesignations(baseState, [
  { teamAbbr: 'LAL', playerId: 2, designation: 'OUT' }
]);
assert.equal(
  injuryState.draftState.rostersByTeam.LAL.find((player) => player.id === 2).designation,
  'OUT'
);

console.log('simulation mode management test passed');
