const assert = require('assert');
const courtMotion = require('../live-matchup-court-motion.js');

function makePlayer(id, name, side, pos, x = 300, y = 200) {
  return { _id: id, name, _side: side, pos, _x: x, _y: y };
}

const teamA = [
  makePlayer(1, 'Point Guard A', 'A', 'PG'),
  makePlayer(2, 'Wing A', 'A', 'SG'),
  makePlayer(3, 'Scorer A', 'A', 'SF'),
  makePlayer(4, 'Big A', 'A', 'PF'),
  makePlayer(5, 'Center A', 'A', 'C')
];
const teamB = [
  makePlayer(11, 'Point Guard B', 'B', 'PG'),
  makePlayer(12, 'Wing B', 'B', 'SG'),
  makePlayer(13, 'Scorer B', 'B', 'SF'),
  makePlayer(14, 'Big B', 'B', 'PF'),
  makePlayer(15, 'Center B', 'B', 'C')
];

function targetFor(targets, id) {
  return targets.find((target) => target.playerId === id);
}

function assertCourtBounds(targets) {
  targets.forEach((target) => {
    assert.ok(target.x >= 25 && target.x <= 575, `x target ${target.x} should stay on the court`);
    assert.ok(target.y >= 35 && target.y <= 365, `y target ${target.y} should stay on the court`);
    assert.ok(Number(target.motionSpeed) > 0 && Number(target.motionSpeed) <= 16, 'motion speed should be smooth, not teleport-like');
  });
}

const firstQuarterScore = courtMotion.buildLiveCourtTargets({
  event: { side: 'A', statType: 'pts', player: teamA[2], text: 'Scorer A hits from deep' },
  teamA,
  teamB,
  quarter: 1
});
assert.equal(firstQuarterScore.length, 10, 'a live event should choreograph all ten starters');
assertCourtBounds(firstQuarterScore);
assert.ok(targetFor(firstQuarterScore, 3).x > 365, 'Team A should attack the right basket in the first half');
assert.ok(
  firstQuarterScore.filter((target) => target.side === 'B' && target.role === 'defender').length >= 5,
  'the non-scoring team should move into defensive coverage'
);

const thirdQuarterScore = courtMotion.buildLiveCourtTargets({
  event: { side: 'A', statType: 'pts', player: teamA[2], text: 'Scorer A gets downhill' },
  teamA,
  teamB,
  quarter: 3
});
assert.ok(targetFor(thirdQuarterScore, 3).x < 235, 'Team A should switch baskets after halftime');

const reboundTargets = courtMotion.buildLiveCourtTargets({
  event: { side: 'B', statType: 'reb', player: teamB[4], text: 'Center B secures the board' },
  teamA,
  teamB,
  quarter: 2
});
const rebounder = targetFor(reboundTargets, 15);
assert.ok(rebounder.role === 'rebounder', 'rebound events should move the event player like a rebounder');
assert.ok(rebounder.x < 180, 'Team B first-half rebounder should be near the left-side paint');

const stealTargets = courtMotion.buildLiveCourtTargets({
  event: { side: 'B', statType: 'stl', player: teamB[0], text: 'Point Guard B jumps the passing lane' },
  teamA,
  teamB,
  quarter: 1,
  possessionSide: 'A'
});
const thief = targetFor(stealTargets, 11);
assert.ok(thief.x > 235 && thief.x < 365, 'steal events should happen around the passing lane, not under the rim');
assert.equal(thief.role, 'passing-lane', 'a steal should be animated as a defensive play by the stealing team');
assert.ok(
  stealTargets.filter((target) => target.side === 'A' && target.role !== 'defender').length >= 4,
  'a steal by Team B during a Team A possession should still show Team A as the offense before the takeaway'
);
assert.equal(stealTargets.nextPossessionSide, 'B', 'a steal should flip the next possession to the stealing team');

const assistTargets = courtMotion.buildLiveCourtTargets({
  event: { side: 'A', statType: 'ast', player: teamA[0], text: 'Point Guard A sets up a bucket' },
  teamA,
  teamB,
  quarter: 1,
  possessionSide: 'A'
});
assert.equal(assistTargets.nextPossessionSide, 'A', 'an assist event should stay in the same possession');

