import { test, expect } from '../../fixtures';

test.describe('Sanity - Navigation and Search @sanity', () => {
  test('should verify login page opens @sanity', async ({ page, homePage }) => {
    // Arrange
    await homePage.navigateToHome();

    // Act
    await homePage.openLogin();

    // Assert
    await expect(page).toHaveURL(/login/i);
    await expect(page.getByRole('heading', { name: 'Welcome, Please Sign In!' })).toBeVisible();
  });

  test('should verify search returns results @sanity', async ({ page, homePage, testData }) => {
    // Arrange
    await homePage.navigateToHome();

    // Act
    await homePage.searchProduct(testData.product.searchKeyword);

    // Assert
    await expect(page).toHaveURL(/search/i);
    expect(await page.locator('.product-item').count()).toBeGreaterThan(0);
  });
});
