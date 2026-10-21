import type { ManualState } from './manual-assistant';
import {
  manualSteps,
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
  for (const role of ['A', 'B'] as const) {
    const problem = state.tracks[role].problem;
    if (problem)
      return { code: problem, role, text: `${role}: ${recoveryText[problem]}` };
  }
  for (const role of ['A', 'B'] as const)
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
    ['A', 'B'].some(
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
      text: 'Beiden melden zelf afgerond — NOT SITE VERIFIED. Controleer jullie twee echte bevestigingen zelf. De extensie heeft geen websitebevestiging waargenomen.',
    };
  if (summary.partial)
    return {
      code: 'PARTIAL',
      text: `${summary.done[0]} meldt zelf afgerond; de ander is nog bezig. Controleer iedere uitkomst apart, zonder automatische herhaling of annulering.`,
    };
  for (const role of ['A', 'B'] as const) {
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
