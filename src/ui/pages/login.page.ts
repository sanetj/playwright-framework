import { Locator, Page } from '@playwright/test';
import { BasePage } from '@core/base/base.page';
import HomePage from '@ui/pages/home.page';
import RegisterPage from '@ui/pages/register.page';

export default class LoginPage extends BasePage {
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;
  private readonly registerLink: Locator;

  constructor(page: Page) {
    super(page, 'LoginPage');
    this.emailInput = this.page.getByLabel('Email:');
    this.passwordInput = this.page.getByLabel('Password:');
    this.loginButton = this.page.getByRole('button', { name: 'Log in' });
    this.registerLink = this.page.getByRole('button', { name: 'Register' });
  }

  async login(email: string, password: string): Promise<HomePage> {
    await this.fill(this.emailInput, email, 'Login email input');
    await this.fill(this.passwordInput, password, 'Login password input');
    await this.click(this.loginButton, 'Login submit button');
    await this.page.waitForLoadState('domcontentloaded');
    return new HomePage(this.page);
  }

  async navigateToRegister(): Promise<RegisterPage> {
    await this.click(this.registerLink, 'Register navigation button');
    await this.page.waitForURL(/register/i);
    return new RegisterPage(this.page);
  }
}
