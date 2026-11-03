/* README Component Hub — entirely static, no backend required. */
const REPOSITORY = 'https://github.com/RuslanSharifov/readme-component-hub';
const RAW_ASSETS_ROOT = 'https://raw.githubusercontent.com/RuslanSharifov/readme-component-hub/main/';
const $ = (selector, scope = document) => scope.querySelector(selector);

const state = {
  components: [],
  category: 'All',
  search: '',
  sort: 'featured',
  selected: null,
  theme: 'dark',
  align: 'left',
  focusBeforeModal: null,
};

const els = {
  grid: $('#catalogGrid'),
  filters: $('#filterRow'),
  count: $('#resultCount'),
  componentCount: $('#componentCount'),
  categoryCount: $('#categoryCount'),
  search: $('#searchInput'),
  sort: $('#sortSelect'),
  empty: $('#emptyState'),
  modal: $('#modalBackdrop'),
  dialog: $('#componentModal'),
  modalImage: $('#modalImage'),
  themeOptions: $('#themeOptions'),
  alignOptions: $('#alignmentOptions'),
  code: $('#markdownCode'),
  copy: $('#copyMarkdown'),
  toast: $('#toast'),
};

function escapeHTML(input) {
  return String(input).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#39;'
  })[ch]);
}

function escapeMarkdown(input) {
  return String(input).replace(/\\/g, '\\\\').replace(/\]/g, '\\]').replace(/[\r\n]+/g, ' ');
}

function assetUrl(path) {
  return new URL(path, document.baseURI).href;
}

function hostedUrl(path) {
  // GitHub-hosted raw assets are easier for GitHub README's image proxy to fetch.
  return new URL(path, RAW_ASSETS_ROOT).href;
}

function categories() {
  return [...new Set(state.components.map((entry) => entry.category))].sort();
}

function listItems() {
  const search = state.search.trim().toLowerCase();
  const result = state.components.filter((entry) => {
    const inCategory = state.category === 'All' || entry.category === state.category;
    const haystack = [entry.title, entry.description, entry.category, entry.author, ...entry.tags].join(' ').toLowerCase();
    return inCategory && (!search || haystack.includes(search));
  });
  if (state.sort === 'name') result.sort((a, b) => a.title.localeCompare(b.title));
  if (state.sort === 'newest') result.sort((a, b) => b.addedAt.localeCompare(a.addedAt) || a.order - b.order);
  if (state.sort === 'featured') result.sort((a, b) => Number(b.featured) - Number(a.featured) || a.order - b.order);
  return result;
}

function renderFilters() {
  const names = ['All', ...categories()];
  els.filters.innerHTML = names.map((name) => (
    '<button class="filter-chip' + (state.category === name ? ' active' : '') +
    '" type="button" data-category="' + escapeHTML(name) +
    '" aria-pressed="' + (state.category === name ? 'true' : 'false') + '">' +
    (name === 'All' ? 'All components' : escapeHTML(name)) +
    (name !== 'All' ? '<span class="chip-count">' + state.components.filter((item) => item.category === name).length + '</span>' : '') +
    '</button>'
  )).join('');
}

function cardHTML(entry) {
  const img = escapeHTML(assetUrl(entry.themes.dark));
  const name = escapeHTML(entry.title);
  const description = escapeHTML(entry.description);
  const author = escapeHTML(entry.author);
  const tags = entry.tags.slice(0, 2).map((tag) => '<span class="tag">' + escapeHTML(tag) + '</span>').join('');
  return '<button type="button" class="component-card" data-component="' + escapeHTML(entry.id) +
    '" aria-label="Preview ' + name + '">' +
    '<span class="card-preview"><span class="card-preview-image"><img src="' + img + '" alt="' + name + ' preview" loading="lazy" decoding="async"></span>' +
    '<span class="card-top-badge">' + (entry.format === 'gif' ? '<span class="animation-dot"></span> ANIMATED' : 'SVG') + '</span></span>' +
    '<span class="card-content"><span class="card-category">' + escapeHTML(entry.category).toUpperCase() + '</span>' +
    '<span class="card-name-row"><strong>' + name + '</strong><span class="card-arrow" aria-hidden="true">↗</span></span>' +
    '<span class="card-description">' + description + '</span>' +
    '<span class="card-bottom"><span class="card-tags">' + tags + '</span><span class="card-author">@' + author + '</span></span></span>' +
    '</button>';
}

