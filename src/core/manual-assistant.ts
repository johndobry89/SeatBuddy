import { z } from 'zod';
import { roles, roleSchema, showtimeSchema } from './types';
import { matchShowtimes } from './showtime-matcher';

export const planningSchema = showtimeSchema.refine(
  (value) =>
    value.movie !== null &&
    value.cinema !== null &&
    value.date !== null &&
    value.time !== null,
  'Vul film, bioscoop, datum en tijd volledig in.',
);
export const intendedSeatSchema = z.strictObject({
  row: z.string().trim().max(12),
  number: z
    .string()
    .trim()
    .regex(/^\d{0,3}$/),
});
export const browserContextSchema = z.strictObject({
  tabId: z.number().int().nonnegative(),
  windowId: z.number().int().nonnegative(),
  incognito: z.boolean(),
});
export type BrowserContext = z.infer<typeof browserContextSchema>;
export const manualSteps = [
  'ACCOUNT',
  'SHOWTIME',
  'SEATS',
  'REVIEW',
  'DONE',
] as const;
export const manualStepSchema = z.enum(manualSteps);
export type ManualStep = z.infer<typeof manualStepSchema>;
export const problemSchema = z.enum([
  'LOGOUT',
  'MISMATCH',
  'FAILED',
  'NAVIGATED',
  'CLOSED',
  'PERMISSION',
  'STALE',
  'BUDDY_CHANGED',
]);
export const MANUAL_AGE_MS = 15 * 60_000;
export const manualTrackSchema = z.strictObject({
  context: browserContextSchema.nullable(),
  reportedShowtime: showtimeSchema.nullable(),
  seat: intendedSeatSchema,
  completed: z.array(manualStepSchema).max(5),
  reviewedAt: z.number().int().nonnegative().nullable(),
  problem: problemSchema.nullable(),
});
export const manualStateSchema = z.strictObject({
  plan: planningSchema.nullable(),
  tracks: z.strictObject({ A: manualTrackSchema, B: manualTrackSchema }),
});
export type ManualState = z.infer<typeof manualStateSchema>;
export const manualCommandSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('PLAN'), plan: planningSchema }),
  z.strictObject({
    type: z.literal('MANUAL_DETAILS'),
    role: roleSchema,
    showtime: showtimeSchema,
    seat: intendedSeatSchema,
  }),
  z.strictObject({
    type: z.literal('ACKNOWLEDGE'),
    role: roleSchema,
    step: manualStepSchema,
  }),
  z.strictObject({
    type: z.literal('REPORT_PROBLEM'),
    role: roleSchema,
    problem: problemSchema,
  }),
  z.strictObject({ type: z.literal('RESET_TRACK'), role: roleSchema }),
  z.strictObject({ type: z.literal('UNBIND'), role: roleSchema }),
  z.strictObject({
    type: z.literal('BIND_CONTEXT'),
    role: roleSchema,
    tabId: z.number().int().nonnegative(),
  }),
]);
export type ManualCommand = z.infer<typeof manualCommandSchema>;
function emptyTrack(): ManualState['tracks']['A'] {
  return {
    context: null,
    reportedShowtime: null,
    seat: { row: '', number: '' },
    completed: [],
    reviewedAt: null,
    problem: null,
  };
}
export function emptyManual(): ManualState {
  return { plan: null, tracks: { A: emptyTrack(), B: emptyTrack() } };
}
export function clearProgress(track: ManualState['tracks']['A']) {
  track.completed = [];
  track.reviewedAt = null;
}
export function applyManual(
  state: ManualState,
  command: ManualCommand,
  now: number,
  contexts: BrowserContext[] = [],
  incognitoAllowed = false,
): string | null {
  if (command.type === 'PLAN') {
    state.plan = structuredClone(command.plan);
    for (const role of roles) {
      state.tracks[role] = emptyTrack();
      state.tracks[role].reportedShowtime = structuredClone(command.plan);
    }
    return null;
  }
  const track = state.tracks[command.role];
  if (command.type === 'RESET_TRACK') {
    state.tracks[command.role] = emptyTrack();
    state.tracks[command.role].reportedShowtime = structuredClone(state.plan);
    return null;
  }
  if (command.type === 'UNBIND') {
    track.context = null;
    clearProgress(track);
    return null;
  }
  if (command.type === 'REPORT_PROBLEM') {
    clearProgress(track);
    track.problem = command.problem;
    return null;
  }
  if (command.type === 'BIND_CONTEXT') {
    const context = contexts.find(
      (candidate) => candidate.tabId === command.tabId,
    );
    if (
      !context ||
      (command.role === 'A' && context.incognito) ||
      (command.role === 'B' && (!context.incognito || !incognitoAllowed))
    )
      return 'Deze browsercontext past niet bij de rol of is niet toegestaan. Gebruik handmatige begeleiding.';
    const other = command.role === 'A' ? 'B' : 'A';
    if (state.tracks[other].context?.tabId === context.tabId)
      return 'Kies een aparte tab per persoon.';
    track.context = { ...context };
    clearProgress(track);
    track.problem = null;
    return null;
  }
  if (!state.plan) return 'Sla eerst een geldig filmplan op.';
  if (command.type === 'MANUAL_DETAILS') {
    track.reportedShowtime = structuredClone(command.showtime);
    track.seat = { ...command.seat };
    clearProgress(track);
    track.problem = null;
    return null;
  }
  expireManual(state, now, incognitoAllowed);
  if (manualSteps[track.completed.length] !== command.step)
    return 'Controleer de stappen opnieuw in de getoonde volgorde.';
  if (
    command.step !== 'ACCOUNT' &&
    matchShowtimes(state.plan, track.reportedShowtime) !== 'MATCH'
  )
    return 'Voorstelling onvolledig of afwijkend. Vergelijk ook de zaal en pas plan of invoer aan.';
  if (
    ['SEATS', 'REVIEW', 'DONE'].includes(command.step) &&
    (!track.seat.row || !track.seat.number)
  )
    return 'Vul eerst de gewenste rij en stoel in; er is geen bewijs van beschikbaarheid.';
  track.completed.push(command.step);
  track.reviewedAt = now;
  track.problem = null;
  return null;
}
export function expireManual(
  state: ManualState,
  now: number,
  allowed: boolean,
) {
  for (const role of roles) {
    const track = state.tracks[role];
    if (track.context?.incognito && !allowed) {
      track.context = null;
      clearProgress(track);
      track.problem = 'PERMISSION';
    }
    if (
      track.reviewedAt !== null &&
      (track.reviewedAt > now || now - track.reviewedAt >= MANUAL_AGE_MS)
    ) {
      clearProgress(track);
      track.problem = 'STALE';
    }
  }
}
export function invalidateManualTab(
  state: ManualState,
  tabId: number,
  reason: 'NAVIGATED' | 'CLOSED' = 'NAVIGATED',
) {
  for (const role of roles)
    if (state.tracks[role].context?.tabId === tabId) {
      state.tracks[role].context = null;
      clearProgress(state.tracks[role]);
      state.tracks[role].problem = reason;
    }
}
export function manualSummary(state: ManualState) {
  const A = state.tracks.A;
  const B = state.tracks.B;
  const match =
    A.completed.includes('SHOWTIME') && B.completed.includes('SHOWTIME')
      ? matchShowtimes(A.reportedShowtime, B.reportedShowtime)
      : 'UNKNOWN';
  const adjacency =
    !state.plan?.hall ||
    !A.seat.row ||
    !B.seat.row ||
    !A.seat.number ||
    !B.seat.number
      ? 'UNKNOWN'
      : A.seat.row === B.seat.row &&
          Math.abs(Number(A.seat.number) - Number(B.seat.number)) === 1
        ? 'CONSECUTIVE_UNVERIFIED'
        : 'NOT_CONSECUTIVE';
  const done = roles.filter((role) =>
    state.tracks[role].completed.includes('DONE'),
  );
  return { match, adjacency, done, partial: done.length === 1 };
}
export const stepLabels: Record<ManualStep, string> = {
  ACCOUNT: 'Ik gebruik mijn eigen account en geldige pas',
  SHOWTIME: 'Ik heb film, bioscoop, datum, tijd en zaal op Vue vergeleken',
  SEATS: 'Ik heb mijn stoel, gangpad en eventuele kosten op Vue gecontroleerd',
  REVIEW: 'Ik heb mijn eigen overzicht op Vue gecontroleerd',
  DONE: 'Ik meld dat ik zelf op Vue heb afgerond',
};
export const recoveryText: Record<z.infer<typeof problemSchema>, string> = {
  BUDDY_CHANGED:
    'Buddykeuze gewijzigd. B’s invoer, koppeling en controles zijn gewist; controleer B opnieuw. A blijft zelfstandig. Een bijnaam bewijst geen account.',
  LOGOUT:
    'Log zelf opnieuw in op je eigen account. Controleer daarna alle stappen opnieuw.',
  MISMATCH:
    'Stop: de voorstelling wijkt af. Vergelijk film, bioscoop, datum, tijd en zaal opnieuw.',
  FAILED:
    'Controleer de uitkomst op Vue voordat je zelf iets opnieuw doet. Er wordt niets herhaald of teruggedraaid.',
  NAVIGATED:
    'De gekoppelde tab veranderde. De koppeling en eerdere controles zijn vervallen.',
  CLOSED:
    'De gekoppelde tab is gesloten. Gebruik een nieuwe eigen tab en controleer opnieuw.',
  PERMISSION:
    'Incognitotoegang ontbreekt of is ingetrokken. Gebruik de handmatige werkwijze; er is geen accountbewijs.',
  STALE:
    'De zelf gemelde controles zijn verlopen. Vergelijk de actuele pagina opnieuw.',
};
