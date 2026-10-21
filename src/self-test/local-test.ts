import { z } from '../privacy/schema';
import { Coordinator } from '../background/coordinator';
import { manualSteps, MANUAL_AGE_MS } from '../core/manual-assistant';
import { routeMessage } from '../background/message-router';
import { fictionalObserver } from '../adapters/vue-cinemas/fictional';
import { productionPolicy } from '../adapters/vue-cinemas';
import { diagnosticSchema } from '../privacy/diagnostics';

export const testIds = [
  'SOLO_DEFAULT',
  'ORDER_GUARD',
  'TOGETHER',
  'PARTIAL_TRUTH',
  'B_ONLY_RESET',
  'STALE_REVIEW',
  'FIXTURE_VALID',
  'SCHEMA_FAIL_CLOSED',
  'PROTOCOL_GUARD',
  'CHROME_MANIFEST',
  'SIDE_PANEL_API',
  'STORAGE_API',
] as const;
export const localTestReportSchema = z
  .strictObject({
    kind: z.literal('FICTIONAL_TEST'),
    extensionVersion: diagnosticSchema.shape.extensionVersion,
    adapterVersion: z.literal('FICTIONAL_V1'),
    checks: z
      .array(
        z.strictObject({
          id: z.enum(testIds),
          status: z.enum(['PASS', 'FAIL', 'NOT_TESTED']),
          code: z.enum([
            'OK',
            'CORE_MISMATCH',
            'CAPABILITY_UNAVAILABLE',
            'MANIFEST_MISMATCH',
            'DOM_UNAVAILABLE',
          ]),
        }),
      )
      .length(testIds.length),
  })
  .refine(
    (report) =>
      new Set(report.checks.map((check) => check.id)).size === testIds.length,
  );
export type LocalTestReport = z.infer<typeof localTestReportSchema>;
type TestId = (typeof testIds)[number];
export const testLabels: Record<TestId, string> = {
  SOLO_DEFAULT: 'Solo zonder tweede traject',
  ORDER_GUARD: 'Geen overgeslagen eigen stappen',
  TOGETHER: 'Twee onafhankelijke fictieve trajecten',
  PARTIAL_TRUTH: 'Partiële melding blijft ongeverifieerd',
  B_ONLY_RESET: 'B wissen behoudt A',
  STALE_REVIEW: 'Verlopen review blokkeert vervolg',
  FIXTURE_VALID: 'Eigen fictieve adapter v1',
  SCHEMA_FAIL_CLOSED: 'Gewijzigd schema blijft UNKNOWN',
  PROTOCOL_GUARD: 'Verkeerde zender wordt geweigerd',
  CHROME_MANIFEST: 'Extensiecontext, versie en rechtenscope',
  SIDE_PANEL_API: 'Side Panel API aanwezig (geen opening getest)',
  STORAGE_API: 'Opslag-API aanwezig (geen opslag getest)',
};
export const testReasons = {
  OK: 'Deze afgebakende controle slaagde.',
  CORE_MISMATCH:
    'Lokale logica wijkt af. Gebruik de handmatige route en meld alleen deze technische code.',
  CAPABILITY_UNAVAILABLE:
    'Browsermogelijkheid ontbreekt of kon niet worden gelezen. Gebruik een normale extensiepagina of de lokale handmatige route.',
  MANIFEST_MISMATCH:
    'Versie of rechtenscope wijkt af. Controleer of je de juiste testbuild hebt geladen.',
  DOM_UNAVAILABLE:
    'De lokale adapterproef kon geen eigen testdocument maken. Handmatig verder blijft mogelijk.',
} as const;
const now = 1_000_000;
const plan = {
  movie: 'De maan van papier',
  cinema: 'Fictief Filmhuis',
  date: '2030-04-12',
  time: '19:30',
  hall: 'Zaal 2',
};
const rootHtml =
  '<section data-seatmates-screening-fixture="v1" data-movie="De maan van papier" data-cinema="Fictief Filmhuis" data-date="2030-04-12" data-time="19:30" data-hall="Zaal 2"><button data-fictional-seat data-label="F10" data-row="F" data-section="links" data-category="STANDARD" data-position="4" aria-pressed="true"></button></section>';
