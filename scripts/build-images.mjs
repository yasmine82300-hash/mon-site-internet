// Génère toutes les images du site à partir de assets-src/ et photos/.
//   npm run images
// - Logo : détourage du cercle, versions AVIF/WebP/PNG en plusieurs tailles
// - Favicons (ico, png, apple-touch) + manifest
// - Image de partage réseaux sociaux (1200x630)
// - Illustrations SVG fictives des produits (si aucune photo réelle)
// - Photos réelles de photos/*.jpg|png|webp → public/img/produits/*.webp compressées
import sharp from 'sharp';
import { mkdir, readdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const pub = path.join(root, 'public');
const out = (...p) => path.join(pub, ...p);
await mkdir(out('img', 'produits'), { recursive: true });

const CREAM = { r: 255, g: 248, b: 240, alpha: 1 };

/* ---------- Logo (cercle détouré sur fond transparent) ---------- */
const LOGO_SRC = path.join(root, 'assets-src', 'logo-original.jpg');
// Le logo source est un disque sur fond noir : centre et rayon mesurés sur l'original.
const CIRCLE = { cx: 602, cy: 504, r: 503 };
const crop = {
  left: CIRCLE.cx - CIRCLE.r,
  top: Math.max(0, CIRCLE.cy - CIRCLE.r),
  width: CIRCLE.r * 2,
  height: CIRCLE.r * 2,
};
const d = crop.width;
const mask = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${d}" height="${d}"><circle cx="${d / 2}" cy="${d / 2}" r="${d / 2 - 2}"/></svg>`
);
const logoMaster = await sharp(LOGO_SRC)
  .extract(crop)
  .composite([{ input: mask, blend: 'dest-in' }])
  .png()
  .toBuffer();

for (const size of [96, 192, 384, 768]) {
  const img = sharp(logoMaster).resize(size, size);
  await img.clone().avif({ quality: 55 }).toFile(out('img', `logo-${size}.avif`));
  await img.clone().webp({ quality: 80 }).toFile(out('img', `logo-${size}.webp`));
  await img.clone().png({ compressionLevel: 9, palette: true }).toFile(out('img', `logo-${size}.png`));
}

/* ---------- Favicons ---------- */
const favPng = async (size) => sharp(logoMaster).resize(size, size).png({ compressionLevel: 9, palette: true, quality: 85 }).toBuffer();
await writeFile(out('favicon-32.png'), await favPng(32));
await writeFile(out('icon-192.png'), await favPng(192));
await writeFile(out('icon-512.png'), await favPng(512));
await sharp(logoMaster).resize(180, 180).flatten({ background: CREAM }).png({ palette: true, quality: 85 }).toFile(out('apple-touch-icon.png'));

// favicon.ico : conteneur ICO embarquant des PNG 16/32/48
const icoSizes = [16, 32, 48];
const pngs = await Promise.all(icoSizes.map(favPng));
const header = Buffer.alloc(6 + 16 * pngs.length);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(pngs.length, 4);
let offset = header.length;
pngs.forEach((png, i) => {
  const e = 6 + i * 16;
  header.writeUInt8(icoSizes[i], e);
  header.writeUInt8(icoSizes[i], e + 1);
  header.writeUInt16LE(1, e + 4);
  header.writeUInt16LE(32, e + 6);
  header.writeUInt32LE(png.length, e + 8);
  header.writeUInt32LE(offset, e + 12);
  offset += png.length;
});
await writeFile(out('favicon.ico'), Buffer.concat([header, ...pngs]));

/* ---------- Image de partage (Open Graph) ---------- */
const ogBg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFE3EE"/><stop offset=".5" stop-color="#EFE7FF"/><stop offset="1" stop-color="#DDF6EA"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#g)"/>
  <circle cx="1080" cy="90" r="120" fill="#FFE58F" opacity=".55"/>
  <circle cx="110" cy="560" r="150" fill="#A8E6CF" opacity=".5"/>
  <text x="630" y="270" font-family="Arial Rounded MT Bold, Arial, sans-serif" font-size="64" font-weight="700" fill="#3D2645">Le doux pays</text>
  <text x="630" y="350" font-family="Arial Rounded MT Bold, Arial, sans-serif" font-size="64" font-weight="700" fill="#3D2645">des squishies</text>
  <text x="630" y="420" font-family="Arial, sans-serif" font-size="26" fill="#6B4E71">Livraison offerte dès 35 € · squishlandy.fr</text>
