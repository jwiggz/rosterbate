const assert = require('node:assert/strict');
const core = require('../basketball-golf-core');

function idealInput(overrides = {}) {
  return Object.assign({
    shotCardId: 'lob',
    aimAngle: 0,
    distance: 0.5,
    aim: 0.5,
    combo: null
  }, overrides);
}

function playIdealHole(run, shotCardId) {
  const hole = core.currentHole(run);
  const shot = core.resolveShot({
    courseRun: run,
    hole,
    input: idealInput({ shotCardId })
  });
  return core.applyShotResult(run, shot);
}

assert.equal(typeof core.createDefaultCourse, 'function');
assert.equal(typeof core.createCourseRun, 'function');
assert.equal(typeof core.resolveShot, 'function');
assert.equal(typeof core.applyShotResult, 'function');

const course = core.createDefaultCourse();
assert.equal(course.id, 'rosterbate-hoop-links-3');
assert.equal(course.holes.length, 3);
assert.deepEqual(course.holes.map((hole) => hole.par), [2, 3, 3]);
assert.deepEqual(course.holes.map((hole) => hole.recommendedShotTypes[0]), ['lob', 'bank', 'bounce']);
assert.equal(course.holes[0].theme.surface, 'starter-turf');
assert.ok(course.holes[0].pieces.some((piece) => piece.type === 'lane'), 'hole 1 should define a lane piece');
assert.ok(course.holes[0].pieces.some((piece) => piece.type === 'rail'), 'hole 1 should define side rails');
assert.ok(course.holes[1].pieces.some((piece) => piece.type === 'bank-wall'), 'hole 2 should define a bank wall');
assert.ok(course.holes[2].pieces.some((piece) => piece.type === 'ramp'), 'hole 3 should define a ramp');
assert.ok(course.holes[2].pieces.some((piece) => piece.type === 'bounce-pad'), 'hole 3 should define a bounce pad');
assert.deepEqual(course.holes.map((hole) => hole.camera.mode), ['lane', 'bank', 'ramp']);

const customRun = core.createCourseRun({
  course: {
    id: 'custom-course',
    holes: [{
      id: 'custom-hole',
      pieces: [{ type: 'lane', width: '5', length: '9' }],
      camera: { mode: 'custom', position: { x: '1', y: '2', z: '3' } }
    }]
  }
});
const customHole = core.currentHole(customRun);
assert.equal(customHole.pieces[0].type, 'lane');
assert.equal(customHole.pieces[0].width, 5);
assert.equal(customHole.pieces[0].length, 9);
assert.equal(customHole.camera.mode, 'custom');
assert.equal(customHole.camera.position.x, 1);
assert.equal(customHole.theme.surface, 'turf');

const cards = core.createShotCards();
assert.deepEqual(Object.keys(cards), ['lob', 'bounce', 'bank', 'spin']);
assert.equal(cards.lob.trajectory, 'arc');
assert.equal(cards.bounce.trajectory, 'bounce');
assert.equal(cards.bank.trajectory, 'bank');
assert.equal(cards.spin.trajectory, 'spin');

let meter = core.createMeterState({ holeId: 'starter-lane', shotNumber: 1 });
assert.equal(meter.phase, 'idle');
meter = core.pressMeter(meter, 0.02);
assert.equal(meter.phase, 'distance');
meter = core.pressMeter(meter, 0.925);
assert.equal(meter.phase, 'aim');
meter = core.pressMeter(meter, 0.135);
assert.equal(meter.phase, 'released');
assert.deepEqual(meter.input, { start: 0.02, distance: 0.5, aim: 0.5 });

let run = core.createCourseRun({ course, seed: 42 });
assert.equal(run.currentHoleIndex, 0);
assert.equal(run.totalStrokes, 0);
assert.equal(core.currentHole(run).id, 'starter-lane');

const lobShot = core.resolveShot({
  courseRun: run,
  hole: core.currentHole(run),
  input: idealInput({ shotCardId: 'lob' })
});
assert.equal(lobShot.made, true);
assert.equal(lobShot.grade, 'swish');
assert.equal(lobShot.trajectory.kind, 'arc');
assert.equal(lobShot.feedback, 'Swish');

const repeatedLob = core.resolveShot({
  courseRun: run,
  hole: core.currentHole(run),
  input: idealInput({ shotCardId: 'lob' })
});
assert.deepEqual(repeatedLob, lobShot);

run = core.applyShotResult(run, lobShot);
assert.equal(run.holeRuns[0].completed, true);
assert.equal(run.holeRuns[0].strokes, 1);
assert.equal(run.currentHoleIndex, 1);
assert.equal(core.currentHole(run).id, 'bank-lane');

const poorBank = core.resolveShot({
  courseRun: run,
  hole: core.currentHole(run),
  input: idealInput({ shotCardId: 'bank', distance: 0.95, aim: 0.1 })
});
assert.equal(poorBank.made, false);
assert.match(poorBank.feedback, /long|left|angle|speed/i);

run = playIdealHole(run, 'bank');
assert.equal(run.currentHoleIndex, 2);
assert.equal(core.currentHole(run).id, 'ramp-bounce-lane');
run = playIdealHole(run, 'bounce');
assert.equal(run.completed, true);
assert.equal(run.totalStrokes, 3);
assert.equal(core.courseScore(run), -5);

let cappedRun = core.createCourseRun({ course, seed: 1 });
for (let index = 0; index < 8; index++) {
  const miss = core.resolveShot({
    courseRun: cappedRun,
    hole: core.currentHole(cappedRun),
    input: idealInput({ shotCardId: 'lob', distance: 1, aim: 1 })
  });
  cappedRun = core.applyShotResult(cappedRun, miss);
}
assert.equal(cappedRun.holeRuns[0].completed, true);
assert.equal(cappedRun.holeRuns[0].strokes, 8);
assert.equal(cappedRun.holeRuns[0].scoredStrokes, 7);
assert.equal(cappedRun.currentHoleIndex, 1);
assert.equal(core.courseScore(cappedRun), 5);

assert.throws(() => {
  core.resolveShot({
    courseRun: core.createCourseRun({ course: { id: 'empty', holes: [] }, seed: 1 }),
    hole: null,
    input: idealInput()
  });
}, /Cannot resolve basketball golf shot without a valid hole/);

console.log('test-basketball-golf-core passed');