function prepared() {
  const c = new Coordinator();
  if (
    c.manualCommand(
      { type: 'PLANNING_MODE', mode: 'TOGETHER', resetB: false },
      now,
      [],
      false,
    )
  )
    throw new Error('Local model');
  if (c.manualCommand({ type: 'PLAN', plan }, now, [], false))
    throw new Error('Local model');
  for (const role of ['A', 'B'] as const)
    if (
      c.manualCommand(
        {
          type: 'MANUAL_DETAILS',
          role,
          showtime: plan,
          seat: { row: 'F', number: role === 'A' ? '10' : '11' },
        },
        now,
        [],
        false,
      )
    )
      throw new Error('Local model');
  if (c.manualCommand({ type: 'REVIEW_PLAN' }, now, [], false))
    throw new Error('Local model');
  return c;
}
export interface LocalTestEnvironment {
  // Deliberately no runtime.sendMessage, storage port, tab query or user state.
  capabilities: () => {
    extension: boolean;
    manifest: unknown;
    sidePanel: boolean;
    storage: boolean;
  };
  fixtureRoot: (html: string) => ParentNode | null;
}
export function browserTestEnvironment(): LocalTestEnvironment {
  return {
    capabilities: () => {
      const api = typeof chrome === 'undefined' ? undefined : chrome;
      const extension =
        typeof api?.runtime?.id === 'string' && !!api.runtime.id;
      return {
        extension,
        manifest: extension ? api.runtime.getManifest() : null,
        sidePanel: extension && typeof api?.sidePanel?.open === 'function',
        storage:
          extension &&
          typeof api?.storage?.local?.get === 'function' &&
          typeof api?.storage?.session?.get === 'function' &&
          typeof api?.storage?.local?.setAccessLevel === 'function' &&
          typeof api?.storage?.session?.setAccessLevel === 'function',
      };
    },
    fixtureRoot: (html) => {
      if (typeof document === 'undefined') return null;
      const root = document.implementation.createHTMLDocument('Fictional test');
      root.body.innerHTML = html; // Fixed packaged literal only, never user/site HTML.
      return root;
    },
  };
}
function coreCheck(
  id: TestId,
  environment: LocalTestEnvironment,
): boolean | null {
  if (id === 'SOLO_DEFAULT') {
    const c = new Coordinator();
    return (
      c.manual.planningMode === 'SOLO' &&
      c.manual.review === null &&
      !!c.manualCommand(
        { type: 'ACKNOWLEDGE', role: 'B', step: 'ACCOUNT' },
        now,
        [],
        false,
      )
    );
  }
  if (id === 'FIXTURE_VALID' || id === 'SCHEMA_FAIL_CLOSED') {
    const root = environment.fixtureRoot(
      id === 'FIXTURE_VALID'
        ? rootHtml
        : rootHtml.replace('fixture="v1"', 'fixture="v2"'),
    );
    if (!root) return null;
    const observed = fictionalObserver.observe(root, now);
    return id === 'FIXTURE_VALID'
      ? observed.kind === 'FICTIONAL_DOM' &&
          observed.observation.status === 'SELECTED'
      : observed.kind === 'UNAVAILABLE' && productionPolicy.enabled === false;
  }
  const c = prepared();
  if (id === 'ORDER_GUARD')
    return (
      !!c.manualCommand(
        { type: 'ACKNOWLEDGE', role: 'A', step: 'DONE' },
        now,
        [],
        false,
      ) && c.manual.tracks.A.completed.length === 0
    );
  if (id === 'TOGETHER')
    return (
      c.manual.planningMode === 'TOGETHER' &&
      c.manual.tracks.B.reportedShowtime?.movie === plan.movie &&
      c.manual.tracks.B.completed.length === 0
    );
  if (id === 'PROTOCOL_GUARD')
    return !routeMessage(
      c,
      {
        type: 'WORKFLOW',
        generation: c.generation,
        revision: c.manual.revision,
        buddyEpoch: c.buddyEpoch,
        command: { type: 'ACKNOWLEDGE', role: 'A', step: 'ACCOUNT' },
      },
      {
        id: 'fictional-self-test',
        url: 'chrome-extension://fictional-self-test/popup.html',
        frameId: 0,
      },
      'fictional-self-test',
      false,
      now,
    ).ok;
  if (id === 'STALE_REVIEW') {
    c.snapshot(now + MANUAL_AGE_MS, false);
    return (
      c.manual.review === null &&
      !!c.manualCommand(
        { type: 'ACKNOWLEDGE', role: 'A', step: 'ACCOUNT' },
        now + MANUAL_AGE_MS,
        [],
        false,
      )
    );
  }
  for (const step of manualSteps)
    if (
      c.manualCommand({ type: 'ACKNOWLEDGE', role: 'A', step }, now, [], false)
    )
      return false;
  const A = JSON.stringify(c.manual.tracks.A);
  if (id === 'B_ONLY_RESET')
    return (
      c.manualCommand(
        { type: 'PLANNING_MODE', mode: 'SOLO', resetB: true },
        now,
        [],
        false,
      ) === null &&
      JSON.stringify(c.manual.tracks.A) === A &&
      c.manual.tracks.B.completed.length === 0 &&
      c.manual.tracks.B.reportedShowtime === null
    );
  c.manualCommand(
    { type: 'REPORT_PROBLEM', role: 'B', problem: 'FAILED' },
    now,
    [],
    false,
  );
  const state = c.snapshot(now, false);
  return (
    state.evidence.A.manual === 'MANUAL_SELF_REPORT' &&
    state.evidence.B.context === 'UNKNOWN' &&
    state.manual.tracks.A.completed.includes('DONE') &&
    state.manual.tracks.B.problem === 'FAILED' &&
    !JSON.stringify(state).includes('CONFIRMED')
  );
}
function breathe(signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const cancel = () => {
      clearTimeout(timer);
      reject(new DOMException('Cancelled', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', cancel);
      resolve();
    }, 0);
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) cancel();
  });
}
/** Pure isolated models + detached fictional DOM + capability presence only.
 * No caller/session/worker/storage data enters this interface. */
