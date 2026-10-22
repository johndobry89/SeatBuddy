import {
  readOnlyObservationSchema,
  freshness,
  type ReadOnlyObservation,
  type ObservationProvenance,
} from './contract';

export type FixtureScope =
  | {
      kind: 'PACKAGED';
      extensionId: string;
      world: 'ISOLATED' | 'PACKAGED_PAGE';
      permitted: boolean;
    }
  | { kind: 'LOCAL_PREVIEW'; world: 'LOCAL_PREVIEW'; permitted: boolean };

/** Visibility port: native default requires layout. Unit DOM tests supply their own explicit double. */
export type Visibility = (element: Element) => boolean;
export function visiblyRendered(element: Element): boolean {
  const document = element.ownerDocument;
  const view = document.defaultView;
  if (!view || document.visibilityState !== 'visible') return false;
  for (let node: Element | null = element; node; node = node.parentElement) {
    const style = view.getComputedStyle(node);
    if (
      node.hasAttribute('hidden') ||
      node.hasAttribute('inert') ||
      node.getAttribute('aria-hidden') === 'true' ||
      style.display === 'none' ||
      style.visibility !== 'visible' ||
      style.contentVisibility === 'hidden' ||
      Number(style.opacity) === 0
    )
      return false;
  }
  return Array.from(element.getClientRects()).some(
    (rect) => rect.width > 0 && rect.height > 0,
  );
}

/** Only our exact packaged test document (or exact local renderer preview); never a Vue origin.
 * Scope/world are host assertions, NOT authentication for a future production content script.
 * No page globals, events, fetch/XHR patches, cookies, storage, click or DOM writes.
 */
