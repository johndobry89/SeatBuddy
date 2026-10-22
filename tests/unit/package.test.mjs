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
import { unzipSync } from 'fflate';
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
  const manifest = {
    manifest_version: 3,
    content_security_policy: {
      extension_pages:
        "script-src 'self'; object-src 'none'; connect-src 'none'; base-uri 'none'",
    },
    version: '0.7.0',
    permissions: ['sidePanel', 'storage'],
    icons,
    action: { default_popup: 'popup.html', default_icon: icons },
    background: { service_worker: 'background.js' },
    side_panel: { default_path: 'sidepanel.html' },
  };
  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({ version: '0.7.0' }),
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
  expect(result.name).toBe('seatbuddies-0.7.0-chrome-test.zip');
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
