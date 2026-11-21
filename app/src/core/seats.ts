import type { Category, Rect, Seat, SeatMap } from './types';

/**
 * Pure seat logic. One physical predicate decides adjacency for A's discovery
 * and B's check alike. Safety beats finding more candidates: anything that
 * cannot be shown to be an ordinary, available, directly adjacent seat pair is
 * rejected.
 */

export interface Position {
  rowIndex: number;
  index: number;
}

export interface Pair {
  row: number;
  /** In DOM order: first is the left/first button in the row element. */
  seats: [number, number];
  /** Null only for a taken member in a partner check (category not visible). */
  categories: [Category | null, Category | null];
}

export type Rejection =
  | 'NOT_FOUND'
  | 'NOT_AVAILABLE'
  | 'CATEGORY_UNKNOWN'
  | 'ULTRA_LUX'
  | 'SPECIAL'
  | 'NOT_ADJACENT'
  | 'SPECIAL_NEIGHBOUR';

export type RankingMode = 'SCREEN' | 'PAGE_ORDER';

export interface Discovery {
  pairs: Pair[];
  mode: RankingMode;
  /** Pairs that were physically fine but sit next to an unclassified/special place. */
  bufferRejected: number;
}

const finite = (rect: Rect) =>
  [rect.left, rect.top, rect.width, rect.height].every(Number.isFinite) &&
  rect.width > 0 &&
  rect.height > 0;

/** Geometry: same line, similar size, no overlap, gap at most 30% of a seat. */
export function touching(a: Rect | null, b: Rect | null): boolean {
  if (!a || !b || !finite(a) || !finite(b)) return false;
  const [left, right] = a.left <= b.left ? [a, b] : [b, a];
  const width = Math.min(a.width, b.width);
  const height = Math.min(a.height, b.height);
  const gap = right.left - (left.left + left.width);
  return (
    Math.max(a.width, b.width) <= width * 1.25 &&
    Math.max(a.height, b.height) <= height * 1.25 &&
    Math.abs(a.top - b.top) <= height * 0.25 &&
    gap >= 0 &&
    gap <= width * 0.3
  );
}

export function seatAt(map: SeatMap, at: Position): Seat | undefined {
  return map.rows[at.rowIndex]?.[at.index];
}

export function locate(
  map: SeatMap,
  row: number,
  number: number,
): Position | null {
  const matches: Position[] = [];
  map.rows.forEach((seats, rowIndex) =>
    seats.forEach((seat, index) => {
      if (seat.row === row && seat.number === number)
        matches.push({ rowIndex, index });
    }),
  );
  // Labels are unique per map (the adapter guarantees it); stay defensive.
  return matches.length === 1 ? matches[0]! : null;
}

/** Physical neighbours: state and category are deliberately ignored here. */
export function adjacent(map: SeatMap, first: Position): boolean {
  const a = seatAt(map, first);
  const b = seatAt(map, { rowIndex: first.rowIndex, index: first.index + 1 });
  return (
    !!a &&
    !!b &&
    a.after === 'SEAT' &&
    b.before === 'SEAT' &&
    a.row === b.row &&
    Math.abs(a.number - b.number) === 1 &&
    Math.abs(a.column - b.column) === 1 &&
    touching(a.rect, b.rect)
  );
}

/** An outer border is safe unless it is marked, special or unclassified. */
function safeOuterBorder(
  map: SeatMap,
  at: Position,
  side: 'before' | 'after',
): boolean {
  const seat = seatAt(map, at)!;
  const border = seat[side];
  if (border === 'MARKED') return false;
  if (border !== 'SEAT') return true;
  const neighbourAt = {
    rowIndex: at.rowIndex,
    index: at.index + (side === 'before' ? -1 : 1),
  };
  const neighbour = seatAt(map, neighbourAt);
  if (!neighbour) return false;
  const touchingNeighbour = adjacent(
    map,
    side === 'before' ? neighbourAt : at,
  );
  // A seat across an aisle/column gap does not border this pair. A touching
  // neighbour must be an ordinary classified seat. Taken seats have no visible
  // category, so they count as unclassified (deliberate over-exclusion).
  return !touchingNeighbour || (neighbour.category !== null && !neighbour.special);
}

export interface PairCheck {
  /** Which members must currently be available; a taken partner seat may be allowed. */
  require: 'BOTH' | 'SECOND_ONLY' | 'FIRST_ONLY';
}

/**
 * Evaluates the pair starting at `first` (DOM order: first, first+1).
 * `picked` (selected by the person on this page) counts as available.
 */
