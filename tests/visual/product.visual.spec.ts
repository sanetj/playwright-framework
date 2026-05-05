import { test, expect } from '../../fixtures';
import { isFeatureEnabled } from '../../src/config/feature-flags';

test.describe('Visual - Product', () => {
  test.skip(!isFeatureEnabled('visualTesting'), 'Visual testing is disabled by feature flag.');
  test('product page snapshot', async ({ page }) => { await page.goto('/product/1'); await expect(page).toHaveScreenshot('product-page.png'); });
});
