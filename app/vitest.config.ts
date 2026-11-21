import { defineConfig } from 'vitest/config';

// Real-browser checks live in tests/browser and run via `npm run test:browser`.
export default defineConfig({
  test: { include: ['tests/*.test.ts'], environment: 'node' },
});
