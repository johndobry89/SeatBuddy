import { z } from './schema';
import { extensionVersionSchema, reviewedManifestScope } from './manifest';
import type { Snapshot } from '../background/coordinator';
import { version as buildVersion } from '../../package.json';
import { problemSchema } from '../core/manual-assistant';
import { roleEvidenceSchema } from '../core/evidence';

export const diagnosticSchema = z.strictObject({
  build: z.strictObject({
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    channel: z.literal('TEST'),
    diagnosticSchema: z.literal(1),
  }),
  fixtureAdapter: z.literal('FICTIONAL_V1_ONLY'),
  failedStep: z.enum(['NONE', 'TRANSPORT', ...problemSchema.options]),
  extensionVersion: extensionVersionSchema,
  transport: z.enum(['EXTENSION', 'LOCAL_ONLY']),
  mode: z.enum(['MANUAL', 'DEMO', 'FIXTURE', 'UNKNOWN']),
  capabilities: z.strictObject({
    messaging: z.boolean(),
    sidePanelOpen: z.boolean(),
    contextQuery: z.boolean(),
  }),
  permissionScope: z.enum(['SIDE_PANEL_AND_STORAGE', 'UNEXPECTED', 'UNKNOWN']),
  incognitoConsent: z.enum(['ALLOWED', 'NOT_ALLOWED', 'UNKNOWN']),
  evidence: z
    .strictObject({ A: roleEvidenceSchema, B: roleEvidenceSchema })
    .nullable(),
  realVueConfirmation: z.literal('NOT_IMPLEMENTED'),
  productionAdapter: z.literal('DISABLED_G0'),
  persistence: z.enum(['TEMPORARY', 'REMEMBERED', 'UNAVAILABLE', 'LOCAL_ONLY']),
});
export type Diagnostic = z.infer<typeof diagnosticSchema>;

/** Allowlist only. Never serialize a manifest, snapshot, browser object or Error. */
export function selfCheck(
  state: Snapshot | null,
  offline: boolean,
): Diagnostic {
  let version: string | null = null;
  let scope: Diagnostic['permissionScope'];
  try {
    const manifest = chrome.runtime.getManifest();
    const parsed = diagnosticSchema.shape.extensionVersion.safeParse(
      manifest.version,
    );
    if (parsed.success) version = parsed.data;
    scope = reviewedManifestScope.safeParse(manifest).success
      ? 'SIDE_PANEL_AND_STORAGE'
      : 'UNEXPECTED';
  } catch {
    // An ordinary local preview has no extension manifest.
    scope = 'UNKNOWN';
  }
  const api = typeof chrome === 'undefined' ? undefined : chrome;
  return diagnosticSchema.parse({
    build: { version: buildVersion, channel: 'TEST', diagnosticSchema: 1 },
    fixtureAdapter: 'FICTIONAL_V1_ONLY',
    failedStep: offline
      ? 'TRANSPORT'
      : (state?.manual.tracks.A.problem ??
        (state?.manual.planningMode === 'TOGETHER'
          ? state.manual.tracks.B.problem
          : null) ??
        'NONE'),
    extensionVersion: version,
    transport: offline ? 'LOCAL_ONLY' : 'EXTENSION',
    mode: state?.mode ?? 'UNKNOWN',
    capabilities: {
      messaging: typeof api?.runtime?.sendMessage === 'function',
      sidePanelOpen: typeof api?.sidePanel?.open === 'function',
      contextQuery: typeof api?.tabs?.query === 'function',
    },
    permissionScope: scope,
    incognitoConsent:
      offline || !state
        ? 'UNKNOWN'
        : state.incognitoAllowed
          ? 'ALLOWED'
          : 'NOT_ALLOWED',
    evidence: state?.evidence ?? null,
    realVueConfirmation: 'NOT_IMPLEMENTED',
    productionAdapter: 'DISABLED_G0',
    persistence: offline
      ? 'LOCAL_ONLY'
      : (state?.retention.mode ?? 'UNAVAILABLE'),
  });
}

/** Re-validate even caller-provided reports; never copy arbitrary object fields. */
export function diagnosticText(report: unknown): string {
  return JSON.stringify(diagnosticSchema.parse(report), null, 2);
}
