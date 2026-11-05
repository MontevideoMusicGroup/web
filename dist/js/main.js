'use strict';
/* ═══════════════════════════════════════════════
  NEYRA SERVICIOS — main.js
   Vanilla JS, zero dependencies. 2025 CTO rewrite.
═══════════════════════════════════════════════ */

// ── MOBILE MENU ──────────────────────────────────
const toggle = document.getElementById('navToggle');
const nav    = document.getElementById('mainNav');

const navClose = document.getElementById('navClose');

const openMenu  = () => {
  nav?.classList.add('open');
  document.body.style.overflow = 'hidden';
  toggle?.setAttribute('aria-expanded', 'true');
  if (navClose) navClose.style.display = 'flex';
};
const closeMenu = () => {
  nav?.classList.remove('open');
  document.body.style.overflow = '';
  toggle?.setAttribute('aria-expanded', 'false');
  // Restore focus to hamburger so keyboard users don't get lost
  toggle?.focus();
};

toggle?.addEventListener('click', openMenu);
navClose?.addEventListener('click', closeMenu);
document.querySelectorAll('.nav__list a').forEach(l => l.addEventListener('click', closeMenu));
nav?.addEventListener('click', e => { if (e.target === nav) closeMenu(); });

// ── HEADER SCROLL SHADOW ─────────────────────────
const header = document.querySelector('.header');
window.addEventListener('scroll', () => {
  header?.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

const heroBadge = document.getElementById('heroBadge');
const heroAccent = document.getElementById('heroAccent');
const heroDescription = document.getElementById('heroDescription');
if (heroBadge && heroAccent && heroDescription) {
  fetch('/api/site-content')
    .then(response => response.ok ? response.json() : null)
    .then(content => {
      if (!content) return;
      heroBadge.textContent = content.heroBadge;
      heroAccent.textContent = content.heroAccent;
      heroDescription.textContent = content.heroDescription;
    })
    .catch(() => {});
}

// ── ANIMATED HERO CATEGORIES ─────────────────────
const catEl = document.querySelector('.hero__categories');
if (catEl) {
  const cats = ['HARDWARE Y SOPORTE', 'CIBERSEGURIDAD', 'CONSULTORÍA TECNOLÓGICA', 'CRM Y GESTIÓN', 'SOFTWARE A MEDIDA'];
  let i = 0;
  catEl.textContent = cats[0];
  catEl.style.transition = 'opacity .3s ease, transform .3s ease';

  setInterval(() => {
    catEl.style.opacity = '0';
    catEl.style.transform = 'translateY(-10px)';
    setTimeout(() => {
      catEl.textContent = cats[i = (i + 1) % cats.length];
      catEl.style.opacity = '1';
      catEl.style.transform = 'translateY(0)';
    }, 320);
  }, 2800);
}

// ── HEADER SEARCH AUTOCOMPLETE ─────────────────
const headerSearch = document.querySelector('.header-search');
if (headerSearch) {
  const searchInput = headerSearch.querySelector('input[name="q"]');
  const suggestBox = document.createElement('ul');
  suggestBox.className = 'header-search__suggest';
  suggestBox.setAttribute('role', 'listbox');
  headerSearch.style.position = 'relative';
  headerSearch.appendChild(suggestBox);

  let catalogItems = [];
  let activeIndex = -1;
  fetch('/api/products')
    .then(res => res.ok ? res.json() : [])
    .then(items => { catalogItems = items.filter(p => p.active); })
    .catch(() => {});

  const closeSuggest = () => { suggestBox.innerHTML = ''; suggestBox.classList.remove('open'); activeIndex = -1; };

  const renderSuggest = () => {
    const term = searchInput.value.trim().toLocaleLowerCase('es-AR');
    activeIndex = -1;
    if (term.length < 2) { closeSuggest(); return; }
    const matches = catalogItems
      .filter(p => `${p.name} ${p.brand || ''} ${p.category || ''} ${p.sku || ''}`.toLocaleLowerCase('es-AR').includes(term))
      .slice(0, 6);
    if (!matches.length) { closeSuggest(); return; }
    suggestBox.innerHTML = matches.map((p, i) => `
      <li role="option" data-index="${i}">
        <a href="/tienda/product.html?id=${encodeURIComponent(p.id)}">
          <span class="suggest-name">${p.name.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>
          <span class="suggest-cat">${p.category || ''}</span>
        </a>
      </li>`).join('');
    suggestBox.classList.add('open');
    suggestBox.dataset.count = matches.length;
  };

  searchInput.addEventListener('input', renderSuggest);
  searchInput.addEventListener('focus', renderSuggest);
  searchInput.addEventListener('keydown', e => {
    const options = [...suggestBox.querySelectorAll('li')];
    if (!options.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = e.key === 'ArrowDown'
        ? (activeIndex + 1) % options.length
        : (activeIndex - 1 + options.length) % options.length;
      options.forEach((li, i) => li.classList.toggle('active', i === activeIndex));
      options[activeIndex].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      options[activeIndex].querySelector('a').click();
    } else if (e.key === 'Escape') {
      closeSuggest();
    }
  });
  document.addEventListener('click', e => { if (!headerSearch.contains(e.target)) closeSuggest(); });
}

// ── HOME PRODUCT RAILS ─────────────────────────
const railOffersEl = document.getElementById('homeOffers');
const railNewEl = document.getElementById('homeNew');
if (railOffersEl || railNewEl) {
  const railCurrency = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
  const escapeRail = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const railImage = product => {
    const image = String(product.image || '');
    if (/^media\/store\/[a-zA-Z0-9._-]+$/.test(image)) {
      return `<img src="/${escapeRail(image)}" alt="${escapeRail(product.name)}" loading="lazy" decoding="async">`;
    }
    return '<span class="rail-card__placeholder">Foto no disponible</span>';
  };
  const railCard = product => {
    const onSale = Boolean(product.saleActive && !product.isSample);
    const price = Number(onSale ? product.effectivePrice : product.price) || 0;
    const regular = Number(product.price) || 0;
    const discount = onSale && regular > 0 ? Math.round((1 - price / regular) * 100) : 0;
    return `<a class="rail-card" href="/tienda/product.html?id=${encodeURIComponent(product.id)}" aria-label="Ver ${escapeRail(product.name)}">
      <div class="rail-card__art">
        ${onSale ? `<span class="rail-card__badge">-${discount}%</span>` : ''}
        ${railImage(product)}
      </div>
      <div class="rail-card__body">
        <span class="rail-card__name">${escapeRail(product.name)}</span>
        <span class="rail-card__price">${onSale ? `<s>${railCurrency.format(regular)}</s> ` : ''}${price ? railCurrency.format(price) : 'Consultar'}</span>
      </div>
    </a>`;
  };
  const renderRail = (el, items) => {
    const section = el?.closest('.catalog-rail');
    if (!el || !section) return;
    if (!items.length) { section.hidden = true; return; }
    el.innerHTML = items.map(railCard).join('');
  };
  fetch('/api/products')
    .then(res => res.ok ? res.json() : [])
    .then(items => {
      const active = items.filter(p => p.active);
      renderRail(railOffersEl, active.filter(p => p.saleActive && !p.isSample).slice(0, 8));
      renderRail(railNewEl, [...active].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 8));
    })
    .catch(() => {});
}

// ── STATS COUNTER ANIMATION ──────────────────────
function countUp(el, target, dur = 1600) {
  const start  = performance.now();
  const suffix = el.dataset.suffix || '';
  const step   = ts => {
    const p    = Math.min((ts - start) / dur, 1);
    const ease = 1 - Math.pow(1 - p, 3);            // ease-out cubic
    el.textContent = Math.floor(ease * target) + suffix;
    p < 1 ? requestAnimationFrame(step) : (el.textContent = target + suffix);
  };
  requestAnimationFrame(step);
}

const statObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    countUp(e.target, +e.target.dataset.target);
    statObs.unobserve(e.target);
  });
}, { threshold: 0.5 });

