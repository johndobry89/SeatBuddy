/**
 * Plain data that leaves the page. Seat numbers, states and categories are the
 * public seat map; no account, ticket, price, URL, HTML or form data is ever
 * part of an observation.
 */

export const CATEGORY_SCHEMES = {
  LUX_4: ['Ultra Lux', 'Lux', 'Saver Lux', 'Super Saver Lux'],
  RANK_3: ['Regular', 'Saver', 'Super Saver'],
} as const;

export type Scheme = keyof typeof CATEGORY_SCHEMES;
export type Category = (typeof CATEGORY_SCHEMES)[Scheme][number];
export const ALL_CATEGORIES: readonly Category[] = [
  ...CATEGORY_SCHEMES.LUX_4,
  ...CATEGORY_SCHEMES.RANK_3,
];

export type SeatState = 'available' | 'unavailable' | 'picked' | 'unknown';

/**
 * What directly borders a seat inside its row element:
 * - SEAT: the next/previous seat button, with only whitespace in between
 * - GAP: an empty spacer element or a comment (aisle / layout gap)
 * - MARKED: any other element or visible text, which might be a wheelchair
 *   space or other special place; treated as unsafe to sit next to
 * - END: nothing (row edge)
 */
export type Border = 'SEAT' | 'GAP' | 'MARKED' | 'END';

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface Seat {
  row: number;
  number: number;
  column: number;
  state: SeatState;
  /** Only known for available seats with an exact legend icon match. */
  category: Category | null;
  /** Class markers such as wheelchair/companion/special on seat or row. */
  special: boolean;
  rect: Rect | null;
  before: Border;
  after: Border;
}

export type MapStatus =
  | 'OK'
  | 'NO_MAP'
  | 'NOT_VISIBLE'
  | 'INCONSISTENT'
  | 'LEGEND_UNKNOWN';

export interface SeatMap {
  status: MapStatus;
  scheme: Scheme | null;
  /** Physical row elements, seats in DOM order. Empty unless status is OK/LEGEND_UNKNOWN. */
  rows: Seat[][];
  /** Measured position of the screen/hall heading, if exactly one is visible. */
  screen: Rect | null;
}

export const SHOWING_FIELDS = ['movie', 'cinema', 'date', 'time', 'hall'] as const;
export type ShowingField = (typeof SHOWING_FIELDS)[number];
export type Showing = Record<ShowingField, string>;

export type PageStatus =
  | 'OK'
  | 'NOT_VUE'
  | 'PROTECTED'
  | 'NO_SHOWING'
  | 'AMBIGUOUS'
  | 'INCOMPLETE';

export interface Observation {
  status: PageStatus;
  observedAt: number;
  /** Only fields that were unambiguously visible. */
  showing: Partial<Showing>;
  map: SeatMap | null;
}
