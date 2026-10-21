import { z } from '../privacy/schema';
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
  planningMode: z.enum(['SOLO', 'TOGETHER']),
  revision: z.number().int().nonnegative(),
  review: z.strictObject({ at: z.number().int().nonnegative() }).nullable(),
  tracks: z.strictObject({ A: manualTrackSchema, B: manualTrackSchema }),
});
export type ManualState = z.infer<typeof manualStateSchema>;
export const manualCommandSchema = z.discriminatedUnion('type', [
  z.strictObject({
    type: z.literal('PLANNING_MODE'),
    mode: z.enum(['SOLO', 'TOGETHER']),
    resetB: z.boolean(),
  }),
  z.strictObject({ type: z.literal('REVIEW_PLAN') }),
  z.strictObject({
    type: z.literal('PLAN'),
    plan: planningSchema,
    initialSeats: z
      .strictObject({ A: intendedSeatSchema, B: intendedSeatSchema.optional() })
      .optional(),
  }),
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
  return {
    plan: null,
    planningMode: 'SOLO',
    revision: 0,
    review: null,
    tracks: { A: emptyTrack(), B: emptyTrack() },
  };
}
export function clearProgress(track: ManualState['tracks']['A']) {
  track.completed = [];
  track.reviewedAt = null;
}
export function activeRoles(state: ManualState) {
  return state.planningMode === 'TOGETHER' ? roles : (['A'] as const);
}
export function hasBHistory(state: ManualState) {
  const B = state.tracks.B;
  return Boolean(
    B.context ||
    B.completed.length ||
    B.seat.row ||
    B.seat.number ||
    (B.reportedShowtime &&
      JSON.stringify(B.reportedShowtime) !== JSON.stringify(state.plan)),
  );
}
export function invalidateReview(state: ManualState) {
  state.review = null;
  state.revision++;
}
export function preflightIssue(state: ManualState): string | null {
  if (!state.plan) return 'Bewaar eerst een geldig filmplan.';
  if (!state.plan.hall)
    return 'Zaal UNKNOWN. Vul de zaal pas in als je die zelf weet.';
  for (const role of activeRoles(state)) {
    const track = state.tracks[role];
    if (matchShowtimes(state.plan, track.reportedShowtime) !== 'MATCH')
      return `${role}: voorstelling ontbreekt of wijkt af. Vergelijk ook de zaal.`;
    if (!track.seat.row || !track.seat.number)
      return `${role}: bewaar de gewenste rij en stoel in eigen invoer.`;
    if (track.problem)
      return `${role}: controleer de eigen invoer opnieuw na het gemelde probleem.`;
  }
  return null;
}
export function sameFilmNight(
  left: ManualState['plan'],
  right: ManualState['plan'],
) {
  return (
    left !== null &&
    right !== null &&
    (['movie', 'cinema', 'date', 'time'] as const).every(
      (key) => left[key] === right[key],
    )
  );
}
export function applyManual(
  state: ManualState,
  command: ManualCommand,
  now: number,
  contexts: BrowserContext[] = [],
  incognitoAllowed = false,
): string | null {
  expireManual(state, now, incognitoAllowed);
  if (command.type === 'PLANNING_MODE') {
    if (state.planningMode === command.mode)
      return 'Deze plankeuze is al actief.';
    if (command.mode === 'SOLO' && hasBHistory(state) && !command.resetB)
      return 'Bevestig het wissen van uitsluitend B’s lokale invoer, koppeling en controles. Dit annuleert geen boeking.';
    state.planningMode = command.mode;
    state.tracks.B = emptyTrack();
    if (command.mode === 'TOGETHER')
      state.tracks.B.reportedShowtime = structuredClone(state.plan);
    invalidateReview(state);
    return null;
  }
  if (command.type === 'REVIEW_PLAN') {
    const issue = preflightIssue(state);
    if (issue) return issue;
    if (state.review) return 'De gegevens zijn al lokaal gecontroleerd.';
    state.review = { at: now };
    state.revision++;
    return null;
  }
  if (command.type === 'PLAN') {
    if (
      command.initialSeats?.B &&
      (state.planningMode === 'SOLO' ||
        (state.plan && !sameFilmNight(state.plan, command.plan)))
    )
      return 'Kies eerst bewust samen plannen; B is niet actief voor dit nieuwe plan.';
    if (state.plan && !sameFilmNight(state.plan, command.plan))
      state.planningMode = 'SOLO';
    invalidateReview(state);
    state.plan = structuredClone(command.plan);
    for (const role of roles) {
      state.tracks[role] = emptyTrack();
      if (role === 'A' || state.planningMode === 'TOGETHER')
        state.tracks[role].reportedShowtime = structuredClone(command.plan);
      if (role === 'A' || state.planningMode === 'TOGETHER')
        state.tracks[role].seat = {
          ...(command.initialSeats?.[role] ?? { row: '', number: '' }),
        };
    }
    return null;
  }
  if (command.role === 'B' && state.planningMode !== 'TOGETHER')
    return 'B is niet actief. Kies eerst bewust Ook met buddy plannen.';
  const track = state.tracks[command.role];
  if (command.type === 'RESET_TRACK') {
    invalidateReview(state);
    state.tracks[command.role] = emptyTrack();
    state.tracks[command.role].reportedShowtime = structuredClone(state.plan);
    return null;
  }
  if (command.type === 'UNBIND') {
    invalidateReview(state);
    track.context = null;
    clearProgress(track);
    return null;
  }
  if (command.type === 'REPORT_PROBLEM') {
    invalidateReview(state);
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
    invalidateReview(state);
    track.context = { ...context };
    clearProgress(track);
    track.problem = null;
    return null;
  }
  if (!state.plan) return 'Sla eerst een geldig filmplan op.';
  if (command.type === 'MANUAL_DETAILS') {
    invalidateReview(state);
    track.reportedShowtime = structuredClone(command.showtime);
    track.seat = { ...command.seat };
    clearProgress(track);
    track.problem = null;
    return null;
  }
  if (!state.review)
    return 'Controleer eerst de filmavond; de lokale review ontbreekt of is vervallen.';
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
  state.revision++;
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
  if (
    state.review &&
    (state.review.at > now || now - state.review.at >= MANUAL_AGE_MS)
  )
    invalidateReview(state);
  for (const role of roles) {
    const track = state.tracks[role];
    if (track.context?.incognito && !allowed) {
      track.context = null;
      clearProgress(track);
      track.problem = 'PERMISSION';
      invalidateReview(state);
    }
    if (
      track.reviewedAt !== null &&
      (track.reviewedAt > now || now - track.reviewedAt >= MANUAL_AGE_MS)
    ) {
      clearProgress(track);
      track.problem = 'STALE';
      invalidateReview(state);
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
      invalidateReview(state);
      state.tracks[role].context = null;
      clearProgress(state.tracks[role]);
      state.tracks[role].problem = reason;
    }
}
export function manualSummary(state: ManualState) {
  const A = state.tracks.A;
  const B = state.tracks.B;
  const match =
    state.review &&
    state.planningMode === 'TOGETHER' &&
    A.completed.includes('SHOWTIME') &&
    B.completed.includes('SHOWTIME')
      ? matchShowtimes(A.reportedShowtime, B.reportedShowtime)
      : 'UNKNOWN';
  const adjacency =
    state.planningMode !== 'TOGETHER' ||
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
  const done = activeRoles(state).filter((role) =>
    state.tracks[role].completed.includes('DONE'),
  );
  return {
    match,
    adjacency,
    done,
    partial: state.planningMode === 'TOGETHER' && done.length === 1,
  };
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
