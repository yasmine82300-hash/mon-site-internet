# 🍭 Squishlandy

Boutique en ligne de squishies pour enfants : site statique ultra-rapide (Vite + HTML/CSS/JS), paiement Stripe via une fonction serveur Netlify.

## 🚀 Lancer le site sur ton ordinateur

Prérequis : [Node.js](https://nodejs.org) 20 ou plus.

```bash
npm install        # une seule fois
npm run dev        # ouvre http://localhost:5173 (rechargement automatique)
```

Autres commandes :

| Commande | Rôle |
|---|---|
| `npm run build` | Construit le site dans `dist/`, génère `sitemap.xml` et `robots.txt`, **vérifie tous les liens** |
| `npm run preview` | Affiche la version construite |
| `npm run images` | Régénère logo, favicons, image réseaux sociaux et compresse les photos produits |
| `npm run check:links` | Vérifie à nouveau les liens de `dist/` |

> Le paiement ne fonctionne pas avec `npm run dev` (c'est une fonction serveur). Pour le tester en local : `npx netlify-cli dev` avec la variable `STRIPE_SECRET_KEY` (clé de **test**).

## 🧸 Remplacer les produits fictifs par les vrais

1. Mets tes photos dans un dossier `photos/` à la racine, **nommées avec l'identifiant du produit** (ex. `photos/fraisy-la-fraise.jpg`).
2. Lance `npm run images` : elles sont recadrées en carré, compressées en WebP et copiées dans `public/img/produits/`.
3. Ouvre `src/data/products.json` et, pour chaque produit, modifie :
   - `name`, `price` (en euros, ex. `9.9`), `description`, `theme`, `badge` (facultatif)
   - `image` → `/img/produits/fraisy-la-fraise.webp`
   - `alt` → une phrase qui décrit la photo (important pour l'accessibilité et le référencement)
4. Pour ajouter un produit, copie un bloc et change son `id` (minuscules, sans espaces ni accents).
5. Les thèmes (onglets) se modifient dans la liste `themes` du même fichier.

Le site **et** le paiement lisent ce même fichier : les prix ne peuvent pas être modifiés depuis le navigateur.

## 🌍 Mettre en ligne (Netlify, gratuit)

1. Crée un compte sur [netlify.com](https://www.netlify.com) → *Add new site* → *Import from GitHub* → choisis ce dépôt. Les réglages de build sont lus dans `netlify.toml`.
2. *Site configuration → Environment variables* : ajoute `STRIPE_SECRET_KEY` (clé secrète Stripe, `sk_test_…` pour tester, puis `sk_live_…`).
3. *Domain management* : branche ton nom de domaine. Le certificat HTTPS est automatique.
4. Remplace `squishlandy.fr` par ton domaine dans **`.env`** et **`netlify.toml`** (redirections).

## ✅ Checklist intégrée

| Point | Où / comment |
|---|---|
| RGPD | `confidentialite.html` : données, durées, droits, cookies |
| CGU / CGV / Mentions légales | `cgu.html`, `cgv.html` (rétractation 14 jours, garanties), `mentions-legales.html` |
| API hors front-end | `netlify/functions/checkout.mjs` : clé Stripe côté serveur, prix recalculés côté serveur |
| HTTPS forcé | `netlify.toml` : redirections 301 + HSTS + en-têtes de sécurité (CSP stricte…) |
| Bannière cookies | Conforme CNIL : « Tout refuser » aussi visible qu'« Accepter », choix gardé 6 mois, lien « Gérer les cookies » |
| Meta title / description | Une balise par page + canonical |
| Image réseaux sociaux | `public/img/og-image.jpg` (1200×630, Open Graph + Twitter) |
| Favicon | `.ico`, PNG, Apple touch, manifest |
| Sitemap + robots.txt | Générés à chaque build depuis `VITE_SITE_URL` |
| Textes alternatifs | Sur chaque image ; le build échoue si un `alt` manque |
| Compression images | AVIF/WebP + PNG de secours, plusieurs tailles, chargement différé |
| Vitesse | ~6 Ko de JS et ~5,5 Ko de CSS (gzip), polices auto-hébergées, cache long |
| Contraste | Tous les textes ≥ WCAG AA (texte principal 12,8:1) |
| Responsive | Mobile d'abord, produits sur 2 colonnes, onglets défilants |
| Page 404 | `404.html`, servie automatiquement par Netlify |
| Liens cassés | Vérifiés à chaque `npm run build` |

### Animations
Apparition au scroll, header qui se compacte, dégradé animé du hero (mis en pause hors écran), boutons magnétiques, compteurs animés. Seuls `transform` et `opacity` sont animés (60 fps), et **tout est désactivé** si le système demande de réduire les animations (`prefers-reduced-motion`).

## ⚠️ À faire avant l'ouverture

- [ ] Compléter les zones surlignées en jaune dans les pages légales (SIRET, adresse, médiateur…) et les faire relire.
- [ ] **Remplacer les avis clients fictifs** de la page d'accueil par de vrais avis (publier des avis inventés est interdit).
- [ ] Vérifier les mentions de sécurité (marquage CE, norme EN 71, âge minimum) avec les fiches de tes fournisseurs.
- [ ] Remplacer l'adresse `bonjour@squishlandy.fr` si besoin.

## 🎨 Skills de design installés

`.claude/skills/` contient **Impeccable** et **UI UX Pro Max** (voir `.claude/skills/SOURCES.md`). Dans Claude Code : `/impeccable audit`, `/impeccable polish`, `/ui-ux-pro-max`…
