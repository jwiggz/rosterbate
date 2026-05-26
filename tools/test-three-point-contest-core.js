const assert = require('node:assert/strict');
const core = require('../three-point-contest-core');

const shooter = core.createShooterProfile({
  id: 'maxey',
  name: 'Tyrese Maxey',
  team: 'PHI',
  threePointRating: 88,
  clutchRating: 84
});

const invalidClutchShooter = core.createShooterProfile({
  name: 'Invalid Clutch',
  team: 'tst',
  threePointRating: 90,
  clutchRating: 'bad'
});
assert.equal(invalidClutchShooter.threePointRating, 90);
assert.equal(invalidClutchShooter.clutchRating, 90);

[false, null, '', '   '].forEach((clutchRating) => {
  const fallbackShooter = core.createShooterProfile({
    name: 'Fallback Clutch',
    team: 'tst',
    threePointRating: 90,
    clutchRating
  });
  assert.equal(fallbackShooter.clutchRating, 90, `clutch fallback for ${String(clutchRating)}`);
});

const config = core.createContestConfig({
  mode: 'vertical_slice',
  timerSeconds: 70,
  racks: [
    {
      id: 'corner-left',
      label: 'Corner',
      spot: 'corner-left',
      distanceFeet: 22,
      balls: ['standard', 'standard', 'standard', 'standard', 'money']
    }
  ]
});

const run = core.createContestRun({ shooter, config, seed: 17 });
assert.equal(run.score, 0);
assert.equal(run.currentRackIndex, 0);
assert.equal(run.currentBallIndex, 0);
assert.equal(run.racks[0].balls.length, 5);

let meter = core.createMeterState({ shotNumber: 1, rackSpot: 'corner-left' });
assert.equal(meter.phase, 'idle');
meter = core.pressMeter(meter, 0.02);
assert.equal(meter.phase, 'distance');
meter = core.pressMeter(meter, 0.48);
assert.equal(meter.phase, 'aim');
meter = core.pressMeter(meter, 0.51);
assert.equal(meter.phase, 'released');

const green = core.gradeShotInput({
  shooter,
  rackSpot: 'corner-left',
  ballType: 'standard',
  input: meter.input
});
assert.equal(green.grade, 'green');
assert.equal(green.made, true);
assert.equal(green.points, 1);

let advanced = core.applyShotResult(run, green);
assert.equal(advanced.score, 1);
assert.equal(advanced.currentBallIndex, 1);
assert.equal(advanced.shots.length, 1);

const money = core.gradeShotInput({
  shooter,
  rackSpot: 'corner-left',
  ballType: 'money',
  input: { start: 0.02, distance: 0.49, aim: 0.52 }
});
assert.equal(money.points, 2);

const poor = core.gradeShotInput({
  shooter,
  rackSpot: 'corner-left',
  ballType: 'standard',
  input: { start: 0.02, distance: 0.12, aim: 0.88 }
});
assert.equal(poor.made, false);
assert.match(poor.feedback, /short|long|left|right/i);

const weakShooter = core.createShooterProfile({
  name: 'Weak Shooter',
  team: 'TST',
  threePointRating: 62
});
const eliteWindow = core.getShotWindows(shooter, 'corner-left');
const weakWindow = core.getShotWindows(weakShooter, 'corner-left');
assert.equal(eliteWindow.green > weakWindow.green, true);
assert.equal(eliteWindow.good > weakWindow.good, true);

let fullRun = run;
for (let index = 0; index < 5; index++) {
  const ballType = fullRun.racks[0].balls[fullRun.currentBallIndex].type;
  const result = core.gradeShotInput({
    shooter,
    rackSpot: 'corner-left',
    ballType,
    input: { start: 0.02, distance: 0.5, aim: 0.5 }
  });
  fullRun = core.applyShotResult(fullRun, result);
}
assert.equal(fullRun.completed, true);
assert.equal(fullRun.score, 6);

const overAppliedRun = core.applyShotResult(fullRun, {
  grade: 'green',
  made: true,
  points: 3,
  feedback: 'Green release',
  input: { start: 0.02, distance: 0.5, aim: 0.5 }
});
assert.equal(overAppliedRun.completed, true);
assert.equal(overAppliedRun.score, fullRun.score);
assert.equal(overAppliedRun.currentRackIndex, fullRun.currentRackIndex);
assert.equal(overAppliedRun.currentBallIndex, fullRun.currentBallIndex);
assert.equal(overAppliedRun.shots.length, fullRun.shots.length);

const mutableResult = {
  grade: 'green',
  made: true,
  points: 1,
  feedback: 'Green release',
  input: { start: 0.02, distance: 0.5, aim: 0.5 }
};
const isolatedRun = core.applyShotResult(run, mutableResult);
assert.notEqual(isolatedRun.shots[0], mutableResult);
assert.notEqual(isolatedRun.shots[0].input, mutableResult.input);
mutableResult.input.distance = 0.12;
mutableResult.input.aim = 0.88;
assert.equal(isolatedRun.shots[0].input.distance, 0.5);
assert.equal(isolatedRun.shots[0].input.aim, 0.5);

console.log('test-three-point-contest-core passed');
