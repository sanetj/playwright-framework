import { test, expect } from '../../fixtures';

test.describe('Smoke - Cart @smoke', () => {
  test('should add product to cart successfully @smoke', async ({ page, homePage, headerComponent, testData }) => {
    // Arrange
    await homePage.navigateToHome();

    // Act
    const resultsPage = await homePage.searchProduct(testData.product.searchKeyword);
    const productPage = await resultsPage.openProduct(testData.product.searchKeyword);
    await productPage.addToCart();
    await headerComponent.openCart();

    // Assert
    await expect(page).toHaveURL(/cart/i);
    await expect(page.locator('.cart-qty')).toContainText(/[1-9]/);
    await expect(page.getByRole('link', { name: testData.product.searchKeyword, exact: true })).toBeVisible();
  });
});
