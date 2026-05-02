const assert = require('assert');
const revealEngine = require('../live-matchup-reveal-engine.js');

function fp(stats) {
  return Math.round((
    Number(stats.pts || 0) +
    Number(stats.reb || 0) * 1.2 +
    Number(stats.ast || 0) * 1.5 +
    Number(stats.stl || 0) * 3 +
    Number(stats.blk || 0) * 3 -
    Number(stats.to || 0)
  ) * 10) / 10;
}

function makePlayer(id, name, stats) {
  return {
    _id: id,
    name,
    fp: fp(stats),
    _targetFp: fp(stats),
    statValues: stats
  };
}

function sumByPlayer(events) {
  return events.reduce((totals, event) => {
    const id = event?.player?._id;
    totals[id] = Math.round(((totals[id] || 0) + Number(event?.fpGain || 0)) * 100) / 100;
    return totals;
  }, {});
}

function longestSideRun(events) {
  let longest = 0;
  let current = 0;
  let last = '';
  events.forEach((event) => {
    const side = String(event?.side || '');
    current = side === last ? current + 1 : 1;
    last = side;
    longest = Math.max(longest, current);
  });
  return longest;
}

const homePlayers = [
  makePlayer(1, 'Shai Gilgeous-Alexander', { pts: 33, reb: 6, ast: 7, stl: 2, blk: 1, to: 2, threes: 2 }),
  makePlayer(2, 'Evan Mobley', { pts: 19, reb: 12, ast: 3, stl: 1, blk: 3, to: 2, threes: 1 }),
  makePlayer(3, 'James Harden', { pts: 21, reb: 5, ast: 11, stl: 1, blk: 0, to: 3, threes: 4 }),
  makePlayer(4, 'Anthony Edwards', { pts: 29, reb: 5, ast: 4, stl: 2, blk: 1, to: 2, threes: 5 }),
  makePlayer(5, 'Bam Adebayo', { pts: 17, reb: 10, ast: 5, stl: 1, blk: 1, to: 2, threes: 0 })
];

const awayPlayers = [
  makePlayer(11, 'Luka Doncic', { pts: 34, reb: 9, ast: 10, stl: 1, blk: 0, to: 4, threes: 4 }),
  makePlayer(12, 'Jayson Tatum', { pts: 27, reb: 8, ast: 5, stl: 1, blk: 1, to: 2, threes: 3 }),
  makePlayer(13, 'Nikola Jokic', { pts: 26, reb: 13, ast: 10, stl: 2, blk: 1, to: 3, threes: 2 }),
  makePlayer(14, 'Devin Booker', { pts: 25, reb: 4, ast: 7, stl: 1, blk: 0, to: 2, threes: 3 }),
  makePlayer(15, 'Giannis Antetokounmpo', { pts: 30, reb: 12, ast: 6, stl: 1, blk: 2, to: 3, threes: 0 })
];

const homeTarget = homePlayers.reduce((sum, player) => sum + player._targetFp, 0);
const awayTarget = awayPlayers.reduce((sum, player) => sum + player._targetFp, 0);
const homeEvents = revealEngine.buildLiveRevealEvents(homePlayers, 'A', homeTarget);
const awayEvents = revealEngine.buildLiveRevealEvents(awayPlayers, 'B', awayTarget);

assert.ok(homeEvents.length >= 70, 'home reveal should create a dense box-score timeline, not sparse fantasy bursts');
assert.ok(awayEvents.length >= 70, 'away reveal should create a dense box-score timeline, not sparse fantasy bursts');
assert.ok(
  homeEvents.filter((event) => event.player._id === 1).length >= 14,
  'high-usage stars should update repeatedly across the live reveal'
);
assert.ok(
  homeEvents.some((event) => event.statType === 'reb') &&
  homeEvents.some((event) => event.statType === 'ast') &&
  homeEvents.some((event) => event.statType === 'to' && Number(event.fpGain) < 0),
  'timeline should expose basketball-shaped stat events, including turnovers'
);

const homeTotals = sumByPlayer(homeEvents);
homePlayers.forEach((player) => {
  assert.ok(
    Math.abs(Number(homeTotals[player._id] || 0) - Number(player._targetFp || 0)) <= 0.05,
    `${player.name} reveal events should land on the official final fantasy score`
  );
});
assert.ok(
  Math.abs(homeEvents.reduce((sum, event) => sum + Number(event.scoreGain || 0), 0) - homeTarget) <= 0.05,
  'team score gains should land on the official final team score'
);

const homeSplit = revealEngine.splitLiveRevealEventsByHalf(homeEvents);
const awaySplit = revealEngine.splitLiveRevealEventsByHalf(awayEvents);
assert.ok(homeSplit.first.length > 0 && homeSplit.second.length > 0, 'home timeline should span both halves');
assert.ok(awaySplit.first.length > 0 && awaySplit.second.length > 0, 'away timeline should span both halves');
assert.ok(
  homeSplit.first.some((event) => event.player._id === 1) &&
  homeSplit.second.some((event) => event.player._id === 1),
  'stars should not dump all scoring into one half'
);

const firstHalf = revealEngine.interleaveLiveRevealHalfEvents(homeSplit.first, awaySplit.first);
const secondHalf = revealEngine.interleaveLiveRevealHalfEvents(homeSplit.second, awaySplit.second);
assert.equal(firstHalf.length, homeSplit.first.length + awaySplit.first.length);
assert.equal(secondHalf.length, homeSplit.second.length + awaySplit.second.length);
assert.ok(longestSideRun(firstHalf) <= 3, 'first-half reveal should avoid long one-team clumps');
assert.ok(longestSideRun(secondHalf) <= 3, 'second-half reveal should avoid long one-team clumps');

const fallbackPlayer = { _id: 99, name: 'Fallback Starter', _targetFp: 32.5, fp: 32.5, statValues: {} };
const fallbackEvents = revealEngine.buildLiveRevealEvents([fallbackPlayer], 'A', 32.5);
assert.ok(fallbackEvents.length >= 6, 'missing stat lines should still reveal as smaller repeated events');
assert.ok(
  Math.abs(fallbackEvents.reduce((sum, event) => sum + Number(event.fpGain || 0), 0) - 32.5) <= 0.05,
  'fallback reveal should still land on the official final score'
);

console.log('live matchup reveal engine tests passed');