</svg>`);
const ogLogo = await sharp(logoMaster).resize(500, 500).toBuffer();
await sharp(ogBg)
  .composite([{ input: ogLogo, left: 90, top: 65 }])
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(out('img', 'og-image.jpg'));

/* ---------- Photos réelles (prioritaires sur les illustrations) ---------- */
const photosDir = path.join(root, 'photos');
const realPhotos = new Set();
if (existsSync(photosDir)) {
  for (const file of await readdir(photosDir)) {
    if (!/\.(jpe?g|png|webp|avif)$/i.test(file)) continue;
    const id = path.parse(file).name;
    realPhotos.add(id);
    const base = sharp(path.join(photosDir, file)).rotate();
    // 800px pour l'affichage carte (2x pour écrans retina à ~400px)
    await base.clone().resize(800, 800, { fit: 'cover' }).webp({ quality: 78 }).toFile(out('img', 'produits', `${id}.webp`));
    await base.clone().resize(400, 400, { fit: 'cover' }).webp({ quality: 78 }).toFile(out('img', 'produits', `${id}-400.webp`));
    console.log(`📷 photo compressée : ${id}.webp`);
  }
}

/* ---------- Illustrations fictives ---------- */
const INK = '#4A2C3A';
const eyes = (cx, cy, gap, r = 11, closed = false) =>
  closed
    ? [-1, 1]
        .map((s) => `<path d="M${cx + s * gap - r} ${cy} q${r} ${-r} ${r * 2} 0" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`)
        .join('')
    : [-1, 1]
        .map(
          (s) =>
            `<ellipse cx="${cx + s * gap}" cy="${cy}" rx="${r}" ry="${r * 1.15}" fill="${INK}"/><circle cx="${cx + s * gap + r * 0.35}" cy="${cy - r * 0.4}" r="${r * 0.38}" fill="#fff"/>`
        )
        .join('');
const blush = (cx, cy, gap) =>
  [-1, 1].map((s) => `<ellipse cx="${cx + s * gap}" cy="${cy}" rx="16" ry="10" fill="#FF8FB1" opacity=".55"/>`).join('');
const smile = (cx, cy, w = 18) =>
  `<path d="M${cx - w} ${cy} q${w} ${w * 0.9} ${w * 2} 0" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`;
const face = (cx, cy, { gap = 46, closed = false, r = 11 } = {}) =>
  eyes(cx, cy, gap, r, closed) + blush(cx, cy + 26, gap + 18) + smile(cx, cy + 22, 14);
const shine = (cx, cy, rx = 34, ry = 16) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" opacity=".55" transform="rotate(-25 ${cx} ${cy})"/>`;
const grad = (id, c1, c2) =>
  `<radialGradient id="${id}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient>`;
const shadow = `<ellipse cx="200" cy="350" rx="120" ry="16" fill="#3D2645" opacity=".08"/>`;

