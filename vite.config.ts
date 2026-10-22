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
      preserveEntrySignatures: 'strict',
      input: {
        sidepanel: resolve(import.meta.dirname, 'sidepanel.html'),
        popup: resolve(import.meta.dirname, 'popup.html'),
        fixture: resolve(import.meta.dirname, 'fixture.html'),
        'fixture-reader': resolve(
          import.meta.dirname,
          'src/fixtures/reader-entry.ts',
        ),
        background: resolve(import.meta.dirname, 'src/background/index.ts'),
      },
      output: { entryFileNames: '[name].js' },
    },
  },
});
