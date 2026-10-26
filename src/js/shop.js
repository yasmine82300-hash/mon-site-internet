import { popIn } from './motion.js';

// Onglets de filtre par thème (motif ARIA « tabs », navigation au clavier)
export function initShop() {
  const tablist = document.querySelector('[data-tabs]');
  const grid = document.querySelector('[data-product-grid]');
  if (!tablist || !grid) return;
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const cards = [...grid.children];

  const select = (tab, focus = false) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
    });
    if (focus) tab.focus();
    grid.setAttribute('aria-labelledby', tab.id);

    const filter = tab.dataset.filter;
    const shown = [];
    cards.forEach((card) => {
      const visible = filter === 'tous' || card.dataset.theme === filter;
      card.hidden = !visible;
      if (visible) shown.push(card);
    });
    popIn(shown);
  };

  tablist.addEventListener('click', (e) => {
    const tab = e.target.closest('[role="tab"]');
    if (tab && tab.getAttribute('aria-selected') !== 'true') select(tab);
  });

  tablist.addEventListener('keydown', (e) => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const moves = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
    if (!(e.key in moves)) return;
    e.preventDefault();
    select(tabs[(moves[e.key] + tabs.length) % tabs.length], true);
  });
}
