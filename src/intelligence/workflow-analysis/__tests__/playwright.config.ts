import { defineConfig } from '@playwright/test';
import baseConfig from '../../../../playwright.config';

export default defineConfig({
  ...baseConfig,
  testDir: '.',
  // Disable global setup and teardown as these are pure in-memory unit tests
  globalSetup: undefined,
  globalTeardown: undefined,
  // Define a single project with no browser configuration to prevent launching browser processes
  projects: [
    {
      name: 'cognition-unit',
      use: {} // Pure Node-based harness with zero browser processes launched
    }
  ],
  // Use a simple console reporter to prevent HTML/JUnit artifact generation
  reporter: [['list']]
});
