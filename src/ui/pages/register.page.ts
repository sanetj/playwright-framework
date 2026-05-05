import { Locator, Page } from '@playwright/test';
import { BasePage } from '@core/base/base.page';
import HomePage from '@ui/pages/home.page';

type RegistrationDetails = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  gender?: 'male' | 'female';
};

export default class RegisterPage extends BasePage {
  private readonly maleGenderRadio: Locator;
  private readonly femaleGenderRadio: Locator;
  private readonly firstNameInput: Locator;
  private readonly lastNameInput: Locator;
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly confirmPasswordInput: Locator;
  private readonly registerButton: Locator;

  constructor(page: Page) {
    super(page, 'RegisterPage');
    this.maleGenderRadio = this.page.getByRole('radio', { name: 'Male' });
    this.femaleGenderRadio = this.page.getByRole('radio', { name: 'Female' });
    this.firstNameInput = this.page.getByLabel('First name:');
    this.lastNameInput = this.page.getByLabel('Last name:');
    this.emailInput = this.page.getByLabel('Email:');
    this.passwordInput = this.page.getByLabel('Password:');
    this.confirmPasswordInput = this.page.getByLabel('Confirm password:');
    this.registerButton = this.page.getByRole('button', { name: 'Register' });
  }

  async navigateToRegister(): Promise<RegisterPage> {
    await this.page.goto('/register', { waitUntil: 'domcontentloaded' });
    return this;
  }

  async registerNewUser(details: RegistrationDetails): Promise<HomePage> {
    if (details.gender === 'female') {
      await this.click(this.femaleGenderRadio, 'Female gender radio');
    } else {
      await this.click(this.maleGenderRadio, 'Male gender radio');
    }

    await this.fill(this.firstNameInput, details.firstName, 'First name input');
    await this.fill(this.lastNameInput, details.lastName, 'Last name input');
    await this.fill(this.emailInput, details.email, 'Register email input');
    await this.fill(this.passwordInput, details.password, 'Register password input');
    await this.fill(this.confirmPasswordInput, details.confirmPassword, 'Confirm password input');
    await this.click(this.registerButton, 'Register submit button');
    await this.page.waitForLoadState('domcontentloaded');

    return new HomePage(this.page);
  }
}

export type { RegistrationDetails };
