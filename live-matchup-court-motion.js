(function(root, factory){
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.RosterBateLiveCourtMotion = factory();
  }
})(typeof self !== 'undefined' ? self : this, function(){
  'use strict';

  function clamp(value, min, max){
    const num = Number(value);
    if (!Number.isFinite(num)) return min;
    return Math.min(max, Math.max(min, num));
  }

  function hash(input){
    const text = String(input || '');
    let value = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      value ^= text.charCodeAt(index);
      value = Math.imul(value, 16777619);
    }
    return value >>> 0;
  }

  function offset(seed, spread){
    const value = hash(seed) % 1000;
    return ((value / 999) * 2 - 1) * Number(spread || 0);
  }

  function courtPoint(x, y, role, speed){
    return {
      x: Math.round(clamp(x, 25, 575) * 10) / 10,
      y: Math.round(clamp(y, 35, 365) * 10) / 10,
      role,
      motionSpeed: clamp(speed, 4, 16)
    };
  }

  function attacksRight(side, quarter){
    const cleanSide = String(side || '').toUpperCase() === 'B' ? 'B' : 'A';
    const firstHalf = Number(quarter || 1) <= 2;
    return cleanSide === 'A' ? firstHalf : !firstHalf;
  }

  function oppositeSide(side){
    return String(side || '').toUpperCase() === 'B' ? 'A' : 'B';
  }

  function cleanSide(value, fallback){
    const side = String(value || '').toUpperCase();
    if (side === 'A' || side === 'B') return side;
    return fallback === 'B' ? 'B' : 'A';
  }

  function createLiveMotionState(options){
    const opts = options && typeof options === 'object' ? options : {};
    const phase = String(opts.phase || 'transition').toLowerCase();
    return {
      possessionSide: cleanSide(opts.possessionSide, 'A'),
      phase: ['transition', 'set', 'motion'].includes(phase) ? phase : 'transition',
      sequence: Math.max(0, Number(opts.sequence || 0) || 0)
    };
  }

  function isScoringStat(type){
    return type === 'pts' || type === 'fantasy' || type === 'bonus' || type === 'adjustment';
  }

  function resolvePossessionFrame(event, payload){
    const hasEvent = event && typeof event === 'object' && event.side;
    const fallbackSide = hasEvent ? event.side : 'A';
    const currentPossessionSide = cleanSide(payload?.possessionSide, fallbackSide);
    const eventSide = cleanSide(event?.side, currentPossessionSide);
    const type = String(event?.statType || '').toLowerCase();
    const fpGain = Number(event?.fpGain || 0);
    let offenseSide = currentPossessionSide;
    let nextPossessionSide = currentPossessionSide;
    let eventRoleSide = eventSide;

    if (!hasEvent) {
      return {
        eventSide: currentPossessionSide,
        eventRoleSide: currentPossessionSide,
        offenseSide: currentPossessionSide,
        defenseSide: oppositeSide(currentPossessionSide),
        nextPossessionSide: currentPossessionSide
      };
    }

    if (isScoringStat(type) && fpGain >= -0.05) {
      offenseSide = eventSide;
      nextPossessionSide = oppositeSide(eventSide);
    } else if (type === 'ast') {
      offenseSide = eventSide;
      nextPossessionSide = eventSide;
    } else if (type === 'to') {
      offenseSide = eventSide;
      nextPossessionSide = oppositeSide(eventSide);
    } else if (type === 'stl') {
      offenseSide = oppositeSide(eventSide);
      nextPossessionSide = eventSide;
    } else if (type === 'blk') {
      offenseSide = oppositeSide(eventSide);
      nextPossessionSide = offenseSide;
    } else if (type === 'reb') {
      if (eventSide === currentPossessionSide) {
        offenseSide = eventSide;
        nextPossessionSide = eventSide;
      } else {
        offenseSide = oppositeSide(eventSide);
        nextPossessionSide = eventSide;
      }
    } else if (eventSide !== currentPossessionSide && fpGain >= 0) {
      offenseSide = eventSide;
      nextPossessionSide = eventSide;
    }

    return {
      eventSide,
      eventRoleSide,
      offenseSide,
      defenseSide: oppositeSide(offenseSide),
      nextPossessionSide
    };
  }

  function mirrorX(attackRight, rightX){
    return attackRight ? rightX : 600 - rightX;
  }

  function formationSpots(attackRight){
    return [
      courtPoint(mirrorX(attackRight, 392), 200, 'top', 8),
      courtPoint(mirrorX(attackRight, 438), 112, 'wing', 8),
      courtPoint(mirrorX(attackRight, 438), 288, 'wing', 8),
      courtPoint(mirrorX(attackRight, 545), 72, 'corner', 8),
      courtPoint(mirrorX(attackRight, 545), 328, 'corner', 8)
    ];
  }

  function transitionSpots(attackRight){
    return [
      courtPoint(mirrorX(attackRight, 326), 200, 'transition-lane', 11),
      courtPoint(mirrorX(attackRight, 365), 118, 'transition-lane', 12),
      courtPoint(mirrorX(attackRight, 365), 282, 'transition-lane', 12),
      courtPoint(mirrorX(attackRight, 426), 82, 'transition-lane', 13),
      courtPoint(mirrorX(attackRight, 426), 318, 'transition-lane', 13)
    ];
  }

  function motionSpots(attackRight, sequence){
    const topLift = Number(sequence || 0) % 2 === 0 ? -1 : 1;
    return [
      courtPoint(mirrorX(attackRight, 392), 200 + topLift * 22, 'handler', 8),
      courtPoint(mirrorX(attackRight, 432), 106, 'wing', 8),
      courtPoint(mirrorX(attackRight, 432), 294, 'wing', 8),
      courtPoint(mirrorX(attackRight, 506), 160, 'cutter', 10),
      courtPoint(mirrorX(attackRight, 506), 240, 'screen', 9)
    ];
  }

  function isShotEvent(event){
    const type = String(event?.statType || '').toLowerCase();
    const fpGain = Number(event?.fpGain || 0);
    return isScoringStat(type) && fpGain >= -0.05;
  }

  function resolveShotZone(event, attackRight){
    const text = String(event?.text || '').toLowerCase();
    const seed = `${event?.player?._id || event?.player?.id || 'p'}:${event?.statType || ''}:${event?.sequence || ''}:${text}`;
    const bucket = hash(seed) % 5;
    if (text.includes('deep') || text.includes('three')) {
      const zones = [
        courtPoint(mirrorX(attackRight, 410) + offset(`${seed}:ab-x`, 18), 200 + offset(`${seed}:ab-y`, 24), 'shot-above-break-three', 9),
        courtPoint(mirrorX(attackRight, 454) + offset(`${seed}:wh-x`, 18), 104 + offset(`${seed}:wh-y`, 18), 'shot-wing-three', 9),
        courtPoint(mirrorX(attackRight, 454) + offset(`${seed}:wl-x`, 18), 296 + offset(`${seed}:wl-y`, 18), 'shot-wing-three', 9),
        courtPoint(mirrorX(attackRight, 562) + offset(`${seed}:ch-x`, 7), 62 + offset(`${seed}:ch-y`, 12), 'shot-corner-three', 9),
        courtPoint(mirrorX(attackRight, 562) + offset(`${seed}:cl-x`, 7), 338 + offset(`${seed}:cl-y`, 12), 'shot-corner-three', 9)
      ];
      return zones[bucket];
    }
    if (text.includes('mid') || text.includes('rhythm')) {
      const zones = [
        courtPoint(mirrorX(attackRight, 485) + offset(`${seed}:el-x`, 18), 150 + offset(`${seed}:el-y`, 16), 'shot-midrange', 10),
        courtPoint(mirrorX(attackRight, 485) + offset(`${seed}:er-x`, 18), 250 + offset(`${seed}:er-y`, 16), 'shot-midrange', 10),
        courtPoint(mirrorX(attackRight, 452) + offset(`${seed}:ft-x`, 20), 200 + offset(`${seed}:ft-y`, 22), 'shot-midrange', 10),
        courtPoint(mirrorX(attackRight, 524) + offset(`${seed}:rh-x`, 12), 200 + offset(`${seed}:rh-y`, 22), 'shot-rim', 12),
        courtPoint(mirrorX(attackRight, 545) + offset(`${seed}:ra-x`, 6), 200 + offset(`${seed}:ra-y`, 15), 'shot-rim', 12)
      ];
      return zones[bucket];
    }
    if (text.includes('downhill') || text.includes('drive') || text.includes('bucket')) {
      return courtPoint(
        mirrorX(attackRight, 545) + offset(`${seed}:rim-x`, 7),
        200 + offset(`${seed}:rim-y`, 20),
        'shot-rim',
        12
      );
    }
    const defaultZones = [
      courtPoint(mirrorX(attackRight, 545) + offset(`${seed}:rim-x`, 7), 200 + offset(`${seed}:rim-y`, 20), 'shot-rim', 12),
      courtPoint(mirrorX(attackRight, 532) + offset(`${seed}:paint-x`, 12), 178 + offset(`${seed}:paint-y`, 12), 'shot-paint', 11),
      courtPoint(mirrorX(attackRight, 532) + offset(`${seed}:paint2-x`, 12), 222 + offset(`${seed}:paint2-y`, 12), 'shot-paint', 11),
      courtPoint(mirrorX(attackRight, 454) + offset(`${seed}:wing-x`, 18), 104 + offset(`${seed}:wing-y`, 18), 'shot-wing-three', 9),
      courtPoint(mirrorX(attackRight, 454) + offset(`${seed}:wing2-x`, 18), 296 + offset(`${seed}:wing2-y`, 18), 'shot-wing-three', 9)
    ];
    return defaultZones[bucket];
  }

  function eventPlayerSpot(event, attackRight){
    const type = String(event?.statType || '').toLowerCase();
    const text = String(event?.text || '').toLowerCase();
    const seed = `${event?.player?._id || event?.player?.id || 'p'}:${type}:${event?.sequence || ''}`;
    if (isShotEvent(event)) return resolveShotZone(event, attackRight);
    if (type === 'reb') {
      return courtPoint(
        mirrorX(attackRight, 532) + offset(seed, 7),
        200 + offset(`${seed}:reb-y`, 22),
        'rebounder',
        11
      );
    }
    if (type === 'blk') {
      return courtPoint(
        mirrorX(attackRight, 526) + offset(seed, 7),
        200 + offset(`${seed}:blk-y`, 16),
        'rim-protector',
        12
      );
    }
    if (type === 'stl') {
      return courtPoint(
        mirrorX(attackRight, 330) + offset(seed, 20),
        200 + offset(`${seed}:stl-y`, 82),
        'passing-lane',
        12
      );
    }
    if (type === 'ast') {
      return courtPoint(
        mirrorX(attackRight, 390) + offset(seed, 26),
        200 + offset(`${seed}:ast-y`, 76),
        'playmaker',
        9
      );
    }
    if (type === 'to') {
      return courtPoint(
        mirrorX(attackRight, 360) + offset(seed, 34),
        200 + offset(`${seed}:to-y`, 105),
        'turnover',
        10
      );
    }
    return courtPoint(mirrorX(attackRight, 392) + offset(seed, 26), 200 + offset(`${seed}:default-y`, 76), 'playmaker', 9);
  }

  function playerId(player){
    return player?._id ?? player?.id ?? null;
  }

  function addTarget(targets, player, side, point, role){
    const id = playerId(player);
    if (id == null) return;
    targets.push({
      playerId: id,
      player,
      side,
      x: point.x,
      y: point.y,
      role: role || point.role,
      motionSpeed: point.motionSpeed
    });
  }

  function buildDefensiveTargets(defense, offenseTargets, attackRight, side, event, primarySpot){
    const eventId = playerId(event?.player);
    const paint = [
      courtPoint(mirrorX(attackRight, 510), 200, 'defender', 9),
      courtPoint(mirrorX(attackRight, 492), 150, 'defender', 9),
      courtPoint(mirrorX(attackRight, 492), 250, 'defender', 9),
      courtPoint(mirrorX(attackRight, 455), 122, 'defender', 10),
      courtPoint(mirrorX(attackRight, 455), 278, 'defender', 10)
    ];
    return (Array.isArray(defense) ? defense : []).slice(0, 5).map(function(player, index){
      if (playerId(player) === eventId) {
        return {
          playerId: playerId(player),
          player,
          side,
          x: primarySpot.x,
          y: primarySpot.y,
          role: primarySpot.role,
          motionSpeed: primarySpot.motionSpeed
        };
      }
      const matchup = offenseTargets[index] || null;
      const base = matchup && matchup.role !== 'rebounder'
        ? courtPoint(
          Number(matchup.x) + (attackRight ? -18 : 18),
          Number(matchup.y) + offset(`${playerId(player)}:def-y`, 18),
          'defender',
          10
        )
        : paint[index] || paint[0];
      return {
        playerId: playerId(player),
        player,
        side,
        x: base.x,
        y: base.y,
        role: 'defender',
        motionSpeed: base.motionSpeed
      };
    }).filter(function(target){ return target.playerId != null; });
  }

  function buildLiveMotionFrame(payload){
    const state = createLiveMotionState(payload?.state || { possessionSide: payload?.possessionSide || payload?.event?.side });
    const event = payload?.event || null;
    const frame = resolvePossessionFrame(event, { possessionSide: state.possessionSide });
    const side = frame.offenseSide;
    const teamA = Array.isArray(payload?.teamA) ? payload.teamA.slice(0, 5) : [];
    const teamB = Array.isArray(payload?.teamB) ? payload.teamB.slice(0, 5) : [];
    const offense = side === 'A' ? teamA : teamB;
    const defense = side === 'A' ? teamB : teamA;
    const attackRight = attacksRight(side, payload?.quarter);
    const phase = event ? 'action' : state.phase;
    const eventId = playerId(event?.player);
    const primarySpot = event ? eventPlayerSpot(event, attackRight) : null;
    const spots = phase === 'transition'
      ? transitionSpots(attackRight)
      : phase === 'motion'
        ? motionSpots(attackRight, state.sequence)
        : formationSpots(attackRight);
    const targets = [];
    let spacingIndex = 0;

    offense.forEach(function(player){
      const isEventPlayer = event && playerId(player) === eventId && frame.eventRoleSide === side;
      if (isEventPlayer && primarySpot) {
        addTarget(targets, player, side, primarySpot, primarySpot.role);
        return;
      }
      const spot = spots[spacingIndex % spots.length];
      spacingIndex += 1;
      addTarget(targets, player, side, spot, spot.role || 'offense');
    });

    const offenseTargets = targets.filter(function(target){ return target.side === side; });
    buildDefensiveTargets(defense, offenseTargets, attackRight, frame.defenseSide, event, primarySpot || offenseTargets[0]).forEach(function(target){
      targets.push(target);
    });

    const ballCarrier = event?.player && frame.eventRoleSide === side
      ? targets.find(function(target){ return target.playerId === eventId; })
      : targets.find(function(target){ return target.side === side && (target.role === 'handler' || target.role === 'transition-lane' || target.role === 'top'); }) ||
        targets.find(function(target){ return target.side === side; });
    const shotTarget = event && isShotEvent(event) ? primarySpot : null;
    const ballTarget = ballCarrier
      ? courtPoint(ballCarrier.x, ballCarrier.y, 'ball', Math.min(16, Number(ballCarrier.motionSpeed || 10) + 2))
      : courtPoint(300, 200, 'ball', 10);
    const nextPhase = event
      ? (frame.nextPossessionSide === side ? 'set' : 'transition')
      : phase === 'transition'
        ? 'set'
        : phase === 'set'
          ? 'motion'
          : 'set';
    const nextState = createLiveMotionState({
      possessionSide: event ? frame.nextPossessionSide : side,
      phase: nextPhase,
      sequence: Number(state.sequence || 0) + 1
    });

    return {
      targets,
      ballTarget,
      shotTarget,
      phase,
      possessionSide: side,
      nextPossessionSide: nextState.possessionSide,
      attackRight,
      nextState
    };
  }

  function buildLiveCourtTargets(payload){
    const frame = buildLiveMotionFrame({
      state: createLiveMotionState({
        possessionSide: payload?.possessionSide || payload?.event?.side,
        phase: 'set'
      }),
      event: payload?.event,
      teamA: payload?.teamA,
      teamB: payload?.teamB,
      quarter: payload?.quarter
    });
    frame.targets.possessionSide = frame.possessionSide;
    frame.targets.nextPossessionSide = frame.nextPossessionSide;
    frame.targets.attackRight = frame.attackRight;
    frame.targets.ballTarget = frame.ballTarget;
    return frame.targets;
  }

  return {
    attacksRight,
    createLiveMotionState,
    buildLiveMotionFrame,
    resolvePossessionFrame,
    buildLiveCourtTargets
  };
});
