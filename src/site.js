/* Site-wide behaviour: reveal, scroll-linked effects, menus, glass nav, card tilt.
   Everything here is progressive enhancement. */

const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

/* ---------- Reveal on scroll ---------- */
function setupReveal() {
  const items = document.querySelectorAll('.reveal, .reveal-load');
  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  items.forEach((el) => {
    if (el.classList.contains('reveal-load')) {
      // Hero items are shown on load, not by scroll.
      requestAnimationFrame(() => el.classList.add('in'));
    } else {
      io.observe(el);
    }
  });
}

/* ---------- Scroll-linked effects ---------- */
function setupScroll() {
  const header = document.querySelector('.site-header');
  const bar = document.getElementById('progressBar');
  const ribbon = document.getElementById('ribbonTrack');
  const timeline = document.getElementById('timeline');
  const timelineFill = document.getElementById('timelineFill');
  let half = 0;
  let ticking = false;

  const measure = () => {
    if (ribbon && ribbon.firstElementChild) half = ribbon.firstElementChild.getBoundingClientRect().width;
  };
  measure();
  window.addEventListener('resize', measure);

  const update = () => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    header && header.classList.toggle('scrolled', y > 8);
    root.style.setProperty('--sy', String(Math.min(y, 1200)));
    if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0).toFixed(4) + ')';

    if (ribbon && half && !reduceMotion.matches) {
      ribbon.style.transform = 'translate3d(' + (-((y * 0.45) % half)).toFixed(1) + 'px,0,0)';
    }

    if (timeline && timelineFill) {
      const r = timeline.getBoundingClientRect();
      const p = (window.innerHeight * 0.7 - r.top) / r.height;
      timelineFill.style.transform = 'scaleY(' + Math.min(1, Math.max(0, p)).toFixed(4) + ')';
    }
    ticking = false;
  };

  const request = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  update();
}

/* ---------- Desktop menu window (slime open/close) ---------- */
function setupMenu() {
  const toggle = document.getElementById('menuToggle');
  const menu = document.getElementById('mobileNav');
  if (!toggle || !menu) return;

  const setOpen = (open) => {
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    toggle.classList.toggle('is-open', open);
  };

  // main.js owns the click toggle; we only add outside-click and Escape handling.
  document.addEventListener('click', (event) => {
    if (menu.hidden) return;
    if (menu.contains(event.target) || toggle.contains(event.target)) return;
    setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !menu.hidden) {
      setOpen(false);
      toggle.focus();
    }
  });
  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) setOpen(false);
  });
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('is-open', toggle.getAttribute('aria-expanded') === 'true');
  });
}

/* ---------- Mobile glass navigation ---------- */
function setupGlassNav() {
  const nav = document.querySelector('.glass-nav');
  if (!nav) return;
  const links = Array.from(nav.querySelectorAll('[data-nav]'));

  const setActive = (key) => {
    const idx = links.findIndex((link) => link.dataset.nav === key);
    if (idx < 0) return;
    links.forEach((link) => link.classList.toggle('active', link.dataset.nav === key));
    nav.style.setProperty('--gi', String(idx));
  };

  const sections = ['top', 'explore', 'repo', 'compose'].map((id) => document.getElementById(id)).filter(Boolean);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { threshold: 0, rootMargin: '-45% 0px -45% 0px' });
    sections.forEach((s) => io.observe(s));
  }
  setActive('top');

  // Edge light: the highlight follows the finger/pointer along the glass border.
  nav.addEventListener('pointermove', (event) => {
    const r = nav.getBoundingClientRect();
    nav.style.setProperty('--lx', (((event.clientX - r.left) / r.width) * 100).toFixed(1) + '%');
    nav.style.setProperty('--ly', (((event.clientY - r.top) / r.height) * 100).toFixed(1) + '%');
  }, { passive: true });
}

/* ---------- Catalog cards: stagger and 3D tilt ---------- */
function setupCards() {
  const grid = document.getElementById('catalogGrid');
  if (!grid) return;
  new MutationObserver(() => {
    Array.from(grid.children).forEach((card, i) => card.style.setProperty('--i', String(Math.min(i, 10))));
  }).observe(grid, { childList: true });

  if (!finePointer.matches || reduceMotion.matches) return;
  grid.addEventListener('pointermove', (event) => {
    const card = event.target.closest('.component-card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    const px = (event.clientX - r.left) / r.width;
    const py = (event.clientY - r.top) / r.height;
    card.style.setProperty('--ry', ((px - 0.5) * 8).toFixed(2) + 'deg');
    card.style.setProperty('--rx', ((0.5 - py) * 6).toFixed(2) + 'deg');
  });
  grid.addEventListener('pointerout', (event) => {
    const card = event.target.closest('.component-card');
    if (!card || (event.relatedTarget && card.contains(event.relatedTarget))) return;
    card.style.setProperty('--rx', '0deg');
    card.style.setProperty('--ry', '0deg');
  });
}

function init() {
  root.classList.add('js');
  setupReveal();
  setupScroll();
  setupMenu();
  setupGlassNav();
  setupCards();
}
init();
