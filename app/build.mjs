import { build } from 'esbuild';
import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = import.meta.dirname;
const out = resolve(root, 'dist');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const common = { bundle: true, format: 'iife', target: 'chrome116', legalComments: 'none', minify: false };
await build({ ...common, entryPoints: [resolve(root, 'src/popup/main.ts')], outfile: resolve(out, 'popup.js') });
await build({ ...common, entryPoints: [resolve(root, 'src/reader/inject.ts')], outfile: resolve(out, 'reader.js') });
await cp(resolve(root, 'static'), out, { recursive: true });

// Guard the permission boundary: a build with extra rights must not pass.
const manifest = JSON.parse(await readFile(resolve(out, 'manifest.json'), 'utf8'));
const expected = ['activeTab', 'scripting', 'clipboardRead'];
if (
  JSON.stringify(manifest.permissions) !== JSON.stringify(expected) ||
  manifest.host_permissions ||
  manifest.content_scripts ||
  manifest.background ||
  manifest.web_accessible_resources ||
  // Spanning: one extension process, no per-context storage; nothing is stored anyway.
  manifest.incognito !== 'spanning'
)
  throw new Error('Manifest exceeds the SeatBuddies Next permission boundary.');
console.log(`Built ${out} — load it via chrome://extensions → Developer mode → Load unpacked.`);
