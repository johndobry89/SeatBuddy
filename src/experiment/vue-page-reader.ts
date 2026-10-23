import { z } from 'zod';

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
const resultSchema = z.strictObject({
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
  fields: z.strictObject({
    movie: fieldSchema,
    cinema: fieldSchema,
    date: fieldSchema,
    time: fieldSchema,
    hall: fieldSchema,
  }),
});
export type PageRead = z.infer<typeof resultSchema>;

/** Serialized by Chrome: deliberately self-contained, no imported closures.
 * Vue selectors are issue #31's sanitised snapshot evidence, not a live guarantee. */
export function readVisibleVuePage(): PageRead {
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
    if (hall.field.value && !/^Zaal [1-9]\d?$/.test(hall.field.value))
      result.fields.hall = unknown();
    // Explicitly allowlisted hall heading only; never read the seat grid.
    const screenNodes = [
      ...document.querySelectorAll('[data-test="screen-title"]'),
    ].filter(visible);
    if (result.fields.hall.value && screenNodes.length) {
      if (
        screenNodes.length !== 1 ||
        display(screenNodes[0]!) !== result.fields.hall.value
      )
        result.fields.hall = { status: 'AMBIGUOUS', value: null };
    }
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
    async read(): Promise<PageRead> {
      await initialized;
      if (reading || revoked || !target) throw unavailable();
      reading = true;
      try {
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
