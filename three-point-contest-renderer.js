import * as THREE from './assets/vendor/three/three.module.js';

function createContestRenderer(options = {}) {
  let renderer;
  let scene;
  let camera;
  let ballMesh;
  let rafId = 0;
  let shotRafId = 0;
  let shotPromise = null;
  let resolveShot = null;
  let mounted = false;
  let mountedContainer = null;
  let resizeHandler;

  function resize(container) {
    if (!renderer || !camera || !container) return;
    const width = Math.max(1, container.clientWidth || window.innerWidth);
    const height = Math.max(1, container.clientHeight || window.innerHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function addCourt() {
    const court = new THREE.Mesh(
      new THREE.PlaneGeometry(28, 22),
      new THREE.MeshStandardMaterial({ color: 0xd9a95f, roughness: 0.62, metalness: 0.05 })
    );
    court.rotation.x = -Math.PI / 2;
    court.position.z = -3;
    scene.add(court);

    const lane = new THREE.Mesh(
      new THREE.PlaneGeometry(5.2, 7.5),
      new THREE.MeshStandardMaterial({ color: 0x123c72, roughness: 0.7 })
    );
    lane.rotation.x = -Math.PI / 2;
    lane.position.set(0, 0.01, -9.5);
    scene.add(lane);
  }

  function addHoop() {
    const backboard = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 2.1, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xf8fbff, roughness: 0.35 })
    );
    backboard.position.set(0, 3.5, -10.4);
    scene.add(backboard);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.045, 12, 48),
      new THREE.MeshStandardMaterial({ color: 0xff7a2d, roughness: 0.25, metalness: 0.2 })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, 2.75, -9.8);
    scene.add(rim);
  }

  function addRack() {
    const rack = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.8, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x173b65, roughness: 0.5 })
    );
    rack.position.set(-4.5, 0.45, -2.3);
    scene.add(rack);

    for (let index = 0; index < 5; index++) {
      const rackBall = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 24, 16),
        new THREE.MeshStandardMaterial({ color: index === 4 ? 0xf8fafc : 0xd98535, roughness: 0.5 })
      );
      rackBall.position.set(-5.05 + index * 0.28, 1.05, -2.35);
      scene.add(rackBall);
    }
  }

  function addLiveBall() {
    ballMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 32, 18),
      new THREE.MeshStandardMaterial({ color: 0xd98535, roughness: 0.48 })
    );
    ballMesh.position.set(0, 1.25, 1.2);
    scene.add(ballMesh);
  }

  function animate() {
    if (!mounted) return;
    renderer.render(scene, camera);
    rafId = window.requestAnimationFrame(animate);
  }

  function mount(container) {
    if (mounted && renderer) {
      resize(mountedContainer || container);
      return renderer.domElement;
    }

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050914);
    camera = new THREE.PerspectiveCamera(55, 16 / 9, 0.1, 100);
    camera.position.set(0, 2.2, 4.9);
    camera.lookAt(0, 2.55, -9.8);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xdff7ff, 0x19110a, 1.7));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(4, 8, 5);
    scene.add(key);

    addCourt();
    addHoop();
    addRack();
    addLiveBall();

    mounted = true;
    mountedContainer = container;
    resize(container);
    resizeHandler = () => resize(container);
    window.addEventListener('resize', resizeHandler);
    animate();
    return renderer.domElement;
  }

  function setBallProgress(progress, made) {
    if (!ballMesh) return;
    const t = Math.max(0, Math.min(1, progress));
    ballMesh.position.x = 0;
    ballMesh.position.y = 1.25 + Math.sin(t * Math.PI) * 2.2 + t * 0.9;
    ballMesh.position.z = 1.2 + (-10.8 * t);
    ballMesh.scale.setScalar(made && t > 0.92 ? 0.7 : 1);
  }

  function renderShot(result) {
    if (shotPromise) return shotPromise;
    if (!mounted) return Promise.resolve();

    shotPromise = new Promise((resolve) => {
      resolveShot = resolve;
      const start = performance.now();
      const duration = 900;

      function tick(now) {
        const progress = Math.min(1, (now - start) / duration);
        setBallProgress(progress, !!result.made);
        if (progress < 1) {
          shotRafId = window.requestAnimationFrame(tick);
        } else {
          shotRafId = 0;
          setBallProgress(0, false);
          shotPromise = null;
          resolveShot = null;
          resolve();
        }
      }

      shotRafId = window.requestAnimationFrame(tick);
    });

    return shotPromise;
  }

  function dispose() {
    mounted = false;
    if (rafId) window.cancelAnimationFrame(rafId);
    rafId = 0;
    if (shotRafId) window.cancelAnimationFrame(shotRafId);
    shotRafId = 0;
    if (resolveShot) resolveShot();
    shotPromise = null;
    resolveShot = null;
    if (resizeHandler) window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
    mountedContainer = null;
    if (renderer) {
      const canvas = renderer.domElement;
      if (canvas?.parentNode) canvas.parentNode.removeChild(canvas);
      renderer.dispose();
    }
    renderer = null;
    scene = null;
    camera = null;
    ballMesh = null;
  }

  return { mount, renderShot, dispose };
}

window.RosterBateThreePointRenderer = { THREE, createContestRenderer };
