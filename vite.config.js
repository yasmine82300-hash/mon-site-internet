import { defineConfig } from 'vite';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { renderProducts, renderThemeTabs } from './scripts/render-products.mjs';

const root = import.meta.dirname;
const pages = readdirSync(root).filter((f) => f.endsWith('.html'));

// Assemble les pages : <!-- @include partials/x.html --> et blocs générés
// depuis le catalogue (HTML statique = indexable et rapide, sans JS requis).
const htmlPartials = {
  name: 'html-partials',
  transformIndexHtml: {
    order: 'pre',
    handler(html) {
      const include = (src) =>
        src.replace(/<!--\s*@include\s+([\w/.-]+)\s*-->/g, (_, file) =>
          include(readFileSync(path.join(root, file), 'utf8'))
        );
      return include(html)
        .replace('<!-- @products -->', renderProducts())
        .replace('<!-- @theme-tabs -->', renderThemeTabs());
    },
  },
};

export default defineConfig({
  plugins: [htmlPartials],
  build: {
    target: 'es2020',
    cssMinify: true,
    rollupOptions: {
      input: Object.fromEntries(pages.map((p) => [path.parse(p).name, path.join(root, p)])),
    },
  },
});
