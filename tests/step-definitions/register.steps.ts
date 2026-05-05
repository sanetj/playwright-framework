import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../world/customWorld';
import { UserFactory } from '../../src/data/factories/user.factory';

When('the user registers a new unique user', async function (this: CustomWorld) {
  const user = UserFactory.create({ password: this.testData.user.password });
  await this.registerPage.navigateToRegister();
  await this.authService.registerUser({ firstName: user.firstName, lastName: user.lastName, email: user.email, password: user.password });
});
Then('the registration completion page should be shown', async function (this: CustomWorld) { await expect(this.page).toHaveURL(/registerresult/i); });
