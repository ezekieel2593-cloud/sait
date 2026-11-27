/**
 * Стартовый портал: два живых 3D-окна на Three.js.
 *
 * Левое — «Астрология»: перламутровая Луна в золотых орбитальных кольцах,
 * знаки зодиака по орбите, звёздный туман в глубоком космосе.
 * Правое — «Матрица судьбы»: ледяная октаграмма-кристалл, внутри которой
 * вращаются светящиеся цифры Арканов; северное сияние и ледники на фоне.
 *
 * Реакция: движение мыши — параллакс камеры; наведение — приближение камеры,
 * ускорение орбит, подсветка кнопки; клик — плавный 3D-перелёт внутрь портала
 * и переход в рабочий раздел. На телефоне — тач-параллакс и пауза вне экрана.
 *
 * Сборка: отдельный бандл portals.js — грузится только на главной,
 * на скорость остальных страниц не влияет. Без WebGL остаётся красивый
 * статичный постер (CSS-градиент класса .portal-card--flat).
 */
import * as THREE from "three";

type HotState = { hot: boolean };

const ZODIAC = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];
const ARCANUM = Array.from({ length: 22 }, (_, index) => String(index + 1));

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Радиальная мягкая «туманность» на canvas — без внешних файлов. */
function glowTexture(inner: string, outer: string): THREE.Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(0.45, `${inner}55`);
  gradient.addColorStop(1, outer);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function dissolveTexture(): THREE.Texture {
  return glowTexture("#ffe9b8", "rgba(255,233,184,0)");
}