const art = {
  'mochi-le-chat': {
    bg: '#FFE3EE',
    body: `${grad('b', '#FFFFFF', '#F3E6E0')}`,
    draw: `<path d="M110 150 L120 80 L170 125 Z M290 150 L280 80 L230 125 Z" fill="#F7EEE9" stroke="#EAD9D2" stroke-width="4" stroke-linejoin="round"/>
      <path d="M125 135 L130 100 L155 122 Z M275 135 L270 100 L245 122 Z" fill="#FFB5C8"/>
      <ellipse cx="200" cy="225" rx="125" ry="115" fill="url(#b)"/>${shine(150, 160)}
      ${face(200, 215, { closed: true })}
      <path d="M110 230 h-35 M110 245 h-30 M290 230 h35 M290 245 h30" stroke="${INK}" stroke-width="4" stroke-linecap="round" opacity=".5"/>`,
  },
  'coin-coin-le-canard': {
    bg: '#FFF4CC',
    body: grad('b', '#FFF3A6', '#FFD45C'),
    draw: `<path d="M195 92 q-8 -30 12 -34 q-2 18 10 28" fill="#FFD45C"/>
      <ellipse cx="200" cy="220" rx="125" ry="120" fill="url(#b)"/>${shine(150, 155)}
      ${eyes(200, 200, 48)}${blush(200, 238, 70)}
      <ellipse cx="200" cy="240" rx="34" ry="18" fill="#FFA45C"/><path d="M170 240 q30 10 60 0" stroke="#E5863F" stroke-width="3" fill="none"/>
      <ellipse cx="120" cy="300" rx="34" ry="22" fill="#FFD45C"/><ellipse cx="280" cy="300" rx="34" ry="22" fill="#FFD45C"/>`,
  },
  'gribouille-la-grenouille': {
    bg: '#DDF6EA',
    body: grad('b', '#D4F5B8', '#9FDB7E'),
    draw: `<circle cx="140" cy="125" r="42" fill="#B5E896"/><circle cx="260" cy="125" r="42" fill="#B5E896"/>
      <circle cx="140" cy="122" r="26" fill="#fff"/><circle cx="260" cy="122" r="26" fill="#fff"/>
      <circle cx="144" cy="124" r="15" fill="${INK}"/><circle cx="256" cy="124" r="15" fill="${INK}"/>
      <circle cx="150" cy="118" r="5" fill="#fff"/><circle cx="262" cy="118" r="5" fill="#fff"/>
      <ellipse cx="200" cy="235" rx="130" ry="105" fill="url(#b)"/>${shine(140, 190, 30, 13)}
      ${blush(200, 240, 70)}<path d="M160 230 q40 34 80 0" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`,
  },
  'panpan-le-lapin': {
    bg: '#EFE7FF',
    body: grad('b', '#FFFFFF', '#FFE1EA'),
    draw: `<ellipse cx="155" cy="95" rx="26" ry="70" fill="#FFEAF0" transform="rotate(-12 155 95)"/><ellipse cx="245" cy="95" rx="26" ry="70" fill="#FFEAF0" transform="rotate(12 245 95)"/>
      <ellipse cx="155" cy="100" rx="12" ry="48" fill="#FFB5C8" transform="rotate(-12 155 100)"/><ellipse cx="245" cy="100" rx="12" ry="48" fill="#FFB5C8" transform="rotate(12 245 100)"/>
      <ellipse cx="200" cy="235" rx="120" ry="110" fill="url(#b)"/>${shine(150, 180)}
      ${face(200, 230)}<ellipse cx="200" cy="244" rx="7" ry="5" fill="#FF8FB1"/>`,
  },
  'donut-arc-en-ciel': {
    bg: '#FFE3EE',
    body: grad('b', '#FFE7C2', '#F2C48D'),
    draw: `<ellipse cx="200" cy="215" rx="140" ry="120" fill="url(#b)"/>
      <path d="M75 200 q10 -95 125 -100 q115 5 125 100 q-15 25 -30 10 q-20 25 -40 5 q-25 25 -55 5 q-30 22 -55 0 q-20 22 -40 0 q-15 18 -30 -20z" fill="#FFB5D0"/>
      <ellipse cx="200" cy="200" rx="34" ry="24" fill="#F2C48D"/>
      ${['#A8E6CF', '#C9B6FF', '#FFE58F', '#8EC5FF', '#fff'].map((c, i) => [[120, 150], [270, 140], [160, 120], [245, 175], [140, 190], [230, 115], [290, 190], [110, 175]].slice(i, i + 3).map(([x, y]) => `<rect x="${x}" y="${y}" width="16" height="6" rx="3" fill="${c}" transform="rotate(${i * 37} ${x} ${y})"/>`).join('')).join('')}
      ${shine(130, 135, 26, 11)}${face(200, 265, { gap: 40, r: 9 })}`,
  },
  'cupcake-fraise': {
    bg: '#FFF0F4',
    body: grad('b', '#FFD1E0', '#FFA9C6'),
    draw: `<path d="M115 220 L135 330 h130 L285 220 Z" fill="#A8E6CF"/><path d="M150 225 l8 100 M200 225 v100 M250 225 l-8 100" stroke="#86D1B4" stroke-width="6"/>
      <path d="M100 225 q-20 -60 40 -80 q10 -60 60 -55 q50 -5 60 55 q60 20 40 80 z" fill="url(#b)"/>
      <circle cx="200" cy="80" r="22" fill="#FF6F91"/><path d="M200 60 q8 -20 22 -24" stroke="#7BBF6A" stroke-width="5" fill="none" stroke-linecap="round"/>
      ${shine(150, 150, 26, 12)}${face(200, 180, { gap: 40, r: 10 })}`,
  },
  'glace-myrtille': {
    bg: '#EFE7FF',
    body: grad('b', '#E3D9FF', '#B9A3F5'),
    draw: `<path d="M140 215 L200 350 L260 215 Z" fill="#F2C48D"/><path d="M155 245 l75 0 M165 275 l55 0 M178 305 l30 0" stroke="#E0A867" stroke-width="5"/>
      <circle cx="200" cy="165" r="95" fill="url(#b)"/>
      <path d="M110 190 q15 30 35 10 q20 30 45 8 q25 28 50 2 q20 25 50 -12 v20 h-180z" fill="#B9A3F5"/>
      ${shine(160, 115, 28, 12)}${face(200, 160, { gap: 38, r: 10 })}`,
  },
  'macaron-calin': {
    bg: '#DDF6EA',
    body: grad('b', '#D6F7E8', '#9FE0C3'),
    draw: `<ellipse cx="200" cy="265" rx="130" ry="55" fill="url(#b)"/><rect x="80" y="205" width="240" height="40" rx="20" fill="#FFF3D6"/>
      <ellipse cx="200" cy="185" rx="130" ry="60" fill="url(#b)"/>${shine(150, 160, 30, 12)}
      ${face(200, 270, { closed: true, gap: 40 })}`,
  },
  'fraisy-la-fraise': {
    bg: '#FFE3EE',
    body: grad('b', '#FFC4D6', '#FF8FB1'),
    draw: `<path d="M200 345 C90 320 70 200 105 150 q95 -45 190 0 C330 200 310 320 200 345z" fill="url(#b)"/>
      ${[[140, 200], [260, 200], [170, 290], [235, 290], [200, 320], [130, 255], [270, 255]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="4" ry="6" fill="#FFF3D6"/>`).join('')}
      <path d="M115 150 q30 -40 50 -10 q15 -45 35 -50 q20 5 35 50 q20 -30 50 10 q-40 25 -85 15 q-45 10 -85 -15z" fill="#8FD47A"/>
      <path d="M200 92 q0 -25 15 -35" stroke="#6FB85B" stroke-width="7" fill="none" stroke-linecap="round"/>
      ${shine(150, 195, 24, 12)}${face(200, 230, { gap: 40 })}`,
  },
  'peche-douce': {
    bg: '#FFF0E0',
    body: grad('b', '#FFE0C7', '#FFB08A'),
    draw: `<circle cx="200" cy="225" r="120" fill="url(#b)"/><path d="M200 108 q-25 60 0 120" stroke="#F59A73" stroke-width="5" fill="none" opacity=".6"/>
      <path d="M205 108 q35 -50 85 -30 q-30 45 -85 30z" fill="#8FD47A"/><path d="M200 112 q-2 -22 8 -34" stroke="#A4775B" stroke-width="6" fill="none" stroke-linecap="round"/>
      ${shine(145, 170)}${face(200, 230)}`,
  },
  'avocat-rigolo': {
    bg: '#E8F7DD',
    body: grad('b', '#C9EBA6', '#8FCB6B'),
    draw: `<path d="M200 70 C130 70 95 170 95 240 C95 310 145 345 200 345 C255 345 305 310 305 240 C305 170 270 70 200 70z" fill="#5E9C47"/>
      <path d="M200 88 C143 88 112 175 112 240 C112 300 152 328 200 328 C248 328 288 300 288 240 C288 175 257 88 200 88z" fill="url(#b)"/>
      <circle cx="200" cy="265" r="42" fill="#B9835A"/>${shine(205, 255, 14, 7)}
      ${eyes(200, 170, 38, 10)}${blush(200, 195, 58)}${smile(200, 190, 12)}`,
  },
  'citron-soleil': {
    bg: '#FFF8D6',
    body: grad('b', '#FFF6B8', '#FFE070'),
    draw: `<ellipse cx="200" cy="220" rx="135" ry="110" fill="url(#b)"/><ellipse cx="63" cy="220" rx="14" ry="18" fill="#FFE070"/><ellipse cx="337" cy="220" rx="14" ry="18" fill="#FFE070"/>
      <path d="M200 112 q20 -40 65 -30 q-20 40 -65 30z" fill="#8FD47A"/>
      ${shine(140, 170)}${face(200, 215)}`,
  },
  'licorne-etoilee': {
    bg: '#EFE7FF',
    body: grad('b', '#FFFFFF', '#F1EAFB'),
    draw: `<path d="M200 40 L218 120 h-36 Z" fill="#FFD66E" stroke="#F2B93B" stroke-width="3" stroke-linejoin="round"/><path d="M186 105 l28 -8 M190 85 l22 -6 M194 65 l15 -4" stroke="#F2B93B" stroke-width="3"/>
      <path d="M130 135 L125 85 L165 120Z M270 135 L275 85 L235 120Z" fill="#F7F1FF" stroke="#E4D9F5" stroke-width="3"/>
      <ellipse cx="200" cy="230" rx="122" ry="112" fill="url(#b)"/>
      <path d="M85 210 q-10 -80 70 -95 q-30 40 -10 70 q-40 -5 -60 25z" fill="#C9B6FF"/><path d="M90 250 q-25 -40 10 -70 q5 40 35 50 q-30 0 -45 20z" fill="#FFB5D0"/><path d="M110 290 q-30 -20 -15 -55 q15 30 40 30 q-20 5 -25 25z" fill="#A8E6CF"/>
      ${shine(240, 170, 28, 12)}${face(215, 235, { closed: true, gap: 42 })}`,
  },
  'nuage-arc-en-ciel': {
    bg: '#E3F1FF',
    body: grad('b', '#FFFFFF', '#CDE6FF'),
    draw: `${['#FFB5D0', '#FFE58F', '#A8E6CF', '#C9B6FF'].map((c, i) => `<path d="M${90 + i * 18} 330 a${110 - i * 18} ${110 - i * 18} 0 0 1 ${220 - i * 36} 0" fill="none" stroke="${c}" stroke-width="18"/>`).join('')}
      <path d="M95 255 a55 55 0 0 1 40 -90 a70 70 0 0 1 130 -10 a55 55 0 0 1 45 100 z" fill="url(#b)"/>
      ${shine(170, 150, 30, 12)}${face(200, 210, { gap: 42 })}`,
  },
  'etoile-filante': {
    bg: '#FFF8D6',
    body: grad('b', '#FFF6B8', '#FFD66E'),
    draw: `<path d="M60 120 q60 10 95 50" stroke="#C9B6FF" stroke-width="14" fill="none" stroke-linecap="round" opacity=".7"/><path d="M50 170 q55 0 90 30" stroke="#FFB5D0" stroke-width="12" fill="none" stroke-linecap="round" opacity=".7"/>
      <path d="M215 70 L250 160 L345 165 L270 225 L298 318 L215 265 L132 318 L160 225 L85 165 L180 160 Z" fill="url(#b)" stroke="#F2C24B" stroke-width="6" stroke-linejoin="round"/>
      ${shine(190, 160, 22, 10)}${face(215, 205, { gap: 34, r: 9 })}`,
  },
  'bebe-dragon': {
    bg: '#DDF6EA',
    body: grad('b', '#D6F7E8', '#94DDBC'),
    draw: `<path d="M95 200 q-60 -50 -30 -110 q20 40 65 40 q-25 30 -35 70z M305 200 q60 -50 30 -110 q-20 40 -65 40 q25 30 35 70z" fill="#C9B6FF"/>
      <path d="M150 100 l12 -35 l18 35z M220 100 l18 -35 l12 35z" fill="#FFE58F"/>
      <ellipse cx="200" cy="230" rx="120" ry="115" fill="url(#b)"/>
      <ellipse cx="200" cy="285" rx="65" ry="45" fill="#F3FFF8"/>${shine(150, 170)}
      ${face(200, 205, { gap: 44 })}`,
  },
};

const products = JSON.parse(await readFile(path.join(root, 'src', 'data', 'products.json'), 'utf8')).products;
for (const p of products) {
  const a = art[p.id];
  if (!a || realPhotos.has(p.id)) continue;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img" aria-label="${p.alt}"><defs>${a.body}</defs><rect width="400" height="400" fill="${a.bg}"/>${shadow}${a.draw}</svg>`;
  await writeFile(out('img', 'produits', `${p.id}.svg`), svg.replace(/\s{2,}/g, ' '));
}

// Illustration de la page 404 : un squishy tout triste
await writeFile(
  out('img', 'squishy-triste.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><defs>${grad('b', '#E3F1FF', '#A9D2FF')}</defs>${shadow}
  <ellipse cx="200" cy="225" rx="130" ry="115" fill="url(#b)"/>${shine(145, 165)}
  ${eyes(200, 210, 46)}${blush(200, 240, 64)}
  <path d="M175 262 q25 -18 50 0" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
  <path d="M250 228 q8 18 0 26 q-8 -8 0 -26z" fill="#8EC5FF"/></svg>`.replace(/\s{2,}/g, ' ')
);

console.log('✅ Images générées dans public/');
