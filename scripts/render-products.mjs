// Génère le HTML des onglets et des cartes produits à partir de src/data/products.json.
import { readFileSync } from 'node:fs';
import path from 'node:path';

const file = path.resolve(import.meta.dirname, '..', 'src', 'data', 'products.json');
const load = () => JSON.parse(readFileSync(file, 'utf8'));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const formatPrice = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);

export function renderThemeTabs() {
  const { themes } = load();
  const tab = (id, label, emoji, selected) =>
    `<button class="tab" role="tab" type="button" id="tab-${id}" data-filter="${id}" aria-selected="${selected}" aria-controls="product-grid" tabindex="${selected ? 0 : -1}"><span aria-hidden="true">${emoji}</span> ${esc(label)}</button>`;
  return [tab('tous', 'Tous', '✨', true), ...themes.map((t) => tab(t.id, t.label, t.emoji, false))].join('\n');
}

export function renderProducts() {
  const { products, themes } = load();
  const themeLabel = Object.fromEntries(themes.map((t) => [t.id, t.label]));
  return products
    .map(
      (p) => `<li class="card reveal" data-theme="${p.theme}">
  <div class="card__media">
    <img src="${esc(p.image)}" alt="${esc(p.alt)}" width="400" height="400" loading="lazy" decoding="async">
    ${p.badge ? `<span class="card__badge">${esc(p.badge)}</span>` : ''}
  </div>
  <div class="card__body">
    <p class="card__theme">${esc(themeLabel[p.theme])}</p>
    <h3 class="card__title">${esc(p.name)}</h3>
    <p class="card__desc">${esc(p.description)}</p>
    <div class="card__foot">
      <p class="card__price">${formatPrice(p.price)}</p>
      <button class="btn btn--small btn--pink" type="button" data-add-to-cart="${p.id}" aria-label="Ajouter ${esc(p.name)} au panier">
        <span class="btn__label">Ajouter</span>
      </button>
    </div>
  </div>
</li>`
    )
    .join('\n');
}