/** Текст с свечением (знак зодиака, цифра аркана) на canvas. */
function glyphTexture(glyph: string, color: string, glow: string): THREE.Texture {
  const size = 160;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.font = "600 92px 'Cormorant Garamond', Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = glow;
  ctx.shadowBlur = 26;
  ctx.fillStyle = color;
  ctx.fillText(glyph, size / 2, size / 2 + 4);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function spriteFrom(texture: THREE.Texture, scale: number, opacity = 1): THREE.Sprite {
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.setScalar(scale);
  return sprite;
}

/** Октаграмма (два наложенных квадрата) как Extrude-фигура. */
function octagramShape(radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const points: [number, number][] = [];
  for (let star = 0; star < 2; star += 1) {
    const offset = star * Math.PI / 4;
    for (let corner = 0; corner < 4; corner += 1) {
      const angle = offset + (corner * Math.PI) / 2;
      points.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
    }
  }
  // Порядок обхода: чередуем вершины двух квадратов, чтобы контур был звездой.
  const ordered: [number, number][] = [];
  for (let corner = 0; corner < 4; corner += 1) {
    const a = points[corner * 2]; // квадрат 1
    const b = points[4 + corner]; // квадрат 2
    ordered.push(a, b);
  }
  ordered.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  return shape;
}

/* ------------------------- Портал «Астрология» --------------------------- */

function buildAstroScene(scene: THREE.Scene): { tick: (dt: number, hot: number) => void } {
  const ringGroup = new THREE.Group();
  const moonGroup = new THREE.Group();

  // Луна: перламутровая сфера с мягким свечением.
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(1.5, 56, 40),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color("#efe6d8"),
      roughness: 0.5,
      metalness: 0.18,
      emissive: new THREE.Color("#2a2547"),
      emissiveIntensity: 0.55,
    }),
  );
  moonGroup.add(moon);
  scene.add(moonGroup);

  // Свет: тёплое «шампань» солнце + глубокий синий фон.
  const key = new THREE.DirectionalLight(new THREE.Color("#f6e6bd"), 2.2);
  key.position.set(4, 3, 5);
  scene.add(key, new THREE.AmbientLight(new THREE.Color("#4a5488"), 1.15));

  // Золотые орбитальные кольца.
  const ringMaterials: THREE.MeshBasicMaterial[] = [];
  const radii = [2.35, 2.95, 3.55];
  radii.forEach((radius, index) => {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(index === 1 ? "#ecd094" : "#c9a45a"),
      transparent: true,
      opacity: 0.62 - index * 0.14,
      depthWrite: false,
    });
    ringMaterials.push(material);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.014, 8, 140), material);
    ring.rotation.x = Math.PI / 2 + (index - 1) * 0.16;
    ring.rotation.y = (index - 1) * 0.1;
    ringGroup.add(ring);
  });

  // Знаки зодиака по внешней орбите.
  const zodiacGroup = new THREE.Group();
  ZODIAC.forEach((glyph, index) => {
    const angle = (index / ZODIAC.length) * Math.PI * 2;
    const sprite = spriteFrom(glyphTexture(glyph, "#f2dd9e", "#b98f2e"), 0.52, 0.95);
    sprite.position.set(Math.cos(angle) * 3.55, Math.sin(angle) * 0.12, Math.sin(angle) * 3.55);
    zodiacGroup.add(sprite);
  });
  zodiacGroup.rotation.x = Math.PI / 2;
  ringGroup.add(zodiacGroup);
  scene.add(ringGroup);

  // Звёздный туман: две россыпи точек и мягкие переливы.
  const starFields: THREE.Points[] = [];
  const makeStars = (count: number, color: string, size: number, radius: [number, number]) => {
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const r = radius[0] + Math.random() * (radius[1] - radius[0]);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[index * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[index * 3 + 1] = r * Math.cos(phi) * 0.6;
      positions[index * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: new THREE.Color(color),
        size,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
    starFields.push(points);
    scene.add(points);
  };
  makeStars(1300, "#ffffff", 0.035, [6, 15]);
  makeStars(260, "#f2dd9e", 0.05, [5, 12]);

  const nebulaA = spriteFrom(glowTexture("#e9c87c", "rgba(30,26,64,0)"), 11, 0.4);
  nebulaA.position.set(-4, 2.4, -7);
  const nebulaB = spriteFrom(glowTexture("#7f7fd1", "rgba(16,14,40,0)"), 13, 0.33);
  nebulaB.position.set(4.5, -2, -8);
  scene.add(nebulaA, nebulaB);

  return {
    tick(dt, hot) {
      moonGroup.rotation.y += dt * 0.14;
      ringGroup.rotation.z += dt * (0.1 + hot * 0.5);
      zodiacGroup.rotation.z -= dt * (0.06 + hot * 0.3);
      starFields.forEach((field, index) => {
        field.rotation.y += dt * 0.012 * (index + 1) * (1 + hot);
      });
      nebulaA.material.rotation += dt * 0.02;
      nebulaB.material.rotation -= dt * 0.015;
      const glow = 0.55 + hot * 0.6;
      (moon.material as THREE.MeshStandardMaterial).emissiveIntensity = glow;
      ringMaterials.forEach((material, index) => {
        material.opacity = (0.62 - index * 0.14) * (1 + hot * 0.7);
      });
    },
  };
}

/* ---------------------- Портал «Матрица судьбы» -------------------------- */

function buildMatrixScene(scene: THREE.Scene): { tick: (dt: number, hot: number) => void } {
  // Северное сияние: три переливающиеся вуали.
  const auroraColors: [string, string][] = [
    ["#3fe0c9", "rgba(20,40,60,0)"],
    ["#3f9de0", "rgba(12,30,52,0)"],
    ["#8f6fe0", "rgba(14,26,50,0)"],
  ];
  const veils: THREE.Sprite[] = [];
  auroraColors.forEach(([inner, outer], index) => {
    const veil = spriteFrom(glowTexture(inner, outer), 15 - index * 2, 0.36 - index * 0.06);
    veil.position.set((index - 1) * 3.4, 1.6 + index * 1.1, -7.5 - index);
    veils.push(veil);
    scene.add(veil);
  });

  // Ледники: тёмные силуэты на заднем плане.
  const glacierMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color("#0a2740") });
  for (let index = 0; index < 5; index += 1) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.6 + Math.random(), 3.2 + Math.random() * 2.4, 5), glacierMaterial);
    cone.position.set(-6 + index * 3 + Math.random(), -4.6, -8.5 - Math.random() * 2);
    cone.rotation.y = Math.random() * Math.PI;
    scene.add(cone);
  }

  // Редкие звёзды.
  const starCount = 420;
  const positions = new Float32Array(starCount * 3);
  for (let index = 0; index < starCount; index += 1) {
    positions[index * 3] = (Math.random() - 0.5) * 26;
    positions[index * 3 + 1] = Math.random() * 12 - 1;
    positions[index * 3 + 2] = -6 - Math.random() * 8;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const stars = new THREE.Points(
    starGeometry,
    new THREE.PointsMaterial({ color: new THREE.Color("#bfe9ff"), size: 0.05, transparent: true, opacity: 0.8, depthWrite: false }),
  );
  scene.add(stars);

  // Ледяной кристалл-октаграмма.
  const crystalGroup = new THREE.Group();
  const shape = octagramShape(1.75);
  const crystalGeometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.85,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.12,
    bevelSegments: 2,
  });
  crystalGeometry.center();
  const crystal = new THREE.Mesh(
    crystalGeometry,
    new THREE.MeshPhongMaterial({
      color: new THREE.Color("#8fd0f2"),
      transparent: true,
      opacity: 0.24,
      shininess: 90,
      specular: new THREE.Color("#cdeeff"),
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(crystalGeometry),
    new THREE.LineBasicMaterial({ color: new THREE.Color("#aee6ff"), transparent: true, opacity: 0.85 }),
  );
  crystalGroup.add(crystal, edges);
  scene.add(crystalGroup);

  const key = new THREE.DirectionalLight(new THREE.Color("#bfe9ff"), 1.8);
  key.position.set(3, 4, 6);
  scene.add(key, new THREE.AmbientLight(new THREE.Color("#1a3a55"), 1.4));

  // Цифры Арканов: два встречных кольца внутри кристалла.
  const digitsInner = new THREE.Group();
  const digitsOuter = new THREE.Group();
  ARCANUM.forEach((digits, index) => {
    const sprite = spriteFrom(glyphTexture(digits, "#d8f4ff", "#2ea8d8"), index % 2 === 0 ? 0.34 : 0.3, 0.95);
    const radius = index % 2 === 0 ? 1.02 : 1.5;
    const angle = (index / ARCANUM.length) * Math.PI * 2;
    sprite.position.set(Math.cos(angle) * radius, Math.sin(angle * 2) * 0.16, Math.sin(angle) * radius);
    (index % 2 === 0 ? digitsInner : digitsOuter).add(sprite);
  });
  const digitsGroup = new THREE.Group();
  digitsGroup.add(digitsInner, digitsOuter);
  scene.add(digitsGroup);

  // Ледяные лучи от центра к вершинам звезды.
  const rayMaterial = new THREE.LineBasicMaterial({ color: new THREE.Color("#7fd4ff"), transparent: true, opacity: 0.3 });
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(Math.cos(angle) * 1.72, Math.sin(angle) * 1.72, 0),
    ]);
    digitsGroup.add(new THREE.Line(geometry, rayMaterial));
  }

  return {
    tick(dt, hot) {
      crystalGroup.rotation.y += dt * (0.22 + hot * 0.6);
      crystalGroup.rotation.x = Math.sin(performance.now() * 0.0004) * 0.16 + hot * 0.1;
      digitsInner.rotation.y -= dt * (0.5 + hot * 1.1);
      digitsOuter.rotation.y += dt * (0.36 + hot * 0.9);
      digitsGroup.rotation.y = crystalGroup.rotation.y * 0.35;
      veils.forEach((veil, index) => {
        veil.material.rotation += dt * (0.03 + index * 0.01) * (1 + hot);
        veil.position.x = (index - 1) * 3.4 + Math.sin(performance.now() * 0.0002 + index) * 0.8;
      });
      edges.material.opacity = 0.7 + hot * 0.3;
      (crystal.material as THREE.MeshPhongMaterial).opacity = 0.22 + hot * 0.14;
      stars.rotation.y += dt * 0.01 * (1 + hot);
    },
  };
}

