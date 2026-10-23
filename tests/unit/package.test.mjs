import { afterEach, expect, it } from 'vitest';
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  symlink,
  readdir,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import {
  unpackPackagedExtension,
  unpackActionsArtifact,
  digest,
} from '../helpers/packaged-extension';
import { zipSync, unzipSync } from 'fflate';
import { packageRuntime } from '../../scripts/package.mjs';

const roots = [];
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'seatmates-package-'));
  roots.push(root);
  await mkdir(join(root, 'dist/assets'), { recursive: true });
  await mkdir(join(root, 'dist/icons'));
  const icons = Object.fromEntries(
    [16, 32, 48, 128].map((size) => [size, `icons/icon-${size}.png`]),
  );
  for (const size of [16, 32, 48, 128])
    await writeFile(
      join(root, `dist/icons/icon-${size}.png`),
      await readFile(
        new URL(`../../public/icons/icon-${size}.png`, import.meta.url),
      ),
    );
  const license = await readFile(new URL('../../LICENSE', import.meta.url));
  await writeFile(join(root, 'LICENSE'), license);
  await writeFile(join(root, 'dist/LICENSE'), license);
  await writeFile(
    join(root, 'dist/THIRD_PARTY_NOTICES.txt'),
    'Fictional package fixture\nPermission is hereby granted',
  );
  const manifest = {
    manifest_version: 3,
    incognito: 'spanning',
    content_security_policy: {
      extension_pages:
        "script-src 'self'; object-src 'none'; connect-src 'none'; base-uri 'none'",
    },
    version: '0.8.0',
    permissions: ['sidePanel', 'storage'],
    icons,
    action: { default_popup: 'popup.html', default_icon: icons },
    background: { service_worker: 'background.js' },
    side_panel: { default_path: 'sidepanel.html' },
  };
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({ version: '0.8.0' }),
  );
  await writeFile(join(root, 'dist/manifest.json'), JSON.stringify(manifest));
  for (const file of [
    'background.js',
    'sidepanel.html',
    'fixture.html',
    'popup.html',
    'assets/panel.js',
  ])
    await writeFile(
      join(root, 'dist', file),
      `/* fictional runtime ${file} */`,
    );
  // These must never appear in the runtime archive.
  await writeFile(join(root, '.env'), 'FICTIONAL_SECRET=never-package');
  await mkdir(join(root, 'test-results'));
  await writeFile(
    join(root, 'test-results/private.json'),
    'fictional-private-report',
  );
  return { root, manifest };
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});
it('produces only deterministic runtime bytes with a root manifest and a correct platform-neutral checksum', async () => {
  const { root } = await fixture();
  const result = await packageRuntime(root);
  expect(result.name).toBe('seatbuddies-0.8.0-chrome-test.zip');
  expect(await readdir(join(root, 'build'))).toEqual([
    result.name,
    `${result.name}.sha256`,
  ]);
  const bytes = await readFile(join(root, 'build', result.name));
  const checksum = createHash('sha256').update(bytes).digest('hex');
  expect(
    await readFile(join(root, 'build', `${result.name}.sha256`), 'utf8'),
  ).toBe(`${checksum}  ${result.name}\n`);
  const files = unzipSync(bytes);
  expect(Object.keys(files).sort()).toEqual([
    'LICENSE',
    'THIRD_PARTY_NOTICES.txt',
    'assets/panel.js',
    'background.js',
    'fixture.html',
    'icons/icon-128.png',
    'icons/icon-16.png',
    'icons/icon-32.png',
    'icons/icon-48.png',
    'manifest.json',
    'popup.html',
    'sidepanel.html',
  ]);
  for (const [file, content] of Object.entries(files))
    expect(Buffer.from(content)).toEqual(
      await readFile(join(root, 'dist', file)),
    );
  expect(JSON.stringify(files)).not.toContain('FICTIONAL_SECRET');
  await packageRuntime(root);
  expect(await readFile(join(root, 'build', result.name))).toEqual(bytes);
});
it.each([
  ['host_permissions', ['https://example.invalid/*']],
  ['optional_host_permissions', ['<all_urls>']],
  ['permissions', ['sidePanel', 'cookies']],
  ['optional_permissions', ['debugger']],
  [
    'content_scripts',
    [{ matches: ['https://example.invalid/*'], js: ['assets/panel.js'] }],
  ],
  ['version', '9.9.9'],
  ['background', { service_worker: 'missing.js' }],
])(
  'refuses an unexpectedly privileged, mismatched or incomplete manifest: %s',
  async (key, value) => {
    const { root, manifest } = await fixture();
    await writeFile(
      join(root, 'dist/manifest.json'),
      JSON.stringify({ ...manifest, [key]: value }),
    );
    await expect(packageRuntime(root)).rejects.toThrow();
  },
);
it.each([
  '.env',
  'report.json',
  'assets/secrets.txt',
  'assets/private/report.json',
])(
  'rejects an unexpected build output instead of silently packaging it: %s',
  async (file) => {
    const { root } = await fixture();
    await mkdir(join(root, 'dist', file, '..'), { recursive: true });
    await writeFile(join(root, 'dist', file), 'fictional-sensitive-input');
    await expect(packageRuntime(root)).rejects.toThrow(/Unexpected/);
  },
);
it('rejects symlink traversal outside the runtime', async () => {
  const { root } = await fixture();
  await symlink(join(root, '.env'), join(root, 'dist/assets/link.js'));
  await expect(packageRuntime(root)).rejects.toThrow(/Symlink/);
});

