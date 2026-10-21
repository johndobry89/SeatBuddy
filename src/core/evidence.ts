import { z } from 'zod';
import type { ManualState } from './manual-assistant';
import type { Role, Sessions } from './types';

// Deliberately no live-confirmed variant: no current input can establish it.
export const evidenceSchema = z.enum([
  'UNKNOWN',
  'SIMULATION',
  'MANUAL_SELF_REPORT',
  'BROWSER_CONTEXT_ONLY',
]);
export type Evidence = z.infer<typeof evidenceSchema>;
export const roleEvidenceSchema = z.strictObject({
  manual: z.enum(['UNKNOWN', 'MANUAL_SELF_REPORT']),
  context: z.enum(['UNKNOWN', 'BROWSER_CONTEXT_ONLY']),
  simulation: z.enum(['UNKNOWN', 'SIMULATION']),
});
export function roleEvidence(
  manual: ManualState,
  sessions: Sessions,
  role: Role,
): z.infer<typeof roleEvidenceSchema> {
  const track = manual.tracks[role];
  return {
    manual: track.reportedShowtime ? 'MANUAL_SELF_REPORT' : 'UNKNOWN',
    context: track.context ? 'BROWSER_CONTEXT_ONLY' : 'UNKNOWN',
    simulation: sessions[role].observation ? 'SIMULATION' : 'UNKNOWN',
  };
}
