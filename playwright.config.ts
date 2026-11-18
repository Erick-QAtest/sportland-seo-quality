import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';

const isCI = Boolean(process.env.CI);

const unitTestPattern = /.*\.unit\.spec\.ts/;
const setupTestPattern = /.*\.setup\.ts/;

const nonBrowserTests = [
  unitTestPattern,
  setupTestPattern,
];

const marketState = path.join(
  __dirname,
  'playwright/.auth/mexico.json'
);

export default defineConfig({
  testDir: './tests',

  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,

  reporter: [
    ['html', { open: 'never' }],
  ],

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
      name: 'unit',
      testMatch: unitTestPattern,
    },
    {
      name: 'setup-market',
      testMatch: setupTestPattern,
      dependencies: ['unit'],
    },
    {
      name: 'chromium',
      testIgnore: nonBrowserTests,
      use: {
        ...devices['Desktop Chrome'],
        storageState: marketState,
      },
      dependencies: ['setup-market'],
    },
    {
      name: 'firefox',
      testIgnore: nonBrowserTests,
      use: {
        ...devices['Desktop Firefox'],
        storageState: marketState,
      },
      dependencies: ['setup-market'],
    },
    {
      name: 'webkit',
      testIgnore: nonBrowserTests,
      use: {
        ...devices['Desktop Safari'],
        storageState: marketState,
      },
      dependencies: ['setup-market'],
    },
  ],
});