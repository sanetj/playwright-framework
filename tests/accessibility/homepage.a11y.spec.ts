import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../../fixtures';
import { isFeatureEnabled } from '../../src/config/feature-flags';

test('homepage accessibility', async ({ page }) => {
  test.skip(!isFeatureEnabled('accessibilityTesting'), 'Accessibility testing is disabled by feature flag.');
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
