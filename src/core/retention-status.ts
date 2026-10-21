import { z } from '../privacy/schema';

export const retentionStatusSchema = z.strictObject({
  mode: z.enum(['TEMPORARY', 'REMEMBERED', 'UNAVAILABLE']),
  available: z.boolean(),
  draftSupported: z.boolean(),
  draftExpiresAt: z.number().int().nonnegative().nullable(),
  notice: z.string().max(500),
});
export type RetentionStatus = z.infer<typeof retentionStatusSchema>;
export function emptyRetention(): RetentionStatus {
  return {
    mode: 'TEMPORARY',
    available: false,
    draftSupported: false,
    draftExpiresAt: null,
    notice:
      'Bijnamen zijn tijdelijk. Lokaal onthouden is nog niet beschikbaar.',
  };
}
