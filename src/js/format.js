const fmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
export const formatPrice = (n) => fmt.format(n);

// Lecture/écriture localStorage protégées (navigation privée, stockage bloqué…)
export function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStore(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage indisponible : le site reste utilisable pour la visite en cours */
  }
}

let liveRegion;
export function announce(message) {
  if (!liveRegion) {
    liveRegion = document.createElement('p');
    liveRegion.className = 'visually-hidden';
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    document.body.append(liveRegion);
  }
  liveRegion.textContent = '';
  requestAnimationFrame(() => (liveRegion.textContent = message));
}
