import type { Showtime } from './types';
export type Match = 'MATCH' | 'MISMATCH' | 'UNKNOWN';
export function matchShowtimes(a: Showtime | null, b: Showtime | null): Match {
  if (!a || !b) return 'UNKNOWN';
  const fields = ['cinema', 'movie', 'date', 'time', 'hall'] as const;
  if (
    fields.some(
      (key) => a[key] !== null && b[key] !== null && a[key] !== b[key],
    )
  )
    return 'MISMATCH';
  return fields.every((key) => a[key] !== null && b[key] !== null)
    ? 'MATCH'
    : 'UNKNOWN';
}
