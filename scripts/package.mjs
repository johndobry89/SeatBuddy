import { readFile, readdir, mkdir, writeFile, lstat } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { zipSync, unzipSync } from 'fflate';
import { pathToFileURL } from 'node:url';

export async function packageRuntime(root) {
  const dist = resolve(root, 'dist');
  const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  const manifest = JSON.parse(
    await readFile(resolve(dist, 'manifest.json'), 'utf8'),
  );
  if (manifest.version !== pkg.version || manifest.manifest_version !== 3)
    throw new Error('Package/manifest version mismatch');
  if (
    JSON.stringify(manifest.permissions) !== JSON.stringify(['sidePanel']) ||
    manifest.host_permissions?.length ||
    manifest.optional_host_permissions?.length ||
    manifest.optional_permissions?.length ||
    manifest.content_scripts?.length
  )
    throw new Error('Unexpected production privileges');
  const files = {};
  async function collect(dir) {
    for (const item of (await readdir(dir, { withFileTypes: true })).sort(
      (a, b) => a.name.localeCompare(b.name, 'en'),
    )) {
      const path = resolve(dir, item.name);
      if ((await lstat(path)).isSymbolicLink())
        throw new Error('Symlink in runtime package');
      const name = relative(dist, path).split(sep).join('/');
      if (
        dir === dist &&
        ![
          'assets',
          'manifest.json',
          'background.js',
          'sidepanel.html',
          'sidepanel.js',
          'fixture.html',
          'fixture.js',
        ].includes(name)
      )
        throw new Error(`Unexpected package root: ${name}`);
      if (item.isDirectory()) {
        if (name !== 'assets') throw new Error(`Unexpected directory: ${name}`);
        await collect(path);
      } else {
        if (!/\.(js|css|html|json|png|svg)$/.test(name) || name.includes('..'))
          throw new Error(`Unexpected runtime file: ${name}`);
        files[name] = await readFile(path);
      }
    }
  }
  await collect(dist);
  for (const name of [
    manifest.background.service_worker,
    manifest.side_panel.default_path,
    'fixture.html',
  ])
    if (!files[name]) throw new Error(`Missing runtime entry ${name}`);
  const bytes = zipSync(files, {
    level: 9,
    mtime: new Date(2026, 0, 1, 0, 0, 0),
  });
  const unpacked = unzipSync(bytes);
  for (const name of Object.keys(files))
    if (!Buffer.from(unpacked[name]).equals(files[name]))
      throw new Error('Archive verification failed');
  await mkdir(resolve(root, 'build'), { recursive: true });
  const name = `seatmates-${pkg.version}-chrome-test.zip`;
  await writeFile(resolve(root, 'build', name), bytes);
  await writeFile(
    resolve(root, 'build', `${name}.sha256`),
    `${createHash('sha256').update(bytes).digest('hex')}  ${name}\n`,
  );
  console.log(
    `Verified platform-neutral Chrome unpacked test build: build/${name} (${Object.keys(files).length} runtime files, ${bytes.length} bytes).`,
  );

  return {
    name,
    files: Object.keys(files),
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
}

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
)
  await packageRuntime(resolve(import.meta.dirname, '..'));
