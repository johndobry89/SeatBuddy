import { z } from 'zod';
import {
  duoCategorySchema,
  duoStatusSchema,
  formatDuoPlan,
  validateDuoPlan,
  type DuoPlan,
} from './duo-plan';

const fieldSchema = z
  .strictObject({
    status: z.enum(['OBSERVED_VISIBLE', 'UNKNOWN', 'AMBIGUOUS']),
    value: z.string().min(1).max(120).nullable(),
  })
  .refine(
    (field) => (field.status === 'OBSERVED_VISIBLE') === (field.value !== null),
  )
  .refine(
    (field) => !field.value || !/[@<>\r\n]|https?:|\d{7}/i.test(field.value),
  );
const candidateCategory = duoCategorySchema;
const seatSummarySchema = z
  .strictObject({
    source: z.literal('VISIBLE_LIVE_SEATMAP'),
    observedAt: z.number().int().positive(),
    reason: z.enum([
      'CONTEXT_UNKNOWN',
      'MAP_UNKNOWN',
      'STRUCTURE_UNKNOWN',
      'LEGEND_UNKNOWN',
      'NO_SAFE_PAIR',
      'CHECK_VISUALLY',
    ]),
    scheme: z.enum(['LUX_4', 'RANK_3', 'UNKNOWN']),
    diagnostic: z.enum([
      'NONE',
      'LEGEND_COUNT',
      'LEGEND_TITLE',
      'LEGEND_IMAGE_MISSING',
      'LEGEND_ICON_TYPE',
      'LEGEND_DUPLICATE_ICON',
      'SEAT_ICON_NO_MATCH',
      'NOT_VISIBLE',
      'UNKNOWN',
    ]),
    categoryEvidence: z.enum(['EXACT_VISIBLE_ICON', 'UNKNOWN']),
    counts: z
      .strictObject({
        available: z.number().int().min(0).max(499),
        unavailable: z.number().int().min(0).max(499),
        picked: z.number().int().min(0).max(499),
        unknown: z.number().int().min(0).max(499),
        categoryUnknownAvailable: z.number().int().min(0).max(499),
        ultraLuxAvailable: z.number().int().min(0).max(499),
      })
      .nullable(),
    pairs: z
      .array(
        z
          .strictObject({
            row: z.number().int().min(1).max(999),
            seats: z.tuple([
              z.number().int().min(1).max(999),
              z.number().int().min(1).max(999),
            ]),
            categories: z.tuple([candidateCategory, candidateCategory]),
          })
          .refine((pair) => Math.abs(pair.seats[0] - pair.seats[1]) === 1),
      )
      .max(3),
  })
  .refine(
    (summary) =>
      (summary.reason === 'CHECK_VISUALLY') === summary.pairs.length > 0,
  )
  .refine(
    (summary) =>
      !summary.pairs.length ||
      (summary.counts !== null &&
        summary.categoryEvidence === 'EXACT_VISIBLE_ICON'),
  );
type SeatSummary = z.infer<typeof seatSummarySchema>;
export const resultSchema = z.strictObject({
  reason: z.enum([
    'VISIBLE_METADATA',
    'UNSUPPORTED',
    'PROTECTED_PAGE',
    'AMBIGUOUS_CONTEXT',
  ]),
  observedAt: z.number().int().positive(),
  screenScope: z.enum([
    'VISIBLE_MAIN_METADATA',
    'VISIBLE_QUICK_TICKET',
    'VISIBLE_BOOKING_HERO',
  ]),
  seats: seatSummarySchema.optional(),
  duo: duoStatusSchema.optional(),
  fields: z.strictObject({
    movie: fieldSchema,
    cinema: fieldSchema,
    date: fieldSchema,
    time: fieldSchema,
    hall: fieldSchema,
  }),
});
export type PageRead = z.infer<typeof resultSchema>;

/** A deliberate selection from this current observation, never imported evidence. */
export function createDuoPlan(
  raw: unknown,
  selected: number,
  now = Date.now(),
): string {
  const read = resultSchema.parse(raw),
    map = read.seats;
  if (
    read.reason !== 'VISIBLE_METADATA' ||
    read.screenScope !== 'VISIBLE_BOOKING_HERO' ||
    !Object.values(read.fields).every(
      (field) => field.status === 'OBSERVED_VISIBLE',
    ) ||
    !map ||
    map.reason !== 'CHECK_VISUALLY' ||
    map.categoryEvidence !== 'EXACT_VISIBLE_ICON' ||
    map.scheme === 'UNKNOWN' ||
    map.observedAt !== read.observedAt ||
    !Number.isInteger(selected) ||
    selected < 0 ||
    !map.pairs[selected]
  )
    throw new Error('STOP — kies een paar uit een verse volledige waarneming.');
  const pair = map.pairs[selected]!;
  return formatDuoPlan(
    {
      version: 1,
      source: 'OWNER_VISIBLE_PAGE',
      state: 'NOT_BOOKED',
      observedAt: read.observedAt,
      showing: Object.fromEntries(
        Object.entries(read.fields).map(([key, field]) => [key, field.value]),
      ),
      pair: {
        row: pair.row,
        A: pair.seats[0],
        B: pair.seats[1],
        categories: pair.categories,
      },
    },
    now,
  );
}