function renderCatalog() {
  const items = listItems();
  els.count.textContent = items.length + ' component' + (items.length === 1 ? '' : 's') + ' found';
  els.empty.hidden = items.length !== 0;
  els.grid.hidden = items.length === 0;
  els.grid.innerHTML = items.map(cardHTML).join('');
}

function markdown() {
  const entry = state.selected;
  if (!entry) return '';
  const url = hostedUrl(entry.themes[state.theme]);
  if (state.align === 'center') {
    return '<p align="center">\n  <img src="' + url + '" alt="' + escapeHTML(entry.title) + '" />\n</p>';
  }
  return '![' + escapeMarkdown(entry.title) + '](' + url + ')';
}

function updateMarkdown() {
  els.code.textContent = markdown();
  $('#modalPreview').classList.toggle('centered', state.align === 'center');
}

function showTheme() {
  const entry = state.selected;
  if (!entry) return;
  const path = entry.themes[state.theme];
  els.modalImage.src = assetUrl(path);
  els.modalImage.alt = entry.title + ' (' + state.theme + ' theme)';
  $('#modalPreview').classList.toggle('light-preview', state.theme === 'light');
  els.themeOptions.innerHTML = ['dark', 'light'].map((theme) => (
    '<button type="button" class="theme-choice' + (state.theme === theme ? ' active' : '') +
    '" data-theme="' + theme + '" aria-pressed="' + (state.theme === theme ? 'true' : 'false') + '">' +
    '<span class="theme-swatch ' + theme + '"></span> ' + (theme === 'dark' ? 'Dark' : 'Light') + '</button>'
  )).join('');
  updateMarkdown();
}

function openModal(id) {
  const entry = state.components.find((item) => item.id === id);
  if (!entry) return;
  state.selected = entry;
  state.theme = 'dark';
  state.align = 'left';
  state.focusBeforeModal = document.activeElement;
  $('#modalBreadcrumb').textContent = entry.id.toUpperCase();
  $('#modalCategory').textContent = entry.category;
  $('#modalTitle').textContent = entry.title;
  $('#modalDescription').textContent = entry.description;
  $('#modalTags').innerHTML = entry.tags.slice(0, 4).map((tag) => '<span>' + escapeHTML(tag) + '</span>').join('');
  $('#modalAuthor').textContent = 'Made by @' + entry.author;
  $('#previewFormat').textContent = entry.format.toUpperCase();
  $('#viewSource').href = REPOSITORY + '/tree/main/components/' + encodeURIComponent(entry.id);
  $('#themeCount').textContent = '2 available';
  els.alignOptions.querySelectorAll('button').forEach((button) => {
    button.classList.toggle('active', button.dataset.align === 'left');
    button.setAttribute('aria-pressed', button.dataset.align === 'left' ? 'true' : 'false');
  });
  showTheme();
  els.modal.hidden = false;
  document.body.classList.add('modal-open');
  $('#closeModal').focus();
}

function closeModal() {
  if (els.modal.hidden) return;
  els.modal.hidden = true;
  document.body.classList.remove('modal-open');
  state.selected = null;
  els.modalImage.removeAttribute('src');
  if (state.focusBeforeModal && typeof state.focusBeforeModal.focus === 'function') {
    state.focusBeforeModal.focus();
  }
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('visible');
  window.clearTimeout(toast.timeoutId);
  toast.timeoutId = window.setTimeout(() => els.toast.classList.remove('visible'), 2500);
}

