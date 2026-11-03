/* Visual effects for README Component Hub.
   Progressive enhancement only: the catalog works without this file.
   - 3D particle field that morphs between shapes as sections scroll into view
   - pointer-reactive particles, parallax hero and 3D card tilt
   - scroll reveal and entrance animations */

const TAU = Math.PI * 2;
const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

const pointer = { x: -9999, y: -9999, tx: 0, ty: 0, nx: 0, ny: 0 };
const scene = {
  canvas: document.getElementById('particleField'),
  ctx: null,
  width: 0,
  height: 0,
  dpr: 1,
  count: 0,
  shape: 'sphere',
  targets: {},
  current: null,
  rotX: 0.2,
  rotY: 0,
  spin: 0,
  lastTime: 0,
  running: false,
};

/* Each shape returns a point [x, y, z] in roughly unit space for particle i of n. */
const SHAPES = {
  // Globe: fibonacci lattice, reads as a "world of components".
  sphere(i, n) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const t = Math.PI * (3 - Math.sqrt(5)) * i;
    return [Math.cos(t) * r, y, Math.sin(t) * r];
  },
  // Torus: a ring of "components" orbiting one another.
  torus(i, n) {
    const cols = 72;
    const rows = Math.max(1, Math.ceil(n / cols));
    const u = ((i % cols) / cols) * TAU;
    const v = (Math.floor(i / cols) / rows) * TAU;
    const R = 0.92, r = 0.34;
    const ring = R + r * Math.cos(v);
    return [ring * Math.cos(u), r * Math.sin(v), ring * Math.sin(u)];
  },
  // Double helix: a commit history / timeline feel.
  helix(i, n) {
    const t = i / n;
    const strand = i % 2;
    const a = t * TAU * 5 + strand * Math.PI;
    const jitter = () => (Math.random() - 0.5) * 0.04;
    return [Math.cos(a) * 0.72 + jitter(), (t - 0.5) * 2.2, Math.sin(a) * 0.72 + jitter()];
  },
  // Cube: a README block, structured and precise.
  cube(i) {
    const face = i % 6;
    const u = Math.random() * 2 - 1;
    const v = Math.random() * 2 - 1;
    switch (face) {
      case 0: return [1, u, v];
      case 1: return [-1, u, v];
      case 2: return [u, 1, v];
      case 3: return [u, -1, v];
      case 4: return [u, v, 1];
      default: return [u, v, -1];
    }
  },
  // Grid plane with a gentle wave: a dashboard of cards.
  grid(i, n) {
    const cols = Math.ceil(Math.sqrt(n * 1.6));
    const rows = Math.ceil(n / cols);
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = (col / (cols - 1)) * 2 - 1;
    const z = (row / Math.max(1, rows - 1)) * 2 - 1;
    const y = Math.sin(x * 3.2) * Math.cos(z * 3.2) * 0.16;
    return [x, y, z];
  },
};

/* Per-shape camera tilt and size so each form reads clearly. */
const SHAPE_TUNING = {
  sphere: { tilt: 0.25, scale: 1.0 },
  torus: { tilt: 0.7, scale: 1.05 },
  helix: { tilt: 0.1, scale: 1.0 },
  cube: { tilt: 0.55, scale: 0.95 },
  grid: { tilt: 1.0, scale: 1.25 },
};

function particleCountFor(width) {
  if (width < 700) return 360;
  if (width < 1100) return 640;
  return 980;
}

function buildTargets(count) {
  const result = {};
  for (const name of Object.keys(SHAPES)) {
    const arr = new Float32Array(count * 3);
    const make = SHAPES[name];
    for (let i = 0; i < count; i++) {
      const [x, y, z] = make(i, count);
      arr[i * 3] = x;
      arr[i * 3 + 1] = y;
      arr[i * 3 + 2] = z;
    }
    result[name] = arr;
  }
  return result;
}

function randomCloud(count) {
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1;
    const t = Math.random() * TAU;
    const s = Math.sqrt(1 - u * u);
    const radius = 2.2 + Math.random() * 1.2;
    arr[i * 3] = s * Math.cos(t) * radius;
    arr[i * 3 + 1] = u * radius;
    arr[i * 3 + 2] = s * Math.sin(t) * radius;
  }
  return arr;
}

function resizeScene() {
  if (!scene.canvas) return;
  scene.width = window.innerWidth;
  scene.height = window.innerHeight;
  scene.dpr = Math.min(window.devicePixelRatio || 1, 2);
  scene.canvas.width = Math.floor(scene.width * scene.dpr);
  scene.canvas.height = Math.floor(scene.height * scene.dpr);
  scene.ctx.setTransform(scene.dpr, 0, 0, scene.dpr, 0, 0);

  const count = particleCountFor(scene.width);
  if (count !== scene.count) {
    scene.count = count;
    scene.targets = buildTargets(count);
    scene.current = reduceMotion.matches ? new Float32Array(scene.targets[scene.shape]) : randomCloud(count);
  }
  if (reduceMotion.matches) drawFrame(1);
}

