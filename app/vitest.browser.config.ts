import { defineConfig } from 'vitest/config';

// Real Chromium checks of the built files; run with `npm run test:browser`.
export default defineConfig({
  test: { include: ['tests/browser/**/*.test.ts'], environment: 'node', testTimeout: 60_000, hookTimeout: 60_000 },
});