/* --------------------------- Общий каркас -------------------------------- */

function initPortal(container: HTMLElement, kind: "astro" | "matrix"): void {
  // jsdom/старые браузеры: остаётся статичный постер.
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
  } catch {
    container.classList.add("portal-card--flat");
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(container.clientWidth || 300, container.clientHeight || 300);
  renderer.domElement.className = "portal-card__canvas";
  container.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    45,
    (container.clientWidth || 1) / (container.clientHeight || 1),
    0.1,
    100,
  );
  camera.position.set(0, 0.15, 7.4);

  const tickScene = kind === "astro" ? buildAstroScene(scene) : buildMatrixScene(scene);
  const state: HotState & { pointer: { x: number; y: number }; target: { x: number; y: number; z: number }; diving: boolean } = {
    hot: false,
    pointer: { x: 0, y: 0 },
    target: { x: 0, y: 0.15, z: 7.4 },
    diving: false,
  };

  const setHot = (hot: boolean) => {
    state.hot = hot;
    container.classList.toggle("is-hot", hot);
    state.target.z = hot ? 5.4 : 7.4;
  };

  // Параллакс от мыши/тача в пределах карточки.
  const onPointerMove = (event: PointerEvent) => {
    const box = container.getBoundingClientRect();
    state.pointer.x = ((event.clientX - box.left) / box.width - 0.5) * 2;
    state.pointer.y = ((event.clientY - box.top) / box.height - 0.5) * 2;
    if (event.pointerType !== "touch") setHot(true);
  };
  const onPointerLeave = () => {
    setHot(false);
    state.pointer.x = 0;
    state.pointer.y = 0;
  };
  container.addEventListener("pointermove", onPointerMove, { passive: true });
  container.addEventListener("pointerdown", onPointerMove, { passive: true });
  container.addEventListener("pointerleave", onPointerLeave);

  // Плавный перелёт внутрь портала — потом переход в раздел.
  const onNavigate = (event: Event) => {
    if (state.diving) return;
    event.preventDefault();
    state.diving = true;
    setHot(true);
    state.target.z = 1.1;
    container.classList.add("is-diving");
    const href = container.getAttribute("href") || "astrology.html";
    window.setTimeout(() => {
      window.location.href = href;
    }, 720);
  };
  container.addEventListener("click", onNavigate);

  // Скролл-параллакс: сцена чуть плывёт, пока страница листается (мобильный).
  let scrollTarget = 0;
  const onScroll = () => {
    const box = container.getBoundingClientRect();
    const visible = Math.min(1, Math.max(0, 1 - Math.abs(box.top + box.height / 2 - window.innerHeight / 2) / window.innerHeight));
    scrollTarget = (1 - visible) * 0.9;
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // Пауза вне экрана — экономим батарею и держим 60 FPS.
  let visible = true;
  const observer = new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? true;
  });
  observer.observe(container);
  document.addEventListener("visibilitychange", () => {
    visible = !document.hidden;
  });

  const resize = () => {
    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  const reduced = prefersReducedMotion();
  const clock = new THREE.Clock();
  const render = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const hot = state.hot ? 1 : 0;
    tickScene.tick(reduced ? dt * 0.3 : dt, hot);
    // Плавное движение камеры: параллакс + приближение + погружение.
    camera.position.x += (state.pointer.x * 0.55 - camera.position.x) * 0.06;
    camera.position.y += (0.15 + state.pointer.y * -0.4 + scrollTarget - camera.position.y) * 0.06;
    camera.position.z += (state.target.z - camera.position.z) * 0.05;
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  };

  if (reduced) {
    renderer.render(scene, camera); // один статичный кадр без анимации
    return;
  }

  const loop = () => {
    if (visible) render();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function boot(): void {
  const containers = Array.from(document.querySelectorAll<HTMLElement>("[data-portal-scene]"));
  containers.forEach((container) => {
    const kind = container.dataset.portalScene === "matrix" ? "matrix" : "astro";
    try {
      initPortal(container, kind);
    } catch {
      container.classList.add("portal-card--flat");
    }
  });
}

// Контейнеры рисует React (app.js): ждём их появления, но не дольше 6 секунд.
function waitForContainers(attempt = 0): void {
  const containers = document.querySelectorAll("[data-portal-scene]");
  if (containers.length >= 2) {
    boot();
    return;
  }
  if (attempt > 240) return;
  requestAnimationFrame(() => waitForContainers(attempt + 1));
}

waitForContainers();
