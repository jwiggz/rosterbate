(function initBasketballGolfPage(){
  const app = document.getElementById('basketball-golf-app');
  const sceneMount = document.getElementById('golf-scene');
  const shotCardsMount = document.getElementById('golf-shot-cards');
  const holeTitle = document.getElementById('golf-hole-title');
  const strokesEl = document.getElementById('golf-strokes');
  const parEl = document.getElementById('golf-par');
  const progressEl = document.getElementById('golf-course-progress');
  const feedbackEl = document.getElementById('golf-feedback');
  const miniMap = document.getElementById('golf-mini-map');
  const phaseEl = document.getElementById('golf-phase');
  const meterFill = document.getElementById('golf-meter-fill');
  const cursorEl = document.getElementById('golf-cursor');
  const actionButton = document.getElementById('golf-action');
  const core = window.RosterBateBasketballGolfCore;
  const rendererApi = window.RosterBateBasketballGolfRenderer;

  if (!app || !sceneMount || !core || !rendererApi) return;

  const renderer = rendererApi.createBasketballGolfRenderer();
  const course = core.createDefaultCourse();
  const shotCards = core.createShotCards();
  const shotCardList = Object.values(shotCards);
  let run = core.createCourseRun({ course, seed: 42 });
  let selectedShotCardId = recommendedShotCardId();
  let aimAngle = 0;
  let cursorPosition = 0.02;
  let cursorDirection = 1;
  let cursorHoldUntil = 0;
  let cursorAnimationFrame = 0;
  let meter = createMeterForCurrentHole();
  let resolving = false;
  let spaceKeyDown = false;
  let lastRoute = { points: [] };
  const cursorStep = 0.006;

  function clamp(value, min, max){
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.min(max, Math.max(min, number));
  }

  function currentHole(){
    return core.currentHole(run);
  }

  function currentHoleRun(){
    return run.holeRuns[run.currentHoleIndex] || { strokes: 0 };
  }

  function recommendedShotCardId(){
    const hole = core.currentHole(run);
    return hole?.recommendedShotTypes?.[0] || 'lob';
  }

  function createMeterForCurrentHole(){
    const hole = currentHole();
    return Object.assign(core.createMeterState({
      holeId: hole?.id,
      shotNumber: (currentHoleRun().strokes || 0) + 1
    }), {
      cursorPosition,
      cursorDirection
    });
  }

  function routeForShot(hole){
    if (!hole) return { points: [] };
    const angleRadians = aimAngle * Math.PI / 180;
    const side = Math.sin(angleRadians) * 2.2;
    const card = shotCards[selectedShotCardId] || shotCards.lob;
    const peak = card.trajectory === 'arc' ? 2.45 : card.trajectory === 'bounce' ? 1.15 : 1.8;
    const bankOffset = card.trajectory === 'bank' ? 1.15 : 0;
    return {
      points: [
        { x: hole.tee.x, y: 0.42, z: hole.tee.z },
        {
          x: (hole.tee.x + hole.hoop.x) * 0.5 + side + bankOffset,
          y: peak,
          z: (hole.tee.z + hole.hoop.z) * 0.5
        },
        { x: hole.hoop.x, y: hole.hoop.y, z: hole.hoop.z }
      ]
    };
  }

  function setStatus(status){
    app.dataset.golfStatus = status;
  }

  function syncCursor(){
    meter.cursorPosition = cursorPosition;
    meter.cursorDirection = cursorDirection;
    if (cursorEl) cursorEl.style.left = `${cursorPosition * 100}%`;
    if (meterFill) meterFill.style.width = `${cursorPosition * 100}%`;
  }

  function setCursorPosition(value){
    cursorPosition = clamp(value, 0, 1);
    cursorHoldUntil = performance.now() + 250;
    syncCursor();
  }

  function resetCursorForPhase(phase){
    if (phase === 'aim') {
      cursorDirection = -1;
      cursorPosition = 1;
    } else if (phase === 'distance') {
      cursorDirection = 1;
      cursorPosition = 0;
    } else {
      cursorDirection = 1;
      cursorPosition = 0.02;
    }
    cursorHoldUntil = 0;
    syncCursor();
  }

  function renderShotCards(){
    if (!shotCardsMount) return;
    const recommended = recommendedShotCardId();
    shotCardsMount.replaceChildren(...shotCardList.map((card) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = [
        'golf-shot-card',
        card.id === selectedShotCardId ? 'is-selected' : '',
        card.id === recommended ? 'is-recommended' : ''
      ].filter(Boolean).join(' ');
      button.dataset.shotCardId = card.id;
      button.textContent = `${card.label}${card.id === recommended ? ' REC' : ''}`;
      button.addEventListener('click', () => selectShotCard(card.id));
      return button;
    }));
  }

  function renderHud(){
    const hole = currentHole();
    const holeNumber = run.completed ? course.holes.length : run.currentHoleIndex + 1;
    if (holeTitle && hole) holeTitle.textContent = `Hole ${hole.number} - ${hole.label}`;
    if (strokesEl) strokesEl.textContent = String(run.totalStrokes);
    if (parEl && hole) parEl.textContent = `Par ${hole.par}`;
    if (progressEl) progressEl.textContent = `${holeNumber} / ${course.holes.length}`;
    if (phaseEl) phaseEl.textContent = run.completed ? 'Course complete' : (meter.phase === 'idle' ? 'Ready' : meter.phase);
    renderShotCards();
  }

  function renderRoute(){
    const hole = currentHole();
    const route = routeForShot(hole);
    lastRoute = route;
    renderer.setGhostRoute(route);
    renderer.renderMiniMap(miniMap, hole, route);
  }

  function renderAll(){
    const hole = currentHole();
    if (hole) renderer.setHole(hole);
    renderRoute();
    renderHud();
    syncCursor();
  }

  function selectShotCard(id){
    if (!shotCards[id] || resolving) return selectedShotCardId;
    selectedShotCardId = id;
    renderShotCards();
    renderRoute();
    return selectedShotCardId;
  }

  function setAimAngle(value){
    aimAngle = clamp(value, -45, 45);
    renderRoute();
    return aimAngle;
  }

  function nudgeAim(delta){
    setAimAngle(aimAngle + delta);
  }

  async function resolveReleasedShot(){
    if (resolving || meter.phase !== 'released') return;
    resolving = true;
    const hole = currentHole();
    const result = core.resolveShot({
      courseRun: run,
      hole,
      input: {
        shotCardId: selectedShotCardId,
        aimAngle,
        distance: meter.input.distance,
        aim: meter.input.aim,
        combo: null
      }
    });

    if (feedbackEl) feedbackEl.textContent = `${result.feedback}! ${result.made ? `Hole ${hole.number} complete.` : 'Line up the next shot.'}`;
    await renderer.renderShot(result);
    run = core.applyShotResult(run, result);

    if (!run.completed) {
      selectedShotCardId = recommendedShotCardId();
      meter = createMeterForCurrentHole();
      resetCursorForPhase('idle');
      renderAll();
      setStatus('ready');
    } else {
      meter = createMeterForCurrentHole();
      resetCursorForPhase('idle');
      renderHud();
      renderRoute();
      setStatus('complete');
      if (feedbackEl) feedbackEl.textContent = `${result.feedback}! Course complete.`;
    }

    resolving = false;
  }

  function handlePress(){
    if (resolving || run.completed) return meter;
    const previousPhase = meter.phase;
    meter = Object.assign(core.pressMeter(meter, cursorPosition), {
      cursorPosition,
      cursorDirection
    });

    if (meter.phase === 'released') {
      if (phaseEl) phaseEl.textContent = 'Released';
      resolveReleasedShot();
      return meter;
    }

    resetCursorForPhase(meter.phase);
    if (phaseEl) phaseEl.textContent = meter.phase === 'distance' && previousPhase === 'idle' ? 'Distance' : 'Aim';
    return meter;
  }

  function animateCursor(){
    const activeMeter = meter.phase === 'distance' || meter.phase === 'aim';
    if (activeMeter && !resolving && performance.now() >= cursorHoldUntil) {
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
    cursorAnimationFrame = window.requestAnimationFrame(animateCursor);
  }

  function handleKeydown(event){
    if (event.key === ' ' || event.code === 'Space') {
      event.preventDefault();
      if (event.repeat || spaceKeyDown) return;
      spaceKeyDown = true;
      handlePress();
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      nudgeAim(-2);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      nudgeAim(2);
    }
  }

  function handleKeyup(event){
    if (event.key === ' ' || event.code === 'Space') {
      spaceKeyDown = false;
    }
  }

  function handleBlur(){
    spaceKeyDown = false;
  }

  function handleActionClick(event){
    if (event.detail === 0) return;
    handlePress();
  }

  renderer.mount(sceneMount);
  app.dataset.sceneReady = 'true';
  setStatus('ready');
  renderAll();
  if (feedbackEl) feedbackEl.textContent = 'Choose a shot card, then time distance and aim.';
  actionButton?.addEventListener('click', handleActionClick);
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('keyup', handleKeyup);
  window.addEventListener('blur', handleBlur);
  cursorAnimationFrame = window.requestAnimationFrame(animateCursor);

  window.RosterBateBasketballGolfPage = {
    renderer,
    get run(){
      return run;
    },
    get meter(){
      return meter;
    },
    get selectedShotCardId(){
      return selectedShotCardId;
    },
    get aimAngle(){
      return aimAngle;
    },
    currentRoute(){
      return lastRoute;
    },
    selectShotCard,
    setAimAngle,
    setCursorPosition,
    handlePress,
    dispose(){
      if (cursorAnimationFrame) window.cancelAnimationFrame(cursorAnimationFrame);
      cursorAnimationFrame = 0;
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('keyup', handleKeyup);
      window.removeEventListener('blur', handleBlur);
      actionButton?.removeEventListener('click', handleActionClick);
      renderer.dispose?.();
    }
  };
})();
