import { observe } from './vue-adapter';

/**
 * Injected with chrome.scripting into the ISOLATED world of the top frame only
 * after the user clicked. It only defines a function in the extension's own
 * isolated global scope (invisible to the page); the popup calls it in a
 * second injection and validates the returned plain data.
 */
(globalThis as { __seatbuddiesObserve?: () => unknown }).__seatbuddiesObserve = () =>
  observe({ document, location, top: window === window.top });
