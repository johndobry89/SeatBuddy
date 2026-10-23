import { bookingAlpha } from './vue-header';

// Invented, deliberately distinct data strings, never owner icons/captures.
export const fakeIcon = (category: string) =>
  `data:image/png;base64,FAKE_${category}`;
export const seat = (
  row: number,
  number: number,
  column: number,
  category = 'lux',
  state = 'available',
) =>
  `<button class="seats__seat" aria-label="Seat ${row}-${number}, ${state}" data-row="${row - 1}" data-column="${column}" data-test="fake-seat-${row}-${number}" data-seat-status="3-not-a-status" ${state === 'unavailable' ? 'disabled' : ''} style="position:absolute;left:${(column - 1) * 24}px;top:0;width:20px;height:20px;padding:0;border:0"><img data-test="seat-icon-image" src="${fakeIcon(category)}" width="16" height="16"></button>`;
export const fakeLegend = `<div>${[
  ['ultra', 'Ultra Lux'],
  ['lux', 'Lux'],
  ['saver', 'Saver Lux'],
  ['super', 'Super Saver Lux'],
]
  .map(
    ([key, label]) =>
      `<button class="seats-category" data-test="area-category-item-button"><img data-test="area-category-item-icon-image" src="${fakeIcon(key!)}" width="16" height="16"><span class="seats-category__title">${label} stoelen</span></button>`,
  )
  .join('')}</div>`;
const row = (n: number, cells: string) =>
  `<div class="seats__row" data-test="seats-row-${n}" style="position:relative;height:24px">${cells}</div>`;
export const fakeMap = `<div class="seat-map__scaled-scene"><div class="seats" data-test="seats">${[
  row(1, seat(1, 1, 1) + seat(1, 2, 2)),
  row(2, seat(2, 1, 5) + '<span class="seats__seat"></span>' + seat(2, 2, 3)),
  row(3, seat(3, 1, 1, 'ultra') + seat(3, 2, 2, 'special')),
  row(4, seat(4, 1, 1, 'lux', 'picked') + seat(4, 2, 2, 'lux', 'unavailable')),
].join('')}</div></div>`;
export const seatPage = bookingAlpha + fakeLegend + fakeMap;

/** Test layout double from explicit invented CSS, never inferred from seat labels. */
export function fixtureGeometry(document: Document) {
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    'button.seats__seat',
  )) {
    button.getBoundingClientRect = () => {
      const left = parseFloat(button.style.left),
        top = parseFloat(button.style.top),
        width = parseFloat(button.style.width),
        height = parseFloat(button.style.height);
      return {
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        x: left,
        y: top,
        toJSON: () => ({}),
      };
    };
  }
}
