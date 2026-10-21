import { afterEach, expect, it, vi } from 'vitest';
import { selfCheck, diagnosticSchema } from '../../src/privacy/diagnostics';
import { Coordinator } from '../../src/background/coordinator';
import { fictionalObservation } from '../../src/fixtures/data';
afterEach(() => vi.unstubAllGlobals());
it('reduces diagnostics to an explicit allowlist without enumerating tabs or exposing plan/IDs', () => {
  const query = vi.fn();
  vi.stubGlobal('chrome', {
    runtime: {
      getManifest: () => ({
        manifest_version: 3,
        version: '0.6.0',
        permissions: ['sidePanel', 'storage'],
        author: 'fictional-private-name',
      }),
      sendMessage: vi.fn(),
    },
    sidePanel: { open: vi.fn() },
    tabs: { query },
  });
  const c = new Coordinator();
  const now = Date.now();
  c.manualCommand(
    { type: 'PLAN', plan: fictionalObservation('A', now).showtime },
    now,
    [],
    false,
  );
  c.manual.tracks.A.context = {
    tabId: 772322,
    windowId: 880123,
    incognito: false,
  };
  c.demo('partial', now);
  c.buddyCommand({
    type: 'BUDDY_MUTATE',
    generation: c.generation,
    revision: 0,
    resetB: false,
    action: { kind: 'ADD', nickname: 'Fictieve schermnaam' },
  });
  const report = selfCheck(c.snapshot(now, true), false);
  expect(report).toMatchObject({
    extensionVersion: '0.6.0',
    permissionScope: 'SIDE_PANEL_AND_STORAGE',
    transport: 'EXTENSION',
    realVueConfirmation: 'NOT_IMPLEMENTED',
    productionAdapter: 'DISABLED_G0',
    evidence: {
      A: {
        manual: 'MANUAL_SELF_REPORT',
        context: 'BROWSER_CONTEXT_ONLY',
        simulation: 'SIMULATION',
      },
      B: { context: 'UNKNOWN' },
    },
  });
  expect(query).not.toHaveBeenCalled();
  for (const secret of [
    'De maan van papier',
    'Fictief Filmhuis',
    '772322',
    '880123',
    c.generation,
    'fictional-private-name',
    'Fictieve schermnaam',
  ])
    expect(JSON.stringify(report)).not.toContain(secret);
  expect(
    diagnosticSchema.safeParse({ ...report, url: 'https://example.invalid/' })
      .success,
  ).toBe(false);
});
it('does not assume consent/capabilities in a local preview or after browser errors', () => {
  vi.stubGlobal('chrome', undefined);
  expect(selfCheck(null, true)).toMatchObject({
    extensionVersion: null,
    permissionScope: 'UNKNOWN',
    incognitoConsent: 'UNKNOWN',
    mode: 'UNKNOWN',
    transport: 'LOCAL_ONLY',
    capabilities: {
      messaging: false,
      contextQuery: false,
      sidePanelOpen: false,
    },
  });
});
it('flags additional privileges and refuses unsafe version strings without copying them', () => {
  vi.stubGlobal('chrome', {
    runtime: {
      getManifest: () => ({
        manifest_version: 3,
        version: 'fictional@invalid.test',
        permissions: ['sidePanel', 'cookies'],
        host_permissions: ['<all_urls>'],
      }),
    },
  });
  const report = selfCheck(
    new Coordinator().snapshot(Date.now(), false),
    false,
  );
  expect(report.permissionScope).toBe('UNEXPECTED');
  expect(report.extensionVersion).toBeNull();
  expect(JSON.stringify(report)).not.toContain('@');
});
