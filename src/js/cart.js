import catalog from '../data/products.json';
import { announce, formatPrice, readStore, writeStore } from './format.js';

const STORE_KEY = 'squishlandy-cart';
const MAX_QTY = 20;
const byId = Object.fromEntries(catalog.products.map((p) => [p.id, p]));
const { price: SHIPPING_PRICE, freeFrom: FREE_FROM } = catalog.shipping;

// Panier = { idProduit: quantité }, on ignore tout produit qui n'existe plus
let cart = Object.fromEntries(
  Object.entries(readStore(STORE_KEY, {})).filter(([id, q]) => byId[id] && Number.isInteger(q) && q > 0)
);

const $ = (sel) => document.querySelector(sel);
const els = {};

const count = () => Object.values(cart).reduce((a, b) => a + b, 0);
const subtotal = () => Object.entries(cart).reduce((sum, [id, q]) => sum + byId[id].price * q, 0);

function save() {
  writeStore(STORE_KEY, cart);
  render();
}

export function addToCart(id) {
  if (!byId[id]) return;
  cart[id] = Math.min((cart[id] || 0) + 1, MAX_QTY);
  save();
  els.button?.classList.remove('is-bumping');
  void els.button?.offsetWidth;
  els.button?.classList.add('is-bumping');
  announce(`${byId[id].name} ajouté au panier. ${count()} article${count() > 1 ? 's' : ''} au total.`);
}

function setQty(id, qty) {
  if (qty <= 0) delete cart[id];
  else cart[id] = Math.min(qty, MAX_QTY);
  save();
}

export function clearCart() {
  cart = {};
  save();
}

function render() {
  const n = count();
  els.count.textContent = n;
  els.button.setAttribute('aria-label', `Ouvrir le panier, ${n} article${n > 1 ? 's' : ''}`);

  const items = Object.entries(cart);
  els.empty.hidden = items.length > 0;
  els.summary.hidden = items.length === 0;

  els.items.replaceChildren(
    ...items.map(([id, qty]) => {
      const p = byId[id];
      const li = document.createElement('li');
      li.className = 'cart-item';
      li.innerHTML = `
        <img src="${p.image}" alt="" width="72" height="72">
        <div>
          <p class="cart-item__name"></p>
          <p class="cart-item__price">${formatPrice(p.price)}</p>
          <div class="qty">
            <button type="button" data-qty="-1" aria-label="Retirer un ${p.name}">−</button>
            <output aria-label="Quantité">${qty}</output>
            <button type="button" data-qty="1" aria-label="Ajouter un ${p.name}">+</button>
          </div>
        </div>
        <button class="cart-item__remove" type="button" data-remove aria-label="Supprimer ${p.name} du panier">×</button>`;
      li.querySelector('.cart-item__name').textContent = p.name;
      li.dataset.id = id;
      return li;
    })
  );

  const sub = subtotal();
  const shipping = sub >= FREE_FROM || sub === 0 ? 0 : SHIPPING_PRICE;
  els.subtotal.textContent = formatPrice(sub);
  els.shipping.textContent = shipping ? formatPrice(shipping) : 'Offerte 🎉';
  els.total.textContent = formatPrice(sub + shipping);
  els.hint.textContent =
    sub === 0 ? '' : sub >= FREE_FROM ? '🎉 Bravo, la livraison est offerte !' : `Plus que ${formatPrice(FREE_FROM - sub)} pour la livraison offerte 🚚`;
}

/* ---------- Ouverture / fermeture du tiroir (accessible) ---------- */
let lastFocus = null;

function openCart() {
  lastFocus = document.activeElement;
  els.drawer.hidden = false;
  els.backdrop.hidden = false;
  void els.drawer.offsetWidth;
  els.drawer.classList.add('is-open');
  els.backdrop.classList.add('is-open');
  document.body.classList.add('is-locked');
  els.drawer.querySelector('[data-cart-close]').focus();
  document.addEventListener('keydown', onKeydown);
}

function closeCart() {
  if (els.drawer.hidden) return;
  els.drawer.classList.remove('is-open');
  els.backdrop.classList.remove('is-open');
  document.body.classList.remove('is-locked');
  document.removeEventListener('keydown', onKeydown);
  const hide = () => {
    els.drawer.hidden = true;
    els.backdrop.hidden = true;
  };
  setTimeout(hide, 460);
  lastFocus?.focus?.();
}

function onKeydown(e) {
  if (e.key === 'Escape') return closeCart();
  if (e.key !== 'Tab') return;
  const focusables = [...els.drawer.querySelectorAll('a[href], button:not([disabled]), input:not([disabled])')].filter(
    (el) => el.offsetParent !== null
  );
  const first = focusables[0];
  const last = focusables.at(-1);
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

/* ---------- Paiement : délégué à la fonction serveur ---------- */
async function checkout() {
  els.message.textContent = '';
  if (!els.terms.checked) {
    els.message.textContent = 'Merci d’accepter les conditions générales de vente pour continuer.';
    els.terms.focus();
    return;
  }
  els.checkout.disabled = true;
  els.message.textContent = 'Redirection vers le paiement sécurisé…';
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: Object.entries(cart).map(([id, qty]) => ({ id, qty })) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) throw new Error(data.error || 'Le paiement est momentanément indisponible.');
    window.location.assign(data.url);
  } catch (err) {
    els.message.textContent =
      err instanceof TypeError || err instanceof SyntaxError ? 'Le paiement est momentanément indisponible. Réessaie dans un instant.' : err.message;
    els.checkout.disabled = false;
  }
}

export function initCart() {
  els.drawer = $('#cart');
  if (!els.drawer) return;
  Object.assign(els, {
    backdrop: $('.cart-backdrop'),
    button: $('[data-cart-open]'),
    count: $('[data-cart-count]'),
    items: $('[data-cart-items]'),
    empty: $('[data-cart-empty]'),
    summary: $('[data-cart-summary]'),
    subtotal: $('[data-cart-subtotal]'),
    shipping: $('[data-cart-shipping]'),
    total: $('[data-cart-total]'),
    hint: $('[data-cart-hint]'),
    terms: $('[data-cart-terms]'),
    checkout: $('[data-checkout]'),
    message: $('[data-cart-message]'),
  });

  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add-to-cart]');
    if (add) {
      addToCart(add.dataset.addToCart);
      const label = add.querySelector('.btn__label');
      if (label && !add.dataset.busy) {
        add.dataset.busy = '1';
        const prev = label.textContent;
        label.textContent = 'Ajouté ✓';
        setTimeout(() => {
          label.textContent = prev;
          delete add.dataset.busy;
        }, 1200);
      }
      return;
    }
    if (e.target.closest('[data-cart-open]')) return openCart();
    if (e.target.closest('[data-cart-close]')) return closeCart();

    const item = e.target.closest('.cart-item');
    if (!item) return;
    const id = item.dataset.id;
    const step = e.target.closest('[data-qty]');
    if (step) setQty(id, cart[id] + Number(step.dataset.qty));
    if (e.target.closest('[data-remove]')) setQty(id, 0);
  });

  els.checkout.addEventListener('click', checkout);

  // Synchronise le panier entre plusieurs onglets ouverts
  window.addEventListener('storage', (e) => {
    if (e.key !== STORE_KEY) return;
    cart = readStore(STORE_KEY, {});
    render();
  });

  // Retour depuis Stripe sans payer
  if (new URLSearchParams(location.search).get('paiement') === 'annule') {
    openCart();
    els.message.textContent = 'Paiement annulé : ton panier t’attend toujours 💕';
  }

  render();
}
