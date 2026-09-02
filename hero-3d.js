import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.min.js";

const canvas = document.querySelector("[data-hero-canvas]");
const shell = document.querySelector("[data-3d-scene]");
const motionButton = document.querySelector("[data-scene-toggle]");

if (canvas && shell && motionButton) {
  try {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: window.devicePixelRatio <= 1.75,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
    camera.position.set(0.1, 0.55, 7.2);

    const world = new THREE.Group();
    world.position.set(0.05, -0.05, 0);
    scene.add(world);

    const steel = new THREE.MeshPhysicalMaterial({
      color: 0xcad6cd,
      metalness: 0.92,
      roughness: 0.2,
      clearcoat: 0.72,
      clearcoatRoughness: 0.16
    });
    const darkSteel = new THREE.MeshPhysicalMaterial({
      color: 0x5f6e65,
      metalness: 0.94,
      roughness: 0.27,
      clearcoat: 0.45
    });
    const lime = new THREE.MeshPhysicalMaterial({
      color: 0xc8f36a,
      emissive: 0x263d0c,
      emissiveIntensity: 0.42,
      roughness: 0.35,
      clearcoat: 0.8
    });
    const curry = new THREE.MeshStandardMaterial({
      color: 0xd85b15,
      emissive: 0x421204,
      emissiveIntensity: 0.25,
      roughness: 0.78
    });
    const leaf = new THREE.MeshStandardMaterial({
      color: 0x5f9f35,
      roughness: 0.76
    });
    const cream = new THREE.MeshStandardMaterial({
      color: 0xf4e0a5,
      roughness: 0.9
    });

    function shadow(mesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    }

    const tiffin = new THREE.Group();
    tiffin.rotation.set(0.08, -0.38, -0.035);
    world.add(tiffin);

    const canGeometry = new THREE.CylinderGeometry(1.25, 1.31, 0.58, 64, 1, false);
    const lidGeometry = new THREE.CylinderGeometry(1.31, 1.27, 0.095, 64);
    const rimGeometry = new THREE.TorusGeometry(1.29, 0.046, 12, 72);
    const accentGeometry = new THREE.TorusGeometry(1.315, 0.025, 10, 72);

    [-0.68, -0.04, 0.6].forEach((y, index) => {
      const body = shadow(new THREE.Mesh(canGeometry, index === 1 ? steel : darkSteel));
      body.position.y = y;
      tiffin.add(body);

      const lid = shadow(new THREE.Mesh(lidGeometry, steel));
      lid.position.y = y + 0.335;
      tiffin.add(lid);

      const rim = shadow(new THREE.Mesh(rimGeometry, steel));
      rim.position.y = y + 0.31;
      rim.rotation.x = Math.PI / 2;
      tiffin.add(rim);

      const accent = new THREE.Mesh(accentGeometry, lime);
      accent.position.y = y - 0.19;
      accent.rotation.x = Math.PI / 2;
      accent.scale.setScalar(index === 1 ? 1 : 0.985);
      tiffin.add(accent);
    });

    const base = shadow(new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.36, 0.16, 64), darkSteel));
    base.position.y = -1.04;
    tiffin.add(base);

    const bowl = shadow(new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.29, 0.42, 64), steel));
    bowl.position.y = 1.09;
    tiffin.add(bowl);

    const bowlRim = shadow(new THREE.Mesh(new THREE.TorusGeometry(1.22, 0.065, 14, 72), steel));
    bowlRim.position.y = 1.31;
    bowlRim.rotation.x = Math.PI / 2;
    tiffin.add(bowlRim);

    const food = new THREE.Mesh(new THREE.CylinderGeometry(1.13, 1.13, 0.055, 64), curry);
    food.position.y = 1.31;
    tiffin.add(food);

    const rice = new THREE.Group();
    for (let i = 0; i < 24; i += 1) {
      const grain = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), cream);
      const angle = i * 2.399;
      const radius = 0.09 + 0.032 * i;
      grain.position.set(Math.cos(angle) * radius, 1.37 + (i % 3) * 0.012, Math.sin(angle) * radius);
      grain.scale.set(1.6, 0.55, 0.7);
      grain.rotation.y = angle;
      rice.add(grain);
    }
    tiffin.add(rice);

    for (let i = 0; i < 9; i += 1) {
      const garnish = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), leaf);
      const angle = (i / 9) * Math.PI * 2;
      garnish.position.set(Math.cos(angle) * (0.34 + (i % 2) * 0.22), 1.41, Math.sin(angle) * (0.34 + (i % 2) * 0.22));
      garnish.scale.set(1.45, 0.35, 0.72);
      garnish.rotation.y = angle;
      tiffin.add(garnish);
    }

    const lid = new THREE.Group();
    const lidPlate = shadow(new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.34, 0.12, 64), steel));
    lid.add(lidPlate);
    const lidRing = shadow(new THREE.Mesh(new THREE.TorusGeometry(1.29, 0.05, 12, 72), darkSteel));
    lidRing.rotation.x = Math.PI / 2;
    lid.add(lidRing);
    const lidHandle = shadow(new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.045, 10, 36, Math.PI), darkSteel));
    lidHandle.position.y = 0.08;
    lidHandle.rotation.x = -Math.PI / 2;
    lid.add(lidHandle);
    lid.position.set(1.55, 1.42, -0.38);
    lid.rotation.set(0.65, 0.18, -0.58);
    tiffin.add(lid);

    [-1, 1].forEach((side) => {
      const rail = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.075, 2.28, 0.11), darkSteel));
      rail.position.set(side * 1.36, 0.03, 0);
      rail.rotation.z = side * -0.035;
      tiffin.add(rail);
      [-0.78, 0.56].forEach((y) => {
        const clasp = shadow(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.13, 0.2), lime));
        clasp.position.set(side * 1.34, y, 0);
        tiffin.add(clasp);
      });
    });

    const handleCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.36, 1.04, 0),
      new THREE.Vector3(-1.16, 2.2, 0),
      new THREE.Vector3(0, 2.55, 0),
      new THREE.Vector3(1.16, 2.2, 0),
      new THREE.Vector3(1.36, 1.04, 0)
    ]);
    const handle = shadow(new THREE.Mesh(new THREE.TubeGeometry(handleCurve, 80, 0.055, 12, false), darkSteel));
    tiffin.add(handle);

    const steamMaterials = [];
    [-0.4, 0, 0.42].forEach((x, index) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(x, 1.43, -0.05),
        new THREE.Vector3(x + 0.13, 1.8, 0.02),
        new THREE.Vector3(x - 0.1, 2.15, 0.06),
        new THREE.Vector3(x + 0.08, 2.5, 0.02)
      ]);
      const material = new THREE.MeshBasicMaterial({ color: 0xe8ffcf, transparent: true, opacity: 0.18 - index * 0.025 });
      steamMaterials.push(material);
      const steam = new THREE.Mesh(new THREE.TubeGeometry(curve, 36, 0.012, 8, false), material);
      tiffin.add(steam);
    });

    const floaters = new THREE.Group();
    const floatingPieces = [];
    const floaterColors = [lime, curry, leaf, cream];
    for (let i = 0; i < 18; i += 1) {
      const geometry = i % 3 === 0
        ? new THREE.OctahedronGeometry(0.075 + (i % 4) * 0.012, 0)
        : new THREE.SphereGeometry(0.045 + (i % 3) * 0.012, 12, 10);
      const piece = new THREE.Mesh(geometry, floaterColors[i % floaterColors.length]);
      const angle = (i / 18) * Math.PI * 2;
      const radius = 2.15 + (i % 4) * 0.18;
      piece.position.set(Math.cos(angle) * radius, -0.5 + (i % 7) * 0.46, Math.sin(angle) * 0.8 - 0.6);
      piece.userData = { base: piece.position.clone(), phase: i * 0.73, speed: 0.55 + (i % 5) * 0.07 };
      floatingPieces.push(piece);
      floaters.add(piece);
    }
    world.add(floaters);

    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(2.38, 0.012, 8, 128),
      new THREE.MeshBasicMaterial({ color: 0xc8f36a, transparent: true, opacity: 0.18 })
    );
    halo.rotation.set(Math.PI / 2.25, 0.18, 0.08);
    halo.position.y = 0.32;
    world.add(halo);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(2.25, 64),
      new THREE.ShadowMaterial({ color: 0x000000, opacity: 0.42 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.14;
    floor.receiveShadow = true;
    world.add(floor);

    scene.add(new THREE.HemisphereLight(0xdfffb3, 0x09150d, 2.4));
    const keyLight = new THREE.DirectionalLight(0xfff2d4, 4.2);
    keyLight.position.set(-3.8, 5.6, 5.2);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.1;
    keyLight.shadow.camera.far = 16;
    scene.add(keyLight);

    const limeLight = new THREE.PointLight(0xc8f36a, 26, 8, 2);
    limeLight.position.set(3.1, 0.3, 2.4);
    scene.add(limeLight);
    const warmLight = new THREE.PointLight(0xff6b18, 17, 7, 2);
    warmLight.position.set(-2.6, -0.4, 2.1);
    scene.add(warmLight);

    const pointer = { x: 0, y: 0 };
    let dragging = false;
    let pointerStartX = 0;
    let dragStartRotation = 0;
    let manualRotation = 0;
    let paused = false;
    let visible = true;
    let frame = null;
    let settleFrames = 0;
    let previousTime = performance.now();
    let autoRotation = 0;
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionPreference.matches;

    function updateMotionControl() {
      const stopped = paused || reducedMotion;
      shell.classList.toggle("is-reduced-motion", reducedMotion);
      motionButton.setAttribute("aria-pressed", String(stopped));
      motionButton.disabled = reducedMotion;
      motionButton.setAttribute("aria-label", reducedMotion
        ? "3D motion paused by device setting"
        : paused ? "Play 3D scene" : "Pause 3D scene");
    }

    function resize() {
      const width = Math.max(1, shell.clientWidth);
      const height = Math.max(1, shell.clientHeight);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      camera.position.z = width < 520 ? 8.35 : width < 720 ? 7.8 : 7.2;
      settleFrames = 2;
      requestFrame();
    }

    function render(time) {
      frame = null;
      if (!visible || document.hidden) return;
      const delta = Math.min(0.04, Math.max(0, (time - previousTime) / 1000));
      previousTime = time;
      const moving = !paused && !reducedMotion;

      if (moving) autoRotation += delta * 0.2;
      const hoverY = reducedMotion ? 0 : pointer.x * 0.27;
      const hoverX = reducedMotion ? 0.08 : 0.08 + pointer.y * 0.12;
      const desiredY = -0.38 + autoRotation + manualRotation + hoverY;
      tiffin.rotation.y += (desiredY - tiffin.rotation.y) * (dragging ? 0.18 : 0.055);
      tiffin.rotation.x += (hoverX - tiffin.rotation.x) * 0.06;
      tiffin.position.y = moving ? Math.sin(time * 0.0009) * 0.07 : 0;
      lid.rotation.y = moving ? Math.sin(time * 0.0007) * 0.1 : 0.18;
      halo.rotation.z = moving ? time * 0.00008 : 0.08;

      floatingPieces.forEach((piece) => {
        const { base, phase, speed } = piece.userData;
        if (moving) {
          piece.position.y = base.y + Math.sin(time * 0.001 * speed + phase) * 0.13;
          piece.rotation.x += delta * (0.25 + speed * 0.3);
          piece.rotation.y += delta * (0.2 + speed * 0.24);
        }
      });
      steamMaterials.forEach((material, index) => {
        material.opacity = moving ? 0.1 + Math.sin(time * 0.0015 + index) * 0.045 : 0.13;
      });

      world.rotation.z = reducedMotion ? 0 : pointer.x * -0.012;
      renderer.render(scene, camera);
      if (settleFrames > 0) settleFrames -= 1;
      if (moving || dragging || settleFrames > 0) frame = requestAnimationFrame(render);
    }

    function requestFrame() {
      if (frame === null && visible && !document.hidden) {
        previousTime = performance.now();
        frame = requestAnimationFrame(render);
      }
    }

    function updatePointer(event) {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
      if (dragging) manualRotation = dragStartRotation + (event.clientX - pointerStartX) * 0.008;
      settleFrames = 34;
      requestFrame();
    }

    canvas.addEventListener("pointerdown", (event) => {
      dragging = true;
      pointerStartX = event.clientX;
      dragStartRotation = manualRotation;
      canvas.classList.add("is-grabbing");
      canvas.setPointerCapture?.(event.pointerId);
      updatePointer(event);
    });
    canvas.addEventListener("pointermove", updatePointer, { passive: true });
    canvas.addEventListener("pointerup", (event) => {
      dragging = false;
      canvas.classList.remove("is-grabbing");
      canvas.releasePointerCapture?.(event.pointerId);
      settleFrames = 22;
      requestFrame();
    });
    canvas.addEventListener("pointercancel", () => {
      dragging = false;
      canvas.classList.remove("is-grabbing");
    });
    canvas.addEventListener("pointerleave", () => {
      if (!dragging) {
        pointer.x = 0;
        pointer.y = 0;
        settleFrames = 30;
        requestFrame();
      }
    });

    motionButton.addEventListener("click", () => {
      paused = !paused;
      updateMotionControl();
      settleFrames = 2;
      requestFrame();
    });
    motionPreference.addEventListener("change", (event) => {
      reducedMotion = event.matches;
      pointer.x = 0;
      pointer.y = 0;
      updateMotionControl();
      settleFrames = 2;
      requestFrame();
    });
    document.addEventListener("visibilitychange", requestFrame);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(shell);
    const visibilityObserver = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
      if (visible) requestFrame();
      else if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
    }, { rootMargin: "120px" });
    visibilityObserver.observe(shell);

    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      shell.classList.remove("is-webgl-ready");
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
    });

    updateMotionControl();
    resize();
    renderer.render(scene, camera);
    shell.classList.add("is-webgl-ready");
    requestFrame();
  } catch (_error) {
    shell.classList.add("is-webgl-fallback");
  }
}
