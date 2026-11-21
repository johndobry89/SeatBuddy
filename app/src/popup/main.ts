import { readActiveTab } from './browser';
import { mount } from './ui';

// Vue's login entry, checked by the owner on 2026-11-21. If Vue changes it,
// the user simply lands on the homepage flow; nothing else depends on it.
const VUE_LOGIN = 'https://www.vuecinemas.nl/?redirect=%2Fmijn-account';

mount(
  document.getElementById('app')!,
  {
    read: () => readActiveTab(),
    copy: (text) => navigator.clipboard.writeText(text),
    now: () => Date.now(),
    readClipboard: () => navigator.clipboard.readText(),
    openIncognito: async () => {
      await chrome.windows.create({ url: VUE_LOGIN, incognito: true });
    },
    isIncognito: async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab?.incognito ?? false;
    },
  },
  { autoStart: true },
);
