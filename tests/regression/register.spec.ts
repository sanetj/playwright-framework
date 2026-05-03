import { test, expect } from '../../fixtures';

test.describe('Regression - Registration @regression', () => {
  test('should register new user successfully @regression', async ({ page, homePage, registerPage, testData }) => {
    // Arrange
    const uniqueEmail = testData.user.email.replace('@', `+reg${Date.now()}@`);
    await homePage.navigateToHome();

    // Act
    await page.goto('/register', { waitUntil: 'domcontentloaded' });
    await registerPage.registerNewUser({
      firstName: testData.user.firstName ?? 'QA',
      lastName: testData.user.lastName ?? 'User',
      email: uniqueEmail,
      password: testData.user.password,
      confirmPassword: testData.user.password
    });

    // Assert
    await expect(page).toHaveURL(/registerresult/i);
    await expect(page.getByText('Your registration completed')).toBeVisible();
  });
});
