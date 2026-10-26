// Après le build : génère dist/sitemap.xml et dist/robots.txt
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const env = readFileSync(path.join(root, '.env'), 'utf8');
const site = (process.env.VITE_SITE_URL || env.match(/^VITE_SITE_URL=(.+)$/m)?.[1] || '').trim().replace(/\/$/, '');
if (!site) throw new Error('VITE_SITE_URL manquant dans .env');

const today = new Date().toISOString().slice(0, 10);
const pages = readdirSync(dist)
  .filter((f) => f.endsWith('.html'))
  // Les pages en noindex (404, merci) n'ont rien à faire dans le sitemap
  .filter((f) => !/<meta name="robots" content="noindex"/.test(readFileSync(path.join(dist, f), 'utf8')))
  .map((f) => ({ loc: f === 'index.html' ? `${site}/` : `${site}/${f}`, priority: f === 'index.html' ? '1.0' : '0.3' }));

writeFileSync(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url><loc>${p.loc}</loc><lastmod>${today}</lastmod><priority>${p.priority}</priority></url>`).join('\n')}
</urlset>
`
);
writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`);
console.log(`✅ sitemap.xml (${pages.length} pages) et robots.txt générés pour ${site}`);
