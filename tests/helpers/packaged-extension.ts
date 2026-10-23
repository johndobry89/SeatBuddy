import { createHash } from 'node:crypto';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { unzipSync } from 'fflate';
import { reviewedManifestScope } from '../../src/privacy/manifest';
import normalManifest from '../../public/manifest.json' with { type: 'json' };

const maxBytes = 10 * 1024 * 1024;
export const digest = (bytes: Uint8Array) =>
  createHash('sha256').update(bytes).digest('hex');
export const packageName = (version: string) => {
  if (!/^\d+\.\d+\.\d+$/.test(version) && version !== '0.11.7-experimental')
    throw new Error('Invalid package version');
  return `seatbuddies-${version}-chrome-test.zip`;
};

/** Bound declared sizes before decompression, not after allocating archive contents. */
function boundedUnzip(bytes: Uint8Array) {
  if (bytes.length > maxBytes) throw new Error('Unexpected package size');
  let count = 0,
    size = 0;
  try {
    return unzipSync(bytes, {
      filter: (entry) => {
        count++;
        size += entry.originalSize;
        if (count > 128 || size > maxBytes)
          throw new Error('Unexpected package size');
        return true;
      },
    });
  } catch {
    throw new Error(
      'Invalid or oversized ZIP; extract the correct artifact level',
    );
  }
}

/** CI passes real download bytes and the upload action's wrapper digest.
 * A checksum proves byte integrity relative to that source, not an author signature. */
export async function unpackActionsArtifact(
  bytes: Uint8Array,
  version: string,
  expectedDigest: string,
) {
  if (
    !/^[a-f0-9]{64}$/.test(expectedDigest) ||
    digest(bytes) !== expectedDigest
  )
    throw new Error('Actions artifact checksum mismatch');
  const files = boundedUnzip(bytes);
  const name = packageName(version);
  if (
    Object.keys(files).sort().join('\n') !==
    [name, `${name}.sha256`].sort().join('\n')
  )
    throw new Error(
      'Wrong Actions artifact level or unexpected asset inclusion',
    );
  return unpackExtensionArchive(
    files[name]!,
    Buffer.from(files[`${name}.sha256`]!).toString('utf8'),
    version,
  );
}

/** Native tests install these verified archive bytes, never dist or a dev server. */
export async function unpackPackagedExtension(root = process.cwd()) {
  const pkg: unknown = JSON.parse(
    await readFile(resolve(root, 'package.json'), 'utf8'),
  );
  const version =
    typeof pkg === 'object' && pkg !== null && 'version' in pkg
      ? pkg.version
      : null;
  if (typeof version !== 'string') throw new Error('Invalid package version');
  const name = packageName(version);
  const artifactPath = process.env.SEATBUDDIES_ARTIFACT_ZIP;
  if (artifactPath) {
    return unpackActionsArtifact(
      await readFile(artifactPath),
      version,
      process.env.SEATBUDDIES_ARTIFACT_SHA256 ?? '',
    );
  }
  return unpackExtensionArchive(
    await readFile(resolve(root, 'build', name)),
    await readFile(resolve(root, 'build', `${name}.sha256`), 'utf8'),
    version,
  );
}

export async function unpackExtensionArchive(
  bytes: Uint8Array,
  checksum: string,
  version: string,
) {
  const sha256 = digest(bytes);
  if (checksum !== `${sha256}  ${packageName(version)}\n`)
    throw new Error('Packaged extension checksum mismatch');
  const files = boundedUnzip(bytes);
  for (const path of Object.keys(files))
    if (
      path.includes('\\') ||
      path.split('/').some((part) => !part || part === '..' || part === '.') ||
      !/^(?:LICENSE|THIRD_PARTY_NOTICES\.txt|manifest\.json|(?:background|sidepanel|popup|fixture|fixture-reader)\.(?:js|html)|(?:assets|icons)\/[a-zA-Z0-9_.-]+\.(?:js|css|svg|png))$/.test(
        path,
      )
    )
      throw new Error('Unsafe or unexpected packaged extension path');
  if (!files['manifest.json']?.length)
    throw new Error('Missing root manifest; wrong ZIP extraction level');
  const manifest = JSON.parse(
    Buffer.from(files['manifest.json']).toString('utf8'),
  ) as Record<string, unknown>;
  const experimental = version === '0.11.7-experimental';
  const expectedExperiment = {
    ...normalManifest,
    name: 'SeatBuddies — Vue Page Reader (experiment)',
    version: '0.11.7',
    version_name: '0.11.7-experimental',
    permissions: ['sidePanel', 'storage', 'activeTab', 'scripting'],
  };
  if (
    experimental
      ? JSON.stringify(manifest) !== JSON.stringify(expectedExperiment)
      : !reviewedManifestScope.safeParse(manifest).success ||
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
