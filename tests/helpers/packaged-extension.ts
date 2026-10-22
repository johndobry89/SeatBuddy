import { createHash } from 'node:crypto';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { unzipSync } from 'fflate';
import { reviewedManifestScope } from '../../src/privacy/manifest';

/** Native tests install these verified archive bytes, never dist or a dev server. */
export async function unpackPackagedExtension(root = process.cwd()) {
  const pkg: unknown = JSON.parse(
    await readFile(resolve(root, 'package.json'), 'utf8'),
  );
  const version =
    typeof pkg === 'object' && pkg !== null && 'version' in pkg
      ? pkg.version
      : null;
  if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version))
    throw new Error('Invalid package version');
  const name = `seatbuddies-${version}-chrome-test.zip`;
  const bytes = await readFile(resolve(root, 'build', name));
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (
    (await readFile(resolve(root, 'build', `${name}.sha256`), 'utf8')) !==
    `${sha256}  ${name}\n`
  )
    throw new Error('Packaged extension checksum mismatch');
  const files = unzipSync(bytes);
  if (
    Object.keys(files).length > 128 ||
    Object.values(files).reduce((total, file) => total + file.length, 0) >
      10 * 1024 * 1024
  )
    throw new Error('Unexpected package size');
  for (const path of Object.keys(files))
    if (
      path.includes('\\') ||
      path.split('/').some((part) => !part || part === '..' || part === '.') ||
      !/^(?:LICENSE|THIRD_PARTY_NOTICES\.txt|manifest\.json|(?:background|sidepanel|popup|fixture|fixture-reader)\.(?:js|html)|(?:assets|icons)\/[a-zA-Z0-9_.-]+\.(?:js|css|svg|png))$/.test(
        path,
      )
    )
      throw new Error('Unsafe or unexpected packaged extension path');
  const manifest = JSON.parse(
    Buffer.from(files['manifest.json'] ?? []).toString('utf8'),
  ) as Record<string, unknown>;
  if (
    !reviewedManifestScope.safeParse(manifest).success ||
    manifest.version !== version ||
    manifest.incognito !== 'spanning'
  )
    throw new Error('Unexpected packaged manifest');
  for (const file of [
    'LICENSE',
    'THIRD_PARTY_NOTICES.txt',
    'popup.html',
    'sidepanel.html',
    'fixture.html',
    'background.js',
  ])
    if (!files[file]?.length) throw new Error('Incomplete packaged extension');
  const directory = await mkdtemp(join(tmpdir(), 'seatbuddies-packaged-'));
  const cleanup = () => rm(directory, { recursive: true, force: true });
  try {
    for (const [path, data] of Object.entries(files)) {
      const target = join(directory, path);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, data);
    }
    return { directory, sha256, version, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
