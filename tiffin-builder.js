import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.185.1/build/three.module.min.js";

const form = document.querySelector("#tiffin-builder-form");
const shell = document.querySelector("[data-builder-shell]");
const stage = document.querySelector("[data-builder-stage]");
const canvas = document.querySelector("[data-builder-canvas]");
const motionButton = document.querySelector("[data-builder-motion]");

const ingredients = Object.freeze({
  base: Object.freeze({
    "jeera-rice": { name: "Jeera rice", pricePaisa: 3500, calories: 260, protein: 5, color: "#e9c87e" },
    "three-rotis": { name: "Three rotis", pricePaisa: 3000, calories: 270, protein: 8, color: "#c8843d" },
    "brown-rice": { name: "Brown rice", pricePaisa: 4500, calories: 230, protein: 5, color: "#9d7046" }
  }),
  dal: Object.freeze({
    "dal-tadka": { name: "Dal tadka", pricePaisa: 3500, calories: 190, protein: 10, color: "#d9941c" },
    rajma: { name: "Rajma", pricePaisa: 4500, calories: 230, protein: 12, color: "#8e2f21" },
    chole: { name: "Chole", pricePaisa: 4500, calories: 250, protein: 13, color: "#be8a42" }
  }),
  sabzi: Object.freeze({
    "seasonal-sabzi": { name: "Seasonal sabzi", pricePaisa: 4000, calories: 170, protein: 5, color: "#648e38" },
    "paneer-masala": { name: "Paneer masala", pricePaisa: 6500, calories: 310, protein: 17, color: "#d65421" },
    "soy-keema": { name: "Soy keema", pricePaisa: 5500, calories: 220, protein: 19, color: "#875231" }
  }),
  side: Object.freeze({
    salad: { name: "Fresh salad", pricePaisa: 2000, calories: 70, protein: 2, color: "#75a843" },
    curd: { name: "Homemade curd", pricePaisa: 2500, calories: 90, protein: 5, color: "#f4efe1" },
    pickle: { name: "House pickle", pricePaisa: 1000, calories: 35, protein: 0, color: "#d66b17" }
  })
});

const presets = Object.freeze({
  comfort: { base: "three-rotis", dal: "dal-tadka", sabzi: "paneer-masala", side: "curd", spice: "2", title: "Comfort tiffin" },
  light: { base: "brown-rice", dal: "dal-tadka", sabzi: "seasonal-sabzi", side: "salad", spice: "1", title: "Light & balanced" },
  protein: { base: "three-rotis", dal: "rajma", sabzi: "soy-keema", side: "curd", spice: "2", title: "Protein power" }
});

const categoryFields = Object.freeze({ base: "customBase", dal: "customDal", sabzi: "customSabzi", side: "customSide" });
const spiceNames = Object.freeze({ "1": "Mild", "2": "Classic", "3": "Fiery" });
let visual = null;

function currency(paisa) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(paisa / 100);
}

function selectedValue(fieldName) {
  return new FormData(form).get(fieldName);
}

function selection() {
  const values = {
    base: selectedValue("customBase"),
    dal: selectedValue("customDal"),
    sabzi: selectedValue("customSabzi"),
    side: selectedValue("customSide"),
    spiceValue: selectedValue("customSpice")
  };
  const picked = [ingredients.base[values.base], ingredients.dal[values.dal], ingredients.sabzi[values.sabzi], ingredients.side[values.side]];
  return {
    ...values,
    spice: spiceNames[values.spiceValue].toLowerCase(),
    spiceLabel: spiceNames[values.spiceValue],
    pricePaisa: picked.reduce((total, item) => total + item.pricePaisa, 0),
    calories: picked.reduce((total, item) => total + item.calories, 0),
    protein: picked.reduce((total, item) => total + item.protein, 0),
    names: picked.map((item) => item.name),
    colors: {
      base: ingredients.base[values.base].color,
      dal: ingredients.dal[values.dal].color,
      sabzi: ingredients.sabzi[values.sabzi].color,
      side: ingredients.side[values.side].color
    }
  };
}

function matchingPreset(data) {
  return Object.entries(presets).find(([, preset]) => preset.base === data.base && preset.dal === data.dal && preset.sabzi === data.sabzi && preset.side === data.side && preset.spice === data.spiceValue)?.[0] || "";
}