export function evaluate(
  map: SeatMap,
  first: Position,
  check: PairCheck = { require: 'BOTH' },
): { ok: true; pair: Pair } | { ok: false; reason: Rejection } {
  const second = { rowIndex: first.rowIndex, index: first.index + 1 };
  const a = seatAt(map, first);
  const b = seatAt(map, second);
  if (!a || !b) return { ok: false, reason: 'NOT_FOUND' };
  const members = [
    { seat: a, required: check.require !== 'SECOND_ONLY' },
    { seat: b, required: check.require !== 'FIRST_ONLY' },
  ];
  for (const { seat, required } of members) {
    if (!required) continue;
    if (seat.state !== 'available' && seat.state !== 'picked')
      return { ok: false, reason: 'NOT_AVAILABLE' };
    if (seat.special) return { ok: false, reason: 'SPECIAL' };
    if (seat.category === 'Ultra Lux') return { ok: false, reason: 'ULTRA_LUX' };
  }
  // Category is only visible on available seats; picked/taken seats keep the
  // category requirement for required members (fail closed).
  for (const { seat, required } of members) {
    if (required && seat.category === null)
      return { ok: false, reason: 'CATEGORY_UNKNOWN' };
  }
  if (a.special || b.special) return { ok: false, reason: 'SPECIAL' };
  if (!adjacent(map, first)) return { ok: false, reason: 'NOT_ADJACENT' };
  if (
    !safeOuterBorder(map, first, 'before') ||
    !safeOuterBorder(map, second, 'after')
  )
    return { ok: false, reason: 'SPECIAL_NEIGHBOUR' };
  return {
    ok: true,
    pair: {
      row: a.row,
      seats: [a.number, b.number],
      categories: [a.category, b.category],
    },
  };
}

const centerX = (rect: Rect) => rect.left + rect.width / 2;
const centerY = (rect: Rect) => rect.top + rect.height / 2;

/**
 * The screen beacon proves orientation only when it is measurable, wider than
 * high, horizontally covers the middle of the room and lies entirely above all
 * seats. Otherwise rows are shown in page order, and the UI says so.
 */
function screenGeometry(map: SeatMap) {
  const rects = map.rows.flat().map((seat) => seat.rect);
  const screen = map.screen;
  if (!screen || !finite(screen) || rects.some((r) => !r || !finite(r)))
    return null;
  const all = rects as Rect[];
  const left = Math.min(...all.map((r) => r.left));
  const right = Math.max(...all.map((r) => r.left + r.width));
  const top = Math.min(...all.map((r) => r.top));
  const middle = (left + right) / 2;
  if (
    screen.width <= screen.height ||
    screen.left > middle ||
    screen.left + screen.width < middle ||
    screen.top + screen.height > top
  )
    return null;
  return { middle };
}

export function discover(map: SeatMap, limit = 3): Discovery {
  if (map.status !== 'OK') return { pairs: [], mode: 'PAGE_ORDER', bufferRejected: 0 };
  const candidates: { pair: Pair; at: Position; depth: number; offset: number; order: number }[] = [];
  let bufferRejected = 0;
  const geometry = screenGeometry(map);
  map.rows.forEach((seats, rowIndex) => {
    const rowDepth = geometry
      ? seats.reduce((sum, seat) => sum + centerY(seat.rect!), 0) / seats.length
      : 0;
    for (let index = 0; index < seats.length - 1; index++) {
      const at = { rowIndex, index };
      const result = evaluate(map, at);
      if (!result.ok) {
        if (result.reason === 'SPECIAL_NEIGHBOUR') bufferRejected++;
        continue;
      }
      const a = seats[index]!;
      const b = seats[index + 1]!;
      candidates.push({
        pair: result.pair,
        at,
        depth: rowDepth,
        offset: geometry
          ? Math.abs((centerX(a.rect!) + centerX(b.rect!)) / 2 - geometry.middle)
          : 0,
        order: candidates.length,
      });
    }
  });
  const sameCategory = (c: (typeof candidates)[number]) =>
    c.pair.categories[0] === c.pair.categories[1] ? 0 : 1;
  candidates.sort((x, y) =>
    geometry
      ? // Farther from the screen first, then closest to the middle.
        y.depth - x.depth ||
        x.offset - y.offset ||
        sameCategory(x) - sameCategory(y) ||
        x.order - y.order
      : sameCategory(x) - sameCategory(y) || x.order - y.order,
  );
  // Never offer overlapping options such as 1+2, 2+3, 3+4.
  const used = new Set<string>();
  const pairs: Pair[] = [];
  for (const candidate of candidates) {
    const keys = [0, 1].map(
      (offset) => `${candidate.at.rowIndex}:${candidate.at.index + offset}`,
    );
    if (keys.some((key) => used.has(key))) continue;
    keys.forEach((key) => used.add(key));
    pairs.push(candidate.pair);
    if (pairs.length === limit) break;
  }
  return { pairs, mode: geometry ? 'SCREEN' : 'PAGE_ORDER', bufferRejected };
}
