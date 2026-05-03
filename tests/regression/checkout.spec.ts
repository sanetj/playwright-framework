import { test, expect } from '../../fixtures';

test.describe('Regression - Checkout @regression', () => {
  test('should complete checkout successfully @regression', async ({ page, homePage, cartPage, checkoutPage, headerComponent, testData }) => {
    // Arrange
    await homePage.navigateToHome();
    const resultsPage = await homePage.searchProduct(testData.product.searchKeyword);
    const productPage = await resultsPage.openProduct(testData.product.searchKeyword);
    await productPage.addToCart();
    await headerComponent.openCart();

    // Act
    await cartPage.proceedToCheckout();
    await checkoutPage.fillBillingDetails({
      firstName: testData.user.firstName ?? 'QA',
      lastName: testData.user.lastName ?? 'User',
      email: testData.user.email,
      country: 'United States',
      city: 'Austin',
      address1: '500 Congress Ave',
      zipPostalCode: '78701',
      phoneNumber: '5551234567'
    });
    await checkoutPage.selectShippingMethod('Ground');
    await checkoutPage.placeOrder();

    // Assert
    await expect(page).toHaveURL(/checkout\/completed/i);
    await expect(page.getByText('Your order has been successfully processed!')).toBeVisible();
  });
});
