import { bookingAlpha } from './vue-header';
import { fakeLegend, seat } from './vue-seatmap';

// Invented 5+6: A can choose it explicitly; B has three rear-row alternatives.
export const duoPage = (forA = false) =>
  bookingAlpha +
  fakeLegend +
  `<div class="seat-map__scaled-scene"><div class="seats" data-test="seats"><div class="seats__row" data-test="seats-row-1" style="position:relative;height:24px">${Array.from(
    { length: 6 },
    (_, i) =>
      (i === 4 ? '<span class="seats__seat"></span>' : '') +
      seat(1, i + 1, i + 1, 'lux', forA && i < 4 ? 'unavailable' : 'available'),
  ).join(
    '',
  )}</div>${(forA ? [2, 3] : [2, 3, 4]).map((row) => `<div class="seats__row" data-test="seats-row-${row}" style="position:relative;height:24px">${seat(row, 1, 1)}${seat(row, 2, 2)}</div>`).join('')}</div></div>`;
