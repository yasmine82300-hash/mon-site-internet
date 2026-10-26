import '../styles/main.css';
import { initMotion } from './motion.js';
import { initCart, clearCart } from './cart.js';
import { initShop } from './shop.js';
import { initCookies } from './cookies.js';

function initNav() {
  const toggle = document.querySelector('[data-nav-toggle]');
  const menu = document.getElementById('nav-menu');
  if (!toggle || !menu) return;
  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', open);
    menu.classList.toggle('is-open', open);
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => e.target.closest('a') && setOpen(false));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && setOpen(false));
  document.addEventListener('click', (e) => !e.target.closest('.nav') && setOpen(false));
}

document.querySelectorAll('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));

initNav();
initMotion();
initCart();
initShop();
initCookies();

// Page de remerciement : la commande est payée, on vide le panier
if (document.body.dataset.page === 'merci' && new URLSearchParams(location.search).has('session_id')) {
  clearCart();
}
