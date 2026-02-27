import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3001',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'authenticated',
      testMatch: /\.(spec|test)\.ts$/,
      testIgnore: /auth\.spec\.ts/,
      dependencies: ['setup'],
      use: { storageState: 'e2e/.auth/session.json' },
    },
    {
      name: 'public',
      testMatch: /auth\.spec\.ts$/,
    },
  ],
})
