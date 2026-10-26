import { readStore, writeStore } from './format.js';

// Consentement conforme aux recommandations CNIL :
// - refuser est aussi simple qu'accepter ;
// - rien de non essentiel n'est chargé sans accord ;
// - le choix est conservé 6 mois puis redemandé ;
// - il reste modifiable à tout moment (« Gérer les cookies » en pied de page).
const KEY = 'squishlandy-consent';
const VERSION = 1;
const MAX_AGE = 1000 * 60 * 60 * 24 * 182; // ≈ 6 mois

function getConsent() {
  const c = readStore(KEY, null);
  if (!c || c.v !== VERSION || Date.now() - c.date > MAX_AGE) return null;
  return c;
}

// Branche ici un outil de mesure d'audience (ex. Plausible, Matomo) si besoin.
// Il ne sera chargé qu'après consentement explicite.
function applyConsent(consent) {
  document.dispatchEvent(new CustomEvent('consent:change', { detail: consent }));
  if (consent.analytics) {
    // loadAnalytics();
  }
}

export function initCookies() {
  const banner = document.querySelector('[data-cookie-banner]');
  if (!banner) return;
  const prefs = banner.querySelector('[data-cookie-prefs]');
  const analytics = banner.querySelector('[data-cookie-analytics]');
  const customize = banner.querySelector('[data-cookie-customize]');
  const saveBtn = banner.querySelector('[data-cookie-save]');

  const show = () => {
    const current = getConsent();
    analytics.checked = Boolean(current?.analytics);
    banner.hidden = false;
  };
  const hide = () => {
    banner.hidden = true;
    prefs.hidden = true;
    saveBtn.hidden = true;
    customize.hidden = false;
    customize.setAttribute('aria-expanded', 'false');
  };
  const decide = (choice) => {
    const consent = { v: VERSION, date: Date.now(), analytics: Boolean(choice.analytics) };
    writeStore(KEY, consent);
    applyConsent(consent);
    hide();
  };

  banner.querySelector('[data-cookie-accept]').addEventListener('click', () => decide({ analytics: true }));
  banner.querySelector('[data-cookie-reject]').addEventListener('click', () => decide({ analytics: false }));
  saveBtn.addEventListener('click', () => decide({ analytics: analytics.checked }));
  customize.addEventListener('click', () => {
    prefs.hidden = false;
    saveBtn.hidden = false;
    customize.hidden = true;
    customize.setAttribute('aria-expanded', 'true');
    analytics.focus();
  });

  document.querySelectorAll('[data-cookie-settings]').forEach((btn) =>
    btn.addEventListener('click', () => {
      show();
      banner.querySelector('[data-cookie-reject]').focus();
    })
  );

  const consent = getConsent();
  if (consent) applyConsent(consent);
  else show();
}