/** Serialized by Chrome: deliberately self-contained, no imported closures.
 * Selectors are issues #31/#33's sanitised evidence, not a live guarantee. */
export function readVisibleVuePage(target?: DuoPlan): PageRead {
  const unknown = () => ({ status: 'UNKNOWN' as const, value: null });
  const result: PageRead = {
    reason: 'UNSUPPORTED',
    observedAt: Date.now(),
    screenScope: 'VISIBLE_MAIN_METADATA',
    fields: {
      movie: unknown(),
      cinema: unknown(),
      date: unknown(),
      time: unknown(),
      hall: unknown(),
    },
  };
  if (target) {
    result.duo = 'UNKNOWN_STOP';
    if (
      Date.now() < target.observedAt ||
      Date.now() - target.observedAt >= 300_000
    )
      return result;
  }
  if (
    window !== window.top ||
    !['https://www.vuecinemas.nl', 'https://vuecinemas.nl'].includes(
      location.origin,
    )
  )
    return result;
  const visible = (element: Element) =>
    element instanceof HTMLElement &&
    element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) &&
    element.getClientRects().length > 0 &&
    !element.closest('[hidden], [inert], [aria-hidden="true"]');
  // Presence/visibility only. Never read a form, its text or any input value.
  if (
    /\/(?:login|inloggen|account|mijn[-/]?vue|checkout|cart|basket|payment|betaling|booking|tickets?)(?:\/|$)/i.test(
      location.pathname,
    ) ||
    [
      ...document.querySelectorAll(
        '.checkout, dialog[open], [role="dialog"], [aria-modal="true"], input[type="password"], input[type="email"], input[autocomplete="username"], input[autocomplete^="cc-"]',
      ),
    ].some(visible)
  ) {
    result.reason = 'PROTECTED_PAGE';
    return result;
  }
  const validDate = (value: string) => {
    // Only explicit calendar dates, never infer today/tomorrow or a year.
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    const dutch = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(value);
    if (!iso && !dutch) return false;
    const year = Number(iso?.[1] ?? dutch?.[3]),
      month = Number(iso?.[2] ?? dutch?.[2]),
      day = Number(iso?.[3] ?? dutch?.[1]);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      year >= 2000 &&
      year <= 2100 &&
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  };
  // Two narrow, independent sources. Never inspect menus, CTA URLs or siblings.
  const display = (node: Element) => {
    if (!visible(node) || node.children.length || node.closest('.checkout'))
      return null;
    const value = node.textContent?.trim().replace(/\s+/g, ' ');
    return value && value.length <= 120 && !/[@<>]|https?:|\d{7}/i.test(value)
      ? value
      : null;
  };
  const single = (root: ParentNode, selector: string) => {
    const nodes = root.querySelectorAll(selector);
    if (nodes.length !== 1)
      return {
        node: null,
        field:
          nodes.length > 1
            ? { status: 'AMBIGUOUS' as const, value: null }
            : unknown(),
      };
    const node = nodes[0]!;
    const value = display(node);
    return {
      node,
      field: value ? { status: 'OBSERVED_VISIBLE' as const, value } : unknown(),
    };
  };
  const ambiguousContext = () => {
    result.reason = 'AMBIGUOUS_CONTEXT';
    for (const key of Object.keys(
      result.fields,
    ) as (keyof PageRead['fields'])[])
      result.fields[key] = { status: 'AMBIGUOUS', value: null };
    return result;
  };
  const months = [
    'jan',
    'feb',
    'mrt',
    'apr',
    'mei',
    'jun',
    'jul',
    'aug',
    'sep',
    'okt',
    'nov',
    'dec',
  ];
  const shortDate = (value: string) => {
    const parts =
      /^(zo|ma|di|wo|do|vr|za) ([1-9]|[12]\d|3[01]) (jan|feb|mrt|apr|mei|jun|jul|aug|sep|okt|nov|dec)$/.exec(
        value,
      );
    if (!parts) return null;
    const month = months.indexOf(parts[3]!) + 1,
      day = Number(parts[2]);
    return day <= [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]!
      ? { weekday: parts[1], month, day }
      : null;
  };
  const validTime = (value: string) =>
    /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
  const heroes = document.querySelectorAll('[data-test="booking-hero"]');
  const quicks = document.querySelectorAll(
    'div.quick-book[role="complementary"]',
  );
  if (heroes.length) {
    result.screenScope = 'VISIBLE_BOOKING_HERO';
    if (heroes.length !== 1) return ambiguousContext();
    const hero = heroes[0]!;
    if (!visible(hero)) return result;
    if ([...quicks].some(visible)) return ambiguousContext();
    const movie = single(
      hero,
      'h1[data-test="booking-film-title"], h1.booking-heading__title',
    );
    const cinema = single(hero, '.booking-hero__cinema');
    const hall = single(
      hero,
      '[data-test="booking-hero-cinema-screen-name"], .booking-hero__cinema-screen',
    );
    const date = single(
      hero,
      'time[data-test="booking-date-date"], time.booking-date__date',
    );
    const time = single(
      hero,
      'time[data-test="booking-date-start-time"], time.booking-date__time__start',
    );
    result.fields = {
      movie: movie.field,
      cinema: cinema.field,
      hall: hall.field,
      date: unknown(),
      time: time.field,
    };
    // Local calendar fields only. No timezone conversion or inferred year.
    const stamp = date.field.value ? date.node?.getAttribute('datetime') : null;
    const local = stamp
      ? /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::([0-5]\d))?$/.exec(stamp)
      : null;
    if (date.field.status === 'AMBIGUOUS') result.fields.date = date.field;
    else if (local && validDate(local[1]!) && validTime(local[2]!)) {
      const shown = shortDate(date.field.value!);
      const calendar = new Date(`${local[1]}T00:00:00Z`);
      const matches =
        date.field.value === local[1] ||
        (shown &&
          shown.day === calendar.getUTCDate() &&
          shown.month === calendar.getUTCMonth() + 1 &&
          shown.weekday ===
            ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'][calendar.getUTCDay()]);
      result.fields.date = matches
        ? { status: 'OBSERVED_VISIBLE', value: local[1]! }
        : { status: 'AMBIGUOUS', value: null };
      if (time.field.value) {
        const timeStamp = time.node?.getAttribute('datetime');
        if (!validTime(time.field.value)) result.fields.time = unknown();
        else if (
          time.field.value !== local[2] ||
          (timeStamp !== null &&
            timeStamp !== undefined &&
            timeStamp !== time.field.value &&
            timeStamp !== stamp)
        )
          result.fields.time = { status: 'AMBIGUOUS', value: null };
      }
    }
    if (
      result.fields.date.status !== 'OBSERVED_VISIBLE' &&
      result.fields.time.status === 'OBSERVED_VISIBLE'
    )
      result.fields.time = unknown();
    if (
      hall.field.value &&
      !/^Zaal [1-9]\d{0,2}(?: Dolby Cinema)?$/.test(hall.field.value)
    )
      result.fields.hall = unknown();
    // Explicitly allowlisted hall heading; compare before any seat observation.
    const screenNodes = [
      ...document.querySelectorAll('[data-test="screen-title"]'),
    ].filter(visible);
    if (hall.field.value?.endsWith(' Dolby Cinema') && screenNodes.length === 0)
      result.fields.hall = unknown();
    if (result.fields.hall.value && screenNodes.length) {
      if (
        screenNodes.length !== 1 ||
        display(screenNodes[0]!) !== result.fields.hall.value
      )
        result.fields.hall = { status: 'AMBIGUOUS', value: null };
    }
    // Same isolated read, only after a complete, consistent showing. No fallback
    // from Quick Ticket, unknown headers or the protected-page guard above.
    const summary: SeatSummary = {
      source: 'VISIBLE_LIVE_SEATMAP',
      observedAt: result.observedAt,
      reason: 'CONTEXT_UNKNOWN',
      scheme: 'UNKNOWN',
      diagnostic: 'UNKNOWN',
      categoryEvidence: 'UNKNOWN',
      counts: null,
      pairs: [],
    };
    if (!target) result.seats = summary;
    const observeSeats = () => {
      summary.reason = 'MAP_UNKNOWN';
      const scenes = document.querySelectorAll('.seat-map__scaled-scene');
      const maps = document.querySelectorAll('.seats[data-test="seats"]');
      if (scenes.length > 1 || maps.length > 1) return;
      const scene = scenes[0],
        map = maps[0] ?? scene;
      if (
        !map ||
        !visible(map) ||
        (scene && (!visible(scene) || !scene.contains(map)))
      )
        return;
      const rows = [
        ...map.querySelectorAll('.seats__row[data-test^="seats-row-"]'),
      ];
      if (
        !rows.length ||
        rows.length > 50 ||
        new Set(rows.map((row) => row.getAttribute('data-test'))).size !==
          rows.length ||
        rows.some((row) => !visible(row))
      )
        return;
      // Reject malformed/hidden/oversized maps before inspecting seat attributes.
      const buttons = [...map.querySelectorAll('button.seats__seat')];
      if (
        !buttons.length ||
        buttons.length >= 500 ||
        rows.some((row) => row.children.length > 1000) ||
        buttons.some(
          (button) => !visible(button) || !rows.includes(button.parentElement!),
        )
      )
        return;
      summary.reason = 'STRUCTURE_UNKNOWN';
      const counts = {
        available: 0,
        unavailable: 0,
        picked: 0,
        unknown: 0,
        categoryUnknownAvailable: 0,
        ultraLuxAvailable: 0,
      };
      summary.counts = counts;
      type Category =
        'Ultra Lux' | SeatSummary['pairs'][number]['categories'][number];
      // Screen capabilities, not venue routing or Movie Pass price classes.
      const schemes = {
        LUX_4: ['Ultra Lux', 'Lux', 'Saver Lux', 'Super Saver Lux'],
        RANK_3: ['Regular', 'Saver', 'Super Saver'],
      } as const;
      const reference = (raw: string): string | null => {
        if (!raw.trim() || /^(?:#|null$|undefined$|none$)/i.test(raw.trim()))
          return null;
        if (raw.startsWith('data:image/')) return raw;
        try {
          const url = new URL(raw, document.baseURI);
          // Same-page image identity only. Keep the complete opaque query/path;
          // never inspect, strip, fetch, export or persist either (issue #37).
          if (
            url.protocol !== 'https:' ||
            url.origin !== location.origin ||
            url.username ||
            url.password ||
            url.hash
          )
            return null;
          return url.href;
        } catch {
          return null;
        }
      };
      const imageReferences = (image: HTMLImageElement) => {
        const raw = [image.getAttribute('src') ?? '', image.currentSrc].filter(
          Boolean,
        );
        const refs = raw.map(reference);
        return refs.length && refs.every((ref): ref is string => ref !== null)
          ? [...new Set(refs)]
          : null;
      };
      const dynamic = [
        ...document.querySelectorAll('.seat-map-legend-list__item--dynamic'),
      ];
      const categoryButtons = [
        ...document.querySelectorAll(
          'button.seats-category[data-test="area-category-item-button"]',
        ),
      ];
      const entries = (dynamic.length ? dynamic : categoryButtons)
        .filter(visible)
        .slice(0, 9);
      const titleSelector = dynamic.length
        ? '[data-test="legend-title"]'
        : '.seats-category__title';
      const names = entries.map(
        (entry) =>
          single(entry, titleSelector).field.value?.replace(/ stoelen$/, '') ??
          '',
      );
      const scheme = (Object.keys(schemes) as (keyof typeof schemes)[]).find(
        (key) =>
          (key !== 'RANK_3' || dynamic.length > 0) &&
          entries.length === schemes[key].length &&
          new Set(names).size === entries.length &&
          schemes[key].every((name) => names.includes(name)),
      );
      const icons = new Map<string, Category>();
      const byCategory = new Map<Category, string[]>();
      let legendKnown = false;
      summary.diagnostic =
        entries.length === 0 && (dynamic.length || categoryButtons.length)
          ? 'NOT_VISIBLE'
          : entries.length !== 3 && entries.length !== 4
            ? 'LEGEND_COUNT'
            : 'LEGEND_TITLE';
      if (scheme) {
        summary.scheme = scheme;
        summary.diagnostic = 'NONE';
        const inspect = (
          nodes: Element[],
          selector: string,
          crossCheck = false,
        ) => {
          for (const entry of nodes) {
            const name = single(entry, selector).field.value?.replace(
              / stoelen$/,
              '',
            );
            if (!name || !names.includes(name)) {
              summary.diagnostic = 'LEGEND_TITLE';
              return false;
            }
            const category = name as Category;
            const images = entry.querySelectorAll<HTMLImageElement>('img');
            if (images.length !== 1) {
              summary.diagnostic = 'LEGEND_IMAGE_MISSING';
              return false;
            }
            if (!visible(images[0]!)) {
              summary.diagnostic = 'NOT_VISIBLE';
              return false;
            }
            const refs = imageReferences(images[0]!);
            if (!refs) {
              summary.diagnostic = 'LEGEND_ICON_TYPE';
              return false;
            }
            if (crossCheck) {
              if (
                !byCategory.get(category)?.some((ref) => refs.includes(ref))
              ) {
                summary.diagnostic = 'LEGEND_ICON_TYPE';
                return false;
              }
            } else {
              if (
                refs.some(
                  (ref) => icons.has(ref) && icons.get(ref) !== category,
                )
              ) {
                summary.diagnostic = 'LEGEND_DUPLICATE_ICON';
                return false;
              }
              refs.forEach((ref) => icons.set(ref, category));
              byCategory.set(category, refs);
            }
          }
          return true;
        };
        legendKnown = inspect(entries, titleSelector);
        const controls = categoryButtons.filter(visible).slice(0, 9);
        if (legendKnown && dynamic.length && controls.length) {
          const controlNames = controls.map((entry) =>
            single(entry, '.seats-category__title').field.value?.replace(
              / stoelen$/,
              '',
            ),
          );
          if (
            scheme !== 'LUX_4' ||
            controls.length !== 4 ||
            new Set(controlNames).size !== 4
          ) {
            summary.diagnostic = 'LEGEND_COUNT';
            legendKnown = false;
          } else
            legendKnown = inspect(controls, '.seats-category__title', true);
        }
      }
      summary.categoryEvidence = legendKnown ? 'EXACT_VISIBLE_ICON' : 'UNKNOWN';
      const parsed = buttons.map((button) => {
        const match =
          /^Seat ([1-9]\d{0,2})-([1-9]\d{0,2}), (available|unavailable|picked)$/.exec(
            button.getAttribute('aria-label') ?? '',
          );
        const disabled =
          (button as HTMLButtonElement).disabled || button.matches(':disabled');
        const state = match?.[3];
        const valid =
          !!match &&
          disabled === (state === 'unavailable') &&
          !button.hasAttribute('aria-disabled');
        const column = button.getAttribute('data-column') ?? '';
        const id = button.getAttribute('data-test');
        const images = button.querySelectorAll(
          'img[data-test="seat-icon-image"]',
        );
        let category: Category | undefined;
        if (valid && state === 'available' && legendKnown) {
          const refs =
            images.length === 1 && visible(images[0]!)
              ? imageReferences(images[0] as HTMLImageElement)
              : null;
          const matches = new Set(refs?.map((ref) => icons.get(ref)));
          if (refs && matches.size === 1 && !matches.has(undefined))
            category = [...matches][0];
          else summary.diagnostic = 'SEAT_ICON_NO_MATCH';
        }
        return {
          button,
          row: Number(match?.[1]),
          seat: Number(match?.[2]),
          id,
          column: /^\d{1,3}$/.test(column) ? Number(column) : NaN,
          state: valid ? state : undefined,
          category,
        };
      });
      const ids = new Set<string>(),
        labels = new Set<string>(),
        positions = new Map<Element, Set<number>>(),
        rowLabels = new Map<Element, number>();
      let ambiguous = false;
      for (const seat of parsed) {
        const label = `${seat.row}-${seat.seat}`,
          parent = seat.button.parentElement!;
        const columns = positions.get(parent) ?? new Set<number>();
        if (Number.isFinite(seat.row)) {
          if (rowLabels.has(parent) && rowLabels.get(parent) !== seat.row)
            ambiguous = true;
          rowLabels.set(parent, seat.row);
        }
        if (
          !seat.id ||
          ids.has(seat.id) ||
          labels.has(label) ||
          !Number.isFinite(seat.column) ||
          columns.has(seat.column)
        )
          ambiguous = true;
        if (seat.id) ids.add(seat.id);
        labels.add(label);
        columns.add(seat.column);
        positions.set(parent, columns);
        if (seat.state === 'available') counts.available++;
        else if (seat.state === 'unavailable') counts.unavailable++;
        else if (seat.state === 'picked') counts.picked++;
        else counts.unknown++;
        if (seat.state === 'available' && !seat.category)
          counts.categoryUnknownAvailable++;
        if (seat.state === 'available' && seat.category === 'Ultra Lux')
          counts.ultraLuxAvailable++;
      }
      if (ambiguous || new Set(rowLabels.values()).size !== rowLabels.size) {
        summary.counts = null;
        return;
      }
      summary.reason = legendKnown ? 'NO_SAFE_PAIR' : 'LEGEND_UNKNOWN';
      if (!legendKnown) return;
      // Unlike the fictional matcher, these observations prove neither fees,
      // account eligibility nor a hold. Retain its gap/unknown/Ultra exclusions.
      type ObservedSeat = (typeof parsed)[number];
      const isSpecial = (seat: ObservedSeat) =>
        [seat.button, seat.button.parentElement!].some((node) =>
          /accessible|wheelchair|disabled|companion|special|recliner|paired|sofa/i.test(
            node.className,
          ),
        );
      // Same physical predicate for pair members AND their one-seat buffer.
      const areNeighbours = (a: ObservedSeat, b: ObservedSeat): boolean => {
        if (
          a.row !== b.row ||
          a.button.parentElement !== b.button.parentElement ||
          Math.abs(a.seat - b.seat) !== 1 ||
          Math.abs(a.column - b.column) !== 1
        )
          return false;
        // Ignore formatting whitespace only; never cross a span/comment/aisle.
        let next = a.button.nextSibling;
        while (next?.nodeType === Node.TEXT_NODE && !next.textContent?.trim())
          next = next.nextSibling;
        if (next !== b.button) return false;
        const ar = a.button.getBoundingClientRect(),
          br = b.button.getBoundingClientRect();
        // Counts-only when layout is unavailable. Reject overlap, large gaps,
        // different lines and strongly unequal cells, including reversed order.
        const left = ar.left < br.left ? ar : br,
          right = left === ar ? br : ar;
        const width = Math.min(ar.width, br.width),
          height = Math.min(ar.height, br.height);
        if (
          ![
            ar.left,
            ar.right,
            ar.top,
            ar.width,
            ar.height,
            br.left,
            br.right,
            br.top,
            br.width,
            br.height,
          ].every(Number.isFinite) ||
          width <= 0 ||
          height <= 0 ||
          Math.max(ar.width, br.width) > width * 1.25 ||
          Math.max(ar.height, br.height) > height * 1.25 ||
          Math.abs(ar.top - br.top) > height * 0.25 ||
          right.left < left.right ||
          right.left - left.right > width * 0.3
        )
          return false;
        return true;
      };
      // One eligibility check for discovery AND exact received-pair verification.
      const assessPair = (
        a: ObservedSeat,
        b: ObservedSeat,
      ): SeatSummary['pairs'][number] | null => {
        if (
          a.state !== 'available' ||
          b.state !== 'available' ||
          !a.category ||
          !b.category ||
          a.category === 'Ultra Lux' ||
          b.category === 'Ultra Lux' ||
          isSpecial(a) ||
          isSpecial(b) ||
          !areNeighbours(a, b)
        )
          return null;
        // Only the immediate outside buttons can border this DOM-adjacent pair.
        // An unclassified neighbour is conservatively unsafe, whatever its status.
        const before = parsed[parsed.indexOf(a) - 1],
          after = parsed[parsed.indexOf(b) + 1];
        if (
          (before &&
            (!before.category || isSpecial(before)) &&
            areNeighbours(before, a)) ||
          (after &&
            (!after.category || isSpecial(after)) &&
            areNeighbours(b, after))
        )
          return null;
        return {
          row: a.row,
          seats: [a.seat, b.seat],
          categories: [a.category, b.category],
        };
      };
      if (target) {
        const a = parsed.find(
          (seat) => seat.row === target.pair.row && seat.seat === target.pair.A,
        );
        const b = parsed.find(
          (seat) => seat.row === target.pair.row && seat.seat === target.pair.B,
        );
        if (!a || !b || !a.state || !b.state) return;
        if (a.state !== 'available' || b.state !== 'available') {
          result.duo = 'PAIR_UNAVAILABLE';
          return;
        }
        const pair = assessPair(a, b);
        if (
          pair &&
          pair.categories.every(
            (category, i) => category === target.pair.categories[i],
          )
        )
          result.duo = 'DUO_MATCH_POSSIBLE';
        return;
      }
      const candidates: {
        pair: SeatSummary['pairs'][number];
        same: boolean;
      }[] = [];
      for (let i = 0; i < parsed.length - 1; i++) {
        const pair = assessPair(parsed[i]!, parsed[i + 1]!);
        if (pair)
          candidates.push({
            pair,
            same: pair.categories[0] === pair.categories[1],
          });
      }
      candidates.sort((a, b) => Number(b.same) - Number(a.same));
      summary.pairs = candidates.slice(0, 3).map((candidate) => candidate.pair);
      if (summary.pairs.length) summary.reason = 'CHECK_VISUALLY';
    };
    const complete = Object.values(result.fields).every(
      (field) => field.status === 'OBSERVED_VISIBLE',
    );
    if (
      target &&
      complete &&
      Object.entries(target.showing).some(
        ([key, value]) =>
          result.fields[key as keyof PageRead['fields']].value !== value,
      )
    )
      result.duo = 'MISMATCH_SHOWING';
    else if (complete) observeSeats();
    result.reason = 'VISIBLE_METADATA';
    return result;
  }
  if (quicks.length) {
    result.screenScope = 'VISIBLE_QUICK_TICKET';
    if (quicks.length !== 1) return ambiguousContext();
    const quick = quicks[0]!;
    if (!visible(quick)) return result;
    const definitions = [
      ['cinema', 'venue', 'Kies een locatie'],
      ['movie', 'film', 'Kies een film of evenement'],
      ['date', 'date', 'Kies een datum'],
      ['time', 'time', 'Kies een tijd'],
    ] as const;
    for (const [key, category, placeholder] of definitions) {
      const containers = quick.querySelectorAll(
        `li[data-test="quick-book-${category}-selector"]`,
      );
      if (containers.length !== 1) {
        result.fields[key] =
          containers.length > 1
            ? { status: 'AMBIGUOUS', value: null }
            : unknown();
        continue;
      }
      const container = containers[0]!;
      if (!visible(container)) continue;
      const openers = container.querySelectorAll(
        'button[data-test="dropdown-opener"]',
      );
      if (openers.length !== 1) {
        result.fields[key] =
          openers.length > 1 ? { status: 'AMBIGUOUS', value: null } : unknown();
        continue;
      }
      const opener = openers[0]!;
      if (!visible(opener)) continue;
      const selected = single(opener, '.dropdown-opener__title-value').field;
      const value = selected.value;
      result.fields[key] =
        value === placeholder ||
        (value &&
          ((key === 'date' && !shortDate(value)) ||
            (key === 'time' && !validTime(value))))
          ? unknown()
          : selected;
    }
    if (
      Object.values(result.fields).some((field) => field.status !== 'UNKNOWN')
    )
      result.reason = 'VISIBLE_METADATA';
    return result;
  }
  if (location.pathname.startsWith('/kopen/')) return result;
  const mains = [...document.querySelectorAll('main')].filter(visible);
  if (mains.length !== 1) return result;
  const main = mains[0]!;
  const metadataRegions = [...main.querySelectorAll('dl')].filter(visible);
  const regions = main.querySelectorAll('h1, dl');
  if (regions.length > 16) return result;
  const values: Record<keyof PageRead['fields'], string[]> = {
    movie: [],
    cinema: [],
    date: [],
    time: [],
    hall: [],
  };
  const text = (element: Element | null) => {
    if (
      !(element instanceof HTMLElement) ||
      !visible(element) ||
      element.closest('form') ||
      element.querySelector(
        'input, select, textarea, button, a, script, style, iframe',
      ) ||
      element.querySelectorAll('*').length > 12
    )
      return null;
    const value = element.innerText.trim().replace(/\s+/g, ' ');
    return value && value.length <= 120 && !/[@<>]|https?:|\d{7}/i.test(value)
      ? value
      : null;
  };
  for (const heading of main.querySelectorAll('h1[itemprop="name"]')) {
    if (
      !heading.closest(
        '[itemscope][itemtype="https://schema.org/Movie"], [itemscope][itemtype="http://schema.org/Movie"]',
      )
    )
      continue;
    const value = text(heading);
    if (value) values.movie.push(value);
  }
  const labels: Record<string, keyof PageRead['fields']> = {
    film: 'movie',
    bioscoop: 'cinema',
    datum: 'date',
    tijd: 'time',
    aanvang: 'time',
    zaal: 'hall',
  };
  const invalid = new Set<keyof PageRead['fields']>();
  const terms = main.querySelectorAll('dl > dt');
  if (terms.length > 40) return result;
  for (const term of terms) {
    const label = text(term)?.toLowerCase().replace(/:$/, '');
    const key =
      label && Object.hasOwn(labels, label) ? labels[label] : undefined;
    if (!key || !visible(term)) continue;
    if (term.nextElementSibling?.tagName !== 'DD') {
      invalid.add(key);
      continue;
    }
    const value = text(term.nextElementSibling);
    if (!value) {
      invalid.add(key);
      continue;
    }
    if (key === 'time') {
      const times = value.match(/\b(?:[01]\d|2[0-3]):[0-5]\d\b/g);
      if (times && times.length > 1) {
        values.time.push(...times);
        continue;
      }
    }
    if (key === 'time' && !/^(?:[01]\d|2[0-3]):[0-5]\d(?: uur)?$/.test(value)) {
      invalid.add(key);
      continue;
    }
    if (key === 'date' && !validDate(value)) {
      invalid.add(key);
      continue;
    }
    values[key].push(value);
  }
  for (const key of Object.keys(values) as (keyof typeof values)[]) {
    const unique = [...new Set(values[key])];
    result.fields[key] = invalid.has(key)
      ? unknown()
      : metadataRegions.length > 1 && ['date', 'time', 'hall'].includes(key)
        ? { status: values[key].length ? 'AMBIGUOUS' : 'UNKNOWN', value: null }
        : key === 'time' && values.time.length > 1
          ? { status: 'AMBIGUOUS', value: null }
          : unique.length === 1
            ? { status: 'OBSERVED_VISIBLE', value: unique[0]! }
            : unique.length > 1
              ? { status: 'AMBIGUOUS', value: null }
              : unknown();
  }
  if (Object.values(result.fields).some((field) => field.status !== 'UNKNOWN'))
    result.reason = 'VISIBLE_METADATA';
  return result;
}

/** Only the lifetime of this action popup. No worker, retained data or retries. */
export function createPageReadSession(invalidate: () => void) {
  let revoked = false,
    reading = false;
  let target: { id: number; windowId: number; url: string } | undefined;
  const bounded = async <T>(operation: Promise<T>): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        operation,
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () =>
              reject(
                new Error(
                  'NIET BESCHIKBAAR — Chrome reageert niet. Sluit en heropen de popup.',
                ),
              ),
            4000,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  };
  const revoke = () => {
    revoked = true;
    invalidate();
  };
  const onUpdated = (id: number, change: { status?: string; url?: string }) => {
    if (
      id === target?.id &&
      (change.status === 'loading' || change.url !== undefined)
    )
      revoke();
  };
  const onActivated = (info: { windowId: number; tabId: number }) => {
    if (target && info.windowId === target.windowId && info.tabId !== target.id)
      revoke();
  };
  const unavailable = () =>
    new Error(
      'NIET BESCHIKBAAR — open een openbare Vue-voorstelling in een normaal venster en klik opnieuw op het extensie-icoon. Incognitotoegang voor dit experiment moet uit staan.',
    );
  const eligible = (
    tab: chrome.tabs.Tab | undefined,
  ): tab is chrome.tabs.Tab & { id: number; url: string } => {
    if (
      !tab?.active ||
      tab.incognito ||
      tab.id === undefined ||
      !tab.url ||
      tab.pendingUrl ||
      tab.status !== 'complete'
    )
      return false;
    try {
      return ['https://www.vuecinemas.nl', 'https://vuecinemas.nl'].includes(
        new URL(tab.url).origin,
      );
    } catch {
      return false;
    }
  };
  // getViews prevents opening popup.html as an ordinary tab from acting as a reader.
  const initialized = (async () => {
    if (
      typeof chrome === 'undefined' ||
      !chrome.extension?.getViews({ type: 'popup' }).includes(window)
    )
      return;
    // Native spanning popups can lack a provable window identity (ADR-006).
    // Refuse the entire experiment while incognito access is enabled.
    if (await bounded(chrome.extension.isAllowedIncognitoAccess())) {
      revoke();
      return;
    }
    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.onActivated.addListener(onActivated);
    const [tab] = await bounded(
      chrome.tabs.query({ active: true, currentWindow: true }),
    );
    if (eligible(tab) && !revoked)
      target = { id: tab.id, windowId: tab.windowId, url: tab.url };
    else revoke();
  })().catch(revoke);
  return {
    async read(plan?: DuoPlan): Promise<PageRead> {
      await initialized;
      if (reading || revoked || !target) throw unavailable();
      reading = true;
      try {
        const verifiedPlan =
          plan === undefined ? undefined : validateDuoPlan(plan);
        const [current] = await bounded(
          chrome.tabs.query({ active: true, currentWindow: true }),
        );
        if (
          revoked ||
          !eligible(current) ||
          current?.id !== target?.id ||
          current?.url !== target?.url
        )
          throw unavailable();
        const results = await bounded(
          chrome.scripting.executeScript({
            target: { tabId: current.id!, frameIds: [0] },
            world: 'ISOLATED',
            func: readVisibleVuePage,
            args: verifiedPlan ? [verifiedPlan] : [],
          }),
        );
        const [after] = await bounded(
          chrome.tabs.query({ active: true, currentWindow: true }),
        );
        if (
          revoked ||
          !eligible(after) ||
          after?.id !== current.id ||
          after?.url !== current.url ||
          results.length !== 1 ||
          results[0]?.frameId !== 0 ||
          !results[0]?.documentId
        )
          throw unavailable();
        const result = resultSchema.parse(results[0].result);
        if (verifiedPlan) {
          validateDuoPlan(verifiedPlan);
          if (result.duo === undefined || result.seats !== undefined)
            throw unavailable();
        }
        if (
          Date.now() < result.observedAt ||
          Date.now() - result.observedAt > 4000
        )
          throw unavailable();
        return result;
      } catch {
        throw unavailable();
      } finally {
        reading = false;
      }
    },
    dispose() {
      revoke();
      if (typeof chrome !== 'undefined') {
        chrome.tabs?.onUpdated.removeListener(onUpdated);
        chrome.tabs?.onActivated.removeListener(onActivated);
      }
      target = undefined;
    },
  };
}