document.querySelectorAll('[data-target]').forEach(el => statObs.observe(el));

// ── SCROLL FADE-IN ───────────────────────────────
const fadeObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      fadeObs.unobserve(e.target);
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

document.querySelectorAll('.fade-in').forEach(el => fadeObs.observe(el));

// ── LIGHTBOX ─────────────────────────────────────
const lb    = document.getElementById('lightbox');
const lbImg = document.getElementById('lbImg');

if (lb && lbImg) {
  let lbOpener = null; // Track which element opened the lightbox for focus-return

  const onLbKey = e => { if (e.key === 'Escape') closeLb(); };

  document.querySelectorAll('[data-lb]').forEach(item => {
    item.addEventListener('click', () => {
      lbOpener = item;
      lbImg.src = item.dataset.lb;
      lbImg.alt = item.querySelector('img')?.alt || 'Imagen ampliada';
      lb.classList.add('active');
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', onLbKey);
      // Move focus to close button for keyboard users
      setTimeout(() => document.getElementById('lbClose')?.focus(), 50);
    });
  });

  const closeLb = () => {
    lb.classList.remove('active');
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onLbKey); // cleanup
    setTimeout(() => { lbImg.src = ''; }, 400);
    lbOpener?.focus(); // Return focus to trigger element
    lbOpener = null;
  };

  document.getElementById('lbClose')?.addEventListener('click', closeLb);
  lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
}

// ── CONTACT FORM (FormSubmit.co) ─────────────────
const form = document.getElementById('contactForm');
const phoneInput = document.getElementById('telefono');
const phoneStatus = document.getElementById('telefonoStatus');
const normalizedPhoneInput = document.getElementById('telefonoNormalizado');

