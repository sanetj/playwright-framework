import { test, expect } from '../../fixtures';

test.describe('Smoke - Search @smoke', () => {
  test('should search for a product successfully @smoke', async ({ page, homePage, testData }) => {
    // Arrange
    await homePage.navigateToHome();

    // Act
    await homePage.searchProduct(testData.product.searchKeyword);

    // Assert
    await expect(page).toHaveURL(/search/i);
    expect(await page.locator('.product-item').count()).toBeGreaterThan(0);
  });
});
