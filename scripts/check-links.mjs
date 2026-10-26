// Vérifie tous les liens et ressources internes du site construit (dist/) :
// fichiers manquants, ancres (#id) inexistantes, attributs alt oubliés.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const site = (readFileSync(path.join(root, '.env'), 'utf8').match(/^VITE_SITE_URL=(.+)$/m)?.[1] || '').trim().replace(/\/$/, '');
const pages = readdirSync(dist).filter((f) => f.endsWith('.html'));
const html = Object.fromEntries(pages.map((p) => [p, readFileSync(path.join(dist, p), 'utf8')]));
const ids = Object.fromEntries(pages.map((p) => [p, new Set([...html[p].matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))]));

const errors = [];
const external = new Set();

for (const page of pages) {
  const src = html[page];
  const refs = [
    ...[...src.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((m) => m[1]),
    ...[...src.matchAll(/\ssrcset="([^"]+)"/g)].flatMap((m) => m[1].split(',').map((s) => s.trim().split(/\s+/)[0])),
  ];

  for (let ref of refs) {
    if (/^(mailto:|tel:|data:)/.test(ref)) continue;
    // Les URL absolues vers notre propre domaine (canonical, og:url…) sont vérifiées comme internes
    if (site && ref.startsWith(site)) ref = ref.slice(site.length) || '/';
    if (/^https?:\/\//.test(ref)) {
      if (!ref.includes('%VITE_')) external.add(ref);
      else errors.push(`${page} : variable non remplacée → ${ref}`);
      continue;
    }
    const [rawPath, hash] = ref.split('#');
    const cleanPath = rawPath.split('?')[0];
    let target = page;
    if (cleanPath) {
      target = cleanPath.startsWith('/') ? cleanPath.slice(1) : path.posix.join(path.posix.dirname(page), cleanPath);
      if (target === '' || target.endsWith('/')) target += 'index.html';
      const abs = path.join(dist, target);
      if (!existsSync(abs) || statSync(abs).isDirectory()) {
        errors.push(`${page} : lien cassé → ${ref}`);
        continue;
      }
    }
    if (hash && target.endsWith('.html') && !ids[target]?.has(hash)) {
      errors.push(`${page} : ancre introuvable → ${ref}`);
    }
  }

  for (const [tag] of src.matchAll(/<img\b[^>]*>/g)) {
    if (!/\salt="/.test(tag)) errors.push(`${page} : image sans attribut alt → ${tag.slice(0, 80)}…`);
  }
}

console.log(`🔗 ${pages.length} pages vérifiées, ${external.size} liens externes (non testés) :`);
external.forEach((u) => console.log(`   ↗ ${u}`));
if (errors.length) {
  console.error(`\n❌ ${errors.length} problème(s) :\n` + errors.map((e) => `   - ${e}`).join('\n'));
  process.exit(1);
}
console.log('✅ Aucun lien cassé.');
