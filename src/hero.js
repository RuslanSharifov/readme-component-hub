/* Hero 3D particle figure. Lives inside .hero-stage only.
   - Morphs between five 3D forms on a timer and on click
   - Reacts to the pointer (repulsion + camera parallax)
   - Pauses when scrolled out of view and respects reduced motion */

const TAU = Math.PI * 2;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const SHAPES = {
  sphere(i, n) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const t = Math.PI * (3 - Math.sqrt(5)) * i;
    return [Math.cos(t) * r, y, Math.sin(t) * r];
  },
  torus(i, n) {
    const cols = 64;
    const rows = Math.max(1, Math.ceil(n / cols));
    const u = ((i % cols) / cols) * TAU;
    const v = (Math.floor(i / cols) / rows) * TAU;
    const R = 0.9, r = 0.32;
    const ring = R + r * Math.cos(v);
    return [ring * Math.cos(u), r * Math.sin(v), ring * Math.sin(u)];
  },
  helix(i, n) {
    const t = i / n;
    const a = t * TAU * 4.5 + (i % 2) * Math.PI;
    return [Math.cos(a) * 0.7, (t - 0.5) * 2.1, Math.sin(a) * 0.7];
  },
  cube(i) {
    const u = Math.random() * 2 - 1;
    const v = Math.random() * 2 - 1;
    switch (i % 6) {
      case 0: return [1, u, v];
      case 1: return [-1, u, v];
      case 2: return [u, 1, v];
      case 3: return [u, -1, v];
      case 4: return [u, v, 1];
      default: return [u, v, -1];
    }
  },
  grid(i, n) {
    const cols = Math.ceil(Math.sqrt(n * 1.6));
    const rows = Math.ceil(n / cols);
    const x = ((i % cols) / (cols - 1)) * 2 - 1;
    const z = (Math.floor(i / cols) / Math.max(1, rows - 1)) * 2 - 1;
    return [x, Math.sin(x * 3.2) * Math.cos(z * 3.2) * 0.16, z];
  },
};

const ORDER = ['sphere', 'torus', 'helix', 'cube', 'grid'];
const NAMES = { sphere: 'Globe', torus: 'Orbit', helix: 'Helix', cube: 'Block', grid: 'Grid' };
const TUNING = {
  sphere: { tilt: 0.25, scale: 1.0 },
  torus: { tilt: 0.75, scale: 1.05 },
  helix: { tilt: 0.1, scale: 1.0 },
  cube: { tilt: 0.55, scale: 0.92 },
  grid: { tilt: 1.0, scale: 1.2 },
};

function buildTargets(count) {
  const out = {};
  for (const name of ORDER) {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const [x, y, z] = SHAPES[name](i, count);
      arr[i * 3] = x; arr[i * 3 + 1] = y; arr[i * 3 + 2] = z;
    }
    out[name] = arr;
  }
  return out;
}

function randomCloud(count) {
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = Math.random() * 2 - 1;
    const t = Math.random() * TAU;
    const s = Math.sqrt(1 - u * u);
    const radius = 2.4 + Math.random();
    arr[i * 3] = s * Math.cos(t) * radius;
    arr[i * 3 + 1] = u * radius;
    arr[i * 3 + 2] = s * Math.sin(t) * radius;
  }
  return arr;
}