function renderBuilder(changedCategory) {
  const data = selection();
  const activePreset = matchingPreset(data);
  document.querySelectorAll("[data-builder-preset]").forEach((button) => {
    const active = button.dataset.builderPreset === activePreset;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelector("[data-builder-stage-title]").textContent = activePreset ? presets[activePreset].title : "Your custom mix";
  document.querySelector("[data-builder-total]").textContent = currency(data.pricePaisa);
  document.querySelector("[data-builder-calories]").textContent = `${data.calories} kcal`;
  document.querySelector("[data-builder-protein]").textContent = `${data.protein}g`;
  document.querySelector("[data-builder-spice-label]").textContent = data.spiceLabel;
  document.querySelector("[data-builder-summary]").textContent = `${data.names.join(", ")} · ${data.spiceLabel} spice`;
  Object.entries(data.colors).forEach(([category, color]) => {
    document.querySelector(`[data-builder-fallback="${category}"]`)?.style.setProperty("--food-color", color);
  });
  visual?.update(data, changedCategory);
  return data;
}

function applyPreset(name) {
  const preset = presets[name];
  if (!preset) return;
  Object.entries(categoryFields).forEach(([category, fieldName]) => {
    const input = form.querySelector(`input[name="${fieldName}"][value="${preset[category]}"]`);
    if (input) input.checked = true;
  });
  form.elements.customSpice.value = preset.spice;
  renderBuilder();
}

function cycleCategory(category) {
  const fieldName = categoryFields[category];
  const choices = Array.from(form.querySelectorAll(`input[name="${fieldName}"]`));
  const current = choices.findIndex((input) => input.checked);
  choices[(current + 1) % choices.length].checked = true;
  renderBuilder(category);
}

function createBuilderScene() {
  if (!canvas || !stage || !motionButton) return null;
  try {
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: window.devicePixelRatio <= 1.75, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40);
    camera.position.set(0, 5.8, 7.3);
    camera.lookAt(0, 0, 0);

    const world = new THREE.Group();
    world.rotation.y = -0.28;
    scene.add(world);

    const steel = new THREE.MeshPhysicalMaterial({ color: 0xd3ddd5, metalness: 0.92, roughness: 0.2, clearcoat: 0.65, clearcoatRoughness: 0.18 });
    const darkSteel = new THREE.MeshPhysicalMaterial({ color: 0x69776e, metalness: 0.95, roughness: 0.28 });
    const tray = new THREE.Mesh(new THREE.CylinderGeometry(2.72, 2.82, 0.3, 64), steel);
    tray.position.y = -0.28;
    tray.receiveShadow = true;
    world.add(tray);
    const trayRim = new THREE.Mesh(new THREE.TorusGeometry(2.68, 0.09, 14, 72), darkSteel);
    trayRim.rotation.x = Math.PI / 2;
    trayRim.position.y = -0.05;
    world.add(trayRim);

    const compartmentPositions = {
      base: [-1.2, -0.88, 1.08],
      dal: [1.14, -0.86, 1.02],
      sabzi: [-1.16, -0.82, -1.02],
      side: [1.18, -0.8, -1.04]
    };
    const foodMeshes = {};
    const rayTargets = [];
    const pulses = { base: 0, dal: 0, sabzi: 0, side: 0 };

    Object.entries(compartmentPositions).forEach(([category, position]) => {
      const group = new THREE.Group();
      group.position.set(...position);
      world.add(group);
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.78, 0.36, 48), steel);
      bowl.position.y = 0.05;
      bowl.castShadow = true;
      bowl.receiveShadow = true;
      bowl.userData.category = category;
      group.add(bowl);
      rayTargets.push(bowl);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.055, 10, 48), darkSteel);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 0.25;
      group.add(rim);
      const material = new THREE.MeshStandardMaterial({ color: 0xd9941c, roughness: 0.76, emissive: 0x1b0802, emissiveIntensity: 0.12 });
      const food = new THREE.Mesh(new THREE.CylinderGeometry(0.77, 0.8, 0.16, 42), material);
      food.position.y = 0.27;
      food.castShadow = true;
      food.userData.category = category;
      group.add(food);
      rayTargets.push(food);
      foodMeshes[category] = { group, food, material };

      const garnishMaterial = new THREE.MeshStandardMaterial({ color: category === "side" ? 0x86b84d : 0xf4d37b, roughness: 0.85 });
      for (let index = 0; index < 8; index += 1) {
        const garnish = new THREE.Mesh(
          category === "sabzi"
            ? new THREE.BoxGeometry(0.16 + (index % 2) * 0.05, 0.12, 0.14)
            : new THREE.SphereGeometry(0.07 + (index % 3) * 0.012, 10, 8),
          garnishMaterial
        );
        const angle = index * 2.399;
        const radius = 0.18 + (index % 4) * 0.11;
        garnish.position.set(Math.cos(angle) * radius, 0.39 + (index % 2) * 0.025, Math.sin(angle) * radius);
        garnish.scale.y = category === "base" ? 0.42 : 0.8;
        garnish.rotation.y = angle;
        garnish.userData.category = category;
        group.add(garnish);
        rayTargets.push(garnish);
      }
    });

    const handleMaterial = new THREE.MeshPhysicalMaterial({ color: 0xc8f36a, emissive: 0x1b3008, emissiveIntensity: 0.26, roughness: 0.35, metalness: 0.18 });
    const handle = new THREE.Mesh(new THREE.TorusGeometry(2.18, 0.055, 10, 56, Math.PI), handleMaterial);
    handle.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    handle.position.set(0, 1.14, -2.24);
    world.add(handle);

    scene.add(new THREE.HemisphereLight(0xf7ffe7, 0x132018, 2.25));
    const key = new THREE.DirectionalLight(0xffd5a8, 4.2);
    key.position.set(4.5, 7, 4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const rimLight = new THREE.PointLight(0xc8f36a, 4.4, 15);
    rimLight.position.set(-4, 2.5, -3);
    scene.add(rimLight);
    const warm = new THREE.PointLight(0xff7a1a, 3.2, 13);
    warm.position.set(4, 1.5, 3);
    scene.add(warm);

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(3.3, 64), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.48;
    scene.add(shadow);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = motionPreference.matches;
    let motionOverride = false;
    let paused = false;
    let visible = true;
    let dragging = false;
    let pointerStart = null;
    let previousX = 0;
    let frame = null;
    let previousTime = performance.now();

    function movementPaused() {
      return paused || (reducedMotion && !motionOverride);
    }

    function updateMotionButton() {
      const stopped = movementPaused();
      motionButton.setAttribute("aria-pressed", String(stopped));
      motionButton.setAttribute("aria-label", stopped ? "Play 3D tiffin" : "Pause 3D tiffin");
      stage.classList.toggle("is-builder-paused", stopped);
    }

    function resize() {
      const rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      requestFrame();
    }

    function render(time) {
      frame = null;
      if (!visible || document.hidden) return;
      const delta = Math.min(0.04, Math.max(0, (time - previousTime) / 1000));
      previousTime = time;
      const moving = !movementPaused();
      if (moving && !dragging) world.rotation.y += delta * 0.13;
      Object.entries(pulses).forEach(([category, amount]) => {
        const next = Math.max(0, amount - delta * 2.7);
        pulses[category] = next;
        const scale = 1 + Math.sin((1 - next) * Math.PI) * next * 0.12;
        foodMeshes[category].group.scale.setScalar(scale);
      });
      renderer.render(scene, camera);
      if (moving || dragging || Object.values(pulses).some((amount) => amount > 0)) frame = requestAnimationFrame(render);
    }

    function requestFrame() {
      if (frame === null && visible && !document.hidden) {
        previousTime = performance.now();
        frame = requestAnimationFrame(render);
      }
    }

    function hitCategory(event) {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(rayTargets, false)[0]?.object?.userData?.category || "";
    }

    canvas.addEventListener("pointerdown", (event) => {
      dragging = true;
      pointerStart = { x: event.clientX, y: event.clientY };
      previousX = event.clientX;
      canvas.setPointerCapture(event.pointerId);
      canvas.classList.add("is-dragging");
      requestFrame();
    });
    canvas.addEventListener("pointermove", (event) => {
      if (dragging) {
        world.rotation.y += (event.clientX - previousX) * 0.009;
        previousX = event.clientX;
        requestFrame();
        return;
      }
      canvas.style.cursor = hitCategory(event) ? "pointer" : "grab";
    });
    canvas.addEventListener("pointerup", (event) => {
      const travel = pointerStart ? Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) : 99;
      dragging = false;
      canvas.classList.remove("is-dragging");
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      if (travel < 7) {
        const category = hitCategory(event);
        if (category) cycleCategory(category);
      }
      pointerStart = null;
      requestFrame();
    });
    canvas.addEventListener("pointercancel", () => {
      dragging = false;
      pointerStart = null;
      canvas.classList.remove("is-dragging");
    });

    motionButton.addEventListener("click", () => {
      if (reducedMotion && !motionOverride) {
        motionOverride = true;
        paused = false;
      } else {
        paused = !paused;
      }
      updateMotionButton();
      requestFrame();
    });
    motionPreference.addEventListener("change", (event) => {
      reducedMotion = event.matches;
      motionOverride = false;
      paused = false;
      updateMotionButton();
      requestFrame();
    });
    document.addEventListener("visibilitychange", requestFrame);

    new ResizeObserver(resize).observe(stage);
    new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
      if (visible) requestFrame();
      else if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
    }, { rootMargin: "160px" }).observe(stage);

    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      stage.classList.remove("is-builder-ready");
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
    });

    updateMotionButton();
    resize();
    stage.classList.add("is-builder-ready");
    requestFrame();

    return {
      update(data, changedCategory) {
        Object.entries(data.colors).forEach(([category, color]) => foodMeshes[category].material.color.set(color));
        if (changedCategory && pulses[changedCategory] !== undefined) pulses[changedCategory] = 1;
        requestFrame();
      }
    };
  } catch (_error) {
    stage.classList.add("is-builder-fallback");
    return null;
  }
}

if (form && shell) {
  visual = createBuilderScene();
  form.addEventListener("change", (event) => {
    const category = Object.entries(categoryFields).find(([, fieldName]) => fieldName === event.target.name)?.[0];
    renderBuilder(category);
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = renderBuilder();
    window.dispatchEvent(new CustomEvent("foodog:builder-order", {
      detail: {
        customBase: data.base,
        customDal: data.dal,
        customSabzi: data.sabzi,
        customSide: data.side,
        customSpice: data.spice
      }
    }));
  });
  document.querySelectorAll("[data-builder-preset]").forEach((button) => {
    button.addEventListener("click", () => applyPreset(button.dataset.builderPreset));
  });
  document.querySelectorAll("[data-builder-hotspot]").forEach((button) => {
    button.addEventListener("click", () => cycleCategory(button.dataset.builderHotspot));
  });
  renderBuilder();
}
