import { z } from '../../privacy/schema';
import { showtimeSchema, type Showtime } from '../../core/types';
import { matchShowtimes } from '../../core/showtime-matcher';

export const OBSERVATION_TTL_MS = 30_000;
const safeLabel = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .refine((value) => !/[@<>\p{Cc}\p{Cf}]|https?:|www\.|\d{5}/u.test(value));
export const observedScreeningSchema = showtimeSchema.extend({
  movie: safeLabel.nullable(),
  cinema: safeLabel.nullable(),
  hall: safeLabel.nullable(),
});
export type ObservedScreening = z.infer<typeof observedScreeningSchema>;
export const compatibilityCodeSchema = z.enum([
  'READABLE_FICTION',
  'WRONG_SCOPE',
  'PERMISSION_UNKNOWN',
  'DOCUMENT_CHANGED',
  'DOM_CHANGED',
  'HIDDEN',
  'MISSING_FIELDS',
  'AMBIGUOUS',
  'CANVAS',
  'SERVER_UNAVAILABLE',
  'INVALID_DATA',
  'STALE',
  'SCREENING_MISMATCH',
  'DISPOSED',
]);
// Observing a label cannot establish selection, availability, geometry or a booking.
export const readOnlyObservationSchema = z
  .strictObject({
    kind: z.literal('FICTIONAL_READ_ONLY'),
    status: z.literal('UNKNOWN'),
    provenance: z.strictObject({
      source: z.literal('PACKAGED_FICTION'),
      world: z.enum(['ISOLATED', 'PACKAGED_PAGE', 'LOCAL_PREVIEW']),
      observedAt: z.number().int().nonnegative(),
    }),
    screening: observedScreeningSchema.nullable(),
    seatDisplay: z
      .strictObject({
        labels: z
          .array(z.string().regex(/^[A-Z]{1,2}[1-9]\d{0,2}$/))
          .min(1)
          .max(2),
        geometry: z.literal('UNKNOWN'),
        availability: z.literal('UNKNOWN'),
        relationship: z.literal('LABELS_ONLY_UNVERIFIED'),
      })
      .nullable(),
    compatibility: compatibilityCodeSchema,
  })
  .refine(
    (value) =>
      value.compatibility !== 'READABLE_FICTION' ||
      (value.screening !== null &&
        Object.values(value.screening).every((field) => field !== null)),
  )
  .refine(
    (value) =>
      !value.seatDisplay ||
      new Set(value.seatDisplay.labels).size ===
        value.seatDisplay.labels.length,
  );
export type ReadOnlyObservation = z.infer<typeof readOnlyObservationSchema>;
export type ObservationProvenance = ReadOnlyObservation['provenance'];
export type ObservedSeatDisplay = NonNullable<
  ReadOnlyObservation['seatDisplay']
>;
export type ObservationFreshness = 'FRESH' | 'UNKNOWN';
export function freshness(
  observation: ReadOnlyObservation,
  now: number,
): ObservationFreshness {
  const age = now - observation.provenance.observedAt;
  return Number.isSafeInteger(now) && age >= 0 && age < OBSERVATION_TTL_MS
    ? 'FRESH'
    : 'UNKNOWN';
}
export type CompatibilityResult = {
  status: 'READABLE_FICTION' | 'UNKNOWN';
  reason: ReadOnlyObservation['compatibility'];
  fallback: 'MANUAL_ONLY';
};
export function compareObservation(
  observation: ReadOnlyObservation,
  expected: Showtime,
  now: number,
): CompatibilityResult {
  const reason =
    freshness(observation, now) !== 'FRESH'
      ? 'STALE'
      : observation.compatibility !== 'READABLE_FICTION'
        ? observation.compatibility
        : matchShowtimes(observation.screening, expected) !== 'MATCH'
          ? 'SCREENING_MISMATCH'
          : 'READABLE_FICTION';
  return {
    status: reason === 'READABLE_FICTION' ? reason : 'UNKNOWN',
    reason,
    fallback: 'MANUAL_ONLY',
  };
}
