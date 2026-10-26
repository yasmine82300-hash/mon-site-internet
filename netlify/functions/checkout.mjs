// POST /api/checkout : crée une session de paiement Stripe Checkout.
// Exécutée côté serveur (Netlify Functions) : la clé secrète Stripe reste ici,
// et les prix sont recalculés à partir du catalogue — le navigateur n'envoie
// que des identifiants et des quantités, jamais de montants.
import catalog from '../../src/data/products.json' with { type: 'json' };

const byId = new Map(catalog.products.map((p) => [p.id, p]));
const MAX_QTY = 20;
const MAX_LINES = 30;
const toCents = (euros) => Math.round(euros * 100);

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Méthode non autorisée.' });

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return json(503, { error: 'Le paiement en ligne n’est pas encore activé. Revenez très bientôt !' });

  let items;
  try {
    const body = await req.json();
    items = body?.items;
  } catch {
    return json(400, { error: 'Requête invalide.' });
  }
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_LINES) {
    return json(400, { error: 'Ton panier est vide.' });
  }

  const lines = [];
  for (const { id, qty } of items) {
    const product = byId.get(id);
    if (!product || !Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) {
      return json(400, { error: 'Un article du panier n’est plus disponible.' });
    }
    lines.push({ product, qty });
  }

  // URL du site fournie par Netlify (jamais l'en-tête Origin, pour éviter les redirections piégées)
  const site = (process.env.URL || 'http://localhost:8888').replace(/\/$/, '');
  const subtotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const shipping = subtotal >= catalog.shipping.freeFrom ? 0 : catalog.shipping.price;

  const form = new URLSearchParams({
    mode: 'payment',
    locale: 'fr',
    success_url: `${site}/merci.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/?paiement=annule`,
    'phone_number_collection[enabled]': 'true',
    'shipping_options[0][shipping_rate_data][type]': 'fixed_amount',
    'shipping_options[0][shipping_rate_data][display_name]': shipping ? 'Colissimo suivi' : 'Livraison offerte',
    'shipping_options[0][shipping_rate_data][fixed_amount][amount]': String(toCents(shipping)),
    'shipping_options[0][shipping_rate_data][fixed_amount][currency]': 'eur',
    'shipping_options[0][shipping_rate_data][delivery_estimate][minimum][unit]': 'business_day',
    'shipping_options[0][shipping_rate_data][delivery_estimate][minimum][value]': '2',
    'shipping_options[0][shipping_rate_data][delivery_estimate][maximum][unit]': 'business_day',
    'shipping_options[0][shipping_rate_data][delivery_estimate][maximum][value]': '4',
  });
  ['FR', 'BE', 'CH', 'LU'].forEach((c, i) => form.append(`shipping_address_collection[allowed_countries][${i}]`, c));
  lines.forEach(({ product, qty }, i) => {
    const p = `line_items[${i}]`;
    form.append(`${p}[quantity]`, String(qty));
    form.append(`${p}[price_data][currency]`, 'eur');
    form.append(`${p}[price_data][unit_amount]`, String(toCents(product.price)));
    form.append(`${p}[price_data][product_data][name]`, product.name);
    form.append(`${p}[price_data][product_data][metadata][id]`, product.id);
  });

  try {
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form,
    });
    const session = await res.json();
    if (!res.ok) {
      console.error('Stripe error', session?.error?.message);
      return json(502, { error: 'Le paiement est momentanément indisponible.' });
    }
    return json(200, { url: session.url });
  } catch (err) {
    console.error('Stripe unreachable', err);
    return json(502, { error: 'Le paiement est momentanément indisponible.' });
  }
};
