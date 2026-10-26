// Animations : apparition au scroll, header compact, compteurs, boutons magnétiques,
// pause du hero hors écran. Tout est coupé si prefers-reduced-motion est activé.
// Seuls transform et opacity sont animés (propriétés composées par le GPU → 60 fps).

const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
export const prefersReducedMotion = () => reducedQuery.matches;

/* ---------- Apparition au scroll (fade + translation) ---------- */
function initReveal() {
  const items = document.querySelectorAll('.reveal');

  // Décalage en cascade pour les enfants d'un même groupe
  document.querySelectorAll('[data-stagger]').forEach((group) => {
    [...group.querySelectorAll(':scope > .reveal')].forEach((el, i) => {
      el.style.setProperty('--reveal-delay', `${Math.min(i, 6) * 80}ms`);
    });
  });

  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const el = entry.target;
        el.classList.add('is-visible');
        io.unobserve(el);
        // Une fois apparu, on retire le délai pour que les survols restent réactifs
        el.addEventListener('transitionend', () => el.classList.add('is-settled'), { once: true });
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
  );
  items.forEach((el) => io.observe(el));
}

/* ---------- Header qui se compacte ---------- */
function initHeader() {
  const header = document.querySelector('[data-header]');
  if (!header) return;
  let ticking = false;
  let compact = null;

  const update = () => {
    ticking = false;
    const next = window.scrollY > 40;
    if (next !== compact) {
      compact = next;
      header.classList.toggle('is-compact', next);
    }
  };

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
  update();
}

/* ---------- Chiffres qui défilent ---------- */
const easeOutExpo = (t) => (t === 1 ? 1 : 1 - 2 ** (-10 * t));

function animateCount(el) {
  const target = Number(el.dataset.count);
  const decimals = Number(el.dataset.decimals || 0);
  const fmt = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const duration = 1600;
  let start;

  const frame = (now) => {
    start ??= now;
    const t = Math.min((now - start) / duration, 1);
    el.textContent = fmt.format(target * easeOutExpo(t));
    if (t < 1 && !prefersReducedMotion()) requestAnimationFrame(frame);
    else el.textContent = fmt.format(target);
  };
  requestAnimationFrame(frame);
}

function initCounters() {
  const counters = document.querySelectorAll('[data-count]');
  // La valeur finale est déjà dans le HTML (SEO, sans JS, mouvement réduit)
  if (!counters.length || prefersReducedMotion() || !('IntersectionObserver' in window)) return;

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        io.unobserve(entry.target);
        animateCount(entry.target);
      }
    },
    { threshold: 0.6 }
  );
  counters.forEach((el) => {
    el.textContent = '0';
    io.observe(el);
  });
}

/* ---------- Boutons magnétiques ---------- */
function initMagnetic() {
  const STRENGTH = 0.35; // part du décalage curseur appliquée au bouton
  const LABEL_EXTRA = 0.25; // le texte suit un peu plus → effet de profondeur
  const MAX = 14; // déplacement max en px
  const LERP = 0.2;

  document.querySelectorAll('[data-magnetic]').forEach((btn) => {
    const label = btn.querySelector('.btn__label');
    let rect = null;
    let target = { x: 0, y: 0 };
    let pos = { x: 0, y: 0 };
    let raf = 0;

    const clamp = (v) => Math.max(-MAX, Math.min(MAX, v));
    const render = () => {
      pos.x += (target.x - pos.x) * LERP;
      pos.y += (target.y - pos.y) * LERP;
      btn.style.setProperty('--mx', `${pos.x.toFixed(2)}px`);
      btn.style.setProperty('--my', `${pos.y.toFixed(2)}px`);
      label?.style.setProperty('--lx', `${(pos.x * LABEL_EXTRA).toFixed(2)}px`);
      label?.style.setProperty('--ly', `${(pos.y * LABEL_EXTRA).toFixed(2)}px`);
      const settled = Math.abs(target.x - pos.x) < 0.1 && Math.abs(target.y - pos.y) < 0.1;
      raf = settled ? 0 : requestAnimationFrame(render);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(render);
    };

    btn.addEventListener('pointerenter', () => {
      if (prefersReducedMotion() || !finePointerQuery.matches) return;
      rect = btn.getBoundingClientRect();
      btn.classList.add('is-magnetic');
    });

    btn.addEventListener('pointermove', (e) => {
      if (!rect) return;
      target = {
        x: clamp((e.clientX - (rect.left + rect.width / 2)) * STRENGTH),
        y: clamp((e.clientY - (rect.top + rect.height / 2)) * STRENGTH),
      };
      kick();
    });

    btn.addEventListener('pointerleave', () => {
      if (!rect) return;
      rect = null;
      target = { x: 0, y: 0 };
      // Retour élastique géré en CSS (transition ease-bounce)
      cancelAnimationFrame(raf);
      raf = 0;
      pos = { x: 0, y: 0 };
      btn.classList.remove('is-magnetic');
      ['--mx', '--my'].forEach((p) => btn.style.setProperty(p, '0px'));
      ['--lx', '--ly'].forEach((p) => label?.style.setProperty(p, '0px'));
    });
  });
}

/* ---------- Pause du hero quand il n'est plus visible ---------- */
function initHeroPause() {
  const targets = document.querySelectorAll('[data-hero-bg], .hero__visual');
  if (!targets.length || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) entry.target.classList.toggle('is-paused', !entry.isIntersecting);
  });
  targets.forEach((el) => io.observe(el));
}

/* ---------- Animation d'entrée des cartes filtrées ---------- */
export function popIn(elements) {
  if (prefersReducedMotion()) return;
  elements.forEach((el, i) => {
    el.classList.remove('is-filtered-in');
    el.style.setProperty('--reveal-delay', `${Math.min(i, 8) * 50}ms`);
    void el.offsetWidth; // relance l'animation CSS
    el.classList.add('is-filtered-in', 'is-visible');
  });
}

export function initMotion() {
  initHeader();
  initReveal();
  initCounters();
  initMagnetic();
  initHeroPause();

  // Si l'utilisateur active « réduire les animations » en cours de visite
  reducedQuery.addEventListener('change', (e) => {
    if (!e.matches) return;
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('is-visible'));
    document.querySelectorAll('[data-count]').forEach((el) => {
      el.textContent = new Intl.NumberFormat('fr-FR').format(Number(el.dataset.count));
    });
  });
}
