import { Locator, Page } from '@playwright/test';
import { BasePage } from '@core/base/base.page';

type BillingDetails = {
  firstName: string;
  lastName: string;
  email: string;
  country?: string;
  city: string;
  address1: string;
  zipPostalCode: string;
  phoneNumber: string;
};

export default class CheckoutPage extends BasePage {
  private readonly billingAddressContinueButton: Locator;
  private readonly shippingMethodContinueButton: Locator;
  private readonly paymentMethodContinueButton: Locator;
  private readonly paymentInfoContinueButton: Locator;
  private readonly confirmOrderButton: Locator;

  constructor(page: Page) {
    super(page, 'CheckoutPage');
    this.billingAddressContinueButton = this.page.locator('#billing-buttons-container').getByRole('button', { name: 'Continue' });
    this.shippingMethodContinueButton = this.page.locator('#shipping-method-buttons-container').getByRole('button', { name: 'Continue' });
    this.paymentMethodContinueButton = this.page.locator('#payment-method-buttons-container').getByRole('button', { name: 'Continue' });
    this.paymentInfoContinueButton = this.page.locator('#payment-info-buttons-container').getByRole('button', { name: 'Continue' });
    this.confirmOrderButton = this.page.locator('#confirm-order-buttons-container').getByRole('button', { name: 'Confirm' });
  }

  async fillBillingDetails(details: BillingDetails): Promise<CheckoutPage> {
    await this.fill(this.page.getByLabel('First name:'), details.firstName, 'Billing first name');
    await this.fill(this.page.getByLabel('Last name:'), details.lastName, 'Billing last name');
    await this.fill(this.page.getByLabel('Email:'), details.email, 'Billing email');

    if (details.country) {
      await this.page.getByLabel('Country:').selectOption({ label: details.country });
    }

    await this.fill(this.page.getByLabel('City:'), details.city, 'Billing city');
    await this.fill(this.page.getByLabel('Address 1:'), details.address1, 'Billing address line 1');
    await this.fill(this.page.getByLabel('Zip / postal code:'), details.zipPostalCode, 'Billing zip/postal code');
    await this.fill(this.page.getByLabel('Phone number:'), details.phoneNumber, 'Billing phone number');
    await this.click(this.billingAddressContinueButton, 'Billing continue button');
    return this;
  }

  async selectShippingMethod(methodName: string): Promise<CheckoutPage> {
    await this.click(this.page.getByRole('radio', { name: methodName }), `Shipping method radio: ${methodName}`);
    await this.click(this.shippingMethodContinueButton, 'Shipping method continue button');
    await this.click(this.paymentMethodContinueButton, 'Payment method continue button');
    await this.click(this.paymentInfoContinueButton, 'Payment info continue button');
    return this;
  }

  async placeOrder(): Promise<void> {
    await this.click(this.confirmOrderButton, 'Confirm order button');
    await this.page.waitForLoadState('domcontentloaded');
  }
}

export type { BillingDetails };
