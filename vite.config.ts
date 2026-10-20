import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    target: 'chrome116',
    rollupOptions: {
      input: {
        sidepanel: resolve(import.meta.dirname, 'sidepanel.html'),
        fixture: resolve(import.meta.dirname, 'fixture.html'),
        background: resolve(import.meta.dirname, 'src/background/index.ts'),
      },
      output: { entryFileNames: '[name].js' },
    },
  },
});
