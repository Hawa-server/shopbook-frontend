// `npm run check:no-test-screen`: confirms a build does NOT contain the sync test screen or the TEST BUILD
// banner, for after the temporary test build has been undone (docs/guide.md, FE3.5).
//
//   npm run check:no-test-screen                          checks the local build in dist/
//   npm run check:no-test-screen -- <folder>              checks another build folder
//   npm run check:no-test-screen -- https://your-address  checks what a live address really serves
//
// It reads every file the build contains (for an address: the page, the service worker and everything the
// service worker lists) and looks for words that only the test code has. It only reads; it changes nothing.
// Exit 0 = not found. Exit 1 = found, or nothing could be checked (never a pass by checking nothing).

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const MARKERS = ['Dev: sync test', '/dev/sync', 'Save a change the server will refuse', 'data-test-build-banner', 'TEST BUILD</div>'];
const target = process.argv[2] ?? 'dist';

// Reads every text file of a local build folder: returns [{ name, text }].
function readFolder(folder) {
  const out = [];
  for (const name of readdirSync(folder)) {
    const path = join(folder, name);
    if (statSync(path).isDirectory()) out.push(...readFolder(path));
    else if (/\.(js|html|css|webmanifest)$/.test(name)) out.push({ name: path, text: readFileSync(path, 'utf8') });
  }
  return out;
}

// Fetches a live address's page, service worker and every script and page they list.
async function readAddress(base) {
  const get = async (path) => {
    const response = await fetch(new URL(path, base));
    if (!response.ok) throw new Error(`${path} answered ${response.status}`);
    return response.text();
  };
  const page = await get('/');
  const sw = await get('/sw.js');
  const files = [{ name: '/', text: page }, { name: '/sw.js', text: sw }];
  const listed = new Set();
  for (const m of page.matchAll(/(?:src|href)="(\/[^"]+\.js)"/g)) listed.add(m[1]);
  for (const m of sw.matchAll(/url:\s*"([^"]+\.(?:js|html))"/g)) listed.add(`/${m[1].replace(/^\//, '')}`);
  for (const m of sw.matchAll(/importScripts\("([^"]+)"\)|from"\.\/([^"]+\.js)"|define\(\["\.\/([^"]+?)"/g)) {
    const file = m[1] ?? m[2] ?? (m[3] ? `${m[3]}.js` : null);
    if (file) listed.add(`/${file.replace(/^\.?\//, '')}`);
  }
  for (const path of listed) files.push({ name: path, text: await get(path) });
  return files;
}

async function main() {
  let files;
  if (/^https?:\/\//.test(target)) {
    files = await readAddress(target);
  } else {
    if (!existsSync(target)) throw new Error(`No build folder "${target}". Run: npm run build`);
    files = readFolder(target);
  }
  const scripts = files.filter((f) => /\.js$/.test(f.name));
  if (scripts.length < 2) throw new Error(`Found only ${scripts.length} script(s) in ${target}, so nothing was really checked.`);

  const found = [];
  for (const { name, text } of files) for (const marker of MARKERS) if (text.includes(marker)) found.push(`${name}: "${marker}"`);
  if (found.length > 0) {
    console.error(`FOUND test code in ${target}. Don't treat the test build as undone:\n  ${found.join('\n  ')}`);
    process.exit(1);
  }
  console.log(`OK: no test screen or TEST BUILD banner in ${target} (${files.length} files checked, ${scripts.length} scripts).`);
}

main().catch((error) => {
  console.error(`Could not check ${target}: ${error.message}`);
  process.exit(1);
});