export async function runLocalSelfTest(
  signal: AbortSignal,
  environment: LocalTestEnvironment = browserTestEnvironment(),
): Promise<LocalTestReport> {
  const checks: LocalTestReport['checks'] = [];
  let capability: ReturnType<LocalTestEnvironment['capabilities']> | null =
    null;
  let capabilityFailed = false;
  let extensionVersion: LocalTestReport['extensionVersion'] = null;
  try {
    capability = environment.capabilities();
  } catch {
    capabilityFailed = true;
  }
  for (const id of testIds) {
    await breathe(signal);
    if (id === 'CHROME_MANIFEST') {
      const parsed = z
        .strictObject({
          manifest_version: z.literal(3),
          version: diagnosticSchema.shape.extensionVersion,
          permissions: z.tuple([z.literal('sidePanel'), z.literal('storage')]),
        })
        .safeParse(
          capability?.manifest && typeof capability.manifest === 'object'
            ? {
                manifest_version: Reflect.get(
                  capability.manifest,
                  'manifest_version',
                ),
                version: Reflect.get(capability.manifest, 'version'),
                permissions: Reflect.get(capability.manifest, 'permissions'),
              }
            : null,
        );
      // Check the actual manifest's other privilege fields without exporting it.
      const manifest = capability?.manifest;
      const safe =
        parsed.success &&
        parsed.data.version !== null &&
        !!manifest &&
        typeof manifest === 'object' &&
        [
          'host_permissions',
          'optional_host_permissions',
          'optional_permissions',
          'content_scripts',
        ].every((key) => !Reflect.get(manifest, key)?.length);
      extensionVersion = parsed.success ? parsed.data.version : null;
      checks.push({
        id,
        status: capabilityFailed
          ? 'FAIL'
          : !capability?.extension
            ? 'NOT_TESTED'
            : safe
              ? 'PASS'
              : 'FAIL',
        code:
          capabilityFailed || !capability?.extension
            ? 'CAPABILITY_UNAVAILABLE'
            : safe
              ? 'OK'
              : 'MANIFEST_MISMATCH',
      });
    } else if (id === 'SIDE_PANEL_API' || id === 'STORAGE_API') {
      const present =
        id === 'SIDE_PANEL_API' ? capability?.sidePanel : capability?.storage;
      checks.push({
        id,
        status: capabilityFailed
          ? 'FAIL'
          : !capability?.extension
            ? 'NOT_TESTED'
            : present
              ? 'PASS'
              : 'NOT_TESTED',
        code: present ? 'OK' : 'CAPABILITY_UNAVAILABLE',
      });
    } else {
      try {
        const result = coreCheck(id, environment);
        checks.push({
          id,
          status: result === null ? 'NOT_TESTED' : result ? 'PASS' : 'FAIL',
          code:
            result === null
              ? 'DOM_UNAVAILABLE'
              : result
                ? 'OK'
                : 'CORE_MISMATCH',
        });
      } catch {
        checks.push({ id, status: 'FAIL', code: 'CORE_MISMATCH' });
      }
    }
  }
  return localTestReportSchema.parse({
    kind: 'FICTIONAL_TEST',
    extensionVersion,
    adapterVersion: 'FICTIONAL_V1',
    checks,
  });
}
export function localTestText(report: unknown) {
  return JSON.stringify(localTestReportSchema.parse(report), null, 2);
}