it('rejects a missing or incorrectly sized manifest icon', async () => {
  const { root } = await fixture();
  await writeFile(
    join(root, 'dist/icons/icon-16.png'),
    await readFile(join(root, 'dist/icons/icon-32.png')),
  );
  await expect(packageRuntime(root)).rejects.toThrow(/16px icon/);
});
it.each([
  ['assets/unsafe.js', 'fetch("https://fictional.invalid")'],
  ['assets/unsafe.js', 'globalThis["fetch"]("https://fictional.invalid")'],
  ['assets/unsafe.js', 'new WebSocket("wss://fictional.invalid")'],
  [
    'assets/unsafe.js',
    'navigator.sendBeacon("https://fictional.invalid", "x")',
  ],
  ['assets/unsafe.js', 'import("https://fictional.invalid/remote.js")'],
  ['assets/unsafe.js', 'eval("fictional()")'],
  [
    'sidepanel.html',
    '<script src="https://fictional.invalid/remote.js"></script>',
  ],
  ['assets/unsafe.css', '@import "https://fictional.invalid/theme.css";'],
])(
  'audits generated network/remote-code primitives: %s %s',
  async (file, source) => {
    const { root } = await fixture();
    await writeFile(join(root, 'dist', file), source);
    await expect(packageRuntime(root)).rejects.toThrow();
  },
);
it('rejects generated CSP changes rather than trusting the source manifest', async () => {
  const { root, manifest } = await fixture();
  await writeFile(
    join(root, 'dist/manifest.json'),
    JSON.stringify({
      ...manifest,
      content_security_policy: {
        extension_pages: "script-src 'self' 'unsafe-eval'",
      },
    }),
  );
  await expect(packageRuntime(root)).rejects.toThrow(/CSP/);
});

it('refuses a new generated update URL outside the reviewed manifest contract', async () => {
  const { root, manifest } = await fixture();
  await writeFile(
    join(root, 'dist/manifest.json'),
    JSON.stringify({
      ...manifest,
      update_url: 'https://fictional.invalid/update',
    }),
  );
  await expect(packageRuntime(root)).rejects.toThrow(/manifest field/);
});

it.each([
  ['sidepanel.html', '<img src="https://fictional.invalid/pixel.png">'],
  [
    'sidepanel.html',
    '<script type="module" src="./assets/missing.js"></script>',
  ],
  ['sidepanel.html', '<script>throw new Error("fictional")</script>'],
  ['assets/broken.js', 'import "../../outside.js";'],
  ['assets/broken.js', 'import "./missing.js";'],
  ['sidepanel.html', '<img srcset="https://fictional.invalid/pixel.png 1x">'],
])(
  'rejects missing/local-escaping/passive remote resources: %s %s',
  async (file, source) => {
    const { root } = await fixture();
    await writeFile(join(root, 'dist', file), source);
    await expect(packageRuntime(root)).rejects.toThrow();
  },
);
it('rejects syntactically broken generated JavaScript', async () => {
  const { root } = await fixture();
  await writeFile(join(root, 'dist/assets/broken.js'), 'export {');
  await expect(packageRuntime(root)).rejects.toThrow(/Invalid generated/);
});

it('accepts a static local backtick module import emitted by Vite, with exact target validation', async () => {
  const { root } = await fixture();
  await writeFile(
    join(root, 'dist/background.js'),
    'import(`./assets/panel.js`);',
  );
  await expect(packageRuntime(root)).resolves.toMatchObject({
    name: 'seatbuddies-0.8.0-chrome-test.zip',
  });
});
it.each([
  'import(`https://fictional.invalid/remote.js`);',
  'import(`./assets/${name}.js`);',
  'import(path);',
  'import(`./assets/missing.js`);',
  'import(`../outside.js`);',
  'globalThis[`fetch`]("https://fictional.invalid");',
])(
  'keeps dynamic/remote/missing/escaping imports and backtick network primitives blocked: %s',
  async (source) => {
    const { root } = await fixture();
    await writeFile(join(root, 'dist/background.js'), source);
    await expect(packageRuntime(root)).rejects.toThrow();
  },
);

