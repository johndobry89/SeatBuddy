import { HALL_PATTERN, TIME_PATTERN, shareableLabel } from '../core/message';
import {
  CATEGORY_SCHEMES,
  type Border,
  type Category,
  type Observation,
  type Rect,
  type Scheme,
  type Seat,
  type SeatMap,
  type SeatState,
  type Showing,
} from '../core/types';

/**
 * The ONLY place that knows vuecinemas.nl markup. Selectors come from the
 * sanitised owner evidence in the earlier experiment (issues #31/#33/#37),
 * not from private APIs. Read-only: no clicks, no events, no form values, no
 * network, no storage. Anything unexpected yields a non-OK status.
 */

export const VUE_ORIGINS = ['https://www.vuecinemas.nl', 'https://vuecinemas.nl'];
const MAX_SEATS = 600;
const MAX_ROWS = 60;
const SPECIAL = /accessible|wheelchair|rolstoel|disabled|companion|begeleider|special|recliner|paired|sofa|duo|love/i;
const SEAT_LABEL = /^Seat ([1-9]\d{0,2})-([1-9]\d{0,2}), (available|unavailable|picked)$/;
const PROTECTED_PATH =
  /\/(?:login|inloggen|account|mijn[-/]?vue|checkout|cart|basket|payment|betaling|booking|tickets?)(?:\/|$)/i;
const PROTECTED_UI =
  '.checkout, dialog[open], [role="dialog"], [aria-modal="true"], input[type="password"], input[type="email"], input[autocomplete="username"], input[autocomplete^="cc-"]';

type View = { document: Document; location: Location; top: boolean };

export function visible(element: Element | null | undefined): element is HTMLElement {
  return (
    !!element &&
    'checkVisibility' in element &&
    (element as HTMLElement).checkVisibility({
      checkOpacity: true,
      checkVisibilityCSS: true,
    }) &&
    element.getClientRects().length > 0 &&
    !element.closest('[hidden], [inert], [aria-hidden="true"]')
  );
}

/** Text of a visible leaf node only; never of forms, menus or containers. */
function leafText(node: Element | undefined | null): string | null {
  if (!visible(node) || node.children.length || node.closest('form, .checkout'))
    return null;
  const value = (node.textContent ?? '').trim().replace(/\s+/g, ' ');
  return value && value.length <= 120 && !/[@<>|]|:\/\/|\d{7}/.test(value) ? value : null;
}

function measure(element: Element): Rect | null {
  const r = element.getBoundingClientRect();
  const rect = { left: r.left, top: r.top, width: r.width, height: r.height };
  return Object.values(rect).every(Number.isFinite) && rect.width > 0 && rect.height > 0
    ? rect
    : null;
}

type Field = { value: string | null; ambiguous: boolean; node: Element | null };
function single(root: ParentNode, selector: string): Field {
  const nodes = root.querySelectorAll(selector);
  if (nodes.length !== 1) return { value: null, ambiguous: nodes.length > 1, node: null };
  return { value: leafText(nodes[0]), ambiguous: false, node: nodes[0]! };
}

const WEEKDAYS = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
const MONTHS = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

