import { z } from 'zod';

export const roleSchema = z.enum(['A', 'B']);
export type Role = z.infer<typeof roleSchema>;
export const roles: Role[] = ['A', 'B'];
const label = z.string().trim().min(1).max(80);
export const showtimeSchema = z.strictObject({
  cinema: label.nullable(),
  movie: label.nullable(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => {
      const parsed = new Date(`${value}T00:00:00Z`);
      return (
        !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === value
      );
    }, 'Invalid calendar date')
    .nullable(),
  time: z
    .string()
    .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
    .nullable(),
  hall: label.nullable(),
});
export type Showtime = z.infer<typeof showtimeSchema>;
export const seatSchema = z.strictObject({
  label,
  row: label,
  hall: label,
  section: label,
  position: z.number().int().min(0).max(500),
  category: z.enum(['STANDARD', 'PREMIUM', 'ACCESSIBLE']),
});
export type Seat = z.infer<typeof seatSchema>;
export const statusSchema = z.enum([
  'UNKNOWN',
  'SELECTED',
  'REVIEW_REQUIRED',
  'SIMULATED_COMPLETE',
  'FAILED',
]);
export type Status = z.infer<typeof statusSchema>;
export const observationSchema = z.strictObject({
  status: statusSchema,
  showtime: showtimeSchema,
  seat: seatSchema.nullable(),
  observedAt: z.number().int().nonnegative(),
});
export type Observation = z.infer<typeof observationSchema>;
export interface Binding {
  tabId: number;
  windowId: number;
  incognito: boolean;
  documentId: string;
}
export interface Session {
  role: Role;
  binding: Binding | null;
  observation: Observation | null;
  lastObservedAt: number | null;
  evidence: 'NONE' | 'SIMULATION';
}
export type Sessions = Record<Role, Session>;
export type Mode = 'MANUAL' | 'DEMO' | 'FIXTURE';
export const scenarios = [
  'matching',
  'mismatch',
  'partial',
  'aisle',
  'stale',
] as const;
export const scenarioSchema = z.enum(scenarios);
export type Scenario = z.infer<typeof scenarioSchema>;
export const MAX_AGE_MS = 60_000;
export function fresh(
  observation: Observation | null,
  now: number,
): observation is Observation {
  return (
    observation !== null &&
    observation.observedAt <= now &&
    now - observation.observedAt < MAX_AGE_MS
  );
}
export function emptySessions(): Sessions {
  return {
    A: {
      role: 'A',
      binding: null,
      observation: null,
      lastObservedAt: null,
      evidence: 'NONE',
    },
    B: {
      role: 'B',
      binding: null,
      observation: null,
      lastObservedAt: null,
      evidence: 'NONE',
    },
  };
}
