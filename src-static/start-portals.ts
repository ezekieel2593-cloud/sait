/**
 * Стартовый экран: лёгкий живой слой частиц поверх 2D-иллюстраций порталов.
 *
 * Three.js рисует только мерцающую звёздную пыль и светящиеся сферы
 * (канвас с mix-blend-mode: screen), арт — эксклюзивные 2D-иллюстрации
 * images/portal-astro.jpg и images/portal-matrix.jpg. Слой реагирует на
 * движение мыши/тача (параллакс сцены + параллакс самой картинки), при
 * наведении частицы ускоряются и ярче светятся, клик — плавное погружение
 * внутрь портала и переход в рабочий раздел. Пауза вне экрана; без WebGL
 * остаётся чистая иллюстрация с CSS-анимацией.
 */
import * as THREE from "three";

type HotState = { hot: boolean };

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Радиальное свечение на canvas — без внешних файлов. */
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

/* --------------------- Лёгкий амбиентный слой ---------------------------- */

/**
 * Частицы поверх иллюстрации: у астрологии — золотая звёздная пыль и
 * медленные светлячки с тонким орбитальным кольцом, у матрицы — ледяные
 * искры и парящие светящиеся сферы. Интенсивность растёт при наведении.
 */
function buildAmbientScene(
  scene: THREE.Scene,
  kind: "astro" | "matrix",
): { tick: (dt: number, hot: number) => void } {
  const gold = kind === "astro";
  const colors = gold ? ["#ffe9b8", "#f2dd9e", "#ffffff"] : ["#bfe9ff", "#7fd4f7", "#eafaff"];

  // Далёкая пыль: медленно вращается.
  const dustCount = gold ? 700 : 620;
  const positions = new Float32Array(dustCount * 3);
  for (let index = 0; index < dustCount; index += 1) {
    positions[index * 3] = (Math.random() - 0.5) * 18;
    positions[index * 3 + 1] = (Math.random() - 0.5) * 11;
    positions[index * 3 + 2] = -2 - Math.random() * 6;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const dust = new THREE.Points(
    dustGeometry,
    new THREE.PointsMaterial({
      color: new THREE.Color(colors[0]),
      size: 0.045,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  scene.add(dust);

  // Ближние светлячки: крупнее, дрейфуют вверх с покачиванием.
  const nearGroup = new THREE.Group();
  const nearCount = gold ? 26 : 22;
  const orbTextures = colors.map((color) => glowTexture(color, "rgba(255,255,255,0)"));
  const orbs: { sprite: THREE.Sprite; speed: number; sway: number; phase: number }[] = [];
  for (let index = 0; index < nearCount; index += 1) {
    const sprite = spriteFrom(
      orbTextures[index % orbTextures.length],
      gold ? 0.18 + Math.random() * 0.2 : 0.14 + Math.random() * 0.3,
      0.8,
    );
    sprite.position.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 9, -0.5 - Math.random() * 3);
    orbs.push({
      sprite,
      speed: 0.12 + Math.random() * 0.3,
      sway: 0.4 + Math.random(),
      phase: Math.random() * Math.PI * 2,
    });
    nearGroup.add(sprite);
  }
  scene.add(nearGroup);

  // Тонкое орбитальное кольцо вокруг центра композиции.
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(gold ? 4.6 : 4.1, 0.012, 6, 120),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(gold ? "#e2cf96" : "#8fe4ff"),
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    }),
  );
  halo.rotation.x = gold ? Math.PI / 2.2 : Math.PI / 2.6;
  halo.rotation.y = gold ? 0.4 : -0.3;
  scene.add(halo);

  return {
    tick(dt, hot) {
      dust.rotation.y += dt * (0.02 + hot * 0.06);
      const time = performance.now() * 0.001;
      for (const orb of orbs) {
        orb.sprite.position.y += dt * orb.speed * (1 + hot);
        orb.sprite.position.x += Math.sin(time * 0.6 + orb.phase) * dt * orb.sway * 0.3;
        if (orb.sprite.position.y > 5.6) orb.sprite.position.y = -5.4;
        orb.sprite.material.opacity =
          0.45 + Math.abs(Math.sin(time * 1.4 + orb.phase)) * (0.4 + hot * 0.5);
      }
      halo.rotation.z += dt * (0.05 + hot * 0.25);
      (halo.material as THREE.MeshBasicMaterial).opacity = 0.3 + hot * 0.35;
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
  // Иллюстрация получает мягкий параллакс от курсора (в цикле рендера).
  const art = container.querySelector<HTMLElement>(".portal-card__art");

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    45,
    (container.clientWidth || 1) / (container.clientHeight || 1),
    0.1,
    100,
  );
  camera.position.set(0, 0.15, 7.4);

  const tickScene = buildAmbientScene(scene, kind);
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
    if (art) {
      // 3D-параллакс иллюстрации: картинка чуть плывёт за курсором.
      art.style.transform = `translate3d(${(-state.pointer.x * 10).toFixed(2)}px, ${(-state.pointer.y * 8).toFixed(2)}px, 0)`;
    }
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