export function createFixtureReader(
  document: Document,
  scope: FixtureScope,
  visible: Visibility = visiblyRendered,
) {
  const originalUrl = document.URL;
  let dirty = false;
  let disposed = false;
  let last: ReadOnlyObservation | null = null;
  let observedRoot: Element | null = null;
  function relevant(records: MutationRecord[]): boolean {
    if (!observedRoot) return records.length > 0;
    const root = observedRoot;
    return records.some(
      (record) =>
        root.contains(record.target) ||
        (record.type === 'attributes' && record.target.contains(root)) ||
        [...record.addedNodes, ...record.removedNodes].some((node) =>
          node.contains(root),
        ),
    );
  }
  const observer = document.defaultView
    ? new document.defaultView.MutationObserver((records) => {
        if (relevant(records)) dirty = true;
      })
    : null;
  observer?.observe(document, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
  });
  const onPageHide = () => {
    disposed = true;
    last = null;
  };
  document.defaultView?.addEventListener('pagehide', onPageHide);
  const unknown = (
    code: ReadOnlyObservation['compatibility'],
    now: number,
  ): ReadOnlyObservation => ({
    kind: 'FICTIONAL_READ_ONLY',
    status: 'UNKNOWN',
    provenance: {
      source: 'PACKAGED_FICTION',
      world: scope.world,
      observedAt: now,
    },
    compatibility: code,
    screening: null,
    seatDisplay: null,
  });
  function gate(): ReadOnlyObservation['compatibility'] | null {
    if (disposed) return 'DISPOSED';
    if (!observer) return 'WRONG_SCOPE';
    if (!scope.permitted) return 'PERMISSION_UNKNOWN';
    if (document.URL !== originalUrl) return 'DOCUMENT_CHANGED';
    const expected =
      scope.kind === 'PACKAGED' && /^[a-p]{32}$/.test(scope.extensionId)
        ? `chrome-extension://${scope.extensionId}/fixture.html`
        : scope.kind === 'LOCAL_PREVIEW'
          ? 'http://127.0.0.1:4173/fixture.html'
          : null;
    if (
      document.URL !== expected ||
      document.defaultView?.top !== document.defaultView
    )
      return 'WRONG_SCOPE';
    return null;
  }
  function parse(now: number): ReadOnlyObservation {
    const denied = gate();
    if (denied) return unknown(denied, now);
    const roots = document.querySelectorAll('[data-sb-readonly]');
    if (roots.length !== 1) return unknown('AMBIGUOUS', now);
    const root = roots[0]!;
    observedRoot = root;
    if (root.getAttribute('data-sb-readonly') !== '1')
      return unknown('DOM_CHANGED', now);
    if (!visible(root)) return unknown('HIDDEN', now);
    if (root.hasAttribute('data-server-error'))
      return unknown('SERVER_UNAVAILABLE', now);
    if (
      root.querySelector('canvas') ||
      root.getAttribute('data-representation') !== 'semantic'
    )
      return unknown('CANVAS', now);
    const screening: Record<string, string | null> = {};
    for (const field of ['movie', 'cinema', 'date', 'time', 'hall']) {
      const nodes = root.querySelectorAll(`[data-field="${field}"]`);
      if (nodes.length > 1) return unknown('AMBIGUOUS', now);
      const node = nodes[0];
      if (node && !visible(node)) return unknown('HIDDEN', now);
      if (node?.children.length) return unknown('INVALID_DATA', now);
      screening[field] = node?.textContent?.trim() || null;
    }
    const seats = root.querySelectorAll('[data-seat-label]');
    if (seats.length > 2) return unknown('AMBIGUOUS', now);
    const labels: string[] = [];
    for (const seat of seats) {
      if (!visible(seat)) return unknown('HIDDEN', now);
      if (seat.children.length) return unknown('INVALID_DATA', now);
      labels.push(seat.textContent?.trim() ?? '');
    }
    if (new Set(labels).size !== labels.length)
      return unknown('AMBIGUOUS', now);
    const result = readOnlyObservationSchema.safeParse({
      ...unknown('READABLE_FICTION', now),
      screening,
      seatDisplay: labels.length
        ? {
            labels,
            geometry: 'UNKNOWN',
            availability: 'UNKNOWN',
            relationship: 'LABELS_ONLY_UNVERIFIED',
          }
        : null,
      compatibility: Object.values(screening).some((value) => value === null)
        ? 'MISSING_FIELDS'
        : 'READABLE_FICTION',
    });
    return result.success ? result.data : unknown('INVALID_DATA', now);
  }
  function safeParse(now: number): ReadOnlyObservation {
    if (!Number.isSafeInteger(now) || now < 0)
      return unknown('INVALID_DATA', 0);
    try {
      return parse(now);
    } catch {
      return unknown('INVALID_DATA', now);
    } // No raw DOM/error content escapes this boundary.
  }
  return {
    read(now: number): ReadOnlyObservation {
      observer?.takeRecords();
      dirty = false;
      last = safeParse(now);
      return structuredClone(last);
    },
    current(now: number): ReadOnlyObservation {
      if (relevant(observer?.takeRecords() ?? [])) dirty = true;
      const denied = gate();
      if (denied || dirty || !last || freshness(last, now) !== 'FRESH') {
        last = null;
        return unknown(denied ?? (dirty ? 'DOM_CHANGED' : 'STALE'), now);
      }
      // CSS/lifecycle changes need not emit a DOM mutation: recheck all visible fields.
      const checked = safeParse(now);
      if (
        checked.compatibility !== last.compatibility ||
        !visiblyUnchanged(checked, last)
      ) {
        last = null;
        return unknown(
          checked.compatibility === 'READABLE_FICTION'
            ? 'DOM_CHANGED'
            : checked.compatibility,
          now,
        );
      }
      return structuredClone(last);
    },
    dispose() {
      disposed = true;
      last = null;
      observer?.disconnect();
      document.defaultView?.removeEventListener('pagehide', onPageHide);
    },
  };
}
function visiblyUnchanged(a: ReadOnlyObservation, b: ReadOnlyObservation) {
  return (
    JSON.stringify([a.screening, a.seatDisplay]) ===
    JSON.stringify([b.screening, b.seatDisplay])
  );
}
export type FixtureReader = ReturnType<typeof createFixtureReader>;
export type { ObservationProvenance };
