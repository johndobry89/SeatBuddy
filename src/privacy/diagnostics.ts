import { z } from 'zod';
import type { Snapshot } from '../background/coordinator';
import { roleEvidenceSchema } from '../core/evidence';

export const diagnosticSchema = z.strictObject({
  extensionVersion: z
    .string()
    .regex(/^\d+(\.\d+){1,3}$/)
    .max(24)
    .nullable(),
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
    scope =
      manifest.manifest_version === 3 &&
      JSON.stringify(manifest.permissions) ===
        JSON.stringify(['sidePanel', 'storage']) &&
      !manifest.host_permissions?.length &&
      !manifest.optional_host_permissions?.length &&
      !manifest.optional_permissions?.length &&
      !manifest.content_scripts?.length
        ? 'SIDE_PANEL_AND_STORAGE'
        : 'UNEXPECTED';
  } catch {
    // An ordinary local preview has no extension manifest.
    scope = 'UNKNOWN';
  }
  const api = typeof chrome === 'undefined' ? undefined : chrome;
  return diagnosticSchema.parse({
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
