import * as THREE from './assets/vendor/three/three.module.js';

(function initBasketballGolfRenderer(){
  const DEFAULT_HOLE = {
    id: 'starter-arc',
    tee: { x: -4, y: 0, z: 4 },
    hoop: { x: 3.5, y: 3.05, z: -5 },
    obstacles: []
  };

  function material(color, options = {}){
    return new THREE.MeshStandardMaterial(Object.assign({
      color,
      roughness: 0.7,
      metalness: 0.04
    }, options));
  }

  function toVector3(point, fallback){
    const source = point || fallback || {};
    return new THREE.Vector3(
      Number.isFinite(Number(source.x)) ? Number(source.x) : 0,
      Number.isFinite(Number(source.y)) ? Number(source.y) : 0,
      Number.isFinite(Number(source.z)) ? Number(source.z) : 0
    );
  }

  function createDefaultRoute(hole){
    const tee = toVector3(hole?.tee, DEFAULT_HOLE.tee);
    const hoop = toVector3(hole?.hoop, DEFAULT_HOLE.hoop);
    return {
      points: [
        { x: tee.x, y: 0.42, z: tee.z },
        { x: (tee.x + hoop.x) * 0.45, y: 2.35, z: (tee.z + hoop.z) * 0.52 },
        { x: hoop.x, y: hoop.y, z: hoop.z }
      ]
    };
  }

  function createBasketballGolfRenderer(){
    let renderer;
    let scene;
    let camera;
    let mountEl;
    let frameId = 0;
    let resizeHandler;
    let ball;
    let currentHole = DEFAULT_HOLE;
    let currentRoute = createDefaultRoute(DEFAULT_HOLE);
    let ghostRoute;
    let activeShotPromise = null;
    let resolveActiveShot = null;
    let shotFrameId = 0;
    let coursePieceCount = 0;
    let courtLineCount = 0;
    let hasRim = false;
    let hasBackboard = false;
    const sceneObjects = [];

    function add(object){
      scene.add(object);
      sceneObjects.push(object);
      return object;
    }

    function disposeObject(object){
      if (!object) return;
      object.traverse?.((child) => {
        child.geometry?.dispose?.();
        if (Array.isArray(child.material)) {
          child.material.forEach((item) => item?.dispose?.());
        } else {
          child.material?.dispose?.();
        }
      });
    }

    function clearHoleObjects(){
      sceneObjects.splice(0).forEach((object) => {
        scene.remove(object);
        disposeObject(object);
      });
      if (ghostRoute) {
        scene.remove(ghostRoute);
        disposeObject(ghostRoute);
        ghostRoute = null;
      }
    }

    function resize(){
      if (!renderer || !camera || !mountEl) return;
      const width = Math.max(1, mountEl.clientWidth || window.innerWidth || 1280);
      const height = Math.max(1, mountEl.clientHeight || window.innerHeight || 720);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    function colorValue(value, fallback){
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      const text = String(value || '').trim().replace('#', '');
      const parsed = Number.parseInt(text, 16);
      return Number.isFinite(parsed) ? parsed : fallback;
    }

    function applyCamera(cameraConfig){
      if (!camera || !cameraConfig) return;
      const position = toVector3(cameraConfig.position, { x: 0.4, y: 4.35, z: 10.2 });
      const target = toVector3(cameraConfig.target, { x: 0.2, y: 1.25, z: -2.4 });
      camera.position.copy(position);
      camera.lookAt(target);
      camera.updateProjectionMatrix();
    }

    function addBoxPiece(piece, color, options = {}){
      const height = Math.max(0.04, Number(piece.height) || 0.18);
      const mesh = add(new THREE.Mesh(
        new THREE.BoxGeometry(Math.max(0.05, Number(piece.width) || 1), height, Math.max(0.05, Number(piece.length) || 1)),
        material(color, options)
      ));
      mesh.position.set(Number(piece.x) || 0, height / 2, Number(piece.z) || 0);
      mesh.rotation.y = THREE.MathUtils.degToRad(Number(piece.angle) || 0);
      coursePieceCount += 1;
      return mesh;
    }

    function addCoursePiece(piece){
      if (!piece || !piece.type) return;
      if (piece.type === 'lane') {
        addBoxPiece(piece, colorValue(piece.color, 0x2f8d52), { roughness: 0.88 });
        return;
      }
      if (piece.type === 'rail') {
        addBoxPiece(piece, 0xf3b35a, { roughness: 0.48, emissive: 0x1a0d02 });
        return;
      }
      if (piece.type === 'bank-wall') {
        addObstacle(piece);
        coursePieceCount += 1;
        return;
      }
      if (piece.type === 'ramp') {
        const ramp = addBoxPiece(piece, 0x8bbf5a, { roughness: 0.72 });
        ramp.rotation.x = THREE.MathUtils.degToRad(-10);
        return;
      }
      if (piece.type === 'bounce-pad') {
        addObstacle(piece);
        coursePieceCount += 1;
        return;
      }
      if (piece.type === 'hazard') {
        addBoxPiece(piece, 0x0b1020, { roughness: 0.9, emissive: 0x020512 });
      }
    }

    function addHoop(hoop){
      const hoopPosition = toVector3(hoop, DEFAULT_HOLE.hoop);

      const stanchion = add(new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.09, 3.2, 16),
        material(0x243042, { metalness: 0.22, roughness: 0.38 })
      ));
      stanchion.position.set(hoopPosition.x, 1.55, hoopPosition.z - 0.72);

      const backboard = add(new THREE.Mesh(
        new THREE.BoxGeometry(2.25, 1.28, 0.08),
        material(0xeaf6ff, { transparent: true, opacity: 0.78, roughness: 0.18 })
      ));
      backboard.position.set(hoopPosition.x, hoopPosition.y + 0.48, hoopPosition.z - 0.42);
      hasBackboard = true;

      const square = add(new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.48, 0.03),
        material(0xf06c38, { emissive: 0x2b0a02, roughness: 0.45 })
      ));
      square.position.set(hoopPosition.x, hoopPosition.y + 0.34, hoopPosition.z - 0.36);

      const rim = add(new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.045, 16, 64),
        material(0xe15d2f, { metalness: 0.25, roughness: 0.25 })
      ));
      rim.rotation.x = Math.PI / 2;
      rim.position.copy(hoopPosition);
      hasRim = true;

      return rim;
    }

    function addObstacle(obstacle){
      if (obstacle.type === 'bank-wall') {
        const wall = add(new THREE.Mesh(
          new THREE.BoxGeometry(Math.max(0.6, Number(obstacle.width) || 3.1), Math.max(0.24, Number(obstacle.height) || 0.72), Math.max(0.08, Number(obstacle.length) || 0.22)),
          material(0xf8fbff, { transparent: true, opacity: 0.86, metalness: 0.12, roughness: 0.26 })
        ));
        wall.position.set(Number(obstacle.x) || 0, Math.max(0.24, Number(obstacle.height) || 0.72) / 2, Number(obstacle.z) || 0);
        wall.rotation.y = THREE.MathUtils.degToRad(Number(obstacle.angle) || 0);

        const rail = add(new THREE.Mesh(
          new THREE.BoxGeometry(Math.max(0.8, (Number(obstacle.width) || 3.1) + 0.18), 0.08, Math.max(0.12, (Number(obstacle.length) || 0.22) + 0.06)),
          material(0xf3b35a, { emissive: 0x221000 })
        ));
        rail.position.set(wall.position.x, Math.max(0.32, Number(obstacle.height) || 0.72) + 0.08, wall.position.z);
        rail.rotation.y = wall.rotation.y;
        return;
      }

      if (obstacle.type === 'bounce-pad') {
        const radius = Math.max(0.35, Number(obstacle.radius) || 1);
        const pad = add(new THREE.Mesh(
          new THREE.CylinderGeometry(radius, radius, 0.12, 48),
          material(0x38bdf8, { emissive: 0x07233a, roughness: 0.36 })
        ));
        pad.position.set(Number(obstacle.x) || 0, 0.1, Number(obstacle.z) || 0);

        const ring = add(new THREE.Mesh(
          new THREE.TorusGeometry(radius * 0.82, 0.035, 10, 48),
          material(0xf8fafc, { emissive: 0x10243a, roughness: 0.22 })
        ));
        ring.rotation.x = Math.PI / 2;
        ring.position.set(pad.position.x, 0.19, pad.position.z);
      }
    }

    function setBallAtTee(){
      if (!ball) return;
      const tee = toVector3(currentHole?.tee, DEFAULT_HOLE.tee);
      ball.position.set(tee.x, 0.38, tee.z);
      ball.scale.setScalar(1);
    }

    function setHole(hole){
      currentHole = Object.assign({}, DEFAULT_HOLE, hole || {});
      currentHole.tee = Object.assign({}, DEFAULT_HOLE.tee, hole?.tee || {});
      currentHole.hoop = Object.assign({}, DEFAULT_HOLE.hoop, hole?.hoop || {});
      currentHole.obstacles = Array.isArray(hole?.obstacles) ? hole.obstacles : [];
      currentHole.pieces = Array.isArray(hole?.pieces) ? hole.pieces : [];

      if (!scene) return;
      clearHoleObjects();
      coursePieceCount = 0;
      courtLineCount = 0;
      hasRim = false;
      hasBackboard = false;
      applyCamera(currentHole.camera);

      const floor = add(new THREE.Mesh(
        new THREE.PlaneGeometry(20, 26),
        material(0x1d241f, { roughness: 0.92 })
      ));
      floor.rotation.x = -Math.PI / 2;
      floor.position.z = -1.2;

      const pieces = currentHole.pieces.length ? currentHole.pieces : [
        { id: 'fallback-lane', type: 'lane', x: 0, z: -0.4, width: 7.8, length: 14.6, color: '#2f8d52' }
      ];
      pieces.forEach(addCoursePiece);
      addHoop(currentHole.hoop);
      setBallAtTee();
      setGhostRoute(currentRoute?.points?.length ? currentRoute : createDefaultRoute(currentHole));
    }

    function setGhostRoute(route){
      currentRoute = route?.points?.length ? route : createDefaultRoute(currentHole);
      if (!scene) return;
      if (ghostRoute) {
        scene.remove(ghostRoute);
        disposeObject(ghostRoute);
        ghostRoute = null;
      }

      const points = currentRoute.points.map((point) => toVector3(point));
      if (points.length < 2) return;

      const curve = new THREE.CatmullRomCurve3(points);
      ghostRoute = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(52)),
        new THREE.LineBasicMaterial({ color: 0x63d297, transparent: true, opacity: 0.92 })
      );
      scene.add(ghostRoute);
    }

    function mapPoint(point, width, height){
      const x = ((Number(point.x) || 0) + 7) / 14;
      const z = ((Number(point.z) || 0) + 7) / 14;
      return {
        x: 22 + x * (width - 44),
        y: 18 + z * (height - 36)
      };
    }

    function renderMiniMap(canvas, hole, route){
      if (!canvas) return;
      const targetHole = hole || currentHole || DEFAULT_HOLE;
      const targetRoute = route?.points?.length ? route : currentRoute || createDefaultRoute(targetHole);
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#071715';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#0f241e';
      ctx.fillRect(18, 14, width - 36, height - 28);
      ctx.strokeStyle = '#f3b35a';
      ctx.lineWidth = 4;
      ctx.strokeRect(18, 14, width - 36, height - 28);

      const scaleX = (width - 44) / 14;
      const scaleY = (height - 36) / 14;
      const pieces = Array.isArray(targetHole.pieces) ? targetHole.pieces : [];

      function drawRectPiece(piece, fillStyle, strokeStyle){
        const point = mapPoint(piece, width, height);
        const pieceWidth = Math.max(4, (Number(piece.width) || 1) * scaleX);
        const pieceLength = Math.max(4, (Number(piece.length) || 1) * scaleY);
        ctx.save();
        ctx.translate(point.x, point.y);
        ctx.rotate(THREE.MathUtils.degToRad(Number(piece.angle) || 0));
        ctx.fillStyle = fillStyle;
        ctx.fillRect(-pieceWidth / 2, -pieceLength / 2, pieceWidth, pieceLength);
        if (strokeStyle) {
          ctx.strokeStyle = strokeStyle;
          ctx.lineWidth = 2;
          ctx.strokeRect(-pieceWidth / 2, -pieceLength / 2, pieceWidth, pieceLength);
        }
        ctx.restore();
      }

      if (pieces.length) {
        pieces.forEach((piece) => {
          if (piece.type === 'lane') {
            drawRectPiece(piece, piece.color || '#2f8d52', 'rgba(255, 255, 255, 0.12)');
          } else if (piece.type === 'rail') {
            drawRectPiece(piece, '#f3b35a', 'rgba(0, 0, 0, 0.28)');
          } else if (piece.type === 'bank-wall') {
            drawRectPiece(piece, '#f8fafc', '#f3b35a');
          } else if (piece.type === 'ramp') {
            drawRectPiece(piece, '#8bbf5a', '#d9f99d');
          } else if (piece.type === 'hazard') {
            drawRectPiece(piece, '#020617', '#334155');
          } else if (piece.type === 'bounce-pad') {
            const point = mapPoint(piece, width, height);
            const radius = Math.max(8, (Number(piece.radius) || 1) * Math.min(scaleX, scaleY));
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath();
            ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#e0f2fe';
            ctx.lineWidth = 3;
            ctx.stroke();
          }
        });
      } else {
        ctx.fillStyle = '#123d36';
        ctx.fillRect(18, 14, width - 36, height - 28);
      }

      const routePoints = targetRoute.points || [];
      if (routePoints.length > 1) {
        ctx.strokeStyle = '#63d297';
        ctx.lineWidth = 5;
        ctx.setLineDash([10, 7]);
        ctx.beginPath();
        routePoints.forEach((point, index) => {
          const mapped = mapPoint(point, width, height);
          if (index === 0) ctx.moveTo(mapped.x, mapped.y);
          else ctx.lineTo(mapped.x, mapped.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }

      const tee = mapPoint(targetHole.tee || DEFAULT_HOLE.tee, width, height);
      const hoop = mapPoint(targetHole.hoop || DEFAULT_HOLE.hoop, width, height);
      ctx.fillStyle = '#d97724';
      ctx.beginPath();
      ctx.arc(tee.x, tee.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff7ed';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(hoop.x, hoop.y, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#e15d2f';
      ctx.beginPath();
      ctx.arc(hoop.x, hoop.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    function animate(){
      if (!renderer || !scene || !camera) return;
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    }

    function defaultHoleFromCore(){
      const core = window.RosterBateBasketballGolfCore;
      const course = core?.createDefaultCourse?.();
      return course?.holes?.[0] || DEFAULT_HOLE;
    }

    function mount(target){
      if (!target) return null;
      if (renderer?.domElement) {
        resize();
        return renderer.domElement;
      }

      mountEl = target;
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x050914);
      camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 100);
      camera.position.set(0.4, 4.35, 10.2);
      camera.lookAt(0.2, 1.25, -2.4);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      target.appendChild(renderer.domElement);

      scene.add(new THREE.HemisphereLight(0xdff7ff, 0x1b140b, 1.65));
      const key = new THREE.DirectionalLight(0xffffff, 2.35);
      key.position.set(-4.5, 8.5, 6.5);
      scene.add(key);
      const rim = new THREE.DirectionalLight(0xf3b35a, 1.15);
      rim.position.set(5, 5, -6);
      scene.add(rim);

      ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.34, 40, 22),
        material(0xd97724, { roughness: 0.48 })
      );
      scene.add(ball);

      resize();
      resizeHandler = () => resize();
      window.addEventListener('resize', resizeHandler);

      setHole(defaultHoleFromCore());
      currentRoute = createDefaultRoute(currentHole);
      setGhostRoute(currentRoute);
      renderMiniMap(document.getElementById('golf-mini-map'), currentHole, currentRoute);
      animate();
      return renderer.domElement;
    }

    function renderShot(result){
      if (activeShotPromise) return activeShotPromise;
      if (!ball) return Promise.resolve();

      activeShotPromise = new Promise((resolve) => {
        resolveActiveShot = resolve;
        const start = performance.now();
        const duration = 820;
        const tee = toVector3(currentHole?.tee, DEFAULT_HOLE.tee);
        const hoop = toVector3(currentHole?.hoop, DEFAULT_HOLE.hoop);
        const startPosition = new THREE.Vector3(tee.x, 0.38, tee.z);
        const endPosition = new THREE.Vector3(hoop.x, hoop.y, hoop.z);
        const peak = Math.max(1.1, Number(result?.trajectory?.peak) || 1.4);

        function tick(now){
          const progress = Math.min(1, (now - start) / duration);
          const lift = Math.sin(progress * Math.PI) * peak;
          ball.position.lerpVectors(startPosition, endPosition, progress);
          ball.position.y += lift;
          ball.rotation.x += 0.12;
          ball.rotation.z -= 0.08;
          ball.scale.setScalar(result?.made && progress > 0.92 ? 0.72 : 1);

          if (progress < 1) {
            shotFrameId = window.requestAnimationFrame(tick);
            return;
          }

          setBallAtTee();
          shotFrameId = 0;
          activeShotPromise = null;
          resolveActiveShot = null;
          resolve();
        }

        shotFrameId = window.requestAnimationFrame(tick);
      });

      return activeShotPromise;
    }

    function dispose(){
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      if (shotFrameId) window.cancelAnimationFrame(shotFrameId);
      shotFrameId = 0;
      if (resizeHandler) window.removeEventListener('resize', resizeHandler);
      resizeHandler = null;
      if (resolveActiveShot) resolveActiveShot();
      activeShotPromise = null;
      resolveActiveShot = null;

      clearHoleObjects();
      disposeObject(ball);
      if (ball) scene?.remove(ball);
      ball = null;

      if (renderer?.domElement?.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      renderer?.dispose?.();
      renderer = null;
      scene = null;
      camera = null;
      mountEl = null;
    }

    function debugState(){
      return { coursePieceCount, courtLineCount, hasRim, hasBackboard };
    }

    return { mount, setHole, setGhostRoute, renderMiniMap, renderShot, debugState, dispose };
  }

  window.RosterBateBasketballGolfRenderer = { THREE, createBasketballGolfRenderer };
})();
