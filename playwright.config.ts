import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const marketState = path.join(
  __dirname,
  'playwright/.auth/mexico.json'
);

export default defineConfig({
  testDir: './tests',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'https://sportlandmx.com',
    locale: 'es-MX',
    timezoneId: 'America/Mexico_City',
    extraHTTPHeaders: {
      'Accept-Language': 'es-MX,es;q=0.9',
    },
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'setup-market',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: marketState,
      },
      dependencies: ['setup-market'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: marketState,
      },
      dependencies: ['setup-market'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: marketState,
      },
      dependencies: ['setup-market'],
    },
  ],
});