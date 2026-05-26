(function initThreePointContestPage() {
  const core = window.RosterBateThreePointCore;
  const rendererApi = window.RosterBateThreePointRenderer;
  const app = document.getElementById('three-point-contest-app');
  const sceneMount = document.getElementById('contest-scene');
  const cursorEl = document.getElementById('contest-cursor');
  const fillEl = document.getElementById('contest-fill');
  const shooterEl = document.getElementById('contest-shooter');
  const scoreEl = document.getElementById('contest-score');
  const ballsEl = document.getElementById('contest-balls');
  const rackEl = document.getElementById('contest-rack');
  const clockEl = document.getElementById('contest-clock');
  const feedbackEl = document.getElementById('contest-feedback');
  const phaseEl = document.getElementById('contest-phase');
  const actionButton = document.getElementById('contest-action');

  if (!core || !rendererApi || !app || !sceneMount) return;

  const shooter = core.createShooterProfile({
    id: 'tyrese-maxey',
    name: 'Tyrese Maxey',
    team: 'PHI',
    threePointRating: 88,
    clutchRating: 84
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

  let run = core.createContestRun({ shooter, config, seed: 17 });
  let meter = createMeterForCurrentBall();
  let cursorPosition = 0;
  let cursorDirection = 1;
  let cursorHoldUntil = 0;
  let shotInFlight = false;
  let spaceKeyDown = false;

  const visualMeterTargets = Object.freeze({
    distance: 0.925,
    aim: 0.135
  });
  const cursorStep = 0.008;
  const visualToCoreScale = 2;

  const renderer = rendererApi.createContestRenderer();
  renderer.mount(sceneMount);
  app.dataset.sceneReady = 'true';
  app.dataset.contestStatus = 'ready';

  function clampUnit(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.min(1, Math.max(0, num));
  }

  function currentRack() {
    return run.racks[run.currentRackIndex] || null;
  }

  function currentBall() {
    return currentRack()?.balls[run.currentBallIndex] || null;
  }

  function createMeterForCurrentBall() {
    const rack = currentRack();
    return core.createMeterState({
      shotNumber: (run.shots?.length || 0) + 1,
      rackSpot: rack?.spot || 'corner-left'
    });
  }

  function phaseLabel() {
    if (run.completed) return 'Rack complete';
    const ballNumber = run.currentBallIndex + 1;
    if (meter.phase === 'distance') return `Ball ${ballNumber} - Distance`;
    if (meter.phase === 'aim') return `Ball ${ballNumber} - Aim`;
    if (meter.phase === 'released') return `Ball ${ballNumber} - Release`;
    return `Ball ${ballNumber} - Ready`;
  }

  function renderBallDots() {
    const rack = run.racks[run.currentRackIndex] || run.racks[run.racks.length - 1];
    if (!ballsEl || !rack) return;
    ballsEl.innerHTML = rack.balls.map((ball) => {
      const state = ball.made === true ? 'made' : (ball.made === false ? 'missed' : '');
      return `<span class="contest-ball-dot ${ball.type === 'money' ? 'money' : ''} ${state}" aria-hidden="true"></span>`;
    }).join('');
  }

  function syncCursor() {
    if (cursorEl) cursorEl.style.left = `${Math.round(cursorPosition * 1000) / 10}%`;
    if (fillEl) {
      const fillPosition = meter.phase === 'aim' || meter.phase === 'released' ? 1 : cursorPosition;
      fillEl.style.width = `${Math.round(fillPosition * 1000) / 10}%`;
    }
  }

  function setCursorPosition(value) {
    cursorPosition = clampUnit(value);
    cursorHoldUntil = performance.now() + 250;
    syncCursor();
  }

  function updateHud() {
    const rack = currentRack();
    if (shooterEl) shooterEl.textContent = `${run.shooter.name} - ${run.shooter.team}`;
    if (scoreEl) scoreEl.textContent = String(run.score);
    renderBallDots();
    if (rackEl) rackEl.textContent = run.completed ? 'Rack Complete' : `Rack ${run.currentRackIndex + 1} / ${run.racks.length}`;
    if (clockEl) clockEl.textContent = `${Number(run.config.timerSeconds || 70).toFixed(1)}`;
    if (phaseEl) phaseEl.textContent = phaseLabel();
    if (actionButton) actionButton.textContent = rack ? 'Press Space / Click' : 'Complete';
    app.dataset.meterPhase = meter.phase || 'idle';
    syncCursor();
  }

  function animateCursor() {
    const activeMeter = meter.phase === 'distance' || meter.phase === 'aim';
    if (activeMeter && !shotInFlight && performance.now() >= cursorHoldUntil) {
      cursorPosition += cursorDirection * cursorStep;
      if (cursorPosition >= 1) {
        cursorPosition = 1;
        cursorDirection = -1;
      } else if (cursorPosition <= 0) {
        cursorPosition = 0;
        cursorDirection = 1;
      }
      syncCursor();
    }
    window.requestAnimationFrame(animateCursor);
  }

  function visualCursorForCore(phase, position) {
    if (phase !== 'distance' && phase !== 'aim') return clampUnit(position);
    const target = visualMeterTargets[phase];
    return clampUnit(0.5 + (clampUnit(position) - target) * visualToCoreScale);
  }

  function resetCursorForPhase(phase) {
    if (phase === 'idle' || phase === 'complete') {
      cursorPosition = 0;
      cursorDirection = 1;
      cursorHoldUntil = 0;
    } else if (phase === 'distance') {
      cursorPosition = 0;
      cursorDirection = 1;
      cursorHoldUntil = 0;
    } else if (phase === 'aim') {
      cursorPosition = 1;
      cursorDirection = -1;
      cursorHoldUntil = 0;
    }
    syncCursor();
  }

  async function resolveShot() {
    const rack = currentRack();
    const ball = currentBall();
    if (!rack || !ball) return;

    shotInFlight = true;
    const result = core.gradeShotInput({
      shooter: run.shooter,
      rackSpot: rack.spot,
      ballType: ball.type,
      input: meter.input
    });

    if (feedbackEl) feedbackEl.textContent = result.feedback;
    updateHud();
    try {
      await renderer.renderShot(result);
      run = core.applyShotResult(run, result);
      meter = createMeterForCurrentBall();
      resetCursorForPhase(run.completed ? 'complete' : 'idle');
      if (run.completed) {
        if (feedbackEl) feedbackEl.textContent = `Rack complete - ${run.score}`;
        app.dataset.contestStatus = 'complete';
      }
    } finally {
      shotInFlight = false;
      updateHud();
    }
  }

  async function handlePress() {
    if (shotInFlight || run.completed) return;

    const previousPhase = meter.phase || 'idle';
    meter = core.pressMeter(meter, visualCursorForCore(previousPhase, cursorPosition));
    if (meter.phase === 'distance') {
      if (feedbackEl) feedbackEl.textContent = 'Distance';
      resetCursorForPhase('distance');
      updateHud();
      return;
    }
    if (meter.phase === 'aim') {
      if (feedbackEl) feedbackEl.textContent = 'Aim';
      resetCursorForPhase('aim');
      updateHud();
      return;
    }
    if (meter.phase === 'released') {
      await resolveShot();
    }
  }

  window.addEventListener('keydown', (event) => {
    if (event.code !== 'Space') return;
    event.preventDefault();
    if (event.repeat || spaceKeyDown) return;
    spaceKeyDown = true;
    handlePress();
  });
  window.addEventListener('keyup', (event) => {
    if (event.code === 'Space') spaceKeyDown = false;
  });
  window.addEventListener('blur', () => {
    spaceKeyDown = false;
  });
  if (actionButton) {
    actionButton.addEventListener('click', (event) => {
      if (event.detail === 0) return;
      handlePress();
    });
  }

  updateHud();
  animateCursor();
  window.RosterBateThreePointPage = {
    renderer,
    get run() {
      return run;
    },
    get meter() {
      return meter;
    },
    visualMeterTargets,
    getVisualMeterState() {
      return {
        phase: meter.phase || 'idle',
        cursorPosition,
        direction: cursorDirection,
        cursorStep,
        targets: visualMeterTargets
      };
    },
    handlePress,
    setCursorPosition
  };
})();
