import type { DuoPlan } from '../../src/experiment/duo-plan';
import { JSDOM } from 'jsdom';
import {
  readVisibleVuePage,
  type PageRead,
} from '../../src/experiment/vue-page-reader';

export function extract(
  html: string,
  url = 'https://www.vuecinemas.nl/public-fixture',
  prepare?: (document: Document) => void,
  target?: DuoPlan,
): PageRead {
  const dom = new JSDOM(html, { url, runScripts: 'outside-only' });
  const { window } = dom;
  // DOM-layout doubles only; actual visibility/serialization is separately tested in Chrome.
  Object.defineProperty(window.HTMLElement.prototype, 'checkVisibility', {
    value() {
      return !this.closest('[hidden], [style="display:none"]');
    },
  });
  Object.defineProperty(window.HTMLElement.prototype, 'getClientRects', {
    value() {
      return [{}];
    },
  });
  Object.defineProperty(window.HTMLElement.prototype, 'innerText', {
    get() {
      return this.textContent;
    },
  });
  Object.defineProperty(window.HTMLInputElement.prototype, 'value', {
    get() {
      throw new Error('Input must never be read');
    },
  });
  // Trap accidental reads of menus, CTA URLs and checkout contents.
  for (const node of window.document.querySelectorAll(
    '.checkout, [role="listbox"]',
  )) {
    Object.defineProperty(node, 'textContent', {
      get() {
        throw new Error('Private/unselected text accessed');
      },
    });
    Object.defineProperty(node, 'innerText', {
      get() {
        throw new Error('Private/unselected text accessed');
      },
    });
  }
  for (const node of window.document.querySelectorAll(
    '[data-test="quick-book-cta"]',
  )) {
    Object.defineProperty(node, 'href', {
      get() {
        throw new Error('CTA URL accessed');
      },
    });
    const original = node.getAttribute.bind(node);
    node.getAttribute = (name) => {
      if (name === 'href') throw new Error('CTA URL accessed');
      return original(name);
    };
  }
  try {
    prepare?.(window.document);
    return window.eval(
      `(${readVisibleVuePage.toString()})(${JSON.stringify(target)})`,
    ) as PageRead;
  } finally {
    window.close();
  }
}
