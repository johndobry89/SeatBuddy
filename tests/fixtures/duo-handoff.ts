import { bookingAlpha } from './vue-header';
import { fakeLegend, seat } from './vue-seatmap';

// Invented seats 5+6: only candidate for A, outside B's existing first three.
export const duoPage = (forA = false) =>
  bookingAlpha +
  fakeLegend +
  `<div class="seat-map__scaled-scene"><div class="seats" data-test="seats"><div class="seats__row" data-test="seats-row-1" style="position:relative;height:24px">${Array.from(
    { length: 6 },
    (_, i) =>
      seat(1, i + 1, i + 1, 'lux', forA && i < 4 ? 'unavailable' : 'available'),
  ).join(
    '',
  )}</div>${forA ? [2, 3].map((row) => `<div class="seats__row" data-test="seats-row-${row}" style="position:relative;height:24px">${seat(row, 1, 1)}${seat(row, 2, 2)}</div>`).join('') : ''}</div></div>`;
