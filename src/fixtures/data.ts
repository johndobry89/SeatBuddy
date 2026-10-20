import {
  MAX_AGE_MS,
  type Observation,
  type Role,
  type Scenario,
} from '../core/types';

export function fictionalObservation(role: Role, now: number): Observation {
  return {
    status: 'SELECTED',
    showtime: {
      cinema: 'Fictief Filmhuis',
      movie: 'De maan van papier',
      date: '2030-04-12',
      time: '19:30',
      hall: 'Zaal 2',
    },
    seat: {
      label: role === 'A' ? 'F10' : 'F11',
      row: 'F',
      hall: 'Zaal 2',
      section: 'links',
      position: role === 'A' ? 4 : 5,
      category: 'STANDARD',
    },
    observedAt: now,
  };
}
export function scenarioObservations(
  scenario: Scenario,
  now: number,
): Record<Role, Observation> {
  const A = fictionalObservation('A', now);
  const B = fictionalObservation('B', now);
  if (scenario === 'mismatch') B.showtime.time = '21:00';
  if (scenario === 'partial') {
    A.status = 'SIMULATED_COMPLETE';
    B.status = 'FAILED';
  }
  if (scenario === 'aisle' && B.seat) B.seat.section = 'rechts';
  if (scenario === 'stale') B.observedAt = now - MAX_AGE_MS;
  return { A, B };
}
