import { z } from '../privacy/schema';
import { roleSchema, showtimeSchema, type Role } from './types';
import { matchShowtimes } from './showtime-matcher';

// Product policy, not a claim about Vue's current terms or prices. No paid override.
export const zeroExtraPolicy = Object.freeze({
  enabled: true,
  ultraLux: 'EXCLUDED',
} as const);
export const seatCategorySchema = z.enum([
  'UNKNOWN',
  'LUX',
  'SAVER_LUX',
  'SUPER_SAVER_LUX',
  'ULTRA_LUX',
]);
export type SeatCategory = z.infer<typeof seatCategorySchema>;
export const categoryLabels: Record<SeatCategory, string> = {
  UNKNOWN: 'Onbekend',
  LUX: 'Lux',
  SAVER_LUX: 'Saver Lux',
  SUPER_SAVER_LUX: 'Super Saver Lux',
  ULTRA_LUX: 'Ultra Lux — uitgesloten',
};
export function categoryFromLabel(label: unknown): SeatCategory {
  if (typeof label !== 'string') return 'UNKNOWN';
  const parsed = seatCategorySchema.safeParse(
    label.trim().toUpperCase().replace(/\s+/g, '_'),
  );
  return parsed.success ? parsed.data : 'UNKNOWN';
}
export function categoryEligibility(
  category: SeatCategory,
): 'CANDIDATE' | 'EXCLUDED' | 'UNKNOWN' {
  return category === 'ULTRA_LUX'
    ? 'EXCLUDED'
    : category === 'UNKNOWN'
      ? 'UNKNOWN'
      : 'CANDIDATE';
}
export const PAIR_TTL_MS = 30_000;
const key = z.string().regex(/^[A-Za-z0-9_-]{1,24}$/);
const stamp = z.number().int().nonnegative();
const revision = z.number().int().positive();
const money = z.number().int().min(0).max(1_000_000);
export const additionalDueSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('UNKNOWN') }),
  z.strictObject({
    kind: z.literal('POST_PASS_ADDITIONAL_DUE'),
    source: z.literal('FICTIONAL_POST_PASS'),
    role: roleSchema,
    seatId: key,
    screening: showtimeSchema,
    cents: money,
    currency: z.literal('EUR'),
    coverage: z.enum(['ALL_CURRENT_CHARGES', 'PARTIAL', 'UNKNOWN']),
    observedAt: stamp,
    revision,
  }),
]);
export const fictionalSeatSchema = z.strictObject({
  id: key,
  label: z.string().regex(/^[A-Z0-9-]{1,12}$/),
  rowLabel: key,
  category: seatCategorySchema,
  colorHint: z.enum(['BLUE', 'BLACK', 'GREEN', 'RED', 'UNKNOWN']),
  designation: z.enum(['STANDARD', 'ACCESSIBLE', 'COMPANION', 'UNKNOWN']),
  availability: z.enum(['AVAILABLE', 'OCCUPIED', 'UNKNOWN']),
  legendPrice: z
    .strictObject({ source: z.literal('FICTIONAL_LEGEND'), cents: money })
    .nullable(),
  additionalDue: z.strictObject({
    A: additionalDueSchema,
    B: additionalDueSchema,
  }),
});
export type FictionalSeat = z.infer<typeof fictionalSeatSchema>;
const cellSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal('SEAT'),
    column: z.number().int().min(0).max(60),
    seat: fictionalSeatSchema,
  }),
  z.strictObject({
    kind: z.enum(['GAP', 'BLOCKED']),
    column: z.number().int().min(0).max(60),
  }),
]);
const roleContextSchema = z.strictObject({
  role: roleSchema,
  source: z.literal('FICTIONAL_SEATMAP'),
  screening: showtimeSchema,
  revision,
  consent: z.enum(['KNOWN_FICTION', 'UNKNOWN']),
  passValidity: z.enum(['KNOWN_FICTION', 'UNKNOWN']),
  accessibilityConditions: z.enum(['KNOWN_FICTION', 'UNKNOWN']),
});
export const fictionalSeatMapSchema = z
  .strictObject({
    source: z.literal('FICTIONAL_SEATMAP'),
    observedAt: stamp,
    revision,
    screening: showtimeSchema,
    geometry: z.enum(['FICTIONAL_GEOMETRY', 'UNKNOWN']),
    coverage: z.enum(['COMPLETE_FICTION', 'PARTIAL', 'UNKNOWN']),
    contexts: z.strictObject({ A: roleContextSchema, B: roleContextSchema }),
    rows: z
      .array(
        z.strictObject({
          id: key,
          label: key,
          centerColumn: z.number().min(0).max(60).nullable(),
          aisleAfter: z.array(z.number().int().min(0).max(60)).max(60),
          cells: z.array(cellSchema).max(60),
        }),
      )
      .max(12),
  })
  .refine((map) => {
    const ids = map.rows.flatMap((row) =>
      row.cells.flatMap((cell) => (cell.kind === 'SEAT' ? [cell.seat.id] : [])),
    );
    return (
      new Set(ids).size === ids.length &&
      new Set(map.rows.map((row) => row.id)).size === map.rows.length &&
      new Set(map.rows.map((row) => row.label)).size === map.rows.length &&
      map.rows.every(
        (row) =>
          new Set(row.cells.map((cell) => cell.column)).size ===
            row.cells.length &&
          new Set(
            row.cells.flatMap((cell) =>
              cell.kind === 'SEAT' ? [cell.seat.label] : [],
            ),
          ).size === row.cells.filter((cell) => cell.kind === 'SEAT').length,
      )
    );
  });
