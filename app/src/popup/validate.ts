import { HALL_PATTERN, TIME_PATTERN, ISO_DATE_PATTERN, shareableLabel } from '../core/message';
import {
  ALL_CATEGORIES,
  CATEGORY_SCHEMES,
  SHOWING_FIELDS,
  type Border,
  type Observation,
  type Rect,
  type Seat,
  type SeatMap,
} from '../core/types';

/**
 * Whatever comes back from the page is untrusted until it has this exact
 * shape. Unknown keys, out-of-range numbers or wrong enums reject everything.
 */
export class InvalidObservation extends Error {
  override readonly name = 'InvalidObservation';
}

const fail = (): never => {
  throw new InvalidObservation('Onverwachte gegevens van de pagina.');
};
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const exactKeys = (v: Record<string, unknown>, keys: string[]) => {
  const own = Object.keys(v);
  if (own.length !== keys.length || !own.every((k) => keys.includes(k))) fail();
};
const oneOf = <T extends string>(v: unknown, options: readonly T[]): T =>
  typeof v === 'string' && (options as readonly string[]).includes(v) ? (v as T) : fail();
const int = (v: unknown, min: number, max: number) =>
  typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : fail();

function rect(v: unknown): Rect | null {
  if (v === null) return null;
  if (!isObject(v)) return fail();
  exactKeys(v, ['left', 'top', 'width', 'height']);
  const values = [v.left, v.top, v.width, v.height];
  if (!values.every((n) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) < 1e6)) fail();
  return { left: v.left as number, top: v.top as number, width: v.width as number, height: v.height as number };
}

const BORDERS: readonly Border[] = ['SEAT', 'GAP', 'MARKED', 'END'];
function seat(v: unknown): Seat {
  if (!isObject(v)) return fail();
  exactKeys(v, ['row', 'number', 'column', 'state', 'category', 'special', 'rect', 'before', 'after']);
  if (typeof v.special !== 'boolean') fail();
  return {
    row: int(v.row, 1, 999),
    number: int(v.number, 1, 999),
    column: int(v.column, 0, 999),
    state: oneOf(v.state, ['available', 'unavailable', 'picked', 'unknown'] as const),
    category: v.category === null ? null : oneOf(v.category, ALL_CATEGORIES),
    special: v.special as boolean,
    rect: rect(v.rect),
    before: oneOf(v.before, BORDERS),
    after: oneOf(v.after, BORDERS),
  };
}

function map(v: unknown): SeatMap | null {
  if (v === null) return null;
  if (!isObject(v)) return fail();
  exactKeys(v, ['status', 'scheme', 'rows', 'screen']);
  const rows = Array.isArray(v.rows) && v.rows.length <= 60 ? v.rows : fail();
  const seats = rows.map((r) => (Array.isArray(r) ? r.map(seat) : fail()));
  if (seats.flat().length > 600) fail();
  const scheme = v.scheme === null ? null : oneOf(v.scheme, Object.keys(CATEGORY_SCHEMES) as (keyof typeof CATEGORY_SCHEMES)[]);
  const allowed = scheme ? CATEGORY_SCHEMES[scheme] : [];
  if (seats.flat().some((s) => s.category !== null && !(allowed as readonly string[]).includes(s.category))) fail();
  return {
    status: oneOf(v.status, ['OK', 'NO_MAP', 'NOT_VISIBLE', 'INCONSISTENT', 'LEGEND_UNKNOWN'] as const),
    scheme,
    rows: seats,
    screen: rect(v.screen),
  };
}

export function validateObservation(raw: unknown, now = Date.now()): Observation {
  if (!isObject(raw)) return fail();
  exactKeys(raw, ['status', 'observedAt', 'showing', 'map']);
  const observedAt = int(raw.observedAt, 1, Number.MAX_SAFE_INTEGER);
  // Produced moments ago on this machine; anything else is not this read.
  if (observedAt > now + 1000 || now - observedAt > 10_000) fail();
  if (!isObject(raw.showing)) return fail();
  const showing: Observation['showing'] = {};
  for (const [key, value] of Object.entries(raw.showing)) {
    const field = oneOf(key, SHOWING_FIELDS);
    if (typeof value !== 'string') fail();
    const text = value as string;
    const ok =
      field === 'date' ? ISO_DATE_PATTERN.test(text)
      : field === 'time' ? TIME_PATTERN.test(text)
      : field === 'hall' ? HALL_PATTERN.test(text)
      : shareableLabel(text);
    if (!ok) fail();
    showing[field] = text;
  }
  const status = oneOf(raw.status, ['OK', 'NOT_VUE', 'PROTECTED', 'NO_SHOWING', 'AMBIGUOUS', 'INCOMPLETE'] as const);
  const seatMap = map(raw.map);
  if ((status === 'OK') !== (seatMap !== null)) fail();
  if (status === 'OK' && Object.keys(showing).length !== 5) fail();
  return { status, observedAt, showing, map: seatMap };
}
