import { Locator, Page } from '@playwright/test';
import { BasePage } from '@core/base/base.page';
import CheckoutPage from '@ui/pages/checkout.page';

export default class CartPage extends BasePage {
  private readonly termsOfServiceCheckbox: Locator;
  private readonly checkoutButton: Locator;

  constructor(page: Page) {
    super(page, 'CartPage');
    this.termsOfServiceCheckbox = this.page.getByRole('checkbox', { name: /terms of service/i });
    this.checkoutButton = this.page.getByRole('button', { name: 'Checkout' });
  }

  async removeItem(productName: string): Promise<CartPage> {
    const productRow = this.page.locator('tr', { has: this.page.getByRole('link', { name: productName, exact: true }) });
    const removeCheckbox = productRow.locator('input[name^="removefromcart"]');
    await this.click(removeCheckbox, `Remove item checkbox for ${productName}`);

    const updateCartButton = this.page.getByRole('button', { name: 'Update shopping cart' });
    await this.click(updateCartButton, 'Update shopping cart button');
    await this.page.waitForLoadState('domcontentloaded');
    return this;
  }

  async updateQuantity(productName: string, quantity: number): Promise<CartPage> {
    const productRow = this.page.locator('tr', { has: this.page.getByRole('link', { name: productName, exact: true }) });
    const quantityInput = productRow.locator('input.qty-input');
    await this.fill(quantityInput, quantity.toString(), `Quantity input for ${productName}`);

    const updateCartButton = this.page.getByRole('button', { name: 'Update shopping cart' });
    await this.click(updateCartButton, 'Update shopping cart button');
    await this.page.waitForLoadState('domcontentloaded');
    return this;
  }

  async proceedToCheckout(): Promise<CheckoutPage> {
    if (!(await this.termsOfServiceCheckbox.isChecked())) {
      await this.click(this.termsOfServiceCheckbox, 'Terms of service checkbox');
    }

    await this.click(this.checkoutButton, 'Checkout button');
    await this.page.waitForURL(/onepagecheckout|opc|checkout/i);
    return new CheckoutPage(this.page);
  }
}
