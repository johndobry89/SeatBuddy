import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { runtimeNotices } from './scripts/runtime-notices.ts';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [vue(), runtimeNotices()],
  base: './',
  build: {
    target: 'chrome116',
    modulePreload: { polyfill: false }, // Chrome 116 supports local modulepreload natively; no fetch shim.
    rollupOptions: {
      input: {
        sidepanel: resolve(import.meta.dirname, 'sidepanel.html'),
        popup: resolve(import.meta.dirname, 'popup.html'),
        fixture: resolve(import.meta.dirname, 'fixture.html'),
        background: resolve(import.meta.dirname, 'src/background/index.ts'),
      },
      output: { entryFileNames: '[name].js' },
    },
  },
});
