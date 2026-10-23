import { build } from 'vite';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { packageRuntime } from './package.mjs';

const root = resolve(import.meta.dirname, '..');
await build({ mode: 'experiment' });
const normal = JSON.parse(
  await readFile(resolve(root, 'public/manifest.json'), 'utf8'),
);
const manifest = {
  ...normal,
  name: 'SeatBuddies — Vue Page Reader (experiment)',
  version: '0.11.2',
  version_name: '0.11.2-experimental',
  permissions: ['sidePanel', 'storage', 'activeTab', 'scripting'],
};
await writeFile(
  resolve(root, 'build/experiment/dist/manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
await packageRuntime(root, 'experiment');
