import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../../fixtures';

test('cart accessibility', async ({ page }) => {
  await page.goto('/cart');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
