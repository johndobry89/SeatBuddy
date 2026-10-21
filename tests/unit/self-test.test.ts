import { afterEach, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { Coordinator } from '../../src/background/coordinator';
import {
  runLocalSelfTest,
  browserTestEnvironment,
  localTestText,
  localTestReportSchema,
  type LocalTestEnvironment,
} from '../../src/self-test/local-test';
import {
  applyManual,
  emptyManual,
  manualSteps,
} from '../../src/core/manual-assistant';
import { fictionalObservation } from '../../src/fixtures/data';
const manifest = {
  manifest_version: 3,
  version: '0.7.0',
  permissions: ['sidePanel', 'storage'],
};
function environment(): LocalTestEnvironment {
  return {
    capabilities: () => ({
      extension: true,
      manifest,
      sidePanel: true,
      storage: true,
    }),
    fixtureRoot: (html) => new JSDOM(html).window.document,
  };
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it('executes every isolated check and copies only strict technical allowlist fields', async () => {
  const result = await runLocalSelfTest(
    new AbortController().signal,
    environment(),
  );
  expect(result.checks).toHaveLength(12);
  expect(result.checks.every((check) => check.status === 'PASS')).toBe(true);
  const text = localTestText(result);
  expect(JSON.parse(text)).toMatchObject({
    kind: 'FICTIONAL_TEST',
    extensionVersion: '0.7.0',
    adapterVersion: 'FICTIONAL_V1',
  });
  for (const value of [
    'De maan van papier',
    'Fictief Filmhuis',
    '2030-04-12',
    '19:30',
    'Zaal 2',
    'F10',
    'F11',
    'CONFIRMED',
    'tabId',
    'generation',
    'chrome-extension://',
  ])
    expect(text).not.toContain(value);
  expect(
    await runLocalSelfTest(new AbortController().signal, environment()),
  ).toEqual(result);
});
it('uses only public capability presence, never messaging/storage contents/tabs/incognito; the real session stays unchanged', async () => {
  const forbidden = vi.fn(() => {
    throw new Error('Must not read user state');
  });
  const c = new Coordinator();
  c.manualCommand(
    { type: 'PLAN', plan: fictionalObservation('A', 1_000_000).showtime },
    1_000_000,
    [],
    false,
  );
  c.buddyCommand({
    type: 'BUDDY_MUTATE',
    generation: c.generation,
    revision: 0,
    resetB: false,
    action: { kind: 'ADD', nickname: 'Fictief maatje' },
  });
  const before = structuredClone(c.snapshot(1_000_000, false));
  const saved = {
    local: { 'seatbuddies.roster.v1': { version: 1, roster: c.buddy.roster } },
    session: {
      'seatbuddies.draft.v1': {
        version: 1,
        createdAt: 1_000_000,
        plan: c.manual.plan,
      },
    },
  };
  const beforeSaved = structuredClone(saved);
  vi.stubGlobal('chrome', {
    runtime: {
      id: 'private-internal-id',
      getManifest: () => manifest,
      sendMessage: forbidden,
    },
    sidePanel: { open: forbidden },
    storage: {
      local: {
        get: forbidden,
        set: forbidden,
        remove: forbidden,
        setAccessLevel: forbidden,
      },
      session: {
        get: forbidden,
        set: forbidden,
        remove: forbidden,
        setAccessLevel: forbidden,
      },
    },
    get tabs() {
      throw new Error('Private tabs forbidden');
    },
    get extension() {
      throw new Error('Incognito forbidden');
    },
  });
  const actual = browserTestEnvironment();
  const env = { ...actual, fixtureRoot: environment().fixtureRoot };
  for (let i = 0; i < 2; i++)
    expect(
      (await runLocalSelfTest(new AbortController().signal, env)).checks.every(
        (check) => check.status === 'PASS',
      ),
    ).toBe(true);
  expect(forbidden).not.toHaveBeenCalled();
  expect(c.snapshot(1_000_000, false)).toEqual(before);
  expect(saved).toEqual(beforeSaved);
});
it('ordinary preview reports browser basics NOT_TESTED instead of extension success', async () => {
  vi.stubGlobal('chrome', undefined);
  const env = {
    ...browserTestEnvironment(),
    fixtureRoot: environment().fixtureRoot,
  };
  const result = await runLocalSelfTest(new AbortController().signal, env);
  expect(result.extensionVersion).toBeNull();
  expect(
    result.checks
      .filter((check) => check.status === 'NOT_TESTED')
      .map((check) => check.id),
  ).toEqual(['CHROME_MANIFEST', 'SIDE_PANEL_API', 'STORAGE_API']);
});
it('unavailable DOM stays NOT_TESTED, changed fictional DOM fails the valid adapter test', async () => {
  let env = environment();
  env.fixtureRoot = () => null;
  const unsupported = await runLocalSelfTest(new AbortController().signal, env);
  expect(
    unsupported.checks.find((check) => check.id === 'FIXTURE_VALID'),
  ).toMatchObject({ status: 'NOT_TESTED', code: 'DOM_UNAVAILABLE' });
  env = environment();
  env.fixtureRoot = () => new JSDOM('<h1>UNKNOWN</h1>').window.document;
  const broken = await runLocalSelfTest(new AbortController().signal, env);
  expect(
    broken.checks.find((check) => check.id === 'FIXTURE_VALID'),
  ).toMatchObject({ status: 'FAIL', code: 'CORE_MISMATCH' });
});
it.each([
  { permissions: ['sidePanel', 'cookies'] },
  { version: 'fictional@invalid.test' },
  { host_permissions: ['https://fictional.invalid/*'] },
  { optional_permissions: ['debugger'] },
  { content_scripts: [{ matches: ['<all_urls>'] }] },
])('never calls an unexpected manifest safe: %j', async (change) => {
  const env = environment();
  env.capabilities = () => ({
    extension: true,
    manifest: { ...manifest, ...change },
    sidePanel: true,
    storage: true,
  });
  const result = await runLocalSelfTest(new AbortController().signal, env);
  expect(
    result.checks.find((check) => check.id === 'CHROME_MANIFEST')?.status,
  ).toBe('FAIL');
  expect(localTestText(result)).not.toContain('@');
  expect(localTestText(result)).not.toContain('https:');
});
it('raw exceptions never enter reports, and cancellation refuses a late result', async () => {
  const env = environment();
  env.capabilities = () => {
    throw new Error('fictional-private-token@invalid.test stack');
  };
  const result = await runLocalSelfTest(new AbortController().signal, env);
  expect(
    result.checks.find((check) => check.id === 'CHROME_MANIFEST'),
  ).toMatchObject({ status: 'FAIL', code: 'CAPABILITY_UNAVAILABLE' });
  expect(localTestText(result)).not.toContain('private-token');
  const controller = new AbortController();
  const pending = runLocalSelfTest(controller.signal, environment());
  controller.abort();
  await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
});
it.each([
  { token: 'fictional' },
  { url: 'https://fictional.invalid/' },
  { plan: { movie: 'fictional' } },
  { checks: [] },
  { adapterVersion: 'UNKNOWN_LIVE' },
  { kind: 'LIVE_VERIFIED' },
])(
  'rejects report fields/schema outside the copy allowlist: %j',
  async (change) => {
    const result = await runLocalSelfTest(
      new AbortController().signal,
      environment(),
    );
    expect(() => localTestText({ ...result, ...change })).toThrow();
  },
);
it('rejects duplicate test IDs and unknown per-item payload/status fields', async () => {
  const result = await runLocalSelfTest(
    new AbortController().signal,
    environment(),
  );
  expect(
    localTestReportSchema.safeParse({
      ...result,
      checks: result.checks.map(() => result.checks[0]),
    }).success,
  ).toBe(false);
  for (const change of [
    { status: 'CONFIRMED' },
    { stack: 'fictional-error' },
    { code: 'private text' },
  ])
    expect(() =>
      localTestText({
        ...result,
        checks: result.checks.map((check, index) =>
          index ? check : { ...check, ...change },
        ),
      }),
    ).toThrow();
});
it('initial seat entry is atomic, does not acknowledge anything, and cannot activate B in solo', () => {
  const plan = fictionalObservation('A', 1_000_000).showtime;
  const state = emptyManual();
  expect(
    applyManual(
      state,
      {
        type: 'PLAN',
        plan,
        initialSeats: {
          A: { row: 'F', number: '10' },
          B: { row: 'F', number: '11' },
        },
      },
      1_000_000,
    ),
  ).not.toBeNull();
  expect(state.plan).toBeNull();
  expect(
    applyManual(
      state,
      { type: 'PLAN', plan, initialSeats: { A: { row: 'F', number: '10' } } },
      1_000_000,
    ),
  ).toBeNull();
  expect(state.tracks.A.seat).toEqual({ row: 'F', number: '10' });
  expect(state.tracks.B.seat.row).toBe('');
  expect(state.tracks.A.completed).toEqual([]);
  expect(state.review).toBeNull();
  expect(applyManual(state, { type: 'REVIEW_PLAN' }, 1_000_000)).toBeNull();
  for (const step of manualSteps)
    expect(
      applyManual(state, { type: 'ACKNOWLEDGE', role: 'A', step }, 1_000_000),
    ).toBeNull();
});
