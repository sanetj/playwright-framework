import { test, expect } from '../../fixtures';
import { isFeatureEnabled } from '../../src/config/feature-flags';

test.describe('Visual - Homepage', () => {
  test.skip(!isFeatureEnabled('visualTesting'), 'Visual testing is disabled by feature flag.');
  test('homepage snapshot', async ({ page }) => { await page.goto('/'); await expect(page).toHaveScreenshot('homepage.png'); });
});
