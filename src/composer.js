import {snippet as neonSnippet, escapeHTML} from './neon-core.mjs';
/* README Composer: pick components and produce a complete README.md document.
   Uses the same asset URLs as the gallery, so the output renders on GitHub. */

const RAW_ROOT = 'https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/';

const els = {
  chips: document.getElementById('composeChips'),
  title: document.getElementById('composeTitleInput'),
  tagline: document.getElementById('composeTagline'),
  caption: document.getElementById('composeCaption'),
  theme: document.getElementById('composeTheme'),
  align: document.getElementById('composeAlign'),
  width: document.getElementById('composeWidth'),
  output: document.getElementById('composeOutput'),
  count: document.getElementById('composeCount'),
  lines: document.getElementById('composeLines'),
  copy: document.getElementById('composeCopy'),
  download: document.getElementById('composeDownload'),
};

const state = { components: [], selected: new Set() };

const esc = (value) => String(value).replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[ch]);

function assetPath(component, theme) {
  return component.themes[theme] || component.themes.dark;
}

function selectedComponents() {
  return state.components.filter((c) => state.selected.has(c.id));
}

function buildMarkdown() {
  const title=els.title.value.trim() || 'Hello, world';
  const tagline=els.tagline.value.trim();
  const lines=['# '+title,''];
  if(tagline)lines.push(tagline,'');
  for(const item of selectedComponents()){
    if(item.id==='neon-wave')
      lines.push(neonSnippet({caption:els.caption.value,theme:els.theme.value,
        width:Number(els.width.value),align:els.align.value}),'');
  }
  return lines.join('\n');
}

function renderOutput() {
  const md = buildMarkdown();
  els.output.textContent = md;
  els.lines.textContent = md.split('\n').length + ' lines';
  const n = state.selected.size;
  els.count.textContent = n ? '(' + n + ' selected)' : '';
}

function renderChips() {
  els.chips.innerHTML = state.components.map((c) => {
    const on = state.selected.has(c.id);
    return '<button type="button" class="compose-chip' + (on ? ' on' : '') + '" data-id="' + esc(c.id) +
      '" aria-pressed="' + on + '">' + esc(c.title) + '</button>';
  }).join('');
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (e) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

function toast(message) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('visible'), 2200);
}

function bind() {
  els.chips.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-id]');
    if (!chip) return;
    const id = chip.dataset.id;
    if (state.selected.has(id)) state.selected.delete(id); else state.selected.add(id);
    renderChips();
    renderOutput();
  });
  [els.title, els.tagline, els.caption, els.theme, els.align, els.width].forEach((el) => {
    el.addEventListener('input', renderOutput);
    el.addEventListener('change', renderOutput);
  });
  els.copy.addEventListener('click', async () => {
    const ok = await copyText(els.output.textContent);
    toast(ok ? 'Markdown copied to clipboard' : 'Could not copy. Select the text manually.');
  });
  els.download.addEventListener('click', () => {
    const blob = new Blob([els.output.textContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'README.md';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('README.md downloaded');
  });
}

async function init() {
  if (!els.chips) return;
  bind();
  try {
    const res = await fetch('./components/catalog.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    state.components = await res.json();
    // Start with the three featured components so the output is never empty.
    state.components.filter((c) => c.featured).slice(0, 3).forEach((c) => state.selected.add(c.id));
    renderChips();
    renderOutput();
  } catch (e) {
    els.chips.textContent = 'Components could not be loaded. Run the catalog build first.';
    els.output.textContent = '';
  }
}

init();
