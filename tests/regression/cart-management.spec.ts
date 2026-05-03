import { test, expect } from '../../fixtures';

test.describe('Regression - Cart Management @regression', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.navigateToHome();
  });

  test('should add multiple products to cart @regression', async ({ page, homePage, headerComponent, testData }) => {
    // Arrange
    const firstQuantity = 2;

    // Act
    const resultsPage = await homePage.searchProduct(testData.product.searchKeyword);
    const productPage = await resultsPage.openProduct(testData.product.searchKeyword);
    await productPage.selectQuantity(firstQuantity);
    await productPage.addToCart();
    await headerComponent.openCart();

    // Assert
    await expect(page.locator('.cart-qty')).toContainText(/[1-9]/);
    await expect(page.getByRole('link', { name: testData.product.searchKeyword, exact: true })).toBeVisible();
  });

  test('should update cart quantity @regression', async ({ page, homePage, cartPage, headerComponent, testData }) => {
    // Arrange
    const updatedQuantity = 3;
    const resultsPage = await homePage.searchProduct(testData.product.searchKeyword);
    const productPage = await resultsPage.openProduct(testData.product.searchKeyword);
    await productPage.addToCart();
    await headerComponent.openCart();

    // Act
    await cartPage.updateQuantity(testData.product.searchKeyword, updatedQuantity);

    // Assert
    await expect(
      page.locator('tr', { has: page.getByRole('link', { name: testData.product.searchKeyword, exact: true }) }).locator('input.qty-input')
    ).toHaveValue(String(updatedQuantity));
  });

  test('should remove item from cart @regression', async ({ page, homePage, cartPage, headerComponent, testData }) => {
    // Arrange
    const resultsPage = await homePage.searchProduct(testData.product.searchKeyword);
    const productPage = await resultsPage.openProduct(testData.product.searchKeyword);
    await productPage.addToCart();
    await headerComponent.openCart();

    // Act
    await cartPage.removeItem(testData.product.searchKeyword);

    // Assert
    await expect(page.getByRole('link', { name: testData.product.searchKeyword, exact: true })).toHaveCount(0);
  });
});