const madeBasketTargets = courtMotion.buildLiveCourtTargets({
  event: { side: 'A', statType: 'pts', player: teamA[2], text: 'Scorer A scores in rhythm' },
  teamA,
  teamB,
  quarter: 1,
  possessionSide: 'A'
});
assert.equal(madeBasketTargets.nextPossessionSide, 'B', 'a made basket should send the next possession the other way');

const openingState = courtMotion.createLiveMotionState({ possessionSide: 'A' });
const bringUpFrame = courtMotion.buildLiveMotionFrame({
  state: openingState,
  teamA,
  teamB,
  quarter: 1
});
assert.equal(bringUpFrame.targets.length, 10, 'a possession frame should move all ten players');
assert.equal(bringUpFrame.possessionSide, 'A', 'opening possession frame should keep Team A on offense');
assert.equal(bringUpFrame.phase, 'transition', 'opening possession frame should start with transition/bring-up movement');
assert.ok(bringUpFrame.ballTarget && Number.isFinite(bringUpFrame.ballTarget.x), 'possession frame should include a ball target');
assert.ok(
  bringUpFrame.targets.filter((target) => target.side === 'A' && target.role === 'transition-lane').length >= 3,
  'offense should run lanes during transition instead of sliding as a flat group'
);

const halfCourtFrame = courtMotion.buildLiveMotionFrame({
  state: bringUpFrame.nextState,
  teamA,
  teamB,
  quarter: 1
});
assert.equal(halfCourtFrame.phase, 'set', 'second possession frame should settle into half-court spacing');
assert.ok(
  halfCourtFrame.targets.filter((target) => target.side === 'B' && target.role === 'defender').length >= 5,
  'half-court frame should keep the defense in a shell'
);

const actionFrame = courtMotion.buildLiveMotionFrame({
  state: halfCourtFrame.nextState,
  event: { side: 'A', statType: 'pts', fpGain: 4.2, player: teamA[2], text: 'Scorer A gets downhill' },
  teamA,
  teamB,
  quarter: 1
});
assert.equal(actionFrame.phase, 'action', 'scoring event should render as an action inside the current possession');
assert.equal(actionFrame.nextState.possessionSide, 'B', 'made basket action should transition to the other team next');
assert.equal(actionFrame.nextState.phase, 'transition', 'after a made basket the next frame should be transition basketball');
assert.equal(targetFor(actionFrame.targets, 3).role, 'shot-rim', 'downhill scoring should finish in the restricted-area shot zone');
assert.ok(actionFrame.shotTarget.x > 520 && actionFrame.shotTarget.y >= 170 && actionFrame.shotTarget.y <= 230, 'rim shots should cluster near the hoop like a real shot chart');

const deepFrame = courtMotion.buildLiveMotionFrame({
  state: halfCourtFrame.nextState,
  event: { side: 'A', statType: 'pts', fpGain: 3, player: teamA[2], text: 'Scorer A hits from deep', sequence: 4 },
  teamA,
  teamB,
  quarter: 1
});
assert.ok(
  ['shot-wing-three', 'shot-corner-three', 'shot-above-break-three'].includes(targetFor(deepFrame.targets, 3).role),
  'deep scoring should resolve to a three-point shot-chart zone'
);
assert.ok(deepFrame.shotTarget.x >= 390, 'right-basket three-point shots should land beyond the arc');

const thirdQuarterDeepFrame = courtMotion.buildLiveMotionFrame({
  state: courtMotion.createLiveMotionState({ possessionSide: 'A', phase: 'set' }),
  event: { side: 'A', statType: 'pts', fpGain: 3, player: teamA[2], text: 'Scorer A hits from deep', sequence: 5 },
  teamA,
  teamB,
  quarter: 3
});
assert.ok(thirdQuarterDeepFrame.shotTarget.x <= 210, 'shot zones should mirror when teams switch baskets after halftime');

console.log('live matchup court motion tests passed');
