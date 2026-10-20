import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/integration',
  workers: 1,
  fullyParallel: false,
  reporter: 'list',
  timeout: 30_000,
  use: { trace: 'retain-on-failure' },
  projects: [
    { name: 'extension', testMatch: 'extension.spec.ts' },
    { name: 'ui', testMatch: 'ui.spec.ts' },
  ],
  webServer: {
    command:
      'npm exec vite preview -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/sidepanel.html',
    reuseExistingServer: false,
  },
});
