import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../world/customWorld';

Given('the user opens the first searched product', async function (this: CustomWorld) {
  this.productPage = await this.searchResultsPage.openProduct(this.testData.product.searchKeyword);
});
When('the user adds the product to cart', async function (this: CustomWorld) { await this.productService.addProductToCart(); });
When('the user opens the cart', async function (this: CustomWorld) { await this.headerComponent.openCart(); });
When('the user updates cart quantity to {int}', async function (this: CustomWorld, quantity: number) { await this.cartService.updateProductQuantity(this.testData.product.searchKeyword, quantity); });
When('the user removes the searched product from cart', async function (this: CustomWorld) { await this.cartService.removeProductFromCart(this.testData.product.searchKeyword); });
Then('the cart should contain the searched product', async function (this: CustomWorld) { await expect(this.cartPage.getProductLink(this.testData.product.searchKeyword)).toBeVisible(); });
Then('the cart item quantity should be {int}', async function (this: CustomWorld, quantity: number) { await expect(this.cartPage.getProductQuantityInput(this.testData.product.searchKeyword)).toHaveValue(String(quantity)); });
Then('the cart should not contain the searched product', async function (this: CustomWorld) { await expect(this.cartPage.getProductLink(this.testData.product.searchKeyword)).toHaveCount(0); });
