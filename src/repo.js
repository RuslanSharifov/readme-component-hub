/* Repository section: live GitHub data, star history chart and a
   horizontal slide track that moves with vertical scroll.
   Falls back to the committed star history when the API is unavailable. */

const REPO_SLUG = 'RuslanSharifov/readme-component-hub';
const REPO_API = 'https://api.github.com/repos/' + REPO_SLUG;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('en-US') : '—');
const dateFmt = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};
const setText = (id, text) => {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
};

async function fetchJSON(url, timeout = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/vnd.github+json' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function renderChart(points) {
  const host = document.getElementById('starChart');
  if (!host) return;
  if (!points.length) {
    host.textContent = 'No history recorded yet.';
    return;
  }
  const w = 480, h = 150, pad = 8;
  const values = points.map((p) => p.stars);
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const span = Math.max(1, max - min);
  const x = (i) => (points.length === 1 ? w / 2 : pad + (i * (w - pad * 2)) / (points.length - 1));
  const y = (v) => h - pad - ((v - min) / span) * (h - pad * 2);
  const line = points.map((p, i) => x(i).toFixed(1) + ',' + y(p.stars).toFixed(1)).join(' ');
  const area = '0,' + h + ' ' + line + ' ' + w + ',' + h;
  const dots = points.map((p, i) =>
    '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.stars).toFixed(1) + '" r="3.5" />').join('');
  // A single snapshot is shown as a dot only; a line or area needs two points.
  const curve = points.length > 1
    ? '<polygon points="' + area + '" fill="url(#sparkFill)"/>' +
      '<polyline points="' + line + '" fill="none" stroke="#ff5a1f" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>'
    : '';
  host.innerHTML =
    '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" role="img" aria-label="Stars over time">' +
    '<defs><linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">' +
    '<stop offset="0" stop-color="#ff5a1f" stop-opacity=".35"/><stop offset="1" stop-color="#ff5a1f" stop-opacity="0"/></linearGradient></defs>' +
    curve + '<g fill="#ff5a1f">' + dots + '</g></svg>' +
    '<p class="spark-note">' + (points.length === 1 ? 'History starts with the first snapshot.' : points.length + ' snapshots recorded') + '</p>';
}

function renderCategories(components) {
  const list = document.getElementById('categoryBars');
  if (!list) return;
  setText('componentCountRepo', String(components.length));
  const counts = {};
  components.forEach((c) => { counts[c.category] = (counts[c.category] || 0) + 1; });
  const total = Math.max(1, components.length);
  list.innerHTML = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, n]) =>
      '<li><span class="bar-label">' + name + '</span><span class="bar-track"><span class="bar-fill" style="--w:' +
      ((n / total) * 100).toFixed(1) + '%"></span></span><span class="bar-count">' + n + '</span></li>')
    .join('');
}

async function loadRepo() {
  let history = [];
  try {
    const data = await fetchJSON('./generated/data/stars-history.json');
    history = Array.isArray(data[REPO_SLUG]) ? data[REPO_SLUG] : [];
  } catch (e) { /* optional */ }

  let repo = null;
  try {
    repo = await fetchJSON(REPO_API);
  } catch (e) { /* offline or rate limited: use fallbacks */ }

  if (repo) {
    setText('repoDescription', repo.description || 'Community-built README components.');
    setText('repoLicense', (repo.license && repo.license.spdx_id) || 'MIT');
    setText('repoCreated', dateFmt(repo.created_at));
    setText('repoPushed', dateFmt(repo.pushed_at));
    setText('repoBranch', repo.default_branch || 'main');
    setText('statStars', fmt(repo.stargazers_count));
    setText('headerStars', fmt(repo.stargazers_count));
    setText('heroStars', fmt(repo.stargazers_count));
    setText('statForks', fmt(repo.forks_count));
    setText('statWatchers', fmt(repo.subscribers_count ?? repo.watchers_count));
    setText('statIssues', fmt(repo.open_issues_count));
    setText('statSize', fmt(repo.size));
  } else {
    setText('repoDescription', 'Community-built README components. Live data is unavailable right now.');
    const last = history[history.length - 1];
    if (last) {
      setText('statStars', fmt(last.stars));
      setText('headerStars', fmt(last.stars));
      setText('heroStars', fmt(last.stars));
    }
  }
  renderChart(history);

  try {
    const components = await fetchJSON('./components/catalog.json');
    if (Array.isArray(components)) renderCategories(components);
  } catch (e) { /* catalog failed; main.js shows its own error */ }
}

/* Horizontal track driven by vertical scroll through .repo-scroll */
function setupTrack() {
  const scroller = document.querySelector('.repo-scroll');
  const track = document.getElementById('repoTrack');
  const bar = document.getElementById('repoBar');
  if (!scroller || !track) return;

  const update = () => {
    const rect = scroller.getBoundingClientRect();
    const range = scroller.offsetHeight - window.innerHeight;
    const p = range > 0 ? Math.min(1, Math.max(0, -rect.top / range)) : 0;
    const travel = Math.max(0, track.scrollWidth - window.innerWidth + 48);
    if (!reduceMotion.matches) track.style.transform = 'translate3d(' + (-p * travel).toFixed(1) + 'px,0,0)';
    if (bar) bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    // Slides lift and fade in as they enter, giving a layered depth feel.
    track.querySelectorAll('.slide').forEach((slide, i) => {
      const sr = slide.getBoundingClientRect();
      const t = Math.min(1, Math.max(0, 1 - Math.abs(sr.left + sr.width / 2 - window.innerWidth / 2) / window.innerWidth));
      slide.style.setProperty('--t', t.toFixed(3));
    });
  };

  let ticking = false;
  const request = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; update(); });
  };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  update();
}

setupTrack();
loadRepo();
