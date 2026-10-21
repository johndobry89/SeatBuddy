import type { ManualState } from './manual-assistant';
import {
  manualSteps,
  activeRoles,
  preflightIssue,
  stepLabels,
  recoveryText,
  manualSummary,
} from './manual-assistant';
import { matchShowtimes } from './showtime-matcher';

/** Derived guidance is user-input interpretation, never website/booking evidence. */
export function nextMovieNightStep(state: ManualState) {
  if (!state.plan)
    return {
      code: 'PLAN',
      text: 'Kies eerst film, bioscoop, datum en tijd. Een buddy kiezen is optioneel.',
    };
  for (const role of activeRoles(state)) {
    const problem = state.tracks[role].problem;
    if (problem)
      return { code: problem, role, text: `${role}: ${recoveryText[problem]}` };
  }
  for (const role of activeRoles(state))
    if (
      matchShowtimes(state.plan, state.tracks[role].reportedShowtime) ===
      'MISMATCH'
    )
      return {
        code: 'MISMATCH',
        role,
        text: `${role}: voorstelling wijkt af. Stop en vergelijk film, bioscoop, datum, tijd en zaal; voer geen nieuwe boeking uit.`,
      };
  if (
    !state.plan.hall ||
    activeRoles(state).some(
      (role) => !state.tracks[role as 'A' | 'B'].reportedShowtime?.hall,
    )
  )
    return {
      code: 'HALL',
      text: 'Zaal UNKNOWN. Vul de zaal pas in als je die zelf weet; er is geen volledige voorstellingmatch.',
    };
  const summary = manualSummary(state);
  if (summary.done.length === 2)
    return {
      code: 'SELF_REPORTED',
      text: 'Beide zelf gemeld; echte bevestiging op Vue niet geverifieerd — NOT SITE VERIFIED.',
    };
  if (summary.partial)
    return {
      code: 'PARTIAL',
      text: `${summary.done[0]} meldt zelf afgerond; de ander is nog bezig. Controleer iedere uitkomst apart, zonder automatische herhaling of annulering.`,
    };
  if (!state.review)
    return {
      code: 'PREFLIGHT',
      text:
        preflightIssue(state) ??
        'Controleer de filmavond en ga bewust naar de eigen stappen.',
    };
  if (state.planningMode === 'SOLO' && summary.done.length === 1)
    return {
      code: 'SELF_REPORTED',
      text: 'Je meldt zelf afgerond; echte bevestiging op Vue niet geverifieerd — NOT SITE VERIFIED.',
    };
  for (const role of activeRoles(state)) {
    const track = state.tracks[role];
    if (!track.reportedShowtime)
      return {
        code: 'DETAILS',
        role,
        text: `${role}: vul de eigen voorstelling opnieuw in. Er zijn geen controles hersteld.`,
      };
    const step = manualSteps[track.completed.length];
    if (
      step &&
      ['SEATS', 'REVIEW', 'DONE'].includes(step) &&
      (!track.seat.row || !track.seat.number)
    )
      return {
        code: 'SEAT',
        role,
        text: `${role}: vul de gewenste rij en stoel in. Dit bewijst geen beschikbaarheid of aangrenzendheid.`,
      };
    if (step)
      return {
        code: step,
        role,
        text: `${role}: ${stepLabels[step]}. Alleen de gebruiker voert dit uit; niets wordt automatisch aangevinkt.`,
      };
  }
  return {
    code: 'UNKNOWN',
    text: 'Controleer beide eigen trajecten opnieuw; de uitkomst is UNKNOWN.',
  };
}
export function checkAge(reviewedAt: number | null, now: number) {
  if (reviewedAt === null || reviewedAt > now)
    return 'Nog niet zelf gecontroleerd';
  return `${Math.floor((now - reviewedAt) / 60_000)} min geleden zelf gecontroleerd`;
}
