import { bookingAlpha } from './vue-header';
import { fakeIcon, fakeMap } from './vue-seatmap';

// Fictional static paths, fulfilled locally in Chrome; no real Vue asset copied/fetched.
export const fixtureIconPath = (key: string) => `/public-icons/fake-${key}.svg`;
export const dynamicLegend = (rank = false) =>
  `<div>${(rank
    ? [
        ['lux', 'Regular'],
        ['saver', 'Saver'],
        ['super', 'Super Saver'],
      ]
    : [
        ['ultra', 'Ultra Lux'],
        ['lux', 'Lux'],
        ['saver', 'Saver Lux'],
        ['super', 'Super Saver Lux'],
      ]
  )
    .map(
      ([key, title]) =>
        `<div class="seat-map-legend-list__item--dynamic"><img src="${fixtureIconPath(key!)}" width="16" height="16"><span data-test="legend-title">${title}</span></div>`,
    )
    .join('')}</div>`;
const publicMap = fakeMap.replace(
  /data:image\/png;base64,FAKE_([a-z]+)/g,
  (_, key: string) => `https://www.vuecinemas.nl${fixtureIconPath(key)}`,
);
export const dynamicLuxPage = bookingAlpha + dynamicLegend() + publicMap;
export const dynamicRankPage =
  bookingAlpha.replaceAll('Zaal 2', 'Zaal 6 Dolby Cinema') +
  dynamicLegend(true) +
  publicMap;
export const dataLegendPage = dynamicLuxPage.replace(
  /(?:https:\/\/www.vuecinemas.nl)?\/public-icons\/fake-([a-z]+)\.svg/g,
  (_, key: string) => fakeIcon(key),
);

// Synthetic identity regression: arbitrary path, complete opaque query, no real asset.
export const fixtureIdentityPath = (key: string) =>
  `/other-path/icon?revision=demo&kind=${key}`;
export const identityLuxPage = dynamicLuxPage.replace(
  /(?:https:\/\/www.vuecinemas.nl)?\/public-icons\/fake-([a-z]+)\.svg/g,
  (_, key: string) => `https://www.vuecinemas.nl${fixtureIdentityPath(key)}`,
);
