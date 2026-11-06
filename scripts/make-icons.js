// `npm run icons`: makes the PNG icons the install manifest needs from the SVG logo files
// (docs/design.md §8), using the Chrome already installed on the computer (no extra package).
// Run it again only when a logo SVG changes; the PNGs it makes are committed with the app.
//
// Output in public/icons/: icon-192.png and icon-512.png (rounded mark, transparent corners),
// maskable-512.png and apple-touch-180.png (full-bleed square, for Android masks and iPhones).

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ICONS_DIR = resolve('public/icons');
const CHROME = process.env.CHROME_PATH || 'google-chrome';

const jobs = [
  { svg: 'logo-mark.svg', out: 'icon-192.png', size: 192 },
  { svg: 'logo-mark.svg', out: 'icon-512.png', size: 512 },
  { svg: 'logo-maskable.svg', out: 'maskable-512.png', size: 512 },
  { svg: 'logo-maskable.svg', out: 'apple-touch-180.png', size: 180 },
];

// Draws one SVG at `size`×`size` pixels by screenshotting a tiny page in headless Chrome.
function render({ svg, out, size }) {
  const work = mkdtempSync(join(tmpdir(), 'icons-'));
  try {
    const markup = readFileSync(join(ICONS_DIR, svg), 'utf8');
    const page = `<!doctype html><html><body style="margin:0;overflow:hidden;background:transparent">
      <div style="width:${size}px;height:${size}px">${markup.replace('<svg ', `<svg width="${size}" height="${size}" `)}</div>
    </body></html>`;
    const pagePath = join(work, 'page.html');
    writeFileSync(pagePath, page);
    execFileSync(CHROME, [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--default-background-color=00000000',
      `--window-size=${size},${size}`,
      `--screenshot=${join(ICONS_DIR, out)}`,
      `file://${pagePath}`,
    ], { stdio: 'ignore' });
    console.log(`made ${out} (${size}px) from ${svg}`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

jobs.forEach(render);
