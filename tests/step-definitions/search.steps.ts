import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../world/customWorld';

When('the user searches for a product', async function (this: CustomWorld) {
  this.searchResultsPage = await this.homePage.searchProduct(this.testData.product.searchKeyword);
});

Then('search results should be displayed', async function (this: CustomWorld) {
  await expect(this.page).toHaveURL(/search/i);
  expect(await this.searchResultsPage.getProductItems().count()).toBeGreaterThan(0);
});
