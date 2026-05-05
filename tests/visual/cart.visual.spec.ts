import { test, expect } from '../../fixtures';
import { isFeatureEnabled } from '../../src/config/feature-flags';

test.describe('Visual - Cart', () => {
  test.skip(!isFeatureEnabled('visualTesting'), 'Visual testing is disabled by feature flag.');
  test('cart page snapshot', async ({ page }) => { await page.goto('/cart'); await expect(page).toHaveScreenshot('cart-page.png'); });
});
