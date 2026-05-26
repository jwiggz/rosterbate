(function(root, factory){
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RosterBateBasketballGolfCore = factory();
  }
})(typeof self !== 'undefined' ? self : this, function(){
  'use strict';

  const VISUAL_TARGETS = Object.freeze({ distance: 0.925, aim: 0.135 });
  const VISUAL_TO_CORE_SCALE = 2;
  const STROKE_CAP = 8;

  function clamp(value, min, max){
    const num = Number(value);
    if (!Number.isFinite(num)) return min;
    return Math.min(max, Math.max(min, num));
  }

  function clampUnit(value){
    return clamp(value, 0, 1);
  }

  function round(value, places){
    const scale = Math.pow(10, places || 3);
    return Math.round(Number(value || 0) * scale) / scale;
  }

  function clone(value){
    return JSON.parse(JSON.stringify(value));
  }

  function hashString(value){
    const text = String(value || '');
    let hash = 2166136261;
    for (let index = 0; index < text.length; index++) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function deterministicUnit(value){
    return hashString(value) / 4294967295;
  }

  function getCourseCatalog(){
    if (typeof module === 'object' && module.exports && typeof require === 'function') {
      try {
        return require('./basketball-golf-courses');
      } catch (_error) {
        return null;
      }
    }
    return (typeof globalThis !== 'undefined' && globalThis.RosterBateBasketballGolfCourses) || null;
  }

  function createShotCards(){
    return {
      lob: {
        id: 'lob',
        label: 'Lob',
        trajectory: 'arc',
        powerMultiplier: 1,
        spinProfile: 'soft-drop',
        bounceProfile: 'none',
        bankProfile: 'none'
      },
      bounce: {
        id: 'bounce',
        label: 'Bounce',
        trajectory: 'bounce',
        powerMultiplier: 0.94,
        spinProfile: 'forward',
        bounceProfile: 'floor-rise',
        bankProfile: 'none'
      },
      bank: {
        id: 'bank',
        label: 'Bank',
        trajectory: 'bank',
        powerMultiplier: 1.04,
        spinProfile: 'neutral',
        bounceProfile: 'none',
        bankProfile: 'angled-glass'
      },
      spin: {
        id: 'spin',
        label: 'Spin',
        trajectory: 'spin',
        powerMultiplier: 0.98,
        spinProfile: 'side-curve',
        bounceProfile: 'soft-skip',
        bankProfile: 'soft-angle'
      }
    };
  }

  function createFallbackCourse(){
    return {
      id: 'rosterbate-trick-shot-3',
      title: 'RosterBate Trick Shot 3',
      strokeCap: STROKE_CAP,
      holes: [
        {
          id: 'starter-arc',
          number: 1,
          label: 'Starter Arc',
          par: 2,
          tee: { x: -4, y: 0, z: 4 },
          hoop: { x: 3.5, y: 3.05, z: -5 },
          obstacles: [],
          recommendedShotTypes: ['lob']
        },
        {
          id: 'bank-lane',
          number: 2,
          label: 'Bank Lane',
          par: 3,
          tee: { x: -4.5, y: 0, z: 4.5 },
          hoop: { x: 4.2, y: 3.05, z: -4.8 },
          obstacles: [{ id: 'bank-wall', type: 'bank-wall', x: 1.5, z: -1.6, angle: -28 }],
          recommendedShotTypes: ['bank', 'lob']
        },
        {
          id: 'bounce-spin-lane',
          number: 3,
          label: 'Bounce And Spin',
          par: 3,
          tee: { x: -4.2, y: 0, z: 4.4 },
          hoop: { x: 3.8, y: 3.05, z: -5.2 },
          obstacles: [{ id: 'bounce-pad', type: 'bounce-pad', x: 0.6, z: -1.2, radius: 1.1 }],
          recommendedShotTypes: ['bounce', 'spin']
        }
      ]
    };
  }

  function createDefaultCourse(){
    const catalog = getCourseCatalog();
    if (catalog?.createDefaultCourse) return catalog.createDefaultCourse();
    return createFallbackCourse();
  }

  function normalizePoint(point, fallback){
    const source = point || {};
    const base = fallback || {};
    return {
      x: Number.isFinite(Number(source.x)) ? Number(source.x) : Number(base.x || 0),
      y: Number.isFinite(Number(source.y)) ? Number(source.y) : Number(base.y || 0),
      z: Number.isFinite(Number(source.z)) ? Number(source.z) : Number(base.z || 0)
    };
  }

  function normalizePiece(piece, index){
    const source = piece && typeof piece === 'object' ? piece : {};
    const next = Object.assign({}, source, {
      id: String(source.id || `piece-${index + 1}`),
      type: String(source.type || 'lane'),
      x: Number.isFinite(Number(source.x)) ? Number(source.x) : 0,
      z: Number.isFinite(Number(source.z)) ? Number(source.z) : 0,
      width: Number.isFinite(Number(source.width)) ? Number(source.width) : 1,
      length: Number.isFinite(Number(source.length)) ? Number(source.length) : 1,
      height: Number.isFinite(Number(source.height)) ? Number(source.height) : 0.2,
      angle: Number.isFinite(Number(source.angle)) ? Number(source.angle) : 0
    });
    if (Number.isFinite(Number(source.radius))) next.radius = Number(source.radius);
    return next;
  }

  function normalizeCamera(camera){
    const source = camera && typeof camera === 'object' ? camera : {};
    return {
      mode: String(source.mode || 'lane'),
      position: normalizePoint(source.position, { x: 0.4, y: 4.35, z: 10.2 }),
      target: normalizePoint(source.target, { x: 0.2, y: 1.25, z: -2.4 })
    };
  }

  function normalizeCourse(course){
    const source = course && typeof course === 'object' ? course : createDefaultCourse();
    return {
      id: String(source.id || 'course'),
      title: String(source.title || 'Basketball Golf Course'),
      strokeCap: Number.isFinite(Number(source.strokeCap)) ? Number(source.strokeCap) : STROKE_CAP,
      holes: Array.isArray(source.holes) ? source.holes.map((hole, index) => ({
        id: String(hole.id || `hole-${index + 1}`),
        number: Number(hole.number || index + 1),
        label: String(hole.label || `Hole ${index + 1}`),
        par: Number.isFinite(Number(hole.par)) ? Number(hole.par) : 3,
        theme: Object.assign({ surface: 'turf', accent: '#f3b35a' }, hole.theme || {}),
        camera: normalizeCamera(hole.camera),
        tee: normalizePoint(hole.tee, { x: -4, y: 0, z: 4 }),
        hoop: normalizePoint(hole.hoop, { x: 4, y: 3.05, z: -5 }),
        pieces: Array.isArray(hole.pieces) ? hole.pieces.map(normalizePiece) : [],
        obstacles: Array.isArray(hole.obstacles) ? clone(hole.obstacles) : [],
        recommendedShotTypes: Array.isArray(hole.recommendedShotTypes) && hole.recommendedShotTypes.length
          ? hole.recommendedShotTypes.map(String)
          : ['lob']
      })) : []
    };
  }

  function emptyHoleRun(hole){
    return {
      holeId: hole.id,
      strokes: 0,
      shots: [],
      completed: false
    };
  }

  function createCourseRun(options){
    const source = options && typeof options === 'object' ? options : {};
    const course = normalizeCourse(source.course || createDefaultCourse());
    return {
      id: `basketball-golf-run-${Number(source.seed) || 0}`,
      seed: Number(source.seed) || 0,
      course,
      currentHoleIndex: 0,
      holeRuns: course.holes.map(emptyHoleRun),
      totalStrokes: 0,
      completed: false
    };
  }

  function currentHole(run){
    const source = run && typeof run === 'object' ? run : {};
    const course = source.course || createDefaultCourse();
    return course.holes ? course.holes[source.currentHoleIndex || 0] || null : null;
  }

  function createMeterState(options){
    const source = options && typeof options === 'object' ? options : {};
    return {
      phase: 'idle',
      holeId: source.holeId,
      shotNumber: source.shotNumber,
      input: {}
    };
  }

  function visualCursorForCore(phase, position){
    if (phase !== 'distance' && phase !== 'aim') return clampUnit(position);
    const target = VISUAL_TARGETS[phase];
    return clampUnit(0.5 + (clampUnit(position) - target) * VISUAL_TO_CORE_SCALE);
  }

  function pressMeter(state, cursorPosition){
    const source = state && typeof state === 'object' ? state : createMeterState({});
    const next = {
      phase: source.phase || 'idle',
      holeId: source.holeId,
      shotNumber: source.shotNumber,
      input: Object.assign({}, source.input)
    };
    if (source.phase === 'released') return next;
    if (source.phase === 'aim') {
      next.phase = 'released';
      next.input.aim = visualCursorForCore('aim', cursorPosition);
      return next;
    }
    if (source.phase === 'distance') {
      next.phase = 'aim';
      next.input.distance = visualCursorForCore('distance', cursorPosition);
      return next;
    }
    next.phase = 'distance';
    next.input.start = clampUnit(cursorPosition);
    return next;
  }

  function normalizeShotInput(input){
    const source = input && typeof input === 'object' ? input : {};
    return {
      shotCardId: String(source.shotCardId || 'lob'),
      aimAngle: round(clamp(source.aimAngle, -45, 45), 3),
      distance: clampUnit(source.distance),
      aim: clampUnit(source.aim),
      combo: source.combo == null ? null : String(source.combo)
    };
  }

  function trajectoryFor(card, hole, input){
    const base = {
      kind: card.trajectory,
      peak: round(card.trajectory === 'arc' ? 1.15 : card.trajectory === 'bounce' ? 0.62 : 0.84, 3),
      bounceCount: card.trajectory === 'bounce' ? 1 : 0,
      bankCount: card.trajectory === 'bank' ? 1 : 0,
      curve: card.trajectory === 'spin' ? round(input.aimAngle / 45, 3) : 0,
      recommended: hole.recommendedShotTypes.indexOf(card.id) !== -1
    };
    return base;
  }

  function missReason(input){
    const distanceError = Math.abs(input.distance - 0.5);
    const aimError = Math.abs(input.aim - 0.5);
    if (distanceError >= aimError) return input.distance < 0.5 ? 'short' : 'long';
    return input.aim < 0.5 ? 'left' : 'right';
  }

  function resolveShot(options){
    const source = options && typeof options === 'object' ? options : {};
    const run = source.courseRun || createCourseRun({});
    const hole = source.hole || currentHole(run);
    if (!hole || typeof hole !== 'object' || !Array.isArray(hole.recommendedShotTypes)) {
      throw new Error('Cannot resolve basketball golf shot without a valid hole');
    }
    const input = normalizeShotInput(source.input);
    const cards = createShotCards();
    const card = cards[input.shotCardId] || cards.lob;
    const trajectory = trajectoryFor(card, hole, input);
    const distanceError = Math.abs(input.distance - 0.5);
    const aimError = Math.abs(input.aim - 0.5);
    const angleError = Math.abs(input.aimAngle) / 120;
    const wrongCardPenalty = trajectory.recommended ? 0 : 0.11;
    const error = Math.max(distanceError, aimError) + angleError + wrongCardPenalty;
    const deterministicRoll = deterministicUnit([
      run.seed,
      hole.id,
      run.holeRuns[run.currentHoleIndex]?.strokes || 0,
      card.id,
      input.aimAngle,
      input.distance.toFixed(3),
      input.aim.toFixed(3)
    ].join('|'));
    const made = error <= 0.08 || (error <= 0.16 && deterministicRoll < 0.35);
    const grade = made && error <= 0.04 ? 'swish' : made ? 'made' : missReason(input);
    return {
      holeId: hole.id,
      shotCardId: card.id,
      made,
      grade,
      feedback: made ? (grade === 'swish' ? 'Swish' : 'Made it') : `Missed ${grade}`,
      input,
      trajectory,
      error: round(error, 4)
    };
  }

  function advancePastCompletedHoles(next){
    while (next.currentHoleIndex < next.holeRuns.length && next.holeRuns[next.currentHoleIndex].completed) {
      next.currentHoleIndex += 1;
    }
    next.completed = next.currentHoleIndex >= next.holeRuns.length;
    if (next.completed) next.currentHoleIndex = next.holeRuns.length - 1;
    return next;
  }

  function applyShotResult(run, result){
    const next = clone(run);
    if (next.completed) return next;
    const holeIndex = next.currentHoleIndex;
    const hole = next.course.holes[holeIndex];
    const holeRun = next.holeRuns[holeIndex];
    holeRun.strokes += 1;
    holeRun.shots.push(clone(result));
    next.totalStrokes += 1;
    if (result.made || holeRun.strokes >= Number(next.course.strokeCap || STROKE_CAP)) {
      holeRun.completed = true;
      if (!result.made && holeRun.strokes >= Number(next.course.strokeCap || STROKE_CAP)) {
        holeRun.scoredStrokes = hole.par + 5;
      }
    }
    return advancePastCompletedHoles(next);
  }

  function courseScore(run){
    return (run.holeRuns || []).reduce((score, holeRun, index) => {
      const hole = run.course.holes[index];
      if (!holeRun.completed && !holeRun.strokes && !Number.isFinite(Number(holeRun.scoredStrokes))) {
        return score;
      }
      const strokes = Number.isFinite(Number(holeRun.scoredStrokes))
        ? Number(holeRun.scoredStrokes)
        : holeRun.strokes || 0;
      return score + strokes - hole.par;
    }, 0);
  }

  return {
    VISUAL_TARGETS,
    STROKE_CAP,
    createShotCards,
    createDefaultCourse,
    createCourseRun,
    currentHole,
    createMeterState,
    pressMeter,
    normalizeShotInput,
    resolveShot,
    applyShotResult,
    courseScore
  };
});
