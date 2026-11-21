import { JSDOM } from 'jsdom';
import { observe } from '../src/reader/vue-adapter';
import type { Border, Category, Observation, Seat, SeatMap, SeatState } from '../src/core/types';

/* ---------- Pure map builders (no DOM) ---------- */

export function makeSeat(
  row: number,
  number: number,
  column: number,
  options: Partial<{ state: SeatState; category: Category | null; special: boolean; before: Border; after: Border; left: number }> = {},
): Seat {
  const state = options.state ?? 'available';
  return {
    row,
    number,
    column,
    state,
    category: options.category === undefined ? (state === 'available' ? 'Lux' : null) : options.category,
    special: options.special ?? false,
    rect: { left: options.left ?? (column - 1) * 24, top: row * 30, width: 20, height: 20 },
    before: options.before ?? 'SEAT',
    after: options.after ?? 'SEAT',
  };
}

/** A row of consecutive seats; the outer borders are row ends. */
export function makeRow(row: number, count: number, overrides: Record<number, Parameters<typeof makeSeat>[3]> = {}): Seat[] {
  return Array.from({ length: count }, (_, i) => {
    const o = overrides[i + 1] ?? {};
    return makeSeat(row, i + 1, i + 1, { before: i === 0 ? 'END' : 'SEAT', after: i === count - 1 ? 'END' : 'SEAT', ...o });
  });
}

export const makeMap = (rows: Seat[][], screen: SeatMap['screen'] = null): SeatMap => ({ status: 'OK', scheme: 'LUX_4', rows, screen });

/* ---------- Invented Vue-like DOM (never owner captures) ---------- */

export const icon = (key: string) => `data:image/png;base64,INVENTED_${key}`;
const CAT_KEY: Record<string, string> = { 'Ultra Lux': 'ultra', Lux: 'lux', 'Saver Lux': 'saver', 'Super Saver Lux': 'super' };

export interface Showing {
  movie?: string;
  cinema?: string;
  hall?: string;
  datetime?: string;
  dateText?: string;
  time?: string;
}

export function hero(s: Showing = {}) {
  const movie = s.movie ?? 'Demo Film';
  const cinema = s.cinema ?? 'Vue Teststad';
  const hall = s.hall ?? 'Zaal 6';
  const datetime = s.datetime ?? '2030-11-22T18:40:00';
  const dateText = s.dateText ?? 'vr 22 nov';
  const time = s.time ?? '18:40';
  return `<section data-test="booking-hero"><h1 data-test="booking-film-title">${movie}</h1><p class="booking-hero__cinema">${cinema}</p><span data-test="booking-hero-cinema-screen-name">${hall}</span><time data-test="booking-date-date" datetime="${datetime}">${dateText}</time><time data-test="booking-date-start-time" datetime="${time}">${time}</time></section>`;
}

export const legend = (iconFor: (key: string) => string = icon) =>
  `<div>${Object.entries(CAT_KEY)
    .map(([name, key]) => `<button class="seats-category" data-test="area-category-item-button"><img src="${iconFor(key)}"><span class="seats-category__title">${name} stoelen</span></button>`)
    .join('')}</div>`;

export interface DomSeat {
  number: number;
  column?: number;
  state?: 'available' | 'unavailable' | 'picked';
  category?: string;
  className?: string;
  left?: number;
}

export function domSeat(row: number, s: DomSeat) {
  const column = s.column ?? s.number;
  const state = s.state ?? 'available';
  const key = s.category === undefined ? 'lux' : CAT_KEY[s.category] ?? s.category;
  const left = s.left ?? (column - 1) * 24;
  return `<button class="seats__seat${s.className ? ` ${s.className}` : ''}" aria-label="Seat ${row}-${s.number}, ${state}" data-column="${column}" data-test="seat-${row}-${s.number}"${state === 'unavailable' ? ' disabled' : ''} style="left:${left}px;top:${row * 30}px;width:20px;height:20px"><img data-test="seat-icon-image" src="${icon(key)}"></button>`;
}

export const domRow = (row: number, cells: string) => `<div class="seats__row" data-test="seats-row-${row}">${cells}</div>`;
export const domMap = (rows: string[]) => `<div class="seats" data-test="seats">${rows.join('')}</div>`;
export const screenTitle = (hall = 'Zaal 6', style = 'left:0;top:0;width:400px;height:20px') =>
  `<h2 data-test="screen-title" style="${style}">${hall}</h2>`;

export const page = (rows: string[], extra = '') => hero() + screenTitle() + legend() + domMap(rows) + extra;

/**
 * jsdom has no layout. Visibility follows [hidden]/display:none/opacity:0 and
 * geometry follows explicit inline left/top/width/height, nothing inferred.
 */
export function read(
  html: string,
  url = 'https://www.vuecinemas.nl/films/demo/kopen',
  prepare?: (document: Document) => void,
  top = true,
): Observation {
  const dom = new JSDOM(`<!doctype html><body>${html}</body>`, { url });
  const { window } = dom;
  const proto = window.HTMLElement.prototype as unknown as Record<string, unknown>;
  proto.checkVisibility = function (this: HTMLElement) {
    for (let node: HTMLElement | null = this; node; node = node.parentElement) {
      const style = node.getAttribute('style') ?? '';
      if (/display:\s*none|opacity:\s*0(?![.\d])|visibility:\s*hidden/.test(style)) return false;
    }
    return true;
  };
  proto.getClientRects = () => [{}];
  proto.getBoundingClientRect = function (this: HTMLElement) {
    const style = this.getAttribute('style') ?? '';
    const n = (k: string) => Number(new RegExp(`(?:^|;)\\s*${k}:\\s*(-?[\\d.]+)px`).exec(style)?.[1] ?? 0);
    const left = n('left'), top = n('top'), width = n('width'), height = n('height');
    return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) };
  };
  // Reading any form value would be a privacy bug.
  Object.defineProperty(window.HTMLInputElement.prototype, 'value', {
    get() {
      throw new Error('form value read');
    },
  });
  prepare?.(window.document);
  try {
    return observe({ document: window.document, location: window.location, top }, 1_000_000);
  } finally {
    window.close();
  }
}