export type FictionalSeatMap = z.infer<typeof fictionalSeatMapSchema>;
export const pairRequestSchema = z.strictObject({
  now: stamp,
  screening: showtimeSchema,
  revision,
  accessibility: z.strictObject({ A: z.boolean(), B: z.boolean() }),
});
export type PairRequest = z.infer<typeof pairRequestSchema>;
export type PolicyReason =
  | 'ULTRA_LUX_EXCLUDED'
  | 'CATEGORY_UNKNOWN'
  | 'EXTRA_PAYMENT'
  | 'FEE_UNKNOWN'
  | 'ACCESSIBILITY_REVIEW'
  | 'GEOMETRY_UNKNOWN'
  | 'AISLE_BREAK'
  | 'STALE_DATA'
  | 'SHOWTIME_MISMATCH'
  | 'AVAILABILITY_UNKNOWN'
  | 'OCCUPIED'
  | 'CONTEXT_UNKNOWN'
  | 'GAP_OR_BLOCKED'
  | 'INVALID_DATA';
export const policyReasonLabels: Record<PolicyReason, string> = {
  ULTRA_LUX_EXCLUDED: 'Ultra Lux altijd uitgesloten',
  CATEGORY_UNKNOWN: 'Categorie niet vastgesteld',
  EXTRA_PAYMENT: 'Er is een fictieve bijbetaling',
  FEE_UNKNOWN: 'Kosten nog op Vue controleren',
  ACCESSIBILITY_REVIEW:
    'Toegankelijkheidsroute en voorwaarden zelf beoordelen; zo nodig Vue/support vragen',
  GEOMETRY_UNKNOWN: 'Fysieke buurrelatie niet vastgesteld',
  AISLE_BREAK: 'Gangpad tussen de stoelen',
  STALE_DATA: 'Bron, kaart of kosten vervallen/gewijzigd; opnieuw controleren',
  SHOWTIME_MISMATCH: 'Voorstelling onvolledig of afwijkend',
  AVAILABILITY_UNKNOWN: 'Beschikbaarheid onbekend',
  OCCUPIED: 'Fictieve stoel niet beschikbaar',
  CONTEXT_UNKNOWN: 'A/B-bron, toestemming of pasgeldigheid onbekend',
  GAP_OR_BLOCKED: 'Onderbreking of ontbrekende buurstoel',
  INVALID_DATA: 'Fictieve bron ongeldig; handmatig verder',
};
type Assessment = {
  status: 'CANDIDATE' | 'EXCLUDED' | 'UNKNOWN';
  reason: PolicyReason | null;
};
function current(at: number, now: number) {
  return at <= now && now - at < PAIR_TTL_MS;
}
export function assessFictionalSeat(
  seat: FictionalSeat,
  role: Role,
  map: FictionalSeatMap,
  request: PairRequest,
): Assessment {
  // This exclusion precedes every other check, including fabricated zero-fee data.
  if (seat.category === 'ULTRA_LUX')
    return { status: 'EXCLUDED', reason: 'ULTRA_LUX_EXCLUDED' };
  if (seat.category === 'UNKNOWN')
    return { status: 'UNKNOWN', reason: 'CATEGORY_UNKNOWN' };
  const context = map.contexts[role];
  if (
    context.role !== role ||
    context.consent !== 'KNOWN_FICTION' ||
    context.passValidity !== 'KNOWN_FICTION'
  )
    return { status: 'UNKNOWN', reason: 'CONTEXT_UNKNOWN' };
  if (
    context.revision !== map.revision ||
    !current(map.observedAt, request.now)
  )
    return { status: 'UNKNOWN', reason: 'STALE_DATA' };
  if (matchShowtimes(map.screening, context.screening) !== 'MATCH')
    return { status: 'UNKNOWN', reason: 'SHOWTIME_MISMATCH' };
  if (
    seat.designation === 'UNKNOWN' ||
    (seat.designation !== 'STANDARD' &&
      (!request.accessibility[role] ||
        context.accessibilityConditions !== 'KNOWN_FICTION'))
  )
    return { status: 'UNKNOWN', reason: 'ACCESSIBILITY_REVIEW' };
  if (seat.availability !== 'AVAILABLE')
    return {
      status: seat.availability === 'OCCUPIED' ? 'EXCLUDED' : 'UNKNOWN',
      reason:
        seat.availability === 'OCCUPIED' ? 'OCCUPIED' : 'AVAILABILITY_UNKNOWN',
    };
  const fee = seat.additionalDue[role];
  if (fee.kind === 'UNKNOWN' || fee.role !== role || fee.seatId !== seat.id)
    return { status: 'UNKNOWN', reason: 'FEE_UNKNOWN' };
  if (matchShowtimes(fee.screening, map.screening) !== 'MATCH')
    return { status: 'UNKNOWN', reason: 'SHOWTIME_MISMATCH' };
  if (fee.revision !== map.revision || !current(fee.observedAt, request.now))
    return { status: 'UNKNOWN', reason: 'STALE_DATA' };
  if (fee.cents !== 0) return { status: 'EXCLUDED', reason: 'EXTRA_PAYMENT' };
  if (fee.coverage !== 'ALL_CURRENT_CHARGES')
    return { status: 'UNKNOWN', reason: 'FEE_UNKNOWN' };
  return { status: 'CANDIDATE', reason: null };
}
export interface FictionalPair {
  A: {
    id: string;
    label: string;
    category: SeatCategory;
    designation: FictionalSeat['designation'];
  };
  B: {
    id: string;
    label: string;
    category: SeatCategory;
    designation: FictionalSeat['designation'];
  };
  row: string;
  evidence: 'FICTIONAL_GEOMETRY';
  cost: 'FICTIONAL_ZERO_EXTRA';
  observedAt: number;
  expiresAt: number;
  centerDistance: number | null;
}
export interface PairSearchResult {
  source: 'FICTIONAL_SEATMAP';
  status: 'FICTIONAL_CANDIDATES' | 'NO_KNOWN_CANDIDATES' | 'UNKNOWN';
  pairs: FictionalPair[];
  reasons: PolicyReason[];
  hasUnknowns: boolean;
}
/** Fictional data only. No browser, storage, network, booking or real-site port. */
export function findSeatPairs(
  raw: unknown,
  input: PairRequest,
): PairSearchResult {
  const result: PairSearchResult = {
    source: 'FICTIONAL_SEATMAP',
    status: 'UNKNOWN',
    pairs: [],
    reasons: [],
    hasUnknowns: true,
  };
  const stop = (reason: PolicyReason) => ({ ...result, reasons: [reason] });
  try {
    if (JSON.stringify(raw).length > 65_536) return stop('INVALID_DATA');
  } catch {
    return stop('INVALID_DATA');
  }
  const parsed = fictionalSeatMapSchema.safeParse(raw),
    requestResult = pairRequestSchema.safeParse(input);
  if (!parsed.success || !requestResult.success) return stop('INVALID_DATA');
  const map = parsed.data,
    request = requestResult.data;
  if (
    map.revision !== request.revision ||
    !current(map.observedAt, request.now)
  )
    return stop('STALE_DATA');
  if (matchShowtimes(map.screening, request.screening) !== 'MATCH')
    return stop('SHOWTIME_MISMATCH');
  if (
    map.geometry !== 'FICTIONAL_GEOMETRY' ||
    map.coverage !== 'COMPLETE_FICTION'
  )
    return stop('GEOMETRY_UNKNOWN');
  const reasons = new Set<PolicyReason>();
  let hasUnknowns = false;
  const candidates: {
    pair: FictionalPair;
    sameCategory: boolean;
    order: number;
  }[] = [];
  map.rows.forEach((row, rowIndex) => {
    const cells = [...row.cells].sort((a, b) => a.column - b.column);
    const assessments = new Map<string, Record<Role, Assessment>>();
    for (const cell of cells) {
      if (cell.kind !== 'SEAT') continue;
      const A = assessFictionalSeat(cell.seat, 'A', map, request),
        B = assessFictionalSeat(cell.seat, 'B', map, request);
      assessments.set(cell.seat.id, { A, B });
      for (const check of [A, B]) {
        if (check.reason) reasons.add(check.reason);
        if (check.status === 'UNKNOWN') hasUnknowns = true;
      }
      if (cell.seat.rowLabel !== row.label) {
        reasons.add('GEOMETRY_UNKNOWN');
        hasUnknowns = true;
      }
    }
    for (const [index, left] of cells.entries()) {
      if (left.kind !== 'SEAT') continue;
      const right = cells[index + 1];
      if (!right) continue;
      if (!right || right.kind !== 'SEAT' || right.column !== left.column + 1) {
        reasons.add('GAP_OR_BLOCKED');
        continue;
      }
      if (left.seat.rowLabel !== row.label || right.seat.rowLabel !== row.label)
        continue;
      if (row.aisleAfter.includes(left.column)) {
        reasons.add('AISLE_BREAK');
        continue;
      }
      for (const [a, b] of [
        [left.seat, right.seat],
        [right.seat, left.seat],
      ] as const) {
        if (
          assessments.get(a.id)!.A.status !== 'CANDIDATE' ||
          assessments.get(b.id)!.B.status !== 'CANDIDATE'
        )
          continue;
        candidates.push({
          sameCategory: a.category === b.category,
          order: rowIndex * 100 + left.column,
          pair: {
            A: {
              id: a.id,
              label: a.label,
              category: a.category,
              designation: a.designation,
            },
            B: {
              id: b.id,
              label: b.label,
              category: b.category,
              designation: b.designation,
            },
            row: row.label,
            evidence: 'FICTIONAL_GEOMETRY',
            cost: 'FICTIONAL_ZERO_EXTRA',
            observedAt: map.observedAt,
            expiresAt:
              Math.min(
                map.observedAt,
                a.additionalDue.A.kind === 'UNKNOWN'
                  ? 0
                  : a.additionalDue.A.observedAt,
                b.additionalDue.B.kind === 'UNKNOWN'
                  ? 0
                  : b.additionalDue.B.observedAt,
              ) + PAIR_TTL_MS,
            centerDistance:
              row.centerColumn === null
                ? null
                : Math.abs((left.column + right.column) / 2 - row.centerColumn),
          },
        });
        break; // One deterministic assignment per physical pair; both role checks were independent.
      }
    }
  });
  candidates.sort(
    (a, b) =>
      Number(b.sameCategory) - Number(a.sameCategory) ||
      (a.pair.centerDistance ?? Infinity) -
        (b.pair.centerDistance ?? Infinity) ||
      a.order - b.order,
  );
  const pairs = candidates.map((candidate) => candidate.pair);
  return {
    source: 'FICTIONAL_SEATMAP',
    status: pairs.length
      ? 'FICTIONAL_CANDIDATES'
      : hasUnknowns
        ? 'UNKNOWN'
        : 'NO_KNOWN_CANDIDATES',
    pairs,
    reasons: [...reasons].sort(),
    hasUnknowns,
  };
}
