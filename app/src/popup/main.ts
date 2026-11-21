import { readActiveTab } from './browser';
import { mount } from './ui';

mount(document.getElementById('app')!, {
  read: () => readActiveTab(),
  copy: (text) => navigator.clipboard.writeText(text),
  now: () => Date.now(),
});
