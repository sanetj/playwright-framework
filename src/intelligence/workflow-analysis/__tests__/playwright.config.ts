import { defineConfig } from '@playwright/test';
import baseConfig from '../../../../playwright.config';

export default defineConfig({
  ...baseConfig,
  testDir: '.',
  // Disable global setup and teardown as these are pure in-memory unit tests
  globalSetup: undefined,
  globalTeardown: undefined,
  // Use a simpler reporter for concise output
  reporter: [['list']]
});
