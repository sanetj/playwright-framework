import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from '../world/customWorld';

Given('the user opens the home page', async function (this: CustomWorld) { await this.homePage.navigateToHome(); });
When('the user navigates to login', async function (this: CustomWorld) { await this.homePage.openLogin(); });
When('the user logs in with valid credentials', async function (this: CustomWorld) { await this.authService.loginUser(this.testData.user.email, this.testData.user.password); });
Then('the user should be logged in', async function (this: CustomWorld) { await expect(this.page.getByRole('link', { name: 'Log out' })).toBeVisible(); });
Then('the login page should be displayed', async function (this: CustomWorld) { await expect(this.page).toHaveURL(/login/i); });
Then('the home page should be displayed', async function (this: CustomWorld) { await expect(this.page.getByRole('link', { name: 'Tricentis Demo Web Shop' })).toBeVisible(); });
