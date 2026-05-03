import { defineConfig, devices } from '@playwright/test';
import { env } from './config/env.config';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? env.retries : 0,
  workers: process.env.CI ? 2 : env.workers,
  timeout: env.defaultTimeoutMs,
  expect: {
    timeout: env.expectTimeoutMs
  },
  globalSetup: require.resolve('./global/global-setup'),
  globalTeardown: require.resolve('./global/global-teardown'),
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['junit', { outputFile: 'reports/junit/results.xml' }],
    ['json', { outputFile: 'reports/json/results.json' }]
  ],
  use: {
    baseURL: env.appBaseUrl,
    trace: env.traceMode,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: env.headless,
    actionTimeout: 15_000,
    navigationTimeout: 30_000
  },
  outputDir: 'artifacts/test-results',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    {
      name: 'api',
      testMatch: /.*api.*\.spec\.ts/,
      use: {
        baseURL: env.apiBaseUrl
      }
    }
  ]
});
