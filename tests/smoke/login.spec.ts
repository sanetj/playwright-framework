import { test, expect } from '../../fixtures';

test.describe('Smoke - Authentication @smoke', () => {
  test('should allow valid user login @smoke', async ({ page, homePage, loginPage, testData }) => {
    // Arrange
    await homePage.navigateToHome();

    // Act
    await homePage.openLogin();
    await loginPage.login(testData.user.email, testData.user.password);

    // Assert
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('link', { name: 'Log out' })).toBeVisible();
  });
});