/* One simulation + render step. dt is in frames (~1 at 60fps). */
function drawFrame(dt) {
  const { ctx, width, height, count, current } = scene;
  const target = scene.targets[scene.shape];
  const tuning = SHAPE_TUNING[scene.shape];

  const ease = 1 - Math.pow(1 - 0.055, dt);
  pointer.nx += (pointer.tx - pointer.nx) * 0.06 * dt;
  pointer.ny += (pointer.ty - pointer.ny) * 0.06 * dt;

  scene.rotX += (tuning.tilt - scene.rotX) * 0.035 * dt;
  scene.rotY += (0.0016 + scene.spin + pointer.nx * 0.0014) * dt;
  scene.spin *= Math.pow(0.94, dt);

  const cosY = Math.cos(scene.rotY), sinY = Math.sin(scene.rotY);
  const tilt = scene.rotX + pointer.ny * 0.35;
  const cosX = Math.cos(tilt), sinX = Math.sin(tilt);

  const wide = width > 900;
  const size = Math.min(width, height) * 0.31 * tuning.scale;
  const cx = wide ? width * 0.68 : width * 0.5;
  const cy = wide ? height * 0.5 : height * 0.4;
  const repelRadius = 110;
  const repel2 = repelRadius * repelRadius;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'rgb(141, 247, 186)';

  for (let i = 0; i < count; i++) {
    const j = i * 3;
    current[j] += (target[j] - current[j]) * ease;
    current[j + 1] += (target[j + 1] - current[j + 1]) * ease;
    current[j + 2] += (target[j + 2] - current[j + 2]) * ease;

    const x = current[j], y = current[j + 1], z = current[j + 2];

    // Rotate around Y, then X.
    const x1 = x * cosY + z * sinY;
    const z1 = -x * sinY + z * cosY;
    const y2 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;

    const persp = 3.2 / (3.2 - z2);
    let sx = cx + x1 * size * persp;
    let sy = cy + y2 * size * persp;

    // Pointer pushes nearby particles away.
    const dx = sx - pointer.x;
    const dy = sy - pointer.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < repel2 && d2 > 0.01) {
      const d = Math.sqrt(d2);
      const force = (1 - d / repelRadius) * 42;
      sx += (dx / d) * force;
      sy += (dy / d) * force;
    }

    const depth = Math.min(1, Math.max(0, (z2 + 1.3) / 2.6));
    const alpha = 0.12 + depth * 0.8;
    const radius = 0.7 + persp * 0.85;

    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function loop(now) {
  if (!scene.running) return;
  const dt = Math.min(3, (now - scene.lastTime) / 16.67 || 1);
  scene.lastTime = now;
  drawFrame(dt);
  requestAnimationFrame(loop);
}

function startScene() {
  if (!scene.canvas || !scene.ctx) return;
  if (reduceMotion.matches) {
    drawFrame(1);
    return;
  }
  if (scene.running) return;
  scene.running = true;
  scene.lastTime = performance.now();
  requestAnimationFrame(loop);
}

function stopScene() {
  scene.running = false;
}

function setupParticles() {
  if (!scene.canvas || !scene.canvas.getContext) return;
  scene.ctx = scene.canvas.getContext('2d');
  if (!scene.ctx) return;

  resizeScene();
  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resizeScene, 120);
  });

  // Pointer position drives repulsion and the gentle camera parallax.
  window.addEventListener('pointermove', (event) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.tx = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (event.clientY / window.innerHeight) * 2 - 1;
    root.style.setProperty('--px', pointer.tx.toFixed(3));
    root.style.setProperty('--py', pointer.ty.toFixed(3));
  }, { passive: true });
  document.addEventListener('pointerout', (event) => {
    if (event.relatedTarget) return;
    pointer.x = -9999;
    pointer.y = -9999;
    pointer.tx = 0;
    pointer.ty = 0;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopScene();
    else startScene();
  });

  // Each section names the shape it should morph into.
  const shapeSections = document.querySelectorAll('[data-shape]');
  if ('IntersectionObserver' in window) {
    const shapeObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          scene.shape = entry.target.dataset.shape;
          if (reduceMotion.matches) drawFrame(1);
        }
      });
    }, { threshold: 0, rootMargin: '-45% 0px -45% 0px' });
    shapeSections.forEach((section) => shapeObserver.observe(section));
  }

  // Entrance: the cloud assembles itself into the hero shape.
  requestAnimationFrame(() => {
    document.body.classList.add('is-ready');
    startScene();
  });
}

/* Scroll: header state, hero parallax and spin boost. */
function setupScroll() {
  const header = document.querySelector('.site-header');
  let lastY = window.scrollY;
  let ticking = false;

  const update = () => {
    const y = window.scrollY;
    header && header.classList.toggle('scrolled', y > 8);
    root.style.setProperty('--sy', String(Math.min(y, 900)));
    if (scene.running) {
      scene.spin = Math.max(-0.05, Math.min(0.05, scene.spin + (y - lastY) * 0.00005));
    }
    lastY = y;
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  update();
}

/* Scroll reveal for sections marked with .reveal. */
function setupReveal() {
  const items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('in'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -40px 0px' });
  items.forEach((el) => observer.observe(el));
}

/* Catalog cards: stagger index and 3D tilt on pointer hover. */
function setupCards() {
  const grid = document.getElementById('catalogGrid');
  if (!grid) return;

  // Cards are re-rendered on every filter change; stagger each batch.
  const indexer = new MutationObserver(() => {
    Array.from(grid.children).forEach((card, index) => {
      card.style.setProperty('--i', String(Math.min(index, 12)));
    });
  });
  indexer.observe(grid, { childList: true });

  if (!finePointer.matches || reduceMotion.matches) return;

  grid.addEventListener('pointermove', (event) => {
    const card = event.target.closest('.component-card');
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    card.style.setProperty('--ry', ((px - 0.5) * 9).toFixed(2) + 'deg');
    card.style.setProperty('--rx', ((0.5 - py) * 7).toFixed(2) + 'deg');
  });
  grid.addEventListener('pointerout', (event) => {
    const card = event.target.closest('.component-card');
    if (!card) return;
    if (event.relatedTarget && card.contains(event.relatedTarget)) return;
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  });
}

function init() {
  root.classList.add('js');
  setupParticles();
  setupScroll();
  setupReveal();
  setupCards();
}

init();