it.each(['LICENSE', 'THIRD_PARTY_NOTICES.txt'])(
  'refuses missing runtime attribution: %s',
  async (file) => {
    const { root } = await fixture();
    await rm(join(root, 'dist', file));
    await expect(packageRuntime(root)).rejects.toThrow(/license notices/);
  },
);
it('rejects changing the reviewed spanning mode', async () => {
  const { root, manifest } = await fixture();
  await writeFile(
    join(root, 'dist/manifest.json'),
    JSON.stringify({ ...manifest, incognito: 'split' }),
  );
  await expect(packageRuntime(root)).rejects.toThrow(/incognito mode/);
});

it('native installation unpacks the checksum-verified runtime archive into its own disposable directory', async () => {
  const { root } = await fixture();
  const pkg = await packageRuntime(root);
  const unpacked = await unpackPackagedExtension(root);
  try {
    expect(unpacked.sha256).toBe(pkg.sha256);
    for (const file of pkg.files)
      expect(await readFile(join(unpacked.directory, file))).toEqual(
        await readFile(join(root, 'dist', file)),
      );
  } finally {
    await unpacked.cleanup();
  }
});
it('native installation rejects an altered archive even before Chrome can load it', async () => {
  const { root } = await fixture();
  const pkg = await packageRuntime(root);
  await writeFile(join(root, 'build', pkg.name), 'fictional altered ZIP');
  await expect(unpackPackagedExtension(root)).rejects.toThrow(/checksum/);
});
it('native installation refuses traversal even with a matching checksum', async () => {
  const { root } = await fixture();
  const pkg = await packageRuntime(root);
  const path = join(root, 'build', pkg.name);
  const files = unzipSync(await readFile(path));
  files['../outside.js'] = new TextEncoder().encode('fictional');
  const bytes = zipSync(files);
  await writeFile(path, bytes);
  await writeFile(
    `${path}.sha256`,
    `${createHash('sha256').update(bytes).digest('hex')}  ${pkg.name}\n`,
  );
  await expect(unpackPackagedExtension(root)).rejects.toThrow(/path/);
});

it.each([
  'wrong-level',
  'extra-asset',
  'missing-manifest',
  'corrupt-inner',
  'bad-inner-hash',
  'bad-outer-hash',
  'oversized',
])(
  'distributed Actions wrapper rejects %s before installation',
  async (fault) => {
    const { root } = await fixture();
    const pkg = await packageRuntime(root);
    const runtime = await readFile(join(root, 'build', pkg.name));
    const runtimeFiles = unzipSync(runtime);
    let inner = runtime;
    if (fault === 'missing-manifest') {
      delete runtimeFiles['manifest.json'];
      inner = zipSync(runtimeFiles);
    }
    if (fault === 'corrupt-inner') inner = Buffer.from('fictional corrupt ZIP');
    if (fault === 'oversized') {
      runtimeFiles['assets/large.js'] = new Uint8Array(11 * 1024 * 1024);
      inner = zipSync(runtimeFiles);
    }
    const files = {
      [pkg.name]: inner,
      [`${pkg.name}.sha256`]: Buffer.from(
        `${fault === 'bad-inner-hash' ? '0'.repeat(64) : digest(inner)}  ${pkg.name}\n`,
      ),
    };
    if (fault === 'extra-asset')
      files['profile.json'] = Buffer.from('fictional');
    const wrapper = fault === 'wrong-level' ? inner : zipSync(files);
    await expect(
      unpackActionsArtifact(
        wrapper,
        '0.8.0',
        fault === 'bad-outer-hash' ? '0'.repeat(64) : digest(wrapper),
      ),
    ).rejects.toThrow();
  },
);
it('installs bytes from the outer Actions ZIP, checks both hash levels and retains runtime notices/icons', async () => {
  const { root } = await fixture();
  const pkg = await packageRuntime(root);
  const inner = await readFile(join(root, 'build', pkg.name));
  const wrapper = zipSync({
    [pkg.name]: inner,
    [`${pkg.name}.sha256`]: await readFile(
      join(root, 'build', `${pkg.name}.sha256`),
    ),
  });
  const extracted = await unpackActionsArtifact(
    wrapper,
    '0.8.0',
    digest(wrapper),
  );
  try {
    expect(extracted.sha256).toBe(pkg.sha256);
    for (const name of pkg.files)
      expect(await readFile(join(extracted.directory, name))).toEqual(
        await readFile(join(root, 'dist', name)),
      );
  } finally {
    await extracted.cleanup();
  }
});
