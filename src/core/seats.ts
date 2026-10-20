import type { Seat } from './types';
export function adjacent(
  a: Seat | null,
  b: Seat | null,
): 'MOCK_ADJACENT' | 'NOT_ADJACENT' | 'UNKNOWN' {
  if (!a || !b) return 'UNKNOWN';
  return a.hall === b.hall &&
    a.row === b.row &&
    a.section === b.section &&
    a.category === b.category &&
    a.label !== b.label &&
    Math.abs(a.position - b.position) === 1
    ? 'MOCK_ADJACENT'
    : 'NOT_ADJACENT';
}
