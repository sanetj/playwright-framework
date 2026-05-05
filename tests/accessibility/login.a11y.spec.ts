import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../../fixtures';

test('login accessibility', async ({ page }) => {
  await page.goto('/login');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
