import { bookingAlpha } from './vue-header';
import { fakeLegend, seat } from './vue-seatmap';

// Invented room: reverse labels, explicit layout, screen inside this one scene.
export const rearCenterPage = (front = 6, count = 8) =>
  bookingAlpha.replace(/<h2[^>]*>.*?<\/h2>/, '') +
  fakeLegend +
  `<div class="seat-map__scaled-scene" style="position:relative;width:${count * 24 - 4}px;height:220px"><h2 data-test="screen-title" style="position:absolute;left:0;top:0;width:${count * 24 - 4}px;height:20px;margin:0">Zaal 2</h2><div class="seats" data-test="seats">${[
    front,
    front - 1,
    2,
    1,
  ]
    .map(
      (label, depth) =>
        `<div class="seats__row" data-test="seats-row-${label}" style="position:absolute;left:0;top:${40 + depth * 40}px;width:100%;height:20px">${Array.from({ length: count }, (_, i) => seat(label, i + 1, i + 1)).join('')}</div>`,
    )
    .join('')}</div></div>`;

/** Explicit CSS layout double; native Chrome separately uses the real CSS. */
export function rankingGeometry(document: Document) {
  for (const element of document.querySelectorAll<HTMLElement>(
    'button.seats__seat, [data-test="screen-title"]',
  )) {
    element.getBoundingClientRect = () => {
      const left = parseFloat(element.style.left),
        top =
          parseFloat(element.style.top) +
          (element.matches('button')
            ? parseFloat(element.parentElement!.style.top)
            : 0),
        width = parseFloat(element.style.width),
        height = parseFloat(element.style.height);
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
