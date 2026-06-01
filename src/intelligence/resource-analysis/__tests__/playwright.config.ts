import { defineConfig } from '@playwright/test';
import baseConfig from '../../../../playwright.config';

export default defineConfig({
  ...baseConfig,
  testDir: '.',
  globalSetup: undefined,
  globalTeardown: undefined,
  projects: [
    {
      name: 'resource-unit',
      use: {} // Pure Node-based harness
    }
  ],
  reporter: [['list']]
});