/** The visible short date must agree with the machine-readable local date. */
function readDate(field: Field): string | null {
  const stamp = field.value ? field.node?.getAttribute('datetime') : null;
  const m = stamp ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::\d{2})?$/.exec(stamp) : null;
  if (!m) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}`;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso) return null;
  const shown = /^(zo|ma|di|wo|do|vr|za) ([1-9]|[12]\d|3[01]) ([a-z]{3})$/.exec(field.value!);
  const agrees =
    field.value === iso ||
    (!!shown &&
      shown[1] === WEEKDAYS[date.getUTCDay()] &&
      Number(shown[2]) === date.getUTCDate() &&
      shown[3] === MONTHS[date.getUTCMonth()]);
  return agrees ? iso : null;
}

function readShowing(hero: Element, view: View): { showing: Partial<Showing>; ambiguous: boolean } {
  const movie = single(hero, 'h1[data-test="booking-film-title"], h1.booking-heading__title');
  const cinema = single(hero, '.booking-hero__cinema');
  const hall = single(hero, '[data-test="booking-hero-cinema-screen-name"], .booking-hero__cinema-screen');
  const date = single(hero, 'time[data-test="booking-date-date"], time.booking-date__date');
  const time = single(hero, 'time[data-test="booking-date-start-time"], time.booking-date__time__start');
  const ambiguous = [movie, cinema, hall, date, time].some((f) => f.ambiguous);
  const showing: Partial<Showing> = {};
  if (movie.value && shareableLabel(movie.value)) showing.movie = movie.value;
  if (cinema.value && shareableLabel(cinema.value)) showing.cinema = cinema.value;
  const iso = readDate(date);
  if (iso) showing.date = iso;
  const stampTime = date.node?.getAttribute('datetime')?.slice(11, 16);
  if (iso && time.value && TIME_PATTERN.test(time.value) && time.value === stampTime)
    showing.time = time.value;
  if (hall.value && HALL_PATTERN.test(hall.value)) {
    // The hall heading above the map, when present, must say the same.
    const headings = [...view.document.querySelectorAll('[data-test="screen-title"]')].filter(visible);
    if (headings.length === 0 || (headings.length === 1 && leafText(headings[0]) === hall.value))
      showing.hall = hall.value;
  }
  return { showing, ambiguous };
}

function iconRefs(image: HTMLImageElement, view: View): string[] | null {
  const raw = [image.getAttribute('src') ?? '', image.currentSrc ?? ''].filter(Boolean);
  if (!raw.length) return null;
  const refs: string[] = [];
  for (const value of raw) {
    if (value.startsWith('data:image/')) {
      refs.push(value);
      continue;
    }
    try {
      const url = new URL(value, view.document.baseURI);
      // Same-page identity only: compared in memory, never fetched or exported.
      if (url.protocol !== 'https:' || url.origin !== view.location.origin || url.hash) return null;
      refs.push(url.href);
    } catch {
      return null;
    }
  }
  return [...new Set(refs)];
}

/** Legend entries → icon reference → category. Any conflict means unknown. */
function readLegend(view: View): { scheme: Scheme; icons: Map<string, Category> } | null {
  const sources: [Element[], string][] = [
    [[...view.document.querySelectorAll('.seat-map-legend-list__item--dynamic')], '[data-test="legend-title"]'],
    [[...view.document.querySelectorAll('button.seats-category[data-test="area-category-item-button"]')], '.seats-category__title'],
  ];
  const icons = new Map<string, Category>();
  let scheme: Scheme | null = null;
  let used = 0;
  for (const [all, titleSelector] of sources) {
    const entries = all.filter(visible);
    if (!entries.length) continue;
    used++;
    const names = entries.map((e) => single(e, titleSelector).value?.replace(/ stoelen$/, '') ?? '');
    const match = (Object.keys(CATEGORY_SCHEMES) as Scheme[]).find(
      (key) =>
        names.length === CATEGORY_SCHEMES[key].length &&
        new Set(names).size === names.length &&
        CATEGORY_SCHEMES[key].every((n) => names.includes(n)),
    );
    if (!match || (scheme && scheme !== match)) return null;
    scheme = match;
    for (const [i, entry] of entries.entries()) {
      const images = entry.querySelectorAll('img');
      if (images.length !== 1 || !visible(images[0])) return null;
      const refs = iconRefs(images[0] as HTMLImageElement, view);
      if (!refs) return null;
      for (const ref of refs) {
        const known = icons.get(ref);
        if (known && known !== names[i]) return null;
        icons.set(ref, names[i] as Category);
      }
    }
  }
  // Two categories sharing one icon would make classification meaningless.
  if (!scheme || !used || new Set(icons.values()).size !== CATEGORY_SCHEMES[scheme].length) return null;
  return { scheme, icons };
}

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const COMMENT_NODE = 8;

function border(node: ChildNode | null, direction: 'previousSibling' | 'nextSibling'): Border {
  let current = node;
  while (current) {
    if (current.nodeType === TEXT_NODE) {
      if ((current.textContent ?? '').trim()) return 'MARKED';
      current = current[direction];
      continue;
    }
    if (current.nodeType === COMMENT_NODE) return 'GAP';
    if (current.nodeType !== ELEMENT_NODE) return 'MARKED';
    const element = current as Element;
    if (element.matches('button.seats__seat')) return 'SEAT';
    // An empty, unmarked spacer is a gap; anything with content, an icon,
    // text, a control or a special class might be a wheelchair space.
    const empty = !element.children.length && !(element.textContent ?? '').trim();
    return empty && !SPECIAL.test(element.className.toString()) ? 'GAP' : 'MARKED';
  }
  return 'END';
}

function readMap(view: View): SeatMap {
  const empty = (status: SeatMap['status']): SeatMap => ({ status, scheme: null, rows: [], screen: null });
  const maps = view.document.querySelectorAll('.seats[data-test="seats"]');
  if (maps.length !== 1) return empty(maps.length ? 'INCONSISTENT' : 'NO_MAP');
  const map = maps[0]!;
  if (!visible(map)) return empty('NOT_VISIBLE');
  const rowElements = [...map.querySelectorAll('.seats__row[data-test^="seats-row-"]')];
  const buttons = [...map.querySelectorAll('button.seats__seat')];
  if (!rowElements.length || !buttons.length) return empty('NO_MAP');
  if (rowElements.length > MAX_ROWS || buttons.length > MAX_SEATS) return empty('INCONSISTENT');
  // A half-rendered or animating map (one invisible seat) is not read.
  if ([...rowElements, ...buttons].some((e) => !visible(e))) return empty('NOT_VISIBLE');
  if (buttons.some((b) => !rowElements.includes(b.parentElement!))) return empty('INCONSISTENT');

  const legend = readLegend(view);
  const labels = new Set<string>();
  const ids = new Set<string>();
  const rowNumbers = new Set<number>();
  const rows: Seat[][] = [];
  for (const rowElement of rowElements) {
    const seats: Seat[] = [];
    const columns = new Set<number>();
    let rowNumber: number | null = null;
    for (const button of rowElement.querySelectorAll(':scope > button.seats__seat')) {
      const m = SEAT_LABEL.exec(button.getAttribute('aria-label') ?? '');
      const id = button.getAttribute('data-test');
      const column = /^\d{1,3}$/.test(button.getAttribute('data-column') ?? '')
        ? Number(button.getAttribute('data-column'))
        : NaN;
      if (!m || !id || ids.has(id) || !Number.isFinite(column) || columns.has(column))
        return empty('INCONSISTENT');
      const row = Number(m[1]);
      const number = Number(m[2]);
      if (labels.has(`${row}-${number}`) || (rowNumber !== null && rowNumber !== row))
        return empty('INCONSISTENT');
      rowNumber = row;
      ids.add(id);
      labels.add(`${row}-${number}`);
      columns.add(column);
      const disabled = (button as HTMLButtonElement).disabled;
      const label = m[3] as Exclude<SeatState, 'unknown'>;
      // A label that contradicts the control state is not trusted.
      const state: SeatState =
        disabled === (label === 'unavailable') && !button.hasAttribute('aria-disabled')
          ? label
          : 'unknown';
      let category: Category | null = null;
      if (legend && (state === 'available' || state === 'picked')) {
        const images = button.querySelectorAll('img[data-test="seat-icon-image"]');
        const refs = images.length === 1 && visible(images[0]) ? iconRefs(images[0] as HTMLImageElement, view) : null;
        const found = new Set(refs?.map((ref) => legend.icons.get(ref)));
        if (refs && found.size === 1 && !found.has(undefined)) category = [...found][0]!;
      }
      seats.push({
        row,
        number,
        column,
        state,
        category,
        special: SPECIAL.test(button.className.toString()) || SPECIAL.test(rowElement.className.toString()),
        rect: measure(button),
        before: border(button.previousSibling, 'previousSibling'),
        after: border(button.nextSibling, 'nextSibling'),
      });
    }
    if (rowNumber !== null) {
      if (rowNumbers.has(rowNumber)) return empty('INCONSISTENT');
      rowNumbers.add(rowNumber);
    }
    rows.push(seats);
  }
  const headings = [...view.document.querySelectorAll('[data-test="screen-title"]')].filter(visible);
  return {
    status: legend ? 'OK' : 'LEGEND_UNKNOWN',
    scheme: legend?.scheme ?? null,
    rows,
    screen: headings.length === 1 ? measure(headings[0]!) : null,
  };
}

export function observe(view: View, now = Date.now()): Observation {
  const result: Observation = { status: 'NOT_VUE', observedAt: now, showing: {}, map: null };
  if (!view.top || !VUE_ORIGINS.includes(view.location.origin)) return result;
  const { document } = view;
  if (PROTECTED_PATH.test(view.location.pathname) || [...document.querySelectorAll(PROTECTED_UI)].some(visible)) {
    result.status = 'PROTECTED';
    return result;
  }
  const heroes = document.querySelectorAll('[data-test="booking-hero"]');
  if (heroes.length === 0 || !visible(heroes[0])) {
    result.status = 'NO_SHOWING';
    return result;
  }
  const quickTicket = [...document.querySelectorAll('div.quick-book[role="complementary"]')].some(visible);
  if (heroes.length > 1 || quickTicket) {
    result.status = 'AMBIGUOUS';
    return result;
  }
  const { showing, ambiguous } = readShowing(heroes[0]!, view);
  result.showing = showing;
  if (ambiguous) {
    result.status = 'AMBIGUOUS';
    return result;
  }
  if (Object.keys(showing).length !== 5) {
    result.status = 'INCOMPLETE';
    return result;
  }
  result.status = 'OK';
  result.map = readMap(view);
  return result;
}
