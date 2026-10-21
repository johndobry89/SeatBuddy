import { observationSchema, type Observation } from '../../core/types';

/** Pure data boundary. This interface does not grant host access or trust DOM provenance. */
export type ObservationResult =
  | { kind: 'UNAVAILABLE'; reason: string }
  | { kind: 'FICTIONAL_DOM'; observation: Observation };
export interface SiteObserver {
  observe(root: ParentNode, now: number): ObservationResult;
}
const unavailable = (): ObservationResult => ({
  kind: 'UNAVAILABLE',
  reason:
    'Fictief schema ontbreekt, is gewijzigd of is ambigu. Status UNKNOWN; handmatig verder met eigen vergelijking.',
});

// These are our fictional test contracts, NOT discovered or guessed Vue website selectors.
export const fictionalObserver: SiteObserver = {
  observe(root, now) {
    const screenings = root.querySelectorAll(
      '[data-seatmates-screening-fixture="v1"]',
    );
    if (screenings.length !== 1) return unavailable();
    const screening = screenings[0]!;
    const selected = screening.querySelectorAll(
      '[data-fictional-seat][aria-pressed="true"]',
    );
    if (selected.length > 1) return unavailable();
    const seat = selected[0];
    const parsed = observationSchema.safeParse({
      status: seat ? 'SELECTED' : 'UNKNOWN',
      showtime: {
        cinema: screening.getAttribute('data-cinema'),
        movie: screening.getAttribute('data-movie'),
        date: screening.getAttribute('data-date'),
        time: screening.getAttribute('data-time'),
        hall: screening.getAttribute('data-hall'),
      },
      seat: seat
        ? {
            label: seat.getAttribute('data-label'),
            row: seat.getAttribute('data-row'),
            hall: screening.getAttribute('data-hall'),
            section: seat.getAttribute('data-section'),
            category: seat.getAttribute('data-category'),
            position: seat.hasAttribute('data-position')
              ? Number(seat.getAttribute('data-position'))
              : null,
          }
        : null,
      observedAt: now,
    });
    return parsed.success
      ? { kind: 'FICTIONAL_DOM', observation: parsed.data }
      : unavailable();
  },
};