async function copyToClipboard(text) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    const input = document.createElement('textarea');
    input.value = text;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    const success = document.execCommand('copy');
    input.remove();
    if (!success) {
      toast('Could not copy. Please select the code manually.');
      return;
    }
  }
  const old = els.copy.innerHTML;
  els.copy.textContent = '✓ Copied to clipboard';
  toast('Markdown copied — paste it into your README.md');
  window.setTimeout(() => { els.copy.innerHTML = old; }, 1700);
}

function setupEvents() {
  els.search.addEventListener('input', () => {
    state.search = els.search.value;
    renderCatalog();
  });
  els.sort.addEventListener('change', () => {
    state.sort = els.sort.value;
    renderCatalog();
  });
  els.filters.addEventListener('click', (event) => {
    const chip = event.target.closest('[data-category]');
    if (!chip) return;
    state.category = chip.dataset.category;
    renderFilters();
    renderCatalog();
  });
  els.grid.addEventListener('click', (event) => {
    const card = event.target.closest('[data-component]');
    if (card) openModal(card.dataset.component);
  });
  $('#resetFilters').addEventListener('click', () => {
    state.category = 'All';
    state.search = '';
    els.search.value = '';
    renderFilters();
    renderCatalog();
    els.search.focus();
  });
  $('#closeModal').addEventListener('click', closeModal);
  els.modal.addEventListener('click', (event) => {
    if (event.target === els.modal) closeModal();
  });
  els.themeOptions.addEventListener('click', (event) => {
    const button = event.target.closest('[data-theme]');
    if (!button) return;
    state.theme = button.dataset.theme;
    showTheme();
  });
  els.alignOptions.addEventListener('click', (event) => {
    const button = event.target.closest('[data-align]');
    if (!button) return;
    state.align = button.dataset.align;
    els.alignOptions.querySelectorAll('button').forEach((choice) => {
      const active = choice === button;
      choice.classList.toggle('active', active);
      choice.setAttribute('aria-pressed', String(active));
    });
    updateMarkdown();
  });
  els.copy.addEventListener('click', () => copyToClipboard(markdown()));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !els.modal.hidden) {
      closeModal();
      return;
    }
    if (event.key === '/' && els.modal.hidden && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      event.preventDefault();
      els.search.focus();
    }
    if (event.key !== 'Tab' || els.modal.hidden) return;
    const focusable = Array.from(els.dialog.querySelectorAll('a[href], button:not([disabled]), pre[tabindex="0"]'));
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  const menuButton = $('#menuToggle');
  const mobileNav = $('#mobileNav');
  menuButton.addEventListener('click', () => {
    const expanded = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!expanded));
    menuButton.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
    mobileNav.hidden = expanded;
  });
  mobileNav.addEventListener('click', (event) => {
    if (!event.target.closest('a')) return;
    mobileNav.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open navigation');
  });
}

async function init() {
  setupEvents();
  try {
    const response = await fetch('./components/catalog.json', {cache: 'no-store'});
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Catalog must be an array');
    state.components = data;
    els.componentCount.textContent = String(data.length).padStart(2, '0');
    els.categoryCount.textContent = String(categories().length).padStart(2, '0');
    renderFilters();
    renderCatalog();
  } catch (error) {
    console.error('Unable to load README components:', error);
    els.grid.innerHTML =
      '<div class="error-state"><h3>Could not load components.</h3>' +
      '<p>If running locally, generate the catalog first with <code>python3 scripts/build_catalog.py</code> and serve the folder over HTTP.</p>' +
      '<button id="retryCatalog" class="button secondary-button" type="button">Retry</button></div>';
    els.count.textContent = 'Unable to load catalog';
    $('#retryCatalog').addEventListener('click', init, {once: true});
  }
}

init();