function normalizeArgentinePhone(value) {
  const raw = String(value || '').trim();
  if (!raw) return { valid: false, normalized: '', incomplete: false, message: '' };

  let digits = raw.replace(/\D/g, '');
  if (!digits) return { valid: false, normalized: '', incomplete: true, message: 'Ingresá un número de contacto.' };
  if (digits.length < 6) return { valid: false, normalized: '', incomplete: true, message: '' };

  if (digits.startsWith('54')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.slice(1);

  const validArgentine = /^(?:[1-9]\d{2}\d{7,8}|9[1-9]\d{9})$/.test(digits);
  if (!validArgentine) {
    return {
      valid: false,
      normalized: '',
      incomplete: digits.length < 10,
      message: digits.length < 10 ? 'Ingresá el código de área y el número completo.' : 'El número no corresponde a un formato argentino válido.'
    };
  }

  return {
    valid: true,
    normalized: `+54${digits}`,
    incomplete: false,
    message: 'Número argentino válido.'
  };
}

function updatePhoneStatus(forceError = false) {
  if (!phoneInput || !phoneStatus) return;
  const value = phoneInput.value.trim();
  if (!value) {
    if (normalizedPhoneInput) normalizedPhoneInput.value = '';
    phoneStatus.textContent = '';
    phoneStatus.classList.remove('is-ok', 'is-error');
    phoneInput.setAttribute('aria-invalid', 'false');
    return;
  }

  const digits = value.replace(/\D/g, '');
  if (digits.length < 6) {
    if (normalizedPhoneInput) normalizedPhoneInput.value = '';
    phoneStatus.textContent = '';
    phoneStatus.classList.remove('is-ok', 'is-error');
    phoneInput.setAttribute('aria-invalid', 'false');
    return;
  }

  const result = normalizeArgentinePhone(value);
  const hasError = !result.valid && (forceError || (!result.incomplete && digits.length >= 6));
  const valid = result.valid;
  const message = result.message;
  if (normalizedPhoneInput) normalizedPhoneInput.value = valid ? result.normalized : '';
  phoneStatus.textContent = hasError ? message : valid ? 'Número válido.' : '';
  phoneStatus.classList.toggle('is-ok', valid && !hasError);
  phoneStatus.classList.toggle('is-error', hasError);
  phoneInput.setAttribute('aria-invalid', String(hasError));
}

if (phoneInput) {
  phoneInput.addEventListener('input', () => updatePhoneStatus(false));
  phoneInput.addEventListener('blur', () => updatePhoneStatus(true));
}

if (form) {
  form.addEventListener('submit', async e => {
    const phoneValue = phoneInput?.value || '';
    if (phoneValue && !normalizeArgentinePhone(phoneValue).valid) {
      e.preventDefault();
      updatePhoneStatus(true);
      phoneInput?.focus();
      return;
    }
    if (phoneValue && normalizedPhoneInput) normalizedPhoneInput.value = normalizeArgentinePhone(phoneValue).normalized;

    e.preventDefault();
    const btn = form.querySelector('.submit-btn');
    const msg = form.querySelector('.form-msg');

    btn.disabled    = true;
    btn.textContent = '⏳ Enviando…';

    try {
      const res = await fetch(form.action, {
        method:  'POST',
        body:    new FormData(form),
        headers: { Accept: 'application/json' }
      });

      if (res.ok) {
        msg.className   = 'form-msg ok';
        msg.textContent = '✅ ¡Mensaje recibido! Te contactamos muy pronto.';
        form.reset();
        if (normalizedPhoneInput) normalizedPhoneInput.value = '';
        if (phoneStatus) {
          phoneStatus.textContent = '';
          phoneStatus.classList.remove('is-ok', 'is-error');
        }
      } else {
        throw new Error('server');
      }
    } catch {
      msg.className   = 'form-msg err';
      msg.textContent = '❌ No se pudo enviar. Escríbenos directo por WhatsApp 👇';
    } finally {
      btn.disabled    = false;
      btn.textContent = 'Enviar consulta';
    }
  });
}

const themeToggle = document.getElementById('themeToggle');
const applyTheme = theme => {
  const current = theme === 'dark' ? 'dark' : 'light';
  document.body.dataset.theme = current;
  if (themeToggle) {
    themeToggle.setAttribute('aria-pressed', String(current === 'dark'));
    themeToggle.setAttribute('aria-label', current === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
    themeToggle.innerHTML = current === 'dark' ? '<span aria-hidden="true">☀️</span>' : '<span aria-hidden="true">🌙</span>';
  }
};

const savedTheme = localStorage.getItem('neyra-theme');
if (savedTheme) {
  applyTheme(savedTheme);
} else {
  applyTheme('light');
}

themeToggle?.addEventListener('click', () => {
  const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('neyra-theme', nextTheme);
  applyTheme(nextTheme);
});

// ── GALLERY KEYBOARD ACCESS (WCAG 2.1.1) ─────────
document.querySelectorAll('[data-lb]').forEach(item => {
  item.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      item.click();
    }
  });
});
