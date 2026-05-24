// Generates the PWA icon set from inline SVG sources using sharp.
// Run with: npm run gen:icons  (from apps/web)  — or  node scripts/gen-pwa-icons.mjs
//
// Brand: neobrutalism pen-nib on pink, navy ink frame, yellow accent hole.
// Re-run this whenever the brand mark changes; the PNG outputs are committed.

import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(__dirname, '..');
const ICONS_DIR = resolve(webRoot, 'public/icons');
const APP_DIR = resolve(webRoot, 'src/app');

const NAVY = '#001858';
const PINK = '#f582ae';
const YELLOW = '#ffd803';

// The pen-nib mark, drawn at a 512 viewBox. Pink slit reads as a gap; the
// breather hole is a yellow accent dot.
const NIB = `
  <path d="M256 116 C 332 116 372 178 364 256 C 358 312 330 360 298 388 L 256 424 L 214 388 C 182 360 154 312 148 256 C 140 178 180 116 256 116 Z" fill="${NAVY}"/>
  <circle cx="256" cy="206" r="26" fill="${YELLOW}"/>
  <rect x="246" y="236" width="20" height="180" rx="10" fill="${PINK}"/>
`;

// Standard icon: full-bleed pink with a neobrutalism navy frame.
const regular = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${PINK}"/>
  <rect x="34" y="34" width="444" height="444" rx="78" fill="none" stroke="${NAVY}" stroke-width="20"/>
  ${NIB}
</svg>`;

// Maskable icon: full-bleed pink, mark scaled into the safe zone, no frame
// (a frame near the edges would be cropped by the platform mask).
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${PINK}"/>
  <g transform="translate(256 262) scale(0.6) translate(-256 -262)">${NIB}</g>
</svg>`;

async function png(svg, size, outPath) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(outPath);
  console.log('  ✓', outPath.replace(webRoot, '.'));
}

async function main() {
  await mkdir(ICONS_DIR, { recursive: true });

  // Manifest icons.
  await png(regular, 192, resolve(ICONS_DIR, 'icon-192.png'));
  await png(regular, 512, resolve(ICONS_DIR, 'icon-512.png'));
  await png(maskable, 192, resolve(ICONS_DIR, 'maskable-192.png'));
  await png(maskable, 512, resolve(ICONS_DIR, 'maskable-512.png'));

  // Apple touch icon (no transparency / no mask on iOS — use the framed mark).
  await png(regular, 180, resolve(APP_DIR, 'apple-icon.png'));

  // Browser favicon — ship the vector so it stays crisp at every size.
  await writeFile(resolve(APP_DIR, 'icon.svg'), regular.trim() + '\n', 'utf8');
  console.log('  ✓', resolve(APP_DIR, 'icon.svg').replace(webRoot, '.'));

  console.log('PWA icons generated.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
