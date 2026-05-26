(function(root, factory){
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RosterBateThreePointCore = factory();
  }
})(typeof self !== 'undefined' ? self : this, function(){
  'use strict';

  const BALL_VALUES = {
    standard: 1,
    money: 2,
    deep: 3
  };

  const DEFAULT_RACK = {
    id: 'corner-left',
    label: 'Corner',
    spot: 'corner-left',
    distanceFeet: 22,
    balls: ['standard', 'standard', 'standard', 'standard', 'money']
  };

  function clamp(value, min, max){
    const num = Number(value);
    if (!Number.isFinite(num)) return min;
    return Math.min(max, Math.max(min, num));
  }

  function clampRating(value, fallback){
    const fallbackNum = Number(fallback);
    const fallbackRating = Number.isFinite(fallbackNum) ? fallbackNum : 80;
    if (value == null || typeof value === 'boolean' || (typeof value === 'string' && value.trim() === '')) {
      return Math.round(clamp(fallbackRating, 25, 99));
    }
    const num = Number(value);
    const rating = Number.isFinite(num) ? num : fallbackRating;
    return Math.round(clamp(rating, 25, 99));
  }

  function clampUnit(value){
    return clamp(value, 0, 1);
  }

  function slugify(value, fallback){
    const slug = String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return slug || fallback;
  }

  function ballType(value){
    const type = typeof value === 'object' && value ? value.type : value;
    const normalized = String(type || 'standard').toLowerCase();
    return BALL_VALUES[normalized] ? normalized : 'standard';
  }

  function ballValue(type){
    return BALL_VALUES[ballType(type)] || BALL_VALUES.standard;
  }

  function normalizeBall(ball, index){
    const type = ballType(ball);
    return {
      index,
      type,
      value: ballValue(type),
      made: null
    };
  }

  function defaultDistanceForSpot(spot){
    return /corner/i.test(String(spot || '')) ? 22 : 23.75;
  }

  function normalizeRack(rack, index){
    const source = rack && typeof rack === 'object' ? rack : {};
    const spot = String(source.spot || source.id || DEFAULT_RACK.spot);
    const balls = Array.isArray(source.balls) && source.balls.length ? source.balls : DEFAULT_RACK.balls;
    return {
      id: String(source.id || spot || `rack-${index + 1}`),
      label: String(source.label || (spot.indexOf('corner') !== -1 ? 'Corner' : `Rack ${index + 1}`)),
      spot,
      distanceFeet: Number.isFinite(Number(source.distanceFeet))
        ? Number(source.distanceFeet)
        : defaultDistanceForSpot(spot),
      balls: balls.map(normalizeBall)
    };
  }

  function cloneRack(rack){
    return {
      id: rack.id,
      label: rack.label,
      spot: rack.spot,
      distanceFeet: rack.distanceFeet,
      balls: rack.balls.map((ball) => ({
        index: ball.index,
        type: ball.type,
        value: ball.value,
        made: ball.made
      }))
    };
  }

  function cloneShotResult(result){
    const source = result && typeof result === 'object' ? result : {};
    const copy = Object.assign({}, source);
    if (source.input && typeof source.input === 'object') {
      copy.input = Object.assign({}, source.input);
    }
    return copy;
  }

  function normalizeSeed(seed){
    const num = Number(seed);
    return Number.isFinite(num) ? num : 0;
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

  function missDirection(input){
    const distanceError = Math.abs(input.distance - 0.5);
    const aimError = Math.abs(input.aim - 0.5);
    if (distanceError >= aimError) {
      return input.distance < 0.5 ? 'short' : 'long';
    }
    return input.aim < 0.5 ? 'left' : 'right';
  }

  function normalizeShotInput(input){
    const source = input && typeof input === 'object' ? input : {};
    return {
      start: clampUnit(source.start),
      distance: clampUnit(source.distance),
      aim: clampUnit(source.aim)
    };
  }

  function createShooterProfile(input){
    const source = input && typeof input === 'object' ? input : {};
    const threePointRating = clampRating(source.threePointRating, 80);
    return {
      id: String(source.id || slugify(source.name, 'shooter')),
      name: String(source.name || 'Unknown Shooter'),
      team: String(source.team || '').toUpperCase(),
      portraitUrl: String(source.portraitUrl || ''),
      threePointRating,
      clutchRating: clampRating(source.clutchRating, threePointRating)
    };
  }

  function createContestConfig(input){
    const source = input && typeof input === 'object' ? input : {};
    const racks = Array.isArray(source.racks) && source.racks.length ? source.racks : [DEFAULT_RACK];
    const timerSeconds = Number(source.timerSeconds);
    return {
      mode: String(source.mode || 'vertical_slice'),
      timerSeconds: Number.isFinite(timerSeconds) ? timerSeconds : 70,
      racks: racks.map(normalizeRack)
    };
  }

  function createContestRun(options){
    const source = options && typeof options === 'object' ? options : {};
    const seed = normalizeSeed(source.seed);
    const shooter = createShooterProfile(source.shooter);
    const config = createContestConfig(source.config);
    return {
      id: `three-point-contest-run-${seed}`,
      shooter,
      config,
      racks: config.racks.map(cloneRack),
      currentRackIndex: 0,
      currentBallIndex: 0,
      score: 0,
      shots: [],
      completed: false,
      seed
    };
  }

  function createMeterState(options){
    const source = options && typeof options === 'object' ? options : {};
    return {
      phase: 'idle',
      shotNumber: source.shotNumber,
      rackSpot: source.rackSpot,
      input: {}
    };
  }

  function pressMeter(state, cursorPosition){
    const source = state && typeof state === 'object' ? state : createMeterState({});
    const cursor = clampUnit(cursorPosition);
    const input = Object.assign({}, source.input);
    const next = {
      phase: source.phase || 'idle',
      shotNumber: source.shotNumber,
      rackSpot: source.rackSpot,
      input
    };

    if (source.phase === 'released') {
      return next;
    }
    if (source.phase === 'aim') {
      next.phase = 'released';
      next.input.aim = cursor;
      return next;
    }
    if (source.phase === 'distance') {
      next.phase = 'aim';
      next.input.distance = cursor;
      return next;
    }

    next.phase = 'distance';
    next.input.start = cursor;
    return next;
  }

  function getShotWindows(shooter, rackSpot){
    const profile = createShooterProfile(shooter);
    const ratingFactor = (profile.threePointRating - 25) / 74;
    const isCorner = /corner/i.test(String(rackSpot || ''));
    const cornerGreen = isCorner ? 0.01 : 0;
    const cornerGood = isCorner ? 0.015 : 0;
    return {
      green: Math.round((0.025 + ratingFactor * 0.045 + cornerGreen) * 1000) / 1000,
      good: Math.round((0.13 + ratingFactor * 0.09 + cornerGood) * 1000) / 1000
    };
  }

  function gradeShotInput(options){
    const source = options && typeof options === 'object' ? options : {};
    const shooter = createShooterProfile(source.shooter);
    const input = normalizeShotInput(source.input);
    const value = ballValue(source.ballType);
    const windows = getShotWindows(shooter, source.rackSpot);
    const distanceError = Math.abs(input.distance - 0.5);
    const aimError = Math.abs(input.aim - 0.5);
    const error = Math.max(distanceError, aimError);

    if (error <= windows.green) {
      return {
        grade: 'green',
        made: true,
        points: value,
        feedback: 'Green release',
        input
      };
    }

    if (error <= windows.good) {
      const accuracy = clamp((windows.good - error) / Math.max(0.001, windows.good - windows.green), 0, 1);
      const chance = clamp(0.34 + shooter.threePointRating / 180 + accuracy * 0.16, 0.2, 0.92);
      const roll = deterministicUnit([
        shooter.id,
        shooter.threePointRating,
        source.rackSpot,
        ballType(source.ballType),
        input.start.toFixed(3),
        input.distance.toFixed(3),
        input.aim.toFixed(3)
      ].join('|'));
      const made = roll <= chance;
      const direction = missDirection(input);
      return {
        grade: 'good',
        made,
        points: made ? value : 0,
        feedback: made ? 'Good release' : `Missed ${direction}`,
        input
      };
    }

    const direction = missDirection(input);
    return {
      grade: direction,
      made: false,
      points: 0,
      feedback: `Missed ${direction}`,
      input
    };
  }

  function applyShotResult(run, result){
    const source = run && typeof run === 'object' ? run : {};
    const racks = Array.isArray(source.racks) ? source.racks.map(cloneRack) : [];
    const currentRackIndex = Number(source.currentRackIndex) || 0;
    const currentBallIndex = Number(source.currentBallIndex) || 0;
    const existingShots = Array.isArray(source.shots) ? source.shots.map(cloneShotResult) : [];
    const currentScore = Number(source.score || 0);
    let nextRackIndex = currentRackIndex;
    let nextBallIndex = currentBallIndex;
    let completed = Boolean(source.completed);

    if (completed) {
      return Object.assign({}, source, {
        racks,
        currentRackIndex: nextRackIndex,
        currentBallIndex: nextBallIndex,
        score: currentScore,
        shots: existingShots,
        completed
      });
    }

    const shotResult = cloneShotResult(result);
    const nextShots = existingShots.concat([shotResult]);
    const nextScore = currentScore + Number(shotResult.points || 0);
    const rack = racks[currentRackIndex];

    if (rack && rack.balls[currentBallIndex]) {
      rack.balls[currentBallIndex] = Object.assign({}, rack.balls[currentBallIndex], {
        made: Boolean(shotResult.made)
      });
      nextBallIndex += 1;
      if (nextBallIndex >= rack.balls.length) {
        nextRackIndex += 1;
        nextBallIndex = 0;
      }
      completed = nextRackIndex >= racks.length;
    } else if (!rack) {
      completed = true;
    }

    return Object.assign({}, source, {
      racks,
      currentRackIndex: nextRackIndex,
      currentBallIndex: nextBallIndex,
      score: nextScore,
      shots: nextShots,
      completed
    });
  }

  return {
    createShooterProfile,
    createContestConfig,
    createContestRun,
    createMeterState,
    pressMeter,
    getShotWindows,
    gradeShotInput,
    applyShotResult
  };
});
