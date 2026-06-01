import { defineConfig } from '@playwright/test';
import baseConfig from '../../../../playwright.config';

export default defineConfig({
  ...baseConfig,
  testDir: '.',
  globalSetup: undefined,
  globalTeardown: undefined,
  projects: [
    {
      name: 'runtime-unit',
      use: {}
    }
  ],
  reporter: [['list']]
});
