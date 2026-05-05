import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../world/customWorld';

When('the user places an order', async function (this: CustomWorld) {
  await this.cartPage.proceedToCheckout();
  await this.checkoutService.placeOrder({
    firstName: this.testData.user.firstName,
    lastName: this.testData.user.lastName,
    email: this.testData.user.email,
    country: 'United States',
    city: 'Austin',
    address1: '500 Congress Ave',
    zipPostalCode: '78701',
    phoneNumber: '5551234567'
  });
});
Then('the order completion page should be shown', async function (this: CustomWorld) { await expect(this.page).toHaveURL(/checkout\/completed/i); });
