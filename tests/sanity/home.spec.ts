import { test, expect } from '../../fixtures';

test.describe('Sanity - Home @sanity', () => {
  test('should verify home page loads @sanity', async ({ page, homePage }) => {
    // Arrange & Act
    await homePage.navigateToHome();

    // Assert
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('link', { name: 'Tricentis Demo Web Shop' })).toBeVisible();
  });
});