export function initHero() {
  const canvas = document.getElementById('heroCanvas');
  const stage = canvas && canvas.parentElement;
  const label = document.getElementById('shapeName');
  const index = document.getElementById('shapeIndex');
  if (!canvas || !stage || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');

  const s = {
    W: 0, H: 0, dpr: 1, count: 0,
    targets: null, cur: null,
    shape: 0, rotX: 0.25, rotY: 0, spin: 0,
    running: false, visible: true, last: 0,
    timer: 0,
  };
  const pointer = { x: -9999, y: -9999, tx: 0, ty: 0, nx: 0, ny: 0 };

  function setLabel() {
    const name = ORDER[s.shape];
    label.textContent = NAMES[name];
    index.textContent = String(s.shape + 1).padStart(2, '0') + ' / ' + String(ORDER.length).padStart(2, '0');
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    s.W = rect.width;
    s.H = rect.height;
    s.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(s.W * s.dpr);
    canvas.height = Math.floor(s.H * s.dpr);
    ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    const count = s.W < 700 ? 300 : s.W < 1100 ? 480 : 720;
    if (count !== s.count) {
      s.count = count;
      s.targets = buildTargets(count);
      s.cur = reduceMotion.matches ? new Float32Array(s.targets[ORDER[s.shape]]) : randomCloud(count);
    }
    if (reduceMotion.matches) draw(1);
  }

  function draw(dt) {
    const name = ORDER[s.shape];
    const target = s.targets[name];
    const cur = s.cur;
    const tune = TUNING[name];
    const { W, H, count } = s;

    const ease = 1 - Math.pow(1 - 0.05, dt);
    pointer.nx += (pointer.tx - pointer.nx) * 0.06 * dt;
    pointer.ny += (pointer.ty - pointer.ny) * 0.06 * dt;
    s.rotX += (tune.tilt - s.rotX) * 0.03 * dt;
    s.rotY += (0.0016 + s.spin + pointer.nx * 0.0012) * dt;
    s.spin *= Math.pow(0.95, dt);

    const cosY = Math.cos(s.rotY), sinY = Math.sin(s.rotY);
    const tilt = s.rotX + pointer.ny * 0.3;
    const cosX = Math.cos(tilt), sinX = Math.sin(tilt);
    const size = Math.min(W, H) * 0.36 * tune.scale;
    const cx = W / 2, cy = H / 2;
    const R = 96, R2 = R * R;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgb(160, 240, 196)';

    for (let i = 0; i < count; i++) {
      const j = i * 3;
      cur[j] += (target[j] - cur[j]) * ease;
      cur[j + 1] += (target[j + 1] - cur[j + 1]) * ease;
      cur[j + 2] += (target[j + 2] - cur[j + 2]) * ease;

      const x = cur[j], y = cur[j + 1], z = cur[j + 2];
      const x1 = x * cosY + z * sinY;
      const z1 = -x * sinY + z * cosY;
      const y2 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;

      const persp = 3.2 / (3.2 - z2);
      let sx = cx + x1 * size * persp;
      let sy = cy + y2 * size * persp;

      const dx = sx - pointer.x, dy = sy - pointer.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < R2 && d2 > 0.01) {
        const d = Math.sqrt(d2);
        const f = (1 - d / R) * 34;
        sx += (dx / d) * f;
        sy += (dy / d) * f;
      }

      const depth = Math.min(1, Math.max(0, (z2 + 1.3) / 2.6));
      ctx.globalAlpha = 0.1 + depth * 0.85;
      ctx.beginPath();
      ctx.arc(sx, sy, 0.6 + persp * 0.8, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function loop(now) {
    if (!s.running) return;
    const dt = Math.min(3, (now - s.last) / 16.67) || 1;
    s.last = now;
    draw(dt);
    requestAnimationFrame(loop);
  }

  function start() {
    if (reduceMotion.matches) { draw(1); return; }
    if (s.running || !s.visible || document.hidden) return;
    s.running = true;
    s.last = performance.now();
    requestAnimationFrame(loop);
  }

  function stop() { s.running = false; }

  function next() {
    s.shape = (s.shape + 1) % ORDER.length;
    setLabel();
    if (reduceMotion.matches) draw(1);
  }

  function schedule() {
    clearInterval(s.timer);
    if (reduceMotion.matches) return;
    s.timer = setInterval(next, 5200);
  }

  setLabel();
  resize();
  let rt = 0;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(resize, 120); });

  const hero = stage.closest('.hero');
  hero.addEventListener('pointermove', (event) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = event.clientX - r.left;
    pointer.y = event.clientY - r.top;
    pointer.tx = ((event.clientX - r.left) / r.width) * 2 - 1;
    pointer.ty = ((event.clientY - r.top) / r.height) * 2 - 1;
  }, { passive: true });
  hero.addEventListener('pointerleave', () => {
    pointer.x = -9999; pointer.y = -9999; pointer.tx = 0; pointer.ty = 0;
  });
  stage.addEventListener('click', () => { next(); schedule(); });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      s.visible = entry.isIntersecting;
      if (s.visible) start(); else stop();
    }, { threshold: 0 }).observe(hero);
  }
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  schedule();
  requestAnimationFrame(() => { canvas.classList.add('is-ready'); start(); });
}

initHero();
